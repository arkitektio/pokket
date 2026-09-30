#!/usr/bin/env bash
# Puts a build on a pre-release under a fixed name, so the newest one always
# has the same download link:
#   https://github.com/<repo>/releases/download/<tag>/<name>
# Usage: scripts/ci/publish-download.sh <tag> <title> <file> <name>
# The release notes come from $NOTES; a line naming this upload is added.
# $LABEL, if set, is shown for the file instead of its name.
set -euo pipefail

tag="$1"
title="$2"
file="$3"
name="$4"
# The commit checked out: in the release workflow that is the release commit,
# which main may already have moved past.
sha="${HEAD_SHA:-$(git rev-parse HEAD)}"
notes="${NOTES:-}

Latest upload: ${name} from ${GITHUB_HEAD_REF:-$GITHUB_REF_NAME} @ ${sha::7} ($(date -u +%Y-%m-%dT%H:%MZ))."

if ! gh release view "$tag" > /dev/null 2>&1; then
  # Tag first, then the release on it: with the Actions token, creating a
  # release with --target on a commit that is not its branch's head fails
  # with HTTP 403 (https://github.com/cli/cli/issues/9514). The refs API
  # takes any commit.
  if ! gh api "repos/$GITHUB_REPOSITORY/git/ref/tags/$tag" > /dev/null 2>&1; then
    gh api "repos/$GITHUB_REPOSITORY/git/refs" -f "ref=refs/tags/$tag" -f "sha=$sha" > /dev/null
  fi
  gh release create "$tag" --prerelease --verify-tag --title "$title" --notes "$notes"
else
  gh release edit "$tag" --notes "$notes"
fi
cp "$file" "$RUNNER_TEMP/$name"
gh release upload "$tag" "$RUNNER_TEMP/$name${LABEL:+#$LABEL}" --clobber
echo "https://github.com/$GITHUB_REPOSITORY/releases/download/$tag/$name"
