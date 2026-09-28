package meshmobile

import (
	"fmt"
	"net"
	"strings"
	"sync"

	"tailscale.com/net/netmon"
)

// Android 11+ forbids apps the netlink sockets Go's net.Interfaces relies
// on, so tsnet cannot see the device's interfaces by itself (it fails with
// "netlinkrib: permission denied"). The native module reads them from
// java.net.NetworkInterface instead and hands them over as text, the same
// arrangement Tailscale's own Android client uses.
//
// Format: one interface per line,
//
//	name index mtu up broadcast loopback pointToPoint multicast | addr/prefix addr/prefix ...
//
// with the five flags as "true"/"false". iOS never calls this.

var (
	ifacesMu     sync.Mutex
	ifacesText   string
	ifacesGetter sync.Once
)

// SetInterfaces replaces the interface list tsnet sees. Call it before
// Start, and again whenever the device's network changes.
func SetInterfaces(text string) {
	ifacesMu.Lock()
	ifacesText = text
	ifacesMu.Unlock()
	ifacesGetter.Do(func() {
		netmon.RegisterInterfaceGetter(func() ([]netmon.Interface, error) {
			ifacesMu.Lock()
			t := ifacesText
			ifacesMu.Unlock()
			return parseInterfaces(t)
		})
	})
}

func parseInterfaces(text string) ([]netmon.Interface, error) {
	var out []netmon.Interface
	for _, line := range strings.Split(text, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		head, addrs, _ := strings.Cut(line, "|")
		fields := strings.Fields(head)
		if len(fields) != 8 {
			return nil, fmt.Errorf("malformed interface line %q", line)
		}
		var index, mtu int
		if _, err := fmt.Sscan(fields[1], &index); err != nil {
			return nil, fmt.Errorf("interface index %q: %w", fields[1], err)
		}
		if _, err := fmt.Sscan(fields[2], &mtu); err != nil {
			return nil, fmt.Errorf("interface mtu %q: %w", fields[2], err)
		}
		var flags net.Flags
		for i, f := range []net.Flags{net.FlagUp, net.FlagBroadcast, net.FlagLoopback, net.FlagPointToPoint, net.FlagMulticast} {
			if fields[3+i] == "true" {
				flags |= f
			}
		}
		iface := netmon.Interface{
			Interface: &net.Interface{Index: index, MTU: mtu, Name: fields[0], Flags: flags},
			AltAddrs:  []net.Addr{},
		}
		for _, a := range strings.Fields(addrs) {
			ip, ipnet, err := net.ParseCIDR(a)
			if err != nil {
				continue
			}
			iface.AltAddrs = append(iface.AltAddrs, &net.IPNet{IP: ip, Mask: ipnet.Mask})
		}
		out = append(out, iface)
	}
	return out, nil
}
