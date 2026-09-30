#!/usr/bin/env bash
# Whether a release needs a new native build, and marking that it got one.
#
# The app's runtime version is its native fingerprint (app.config.ts): a hash
# of everything native, the mesh's Go sources included. Every binary CI builds
# is recorded as a tag `native/<platform>/<runtime version>` on the commit it
# was built from. A release whose runtime version already has that tag
# changed only JS: installed apps get it over the air, and no build is needed.
#
# Usage:
#   scripts/ci/native-build.sh check <android|ios>   # writes runtime_version, tag, needed to $GITHUB_OUTPUT
#   scripts/ci/native-build.sh mark  <tag>           # records the tag on HEAD
#
# To force a rebuild, delete the tag (git push origin :refs/tags/native/...)
# and re-run that platform's job (Android or iOS) of the latest release run.
set -euo pipefail

cmd="$1"
repo="${GITHUB_REPOSITORY:?}"

case "$cmd" in
  check)
    platform="$2"
    # Resolved on the platform's own runner, as the build and `eas update` will.
    rv="$(npx expo-updates runtimeversion:resolve --platform "$platform" | jq -r .runtimeVersion)"
    tag="native/$platform/$rv"
    if gh api "repos/$repo/git/ref/tags/$tag" > /dev/null 2>&1; then
      needed=false
      echo "Runtime $rv already has a native $platform build ($tag): over-the-air update only."
    else
      needed=true
      echo "Runtime $rv has no native $platform build yet: building one."
    fi
    {
      echo "runtime_version=$rv"
      echo "tag=$tag"
      echo "needed=$needed"
    } >> "${GITHUB_OUTPUT:-/dev/stdout}"
    ;;
  mark)
    tag="$2"
    gh api "repos/$repo/git/refs" -f "ref=refs/tags/$tag" -f "sha=$(git rev-parse HEAD)" > /dev/null
    echo "Recorded $tag"
    ;;
  *)
    echo "usage: $0 check <android|ios> | mark <tag>" >&2
    exit 2
    ;;
esac
