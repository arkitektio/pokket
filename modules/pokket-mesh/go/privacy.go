package meshmobile

import (
	"tailscale.com/envknob"
	"tailscale.com/logtail"
)

// tsnet is built for Tailscale's own service: left alone it uploads its logs
// to log.tailscale.com, whatever control server it joins. pokket's meshes
// run on the organisation's own ionscale, so nothing may leave for Tailscale.
//
// The port mapper (UPnP/NAT-PMP/PCP towards the home router) is off too: on a
// phone it rarely helps (cellular is CGNAT), and every probe of the LAN is a
// reason for iOS to raise its Local Network prompt. Direct paths via STUN and
// DERP relays still work.
func init() {
	envknob.SetNoLogsNoSupport()
	logtail.Disable()
	envknob.Setenv("TS_DISABLE_PORTMAPPER", "true")
}
