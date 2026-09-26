import type { ReactNode } from "react";
import { FaktsEndpoint } from "./fakts/endpointSchema";
import { ActiveFakts, Alias, Instance } from "./fakts/faktsSchema";
import { Manifest } from "./fakts/manifestSchema";
import { StoredArkitektSession } from "./fakts/sessionStorageSchema";
import { TokenResponse } from "./fakts/tokenSchema";
import type { GrantedMesh } from "./fakts/meshGrant";


export type FaktsStorage = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
};

export type WindowPopper = {
  open: (url: string) => { close: () => void };
  close: (popup: any) => void;
};

export type NodeIDProvider = () => Promise<string>;

/**
 * Reaching aliases that are not reachable directly — in pokket, the ones on
 * the organisation mesh (lib/mesh). The arkitekt runtime only asks these
 * questions; how an alias is made reachable is the router's business.
 *
 * Stored alias maps always hold the fakts' own aliases. The router's answer
 * (e.g. `127.0.0.1:<port>` for a loopback forward) is applied when clients
 * are built and when an alias is checked, never persisted: it is only valid
 * while this process runs.
 */
export type AliasRouter = {
  /** Does this alias only work through the router? Such aliases are tried after the direct ones. */
  isRouted: (alias: Alias) => boolean;
  /**
   * Make a routed alias reachable and return the alias to actually talk to,
   * or null when it cannot be reached this way (no mesh, not signed in, timed out).
   */
  prepare: (alias: Alias, controller: AbortController) => Promise<Alias | null>;
  /** The prepared stand-in for an alias, or the alias itself. Synchronous, for client builders. */
  resolve: (alias: Alias) => Alias;
};

/**
 * The optional mesh hooks the provider calls around a session's life. Every
 * hook is best-effort: a mesh failure must never turn a working login into
 * an error, so the provider catches and logs whatever they throw.
 */
export type MeshIntegration = {
  router: AliasRouter;
  /** Ask lok for a one-shot mesh key with this grant? */
  wantsKey: (endpoint: FaktsEndpoint) => boolean;
  /** A grant came back (with a key when lok minted one): record and join the mesh. */
  onGrant: (args: { endpoint: FaktsEndpoint; fakts: ActiveFakts; granted?: GrantedMesh }) => Promise<void>;
  /** A stored or refreshed session is live: rejoin from on-disk state if its aliases need the mesh. */
  onRestore: (args: { endpoint: FaktsEndpoint; fakts: ActiveFakts }) => Promise<void>;
  /** The session is gone: leave the mesh and forget this device's node. */
  onDisconnect: () => Promise<void>;
  /** Routes changed under us (the node came back, an app resume re-bound a forward). */
  subscribe: (listener: () => void) => () => void;
};


export type AvailableService = {
  key: string;
  service: string;
  resolved: Alias;
};

export type UnresolvedService = {
  key: string;
  service: string;
  aliases: Alias[] | undefined;
};

export type Service<T = unknown> = {
  alias?: Alias;
  client: T;
  clearCache?: () => Promise<void>;
  type?: string;
  ward?: Ward;
};

/**
 * How every client obtains a usable access token.
 *
 * Normally this refreshes only when the token is near expiry. `forceRefresh`
 * is for the one case that cannot be decided from the clock: the server just
 * rejected the token we hold, so the cached one — however fresh it looks — is
 * exactly the one that must not be reused.
 */
export type GetToken = (options?: {
  forceRefresh?: boolean;
}) => Promise<TokenResponse>;

export type ServiceBuilder<T extends Service = Service> = (options: {
  manifest: Manifest;
  alias: Alias;
  fakts: ActiveFakts;
  getToken: GetToken;
}) => T;

export type ServiceDefinition<T extends Service = Service> = {
  builder: ServiceBuilder<T>;
  key: string;
  service: string;
  omitchallenge?: boolean;
  forceinsecure?: boolean;
  optional: boolean;
  timeout?: number;
  wardKey?: string;
  describe?: boolean;
  description?: string;
  name?: string;
  logo?: () => ReactNode;
};

export type ServiceBuilderMap<
  T extends Record<string, ServiceDefinition> = Record<string, ServiceDefinition>,
> = {
  [K in keyof T]: T[K];
};

export type InferedServiceMap<T extends ServiceBuilderMap> = {
  [K in keyof T]?: T[K] extends ServiceDefinition<infer R> ? R : never;
};

export type AliasReport = {
  valid: boolean;
  alias_id?: string;
  reason?: string;
};

export type ReportRequest = {
  alias_reports: { [key: string]: AliasReport };
  functional: boolean;
};

export type EnhancedManifest = Manifest & {
  node_id?: string;
};

export type ModuleRequirement = {
  serviceKey: string;
  optional?: boolean;
};

export type ModuleDefinition = {
  key: string;
  route: string;
  label?: string;
  description?: string;
  requirement: ModuleRequirement;
  hidden?: boolean;
};

export type ModuleRegistry = Record<string, ModuleDefinition>;

export type ServiceHealthStatus =
  | "unconfigured"
  | "configured"
  | "checking"
  | "ready"
  | "invalid";

export type ModuleHealthStatus =
  | "hidden"
  | "configured"
  | "checking"
  | "ready"
  | "invalid";

export type ServiceRuntimeState = {
  key: string;
  configured: boolean;
  definition: ServiceDefinition;
  instance?: Instance;
  alias?: Alias;
  service?: Service;
  status: ServiceHealthStatus;
  errors: string[];
  lastCheckedAt?: number;
};

export type ModuleRuntimeState = {
  key: string;
  definition: ModuleDefinition;
  configured: boolean;
  status: ModuleHealthStatus;
  route: string;
  errors: string[];
  unmetRequirements: string[];
};

export type ConnectedContext<
  T extends ServiceBuilderMap = ServiceBuilderMap,
  S extends ServiceBuilder = ServiceBuilder,
> = {
  fakts: ActiveFakts;
  manifest: EnhancedManifest;
  serviceMap: InferedServiceMap<T>;
  aliasMap: { [K in keyof T]?: Alias };
  serviceInstanceMap: { [key: string]: Instance };
  serviceBuilderMap: T;
  selfService: ReturnType<S>;
  token: TokenResponse;
  endpoint: FaktsEndpoint;
};

export type ConnectFunction = (options: {
  endpoint: FaktsEndpoint;
  controller: AbortController;
}) => Promise<void>;

export type DisconnectFunction = () => Promise<void>;

export type AppContext<
  T extends ServiceBuilderMap = ServiceBuilderMap,
  S extends ServiceBuilder = ServiceBuilder,
> = {
  manifest: EnhancedManifest;
  connection?: ConnectedContext<T, S>;
  autoLoginError?: string;
  connecting: boolean;
  hasBootstrapped: boolean;
  configurationIssues: string[];
  serviceStates: Record<string, ServiceRuntimeState>;
  moduleStates: Record<string, ModuleRuntimeState>;
  storedSession: StoredArkitektSession | null;
};

export type AppFunctions = {
  connect: ConnectFunction;
  disconnect: DisconnectFunction;
  reconnect: () => Promise<void>;
  cancelConnection: () => void;
  retryService: (serviceKey: string) => Promise<void>;
  retryModule: (moduleKey: string) => Promise<void>;
  clearServiceCache: (serviceKey: string) => Promise<void>;
  clearAllServiceCaches: () => Promise<void>;
};

export type ArkitektContextType<
  T extends ServiceBuilderMap = ServiceBuilderMap,
  S extends ServiceBuilder = ServiceBuilder,
> = AppContext<T, S> & AppFunctions;
