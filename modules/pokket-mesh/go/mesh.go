// Package meshmobile is pokket's mesh sidecar: a userspace Tailscale node
// (tsnet) per organisation mesh, hosted inside the app process and bound into
// the Android/iOS native module with gomobile.
//
// It is the mobile sibling of orkestrator's `tools/meshd`. The desktop
// sidecar is a separate process that Chromium reaches through a SOCKS5 proxy
// chosen by a PAC script; a phone can neither spawn that process nor point
// React Native's fetch/WebSocket at a per-host proxy. So instead of a proxy,
// every alias that lives on the mesh gets a loopback reverse proxy of its own
// (see forward.go), and the app talks plain HTTP/WS to 127.0.0.1:<port>.
//
// As on desktop there is deliberately NO interactive login: a node
// authenticates with the one-shot pre-auth key lok minted when the user was
// approved into the organisation, or with the state it kept from an earlier
// key. A node with neither reports "needs-login" and waits; the app knows
// that means "sign in to the deployment again".
//
// The node never installs a TUN device or routes: tsnet runs a gVisor
// netstack in-process, so no VPN permission is needed and only the app's own
// traffic to the forwarded aliases reaches the tailnet.
package meshmobile

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"os"
	"reflect"
	"sort"
	"strings"
	"sync"
	"time"

	"tailscale.com/client/local"
	"tailscale.com/ipn"
	"tailscale.com/ipn/ipnstate"
	"tailscale.com/tsnet"
)

const version = "0.1.0"

// Listener receives everything the sidecar has to say. The native module
// implements it and turns each call into a JS event. Calls arrive on Go
// goroutines, never on the platform's main thread.
type Listener interface {
	// OnStatus carries a full status snapshot (JSON, see nodeStatus) whenever
	// any of it changes. Full snapshots, never deltas: a listener that missed
	// one is never left with a stale picture.
	OnStatus(statusJSON string)
	// OnLog relays tsnet's user-facing log lines.
	OnLog(id string, message string)
}

type peer struct {
	DNSName  string   `json:"dnsName,omitempty"`
	HostName string   `json:"hostName,omitempty"`
	IPs      []string `json:"ips"`
	Online   bool     `json:"online"`
	Expired  bool     `json:"expired,omitempty"`
	OS       string   `json:"os,omitempty"`
	// The path traffic currently takes, when there has been any: a direct
	// endpoint ("ip:port") or the DERP relay region it goes through.
	CurAddr       string `json:"curAddr,omitempty"`
	Relay         string `json:"relay,omitempty"`
	Active        bool   `json:"active,omitempty"`
	LastHandshake string `json:"lastHandshake,omitempty"`
}

// nodeStatus is the whole truth about one node. Same shape as meshd's status
// event (minus the proxy port and Tailnet Lock), so the TypeScript types can
// stay aligned with orkestrator's `MeshNodeStatus`.
type nodeStatus struct {
	ID             string   `json:"id"`
	State          string   `json:"state"`
	MagicDNSSuffix string   `json:"magicDnsSuffix,omitempty"`
	TailnetName    string   `json:"tailnetName,omitempty"`
	SelfIPs        []string `json:"selfIps,omitempty"`
	SelfDNSName    string   `json:"selfDnsName,omitempty"`
	Peers          []peer   `json:"peers,omitempty"`
	Error          string   `json:"error,omitempty"`
}

type node struct {
	id     string
	srv    *tsnet.Server
	lc     *local.Client
	cancel context.CancelFunc

	mu       sync.Mutex
	last     nodeStatus
	forwards map[string]*forward
}

var (
	listenerMu sync.Mutex
	listener   Listener

	nodesMu sync.Mutex
	nodes   = map[string]*node{}
)

// SetListener installs the receiver for status and log events. Call it once,
// before Start; passing nil silences the sidecar.
func SetListener(l Listener) {
	listenerMu.Lock()
	listener = l
	listenerMu.Unlock()
}

// Version is the sidecar's protocol version.
func Version() string { return version }

func emitStatus(s nodeStatus) {
	listenerMu.Lock()
	l := listener
	listenerMu.Unlock()
	if l == nil {
		return
	}
	b, err := json.Marshal(s)
	if err != nil {
		return
	}
	l.OnStatus(string(b))
}

func emitLog(id, message string) {
	listenerMu.Lock()
	l := listener
	listenerMu.Unlock()
	if l != nil {
		l.OnLog(id, strings.TrimSpace(message))
	}
}

// Start brings a mesh node up. It returns as soon as the node is starting;
// progress (and "running") arrives as status snapshots.
//
// stateDir holds the node's identity: once a key has been used, the node
// rejoins from it on every later Start with an empty authKey. A node that is
// already up just repeats its last status.
func Start(id, stateDir, controlURL, hostname, authKey string) error {
	if id == "" || stateDir == "" {
		return errors.New("start needs an id and a state dir")
	}
	if controlURL == "" {
		return errors.New("start needs a control url")
	}

	nodesMu.Lock()
	if existing := nodes[id]; existing != nil {
		nodesMu.Unlock()
		existing.mu.Lock()
		last := existing.last
		existing.mu.Unlock()
		emitStatus(last)
		return nil
	}
	nodesMu.Unlock()

	if err := os.MkdirAll(stateDir, 0o700); err != nil {
		return fmt.Errorf("state dir: %w", err)
	}

	srv := &tsnet.Server{
		Dir:        stateDir,
		Hostname:   hostname,
		ControlURL: controlURL,
		AuthKey:    authKey,
		Ephemeral:  false,
		// tsnet is chatty; only the user-facing lines are relayed.
		Logf: func(string, ...any) {},
		UserLogf: func(format string, args ...any) {
			emitLog(id, fmt.Sprintf(format, args...))
		},
	}

	starting := nodeStatus{ID: id, State: "starting"}
	emitStatus(starting)

	if err := srv.Start(); err != nil {
		return fmt.Errorf("start: %w", err)
	}
	lc, err := srv.LocalClient()
	if err != nil {
		_ = srv.Close()
		return fmt.Errorf("local client: %w", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	n := &node{id: id, srv: srv, lc: lc, cancel: cancel, last: starting, forwards: map[string]*forward{}}

	nodesMu.Lock()
	nodes[id] = n
	nodesMu.Unlock()

	go n.watch(ctx)
	return nil
}

// Stop tears a node down (its forwards with it). Its state dir is kept, so a
// later Start rejoins without a key.
func Stop(id string) {
	nodesMu.Lock()
	n := nodes[id]
	delete(nodes, id)
	nodesMu.Unlock()
	if n == nil {
		emitStatus(nodeStatus{ID: id, State: "stopped"})
		return
	}
	n.cancel()
	n.mu.Lock()
	for key, f := range n.forwards {
		f.close()
		delete(n.forwards, key)
	}
	n.mu.Unlock()
	_ = n.srv.Close()
	emitStatus(nodeStatus{ID: id, State: "stopped"})
}

// StopAll stops every node, so no WireGuard endpoint outlives the session.
func StopAll() {
	nodesMu.Lock()
	ids := make([]string, 0, len(nodes))
	for id := range nodes {
		ids = append(ids, id)
	}
	nodesMu.Unlock()
	for _, id := range ids {
		Stop(id)
	}
}

// Status is the node's last snapshot as JSON; a "stopped" snapshot for a
// node that is not up.
func Status(id string) string {
	nodesMu.Lock()
	n := nodes[id]
	nodesMu.Unlock()
	s := nodeStatus{ID: id, State: "stopped"}
	if n != nil {
		n.mu.Lock()
		s = n.last
		n.mu.Unlock()
	}
	b, _ := json.Marshal(s)
	return string(b)
}

func lookup(id string) *node {
	nodesMu.Lock()
	defer nodesMu.Unlock()
	return nodes[id]
}

// dial is the node's dialer with one convenience on top of tsnet's: a bare
// label ("mikro") gets the tailnet's MagicDNS suffix appended, the way an OS
// resolver with the tailnet search domain would.
func (n *node) dial(ctx context.Context, network, addr string) (net.Conn, error) {
	host, port, err := net.SplitHostPort(addr)
	if err == nil && host != "" && !strings.Contains(host, ".") && !strings.Contains(host, ":") && net.ParseIP(host) == nil {
		n.mu.Lock()
		suffix := n.last.MagicDNSSuffix
		n.mu.Unlock()
		if suffix != "" {
			addr = net.JoinHostPort(host+"."+suffix, port)
		}
	}
	return n.srv.Dial(ctx, network, addr)
}

// watch follows the node's IPN bus for state changes, and polls the full
// status so peers and the DNS suffix stay current.
func (n *node) watch(ctx context.Context) {
	go n.pollStatus(ctx)

	backoff := time.Second
	for ctx.Err() == nil {
		w, err := n.lc.WatchIPNBus(ctx, ipn.NotifyInitialState|ipn.NotifyNoPrivateKeys)
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			time.Sleep(backoff)
			if backoff < 10*time.Second {
				backoff *= 2
			}
			continue
		}
		backoff = time.Second
		for ctx.Err() == nil {
			msg, err := w.Next()
			if err != nil {
				break
			}
			if msg.ErrMessage != nil {
				emitLog(n.id, *msg.ErrMessage)
			}
			if msg.State != nil {
				n.refresh(ctx)
			}
		}
		w.Close()
	}
}

func (n *node) pollStatus(ctx context.Context) {
	ticker := time.NewTicker(3 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			n.refresh(ctx)
		}
	}
}

func (n *node) refresh(ctx context.Context) {
	sctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	st, err := n.lc.Status(sctx)
	cancel()
	if err != nil {
		return
	}
	next := snapshot(n.id, st)
	n.mu.Lock()
	changed := !reflect.DeepEqual(next, n.last)
	n.last = next
	n.mu.Unlock()
	if changed {
		emitStatus(next)
	}
}

func snapshot(id string, st *ipnstate.Status) nodeStatus {
	s := nodeStatus{ID: id}
	switch st.BackendState {
	case ipn.Running.String():
		s.State = "running"
	case ipn.NeedsLogin.String():
		s.State = "needs-login"
	case ipn.NeedsMachineAuth.String():
		s.State = "needs-machine-auth"
	case ipn.Starting.String():
		s.State = "starting"
	case ipn.Stopped.String(), ipn.NoState.String():
		s.State = "stopped"
	default:
		s.State = strings.ToLower(st.BackendState)
	}
	if st.CurrentTailnet != nil {
		s.MagicDNSSuffix = strings.TrimSuffix(st.CurrentTailnet.MagicDNSSuffix, ".")
		s.TailnetName = st.CurrentTailnet.Name
	}
	if s.MagicDNSSuffix == "" {
		s.MagicDNSSuffix = strings.TrimSuffix(st.MagicDNSSuffix, ".")
	}
	if st.Self != nil {
		for _, ip := range st.Self.TailscaleIPs {
			s.SelfIPs = append(s.SelfIPs, ip.String())
		}
		s.SelfDNSName = strings.TrimSuffix(st.Self.DNSName, ".")
	}
	for _, p := range st.Peer {
		ps := peer{
			DNSName:  strings.TrimSuffix(p.DNSName, "."),
			HostName: p.HostName,
			Online:   p.Online,
			Expired:  p.Expired,
			OS:       p.OS,
			CurAddr:  p.CurAddr,
			Relay:    p.Relay,
			Active:   p.Active,
			IPs:      []string{},
		}
		if !p.LastHandshake.IsZero() {
			ps.LastHandshake = p.LastHandshake.UTC().Format(time.RFC3339)
		}
		for _, ip := range p.TailscaleIPs {
			ps.IPs = append(ps.IPs, ip.String())
		}
		s.Peers = append(s.Peers, ps)
	}
	sort.Slice(s.Peers, func(i, j int) bool { return s.Peers[i].DNSName < s.Peers[j].DNSName })
	return s
}
