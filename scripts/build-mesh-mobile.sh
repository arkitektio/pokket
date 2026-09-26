#!/usr/bin/env bash
# Builds the Go half of pokket's mesh sidecar (modules/pokket-mesh/go) with
# gomobile, into the places the native module picks it up from:
#
#   android: modules/pokket-mesh/android/libs/meshmobile.jar
#            modules/pokket-mesh/android/src/main/jniLibs/<abi>/libgojni.so
#   ios:     modules/pokket-mesh/ios/Meshmobile.xcframework
#
# Without these the app still builds and runs; it just has no mesh (the Mesh
# screen says so). All outputs are gitignored; run this before a native build
# (`expo prebuild`, `eas build --local`, `expo run:*`).
#
# Needs Go (the version in go.mod; GOTOOLCHAIN=auto fetches it), plus the
# Android NDK (ANDROID_NDK_HOME, or ANDROID_HOME with an ndk/ inside) for
# android, and Xcode for ios.
#
# Usage: scripts/build-mesh-mobile.sh [android|ios|all]   (default: all)
set -euo pipefail

target="${1:-all}"
root="$(cd "$(dirname "$0")/.." && pwd)"
module="$root/modules/pokket-mesh"
go_dir="$module/go"
export GOTOOLCHAIN="${GOTOOLCHAIN:-auto}"

cd "$go_dir"

# gomobile and gobind at the x/mobile version go.mod pins.
bin="$(go env GOPATH)/bin"
go install golang.org/x/mobile/cmd/gomobile golang.org/x/mobile/cmd/gobind
export PATH="$bin:$PATH"
gomobile init

build_android() {
  if [ -z "${ANDROID_NDK_HOME:-}" ] && [ -n "${ANDROID_NDK_LATEST_HOME:-}" ]; then
    export ANDROID_NDK_HOME="$ANDROID_NDK_LATEST_HOME"
  fi
  local work
  work="$(mktemp -d)"
  trap 'rm -rf "$work"' RETURN

  echo "mesh: building android library"
  gomobile bind -target=android/arm64,android/arm,android/amd64 -androidapi 24 \
    -trimpath -ldflags "-s -w" -o "$work/meshmobile.aar" .

  # A library module may not depend on a local .aar (AGP refuses to package
  # one into another), so unpack it: the Java classes as a jar, the Go
  # runtime as plain jniLibs.
  (cd "$work" && unzip -q meshmobile.aar -d aar)
  mkdir -p "$module/android/libs"
  cp "$work/aar/classes.jar" "$module/android/libs/meshmobile.jar"
  rm -rf "$module/android/src/main/jniLibs"
  mkdir -p "$module/android/src/main/jniLibs"
  cp -R "$work/aar/jni/." "$module/android/src/main/jniLibs/"
  echo "mesh: android library ready"
}

build_ios() {
  echo "mesh: building ios framework"
  rm -rf "$module/ios/Meshmobile.xcframework"
  gomobile bind -target=ios,iossimulator -iosversion 16.4 \
    -trimpath -ldflags "-s -w" -o "$module/ios/Meshmobile.xcframework" .
  echo "mesh: ios framework ready"
}

case "$target" in
  android) build_android ;;
  ios) build_ios ;;
  all)
    build_android
    if [ "$(uname)" = "Darwin" ]; then build_ios; else echo "mesh: skipping ios (needs macOS)"; fi
    ;;
  *) echo "usage: $0 [android|ios|all]" >&2; exit 2 ;;
esac
