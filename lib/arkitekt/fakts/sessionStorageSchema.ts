import { z } from "zod";
import { FaktsStorage } from "../types";
import { AliasStorage, AliasStorageSchema } from "./aliasStorageSchema";
import { FaktsEndpoint, FaktsEndpointSchema } from "./endpointSchema";
import { ActiveFakts, ActiveFaktsSchema } from "./faktsSchema";
import { TokenResponse, TokenResponseSchema } from "./tokenSchema";

export const ArkitektStorageKeys = {
  endpoint: "endpoint",
  fakts: "fakts",
  token: "token",
  aliasMap: "aliasMap",
} as const;

export type ArkitektStorageKey =
  (typeof ArkitektStorageKeys)[keyof typeof ArkitektStorageKeys];

export const StoredArkitektSessionSchema = z.object({
  endpoint: FaktsEndpointSchema,
  fakts: ActiveFaktsSchema,
  token: TokenResponseSchema,
  aliasMap: AliasStorageSchema,
});

export type StoredArkitektSession = z.infer<typeof StoredArkitektSessionSchema>;

async function loadStoredItem(
  storageKey: ArkitektStorageKey,
  storage: FaktsStorage,
): Promise<unknown | null> {
  const rawValue = await storage.get(storageKey);
  if (!rawValue) {
    return null;
  }

  return JSON.parse(rawValue);
}

async function parseStoredItem<T>(
  storageKey: ArkitektStorageKey,
  schema: z.ZodType<T>,
  storage: FaktsStorage,
): Promise<T | null> {
  const rawValue = await storage.get(storageKey);
  if (!rawValue) {
    return null;
  }

  return schema.parse(JSON.parse(rawValue));
}

async function storeValidatedItem<T>(
  storageKey: ArkitektStorageKey,
  schema: z.ZodType<T>,
  value: T,
  storage: FaktsStorage,
): Promise<void> {
  const parsedValue = schema.parse(value);
  await storage.set(storageKey, JSON.stringify(parsedValue));
}

export async function clearStoredArkitektStorage(
  keys: ArkitektStorageKey[] = Object.values(
    ArkitektStorageKeys,
  ) as ArkitektStorageKey[],
  storage: FaktsStorage,
): Promise<void> {
  await Promise.all(keys.map((key) => storage.remove(key)));
}

export async function loadStoredEndpoint(
  storage: FaktsStorage,
): Promise<FaktsEndpoint | null> {
  return parseStoredItem(
    ArkitektStorageKeys.endpoint,
    FaktsEndpointSchema,
    storage,
  );
}

export async function writeStoredEndpoint(
  endpoint: FaktsEndpoint,
  storage: FaktsStorage,
): Promise<void> {
  await storeValidatedItem(
    ArkitektStorageKeys.endpoint,
    FaktsEndpointSchema,
    endpoint,
    storage,
  );
}

export async function writeStoredFakts(
  fakts: ActiveFakts,
  storage: FaktsStorage,
): Promise<void> {
  await storeValidatedItem(
    ArkitektStorageKeys.fakts,
    ActiveFaktsSchema,
    fakts,
    storage,
  );
}

export async function writeStoredToken(
  token: TokenResponse,
  storage: FaktsStorage,
): Promise<void> {
  await storeValidatedItem(
    ArkitektStorageKeys.token,
    TokenResponseSchema,
    token,
    storage,
  );
}

export async function writeStoredAliasMap(
  aliasMap: AliasStorage,
  storage: FaktsStorage,
): Promise<void> {
  await storeValidatedItem(
    ArkitektStorageKeys.aliasMap,
    AliasStorageSchema,
    aliasMap,
    storage,
  );
}

export async function writeStoredArkitektSession(
  session: StoredArkitektSession,
  storage: FaktsStorage,
): Promise<void> {
  const parsedSession = StoredArkitektSessionSchema.parse(session);
  await writeStoredEndpoint(parsedSession.endpoint, storage);
  await writeStoredFakts(parsedSession.fakts, storage);
  await writeStoredToken(parsedSession.token, storage);
  await writeStoredAliasMap(parsedSession.aliasMap, storage);
}

export async function loadStoredArkitektSession(
  storage: FaktsStorage,
): Promise<Record<string, unknown> | null> {
  const endpoint = await loadStoredItem(ArkitektStorageKeys.endpoint, storage);
  const fakts = await loadStoredItem(ArkitektStorageKeys.fakts, storage);
  const token = await loadStoredItem(ArkitektStorageKeys.token, storage);
  const aliasMap = await loadStoredItem(ArkitektStorageKeys.aliasMap, storage);

  if (!endpoint || !fakts || !token || !aliasMap) {
    return null;
  }

  return {
    endpoint,
    fakts,
    token,
    aliasMap,
  };
}
