#!/usr/bin/env bash
# A throwaway tailnet on this machine for trying the mesh from a development
# build: the same one CI's device self-test joins (TestDeviceEnv in
# modules/pokket-mesh/go/e2e_test.go), with a service "svc:8080" on it.
# Prints the pokket://mesh-selftest link; open it on the phone / emulator /
# simulator running the dev build and the app joins, forwards, fetches and
# reports back here. Needs Go, and the phone on the same network as this machine.
#
# Usage: pnpm mesh:tailnet [ip the phone can reach this machine at]
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
work="$(mktemp -d)"
ip="${1:-}"
if [ -z "$ip" ]; then
  if [ "$(uname)" = Darwin ]; then
    ip="$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || true)"
  else
    ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
  fi
fi
[ -n "$ip" ] || { echo "could not tell this machine's LAN address; pass it: pnpm mesh:tailnet <ip>" >&2; exit 1; }

MESH_E2E_WAIT="${MESH_E2E_WAIT:-60m}" "$root/scripts/ci/mesh-device-env.sh" "$ip" "$work" > /dev/null
url="$(cat "$work/url")"
cat <<MSG

Test tailnet up at $ip (for ${MESH_E2E_WAIT:-60m}). Open this link in the dev build:

  $url

  Android device/emulator:  adb shell am start -a android.intent.action.VIEW -d '$url'
  iOS simulator:            xcrun simctl openurl booted '$url'

Waiting for the app's report…
MSG
tail -n +1 -f "$work/env.log" | grep --line-buffered -E 'device:|device report|--- (PASS|FAIL)|^\s+(true|false) ' &
tailer=$!
while [ ! -f "$work/env.exit" ]; do sleep 1; done
kill "$tailer" 2>/dev/null || true
status="$(cat "$work/env.exit")"
[ "$status" = 0 ] && echo "PASS: the app got through the mesh." || echo "FAIL (details: $work/env.log)"
exit "$status"
