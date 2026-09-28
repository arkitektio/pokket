import { Alias, Instance } from "../fakts/faktsSchema";
import type { AliasRouter } from "../types";
import { fetchWithTimeout } from "../utils";
import { aliasToHttpPath } from "./helpers";

export const buildChallengeUrl = (alias: Alias): string => {
  const protocol = alias.ssl ? "https" : "http";
  const port = alias.port ? `:${alias.port}` : "";
  const path = alias.path || "";
  return `${protocol}://${alias.host}${port}/${path}/.well-known/fakts-challenge`;
};


/**
 * The alias a check should actually talk to: itself, or — for one only the
 * router can reach — the router's stand-in (null when it cannot be reached).
 */
const reachableAlias = async (
  alias: Alias,
  controller: AbortController,
  router?: AliasRouter,
): Promise<Alias | null> =>
  router?.isRouted(alias) ? router.prepare(alias, controller) : alias;

export const checkAliasHealth = async (
  alias: Alias,
  timeout: number,
  controller: AbortController,
  router?: AliasRouter,
): Promise<boolean> => {
  const target = await reachableAlias(alias, controller, router);
  if (!target) {
    console.warn(`[ArkitektProvider] Alias ${alias.host} is routed but not reachable right now`);
    return false;
  }
  const url = aliasToHttpPath(target, alias.challenge);

  console.log(`[ArkitektProvider] Checking alias health: ${url} (timeout: ${timeout}ms)`);
  try {
    const response = await fetchWithTimeout(url, {
      timeout,
      controller,
    });
    console.log(`[ArkitektProvider] Alias health check result: ${url} -> ${response.status} ${response.ok ? "OK" : "FAIL"}`);
    return response.ok;
  } catch (error) {
    console.warn(`[ArkitektProvider] Alias health check error: ${url} ->`, error instanceof Error ? error.message : error);
    throw error;
  }
}

export const resolveWorkingAlias = async ({
  instance,
  timeout = 5000,
  controller,
  router,
}: {
  instance: Instance;
  timeout?: number;
  controller: AbortController;
  router?: AliasRouter;
}): Promise<Alias> => {
  console.log(`[ArkitektProvider] Resolving working alias for service: ${instance.service}, aliases: ${instance.aliases.length}, timeout: ${timeout}ms`);
  // Direct aliases first, in fakts order; the routed ones (on the mesh) only
  // after them, since reaching those may mean waiting for the mesh to come up.
  const ordered = router
    ? [
        ...instance.aliases.filter((alias) => !router.isRouted(alias)),
        ...instance.aliases.filter((alias) => router.isRouted(alias)),
      ]
    : instance.aliases;
  for (const alias of ordered) {
    try {
      const target = await reachableAlias(alias, controller, router);
      if (!target) {
        console.warn(`[ArkitektProvider] Alias not reachable through the mesh: ${alias.host}`);
        continue;
      }
      const url = aliasToHttpPath(target, alias.challenge);
      console.log(`[ArkitektProvider] Trying alias: ${url}`);

      const response = await fetchWithTimeout(url, {
        timeout,
        controller,
      });

      if (response.ok) {
        console.log(`[ArkitektProvider] Alias resolved: ${url} -> OK`);
        return alias;
      }
      console.warn(`[ArkitektProvider] Alias responded but not OK: ${url} -> ${response.status}`);
    } catch (e) {
      console.warn(`[ArkitektProvider] Alias failed: ${alias.host}:${alias.port || ""} ->`, (e as Error).message);
      continue;
    }
  }

  console.warn(`[ArkitektProvider] No working alias found for service: ${instance.service}`);
  throw new Error(`No working alias found for service: ${instance.service}`);
};
