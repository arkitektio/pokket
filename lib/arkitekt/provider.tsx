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
  writeStoredEndpoint,
} from "./fakts/sessionStorageSchema";
import {
  createProfileFromSession,
  deriveProfileId,
  emptyProfileBook,
  getActiveProfile,
  listProfiles,
  loadStoredProfileBook,
  markProfileOk,
  markProfileStale,
  normalizeBaseUrl,
  provisionalProfileId,
  reidentifyProfile,
  removeProfile,
  setActiveProfile,
  StoredProfileBook,
  updateProfileLabel,
  updateProfileMesh,
  updateProfileSession,
  upsertProfile,
  writeStoredProfileBook,
} from "./fakts/profileStorageSchema";
import {
  useArkitekt,
  useAvailableModules,
  useAvailableServices,
  useConfigurationIssues,
  usePotentialService,
  useService,
} from "./hooks";
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
import { TokenRotation } from "./runtime/tokenRotation";
import { createArkitektStateStore } from "./store";
import {
  AppContext,
  AppFunctions,
  ConnectedContext,
  EnhancedManifest,
  FaktsStorage,
  GetToken,
  MeshIntegration,
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
  /** The organisation mesh (lib/mesh); absent means every alias is direct. */
  mesh?: MeshIntegration;
}

/**
 * Did the token endpoint itself turn the refresh down? Only that says the
 * login is dead; a network blip says nothing about the credential, and
 * marking on one would greet a user back from a tunnel with every
 * organization claiming to be signed out.
 */
const isRejectedRefresh = (error: unknown): boolean =>
  error instanceof Error && /Failed to refresh token: 4\d\d/.test(error.message);

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

/** Mesh hooks are best-effort: log, never fail the session over them. */
const bestEffort = async (label: string, run: () => Promise<void>) => {
  try {
    await run();
  } catch (error) {
    console.warn(`[ArkitektProvider] mesh ${label} failed:`, error);
  }
};


export const ArkitektProvider = <T extends ServiceBuilderMap, S extends ServiceBuilder>({
  children,
  manifest,
  serviceBuilderMap,
  selfServiceBuilder,
  moduleRegistry,
  storageProvider,
  windowPopper,
  nodeIDProvider,
  mesh,
}: ArkitektProviderProps<T, S>) => {
  // A ref, because the token rotation below is wired once for the provider's life.
  const meshRef = useRef(mesh);
  useEffect(() => {
    meshRef.current = mesh;
  }, [mesh]);

  const resolvedModuleRegistry = useMemo(
    () => moduleRegistry || createModuleRegistryFromServices(serviceBuilderMap),
    [moduleRegistry, serviceBuilderMap],
  );

  const controllerRef = useRef<AbortController | null>(null);
  const validationRunIdsRef = useRef<Record<string, number>>({});

  const refreshInitialized = useRef(false);

  // The single refreshToken function passed to all service builders.
  // Behind an async lock so concurrent callers wait for the same refresh.
  const refreshTokenRef = useRef<GetToken>(
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
      profileBook: emptyProfileBook(),
      switchingProfileId: null,
      parkedProfileId: null,
    });
  });

  /**
   * Every change to the profile book goes through here: applied to the store
   * at once (so back-to-back updates compose), written in order, and awaited
   * by callers that must not go on before it has landed — refresh tokens
   * rotate on use, and a write lost to a killed app is a dead login.
   */
  const persistBookRef = useRef<
    ((update: (book: StoredProfileBook) => StoredProfileBook) => Promise<StoredProfileBook>) | null
  >(null);
  if (!persistBookRef.current) {
    let writes: Promise<void> = Promise.resolve();
    persistBookRef.current = (update) => {
      const next = update(store.getState().profileBook);
      store.setState({ profileBook: next });
      const write = writes.then(() => writeStoredProfileBook(next, storageProvider));
      writes = write.catch((error) => console.error("[ArkitektProvider] Writing profiles failed:", error));
      return write.then(() => next);
    };
  }
  const persistBook = persistBookRef.current;

  // Wire up the locked refreshToken now that store exists
  if (!refreshInitialized.current) {
    refreshInitialized.current = true;
    console.log("[ArkitektProvider] Initializing refreshToken function");

    // The coalescing + forced-vs-raced rule lives in TokenRotation
    // (runtime/tokenRotation.ts); this callback is just the round-trip.
    const rotation = new TokenRotation(async () => {
      // The login this refresh is for; a switch may land while it is in flight.
      const profileId = store.getState().profileBook.activeProfileId;
      const session = store.getState().storedSession;
      if (!session) {
        console.warn("[ArkitektProvider] No stored session available to refresh");
        throw new Error("No stored session available");
      }

      const currentToken = normalizeToken(session.token);
      if (!currentToken.refresh_token) {
        console.warn("[ArkitektProvider] Token expired but no refresh_token available");
        throw new Error("No refresh token available – cannot refresh");
      }

      try {
        // Every refresh response re-renders the fakts envelope, so this is
        // also how instance/alias changes reach us without re-approval.
        const { token: nextToken, fakts: refreshedFakts } = await refreshAccessToken(
          session.endpoint.token_endpoint,
          currentToken,
          controllerRef.current || undefined,
        );
        // No envelope on the response means the server could not re-render it,
        // not that our config went away.
        const nextFakts = refreshedFakts ?? session.fakts;
        if (refreshedFakts && meshRef.current && store.getState().profileBook.activeProfileId === profileId) {
          // A re-render may have put an alias on the mesh (or taken the last off).
          const integration = meshRef.current;
          const mesh = getActiveProfile(store.getState().profileBook)?.mesh;
          void bestEffort("restore after refresh", () =>
            integration.onRestore({ endpoint: session.endpoint, fakts: refreshedFakts, mesh }),
          );
        }

        console.log("[ArkitektProvider] Token refresh succeeded");
        const nextSession = { ...session, token: nextToken, fakts: nextFakts };
        // Awaited, unlike the web build where these are synchronous
        // localStorage writes. The refresh token rotates on every use, so a
        // write that has not landed before the app is backgrounded or killed
        // leaves us holding a refresh token the server has already consumed —
        // the chain is dead and the user has to re-approve. Under the old
        // protocol this was recoverable, because `fakts.auth` could always
        // mint a fresh token via client_credentials; it no longer can.
        if (profileId) {
          await persistBook((book) => updateProfileSession(book, profileId, nextSession));
        }
        if (store.getState().profileBook.activeProfileId !== profileId) {
          // Kept for when that login is switched back to; never handed to
          // the clients of the organization that is live now.
          throw new Error("The organization changed while its token was refreshed");
        }

        const connection = store.getState().connection;
        store.setState({
          storedSession: nextSession,
          connection: connection
            ? {
                ...connection,
                token: nextToken,
                fakts: nextFakts,
                serviceInstanceMap: nextFakts.instances,
              }
            : connection,
        });

        return nextToken;
      } catch (refreshError) {
        console.warn("[ArkitektProvider] Token refresh failed:", refreshError);
        throw refreshError;
      }
    });

    refreshTokenRef.current = async (options = {}) => {
      const forceRefresh = Boolean(options.forceRefresh);

      const session = store.getState().storedSession;
      if (!session) {
        console.warn("[ArkitektProvider] getToken called but no stored session available");
        throw new Error("No stored session available");
      }

      // `forceRefresh` deliberately skips this: the caller is here because the
      // server rejected the token, so how fresh the clock says it is tells us
      // nothing. `isForcedInFlight` extends that to everyone else — while some
      // other client is replacing a rejected token, a "still fresh" cached
      // token is the rejected one, so join the rotation instead of handing it
      // out. Every service client shares this token; they fail together.
      const currentToken = normalizeToken(session.token);
      if (!forceRefresh && !rotation.isForcedInFlight() && !shouldRefreshToken(currentToken)) {
        console.log("[ArkitektProvider] Token still valid, returning current token");
        return currentToken;
      }

      console.log("[ArkitektProvider] Refreshing token (forced:", forceRefresh, ")");
      return rotation.rotate({ forceRefresh });
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
        ? instantiateConnection(session, activeManifest, serviceBuilderMap, selfServiceBuilder, (options) => refreshTokenRef.current(options), meshRef.current?.router)
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

  /**
   * The profile book — or, on the first launch after profiles arrived, one
   * made from the single session (and mesh record) pokket kept before: that
   * login becomes the book's one active profile and the old keys go.
   */
  const loadProfileBook = useCallback(async (): Promise<StoredProfileBook> => {
    const stored = await loadStoredProfileBook(storageProvider);
    if (stored) return stored;

    const legacyMesh = await meshRef.current?.takeLegacy?.().catch(() => null);
    const loadedSession = await loadStoredArkitektSession(storageProvider);
    let book = emptyProfileBook();

    if (loadedSession) {
      const parsedSession = StoredArkitektSessionSchema.safeParse(loadedSession);
      if (parsedSession.success) {
        const session = parsedSession.data;
        const mesh =
          legacyMesh && normalizeBaseUrl(legacyMesh.baseUrl) === normalizeBaseUrl(session.endpoint.base_url)
            ? legacyMesh.mesh
            : undefined;
        const profile = createProfileFromSession(provisionalProfileId(session.endpoint.base_url), session, mesh);
        book = setActiveProfile(upsertProfile(book, profile), profile.id);
        console.log("[ArkitektProvider] Migrated the stored session into a profile");
      } else {
        // Chiefly the fakts protocol-2 migration: sessions written by the old
        // start/challenge/claim flow carry an `auth` block and no
        // `client_id`, and nothing can be salvaged from them.
        console.warn("[ArkitektProvider] Discarding unreadable stored session:", parsedSession.error.issues);
      }
    }

    await writeStoredProfileBook(book, storageProvider);
    // The endpoint stays: it is what the sign-in screen offers again.
    await clearStoredArkitektStorage(["fakts", "token", "aliasMap"], storageProvider);
    return book;
  }, []);

  const validateService = useCallback(
    async (serviceKey: string) => {
      console.log("[ArkitektProvider] validateService started:", serviceKey);
      const runId = (validationRunIdsRef.current[serviceKey] || 0) + 1;
      validationRunIdsRef.current[serviceKey] = runId;

      const state = store.getState();
      const session = state.storedSession;
      const profileId = state.profileBook.activeProfileId;
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
        const router = meshRef.current?.router;

        if (!alias || !(await checkAliasHealth(alias, serviceTimeout, hc, router).catch(() => false))) {
          console.log("[ArkitektProvider] validateService: cached alias unhealthy, re-resolving:", serviceKey);
          alias = await resolveWorkingAlias({ instance, timeout: serviceTimeout, controller: hc, router });
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
            (options) => refreshTokenRef.current(options),
            meshRef.current?.router,
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

        if (profileId && store.getState().profileBook.activeProfileId === profileId) {
          await persistBook((book) => updateProfileSession(book, profileId, nextPersistedSession));
        }

        console.log("[ArkitektProvider] validateService succeeded:", serviceKey, "alias:", alias);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to validate service";
        console.warn("[ArkitektProvider] validateService failed:", serviceKey, message, error);

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
    [store, serviceBuilderMap, selfServiceBuilder, deriveRuntimeState, persistBook],
  );

  const validateAllServices = useCallback(
    () => Promise.all(Object.keys(serviceBuilderMap).map((k) => validateService(k))),
    [serviceBuilderMap, validateService],
  );

  // ── actions ──

  const connect = useCallback<AppFunctions["connect"]>(
    async ({ endpoint, controller, replaceProfileId }) => {
      console.log("[ArkitektProvider] connect called, endpoint:", endpoint);
      const prev = store.getState();
      const replacing = replaceProfileId ? prev.profileBook.profiles[replaceProfileId] : undefined;
      controllerRef.current = controller;
      store.setState({ connecting: true, autoLoginError: undefined });

      try {
        const enhancedManifest = await resolveEnhancedManifest();
        console.log("[ArkitektProvider] connect: manifest enhanced, node_id:", enhancedManifest.node_id);
        await writeStoredEndpoint(endpoint, storageProvider);

        const integration = meshRef.current;
        let requestMeshKey = false;
        if (integration) {
          try {
            requestMeshKey = integration.wantsKey(endpoint, replacing?.mesh);
          } catch (error) {
            console.warn("[ArkitektProvider] mesh wantsKey failed:", error);
          }
        }

        // One grant, one response: tokens and the rendered instances together
        // (and a one-shot mesh key, when we asked and lok minted one).
        const { fakts, token: grantToken, mesh: granted } = await flow({
          endpoint,
          controller,
          manifest: enhancedManifest,
          windowPopper: windowPopper,
          requestMeshKey,
        });
        console.log("[ArkitektProvider] connect: fakts resolved, services:", Object.keys(fakts.instances || {}));

        // Join before resolving aliases, so the ones on the mesh can be reached.
        // Only a hub that exposes a mesh (and granted this login a node) gives one.
        let profileMesh = replacing?.mesh;
        if (integration) {
          await bestEffort("grant", async () => {
            profileMesh = await integration.onGrant({ endpoint, fakts, granted, previous: replacing?.mesh });
          });
        }

        const token = normalizeToken(grantToken);
        const { aliasReports, aliasMap } = await buildAliases({
          fakts,
          manifest: enhancedManifest,
          controller,
          serviceBuilderMap,
          router: integration?.router,
        });
        console.log("[ArkitektProvider] connect: aliases built, keys:", Object.keys(aliasMap));

        await report(endpoint.base_url, token.access_token, {
          alias_reports: aliasReports,
          functional: Object.values(aliasReports).every((r) => r.valid),
        });

        // A new row in the book, not an overwrite: that is what keeps the
        // other organizations one tap away. Its id is provisional until lok
        // says who it is (`setProfileIdentity`), which merges a repeat
        // sign-in into the organization's existing row.
        const nextSession = { endpoint, fakts, token, aliasMap: { aliasMap } };
        const profile = createProfileFromSession(
          replacing?.id ?? provisionalProfileId(endpoint.base_url),
          nextSession,
          profileMesh,
        );
        await persistBook((book) =>
          setActiveProfile(
            upsertProfile(
              book,
              replacing
                ? { ...replacing, ...profile, label: replacing.label, identity: replacing.identity, staleReason: undefined }
                : profile,
            ),
            profile.id,
          ),
        );

        console.log("[ArkitektProvider] connect: session stored, hydrating connection...");
        hydrateConnection(nextSession, enhancedManifest, {
          connecting: false,
          hasBootstrapped: true,
          autoLoginError: undefined,
          parkedProfileId: null,
        });

        console.log("[ArkitektProvider] connect: starting background health checks");
        void validateAllServices();
      } catch (error) {
        console.warn("[ArkitektProvider] connect failed:", error);
        // The grant may have handed the mesh to the new login already; the
        // login still live gets its own back.
        const integration = meshRef.current;
        if (integration && prev.storedSession && prev.connection) {
          const live = prev.storedSession;
          await bestEffort("restore after failed sign-in", () =>
            integration.onRestore({
              endpoint: live.endpoint,
              fakts: live.fakts,
              mesh: getActiveProfile(prev.profileBook)?.mesh,
            }),
          );
        }

        store.setState({
          storedSession: prev.storedSession,
          connection: prev.connection,
          manifest: prev.manifest,
          connecting: false,
          hasBootstrapped: true,
          autoLoginError: isAbortLikeError(error)
            ? "Connection cancelled by user"
            : errorMessage(error, "Connection failed"),
          ...recompute({ storedSession: prev.storedSession, connection: prev.connection }),
        });
        throw error;
      } finally {
        controllerRef.current = null;
      }
    },
    [store, serviceBuilderMap, hydrateConnection, validateAllServices, recompute, resolveEnhancedManifest, persistBook],
  );

  /**
   * Bring a kept login live: refresh its token, hand the mesh over, swap the
   * connection. Two rules, both from orkestrator's `switchProfile`:
   *
   *  1. The current login keeps running until the new token is in hand —
   *     tearing it down first would leave a dead app if the refresh fails.
   *  2. The rotated refresh token is persisted before the swap, so a swap
   *     that throws cannot cost the parked login its only refresh token.
   */
  const switchProfile = useCallback<AppFunctions["switchProfile"]>(
    async (profileId) => {
      const state = store.getState();
      if (state.switchingProfileId) return;
      if (state.profileBook.activeProfileId === profileId && state.connection) return;
      const profile = state.profileBook.profiles[profileId];
      if (!profile) throw new Error(`Unknown organization ${profileId}`);

      console.log("[ArkitektProvider] switchProfile:", profileId);
      store.setState({ switchingProfileId: profileId, autoLoginError: undefined });

      try {
        const manifest = await resolveEnhancedManifest();
        const { token: nextToken, fakts: refreshedFakts } = await refreshAccessToken(
          profile.session.endpoint.token_endpoint,
          normalizeToken(profile.session.token),
        );
        const nextSession: StoredArkitektSession = {
          ...profile.session,
          token: nextToken,
          fakts: refreshedFakts ?? profile.session.fakts,
        };
        // (2)
        await persistBook((book) => updateProfileSession(markProfileOk(book, profileId), profileId, nextSession));
        if (!store.getState().profileBook.profiles[profileId]) {
          // Signed out of while its refresh was in flight.
          store.setState({ switchingProfileId: null });
          return;
        }

        // Stops the previous login's node (keeping its state) and starts this
        // one's if it has a mesh and an alias needs it; runs none otherwise.
        const integration = meshRef.current;
        if (integration) {
          await bestEffort("switch", () =>
            integration.onRestore({ endpoint: nextSession.endpoint, fakts: nextSession.fakts, mesh: profile.mesh }),
          );
        }

        await persistBook((book) => setActiveProfile(book, profileId));
        // New clients, new caches: nothing of one organization's data is
        // served to another.
        hydrateConnection(nextSession, manifest, {
          connecting: false,
          hasBootstrapped: true,
          autoLoginError: undefined,
          switchingProfileId: null,
          parkedProfileId: null,
        });
        void validateAllServices();
      } catch (error) {
        console.warn("[ArkitektProvider] switchProfile failed:", error);
        const message = isRejectedRefresh(error)
          ? "Session expired — sign in again"
          : errorMessage(error, "Could not switch organization");
        if (isRejectedRefresh(error)) {
          await persistBook((book) => markProfileStale(book, profileId, message));
        }
        store.setState({ switchingProfileId: null });
        throw new Error(message);
      }
    },
    [store, persistBook, hydrateConnection, validateAllServices, resolveEnhancedManifest],
  );

  const signOutProfile = useCallback<AppFunctions["signOutProfile"]>(
    async (profileId) => {
      console.log("[ArkitektProvider] signOutProfile:", profileId);
      const book = store.getState().profileBook;
      const profile = book.profiles[profileId];
      if (!profile) return;
      const wasActive = book.activeProfileId === profileId;

      const integration = meshRef.current;
      if (integration) {
        await bestEffort("sign out", () => integration.onDisconnect(profile.mesh));
      }
      const next = await persistBook((current) => removeProfile(current, profileId));
      if (!wasActive) return;

      controllerRef.current = null;
      hydrateConnection(null, store.getState().manifest, {
        connecting: false,
        hasBootstrapped: true,
        autoLoginError: undefined,
      });
      // On to the most recently used organization still signed in, if any;
      // otherwise the sign-in screen, which the null connection shows.
      const fallback = listProfiles(next).find((candidate) => candidate.status === "ok");
      if (fallback) {
        await switchProfile(fallback.id).catch((error) =>
          console.warn("[ArkitektProvider] no organization to fall back to:", error),
        );
      }
    },
    [store, persistBook, hydrateConnection, switchProfile],
  );

  const disconnect = useCallback<AppFunctions["disconnect"]>(async () => {
    console.log("[ArkitektProvider] disconnect called");
    const activeId = store.getState().profileBook.activeProfileId;
    if (activeId) {
      await signOutProfile(activeId);
      return;
    }
    controllerRef.current = null;
    const integration = meshRef.current;
    if (integration) {
      await bestEffort("disconnect", () => integration.onDisconnect());
    }
    hydrateConnection(null, store.getState().manifest, {
      connecting: false,
      hasBootstrapped: true,
      autoLoginError: undefined,
    });
  }, [store, hydrateConnection, signOutProfile]);

  const addProfile = useCallback<AppFunctions["addProfile"]>(async () => {
    const activeId = store.getState().profileBook.activeProfileId;
    console.log("[ArkitektProvider] addProfile, parking:", activeId);
    const integration = meshRef.current;
    if (integration) {
      await bestEffort("park", () => integration.onPark());
    }
    await persistBook((book) => setActiveProfile(book, null));
    // A null connection is what routes to the sign-in screen.
    hydrateConnection(null, store.getState().manifest, {
      connecting: false,
      hasBootstrapped: true,
      autoLoginError: undefined,
      parkedProfileId: activeId,
    });
  }, [store, persistBook, hydrateConnection]);

  const cancelAddProfile = useCallback<AppFunctions["cancelAddProfile"]>(async () => {
    const parked = store.getState().parkedProfileId;
    if (!parked) return;
    await switchProfile(parked);
  }, [store, switchProfile]);

  const setProfileIdentity = useCallback<AppFunctions["setProfileIdentity"]>(
    async (profileId, { identity, label }) => {
      // A repeat sign-in folds into the organization's existing row. If both
      // logins joined a mesh, the new node wins; the old one is forgotten
      // rather than left behind on disk.
      if (identity) {
        const book = store.getState().profileBook;
        const incoming = book.profiles[profileId];
        const existing = book.profiles[deriveProfileId(identity)];
        const integration = meshRef.current;
        if (
          integration &&
          existing &&
          existing.id !== profileId &&
          existing.mesh &&
          incoming?.mesh &&
          existing.mesh.id !== incoming.mesh.id
        ) {
          const orphan = existing.mesh;
          await bestEffort("forget replaced node", () => integration.onDisconnect(orphan));
        }
      }
      await persistBook((book) => {
        let next = book;
        let id = profileId;
        if (identity) ({ book: next, id } = reidentifyProfile(next, profileId, identity));
        if (label) next = updateProfileLabel(next, id, label);
        return next;
      });
    },
    [store, persistBook],
  );

  const reconnect = useCallback<AppFunctions["reconnect"]>(async () => {
    console.log("[ArkitektProvider] reconnect called");
    const endpoint = store.getState().storedSession?.endpoint || await loadStoredEndpoint(storageProvider);
    if (!endpoint) {
      console.warn("[ArkitektProvider] reconnect failed: no endpoint found");
      throw new Error("No endpoint found in local storage");
    }
    await connect({
      endpoint,
      controller: new AbortController(),
      replaceProfileId: store.getState().profileBook.activeProfileId ?? undefined,
    });
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
      switchProfile,
      signOutProfile,
      addProfile,
      cancelAddProfile,
      setProfileIdentity,
    }),
    [
      connect,
      disconnect,
      reconnect,
      cancelConnection,
      retryService,
      retryModule,
      clearServiceCache,
      clearAllServiceCaches,
      switchProfile,
      signOutProfile,
      addProfile,
      cancelAddProfile,
      setProfileIdentity,
    ],
  );

  // ── ONE useEffect: load the book, bring the active login live, then run health checks ──
  useEffect(() => {
    const run = async () => {
      let activeId: string | null = null;
      try {
        const [enhancedManifest, book] = await Promise.all([
          resolveEnhancedManifest(),
          loadProfileBook(),
        ]);
        store.setState({ profileBook: book });

        const active = getActiveProfile(book);
        activeId = active?.id ?? null;
        console.log("[ArkitektProvider] Bootstrapping with profile:", activeId, "of", Object.keys(book.profiles).length);

        if (!active) {
          console.log("[ArkitektProvider] Bootstrap: no active profile, marking bootstrapped");
          setBootstrapped();
          return;
        }

        stageStoredSession(active.session, {
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

        // Rejoin from the node's on-disk state (no key needed) when this
        // login has a mesh and an alias lives on it; none runs otherwise.
        const integration = meshRef.current;
        if (integration) {
          await bestEffort("restore", () =>
            integration.onRestore({
              endpoint: refreshedSession.endpoint,
              fakts: refreshedSession.fakts,
              mesh: getActiveProfile(store.getState().profileBook)?.mesh,
            }),
          );
        }

        hydrateConnection(refreshedSession, enhancedManifest, {
          connecting: false,
          hasBootstrapped: true,
          autoLoginError: undefined,
        });
        console.log("[ArkitektProvider] Hydrated connection from stored session:", store.getState().connection);

        console.log("[ArkitektProvider] Bootstrap: starting background health checks");
        void validateAllServices();
      } catch (error) {
        const message = errorMessage(error, "Auto-login failed");
        console.warn("[ArkitektProvider] Bootstrap error:", error);
        if (activeId && isRejectedRefresh(error)) {
          // Dead for good: keep the row (to sign in again from), but not live.
          const id = activeId;
          await persistBook((book) =>
            setActiveProfile(markProfileStale(book, id, "Session expired — sign in again"), null),
          );
        }
        setBootstrapError(message);
      }
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // runs once on mount

  // Changes the mesh makes to the live login's record (its switch, the
  // suffix its node learned) belong on that login's profile.
  useEffect(() => {
    mesh?.bind?.((next) => {
      void persistBook((book) => {
        const owner = Object.values(book.profiles).find((profile) => profile.mesh?.id === next.id);
        return owner ? updateProfileMesh(book, owner.id, next) : book;
      });
    });
  }, [mesh, persistBook]);

  // When the mesh's routes change (the node came up, a forward was re-bound
  // after the app came back from the background, the mesh was switched on or
  // off), re-check the services so clients are rebuilt against the live
  // route. All of them: once the mesh is off nothing reads as routed any
  // more, yet clients built against its forwards still need rebuilding.
  // These notices are rare, and a check is one request per service.
  useEffect(() => {
    if (!mesh) return;
    return mesh.subscribe(() => {
      if (!store.getState().storedSession) return;
      void Promise.all(Object.keys(serviceBuilderMap).map((key) => validateService(key)));
    });
  }, [mesh, store, serviceBuilderMap, validateService]);


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
  mesh?: MeshIntegration;
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
      mesh={options.mesh}
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
  MeshIntegration,
  ModuleRegistry,
  ModuleRuntimeState,
  Service,
  ServiceBuilder, ServiceBuilderMap,
  ServiceDefinition,
  ServiceRuntimeState
} from "./types";

