import { z } from "zod";

/**
 * What pokket remembers about push, on this device.
 *
 * The switch is the device's: the push token belongs to the device, not to an
 * organization, and lok can be told about a token (`registerComChannel`) but
 * never told to forget one. So "off" means this device stops registering and
 * gives its token up, which is what actually stops delivery.
 *
 * Registration is per organization, because each organization's lok keeps its
 * own channel. It is repeated only when it has to be: the token changed, or the
 * last registration is old enough that lok may have dropped it.
 */
export const PUSH_STORAGE_KEY = "pokket:push:v1";

/** Re-register after this long even with the same token, in case lok dropped it. */
export const REREGISTER_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export const PushRecordSchema = z.object({
  enabled: z.boolean().default(false),
  /** The last Expo push token this device was given. */
  token: z.string().optional(),
  /** profile id → which token was registered with that organization, and when. */
  registrations: z.record(z.string(), z.object({ token: z.string(), at: z.number() })).default({}),
});

export type PushRecord = z.infer<typeof PushRecordSchema>;

export const emptyPushRecord = (): PushRecord => ({ enabled: false, registrations: {} });

export const parsePushRecord = (raw: string | null): PushRecord => {
  if (!raw) return emptyPushRecord();
  try {
    const parsed = PushRecordSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : emptyPushRecord();
  } catch {
    return emptyPushRecord();
  }
};

/** Does this organization need to be told about `token` (again)? */
export const needsRegistration = (record: PushRecord, profileId: string, token: string, now = Date.now()) => {
  const last = record.registrations[profileId];
  return !last || last.token !== token || now - last.at > REREGISTER_AFTER_MS;
};

export const withRegistration = (record: PushRecord, profileId: string, token: string, now = Date.now()): PushRecord => ({
  ...record,
  token,
  registrations: { ...record.registrations, [profileId]: { token, at: now } },
});

/** Off: no token, no registrations — turning it on again starts clean. */
export const disabled = (record: PushRecord): PushRecord => ({ ...record, enabled: false, token: undefined, registrations: {} });
