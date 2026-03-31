import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { checkAliasHealth, resolveWorkingAlias } from "./alias/resolve";
import { buildAliases } from "./builder";
import { ArkitektContext } from "./context";
import { flow } from "./fakts/flow";
import { Manifest } from "./fakts/manifestSchema";
import {
  clearStoredArkitektStorage,
  loadStoredArkitektSession,
  loadStoredEndpoint,
  StoredArkitektSession,
  StoredArkitektSessionSchema,
  writeStoredAliasMap,
  writeStoredArkitektSession,
  writeStoredEndpoint,
  writeStoredFakts,
  writeStoredToken
} from "./fakts/sessionStorageSchema";
import {
  useArkitekt,
  useAvailableModules,
  useAvailableServices,
  useConfigurationIssues,
  usePotentialService,
  useService,
} from "./hooks";
import { login } from "./oauth/login";
import {
  isAbortLikeError,
  normalizeToken,
  refreshAccessToken,
  shouldRefreshToken,
} from "./runtime/auth";
import { instantiateConnection, type ServiceMap } from "./runtime/connection";
import {
  buildConfigurationIssues,
  buildModuleStates,
  buildServiceStates,
  createModuleRegistryFromServices,
} from "./runtime/state";
import { createArkitektStateStore } from "./store";
import {
  AppContext,
  AppFunctions,
  ConnectedContext,
  EnhancedManifest,
  FaktsStorage,
  ModuleRegistry,
  NodeIDProvider,
  Service,
  ServiceBuilder,
  ServiceBuilderMap,
  ServiceRuntimeState,
  WindowPopper
} from "./types";
import { enhanceManifest, report } from "./utils";

type StoredSession = StoredArkitektSession | null;

export type ArkitektProviderProps<
  T extends ServiceBuilderMap = ServiceBuilderMap,
  S extends ServiceBuilder = ServiceBuilder,
> = {
  children: ReactNode;
  manifest: Manifest;
  serviceBuilderMap: T;
  selfServiceBuilder: S;
  moduleRegistry?: ModuleRegistry;
  storageProvider: FaktsStorage;
  windowPopper: WindowPopper;
  nodeIDProvider: NodeIDProvider;
}




export const ArkitektProvider = <T extends ServiceBuilderMap, S extends ServiceBuilder>({
  children,
  manifest,
  serviceBuilderMap,
  selfServiceBuilder,
  moduleRegistry,
  storageProvider,
  windowPopper,
  nodeIDProvider,
}: ArkitektProviderProps<T, S>) => {
  const resolvedModuleRegistry = useMemo(
    () => moduleRegistry || createModuleRegistryFromServices(serviceBuilderMap),
    [moduleRegistry, serviceBuilderMap],
  );

  const controllerRef = useRef<AbortController | null>(null);
  const validationRunIdsRef = useRef<Record<string, number>>({});

  // Async lock: only one token refresh at a time
  const refreshLockRef = useRef<Promise<void> | null>(null);
  const refreshInitialized = useRef(false);

  // The single refreshToken function passed to all service builders.
  // Behind an async lock so concurrent callers wait for the same refresh.
  const refreshTokenRef = useRef<() => Promise<import("./fakts/tokenSchema").TokenResponse>>(
    () => { throw new Error("Provider not initialized"); },
  );

  const [store] = useState(() => {
    const initialManifest: EnhancedManifest = { ...manifest, node_id: undefined };

    return createArkitektStateStore<T, S>({
      manifest: initialManifest,
      connection: undefined,
      autoLoginError: undefined,
      connecting: false,
      hasBootstrapped: false,
      configurationIssues: buildConfigurationIssues(serviceBuilderMap, resolvedModuleRegistry, null),
      serviceStates: buildServiceStates(serviceBuilderMap, null),
      moduleStates: buildModuleStates(
        resolvedModuleRegistry,
        buildServiceStates(serviceBuilderMap, null),
      ),
      storedSession: null,
    });
  });

  // Wire up the locked refreshToken now that store exists
  if (!refreshInitialized.current) {
    refreshInitialized.current = true;
    console.log("[ArkitektProvider] Initializing refreshToken function");
    refreshTokenRef.current = async () => {
      // If a refresh is already in flight, wait for it and return the new token
      if (refreshLockRef.current) {
        console.log("[ArkitektProvider] Refresh already in flight, waiting for lock...");
        await refreshLockRef.current;
        const s = store.getState().storedSession;
        if (!s) {
          console.error("[ArkitektProvider] No stored session after waiting for refresh lock");
          throw new Error("No stored session after refresh");
        }
        console.log("[ArkitektProvider] Lock released, returning refreshed token");
        return normalizeToken(s.token);
      }

      const session = store.getState().storedSession;
      if (!session) {
        console.error("[ArkitektProvider] getToken called but no stored session available");
        throw new Error("No stored session available");
      }

      const currentToken = normalizeToken(session.token);
      if (!shouldRefreshToken(currentToken)) {
        console.log("[ArkitektProvider] Token still valid, returning current token");
        return currentToken;
      }

      if (!currentToken.refresh_token) {
        console.error("[ArkitektProvider] Token expired but no refresh_token available");
        throw new Error("No refresh token available – cannot refresh");
      }

      console.log("[ArkitektProvider] Token expired, starting refresh...");
      let resolve: () => void;
      refreshLockRef.current = new Promise<void>((r) => { resolve = r; });

      try {
        const nextToken = await refreshAccessToken(
          session.fakts,
          currentToken,
          controllerRef.current || undefined,
        );

        console.log("[ArkitektProvider] Token refresh succeeded");
        const nextSession = { ...session, token: nextToken };
        writeStoredToken(nextToken, storageProvider);
        writeStoredArkitektSession(nextSession, storageProvider);

        const connection = store.getState().connection;
        store.setState({
          storedSession: nextSession,
          connection: connection ? { ...connection, token: nextToken } : connection,
        });

        return nextToken;
      } catch (refreshError) {
        console.error("[ArkitektProvider] Token refresh failed:", refreshError);
        throw refreshError;
      } finally {
        refreshLockRef.current = null;
        resolve!();
      }
    };
  }


  // ── helpers ──

  const deriveRuntimeState = useCallback(
    (
      current: AppContext<T, S>,
      overrides: {
      storedSession?: StoredSession;
      connection?: ConnectedContext<T, S>;
      serviceStateOverrides?: Record<string, Partial<ServiceRuntimeState>>;
    } = {},
    ) => {
      const session = overrides.storedSession !== undefined ? overrides.storedSession : current.storedSession;
      const connection = overrides.connection !== undefined ? overrides.connection : current.connection;

      const serviceStates = buildServiceStates(
        serviceBuilderMap,
        session,
        connection?.serviceMap as ServiceMap | undefined,
        current.serviceStates,
        overrides.serviceStateOverrides,
      );

      return {
        configurationIssues: buildConfigurationIssues(serviceBuilderMap, resolvedModuleRegistry, session),
        serviceStates,
        moduleStates: buildModuleStates(resolvedModuleRegistry, serviceStates),
      };
    },
    [serviceBuilderMap, resolvedModuleRegistry],
  );

  const recompute = useCallback(
    (overrides: {
      storedSession?: StoredSession;
      connection?: ConnectedContext<T, S>;
      serviceStateOverrides?: Record<string, Partial<ServiceRuntimeState>>;
    } = {}) => deriveRuntimeState(store.getState(), overrides),
    [store, deriveRuntimeState],
  );

  const hydrateConnection = useCallback(
    (
      session: StoredSession,
      manifestOverride?: EnhancedManifest,
      extras: Partial<AppContext<T, S>> = {},
    ) => {
      console.log("[ArkitektProvider] hydrateConnection called, session:", session ? "present" : "null");
      const activeManifest = manifestOverride ?? store.getState().manifest;
      const connection = session
        ? instantiateConnection(session, activeManifest, serviceBuilderMap, selfServiceBuilder, () => refreshTokenRef.current())
        : undefined;
      console.log("[ArkitektProvider] hydrateConnection result, services:", connection ? Object.keys(connection.serviceMap) : "none");

      store.setState({
        storedSession: session,
        connection,
        manifest: activeManifest,
        ...recompute({ storedSession: session, connection }),
        ...extras,
      });
    },
    [store, serviceBuilderMap, selfServiceBuilder, recompute],
  );

  const stageStoredSession = useCallback(
    (
      session: StoredSession,
      extras: Partial<AppContext<T, S>> = {},
    ) => {
      store.setState({
        storedSession: session,
        connection: undefined,
        ...recompute({ storedSession: session, connection: undefined }),
        ...extras,
      });
    },
    [store, recompute],
  );

  const setBootstrapped = useCallback(
    (extras: Partial<AppContext<T, S>> = {}) => {
      store.setState({
        connecting: false,
        hasBootstrapped: true,
        ...extras,
      });
    },
    [store],
  );

  const setBootstrapError = useCallback(
    (message: string) => {
      store.setState({
        storedSession: null,
        connection: undefined,
        connecting: false,
        hasBootstrapped: true,
        autoLoginError: message,
        ...recompute({ storedSession: null, connection: undefined }),
      });
    },
    [store, recompute],
  );

  const resolveEnhancedManifest = useCallback(async (): Promise<EnhancedManifest> => {
    const currentManifest = store.getState().manifest;
    if (currentManifest.node_id) {
      return currentManifest;
    }

    const enhancedManifest = await enhanceManifest(manifest, nodeIDProvider);
    store.setState((state) => ({
      manifest: enhancedManifest,
      connection: state.connection
        ? { ...state.connection, manifest: enhancedManifest }
        : state.connection,
    }));

    return enhancedManifest;
  }, [store, manifest]);

  const loadValidatedStoredSession = useCallback(async (): Promise<StoredSession> => {
    const loadedSession = await loadStoredArkitektSession(  storageProvider);

    if (!loadedSession) {
      return null;
    }

    const parsedSession = StoredArkitektSessionSchema.safeParse(loadedSession);
    if (parsedSession.success) {
      return parsedSession.data;
    }

    const validationErrors = parsedSession.error.issues
      .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
      .join("; ");

    console.error("[ArkitektProvider] Invalid stored session schema:", parsedSession.error.issues);
    throw new Error(`Invalid stored Arkitekt config: ${validationErrors}`);
  }, []);

  const validateService = useCallback(
    async (serviceKey: string) => {
      console.log("[ArkitektProvider] validateService started:", serviceKey);
      const runId = (validationRunIdsRef.current[serviceKey] || 0) + 1;
      validationRunIdsRef.current[serviceKey] = runId;

      const state = store.getState();
      const session = state.storedSession;
      const serviceState = state.serviceStates[serviceKey];
      const instance = session?.fakts.instances[serviceKey];

      if (!session || !serviceState || !instance) {
        console.log("[ArkitektProvider] validateService skipped (missing data):", serviceKey, { session: !!session, serviceState: !!serviceState, instance: !!instance });
        return;
      }

      // Mark as checking
      store.setState((current) => ({
        ...deriveRuntimeState(current, {
          serviceStateOverrides: { [serviceKey]: { status: "checking", errors: [] } },
        }),
      }));

      try {
        let alias = session.aliasMap.aliasMap[serviceKey];
        const hc = new AbortController();
        const serviceTimeout = serviceBuilderMap[serviceKey]?.timeout ?? 5000;

        if (!alias || !(await checkAliasHealth(alias, serviceTimeout, hc))) {
          console.log("[ArkitektProvider] validateService: cached alias unhealthy, re-resolving:", serviceKey);
          alias = await resolveWorkingAlias({ instance, timeout: serviceTimeout, controller: hc });
        }

        const validationResult: { persistedSession?: StoredArkitektSession } = {};

        store.setState((current) => {
          if (validationRunIdsRef.current[serviceKey] !== runId) {
            return current;
          }

          const currentSession = current.storedSession;
          const currentInstance = currentSession?.fakts.instances[serviceKey];
          if (!currentSession || !currentInstance || currentInstance !== instance) {
            return current;
          }

          const nextSession: StoredArkitektSession = {
            ...currentSession,
            aliasMap: {
              aliasMap: {
                ...currentSession.aliasMap.aliasMap,
                [serviceKey]: alias,
              },
            },
          };
          const nextConnection = instantiateConnection(
            nextSession,
            current.manifest,
            serviceBuilderMap,
            selfServiceBuilder,
            () => refreshTokenRef.current(),
          );

          validationResult.persistedSession = nextSession;

          return {
            storedSession: nextSession,
            connection: nextConnection,
            ...deriveRuntimeState(current, {
              storedSession: nextSession,
              connection: nextConnection,
              serviceStateOverrides: {
                [serviceKey]: {
                  alias,
                  service: nextConnection.serviceMap[serviceKey] as Service | undefined,
                  status: "ready",
                  errors: [],
                  lastCheckedAt: Date.now(),
                },
              },
            }),
          };
        });

        const nextPersistedSession = validationResult.persistedSession;
        if (!nextPersistedSession) {
          return;
        }

        writeStoredAliasMap(nextPersistedSession.aliasMap, storageProvider);
        writeStoredArkitektSession(nextPersistedSession, storageProvider);

        console.log("[ArkitektProvider] validateService succeeded:", serviceKey, "alias:", alias);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to validate service";
        console.error("[ArkitektProvider] validateService failed:", serviceKey, message, error);

        store.setState((current) => {
          if (validationRunIdsRef.current[serviceKey] !== runId) {
            return current;
          }

          const currentInstance = current.storedSession?.fakts.instances[serviceKey];
          if (!currentInstance || currentInstance !== instance) {
            return current;
          }

          const patchedConn = current.connection
            ? {
                ...current.connection,
                serviceMap: Object.fromEntries(
                  Object.entries(current.connection.serviceMap).filter(([key]) => key !== serviceKey),
                ) as ConnectedContext<T, S>["serviceMap"],
              }
            : undefined;

          return {
            connection: patchedConn,
            ...deriveRuntimeState(current, {
              connection: patchedConn,
              serviceStateOverrides: {
                [serviceKey]: {
                  service: undefined,
                  status: "invalid",
                  errors: [message],
                  lastCheckedAt: Date.now(),
                },
              },
            }),
          };
        });
      }
    },
    [store, serviceBuilderMap, selfServiceBuilder, deriveRuntimeState],
  );

  // ── actions ──

  const connect = useCallback<AppFunctions["connect"]>(
    async ({ endpoint, controller }) => {
      console.log("[ArkitektProvider] connect called, endpoint:", endpoint);
      const prev = store.getState();
      controllerRef.current = controller;
      store.setState({ connecting: true, autoLoginError: undefined });

      try {
        const enhancedManifest = await resolveEnhancedManifest();
        console.log("[ArkitektProvider] connect: manifest enhanced, node_id:", enhancedManifest.node_id);
        await writeStoredEndpoint(endpoint, storageProvider);

        const fakts = await flow({ endpoint, controller, manifest: enhancedManifest, windowPopper: windowPopper });
        console.log("[ArkitektProvider] connect: fakts resolved, services:", Object.keys(fakts.instances || {}));
        await writeStoredFakts(fakts, storageProvider);

        const token = normalizeToken(await login(fakts.auth));
        console.log("[ArkitektProvider] connect: login succeeded");
        const { aliasReports, aliasMap } = await buildAliases({
          fakts,
          manifest: enhancedManifest,
          controller,
          serviceBuilderMap,
        });
        console.log("[ArkitektProvider] connect: aliases built, keys:", Object.keys(aliasMap));

        await writeStoredAliasMap({ aliasMap }, storageProvider);
        await report(fakts.auth.report_url, {
          alias_reports: aliasReports,
          token: fakts.auth.client_token,
          functional: Object.values(aliasReports).every((r) => r.valid),
        });

        const nextSession = { endpoint, fakts, token, aliasMap: { aliasMap } };
        await writeStoredToken(token, storageProvider);
        await writeStoredArkitektSession(nextSession, storageProvider);

        console.log("[ArkitektProvider] connect: session stored, hydrating connection...");
        hydrateConnection(nextSession, enhancedManifest, {
          connecting: false,
          hasBootstrapped: true,
          autoLoginError: undefined,
        });

        console.log("[ArkitektProvider] connect: starting background health checks");
        // Background health checks
        void Promise.all(Object.keys(serviceBuilderMap).map((k) => validateService(k)));
      } catch (error) {
        console.error("[ArkitektProvider] connect failed:", error);
        if (!prev.storedSession) {
          clearStoredArkitektStorage(undefined,   storageProvider);
        }

        store.setState({
          storedSession: prev.storedSession,
          connection: prev.connection,
          manifest: prev.manifest,
          connecting: false,
          hasBootstrapped: true,
          autoLoginError: isAbortLikeError(error)
            ? "Connection cancelled by user"
            : error instanceof Error
              ? error.message
              : "Connection failed",
          ...recompute({ storedSession: prev.storedSession, connection: prev.connection }),
        });
      } finally {
        controllerRef.current = null;
      }
    },
    [store, serviceBuilderMap, hydrateConnection, validateService, recompute, resolveEnhancedManifest],
  );

  const disconnect = useCallback<AppFunctions["disconnect"]>(async () => {
    console.log("[ArkitektProvider] disconnect called");
    controllerRef.current = null;
    await clearStoredArkitektStorage(undefined, storageProvider);
    hydrateConnection(null, store.getState().manifest, {
      connecting: false,
      hasBootstrapped: true,
      autoLoginError: undefined,
    });
  }, [store, hydrateConnection]);

  const reconnect = useCallback<AppFunctions["reconnect"]>(async () => {
    console.log("[ArkitektProvider] reconnect called");
    const endpoint = store.getState().storedSession?.endpoint || await loadStoredEndpoint(storageProvider);
    if (!endpoint) {
      console.error("[ArkitektProvider] reconnect failed: no endpoint found");
      throw new Error("No endpoint found in local storage");
    }
    await connect({ endpoint, controller: new AbortController() });
  }, [store, connect]);

  const cancelConnection = useCallback<AppFunctions["cancelConnection"]>(() => {
    console.log("[ArkitektProvider] cancelConnection called");
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
    store.setState({ connecting: false, autoLoginError: "Connection cancelled by user" });
  }, [store]);

  const retryService = useCallback<AppFunctions["retryService"]>(
    async (serviceKey) => {
      await validateService(serviceKey);
    },
    [validateService],
  );

  const retryModule = useCallback<AppFunctions["retryModule"]>(
    async (moduleKey) => {
      const def = resolvedModuleRegistry[moduleKey];
      if (!def) return;
      // Single requirement per module
      const primaryKey = def.requirement.serviceKey;
      if (primaryKey) await validateService(primaryKey);
    },
    [resolvedModuleRegistry, validateService],
  );

  const clearServiceCache = useCallback<AppFunctions["clearServiceCache"]>(
    async (serviceKey) => {
      const svc = store.getState().connection?.serviceMap[serviceKey] as Service | undefined;
      if (svc?.clearCache) await svc.clearCache();
    },
    [store],
  );

  const clearAllServiceCaches = useCallback<AppFunctions["clearAllServiceCaches"]>(async () => {
    const services = Object.values(store.getState().connection?.serviceMap || {}) as Service[];
    for (const svc of services) {
      if (svc.clearCache) await svc.clearCache();
    }
  }, [store]);

  const actions = useMemo<AppFunctions>(
    () => ({
      connect,
      disconnect,
      reconnect,
      cancelConnection,
      retryService,
      retryModule,
      clearServiceCache,
      clearAllServiceCaches,
    }),
    [connect, disconnect, reconnect, cancelConnection, retryService, retryModule, clearServiceCache, clearAllServiceCaches],
  );

  // ── ONE useEffect: detect cached fakts, hydrate, then run health checks ──
  useEffect(() => {
    const run = async () => {
      try {
        const [enhancedManifest, session] = await Promise.all([
          resolveEnhancedManifest(),
          loadValidatedStoredSession(),
        ]);

        console.log("[ArkitektProvider]: Bootstrapping ArkitektProvider with session:", session);

        if (!session) {
          console.log("[ArkitektProvider] Bootstrap: no cached session, marking bootstrapped");
          setBootstrapped();
          return;
        }

        stageStoredSession(session, {
          manifest: enhancedManifest,
          autoLoginError: undefined,
        });

        console.log("[ArkitektProvider] Bootstrap: refreshing token...");
        await refreshTokenRef.current();
        console.log("[ArkitektProvider] Bootstrap: token refresh complete");

        const refreshedSession = store.getState().storedSession;
        if (!refreshedSession) {
          throw new Error("Stored session missing after refresh");
        }

        hydrateConnection(refreshedSession, enhancedManifest, {
          connecting: false,
          hasBootstrapped: true,
          autoLoginError: undefined,
        });
        console.log("[ArkitektProvider] Hydrated connection from stored session:", store.getState().connection);

        console.log("[ArkitektProvider] Bootstrap: starting background health checks");
        void Promise.all(Object.keys(serviceBuilderMap).map((k) => validateService(k)));
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : "Auto-login failed";

        console.error("[ArkitektProvider] Bootstrap error:", error);
        setBootstrapError(message);
      }
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // runs once on mount


  const contextValue = useMemo(() => ({ store, actions }), [store, actions]);

  return <ArkitektContext.Provider value={contextValue}>{children}</ArkitektContext.Provider>;
};

// ── Guards ──

export type ConnectedGuardProps = {
  notConnectedFallback?: React.ReactNode;
  connectingFallback?: React.ReactNode;
};

export const ConnectedGuard = ({
  notConnectedFallback = "Not Connected",
  connectingFallback = "Loading...",
  children,
}: ConnectedGuardProps & { children: ReactNode }) => {
  const { connection, connecting, storedSession, hasBootstrapped } = useArkitekt();

  if (!storedSession) return <>{notConnectedFallback}</>;

  if (!connection?.selfService) {
    if (connecting || (!hasBootstrapped && storedSession)) return <>{connectingFallback}</>;
    return <>{notConnectedFallback}</>;
  }

  return <>{children}</>;
}

// ── Builder helper ──

export type ArkitektBuilderOptions<T extends ServiceBuilderMap, S extends ServiceBuilder> = {
  manifest: Manifest;
  serviceBuilderMap: T;
  selfServiceBuilder: S;
  moduleRegistry?: ModuleRegistry;
  storageProvider: FaktsStorage;
  windowPopper: WindowPopper;
  nodeIDProvider: NodeIDProvider;
};

export const buildArkitektProvider =
  <T extends ServiceBuilderMap, S extends ServiceBuilder>(options: ArkitektBuilderOptions<T, S>) =>
  { const Provider = ({ children }: { children: ReactNode }) => (
    <ArkitektProvider
      manifest={options.manifest}
      serviceBuilderMap={options.serviceBuilderMap}
      selfServiceBuilder={options.selfServiceBuilder}
      moduleRegistry={options.moduleRegistry}
      storageProvider={options.storageProvider}
      windowPopper={options.windowPopper}
      nodeIDProvider={options.nodeIDProvider}
    >
      {children}
    </ArkitektProvider>
  );
  return Provider;
};

// ── Re-exports ──

export {
  useArkitekt,
  useAvailableModules,
  useAvailableServices,
  useConfigurationIssues,
  usePotentialService,
  useService
};

  export type { AliasMap, ServiceMap } from "./runtime/connection";

export type {
  AppContext,
  ArkitektContextType, EnhancedManifest, FaktsStorage, ModuleDefinition,
  ModuleRegistry,
  ModuleRuntimeState,
  Service,
  ServiceBuilder, ServiceBuilderMap,
  ServiceDefinition,
  ServiceRuntimeState
} from "./types";

