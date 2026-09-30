#!/usr/bin/env bash
# Puts a build on a pre-release under a fixed name, so the newest one always
# has the same download link:
#   https://github.com/<repo>/releases/download/<tag>/<name>
# Usage: scripts/ci/publish-download.sh <tag> <title> <file> <name>
# The release notes come from $NOTES; a line naming this upload is added.
set -euo pipefail

tag="$1"
title="$2"
file="$3"
name="$4"
# On pull requests GITHUB_SHA is the merge commit; name the branch commit.
sha="${HEAD_SHA:-$GITHUB_SHA}"
notes="${NOTES:-}

Latest upload: ${name} from ${GITHUB_HEAD_REF:-$GITHUB_REF_NAME} @ ${sha::7} ($(date -u +%Y-%m-%dT%H:%MZ))."

if ! gh release view "$tag" > /dev/null 2>&1; then
  gh release create "$tag" --prerelease --target "$sha" --title "$title" --notes "$notes"
else
  gh release edit "$tag" --notes "$notes"
fi
cp "$file" "$RUNNER_TEMP/$name"
gh release upload "$tag" "$RUNNER_TEMP/$name" --clobber
echo "https://github.com/$GITHUB_REPOSITORY/releases/download/$tag/$name"
