# Helpers shared by the device E2E drivers (mesh-device-e2e-{android,ios}.sh).
# Source after setting $root and $work.

# wait_for_line <text> <seconds>: until the test tailnet's log has <text>.
wait_for_line() {
  local text="$1" seconds="$2"
  for _ in $(seq 1 "$seconds"); do
    grep -qF -- "$text" "$work/env.log" 2>/dev/null && return 0
    [ -f "$work/env.exit" ] && break
    sleep 1
  done
  grep -qF -- "$text" "$work/env.log" 2>/dev/null
}

# mark <message>: a line in the test tailnet's log, timed like the device's.
mark() {
  local progress
  progress="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["progressUrl"])' "$work/env.json")"
  curl -s -m 5 -X POST --data "driver: $*" "$progress" > /dev/null || true
}

# start_metro <platform>: serves the JS to a development build on :8081, with
# the self-test's parameters inlined, and waits until the bundle is built.
start_metro() {
  local platform="$1" runtime
  # The runtime version, computed once: Metro would hash the native sources again for every
  # manifest it serves, and with the prebuilt native project that outlasts the 10 s a
  # development build waits for its manifest ("The request timed out" on iOS). The same value
  # the manifest would carry (app.config.ts reads it), so nothing else changes.
  runtime="$(cd "$root" && npx expo-updates fingerprint:generate --platform "$platform" 2> /dev/null \
    | python3 -c 'import json,sys; print(json.load(sys.stdin)["hash"])' 2> /dev/null || true)"
  echo "runtime version: ${runtime:-left to Metro}"
  (
    cd "$root"
    CI=1 EXPO_PUBLIC_MESH_SELFTEST=1 EXPO_PUBLIC_MESH_SELFTEST_AUTORUN="$(cat "$work/query")" \
      POKKET_RUNTIME_VERSION="$runtime" \
      npx expo start --dev-client --port 8081 > "$work/metro.log" 2>&1
  ) &
  for _ in $(seq 1 120); do
    curl -s -m 2 http://127.0.0.1:8081/status | grep -q running && break
    sleep 1
  done
  # Build the bundle once up front, so the app's first load does not time out (iOS gives up
  # on a request after 60 s; a cold build on a runner takes about as long). It must be the
  # very bundle the development build will ask for: Metro builds and keeps each variant
  # apart, and the app's (lazy, Hermes bytecode, router root) is not the plain entry's, so
  # warming another one left the app's own load cold. The manifest names it.
  local manifest bundle
  manifest="$(curl -sf -m 60 -H "expo-platform: $platform" -H "accept: application/expo+json,application/json" \
    http://127.0.0.1:8081/ || true)"
  bundle="$(printf '%s' "$manifest" | python3 -c 'import json,sys; print(json.load(sys.stdin)["launchAsset"]["url"])' 2> /dev/null || true)"
  if [ -z "$bundle" ]; then
    echo "no launch asset in the manifest; warming the plain entry instead"
    bundle="http://127.0.0.1:8081/.expo/.virtual-metro-entry.bundle?platform=$platform&dev=true&minify=false"
  fi
  echo "building the $platform dev bundle: $bundle"
  curl -sf -m 900 -o /dev/null -H "expo-platform: $platform" "$bundle" \
    || { echo "Metro did not build the bundle"; tail -n 80 "$work/metro.log"; return 1; }
  echo "dev bundle ready"
  # What the development build will wait at most 10 s for: said, so a slow one is not a mystery.
  curl -s -m 60 -o /dev/null -w "manifest served in %{time_total} s\n" \
    -H "expo-platform: $platform" -H "accept: application/expo+json,application/json" http://127.0.0.1:8081/ || true
}

# The deep link a development build opens to load its JS from Metro.
DEV_CLIENT_URL="pokket://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081"
WARM_LINK="pokket://mesh-selftest?probe=warm"

# expect_line <text> <what>: records a failed link check when the log lacks <text>.
link_failures=0
expect_line() {
  if grep -qF -- "$1" "$work/env.log"; then
    echo "link check ok: $2"
  else
    echo "::error::link check failed: $2 (no \"$1\" in the test tailnet log)"
    link_failures=1
  fi
}

# Background helpers (Metro, log streams, delayed screenshots) must not
# outlive the driver: they hold its output open, and a runner that waits for
# the output to close (android-emulator-runner does) waits until the job
# times out.
kill_tree() {
  local child
  for child in $(pgrep -P "$1" 2> /dev/null); do kill_tree "$child"; done
  kill "$1" 2> /dev/null || true
}
stop_background() {
  local pid
  for pid in $(jobs -p); do kill_tree "$pid"; done
}
trap stop_background EXIT
