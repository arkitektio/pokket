//go:build !ios && !android

package meshmobile

import (
	"encoding/json"
	"net"
	"net/netip"
	"path/filepath"
	"testing"
	"time"
)

// The bridge on a real (in-process) tailnet: the app's WebRTC, played by a TURN client on
// loopback, reaches the media server ("svc", a UDP socket on its mesh address) through the
// node's bridge, both ways, and nothing else on the mesh.
func TestE2EMediaBridgeRelaysOverTheMesh(t *testing.T) {
	if testing.Short() {
		t.Skip("tailnet e2e")
	}
	tn := startTailnet(t, "127.0.0.1")
	rec := useRecorder(t)
	id := "e2e-media"
	t.Cleanup(func() { Stop(id) })
	if err := Start(id, filepath.Join(t.TempDir(), id), tn.controlURL, testDeviceName, testAuthKey); err != nil {
		t.Fatal(err)
	}
	rec.waitFor(t, id, "running with svc online", hasOnlinePeer(testSvcName))

	// The media server: UDP on svc's mesh address, as LiveKit's RTC port would be.
	svcIP, svcIP6 := tn.svc.TailscaleIPs()
	media, err := tn.svc.ListenPacket("udp", netip.AddrPortFrom(svcIP, 7882).String())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = media.Close() })

	// Asked by the media server's name, as the app knows it from its LiveKit url.
	raw, err := MediaBridge(id, testSvcName)
	if err != nil {
		t.Fatal(err)
	}
	var info mediaBridgeInfo
	if err := json.Unmarshal([]byte(raw), &info); err != nil {
		t.Fatal(err)
	}
	// svc's mesh addresses, and nothing else.
	for _, ip := range info.Allowed {
		if ip != svcIP.String() && ip != svcIP6.String() {
			t.Fatalf("allowed = %v, want only svc's mesh addresses %s, %s", info.Allowed, svcIP, svcIP6)
		}
	}
	if len(info.Allowed) == 0 {
		t.Fatal("the bridge allows nothing")
	}
	// A second ask gets the same bridge.
	again, err := MediaBridge(id, testSvcName+":7880")
	if err != nil || again != raw {
		t.Fatalf("a second ask must get the same bridge: %s vs %s (%v)", again, raw, err)
	}
	if _, err := MediaBridge(id, "not-on-the-mesh"); err == nil {
		t.Fatal("a machine that is not on the mesh must be refused")
	}

	client := dialBridge(t, info.URLs, info.Username, info.Credential)
	relayed, err := client.Allocate()
	if err != nil {
		t.Fatalf("allocate: %v", err)
	}
	t.Cleanup(func() { _ = relayed.Close() })

	// Out: client → bridge → mesh → svc. The relayed address is the phone's own mesh address.
	target := &net.UDPAddr{IP: svcIP.AsSlice(), Port: 7882}
	buf := make([]byte, 64)
	var from net.Addr
	deadline := time.Now().Add(20 * time.Second)
	for {
		// The first datagrams may be lost while WireGuard handshakes: resend until one lands.
		if _, err := relayed.WriteTo([]byte("frame"), target); err != nil {
			t.Fatalf("relay to svc: %v", err)
		}
		_ = media.SetReadDeadline(time.Now().Add(time.Second))
		n, addr, err := media.ReadFrom(buf)
		if err == nil && string(buf[:n]) == "frame" {
			from = addr
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("svc never got the relayed datagram: %v", err)
		}
	}

	// Back: svc → mesh → bridge → client.
	if _, err := media.WriteTo([]byte("reply"), from); err != nil {
		t.Fatal(err)
	}
	_ = relayed.SetReadDeadline(time.Now().Add(10 * time.Second))
	n, _, err := relayed.ReadFrom(buf)
	if err != nil || string(buf[:n]) != "reply" {
		t.Fatalf("the reply never came back through the bridge: %q %v", buf[:n], err)
	}

	// The node takes its bridge with it.
	Stop(id)
	if _, err := MediaBridge(id, testSvcName); err == nil {
		t.Fatal("a stopped node has no bridge")
	}
}
