package meshmobile

import (
	"errors"
	"net"
	"net/netip"
	"strings"
	"testing"
	"time"

	"github.com/pion/turn/v4"
)

func TestMediaBridgeRelaysOnlyToWhatItWasStartedFor(t *testing.T) {
	b := &mediaBridge{allowed: map[netip.Addr]bool{}}
	b.allow([]netip.Addr{netip.MustParseAddr("100.94.134.250")})

	if !b.permits(netip.MustParseAddr("100.94.134.250")) {
		t.Fatal("the media server's mesh address must be permitted")
	}
	// The same address in its IPv4-mapped IPv6 form (as a peer IP may arrive).
	if !b.permits(netip.MustParseAddr("::ffff:100.94.134.250")) {
		t.Fatal("an IPv4-mapped form of the media server's address must be permitted")
	}
	for _, other := range []string{"100.94.134.251", "192.168.1.10", "8.8.8.8"} {
		if b.permits(netip.MustParseAddr(other)) {
			t.Fatalf("%s is not the media server and must be refused", other)
		}
	}
}

func TestMediaBridgeRefusesTCP(t *testing.T) {
	if _, _, err := (meshRelay{}).AllocateConn("tcp", 0); err == nil {
		t.Fatal("a TCP allocation must be refused: live media is UDP")
	}
}

func TestMediaBridgeAsksAreChecked(t *testing.T) {
	if _, err := MediaBridge("not-running", "svc"); err == nil {
		t.Fatal("a node that is not running has no bridge")
	}
	for _, bad := range []string{"", "a b", "svc/x", "svc?x", strings.Repeat("a", 300)} {
		if isMediaBridgeHost(bad) {
			t.Fatalf("%q must not pass as a host", bad)
		}
	}
	for _, good := range []string{"svc", "livekit.lab.ts.net", "100.64.0.1:7880", "[fd7a:115c:a1e0::1]"} {
		if !isMediaBridgeHost(good) {
			t.Fatalf("%q must pass as a host", good)
		}
	}
}

// localRelay allocates on loopback instead of the mesh: the bridge's TURN, auth and allow-list
// are what is tested, not tsnet.
type localRelay struct{}

func (localRelay) Validate() error { return nil }
func (localRelay) AllocatePacketConn(string, int) (net.PacketConn, net.Addr, error) {
	conn, err := net.ListenPacket("udp4", "127.0.0.1:0")
	if err != nil {
		return nil, nil, err
	}
	return conn, conn.LocalAddr(), nil
}
func (localRelay) AllocateConn(string, int) (net.Conn, net.Addr, error) {
	return nil, nil, errors.New("udp only")
}

func dialBridge(t *testing.T, urls []string, username, password string) *turn.Client {
	t.Helper()
	local, err := net.ListenPacket("udp4", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	server := strings.TrimSuffix(strings.TrimPrefix(urls[0], "turn:"), "?transport=udp")
	client, err := turn.NewClient(&turn.ClientConfig{
		STUNServerAddr: server,
		TURNServerAddr: server,
		Conn:           local,
		Username:       username,
		Password:       password,
		Realm:          mediaBridgeRealm,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := client.Listen(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { client.Close(); _ = local.Close() })
	return client
}

func TestMediaBridgeRelaysWithItsCredentialsToAllowedPeersOnly(t *testing.T) {
	b, err := newMediaBridge(localRelay{})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = b.server.Close() })
	b.allow([]netip.Addr{netip.MustParseAddr("127.0.0.1")})

	// The media server: a UDP socket on an allowed address.
	media, err := net.ListenPacket("udp4", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = media.Close() })

	client := dialBridge(t, b.urls, b.username, b.credential)
	relayed, err := client.Allocate()
	if err != nil {
		t.Fatalf("allocating with the bridge's own credentials: %v", err)
	}
	t.Cleanup(func() { _ = relayed.Close() })

	if _, err := relayed.WriteTo([]byte("frame"), media.LocalAddr()); err != nil {
		t.Fatalf("relaying to the allowed media server: %v", err)
	}
	_ = media.SetReadDeadline(time.Now().Add(3 * time.Second))
	buf := make([]byte, 64)
	n, _, err := media.ReadFrom(buf)
	if err != nil || string(buf[:n]) != "frame" {
		t.Fatalf("the media server did not get the relayed datagram: %q %v", buf[:n], err)
	}

	// Any other machine is refused: the permission is never granted.
	other := &net.UDPAddr{IP: net.ParseIP("127.0.0.2"), Port: 9}
	if _, err := relayed.WriteTo([]byte("frame"), other); err == nil {
		t.Fatal("relaying to a machine the bridge was not started for must fail")
	}
}

func TestMediaBridgeRefusesAWrongPassword(t *testing.T) {
	b, err := newMediaBridge(localRelay{})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = b.server.Close() })
	client := dialBridge(t, b.urls, b.username, "not-the-password")
	if _, err := client.Allocate(); err == nil {
		t.Fatal("an allocation with a wrong password must be refused")
	}
}

// iOS reclaims a suspended app's sockets: a bridge whose listener stopped reading says so, and
// the next ask gets a new one that works (see MediaBridge).
func TestMediaBridgeKnowsWhenItsSocketIsGone(t *testing.T) {
	b, err := newMediaBridge(localRelay{})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = b.server.Close() })
	if b.dead.Load() {
		t.Fatal("a fresh bridge is not dead")
	}
	// Taken away from under the server, as a reclaimed socket is.
	_ = b.listener.Close()
	deadline := time.Now().Add(3 * time.Second)
	for !b.dead.Load() {
		if time.Now().After(deadline) {
			t.Fatal("a bridge whose socket is gone must know it")
		}
		time.Sleep(10 * time.Millisecond)
	}
}
