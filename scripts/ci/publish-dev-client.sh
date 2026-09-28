#!/usr/bin/env bash
# Puts a dev-client build on the "dev-client" pre-release under a fixed name,
# so the latest one always has the same download link.
# Usage: scripts/ci/publish-dev-client.sh <file> <published name>
set -euo pipefail

file="$1"
name="$2"
tag=dev-client
# On pull requests GITHUB_SHA is the merge commit; name the branch commit.
sha="${HEAD_SHA:-$GITHUB_SHA}"
short="${sha::7}"
notes="Development client (expo-dev-client) with the mesh sidecar, built by the \"Dev client\" workflow.

Android: install pokket-dev.apk on the phone. iOS simulator: unzip pokket-dev-simulator.zip, then \`xcrun simctl install booted pokket.app\`.
Then run \`pnpm expo start --dev-client\` and open the app.

Latest upload: ${name} from ${GITHUB_HEAD_REF:-$GITHUB_REF_NAME} @ ${short} ($(date -u +%Y-%m-%dT%H:%MZ))."

if ! gh release view "$tag" > /dev/null 2>&1; then
  gh release create "$tag" --prerelease --target "$sha" --title "Development client" --notes "$notes"
else
  gh release edit "$tag" --notes "$notes"
fi
cp "$file" "$RUNNER_TEMP/$name"
gh release upload "$tag" "$RUNNER_TEMP/$name" --clobber
echo "https://github.com/$GITHUB_REPOSITORY/releases/download/$tag/$name"
