#!/usr/bin/env bash
# Starts the test tailnet a device self-test joins (TestDeviceEnv in
# modules/pokket-mesh/go/e2e_test.go) in the background, and prints the
# pokket://mesh-selftest deep link for it.
#
# Usage: source-free — run as
#   scripts/ci/mesh-device-env.sh <advertise-ip> <workdir>
# It writes <workdir>/env.log and <workdir>/url, and <workdir>/env.exit (the
# exit status: 0 = the device reported success) once the tailnet is done.
set -euo pipefail

ip="$1"
work="$2"
root="$(cd "$(dirname "$0")/../.." && pwd)"
mkdir -p "$work"

(cd "$root/modules/pokket-mesh/go" && go test -c -o "$work/mesh.test" .)

rm -f "$work/env.json" "$work/env.exit"
# The exit status lands in env.exit: callers are not this process's parent,
# so they cannot `wait` for it.
(
  status=0
  MESH_E2E_ENV=1 MESH_E2E_ADVERTISE_IP="$ip" MESH_E2E_OUT="$work/env.json" MESH_E2E_WAIT="${MESH_E2E_WAIT:-10m}" \
    "$work/mesh.test" -test.run '^TestDeviceEnv$' -test.v -test.timeout 20m > "$work/env.log" 2>&1 || status=$?
  echo "$status" > "$work/env.exit"
) &

for _ in $(seq 1 120); do
  [ -s "$work/env.json" ] && break
  [ -f "$work/env.exit" ] && break
  sleep 1
done
if [ ! -s "$work/env.json" ]; then
  echo "test tailnet did not come up" >&2
  cat "$work/env.log" >&2
  exit 1
fi

python3 - "$work/env.json" > "$work/url" <<'PY'
import json, sys, urllib.parse
env = json.load(open(sys.argv[1]))
query = urllib.parse.urlencode({
    "control": env["controlUrl"], "key": env["authKey"], "host": env["host"], "port": env["port"],
    "progress": env["progressUrl"],
})
print(f"pokket://mesh-selftest?{query}")
PY
echo "test tailnet up: $(cat "$work/url")"
