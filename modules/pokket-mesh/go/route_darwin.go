//go:build darwin

package meshmobile

import "tailscale.com/net/netmon"

// SetDefaultRoute tells tsnet which interface carries the default route, as
// NWPathMonitor reports it. Without it tsnet falls back to reading the route
// table itself. The gateway is not used on Apple platforms.
func SetDefaultRoute(ifName, gateway string) {
	netmon.UpdateLastKnownDefaultRouteInterface(ifName)
}
