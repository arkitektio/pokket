import { ActiveFakts, Alias } from "../fakts/faktsSchema";
import { StoredArkitektSession } from "../fakts/sessionStorageSchema";
import {
  AliasRouter,
  ConnectedContext,
  EnhancedManifest,
  GetToken,
  Service,
  ServiceBuilder,
  ServiceBuilderMap,
  ServiceDefinition,
} from "../types";
import { normalizeToken } from "./auth";

export type AliasMap = Record<string, Alias>;
export type ServiceMap = Record<string, Service>;

export const buildServiceMap = ({
  map,
  manifest,
  aliasMap,
  fakts,
  getToken,
  router,
}: {
  map: ServiceBuilderMap;
  manifest: EnhancedManifest;
  aliasMap: AliasMap;
  fakts: ActiveFakts;
  getToken: GetToken;
  router?: AliasRouter;
}): ServiceMap => {
  const services: ServiceMap = {};

  Object.keys(map).forEach((key) => {
    const definition: ServiceDefinition = map[key];
    const alias = aliasMap[key];

    if (!alias) {
      return;
    }

    services[key] = definition.builder({
      manifest,
      // What the client talks to; the stored map keeps the fakts' own alias.
      alias: router ? router.resolve(alias) : alias,
      fakts,
      getToken,
    });
  });

  return services;
};

export const instantiateConnection = <
  T extends ServiceBuilderMap,
  S extends ServiceBuilder,
>(
  storedSession: StoredArkitektSession,
  manifest: EnhancedManifest,
  serviceBuilderMap: T,
  selfServiceBuilder: S,
  getToken: GetToken,
  router?: AliasRouter,
): ConnectedContext<T, S> => {
  const token = normalizeToken(storedSession.token);
  const serviceMap = buildServiceMap({
    map: serviceBuilderMap,
    manifest,
    aliasMap: storedSession.aliasMap.aliasMap,
    fakts: storedSession.fakts,
    getToken,
    router,
  }) as ConnectedContext<T, S>["serviceMap"];

  const selfAlias = storedSession.fakts.self.alias;
  const selfService = selfServiceBuilder({
    manifest,
    alias: router ? router.resolve(selfAlias) : selfAlias,
    fakts: storedSession.fakts,
    getToken,
  });

  return {
    endpoint: storedSession.endpoint,
    fakts: storedSession.fakts,
    manifest,
    serviceMap,
    aliasMap: storedSession.aliasMap.aliasMap as ConnectedContext<T, S>["aliasMap"],
    serviceInstanceMap: storedSession.fakts.instances,
    serviceBuilderMap,
    selfService: selfService as ReturnType<S>,
    token,
  };
};
