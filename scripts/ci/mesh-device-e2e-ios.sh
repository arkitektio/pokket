#!/usr/bin/env bash
# The iOS half of the device E2E: boots a simulator, installs the .app,
# points it at the test tailnet, and passes when the app's self-test reports
# success through the mesh (TestDeviceEnv exits 0) AND the deep links it was
# sent reached the app's JS.
#
#   release: the Release build, started cold by the self-test's deep link.
#   dev:     a Debug build (expo-dev-client) loading its JS from Metro, then
#            handed the self-test's link while running.
# Either build also carries the parameters (EXPO_PUBLIC_MESH_SELFTEST_AUTORUN)
# and starts the test itself if no link has, so a lost link still leaves a
# report of the mesh — and fails the link check.
#
# Usage: scripts/ci/mesh-device-e2e-ios.sh <path to pokket.app> [release|dev]
set -euo pipefail

app="$1"
variant="${2:-release}"
root="$(cd "$(dirname "$0")/../.." && pwd)"
work="${RUNNER_TEMP:-/tmp}/mesh-e2e"
# shellcheck source=scripts/ci/mesh-e2e-lib.sh
. "$root/scripts/ci/mesh-e2e-lib.sh"

udid="$(xcrun simctl list devices available -j | python3 -c '
import json, sys
devices = json.load(sys.stdin)["devices"]
for runtime, list_ in sorted(devices.items(), reverse=True):
    if "iOS" in runtime:
        for d in list_:
            if d["name"].startswith("iPhone"):
                print(d["udid"]); sys.exit()
')"
echo "simulator: $udid"
xcrun simctl boot "$udid" || true
xcrun simctl bootstatus "$udid" -b

# The simulator shares the Mac's network, loopback included.
[ "$variant" = dev ] && export MESH_E2E_WAIT=25m
# The warm link can land after the report; keep listening a little longer.
export MESH_E2E_LINGER=30s
"$root/scripts/ci/mesh-device-env.sh" 127.0.0.1 "$work"
url="$(cat "$work/url")"

open_link() {
  mark "opening $1"
  xcrun simctl openurl "$udid" "$1" || echo "openurl failed"
}

[ "$variant" = dev ] && start_metro ios

xcrun simctl spawn "$udid" log stream --style compact --level debug \
  --predicate 'process CONTAINS[c] "pokket" OR eventMessage CONTAINS "mesh-selftest"' > "$work/device.log" 2>&1 &
logger=$!

xcrun simctl install "$udid" "$app"
( sleep 60; xcrun simctl io "$udid" screenshot "$work/screen-60s.png" ) &

if [ "$variant" = dev ]; then
  xcrun simctl launch "$udid" live.arkitekt.pokket || echo "launch failed"
  open_link "$DEV_CLIENT_URL"
  wait_for_line "app booted" 300 || echo "the app did not boot from Metro in 300 s"
  open_link "$url"
else
  # Cold start by the link, as when a user taps it with the app closed.
  open_link "$url"
  if ! wait_for_line "app booted" 120; then
    echo "no boot after the cold link; launching the app directly"
    xcrun simctl launch "$udid" live.arkitekt.pokket || echo "launch failed"
  fi
fi
if wait_for_line "self-test started" 120; then
  open_link "$WARM_LINK"
fi

while [ ! -f "$work/env.exit" ]; do sleep 2; done
status="$(cat "$work/env.exit")"
xcrun simctl io "$udid" screenshot "$work/screen-end.png" || true
kill "$logger" 2>/dev/null || true

echo "::group::test tailnet log"
cat "$work/env.log"
echo "::endgroup::"
echo "::group::device log"
grep -E "mesh-selftest|pokket-mesh|Meshmobile|Opening URL|ATS|App Transport|error|fault|crash" "$work/device.log" | tail -n 600 || true
echo "::endgroup::"
echo "::group::crash reports"
ls -la ~/Library/Logs/DiagnosticReports 2>/dev/null | grep -i pokket || echo "no pokket crash reports"
for f in ~/Library/Logs/DiagnosticReports/*pokket*; do [ -f "$f" ] && head -n 80 "$f"; done
echo "::endgroup::"
if [ "$variant" = dev ]; then
  echo "::group::metro log"
  tail -n 200 "$work/metro.log" || true
  echo "::endgroup::"
  expect_line "url event: pokket://mesh-selftest?control=" "the self-test link reached the running app"
else
  expect_line "initial url: pokket://mesh-selftest?control=" "the app was started by the self-test link"
fi
expect_line "starting (from deep link)" "the self-test link was routed to its screen"
expect_line "url event: $WARM_LINK" "a link sent to the running app reached its JS"
[ "$status" = 0 ] || exit "$status"
exit "$link_failures"
