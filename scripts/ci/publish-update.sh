#!/usr/bin/env bash
# Publish this checkout's JS as an over-the-air update to updates.arkitekt.live.
#
# Usage: UPDATES_TOKEN=... scripts/ci/publish-update.sh <android|ios> <runtime version> <channel> <message>
# The runtime version must be the one the binary was built with: in release.yaml,
# pass steps.native.outputs.runtime_version (scripts/ci/native-build.sh check).
# Prints the server's answer (the new update's id) on stdout, everything else on stderr.
set -euo pipefail

platform="$1" runtime="$2" channel="$3" message="$4"
server="${UPDATES_URL:-https://updates.arkitekt.live}"
: "${UPDATES_TOKEN:?set UPDATES_TOKEN}"

out="$(mktemp -d)"
trap 'rm -rf "$out"' EXIT

npx expo export --platform "$platform" --output-dir "$out/dist" >&2
# Becomes the manifest's extra.expoClient: Constants.expoConfig in an updated app
# (Settings reads the version from it, lib/updates/useUpdateInfo.ts).
npx expo config --type public --json > "$out/dist/expoConfig.json"
tar czf "$out/update.tgz" -C "$out/dist" .

curl -fsS --retry 3 \
  -H "Authorization: Bearer $UPDATES_TOKEN" \
  -F "archive=@$out/update.tgz" \
  -F "platform=$platform" \
  -F "runtimeVersion=$runtime" \
  -F "channel=$channel" \
  -F "message=$message" \
  "$server/api/publish"
echo
