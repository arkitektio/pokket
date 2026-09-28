//go:build !ios && !android

// The tailnet harness (tailscale.com/tstest/integration) only builds for the
// dev/CI host, never for the phones this library targets.

package meshmobile

// End-to-end tests against a real (in-process) tailnet: Tailscale's test
// control server, a local DERP relay + STUN server, and a second tsnet node
// ("svc") standing in for an Arkitekt service on the mesh. Everything the app
// does goes through this package's exported API, exactly as the native
// module calls it: Start, status events, Forward, Stop, rejoin from state.

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/coder/websocket"
	"tailscale.com/ipn/store/mem"
	"tailscale.com/net/netns"
	"tailscale.com/tailcfg"
	"tailscale.com/tsnet"
	"tailscale.com/tstest/integration"
	"tailscale.com/tstest/integration/testcontrol"
	"tailscale.com/types/logger"
)

const (
	testAuthKey    = "tskey-auth-pokket-test"
	testMagicDNS   = "tail-scale.ts.net"
	testSvcName    = "svc"
	testSvcPort    = 8080
	testDeviceName = "pokket-test"
)

// recorder is the test's Listener: it keeps every status snapshot per node.
type recorder struct {
	mu      sync.Mutex
	changed chan struct{}
	last    map[string]nodeStatus
	seen    map[string][]string
}

func newRecorder() *recorder {
	return &recorder{changed: make(chan struct{}, 1), last: map[string]nodeStatus{}, seen: map[string][]string{}}
}

func (r *recorder) OnStatus(statusJSON string) {
	var s nodeStatus
	if err := json.Unmarshal([]byte(statusJSON), &s); err != nil {
		panic(err)
	}
	r.mu.Lock()
	r.last[s.ID] = s
	r.seen[s.ID] = append(r.seen[s.ID], s.State)
	r.mu.Unlock()
	select {
	case r.changed <- struct{}{}:
	default:
	}
}

func (r *recorder) OnLog(string, string) {}

// waitFor blocks until the node's latest snapshot satisfies ok.
func (r *recorder) waitFor(t *testing.T, id string, what string, ok func(nodeStatus) bool) nodeStatus {
	t.Helper()
	deadline := time.After(60 * time.Second)
	for {
		r.mu.Lock()
		s, have := r.last[id]
		r.mu.Unlock()
		if have && ok(s) {
			return s
		}
		select {
		case <-r.changed:
		case <-time.After(500 * time.Millisecond):
		case <-deadline:
			r.mu.Lock()
			defer r.mu.Unlock()
			t.Fatalf("node %s never became %s; states seen: %v; last: %+v", id, what, r.seen[id], r.last[id])
		}
	}
}

func running(s nodeStatus) bool { return s.State == "running" }

func hasOnlinePeer(name string) func(nodeStatus) bool {
	return func(s nodeStatus) bool {
		if s.State != "running" {
			return false
		}
		for _, p := range s.Peers {
			if p.HostName == name && p.Online && len(p.IPs) > 0 {
				return true
			}
		}
		return false
	}
}

// testTailnet is control + DERP/STUN + the svc node.
type testTailnet struct {
	controlURL string
	control    *testcontrol.Server
	svc        *tsnet.Server

	mu      sync.Mutex
	reports [][]byte
	reportC chan []byte
}

// startTailnet brings a tailnet up on ip ("127.0.0.1" for in-process tests,
// a host address devices can reach for the device environment).
func startTailnet(t *testing.T, ip string) *testTailnet {
	t.Helper()
	// Binding sockets to an interface needs privileges the test does not have.
	netns.SetEnabled(false)
	t.Cleanup(func() { netns.SetEnabled(true) })

	derpMap := integration.RunDERPAndSTUN(t, logger.Discard, ip)
	control := &testcontrol.Server{
		DERPMap:          derpMap,
		DNSConfig:        &tailcfg.DNSConfig{Proxied: true},
		MagicDNSDomain:   testMagicDNS,
		RequireAuthKey:   testAuthKey,
		AllNodesSameUser: true,
		AllOnline:        true,
		Logf:             logger.Discard,
	}
	ln, err := net.Listen("tcp", net.JoinHostPort(ip, envPort("MESH_E2E_CONTROL_PORT")))
	if err != nil {
		t.Fatal(err)
	}
	control.HTTPTestServer = httptest.NewUnstartedServer(control)
	control.HTTPTestServer.Listener.Close()
	control.HTTPTestServer.Listener = ln
	control.HTTPTestServer.Start()
	t.Cleanup(control.HTTPTestServer.Close)

	tn := &testTailnet{controlURL: control.HTTPTestServer.URL, control: control, reportC: make(chan []byte, 1)}

	svc := &tsnet.Server{
		Dir:        filepath.Join(t.TempDir(), "svc"),
		Hostname:   testSvcName,
		ControlURL: tn.controlURL,
		AuthKey:    testAuthKey,
		Store:      new(mem.Store),
		Ephemeral:  true,
		Logf:       logger.Discard,
	}
	t.Cleanup(func() { svc.Close() })
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	if _, err := svc.Up(ctx); err != nil {
		t.Fatalf("svc up: %v", err)
	}
	svcLn, err := svc.Listen("tcp", ":"+strconv.Itoa(testSvcPort))
	if err != nil {
		t.Fatal(err)
	}
	srv := &http.Server{Handler: tn.handler()}
	go srv.Serve(svcLn)
	t.Cleanup(func() { srv.Close() })
	tn.svc = svc
	return tn
}

// handler is the "Arkitekt service" on the mesh.
func (tn *testTailnet) handler() http.Handler {
	mux := http.NewServeMux()
	// The alias challenge: answers with the Host the request carried.
	mux.HandleFunc("/ht", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"host": r.Host, "path": r.URL.Path})
	})
	// A GraphQL-subscription-like WebSocket: echoes every message.
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		c, err := websocket.Accept(w, r, &websocket.AcceptOptions{InsecureSkipVerify: true})
		if err != nil {
			return
		}
		defer c.CloseNow()
		for {
			typ, msg, err := c.Read(r.Context())
			if err != nil {
				return
			}
			if err := c.Write(r.Context(), typ, append([]byte("echo:"), msg...)); err != nil {
				return
			}
		}
	})
	// Where the device self-test reports its result (through the mesh).
	mux.HandleFunc("/report", func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		tn.mu.Lock()
		tn.reports = append(tn.reports, body)
		tn.mu.Unlock()
		select {
		case tn.reportC <- body:
		default:
		}
		w.Write([]byte(`{"ok":true}`))
	})
	return mux
}

func useRecorder(t *testing.T) *recorder {
	rec := newRecorder()
	SetListener(rec)
	t.Cleanup(func() { SetListener(nil) })
	return rec
}

func TestE2EJoinForwardRejoin(t *testing.T) {
	if testing.Short() {
		t.Skip("tailnet e2e")
	}
	tn := startTailnet(t, "127.0.0.1")
	rec := useRecorder(t)
	if os.Getenv("MESH_TEST_VERBOSE") != "" {
		debugLogf = t.Logf
		t.Cleanup(func() { debugLogf = func(string, ...any) {} })
	}

	id := "e2e1"
	dir := filepath.Join(t.TempDir(), "mesh", id)
	t.Cleanup(func() { Stop(id) })

	// Join with the one-shot key, as after a login.
	if err := Start(id, dir, tn.controlURL, testDeviceName, testAuthKey); err != nil {
		t.Fatal(err)
	}
	st := rec.waitFor(t, id, "running with svc online", hasOnlinePeer(testSvcName))
	if st.MagicDNSSuffix != testMagicDNS {
		t.Errorf("magicDnsSuffix = %q, want %q", st.MagicDNSSuffix, testMagicDNS)
	}
	if len(st.SelfIPs) == 0 || !strings.HasPrefix(st.SelfDNSName, testDeviceName) {
		t.Errorf("self = %v %q", st.SelfIPs, st.SelfDNSName)
	}
	// Status() answers with the same snapshot the events carried.
	var polled nodeStatus
	if err := json.Unmarshal([]byte(Status(id)), &polled); err != nil || polled.State != "running" {
		t.Errorf("Status() = %+v, %v", polled, err)
	}

	// A forward for the alias, by its short MagicDNS name (as a deployment
	// advertising "svc:8080" would), then plain HTTP to loopback.
	port, err := Forward(id, testSvcName, testSvcPort, false)
	if err != nil {
		t.Fatal(err)
	}
	again, err := Forward(id, testSvcName, testSvcPort, false)
	if err != nil || again != port {
		t.Fatalf("Forward not idempotent: %d vs %d (%v)", port, again, err)
	}
	checkHTTP(t, port)
	checkWebSocket(t, port)

	// Stop and rejoin WITHOUT a key: the node's state on disk carries the login.
	Stop(id)
	rec.waitFor(t, id, "stopped", func(s nodeStatus) bool { return s.State == "stopped" })
	if _, err := Forward(id, testSvcName, testSvcPort, false); err == nil {
		t.Fatal("Forward on a stopped node should fail")
	}
	if _, err := os.Stat(filepath.Join(dir, "tailscaled.state")); err != nil {
		t.Fatalf("no node state kept on disk: %v", err)
	}
	// testcontrol insists on the key in every RegisterReq, even from a node
	// it knows; ionscale (like Tailscale) accepts a known node key without
	// one. So drop the requirement here (nothing registers while the node is
	// down), and prove the rejoin used the saved identity instead: a newly
	// registered node would get a new tailnet IP.
	tn.control.RequireAuthKey = ""
	if err := Start(id, dir, tn.controlURL, testDeviceName, ""); err != nil {
		t.Fatal(err)
	}
	rejoined := rec.waitFor(t, id, "running again from state", hasOnlinePeer(testSvcName))
	if strings.Join(rejoined.SelfIPs, ",") != strings.Join(st.SelfIPs, ",") || rejoined.SelfDNSName != st.SelfDNSName {
		t.Fatalf("rejoined as a different node: %v %q, was %v %q", rejoined.SelfIPs, rejoined.SelfDNSName, st.SelfIPs, st.SelfDNSName)
	}
	port2, err := Forward(id, testSvcName, testSvcPort, false)
	if err != nil {
		t.Fatal(err)
	}
	checkHTTP(t, port2)
}

// A node with neither a key nor state waits in needs-login; it never opens
// an interactive login.
func TestE2ENoKeyNeedsLogin(t *testing.T) {
	if testing.Short() {
		t.Skip("tailnet e2e")
	}
	tn := startTailnet(t, "127.0.0.1")
	rec := useRecorder(t)
	id := "e2e2"
	t.Cleanup(func() { Stop(id) })
	if err := Start(id, filepath.Join(t.TempDir(), id), tn.controlURL, testDeviceName, ""); err != nil {
		t.Fatal(err)
	}
	rec.waitFor(t, id, "needs-login", func(s nodeStatus) bool { return s.State == "needs-login" })
}

func checkHTTP(t *testing.T, port int) {
	t.Helper()
	client := &http.Client{Timeout: 20 * time.Second}
	res, err := client.Get(fmt.Sprintf("http://127.0.0.1:%d/ht", port))
	if err != nil {
		t.Fatalf("GET through forward: %v", err)
	}
	defer res.Body.Close()
	var got map[string]string
	if err := json.NewDecoder(res.Body).Decode(&got); err != nil {
		t.Fatalf("decode: %v (status %d)", err, res.StatusCode)
	}
	if want := fmt.Sprintf("%s:%d", testSvcName, testSvcPort); got["host"] != want {
		t.Errorf("service saw Host %q, want %q", got["host"], want)
	}
}

func checkWebSocket(t *testing.T, port int) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	c, _, err := websocket.Dial(ctx, fmt.Sprintf("ws://127.0.0.1:%d/ws", port), nil)
	if err != nil {
		t.Fatalf("websocket through forward: %v", err)
	}
	defer c.CloseNow()
	for _, msg := range []string{"hello", "subscription"} {
		if err := c.Write(ctx, websocket.MessageText, []byte(msg)); err != nil {
			t.Fatal(err)
		}
		_, got, err := c.Read(ctx)
		if err != nil {
			t.Fatal(err)
		}
		if string(got) != "echo:"+msg {
			t.Fatalf("got %q", got)
		}
	}
	c.Close(websocket.StatusNormalClosure, "")
}

// An https alias is spoken to with TLS and its own server name.
func TestForwardTLSUpstream(t *testing.T) {
	var sni string
	upstream := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		io.WriteString(w, "secure:"+r.Host)
	}))
	upstream.TLS = &tls.Config{GetConfigForClient: func(h *tls.ClientHelloInfo) (*tls.Config, error) {
		sni = h.ServerName
		return nil, nil
	}}
	upstream.StartTLS()
	defer upstream.Close()

	pool := x509.NewCertPool()
	pool.AddCert(upstream.Certificate())
	testRootCAs = pool
	defer func() { testRootCAs = nil }()

	// httptest's certificate is valid for "example.com".
	dial := func(ctx context.Context, network, _ string) (net.Conn, error) {
		return (&net.Dialer{}).DialContext(ctx, network, upstream.Listener.Addr().String())
	}
	f, err := newForward("example.com", 0, true, 0, dial)
	if err != nil {
		t.Fatal(err)
	}
	defer f.close()
	res, err := http.Get(fmt.Sprintf("http://127.0.0.1:%d/", f.port))
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(res.Body)
	res.Body.Close()
	if string(body) != "secure:example.com" || sni != "example.com" {
		t.Fatalf("body %q, SNI %q", body, sni)
	}
}

// envPort is a fixed listen port from the environment, or "0" for any: a
// build that carries its self-test parameters (EXPO_PUBLIC_MESH_SELFTEST_AUTORUN)
// needs to know the addresses before this runs.
func envPort(name string) string {
	if p := os.Getenv(name); p != "" {
		return p
	}
	return "0"
}

// TestDeviceEnv is not a test of this package: it is the tailnet a device
// self-test (app/mesh-selftest.tsx) joins in CI. It serves until the device
// reports back through the mesh, and passes only on a successful report.
//
//	MESH_E2E_ENV=1 MESH_E2E_ADVERTISE_IP=<ip devices reach> MESH_E2E_OUT=env.json \
//	  go test -run TestDeviceEnv -timeout 30m
func TestDeviceEnv(t *testing.T) {
	if os.Getenv("MESH_E2E_ENV") != "1" {
		t.Skip("set MESH_E2E_ENV=1 to serve a tailnet for a device self-test")
	}
	ip := os.Getenv("MESH_E2E_ADVERTISE_IP")
	if ip == "" {
		ip = "127.0.0.1"
	}
	tn := startTailnet(t, ip)

	// A plain HTTP side channel, NOT through the mesh: the self-test streams
	// every step and log line here, so a device that never gets onto the
	// mesh still says what happened (Release RN logs reach no device log).
	progressLn, err := net.Listen("tcp", net.JoinHostPort(ip, envPort("MESH_E2E_PROGRESS_PORT")))
	if err != nil {
		t.Fatal(err)
	}
	progress := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(io.LimitReader(r.Body, 64<<10))
		t.Logf("device: %s", body)
	})}
	go progress.Serve(progressLn)
	t.Cleanup(func() { progress.Close() })

	env, _ := json.Marshal(map[string]any{
		"progressUrl": "http://" + progressLn.Addr().String() + "/progress",
		"controlUrl":  tn.controlURL,
		"authKey":     testAuthKey,
		"host":        testSvcName,
		"port":        testSvcPort,
	})
	if out := os.Getenv("MESH_E2E_OUT"); out != "" {
		if err := os.WriteFile(out+".tmp", env, 0o644); err != nil {
			t.Fatal(err)
		}
		// Atomic, so a watcher never reads half a file.
		if err := os.Rename(out+".tmp", out); err != nil {
			t.Fatal(err)
		}
	}
	t.Logf("device env: %s", env)

	wait := 15 * time.Minute
	if s := os.Getenv("MESH_E2E_WAIT"); s != "" {
		if d, err := time.ParseDuration(s); err == nil {
			wait = d
		}
	}
	select {
	case body := <-tn.reportC:
		t.Logf("device report: %s", body)
		var report struct {
			OK    bool `json:"ok"`
			Steps []struct {
				Name   string `json:"name"`
				OK     bool   `json:"ok"`
				Detail string `json:"detail"`
			} `json:"steps"`
		}
		if err := json.Unmarshal(body, &report); err != nil {
			t.Fatalf("malformed report: %v", err)
		}
		for _, s := range report.Steps {
			t.Logf("  %-4v %s %s", s.OK, s.Name, s.Detail)
		}
		if !report.OK {
			t.Fatal("device self-test failed")
		}
	case <-time.After(wait):
		t.Fatal("no report from the device (it never got a request through the mesh)")
	}
}

// TestDeviceClient plays the device against a running TestDeviceEnv, through
// this package's API — the same steps app/mesh-selftest.tsx takes through the
// native module. It checks the device environment itself (used when changing
// the CI job), not the app.
//
//	MESH_E2E_CLIENT=env.json go test -run TestDeviceClient
func TestDeviceClient(t *testing.T) {
	path := os.Getenv("MESH_E2E_CLIENT")
	if path == "" {
		t.Skip("set MESH_E2E_CLIENT to the env file of a running TestDeviceEnv")
	}
	var env struct {
		ControlURL string `json:"controlUrl"`
		AuthKey    string `json:"authKey"`
		Host       string `json:"host"`
		Port       int    `json:"port"`
	}
	deadline := time.Now().Add(2 * time.Minute)
	for {
		b, err := os.ReadFile(path)
		if err == nil && json.Unmarshal(b, &env) == nil {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("no env at %s", path)
		}
		time.Sleep(200 * time.Millisecond)
	}
	netns.SetEnabled(false)
	rec := useRecorder(t)
	id := "client"
	t.Cleanup(func() { Stop(id) })
	if err := Start(id, filepath.Join(t.TempDir(), id), env.ControlURL, "pokket-client", env.AuthKey); err != nil {
		t.Fatal(err)
	}
	rec.waitFor(t, id, "running", hasOnlinePeer(env.Host))
	port, err := Forward(id, env.Host, env.Port, false)
	if err != nil {
		t.Fatal(err)
	}
	checkHTTP(t, port)
	checkWebSocket(t, port)
	report := `{"ok":true,"steps":[{"name":"go-client","ok":true,"detail":"http+ws"}]}`
	res, err := http.Post(fmt.Sprintf("http://127.0.0.1:%d/report", port), "application/json", strings.NewReader(report))
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
}
