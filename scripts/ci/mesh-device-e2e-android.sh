#!/usr/bin/env bash
# The Android half of the device E2E: runs inside android-emulator-runner
# with an emulator booted. Installs the APK, points it at the test tailnet,
# and passes when the app's self-test reports success through the mesh
# (TestDeviceEnv exits 0) AND the deep links it was sent reached the app's JS.
#
#   release: the release APK, started cold by the self-test's deep link.
#   dev:     a development build (expo-dev-client) loading its JS from Metro,
#            then handed the self-test's link while running.
#
# Usage: scripts/ci/mesh-device-e2e-android.sh <apk> [release|dev]
set -euo pipefail

apk="$1"
variant="${2:-release}"
root="$(cd "$(dirname "$0")/../.." && pwd)"
work="${RUNNER_TEMP:-/tmp}/mesh-e2e"
# shellcheck source=scripts/ci/mesh-e2e-lib.sh
. "$root/scripts/ci/mesh-e2e-lib.sh"
# The emulator reaches the host through its NAT, at the host's own address.
ip="$(hostname -I | awk '{print $1}')"

[ "$variant" = dev ] && export MESH_E2E_WAIT=25m
"$root/scripts/ci/mesh-device-env.sh" "$ip" "$work"
url="$(cat "$work/url")"

# Can the emulator reach the test tailnet's control server at all? (Answers
# "is it the network or the node" before the app even starts.)
control_hostport="$(python3 -c 'import json,sys,urllib.parse; u=urllib.parse.urlparse(json.load(open(sys.argv[1]))["controlUrl"]); print(u.hostname, u.port)' "$work/env.json")"
echo "::group::emulator -> control server"
adb shell "printf 'GET /key?v=1 HTTP/1.0\r\n\r\n' | toybox nc -w 5 $control_hostport | head -n 1" || echo "control server NOT reachable from the emulator"
echo "::endgroup::"

open_link() {
  mark "opening $1"
  adb shell "am start -W -a android.intent.action.VIEW -d '$1' live.arkitekt.pokket" || echo "am start failed"
}

if [ "$variant" = dev ]; then
  start_metro android
  adb reverse tcp:8081 tcp:8081
fi

adb install -r "$apk"
adb logcat -c
( sleep 60; adb exec-out screencap -p > "$work/screen-60s.png" ) &

if [ "$variant" = dev ]; then
  open_link "$DEV_CLIENT_URL"
  wait_for_line "app booted" 300 || echo "the app did not boot from Metro in 300 s"
  open_link "$url"
else
  # Cold start by the link, as when a user taps it with the app closed.
  open_link "$url"
fi
if wait_for_line "self-test started" 120; then
  open_link "$WARM_LINK"
fi

while [ ! -f "$work/env.exit" ]; do sleep 2; done
status="$(cat "$work/env.exit")"
adb exec-out screencap -p > "$work/screen-end.png" || true

echo "::group::test tailnet log"
cat "$work/env.log"
echo "::endgroup::"
echo "::group::device log"
adb logcat -d | grep -E "mesh-selftest|ReactNativeJS|GoLog|PokketMesh|DevLauncher|AndroidRuntime|CLEARTEXT|DEBUG|libc|panic|FATAL|tombstone" | tail -n 1500 || true
echo "::endgroup::"
if [ "$variant" = dev ]; then
  echo "::group::metro log"
  tail -n 200 "$work/metro.log" || true
  echo "::endgroup::"
fi

[ "$variant" = dev ] && expect_line "url event: pokket://mesh-selftest?control=" "the self-test link reached the running app"
expect_line "starting (from deep link)" "the self-test link was routed to its screen"
expect_line "url event: $WARM_LINK" "a link sent to the running app reached its JS"
[ "$status" = 0 ] || exit "$status"
exit "$link_failures"
