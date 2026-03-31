import { resolveWorkingAlias } from './alias/resolve'
import { ActiveFakts, Alias } from './fakts/faktsSchema'
import { AliasReport, EnhancedManifest, ServiceBuilderMap } from './types'

const DEFAULT_ALIAS_TIMEOUT = 5000;

export const buildAliases = async ({
  fakts,
  manifest,
  controller,
  serviceBuilderMap,
}: {
  fakts: ActiveFakts
  manifest: EnhancedManifest
  controller: AbortController
  serviceBuilderMap: ServiceBuilderMap
}) => {
  const aliasMap: { [key: string]: Alias } = {}
  const aliasReports: { [key: string]: AliasReport } = {}
  let functional = true

  console.log('[ArkitektProvider] Building aliases for', Object.keys(fakts.instances))

  const servicePromises = manifest.requirements.map(async (req) => {
    try {
      const serviceInstance = fakts.instances[req.key]
      if (!serviceInstance) {
        console.warn(`[ArkitektProvider] buildAliases: no instance for key "${req.key}"`);
        aliasReports[req.key] = {
          valid: false,
          reason: `Service instance not found for key: ${req.key}`
        }
        return
      }

      console.log(`[ArkitektProvider] buildAliases: resolving alias for "${req.key}" (service: ${serviceInstance.service})`);
      const serviceTimeout = serviceBuilderMap[req.key]?.timeout ?? DEFAULT_ALIAS_TIMEOUT;
      const alias = await resolveWorkingAlias({
        instance: serviceInstance,
        timeout: serviceTimeout,
        controller
      })

      console.log(`[ArkitektProvider] buildAliases: resolved "${req.key}" -> ${alias.host}:${alias.port || ''}`);
      aliasReports[req.key] = { valid: true, alias_id: alias.id }
      aliasMap[req.key] = alias
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      if (!req.optional) {
        console.error(`[ArkitektProvider] buildAliases: FAILED required service "${req.key}":`, reason);
        functional = false
        aliasReports[req.key] = {
          valid: false,
          reason
        }
      } else {
        console.warn(`[ArkitektProvider] buildAliases: FAILED optional service "${req.key}":`, reason);
        aliasReports[req.key] = {
          valid: true,
          reason
        }
      }
    }
  })

  await Promise.allSettled(servicePromises)

  console.log(`[ArkitektProvider] buildAliases complete: ${Object.keys(aliasMap).length} resolved, functional: ${functional}`);
  return {
    aliasReports: aliasReports,
    aliasMap: aliasMap,
    functional: functional
  }
}
