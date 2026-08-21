# Provisioning a device through Pokket under fakts protocol 2

Implemented. This documents the flow, the BLE contract change it requires, and
what the firmware has to do.

## Summary

Pokket provisions an ESP32 by **enrolling it on its behalf and handing it a
pre-approved device code**. Pokket stages an RFC 8628 authorization using the
*device's* manifest, approves it as the signed-in operator, and writes the
resulting `device_code` — not a token — across BLE. The firmware then performs
one ordinary `grant_type=device_code` exchange, which returns immediately
because approval already happened.

This replaces the protocol-1 path, where Pokket minted a permanent opaque client
token via `createDevelopmentalClient` and the device redeemed it at `/f/claim/`.
Protocol 2 removes both the claim endpoint and the opaque token.

No server changes were needed: `lok-server-next` on `next` already serves
`/o/app-authorization/`, the device-code grant at `/o/token/`, and the
`acceptDeviceCode` mutation this flow approves through.

## The flow

1. **BLE.** Read the `MANIFEST` characteristic. `manifest.device_id` is the
   device's stable hardware identity.
2. **`POST` `device_authorization_endpoint`.** Pokket sends the *device's*
   manifest with `node_id = manifest.device_id`,
   `requested_client_kind: "development"` and `requested_client_role: "agent"` —
   a client authorized once that then runs unattended. lok dynamically registers
   a public OAuth2 client and stages a `DeviceCode`, returning `device_code`,
   `user_code`, `client_id`, `expires_in`.
3. **`deviceCodeByCode(deviceCode: user_code)`.** A pending code has no
   organization yet and is deliberately unreachable by id; the user code is the
   capability that resolves it.
4. **`acceptDeviceCode`.** With the staged id, the same user code as
   proof-of-possession, and the chosen hub. Binds the staged client to the
   operator's membership in that hub's organization.
5. **BLE.** Write `{ base_url, client_id, device_code }` to the provisioning
   characteristic, alongside the Wi-Fi credentials.
6. **Device.** On boot, one `grant_type=urn:ietf:params:oauth:grant-type:device_code`
   exchange returns access token, refresh token and the rendered instances
   together. Persist the refresh token, discard the device code, refresh from
   then on — refresh re-renders the envelope, so instance changes land without
   re-provisioning.

The `user_code` never reaches the device. It is the proof the accept mutation
requires, and it stays in Pokket.

## Why this shape

- **The secret on the wire is short-lived and single-use.** A sniffed blob is
  useful for minutes, once, and only for a client bound to that node. The
  protocol-1 equivalent was a permanent organization credential.
- **Firmware implements exactly one HTTP call shape.** The device-code exchange
  and the refresh call are the same POST to the same endpoint with different
  form fields. No polling loop, no `slow_down`, no BLE round trip after the write.
- **One BLE visit, and it works offline.** Pokket has cellular; the device needs
  no network until after it is provisioned. That is what makes provisioning a
  rack of sensors practical.
- **No new grant type.** It is RFC 8628 with the approval step moved off the
  device — the accommodation the spec already makes for input-constrained clients.

The trade-off worth stating: the device never independently consents, and the
Pokket operator is the sole authority for what that hardware becomes. That was
already true under protocol 1. Having the device run its own device-code flow
(joining Wi-Fi first, then surfacing a `user_code` for approval) is the only
option that changes it, at the cost of a two-phase provisioning across two
transports.

## BLE contract change

Protocol 1 wrote a single token to `FAKTS_TOKEN_UUID`, and that write doubled as
the implicit signal to commit the config. Protocol 2 needs three values, so they
travel as one JSON object on a new characteristic, and that single atomic write
is the commit:

```
PROVISIONING_UUID = beb5483e-36e1-4688-b7f5-ea07361b26b1
payload           = base64(JSON.stringify({ base_url, client_id, device_code }))
```

Comfortably inside the 512-byte characteristic limit, so it never needs the
chunking the PEM certificate does. The Wi-Fi, base-URL and manifest
characteristics are unchanged.

**The firmware must implement this characteristic.** Until it does, a device
provisioned by this build receives Wi-Fi credentials and nothing else.

### Firmware responsibilities

- Accept the JSON blob and commit config on that write.
- On boot, `POST` to `{base_url}` → the deployment's token endpoint with
  `grant_type=urn:ietf:params:oauth:grant-type:device_code`, `device_code` and
  `client_id`.
- Persist the refresh token; discard the device code (the server burns it at
  first exchange).
- On `expired_token`, return to BLE provisioning mode — the code was never
  redeemed in time and a new enrolment is needed.

Refresh tokens rotate on every use. A write that has not landed before a power
cut leaves an already-consumed token in flash and kills the refresh chain, so
persist with two slots and only mark a slot valid after the write completes.

## Re-provisioning

`bind_client` rotates identity: re-approving a device code for the same
`(release, membership, node, hub)` **deletes** the previously bound client, so
the old installation's `client_id` and refresh chain die. Re-provisioning a board
is a revoke-and-re-register, not a reuse. That is the desired behaviour for
handing hardware to someone else; it also means a re-provision cannot be undone
by power-cycling back to the old firmware state.

## What changed in Pokket

| File | Change |
|---|---|
| `lib/arkitekt/fakts/provisionDevice.ts` | New. Stages an authorization from a BLE manifest and assembles the blob. |
| `hooks/useDeviceEnrollment.ts` | New. Stage → resolve → accept, returning the blob. |
| `lib/lok/deviceCode.ts` | New. `hubs`, `deviceCodeByCode`, `acceptDeviceCode`. |
| `lib/arkitekt/fakts/start.tsx` | `requested_client_kind` / `_role` are parameters. |
| `lib/ble/improvProtocol.ts` | `PROVISIONING_UUID` + `buildProvisioningPayload`. |
| `lib/ble/validation.ts` | `ProvisioningBlobSchema`; config carries `provisioning` instead of `arkitektToken`. |
| `lib/ble/useImprovProvisioning.ts` | Writes the blob instead of a token. |
| `components/BleProvisioning.tsx` | Enrolment flow + hub picker. |
| `lib/arkitekt/hooks.tsx`, `index.tsx` | `useEndpoint()`. |

Bugs fixed on the way:

- **`nodeId` carried the BLE peripheral id.** On iOS that is a per-install
  random UUID, so re-provisioning the same board registered a second `Device`.
  It is now `manifest.device_id`.
- **The deployment was hardcoded** to `https://go.arkitekt.live`. It now comes
  from the session, so a device always lands where its operator is connected.
- **`requested_client_kind: "mobile"`** matched no member of `ClientKindVanilla`,
  so Pokket's own authorization request would have been rejected. It is now
  `desktop`.
- **`lib/ble/index.ts` re-exported six names that do not exist** in
  `improvProtocol.ts` (`IMPROV_SERVICE_UUID` and friends), six compile errors.
  Removed; the one consumer, the unreferenced `BleProvisioningDemo`, now uses
  `ARKITEKT_SERVICE_UUID`.

## Known gaps

- **`lib/lok/deviceCode.ts` is hand-written.** `codegen` pulls its schema from a
  live deployment and the checked-in `lib/lok/api/graphql.ts` predates the
  protocol-2 schema, so these operations have no generated types. Documents are
  in `graphql/lok/**`; delete the module once codegen has run against a `next`
  deployment.
- **`BleProvisioningDemo.tsx` is stale.** Unreferenced, and still calls the
  pre-refactor `useImprovProvisioning(deviceId)` / `provision(config)` signatures
  (three pre-existing compile errors). It demonstrates the protocol-1 flow and
  should probably be deleted.
- **The BLE transport is unauthenticated.** Nothing bonds or pairs, so the blob
  crosses in the clear. This flow reduces the exposure from a permanent
  credential to a one-shot code, but bonding — or gating characteristic writes
  behind a physical button press — is still worth adding.
- **There is no `device` client kind.** Hardware registers as `development`,
  so an admin cannot revoke a device fleet without touching developer clients.
