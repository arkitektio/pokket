import { z } from "zod";
import { FaktsStorage } from "../types";
import { StoredArkitektSession, StoredArkitektSessionSchema } from "./sessionStorageSchema";

/**
 * Several logins, parked side by side — orkestrator's profile book, for pokket.
 *
 * The active organization is a claim inside the access token, minted when a
 * human approves the device code: there is no org parameter on any grant and
 * no `setActiveOrganization` mutation, so a token for another organization can
 * only be had by running the device flow again. What the book adds is that it
 * has to run only ONCE per organization: the session is kept rather than
 * overwritten, and switching afterwards is a refresh + a connection swap.
 *
 * `StoredArkitektSession` is untouched and is the inner payload. Every helper
 * here is a pure function over the book; only `loadStoredProfileBook` and
 * `writeStoredProfileBook` touch storage.
 */

export const PROFILE_BOOK_STORAGE_KEY = "pokket.profiles";

/**
 * The organisation mesh this login was let into. It belongs to the PROFILE,
 * not the device: two organizations are two approvals and may be two
 * tailnets. `id` is minted once and names the node's state directory, so it
 * travels with the profile through a re-approval. Never holds the key: that
 * is used once, at join, and the node's own state carries the login after.
 */
export const ProfileMeshSchema = z.object({
  /** Also the node's state directory name, hence the charset. */
  id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  label: z.string(),
  controlUrl: z.string(),
  /** Hosts pinned to the mesh beyond what their names say. */
  hosts: z.array(z.string()).default([]),
  /** The user's switch (Mesh screen). Off: no node, no key asked for. */
  enabled: z.boolean().default(true),
  /** Learned from the running node; lets short MagicDNS names count as on-mesh. */
  magicDnsSuffix: z.string().optional(),
});

export type ProfileMesh = z.infer<typeof ProfileMeshSchema>;

/**
 * What the profile is, as the SERVER sees it — never anything the client
 * mints (not `client_id`: every grant registers a fresh one, and the same
 * organization would pile up as duplicate rows).
 */
export const ProfileIdentitySchema = z.object({
  /** `endpoint.base_url` — the deployment. */
  baseUrl: z.string(),
  /** lok user id; null until the first `mycontext` answers. */
  userId: z.string().nullable(),
  /** lok organization id; null until then, or on deployments without organizations. */
  organizationId: z.string().nullable(),
});

export type ProfileIdentity = z.infer<typeof ProfileIdentitySchema>;

/**
 * Everything needed to draw a row for a profile that is NOT connected. A
 * cache, written while the profile is active and never refreshed in the
 * background: labelling a parked profile would spend its parked refresh
 * token, which rotates on use.
 */
export const ProfileLabelSchema = z.object({
  endpointName: z.string().optional(),
  deploymentName: z.string().optional(),
  username: z.string().optional(),
  organizationName: z.string().optional(),
  organizationSlug: z.string().optional(),
  /** Plain numbers, so a parked row can be painted offline. */
  brandHue: z.number().nullish(),
  brandChroma: z.number().nullish(),
});

export type ProfileLabel = z.infer<typeof ProfileLabelSchema>;

export const ProfileStatusSchema = z.enum(["ok", "stale"]);
export type ProfileStatus = z.infer<typeof ProfileStatusSchema>;

export const StoredProfileSchema = z.object({
  id: z.string(),
  session: StoredArkitektSessionSchema,
  identity: ProfileIdentitySchema,
  label: ProfileLabelSchema.default({}),
  /** `stale` = the refresh chain is known-broken; reviving it costs a new sign-in. */
  status: ProfileStatusSchema.default("ok"),
  staleReason: z.string().optional(),
  /** Absent: this login's deployment exposes no mesh, or lok granted none. */
  mesh: ProfileMeshSchema.optional(),
  lastUsedAt: z.number().default(0),
});

export type StoredProfile = z.infer<typeof StoredProfileSchema>;

export const StoredProfileBookSchema = z.object({
  version: z.literal(1),
  activeProfileId: z.string().nullable(),
  profiles: z.record(z.string(), StoredProfileSchema),
});

export type StoredProfileBook = z.infer<typeof StoredProfileBookSchema>;

export const emptyProfileBook = (): StoredProfileBook => ({
  version: 1,
  activeProfileId: null,
  profiles: {},
});

export const normalizeBaseUrl = (baseUrl: string): string =>
  baseUrl.trim().replace(/\/+$/, "").toLowerCase();

/** `baseUrl::userId::orgId` — stable across re-approvals of the same organization. */
export const deriveProfileId = (identity: ProfileIdentity): string =>
  [normalizeBaseUrl(identity.baseUrl), identity.userId ?? "?", identity.organizationId ?? "-"].join("::");

const PROVISIONAL_PREFIX = "pending::";

/** The id of a login lok has not told us the user and organization of yet. */
export const provisionalProfileId = (baseUrl: string): string =>
  `${PROVISIONAL_PREFIX}${normalizeBaseUrl(baseUrl)}::${Date.now().toString(36)}`;

export const isProvisionalProfileId = (id: string): boolean => id.startsWith(PROVISIONAL_PREFIX);

export const deriveProfileLabel = (session: StoredArkitektSession): ProfileLabel => ({
  endpointName: session.endpoint.name ?? undefined,
  deploymentName: session.fakts.self.deployment_name ?? undefined,
});

export const createProfileFromSession = (
  id: string,
  session: StoredArkitektSession,
  mesh?: ProfileMesh,
): StoredProfile => ({
  id,
  session,
  identity: { baseUrl: session.endpoint.base_url, userId: null, organizationId: null },
  label: deriveProfileLabel(session),
  status: "ok",
  mesh,
  lastUsedAt: Date.now(),
});

export const getActiveProfile = (book: StoredProfileBook): StoredProfile | null =>
  (book.activeProfileId && book.profiles[book.activeProfileId]) || null;

/** Most recently used first. */
export const listProfiles = (book: StoredProfileBook): StoredProfile[] =>
  Object.values(book.profiles).sort((a, b) => b.lastUsedAt - a.lastUsedAt);

const patchProfile = (
  book: StoredProfileBook,
  id: string,
  patch: (profile: StoredProfile) => StoredProfile,
): StoredProfileBook => {
  const profile = book.profiles[id];
  if (!profile) return book;
  return { ...book, profiles: { ...book.profiles, [id]: patch(profile) } };
};

export const upsertProfile = (book: StoredProfileBook, profile: StoredProfile): StoredProfileBook => ({
  ...book,
  profiles: { ...book.profiles, [profile.id]: profile },
});

export const setActiveProfile = (book: StoredProfileBook, id: string | null): StoredProfileBook => {
  if (id === null) return { ...book, activeProfileId: null };
  if (!book.profiles[id]) return book;
  return patchProfile({ ...book, activeProfileId: id }, id, (p) => ({ ...p, lastUsedAt: Date.now() }));
};

export const updateProfileSession = (
  book: StoredProfileBook,
  id: string,
  session: StoredArkitektSession,
): StoredProfileBook => patchProfile(book, id, (p) => ({ ...p, session }));

/** When a session's token was issued; one without a stamp counts as oldest. */
const tokenReceivedAt = (session: StoredArkitektSession) => session.token.received_at ?? 0;

/**
 * `next`, with each session whose token is older than the stored one's
 * taking the stored token (and the fakts that came with it).
 *
 * Refresh tokens rotate on every use, and the app is not the only one that
 * refreshes: the timeline's background backup does too, straight into
 * storage. Writing the book back from memory would put the consumed refresh
 * token back — a dead login. So whoever writes keeps the newest token.
 */
export const keepNewerTokens = (next: StoredProfileBook, stored: StoredProfileBook): StoredProfileBook => {
  let book = next;
  for (const [id, profile] of Object.entries(next.profiles)) {
    const theirs = stored.profiles[id];
    if (!theirs || tokenReceivedAt(theirs.session) <= tokenReceivedAt(profile.session)) continue;
    book = patchProfile(book, id, (p) => ({
      ...p,
      session: { ...p.session, token: theirs.session.token, fakts: theirs.session.fakts },
    }));
  }
  return book;
};

export const markProfileStale = (book: StoredProfileBook, id: string, reason?: string): StoredProfileBook =>
  patchProfile(book, id, (p) => ({ ...p, status: "stale", staleReason: reason }));

export const markProfileOk = (book: StoredProfileBook, id: string): StoredProfileBook =>
  patchProfile(book, id, (p) =>
    p.status === "ok" && !p.staleReason ? p : { ...p, status: "ok", staleReason: undefined },
  );

export const updateProfileLabel = (
  book: StoredProfileBook,
  id: string,
  label: Partial<ProfileLabel>,
): StoredProfileBook => patchProfile(book, id, (p) => ({ ...p, label: { ...p.label, ...label } }));

export const updateProfileMesh = (
  book: StoredProfileBook,
  id: string,
  mesh: ProfileMesh | undefined,
): StoredProfileBook => patchProfile(book, id, (p) => ({ ...p, mesh }));

export const removeProfile = (book: StoredProfileBook, id: string): StoredProfileBook => {
  if (!book.profiles[id]) return book;
  const profiles = { ...book.profiles };
  delete profiles[id];
  return {
    ...book,
    profiles,
    activeProfileId: book.activeProfileId === id ? null : book.activeProfileId,
  };
};

/**
 * lok answered who a profile is: give it its real id. When that id already
 * names another profile — the same organization, signed into again — the new
 * login replaces the old one (its refresh token is the live one), keeping the
 * old row's mesh when this grant brought none, so the node keeps its identity.
 */
export const reidentifyProfile = (
  book: StoredProfileBook,
  id: string,
  identity: ProfileIdentity,
): { book: StoredProfileBook; id: string } => {
  const profile = book.profiles[id];
  if (!profile) return { book, id };
  const nextId = deriveProfileId(identity);
  if (nextId === id) {
    return { book: patchProfile(book, id, (p) => ({ ...p, identity })), id };
  }
  const existing = book.profiles[nextId];
  const merged: StoredProfile = {
    ...profile,
    id: nextId,
    identity,
    label: { ...existing?.label, ...profile.label },
    mesh: profile.mesh ?? existing?.mesh,
  };
  const profiles = { ...book.profiles };
  delete profiles[id];
  profiles[nextId] = merged;
  return {
    book: {
      ...book,
      profiles,
      activeProfileId: book.activeProfileId === id ? nextId : book.activeProfileId,
    },
    id: nextId,
  };
};

export type ProfileGroup = { key: string; title: string; profiles: StoredProfile[] };

/** One group per deployment, headed by its name; most recently used first. */
export const groupProfilesByDeployment = (profiles: StoredProfile[]): ProfileGroup[] => {
  const groups = new Map<string, ProfileGroup>();
  for (const profile of profiles) {
    const key = normalizeBaseUrl(profile.identity.baseUrl);
    const group = groups.get(key) ?? {
      key,
      title: profile.label.endpointName || profile.label.deploymentName || key.replace(/^https?:\/\//, ""),
      profiles: [],
    };
    group.profiles.push(profile);
    groups.set(key, group);
  }
  return [...groups.values()];
};

/** What a row calls a profile: the organization, else the deployment. */
export const profileTitle = (profile: StoredProfile): string =>
  profile.label.organizationName ||
  profile.label.organizationSlug ||
  profile.label.endpointName ||
  profile.label.deploymentName ||
  "Organization";

/** org · user · deployment, leaving out what the title already says. */
export const profileDetail = (profile: StoredProfile): string => {
  const title = profileTitle(profile);
  const deployment = profile.label.endpointName || profile.label.deploymentName;
  return [profile.label.username, deployment]
    .filter((part): part is string => !!part && part !== title)
    .join(" · ");
};

export async function writeStoredProfileBook(book: StoredProfileBook, storage: FaktsStorage): Promise<void> {
  await storage.set(PROFILE_BOOK_STORAGE_KEY, JSON.stringify(StoredProfileBookSchema.parse(book)));
}

/**
 * The stored book, with unreadable profiles dropped one by one rather than
 * losing the whole book to one bad entry. `null` when there is no book yet.
 */
export async function loadStoredProfileBook(storage: FaktsStorage): Promise<StoredProfileBook | null> {
  const raw = await storage.get(PROFILE_BOOK_STORAGE_KEY);
  if (!raw) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return emptyProfileBook();
  }
  const whole = StoredProfileBookSchema.safeParse(json);
  if (whole.success) return whole.data;

  const book = emptyProfileBook();
  const candidate = json as { activeProfileId?: unknown; profiles?: Record<string, unknown> };
  for (const [id, value] of Object.entries(candidate?.profiles ?? {})) {
    const parsed = StoredProfileSchema.safeParse(value);
    if (parsed.success) book.profiles[id] = parsed.data;
    else console.warn("[profiles] Dropping unreadable profile", id, parsed.error.issues);
  }
  const active = typeof candidate?.activeProfileId === "string" ? candidate.activeProfileId : null;
  book.activeProfileId = active && book.profiles[active] ? active : null;
  return book;
}
