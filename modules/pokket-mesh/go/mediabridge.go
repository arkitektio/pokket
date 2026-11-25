package meshmobile

// The media bridge: how WebRTC media (LiveKit) reaches a media server that is only on the
// mesh. The app's signalling goes through a loopback forward (forward.go), but WebRTC's media
// is UDP to the addresses the media server hands out, and the phone has no route to the
// mesh (no TUN device). So the node runs a TURN server on 127.0.0.1 whose allocations are UDP
// sockets on the mesh, and the app hands it to WebRTC as its ICE server. WebRTC still prefers
// a direct UDP path when one works, and uses the bridge when it does not.
//
// The same bridge as orkestrator's `tools/meshd/mediabridge.go`; only the way it is asked for
// differs (a synchronous call here, a stdio command there).
//
// What keeps it small:
//   - it listens on 127.0.0.1 only, on a free port, with a username and password made up per
//     bridge (only the app is told them);
//   - every allocation is a UDP socket on the mesh: nothing on the local network or the
//     internet is reachable through it;
//   - it relays only to the machines it was asked for (the media server), checked on every
//     permission the client asks for;
//   - UDP only (no TCP allocations): live media is UDP, and the mesh falls back to TCP itself.

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/netip"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/pion/turn/v4"
)

const mediaBridgeRealm = "arkitekt-mesh"

// At most this many media servers per ask (a LiveKit is one host).
const mediaBridgeMaxHosts = 4

// mediaBridgeInfo is what the app is handed: one ICE server, and what it relays to.
type mediaBridgeInfo struct {
	URLs       []string `json:"urls"`
	Username   string   `json:"username"`
	Credential string   `json:"credential"`
	// The mesh addresses it relays to, as resolved.
	Allowed []string `json:"allowed"`
}

type mediaBridge struct {
	server     *turn.Server
	listener   net.PacketConn
	urls       []string
	username   string
	credential string
	mu         sync.Mutex
	allowed    map[netip.Addr]bool
	// Set once its listener stops reading: iOS reclaims the sockets of a suspended app, and a
	// bridge on a reclaimed socket would hand WebRTC a port nobody answers on.
	dead atomic.Bool
}

// watchedConn is the bridge's listener, telling the bridge when it stops reading.
type watchedConn struct {
	net.PacketConn
	dead *atomic.Bool
}

func (c watchedConn) ReadFrom(p []byte) (int, net.Addr, error) {
	n, addr, err := c.PacketConn.ReadFrom(p)
	if err != nil {
		var timeout interface{ Timeout() bool }
		if !errors.As(err, &timeout) || !timeout.Timeout() {
			c.dead.Store(true)
		}
	}
	return n, addr, err
}

func (b *mediaBridge) permits(ip netip.Addr) bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.allowed[ip.Unmap()]
}

func (b *mediaBridge) allow(ips []netip.Addr) []string {
	b.mu.Lock()
	defer b.mu.Unlock()
	for _, ip := range ips {
		b.allowed[ip.Unmap()] = true
	}
	out := make([]string, 0, len(b.allowed))
	for ip := range b.allowed {
		out = append(out, ip.String())
	}
	sort.Strings(out)
	return out
}

func (b *mediaBridge) info(allowed []string) mediaBridgeInfo {
	return mediaBridgeInfo{URLs: b.urls, Username: b.username, Credential: b.credential, Allowed: allowed}
}

func randomHex(bytes int) string {
	buf := make([]byte, bytes)
	_, _ = rand.Read(buf)
	return hex.EncodeToString(buf)
}

// meshRelay allocates relay sockets on this node's mesh address.
type meshRelay struct{ n *node }

func (r meshRelay) Validate() error { return nil }

func (r meshRelay) AllocatePacketConn(network string, requestedPort int) (net.PacketConn, net.Addr, error) {
	ip4, ip6 := r.n.srv.TailscaleIPs()
	ip := ip4
	if network == "udp6" || !ip.IsValid() {
		ip = ip6
	}
	if !ip.IsValid() {
		return nil, nil, errors.New("this node has no mesh address yet")
	}
	conn, err := r.n.srv.ListenPacket("udp", netip.AddrPortFrom(ip, uint16(requestedPort)).String())
	if err != nil {
		return nil, nil, err
	}
	return conn, conn.LocalAddr(), nil
}

func (r meshRelay) AllocateConn(string, int) (net.Conn, net.Addr, error) {
	return nil, nil, errors.New("the media bridge relays UDP only")
}

// isMediaBridgeHost: a host (or host:port) a bridge may be asked for: a name or an address,
// nothing else.
func isMediaBridgeHost(value string) bool {
	if value == "" || len(value) > 260 {
		return false
	}
	for _, c := range value {
		switch {
		case c >= 'a' && c <= 'z', c >= 'A' && c <= 'Z', c >= '0' && c <= '9':
		case c == '.', c == '-', c == ':', c == '[', c == ']':
		default:
			return false
		}
	}
	return true
}

// resolveMeshHosts turns `host` or `host:port` into the mesh addresses of the machines they
// name: an address on the mesh as it is, a name by the netmap (its MagicDNS name, full or
// short). Anything that is not a machine on the mesh is refused.
func (n *node) resolveMeshHosts(ctx context.Context, hosts []string) ([]netip.Addr, error) {
	st, err := n.lc.Status(ctx)
	if err != nil {
		return nil, err
	}
	var out []netip.Addr
	for _, raw := range hosts {
		host := raw
		if h, _, err := net.SplitHostPort(raw); err == nil {
			host = h
		}
		host = strings.TrimSuffix(strings.ToLower(strings.Trim(host, "[]")), ".")
		if ip, err := netip.ParseAddr(host); err == nil {
			out = append(out, ip)
			continue
		}
		found := false
		for _, p := range st.Peer {
			dns := strings.TrimSuffix(strings.ToLower(p.DNSName), ".")
			short := strings.SplitN(dns, ".", 2)[0]
			if dns == host || short == host || strings.ToLower(p.HostName) == host {
				out = append(out, p.TailscaleIPs...)
				found = true
			}
		}
		if !found {
			return nil, fmt.Errorf("%s is not a machine on this mesh", raw)
		}
	}
	return out, nil
}

// newMediaBridge starts a TURN server on a free 127.0.0.1 port with made-up credentials, whose
// allocations come from `relay` and which relays only to the addresses it is told to allow
// (none yet).
func newMediaBridge(relay turn.RelayAddressGenerator) (*mediaBridge, error) {
	listener, err := net.ListenPacket("udp4", "127.0.0.1:0")
	if err != nil {
		return nil, err
	}
	b := &mediaBridge{
		listener:   listener,
		urls:       []string{fmt.Sprintf("turn:127.0.0.1:%d?transport=udp", listener.LocalAddr().(*net.UDPAddr).Port)},
		username:   randomHex(8),
		credential: randomHex(16),
		allowed:    map[netip.Addr]bool{},
	}
	key := turn.GenerateAuthKey(b.username, mediaBridgeRealm, b.credential)
	server, err := turn.NewServer(turn.ServerConfig{
		Realm: mediaBridgeRealm,
		AuthHandler: func(username, _ string, _ net.Addr) ([]byte, bool) {
			return key, username == b.username
		},
		PacketConnConfigs: []turn.PacketConnConfig{{
			PacketConn:            watchedConn{PacketConn: listener, dead: &b.dead},
			RelayAddressGenerator: relay,
			PermissionHandler: func(_ net.Addr, peer net.IP) bool {
				ip, ok := netip.AddrFromSlice(peer)
				return ok && b.permits(ip)
			},
		}},
	})
	if err != nil {
		_ = listener.Close()
		return nil, err
	}
	b.server = server
	return b, nil
}

// MediaBridge starts the node's media bridge (once) and lets it relay to the machines named in
// `hostsCSV` too (comma-separated `host` or `host:port`: the media server's). It answers with
// the bridge as JSON (mediaBridgeInfo): one ICE server for WebRTC. Every ask gets the same
// bridge while the node runs; a node that stopped takes its bridge with it, and the next ask
// after a restart gets a new one. So does the next ask after the bridge's socket was taken
// away (iOS, while the app was suspended).
func MediaBridge(id, hostsCSV string) (string, error) {
	n := lookup(id)
	if n == nil {
		return "", errors.New("the mesh is not running")
	}
	var hosts []string
	for _, h := range strings.Split(hostsCSV, ",") {
		if h = strings.TrimSpace(h); h != "" {
			hosts = append(hosts, h)
		}
	}
	if len(hosts) == 0 {
		return "", errors.New("a media bridge needs the media server it relays to")
	}
	if len(hosts) > mediaBridgeMaxHosts {
		return "", errors.New("a media bridge relays to the media server's host only")
	}
	for _, h := range hosts {
		if !isMediaBridgeHost(h) {
			return "", fmt.Errorf("%q is not a host", h)
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	ips, err := n.resolveMeshHosts(ctx, hosts)
	if err != nil {
		return "", err
	}

	n.bridgeMu.Lock()
	defer n.bridgeMu.Unlock()
	if n.bridge != nil && n.bridge.dead.Load() {
		_ = n.bridge.server.Close()
		n.bridge = nil
	}
	if n.bridge == nil {
		b, err := newMediaBridge(meshRelay{n: n})
		if err != nil {
			return "", err
		}
		n.bridge = b
	}
	out, err := json.Marshal(n.bridge.info(n.bridge.allow(ips)))
	if err != nil {
		return "", err
	}
	return string(out), nil
}

// closeMediaBridge stops the node's bridge, if it runs.
func (n *node) closeMediaBridge() {
	n.bridgeMu.Lock()
	b := n.bridge
	n.bridge = nil
	n.bridgeMu.Unlock()
	if b != nil {
		_ = b.server.Close()
	}
}
