#!/usr/bin/env bash
# Downloads the newest APK among the releases before <tag>, for a release that
# changed only JS and so carries the previous app (release.yaml).
#
# Usage: scripts/ci/copy-apk.sh <tag> <output file>
# Prints the tag of the release the APK came from. Takes `pokket.apk`, or
# `pokket-<version>.apk` as releases before v1.7.4 named it.
set -euo pipefail

current="$1"
out="$2"

# Newest first; published version releases only (not the Dev client one).
for tag in $(gh release list --exclude-drafts --exclude-pre-releases --limit 100 --json tagName --jq '.[].tagName'); do
  [ "$tag" = "$current" ] && continue
  asset="$(gh release view "$tag" --json assets \
    --jq '[.assets[].name | select(test("^pokket(-[0-9][0-9.]*)?\\.apk$"))] | first // empty')"
  if [ -n "$asset" ]; then
    gh release download "$tag" --pattern "$asset" --output "$out" --clobber
    echo "$tag"
    exit 0
  fi
done

echo "No earlier release has an APK." >&2
exit 1
