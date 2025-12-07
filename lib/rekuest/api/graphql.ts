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
  ActionHash: { input: any; output: any; }
  AnyDefault: { input: any; output: any; }
  Arg: { input: any; output: any; }
  Args: { input: any; output: any; }
  DateTime: { input: any; output: any; }
  Identifier: { input: any; output: any; }
  InstanceId: { input: any; output: any; }
  SearchQuery: { input: any; output: any; }
  ValidatorFunction: { input: any; output: any; }
};

export type AckInput = {
  assignation: Scalars['ID']['input'];
};

/** Represents an executable action in the system. */
export type Action = {
  __typename?: 'Action';
  /** Input arguments (ports) for the action. */
  args: Array<Port>;
  /** Assignations created for this action. */
  assignations: Array<Assignation>;
  /** Collections to which this action belongs. */
  collections: Array<Collection>;
  /** Timestamp when the action was defined. */
  definedAt: Scalars['DateTime']['output'];
  /** Optional description of the action. */
  description?: Maybe<Scalars['String']['output']>;
  /** Unique hash identifying the action definition. */
  hash: Scalars['ActionHash']['output'];
  /** Unique ID of the action. */
  id: Scalars['ID']['output'];
  /** List of implementations for this action. */
  implementations: Array<Implementation>;
  /** Interfaces implemented by the action. */
  interfaces: Array<Scalars['String']['output']>;
  /** Marks whether the action is in development. */
  isDev: Scalars['Boolean']['output'];
  /** Actions for which this is a test. */
  isTestFor: Array<Action>;
  /** The kind or category of the action. */
  kind: ActionKind;
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
  /** Reservations related to this action. */
  reservations?: Maybe<Array<Reservation>>;
  /** Output values (ports) returned by the action. */
  returns: Array<Port>;
  /** Retrieve assignations where this action has run. */
  runs?: Maybe<Array<Assignation>>;
  /** Scope of the action, e.g., user or system. */
  scope: ActionScope;
  /** Indicates whether the action maintains state. */
  stateful: Scalars['Boolean']['output'];
  /** Test cases for this action. */
  testCases?: Maybe<Array<TestCase>>;
  /** List of tests associated with the action. */
  tests: Array<Action>;
};


/** Represents an executable action in the system. */
export type ActionAssignationsArgs = {
  filters?: InputMaybe<AssignationFilter>;
  order?: InputMaybe<AssignationOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Represents an executable action in the system. */
export type ActionImplementationsArgs = {
  filters?: InputMaybe<ImplementationFilter>;
  order?: InputMaybe<ImplementationOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Represents an executable action in the system. */
export type ActionIsTestForArgs = {
  filters?: InputMaybe<ActionFilter>;
  order?: InputMaybe<ActionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Represents an executable action in the system. */
export type ActionProtocolsArgs = {
  filters?: InputMaybe<ProtocolFilter>;
  order?: InputMaybe<ProtocolOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Represents an executable action in the system. */
export type ActionReservationsArgs = {
  filters?: InputMaybe<ReservationFilter>;
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
  order?: InputMaybe<ActionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Input model for action demand. */
export type ActionDemand = {
  __typename?: 'ActionDemand';
  argMatches?: Maybe<Array<PortMatch>>;
  description?: Maybe<Scalars['String']['output']>;
  forceArgLength?: Maybe<Scalars['Int']['output']>;
  forceReturnLength?: Maybe<Scalars['Int']['output']>;
  hash?: Maybe<Scalars['ActionHash']['output']>;
  key: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
  protocols?: Maybe<Array<Scalars['ID']['output']>>;
  returnMatches?: Maybe<Array<PortMatch>>;
};

/** The input for creating a action demand. */
export type ActionDemandInput = {
  /** The demands for the action args and returns. This is used to identify the demand in the system. */
  argMatches?: InputMaybe<Array<PortMatchInput>>;
  /** The description of the action. This can described the action and its purpose. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Require that the action has a specific number of args. This is used to identify the demand in the system. */
  forceArgLength?: InputMaybe<Scalars['Int']['input']>;
  /** Require that the action has a specific number of returns. This is used to identify the demand in the system. */
  forceReturnLength?: InputMaybe<Scalars['Int']['input']>;
  /** The hash of the action. This is used to identify the action in the system. */
  hash?: InputMaybe<Scalars['ActionHash']['input']>;
  /** The key of the action. This is used to identify the action in the system. */
  key: Scalars['String']['input'];
  /** The name of the action. This is used to identify the action in the system. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** The protocols that the action has to implement. This is used to identify the demand in the system. */
  protocols?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** The demands for the action args and returns. This is used to identify the demand in the system. */
  returnMatches?: InputMaybe<Array<PortMatchInput>>;
};

/**
 * A dependency for a implementation. By defining dependencies, you can
 *     create a dependency graph for your implementations and actions
 */
export type ActionDependencyInput = {
  allowInactive?: InputMaybe<Scalars['Boolean']['input']>;
  argMatches?: InputMaybe<Array<PortMatchInput>>;
  description?: InputMaybe<Scalars['String']['input']>;
  forceArgLength?: InputMaybe<Scalars['Int']['input']>;
  forceReturnLength?: InputMaybe<Scalars['Int']['input']>;
  hash?: InputMaybe<Scalars['ActionHash']['input']>;
  key: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  optional?: Scalars['Boolean']['input'];
  protocols?: InputMaybe<Array<Scalars['ID']['input']>>;
  returnMatches?: InputMaybe<Array<PortMatchInput>>;
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
  demands?: InputMaybe<Array<PortDemandInput>>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  inCollection?: InputMaybe<Scalars['String']['input']>;
  kind?: InputMaybe<ActionKind>;
  name?: InputMaybe<StrFilterLookup>;
  protocols?: InputMaybe<Array<Scalars['String']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
  usedAfter?: InputMaybe<Scalars['DateTime']['input']>;
  usedBefore?: InputMaybe<Scalars['DateTime']['input']>;
};

/** The kind of action. */
export enum ActionKind {
  Function = 'FUNCTION',
  Generator = 'GENERATOR'
}

export type ActionMapping = {
  __typename?: 'ActionMapping';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  implementation: Implementation;
  key: Scalars['String']['output'];
  materializedBlok: MaterializedBlok;
  updatedAt: Scalars['DateTime']['output'];
};

export type ActionOrder = {
  definedAt?: InputMaybe<Ordering>;
  usedAt?: InputMaybe<Ordering>;
};

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
  /** Assignations executed by this agent. */
  assignations: Array<Assignation>;
  /** Get the count of implementations available on this agent. */
  blocked: Scalars['Boolean']['output'];
  /** Is the agent currently connected. */
  connected: Scalars['Boolean']['output'];
  /** List of installed agent extensions. */
  extensions: Array<Scalars['String']['output']>;
  /** Filesystem shelves available on the agent. */
  fileSystemShelves: Array<FilesystemShelve>;
  /** Historical records of agent's hardware. */
  hardwareRecords: Array<HardwareRecord>;
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
  /** Unique instance identifier on the agent. */
  instanceId: Scalars['InstanceId']['output'];
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
  /** Check if this agent is pinned by the current user. */
  pinned: Scalars['Boolean']['output'];
  /** Registry entry this agent belongs to. */
  registry: Registry;
  /** Current and historical states associated with the agent. */
  states: Array<State>;
};


/** Represents a compute agent that can execute implementations. */
export type AgentAssignationsArgs = {
  filters?: InputMaybe<AssignationFilter>;
  order?: InputMaybe<AssignationOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Represents a compute agent that can execute implementations. */
export type AgentFileSystemShelvesArgs = {
  filters?: InputMaybe<FilesystemShelveFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
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
  order?: InputMaybe<ImplementationOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type AgentChangeEvent = {
  __typename?: 'AgentChangeEvent';
  create?: Maybe<Agent>;
  delete?: Maybe<Scalars['ID']['output']>;
  update?: Maybe<Agent>;
};

/** A way to filter agents */
export type AgentFilter = {
  AND?: InputMaybe<AgentFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<AgentFilter>;
  OR?: InputMaybe<AgentFilter>;
  actionDemands?: InputMaybe<Array<ActionDemandInput>>;
  /** Filter using app identifier */
  appIdentifier?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by client ID of the app the agent is registered to */
  clientId?: InputMaybe<Scalars['String']['input']>;
  /** Filter based on device */
  deviceId?: InputMaybe<Scalars['ID']['input']>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
  /** Filter by extensions of the agents */
  extensions?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Filter by implementations of the agents */
  hasImplementations?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Filter by states of the agents */
  hasStates?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Filter by IDs of the agents */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Filter by instance ID of the agent */
  instanceId?: InputMaybe<Scalars['String']['input']>;
  /** Filter by pinned agents */
  pinned?: InputMaybe<Scalars['Boolean']['input']>;
  scope?: InputMaybe<ScopeFilter>;
  /** Filter by name of the agents */
  search?: InputMaybe<Scalars['String']['input']>;
  stateDemands?: InputMaybe<Array<SchemaDemandInput>>;
  /** Filter by user ID */
  user?: InputMaybe<Scalars['ID']['input']>;
  /** Filter based on version string */
  versionNumber?: InputMaybe<Scalars['String']['input']>;
};

export type AgentInput = {
  /** The extensions of the agent. This is used to identify the agent in the system. */
  extensions?: InputMaybe<Array<Scalars['String']['input']>>;
  /** The instance ID of the agent. This is used to identify the agent in the system. */
  instanceId: Scalars['InstanceId']['input'];
  /** The name of the agent. This is used to identify the agent in the system. */
  name?: InputMaybe<Scalars['String']['input']>;
};

export enum AgentKind {
  Webhook = 'WEBHOOK',
  Websocket = 'WEBSOCKET'
}

export type AgentOrder = {
  lastSeen?: InputMaybe<Ordering>;
};

/** Profile information for a user. */
export type App = {
  __typename?: 'App';
  /** Unique ID of the app. */
  id: Scalars['ID']['output'];
  /** Name of the app. */
  identifier: Scalars['String']['output'];
};

/** The input for archiving a state schema. */
export type ArchiveStateInput = {
  stateSchema: Scalars['ID']['input'];
};

/** The input for assigning args to a action. */
export type AssignInput = {
  action?: InputMaybe<Scalars['ID']['input']>;
  actionHash?: InputMaybe<Scalars['ActionHash']['input']>;
  agent?: InputMaybe<Scalars['ID']['input']>;
  args: Scalars['Args']['input'];
  cached?: Scalars['Boolean']['input'];
  capture?: Scalars['Boolean']['input'];
  dependencies?: InputMaybe<Scalars['Args']['input']>;
  ephemeral?: Scalars['Boolean']['input'];
  hooks?: InputMaybe<Array<HookInput>>;
  implementation?: InputMaybe<Scalars['ID']['input']>;
  instanceId: Scalars['InstanceId']['input'];
  interface?: InputMaybe<Scalars['String']['input']>;
  isHook?: InputMaybe<Scalars['Boolean']['input']>;
  log?: Scalars['Boolean']['input'];
  parent?: InputMaybe<Scalars['ID']['input']>;
  /** The policy for the assignation. This defines how the assignation should be handled. */
  policy?: InputMaybe<AssignPolicy>;
  reference?: InputMaybe<Scalars['String']['input']>;
  reservation?: InputMaybe<Scalars['ID']['input']>;
  step?: InputMaybe<Scalars['Boolean']['input']>;
};

export enum AssignPolicy {
  Automatic = 'AUTOMATIC',
  FastestResponse = 'FASTEST_RESPONSE',
  LeastBusy = 'LEAST_BUSY',
  RoundRobin = 'ROUND_ROBIN'
}

export type AssignWidget = {
  followValue?: Maybe<Scalars['String']['output']>;
  kind: AssignWidgetKind;
};

export type AssignWidgetInput = {
  /** Whether to display the input as a paragraph or not. This is used for text inputs and dropdowns */
  asParagraph?: InputMaybe<Scalars['Boolean']['input']>;
  choices?: InputMaybe<Array<ChoiceInput>>;
  dependencies?: InputMaybe<Array<Scalars['String']['input']>>;
  fallback?: InputMaybe<AssignWidgetInput>;
  filters?: InputMaybe<Array<PortInput>>;
  hook?: InputMaybe<Scalars['String']['input']>;
  kind: AssignWidgetKind;
  max?: InputMaybe<Scalars['Float']['input']>;
  min?: InputMaybe<Scalars['Float']['input']>;
  placeholder?: InputMaybe<Scalars['String']['input']>;
  query?: InputMaybe<Scalars['SearchQuery']['input']>;
  step?: InputMaybe<Scalars['Float']['input']>;
  ward?: InputMaybe<Scalars['String']['input']>;
};

/** The kind of assign widget. */
export enum AssignWidgetKind {
  Choice = 'CHOICE',
  Custom = 'CUSTOM',
  Search = 'SEARCH',
  Slider = 'SLIDER',
  StateChoice = 'STATE_CHOICE',
  String = 'STRING'
}

/** Tracks the assignment of an implementation to a specific task. */
export type Assignation = {
  __typename?: 'Assignation';
  /** List of resources or entities this assignation acted upon. */
  actedOn: Array<Scalars['String']['output']>;
  /** Action assigned. */
  action: Action;
  /** Agent responsible for this assignation. */
  agent?: Maybe<Agent>;
  /** Get a specific argument by key. */
  arg?: Maybe<Scalars['Args']['output']>;
  /** Arguments used in the assignation. */
  args: Scalars['AnyDefault']['output'];
  /** Indicates if the assignation is being captured for logging or debugging. */
  capture: Scalars['Boolean']['output'];
  /** Child assignations spawned from this one. */
  children: Array<Assignation>;
  /** Creation timestamp. */
  createdAt: Scalars['DateTime']['output'];
  /** The used dependencies for this assignemnet */
  dependencies: Scalars['AnyDefault']['output'];
  /** Indicates if the assignation should be deleted after completion. */
  ephemeral: Scalars['Boolean']['output'];
  /** List of recent events for this assignation. */
  events: Array<AssignationEvent>;
  /** Timestamp when the assignation was finished. */
  finishedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Unique ID of the assignation. */
  id: Scalars['ID']['output'];
  /** Implementation assigned to execute. */
  implementation: Implementation;
  /** List of recent instructions for this assignation. */
  instructs: Array<AssignationInstruct>;
  /** Indicates if the assignation is completed. */
  isDone: Scalars['Boolean']['output'];
  /** Type of the latest event. */
  latestEventKind: AssignationEventKind;
  /** Last instruction type. */
  latestInstructKind: AssignationInstructKind;
  /** Parent assignation that triggered this one. */
  parent?: Maybe<Assignation>;
  /** Optional external reference for tracking. */
  reference?: Maybe<Scalars['String']['output']>;
  /** Reservation that caused this assignation. */
  reservation?: Maybe<Reservation>;
  /** Root assignation in the creation chain. */
  root?: Maybe<Assignation>;
  /** Current status message. */
  statusMessage?: Maybe<Scalars['String']['output']>;
  /** Last update timestamp. */
  updatedAt: Scalars['DateTime']['output'];
  /** Waiter responsible for this assignation. */
  waiter: Waiter;
};


/** Tracks the assignment of an implementation to a specific task. */
export type AssignationArgArgs = {
  key: Scalars['String']['input'];
};


/** Tracks the assignment of an implementation to a specific task. */
export type AssignationChildrenArgs = {
  filters?: InputMaybe<AssignationFilter>;
  order?: InputMaybe<AssignationOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type AssignationChangeEvent = {
  __typename?: 'AssignationChangeEvent';
  create?: Maybe<Assignation>;
  event?: Maybe<AssignationEvent>;
};

/** An event that occurred during an assignation. */
export type AssignationEvent = {
  __typename?: 'AssignationEvent';
  /** Associated assignation. */
  assignation: Assignation;
  /** Time when event was created. */
  createdAt: Scalars['DateTime']['output'];
  /** If this event was delegated, the assignation it was delegated to. */
  delegatedTo?: Maybe<Assignation>;
  /** Unique ID of the event. */
  id: Scalars['ID']['output'];
  /** Kind of assignation event. */
  kind: AssignationEventKind;
  /** Default log level. */
  level: LogLevel;
  /** Optional message associated with the event. */
  message?: Maybe<Scalars['String']['output']>;
  /** Name of the event. */
  name: Scalars['String']['output'];
  /** Progress percentage. */
  progress?: Maybe<Scalars['Int']['output']>;
  /** Reference string for the event. */
  reference: Scalars['String']['output'];
  /** Optional return values. */
  returns?: Maybe<Scalars['AnyDefault']['output']>;
};

/** The event kind of the assignationevent */
export enum AssignationEventKind {
  Assign = 'ASSIGN',
  Bound = 'BOUND',
  Canceling = 'CANCELING',
  Cancelled = 'CANCELLED',
  Critical = 'CRITICAL',
  Delegate = 'DELEGATE',
  Disconnected = 'DISCONNECTED',
  Done = 'DONE',
  Error = 'ERROR',
  Interupted = 'INTERUPTED',
  Interupting = 'INTERUPTING',
  Log = 'LOG',
  Progress = 'PROGRESS',
  Queued = 'QUEUED',
  Yield = 'YIELD'
}

/** Numeric/aggregatable fields of Assignation */
export enum AssignationField {
  CreatedAt = 'CREATED_AT'
}

export type AssignationFilter = {
  AND?: InputMaybe<AssignationFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<AssignationFilter>;
  OR?: InputMaybe<AssignationFilter>;
  actedOn?: InputMaybe<Array<Scalars['String']['input']>>;
  agent?: InputMaybe<Scalars['ID']['input']>;
  clientId?: InputMaybe<Scalars['ID']['input']>;
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  implementation?: InputMaybe<Scalars['ID']['input']>;
  instanceId?: InputMaybe<Scalars['InstanceId']['input']>;
  reservation?: InputMaybe<ReservationFilter>;
  state?: InputMaybe<Array<AssignationEventKind>>;
  status?: InputMaybe<Array<AssignationStatus>>;
};

/** An instruct event for a specific assignation. */
export type AssignationInstruct = {
  __typename?: 'AssignationInstruct';
  /** Assignation the instruction relates to. */
  assignation: Assignation;
  /** Time when instruction was issued. */
  createdAt: Scalars['DateTime']['output'];
  /** Unique ID of the instruct event. */
  id: Scalars['ID']['output'];
  /** Type of instruction. */
  kind: AssignationInstructKind;
};

/** The event kind of the assignationevent */
export enum AssignationInstructKind {
  Assign = 'ASSIGN',
  Cancel = 'CANCEL',
  Collect = 'COLLECT',
  Interrupt = 'INTERRUPT',
  Pause = 'PAUSE',
  Resume = 'RESUME',
  Step = 'STEP'
}

export type AssignationOrder = {
  createdAt?: InputMaybe<Ordering>;
  finishedAt?: InputMaybe<Ordering>;
  startedAt?: InputMaybe<Ordering>;
  status?: InputMaybe<Ordering>;
};

export type AssignationStats = {
  __typename?: 'AssignationStats';
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


export type AssignationStatsAvgArgs = {
  field: AssignationField;
};


export type AssignationStatsDistinctCountArgs = {
  field: AssignationField;
};


export type AssignationStatsMaxArgs = {
  field: AssignationField;
};


export type AssignationStatsMinArgs = {
  field: AssignationField;
};


export type AssignationStatsSeriesArgs = {
  by: Granularity;
  field: AssignationField;
  timestampField: AssignationTimestampField;
};


export type AssignationStatsSumArgs = {
  field: AssignationField;
};

/** The event kind of the assignationevent */
export enum AssignationStatus {
  Assigning = 'ASSIGNING',
  Cancelled = 'CANCELLED',
  Critical = 'CRITICAL',
  Done = 'DONE',
  Ongoing = 'ONGOING'
}

/** Datetime fields of Assignation for bucketing */
export enum AssignationTimestampField {
  CreatedAt = 'CREATED_AT'
}

export type Binds = {
  __typename?: 'Binds';
  clients: Array<Scalars['ID']['output']>;
  desiredInstances: Scalars['Int']['output'];
  implementations: Array<Scalars['ID']['output']>;
};

export type BindsInput = {
  clients?: InputMaybe<Array<Scalars['String']['input']>>;
  desiredInstances?: Scalars['Int']['input'];
  implementations?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** The input for bouncing an agent. */
export type BlockInput = {
  agent: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
};

export type Blok = {
  __typename?: 'Blok';
  /** Get the actions that this blok can run. */
  actionDemands: Array<ActionDemand>;
  creator: User;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Materialized bloks that are instances of this blok. */
  materializedBloks: Array<MaterializedBlok>;
  name: Scalars['String']['output'];
  /** Get the agents that this blok can be implemented against. */
  possibleAgents: Array<Agent>;
  /** Get the actions that this blok can run. */
  stateDemands: Array<StateDemand>;
  url: Scalars['String']['output'];
};

/** The input for bouncing an agent. */
export type BounceInput = {
  agent: Scalars['ID']['input'];
  duration?: InputMaybe<Scalars['Int']['input']>;
};

/** The input for canceling an assignation. */
export type CancelInput = {
  assignation: Scalars['ID']['input'];
};

export type Choice = {
  __typename?: 'Choice';
  description?: Maybe<Scalars['String']['output']>;
  image?: Maybe<Scalars['String']['output']>;
  label: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type ChoiceAssignWidget = AssignWidget & {
  __typename?: 'ChoiceAssignWidget';
  choices?: Maybe<Array<Choice>>;
  followValue?: Maybe<Scalars['String']['output']>;
  kind: AssignWidgetKind;
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
  description?: InputMaybe<Scalars['String']['input']>;
  image?: InputMaybe<Scalars['String']['input']>;
  label: Scalars['String']['input'];
  value: Scalars['AnyDefault']['input'];
};

export type ChoiceReturnWidget = ReturnWidget & {
  __typename?: 'ChoiceReturnWidget';
  choices?: Maybe<Array<Choice>>;
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
  /** Name of the client. */
  name: Scalars['String']['output'];
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
export type ClientOrder = {
  definedAt?: InputMaybe<Ordering>;
};

/** The input for collecting a shelved item in a drawer. */
export type CollectInput = {
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
  order?: InputMaybe<ActionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** The input for creating a blok. */
export type CreateBlokInput = {
  /** The action demands of the blok. This is used to identify the blok in the system. */
  actionDemands?: InputMaybe<Array<ActionDemandInput>>;
  /** The description of the blok. This can described the blok and its purpose. */
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  /** The state demands of the blok. This is used to identify the blok in the system. */
  stateDemands?: InputMaybe<Array<SchemaDemandInput>>;
  /** The URL of the blok. This can be used to link to the blok in the system. */
  url: Scalars['String']['input'];
};

/** The input for creating a dashboard. */
export type CreateDashboardInput = {
  name?: InputMaybe<Scalars['String']['input']>;
  panels?: InputMaybe<Array<Scalars['ID']['input']>>;
  tree?: InputMaybe<UiTreeInput>;
};

/** The input for creating a implementation in another agents extension. */
export type CreateForeignImplementationInput = {
  /** The agent ID to create the implementation in. This is used to identify the agent in the system. */
  agent: Scalars['ID']['input'];
  extension: Scalars['String']['input'];
  implementation: ImplementationInput;
};

/** The input for creating a implementation. */
export type CreateImplementationInput = {
  extension: Scalars['String']['input'];
  implementation: ImplementationInput;
  instanceId: Scalars['InstanceId']['input'];
};

/** The input for creating a shortcut. */
export type CreateShortcutInput = {
  action: Scalars['ID']['input'];
  allowQuick?: Scalars['Boolean']['input'];
  args: Scalars['Args']['input'];
  bindNumber?: InputMaybe<Scalars['Int']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  implementation?: InputMaybe<Scalars['ID']['input']>;
  name: Scalars['String']['input'];
  /** The toolbox ID to create the shortcut in. If not provided, the shortcut will be created in the default toolbox. */
  toolbox?: InputMaybe<Scalars['ID']['input']>;
  useReturns?: Scalars['Boolean']['input'];
};

/** The input for creating a state schema. */
export type CreateStateSchemaInput = {
  stateSchema: StateSchemaInput;
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

/** The input for creating a toolbox. */
export type CreateToolboxInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type CustomAssignWidget = AssignWidget & {
  __typename?: 'CustomAssignWidget';
  followValue?: Maybe<Scalars['String']['output']>;
  hook: Scalars['String']['output'];
  kind: AssignWidgetKind;
  ward: Scalars['String']['output'];
};

export type CustomEffect = Effect & {
  __typename?: 'CustomEffect';
  dependencies: Array<Scalars['String']['output']>;
  function: Scalars['ValidatorFunction']['output'];
  hook: Scalars['String']['output'];
  kind: EffectKind;
  ward: Scalars['String']['output'];
};

export type CustomReturnWidget = ReturnWidget & {
  __typename?: 'CustomReturnWidget';
  hook: Scalars['String']['output'];
  kind: ReturnWidgetKind;
  ward: Scalars['String']['output'];
};

export type Dashboard = {
  __typename?: 'Dashboard';
  id: Scalars['ID']['output'];
  materializedBloks: Array<MaterializedBlok>;
  name?: Maybe<Scalars['String']['output']>;
  uiTree?: Maybe<UiTree>;
};

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
 *
 *
 *
 */
export type DefinitionInput = {
  /** The args of the definition. This is the input ports of the definition */
  args?: Array<PortInput>;
  /** The collections of the definition. This is used to group definitions together in the UI */
  collections?: Array<Scalars['String']['input']>;
  /** The description of the definition. This is the text that is displayed in the UI */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The interfaces of the definition. This is used to group definitions together in the UI */
  interfaces?: Array<Scalars['String']['input']>;
  /** Whether the definition is a dev definition or not. If the definition is a dev definition, it can be used to create a dev action. If the definition is not a dev definition, it cannot be used to create a dev action */
  isDev?: Scalars['Boolean']['input'];
  /** The tests for the definition. This is used to group definitions together in the UI */
  isTestFor?: Array<Scalars['String']['input']>;
  /** The kind of the definition. This is the type of the definition. Can be either a function or a generator */
  kind: ActionKind;
  /** The logo of the definition. This is used to display the logo in the UI */
  logo?: InputMaybe<Scalars['String']['input']>;
  /** The name of the actions. This is used to uniquely identify the definition */
  name: Scalars['String']['input'];
  /** The port groups of the definition. This is used to group ports together in the UI */
  portGroups?: Array<PortGroupInput>;
  /** The returns of the definition. This is the output ports of the definition */
  returns?: Array<PortInput>;
  /** Whether the definition is stateful or not. If the definition is stateful, it can be used to create a stateful action. If the definition is not stateful, it cannot be used to create a stateful action */
  stateful?: Scalars['Boolean']['input'];
};

export type DeleteAgentInput = {
  /** The ID of the agent to delete. This is used to identify the agent in the system. */
  id: Scalars['ID']['input'];
};

/** The input for deleting a implementation. */
export type DeleteImplementationInput = {
  implementation: Scalars['ID']['input'];
};

/** The input for deleting a shortcut. */
export type DeleteShortcutInput = {
  id: Scalars['ID']['input'];
};

export enum DemandKind {
  Args = 'ARGS',
  Returns = 'RETURNS'
}

/** Represents a dependency between implementations and actions. */
export type Dependency = {
  __typename?: 'Dependency';
  /** Original hash when the dependency was created. */
  actionHash?: Maybe<Scalars['ActionHash']['output']>;
  /** Protocols that this dependency needs to match. */
  argMatches?: Maybe<Array<PortMatch>>;
  /** Optional description of the dependency. */
  description?: Maybe<Scalars['String']['output']>;
  /** Unique ID of the dependency. */
  id: Scalars['ID']['output'];
  /** Implementation this dependency belongs to. */
  implementation: Implementation;
  /** Optional string identifier or tag for reference. */
  key: Scalars['String']['output'];
  /** Indicates if the dependency is optional. */
  optional: Scalars['Boolean']['output'];
  /** Check if this dependency can be resolved by a connected agent. */
  resolvable: Scalars['Boolean']['output'];
  /** Protocols that this dependency needs to match. */
  returnMatches?: Maybe<Array<PortMatch>>;
};

export type DependencyFilter = {
  AND?: InputMaybe<DependencyFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<DependencyFilter>;
  OR?: InputMaybe<DependencyFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type Descriptor = {
  __typename?: 'Descriptor';
  key: Scalars['String']['output'];
  value: Scalars['Arg']['output'];
};

export type DescriptorInput = {
  key: Scalars['String']['input'];
  value: Scalars['Arg']['input'];
};

export type DescriptorMatch = {
  __typename?: 'DescriptorMatch';
  key?: Maybe<Scalars['String']['output']>;
  operator?: Maybe<DescriptorOperator>;
  value?: Maybe<Scalars['String']['output']>;
};

/** The operator for matching descriptors. */
export enum DescriptorOperator {
  Contains = 'CONTAINS',
  Equals = 'EQUALS',
  Exists = 'EXISTS',
  Gte = 'GTE',
  In = 'IN',
  Lte = 'LTE',
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

export type Effect = {
  dependencies: Array<Scalars['String']['output']>;
  function: Scalars['ValidatorFunction']['output'];
  kind: EffectKind;
};

/**
 *
 *                  An effect is a way to modify a port based on a condition. For example,
 *     you could have an effect that sets a port to null if another port is null.
 *
 *     Or, you could have an effect that hides the port if another port meets a condition.
 *     E.g when the user selects a certain option in a dropdown, another port is hidden.
 *
 *
 *
 */
export type EffectInput = {
  dependencies?: InputMaybe<Array<Scalars['String']['input']>>;
  fade?: InputMaybe<Scalars['Boolean']['input']>;
  function: Scalars['ValidatorFunction']['input'];
  hook?: InputMaybe<Scalars['String']['input']>;
  kind: EffectKind;
  message?: InputMaybe<Scalars['String']['input']>;
  ward?: InputMaybe<Scalars['String']['input']>;
};

/** The kind of effect. */
export enum EffectKind {
  Custom = 'CUSTOM',
  Hide = 'HIDE',
  Message = 'MESSAGE'
}

/** Represents a file-based drawer within a filesystem shelve. */
export type FileDrawer = {
  __typename?: 'FileDrawer';
  /** Agent owning the drawer. */
  agent: Agent;
  /** Creation timestamp of the drawer. */
  createdAt: Scalars['DateTime']['output'];
  /** ID of the file drawer. */
  id: Scalars['ID']['output'];
  /** Unique string identifying the drawer. */
  identifier: Scalars['String']['output'];
  /** External resource identifier. */
  resourceId: Scalars['String']['output'];
};

/** A way to filter shelved items */
export type FileDrawerFilter = {
  AND?: InputMaybe<FileDrawerFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<FileDrawerFilter>;
  OR?: InputMaybe<FileDrawerFilter>;
  agent?: InputMaybe<Scalars['ID']['input']>;
  identifier?: InputMaybe<Scalars['String']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  shelve?: InputMaybe<Scalars['ID']['input']>;
};

/** Shelve on an agent for filesystem-based resources. */
export type FilesystemShelve = {
  __typename?: 'FilesystemShelve';
  /** List of file drawers in the shelve. */
  drawers: Array<FileDrawer>;
  /** ID of the filesystem shelve. */
  id: Scalars['ID']['output'];
};


/** Shelve on an agent for filesystem-based resources. */
export type FilesystemShelveDrawersArgs = {
  filters?: InputMaybe<FileDrawerFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** A way to filter shelved items */
export type FilesystemShelveFilter = {
  AND?: InputMaybe<FilesystemShelveFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<FilesystemShelveFilter>;
  OR?: InputMaybe<FilesystemShelveFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
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
  dependencies: Array<Scalars['String']['output']>;
  fade: Scalars['Boolean']['output'];
  function: Scalars['ValidatorFunction']['output'];
  kind: EffectKind;
};

export type HistoricalState = {
  __typename?: 'HistoricalState';
  archivedAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  state: State;
  value: Scalars['Args']['output'];
};

/** A hook is a function that is called when a action has reached a specific lifecycle point. Hooks are jsut actions that take an assignation as input and return a value. */
export type HookInput = {
  hash: Scalars['ActionHash']['input'];
  kind: HookKind;
};

export enum HookKind {
  Cleanup = 'CLEANUP',
  Init = 'INIT'
}

/** Represents a concrete implementation of an action. */
export type Implementation = {
  __typename?: 'Implementation';
  /** The action this implements. */
  action: Action;
  /** Agent running this implementation. */
  agent: Agent;
  /** Dependencies required by this implementation. */
  dependencies: Array<Dependency>;
  /** Extension or module name. */
  extension: Scalars['String']['output'];
  /** Unique ID of the implementation. */
  id: Scalars['ID']['output'];
  /** Interface string representing the implementation entrypoint. */
  interface: Scalars['String']['output'];
  /** Get the latest completed assignation created by the current user. */
  myLatestAssignation?: Maybe<Assignation>;
  /** Constructed name for display, combining interface and agent name. */
  name: Scalars['String']['output'];
  /** Arbitrary parameters for the implementation. */
  params: Scalars['AnyDefault']['output'];
  /** Check if this implementation is pinned by the current user. */
  pinned: Scalars['Boolean']['output'];
};


/** Represents a concrete implementation of an action. */
export type ImplementationDependenciesArgs = {
  filters?: InputMaybe<DependencyFilter>;
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
  extensions?: InputMaybe<Array<Scalars['String']['input']>>;
  hasImplementations?: InputMaybe<Array<Scalars['String']['input']>>;
  hasStates?: InputMaybe<Array<Scalars['String']['input']>>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  instanceId?: InputMaybe<Scalars['String']['input']>;
};

export type ImplementationFilter = {
  AND?: InputMaybe<ImplementationFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ImplementationFilter>;
  OR?: InputMaybe<ImplementationFilter>;
  action?: InputMaybe<ImplementationActionFilter>;
  actionHash?: InputMaybe<Scalars['ActionHash']['input']>;
  agent?: InputMaybe<ImplementationAgentFilter>;
  extension?: InputMaybe<Scalars['String']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  interface?: InputMaybe<StrFilterLookup>;
  parameters?: InputMaybe<Array<ParamPair>>;
  resolvableFor?: InputMaybe<Scalars['ID']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** A implementation is a blueprint for a action. It is composed of a definition, a list of dependencies, and a list of params. */
export type ImplementationInput = {
  definition: DefinitionInput;
  dependencies: Array<ActionDependencyInput>;
  dynamic?: Scalars['Boolean']['input'];
  interface?: InputMaybe<Scalars['String']['input']>;
  logo?: InputMaybe<Scalars['String']['input']>;
  params?: InputMaybe<Scalars['AnyDefault']['input']>;
};

export type ImplementationOrder = {
  createdAt?: InputMaybe<Ordering>;
  finishedAt?: InputMaybe<Ordering>;
  startedAt?: InputMaybe<Ordering>;
  status?: InputMaybe<Ordering>;
};

export type ImplementationUpdate = {
  __typename?: 'ImplementationUpdate';
  create: Implementation;
  delete: Scalars['ID']['output'];
  update: Implementation;
};

/** Usage of an input interface in an action. */
export type InputInterfaceUsage = {
  __typename?: 'InputInterfaceUsage';
  action: Action;
  id: Scalars['ID']['output'];
  interface: Interface;
  modifiers: Array<Scalars['String']['output']>;
  portIndex: Scalars['Int']['output'];
  portKey: Scalars['String']['output'];
};

export type InputInterfaceUsageFilter = {
  AND?: InputMaybe<InputInterfaceUsageFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<InputInterfaceUsageFilter>;
  OR?: InputMaybe<InputInterfaceUsageFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  interface?: InputMaybe<Scalars['ID']['input']>;
};

/** Usage of an input structure in an action. */
export type InputStructureUsage = {
  __typename?: 'InputStructureUsage';
  action: Action;
  id: Scalars['ID']['output'];
  modifiers: Array<Scalars['String']['output']>;
  portIndex: Scalars['Int']['output'];
  portKey: Scalars['String']['output'];
  structure: Structure;
};

export type InputStructureUsageFilter = {
  AND?: InputMaybe<InputStructureUsageFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<InputStructureUsageFilter>;
  OR?: InputMaybe<InputStructureUsageFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  structure?: InputMaybe<Scalars['ID']['input']>;
};

/** If this structure is the default in its package. */
export type Interface = {
  __typename?: 'Interface';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Implementations that implement this interface. */
  implementations: Array<Implementation>;
  /** Usages of this interface as an input in actions. */
  inputUsages: Array<InputInterfaceUsage>;
  key: Scalars['String']['output'];
  /** Usages of this interface as an output in actions. */
  outputUsages: Array<OutputInterfaceUsage>;
  package: StructurePackage;
};


/** If this structure is the default in its package. */
export type InterfaceImplementationsArgs = {
  filters?: InputMaybe<ImplementationFilter>;
  order?: InputMaybe<ImplementationOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** If this structure is the default in its package. */
export type InterfaceInputUsagesArgs = {
  filters?: InputMaybe<InputInterfaceUsageFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** If this structure is the default in its package. */
export type InterfaceOutputUsagesArgs = {
  filters?: InputMaybe<OutputInterfaceUsageFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type InterfaceFilter = {
  AND?: InputMaybe<InterfaceFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<InterfaceFilter>;
  OR?: InputMaybe<InterfaceFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** The input for interrupting an assignation. */
export type InterruptInput = {
  assignation: Scalars['ID']['input'];
};

/** The input for bouncing an agent. */
export type KickInput = {
  agent: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
};

export enum LogLevel {
  Critical = 'CRITICAL',
  Debug = 'DEBUG',
  Error = 'ERROR',
  Info = 'INFO',
  Warn = 'WARN'
}

/** The input for creating a blok. */
export type MaterializeBlokInput = {
  /** The agent ID to materialize the blok in. If not provided, the blok will be materialized in the default agent */
  agent?: InputMaybe<Scalars['ID']['input']>;
  blok: Scalars['ID']['input'];
  /** The dashboard ID to materialize the blok in. If not provided, the blok will be materialized in the default dashboard. */
  dashboard?: InputMaybe<Scalars['ID']['input']>;
};

export type MaterializedBlok = {
  __typename?: 'MaterializedBlok';
  /** Mappings of actions to this materialized blok. */
  actionMappings: Array<ActionMapping>;
  agent: Agent;
  blok: Blok;
  createdAt: Scalars['DateTime']['output'];
  dashboard: Dashboard;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  /** Mappings of states to this materialized blok. */
  stateMappings: Array<StateMapping>;
  updatedAt: Scalars['DateTime']['output'];
};

export type MemoryDrawer = {
  __typename?: 'MemoryDrawer';
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

export type MemoryShelveOrder = {
  name?: InputMaybe<Ordering>;
};

export type MessageEffect = Effect & {
  __typename?: 'MessageEffect';
  dependencies: Array<Scalars['String']['output']>;
  function: Scalars['ValidatorFunction']['output'];
  kind: EffectKind;
  message: Scalars['String']['output'];
};

/** Root mutation type for executing write operations on the API. */
export type Mutation = {
  __typename?: 'Mutation';
  /** Acknowledge an assignation. */
  ack: Assignation;
  /** Archive a state schema. */
  archiveState: State;
  /** Assign a task to an agent. */
  assign: Assignation;
  /** Block an agent from connecting. */
  block: Agent;
  /** Bounce an agent so it reconnects. */
  bounce: Agent;
  /** Cancel an active assignation. */
  cancel: Assignation;
  /** Delete unreferenced actions from the system. */
  cleanupActions: Scalars['Int']['output'];
  /** Collect results from an assignation. */
  collect: Array<Scalars['String']['output']>;
  /** Create a user interface panel. */
  createBlok: Blok;
  /** Create a dashboard layout. */
  createDashboard: Dashboard;
  /** Register an external implementation. */
  createForeignImplementation: Implementation;
  /** Create a new implementation entry. */
  createImplementation: Implementation;
  /** Create a shortcut to an action. */
  createShortcut: Shortcut;
  /** Define a new state schema. */
  createStateSchema: StateSchema;
  /** Create a new test case. */
  createTestCase: TestCase;
  /** Create a test result record. */
  createTestResult: TestResult;
  /** Create a new toolbox with shortcuts. */
  createToolbox: Toolbox;
  /** Delete an agent record. */
  deleteAgent: Scalars['ID']['output'];
  /** Delete a registered implementation. */
  deleteImplementation: Scalars['String']['output'];
  /** Delete a shortcut. */
  deleteShortcut: Scalars['ID']['output'];
  /** Ensure agent record exists or is up to date. */
  ensureAgent: Agent;
  /** Interrupt the execution of an assignation. */
  interrupt: Assignation;
  /** Kick an agent to force disconnect. It will fail and not reconnect. */
  kick: Agent;
  /** Materialize a UI blok into a concrete instance on a dashboard. */
  materializeBlok: MaterializedBlok;
  /** Pause an ongoing assignation. */
  pause: Assignation;
  /** Pin an agent to the user. */
  pinAgent: Agent;
  /** Pin an implementation to the user. */
  pinImplementation: Implementation;
  /** Reinitialize the assignation or agent. */
  reinit: Scalars['String']['output'];
  /** Reserve an implementation for future use. */
  reserve: Reservation;
  /** Resume a paused assignation. */
  resume: Assignation;
  /** Set states for an agent. */
  setAgentStates: Array<State>;
  /** Set implementations provided by an extension. */
  setExtensionImplementations: Array<Implementation>;
  /** Set the value of a state object. */
  setState: State;
  /** Shelve data into a memory drawer. */
  shelveInMemoryDrawer: MemoryDrawer;
  /** Advance an assignation one step. */
  step: Assignation;
  /** Unblock a previously blocked agent. */
  unblock: Agent;
  /** Release a reserved implementation. */
  unreserve: Scalars['String']['output'];
  /** Unshelve data from a memory drawer. */
  unshelveMemoryDrawer: Scalars['ID']['output'];
  /** Update fields in a state object. */
  updateState: State;
};


/** Root mutation type for executing write operations on the API. */
export type MutationAckArgs = {
  input: AckInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationArchiveStateArgs = {
  input: ArchiveStateInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationAssignArgs = {
  input: AssignInput;
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
export type MutationCreateForeignImplementationArgs = {
  input: CreateForeignImplementationInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationCreateImplementationArgs = {
  input: CreateImplementationInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationCreateShortcutArgs = {
  input: CreateShortcutInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationCreateStateSchemaArgs = {
  input: CreateStateSchemaInput;
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
export type MutationCreateToolboxArgs = {
  input: CreateToolboxInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationDeleteAgentArgs = {
  input: DeleteAgentInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationDeleteImplementationArgs = {
  input: DeleteImplementationInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationDeleteShortcutArgs = {
  input: DeleteShortcutInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationEnsureAgentArgs = {
  input: AgentInput;
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
export type MutationPinAgentArgs = {
  input: PinInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationPinImplementationArgs = {
  input: PinInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationReinitArgs = {
  input: ReInitInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationReserveArgs = {
  input: ReserveInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationResumeArgs = {
  input: ResumeInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationSetAgentStatesArgs = {
  input: SetAgentStatesInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationSetExtensionImplementationsArgs = {
  input: SetExtensionImplementationsInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationSetStateArgs = {
  input: SetStateInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationShelveInMemoryDrawerArgs = {
  input: ShelveInMemoryDrawerInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationStepArgs = {
  input: StepInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationUnblockArgs = {
  input: UnblockInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationUnreserveArgs = {
  input: UnreserveInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationUnshelveMemoryDrawerArgs = {
  input: UnshelveMemoryDrawerInput;
};


/** Root mutation type for executing write operations on the API. */
export type MutationUpdateStateArgs = {
  input: UpdateStateInput;
};

export type OffsetPaginationInput = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: Scalars['Int']['input'];
};

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

/** Usage of an output interface in an action. */
export type OutputInterfaceUsage = {
  __typename?: 'OutputInterfaceUsage';
  action: Action;
  id: Scalars['ID']['output'];
  interface: Interface;
  modifiers: Array<Scalars['String']['output']>;
  portIndex: Scalars['Int']['output'];
  portKey: Scalars['String']['output'];
};

export type OutputInterfaceUsageFilter = {
  AND?: InputMaybe<OutputInterfaceUsageFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<OutputInterfaceUsageFilter>;
  OR?: InputMaybe<OutputInterfaceUsageFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  interface?: InputMaybe<Scalars['ID']['input']>;
};

/** Usage of an output structure in an action. */
export type OutputStructureUsage = {
  __typename?: 'OutputStructureUsage';
  action: Action;
  id: Scalars['ID']['output'];
  modifiers: Array<Scalars['String']['output']>;
  portIndex: Scalars['Int']['output'];
  portKey: Scalars['String']['output'];
  structure: Structure;
};

export type OutputStructureUsageFilter = {
  AND?: InputMaybe<OutputStructureUsageFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<OutputStructureUsageFilter>;
  OR?: InputMaybe<OutputStructureUsageFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  structure?: InputMaybe<Scalars['ID']['input']>;
};

export type ParamPair = {
  key: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

/** The input for pausing an assignation. */
export type PauseInput = {
  assignation: Scalars['ID']['input'];
};

/** The input for pinning an model. */
export type PinInput = {
  id: Scalars['ID']['input'];
  pin: Scalars['Boolean']['input'];
};

export type Port = {
  __typename?: 'Port';
  assignWidget?: Maybe<AssignWidget>;
  children?: Maybe<Array<Port>>;
  choices?: Maybe<Array<Choice>>;
  default?: Maybe<Scalars['AnyDefault']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  descriptors?: Maybe<Array<Descriptor>>;
  effects?: Maybe<Array<Effect>>;
  identifier?: Maybe<Scalars['Identifier']['output']>;
  key: Scalars['String']['output'];
  kind: PortKind;
  label?: Maybe<Scalars['String']['output']>;
  nullable: Scalars['Boolean']['output'];
  returnWidget?: Maybe<ReturnWidget>;
  validators?: Maybe<Array<Validator>>;
};

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
  description?: InputMaybe<Scalars['String']['input']>;
  effects?: InputMaybe<Array<EffectInput>>;
  /** The key of the port group. This is used to uniquely identify the port group */
  key: Scalars['String']['input'];
  ports?: InputMaybe<Array<Scalars['String']['input']>>;
  title?: InputMaybe<Scalars['String']['input']>;
};

/**
 * Port
 *
 *     A Port is a single input or output of a action. It is composed of a key and a kind
 *     which are used to uniquely identify the port.
 *
 *     If the Port is a structure, we need to define a identifier and scope,
 *     Identifiers uniquely identify a specific type of model for the scopes (e.g
 *     all the ports that have the identifier "@mikro/image" are of the same type, and
 *     are hence compatible with each other). Scopes are used to define in which context
 *     the identifier is valid (e.g. a port with the identifier "@mikro/image" and the
 *     scope "local", can only be wired to other ports that have the same identifier and
 *     are running in the same app). Global ports are ports that have the scope "global",
 *     and can be wired to any other port that has the same identifier, as there exists a
 *     mechanism to resolve and retrieve the object for each app. Please check the rekuest
 *     documentation for more information on how this works.
 *
 *
 *
 */
export type PortInput = {
  assignWidget?: InputMaybe<AssignWidgetInput>;
  children?: InputMaybe<Array<PortInput>>;
  choices?: InputMaybe<Array<ChoiceInput>>;
  default?: InputMaybe<Scalars['AnyDefault']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  descriptors?: InputMaybe<Array<DescriptorInput>>;
  effects?: InputMaybe<Array<EffectInput>>;
  identifier?: InputMaybe<Scalars['String']['input']>;
  key: Scalars['String']['input'];
  kind: PortKind;
  label?: InputMaybe<Scalars['String']['input']>;
  nullable?: Scalars['Boolean']['input'];
  returnWidget?: InputMaybe<ReturnWidgetInput>;
  validators?: InputMaybe<Array<ValidatorInput>>;
};

/** The kind of port. */
export enum PortKind {
  Bool = 'BOOL',
  Date = 'DATE',
  Dict = 'DICT',
  Enum = 'ENUM',
  Float = 'FLOAT',
  Int = 'INT',
  Interface = 'INTERFACE',
  List = 'LIST',
  MemoryStructure = 'MEMORY_STRUCTURE',
  Model = 'MODEL',
  String = 'STRING',
  Structure = 'STRUCTURE',
  Union = 'UNION'
}

export type PortMatch = {
  __typename?: 'PortMatch';
  at?: Maybe<Scalars['Int']['output']>;
  children?: Maybe<Array<PortMatch>>;
  descriptors?: Maybe<Array<DescriptorMatch>>;
  identifier?: Maybe<Scalars['String']['output']>;
  key?: Maybe<Scalars['String']['output']>;
  kind?: Maybe<PortKind>;
  nullable?: Maybe<Scalars['Boolean']['output']>;
};

/**
 * A dependency for a implementation. By defining dependencies, you can
 *     create a dependency graph for your implementations and actions
 */
export type PortMatchInput = {
  at?: InputMaybe<Scalars['Int']['input']>;
  children?: InputMaybe<Array<PortMatchInput>>;
  identifier?: InputMaybe<Scalars['String']['input']>;
  key?: InputMaybe<Scalars['String']['input']>;
  kind?: InputMaybe<PortKind>;
  nullable?: InputMaybe<Scalars['Boolean']['input']>;
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
  order?: InputMaybe<ActionOrder>;
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

export type ProtocolOrder = {
  name?: InputMaybe<Ordering>;
};

/** Root query type for fetching entities in the system. */
export type Query = {
  __typename?: 'Query';
  /** Fetch a specific action. */
  action: Action;
  /** Statistics about actions and their implementations. */
  actionStats: ActionStats;
  /** List of all available actions. */
  actions: Array<Action>;
  /** Retrieve an agent by ID. */
  agent: Agent;
  /** Retrieve all compute agents. */
  agents: Array<Agent>;
  /** Fetch assignation by ID. */
  assignation: Assignation;
  /** Statistics about assignations and their states. */
  assignationStats: AssignationStats;
  /** Fetch assignations. */
  assignations: Array<Assignation>;
  /** Get a blok by ID. */
  blok: Blok;
  /** List of UI Blok. */
  bloks: Array<Blok>;
  /** List all registered clients. */
  clients: Array<Client>;
  /** Get dashboard by ID. */
  dashboard: Dashboard;
  /** All dashboards. */
  dashboards: Array<Dashboard>;
  /** Fetch a dependency by ID. */
  dependency: Dependency;
  /** Fetch a specific event. */
  event: Array<AssignationEvent>;
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
  /** Fetch an interface by ID. */
  interface: Interface;
  /** All registered interfaces. */
  interfaces: Array<Interface>;
  /** Get a materialized blok by ID. */
  materializedBlok: MaterializedBlok;
  /** List of UI Blok. */
  materializedBloks: Array<MaterializedBlok>;
  /** All memory drawers. */
  memoryDrawers: Array<MemoryDrawer>;
  /** Fetch a memory shelve by ID. */
  memoryShelve: MemoryShelve;
  /** All memory shelves. */
  memoryShelves: Array<MemoryShelve>;
  /** Find your implementation at a specific interface. */
  myImplementationAt: Implementation;
  /** Reservations made by the current user. */
  myreservations: Array<Reservation>;
  /** Retrieve protocols grouping actions. */
  protocols: Array<Protocol>;
  /** Retrieve reservation by ID. */
  reservation: Reservation;
  /** List of all reservations. */
  reservations: Array<Reservation>;
  /** Retrieve shortcut by ID. */
  shortcut: Shortcut;
  /** List of shortcuts. */
  shortcuts: Array<Shortcut>;
  /** Get a specific state by ID. */
  state: State;
  /** Retrieve state for a specific context. */
  stateFor: State;
  /** Retrieve a state schema by ID. */
  stateSchema: StateSchema;
  /** Available state schemas. */
  stateSchemas: Array<StateSchema>;
  /** All states from agents. */
  states: Array<State>;
  /** Fetch a structure by ID. */
  structure: Structure;
  /** Fetch a client by ID. */
  structurePackage: StructurePackage;
  /** All registered structure packages. */
  structurePackages: Array<StructurePackage>;
  /** All registered structures. */
  structures: Array<Structure>;
  /** All tasks. */
  tasks: Array<Assignation>;
  /** Retrieve test case by ID. */
  testCase: TestCase;
  /** All test cases. */
  testCases: Array<TestCase>;
  /** Get test result by ID. */
  testResult: TestResult;
  /** Test results associated with test cases. */
  testResults: Array<TestResult>;
  /** Get toolbox by ID. */
  toolbox: Toolbox;
  /** List of toolboxes containing shortcuts. */
  toolboxes: Array<Toolbox>;
};


/** Root query type for fetching entities in the system. */
export type QueryActionArgs = {
  agent?: InputMaybe<Scalars['ID']['input']>;
  assignation?: InputMaybe<Scalars['ID']['input']>;
  hash?: InputMaybe<Scalars['ActionHash']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  implementation?: InputMaybe<Scalars['ID']['input']>;
  interface?: InputMaybe<Scalars['String']['input']>;
  matching?: InputMaybe<ActionDependencyInput>;
  reservation?: InputMaybe<Scalars['ID']['input']>;
};


/** Root query type for fetching entities in the system. */
export type QueryActionStatsArgs = {
  filters?: InputMaybe<ActionFilter>;
};


/** Root query type for fetching entities in the system. */
export type QueryActionsArgs = {
  filters?: InputMaybe<ActionFilter>;
  order?: InputMaybe<ActionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Root query type for fetching entities in the system. */
export type QueryAgentArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type for fetching entities in the system. */
export type QueryAgentsArgs = {
  filters?: InputMaybe<AgentFilter>;
  order?: InputMaybe<AgentOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Root query type for fetching entities in the system. */
export type QueryAssignationArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type for fetching entities in the system. */
export type QueryAssignationStatsArgs = {
  filters?: InputMaybe<AssignationFilter>;
};


/** Root query type for fetching entities in the system. */
export type QueryAssignationsArgs = {
  instanceId?: InputMaybe<Scalars['InstanceId']['input']>;
};


/** Root query type for fetching entities in the system. */
export type QueryBlokArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type for fetching entities in the system. */
export type QueryClientsArgs = {
  filters?: InputMaybe<ClientFilter>;
  order?: InputMaybe<ClientOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Root query type for fetching entities in the system. */
export type QueryDashboardArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type for fetching entities in the system. */
export type QueryDependencyArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type for fetching entities in the system. */
export type QueryEventArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
};


/** Root query type for fetching entities in the system. */
export type QueryHardwareRecordArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type for fetching entities in the system. */
export type QueryHardwareRecordsArgs = {
  filters?: InputMaybe<HardwareRecordFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Root query type for fetching entities in the system. */
export type QueryImplementationArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type for fetching entities in the system. */
export type QueryImplementationAtArgs = {
  actionHash?: InputMaybe<Scalars['String']['input']>;
  agent: Scalars['ID']['input'];
  demand?: InputMaybe<ActionDemandInput>;
  extension?: InputMaybe<Scalars['String']['input']>;
  interface?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type for fetching entities in the system. */
export type QueryImplementationsArgs = {
  filters?: InputMaybe<ImplementationFilter>;
  order?: InputMaybe<ImplementationOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Root query type for fetching entities in the system. */
export type QueryInterfaceArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type for fetching entities in the system. */
export type QueryInterfacesArgs = {
  filters?: InputMaybe<InterfaceFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Root query type for fetching entities in the system. */
export type QueryMaterializedBlokArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type for fetching entities in the system. */
export type QueryMemoryDrawersArgs = {
  filters?: InputMaybe<MemoryDrawerFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Root query type for fetching entities in the system. */
export type QueryMemoryShelveArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type for fetching entities in the system. */
export type QueryMemoryShelvesArgs = {
  filters?: InputMaybe<MemoryShelveFilter>;
  order?: InputMaybe<MemoryShelveOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Root query type for fetching entities in the system. */
export type QueryMyImplementationAtArgs = {
  actionId?: InputMaybe<Scalars['ID']['input']>;
  instanceId: Scalars['String']['input'];
  interface?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type for fetching entities in the system. */
export type QueryMyreservationsArgs = {
  instanceId?: InputMaybe<Scalars['InstanceId']['input']>;
};


/** Root query type for fetching entities in the system. */
export type QueryProtocolsArgs = {
  filters?: InputMaybe<ProtocolFilter>;
  order?: InputMaybe<ProtocolOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Root query type for fetching entities in the system. */
export type QueryReservationArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type for fetching entities in the system. */
export type QueryReservationsArgs = {
  instanceId?: InputMaybe<Scalars['InstanceId']['input']>;
};


/** Root query type for fetching entities in the system. */
export type QueryShortcutArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type for fetching entities in the system. */
export type QueryShortcutsArgs = {
  filters?: InputMaybe<ShortcutFilter>;
  order?: InputMaybe<ShortcutOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Root query type for fetching entities in the system. */
export type QueryStateArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type for fetching entities in the system. */
export type QueryStateForArgs = {
  agent: Scalars['ID']['input'];
  demand?: InputMaybe<SchemaDemandInput>;
  stateHash?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type for fetching entities in the system. */
export type QueryStateSchemaArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type for fetching entities in the system. */
export type QueryStructureArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type for fetching entities in the system. */
export type QueryStructurePackageArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type for fetching entities in the system. */
export type QueryStructurePackagesArgs = {
  filters?: InputMaybe<StructurePackageFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Root query type for fetching entities in the system. */
export type QueryStructuresArgs = {
  filters?: InputMaybe<StructureFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Root query type for fetching entities in the system. */
export type QueryTasksArgs = {
  filters?: InputMaybe<AssignationFilter>;
  order?: InputMaybe<AssignationOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Root query type for fetching entities in the system. */
export type QueryTestCaseArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type for fetching entities in the system. */
export type QueryTestCasesArgs = {
  filters?: InputMaybe<TestCaseFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Root query type for fetching entities in the system. */
export type QueryTestResultArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type for fetching entities in the system. */
export type QueryTestResultsArgs = {
  filters?: InputMaybe<TestResultFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Root query type for fetching entities in the system. */
export type QueryToolboxArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type for fetching entities in the system. */
export type QueryToolboxesArgs = {
  filters?: InputMaybe<ToolboxFilter>;
  order?: InputMaybe<ToolboxOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type ReInitInput = {
  agent?: InputMaybe<Scalars['ID']['input']>;
};

/** Links a user and a client for registry tracking. */
export type Registry = {
  __typename?: 'Registry';
  /** Agents registered under this registry. */
  agents: Array<Agent>;
  /** The associated client. */
  client: Client;
  /** Unique identifier for the registry. */
  id: Scalars['ID']['output'];
  /** The organization this registry belongs to. */
  organization: Organization;
  /** The associated user. */
  user: User;
};


/** Links a user and a client for registry tracking. */
export type RegistryAgentsArgs = {
  filters?: InputMaybe<AgentFilter>;
  order?: InputMaybe<AgentOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
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

/** Reservation for planned assignment of implementations. */
export type Reservation = {
  __typename?: 'Reservation';
  /** Action this reservation is for. */
  action: Action;
  /** Bind configuration for the reservation. */
  binds?: Maybe<Binds>;
  /** Dependency that triggered the reservation. */
  causingDependency?: Maybe<Dependency>;
  /** Did the reservation succeed. */
  happy: Scalars['Boolean']['output'];
  /** ID of the reservation. */
  id: Scalars['ID']['output'];
  /** Chosen implementation. */
  implementation?: Maybe<Implementation>;
  /** Available implementations for the reservation. */
  implementations: Array<Implementation>;
  /** Name of the reservation. */
  name: Scalars['String']['output'];
  /** Reference string for identification. */
  reference: Scalars['String']['output'];
  /** Reservation strategy applied. */
  strategy: ReservationStrategy;
  /** Optional title. */
  title?: Maybe<Scalars['String']['output']>;
  /** Last update timestamp. */
  updatedAt: Scalars['DateTime']['output'];
  /** Is the reservation currently viable. */
  viable: Scalars['Boolean']['output'];
  /** Waiter associated with the reservation. */
  waiter: Waiter;
};


/** Reservation for planned assignment of implementations. */
export type ReservationImplementationsArgs = {
  filters?: InputMaybe<ImplementationFilter>;
  order?: InputMaybe<ImplementationOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** A way to filter reservations */
export type ReservationFilter = {
  AND?: InputMaybe<ReservationFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ReservationFilter>;
  OR?: InputMaybe<ReservationFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  status?: InputMaybe<Array<ReservationStatus>>;
  waiter?: InputMaybe<WaiterFilter>;
};

export enum ReservationStatus {
  Active = 'ACTIVE',
  Ended = 'ENDED',
  Happy = 'HAPPY',
  Inactive = 'INACTIVE',
  Unconnected = 'UNCONNECTED',
  Unhappy = 'UNHAPPY'
}

/** The pattern of assignment of the reservation */
export enum ReservationStrategy {
  Direct = 'DIRECT',
  LeastBusy = 'LEAST_BUSY',
  LeastLoad = 'LEAST_LOAD',
  LeastTime = 'LEAST_TIME',
  Random = 'RANDOM',
  RoundRobin = 'ROUND_ROBIN'
}

/** The input for reserving a action. */
export type ReserveInput = {
  action?: InputMaybe<Scalars['ID']['input']>;
  assignationId?: InputMaybe<Scalars['ID']['input']>;
  binds?: InputMaybe<BindsInput>;
  hash?: InputMaybe<Scalars['ActionHash']['input']>;
  implementation?: InputMaybe<Scalars['ID']['input']>;
  instanceId?: Scalars['InstanceId']['input'];
  reference?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

/** The input for resuming an assignation. */
export type ResumeInput = {
  assignation: Scalars['ID']['input'];
};

export type ReturnWidget = {
  kind: ReturnWidgetKind;
};

/**
 * A Return Widget is a UI element that is used to display the value of a port.
 *
 *     Return Widgets get displayed both if we show the return values of an assignment,
 *     but also when we inspect the given arguments of a previous run task. Their primary
 *     usecase is to adequately display the value of a port, in a user readable way.
 *
 *     Return Widgets are often overwriten by the underlying UI framework (e.g. Orkestrator)
 *     to provide a better user experience. For example, a return widget that displays a
 *     date could be overwriten to display a calendar widget.
 *
 *     Return Widgets provide more a way to customize this overwriten behavior.
 *
 *
 */
export type ReturnWidgetInput = {
  choices?: InputMaybe<Array<ChoiceInput>>;
  hook?: InputMaybe<Scalars['String']['input']>;
  kind: ReturnWidgetKind;
  max?: InputMaybe<Scalars['Int']['input']>;
  min?: InputMaybe<Scalars['Int']['input']>;
  placeholder?: InputMaybe<Scalars['String']['input']>;
  query?: InputMaybe<Scalars['SearchQuery']['input']>;
  step?: InputMaybe<Scalars['Int']['input']>;
  ward?: InputMaybe<Scalars['String']['input']>;
};

/** The kind of return widget. */
export enum ReturnWidgetKind {
  Choice = 'CHOICE',
  Custom = 'CUSTOM'
}

/** The input for creating a action demand. */
export type SchemaDemandInput = {
  /** The hash of the state. */
  hash?: InputMaybe<Scalars['ActionHash']['input']>;
  /** The key of the action. This is used to identify the action in the system. */
  key: Scalars['String']['input'];
  /** The demands for the action args and returns. This is used to identify the demand in the system. */
  matches?: InputMaybe<Array<PortMatchInput>>;
  /** The protocols that the action has to implement. This is used to identify the demand in the system. */
  protocols?: InputMaybe<Array<Scalars['ID']['input']>>;
};

/** A way to filter by scope */
export type ScopeFilter = {
  me?: InputMaybe<Scalars['Boolean']['input']>;
  org?: InputMaybe<Scalars['Boolean']['input']>;
  public?: InputMaybe<Scalars['Boolean']['input']>;
  shared?: InputMaybe<Scalars['Boolean']['input']>;
};

export type SearchAssignWidget = AssignWidget & {
  __typename?: 'SearchAssignWidget';
  dependencies?: Maybe<Array<Scalars['String']['output']>>;
  filters?: Maybe<Array<Port>>;
  followValue?: Maybe<Scalars['String']['output']>;
  kind: AssignWidgetKind;
  query: Scalars['String']['output'];
  ward: Scalars['String']['output'];
};

/** The input for setting a state schema to an agent. */
export type SetAgentStatesInput = {
  implementations: Array<StateImplementationInput>;
  instanceId: Scalars['InstanceId']['input'];
};

/** The input for setting extension implementations. */
export type SetExtensionImplementationsInput = {
  extension: Scalars['String']['input'];
  /** The implementations to set. This is used to identify the implementations in the system. */
  implementations: Array<ImplementationInput>;
  instanceId: Scalars['InstanceId']['input'];
  runCleanup?: Scalars['Boolean']['input'];
};

/** The input for setting a state schema. */
export type SetStateInput = {
  instanceId: Scalars['InstanceId']['input'];
  interface: Scalars['String']['input'];
  value: Scalars['Args']['input'];
};

export type ShelveInMemoryDrawerInput = {
  /** The description of the drawer. This is used to identify the drawer in the system. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The identifier of the drawer. This is used to identify the drawer in the system. */
  identifier: Scalars['Identifier']['input'];
  /** The instance ID of the agent. This is used to identify the agent in the system. */
  instanceId: Scalars['InstanceId']['input'];
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
  args: Array<Port>;
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
  returns: Array<Port>;
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
  order?: InputMaybe<ToolboxOrder>;
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

export type ShortcutOrder = {
  name?: InputMaybe<Ordering>;
};

export type SliderAssignWidget = AssignWidget & {
  __typename?: 'SliderAssignWidget';
  followValue?: Maybe<Scalars['String']['output']>;
  kind: AssignWidgetKind;
  max?: Maybe<Scalars['Float']['output']>;
  min?: Maybe<Scalars['Float']['output']>;
  step?: Maybe<Scalars['Float']['output']>;
};

export type State = {
  __typename?: 'State';
  agent: Agent;
  createdAt: Scalars['DateTime']['output'];
  historicalStates: Array<HistoricalState>;
  id: Scalars['ID']['output'];
  interface: Scalars['String']['output'];
  /** @deprecated Use schema instead */
  schema: StateSchema;
  /** @deprecated Use schema instead */
  stateSchema: StateSchema;
  updatedAt: Scalars['DateTime']['output'];
  value: Scalars['Args']['output'];
};

export type StateChoiceAssignWidget = AssignWidget & {
  __typename?: 'StateChoiceAssignWidget';
  followValue?: Maybe<Scalars['String']['output']>;
  kind: AssignWidgetKind;
  stateChoices: Scalars['String']['output'];
};

/** The input for creating a action demand. */
export type StateDemand = {
  __typename?: 'StateDemand';
  hash?: Maybe<Scalars['ActionHash']['output']>;
  key: Scalars['String']['output'];
  matches?: Maybe<Array<PortMatch>>;
  protocols?: Maybe<Array<Scalars['ID']['output']>>;
};

/** The input for initializing a state schema. */
export type StateImplementationInput = {
  initial: Scalars['Args']['input'];
  interface: Scalars['String']['input'];
  stateSchema: StateSchemaInput;
};

export type StateMapping = {
  __typename?: 'StateMapping';
  crreatedAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  implementation: Implementation;
  key: Scalars['String']['output'];
  state: State;
  updatedAt: Scalars['DateTime']['output'];
};

export type StateSchema = {
  __typename?: 'StateSchema';
  hash: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  ports: Array<Port>;
};

/** The input for creating a state schema. */
export type StateSchemaInput = {
  name: Scalars['String']['input'];
  ports: Array<PortInput>;
};

/** The input for stepping an assignation. Stepping is used to go from one breakpoint to another. */
export type StepInput = {
  assignation: Scalars['ID']['input'];
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
  asParagraph: Scalars['Boolean']['output'];
  followValue?: Maybe<Scalars['String']['output']>;
  kind: AssignWidgetKind;
  placeholder: Scalars['String']['output'];
};

/** A strucssture representing a data schema or type. */
export type Structure = {
  __typename?: 'Structure';
  /** Get the query to describe the schema of this structure. */
  describeQuery?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  /** Get the query to retrieve data for this structure. */
  getQuery?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** The object ID that this structure represents. */
  identifier: Scalars['ID']['output'];
  /** Interfaces that this structure implements. */
  implements: Array<Interface>;
  /** Usages of this structure as an input in actions. */
  inputUsages: Array<InputStructureUsage>;
  key: Scalars['ID']['output'];
  /** Usages of this structure as an output in actions. */
  outputUsages: Array<OutputStructureUsage>;
  package: StructurePackage;
};


/** A strucssture representing a data schema or type. */
export type StructureImplementsArgs = {
  filters?: InputMaybe<InterfaceFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A strucssture representing a data schema or type. */
export type StructureInputUsagesArgs = {
  filters?: InputMaybe<InputStructureUsageFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A strucssture representing a data schema or type. */
export type StructureOutputUsagesArgs = {
  filters?: InputMaybe<OutputStructureUsageFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type StructureFilter = {
  AND?: InputMaybe<StructureFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<StructureFilter>;
  OR?: InputMaybe<StructureFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** A package of structures. */
export type StructurePackage = {
  __typename?: 'StructurePackage';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Interfaces that are part of this package. */
  interfaces: Array<Interface>;
  key: Scalars['String']['output'];
  /** Structures that are part of this package. */
  structures: Array<Structure>;
  version: Scalars['String']['output'];
};


/** A package of structures. */
export type StructurePackageInterfacesArgs = {
  filters?: InputMaybe<InterfaceFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A package of structures. */
export type StructurePackageStructuresArgs = {
  filters?: InputMaybe<StructureFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type StructurePackageFilter = {
  AND?: InputMaybe<StructurePackageFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<StructurePackageFilter>;
  OR?: InputMaybe<StructurePackageFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** Root subscription type for real-time event streams from the system. */
export type Subscription = {
  __typename?: 'Subscription';
  /** Subscribe to updates on agent connections and statuses. */
  agents: AgentChangeEvent;
  /** Subscribe to events related to assignations. */
  assignationEvents: AssignationEvent;
  /** Subscribe to updates on assignations. */
  assignations: AssignationChangeEvent;
  /** Subscribe to changes in implementations. */
  implementationChange: Implementation;
  /** Subscribe to creation or updates of implementations. */
  implementations: ImplementationUpdate;
  /** Subscribe to notifications when new actions are created. */
  newActions: Action;
  /** Subscribe to updates on reservations. */
  reservations: Reservation;
  /** Subscribe to updates of state values and patches. */
  stateUpdateEvents: State;
};


/** Root subscription type for real-time event streams from the system. */
export type SubscriptionAssignationEventsArgs = {
  instanceId: Scalars['InstanceId']['input'];
};


/** Root subscription type for real-time event streams from the system. */
export type SubscriptionAssignationsArgs = {
  instanceId: Scalars['InstanceId']['input'];
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
export type SubscriptionNewActionsArgs = {
  cage: Scalars['ID']['input'];
};


/** Root subscription type for real-time event streams from the system. */
export type SubscriptionReservationsArgs = {
  instanceId: Scalars['InstanceId']['input'];
};


/** Root subscription type for real-time event streams from the system. */
export type SubscriptionStateUpdateEventsArgs = {
  stateId: Scalars['ID']['input'];
};

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
  order?: InputMaybe<ShortcutOrder>;
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

export type ToolboxOrder = {
  name?: InputMaybe<Ordering>;
};

export type UiChild = {
  kind: UiChildKind;
};

export type UiChildInput = {
  children?: InputMaybe<Array<UiChildInput>>;
  hidden?: InputMaybe<Scalars['Boolean']['input']>;
  kind: UiChildKind;
  left?: InputMaybe<UiChildInput>;
  right?: InputMaybe<UiChildInput>;
  state?: InputMaybe<Scalars['String']['input']>;
};

export enum UiChildKind {
  Grid = 'GRID',
  Reservation = 'RESERVATION',
  Split = 'SPLIT',
  State = 'STATE'
}

export type UiGrid = UiChild & {
  __typename?: 'UIGrid';
  children: Array<UiGridItem>;
  columns: Scalars['Int']['output'];
  kind: UiChildKind;
  rowHeight: Scalars['Int']['output'];
};

export type UiGridItem = {
  __typename?: 'UIGridItem';
  child: UiChild;
  h: Scalars['Int']['output'];
  maxW: Scalars['Int']['output'];
  minW: Scalars['Int']['output'];
  w: Scalars['Int']['output'];
  x: Scalars['Int']['output'];
  y: Scalars['Int']['output'];
};

export type UiSplit = UiChild & {
  __typename?: 'UISplit';
  kind: UiChildKind;
  left: UiChild;
  right: UiChild;
};

export type UiState = UiChild & {
  __typename?: 'UIState';
  kind: UiChildKind;
  state: Scalars['String']['output'];
};

export type UiTree = {
  __typename?: 'UITree';
  child: UiChild;
};

export type UiTreeInput = {
  child: UiChildInput;
};

/** The input for bouncing an agent. */
export type UnblockInput = {
  agent: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
};

export type UnreserveInput = {
  reservation: Scalars['ID']['input'];
};

export type UnshelveMemoryDrawerInput = {
  /** The resource ID of the drawer. */
  id: Scalars['String']['input'];
  /** The instance ID of the agent. This is used to identify the agent in the system. */
  instanceId: Scalars['InstanceId']['input'];
};

/** The input for updating a state schema. */
export type UpdateStateInput = {
  instanceId: Scalars['InstanceId']['input'];
  interface: Scalars['String']['input'];
  patches: Array<Scalars['Args']['input']>;
};

/** Represents an authenticated user. */
export type User = {
  __typename?: 'User';
  /** The subject identifier of the user. */
  sub: Scalars['ID']['output'];
};

export type Validator = {
  __typename?: 'Validator';
  dependencies?: Maybe<Array<Scalars['String']['output']>>;
  errorMessage?: Maybe<Scalars['String']['output']>;
  function: Scalars['ValidatorFunction']['output'];
  label?: Maybe<Scalars['String']['output']>;
};

/**
 *
 * A validating function for a port. Can specify a function that will run when validating values of the port.
 * If outside dependencies are needed they need to be specified in the dependencies field. With the .. syntax
 * when transversing the tree of ports.
 *
 *
 */
export type ValidatorInput = {
  dependencies?: InputMaybe<Array<Scalars['String']['input']>>;
  errorMessage?: InputMaybe<Scalars['String']['input']>;
  function: Scalars['ValidatorFunction']['input'];
  label?: InputMaybe<Scalars['String']['input']>;
};

/** Entity that waits for the completion of assignations. */
export type Waiter = {
  __typename?: 'Waiter';
  /** Unique ID of the waiter. */
  id: Scalars['ID']['output'];
  /** Instance ID associated with the waiter. */
  instanceId: Scalars['InstanceId']['output'];
  /** Registry the waiter belongs to. */
  registry: Registry;
};

/** A way to filter waiters */
export type WaiterFilter = {
  AND?: InputMaybe<WaiterFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<WaiterFilter>;
  OR?: InputMaybe<WaiterFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  instanceId: Scalars['InstanceId']['input'];
};

export type TaskFragment = { __typename?: 'Assignation', id: string, createdAt: any, latestEventKind: AssignationEventKind, action: { __typename?: 'Action', name: string } };

export type TasksQueryVariables = Exact<{
  filters?: InputMaybe<AssignationFilter>;
  order?: InputMaybe<AssignationOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type TasksQuery = { __typename?: 'Query', tasks: Array<{ __typename?: 'Assignation', id: string, createdAt: any, latestEventKind: AssignationEventKind, action: { __typename?: 'Action', name: string } }> };

export const TaskFragmentDoc = gql`
    fragment Task on Assignation {
  id
  action {
    name
  }
  createdAt
  latestEventKind
}
    `;
export const TasksDocument = gql`
    query Tasks($filters: AssignationFilter, $order: AssignationOrder, $pagination: OffsetPaginationInput) {
  tasks(filters: $filters, order: $order, pagination: $pagination) {
    ...Task
  }
}
    ${TaskFragmentDoc}`;

/**
 * __useTasksQuery__
 *
 * To run a query within a React component, call `useTasksQuery` and pass it any options that fit your needs.
 * When your component renders, `useTasksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTasksQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      order: // value for 'order'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useTasksQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<TasksQuery, TasksQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<TasksQuery, TasksQueryVariables>(TasksDocument, options);
      }
export function useTasksLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<TasksQuery, TasksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<TasksQuery, TasksQueryVariables>(TasksDocument, options);
        }
export type TasksQueryHookResult = ReturnType<typeof useTasksQuery>;
export type TasksLazyQueryHookResult = ReturnType<typeof useTasksLazyQuery>;
export type TasksQueryResult = Apollo.QueryResult<TasksQuery, TasksQueryVariables>;