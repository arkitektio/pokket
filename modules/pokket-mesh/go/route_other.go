//go:build !android && !darwin

package meshmobile

// SetDefaultRoute is a no-op where tsnet reads the route table itself.
func SetDefaultRoute(ifName, gateway string) {}
