package meshmobile

import (
	"bufio"
	"context"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
)

// The upstream sees the alias' own Host header, not 127.0.0.1:<port>.
func TestForwardKeepsHostHeader(t *testing.T) {
	var gotHost, gotPath string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotHost, gotPath = r.Host, r.URL.RequestURI()
		_, _ = io.WriteString(w, "ok")
	}))
	defer upstream.Close()

	dial := func(ctx context.Context, network, addr string) (net.Conn, error) {
		// The alias names a tailnet host; the test "tailnet" is the httptest server.
		if addr != "mikro.mesh.test:8080" {
			t.Errorf("dialled %q, want the alias' host:port", addr)
		}
		return (&net.Dialer{}).DialContext(ctx, network, upstream.Listener.Addr().String())
	}
	f, err := newForward("mikro.mesh.test", 8080, false, 0, dial)
	if err != nil {
		t.Fatal(err)
	}
	defer f.close()

	res, err := http.Get("http://127.0.0.1:" + strconv.Itoa(f.port) + "/mikro/graphql?x=1")
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(res.Body)
	res.Body.Close()
	if string(body) != "ok" {
		t.Fatalf("body %q", body)
	}
	if gotHost != "mikro.mesh.test:8080" {
		t.Fatalf("upstream saw Host %q", gotHost)
	}
	if gotPath != "/mikro/graphql?x=1" {
		t.Fatalf("upstream saw path %q", gotPath)
	}
}

// Without a port the Host header has none either, and the scheme default is dialled.
func TestForwardDefaultPort(t *testing.T) {
	var gotHost string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotHost = r.Host
	}))
	defer upstream.Close()
	var dialled string
	dial := func(ctx context.Context, network, addr string) (net.Conn, error) {
		dialled = addr
		return (&net.Dialer{}).DialContext(ctx, network, upstream.Listener.Addr().String())
	}
	f, err := newForward("lok.mesh.test", 0, false, 0, dial)
	if err != nil {
		t.Fatal(err)
	}
	defer f.close()
	res, err := http.Get("http://127.0.0.1:" + strconv.Itoa(f.port) + "/")
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if dialled != "lok.mesh.test:80" || gotHost != "lok.mesh.test" {
		t.Fatalf("dialled %q, Host %q", dialled, gotHost)
	}
}

// A WebSocket-style upgrade is switched through in both directions.
func TestForwardUpgrade(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.EqualFold(r.Header.Get("Upgrade"), "websocket") {
			http.Error(w, "want upgrade", http.StatusBadRequest)
			return
		}
		conn, buf, err := w.(http.Hijacker).Hijack()
		if err != nil {
			return
		}
		defer conn.Close()
		_, _ = buf.WriteString("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n")
		_ = buf.Flush()
		line, _ := buf.ReadString('\n')
		_, _ = buf.WriteString("echo:" + line)
		_ = buf.Flush()
	}))
	defer upstream.Close()
	dial := func(ctx context.Context, network, _ string) (net.Conn, error) {
		return (&net.Dialer{}).DialContext(ctx, network, upstream.Listener.Addr().String())
	}
	f, err := newForward("rekuest.mesh.test", 80, false, 0, dial)
	if err != nil {
		t.Fatal(err)
	}
	defer f.close()

	conn, err := net.Dial("tcp", "127.0.0.1:"+strconv.Itoa(f.port))
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	_, _ = io.WriteString(conn, "GET /graphql HTTP/1.1\r\nHost: 127.0.0.1\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n")
	r := bufio.NewReader(conn)
	status, _ := r.ReadString('\n')
	if !strings.Contains(status, "101") {
		t.Fatalf("status line %q", status)
	}
	for {
		l, err := r.ReadString('\n')
		if err != nil {
			t.Fatal(err)
		}
		if l == "\r\n" {
			break
		}
	}
	_, _ = io.WriteString(conn, "hello\n")
	got, _ := r.ReadString('\n')
	if got != "echo:hello\n" {
		t.Fatalf("got %q", got)
	}
}

// A re-bound forward gets its old port back when it is free.
func TestForwardPrefersPort(t *testing.T) {
	dial := func(ctx context.Context, network, addr string) (net.Conn, error) { return nil, io.EOF }
	first, err := newForward("a.mesh.test", 80, false, 0, dial)
	if err != nil {
		t.Fatal(err)
	}
	port := first.port
	first.close()
	second, err := newForward("a.mesh.test", 80, false, port, dial)
	if err != nil {
		t.Fatal(err)
	}
	defer second.close()
	if second.port != port {
		t.Fatalf("re-bound on %d, want %d", second.port, port)
	}
}

func TestParseInterfaces(t *testing.T) {
	ifs, err := parseInterfaces("wlan0 3 1500 true true false false true | 192.168.1.20/24 fe80::1/64\nlo 1 65536 true false true false false | 127.0.0.1/8\n")
	if err != nil {
		t.Fatal(err)
	}
	if len(ifs) != 2 || ifs[0].Name != "wlan0" || !ifs[0].IsUp() || ifs[1].IsLoopback() == false {
		t.Fatalf("parsed %+v", ifs)
	}
	if len(ifs[0].AltAddrs) != 2 || ifs[0].AltAddrs[0].String() != "192.168.1.20/24" {
		t.Fatalf("addrs %v", ifs[0].AltAddrs)
	}
	if _, err := parseInterfaces("broken line"); err == nil {
		t.Fatal("want an error for a malformed line")
	}
}
