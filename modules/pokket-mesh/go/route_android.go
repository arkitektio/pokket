//go:build android

package meshmobile

import "tailscale.com/net/netmon"

// SetDefaultRoute tells tsnet which interface (and gateway) currently carries
// the default route. On Android tsnet cannot find out by itself — /proc/net/route
// and netlink are closed to apps — so the native module reports what
// ConnectivityManager says, as Tailscale's own Android client does. An empty
// ifName means the network is gone.
func SetDefaultRoute(ifName, gateway string) {
	netmon.UpdateLastKnownDefaultRouteInterface(ifName)
	netmon.UpdateLastKnownDefaultGateway(gateway)
}
