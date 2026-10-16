# External logins on the phone

How pokket carries a user through a login at an **external provider**: a bank through Enable
Banking or Scalable, or a Google or Microsoft mailbox. The contract (`AuthSession`, `completeAuth`,
`authSession`, `resumeAuth`, `cancelAuth`, the relay) is the desktop's. It is written down in
orkestrator-next, `src/renderer/src/core/authflow/AUTH_FLOWS.md`. This page covers only what is
different on the phone. The code is in `lib/authflow`.

## Who does what

The service (bank, kuvert) starts the login and finishes it, and it holds every secret. The app is
a courier: it opens `openUrl`, catches the redirect, and sends `code` + `state` back with
`completeAuth`. For a POLL login it calls `completeAuth` every `interval` seconds instead.

## Catching the redirect

The provider redirects to the relay (`https://go.arkitekt.live/auth/callback/<namespace>`), and the
relay opens `orkestrator://<namespace>/auth/callback?code&state`. The phone registers the
`orkestrator` scheme as well (`app.json`), so the same URL every provider knows works on both apps.

| Path | When | Where |
|---|---|---|
| Auth session | iOS: ASWebAuthenticationSession closes on `orkestrator://…` and hands the URL to the call that opened it | `browser.ts` → `useAuthFlow` |
| Deep link to the open sheet | Android, and any second delivery | `+native-intent` → `claimCallback` (`inflight.ts`) |
| Callback page | Nobody waiting: Android killed the app in the browser, or the sheet was closed | `/auth/callback/<namespace>` |
| Paste | Nothing came back | `AuthFlowPanel`'s "Browser didn't bring you back?" |

Every path ends in `finishRedirect`. It runs one exchange per `state`, so two deliveries of the
same redirect never send the code twice.

The callback page only finishes a login this phone started. Those are kept in AsyncStorage
(`pending.ts`) with the profile that started them. A `state` that isn't in there is refused,
because any app or web page can open an `orkestrator://` link. A login started in another
organization is not submitted.

## POLL

`openUrl` opens in an in-app browser over the app, so the app stays in the foreground and keeps
polling while the user approves the code. When the app comes back to the foreground (the user
approved in their bank's own app), the next step runs at once.

## Adding a service

1. Copy `graphql/<service>/fragments/auth.graphql` and the `CompleteAuth` / `AuthSession` /
   `CancelAuth` documents, then regenerate.
2. Add `lib/<service>/authFlow.ts` (`contractAuthFlow({ service, title, home, documents })`).
3. Register it in `AUTH_FLOWS` (`lib/authflow/registry.ts`) under the relay's namespace.
4. Start the login from a sheet with `<AuthFlow flow="<namespace>" open={…} />`.

## Not verified on a device yet

- A full round trip through the relay with a real provider, on iOS and on Android.
- Android's Custom Tab handing the `orkestrator://` link over without a prompt.
