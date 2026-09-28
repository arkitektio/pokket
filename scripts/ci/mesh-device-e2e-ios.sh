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

# idb (installed by the workflow) drives the simulator's UI; see tap_text.
if command -v idb_companion > /dev/null && command -v idb > /dev/null; then
  mkdir -p "$work"
  idb_companion --udid "$udid" > "$work/idb-companion.log" 2>&1 &
  sleep 5
  idb connect localhost 10882 || echo "idb connect failed"
else
  echo "idb is not installed; link prompts cannot be answered"
fi

# The simulator shares the Mac's network, loopback included.
[ "$variant" = dev ] && export MESH_E2E_WAIT=25m
# The warm link can land after the report; keep listening a little longer.
export MESH_E2E_LINGER=30s
"$root/scripts/ci/mesh-device-env.sh" 127.0.0.1 "$work"
url="$(cat "$work/url")"

# What is on the simulator's screen, as text (and in the log via `mark`).
swiftc -O "$root/scripts/ci/ocr.swift" -o "$work/ocr" 2>/dev/null || echo "no OCR"
screen_text() {
  xcrun simctl io "$udid" screenshot "$work/screen-$1.png" > /dev/null 2>&1 || return 0
  local text
  text="$("$work/ocr" "$work/screen-$1.png" 2>/dev/null | head -c 600 || true)"
  last_screen="$text"
  echo "screen ($1): $text"
  mark "screen ($1): $text"
}

# Taps the on-screen text $1 (a system alert's button) through idb: the
# simulator has no other way to press a button from a script.
# Without idb: bring the Simulator app forward and press Return, which a
# UIKit alert takes as its default action ("Open" on the link prompt).
press_return() {
  open -a Simulator --args -CurrentDeviceUDID "$udid" 2> /dev/null || return 1
  sleep 5
  osascript -e 'tell application "Simulator" to activate' \
    -e 'delay 1' \
    -e 'tell application "System Events" to key code 36' || return 1
  echo "pressed Return in the Simulator app"
}

tap_text() {
  local label="$1" pos size x y
  command -v idb > /dev/null || { echo "no idb to tap \"$label\"; pressing Return instead"; press_return; return; }
  xcrun simctl io "$udid" screenshot "$work/tap.png" > /dev/null 2>&1 || return 1
  pos="$("$work/ocr" "$work/tap.png" "$label" 2>/dev/null)" || { echo "\"$label\" is not on screen"; return 1; }
  size="$(idb describe --json 2>/dev/null | python3 -c '
import json, sys
d = json.load(sys.stdin)["screen_dimensions"]
density = d.get("density") or 1
print(d.get("width_points") or d["width"] / density, d.get("height_points") or d["height"] / density)
')" || { echo "idb describe failed"; return 1; }
  read -r x y <<< "$(python3 -c 'import sys; px, py, w, h = map(float, sys.argv[1:]); print(round(px * w), round(py * h))' $pos $size)"
  echo "tapping \"$label\" at $x,$y (screen $size points)"
  idb ui tap "$x" "$y"
}

# openurl can block (it waits on the system to open the URL); never let it
# hold up the run, and look at the screen once it has had time to act.
link_count=0
open_link() {
  link_count=$((link_count + 1))
  mark "opening $1"
  local started=$SECONDS
  perl -e 'alarm shift; exec @ARGV' 60 xcrun simctl openurl "$udid" "$1" || echo "openurl failed or timed out"
  echo "openurl returned after $((SECONDS - started)) s"
  mark "openurl returned after $((SECONDS - started)) s"
  sleep 5
  screen_text "link$link_count"
  # A fresh simulator asks before it opens a custom-scheme link from outside
  # the app ("Open in "pokket"?"), as a phone does the first time a link is
  # tapped. Answer it the way a user would.
  if [[ "$last_screen" == *"Open in"* ]]; then
    if tap_text Open || press_return; then mark "answered the link prompt"; else mark "could not answer the link prompt"; fi
    sleep 5
    screen_text "link$link_count-after"
  fi
}

[ "$variant" = dev ] && start_metro ios

xcrun simctl spawn "$udid" log stream --style compact --level debug \
  --predicate 'process CONTAINS[c] "pokket" OR eventMessage CONTAINS[c] "pokket"' > "$work/device.log" 2>&1 &
logger=$!

xcrun simctl install "$udid" "$app"
( sleep 60; xcrun simctl io "$udid" screenshot "$work/screen-60s.png" ) &

if [ "$variant" = dev ]; then
  xcrun simctl launch "$udid" live.arkitekt.pokket || echo "launch failed"
  open_link "$DEV_CLIENT_URL"
  wait_for_line "app booted" 300 || { echo "the app did not boot from Metro in 300 s"; screen_text no-boot; }
  open_link "$url"
else
  # Cold start by the link, as when a user taps it with the app closed.
  open_link "$url"
  if ! wait_for_line "app booted" 150; then
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
echo "::group::device log: links"
# Every line about a pokket:// URL, from any process (SpringBoard's handling
# of openurl included), and what the app's JS made of it.
grep -E "pokket://|url event|native url|initial url|app booted|openURL|OpenURL" "$work/device.log" | grep -v "node: tsnet" | head -n 300 || true
echo "::endgroup::"
echo "::group::device log"
grep -E "mesh-selftest|pokket-mesh|Meshmobile|ATS|App Transport|error|fault|crash" "$work/device.log" | grep -v "node: tsnet" | tail -n 400 || true
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
