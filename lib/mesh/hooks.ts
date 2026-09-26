import { useSyncExternalStore } from "react";
import { mesh } from "./integration";
import type { MeshRecord } from "./record";

/** The session's mesh record, live. */
export const useMeshRecord = (): MeshRecord | null =>
  useSyncExternalStore(mesh.subscribeRecord, mesh.record, mesh.record);
