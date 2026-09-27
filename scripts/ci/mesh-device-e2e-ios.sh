#!/usr/bin/env bash
# The iOS half of the device E2E: boots a simulator, installs the Release
# .app, points it at the test tailnet, and passes when the app's self-test
# reports success through the mesh (TestDeviceEnv exits 0).
#
# Usage: scripts/ci/mesh-device-e2e-ios.sh <path to pokket.app>
set -euo pipefail

app="$1"
root="$(cd "$(dirname "$0")/../.." && pwd)"
work="${RUNNER_TEMP:-/tmp}/mesh-e2e"

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
"$root/scripts/ci/mesh-device-env.sh" 127.0.0.1 "$work"
url="$(cat "$work/url")"

xcrun simctl spawn "$udid" log stream --style compact --level debug \
  --predicate 'process == "pokket"' > "$work/device.log" 2>&1 &
logger=$!

xcrun simctl install "$udid" "$app"
xcrun simctl openurl "$udid" "$url"

status=0
while [ ! -f "$work/env.exit" ]; do sleep 2; done
status="$(cat "$work/env.exit")"
kill "$logger" 2>/dev/null || true

echo "::group::test tailnet log"
cat "$work/env.log"
echo "::endgroup::"
echo "::group::device log"
grep -E "mesh-selftest|pokket-mesh|Meshmobile|ATS|App Transport|error" "$work/device.log" | tail -n 400 || true
echo "::endgroup::"
exit "$status"
