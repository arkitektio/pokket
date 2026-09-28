import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

/**
 * What the search shows before anything is typed — orkestrator's
 * `core/command/recents.ts`, on AsyncStorage.
 *
 * Scoped per profile, and that is not a nicety: entity ids belong to one
 * organization, so a recent from one would send the next to a 404. Read
 * entry by entry through a schema: one bad row degrades to a shorter list,
 * never a crash. Recorded only when a result is picked, never on navigation.
 */

export const RecentEntrySchema = z.union([
  z.object({
    kind: z.literal("entity"),
    identifier: z.string(),
    id: z.string(),
    label: z.string(),
    description: z.string().optional(),
    /** Where it opens: pokket has no smart registry to rebuild it from. */
    route: z.string(),
    at: z.number(),
  }),
  z.object({
    kind: z.literal("route"),
    route: z.string(),
    label: z.string(),
    at: z.number(),
  }),
]);

export type RecentEntry = z.infer<typeof RecentEntrySchema>;

export const MAX_RECENTS = 20;

export type KeyValueStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

export const recentsStorageKey = (profileId: string | null): string =>
  `pokket:recents:v1:${profileId ?? "guest"}`;

/** Identity for de-duplication: the same thing picked twice is one entry. */
export const recentKey = (entry: RecentEntry): string =>
  entry.kind === "entity" ? `entity:${entry.identifier}:${entry.id}` : `route:${entry.route}`;

export const loadRecents = async (
  profileId: string | null,
  storage: KeyValueStorage = AsyncStorage,
): Promise<RecentEntry[]> => {
  let raw: string | null = null;
  try {
    raw = await storage.getItem(recentsStorageKey(profileId));
  } catch {
    return [];
  }
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((candidate) => {
      const result = RecentEntrySchema.safeParse(candidate);
      return result.success ? [result.data] : [];
    });
  } catch {
    return [];
  }
};

/** Most recent first, deduped, capped. Pure — the caller persists the result. */
export const addRecent = (current: RecentEntry[], entry: RecentEntry): RecentEntry[] =>
  [entry, ...current.filter((e) => recentKey(e) !== recentKey(entry))].slice(0, MAX_RECENTS);

export const recordRecent = async (
  profileId: string | null,
  entry: RecentEntry,
  storage: KeyValueStorage = AsyncStorage,
): Promise<void> => {
  const next = addRecent(await loadRecents(profileId, storage), entry);
  try {
    await storage.setItem(recentsStorageKey(profileId), JSON.stringify(next));
  } catch {
    // A convenience; never worth failing a navigation over.
  }
};
