import { ActiveFakts, Alias } from "../fakts/faktsSchema";
import { StoredArkitektSession } from "../fakts/sessionStorageSchema";
import { TokenResponse } from "../fakts/tokenSchema";
import {
  ConnectedContext,
  EnhancedManifest,
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
}: {
  map: ServiceBuilderMap;
  manifest: EnhancedManifest;
  aliasMap: AliasMap;
  fakts: ActiveFakts;
  getToken: () => Promise<TokenResponse>;
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
      alias,
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
  getToken: () => Promise<TokenResponse>,
): ConnectedContext<T, S> => {
  const token = normalizeToken(storedSession.token);
  const serviceMap = buildServiceMap({
    map: serviceBuilderMap,
    manifest,
    aliasMap: storedSession.aliasMap.aliasMap,
    fakts: storedSession.fakts,
    getToken,
  }) as ConnectedContext<T, S>["serviceMap"];

  const selfService = selfServiceBuilder({
    manifest,
    alias: storedSession.fakts.self.alias,
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
