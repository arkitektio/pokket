import type { ReactNode } from "react";
import { FaktsEndpoint } from "./fakts/endpointSchema";
import { ActiveFakts, Alias, Instance } from "./fakts/faktsSchema";
import { Manifest } from "./fakts/manifestSchema";
import { StoredArkitektSession } from "./fakts/sessionStorageSchema";
import { TokenResponse } from "./fakts/tokenSchema";


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

export type ServiceBuilder<T extends Service = Service> = (options: {
  manifest: Manifest;
  alias: Alias;
  fakts: ActiveFakts;
  getToken: () => Promise<TokenResponse>;
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
  token: string;
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
