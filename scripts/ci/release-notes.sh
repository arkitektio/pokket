#!/usr/bin/env bash
# Writes a release's notes: what to install from where, and what changed.
# Run by the `notes` job of release.yaml, after both platforms.
#
# Environment: VERSION; ANDROID_RESULT and IOS_RESULT (the jobs' results:
# success, failure, cancelled, skipped); APK (built | copied) and APK_FROM;
# IOS (testflight | ota); TESTFLIGHT_URL (optional invite link); RUN_URL.
# DRY_RUN=1 prints the notes instead of setting them.
set -euo pipefail

repo="${GITHUB_REPOSITORY:-arkitektio/pokket}"
base="https://github.com/$repo"
tag="v$VERSION"
download="$base/releases/download"

# Android
if [ "${ANDROID_RESULT:-}" = "success" ] && [ "${APK:-}" = "built" ]; then
  android="**[Download pokket.apk]($download/$tag/pokket.apk)**, then open it on the phone to install.<br>A new app: this release changed native code."
elif [ "${ANDROID_RESULT:-}" = "success" ] && [ "${APK:-}" = "copied" ]; then
  android="**[Download pokket.apk]($download/$tag/pokket.apk)**, then open it on the phone to install.<br>The app from ${APK_FROM}, which updates itself to this release on first launch."
else
  android="⚠️ The Android build of this release failed ([run](${RUN_URL:-$base/actions})). Use the APK of the [previous release]($base/releases); it updates itself."
fi

# iPhone
if [ -n "${TESTFLIGHT_URL:-}" ]; then
  invite="[Join the TestFlight beta](${TESTFLIGHT_URL})."
else
  invite="Ask a maintainer for a TestFlight invite."
fi
if [ "${IOS_RESULT:-}" = "success" ] && [ "${IOS:-}" = "testflight" ]; then
  ios="A new build is on TestFlight. ${invite}"
elif [ "${IOS_RESULT:-}" = "success" ]; then
  ios="No new build needed: pokket from TestFlight updates itself to this release. ${invite}"
else
  ios="⚠️ The iOS build or TestFlight upload of this release failed ([run](${RUN_URL:-$base/actions})). ${invite}"
fi

# What changed: every commit since the previous release, prefixed or not.
prev="$(git describe --tags --abbrev=0 --match 'v*' "$tag^" 2>/dev/null || true)"
range="${prev:+$prev..}$tag"
changes="$(git log "$range" --no-merges --format='%h%x09%H%x09%s' \
  | awk -F'\t' -v url="$base/commit/" '$3 !~ /^chore\(release\)/ { printf "- %s ([%s](%s%s))\n", $3, $1, url, $2 }')"

notes="$(mktemp)"
{
  echo "## Install"
  echo
  echo "| | |"
  echo "|---|---|"
  echo "| **Android** | ${android} |"
  echo "| **iPhone / iPad** | ${ios} |"
  echo "| **Dev client** | For development: [Android APK]($download/dev-client/pokket-dev.apk) · [iOS simulator]($download/dev-client/pokket-dev-simulator.zip) ([Dev client release]($base/releases/tag/dev-client)) |"
  echo
  echo "Already have pokket? It updates itself: this release arrives over the air on its next launch."
  echo
  echo "## Changes"
  echo
  if [ -n "$changes" ]; then echo "$changes"; else echo "- No changes besides the version."; fi
  if [ -n "$prev" ]; then
    echo
    echo "**Full diff:** [${prev}…${tag}]($base/compare/$prev...$tag)"
  fi
} > "$notes"

if [ "${DRY_RUN:-}" = "1" ]; then
  cat "$notes"
else
  gh release edit "$tag" --notes-file "$notes"
  echo "Notes of $tag updated."
fi
