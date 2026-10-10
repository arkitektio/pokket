# Orkestrator (pokket edition)

![Orkestrator on a phone](docs/image.png)

**Orkestrator (pokket edition)** is your mobile gateway to the [Arkitekt](https://arkitekt.live) ecosystem. It serves as a companion app for managing your Arkitekt services, tasks, and connected devices directly from your phone. It is the phone-sized sibling of the desktop
[Orkestrator](https://github.com/arkitektio/orkestrator).

The app is called Orkestrator on the phone and in its own text. The project keeps the name pokket:
this repository, the package id (`live.arkitekt.pokket`), the native modules and the download
`pokket.apk`. That is on purpose, so an installed app updates in place and keeps its logins.

Links work under both names: `pokket://` and `orkestrator://` open the app. A link shared from the
desktop app opens the matching page on the phone (its `/rekuest/tasks/5` is `/tasks/5` here), and
says so when the phone has no such page.

## Features

### 🔗 Arkitekt Connection

Seamlessly connect to your Arkitekt instance. Orkestrator handles authentication via `lok` and provides a secure connection to your services.

### 📋 Task Management

Stay on top of your workflows. View and manage your latest tasks through the `rekuest` service integration, ensuring you never miss an important action.

### 📡 Device Provisioning

Easily provision ESP32-based devices for your lab or home. Orkestrator uses the **Improv Wi-Fi** protocol over BLE to configure devices with:

- Wi-Fi Credentials (Standard & Eduroam support)
- Arkitekt Connection Tokens

### 📶 Wi-Fi Profile Management

Manage your Wi-Fi configurations in one place. Save standard and Eduroam profiles to quickly provision multiple devices without re-entering credentials.

### 📞 Calls

Video calls with your organisation through `lovekit`, the same calls the desktop app has. **Calls**
lists the ones in progress and anyone in the organisation can join; a phone button in the header
of a task, a transaction, a conversation or a broadcast starts a call about it (or finds the one
already running). Invite people from a call, and be asked in: invitations and calls someone just
started show as a toast with Join and Dismiss while Orkestrator is open. Nothing is pushed to a phone
that has Orkestrator closed.

A call goes on wherever you are in the app, with a bar that leads back to it, and when Orkestrator is
in the background or the screen is locked: iOS through its `audio` background mode, Android
through a foreground service (`modules/pokket-call`) with an ongoing notification. The camera
pauses while in the background. The microphone is asked for when you tap Join and the camera
when you first switch it on; refuse the microphone and you still join, listening.

### 🔬 Mikro

The organisation's microscopy data, read-only: **Mikro** opens on the newest datasets and lenses,
pinned and top-level folders and recent files, and has a list and a page for datasets, lenses,
folders, files, scenes, tables, charts and annotations. Search finds datasets, lenses, folders and
files. The paths are the desktop app's (`/mikro/arraydatasets/12`), so a link shared from either opens
in the other.

There is no viewer: the desktop app renders scenes with WebGPU, which a phone app cannot. What Orkestrator
shows is a scene's last snapshot, where one has been taken (many datasets have none, and show a
glyph). Pictures and file downloads come straight from the datalayer by a presigned URL that Orkestrator
signs itself (`lib/datalayer/presign.ts`), also through the mesh. A file's **Download** fetches it
whole and hands it to the share sheet.

### 💬 Chat

Chat rooms from `alpaka`. **Chat** starts a room from the first message and lists recent ones; a
room shows messages live, a reply growing as it is written. Replies come from a *replyer*: a
`rekuest` action that takes a message and returns one. The chip over the composer picks which
replyer answers in a room (or none), each message you send runs it, and a pill shows its progress
with a way to stop it. Long-press a message to have it answered again or to share its text.

A replyer's other arguments (which model, what tone) are its settings: the replyer sheet opens
them as a form, and what you save there is used for every message from this phone. Things attached
to messages (tasks, datasets, threads) show as chips that open their page; attaching from the phone
is not there yet. Without `rekuest` a room is a plain message board.

### ▶️ Actions

What the organisation's apps can do, to run from the phone. **Actions** (under Tasks, and in
search) lists and searches them; an action opens as a form of its arguments, drawn from the ports
and widgets its app declared, the way the desktop app draws them: text and numbers, switches, choices,
sliders, dates, searches (also ones that depend on another field), lists and nested models, with
the app's own validation and show/hide rules. **Run** assigns it and opens the task, which is
followed live. "Run on" picks the agent; left alone, rekuest picks one.

A form starts from what you last ran the action with on this phone, else from its last run. On a
page that shows an object (a dataset, a file, a task, a mail thread) the play button in the header
lists the actions that take such an object: one that needs nothing else runs at once, another
opens its form with the object filled in. A task has **Run again**, which reopens the form with
that task's inputs.

Not every kind of argument can be edited here yet: dictionaries, unions, quantities with units,
choices read from an agent's live state and files show as "Set this from the desktop app". Such an
action still runs from Orkestrator when that argument is optional or has a value from an earlier run.
The engine behind the form (`lib/ports`) is the desktop app's, ported with its tests.

### 🕸️ Organisation Mesh

Deployments that run an organisation mesh (an [ionscale](https://github.com/jsiebens/ionscale)
tailnet, advertised as `mesh_coord_url` in `.well-known/fakts`) can let Orkestrator in when you
approve it. Orkestrator then runs its own in-app Tailscale node — no VPN permission, no Tailscale app
— and reaches the services that only live on the mesh through it. The **Mesh** screen shows the
node, the machines it sees, which services it carries, and lets you switch it off.

## Install

### Using Orkestrator

| Platform | Where | Notes |
|---|---|---|
| **Android** | [`pokket.apk`](https://github.com/arkitektio/pokket/releases/latest/download/pokket.apk) | Open the link on the phone and install it (allow installs from your browser when asked). It is also on the **Latest** release on the [Releases](https://github.com/arkitektio/pokket/releases/latest) page, which says what to install from where. |
| **iPhone / iPad** | [TestFlight](https://testflight.apple.com/) | Ask a maintainer to add you as a tester; you get an e-mail invite. Install TestFlight from the App Store and accept it. |

**Updates install themselves.** Most releases change only the app's JavaScript. They are
delivered over the air: Orkestrator downloads them on launch and offers a restart. You only need
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
   loopback address; everything else goes directly. WebRTC media (LiveKit) is not carried: a call
   needs a direct connection to the media server, and the call page says so when the only way
   to it is the mesh.
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

4. **GraphQL code**

   Each service's hooks are generated from `graphql/<service>/` against the schema in its
   `<service>.yml`: `pnpm rekuest`, `pnpm lovekit`, `pnpm kuvert` and so on. Mikro and alpaka have
   no script on purpose: `package.json`'s scripts are part of the native fingerprint, so adding one
   makes the next release need new binaries. Run them as

   ```bash
   pnpm exec graphql-codegen --config ./mikro.yml
   pnpm exec graphql-codegen --config ./alpaka.yml
   ```

5. **Tests**

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
