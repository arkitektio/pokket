# Pokket

![Pokket App](docs/image.png)

**Pokket** is your mobile gateway to the [Arkitekt](https://arkitekt.live) ecosystem. It serves as a companion app for managing your Arkitekt services, tasks, and connected devices directly from your phone.

## Features

### 🔗 Arkitekt Connection

Seamlessly connect to your Arkitekt instance. Pokket handles authentication via `lok` and provides a secure connection to your services.

### 📋 Task Management

Stay on top of your workflows. View and manage your latest tasks through the `rekuest` service integration, ensuring you never miss an important action.

### 📡 Device Provisioning

Easily provision ESP32-based devices for your lab or home. Pokket uses the **Improv Wi-Fi** protocol over BLE to configure devices with:

- Wi-Fi Credentials (Standard & Eduroam support)
- Arkitekt Connection Tokens

### 📶 Wi-Fi Profile Management

Manage your Wi-Fi configurations in one place. Save standard and Eduroam profiles to quickly provision multiple devices without re-entering credentials.

### 🕸️ Organisation Mesh

Deployments that run an organisation mesh (an [ionscale](https://github.com/jsiebens/ionscale)
tailnet, advertised as `mesh_coord_url` in `.well-known/fakts`) can let pokket in when you
approve it. Pokket then runs its own in-app Tailscale node — no VPN permission, no Tailscale app
— and reaches the services that only live on the mesh through it. The **Mesh** screen shows the
node, the machines it sees, which services it carries, and lets you switch it off.

## Install

### Using pokket

| Platform | Where | Notes |
|---|---|---|
| **Android** | [`pokket.apk`](https://github.com/arkitektio/pokket/releases/latest/download/pokket.apk) | Open the link on the phone and install it (allow installs from your browser when asked). It is also on the **Latest** release on the [Releases](https://github.com/arkitektio/pokket/releases/latest) page, which says what to install from where. |
| **iPhone / iPad** | [TestFlight](https://testflight.apple.com/) | Ask a maintainer to add you as a tester; you get an e-mail invite. Install TestFlight from the App Store and accept it. |

**Updates install themselves.** Most releases change only the app's JavaScript. They are
delivered over the air: pokket downloads them on launch and offers a restart. You only need
a new APK or TestFlight build when a release changes the native app. TestFlight tells you
when that happens; for Android, the release notes say "A new app", and the same link has it.

### Developing pokket

A **development client** is pokket with its native side (including the mesh) and no
bundled JS. It loads JS from your machine (`pnpm expo start --dev-client`) or from a pull
request's preview.

| Platform | Where | Notes |
|---|---|---|
| **Android phone or emulator** | [`pokket-dev.apk`](https://github.com/arkitektio/pokket/releases/download/dev-client/pokket-dev.apk) | Install it and open pokket. It connects to Metro on your network. |
| **iOS simulator** | [`pokket-dev-simulator.zip`](https://github.com/arkitektio/pokket/releases/download/dev-client/pokket-dev-simulator.zip) | Unzip it, then `xcrun simctl install booted pokket.app`. |
| **Physical iPhone** | Build it yourself | `pnpm build:mesh:ios && npx expo run:ios --device`. It needs signing, so CI does not build one. |

Both downloads are on the [Dev client](https://github.com/arkitektio/pokket/releases/tag/dev-client)
pre-release, and always match the newest native code on `main`. They are rebuilt whenever `main`'s
native side changes, detected the same way as for releases (see below). Each file's label names the
runtime version and commit it was built from. A pull request that changes native code gets an
Android dev client of its own, under its "Dev client" run's artifacts. It never replaces the
published one. A development build you make yourself only has the mesh if you ran
`pnpm build:mesh:<platform>` first (see below).

**Pull request previews.** Every pull request from a branch of this repository publishes its JS
as an over-the-air update on the EAS branch `pr-<number>`. A comment on the pull request links
to its update page. Scan the QR code there with the development client installed to run the
pull request on your phone. This takes a few minutes, with no build.

### How releases are made

Everything builds on GitHub's runners, never in the EAS build queue.

| Workflow | When | What it does |
|---|---|---|
| **Checks** (`checks.yaml`) | Every pull request, pushes to `main` | Runs the tests and publishes the pull request preview. A few minutes, on Linux. |
| **Release** (`release.yaml`) | Every push to `main` | semantic-release picks the version: patch by default, minor if a commit starts with `feat:`, major for a `BREAKING CHANGE:`. Commit prefixes are optional. Each platform then checks whether its native side changed (see below). If it didn't, it publishes an over-the-air update only, in minutes. If it did, it also builds the APK or the iOS build (uploaded to TestFlight), and then publishes the update. Every release carries `pokket.apk` (a copy of the newest one if nothing native changed), and its notes list what to install and every commit. |
| **Dev client** (`dev-client.yaml`) | Every push to `main` and pull request, or by hand | Checks whether the native side has a dev client yet, recorded as tag `dev-build/<platform>/<runtime version>`. If not, it builds one. `main`'s builds go to the Dev client release; a pull request's go to its run's artifacts (Android only). By hand, with `force`, it rebuilds regardless. |
| **Mesh sidecar** (`mesh.yaml`) | Changes to the mesh | End-to-end mesh tests on an emulator and a simulator. |

"Native side changed" means the app's **runtime version** is new. That version is Expo's
fingerprint of everything native, including the mesh's Go sources (`fingerprint.config.js`), but
not the version number. Each binary the release workflow builds is recorded as a git tag
`native/<android|ios>/<runtime version>`. A release whose runtime version already has its tag
changed only JS. To force a new binary, delete the tag
(`git push origin :refs/tags/native/android/<runtime version>`), then re-run just that platform's job
(**Android** or **iOS**) of the latest release run in the Actions tab. Re-running the whole
workflow does nothing, because semantic-release finds no new version.

## Devlopment Setup

1. **Install dependencies**

   This project uses [pnpm](https://pnpm.io). If you don't have it,
   `corepack enable` picks up the version pinned in `package.json`.

   ```bash
   pnpm install
   ```

2. **Start the app**

   ```bash
   pnpm expo start
   ```

3. **Build the mesh sidecar (optional)**

   The mesh is a Go library ([tsnet](https://tailscale.com/kb/1244/tsnet)) bound into the
   local Expo module `modules/pokket-mesh` with gomobile. Without it the app builds and runs,
   and simply has no mesh. To include it, build it before any native build (`expo prebuild`,
   `expo run:android`, `eas build --local`):

   ```bash
   pnpm build:mesh:android   # needs Go and the Android NDK (ANDROID_NDK_HOME)
   pnpm build:mesh:ios       # needs Go and Xcode, on macOS
   ```

   The outputs are gitignored but listed as kept in `.easignore`, so EAS builds pick them up.

   How it works: for every alias on the mesh, the node opens a reverse proxy on
   `127.0.0.1:<port>` that replays requests (and WebSocket upgrades) to the alias over the
   tailnet, with the alias' own Host header and TLS. Service clients are built against that
   loopback address; everything else goes directly. WebRTC media (LiveKit) is not carried.
   The node keeps its identity in the app's files, so it rejoins by itself after the one-shot
   key from the login has been used.

   **Permissions.** The mesh needs no VPN permission and no runtime prompt on Android: it uses
   `INTERNET` and `ACCESS_NETWORK_STATE` (install-time), and cleartext HTTP is allowed app-wide in
   release builds (the loopback proxies and plain-HTTP LAN aliases need it; see
   `modules/pokket-mesh/app.plugin.js`). On iOS the node's search for direct paths to peers on the
   LAN can show the Local Network prompt, with the text set in the same plugin. The node never
   sends logs to Tailscale.

   **Working on it in a development build.** Expo Go has no mesh (it cannot load the native
   module); use a development build, which has it once the library is built:

   ```bash
   pnpm build:mesh:android && npx expo run:android   # or: pnpm build:mesh:ios && npx expo run:ios
   # or, after pnpm build:mesh: eas build --profile development
   # or skip the local build: the "Dev client" GitHub workflow publishes the
   # latest build to the "dev-client" pre-release; on the phone, open
   # https://github.com/arkitektio/pokket/releases/download/dev-client/pokket-dev.apk
   pnpm expo start --dev-client                      # then iterate on the JS as usual
   ```

   Only the Go code needs a native rebuild; the Mesh screen, `lib/mesh` and the fakts client
   reload like any other JS. A reload keeps the running nodes: the new JS reattaches to them, and
   the aliases keep their loopback ports. To see the mesh work without a deployment,
   `pnpm mesh:tailnet` serves a throwaway tailnet on your machine and prints a
   `pokket://mesh-selftest?...` link; open it in the dev build (same network) and it joins,
   fetches and holds a WebSocket through the mesh, and reports the result in your terminal.

4. **Tests**

   ```bash
   pnpm test                                   # jest: fakts client, lib/mesh
   (cd modules/pokket-mesh/go && go test ./...) # Go, incl. a real in-process tailnet
   ```

   The `Mesh sidecar` workflow additionally builds the app for Android and the iOS simulator, both
   as release builds and as development builds loading their JS from Metro, and runs each on an
   emulator/simulator against a test tailnet (`TestDeviceEnv`): the app is sent
   `pokket://mesh-selftest?...` (active in development builds, and in release builds made with
   `EXPO_PUBLIC_MESH_SELFTEST=1`), joins, and must fetch and hold a WebSocket through the mesh,
   reporting back through it. The run also fails if the deep links it sends do not reach the
   app's JS.

## Tech Stack

- **Framework**: React Native (Expo)
- **Styling**: NativeWind (Tailwind CSS)
- **Navigation**: Expo Router
- **Data**: Apollo Client (GraphQL)
- **BLE**: `react-native-ble-plx`

## License

MIT (see [LICENSE](LICENSE))
