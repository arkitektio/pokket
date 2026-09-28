#!/usr/bin/env bash
# The Android half of the device E2E: runs inside android-emulator-runner
# with an emulator booted. Installs the release APK, points it at the test
# tailnet, and passes when the app's self-test reports success through the
# mesh (TestDeviceEnv exits 0).
#
# Usage: scripts/ci/mesh-device-e2e-android.sh <apk>
set -euo pipefail

apk="$1"
root="$(cd "$(dirname "$0")/../.." && pwd)"
work="${RUNNER_TEMP:-/tmp}/mesh-e2e"
# The emulator reaches the host through its NAT, at the host's own address.
ip="$(hostname -I | awk '{print $1}')"

"$root/scripts/ci/mesh-device-env.sh" "$ip" "$work"
url="$(cat "$work/url")"

# Can the emulator reach the test tailnet's control server at all? (Answers
# "is it the network or the node" before the app even starts.)
control_hostport="$(python3 -c 'import json,sys,urllib.parse; u=urllib.parse.urlparse(json.load(open(sys.argv[1]))["controlUrl"]); print(u.hostname, u.port)' "$work/env.json")"
echo "::group::emulator -> control server"
adb shell "printf 'GET /key?v=1 HTTP/1.0\r\n\r\n' | toybox nc -w 5 $control_hostport | head -n 1" || echo "control server NOT reachable from the emulator"
echo "::endgroup::"

adb install -r "$apk"
adb logcat -c
adb shell "am start -W -a android.intent.action.VIEW -d '$url' live.arkitekt.pokket"
( sleep 30; adb exec-out screencap -p > "$work/screen-30s.png" ) &

status=0
while [ ! -f "$work/env.exit" ]; do sleep 2; done
status="$(cat "$work/env.exit")"
adb exec-out screencap -p > "$work/screen-end.png" || true

echo "::group::test tailnet log"
cat "$work/env.log"
echo "::endgroup::"
echo "::group::device log"
adb logcat -d | grep -E "mesh-selftest|ReactNativeJS|GoLog|PokketMesh|AndroidRuntime|CLEARTEXT|DEBUG|libc|panic|FATAL|tombstone" | tail -n 1500 || true
echo "::endgroup::"
exit "$status"
