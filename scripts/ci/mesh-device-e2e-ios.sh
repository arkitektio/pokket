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
  --predicate 'process CONTAINS[c] "pokket" OR eventMessage CONTAINS "mesh-selftest"' > "$work/device.log" 2>&1 &
logger=$!

xcrun simctl install "$udid" "$app"
# Start the app first, then hand it the link: a cold openurl of a custom
# scheme can stop at an "Open in …?" confirmation.
xcrun simctl launch "$udid" live.arkitekt.pokket || echo "launch failed"
sleep 8
xcrun simctl openurl "$udid" "$url" || echo "openurl failed"
( sleep 30; xcrun simctl io "$udid" screenshot "$work/screen-30s.png" ) &

status=0
while [ ! -f "$work/env.exit" ]; do sleep 2; done
status="$(cat "$work/env.exit")"
xcrun simctl io "$udid" screenshot "$work/screen-end.png" || true
kill "$logger" 2>/dev/null || true

echo "::group::test tailnet log"
cat "$work/env.log"
echo "::endgroup::"
echo "::group::device log"
grep -E "mesh-selftest|pokket-mesh|Meshmobile|ATS|App Transport|error|fault|crash" "$work/device.log" | tail -n 600 || true
echo "::endgroup::"
echo "::group::crash reports"
ls -la ~/Library/Logs/DiagnosticReports 2>/dev/null | grep -i pokket || echo "no pokket crash reports"
for f in ~/Library/Logs/DiagnosticReports/*pokket*; do [ -f "$f" ] && head -n 80 "$f"; done
echo "::endgroup::"
exit "$status"
