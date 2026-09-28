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
  local platform="$1"
  (
    cd "$root"
    CI=1 EXPO_PUBLIC_MESH_SELFTEST=1 EXPO_PUBLIC_MESH_SELFTEST_AUTORUN="$(cat "$work/query")" \
      npx expo start --dev-client --port 8081 > "$work/metro.log" 2>&1
  ) &
  for _ in $(seq 1 120); do
    curl -s -m 2 http://127.0.0.1:8081/status | grep -q running && break
    sleep 1
  done
  # Build the bundle once up front, so the app's first load does not time out.
  echo "building the $platform dev bundle…"
  curl -sf -m 900 -o /dev/null \
    "http://127.0.0.1:8081/.expo/.virtual-metro-entry.bundle?platform=$platform&dev=true&minify=false" \
    || { echo "Metro did not build the bundle"; tail -n 80 "$work/metro.log"; return 1; }
  echo "dev bundle ready"
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
