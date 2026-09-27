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

adb install -r "$apk"
adb logcat -c
adb shell "am start -W -a android.intent.action.VIEW -d '$url' live.arkitekt.pokket"

status=0
while [ ! -f "$work/env.exit" ]; do sleep 2; done
status="$(cat "$work/env.exit")"

echo "::group::test tailnet log"
cat "$work/env.log"
echo "::endgroup::"
echo "::group::device log"
adb logcat -d | grep -E "mesh-selftest|ReactNativeJS|GoLog|PokketMesh|AndroidRuntime|CLEARTEXT" | tail -n 400 || true
echo "::endgroup::"
exit "$status"
