import type { ReactNode } from "react";
import { FaktsEndpoint } from "./fakts/endpointSchema";
import { ActiveFakts, Alias, Instance } from "./fakts/faktsSchema";
import { Manifest } from "./fakts/manifestSchema";
import { StoredArkitektSession } from "./fakts/sessionStorageSchema";
import { TokenResponse } from "./fakts/tokenSchema";
import type { GrantedMesh } from "./fakts/meshGrant";
import type {
  ProfileIdentity,
  ProfileLabel,
  ProfileMesh,
  StoredProfileBook,
} from "./fakts/profileStorageSchema";


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
 * The optional mesh hooks the provider calls around a login's life. Every
 * hook is best-effort: a mesh failure must never turn a working login into
 * an error, so the provider catches and logs whatever they throw.
 *
 * A mesh belongs to a login (`StoredProfile.mesh`), and only a login whose
 * hub exposes one has it; the provider hands each hook the login's mesh and
 * stores what comes back.
 */
export type MeshIntegration = {
  router: AliasRouter;
  /** Where the integration keeps changes to the active login's mesh (its switch, what the node learned). */
  bind?: (persist: (mesh: ProfileMesh) => void) => void;
  /** The single mesh record kept before there were profiles, removed as it is read. */
  takeLegacy?: () => Promise<{ baseUrl: string; mesh: ProfileMesh } | null>;
  /** Ask lok for a one-shot mesh key with this grant? Never when the hub exposes no mesh. */
  wantsKey: (endpoint: FaktsEndpoint, mesh?: ProfileMesh) => boolean;
  /** A grant came back (with a key when lok minted one): join, and return the login's mesh. */
  onGrant: (args: {
    endpoint: FaktsEndpoint;
    fakts: ActiveFakts;
    granted?: GrantedMesh;
    previous?: ProfileMesh;
  }) => Promise<ProfileMesh | undefined>;
  /** This login is now the live one: rejoin its mesh if an alias needs it, run none if it has none. */
  onRestore: (args: { endpoint: FaktsEndpoint; fakts: ActiveFakts; mesh?: ProfileMesh }) => Promise<void>;
  /** No login is live for now (adding another): stop the node, keep its state. */
  onPark: () => Promise<void>;
  /** A login is gone: leave its mesh and forget its node. */
  onDisconnect: (mesh?: ProfileMesh) => Promise<void>;
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
  /** Signing in again to a login that went stale: replace it (and keep its mesh node). */
  replaceProfileId?: string;
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
  /** Every login kept on this device, and which one is live. */
  profileBook: StoredProfileBook;
  /** The login being switched to; the current one keeps running meanwhile. */
  switchingProfileId: string | null;
  /** The login that was live before "Add organization", to go back to on cancel. */
  parkedProfileId: string | null;
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
  /** Make a kept login the live one: a token refresh and a connection swap, no sign-in. */
  switchProfile: (profileId: string) => Promise<void>;
  /** Forget a login (and its mesh node); signing out of the live one moves to another. */
  signOutProfile: (profileId: string) => Promise<void>;
  /** Park the live login and go to sign-in, to add another organization. */
  addProfile: () => Promise<void>;
  /** Back to the login that was live before "Add organization". */
  cancelAddProfile: () => Promise<void>;
  /** What lok says the live login is: its real id, and the labels its row shows. */
  setProfileIdentity: (
    profileId: string,
    update: { identity?: ProfileIdentity; label?: Partial<ProfileLabel> },
  ) => Promise<void>;
};

export type ArkitektContextType<
  T extends ServiceBuilderMap = ServiceBuilderMap,
  S extends ServiceBuilder = ServiceBuilder,
> = AppContext<T, S> & AppFunctions;
