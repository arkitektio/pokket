import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloReactHooks from '@/lib/rekuest/funcs';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** The `ActionHash` scalar is the sha256 identity hash of an action definition (key, version, ports, ...) */
  ActionHash: { input: any; output: any; }
  /** The `AnyDefault` scalar is any JSON value used as a port default or a choice value; the server checks it against the port's kind */
  AnyDefault: { input: any; output: any; }
  /** The `Arg` scalar type represents a an Argument in a Action assignment */
  Arg: { input: any; output: any; }
  /** The `Args` scalar type represents a Dictionary of arguments */
  Args: { input: any; output: any; }
  /** Date with time (isoformat) */
  DateTime: { input: any; output: any; }
  /** A stored vector, as `<model id>:<comma-separated floats>` -- e.g. `potion-base-8M:0.0123,-0.0456,...`. The model id is part of the value because vectors from different models are not comparable. Null when the row has no vector yet (it carries no text, or indexing has not caught up with it). */
  Embedding: { input: any; output: any; }
  /** The `Identifier` scalar is a structure identifier of the form `@package/key` (e.g. `@mikro/image`) that types STRUCTURE, MEMORY_STRUCTURE and INTERFACE ports */
  Identifier: { input: any; output: any; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](https://ecma-international.org/wp-content/uploads/ECMA-404_2nd_edition_december_2017.pdf). */
  JSON: { input: any; output: any; }
  /** The `JSONSerializable` scalar type represents a JSON-serializable value. */
  JSONSerializable: { input: any; output: any; }
  /** A type representing a media store reference, which can be either a string ID or a more complex object. */
  MediaLike: { input: any; output: any; }
  /** The `Props` scalar type represents a JSON object of UI props or state */
  Props: { input: any; output: any; }
  /** The `SearchQuery` scalar is a GraphQL query string a search widget executes against its ward to populate its choices */
  SearchQuery: { input: any; output: any; }
  _Any: { input: any; output: any; }
};

export type AckInput = {
  task: Scalars['ID']['input'];
};

/** Represents an executable action in the system. */
export type Action = {
  __typename?: 'Action';
  /** Whether the action may be invoked as a probe (zero persistence, no history/replay/recovery). Declared by the action author. */
  allowProbe: Scalars['Boolean']['output'];
  /** The app this action belongs to. */
  app: App;
  /** Input arguments (ports) for the action. */
  args: Array<ArgPort>;
  /** Collections to which this action belongs. */
  collections: Array<Collection>;
  /** Timestamp when the action was defined. */
  definedAt: Scalars['DateTime']['output'];
  /** Optional description of the action. */
  description?: Maybe<Scalars['String']['output']>;
  /** This action's stored vector, as `<model id>:<floats>`. Null until it has been indexed. */
  embedding?: Maybe<Scalars['Embedding']['output']>;
  /** Unique hash identifying the action definition. */
  hash: Scalars['ActionHash']['output'];
  /** Unique ID of the action. */
  id: Scalars['ID']['output'];
  /** Whether the action is idempotent: safe to re-run with the same args — re-dispatchable on ambiguous executor loss. */
  idempotent: Scalars['Boolean']['output'];
  /** List of implementations for this action. */
  implementations: Array<Implementation>;
  /** Marks whether the action is in development. */
  isDev: Scalars['Boolean']['output'];
  /** Actions for which this is a test. */
  isTestFor: Array<Action>;
  /** Key of the action, used for grouping and identification. */
  key: Scalars['String']['output'];
  /** The kind or category of the action. */
  kind: ActionKind;
  /** Get the latest completed task for this action. */
  latestTask?: Maybe<Task>;
  /** Name of the action. */
  name: Scalars['String']['output'];
  /** The organization that owns this action. */
  organization: Organization;
  /** Check if the current user has pinned this action. */
  pinned: Scalars['Boolean']['output'];
  /** Port groups used in the action for organizing ports. */
  portGroups: Array<PortGroup>;
  /** Protocols associated with the action. */
  protocols: Array<Protocol>;
  /** Whether the action is pure: same args always produce the same result, no side effects — replayable. */
  pure: Scalars['Boolean']['output'];
  /** Output values (ports) returned by the action. */
  returns: Array<ReturnPort>;
  /** Retrieve tasks where this action has run. */
  runs?: Maybe<Array<Task>>;
  /** Scope of the action, e.g., user or system. */
  scope: ActionScope;
  /** Actions whose name and description mean roughly what this one's do, nearest first (cosine distance between embeddings, this action excluded). `filters` narrows the candidates like `actions` does; `maxDistance` (0 identical, 1 unrelated) cuts the tail, otherwise the nearest `limit` come back. Empty while this action has no vector yet or embeddings are off. */
  similarActions: Array<Action>;
  /** Indicates whether the action maintains state. */
  stateful: Scalars['Boolean']['output'];
  /** Tasks created for this action. */
  tasks: Array<Task>;
  /** Test cases for this action. */
  testCases?: Maybe<Array<TestCase>>;
  /** List of tests associated with the action. */
  tests: Array<Action>;
  /** Version string of the action. */
  version: Scalars['String']['output'];
};


/** Represents an executable action in the system. */
export type ActionImplementationsArgs = {
  filters?: InputMaybe<ImplementationFilter>;
  ordering?: Array<ImplementationOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Represents an executable action in the system. */
export type ActionIsTestForArgs = {
  filters?: InputMaybe<ActionFilter>;
  ordering?: Array<ActionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Represents an executable action in the system. */
export type ActionProtocolsArgs = {
  filters?: InputMaybe<ProtocolFilter>;
  ordering?: Array<ProtocolOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Represents an executable action in the system. */
export type ActionSimilarActionsArgs = {
  filters?: InputMaybe<ActionFilter>;
  limit?: Scalars['Int']['input'];
  maxDistance?: InputMaybe<Scalars['Float']['input']>;
};


/** Represents an executable action in the system. */
export type ActionTasksArgs = {
  filters?: InputMaybe<TaskFilter>;
  ordering?: Array<TaskOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Represents an executable action in the system. */
export type ActionTestCasesArgs = {
  filters?: InputMaybe<TestCaseFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Represents an executable action in the system. */
export type ActionTestsArgs = {
  filters?: InputMaybe<ActionFilter>;
  ordering?: Array<ActionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** A JSON-serializable argument entry for a multi-agent action trigger. */
export type ActionArgument = {
  __typename?: 'ActionArgument';
  agentCall?: Maybe<AgentCall>;
  key?: Maybe<Scalars['String']['output']>;
  utilCall?: Maybe<UtilCall>;
  valueDict?: Maybe<Array<ActionArgument>>;
  valueList?: Maybe<Array<ActionArgument>>;
  valueLiteral?: Maybe<Scalars['JSONSerializable']['output']>;
  valuePath?: Maybe<Scalars['String']['output']>;
};

/** A JSON-serializable argument entry for a multi-agent action trigger. */
export type ActionArgumentInput = {
  /** Defines a nested agent call if this argument should trigger an agent interaction. */
  agentCall?: InputMaybe<AgentProbeInput>;
  /** The argument property name. */
  key?: InputMaybe<Scalars['String']['input']>;
  /** Defines a nested utility call if this argument should trigger a system utility interaction. */
  utilCall?: InputMaybe<UtilCallInput>;
  /** Defines a list of key-value pairs if this argument should be a dictionary. */
  valueDict?: InputMaybe<Array<ActionArgumentInput>>;
  /** Defines a list of values if this argument should be an array. */
  valueList?: InputMaybe<Array<ActionArgumentInput>>;
  /** Static literal value if not dynamically bound. */
  valueLiteral?: InputMaybe<Scalars['JSONSerializable']['input']>;
  /** JSON Pointer referencing the shared Blok state to inject into this argument slot dynamically. */
  valuePath?: InputMaybe<Scalars['String']['input']>;
};

/** Pure matching criteria for an action (app/key preferred; matches loosen). */
export type ActionDemand = {
  __typename?: 'ActionDemand';
  /** The identifier of the app providing the action, e.g. 'imagej'. */
  app?: Maybe<Scalars['String']['output']>;
  /** The matches the action's arg ports must satisfy. */
  argMatches?: Maybe<Array<PortMatch>>;
  /** Require that the action has exactly this number of root args. */
  forceArgLength?: Maybe<Scalars['Int']['output']>;
  /** Require that the action has exactly this number of root returns. */
  forceReturnLength?: Maybe<Scalars['Int']['output']>;
  /** The exact hash of the action. When set, matching short-circuits on the hash. */
  hash?: Maybe<Scalars['ActionHash']['output']>;
  /** Require the action to be (or not be) idempotent. */
  idempotent?: Maybe<Scalars['Boolean']['output']>;
  /** The action's key within its app, e.g. 'open_image'. */
  key?: Maybe<Scalars['String']['output']>;
  /** The display name of the action to match. */
  name?: Maybe<Scalars['String']['output']>;
  /** Protocols (by name) the action must implement. */
  protocols?: Maybe<Array<Scalars['String']['output']>>;
  /** Require the action to be (or not be) pure. */
  pure?: Maybe<Scalars['Boolean']['output']>;
  /** The matches the action's return ports must satisfy. */
  returnMatches?: Maybe<Array<PortMatch>>;
  /** Require the action to be (or not be) stateful. */
  stateful?: Maybe<Scalars['Boolean']['output']>;
  /** The exact version of the action. */
  version?: Maybe<Scalars['String']['output']>;
};

/**
 * Pure matching criteria for an action: hash or name short-circuits, arg/return
 *     port matches, protocols and forced port counts. Used directly by query filters and, wrapped
 *     in an ActionDependencyInput, by dependency declarations.
 */
export type ActionDemandInput = {
  /** The identifier of the app providing the action, e.g. 'imagej'. Omit (or drop when loosening) to allow equivalent actions from any app. */
  app?: InputMaybe<Scalars['String']['input']>;
  /** The matches the action's arg ports must satisfy. */
  argMatches?: InputMaybe<Array<PortMatchInput>>;
  /** Require that the action has exactly this number of root args. */
  forceArgLength?: InputMaybe<Scalars['Int']['input']>;
  /** Require that the action has exactly this number of root returns. */
  forceReturnLength?: InputMaybe<Scalars['Int']['input']>;
  /** The exact hash of the action. When set, matching short-circuits on the hash and everything else is ignored. */
  hash?: InputMaybe<Scalars['String']['input']>;
  /** Require the action to be (or not be) idempotent. Omit to match either. */
  idempotent?: InputMaybe<Scalars['Boolean']['input']>;
  /** The action's key within its app, e.g. 'open_image'. Together with `app` this is the preferred identification of the demanded action. */
  key?: InputMaybe<Scalars['String']['input']>;
  /** The display name of the action to match. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** Protocols (by name) the action must implement, e.g. 'predicate'. */
  protocols?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Require the action to be (or not be) pure. Omit to match either. */
  pure?: InputMaybe<Scalars['Boolean']['input']>;
  /** The matches the action's return ports must satisfy. */
  returnMatches?: InputMaybe<Array<PortMatchInput>>;
  /** Require the action to be (or not be) stateful. Omit to match either. */
  stateful?: InputMaybe<Scalars['Boolean']['input']>;
  /** The exact version of the action. */
  version?: InputMaybe<Scalars['String']['input']>;
};

/** A named action requirement of a dependency: a local slot key mapped to the demand the resolved action must satisfy. */
export type ActionDependency = {
  __typename?: 'ActionDependency';
  /** The matching criteria the resolved action must satisfy. */
  demand?: Maybe<ActionDemand>;
  /** A description of the dependency. */
  description?: Maybe<Scalars['String']['output']>;
  /** The local slot key of this action requirement. */
  key: Scalars['String']['output'];
  /** Whether the dependency is optional. */
  optional: Scalars['Boolean']['output'];
};

/**
 * A named action requirement of a dependency: a slot key plus the demand the
 *     resolved action must satisfy, and resolution-lifecycle filters.
 */
export type ActionDependencyInput = {
  /** Allow inactive nodes, defaults to true */
  allowInactive?: InputMaybe<Scalars['Boolean']['input']>;
  /** The matching criteria the resolved action must satisfy (app/key preferred; matches loosen). */
  demand?: InputMaybe<ActionDemandInput>;
  /** The description of the dependency, why it is needed and what it is used for. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The local slot key of this action requirement — callers reference it when assigning. */
  key: Scalars['String']['input'];
  /** Whether the dependency is optional or not. If the dependency is optional, the agent doesn't have to provide it to be potentially callable */
  optional?: Scalars['Boolean']['input'];
};

/** Numeric/aggregatable fields of Action */
export enum ActionField {
  CreatedAt = 'CREATED_AT'
}

export type ActionFilter = {
  AND?: InputMaybe<ActionFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ActionFilter>;
  OR?: InputMaybe<ActionFilter>;
  /** Filter using app identifier */
  appIdentifier?: InputMaybe<Scalars['String']['input']>;
  demands?: InputMaybe<Array<PortDemandInput>>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  inCollection?: InputMaybe<Scalars['String']['input']>;
  kind?: InputMaybe<ActionKind>;
  name?: InputMaybe<StrFilterLookup>;
  objectDemands?: InputMaybe<Array<PortDemandInput>>;
  protocols?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Search by name: a case-insensitive substring, or semantic similarity of the query to the action's name and description. Substring matches rank first, then by similarity; an explicit `ordering` replaces that ranking. */
  search?: InputMaybe<Scalars['String']['input']>;
  stateful?: InputMaybe<Scalars['Boolean']['input']>;
  usedAfter?: InputMaybe<Scalars['DateTime']['input']>;
  usedBefore?: InputMaybe<Scalars['DateTime']['input']>;
};

/** The kind of action. */
export enum ActionKind {
  Function = 'FUNCTION',
  Generator = 'GENERATOR'
}

export type ActionOrder =
  { definedAt: Ordering; usedAt?: never; }
  |  { definedAt?: never; usedAt: Ordering; };

export enum ActionScope {
  BridgeGlobalToLocal = 'BRIDGE_GLOBAL_TO_LOCAL',
  BridgeLocalToGlobal = 'BRIDGE_LOCAL_TO_GLOBAL',
  Global = 'GLOBAL',
  Local = 'LOCAL'
}

export type ActionStats = {
  __typename?: 'ActionStats';
  /** Average */
  avg?: Maybe<Scalars['Float']['output']>;
  /** Total number of items in the selection */
  count: Scalars['Int']['output'];
  /** Number of distinct values for the field */
  distinctCount: Scalars['Int']['output'];
  /** Maximum */
  max?: Maybe<Scalars['Float']['output']>;
  /** Minimum */
  min?: Maybe<Scalars['Float']['output']>;
  /** Time-bucketed stats over a datetime field. */
  series: Array<TimeBucket>;
  /** Sum */
  sum?: Maybe<Scalars['Float']['output']>;
};


export type ActionStatsAvgArgs = {
  field: ActionField;
};


export type ActionStatsDistinctCountArgs = {
  field: ActionField;
};


export type ActionStatsMaxArgs = {
  field: ActionField;
};


export type ActionStatsMinArgs = {
  field: ActionField;
};


export type ActionStatsSeriesArgs = {
  by: Granularity;
  field: ActionField;
  timestampField: ActionTimestampField;
};


export type ActionStatsSumArgs = {
  field: ActionField;
};

/** Datetime fields of Action for bucketing */
export enum ActionTimestampField {
  CreatedAt = 'CREATED_AT'
}

/** Represents a compute agent that can execute implementations. */
export type Agent = {
  __typename?: 'Agent';
  /** Determine if the agent is currently active based on last seen timestamp. */
  active: Scalars['Boolean']['output'];
  /** Blok mappings associated with this agent. */
  agentMappings: Array<BlokAgentMapping>;
  /** The app this agent belongs to. */
  app: App;
  /** Get the count of implementations available on this agent. */
  blocked: Scalars['Boolean']['output'];
  /** The client (app instance) this agent runs as. */
  client: Client;
  /** Is the agent currently connected. */
  connected: Scalars['Boolean']['output'];
  /** What this agent is, in a sentence. Client-declared at registration; null for an agent that never declared one. */
  description?: Maybe<Scalars['String']['output']>;
  /** Device associated with the agent, via its client (if any). */
  device?: Maybe<Device>;
  /** Historical records of agent's hardware. */
  hardwareRecords: Array<HardwareRecord>;
  /** Hash representing the agent's definition for change detection. */
  hash: Scalars['String']['output'];
  /** Webhook URL for this Agent (only if webhook) */
  hookUrl?: Maybe<Scalars['String']['output']>;
  /** Webhook URL secret for this Agent (only if webhook) */
  hookUrlSecret?: Maybe<Scalars['String']['output']>;
  /** Unique ID of the agent. */
  id: Scalars['ID']['output'];
  /** Fetch a specific implementation by interface. */
  implementation?: Maybe<Implementation>;
  /** Implementations the agent can run. */
  implementations: Array<Implementation>;
  /** Kind of the agent. */
  kind: AgentKind;
  /** Last timestamp this agent was seen. */
  lastSeen?: Maybe<Scalars['DateTime']['output']>;
  /** Retrieve the latest hardware record for this agent. */
  latestHardwareRecord?: Maybe<HardwareRecord>;
  /** Agent's associated memory shelve. */
  memoryShelve?: Maybe<MemoryShelve>;
  /** Agent name. */
  name: Scalars['String']['output'];
  /** The organization this agent belongs to. */
  organization: Organization;
  /** Check if this agent is pinned by the current user. */
  pinned: Scalars['Boolean']['output'];
  /** Placements associated with this agent. */
  placements: Array<Placement>;
  /** The release this agent belongs to. */
  release: Release;
  /** Sessions associated with this agent. */
  sessions: Array<Session>;
  /** Current and historical states associated with the agent. */
  states: Array<State>;
  /** Tasks executed by this agent. */
  tasks: Array<Task>;
  /** The user this agent belongs to. */
  user: User;
};


/** Represents a compute agent that can execute implementations. */
export type AgentHardwareRecordsArgs = {
  filters?: InputMaybe<HardwareRecordFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Represents a compute agent that can execute implementations. */
export type AgentImplementationArgs = {
  interface: Scalars['String']['input'];
};


/** Represents a compute agent that can execute implementations. */
export type AgentImplementationsArgs = {
  filters?: InputMaybe<ImplementationFilter>;
  ordering?: Array<ImplementationOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Represents a compute agent that can execute implementations. */
export type AgentPlacementsArgs = {
  filters?: InputMaybe<PlacementFilter>;
  ordering?: Array<PlacementOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Represents a compute agent that can execute implementations. */
export type AgentSessionsArgs = {
  filters?: InputMaybe<SessionFilter>;
  ordering?: Array<SessionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Represents a compute agent that can execute implementations. */
export type AgentTasksArgs = {
  filters?: InputMaybe<TaskFilter>;
  ordering?: Array<TaskOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Defines a callback that routes user interactions directly to an Arkitekt Agent via Rekuest. */
export type AgentCall = {
  __typename?: 'AgentCall';
  arguments?: Maybe<Array<ActionArgument>>;
  dependency: Scalars['String']['output'];
  operation: Scalars['String']['output'];
};

/** Slim, non-traversable snapshot of an agent for change feeds. */
export type AgentChange = {
  __typename?: 'AgentChange';
  app: Scalars['ID']['output'];
  blocked: Scalars['Boolean']['output'];
  client: Scalars['ID']['output'];
  connected: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  kind: AgentKind;
  lastSeen?: Maybe<Scalars['DateTime']['output']>;
  latestEvent: AgentEventKind;
  name: Scalars['String']['output'];
  organization: Scalars['ID']['output'];
  release: Scalars['ID']['output'];
  user: Scalars['ID']['output'];
};

export type AgentChangeEvent = {
  __typename?: 'AgentChangeEvent';
  create?: Maybe<AgentChange>;
  delete?: Maybe<Scalars['ID']['output']>;
  update?: Maybe<AgentChange>;
};

/**
 * A dependency for a implementation. By defining dependencies, you can
 *     create a dependency graph for your implementations and actions
 */
export type AgentDependencyInput = {
  /** The named action requirements of the agent — each a slot key plus the demand the resolved action must satisfy. */
  actionDependencies?: InputMaybe<Array<ActionDependencyInput>>;
  /** Which app this dependency corresponds to (i.e. do you want to use a stardist agent for that or imagej agents needs to be a world unique classsifier (reverse domain notation) that identifies the type of agent you want to use, and then we can have multiple agents of the same type running in the system, e.g. startdist could be the app for all agents that correpsond to a startdist instance) */
  app?: InputMaybe<Scalars['String']['input']>;
  /** The policy used to pick which instance of the agent to assign to. */
  assignPolicy?: AssignPolicy;
  /** Whether this dependency is auto resolvable or not. If so we will try to automatically resolve it based on the demands specified in the dependency and the capabilities of the available agents in the system. This is used to identify the demand in the system. Attention if any of the dependencies of this agent dependency is not auto resolvable, this dependency will also not be auto resolvable */
  autoResolvable?: Scalars['Boolean']['input'];
  /** A description of the dependency, why it is needed and what it is used for. This can be used to provide more context to users when assigning dependencies. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The key of this dependency, when assigning you can reference this key to specify which agent_dependency you are assigning to. */
  key: Scalars['String']['input'];
  /** The maximum amount of viable instances for the agent. This is used to identify the demand in the system. */
  maxViableInstances?: InputMaybe<Scalars['Int']['input']>;
  /** The minimum amount of viable instances for the agent. This is used to identify the demand in the system. */
  minViableInstances?: InputMaybe<Scalars['Int']['input']>;
  /** A list of keys of other agent dependencies that are mutually exclusive with this one. This means two agent dependencies with mutually exclusive keys cannot be assigned to the same implementing agent. This is used to identify the demand in the system. */
  mutuallyExclusiveKeys?: InputMaybe<Array<Scalars['String']['input']>>;
  /** The name of the agent. This is used to identify the agent in the system. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** Whether the dependency is optional or not. If the dependency is optional, users can choose to not provide it */
  optional?: Scalars['Boolean']['input'];
  /** The prefered amount of instances for the agent. This is used to identify the demand in the system. */
  preferedInstances?: InputMaybe<Scalars['Int']['input']>;
  /** The named state requirements of the agent — each a slot key plus the demand the agent's state must satisfy. */
  stateDependencies?: InputMaybe<Array<StateDependencyInput>>;
  /** The version of the app this dependency corresponds to. */
  version?: InputMaybe<Scalars['String']['input']>;
};

/** The event kind of the agentevent */
export enum AgentEventKind {
  Connect = 'CONNECT',
  Disconnect = 'DISCONNECT'
}

/** A way to filter agents */
export type AgentFilter = {
  AND?: InputMaybe<AgentFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<AgentFilter>;
  OR?: InputMaybe<AgentFilter>;
  actionDemands?: InputMaybe<Array<ActionDemandInput>>;
  /** Filter using app identifier */
  appIdentifier?: InputMaybe<Scalars['ID']['input']>;
  blokDependency?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by client ID of the app the agent is registered to */
  clientId?: InputMaybe<Scalars['String']['input']>;
  dependency?: InputMaybe<Scalars['ID']['input']>;
  /** Filter based on device */
  deviceId?: InputMaybe<Scalars['ID']['input']>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
  /** Filter by implementations of the agents */
  hasImplementations?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Filter by states of the agents */
  hasStates?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Filter by IDs of the agents */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Filter by pinned agents */
  pinned?: InputMaybe<Scalars['Boolean']['input']>;
  /** Filter by name of the agents */
  search?: InputMaybe<Scalars['String']['input']>;
  stateDemands?: InputMaybe<Array<StateDemandInput>>;
  threeDModel?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by user ID */
  user?: InputMaybe<Scalars['ID']['input']>;
  /** Filter based on version string */
  versionNumber?: InputMaybe<Scalars['String']['input']>;
};

export type AgentInput = {
  /** What this agent is, in a sentence. Omitting it leaves whatever the agent already has: a name is what identifies it, a description is what tells two of them apart. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** For a WEBHOOK agent: the URL the backend POSTs messages (Assign, Cancel, Caller* events) to. */
  hookUrl?: InputMaybe<Scalars['String']['input']>;
  /** For a WEBHOOK agent: the shared secret used to HMAC-sign messages in both directions (outbound delivery and POST intake). */
  hookUrlSecret?: InputMaybe<Scalars['String']['input']>;
  /** The transport kind of the agent: WEBSOCKET (default) or WEBHOOK (a HookAgent the backend POSTs to). */
  kind?: InputMaybe<AgentKind>;
  /** The name of the agent. This is used to identify the agent in the system. */
  name?: InputMaybe<Scalars['String']['input']>;
};

export enum AgentKind {
  Webhook = 'WEBHOOK',
  Websocket = 'WEBSOCKET'
}

export type AgentMapping = {
  __typename?: 'AgentMapping';
  /** Get the agent's name from the mapping. */
  agent: Agent;
  /** Get the agent's ID from the mapping. */
  agentId: Scalars['String']['output'];
  /** Get a specific argument by key. */
  mappedImplementations: Array<ImplementationMapping>;
};

export type AgentOrder =
  { lastSeen: Ordering; };

/** Defines a callback that routes user interactions directly to an Arkitekt Agent via Rekuest. */
export type AgentProbeInput = {
  /** Key-value arguments map compiled for the target agent call. */
  arguments?: InputMaybe<Array<ActionArgumentInput>>;
  /** The abstract agent dependency key declared in the Blok manifest (e.g., 'stage_dep'). */
  dependency: Scalars['String']['input'];
  /** The target function name registered on that specific agent's worker thread loop. */
  operation: Scalars['String']['input'];
};

/** A plain snapshot of a state's current value. */
export type AgentSnapshotEvent = {
  __typename?: 'AgentSnapshotEvent';
  agentId: Scalars['ID']['output'];
  globalRevision: Scalars['Int']['output'];
  sessionId: Scalars['String']['output'];
  timestamp: Scalars['DateTime']['output'];
  values: Scalars['Args']['output'];
};

export type AgentSnapshotEventStatePatchEvent = AgentSnapshotEvent | StatePatchEvent;

export type AgentTaskUpdate = {
  __typename?: 'AgentTaskUpdate';
  create?: Maybe<TaskChange>;
  update?: Maybe<TaskChange>;
};

export type AgentWithValues = {
  __typename?: 'AgentWithValues';
  /** The ID of the agent this state belongs to */
  agentId: Scalars['ID']['output'];
  /** The patches to move backward */
  backwardPatches: Array<Patch>;
  /** The patches to move forward */
  forwardPatches: Array<Patch>;
  /** The maximum global revision across these states */
  globalRevision: Scalars['Int']['output'];
  /** The state value, indexed by state_interface */
  values: Scalars['JSON']['output'];
};

/** Profile information for a user. */
export type App = {
  __typename?: 'App';
  /** Unique ID of the app. */
  id: Scalars['ID']['output'];
  /** Name of the app. */
  identifier: Scalars['String']['output'];
};

export type ArgPort = {
  __typename?: 'ArgPort';
  children?: Maybe<Array<ArgPort>>;
  choices?: Maybe<Array<Choice>>;
  default?: Maybe<Scalars['AnyDefault']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  dimension?: Maybe<Scalars['String']['output']>;
  effects?: Maybe<Array<Effect>>;
  identifier?: Maybe<Scalars['Identifier']['output']>;
  key: Scalars['String']['output'];
  kind: PortKind;
  label?: Maybe<Scalars['String']['output']>;
  nullable: Scalars['Boolean']['output'];
  proposedUnits?: Maybe<Array<Scalars['String']['output']>>;
  referenceUnit?: Maybe<Scalars['String']['output']>;
  requires?: Maybe<Array<Requires>>;
  validators?: Maybe<Array<Validator>>;
  widget?: Maybe<AssignWidget>;
};

/**
 * A Port is a single input or output of an action, identified by its `key` and typed by its `kind`.
 *
 *     STRUCTURE, MEMORY_STRUCTURE and INTERFACE ports carry an `identifier` of the form `@package/key`
 *     (e.g. `@mikro/image`); ports with the same identifier are compatible. LIST and DICT ports have one
 *     child (the item type), UNION ports two or more (the variants), MODEL ports one per field. ENUM ports
 *     declare `choices`. See docs/design/ports.md for the full table.
 *
 */
export type ArgPortInput = {
  /** The child ports (used for list, dict, union and model ports). */
  children?: InputMaybe<Array<ArgPortInput>>;
  /** The values the port accepts (required for ENUM; optional for INT, FLOAT, STRING). Rendered by CHOICE widgets. */
  choices?: InputMaybe<Array<ChoiceInput>>;
  /** The default value for the port; must fit the port's kind. */
  default?: InputMaybe<Scalars['AnyDefault']['input']>;
  /** The description of the port. This is the text that is displayed in the UI when the user hovers over the port */
  description?: InputMaybe<Scalars['String']['input']>;
  /** For QUANTITY ports: the pint dimensionality string, e.g. "[mass] * [length] ** 2 / [time] ** 3 / [current]". This is the wiring-compatibility key between quantity ports. */
  dimension?: InputMaybe<Scalars['String']['input']>;
  /** The effects of the port */
  effects?: InputMaybe<Array<EffectInput>>;
  /** The identifier of the port's type, of the form @package/key. Required for STRUCTURE, MEMORY_STRUCTURE and INTERFACE, where it is the only identity a value has; optional for MODEL and ENUM, where it names the class or enum the port was built from so that agents can map a value back to it. */
  identifier?: InputMaybe<Scalars['String']['input']>;
  /** The key of the port: unique among its siblings, free of '..', not 'value'. LIST/DICT item ports are conventionally keyed '...'. */
  key: Scalars['String']['input'];
  /** The kind of the port. This is the type of the port. Can be either int, string, structure, list, bool, dict, float, date, union or model */
  kind: PortKind;
  /** The label of the port. This is the text that is displayed in the UI */
  label?: InputMaybe<Scalars['String']['input']>;
  /** Whether the port is nullable or not. If the port is nullable, it can be set to null. If the port is not nullable, it cannot be set to null */
  nullable?: Scalars['Boolean']['input'];
  /** For QUANTITY ports: units offered as a dropdown in the UI, e.g. ["pF", "nF", "uF"]. Proposals only — any unit of the same dimension remains valid input. */
  proposedUnits?: InputMaybe<Array<Scalars['String']['input']>>;
  /** For QUANTITY ports: the canonical/reference unit of the physical quantity, e.g. "volt" or "farad". It is the default selection and the key used to resolve the concrete quantity type; other units of the same dimension are still allowed. */
  referenceUnit?: InputMaybe<Scalars['String']['input']>;
  /** The descriptors for the port. Descriptors are key-value pairs that can be used to add additional metadata to a port. When using rekuest's action search, you can filter actions based on their port descriptors */
  requires?: InputMaybe<Array<RequiresInput>>;
  /** The validators for the port */
  validators?: InputMaybe<Array<ValidatorInput>>;
  /** The assign widget to use for this port, discriminated by `kind`. */
  widget?: InputMaybe<AssignWidgetInput>;
};

/** The input for assigning args to a action. A GraphQL assign is a ROOT by definition — children are created only over the agent socket (AssignRequest, where parent is mandatory) and by server-internal paths like init hooks, so parent/dependency/method are deliberately absent here. */
export type AssignInput = {
  /** The action ID to assign to */
  action?: InputMaybe<Scalars['ID']['input']>;
  /** The hash of the action. This is used to identify the action in the system. */
  actionHash?: InputMaybe<Scalars['ActionHash']['input']>;
  /** The agent ID to assign to when directly assingint to a implementation */
  agent?: InputMaybe<Scalars['ID']['input']>;
  /** The args of the task. Its a dictionary of ports and values */
  args: Scalars['Args']['input'];
  /** Whether to capture the task. */
  capture: Scalars['Boolean']['input'];
  /** The dependencies of the task. This maps dependency keys to implementation IDs. */
  dependencies?: InputMaybe<Array<ResolvedDependencyInput>>;
  /** The hooks of the task. This is used to identify the task in the system. */
  hooks?: InputMaybe<Array<HookInput>>;
  /** The implementation ID to assign to when directly assingint to a implementation */
  implementation?: InputMaybe<Scalars['ID']['input']>;
  /** The interface of the implementation. Only ussable if you also set agent */
  interface?: InputMaybe<Scalars['String']['input']>;
  /** Hold the task back until then: it is persisted now but only dispatched once due. A time in the past (or none) dispatches immediately. */
  notBefore?: InputMaybe<Scalars['DateTime']['input']>;
  /** The reference of the task. This is used to identify the task in the system. */
  reference?: InputMaybe<Scalars['String']['input']>;
  /** The resolution ID to assign to when assining to a implementation with dependencies */
  resolution?: InputMaybe<Scalars['ID']['input']>;
  /** Whether the task should step. Ie. go to the next breakpoint */
  step?: InputMaybe<Scalars['Boolean']['input']>;
};

export enum AssignPolicy {
  Automatic = 'AUTOMATIC',
  Balanced = 'BALANCED',
  FastestResponse = 'FASTEST_RESPONSE',
  LeastBusy = 'LEAST_BUSY',
  RoundRobin = 'ROUND_ROBIN'
}

export type AssignWidget = {
  followValue?: Maybe<Scalars['String']['output']>;
  kind: AssignWidgetKind;
};

/** An assign widget: the UI element used to assign a value to a port, as a discriminated union over `kind`. Only the fields of the chosen kind may be set; see the `*AssignWidgetInput` members. */
export type AssignWidgetInput = {
  /** (STRING) Render as a multi-line paragraph. */
  asParagraph?: InputMaybe<Scalars['Boolean']['input']>;
  /** (CUSTOM) The catalog component to render. The port value is in scope as the reserved root `value`. */
  component?: InputMaybe<Scalars['String']['input']>;
  /** (SEARCH, CUSTOM, STATE_CHOICE) The other ports (port paths, `..` traverses children) whose values the query may reference. */
  dependencies?: InputMaybe<Array<Scalars['String']['input']>>;
  /** (STATE_CHOICE) The agent dependency (by key) whose state provides the choices; omitted: the implementing agent's own state. */
  dependency?: InputMaybe<Scalars['String']['input']>;
  /** (CUSTOM) Widget to render when the UI has no such component in its catalog. */
  fallback?: InputMaybe<AssignWidgetInput>;
  /** (SEARCH) Filter ports whose values are passed to the query as variables named by their keys. */
  filters?: InputMaybe<Array<ArgPortInput>>;
  /** (SLIDER, CHOICE, STRING, SEARCH, CUSTOM, STATE_CHOICE, PROXY) Port path of another port whose value this widget follows and mirrors. */
  followValue?: InputMaybe<Scalars['String']['input']>;
  /** Which kind of assign widget this is; decides which other fields are read. */
  kind: AssignWidgetKind;
  /** (SLIDER) The maximum value. */
  max?: InputMaybe<Scalars['Float']['input']>;
  /** (SLIDER) The minimum value. */
  min?: InputMaybe<Scalars['Float']['input']>;
  /** (CHOICE, STRING, SEARCH) The placeholder text shown before a choice is made. The choices themselves are the port's `choices`. */
  placeholder?: InputMaybe<Scalars['String']['input']>;
  /** (CUSTOM) Props of the component. value_paths may only reference `value` and `dependencies`; agent calls are not allowed. */
  props?: InputMaybe<Array<ComponentPropInput>>;
  /** (SEARCH) The GraphQL query the ward executes to populate the choices. Must be a single `query` operation declaring `$search: String` and `$values: [ID!]`, plus one variable per filter port key. */
  query?: InputMaybe<Scalars['SearchQuery']['input']>;
  /** (STATE_CHOICE) How to read label/description/logo/value out of each state entry; each accessor is a static pointer or a pure call. */
  stateAccessors?: InputMaybe<Array<StateAccessorInput>>;
  /** (STATE_CHOICE) Pure UtilCall returning that pointer dynamically; may reference `state`, `value` and `dependencies`. Mutually exclusive with `state_path`. */
  stateCall?: InputMaybe<UtilCallInput>;
  /** (STATE_CHOICE) Static JSON pointer into the state value that provides the choices. Mutually exclusive with `state_call`. */
  statePath?: InputMaybe<Scalars['String']['input']>;
  /** (SLIDER) The step between selectable values; must be positive. */
  step?: InputMaybe<Scalars['Float']['input']>;
  /** (PROXY) The action to target: an action-dependency key of `target_dependency` when that is set. */
  targetAction?: InputMaybe<Scalars['String']['input']>;
  /** (PROXY) The agent dependency (by key) that provides the targeted action; omitted: the implementing agent itself. */
  targetDependency?: InputMaybe<Scalars['String']['input']>;
  /** (PROXY) The port key on the targeted action. */
  targetPort?: InputMaybe<Scalars['String']['input']>;
  /** (SEARCH) The ward (service) that executes the query. */
  ward?: InputMaybe<Scalars['String']['input']>;
};

/** The kind of assign widget. */
export enum AssignWidgetKind {
  Choice = 'CHOICE',
  Custom = 'CUSTOM',
  Proxy = 'PROXY',
  Search = 'SEARCH',
  Slider = 'SLIDER',
  StateChoice = 'STATE_CHOICE',
  String = 'STRING'
}

export type AutoResolveInput = {
  implementation: Scalars['ID']['input'];
};

/** The built-in base catalog: the pure operations every UI implements, applied to every definition and blok before any registered UI catalog. Virtual: shipped with the server, not registered, identical in every organization. */
export type BaseCatalog = {
  __typename?: 'BaseCatalog';
  /** What the base catalog is for. */
  description?: Maybe<Scalars['String']['output']>;
  /** Always 'base'. */
  name: Scalars['String']['output'];
  /** The base operations, argument order being positional order. */
  operations: Array<CatalogOperation>;
  /** Manifest version; evolves additively. */
  version: Scalars['Int']['output'];
};

/** The input for bouncing an agent. */
export type BlockInput = {
  /** The agent ID to bounce. */
  agent: Scalars['ID']['input'];
  /** The reason for kicking the agent. */
  reason?: InputMaybe<Scalars['String']['input']>;
};

export type Blok = {
  __typename?: 'Blok';
  catalog: UiCatalog;
  /** The typed component tree of this blok. */
  components: Array<ComponentNode>;
  creator: User;
  /** Demo state used to render a preview of this blok without agents. */
  demoState: Scalars['Props']['output'];
  /** Dependencies that need to be resolved for this blok. */
  dependencies: Array<BlokDependency>;
  description?: Maybe<Scalars['String']['output']>;
  /** Non-fatal registration findings, e.g. manifest util calls naming operations that neither the base catalog nor this blok's catalog provides. */
  diagnostics: Array<Diagnostic>;
  id: Scalars['ID']['output'];
  /** Materialized bloks that are instances of this blok. */
  materializedBloks: Array<MaterializedBlok>;
  name: Scalars['String']['output'];
};


export type BlokDependenciesArgs = {
  filters?: InputMaybe<BlokDependencyFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type BlokMaterializedBloksArgs = {
  filters?: InputMaybe<MaterializedBlokFilter>;
  ordering?: Array<MaterializedBlokOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type BlokAgentMapping = {
  __typename?: 'BlokAgentMapping';
  agent: Agent;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  materializedBlok: MaterializedBlok;
  updatedAt: Scalars['DateTime']['output'];
};

/** The input for updating a blok. */
export type BlokAgentMappingInput = {
  agent: Scalars['ID']['input'];
  key: Scalars['String']['input'];
};

/** An agent dependency declared by a blok. */
export type BlokDependency = {
  __typename?: 'BlokDependency';
  /** The named action requirements of this dependency. */
  actionDependencies: Array<ActionDependency>;
  /** Optional filter string to limit which agents can be bound to this dependency based on the app they belong to. The filter string should be in the format 'app_identifier:version' where version can be a specific version or a wildcard '*'. For example, 'my_app:*' would allow any agent belonging to 'my_app' regardless of version, while 'my_app:1.0.0' would only allow agents with that specific version. */
  appFilter?: Maybe<Scalars['String']['output']>;
  /** Whether this dependency is auto resolvable or not. If so we will try to automatically resolve it based on the demands specified in the dependency and the capabilities of the available agents in the system. This is used to identify the demand in the system. Attention if any of the dependencies of this agent dependency is not auto resolvable, this dependency will also not be auto resolvable */
  autoResolvable: Scalars['Boolean']['output'];
  /** The blok that declares this dependency. */
  blok: Blok;
  /** Optional description of the dependency. */
  description?: Maybe<Scalars['String']['output']>;
  /** Unique ID of the dependency. */
  id: Scalars['ID']['output'];
  /** Optional string identifier or tag for reference. */
  key: Scalars['String']['output'];
  /** Maximum number of viable agent instances that can be bound to this dependency. This is used in combination with the auto_resolvable field to determine if a dependency can be automatically resolved. If the number of available agent instances that match the filters is greater than this number, the dependency will not be considered auto resolvable. */
  maxViableInstances?: Maybe<Scalars['Int']['output']>;
  /** Minimum number of viable agent instances required to resolve this dependency. This is used in combination with the auto_resolvable field to determine if a dependency can be automatically resolved. If the number of available agent instances that match the filters is less than this number, the dependency will not be considered auto resolvable. */
  minViableInstances?: Maybe<Scalars['Int']['output']>;
  /** Indicates if the dependency is optional. */
  optional: Scalars['Boolean']['output'];
  /** List of action demands specified in this dependency. */
  singular: Scalars['Boolean']['output'];
  /** The named state requirements of this dependency. */
  stateDependencies: Array<StateDependency>;
  /** Optional filter string to limit which agents can be bound to this dependency based on the version of the app they belong to. The filter string should be in the format 'version' where version can be a specific version or a wildcard '*'. For example, '*' would allow any version, while '1.0.0' would only allow agents with that specific version. */
  versionFilter?: Maybe<Scalars['String']['output']>;
};

export type BlokDependencyFilter = {
  AND?: InputMaybe<BlokDependencyFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<BlokDependencyFilter>;
  OR?: InputMaybe<BlokDependencyFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
};

/** Which locks does the agent provide in general */
export type BlokImplementationInput = {
  /** The optional catalog name if this Blok should be registered inside a specific namespace in your Electron app's UI component registry. */
  catalog?: InputMaybe<Scalars['String']['input']>;
  /** The UI component tree blueprint for this Blok. */
  components: Array<ComponentNodeInput>;
  /** An optional JSON-serializable object providing demo state values for this Blok's internal reactive data model, useful for testing and development purposes. */
  demoState?: InputMaybe<Scalars['JSONSerializable']['input']>;
  /** The dependencies required by this Blok. */
  dependencies?: Array<AgentDependencyInput>;
  /** A human-readable description about this Blok's purpose and functionality. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The key of this Blok implementation. */
  key: Scalars['String']['input'];
};

/** The input for bouncing an agent. */
export type BounceInput = {
  /** The agent ID to bounce. */
  agent: Scalars['ID']['input'];
};

/** The (client, user, organization) identity that requests work. */
export type Caller = {
  __typename?: 'Caller';
  /** The associated client. */
  client: Client;
  /** Unique identifier for the caller. */
  id: Scalars['ID']['output'];
  /** The organization this caller belongs to. */
  organization: Organization;
  /** The associated user. */
  user: User;
};

/** The input for canceling a task. */
export type CancelInput = {
  /** The task ID to cancel */
  task: Scalars['ID']['input'];
};

/** The input for cancelling a probe. Idempotent: cancelling a finished probe is a no-op. */
export type CancelProbeInput = {
  /** The probe ID to cancel */
  probe: Scalars['ID']['input'];
};

/** An argument a catalog operation accepts. */
export type CatalogArgument = {
  __typename?: 'CatalogArgument';
  description?: Maybe<Scalars['String']['output']>;
  key: Scalars['String']['output'];
  kind: CatalogValueKind;
  required: Scalars['Boolean']['output'];
};

/** An argument a catalog operation accepts. */
export type CatalogArgumentInput = {
  /** Human-readable description of the argument. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The argument key a UtilCall argument must use. */
  key: Scalars['String']['input'];
  /** The value kind of the argument. */
  kind: CatalogValueKind;
  /** Whether every call must pass this argument. */
  required?: Scalars['Boolean']['input'];
};

/** A component a UI catalog can render. */
export type CatalogComponent = {
  __typename?: 'CatalogComponent';
  acceptsChildren: Scalars['Boolean']['output'];
  description?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  props: Array<CatalogProp>;
};

/** A component a UI catalog can render. */
export type CatalogComponentInput = {
  /** Whether ComponentNode.children may be nested under this component. */
  acceptsChildren?: Scalars['Boolean']['input'];
  /** Human-readable description of the component. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The component name a ComponentNode.component (or a custom widget's component) must match. */
  name: Scalars['String']['input'];
  /** The props this component accepts. */
  props?: Array<CatalogPropInput>;
};

/** A pure operation a UI catalog can evaluate for UtilCalls. */
export type CatalogOperation = {
  __typename?: 'CatalogOperation';
  arguments: Array<CatalogArgument>;
  description?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  returns: CatalogValueKind;
};

/** A pure operation a UI catalog can evaluate for UtilCalls. */
export type CatalogOperationInput = {
  /** The arguments the operation accepts. */
  arguments?: Array<CatalogArgumentInput>;
  /** Human-readable description of the operation. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The operation name a UtilCall.operation must match. */
  name: Scalars['String']['input'];
  /** The kind of value the operation returns (BOOL for effect and validator calls). */
  returns: CatalogValueKind;
};

/** A prop a catalog component accepts. */
export type CatalogProp = {
  __typename?: 'CatalogProp';
  description?: Maybe<Scalars['String']['output']>;
  key: Scalars['String']['output'];
  kind: CatalogValueKind;
  required: Scalars['Boolean']['output'];
};

/** A prop a catalog component accepts. */
export type CatalogPropInput = {
  /** Human-readable description of the prop. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The prop key a ComponentProp.key must match. */
  key: Scalars['String']['input'];
  /** The value kind this prop accepts. CALLBACK props must be bound via agent_call or util_call. */
  kind: CatalogValueKind;
  /** Whether every component instance must set this prop. */
  required?: Scalars['Boolean']['input'];
};

/** The kind of value a catalog component prop accepts or a catalog operation argument/return carries. */
export enum CatalogValueKind {
  Any = 'ANY',
  Bool = 'BOOL',
  Callback = 'CALLBACK',
  Dict = 'DICT',
  Float = 'FLOAT',
  Int = 'INT',
  List = 'LIST',
  String = 'STRING'
}

export type ChildTaskEvent = {
  __typename?: 'ChildTaskEvent';
  create?: Maybe<TaskChange>;
  update?: Maybe<TaskChange>;
};

export type Choice = {
  __typename?: 'Choice';
  description?: Maybe<Scalars['String']['output']>;
  image?: Maybe<Scalars['String']['output']>;
  label: Scalars['String']['output'];
  value: Scalars['AnyDefault']['output'];
};

/** A dropdown over the port's own `choices`. */
export type ChoiceAssignWidget = AssignWidget & {
  __typename?: 'ChoiceAssignWidget';
  followValue?: Maybe<Scalars['String']['output']>;
  kind: AssignWidgetKind;
  placeholder?: Maybe<Scalars['String']['output']>;
};

/** A dropdown over the port's `choices`. */
export type ChoiceAssignWidgetInput = {
  /** Port path of another port whose value this widget follows and mirrors. */
  followValue?: InputMaybe<Scalars['String']['input']>;
  /** Which member of AssignWidgetInput this is. */
  kind: AssignWidgetKind;
  /** The placeholder text shown before a choice is made. The choices themselves are the port's `choices`. */
  placeholder?: InputMaybe<Scalars['String']['input']>;
};

/**
 *
 * A choice is a value that can be selected in a dropdown.
 *
 * It is composed of a value, a label, and a description. The value is the
 * value that is returned when the choice is selected. The label is the
 * text that is displayed in the dropdown. The description is the text
 * that is displayed when the user hovers over the choice.
 *
 *
 */
export type ChoiceInput = {
  /** The description of the choice. This is the text that is displayed in the UI when the user hovers over the choice */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The image of the choice. This is the image that is displayed in the UI (must be a URL) */
  image?: InputMaybe<Scalars['String']['input']>;
  /** The label of the choice. This is the text that is displayed in the UI */
  label: Scalars['String']['input'];
  /** The value of the choice (any JSON value); must fit the port's kind. This is the value that is returned when the choice is selected */
  value: Scalars['AnyDefault']['input'];
};

/** Displays the label of the port's own `choices` for a returned value. */
export type ChoiceReturnWidget = ReturnWidget & {
  __typename?: 'ChoiceReturnWidget';
  kind: ReturnWidgetKind;
};

/** Displays the port's `choices` label for a returned value. */
export type ChoiceReturnWidgetInput = {
  /** Which member of ReturnWidgetInput this is. Displays the port's `choices`. */
  kind: ReturnWidgetKind;
};

/** Represents a registered OAuth2 client. */
export type Client = {
  __typename?: 'Client';
  /** OAuth2 client ID. */
  clientId: Scalars['String']['output'];
  /** Device associated with the client. */
  device?: Maybe<Device>;
  /** Unique ID of the client. */
  id: Scalars['ID']['output'];
  /** Release associated with the client. */
  release?: Maybe<Release>;
};

/** A way to filter apps */
export type ClientFilter = {
  AND?: InputMaybe<ClientFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ClientFilter>;
  OR?: InputMaybe<ClientFilter>;
  hasImplementationsFor?: InputMaybe<Array<Scalars['ActionHash']['input']>>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  interface?: InputMaybe<StrFilterLookup>;
  mine?: InputMaybe<Scalars['Boolean']['input']>;
};

/** A way to order apps */
export type ClientOrder =
  { definedAt: Ordering; };

/** The input for collecting a shelved item in a drawer. */
export type CollectInput = {
  /** The drawers to collect: each an ID or a resource ID (as agent-minted drawers are referenced), within the caller's organization */
  drawers: Array<Scalars['ID']['input']>;
};

/** A grouping of actions. */
export type Collection = {
  __typename?: 'Collection';
  /** Actions included in this collection. */
  actions: Array<Action>;
  /** Collection ID. */
  id: Scalars['ID']['output'];
  /** Name of the collection. */
  name: Scalars['String']['output'];
};


/** A grouping of actions. */
export type CollectionActionsArgs = {
  filters?: InputMaybe<ActionFilter>;
  ordering?: Array<ActionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** An abstract structural visual element inside a Blok blueprint manifest. */
export type ComponentNode = {
  __typename?: 'ComponentNode';
  children?: Maybe<Array<ComponentNode>>;
  component: Scalars['String']['output'];
  id: Scalars['String']['output'];
  props?: Maybe<Array<ComponentProp>>;
};

/** An abstract structural visual element inside a Blok blueprint manifest. */
export type ComponentNodeInput = {
  /** Flat adjacency pointer list mapping out IDs nested inside this specific component layer. */
  children?: InputMaybe<Array<ComponentNodeInput>>;
  /** The type indicator token matching your Electron app's registered catalog specs (e.g. 'Slider'). */
  component: Scalars['String']['input'];
  /** Unique structural string identifying this node instance inside the flat workspace layout tree. */
  id: Scalars['String']['input'];
  /** The collection of static values, state pointers, or action endpoints assigned to this component. */
  props?: InputMaybe<Array<ComponentPropInput>>;
};

/** A single key-value prop configuration for a component layout node. */
export type ComponentProp = {
  __typename?: 'ComponentProp';
  agentCall?: Maybe<AgentCall>;
  declaresValue?: Maybe<Scalars['String']['output']>;
  dynamicValue?: Maybe<DynamicValue>;
  key: Scalars['String']['output'];
  staticValue?: Maybe<Scalars['JSONSerializable']['output']>;
  utilCall?: Maybe<UtilCall>;
};

/** A single key-value prop configuration for a component layout node. */
export type ComponentPropInput = {
  /** Defines an imperative interactive network action callback loop if this prop should trigger an agent interaction. */
  agentCall?: InputMaybe<AgentProbeInput>;
  /** If set, this prop declares a new 'value' in the Blok state that can be referenced by other props or actions. The value of this field should be the name of the declared value (e.g., 'selected_user'). */
  declaresValue?: InputMaybe<Scalars['String']['input']>;
  /** A reactive state data-binding rule. */
  dynamicValue?: InputMaybe<DynamicValueInput>;
  /** The prop key name matching the target UI catalog constraint. */
  key: Scalars['String']['input'];
  /** A raw scalar or JSON-stringified literal configuration parameter (e.g. '40x' or True). */
  staticValue?: InputMaybe<Scalars['JSONSerializable']['input']>;
  /** Defines an imperative interactive network action callback loop if this prop should trigger a system utility interaction. */
  utilCall?: InputMaybe<UtilCallInput>;
};

/** The input for creating a blok. */
export type CreateBlokInput = {
  /** The universal id */
  catalog?: InputMaybe<Scalars['String']['input']>;
  /** The schema of the blok. This can be used to validate the blok input and output. */
  components?: InputMaybe<Array<ComponentNodeInput>>;
  /** The initial state of the blok. This is used to set the initial state of the blok when it is materialized. */
  demoState?: InputMaybe<Scalars['Args']['input']>;
  /** The dependencies of the blok. This is used to identify the blok in the system. */
  dependencies?: InputMaybe<Array<AgentDependencyInput>>;
  /** The description of the blok. This can described the blok and its purpose. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The name of the Blok, used for identification in the system. */
  name: Scalars['String']['input'];
};

/** Input for creating a dashboard, optionally specifying its name and the bloks to include. It is owned by the caller's organization. */
export type CreateDashboardInput = {
  /** The list of blok IDs to include in the dashboard. */
  bloks?: Array<Scalars['String']['input']>;
  /** The name of the dashboard. */
  name: Scalars['String']['input'];
};

/** The input for creating a implementation. */
export type CreateImplementationInput = {
  /** The implementation to create. This is used to identify the implementation in the system. */
  implementation: ImplementationInput;
};

/** The input for creating a placement. */
export type CreatePlacementInput = {
  /** The affine matrix for the placement. This is used to identify the placement in the system. */
  affineMatrix?: InputMaybe<Array<Array<Scalars['Float']['input']>>>;
  /** The agent ID for the placement. This is used to identify the agent in the system. */
  agent?: InputMaybe<Scalars['ID']['input']>;
  /** A specific blok that should be used to visualize the state of the placement. */
  materializedBlok?: InputMaybe<Scalars['ID']['input']>;
  /** The 3D model ID for the placement. This is used to identify the 3D model in the system. */
  model?: InputMaybe<Scalars['ID']['input']>;
  /** The role of the placement. This is used to identify the placement in the system. */
  role?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the space to create the placement in. */
  space: Scalars['String']['input'];
};

/** The input for creating a resolution. */
export type CreateResolutionInput = {
  /** The implementation ID of the resolution. This is used to identify the resolution in the system. */
  implementation: Scalars['ID']['input'];
  /** The key of the resolution. This is used to identify the resolution in the system. */
  key: Scalars['String']['input'];
  /** The name of the resolution. This is used to identify the resolution in the system. */
  name: Scalars['String']['input'];
  /** The resolved dependencies of the resolution. This is used to identify the resolution in the system. */
  resolvedDependencies?: InputMaybe<Array<ResolvedDependencyInput>>;
};

/** Create a schedule. Give exactly one of intervalSeconds or cron; pin an agent with agent + interface, or leave both empty to resolve one per run. */
export type CreateScheduleInput = {
  action: Scalars['ID']['input'];
  agent?: InputMaybe<Scalars['ID']['input']>;
  args?: InputMaybe<Scalars['Args']['input']>;
  cron?: InputMaybe<Scalars['String']['input']>;
  enabled?: Scalars['Boolean']['input'];
  ephemeralRuns?: Scalars['Boolean']['input'];
  interface?: InputMaybe<Scalars['String']['input']>;
  intervalSeconds?: InputMaybe<Scalars['Int']['input']>;
  name: Scalars['String']['input'];
  timezone?: Scalars['String']['input'];
};

/** The input for creating a shortcut. */
export type CreateShortcutInput = {
  /** The action ID to create a shortcut for */
  action: Scalars['ID']['input'];
  /** Whether to allow quick shortcuts. Quick shorts are shortcuts that can be autorun without scpeific assignment */
  allowQuick?: Scalars['Boolean']['input'];
  /** The arguments to pre-pass to the shortcut. This is used to identify the shortcut in the system. */
  args: Scalars['Args']['input'];
  /** The bind number of the shortcut. This is used to identify the shortcut in the system. */
  bindNumber?: InputMaybe<Scalars['Int']['input']>;
  /** The description of the shortcut.This can described the shortcut and its purpose. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The name of the shortcut. This is used to identify the shortcut in the system. */
  name: Scalars['String']['input'];
  /** The toolbox ID to create the shortcut in. If not provided, the shortcut will be created in the default toolbox. */
  toolbox?: InputMaybe<Scalars['ID']['input']>;
  /** Whether when running the short the returns should be used further. Allows to create mini pipelines */
  useReturns?: Scalars['Boolean']['input'];
};

/** The input for creating a space. */
export type CreateSpaceInput = {
  /** The name of the space. This is used to identify the space in the system. */
  name: Scalars['String']['input'];
  /** The placements to create in the space. This is used to identify the placements in the system. */
  placements?: InputMaybe<Array<PlacementInput>>;
};

export type CreateTestCaseInput = {
  action: Scalars['ID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  tester: Scalars['ID']['input'];
};

export type CreateTestResultInput = {
  case: Scalars['ID']['input'];
  implementation: Scalars['ID']['input'];
  passed: Scalars['Boolean']['input'];
  result?: InputMaybe<Scalars['String']['input']>;
  tester: Scalars['ID']['input'];
};

/** The input for creating a 3D model. */
export type CreateThreeDModelInput = {
  /** A description of the 3D model. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The media store file for the 3D model. */
  media: Scalars['MediaLike']['input'];
  /** The name of the 3D model. */
  name: Scalars['String']['input'];
};

/** The input for creating a toolbox. */
export type CreateToolboxInput = {
  /** The description of the toolbox. This can described the toolbox and its purpose. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The name of the toolbox. This is used to identify the toolbox in the system. */
  name: Scalars['String']['input'];
};

/** Create a trigger: on a signal of `kind` for `identifier` whose descriptors satisfy `conditions` (and the port's own requires), run `action` with the object in `port`. */
export type CreateTriggerInput = {
  action: Scalars['ID']['input'];
  agent?: InputMaybe<Scalars['ID']['input']>;
  args?: InputMaybe<Scalars['Args']['input']>;
  conditions?: InputMaybe<Scalars['AnyDefault']['input']>;
  enabled?: Scalars['Boolean']['input'];
  identifier: Scalars['String']['input'];
  interface?: InputMaybe<Scalars['String']['input']>;
  kind: SignalKind;
  name: Scalars['String']['input'];
  port: Scalars['String']['input'];
};

/** A catalog component rendered as the port's widget. */
export type CustomAssignWidget = AssignWidget & {
  __typename?: 'CustomAssignWidget';
  component: Scalars['String']['output'];
  dependencies?: Maybe<Array<Scalars['String']['output']>>;
  fallback?: Maybe<AssignWidget>;
  followValue?: Maybe<Scalars['String']['output']>;
  kind: AssignWidgetKind;
  props?: Maybe<Array<ComponentProp>>;
};

/** A catalog component rendered as the port's widget. */
export type CustomAssignWidgetInput = {
  /** The catalog component to render. The port value is in scope as the reserved root `value`. */
  component: Scalars['String']['input'];
  /** The other ports (port paths, `..` traverses children) whose values the props may reference. */
  dependencies?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Widget to render when the UI has no such component in its catalog. */
  fallback?: InputMaybe<AssignWidgetInput>;
  /** Port path of another port whose value this widget follows and mirrors. */
  followValue?: InputMaybe<Scalars['String']['input']>;
  /** Which member of AssignWidgetInput this is. */
  kind: AssignWidgetKind;
  /** Props of the component. value_paths may only reference `value` and `dependencies`; agent calls are not allowed. */
  props?: InputMaybe<Array<ComponentPropInput>>;
};

/** An effect whose behaviour is entirely defined by its call. */
export type CustomEffect = Effect & {
  __typename?: 'CustomEffect';
  call: UtilCall;
  /** The full call tree as raw JSON, so deep trees are not truncated by fragment depth. */
  callJson: Scalars['JSONSerializable']['output'];
  dependencies: Array<Scalars['String']['output']>;
  kind: EffectKind;
  source?: Maybe<Scalars['String']['output']>;
};

/** A catalog component rendered for a returned value. */
export type CustomReturnWidget = ReturnWidget & {
  __typename?: 'CustomReturnWidget';
  component: Scalars['String']['output'];
  kind: ReturnWidgetKind;
  props?: Maybe<Array<ComponentProp>>;
};

/** A catalog component rendered for a returned value. */
export type CustomReturnWidgetInput = {
  /** The catalog component to render. The returned value is in scope as the reserved root `value`. */
  component: Scalars['String']['input'];
  /** Which member of ReturnWidgetInput this is. */
  kind: ReturnWidgetKind;
  /** Props of the component; value_paths may only reference `value`, agent calls are not allowed. */
  props?: InputMaybe<Array<ComponentPropInput>>;
};

export type Dashboard = {
  __typename?: 'Dashboard';
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  placements: Array<DashboardPlacement>;
};


export type DashboardPlacementsArgs = {
  filters?: InputMaybe<DashboardPlacementFilter>;
  ordering?: Array<DashboardPlacementOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** A placement of an agent in a space. */
export type DashboardPlacement = {
  __typename?: 'DashboardPlacement';
  blok?: Maybe<MaterializedBlok>;
  dashboard: Dashboard;
  id: Scalars['ID']['output'];
};

/** A way to filter placements (space memberships) */
export type DashboardPlacementFilter = {
  AND?: InputMaybe<DashboardPlacementFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<DashboardPlacementFilter>;
  OR?: InputMaybe<DashboardPlacementFilter>;
  /** Filter by agent */
  agent?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by IDs */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Search by name */
  search?: InputMaybe<Scalars['String']['input']>;
  /** Filter by space */
  space?: InputMaybe<Scalars['ID']['input']>;
};

export type DashboardPlacementOrder =
  { createdAt: Ordering; role?: never; }
  |  { createdAt?: never; role: Ordering; };

/**
 * A definition
 *
 *     Definitions are the building implementation for Actions and provide the
 *     information needed to create a action. They are primarly composed of a name,
 *     a description, and a list of ports.
 *
 *     Definitions provide a protocol of input and output, and do not contain
 *     any information about the actual implementation of the action ( this is handled
 *     by a implementation that implements a action).
 *
 *
 */
export type DefinitionInput = {
  /** Whether the action may be invoked as a probe: zero persistence, redis-held state, no history/replay/recovery. Only actions declaring this are callable via the call mutation. */
  allowProbe?: Scalars['Boolean']['input'];
  /** The args of the definition. This is the input ports of the definition */
  args?: Array<ArgPortInput>;
  /** Names of the UI catalogs that extend the base catalog (`base@1`, always applied) for this definition's effect and validator calls. Unknown names yield an unknown_catalog warning; conflicting operation definitions across catalogs are a registration error. */
  catalogs?: InputMaybe<Array<Scalars['String']['input']>>;
  /** The collections of the definition. This is used to group definitions together in the UI */
  collections?: Array<Scalars['String']['input']>;
  /** The description of the definition. This is the text that is displayed in the UI */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Whether the action is idempotent: safe to run multiple times with the same args without changing the outcome — on ambiguous executor loss it may be freely re-dispatched. */
  idempotent?: Scalars['Boolean']['input'];
  /** Whether the definition is a dev definition or not. If the definition is a dev definition, it can be used to create a dev action. If the definition is not a dev definition, it cannot be used to create a dev action */
  isDev?: Scalars['Boolean']['input'];
  /** The actions this definition is a test for, each identified by hash or by (app, key, version). */
  isTestFor?: Array<TestTargetInput>;
  /** The key of the definition. This is used to uniquely identify the definition */
  key: Scalars['String']['input'];
  /** The kind of the definition. This is the type of the definition. Can be either a function or a generator */
  kind: ActionKind;
  /** The name of the actions. This is used to uniquely identify the definition */
  name: Scalars['String']['input'];
  /** The port groups of the definition. This is used to group ports together in the UI */
  portGroups?: Array<PortGroupInput>;
  /** Whether the action is pure: same args always produce the same result and no side effects — its results are replayable/cacheable. Implies idempotent. Incompatible with stateful and with IRREVERSIBLE effects. */
  pure?: Scalars['Boolean']['input'];
  /** The returns of the definition. This is the output ports of the definition */
  returns?: Array<ReturnPortInput>;
  /** Whether the definition is stateful or not. If the definition is stateful, it can be used to create a stateful action. If the definition is not stateful, it cannot be used to create a stateful action */
  stateful?: Scalars['Boolean']['input'];
  /** The version of the definition. This is used to differentiate if the underyling algorithm has changed, i.e we would expect different results for the same input */
  version: Scalars['String']['input'];
};

export type DeleteAgentInput = {
  /** The ID of the agent to delete. This is used to identify the agent in the system. */
  id: Scalars['ID']['input'];
};

/** The input for updating a blok. */
export type DeleteBlokInput = {
  /** The blok ID to delete. This is used to identify the blok in the system. */
  id: Scalars['ID']['input'];
};

/** Input for deleting a dashboard. This is used to delete a dashboard by its ID. */
export type DeleteDashboardInput = {
  /** The ID of the dashboard to delete. */
  id: Scalars['ID']['input'];
};

/** The input for deleting a implementation. */
export type DeleteImplementationInput = {
  /** The implementation ID to delete. This is used to identify the implementation in the system. */
  implementation: Scalars['ID']['input'];
};

/** Input for updating a dashboard. This is used to update the properties of a dashboard, such as its name, associated bloks, or organization. */
export type DeleteMaterializedBlokInput = {
  /** The ID of the materialized blok to delete. */
  id: Scalars['ID']['input'];
};

/** The input for deleting a placement. */
export type DeletePlacementInput = {
  /** The ID of the placement to delete. */
  id: Scalars['ID']['input'];
};

/** The input for deleting a resolution. */
export type DeleteResolutionInput = {
  /** The ID of the resolution to delete. */
  id: Scalars['ID']['input'];
};

/** The input for deleting a shortcut. */
export type DeleteShortcutInput = {
  /** The shortcut ID to delete. This is used to identify the shortcut in the system. */
  id: Scalars['ID']['input'];
};

/** The input for deleting a space. */
export type DeleteSpaceInput = {
  /** The ID of the space to delete. */
  id: Scalars['ID']['input'];
};

/** The input for deleting a 3D model. */
export type DeleteThreeDModelInput = {
  /** The ID of the 3D model to delete. */
  id: Scalars['ID']['input'];
};

/** The input for deleting a toolbox. */
export type DeleteToolboxInput = {
  /** The toolbox ID to delete. This is used to identify the toolbox in the system. */
  id: Scalars['ID']['input'];
};

export enum DemandKind {
  Args = 'ARGS',
  Returns = 'RETURNS'
}

/** Represents a dependency between implementations and actions. */
export type Dependency = {
  __typename?: 'Dependency';
  /** The named action requirements of this dependency. */
  actionDependencies: Array<ActionDependency>;
  /** Optional filter string to limit which agents can be bound to this dependency based on the app they belong to. The filter string should be in the format 'app_identifier:version' where version can be a specific version or a wildcard '*'. For example, 'my_app:*' would allow any agent belonging to 'my_app' regardless of version, while 'my_app:1.0.0' would only allow agents with that specific version. */
  appFilter?: Maybe<Scalars['String']['output']>;
  /** Whether this dependency is auto resolvable or not. If so we will try to automatically resolve it based on the demands specified in the dependency and the capabilities of the available agents in the system. This is used to identify the demand in the system. Attention if any of the dependencies of this agent dependency is not auto resolvable, this dependency will also not be auto resolvable */
  autoResolvable: Scalars['Boolean']['output'];
  /** Optional description of the dependency. */
  description?: Maybe<Scalars['String']['output']>;
  /** Unique ID of the dependency. */
  id: Scalars['ID']['output'];
  /** The implementation this dependency belongs to. */
  implementation: Implementation;
  /** Optional string identifier or tag for reference. */
  key: Scalars['String']['output'];
  /** Maximum number of viable agent instances that can be bound to this dependency. This is used in combination with the auto_resolvable field to determine if a dependency can be automatically resolved. If the number of available agent instances that match the filters is greater than this number, the dependency will not be considered auto resolvable. */
  maxViableInstances?: Maybe<Scalars['Int']['output']>;
  /** Minimum number of viable agent instances required to resolve this dependency. This is used in combination with the auto_resolvable field to determine if a dependency can be automatically resolved. If the number of available agent instances that match the filters is less than this number, the dependency will not be considered auto resolvable. */
  minViableInstances?: Maybe<Scalars['Int']['output']>;
  /** Indicates if the dependency is optional. */
  optional: Scalars['Boolean']['output'];
  /** List of action demands specified in this dependency. */
  singular: Scalars['Boolean']['output'];
  /** The named state requirements of this dependency. */
  stateDependencies: Array<StateDependency>;
  /** Optional filter string to limit which agents can be bound to this dependency based on the version of the app they belong to. The filter string should be in the format 'version' where version can be a specific version or a wildcard '*'. For example, '*' would allow any version, while '1.0.0' would only allow agents with that specific version. */
  versionFilter?: Maybe<Scalars['String']['output']>;
};

export type DependencyFilter = {
  AND?: InputMaybe<DependencyFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<DependencyFilter>;
  OR?: InputMaybe<DependencyFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
};

/** A single runtime descriptor key/value pair carried by a candidate object. */
export type DescriptorInput = {
  /** The descriptor key, e.g. 'axes'. */
  key: Scalars['String']['input'];
  /** The descriptor value. Any JSON-serializable value. */
  value: Scalars['Arg']['input'];
};

/** The operator of a requires/provides descriptor: how a port's constraint compares the object's value at `key` with `value`. */
export enum DescriptorOperator {
  Contains = 'CONTAINS',
  Equals = 'EQUALS',
  Exists = 'EXISTS',
  Gte = 'GTE',
  In = 'IN',
  Lte = 'LTE',
  Matches = 'MATCHES',
  NotEquals = 'NOT_EQUALS',
  NotIn = 'NOT_IN'
}

/** Represents a device assigned to users within an organization. */
export type Device = {
  __typename?: 'Device';
  /** The device identifier. */
  deviceId: Scalars['ID']['output'];
  /** Unique ID of the device. */
  id: Scalars['ID']['output'];
};

/** A non-fatal registration finding, e.g. a validator call naming an operation neither the base catalog nor the named catalog provides. */
export type Diagnostic = {
  __typename?: 'Diagnostic';
  code: Scalars['String']['output'];
  level: DiagnosticLevel;
  message: Scalars['String']['output'];
  path?: Maybe<Scalars['String']['output']>;
};

/** Severity of a registration finding. Errors are never stored (they abort registration), so only WARNING exists. */
export enum DiagnosticLevel {
  Warning = 'WARNING'
}

/** A bound state pointer referencing a variable inside a Blok state instance. */
export type DynamicValue = {
  __typename?: 'DynamicValue';
  literal?: Maybe<Scalars['String']['output']>;
  path?: Maybe<Scalars['String']['output']>;
};

/** A bound state pointer referencing a variable inside a Blok state instance. */
export type DynamicValueInput = {
  /** A static fallback literal value (serialized string or JSON primitive) used when `path` does not resolve. */
  literal?: InputMaybe<Scalars['String']['input']>;
  /** JSON Pointer to a variable inside the Blok's isolated data model (e.g., '/microscope/exposure'). */
  path?: InputMaybe<Scalars['String']['input']>;
};

export type Effect = {
  call: UtilCall;
  /** The full call tree as raw JSON, so deep trees are not truncated by fragment depth. */
  callJson: Scalars['JSONSerializable']['output'];
  dependencies: Array<Scalars['String']['output']>;
  kind: EffectKind;
  source?: Maybe<Scalars['String']['output']>;
};

/**
 *
 *     An effect is a way to modify a port based on a condition. For example,
 *     you could have an effect that hides the port if another port meets a condition,
 *     e.g. when the user selects a certain option in a dropdown, another port is hidden.
 *
 *     The condition is a pure blok UtilCall (`call`) evaluated client-side against the
 *     catalog; it must return a boolean deciding whether the effect applies. `dependencies`
 *     is the authoritative list of other ports the call may reference (plus `value` for the
 *     port's own value).
 *
 */
export type EffectInput = {
  /** The pure blok UtilCall, evaluated client-side against the catalog, that decides whether the effect applies. It must return a boolean. Argument value_paths may only reference names listed in `dependencies`, plus `value` for the port's own value. */
  call: UtilCallInput;
  /** The form-field subscription list of the effect: the keys of the other ports whose values the call may reference. This list is authoritative: a value_path in the call may only reference these names (plus `value` for the port's own value). Use the .. syntax to traverse the tree of ports, e.g. 'foo..bar' for the child 'bar' of port 'foo'. */
  dependencies?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Whether to fade out the port when the effect is applied (if it is a hide effect) */
  fade?: InputMaybe<Scalars['Boolean']['input']>;
  /** The kind of the effect. Can be either message, hide or custom */
  kind: EffectKind;
  /** The message to display when the effect is applied (if it is a message effect) */
  message?: InputMaybe<Scalars['String']['input']>;
  /** The authoring expression the call was compiled from (informational; never parsed or validated by the server). */
  source?: InputMaybe<Scalars['String']['input']>;
};

/** The kind of effect. */
export enum EffectKind {
  Custom = 'CUSTOM',
  Hide = 'HIDE',
  Message = 'MESSAGE'
}

/** What running an implementation again would do to the world. Purely informational: shown to whoever decides about a lost task. */
export enum Effects {
  Irreversible = 'IRREVERSIBLE',
  None = 'NONE',
  Repeatable = 'REPEATABLE',
  Unknown = 'UNKNOWN'
}

/** How an implementation runs: a WORKFLOW may call other actions and is resumed from its journal when its agent dies; a PLAIN one's task ends LOST. */
export enum Execution {
  Plain = 'PLAIN',
  Workflow = 'WORKFLOW'
}

export type FinishMediaUploadInput = {
  storeId: Scalars['String']['input'];
  valid?: Scalars['Boolean']['input'];
};

export enum Granularity {
  Day = 'DAY',
  Hour = 'HOUR',
  Month = 'MONTH',
  Quarter = 'QUARTER',
  Week = 'WEEK',
  Year = 'YEAR'
}

/** Represents a record of an agent's hardware configuration. */
export type HardwareRecord = {
  __typename?: 'HardwareRecord';
  /** The agent to which this hardware belongs. */
  agent: Agent;
  /** Number of CPU cores available. */
  cpuCount: Scalars['Int']['output'];
  /** Clock speed of the CPU in GHz. */
  cpuFrequency: Scalars['Float']['output'];
  /** Vendor of the CPU. */
  cpuVendorName: Scalars['String']['output'];
  /** Timestamp when this record was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Unique ID of the hardware record. */
  id: Scalars['ID']['output'];
};

export type HardwareRecordFilter = {
  AND?: InputMaybe<HardwareRecordFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<HardwareRecordFilter>;
  OR?: InputMaybe<HardwareRecordFilter>;
  cpuVendorName?: InputMaybe<Scalars['String']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type HideEffect = Effect & {
  __typename?: 'HideEffect';
  call: UtilCall;
  /** The full call tree as raw JSON, so deep trees are not truncated by fragment depth. */
  callJson: Scalars['JSONSerializable']['output'];
  dependencies: Array<Scalars['String']['output']>;
  fade: Scalars['Boolean']['output'];
  kind: EffectKind;
  source?: Maybe<Scalars['String']['output']>;
};

/** A hook is a function that is called when a action has reached a specific lifecycle point. Hooks are jsut actions that take a task as input and return a value. */
export type HookInput = {
  /** The hash of the hook. This is used to identify the hook in the system. */
  hash: Scalars['ActionHash']['input'];
  /** The kind of the hook. This is used to identify the hook in the system. */
  kind: HookKind;
};

export enum HookKind {
  Cleanup = 'CLEANUP',
  Init = 'INIT'
}

/** Implement an agent with the given implementations, states and locks. This will create the agent if it doesn't exist and update it if it does exist. */
export type ImplementAgentInput = {
  /** The blocks of the agent. This is used to specify the initial blocks of the agent */
  bloks?: InputMaybe<Array<BlokImplementationInput>>;
  /** What this agent is, in a sentence. Omitting it leaves whatever the agent already has, unlike `name`, which falls back to the client id. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** A unique hash of the agent definition. An agent can use this hash to check if its definition has changed and if it needs to update its implementations and states. This is used to optimize the update process by only updating the implementations and states that have changed. */
  hash?: InputMaybe<Scalars['String']['input']>;
  /** The implementations of the agent. This is used to specify the initial implementations of the agent */
  implementations?: InputMaybe<Array<ImplementationInput>>;
  /** The locks of the agent. This is used to specify which resources the agent needs to run */
  locks?: InputMaybe<Array<LockImplementationInput>>;
  /** The name of the agent. This is used to identify the agent in the system. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** The states of the agent. This is used to specify the initial states of the agent */
  states?: InputMaybe<Array<StateImplementationInput>>;
};

/** Represents a concrete implementation of an action. */
export type Implementation = {
  __typename?: 'Implementation';
  /** The action this implements. */
  action: Action;
  /** Agent running this implementation. */
  agent: Agent;
  /** A hash of the implementation's code; a workflow is only resumed by an implementation with the same hash. */
  codeHash?: Maybe<Scalars['String']['output']>;
  /** Dependencies required by this action. */
  dependencies: Array<Dependency>;
  /** Non-fatal registration findings, e.g. validator/effect calls naming operations that neither the base catalog nor the definition's catalog provides. */
  diagnostics: Array<Diagnostic>;
  /** What running this implementation again would do to the world. Informational: shown to whoever decides about a lost task. */
  effects: Effects;
  /** How this implementation runs: a WORKFLOW may call other actions and is resumed from its journal when its agent dies. */
  execution: Execution;
  /** Projection config (bound params, arg/dependency/return maps) when this is a higher-order implementation. */
  higherOrderConfig: Scalars['AnyDefault']['output'];
  /** If this is a higher-order (wrapper) implementation, the lower implementation it wraps. */
  higherOrderFor?: Maybe<Implementation>;
  /** Unique ID of the implementation. */
  id: Scalars['ID']['output'];
  /** Interface string representing the implementation entrypoint. */
  interface: Scalars['String']['output'];
  /** The higher-order implementations that wrap this implementation. */
  lowerOrderImplementations: Array<Implementation>;
  /** States that this implementation manipulates. */
  manipulates: Array<State>;
  /** Get the latest completed task created by the current user. */
  myLatestTask?: Maybe<Task>;
  /** Constructed name for display, combining interface and agent name. */
  name: Scalars['String']['output'];
  /** Whether a signed provenance token is minted when this implementation is assigned. */
  needsToken: Scalars['Boolean']['output'];
  /** Arbitrary parameters for the implementation. */
  params: Scalars['AnyDefault']['output'];
  /** Check if this implementation is pinned by the current user. */
  pinned: Scalars['Boolean']['output'];
  /** Declared audience for the provenance token's `aud`, or null to derive it at dispatch. */
  provenanceAudience?: Maybe<Array<Scalars['String']['output']>>;
  /** The resolved dependencies */
  resolutions: Array<Resolution>;
  /** Implementations on this agent whose action is a test for this implementation's action. */
  tests: Array<Implementation>;
  /** List of action demands */
  tracks: Array<Track>;
};


/** Represents a concrete implementation of an action. */
export type ImplementationDependenciesArgs = {
  filters?: InputMaybe<DependencyFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Represents a concrete implementation of an action. */
export type ImplementationLowerOrderImplementationsArgs = {
  filters?: InputMaybe<ImplementationFilter>;
  ordering?: Array<ImplementationOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Represents a concrete implementation of an action. */
export type ImplementationResolutionsArgs = {
  filters?: InputMaybe<ResolutionFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type ImplementationActionFilter = {
  AND?: InputMaybe<ImplementationActionFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ImplementationActionFilter>;
  OR?: InputMaybe<ImplementationActionFilter>;
  demands?: InputMaybe<Array<PortDemandInput>>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  kind?: InputMaybe<ActionKind>;
  name?: InputMaybe<Scalars['String']['input']>;
  protocols?: InputMaybe<Array<Scalars['String']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type ImplementationAgentFilter = {
  AND?: InputMaybe<ImplementationAgentFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ImplementationAgentFilter>;
  OR?: InputMaybe<ImplementationAgentFilter>;
  clientId?: InputMaybe<Scalars['String']['input']>;
  hasImplementations?: InputMaybe<Array<Scalars['String']['input']>>;
  hasStates?: InputMaybe<Array<Scalars['String']['input']>>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type ImplementationFilter = {
  AND?: InputMaybe<ImplementationFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ImplementationFilter>;
  OR?: InputMaybe<ImplementationFilter>;
  action?: InputMaybe<ImplementationActionFilter>;
  actionDemand?: InputMaybe<ActionDemandInput>;
  actionHash?: InputMaybe<Scalars['ActionHash']['input']>;
  active?: InputMaybe<Scalars['Boolean']['input']>;
  agent?: InputMaybe<ImplementationAgentFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  interface?: InputMaybe<StrFilterLookup>;
  parameters?: InputMaybe<Array<ParamPair>>;
  resolvableFor?: InputMaybe<Scalars['ID']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** A implementation is a blueprint for a action. It is composed of a definition, a list of dependencies, and a list of params. */
export type ImplementationInput = {
  /** A hash of the implementation's code. A workflow is only resumed by an implementation with the same hash. */
  codeHash?: InputMaybe<Scalars['String']['input']>;
  /** The definition of the implementation. This is used to uniquely identify the implementation */
  definition: DefinitionInput;
  /** The agent dependencies required by this implementation. */
  dependencies?: Array<AgentDependencyInput>;
  /** What running this implementation again would do to the world. Informational: shown to whoever decides about a lost task. */
  effects?: Effects;
  /** How this implementation runs: a WORKFLOW may call other actions and is resumed from its journal when its agent dies. */
  execution?: Execution;
  /** The instance id of the agent this implementation is bound to. */
  instanceId?: InputMaybe<Scalars['String']['input']>;
  /** The interface of the implementation. This is used to group implementations together in the UI */
  interface?: InputMaybe<Scalars['String']['input']>;
  /** The locks of the implementation. This is used to specify which resources the implementation needs to run */
  locks?: InputMaybe<Array<Scalars['String']['input']>>;
  /** The states that the implementation manipulates. This is used to identify which states are manipulated by the implementation, and can be use to enhance state safety in the system */
  manipulates?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Whether Rekuest should mint a signed provenance token when this implementation is assigned. Default true (provenance-by-default); set false for trivial/internal tasks that never produce external provenance. */
  needsToken?: Scalars['Boolean']['input'];
  /** The optimistics of the definition. This is used to optimistically set state values when the action is assigned, to provide a better user experience. */
  optimistics?: InputMaybe<Array<OptimisticInput>>;
  /** The params of the implementation. This is used to pass parameters to the implementation */
  params?: InputMaybe<Scalars['AnyDefault']['input']>;
  /** The downstream service(s) the provenance token should be scoped to (the token's `aud`). If omitted, Rekuest derives the audience from the structures the assignment acts on. */
  provenanceAudience?: InputMaybe<Array<Scalars['String']['input']>>;
  /** The tracks of the definition. This is used to track values over time during the runtime of an action. This is the state of a dependency */
  tracks?: InputMaybe<Array<TrackInput>>;
};

export type ImplementationMapping = {
  __typename?: 'ImplementationMapping';
  /** Get the key of the implementation mapping. */
  implementation: Implementation;
  /** Get the key of the implementation mapping. */
  key: Scalars['String']['output'];
  /** Get the key of the implementation mapping. */
  resolvedDependencies: Array<ResolvedAgentDependency>;
};

export type ImplementationOrder =
  { active: Ordering; createdAt?: never; }
  |  { active?: never; createdAt: Ordering; };

/** An implementation feed event: exactly one of create/update/delete is set. */
export type ImplementationUpdate = {
  __typename?: 'ImplementationUpdate';
  create?: Maybe<Implementation>;
  delete?: Maybe<Scalars['ID']['output']>;
  update?: Maybe<Implementation>;
};

/** An interface referenced by an action's port, derived from the relational port rows. */
export type Interface = {
  __typename?: 'Interface';
  /** The full identifier, e.g. '@rekuest/taskevent'. */
  identifier: Scalars['ID']['output'];
  /** Usages of this interface as an input in actions (derived from the relational arg ports). */
  inputUsages: Array<PortUsage>;
  /** The local key (the part after '/'). */
  key: Scalars['String']['output'];
  /** Usages of this interface as an output in actions (derived from the relational return ports). */
  outputUsages: Array<PortUsage>;
  /** The package this interface belongs to. */
  package: StructurePackage;
};

/** The input for interrupting a task. */
export type InterruptInput = {
  /** The task ID to interrupt */
  task: Scalars['ID']['input'];
};

export type JsonPatch = {
  __typename?: 'JSONPatch';
  op: JsonPatchOperation;
  path: Scalars['String']['output'];
  value: Scalars['Args']['output'];
};

export enum JsonPatchOperation {
  Add = 'add',
  Copy = 'copy',
  Move = 'move',
  Remove = 'remove',
  Replace = 'replace',
  Test = 'test'
}

/** The input for bouncing an agent. */
export type KickInput = {
  /** The agent ID to bounce. */
  agent: Scalars['ID']['input'];
  /** The reason for kicking the agent. */
  reason?: InputMaybe<Scalars['String']['input']>;
};

/** Which locks does the agent provide in general */
export type LockDefinitionInput = {
  /** Describe the lock a bit */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The key of the lock. This is used to uniquely identify the lock */
  key: Scalars['String']['input'];
};

/** Which locks does the agent provide in general */
export type LockImplementationInput = {
  /** The lock definition this implementation fulfills. */
  definition: LockDefinitionInput;
  /** The key of the lock implementation. */
  key: Scalars['String']['input'];
};

export enum LogLevel {
  Critical = 'CRITICAL',
  Debug = 'DEBUG',
  Error = 'ERROR',
  Info = 'INFO',
  Warn = 'WARN'
}

/** The input for mapping actions to implementations in a agent. */
export type MappedAgentInput = {
  /** The agent ID to map the actions to. This is used to identify the agent in the system. */
  agent: Scalars['ID']['input'];
  /** The key of the agent to map. This is used to identify the agent in the system. */
  key: Scalars['String']['input'];
};

/** The input for creating a blok. */
export type MaterializeBlokInput = {
  /** The agent mappings for the blok. This is used to map the blok dependencies to agents in the system. */
  agentMappings?: InputMaybe<Array<BlokAgentMappingInput>>;
  blok: Scalars['ID']['input'];
  /** The dashboard ID to materialize the blok in. If not provided, the blok will be materialized in the default dashboard. */
  dashboard?: InputMaybe<Scalars['ID']['input']>;
  /** Description of this materialization. Defaults to the blok's description. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Display name of this materialization. Defaults to the blok's name. */
  name?: InputMaybe<Scalars['String']['input']>;
};

/** A materialized instance of a Blok that can be placed on dashboards and linked to agent states. */
export type MaterializedBlok = {
  __typename?: 'MaterializedBlok';
  /** Mappings of states to this materialized blok. */
  agentMappings: Array<BlokAgentMapping>;
  blok: Blok;
  createdAt: Scalars['DateTime']['output'];
  /** Placements of this materialized blok on dashboards. */
  dashboardPlacements: Array<DashboardPlacement>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  /** Placements of this materialized blok. */
  placements: Array<Placement>;
  updatedAt: Scalars['DateTime']['output'];
};


/** A materialized instance of a Blok that can be placed on dashboards and linked to agent states. */
export type MaterializedBlokDashboardPlacementsArgs = {
  filters?: InputMaybe<DashboardPlacementFilter>;
  ordering?: Array<DashboardPlacementOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A materialized instance of a Blok that can be placed on dashboards and linked to agent states. */
export type MaterializedBlokPlacementsArgs = {
  filters?: InputMaybe<PlacementFilter>;
  ordering?: Array<PlacementOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** A way to filter placements (space memberships) */
export type MaterializedBlokFilter = {
  AND?: InputMaybe<MaterializedBlokFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<MaterializedBlokFilter>;
  OR?: InputMaybe<MaterializedBlokFilter>;
  /** Filter by agent */
  agent?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by IDs */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Search by name */
  search?: InputMaybe<Scalars['String']['input']>;
};

export type MaterializedBlokOrder =
  { createdAt: Ordering; };

/** Temporary S3 credentials for reading a media object. */
export type MediaAccessGrant = {
  __typename?: 'MediaAccessGrant';
  accessKey: Scalars['String']['output'];
  bucket: Scalars['String']['output'];
  expiresIn: Scalars['Int']['output'];
  key: Scalars['String']['output'];
  path: Scalars['String']['output'];
  region: Scalars['String']['output'];
  secretKey: Scalars['String']['output'];
  sessionToken: Scalars['String']['output'];
  status: Scalars['String']['output'];
  store?: Maybe<Scalars['String']['output']>;
};

export type MediaStore = {
  __typename?: 'MediaStore';
  /** Get temporary S3 read credentials for the media object. */
  accessGrant: MediaAccessGrant;
  bucket: Scalars['String']['output'];
  contentType?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  originalFileName?: Maybe<Scalars['String']['output']>;
  path: Scalars['String']['output'];
  /** Compatibility field returning the canonical S3 object path. */
  presignedUrl: Scalars['String']['output'];
};


export type MediaStoreAccessGrantArgs = {
  host?: InputMaybe<Scalars['String']['input']>;
};


export type MediaStorePresignedUrlArgs = {
  host?: InputMaybe<Scalars['String']['input']>;
};

/** A presigned PUT grant for uploading a media object. */
export type MediaUploadGrant = {
  __typename?: 'MediaUploadGrant';
  accessKey: Scalars['String']['output'];
  bucket: Scalars['String']['output'];
  expiresIn: Scalars['Int']['output'];
  key: Scalars['String']['output'];
  maxBytes: Scalars['Int']['output'];
  originalFileName?: Maybe<Scalars['String']['output']>;
  path: Scalars['String']['output'];
  region: Scalars['String']['output'];
  secretKey: Scalars['String']['output'];
  sessionToken: Scalars['String']['output'];
  status: Scalars['String']['output'];
  store: Scalars['String']['output'];
  uploadContentType?: Maybe<Scalars['String']['output']>;
  uploadFileName: Scalars['String']['output'];
  uploadFormField: Scalars['String']['output'];
};

export type MemoryDrawer = {
  __typename?: 'MemoryDrawer';
  /** Whether the agent minted this drawer's reference: it is addressed by resourceId rather than by id. */
  agentMinted: Scalars['Boolean']['output'];
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  identifier: Scalars['String']['output'];
  /** Get the latest value stored in this drawer. */
  label: Scalars['String']['output'];
  resourceId: Scalars['String']['output'];
  shelve: MemoryShelve;
};

/** A way to filter shelved items */
export type MemoryDrawerFilter = {
  AND?: InputMaybe<MemoryDrawerFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<MemoryDrawerFilter>;
  OR?: InputMaybe<MemoryDrawerFilter>;
  agent?: InputMaybe<Scalars['ID']['input']>;
  identifier?: InputMaybe<Scalars['String']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  implementation?: InputMaybe<Scalars['ID']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  shelve?: InputMaybe<Scalars['ID']['input']>;
};

/** A shelve for storing memory-based resources on an agent. */
export type MemoryShelve = {
  __typename?: 'MemoryShelve';
  /** Agent that owns this memory shelve. */
  agent: Agent;
  /** Optional description of the shelve. */
  description?: Maybe<Scalars['String']['output']>;
  /** List of memory drawers within the shelve. */
  drawers: Array<MemoryDrawer>;
  /** ID of the memory shelve. */
  id: Scalars['ID']['output'];
  /** Name of the shelve. */
  name: Scalars['String']['output'];
};


/** A shelve for storing memory-based resources on an agent. */
export type MemoryShelveDrawersArgs = {
  filters?: InputMaybe<MemoryDrawerFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** A way to filter shelved items */
export type MemoryShelveFilter = {
  AND?: InputMaybe<MemoryShelveFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<MemoryShelveFilter>;
  OR?: InputMaybe<MemoryShelveFilter>;
  agent?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type MemoryShelveOrder =
  { name: Ordering; };

export type MessageEffect = Effect & {
  __typename?: 'MessageEffect';
  call: UtilCall;
  /** The full call tree as raw JSON, so deep trees are not truncated by fragment depth. */
  callJson: Scalars['JSONSerializable']['output'];
  dependencies: Array<Scalars['String']['output']>;
  kind: EffectKind;
  message: Scalars['String']['output'];
  source?: Maybe<Scalars['String']['output']>;
};

/** Root mutation type for executing write operations on the API. */
export type Mutation = {
  __typename?: 'Mutation';
  /** Acknowledge a task. */
  ack: Task;
  /** Assign a task to an agent. */
  assign: Task;
  /** Automatically resolve dependencies for an implementation. */
  autoResolve: Resolution;
  /** Block an agent from connecting. */
  block: Agent;
  /** Bounce an agent so it reconnects. */
  bounce: Agent;
  /** Cancel an active task. */
  cancel: Task;
  /** Cancel a probe. Idempotent: cancelling a finished probe is a no-op returning its terminal state. */
  cancelProbe: Probe;
  /** Delete unreferenced actions from the system. */
  cleanupActions: Scalars['Int']['output'];
  /** Collect results from a task. */
  collect: Array<Scalars['String']['output']>;
  /** Create a user interface panel. */
  createBlok: Blok;
  /** Create a dashboard layout. */
  createDashboard: Dashboard;
  /** Create a new implementation entry. */
  createImplementation: Implementation;
  /** Create a new placement for an agent in a space. */
  createPlacement: Placement;
  /** Create a resolution for an implementation. */
  createResolution: Resolution;
  /** Create a recurring assignment of an action. Its next run is planned immediately. */
  createSchedule: Schedule;
  /** Create a shortcut to an action. */
  createShortcut: Shortcut;
  /** Create a new space. */
  createSpace: Space;
  /** Create a new test case. */
  createTestCase: TestCase;
  /** Create a test result record. */
  createTestResult: TestResult;
  /** Create a new 3D model. */
  createThreedModel: ThreeDModel;
  /** Create a new toolbox with shortcuts. */
  createToolbox: Toolbox;
  /** Create a trigger: run an action when a service signals a matching object. */
  createTrigger: Trigger;
  /** Delete an agent record. */
  deleteAgent: Scalars['ID']['output'];
  /** Delete a blok by ID. */
  deleteBlok: Scalars['Boolean']['output'];
  /** Delete a dashboard by ID. */
  deleteDashboard: Scalars['Boolean']['output'];
  /** Delete a registered implementation. */
  deleteImplementation: Scalars['String']['output'];
  /** Delete a materialized blok by ID. */
  deleteMaterializedBlok: Scalars['Boolean']['output'];
  /** Delete a placement. */
  deletePlacement: Scalars['ID']['output'];
  /** Delete a resolution by ID. */
  deleteResolution: Scalars['ID']['output'];
  /** Delete a schedule. Its waiting run is cancelled; history is kept. */
  deleteSchedule: Scalars['ID']['output'];
  /** Delete a shortcut. */
  deleteShortcut: Scalars['ID']['output'];
  /** Delete a space. */
  deleteSpace: Scalars['ID']['output'];
  /** Delete a 3D model. */
  deleteThreedModel: Scalars['ID']['output'];
  /** Delete a toolbox by ID. */
  deleteToolbox: Scalars['ID']['output'];
  /** Delete a trigger; its runs are kept. */
  deleteTrigger: Scalars['ID']['output'];
  /** Ensure agent record exists or is up to date. */
  ensureAgent: Agent;
  /** Finalize a media upload after the client has written the object */
  finishMediaUpload: MediaStore;
  /** Implement an agent with given states and implementations. This is used to set up an agent with its initial configuration and capabilities. */
  implementAgent: Agent;
  /** Interrupt the execution of a task. */
  interrupt: Task;
  /** Kick an agent to force disconnect. It will fail and not reconnect. */
  kick: Agent;
  /** Materialize a UI blok into a concrete instance on a dashboard. */
  materializeBlok: MaterializedBlok;
  /** Pause an ongoing task. */
  pause: Task;
  /** Pause a probe. Idempotent on finished probes; the agent's Paused report settles the state. */
  pauseProbe: Probe;
  /** Pin an agent to the user. */
  pinAgent: Agent;
  /** Pin an implementation to the user. */
  pinImplementation: Implementation;
  /** Fire a probe at an agent — zero persistence, redis-held state under a TTL, never appears in task history. For high-frequency interactive work (previews, live parameter tweaks). */
  probe: Probe;
  /** Register the components and operations a UI app can render and evaluate (upsert by name in the caller's organization). Bloks and definitions that name the catalog are validated against it. */
  registerUiCatalog: UiCatalog;
  /** Request temporary S3 read credentials for a media file */
  requestMediaAccess: MediaAccessGrant;
  /** Upload media and return a URL for access */
  requestMediaUpload: MediaUploadGrant;
  /** Resume a paused task. */
  resume: Task;
  /** Resume a paused probe. Idempotent on finished probes; the agent's Resumed report settles the state. */
  resumeProbe: Probe;
  /** Mark an implementation as a higher-order wrapper of a lower implementation, with a projection config. */
  setHigherOrder: Implementation;
  /** Shelve data into a memory drawer. */
  shelveInMemoryDrawer: MemoryDrawer;
  /** Run a schedule now: its waiting run is moved to now. Refused while a run is executing. */
  triggerSchedule: Task;
  /** Unblock a previously blocked agent. */
  unblock: Agent;
  /** Unshelve data from a memory drawer. */
  unshelveMemoryDrawer: Scalars['ID']['output'];
  /** Update properties of an agent such as its name. */
  updateAgent: Agent;
  /** Update properties of a blok such as its name, description, components, demo state, catalog, or dependencies. */
  updateBlok: Blok;
  /** Update properties of a dashboard such as its name, associated bloks, or organization. */
  updateDashboard: Dashboard;
  /** Update properties of a materialized blok such as its agent mappings. */
  updateMaterializedBlok: MaterializedBlok;
  /** Update an existing placement. */
  updatePlacement: Placement;
  /** Update an existing resolution. */
  updateResolution: Resolution;
  /** Change a schedule; a waiting run is re-planned. */
  updateSchedule: Schedule;
  /** Update an existing space. */
  updateSpace: Space;
  /** Update an existing 3D model. */
  updateThreedModel: ThreeDModel;
  /** Change a trigger. */
  updateTrigger: Trigger;
};


/** Root mutation type for executing write operations on the API. */
export type MutationAckArgs = {
  input: AckInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationAssignArgs = {
  input: AssignInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationAutoResolveArgs = {
  input: AutoResolveInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationBlockArgs = {
  input: BlockInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationBounceArgs = {
  input: BounceInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationCancelArgs = {
  input: CancelInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationCancelProbeArgs = {
  input: CancelProbeInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationCleanupActionsArgs = {
  actionIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};


/** Root mutation type for executing write operations on the API. */
export type MutationCollectArgs = {
  input: CollectInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationCreateBlokArgs = {
  input: CreateBlokInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationCreateDashboardArgs = {
  input: CreateDashboardInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationCreateImplementationArgs = {
  input: CreateImplementationInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationCreatePlacementArgs = {
  input: CreatePlacementInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationCreateResolutionArgs = {
  input: CreateResolutionInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationCreateScheduleArgs = {
  input: CreateScheduleInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationCreateShortcutArgs = {
  input: CreateShortcutInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationCreateSpaceArgs = {
  input: CreateSpaceInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationCreateTestCaseArgs = {
  input: CreateTestCaseInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationCreateTestResultArgs = {
  input: CreateTestResultInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationCreateThreedModelArgs = {
  input: CreateThreeDModelInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationCreateToolboxArgs = {
  input: CreateToolboxInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationCreateTriggerArgs = {
  input: CreateTriggerInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationDeleteAgentArgs = {
  input: DeleteAgentInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationDeleteBlokArgs = {
  input: DeleteBlokInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationDeleteDashboardArgs = {
  input: DeleteDashboardInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationDeleteImplementationArgs = {
  input: DeleteImplementationInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationDeleteMaterializedBlokArgs = {
  input: DeleteMaterializedBlokInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationDeletePlacementArgs = {
  input: DeletePlacementInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationDeleteResolutionArgs = {
  input: DeleteResolutionInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationDeleteScheduleArgs = {
  input: ScheduleIdInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationDeleteShortcutArgs = {
  input: DeleteShortcutInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationDeleteSpaceArgs = {
  input: DeleteSpaceInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationDeleteThreedModelArgs = {
  input: DeleteThreeDModelInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationDeleteToolboxArgs = {
  input: DeleteToolboxInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationDeleteTriggerArgs = {
  input: TriggerIdInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationEnsureAgentArgs = {
  input: AgentInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationFinishMediaUploadArgs = {
  input: FinishMediaUploadInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationImplementAgentArgs = {
  input: ImplementAgentInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationInterruptArgs = {
  input: InterruptInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationKickArgs = {
  input: KickInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationMaterializeBlokArgs = {
  input: MaterializeBlokInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationPauseArgs = {
  input: PauseInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationPauseProbeArgs = {
  input: PauseProbeInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationPinAgentArgs = {
  input: PinInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationPinImplementationArgs = {
  input: PinInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationProbeArgs = {
  input: ProbeInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationRegisterUiCatalogArgs = {
  input: RegisterUiCatalogInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationRequestMediaAccessArgs = {
  input: RequestMediaAccessInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationRequestMediaUploadArgs = {
  input: RequestMediaUploadInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationResumeArgs = {
  input: ResumeInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationResumeProbeArgs = {
  input: ResumeProbeInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationSetHigherOrderArgs = {
  input: SetHigherOrderInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationShelveInMemoryDrawerArgs = {
  input: ShelveInMemoryDrawerInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationTriggerScheduleArgs = {
  input: ScheduleIdInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationUnblockArgs = {
  input: UnblockInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationUnshelveMemoryDrawerArgs = {
  input: UnshelveMemoryDrawerInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationUpdateAgentArgs = {
  input: UpdateAgentInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationUpdateBlokArgs = {
  input: UpdateBlokInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationUpdateDashboardArgs = {
  input: UpdateDashboardInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationUpdateMaterializedBlokArgs = {
  input: UpdateMaterializedBlokInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationUpdatePlacementArgs = {
  input: UpdatePlacementInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationUpdateResolutionArgs = {
  input: UpdateResolutionInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationUpdateScheduleArgs = {
  input: UpdateScheduleInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationUpdateSpaceArgs = {
  input: UpdateSpaceInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationUpdateThreedModelArgs = {
  input: UpdateThreeDModelInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationUpdateTriggerArgs = {
  input: UpdateTriggerInput;
};

export type OffsetPaginationInput = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: Scalars['Int']['input'];
};

/**
 *  An optimistic is used to optimistically set state values when the action is assigned. This is used to provide a better user experience by optimistically setting state values when the action is assigned, instead of waiting for the action to be executed and the state to be updated. This will only ever happen on the frontend.
 *
 *
 */
export type OptimisticInput = {
  /** Static JSON pointer into the assignment args for the value to set; omitted: the whole args. */
  accessor?: InputMaybe<Scalars['String']['input']>;
  /** Static JSON pointer into the state value to set. Mutually exclusive with `path_call`. */
  path?: InputMaybe<Scalars['String']['input']>;
  /** Pure UtilCall returning the pointer dynamically; may reference `args` (the assignment arguments). Mutually exclusive with `path`. */
  pathCall?: InputMaybe<UtilCallInput>;
  /** The state to optimistically set when the action is assigned */
  state: Scalars['String']['input'];
};

export enum OptionKey {
  Description = 'DESCRIPTION',
  Label = 'LABEL',
  Logo = 'LOGO',
  Value = 'VALUE'
}

export enum Ordering {
  Asc = 'ASC',
  AscNullsFirst = 'ASC_NULLS_FIRST',
  AscNullsLast = 'ASC_NULLS_LAST',
  Desc = 'DESC',
  DescNullsFirst = 'DESC_NULLS_FIRST',
  DescNullsLast = 'DESC_NULLS_LAST'
}

/** Represents an organization in the system. */
export type Organization = {
  __typename?: 'Organization';
  /** Slug of the organization. */
  slug: Scalars['String']['output'];
};

export type ParamPair = {
  key: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type Patch = {
  __typename?: 'Patch';
  /** Global revision this patch applied to (global_rev - 1). */
  globalCurrentRevision: Scalars['Int']['output'];
  /** Global revision produced by this patch (global_rev). */
  globalFutureRevision: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  interface: Scalars['String']['output'];
  op: Scalars['String']['output'];
  patch: JsonPatch;
  path: Scalars['String']['output'];
  /** The session identifier string this row belongs to. */
  sessionId?: Maybe<Scalars['String']['output']>;
  state: State;
  task?: Maybe<Task>;
  timestamp: Scalars['DateTime']['output'];
  value: Scalars['Args']['output'];
};

/** The input for pausing a task. */
export type PauseInput = {
  /** The task ID to pause */
  task: Scalars['ID']['input'];
};

/** The input for pausing a probe. Idempotent: pausing a finished probe is a no-op. */
export type PauseProbeInput = {
  /** The probe ID to pause */
  probe: Scalars['ID']['input'];
};

/** The input for pinning an model. */
export type PinInput = {
  /** The unique identifier of the item to pin. */
  id: Scalars['ID']['input'];
  /** Boolean flag indicating whether to pin or unpin. */
  pin: Scalars['Boolean']['input'];
};

/** A placement of an agent in a space. */
export type Placement = {
  __typename?: 'Placement';
  affineMatrix?: Maybe<Scalars['Args']['output']>;
  agent: Agent;
  blok?: Maybe<MaterializedBlok>;
  id: Scalars['ID']['output'];
  model?: Maybe<ThreeDModel>;
  /** Get the agent associated with this placement. */
  name: Scalars['String']['output'];
  role: Scalars['String']['output'];
  space: Space;
};

/** A way to filter placements (space memberships) */
export type PlacementFilter = {
  AND?: InputMaybe<PlacementFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<PlacementFilter>;
  OR?: InputMaybe<PlacementFilter>;
  /** Filter by agent */
  agent?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by IDs */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Search by name */
  search?: InputMaybe<Scalars['String']['input']>;
  /** Filter by space */
  space?: InputMaybe<Scalars['ID']['input']>;
};

/** The input for creating or updating a placement. */
export type PlacementInput = {
  /** The affine matrix for the placement. This is used to identify the placement in the system. */
  affineMatrix?: InputMaybe<Array<Array<Scalars['Float']['input']>>>;
  /** The agent ID for the placement. This is used to identify the agent in the system. */
  agent?: InputMaybe<Scalars['ID']['input']>;
  /** A specific blok that should be used to visualize the state of the placement. */
  blok?: InputMaybe<Scalars['ID']['input']>;
  /** The 3D model ID for the placement. This is used to identify the 3D model in the system. */
  model?: InputMaybe<Scalars['ID']['input']>;
  /** The role of the placement. This is used to identify the placement in the system. */
  role?: InputMaybe<Scalars['String']['input']>;
};

export type PlacementOrder =
  { createdAt: Ordering; role?: never; }
  |  { createdAt?: never; role: Ordering; };

/** The input for creating a port demand. */
export type PortDemandInput = {
  /** Require that the action has a specific number of ports. This is used to identify the demand in the system. */
  forceLength?: InputMaybe<Scalars['Int']['input']>;
  /** Require that the action has a specific number of non-nullable ports. This is used to identify the demand in the system. */
  forceNonNullableLength?: InputMaybe<Scalars['Int']['input']>;
  /** Require that the action has a specific number of structure ports. This is used to identify the demand in the system. */
  forceStructureLength?: InputMaybe<Scalars['Int']['input']>;
  /** The kind of the demand. You can ask for args or returns */
  kind: DemandKind;
  /** The matches of the demand.  */
  matches?: InputMaybe<Array<PortMatchInput>>;
};

export type PortGroup = {
  __typename?: 'PortGroup';
  description?: Maybe<Scalars['String']['output']>;
  effects?: Maybe<Array<Effect>>;
  key: Scalars['String']['output'];
  ports: Array<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
};

/** A Port Group is a group of ports that are related to each other. It is used to group ports together in the UI and provide a better user experience. */
export type PortGroupInput = {
  /** The description of the port group, displayed in the UI */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The effects applied to the port group as a whole */
  effects?: InputMaybe<Array<EffectInput>>;
  /** The key of the port group. This is used to uniquely identify the port group */
  key: Scalars['String']['input'];
  /** The keys of the root arg ports in this group; a port belongs to at most one group */
  ports?: Array<Scalars['String']['input']>;
  /** The title of the port group, displayed in the UI */
  title?: InputMaybe<Scalars['String']['input']>;
};

/** The kind of a port: its structural type. Decides which of children, identifier and choices the port must, may or must not carry (see docs/design/ports.md). */
export enum PortKind {
  /** A boolean. No children. */
  Bool = 'BOOL',
  /** An ISO-8601 date or datetime string. No children. */
  Date = 'DATE',
  /** A string-keyed map. One child keyed '...' describes a homogeneous value type; several named children describe the known keys. */
  Dict = 'DICT',
  /** One of a fixed set of values; `choices` required. */
  Enum = 'ENUM',
  /** A floating point number. No children; choices optional. */
  Float = 'FLOAT',
  /** An integer. No children; choices optional. */
  Int = 'INT',
  /** A reference to any object implementing an interface, typed by `identifier` (required). No children. */
  Interface = 'INTERFACE',
  /** A list; exactly one child describes the item type (conventionally keyed '...'). */
  List = 'LIST',
  /** A reference to an object that lives in the agent's memory, typed by `identifier` (required). Makes the action LOCAL-scoped. No children. */
  MemoryStructure = 'MEMORY_STRUCTURE',
  /** An object with named fields; at least one child per field, `identifier` optional. */
  Model = 'MODEL',
  /** A physical quantity with a unit; `reference_unit` required, `dimension` derived. No children. */
  Quantity = 'QUANTITY',
  /** A string. No children; choices optional. */
  String = 'STRING',
  /** A reference to an object held by a service, typed by `identifier` (@package/key, required). Values are ids. No children. */
  Structure = 'STRUCTURE',
  /** One of several variants; at least two children, each a variant. */
  Union = 'UNION'
}

export type PortMatch = {
  __typename?: 'PortMatch';
  at?: Maybe<Scalars['Int']['output']>;
  children?: Maybe<Array<PortMatch>>;
  dimension?: Maybe<Scalars['String']['output']>;
  identifier?: Maybe<Scalars['String']['output']>;
  key?: Maybe<Scalars['String']['output']>;
  kind?: Maybe<PortKind>;
  nullable?: Maybe<Scalars['Boolean']['output']>;
};

/**
 * A structural (and optionally object-level) match against a port. Purely
 *     structural fields target the port shape; the optional ``descriptors`` carry a concrete
 *     runtime object's key/value pairs, evaluated against the port's compiled requires
 *     micro-constraint to find actions the object can actually be passed to.
 */
export type PortMatchInput = {
  /** The index of the port to match. */
  at?: InputMaybe<Scalars['Int']['input']>;
  /** The matches for the children of the port to match. */
  children?: InputMaybe<Array<PortMatchInput>>;
  /** Runtime descriptors of a candidate object, evaluated against the port's compiled requires micro-constraint. Omit for purely structural matching. */
  descriptors?: InputMaybe<Array<DescriptorInput>>;
  /** The canonical pint dimensionality the port must have (QUANTITY wiring-compatibility key). */
  dimension?: InputMaybe<Scalars['String']['input']>;
  /** The identifier of the port to match. */
  identifier?: InputMaybe<Scalars['String']['input']>;
  /** The key of the port to match. */
  key?: InputMaybe<Scalars['String']['input']>;
  /** The kind of the port to match. */
  kind?: InputMaybe<PortKind>;
  /** Whether the port is nullable. */
  nullable?: InputMaybe<Scalars['Boolean']['input']>;
};

/** A usage of a structure or interface by an action's port, derived from the relational port rows. */
export type PortUsage = {
  __typename?: 'PortUsage';
  action: Action;
  /** The index of the root port this usage sits under. */
  index: Scalars['Int']['output'];
  /** The full dot-notation path of the using port, e.g. 'masks.mask'. */
  keyPath: Scalars['String']['output'];
  /** Container nesting between the root port and the using port, e.g. ['dict', 'list']. */
  modifiers: Array<Scalars['String']['output']>;
  /** The key of the root port this usage sits under. */
  portKey: Scalars['String']['output'];
};

/** A probe — a zero-persistence invocation. Redis-held under a TTL; never appears in task history. */
export type Probe = {
  __typename?: 'Probe';
  /** The called action. */
  action: Scalars['ID']['output'];
  /** The agent executing this probe. */
  agent: Scalars['ID']['output'];
  /** When the probe was created. */
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  /** The terminal error, if the probe failed. */
  error?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** The resolved implementation. */
  implementation: Scalars['ID']['output'];
  /** The implementation interface the agent runs. */
  interface: Scalars['String']['output'];
  /** Whether the probe reached a terminal state. */
  isDone: Scalars['Boolean']['output'];
  /** Kind of the latest event. */
  kind: TaskEventKind;
  /** The caller-side reference, if any. */
  reference?: Maybe<Scalars['String']['output']>;
  /** The latest YIELD payload, if any. */
  returns?: Maybe<Scalars['AnyDefault']['output']>;
  /** Per-probe monotonic sequence of the latest event. */
  seq: Scalars['Int']['output'];
};

/** A single event of a probe, relayed payload-carrying (no lookups). `seq` orders the stream. */
export type ProbeEvent = {
  __typename?: 'ProbeEvent';
  createdAt: Scalars['DateTime']['output'];
  kind: TaskEventKind;
  message?: Maybe<Scalars['String']['output']>;
  probe: Scalars['ID']['output'];
  progress?: Maybe<Scalars['Int']['output']>;
  returns?: Maybe<Scalars['AnyDefault']['output']>;
  seq: Scalars['Int']['output'];
};

/** The input for a probe — a zero-persistence invocation. */
export type ProbeInput = {
  /** The action ID to probe */
  action?: InputMaybe<Scalars['ID']['input']>;
  /** The hash of the action to probe */
  actionHash?: InputMaybe<Scalars['ActionHash']['input']>;
  /** The args of the probe. A dictionary of ports and values */
  args: Scalars['Args']['input'];
  /** The implementation ID to probe directly */
  implementation?: InputMaybe<Scalars['ID']['input']>;
  /** An optional caller-side reference echoed to the agent */
  reference?: InputMaybe<Scalars['String']['input']>;
};

/** Live probe counts from redis — probes have no rows, so stats come from the TTL keyspace. */
export type ProbeStats = {
  __typename?: 'ProbeStats';
  /** The per-caller in-flight cap (PROBE_MAX_INFLIGHT_PER_CALLER). */
  maxInflight: Scalars['Int']['output'];
  /** The requesting caller's in-flight probes. */
  myInflight: Scalars['Int']['output'];
  /** Live (non-expired) probes across the whole instance — a bare count, not scoped. */
  totalLive: Scalars['Int']['output'];
};

/** A set of related actions forming a protocol. */
export type Protocol = {
  __typename?: 'Protocol';
  /** Associated actions. */
  actions: Array<Action>;
  /** Protocol ID. */
  id: Scalars['ID']['output'];
  /** Name of the protocol. */
  name: Scalars['String']['output'];
};


/** A set of related actions forming a protocol. */
export type ProtocolActionsArgs = {
  filters?: InputMaybe<ActionFilter>;
  ordering?: Array<ActionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type ProtocolFilter = {
  AND?: InputMaybe<ProtocolFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ProtocolFilter>;
  OR?: InputMaybe<ProtocolFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  name?: InputMaybe<StrFilterLookup>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type ProtocolOrder =
  { name: Ordering; };

export type Provides = {
  __typename?: 'Provides';
  key: Scalars['String']['output'];
  operator: DescriptorOperator;
  value?: Maybe<Scalars['Arg']['output']>;
};

export type ProvidesInput = {
  /** The key of the provision: the descriptor name the constraint reads, matched verbatim as one flat key of the candidate object (any non-empty string, e.g. 'axes' or '@mikro/n_space_axes') */
  key: Scalars['String']['input'];
  /** The operator for the provision */
  operator: DescriptorOperator;
  /** The value of the provision. This can be any JSON serializable value; IN/NOT_IN take a list, LTE/GTE a number, EXISTS none */
  value?: InputMaybe<Scalars['Arg']['input']>;
};

/** Delegates the port to a port of another action. */
export type ProxyAssignWidgetInput = {
  /** Port path of another port whose value this widget follows and mirrors. */
  followValue?: InputMaybe<Scalars['String']['input']>;
  /** Which member of AssignWidgetInput this is. */
  kind: AssignWidgetKind;
  /** The action to target: an action-dependency key of `target_dependency` when that is set. */
  targetAction: Scalars['String']['input'];
  /** The agent dependency (by key) that provides the targeted action; omitted: the implementing agent itself. */
  targetDependency?: InputMaybe<Scalars['String']['input']>;
  /** The port key on the targeted action. */
  targetPort: Scalars['String']['input'];
};

export type ProxyWidget = AssignWidget & {
  __typename?: 'ProxyWidget';
  followValue?: Maybe<Scalars['String']['output']>;
  kind: AssignWidgetKind;
  targetAction: Scalars['String']['output'];
  targetDependency?: Maybe<Scalars['String']['output']>;
  targetPort: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  _entities: Array<Maybe<_Entity>>;
  _service: _Service;
  /** Fetch a specific action. */
  action: Action;
  /** Statistics about actions and their implementations. */
  actionStats: ActionStats;
  /** List of all available actions. */
  actions: Array<Action>;
  /** Fetch a specific agent by ID or by app, version and device_id. */
  agent: Agent;
  /** Retrieve all compute agents. */
  agents: Array<Agent>;
  /** The built-in base catalog every definition and blok is validated against before any registered UI catalog (virtual: shipped with the server, not registered). */
  baseCatalog: BaseCatalog;
  /** Get a blok by ID. */
  blok: Blok;
  /** List of UI Blok. */
  bloks: Array<Blok>;
  /** Materialize the latest state for a specific agent */
  checkout: StateValue;
  /** Materialize the latest states for a specific agent */
  checkoutAgent: AgentWithValues;
  /** List all registered clients. */
  clients: Array<Client>;
  /** Get dashboard by ID. */
  dashboard: Dashboard;
  /** All dashboards. */
  dashboards: Array<Dashboard>;
  /** Fetch a dependency by ID. */
  dependency: Dependency;
  /** Fetch a specific event. */
  event: TaskEvent;
  /** Get forward events after revision. */
  forwardEventsAfterRev: Array<Patch>;
  /** Get hardware record by ID. */
  hardwareRecord: HardwareRecord;
  /** List of all hardware records. */
  hardwareRecords: Array<HardwareRecord>;
  /** Get implementation by ID. */
  implementation: Implementation;
  /** Find implementation at given interface. */
  implementationAt: Implementation;
  /** All registered implementations. */
  implementations: Array<Implementation>;
  /** Fetch an interface by its '@package/key' identifier (derived from port identifiers). */
  interface: Interface;
  /** All interfaces referenced by the org's action ports (derived, not registered). */
  interfaces: Array<Interface>;
  /** Get a materialized blok by ID. */
  materializedBlok: MaterializedBlok;
  /** List of UI Blok. */
  materializedBloks: Array<MaterializedBlok>;
  /** Fetch a memory drawer by ID. */
  memoryDrawer: MemoryDrawer;
  /** All memory drawers. */
  memoryDrawers: Array<MemoryDrawer>;
  /** Fetch a memory shelve by ID. */
  memoryShelve: MemoryShelve;
  /** All memory shelves. */
  memoryShelves: Array<MemoryShelve>;
  /** Find your implementation at a specific interface. */
  myImplementationAt: Implementation;
  /** Fetch the root tasks this client created (caller-scoped). */
  myTasks: Array<Task>;
  /** Get patch events between global revisions. */
  patchEventsBetweenGlobalRevs: Array<Patch>;
  /** Fetch a specific placement by ID. */
  placement: Placement;
  /** List all placements. */
  placements: Array<Placement>;
  /** Fetch a live (or lingering) probe by ID. Expired probes are gone — probes are never persisted. */
  probe: Probe;
  /** Live probe counts: instance-wide total plus your in-flight count and cap. */
  probeStats: ProbeStats;
  /** Retrieve protocols grouping actions. */
  protocols: Array<Protocol>;
  /** Fetch a client by ID. */
  resolution: Resolution;
  /** All resolutions. */
  resolutions: Array<Resolution>;
  /** Fetch resolved dependencies for a resolution. */
  resolvedImplementations: Array<Implementation>;
  /** The latest completed run of a PURE action with these exact args, or null — the replay primitive. Reuse decisions belong to the orchestrator. */
  reusableTaskFor?: Maybe<Task>;
  /** Fetch a schedule by ID. */
  schedule: Schedule;
  /** All schedules in the organization. */
  schedules: Array<Schedule>;
  /** Fetch a specific session by ID. */
  session: Session;
  /** Get session boundaries. */
  sessionBoundaries?: Maybe<SessionBoundary>;
  /** List all sessions. */
  sessions: Array<Session>;
  /** Retrieve shortcut by ID. */
  shortcut: Shortcut;
  /** List of shortcuts. */
  shortcuts: Array<Shortcut>;
  /** The signals this hub's services declare they emit — what triggers can wait for. Hub-wide. */
  signalDeclarations: Array<SignalDeclaration>;
  /** Signals services sent about the organization's objects, for inspection. */
  signals: Array<Signal>;
  /** Actions whose name and description mean roughly what this action's do, nearest first: the org's other actions ranked by cosine distance between their embeddings. `filters` narrows the candidates like `actions` does; `maxDistance` (0 identical, 1 unrelated) cuts the tail, otherwise the nearest `limit` come back. Empty while the action has no vector yet or embeddings are off. */
  similarActions: Array<Action>;
  /** Get snapshots around revision. */
  snapshotsAroundRev: Array<Snapshot>;
  /** Fetch a specific space by ID. */
  space: Space;
  /** List all spaces. */
  spaces: Array<Space>;
  /** Get a specific state by ID. */
  state: State;
  /** Get state at global revision. */
  stateAtGlobalRev: Array<Snapshot>;
  /** Retrieve a state definition by ID. */
  stateDefinition: StateDefinition;
  /** Available state schemas. */
  stateDefinitions: Array<StateDefinition>;
  /** Retrieve state for a specific context. */
  stateFor: State;
  /** All states from agents. */
  states: Array<State>;
  /** Fetch a structure by its '@package/key' identifier (derived from port identifiers). */
  structure: Structure;
  /** Fetch a structure package by its key (derived from port identifiers). */
  structurePackage: StructurePackage;
  /** All structure packages referenced by the org's action ports (derived, not registered). */
  structurePackages: Array<StructurePackage>;
  /** All structures referenced by the org's action ports (derived, not registered). */
  structures: Array<Structure>;
  /** Fetch task by ID. */
  task: Task;
  /** Get task boundaries. */
  taskBoundaries?: Maybe<TaskBoundary>;
  /** Statistics about tasks and their states. */
  taskStats: TaskStats;
  /** All tasks. */
  tasks: Array<Task>;
  /** Retrieve test case by ID. */
  testCase: TestCase;
  /** All test cases. */
  testCases: Array<TestCase>;
  /** Get test result by ID. */
  testResult: TestResult;
  /** Test results associated with test cases. */
  testResults: Array<TestResult>;
  /** Fetch a specific 3D model by ID. */
  threedModel: ThreeDModel;
  /** List all 3D models. */
  threedModels: Array<ThreeDModel>;
  /** Get toolbox by ID. */
  toolbox: Toolbox;
  /** List of toolboxes containing shortcuts. */
  toolboxes: Array<Toolbox>;
  /** Fetch a trigger by ID. */
  trigger: Trigger;
  /** All triggers in the organization. */
  triggers: Array<Trigger>;
  /** Get a UI catalog by ID. */
  uiCatalog: UiCatalog;
  /** UI catalogs registered in the caller's organization: the components and operations UI apps can render and evaluate. */
  uiCatalogs: Array<UiCatalog>;
};


export type Query_EntitiesArgs = {
  representations: Array<Scalars['_Any']['input']>;
};


export type QueryActionArgs = {
  agent?: InputMaybe<Scalars['ID']['input']>;
  hash?: InputMaybe<Scalars['ActionHash']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  implementation?: InputMaybe<Scalars['ID']['input']>;
  interface?: InputMaybe<Scalars['String']['input']>;
  matching?: InputMaybe<ActionDemandInput>;
  task?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryActionStatsArgs = {
  filters?: InputMaybe<ActionFilter>;
};


export type QueryActionsArgs = {
  filters?: InputMaybe<ActionFilter>;
  ordering?: Array<ActionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryAgentArgs = {
  app?: InputMaybe<Scalars['String']['input']>;
  deviceId?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  version?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAgentsArgs = {
  filters?: InputMaybe<AgentFilter>;
  ordering?: Array<AgentOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryBlokArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCheckoutArgs = {
  backwardPatchCount?: Scalars['Int']['input'];
  forwardPatchCount?: Scalars['Int']['input'];
  globalRevision?: InputMaybe<Scalars['Int']['input']>;
  sessionId?: InputMaybe<Scalars['ID']['input']>;
  state: Scalars['ID']['input'];
  timestamp?: InputMaybe<Scalars['DateTime']['input']>;
};


export type QueryCheckoutAgentArgs = {
  agent: Scalars['ID']['input'];
  backwardPatchCount?: Scalars['Int']['input'];
  forwardPatchCount?: Scalars['Int']['input'];
  globalRevision?: InputMaybe<Scalars['Int']['input']>;
  sessionId?: InputMaybe<Scalars['ID']['input']>;
  timestamp?: InputMaybe<Scalars['DateTime']['input']>;
};


export type QueryClientsArgs = {
  filters?: InputMaybe<ClientFilter>;
  ordering?: Array<ClientOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryDashboardArgs = {
  id: Scalars['ID']['input'];
};


export type QueryDependencyArgs = {
  id: Scalars['ID']['input'];
};


export type QueryEventArgs = {
  id: Scalars['ID']['input'];
};


export type QueryForwardEventsAfterRevArgs = {
  count?: Scalars['Int']['input'];
  globalRevision: Scalars['Int']['input'];
  sessionId?: InputMaybe<Scalars['String']['input']>;
  stateId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryHardwareRecordArgs = {
  id: Scalars['ID']['input'];
};


export type QueryHardwareRecordsArgs = {
  filters?: InputMaybe<HardwareRecordFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryImplementationArgs = {
  id: Scalars['ID']['input'];
};


export type QueryImplementationAtArgs = {
  actionHash?: InputMaybe<Scalars['String']['input']>;
  agent: Scalars['ID']['input'];
  demand?: InputMaybe<ActionDemandInput>;
  interface?: InputMaybe<Scalars['String']['input']>;
};


export type QueryImplementationsArgs = {
  filters?: InputMaybe<ImplementationFilter>;
  ordering?: Array<ImplementationOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryInterfaceArgs = {
  identifier: Scalars['ID']['input'];
};


export type QueryInterfacesArgs = {
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMaterializedBlokArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMaterializedBloksArgs = {
  filters?: InputMaybe<MaterializedBlokFilter>;
  ordering?: Array<MaterializedBlokOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryMemoryDrawerArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMemoryDrawersArgs = {
  filters?: InputMaybe<MemoryDrawerFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryMemoryShelveArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMemoryShelvesArgs = {
  filters?: InputMaybe<MemoryShelveFilter>;
  ordering?: Array<MemoryShelveOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryMyImplementationAtArgs = {
  actionId?: InputMaybe<Scalars['ID']['input']>;
  interface?: InputMaybe<Scalars['String']['input']>;
};


export type QueryPatchEventsBetweenGlobalRevsArgs = {
  fromGlobalRevision: Scalars['Int']['input'];
  sessionId?: InputMaybe<Scalars['String']['input']>;
  stateIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  toGlobalRevision: Scalars['Int']['input'];
};


export type QueryPlacementArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPlacementsArgs = {
  filters?: InputMaybe<PlacementFilter>;
  ordering?: Array<PlacementOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryProbeArgs = {
  id: Scalars['ID']['input'];
};


export type QueryProtocolsArgs = {
  filters?: InputMaybe<ProtocolFilter>;
  ordering?: Array<ProtocolOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryResolutionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryResolutionsArgs = {
  filters?: InputMaybe<ResolutionFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryResolvedImplementationsArgs = {
  dependencyKey?: InputMaybe<Scalars['String']['input']>;
  methodKey?: InputMaybe<Scalars['String']['input']>;
  resolution: Scalars['ID']['input'];
};


export type QueryReusableTaskForArgs = {
  actionHash: Scalars['String']['input'];
  args: Scalars['Args']['input'];
};


export type QueryScheduleArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySchedulesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QuerySessionArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySessionBoundariesArgs = {
  sessionId: Scalars['ID']['input'];
  stateId?: InputMaybe<Scalars['ID']['input']>;
};


export type QuerySessionsArgs = {
  filters?: InputMaybe<SessionFilter>;
  ordering?: Array<SessionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryShortcutArgs = {
  id: Scalars['ID']['input'];
};


export type QueryShortcutsArgs = {
  filters?: InputMaybe<ShortcutFilter>;
  ordering?: Array<ShortcutOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QuerySignalDeclarationsArgs = {
  identifier?: InputMaybe<Scalars['String']['input']>;
};


export type QuerySignalsArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QuerySimilarActionsArgs = {
  action: Scalars['ID']['input'];
  filters?: InputMaybe<ActionFilter>;
  limit?: Scalars['Int']['input'];
  maxDistance?: InputMaybe<Scalars['Float']['input']>;
};


export type QuerySnapshotsAroundRevArgs = {
  after?: Scalars['Int']['input'];
  before?: Scalars['Int']['input'];
  revision: Scalars['Int']['input'];
  sessionId?: InputMaybe<Scalars['String']['input']>;
  stateId?: InputMaybe<Scalars['ID']['input']>;
};


export type QuerySpaceArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySpacesArgs = {
  filters?: InputMaybe<SpaceFilter>;
  ordering?: Array<SpaceOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryStateArgs = {
  id: Scalars['ID']['input'];
};


export type QueryStateAtGlobalRevArgs = {
  globalRevision: Scalars['Int']['input'];
  sessionId?: InputMaybe<Scalars['String']['input']>;
  stateId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryStateDefinitionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryStateForArgs = {
  agent: Scalars['ID']['input'];
  demand?: InputMaybe<StateDemandInput>;
  stateHash?: InputMaybe<Scalars['String']['input']>;
};


export type QueryStructureArgs = {
  identifier: Scalars['ID']['input'];
};


export type QueryStructurePackageArgs = {
  key: Scalars['ID']['input'];
};


export type QueryStructurePackagesArgs = {
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryStructuresArgs = {
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryTaskArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTaskBoundariesArgs = {
  correlationId: Scalars['String']['input'];
  stateId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryTaskStatsArgs = {
  filters?: InputMaybe<TaskFilter>;
};


export type QueryTasksArgs = {
  filters?: InputMaybe<TaskFilter>;
  ordering?: Array<TaskOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryTestCaseArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTestCasesArgs = {
  filters?: InputMaybe<TestCaseFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryTestResultArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTestResultsArgs = {
  filters?: InputMaybe<TestResultFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryThreedModelArgs = {
  id: Scalars['ID']['input'];
};


export type QueryThreedModelsArgs = {
  filters?: InputMaybe<ThreeDModelFilter>;
  ordering?: Array<ThreeDModelOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryToolboxArgs = {
  id: Scalars['ID']['input'];
};


export type QueryToolboxesArgs = {
  filters?: InputMaybe<ToolboxFilter>;
  ordering?: Array<ToolboxOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryTriggerArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTriggersArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryUiCatalogArgs = {
  id: Scalars['ID']['input'];
};

/** Register (upsert by name, scoped to the caller's organization) the components and operations a UI app can render and evaluate. */
export type RegisterUiCatalogInput = {
  /** The components this catalog can render. */
  components?: Array<CatalogComponentInput>;
  /** Human-readable description of the catalog. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The catalog name. Bloks and definitions reference it by this name; registering again replaces the previous components and operations. */
  name: Scalars['String']['input'];
  /** The pure operations this catalog can evaluate for UtilCalls. */
  operations?: Array<CatalogOperationInput>;
  /** Default widgets per port kind and/or structure identifier. A UI renders them for ports that declare no widget; an identifier match beats a kind match. Each widget is validated against this catalog plus base at registration. */
  widgetDefaults?: Array<WidgetDefaultInput>;
};

/** Profile information for a user. */
export type Release = {
  __typename?: 'Release';
  /** The app this release belongs to. */
  app: App;
  /** Unique ID of the release. */
  id: Scalars['ID']['output'];
  /** Version string of the release. */
  version: Scalars['String']['output'];
};

export type RequestMediaAccessInput = {
  storeId: Scalars['String']['input'];
};

export type RequestMediaUploadInput = {
  contentType?: InputMaybe<Scalars['String']['input']>;
  fileSize?: InputMaybe<Scalars['Int']['input']>;
  originalFileName: Scalars['String']['input'];
};

export type Requires = {
  __typename?: 'Requires';
  key: Scalars['String']['output'];
  operator: DescriptorOperator;
  value?: Maybe<Scalars['Arg']['output']>;
};

export type RequiresInput = {
  /** The key of the requirement: the descriptor name the constraint reads, matched verbatim as one flat key of the candidate object (any non-empty string, e.g. 'axes' or '@mikro/n_space_axes') */
  key: Scalars['String']['input'];
  /** The operator for the requirement */
  operator: DescriptorOperator;
  /** The value of the requirement. This can be any JSON serializable value; IN/NOT_IN take a list, LTE/GTE a number, EXISTS none */
  value?: InputMaybe<Scalars['Arg']['input']>;
};

/** Represents a resolution for a blok. */
export type Resolution = {
  __typename?: 'Resolution';
  /** User who created the resolution. */
  creator: User;
  /** Unique ID of the resolution. */
  id: Scalars['ID']['output'];
  implementation: Implementation;
  /** Name of the resolution. */
  name: Scalars['String']['output'];
  /** Organization that owns this resolution. */
  organization: Organization;
  /** Timestamp when the resolution was created. */
  resolvedAt: Scalars['DateTime']['output'];
  /** List of resolved dependencies for this resolution. */
  resolvedDependencies: Array<ResolvedDependency>;
};


/** Represents a resolution for a blok. */
export type ResolutionResolvedDependenciesArgs = {
  filters?: InputMaybe<ResolvedDependencyFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** A way to filter test cases */
export type ResolutionFilter = {
  AND?: InputMaybe<ResolutionFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ResolutionFilter>;
  OR?: InputMaybe<ResolutionFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  name?: InputMaybe<StrFilterLookup>;
};

export type ResolvedAgentDependency = {
  __typename?: 'ResolvedAgentDependency';
  /** Get the key of the resolved dependency. */
  key: Scalars['String']['output'];
  /** Get a specific argument by key. */
  mappedAgents: Array<AgentMapping>;
  /** Get a specific argument by key. */
  values?: Maybe<Scalars['String']['output']>;
};

/** Represents a dependency that has been resolved to a specific implementation. */
export type ResolvedDependency = {
  __typename?: 'ResolvedDependency';
  /** The original dependency. */
  dependency: Dependency;
  /** Resolution for streaming data down to this dependency. */
  downStreamResolution?: Maybe<Resolution>;
  /** Unique ID of the resolved dependency. */
  id: Scalars['ID']['output'];
  /** The implementation that resolves the dependency. */
  implementation: Implementation;
  /** The key of the resolved dependency. */
  key: Scalars['String']['output'];
  /** The resolution key associated with this resolved dependency. */
  resolutionKey: Scalars['String']['output'];
};

/** A way to filter resolved dependencies */
export type ResolvedDependencyFilter = {
  AND?: InputMaybe<ResolvedDependencyFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ResolvedDependencyFilter>;
  OR?: InputMaybe<ResolvedDependencyFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
};

/** The input for mapping dependencies to implementations in a agent. */
export type ResolvedDependencyInput = {
  /** Whether this dependency should be automatically resolved by the system. If true, the system will attempt to find a agent that can resolve this dependency and assign it to the action when the action is assigned. This is used to enable automatic resolution of dependencies without requiring the user to specify a specific agent for the dependency. */
  autoResolve?: Scalars['Boolean']['input'];
  /** The key of the dependency to map. This is used to identify the dependency in the system. */
  key: Scalars['String']['input'];
  /** The list of mapped agents to map to implementations in agents. This is used to identify the mapped agents in the system. */
  mappedAgents: Array<MappedAgentInput>;
};

/** The input for resuming a task. */
export type ResumeInput = {
  /** Resume only until the next breakpoint instead of running on freely. */
  step?: Scalars['Boolean']['input'];
  /** The task ID to resume */
  task: Scalars['ID']['input'];
};

/** The input for resuming a paused probe. Idempotent: resuming a finished probe is a no-op. */
export type ResumeProbeInput = {
  /** The probe ID to resume */
  probe: Scalars['ID']['input'];
};

export type ReturnPort = {
  __typename?: 'ReturnPort';
  children?: Maybe<Array<ReturnPort>>;
  choices?: Maybe<Array<Choice>>;
  description?: Maybe<Scalars['String']['output']>;
  dimension?: Maybe<Scalars['String']['output']>;
  effects?: Maybe<Array<Effect>>;
  identifier?: Maybe<Scalars['Identifier']['output']>;
  key: Scalars['String']['output'];
  kind: PortKind;
  label?: Maybe<Scalars['String']['output']>;
  nullable: Scalars['Boolean']['output'];
  proposedUnits?: Maybe<Array<Scalars['String']['output']>>;
  provides?: Maybe<Array<Provides>>;
  referenceUnit?: Maybe<Scalars['String']['output']>;
  widget?: Maybe<ReturnWidget>;
};

/**
 * A Port is a single input or output of an action, identified by its `key` and typed by its `kind`.
 *
 *     STRUCTURE, MEMORY_STRUCTURE and INTERFACE ports carry an `identifier` of the form `@package/key`
 *     (e.g. `@mikro/image`); ports with the same identifier are compatible. LIST and DICT ports have one
 *     child (the item type), UNION ports two or more (the variants), MODEL ports one per field. ENUM ports
 *     declare `choices`. See docs/design/ports.md for the full table.
 *
 */
export type ReturnPortInput = {
  /** The child ports (used for list, dict, union and model ports). */
  children?: InputMaybe<Array<ReturnPortInput>>;
  /** The values the port accepts (required for ENUM; optional for INT, FLOAT, STRING). Rendered by CHOICE widgets. */
  choices?: InputMaybe<Array<ChoiceInput>>;
  /** The description of the port. This is the text that is displayed in the UI when the user hovers over the port */
  description?: InputMaybe<Scalars['String']['input']>;
  /** For QUANTITY ports: the pint dimensionality string, e.g. "[mass] * [length] ** 2 / [time] ** 3 / [current]". This is the wiring-compatibility key between quantity ports. */
  dimension?: InputMaybe<Scalars['String']['input']>;
  /** The effects of the port */
  effects?: InputMaybe<Array<EffectInput>>;
  /** The identifier of the port's type, of the form @package/key. Required for STRUCTURE, MEMORY_STRUCTURE and INTERFACE, where it is the only identity a value has; optional for MODEL and ENUM, where it names the class or enum the port was built from so that agents can map a value back to it. */
  identifier?: InputMaybe<Scalars['String']['input']>;
  /** The key of the port: unique among its siblings, free of '..', not 'value'. LIST/DICT item ports are conventionally keyed '...'. */
  key: Scalars['String']['input'];
  /** The kind of the port. This is the type of the port. Can be either int, string, structure, list, bool, dict, float, date, union or model */
  kind: PortKind;
  /** The label of the port. This is the text that is displayed in the UI */
  label?: InputMaybe<Scalars['String']['input']>;
  /** Whether the port is nullable or not. If the port is nullable, it can be set to null. If the port is not nullable, it cannot be set to null */
  nullable?: Scalars['Boolean']['input'];
  /** For QUANTITY ports: units offered as a dropdown in the UI, e.g. ["pF", "nF", "uF"]. Proposals only — any unit of the same dimension remains valid input. */
  proposedUnits?: InputMaybe<Array<Scalars['String']['input']>>;
  /** The provisions for the port. Provisions are key-value pairs that can be used to add additional metadata to a port. When using rekuest's action search, you can filter actions based on their port provisions */
  provides?: InputMaybe<Array<ProvidesInput>>;
  /** For QUANTITY ports: the canonical/reference unit of the physical quantity, e.g. "volt" or "farad". It is the default selection and the key used to resolve the concrete quantity type; other units of the same dimension are still allowed. */
  referenceUnit?: InputMaybe<Scalars['String']['input']>;
  /** The return widget to use for this port, discriminated by `kind`. */
  widget?: InputMaybe<ReturnWidgetInput>;
};

export type ReturnWidget = {
  kind: ReturnWidgetKind;
};

/** A return widget: the UI element used to display a port's value, as a discriminated union over `kind`. Only the fields of the chosen kind may be set; see the `*ReturnWidgetInput` members. */
export type ReturnWidgetInput = {
  /** (CUSTOM) The catalog component to render. The returned value is in scope as the reserved root `value`. */
  component?: InputMaybe<Scalars['String']['input']>;
  /** Which kind of return widget this is; decides which other fields are read. */
  kind: ReturnWidgetKind;
  /** (CUSTOM) Props of the component; value_paths may only reference `value`, agent calls are not allowed. */
  props?: InputMaybe<Array<ComponentPropInput>>;
};

/** The kind of return widget. */
export enum ReturnWidgetKind {
  Choice = 'CHOICE',
  Custom = 'CUSTOM'
}

/** A recurring assignment of one action. It owns at most one open run at a time: the next one, a delayed task created once the previous run finished. */
export type Schedule = {
  __typename?: 'Schedule';
  /** The action every run assigns. */
  action: Action;
  /** The agent every run is pinned to, if any. */
  agent?: Maybe<Agent>;
  /** The args every run is assigned with. */
  args: Scalars['AnyDefault']['output'];
  /** The identity every run is assigned as. */
  caller: Caller;
  /** Runs in a row that ended FAILED or CRITICAL. */
  consecutiveFailures: Scalars['Int']['output'];
  /** Creation timestamp. */
  createdAt: Scalars['DateTime']['output'];
  /** A five-field cron line, read in `timezone` (exclusive with intervalSeconds). */
  cron?: Maybe<Scalars['String']['output']>;
  /** A disabled schedule creates no runs. */
  enabled: Scalars['Boolean']['output'];
  /** Whether runs are created as ephemeral tasks. */
  ephemeralRuns: Scalars['Boolean']['output'];
  /** Unique ID of the schedule. */
  id: Scalars['ID']['output'];
  /** The implementation interface on the pinned agent. */
  interface?: Maybe<Scalars['String']['output']>;
  /** Run every N seconds (exclusive with cron). */
  intervalSeconds?: Maybe<Scalars['Int']['output']>;
  /** Why the last run failed, or why the next one could not be created. */
  lastError?: Maybe<Scalars['String']['output']>;
  /** Human-readable name. */
  name: Scalars['String']['output'];
  /** The open run: waiting for its slot, or executing. Null while the next run is being planned, or when disabled. */
  nextRun?: Maybe<Task>;
  /** The most recent runs, newest first. */
  runs: Array<Task>;
  /** The IANA zone the cron line is read in. */
  timezone: Scalars['String']['output'];
  /** Last update timestamp. */
  updatedAt: Scalars['DateTime']['output'];
};


/** A recurring assignment of one action. It owns at most one open run at a time: the next one, a delayed task created once the previous run finished. */
export type ScheduleRunsArgs = {
  limit?: Scalars['Int']['input'];
};

/** Identify a schedule. */
export type ScheduleIdInput = {
  id: Scalars['ID']['input'];
};

export type SearchAssignWidget = AssignWidget & {
  __typename?: 'SearchAssignWidget';
  dependencies?: Maybe<Array<Scalars['String']['output']>>;
  filters?: Maybe<Array<ArgPort>>;
  followValue?: Maybe<Scalars['String']['output']>;
  kind: AssignWidgetKind;
  placeholder?: Maybe<Scalars['String']['output']>;
  query: Scalars['String']['output'];
  ward: Scalars['String']['output'];
};

/** A search over a ward for STRUCTURE ports (or lists of them). */
export type SearchAssignWidgetInput = {
  /** The other ports (port paths, `..` traverses children) whose values the query may reference. */
  dependencies?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Filter ports whose values are passed to the query as variables named by their keys. */
  filters?: InputMaybe<Array<ArgPortInput>>;
  /** Port path of another port whose value this widget follows and mirrors. */
  followValue?: InputMaybe<Scalars['String']['input']>;
  /** Which member of AssignWidgetInput this is. */
  kind: AssignWidgetKind;
  /** The placeholder text. */
  placeholder?: InputMaybe<Scalars['String']['input']>;
  /** The GraphQL query the ward executes to populate the choices. Must be a single `query` operation declaring `$search: String` and `$values: [ID!]`, plus one variable per filter port key. */
  query: Scalars['SearchQuery']['input'];
  /** The ward (service) that executes the query. */
  ward: Scalars['String']['input'];
};

/** A session representing a continuous interaction of an agent with the system. */
export type Session = {
  __typename?: 'Session';
  agent: Agent;
  endedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  patches: Array<Patch>;
  snapshots: Array<Snapshot>;
  startedAt: Scalars['DateTime']['output'];
};

export type SessionBoundary = {
  __typename?: 'SessionBoundary';
  endGlobalRevision?: Maybe<Scalars['Int']['output']>;
  endTime?: Maybe<Scalars['DateTime']['output']>;
  sessionId: Scalars['String']['output'];
  startGlobalRevision?: Maybe<Scalars['Int']['output']>;
  startTime?: Maybe<Scalars['DateTime']['output']>;
};

/** A way to filter sessions */
export type SessionFilter = {
  AND?: InputMaybe<SessionFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<SessionFilter>;
  OR?: InputMaybe<SessionFilter>;
  /** Filter by space */
  agent?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by IDs */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type SessionOrder =
  { endedAt: Ordering; startedAt?: never; }
  |  { endedAt?: never; startedAt: Ordering; };

/** Mark an existing implementation as a higher-order wrapper of a lower implementation. */
export type SetHigherOrderInput = {
  /** Projection config: bound params + arg/dependency/return maps (see Implementation.higher_order_config). */
  config?: InputMaybe<Scalars['AnyDefault']['input']>;
  /** The wrapper implementation to mark as higher-order. */
  implementation: Scalars['ID']['input'];
  /** The lower implementation it wraps. */
  lowerImplementation: Scalars['ID']['input'];
};

export type ShelveInMemoryDrawerInput = {
  /** The description of the drawer. This is used to identify the drawer in the system. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The identifier of the drawer. This is used to identify the drawer in the system. */
  identifier: Scalars['Identifier']['input'];
  /** The label of the drawer. This is used to identify the drawer in the system. */
  label?: InputMaybe<Scalars['String']['input']>;
  /** The resource ID of the drawer. */
  resourceId: Scalars['String']['input'];
};

/** Shortcut to an action with preset arguments. */
export type Shortcut = {
  __typename?: 'Shortcut';
  /** The associated action. */
  action: Action;
  /** Allow quick execution without modification. */
  allowQuick: Scalars['Boolean']['output'];
  /** Input ports for the shortcut's action.dd */
  args: Array<ArgPort>;
  /** Which shortcut should be bound to this Action by default. 0 means no binding. */
  bindNumber?: Maybe<Scalars['Int']['output']>;
  /** Optional description. */
  description?: Maybe<Scalars['String']['output']>;
  /** Shortcut ID. */
  id: Scalars['ID']['output'];
  /** Implementation of the action. */
  implementation?: Maybe<Implementation>;
  /** Name of the shortcut. */
  name: Scalars['String']['output'];
  /** Return ports from the shortcut's action. */
  returns: Array<ReturnPort>;
  /** Saved arguments for the shortcut. */
  savedArgs: Scalars['AnyDefault']['output'];
  /** Toolboxes that contain this shortcut. */
  toolboxes: Array<Toolbox>;
  /** If true, shortcut uses return values. */
  useReturns: Scalars['Boolean']['output'];
};


/** Shortcut to an action with preset arguments. */
export type ShortcutToolboxesArgs = {
  filters?: InputMaybe<ToolboxFilter>;
  ordering?: Array<ToolboxOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type ShortcutFilter = {
  AND?: InputMaybe<ShortcutFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ShortcutFilter>;
  OR?: InputMaybe<ShortcutFilter>;
  demands?: InputMaybe<Array<PortDemandInput>>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
  toolbox?: InputMaybe<Scalars['ID']['input']>;
};

export type ShortcutOrder =
  { name: Ordering; };

/** Something a service announced: an object of a structure was created, updated or deleted. */
export type Signal = {
  __typename?: 'Signal';
  /** The task the object was created in, verified from its provenance token. */
  causingTask?: Maybe<Task>;
  /** The object's descriptors (flat key → value). */
  descriptors: Scalars['AnyDefault']['output'];
  /** Unique ID of the signal. */
  id: Scalars['ID']['output'];
  /** The object's structure identifier, e.g. @mikro/arraydataset. */
  identifier: Scalars['String']['output'];
  /** What happened to the object. */
  kind: SignalKind;
  /** The object's id within its structure. */
  object: Scalars['String']['output'];
  /** When it happened, per the service. */
  occurredAt?: Maybe<Scalars['DateTime']['output']>;
  /** When triggers were matched against it. */
  processedAt?: Maybe<Scalars['DateTime']['output']>;
  /** When rekuest received it. */
  receivedAt: Scalars['DateTime']['output'];
  /** The runs this signal fired. */
  runs: Array<Task>;
  /** The service that sent it. */
  service: Scalars['String']['output'];
};

/** A signal a service of this hub declares it emits (from its manifest). Hub-wide. */
export type SignalDeclaration = {
  __typename?: 'SignalDeclaration';
  /** What the service says about the signal. */
  description?: Maybe<Scalars['String']['output']>;
  /** The descriptor keys each signal carries — what trigger conditions may test. */
  descriptorKeys: Array<Scalars['String']['output']>;
  /** Unique ID of the declaration. */
  id: Scalars['ID']['output'];
  /** The structure identifier of the objects signalled. */
  identifier: Scalars['String']['output'];
  /** What happens to them. */
  kind: SignalKind;
  /** The service that emits it. */
  service: Scalars['String']['output'];
};

/** What happened to the object a service signalled. */
export enum SignalKind {
  Created = 'CREATED',
  Deleted = 'DELETED',
  Updated = 'UPDATED'
}

export type SliderAssignWidget = AssignWidget & {
  __typename?: 'SliderAssignWidget';
  followValue?: Maybe<Scalars['String']['output']>;
  kind: AssignWidgetKind;
  max?: Maybe<Scalars['Float']['output']>;
  min?: Maybe<Scalars['Float']['output']>;
  step?: Maybe<Scalars['Float']['output']>;
};

/** A numeric slider for INT, FLOAT and QUANTITY ports. */
export type SliderAssignWidgetInput = {
  /** Port path of another port whose value this widget follows and mirrors. */
  followValue?: InputMaybe<Scalars['String']['input']>;
  /** Which member of AssignWidgetInput this is. */
  kind: AssignWidgetKind;
  /** The maximum value. */
  max?: InputMaybe<Scalars['Float']['input']>;
  /** The minimum value. */
  min?: InputMaybe<Scalars['Float']['input']>;
  /** The step between selectable values; must be positive. */
  step?: InputMaybe<Scalars['Float']['input']>;
};

export type Snapshot = {
  __typename?: 'Snapshot';
  /** Global revision this snapshot represents (global_rev). */
  globalRevision: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  /** The session identifier string this row belongs to. */
  sessionId?: Maybe<Scalars['String']['output']>;
  state: State;
  timestamp: Scalars['DateTime']['output'];
  value: Scalars['Args']['output'];
};

/** A space where agents can interact. */
export type Space = {
  __typename?: 'Space';
  createdAt: Scalars['DateTime']['output'];
  creator: User;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  placements: Array<Placement>;
  updatedAt: Scalars['DateTime']['output'];
};


/** A space where agents can interact. */
export type SpacePlacementsArgs = {
  filters?: InputMaybe<PlacementFilter>;
  ordering?: Array<PlacementOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** A way to filter spaces */
export type SpaceFilter = {
  AND?: InputMaybe<SpaceFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<SpaceFilter>;
  OR?: InputMaybe<SpaceFilter>;
  /** Filter by IDs */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Search by name */
  search?: InputMaybe<Scalars['String']['input']>;
};

export type SpaceOrder =
  { createdAt: Ordering; name?: never; updatedAt?: never; }
  |  { createdAt?: never; name: Ordering; updatedAt?: never; }
  |  { createdAt?: never; name?: never; updatedAt: Ordering; };

export type State = {
  __typename?: 'State';
  /** The agent to which this state belongs. */
  agent: Agent;
  /** The identifier of the app providing this state (defaults to the owning agent's app identifier). */
  appIdentifier?: Maybe<Scalars['String']['output']>;
  /** Timestamp when this state was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The schema definition for this state. */
  definition: StateDefinition;
  id: Scalars['ID']['output'];
  /** The interface this state is associated with. */
  interface: Scalars['String']['output'];
  /** The stable identity key of this state, matched by state demands (defaults to the interface at registration). */
  key?: Maybe<Scalars['String']['output']>;
  /** Timestamp when this state was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type StateAccessor = {
  __typename?: 'StateAccessor';
  call?: Maybe<UtilCall>;
  optionKey: OptionKey;
  path?: Maybe<Scalars['String']['output']>;
};

export type StateAccessorInput = {
  /** Pure UtilCall returning the pointer string dynamically. May reference `state`, `value` and the widget's `dependencies`. Mutually exclusive with `path`. */
  call?: InputMaybe<UtilCallInput>;
  /** The part of the state accessor to use as the value for the assign widget (e.g. the key, the description, the logo, etc.) */
  optionKey: OptionKey;
  /** Static JSON pointer into the state value ('/x/y'). Omit for the whole value. Mutually exclusive with `call`. */
  path?: InputMaybe<Scalars['String']['input']>;
};

export type StateChoiceAssignWidget = AssignWidget & {
  __typename?: 'StateChoiceAssignWidget';
  dependencies?: Maybe<Array<Scalars['String']['output']>>;
  dependency?: Maybe<Scalars['String']['output']>;
  followValue?: Maybe<Scalars['String']['output']>;
  kind: AssignWidgetKind;
  stateAccessors?: Maybe<Array<StateAccessor>>;
  stateCall?: Maybe<UtilCall>;
  statePath?: Maybe<Scalars['String']['output']>;
};

/** A choice over entries of an agent's state. */
export type StateChoiceAssignWidgetInput = {
  /** The other ports (port paths, `..` traverses children) whose values the calls may reference. */
  dependencies?: InputMaybe<Array<Scalars['String']['input']>>;
  /** The agent dependency (by key) whose state provides the choices; omitted: the implementing agent's own state. */
  dependency?: InputMaybe<Scalars['String']['input']>;
  /** Port path of another port whose value this widget follows and mirrors. */
  followValue?: InputMaybe<Scalars['String']['input']>;
  /** Which member of AssignWidgetInput this is. */
  kind: AssignWidgetKind;
  /** How to read label/description/logo/value out of each state entry; each accessor is a static pointer or a pure call. */
  stateAccessors?: InputMaybe<Array<StateAccessorInput>>;
  /** Pure UtilCall returning that pointer dynamically; may reference `state`, `value` and `dependencies`. Mutually exclusive with `state_path`. */
  stateCall?: InputMaybe<UtilCallInput>;
  /** Static JSON pointer into the state value that provides the choices. Mutually exclusive with `state_call`. */
  statePath?: InputMaybe<Scalars['String']['input']>;
};

export type StateDefinition = {
  __typename?: 'StateDefinition';
  hash: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  ports: Array<ReturnPort>;
};

/** A state schema is a blueprint for a state. It is composed of a definition, a list of dependencies, and a list of params. */
export type StateDefinitionInput = {
  /** The name of the state schema. This is used to uniquely identify the state schema */
  name: Scalars['String']['input'];
  /** The ports of the state schema. This is used to define the structure of the state */
  ports: Array<ReturnPortInput>;
};

/** Pure matching criteria for a state (app/key preferred; matches loosen). */
export type StateDemand = {
  __typename?: 'StateDemand';
  /** The identifier of the app providing the state. */
  app?: Maybe<Scalars['String']['output']>;
  /** The exact hash of the state definition. */
  hash?: Maybe<Scalars['ActionHash']['output']>;
  /** The state's identity key on the agent. */
  key?: Maybe<Scalars['String']['output']>;
  /** The matches the state definition's ports must satisfy. */
  matches?: Maybe<Array<PortMatch>>;
  /** Protocols (by name) the state must implement. */
  protocols?: Maybe<Array<Scalars['String']['output']>>;
};

/**
 * Pure matching criteria for a state definition: hash short-circuits, port
 *     matches and protocols. Used directly by query filters and, wrapped in a
 *     StateDependencyInput, by dependency declarations.
 */
export type StateDemandInput = {
  /** The identifier of the app providing the state. */
  app?: InputMaybe<Scalars['String']['input']>;
  /** The exact hash of the state definition. When set, matching short-circuits on the hash. */
  hash?: InputMaybe<Scalars['String']['input']>;
  /** The state's identity key on the agent (defaults to the interface at registration). */
  key?: InputMaybe<Scalars['String']['input']>;
  /** The matches the state definition's ports must satisfy. */
  matches?: InputMaybe<Array<PortMatchInput>>;
  /** Protocols (by name) the state must implement. */
  protocols?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** A named state requirement of a dependency: a local slot key mapped to the demand the agent's state must satisfy. */
export type StateDependency = {
  __typename?: 'StateDependency';
  /** The matching criteria the agent's state must satisfy. */
  demand?: Maybe<StateDemand>;
  /** A description of the dependency. */
  description?: Maybe<Scalars['String']['output']>;
  /** The local slot key of this state requirement. */
  key: Scalars['String']['output'];
  /** Whether the dependency is optional. */
  optional: Scalars['Boolean']['output'];
};

/**
 * A named state requirement of a dependency: a slot key plus the demand the
 *     agent's state must satisfy, and resolution-lifecycle filters.
 */
export type StateDependencyInput = {
  /** Allow inactive nodes, defaults to true */
  allowInactive?: InputMaybe<Scalars['Boolean']['input']>;
  /** The matching criteria the agent's state must satisfy (app/key preferred; matches loosen). */
  demand?: InputMaybe<StateDemandInput>;
  /** The description of the dependency, why it is needed and what it is used for. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The local slot key of this state requirement — callers reference it when assigning. */
  key: Scalars['String']['input'];
  /** Whether the dependency is optional or not. If the dependency is optional, the agent doesn't have to provide it to be potentially callable */
  optional?: Scalars['Boolean']['input'];
};

/** A state implementation is a blueprint for a state. It is composed of a definition, a list of dependencies, and a list of params. */
export type StateImplementationInput = {
  /** The identifier of the app providing this state. Defaults to the registering agent's app identifier when omitted. */
  app?: InputMaybe<Scalars['String']['input']>;
  /** The schema of the state implementation. This is used to define the structure of the state */
  definition: StateDefinitionInput;
  /** The key of the state implementation. This is used to uniquely identify the state implementation */
  interface: Scalars['String']['input'];
  /** The stable identity key of the state, matched by state demands. Defaults to the interface when omitted. */
  key?: InputMaybe<Scalars['String']['input']>;
};

/** A plain patch event with no model cross-references. */
export type StatePatchEvent = {
  __typename?: 'StatePatchEvent';
  agentId: Scalars['ID']['output'];
  globalRevision: Scalars['Int']['output'];
  interface: Scalars['String']['output'];
  op: Scalars['String']['output'];
  path: Scalars['String']['output'];
  sessionId: Scalars['String']['output'];
  stateId: Scalars['ID']['output'];
  timestamp: Scalars['DateTime']['output'];
  value: Scalars['Args']['output'];
};

/** A plain snapshot of a state's current value. */
export type StateSnapshotEvent = {
  __typename?: 'StateSnapshotEvent';
  agentId: Scalars['ID']['output'];
  globalRevision: Scalars['Int']['output'];
  interface: Scalars['String']['output'];
  sessionId: Scalars['String']['output'];
  stateId: Scalars['ID']['output'];
  timestamp: Scalars['DateTime']['output'];
  value: Scalars['Args']['output'];
};

export type StateSnapshotEventStatePatchEvent = StatePatchEvent | StateSnapshotEvent;

export type StateValue = {
  __typename?: 'StateValue';
  /** The patches that can be applied to move backward from this state */
  backwardPatches: Array<Patch>;
  /** The patches that can be applied to move forward from this state */
  forwardPatches: Array<Patch>;
  /** The global revision of this state */
  globalRevision?: Maybe<Scalars['Int']['output']>;
  /** The ID of the state */
  stateId: Scalars['ID']['output'];
  /** The state value */
  value: Scalars['JSON']['output'];
};

export type StrFilterLookup = {
  contains?: InputMaybe<Scalars['String']['input']>;
  endsWith?: InputMaybe<Scalars['String']['input']>;
  exact?: InputMaybe<Scalars['String']['input']>;
  gt?: InputMaybe<Scalars['String']['input']>;
  gte?: InputMaybe<Scalars['String']['input']>;
  iContains?: InputMaybe<Scalars['String']['input']>;
  iEndsWith?: InputMaybe<Scalars['String']['input']>;
  iExact?: InputMaybe<Scalars['String']['input']>;
  iRegex?: InputMaybe<Scalars['String']['input']>;
  iStartsWith?: InputMaybe<Scalars['String']['input']>;
  inList?: InputMaybe<Array<Scalars['String']['input']>>;
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  lt?: InputMaybe<Scalars['String']['input']>;
  lte?: InputMaybe<Scalars['String']['input']>;
  range?: InputMaybe<Array<Scalars['String']['input']>>;
  regex?: InputMaybe<Scalars['String']['input']>;
  startsWith?: InputMaybe<Scalars['String']['input']>;
};

export type StringAssignWidget = AssignWidget & {
  __typename?: 'StringAssignWidget';
  asParagraph?: Maybe<Scalars['Boolean']['output']>;
  followValue?: Maybe<Scalars['String']['output']>;
  kind: AssignWidgetKind;
  placeholder?: Maybe<Scalars['String']['output']>;
};

/** A text input for STRING ports. */
export type StringAssignWidgetInput = {
  /** Render as a multi-line paragraph. */
  asParagraph?: InputMaybe<Scalars['Boolean']['input']>;
  /** Port path of another port whose value this widget follows and mirrors. */
  followValue?: InputMaybe<Scalars['String']['input']>;
  /** Which member of AssignWidgetInput this is. */
  kind: AssignWidgetKind;
  /** The placeholder text. */
  placeholder?: InputMaybe<Scalars['String']['input']>;
};

/** A structure (data type) referenced by an action's port, derived from the relational port rows. */
export type Structure = {
  __typename?: 'Structure';
  /** The full identifier, e.g. '@mikro/image'. */
  identifier: Scalars['ID']['output'];
  /** Usages of this structure as an input in actions (derived from the relational arg ports). */
  inputUsages: Array<PortUsage>;
  /** The local key (the part after '/'). */
  key: Scalars['String']['output'];
  /** Usages of this structure as an output in actions (derived from the relational return ports). */
  outputUsages: Array<PortUsage>;
  /** The package this structure belongs to. */
  package: StructurePackage;
};

/** A package of structures/interfaces, derived from the '@package/' prefix of port identifiers. */
export type StructurePackage = {
  __typename?: 'StructurePackage';
  /** Interfaces of this package referenced by the org's ports. */
  interfaces: Array<Interface>;
  /** The package key (the part between '@' and '/'). */
  key: Scalars['ID']['output'];
  /** Structures of this package referenced by the org's ports. */
  structures: Array<Structure>;
};

/** Root subscription type for real-time event streams from the system. */
export type Subscription = {
  __typename?: 'Subscription';
  /** Subscribe to task create/update for a specific agent. */
  agentTasks: AgentTaskUpdate;
  /** Subscribe to updates on agent connections and statuses. */
  agents: AgentChangeEvent;
  /** Subscribe to all descendant task changes of a task. */
  childTasks: ChildTaskEvent;
  /** Subscribe to changes in implementations. */
  implementationChange: Implementation;
  /** Subscribe to creation or updates of implementations. */
  implementations: ImplementationUpdate;
  /** Subscribe to latest patches for specific agents or states. */
  latestPatches: Patch;
  /** Subscribe to root tasks created by this client (caller-scoped). */
  mytasks: TaskChangeEvent;
  /** Subscribe to notifications when new actions are created. */
  newActions: Action;
  /** Stream the events of one probe (caller-scoped, payload-carrying). Emits a state snapshot first when events already happened. */
  probeEvents: ProbeEvent;
  /** Subscribe to updates of state values and patches. */
  stateUpdateEvents: State;
  /** Subscribe to root task changes across the whole organization. */
  tasks: TaskChangeEvent;
  /** Watch an agent: yields snapshots for all states then streams patches. */
  watchAgent: AgentSnapshotEventStatePatchEvent;
  /** Watch a state: yields the current snapshot then streams patches. */
  watchState: StateSnapshotEventStatePatchEvent;
};


/** Root subscription type for real-time event streams from the system. */
export type SubscriptionAgentTasksArgs = {
  agent: Scalars['ID']['input'];
};


/** Root subscription type for real-time event streams from the system. */
export type SubscriptionChildTasksArgs = {
  id: Scalars['ID']['input'];
};


/** Root subscription type for real-time event streams from the system. */
export type SubscriptionImplementationChangeArgs = {
  implementation: Scalars['ID']['input'];
};


/** Root subscription type for real-time event streams from the system. */
export type SubscriptionImplementationsArgs = {
  agent: Scalars['ID']['input'];
};


/** Root subscription type for real-time event streams from the system. */
export type SubscriptionLatestPatchesArgs = {
  agent?: InputMaybe<Scalars['ID']['input']>;
  state?: InputMaybe<Scalars['ID']['input']>;
};


/** Root subscription type for real-time event streams from the system. */
export type SubscriptionProbeEventsArgs = {
  probe: Scalars['ID']['input'];
};


/** Root subscription type for real-time event streams from the system. */
export type SubscriptionStateUpdateEventsArgs = {
  stateId: Scalars['ID']['input'];
};


/** Root subscription type for real-time event streams from the system. */
export type SubscriptionWatchAgentArgs = {
  agentId: Scalars['ID']['input'];
};


/** Root subscription type for real-time event streams from the system. */
export type SubscriptionWatchStateArgs = {
  agentId?: InputMaybe<Scalars['ID']['input']>;
  interface?: InputMaybe<Scalars['String']['input']>;
  stateId?: InputMaybe<Scalars['ID']['input']>;
};

/** Tracks the assignment of an implementation to a specific task. */
export type Task = {
  __typename?: 'Task';
  /** List of resources or entities this task acted upon. */
  actedOn: Array<Scalars['String']['output']>;
  /** Action assigned. */
  action: Action;
  /** Agent responsible for this task. */
  agent?: Maybe<Agent>;
  /** Get a specific argument by key. */
  arg?: Maybe<Scalars['Args']['output']>;
  /** Arguments used in the task. */
  args: Scalars['AnyDefault']['output'];
  /** Canonical sha256 of the assign args — the replay-discovery key. */
  argsHash?: Maybe<Scalars['String']['output']>;
  /** What the parent calls this child; null for roots and for keyless agents. */
  callKey?: Maybe<Scalars['String']['output']>;
  /** Caller that created this task. */
  caller?: Maybe<Caller>;
  /** Indicates if the task is being captured for logging or debugging. */
  capture: Scalars['Boolean']['output'];
  /** Child tasks spawned from this one. */
  children: Array<Task>;
  /** Creation timestamp. */
  createdAt: Scalars['DateTime']['output'];
  /** The used dependencies for this assignemnet */
  dependencies: Scalars['AnyDefault']['output'];
  /** The dependency thats linked to the parents execution if applicable. */
  dependency?: Maybe<Scalars['String']['output']>;
  /** The method of the dependency that caused this task, if applicable. */
  dependencyMethod?: Maybe<Scalars['String']['output']>;
  /** The events */
  events: Array<TaskEvent>;
  /** Timestamp when the task was finished. */
  finishedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Unique ID of the task. */
  id: Scalars['ID']['output'];
  /** Implementation assigned to execute. Null until the task is mapped to one. */
  implementation?: Maybe<Implementation>;
  /** List of recent instructions for this task. */
  instructs: Array<TaskInstruct>;
  /** Indicates if the task is completed. */
  isDone: Scalars['Boolean']['output'];
  /** Type of the latest event. */
  latestEventKind: TaskEventKind;
  /** Last instruction type. */
  latestInstructKind: TaskInstructKind;
  /** The task is held back until then (a delayed task); null = dispatched on creation. */
  notBefore?: Maybe<Scalars['DateTime']['output']>;
  /** Parent task that triggered this one. */
  parent?: Maybe<Task>;
  /** The parent's step this child took; null for roots and for children of agents without numbering. */
  parentStep?: Maybe<Scalars['Int']['output']>;
  /** Optional external reference for tracking. */
  reference?: Maybe<Scalars['String']['output']>;
  /** Resolution used to resolve dependencies for this task. */
  resolution?: Maybe<Resolution>;
  /** The resolved dependencies for this task. */
  resolvedDependencies: Array<ResolvedAgentDependency>;
  /** Monotonic per-task version, bumped by every write. Pairs with the change feeds: discard a TaskChange whose revision is not greater than the one you hold. */
  revision: Scalars['Int']['output'];
  /** Root task in the creation chain. */
  root?: Maybe<Task>;
  /** The signal that caused this task, if a trigger fired it. */
  signal?: Maybe<Signal>;
  /** The trigger that fired this task, if any. */
  trigger?: Maybe<Trigger>;
  /** Last update timestamp. */
  updatedAt: Scalars['DateTime']['output'];
};


/** Tracks the assignment of an implementation to a specific task. */
export type TaskArgArgs = {
  key: Scalars['String']['input'];
};


/** Tracks the assignment of an implementation to a specific task. */
export type TaskChildrenArgs = {
  filters?: InputMaybe<TaskFilter>;
  ordering?: Array<TaskOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Tracks the assignment of an implementation to a specific task. */
export type TaskEventsArgs = {
  filters?: InputMaybe<TaskEventFilter>;
  ordering?: Array<TaskEventOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type TaskBoundary = {
  __typename?: 'TaskBoundary';
  correlationId: Scalars['String']['output'];
  endGlobalRevision?: Maybe<Scalars['Int']['output']>;
  endTime?: Maybe<Scalars['DateTime']['output']>;
  startGlobalRevision?: Maybe<Scalars['Int']['output']>;
  startTime?: Maybe<Scalars['DateTime']['output']>;
};

/** Slim, non-traversable snapshot of a task for change feeds. */
export type TaskChange = {
  __typename?: 'TaskChange';
  action: Scalars['ID']['output'];
  agent?: Maybe<Scalars['ID']['output']>;
  createdAt: Scalars['DateTime']['output'];
  finishedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  implementation?: Maybe<Scalars['ID']['output']>;
  isDone: Scalars['Boolean']['output'];
  latestEventKind: TaskEventKind;
  latestInstructKind: TaskInstructKind;
  parent?: Maybe<Scalars['ID']['output']>;
  reference?: Maybe<Scalars['String']['output']>;
  /** Monotonic per-task version. Changes are produced by several backends and may arrive out of order: apply one only if its revision is greater than the last you applied. */
  revision: Scalars['Int']['output'];
  root?: Maybe<Scalars['ID']['output']>;
  statusMessage?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type TaskChangeEvent = {
  __typename?: 'TaskChangeEvent';
  create?: Maybe<TaskChange>;
  event?: Maybe<TaskEventChange>;
};

/** An event that occurred during a task. */
export type TaskEvent = {
  __typename?: 'TaskEvent';
  /** The session position (pos) of the report that wrote this event; null for server-written events and agents without numbering. */
  agentPos?: Maybe<Scalars['Int']['output']>;
  /** When the agent recorded the report; null for server-written events and agents without numbering. */
  agentTs?: Maybe<Scalars['DateTime']['output']>;
  /** Time when event was created. */
  createdAt: Scalars['DateTime']['output'];
  /** If this event was delegated, the task it was delegated to. */
  delegatedTo?: Maybe<Task>;
  /** EFFECT events: NOW, RANDOM, SLEEP or RECORD. */
  effect?: Maybe<Scalars['String']['output']>;
  /** Unique ID of the event. */
  id: Scalars['ID']['output'];
  /** EFFECT events: what the task calls this value; a replay matches values by key. */
  key?: Maybe<Scalars['String']['output']>;
  /** Kind of task event. */
  kind: TaskEventKind;
  /** Log level of the event (LOG events; INFO when unset). */
  level: LogLevel;
  /** Optional message associated with the event. */
  message?: Maybe<Scalars['String']['output']>;
  /** Progress percentage. */
  progress?: Maybe<Scalars['Int']['output']>;
  /** Reference string for the event. */
  reference: Scalars['String']['output'];
  /** Optional return values. */
  returns?: Maybe<Scalars['AnyDefault']['output']>;
  /** The report's step within its task; a task's history in step order. Null for server-written events. */
  step?: Maybe<Scalars['Int']['output']>;
  /** Associated task. */
  task: Task;
  /** EFFECT events: the value the task took (NOW: epoch seconds, RANDOM: hex, SLEEP: deadline). */
  value?: Maybe<Scalars['AnyDefault']['output']>;
};

/** Slim, non-traversable task event for change feeds. */
export type TaskEventChange = {
  __typename?: 'TaskEventChange';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  kind: TaskEventKind;
  message?: Maybe<Scalars['String']['output']>;
  progress?: Maybe<Scalars['Int']['output']>;
  returns?: Maybe<Scalars['AnyDefault']['output']>;
  task: Scalars['ID']['output'];
  /** EFFECT: the value taken. LOST: what is known (started, last_progress, effects, reason). */
  value?: Maybe<Scalars['AnyDefault']['output']>;
};

/** A way to filter task events */
export type TaskEventFilter = {
  AND?: InputMaybe<TaskEventFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<TaskEventFilter>;
  OR?: InputMaybe<TaskEventFilter>;
  /** Filter by IDs of the task events */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Filter by the kind of the event */
  kind?: InputMaybe<Array<TaskEventKind>>;
};

/** The event kind of the taskevent */
export enum TaskEventKind {
  Bound = 'BOUND',
  Cancelled = 'CANCELLED',
  Cancelling = 'CANCELLING',
  Completed = 'COMPLETED',
  Critical = 'CRITICAL',
  Delegate = 'DELEGATE',
  Effect = 'EFFECT',
  Failed = 'FAILED',
  Interrupted = 'INTERRUPTED',
  Interrupting = 'INTERRUPTING',
  LateReport = 'LATE_REPORT',
  Log = 'LOG',
  Lost = 'LOST',
  Paused = 'PAUSED',
  Pausing = 'PAUSING',
  Progress = 'PROGRESS',
  Queued = 'QUEUED',
  Resumed = 'RESUMED',
  Resuming = 'RESUMING',
  Started = 'STARTED',
  Unassign = 'UNASSIGN',
  Yield = 'YIELD'
}

export type TaskEventOrder =
  { agentPos: Ordering; createdAt?: never; step?: never; }
  |  { agentPos?: never; createdAt: Ordering; step?: never; }
  |  { agentPos?: never; createdAt?: never; step: Ordering; };

/** Numeric/aggregatable fields of Task */
export enum TaskField {
  CreatedAt = 'CREATED_AT'
}

/** A way to filter tasks */
export type TaskFilter = {
  AND?: InputMaybe<TaskFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<TaskFilter>;
  OR?: InputMaybe<TaskFilter>;
  /** Filter by the structures this task acted on */
  actedOn?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Filter by the action the task was assigned to */
  action?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by the agent executing the task */
  agent?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by the canonical args hash (the replay-discovery key) */
  argsHash?: InputMaybe<Scalars['String']['input']>;
  /** Filter by the caller (client/user/organization) that created the task */
  caller?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by the client ID of the app the executing agent is registered to */
  clientId?: InputMaybe<Scalars['ID']['input']>;
  /** Only tasks created after this timestamp */
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  /** Only tasks created before this timestamp */
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter by IDs of the tasks */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Filter by the implementation the task is currently mapped to */
  implementation?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by whether the task has finished */
  isDone?: InputMaybe<Scalars['Boolean']['input']>;
  /** Filter by the direct parent task */
  parent?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by the caller-supplied reference of the task */
  reference?: InputMaybe<Scalars['String']['input']>;
  /** Filter by the root task of the execution tree */
  root?: InputMaybe<Scalars['ID']['input']>;
  /** Keep only root tasks (true) or only descendants of a root (false) */
  rootIsnull?: InputMaybe<Scalars['Boolean']['input']>;
  /** Filter by the latest lifecycle event of the task */
  state?: InputMaybe<Array<TaskEventKind>>;
};

/** An instruct event for a specific task. */
export type TaskInstruct = {
  __typename?: 'TaskInstruct';
  /** Time when instruction was issued. */
  createdAt: Scalars['DateTime']['output'];
  /** Unique ID of the instruct event. */
  id: Scalars['ID']['output'];
  /** Type of instruction. */
  kind: TaskInstructKind;
  /** Task the instruction relates to. */
  task: Task;
};

/** The event kind of the taskevent */
export enum TaskInstructKind {
  Assign = 'ASSIGN',
  Cancel = 'CANCEL',
  Collect = 'COLLECT',
  Interrupt = 'INTERRUPT',
  Pause = 'PAUSE',
  Resume = 'RESUME'
}

export type TaskOrder =
  { createdAt: Ordering; finishedAt?: never; }
  |  { createdAt?: never; finishedAt: Ordering; };

export type TaskStats = {
  __typename?: 'TaskStats';
  /** Average */
  avg?: Maybe<Scalars['Float']['output']>;
  /** Total number of items in the selection */
  count: Scalars['Int']['output'];
  /** Number of distinct values for the field */
  distinctCount: Scalars['Int']['output'];
  /** Maximum */
  max?: Maybe<Scalars['Float']['output']>;
  /** Minimum */
  min?: Maybe<Scalars['Float']['output']>;
  /** Time-bucketed stats over a datetime field. */
  series: Array<TimeBucket>;
  /** Sum */
  sum?: Maybe<Scalars['Float']['output']>;
};


export type TaskStatsAvgArgs = {
  field: TaskField;
};


export type TaskStatsDistinctCountArgs = {
  field: TaskField;
};


export type TaskStatsMaxArgs = {
  field: TaskField;
};


export type TaskStatsMinArgs = {
  field: TaskField;
};


export type TaskStatsSeriesArgs = {
  by: Granularity;
  field: TaskField;
  timestampField: TaskTimestampField;
};


export type TaskStatsSumArgs = {
  field: TaskField;
};

/** Datetime fields of Task for bucketing */
export enum TaskTimestampField {
  CreatedAt = 'CREATED_AT'
}

/** Defines a test case comparing expected behavior for actions. */
export type TestCase = {
  __typename?: 'TestCase';
  /** Target action under test. */
  action: Action;
  /** Details of what this test case covers. */
  description: Scalars['String']['output'];
  /** Unique ID of the test case. */
  id: Scalars['ID']['output'];
  /** If true, measures performance rather than correctness. */
  isBenchmark: Scalars['Boolean']['output'];
  /** Short name for the test case. */
  name: Scalars['String']['output'];
  /** Results from running this test case. */
  results: Array<TestResult>;
  /** Action used to perform the test. */
  tester: Action;
};


/** Defines a test case comparing expected behavior for actions. */
export type TestCaseResultsArgs = {
  filters?: InputMaybe<TestResultFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** A way to filter test cases */
export type TestCaseFilter = {
  AND?: InputMaybe<TestCaseFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<TestCaseFilter>;
  OR?: InputMaybe<TestCaseFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  name?: InputMaybe<StrFilterLookup>;
};

/** Result from executing a test case with specific implementations. */
export type TestResult = {
  __typename?: 'TestResult';
  /** Associated test case. */
  case: TestCase;
  /** When the test was executed. */
  createdAt: Scalars['DateTime']['output'];
  /** ID of the test result. */
  id: Scalars['ID']['output'];
  /** Implementation under test. */
  implementation: Implementation;
  /** True if test passed. */
  passed: Scalars['Boolean']['output'];
  /** Implementation running the test. */
  tester: Implementation;
  /** When the test result was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

/** A way to filter test results */
export type TestResultFilter = {
  AND?: InputMaybe<TestResultFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<TestResultFilter>;
  OR?: InputMaybe<TestResultFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  name?: InputMaybe<StrFilterLookup>;
};

/** A test target: the action a test action tests, identified by exact hash or by an (app, key, version) coordinate. app defaults to the registering agent's app; omitting version matches every version. */
export type TestTargetInput = {
  /** The app identifier owning the target action. Defaults to the registering agent's app. */
  app?: InputMaybe<Scalars['String']['input']>;
  /** The exact hash of the target action. */
  hash?: InputMaybe<Scalars['String']['input']>;
  /** The key of the target action. Matches every version unless version is given. */
  key?: InputMaybe<Scalars['String']['input']>;
  /** Restrict a key target to one specific version. */
  version?: InputMaybe<Scalars['String']['input']>;
};

/** A 3D model file. */
export type ThreeDModel = {
  __typename?: 'ThreeDModel';
  createdAt: Scalars['DateTime']['output'];
  dependency: Agent;
  description?: Maybe<Scalars['String']['output']>;
  file: MediaStore;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  transferFunction?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

/** A way to filter 3D models */
export type ThreeDModelFilter = {
  AND?: InputMaybe<ThreeDModelFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ThreeDModelFilter>;
  OR?: InputMaybe<ThreeDModelFilter>;
  /** Filter by IDs */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Search by name */
  search?: InputMaybe<Scalars['String']['input']>;
};

export type ThreeDModelOrder =
  { createdAt: Ordering; name?: never; updatedAt?: never; }
  |  { createdAt?: never; name: Ordering; updatedAt?: never; }
  |  { createdAt?: never; name?: never; updatedAt: Ordering; };

export type TimeBucket = {
  __typename?: 'TimeBucket';
  avg?: Maybe<Scalars['Float']['output']>;
  count: Scalars['Int']['output'];
  distinctCount: Scalars['Int']['output'];
  max?: Maybe<Scalars['Float']['output']>;
  min?: Maybe<Scalars['Float']['output']>;
  sum?: Maybe<Scalars['Float']['output']>;
  ts: Scalars['DateTime']['output'];
};

/** A collection of shortcuts grouped as a toolbox. */
export type Toolbox = {
  __typename?: 'Toolbox';
  /** Description of the toolbox. */
  description: Scalars['String']['output'];
  /** Toolbox ID. */
  id: Scalars['ID']['output'];
  /** Name of the toolbox. */
  name: Scalars['String']['output'];
  /** List of shortcuts in this toolbox. */
  shortcuts: Array<Shortcut>;
};


/** A collection of shortcuts grouped as a toolbox. */
export type ToolboxShortcutsArgs = {
  filters?: InputMaybe<ShortcutFilter>;
  ordering?: Array<ShortcutOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type ToolboxFilter = {
  AND?: InputMaybe<ToolboxFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ToolboxFilter>;
  OR?: InputMaybe<ToolboxFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  name?: InputMaybe<StrFilterLookup>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type ToolboxOrder =
  { name: Ordering; };

/** A value that is being tracked over time during the runtime of an action. This is the state of a dependency */
export type Track = {
  __typename?: 'Track';
  dependencyKey?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  label?: Maybe<Scalars['String']['output']>;
  stateKey: Scalars['String']['output'];
  valueKey: Scalars['String']['output'];
  windows?: Maybe<Array<Window>>;
};

/** A value that is being tracked over time during the runtime of an action. This is the state of a dependency */
export type TrackInput = {
  /** The key of the dependency whose state is being tracked. */
  dependencyKey?: InputMaybe<Scalars['String']['input']>;
  /** An optional description for the track. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** An optional human-readable label for the track. */
  label?: InputMaybe<Scalars['String']['input']>;
  /** The key of the state to track. */
  stateKey: Scalars['String']['input'];
  /** The key of the value within the state to track. */
  valueKey: Scalars['String']['input'];
  /** The windows (aggregations) computed over the tracked value. */
  windows?: InputMaybe<Array<WindowInput>>;
};

/** A rule over signals: on a signal of this kind and structure whose descriptors match, run the action with the object in `port`. */
export type Trigger = {
  __typename?: 'Trigger';
  /** The action every run assigns. */
  action: Action;
  /** The agent runs are pinned to, if any. */
  agent?: Maybe<Agent>;
  /** The other args of every run. */
  args: Scalars['AnyDefault']['output'];
  /** The owner; runs are assigned as this identity. */
  caller: Caller;
  /** Extra descriptor conditions (key, operator, value), requires-style. */
  conditions: Scalars['AnyDefault']['output'];
  /** Firings in a row that could not create a run. */
  consecutiveFailures: Scalars['Int']['output'];
  /** Creation timestamp. */
  createdAt: Scalars['DateTime']['output'];
  /** A disabled trigger fires nothing. */
  enabled: Scalars['Boolean']['output'];
  /** Unique ID of the trigger. */
  id: Scalars['ID']['output'];
  /** The structure identifier it reacts to. */
  identifier: Scalars['String']['output'];
  /** The implementation interface on the pinned agent. */
  interface?: Maybe<Scalars['String']['output']>;
  /** The signal kind it reacts to. */
  kind: SignalKind;
  /** Why the last firing did not create a run. */
  lastError?: Maybe<Scalars['String']['output']>;
  /** Human-readable name. */
  name: Scalars['String']['output'];
  /** The STRUCTURE argument that receives the signalled object. */
  port: Scalars['String']['output'];
  /** The most recent runs, newest first. */
  runs: Array<Task>;
  /** Last update timestamp. */
  updatedAt: Scalars['DateTime']['output'];
};


/** A rule over signals: on a signal of this kind and structure whose descriptors match, run the action with the object in `port`. */
export type TriggerRunsArgs = {
  limit?: Scalars['Int']['input'];
};

/** Identify a trigger. */
export type TriggerIdInput = {
  id: Scalars['ID']['input'];
};

/** A UI catalog: the components a UI app can render and the pure operations it can evaluate for UtilCalls, registered per organization. */
export type UiCatalog = {
  __typename?: 'UICatalog';
  /** Bloks rendered against this catalog. */
  bloks: Array<Blok>;
  /** Registered components. Empty until a UI app registers the catalog. */
  components: Array<CatalogComponent>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Whether a UI app has registered components or operations; unregistered catalogs validate nothing. */
  isRegistered: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  /** Registered pure operations UtilCalls may name. Empty until a UI app registers the catalog. */
  operations: Array<CatalogOperation>;
  /** Default widgets per port kind and/or structure identifier. A UI renders them for ports that declare no widget; an identifier match beats a kind match. */
  widgetDefaults: Array<WidgetDefault>;
};

/** The input for bouncing an agent. */
export type UnblockInput = {
  /** The agent ID to unblock. */
  agent: Scalars['ID']['input'];
};

export type UnshelveMemoryDrawerInput = {
  /** The drawer: its resource ID (as agent-minted drawers are referenced) or its ID. */
  id: Scalars['String']['input'];
};

/** The input for updating an agent. */
export type UpdateAgentInput = {
  /** The ID of the agent to update. */
  id: Scalars['ID']['input'];
  /** The new name for the agent. */
  name?: InputMaybe<Scalars['String']['input']>;
};

/** The input for updating a blok. Omitted (null) fields are left unchanged; list fields replace wholesale. */
export type UpdateBlokInput = {
  /** Name of the UI catalog (in the caller's organization) this blok renders against. Created if missing. */
  catalog?: InputMaybe<Scalars['String']['input']>;
  /** The full component tree of the blok. Replaces the existing tree when provided. */
  components?: InputMaybe<Array<ComponentNodeInput>>;
  /** The demo state used to preview this blok. Replaces the existing demo state when provided. */
  demoState?: InputMaybe<Scalars['Args']['input']>;
  /** The full list of agent dependencies. When provided it replaces the existing set: keys not listed are deleted and their agent mappings on materialized bloks lose their dependency reference. */
  dependencies?: InputMaybe<Array<AgentDependencyInput>>;
  /** The description of the blok and its purpose. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the blok to update. */
  id: Scalars['ID']['input'];
  /** The name of the blok, used for identification in the system. */
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Input for updating a dashboard: its name and associated bloks. Ownership cannot be reassigned. */
export type UpdateDashboardInput = {
  /** The new list of blok IDs to include in the dashboard. This will replace the existing list if provided. */
  bloks?: InputMaybe<Array<Scalars['String']['input']>>;
  /** The ID of the dashboard to update. */
  id: Scalars['ID']['input'];
  /** The new name of the dashboard. */
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Input for updating a materialized blok. This is used to update the properties of a materialized blok, such as its associated agent mappings. */
export type UpdateMaterializedBlokInput = {
  /** The list of mapped agents to update the materialized blok with. This is used to update the agent mappings of the materialized blok. */
  agentMappings?: InputMaybe<Array<MappedAgentInput>>;
  /** The ID of the materialized blok to update. */
  id: Scalars['ID']['input'];
};

/** The input for updating a placement. */
export type UpdatePlacementInput = {
  /** The affine matrix for the placement. This is used to identify the placement in the system. */
  affineMatrix?: InputMaybe<Array<Array<Scalars['Float']['input']>>>;
  /** The ID of the placement to update. */
  id: Scalars['ID']['input'];
  /** The 3D model ID for the placement. This is used to identify the 3D model in the system. */
  model?: InputMaybe<Scalars['ID']['input']>;
  /** The role of the placement. This is used to identify the placement in the system. */
  role?: InputMaybe<Scalars['String']['input']>;
};

/** The input for creating a resolution. */
export type UpdateResolutionInput = {
  /** The ID of the resolution. This is used to identify the resolution in the system. */
  id: Scalars['ID']['input'];
  /** The name of the resolution. This is used to identify the resolution in the system. */
  name: Scalars['String']['input'];
  /** The resolved dependencies of the resolution. All other fields will be replaced. */
  resolvedDependencies?: InputMaybe<Array<ResolvedDependencyInput>>;
};

/** Change a schedule. Giving intervalSeconds clears cron and vice versa. A waiting run is re-planned; an executing one finishes first. */
export type UpdateScheduleInput = {
  args?: InputMaybe<Scalars['Args']['input']>;
  cron?: InputMaybe<Scalars['String']['input']>;
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['ID']['input'];
  intervalSeconds?: InputMaybe<Scalars['Int']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  timezone?: InputMaybe<Scalars['String']['input']>;
};

/** The input for updating a space. */
export type UpdateSpaceInput = {
  /** The new description of the space. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the space to update. */
  id: Scalars['ID']['input'];
  /** The new name of the space. */
  name?: InputMaybe<Scalars['String']['input']>;
};

/** The input for updating a 3D model. */
export type UpdateThreeDModelInput = {
  /** The new description of the 3D model. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the 3D model to update. */
  id: Scalars['ID']['input'];
  /** The new media store file ID for the 3D model. */
  media?: InputMaybe<Scalars['ID']['input']>;
  /** The new name of the 3D model. */
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Change a trigger. Omitted fields stay as they are. */
export type UpdateTriggerInput = {
  args?: InputMaybe<Scalars['Args']['input']>;
  conditions?: InputMaybe<Scalars['AnyDefault']['input']>;
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Represents an authenticated user. */
export type User = {
  __typename?: 'User';
  /** Unique ID of the user. */
  id: Scalars['ID']['output'];
  /** The subject identifier of the user. */
  sub: Scalars['ID']['output'];
};

/** Defines a utility call that can be invoked within the system. */
export type UtilCall = {
  __typename?: 'UtilCall';
  arguments?: Maybe<Array<ActionArgument>>;
  operation: Scalars['String']['output'];
};

/** Defines a utility call that can be invoked within the system. */
export type UtilCallInput = {
  /** Key-value arguments map compiled for the target utility call. */
  arguments?: InputMaybe<Array<ActionArgumentInput>>;
  /** The utility function name to invoke. */
  operation: Scalars['String']['input'];
};

export type Validator = {
  __typename?: 'Validator';
  call: UtilCall;
  /** The full call tree as raw JSON, so deep trees are not truncated by fragment depth. */
  callJson: Scalars['JSONSerializable']['output'];
  dependencies?: Maybe<Array<Scalars['String']['output']>>;
  errorMessage?: Maybe<Scalars['String']['output']>;
  label?: Maybe<Scalars['String']['output']>;
  source?: Maybe<Scalars['String']['output']>;
};

/**
 *
 * A validator for a port. `call` is a pure blok UtilCall evaluated client-side against the
 * catalog; it must return a boolean meaning 'valid'. Other ports the call references must be
 * listed in `dependencies` (the authoritative subscription list); `value` refers to the port's
 * own value. Use the .. syntax when traversing the tree of ports.
 *
 */
export type ValidatorInput = {
  /** The pure blok UtilCall, evaluated client-side against the catalog, that validates the port value. It must return a boolean meaning 'valid'. Argument value_paths may only reference names listed in `dependencies`, plus `value` for the port's own value. */
  call: UtilCallInput;
  /** The form-field subscription list of the validator: the keys of the other ports whose values the call may reference. This list is authoritative: a value_path in the call may only reference these names (plus `value` for the port's own value). Use the .. syntax to traverse the tree of ports, e.g. 'foo..bar' for the child 'bar' of port 'foo'. */
  dependencies?: InputMaybe<Array<Scalars['String']['input']>>;
  /** The error message to display when the validation fails */
  errorMessage?: InputMaybe<Scalars['String']['input']>;
  /** An optional human-readable label for the validator. */
  label?: InputMaybe<Scalars['String']['input']>;
  /** The authoring expression the call was compiled from (informational; never parsed or validated by the server). */
  source?: InputMaybe<Scalars['String']['input']>;
};

/** A catalog's default widget for ports matching a kind and/or structure identifier. A UI applies it when a port has no explicit widget; an identifier match beats a kind match. */
export type WidgetDefault = {
  __typename?: 'WidgetDefault';
  identifier?: Maybe<Scalars['String']['output']>;
  kind?: Maybe<PortKind>;
  returnWidget?: Maybe<ReturnWidget>;
  widget?: Maybe<AssignWidget>;
};

/** A catalog's default widget for ports matching a kind and/or structure identifier. A UI applies it when a port has no explicit widget; an identifier match beats a kind match. */
export type WidgetDefaultInput = {
  /** Structure identifier the default applies to, e.g. '@mikro/image'. */
  identifier?: InputMaybe<Scalars['String']['input']>;
  /** Port kind the default applies to. With `identifier`, both must match. */
  kind?: InputMaybe<PortKind>;
  /** The return widget to render for matching return ports that declare no widget of their own. */
  returnWidget?: InputMaybe<ReturnWidgetInput>;
  /** The assign widget to render for matching argument ports that declare no widget of their own. */
  widget?: InputMaybe<AssignWidgetInput>;
};

/** A window that is calculated */
export type Window = {
  __typename?: 'Window';
  label?: Maybe<Scalars['String']['output']>;
  windowFunction: WindowFunction;
};

/** Aggregation computed over a tracked value within a window. */
export enum WindowFunction {
  Count = 'COUNT',
  First = 'FIRST',
  Last = 'LAST',
  Max = 'MAX',
  Mean = 'MEAN',
  Min = 'MIN',
  Std = 'STD',
  Sum = 'SUM'
}

/** A window that is calculated */
export type WindowInput = {
  /** An optional human-readable label for the window. */
  label?: InputMaybe<Scalars['String']['input']>;
  /** The aggregation to compute over the tracked value within the window. */
  windowFunction: WindowFunction;
};

export type _Entity = MediaStore | Session | User;

export type _Service = {
  __typename?: '_Service';
  sdl: Scalars['String']['output'];
};

export type ListTaskFragment = { __typename?: 'Task', id: string, reference?: string | null, latestEventKind: TaskEventKind, isDone: boolean, createdAt: any, finishedAt?: any | null, action: { __typename?: 'Action', id: string, name: string }, agent?: { __typename?: 'Agent', id: string, name: string } | null, events: Array<{ __typename?: 'TaskEvent', id: string, kind: TaskEventKind, level: LogLevel, message?: string | null, progress?: number | null, returns?: any | null, createdAt: any }> };

export type TaskEventFragment = { __typename?: 'TaskEvent', id: string, kind: TaskEventKind, level: LogLevel, message?: string | null, progress?: number | null, returns?: any | null, createdAt: any };

export type TaskPortFragment = { __typename?: 'ArgPort', key: string, label?: string | null, kind: PortKind, identifier?: any | null, description?: string | null };

export type TaskReturnPortFragment = { __typename?: 'ReturnPort', key: string, label?: string | null, kind: PortKind, identifier?: any | null, description?: string | null };

export type ChildTaskFragment = { __typename?: 'Task', id: string, reference?: string | null, latestEventKind: TaskEventKind, isDone: boolean, createdAt: any, finishedAt?: any | null, parentStep?: number | null, callKey?: string | null, action: { __typename?: 'Action', id: string, name: string } };

export type DetailTaskFragment = { __typename?: 'Task', id: string, reference?: string | null, latestEventKind: TaskEventKind, latestInstructKind: TaskInstructKind, isDone: boolean, args: any, createdAt: any, finishedAt?: any | null, action: { __typename?: 'Action', id: string, name: string, description?: string | null, args: Array<{ __typename?: 'ArgPort', key: string, label?: string | null, kind: PortKind, identifier?: any | null, description?: string | null }>, returns: Array<{ __typename?: 'ReturnPort', key: string, label?: string | null, kind: PortKind, identifier?: any | null, description?: string | null }> }, implementation?: { __typename?: 'Implementation', id: string, interface: string } | null, agent?: { __typename?: 'Agent', id: string, name: string, connected: boolean } | null, parent?: { __typename?: 'Task', id: string, action: { __typename?: 'Action', id: string, name: string } } | null, root?: { __typename?: 'Task', id: string } | null, events: Array<{ __typename?: 'TaskEvent', id: string, kind: TaskEventKind, level: LogLevel, message?: string | null, progress?: number | null, returns?: any | null, createdAt: any }>, children: Array<{ __typename?: 'Task', id: string, reference?: string | null, latestEventKind: TaskEventKind, isDone: boolean, createdAt: any, finishedAt?: any | null, parentStep?: number | null, callKey?: string | null, action: { __typename?: 'Action', id: string, name: string } }> };

export type TaskChangeFragment = { __typename?: 'TaskChange', id: string, reference?: string | null, isDone: boolean, latestEventKind: TaskEventKind, latestInstructKind: TaskInstructKind, statusMessage?: string | null, root?: string | null, parent?: string | null, createdAt: any, updatedAt: any, finishedAt?: any | null };

export type TaskEventChangeFragment = { __typename?: 'TaskEventChange', id: string, task: string, kind: TaskEventKind, message?: string | null, progress?: number | null, returns?: any | null, createdAt: any };

export type CancelTaskMutationVariables = Exact<{
  task: Scalars['ID']['input'];
}>;


export type CancelTaskMutation = { __typename?: 'Mutation', cancel: { __typename?: 'Task', id: string, latestEventKind: TaskEventKind, latestInstructKind: TaskInstructKind, isDone: boolean } };

export type InterruptTaskMutationVariables = Exact<{
  task: Scalars['ID']['input'];
}>;


export type InterruptTaskMutation = { __typename?: 'Mutation', interrupt: { __typename?: 'Task', id: string, latestEventKind: TaskEventKind, latestInstructKind: TaskInstructKind, isDone: boolean } };

export type PauseTaskMutationVariables = Exact<{
  task: Scalars['ID']['input'];
}>;


export type PauseTaskMutation = { __typename?: 'Mutation', pause: { __typename?: 'Task', id: string, latestEventKind: TaskEventKind, latestInstructKind: TaskInstructKind, isDone: boolean } };

export type ResumeTaskMutationVariables = Exact<{
  task: Scalars['ID']['input'];
}>;


export type ResumeTaskMutation = { __typename?: 'Mutation', resume: { __typename?: 'Task', id: string, latestEventKind: TaskEventKind, latestInstructKind: TaskInstructKind, isDone: boolean } };

export type ListTasksQueryVariables = Exact<{
  filter?: InputMaybe<TaskFilter>;
  ordering?: InputMaybe<Array<TaskOrder> | TaskOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListTasksQuery = { __typename?: 'Query', tasks: Array<{ __typename?: 'Task', id: string, reference?: string | null, latestEventKind: TaskEventKind, isDone: boolean, createdAt: any, finishedAt?: any | null, action: { __typename?: 'Action', id: string, name: string }, agent?: { __typename?: 'Agent', id: string, name: string } | null, events: Array<{ __typename?: 'TaskEvent', id: string, kind: TaskEventKind, level: LogLevel, message?: string | null, progress?: number | null, returns?: any | null, createdAt: any }> }> };

export type DetailTaskQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailTaskQuery = { __typename?: 'Query', task: { __typename?: 'Task', id: string, reference?: string | null, latestEventKind: TaskEventKind, latestInstructKind: TaskInstructKind, isDone: boolean, args: any, createdAt: any, finishedAt?: any | null, action: { __typename?: 'Action', id: string, name: string, description?: string | null, args: Array<{ __typename?: 'ArgPort', key: string, label?: string | null, kind: PortKind, identifier?: any | null, description?: string | null }>, returns: Array<{ __typename?: 'ReturnPort', key: string, label?: string | null, kind: PortKind, identifier?: any | null, description?: string | null }> }, implementation?: { __typename?: 'Implementation', id: string, interface: string } | null, agent?: { __typename?: 'Agent', id: string, name: string, connected: boolean } | null, parent?: { __typename?: 'Task', id: string, action: { __typename?: 'Action', id: string, name: string } } | null, root?: { __typename?: 'Task', id: string } | null, events: Array<{ __typename?: 'TaskEvent', id: string, kind: TaskEventKind, level: LogLevel, message?: string | null, progress?: number | null, returns?: any | null, createdAt: any }>, children: Array<{ __typename?: 'Task', id: string, reference?: string | null, latestEventKind: TaskEventKind, isDone: boolean, createdAt: any, finishedAt?: any | null, parentStep?: number | null, callKey?: string | null, action: { __typename?: 'Action', id: string, name: string } }> } };

export type WatchTasksSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type WatchTasksSubscription = { __typename?: 'Subscription', tasks: { __typename?: 'TaskChangeEvent', create?: { __typename?: 'TaskChange', id: string, reference?: string | null, isDone: boolean, latestEventKind: TaskEventKind, latestInstructKind: TaskInstructKind, statusMessage?: string | null, root?: string | null, parent?: string | null, createdAt: any, updatedAt: any, finishedAt?: any | null } | null, event?: { __typename?: 'TaskEventChange', id: string, task: string, kind: TaskEventKind, message?: string | null, progress?: number | null, returns?: any | null, createdAt: any } | null } };

export type WatchChildTasksSubscriptionVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type WatchChildTasksSubscription = { __typename?: 'Subscription', childTasks: { __typename?: 'ChildTaskEvent', create?: { __typename?: 'TaskChange', id: string, reference?: string | null, isDone: boolean, latestEventKind: TaskEventKind, latestInstructKind: TaskInstructKind, statusMessage?: string | null, root?: string | null, parent?: string | null, createdAt: any, updatedAt: any, finishedAt?: any | null } | null, update?: { __typename?: 'TaskChange', id: string, reference?: string | null, isDone: boolean, latestEventKind: TaskEventKind, latestInstructKind: TaskInstructKind, statusMessage?: string | null, root?: string | null, parent?: string | null, createdAt: any, updatedAt: any, finishedAt?: any | null } | null } };

export const TaskEventFragmentDoc = gql`
    fragment TaskEvent on TaskEvent {
  id
  kind
  level
  message
  progress
  returns
  createdAt
}
    `;
export const ListTaskFragmentDoc = gql`
    fragment ListTask on Task {
  id
  reference
  latestEventKind
  isDone
  createdAt
  finishedAt
  action {
    id
    name
  }
  agent {
    id
    name
  }
  events(pagination: {limit: 3}, ordering: [{createdAt: DESC}]) {
    ...TaskEvent
  }
}
    ${TaskEventFragmentDoc}`;
export const TaskPortFragmentDoc = gql`
    fragment TaskPort on ArgPort {
  key
  label
  kind
  identifier
  description
}
    `;
export const TaskReturnPortFragmentDoc = gql`
    fragment TaskReturnPort on ReturnPort {
  key
  label
  kind
  identifier
  description
}
    `;
export const ChildTaskFragmentDoc = gql`
    fragment ChildTask on Task {
  id
  reference
  latestEventKind
  isDone
  createdAt
  finishedAt
  parentStep
  callKey
  action {
    id
    name
  }
}
    `;
export const DetailTaskFragmentDoc = gql`
    fragment DetailTask on Task {
  id
  reference
  latestEventKind
  latestInstructKind
  isDone
  args
  createdAt
  finishedAt
  action {
    id
    name
    description
    args {
      ...TaskPort
    }
    returns {
      ...TaskReturnPort
    }
  }
  implementation {
    id
    interface
  }
  agent {
    id
    name
    connected
  }
  parent {
    id
    action {
      id
      name
    }
  }
  root {
    id
  }
  events(pagination: {limit: 200}, ordering: [{createdAt: DESC}]) {
    ...TaskEvent
  }
  children(ordering: [{createdAt: ASC}]) {
    ...ChildTask
  }
}
    ${TaskPortFragmentDoc}
${TaskReturnPortFragmentDoc}
${TaskEventFragmentDoc}
${ChildTaskFragmentDoc}`;
export const TaskChangeFragmentDoc = gql`
    fragment TaskChange on TaskChange {
  id
  reference
  isDone
  latestEventKind
  latestInstructKind
  statusMessage
  root
  parent
  createdAt
  updatedAt
  finishedAt
}
    `;
export const TaskEventChangeFragmentDoc = gql`
    fragment TaskEventChange on TaskEventChange {
  id
  task
  kind
  message
  progress
  returns
  createdAt
}
    `;
export const CancelTaskDocument = gql`
    mutation CancelTask($task: ID!) {
  cancel(input: {task: $task}) {
    id
    latestEventKind
    latestInstructKind
    isDone
  }
}
    `;
export type CancelTaskMutationFn = Apollo.MutationFunction<CancelTaskMutation, CancelTaskMutationVariables>;

/**
 * __useCancelTaskMutation__
 *
 * To run a mutation, you first call `useCancelTaskMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCancelTaskMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [cancelTaskMutation, { data, loading, error }] = useCancelTaskMutation({
 *   variables: {
 *      task: // value for 'task'
 *   },
 * });
 */
export function useCancelTaskMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CancelTaskMutation, CancelTaskMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CancelTaskMutation, CancelTaskMutationVariables>(CancelTaskDocument, options);
      }
export type CancelTaskMutationHookResult = ReturnType<typeof useCancelTaskMutation>;
export type CancelTaskMutationResult = Apollo.MutationResult<CancelTaskMutation>;
export type CancelTaskMutationOptions = Apollo.BaseMutationOptions<CancelTaskMutation, CancelTaskMutationVariables>;
export const InterruptTaskDocument = gql`
    mutation InterruptTask($task: ID!) {
  interrupt(input: {task: $task}) {
    id
    latestEventKind
    latestInstructKind
    isDone
  }
}
    `;
export type InterruptTaskMutationFn = Apollo.MutationFunction<InterruptTaskMutation, InterruptTaskMutationVariables>;

/**
 * __useInterruptTaskMutation__
 *
 * To run a mutation, you first call `useInterruptTaskMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useInterruptTaskMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [interruptTaskMutation, { data, loading, error }] = useInterruptTaskMutation({
 *   variables: {
 *      task: // value for 'task'
 *   },
 * });
 */
export function useInterruptTaskMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<InterruptTaskMutation, InterruptTaskMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<InterruptTaskMutation, InterruptTaskMutationVariables>(InterruptTaskDocument, options);
      }
export type InterruptTaskMutationHookResult = ReturnType<typeof useInterruptTaskMutation>;
export type InterruptTaskMutationResult = Apollo.MutationResult<InterruptTaskMutation>;
export type InterruptTaskMutationOptions = Apollo.BaseMutationOptions<InterruptTaskMutation, InterruptTaskMutationVariables>;
export const PauseTaskDocument = gql`
    mutation PauseTask($task: ID!) {
  pause(input: {task: $task}) {
    id
    latestEventKind
    latestInstructKind
    isDone
  }
}
    `;
export type PauseTaskMutationFn = Apollo.MutationFunction<PauseTaskMutation, PauseTaskMutationVariables>;

/**
 * __usePauseTaskMutation__
 *
 * To run a mutation, you first call `usePauseTaskMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePauseTaskMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [pauseTaskMutation, { data, loading, error }] = usePauseTaskMutation({
 *   variables: {
 *      task: // value for 'task'
 *   },
 * });
 */
export function usePauseTaskMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<PauseTaskMutation, PauseTaskMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<PauseTaskMutation, PauseTaskMutationVariables>(PauseTaskDocument, options);
      }
export type PauseTaskMutationHookResult = ReturnType<typeof usePauseTaskMutation>;
export type PauseTaskMutationResult = Apollo.MutationResult<PauseTaskMutation>;
export type PauseTaskMutationOptions = Apollo.BaseMutationOptions<PauseTaskMutation, PauseTaskMutationVariables>;
export const ResumeTaskDocument = gql`
    mutation ResumeTask($task: ID!) {
  resume(input: {task: $task}) {
    id
    latestEventKind
    latestInstructKind
    isDone
  }
}
    `;
export type ResumeTaskMutationFn = Apollo.MutationFunction<ResumeTaskMutation, ResumeTaskMutationVariables>;

/**
 * __useResumeTaskMutation__
 *
 * To run a mutation, you first call `useResumeTaskMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResumeTaskMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resumeTaskMutation, { data, loading, error }] = useResumeTaskMutation({
 *   variables: {
 *      task: // value for 'task'
 *   },
 * });
 */
export function useResumeTaskMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ResumeTaskMutation, ResumeTaskMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ResumeTaskMutation, ResumeTaskMutationVariables>(ResumeTaskDocument, options);
      }
export type ResumeTaskMutationHookResult = ReturnType<typeof useResumeTaskMutation>;
export type ResumeTaskMutationResult = Apollo.MutationResult<ResumeTaskMutation>;
export type ResumeTaskMutationOptions = Apollo.BaseMutationOptions<ResumeTaskMutation, ResumeTaskMutationVariables>;
export const ListTasksDocument = gql`
    query ListTasks($filter: TaskFilter, $ordering: [TaskOrder!], $pagination: OffsetPaginationInput) {
  tasks(filters: $filter, ordering: $ordering, pagination: $pagination) {
    ...ListTask
  }
}
    ${ListTaskFragmentDoc}`;

/**
 * __useListTasksQuery__
 *
 * To run a query within a React component, call `useListTasksQuery` and pass it any options that fit your needs.
 * When your component renders, `useListTasksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListTasksQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *      ordering: // value for 'ordering'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListTasksQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListTasksQuery, ListTasksQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListTasksQuery, ListTasksQueryVariables>(ListTasksDocument, options);
      }
export function useListTasksLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListTasksQuery, ListTasksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListTasksQuery, ListTasksQueryVariables>(ListTasksDocument, options);
        }
export type ListTasksQueryHookResult = ReturnType<typeof useListTasksQuery>;
export type ListTasksLazyQueryHookResult = ReturnType<typeof useListTasksLazyQuery>;
export type ListTasksQueryResult = Apollo.QueryResult<ListTasksQuery, ListTasksQueryVariables>;
export const DetailTaskDocument = gql`
    query DetailTask($id: ID!) {
  task(id: $id) {
    ...DetailTask
  }
}
    ${DetailTaskFragmentDoc}`;

/**
 * __useDetailTaskQuery__
 *
 * To run a query within a React component, call `useDetailTaskQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailTaskQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailTaskQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailTaskQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DetailTaskQuery, DetailTaskQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DetailTaskQuery, DetailTaskQueryVariables>(DetailTaskDocument, options);
      }
export function useDetailTaskLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DetailTaskQuery, DetailTaskQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DetailTaskQuery, DetailTaskQueryVariables>(DetailTaskDocument, options);
        }
export type DetailTaskQueryHookResult = ReturnType<typeof useDetailTaskQuery>;
export type DetailTaskLazyQueryHookResult = ReturnType<typeof useDetailTaskLazyQuery>;
export type DetailTaskQueryResult = Apollo.QueryResult<DetailTaskQuery, DetailTaskQueryVariables>;
export const WatchTasksDocument = gql`
    subscription WatchTasks {
  tasks {
    create {
      ...TaskChange
    }
    event {
      ...TaskEventChange
    }
  }
}
    ${TaskChangeFragmentDoc}
${TaskEventChangeFragmentDoc}`;

/**
 * __useWatchTasksSubscription__
 *
 * To run a query within a React component, call `useWatchTasksSubscription` and pass it any options that fit your needs.
 * When your component renders, `useWatchTasksSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWatchTasksSubscription({
 *   variables: {
 *   },
 * });
 */
export function useWatchTasksSubscription(baseOptions?: ApolloReactHooks.SubscriptionHookOptions<WatchTasksSubscription, WatchTasksSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useSubscription<WatchTasksSubscription, WatchTasksSubscriptionVariables>(WatchTasksDocument, options);
      }
export type WatchTasksSubscriptionHookResult = ReturnType<typeof useWatchTasksSubscription>;
export type WatchTasksSubscriptionResult = Apollo.SubscriptionResult<WatchTasksSubscription>;
export const WatchChildTasksDocument = gql`
    subscription WatchChildTasks($id: ID!) {
  childTasks(id: $id) {
    create {
      ...TaskChange
    }
    update {
      ...TaskChange
    }
  }
}
    ${TaskChangeFragmentDoc}`;

/**
 * __useWatchChildTasksSubscription__
 *
 * To run a query within a React component, call `useWatchChildTasksSubscription` and pass it any options that fit your needs.
 * When your component renders, `useWatchChildTasksSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWatchChildTasksSubscription({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useWatchChildTasksSubscription(baseOptions: ApolloReactHooks.SubscriptionHookOptions<WatchChildTasksSubscription, WatchChildTasksSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useSubscription<WatchChildTasksSubscription, WatchChildTasksSubscriptionVariables>(WatchChildTasksDocument, options);
      }
export type WatchChildTasksSubscriptionHookResult = ReturnType<typeof useWatchChildTasksSubscription>;
export type WatchChildTasksSubscriptionResult = Apollo.SubscriptionResult<WatchChildTasksSubscription>;