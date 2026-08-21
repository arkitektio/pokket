# Provisioning a device through Pokket under fakts protocol 2

Status: evaluation / proposal. No code changed yet.

## Summary

Pokket's own login has migrated to protocol 2 (`7a92fda`): RFC 8628 device
authorization, dynamic client registration, and a token response that carries the
fakts envelope. **Device provisioning has not.** `BleProvisioning.tsx` still mints a
permanent opaque client token over GraphQL and writes it to the ESP32, which is a
protocol-1 construct that protocol 2 deliberately removes.

The recommendation is to provision with a **pre-approved device code**: Pokket runs
the device authorization request on the device's behalf, approves it as the
signed-in user, and writes the resulting `device_code` (not a token) over BLE. The
firmware then performs one entirely standard `grant_type=device_code` exchange,
which returns immediately because approval already happened.

This requires no new grant type. It does require the protocol-2 server, which does
not exist yet in `lok-server-next`.

## Where things stand

| Capability | pokket | lok-server-next |
|---|---|---|
| `.well-known/fakts` protocol-2 fields | required by `FaktsEndpointSchema` | **not emitted** — only `claim`/`base_url`/`frontend_url` |
| RFC 8628 device authorization | implemented (`fakts/start.tsx`) | **absent** |
| `grant_type=device_code` | implemented (`fakts/pollToken.tsx`) | **absent** — `authapp/server.py` registers client_credentials, authorization_code+OIDC, refresh_token only |
| Envelope on token response | expected (`faktsSchema.tsx`) | **absent** — envelope still comes from `POST /f/claim/` |
| Device provisioning | protocol 1 (`createDevelopmentalClient` → opaque token) | protocol 1 (`/f/claim/`, `/f/redeem/`) |

`FAKTS_PROTOCOL_VERSION` in `lok_server/settings.py` is still `"0.1.0"`. Pokket's
discovery requires `configure`, `device_authorization_endpoint` and `token_endpoint`
and fails loudly without them — by design, per the comment in `discover.tsx`. So
**Pokket on `main` cannot connect to lok on `main` at all today.** Device
provisioning is downstream of finishing the server migration; nothing below is
buildable before that lands.

## Why the current provisioning breaks

Today (`components/BleProvisioning.tsx`):

1. Read the manifest from the `MANIFEST` characteristic over BLE.
2. Call `createDevelopmentalClient` with `nodeId: selectedDevice.id`.
3. Receive `client.token` — a `uuid4().hex` that never expires.
4. Write Wi-Fi credentials, `baseUrl` and that token over BLE. Writing the token
   characteristic is what commits the config on the ESP32.
5. The device later exchanges the token at `POST /f/claim/` for its configuration.

Protocol 2 removes step 5's contract. There is no `/f/claim/`, and the opaque
`client_token` is gone — the commit message for `7a92fda` says so explicitly.
Configuration now arrives *inside* an OAuth2 token response, reachable only by a
client that holds a `client_id` and either a device code or a refresh token. A
long-lived bearer secret at rest is exactly the thing protocol 2 got rid of.

So the design question is what replaces a static secret for a headless device that
has no browser, may have no network until after provisioning, and must survive
refresh-token rotation across power cuts.

## Options considered

### A. Pokket as authorization proxy

Pokket runs the full flow for the device and writes the resulting `client_id` +
`refresh_token` over BLE. The device only ever refreshes.

Reuses code Pokket already has, and one BLE visit completes provisioning. But the
secret crossing BLE is a long-lived refresh token — no better than today's opaque
token if BLE is sniffed — and refresh rotation on hardware that can brown out
mid-flash-write will silently break the chain.

### B. Device runs RFC 8628 itself

Pokket writes only Wi-Fi credentials and `base_url`. The device boots, joins the
network, requests device authorization itself, and surfaces its `user_code` back
over BLE for Pokket to approve.

The best security story — BLE never carries anything but Wi-Fi credentials — and
the device is genuinely the OAuth client. But provisioning becomes two-phase across
two transports: the device must be online *before* it can be authorized, and the
operator has to stay in range or come back. It also puts the whole polling loop,
with its `slow_down` and `authorization_pending` handling, into firmware.

### C. A pre-authorized redeem grant

Keep the shape of today's flow but mint a one-shot, short-lived, node-bound code
instead of a permanent token, redeemed at the token endpoint via a new grant type.
`fakts.models.RedeemToken` already carries `user`, `composition`, `expires_at`,
`manifest_hash` and `allow_reredeem`, so the storage is largely built.

Good ergonomics, minimal firmware. The cost is a non-standard grant type on lok,
which is avoidable — see below.

### D. Pre-approved device code (recommended)

C's ergonomics with no new grant type. A pre-authorized code *is* a device code
that has already been approved; so issue a real device code, approve it server-side
on the user's authority, and hand the device code itself across BLE.

## Recommendation: pre-approved device code

1. **Pokket → device (BLE).** Read the `MANIFEST` characteristic. Use
   `manifest.device_id` as the node identity.
2. **Pokket → lok.** `POST device_authorization_endpoint` with the *device's*
   manifest and `node_id = manifest.device_id`, `requested_client_kind: "device"`.
   lok dynamically registers a client and stages a device code, returning
   `device_code`, `user_code`, `client_id`, `interval`, `expires_in`.
3. **Pokket → lok.** `approveDeviceCode(userCode, ...)` — an authenticated GraphQL
   mutation. Pokket is already signed in, so no browser round trip. The web
   configure page calls the same resolver.
4. **Pokket → device (BLE).** Write one JSON blob:
   `{ base_url, client_id, device_code }`, plus Wi-Fi credentials.
5. **Device → lok.** On boot, one standard
   `grant_type=urn:ietf:params:oauth:grant-type:device_code` exchange. It returns
   immediately with `access_token`, `refresh_token` and the fakts envelope, because
   step 3 already approved it.
6. **Device.** Persist the refresh token, discard the device code, and refresh from
   then on. Refresh re-renders the envelope, so instance changes land without
   re-provisioning.

Why this one:

- **The secret on the wire is short-lived and single-use.** A sniffed device code is
  useful for minutes, once, and only for a client bound to that node. Today's
  equivalent is a permanent org credential.
- **Firmware implements exactly one HTTP call shape.** The device-code exchange and
  the refresh call are the same POST to the same endpoint with different form
  fields. No polling loop, no `slow_down`, no BLE round trip after the write.
- **One BLE visit, works offline.** Pokket has cellular; the device does not need
  the network until after it has been provisioned. This matters for bulk
  provisioning of a rack of sensors.
- **No new grant type.** It is RFC 8628 with the approval step moved off the
  device, which is the same accommodation RFC 8628 already makes for input-
  constrained clients.

The trade-off worth stating: the device never independently consents, and Pokket's
operator is the sole authority for what that hardware becomes. That is already true
today. Option B is the only one that changes it, at a real cost in field ergonomics.

## Work required

### lok-server-next — protocol-2 server (blocking, none of it exists)

- Emit `configure`, `device_authorization_endpoint`, `token_endpoint`, `issuer`,
  `jwks_uri` from `WellKnownFakts`; bump `FAKTS_PROTOCOL_VERSION`.
- Device authorization endpoint: dynamic registration from a manifest + staged
  device code. `DeviceCode` needs `user_code` and `client_id` columns.
- Register a device-code grant in `authapp/server.py` (authlib ships `rfc8628`), and
  append the fakts envelope to its token response.
- Have the refresh grant re-render the envelope — Pokket already depends on this.

### lok-server-next — device-specific

- Add `device` to `ClientKindVanilla` / `ClientKindChoices`. Note that Pokket
  already sends `requested_client_kind: "mobile"`, which is also not in the enum.
- `services/device_codes.validate_device_code` raises `Unknown client kind or no
  longer supported` for anything but `development`; it needs to build a config for
  device clients. The `node_id` → `Device.objects.get_or_create(...)` binding there
  is already correct and should carry through.
- `approveDeviceCode` mutation for headless approval by an authenticated user.
- Decide refresh-token rotation for `kind=device`. Rotation plus flash writes plus
  power loss is a bricking risk; either don't rotate for devices, or specify a
  two-slot persistence scheme in firmware.

### pokket

- Replace the `createDevelopmentalClient` call in `BleProvisioning.tsx` with
  `deviceAuthorization` → `approveDeviceCode` → BLE write.
- Send `manifest.device_id`, not `selectedDevice.id` — see bugs below.
- Take `baseUrl` from the active fakts session instead of the hardcoded
  `https://go.arkitekt.live`.
- Write a single JSON provisioning blob rather than relying on the token
  characteristic as an implicit commit trigger. It fits well inside the 512-byte
  characteristic limit and makes the commit atomic.

### firmware (outside these repos)

- Accept the JSON blob; exchange the device code on first boot; persist the refresh
  token; handle `expired_token` by returning to BLE provisioning mode.

## Bugs and gaps found while evaluating

- **`nodeId` is the wrong identifier.** `BleProvisioning.tsx` sends
  `nodeId: selectedDevice.id`, the BLE peripheral id. On iOS that is a per-install
  random UUID, not stable hardware identity, so re-provisioning the same board
  creates a second `Device` row. The manifest's `device_id` is the intended value.
- **`device_id` vs `node_id` naming.** The BLE manifest schema in
  `lib/ble/validation.ts` requires `device_id`; `fakts.base_models.Manifest` calls it
  `node_id`. Nothing translates between them today.
- **Hardcoded deployment.** `provisionBaseUrl = 'https://go.arkitekt.live'` means a
  device is provisioned against a deployment that may not be the one Pokket is
  connected to.
- **`requested_client_kind: "mobile"`** in `fakts/start.tsx` matches no member of
  `ClientKindVanilla`.
- **Physical hardware registered as `development` clients.** A dedicated `device`
  kind would let an admin revoke a fleet without touching developer credentials.
- **BLE transport is unauthenticated.** Nothing in `useImprovProvisioning` bonds or
  pairs. Under the current design a permanent org credential crosses that link in
  the clear. The proposal reduces the exposure to a one-shot code; bonding, or
  gating characteristic writes behind a physical button press, would be worth
  adding regardless.

## Open questions

- Should a device client be `role: agent`? It is authorized once and then runs
  unattended, which is what the `AGENT` description in `fakts/enums.py` describes.
- Should a device code issued for provisioning have a longer `expires_in` than the
  interactive default of 300s, to cover an operator provisioning a batch?
- Does re-provisioning an existing device reuse its client, or revoke and re-register?
  `validate_device_code` currently looks up an existing client by manifest + node +
  tenant + org, which would reuse it.
