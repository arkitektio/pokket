import { Alias, Instance } from "../fakts/faktsSchema";
import { fetchWithTimeout } from "../utils";
import { aliasToHttpPath } from "./helpers";

export const buildChallengeUrl = (alias: Alias): string => {
  const protocol = alias.ssl ? "https" : "http";
  const port = alias.port ? `:${alias.port}` : "";
  const path = alias.path || "";
  return `${protocol}://${alias.host}${port}/${path}/.well-known/fakts-challenge`;
};


export const checkAliasHealth = async (
  alias: Alias,
  timeout: number,
  controller: AbortController,
): Promise<boolean> => {
  const url = aliasToHttpPath(alias, alias.challenge);

  console.log(`[ArkitektProvider] Checking alias health: ${url} (timeout: ${timeout}ms)`);
  try {
    const response = await fetchWithTimeout(url, {
      timeout,
      controller,
    });
    console.log(`[ArkitektProvider] Alias health check result: ${url} -> ${response.status} ${response.ok ? "OK" : "FAIL"}`);
    return response.ok;
  } catch (error) {
    console.error(`[ArkitektProvider] Alias health check error: ${url} ->`, error instanceof Error ? error.message : error);
    throw error;
  }
}

export const resolveWorkingAlias = async ({
  instance,
  timeout = 5000,
  controller,
}: {
  instance: Instance;
  timeout?: number;
  controller: AbortController;
}): Promise<Alias> => {
  console.log(`[ArkitektProvider] Resolving working alias for service: ${instance.service}, aliases: ${instance.aliases.length}, timeout: ${timeout}ms`);
  for (const alias of instance.aliases) {
    try {
      const url = aliasToHttpPath(alias, alias.challenge);
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

  console.error(`[ArkitektProvider] No working alias found for service: ${instance.service}`);
  throw new Error(`No working alias found for service: ${instance.service}`);
};
