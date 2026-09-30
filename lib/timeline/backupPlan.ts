import type { Alias } from "@/lib/arkitekt/fakts/faktsSchema";
import type { ProfileMesh, StoredProfileBook } from "@/lib/arkitekt/fakts/profileStorageSchema";
import type { StoredArkitektSession } from "@/lib/arkitekt/fakts/sessionStorageSchema";
import { onMesh } from "@/lib/mesh/meshNeed";
import type { TimelineSettings } from "./settings";

/**
 * Whether a background backup (backgroundBackup.ts) should run now, and to
 * where: from the settings, the stored logins and the app's state alone.
 */
export type HeadlessPlan =
  | { kind: "skip"; reason: string }
  | {
      kind: "run";
      profileId: string;
      alias: Alias;
      session: StoredArkitektSession;
      /** Set when lokate is reached through this mesh (lib/mesh/headless.ts). */
      mesh?: ProfileMesh;
    };

/**
 * Whether a run from stored logins should back up now, and to where.
 *
 * In the background (the default) it stands aside while pokket is open: the
 * app backs up then. With `whileOpen` (LokateBackup.tsx, for a backup that
 * goes to an organization other than the active one) it stands aside only
 * when the backup's organization is the active one.
 */
export const planHeadlessBackup = (
  settings: TimelineSettings,
  book: StoredProfileBook | null,
  appState: string,
  { whileOpen = false }: { whileOpen?: boolean } = {},
): HeadlessPlan => {
  const profileId = settings.backupProfileId;
  if (!profileId) return { kind: "skip", reason: "the backup is off" };
  if (settings.backupIntervalMin === 0) return { kind: "skip", reason: "no automatic backup is set" };
  if (whileOpen) {
    if (book?.activeProfileId === profileId) return { kind: "skip", reason: "the active organization backs up itself" };
  } else if (appState === "active") {
    return { kind: "skip", reason: "pokket is open and backs up itself" };
  }
  const profile = book?.profiles[profileId];
  if (!profile) return { kind: "skip", reason: "the backup's organization is gone" };
  if (profile.status === "stale") return { kind: "skip", reason: "the organization needs signing in again" };
  const alias = profile.session.aliasMap.aliasMap["lokate"];
  if (!alias) return { kind: "skip", reason: "lokate has not been reached yet" };
  const mesh = profile.mesh?.enabled && onMesh(alias.host, profile.mesh) ? profile.mesh : undefined;
  return { kind: "run", profileId, alias, session: profile.session, mesh };
};
