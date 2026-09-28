import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";
import type { FaktsEndpoint } from "@/lib/arkitekt/fakts/endpointSchema";
import type { GrantedMesh } from "@/lib/arkitekt/fakts/meshGrant";
import { isValidControlUrl } from "./classify";

import { ProfileMeshSchema, type ProfileMesh } from "@/lib/arkitekt/fakts/profileStorageSchema";

/**
 * The mesh a login belongs to lives on its profile (`ProfileMesh`, in the
 * profile book). This module keeps what builds one from a grant, and reads
 * the single record pokket kept before there were profiles, for migration.
 */
export { ProfileMeshSchema };
export type { ProfileMesh };

export const MeshRecordSchema = z.object({
  /** The deployment (`.well-known/fakts` base_url) the mesh came with. */
  baseUrl: z.string(),
  mesh: ProfileMeshSchema,
});

export type MeshRecord = z.infer<typeof MeshRecordSchema>;

/** Where pokket kept its one mesh before profiles; read once, to migrate. */
const STORAGE_KEY = "pokket.mesh";

export const normalizeBaseUrl = (url: string): string => url.trim().replace(/\/+$/, "").toLowerCase();

export const loadMeshRecord = async (): Promise<MeshRecord | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = MeshRecordSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

export const writeMeshRecord = async (record: MeshRecord | null): Promise<void> => {
  if (record) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(MeshRecordSchema.parse(record)));
  } else {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
};

/** Ids name directories: letters and digits only, and plenty of them. */
const newMeshId = (): string => {
  let id = "";
  while (id.length < 24) id += Math.random().toString(36).slice(2);
  return id.slice(0, 24);
};

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

/**
 * The mesh a fresh grant puts on the session: only when lok minted a key, so
 * the node is about to join with it. A re-approved session's mesh keeps its
 * id (the key then re-authenticates the same node), its pins and its switch.
 */
export const meshFromGrant = (
  endpoint: FaktsEndpoint,
  granted: GrantedMesh | undefined,
  previous: ProfileMesh | undefined,
): ProfileMesh | undefined => {
  if (!granted?.authKey) return undefined;
  const controlUrl = granted.controlUrl ?? endpoint.mesh_coord_url ?? undefined;
  if (!controlUrl || !isValidControlUrl(controlUrl)) return undefined;
  const sameServer = previous?.controlUrl === controlUrl;
  return {
    id: sameServer && previous ? previous.id : newMeshId(),
    label: endpoint.name || hostOf(controlUrl),
    controlUrl,
    hosts: previous?.hosts ?? [],
    enabled: previous?.enabled ?? true,
    magicDnsSuffix: sameServer ? previous?.magicDnsSuffix : undefined,
  };
};
