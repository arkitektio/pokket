import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloReactHooks from '@/lib/lok/funcs';
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
  /** The App identifier is a unique identifier for an app. It is used to identify the app in the database and in the code. We encourage you to use the reverse domain name notation. E.g. `com.example.myapp` */
  AppIdentifier: { input: any; output: any; }
  /** Date with time (isoformat) */
  DateTime: { input: any; output: any; }
  /** The `Fakt` scalar type represents a reference to a fakt */
  Fakt: { input: any; output: any; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](https://ecma-international.org/wp-content/uploads/ECMA-404_2nd_edition_december_2017.pdf). */
  JSON: { input: any; output: any; }
  /** The Service identifier is a unique identifier for a service. It is used to identify the service in the database and in the code. We encourage you to use the reverse domain name notation. E.g. `com.example.myservice` */
  ServiceIdentifier: { input: any; output: any; }
  /** The `Version` represents a semver version string */
  Version: { input: any; output: any; }
  _Any: { input: any; output: any; }
};

export type AcceptInviteInput = {
  token: Scalars['String']['input'];
};

export type AcknowledgeMessageInput = {
  acknowledged: Scalars['Boolean']['input'];
  id: Scalars['ID']['input'];
};

export type AddUserToOrganizationInput = {
  organization: Scalars['ID']['input'];
  roles: Array<Scalars['String']['input']>;
  user: Scalars['ID']['input'];
};

/** An App is the Arkitekt equivalent of a Software Application. It is a collection of `Releases` that can be all part of the same application. E.g the App `Napari` could have the releases `0.1.0` and `0.2.0`. */
export type App = {
  __typename?: 'App';
  id: Scalars['ID']['output'];
  /** The identifier of the app. This should be a globally unique string that identifies the app. We encourage you to use the reverse domain name notation. E.g. `com.example.myapp` */
  identifier: Scalars['AppIdentifier']['output'];
  /** The logo of the app. This should be a url to a logo that can be used to represent the app. */
  logo?: Maybe<MediaStore>;
  /** The name of the app */
  name: Scalars['String']['output'];
  /** The releases of the app. A release is a version of the app that can be installed by a user. */
  releases: Array<Release>;
};


/** An App is the Arkitekt equivalent of a Software Application. It is a collection of `Releases` that can be all part of the same application. E.g the App `Napari` could have the releases `0.1.0` and `0.2.0`. */
export type AppReleasesArgs = {
  ordering?: Array<ReleaseOrdering>;
};

/** App(id, name, identifier, organization, logo) */
export type AppFilter = {
  AND?: InputMaybe<AppFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<AppFilter>;
  OR?: InputMaybe<AppFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type AppOrdering =
  { id: Ordering; name?: never; }
  |  { id?: never; name: Ordering; };

export type ApproveMembershipRequestInput = {
  id: Scalars['ID']['input'];
  roles?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type CancelInviteInput = {
  id: Scalars['ID']['input'];
  /** For a collaboration invite: also take back the collaborations it granted from everyone who accepted it. */
  revokeShared?: Scalars['Boolean']['input'];
};

/**
 * A client is a way of authenticating users with a release.
 *  The strategy of authentication is defined by the kind of client. And allows for different authentication flow.
 *  E.g a client can be a DESKTOP app, that might be used by multiple users, or a WEBSITE that wants to connect to a user's account,
 *  but also a DEVELOPMENT client that is used by a developer to test the app. The client model thinly wraps the oauth2 client model, which is used to authenticate users.
 */
export type Client = {
  __typename?: 'Client';
  /** The OAuth2 client id this client authenticates as. */
  clientId: Scalars['String']['output'];
  /** Is this client functional? A functional client is a client that is able to authenticate users. If a client is not functional, it will not be able to authenticate users. */
  functional: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  /** The issue url of the client. This is the url where users can report issues and get more information about the client. */
  issueUrl?: Maybe<Scalars['String']['output']>;
  /** What kind of principal this client is (its authentication strategy): DEVELOPMENT, WEBSITE, DESKTOP, MOBILE, HUB or RELYING_PARTY. */
  kind: ClientKind;
  /** The logo of the release. This should be a url to a logo that can be used to represent the release. */
  logo?: Maybe<MediaStore>;
  /** The mandate this client logs in with, if it logs in with a key. */
  mandate?: Maybe<Mandate>;
  /** The mappings of the client. A mapping is a mapping of a service to a service instance. This is used to configure the hub. */
  mappings: Array<ServiceInstanceMapping>;
  /** A human-readable label for the client that folds in the app, version, operator and device — e.g. `com.example.app:v0.1.1 by Johannes on my-laptop`. */
  name: Scalars['String']['output'];
  /** The node this runs on */
  node?: Maybe<Device>;
  /** Is this client public? A public client cannot keep a secret (desktop apps, mobile apps, SPAs, hub identities) and authenticates without one, relying on PKCE / device-code flows instead. */
  public: Scalars['Boolean']['output'];
  /** The public sources of the client. These are the public sources where users can find more information about the client. */
  publicSources: Array<PublicSource>;
  /** The release that this client belongs to. Null for clients that are not bound to an app release (hub identities, relying parties, pending registrations). */
  release?: Maybe<Release>;
  /** The operational role of the client. INTERFACE clients are human interfaces operated by a user in real time. AGENT clients are authorized once and then run unattended, receiving and processing tasks on the user's behalf. */
  role: ClientRole;
  /** The user this client acts for (derived from its membership). */
  user?: Maybe<User>;
};


/**
 * A client is a way of authenticating users with a release.
 *  The strategy of authentication is defined by the kind of client. And allows for different authentication flow.
 *  E.g a client can be a DESKTOP app, that might be used by multiple users, or a WEBSITE that wants to connect to a user's account,
 *  but also a DEVELOPMENT client that is used by a developer to test the app. The client model thinly wraps the oauth2 client model, which is used to authenticate users.
 */
export type ClientMappingsArgs = {
  ordering?: Array<ServiceInstanceMappingOrdering>;
};

/**
 * The one client model: every OAuth2 principal is a row here.
 *
 * Kinds of rows and their lifecycle:
 *
 * - **App clients** (`development`/`website`/`desktop`/`mobile`): the row is created by
 *   dynamic registration at ``/o/app-authorization/`` with identity fields
 *   only; human approval *binds* it (membership, organization, release, hub,
 *   mappings, scope). ``membership`` null == not yet approved.
 * - **Hub identities** (`hub`): same lifecycle via ``/o/hub-authorization/``;
 *   the created ``Hub`` links back via ``Hub.client`` (reverse:
 *   ``client.hub_identity``).
 * - **Relying parties** (`relying_party`): confidential OIDC clients
 *   provisioned from config by ``ensureopenid``; global (no organization).
 *
 * Implements authlib's ``ClientMixin`` directly — there is no separate
 * OAuth2 client table anymore.
 */
export type ClientFilter = {
  AND?: InputMaybe<ClientFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ClientFilter>;
  OR?: InputMaybe<ClientFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  role?: InputMaybe<ClientRole>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export enum ClientKind {
  Desktop = 'DESKTOP',
  Development = 'DEVELOPMENT',
  Hub = 'HUB',
  Mobile = 'MOBILE',
  RelyingParty = 'RELYING_PARTY',
  Website = 'WEBSITE'
}

export type ClientOrdering =
  { createdAt: Ordering; id?: never; lastReportedAt?: never; name?: never; }
  |  { createdAt?: never; id: Ordering; lastReportedAt?: never; name?: never; }
  |  { createdAt?: never; id?: never; lastReportedAt: Ordering; name?: never; }
  |  { createdAt?: never; id?: never; lastReportedAt?: never; name: Ordering; };

export enum ClientRole {
  Agent = 'AGENT',
  Interface = 'INTERFACE'
}

/** A communication channel through which a user can be notified (e.g. a push token). */
export type ComChannel = {
  __typename?: 'ComChannel';
  id: Scalars['ID']['output'];
  user: User;
};

/** __doc__ */
export type ComChannelFilter = {
  AND?: InputMaybe<ComChannelFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ComChannelFilter>;
  OR?: InputMaybe<ComChannelFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type ComChannelOrdering =
  { id: Ordering; name?: never; }
  |  { id?: never; name: Ordering; };

/** A Communication */
export type Communication = {
  __typename?: 'Communication';
  channel: Scalars['ID']['output'];
};

export type Context = {
  __typename?: 'Context';
  /** Are we acting in the active organization of the user? */
  fitsActiveOrganization: Scalars['Boolean']['output'];
  /** The hub this client was approved into (for an app client) or is the identity of (for a hub client). Null for clients bound to no hub, e.g. plain OIDC relying parties. Apps can pass its id back as `?hub=` on a later configure link to preselect it. */
  hub?: Maybe<Hub>;
  /** Is the user a member of this organization? False for an organization that does not exist, so it says nothing about other tenants. */
  memberOf: Scalars['Boolean']['output'];
  /** The organization that is associated with this app */
  organization: Organization;
  /** The roles that the user has in the organization */
  roles: Array<Scalars['String']['output']>;
  /** The scope of the app within in the organization */
  scope: Array<Scalars['String']['output']>;
  /** The user that is associated with this app */
  user: User;
};


export type ContextMemberOfArgs = {
  organization: Scalars['ID']['input'];
};

export type CreateGroupProfileInput = {
  avatar: Scalars['ID']['input'];
  group: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};

export type CreateInviteInput = {
  /** For a collaboration invite: whether the guests' apps may join the organization's mesh. They then reach only the hubs the granted collaborations run on, nothing else of the mesh. */
  allowMesh?: Scalars['Boolean']['input'];
  /** Grant only these collaborations of the organization's service instances, each with the roles that hold inside it, instead of making the holder a member. */
  collaborations?: InputMaybe<Array<SharedCollaborationInput>>;
  expiresInDays?: InputMaybe<Scalars['Int']['input']>;
  /** For a collaboration invite: how many people may accept it. Null: anyone with the link until it expires. */
  maxUses?: InputMaybe<Scalars['Int']['input']>;
  organization?: InputMaybe<Scalars['ID']['input']>;
  roles?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** Pre-authorize an agent app to issue mandate keys for a subject app, acting as you. */
export type CreateMandateInput = {
  /** Identifier of the app allowed to issue keys (e.g. a deployer). */
  agent: Scalars['String']['input'];
  /** Only an agent running on this device may issue. */
  agentDeviceId?: InputMaybe<Scalars['String']['input']>;
  /** Only an agent acting as this user may issue. */
  agentUser?: InputMaybe<Scalars['ID']['input']>;
  /** Opaque binding for the approving service (e.g. a release digest). */
  attestation?: InputMaybe<Scalars['String']['input']>;
  /** The mandate (and every key issued under it) stops working after this many days (1–365). Null: as long as your app. */
  expiresInDays?: InputMaybe<Scalars['Int']['input']>;
  /** The hub the subject composes against. Defaults to the calling client's hub. */
  hub?: InputMaybe<Scalars['ID']['input']>;
  /** The subject app. Its scopes and requirements are the ceiling for every key issued under it, and may not exceed your app's own; deviceId is ignored. */
  manifest: ManifestInput;
  /** How many live keys may exist under the mandate at once. */
  maxClients?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateOrganizationInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type CreateProfileInput = {
  name: Scalars['String']['input'];
  user: Scalars['ID']['input'];
};

export type CreateServiceInstanceInput = {
  allowedGroups?: InputMaybe<Array<Scalars['ID']['input']>>;
  allowedUsers?: InputMaybe<Array<Scalars['ID']['input']>>;
  deniedGroups?: InputMaybe<Array<Scalars['ID']['input']>>;
  deniedUsers?: InputMaybe<Array<Scalars['ID']['input']>>;
  identifier: Scalars['String']['input'];
  service: Scalars['ID']['input'];
};

export type DeclineInviteInput = {
  token: Scalars['String']['input'];
};

export type DeclineMembershipRequestInput = {
  id: Scalars['ID']['input'];
};

/** Device(id, node_id, name, organization) */
export type Device = {
  __typename?: 'Device';
  clients: Array<Client>;
  /** The device groups that belong to this device. */
  deviceGroups: Array<DeviceGroup>;
  /** The (per-organization hashed) id of the device. */
  deviceId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  /** @deprecated Use deviceId. */
  nodeId: Scalars['ID']['output'];
};


/** Device(id, node_id, name, organization) */
export type DeviceClientsArgs = {
  filters?: InputMaybe<ClientFilter>;
  ordering?: Array<ClientOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Device(id, node_id, name, organization) */
export type DeviceDeviceGroupsArgs = {
  filters?: InputMaybe<DeviceGroupFilter>;
  ordering?: Array<DeviceGroupOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Device(id, node_id, name, organization) */
export type DeviceFilter = {
  AND?: InputMaybe<DeviceFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<DeviceFilter>;
  OR?: InputMaybe<DeviceFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** A DeviceGroup is a group of compute nodes that can be used to run clients. DeviceGroups can be used to group compute nodes by location, hardware type, or any other criteria. */
export type DeviceGroup = {
  __typename?: 'DeviceGroup';
  /** The devices that belong to this device group. */
  devices: Array<Device>;
  id: Scalars['ID']['output'];
  /** The name of the device group. */
  name: Scalars['String']['output'];
};


/** A DeviceGroup is a group of compute nodes that can be used to run clients. DeviceGroups can be used to group compute nodes by location, hardware type, or any other criteria. */
export type DeviceGroupDevicesArgs = {
  filters?: InputMaybe<DeviceFilter>;
  ordering?: Array<DeviceOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** DeviceGroup(id, name, organization) */
export type DeviceGroupFilter = {
  AND?: InputMaybe<DeviceGroupFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<DeviceGroupFilter>;
  OR?: InputMaybe<DeviceGroupFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type DeviceGroupOrdering =
  { id: Ordering; name?: never; }
  |  { id?: never; name: Ordering; };

export type DeviceOrdering =
  { id: Ordering; name?: never; }
  |  { id?: never; name: Ordering; };

export enum Granularity {
  Day = 'DAY',
  Hour = 'HOUR',
  Month = 'MONTH',
  Quarter = 'QUARTER',
  Week = 'WEEK',
  Year = 'YEAR'
}

/**
 *
 * A Group is the base unit of Role Based Access Control. A Group can have many users and many permissions. A user can have many groups. A user with a group that has a permission can perform the action that the permission allows.
 * Groups are propagated to the respecting subservices. Permissions are not. Each subservice has to define its own permissions and mappings to groups.
 *
 */
export type Group = {
  __typename?: 'Group';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  profile?: Maybe<GroupProfile>;
  /** The users that are in the group */
  users: Array<User>;
};

/** __doc__ */
export type GroupFilter = {
  AND?: InputMaybe<GroupFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<GroupFilter>;
  OR?: InputMaybe<GroupFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  name?: InputMaybe<StrFilterLookup>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type GroupOrdering =
  { id: Ordering; name?: never; }
  |  { id?: never; name: Ordering; };

/**
 *
 * A Profile of a Group. A GroupProfile can be used to display information about a group,
 * such as a display name, a short bio and an avatar.
 *
 */
export type GroupProfile = {
  __typename?: 'GroupProfile';
  /** The avatar of the group */
  avatar?: Maybe<MediaStore>;
  /** A short bio of the group */
  bio?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** The name of the group */
  name?: Maybe<Scalars['String']['output']>;
};

/** A Hub is a specific configuration of a Service. It contains the configuration for a particular version of the service. */
export type Hub = {
  __typename?: 'Hub';
  /** The description of the service. This should be a human readable description of the service. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** The identifier of the hub. This should be a globally unique string that identifies the hub. We encourage you to use the reverse domain name notation. E.g. `com.example.myhub` */
  identifier: Scalars['ServiceIdentifier']['output'];
  /** Whether the hub's last health report said it was healthy. Null if it never reported. */
  lastHealthy?: Maybe<Scalars['Boolean']['output']>;
  /** When the hub last reported its health. Null if it never has. */
  lastSeenAt?: Maybe<Scalars['DateTime']['output']>;
  /** The hub's most recent health report, or null if it never reported. */
  latestHealth?: Maybe<HubHealthReport>;
  /** Whether the hub's last health report said its node is on the mesh. Null if it never reported mesh state. */
  meshConnected?: Maybe<Scalars['Boolean']['output']>;
  /** The hub node's MagicDNS name (or mesh IP), as last reported by the hub. Empty when unknown or off the mesh. */
  meshHost: Scalars['String']['output'];
  /** The name of the hub. This should be a human readable name of the hub. */
  name: Scalars['String']['output'];
  /** Whether the hub reported its health within the last three reporting intervals. */
  online: Scalars['Boolean']['output'];
  /** The organization that this hub belongs to. */
  organization: Organization;
  /** The hub software version, as last reported (empty if never reported). */
  version: Scalars['String']['output'];
};

/** Hub(id, name, organization, identifier, description, creator, client, token, uid, auth_key, last_seen_at, last_healthy, version, mesh_connected, mesh_host) */
export type HubFilter = {
  AND?: InputMaybe<HubFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<HubFilter>;
  OR?: InputMaybe<HubFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** One health report a hub posted to lok. */
export type HubHealthReport = {
  __typename?: 'HubHealthReport';
  /** When the hub reported. */
  createdAt: Scalars['DateTime']['output'];
  /** Did the hub report itself healthy? */
  healthy: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  /** The per-instance health in this report. Only instances of the hub are listed. */
  instances: Array<InstanceHealth>;
};

export type HubOrdering =
  { id: Ordering; name?: never; }
  |  { id?: never; name: Ordering; };

/** An alias for a service instance. This is used to provide a more user-friendly name for the instance. */
export type InstanceAlias = {
  __typename?: 'InstanceAlias';
  /** The challenge of the alias. This is used to verify that the alias is reachable. If set, the alias will be accessed via the challenge URL (e.g. 'example.com/.well-known/challenge'). If not set, the alias will be accessed via the instance's URL. */
  challenge: Scalars['String']['output'];
  /** The host of the alias (e.g. 'example.com'). Not set for a mesh alias, which resolves to its hub node's MagicDNS name. */
  host?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** The instance that this alias belongs to. */
  instance: ServiceInstance;
  /** The kind of alias. If absolute, it is a full URL; if mesh, it resolves to its hub node on the organization's mesh; if docker, it is only reachable from inside the hub's own docker environment. */
  kind: Scalars['String']['output'];
  /** The layer that this alias belongs to, if any. */
  layer?: Maybe<Layer>;
  /** The path of the alias (e.g. 'path' for 'example.com/path'). */
  path?: Maybe<Scalars['String']['output']>;
  /** The port of the alias (e.g. 8080 for 'example.com:8080'). If not set, the scheme's default port is used. */
  port?: Maybe<Scalars['Int']['output']>;
  /** Is this alias publicly reachable? If true, the coordination server can also check the alias's health directly, enabling health checks from the kontrol interface. */
  public: Scalars['Boolean']['output'];
  /** Is this alias using SSL? If true, the alias will be accessed via https:// instead of http://. This is used to indicate that the alias is secure and should be accessed via SSL */
  ssl: Scalars['Boolean']['output'];
};

export type InstanceAliasOrdering =
  { id: Ordering; name?: never; }
  |  { id?: never; name: Ordering; };

/** The health a hub reported for one of its service instances. */
export type InstanceHealth = {
  __typename?: 'InstanceHealth';
  /** Did the hub report the instance healthy? */
  healthy: Scalars['Boolean']['output'];
  /** The service instance this entry is about. */
  instance: ServiceInstance;
  /** Why the instance is unhealthy, if the hub said. */
  reason?: Maybe<Scalars['String']['output']>;
};

/** A single-use magic invite link that allows one person to join an organization. */
export type Invite = {
  __typename?: 'Invite';
  acceptedBy?: Maybe<User>;
  /** The collaborations this invite grants, with the roles that hold inside each. Null for an invite that makes its holder a member. */
  collaborations?: Maybe<Array<SharedCollaboration>>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: User;
  createdFor: Organization;
  createdMemberships: Array<Membership>;
  declinedBy?: Maybe<User>;
  email?: Maybe<Scalars['String']['output']>;
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  /** Get the full URL for accepting this invite */
  inviteUrl: Scalars['String']['output'];
  /** For a collaboration invite: how many people may accept it. Null: anyone with the link until it expires. */
  maxUses?: Maybe<Scalars['Int']['output']>;
  /** For a collaboration invite: whether its guests' apps may join the organization's mesh, reaching only the hubs the granted collaborations run on. */
  mesh: Scalars['Boolean']['output'];
  /** Whether anyone with the link can preview the invitation before signing in. */
  public: Scalars['Boolean']['output'];
  respondedAt?: Maybe<Scalars['DateTime']['output']>;
  roles: Array<Role>;
  status: Scalars['String']['output'];
  token: Scalars['String']['output'];
  /** How many people accepted it so far. */
  uses: Scalars['Int']['output'];
  /** Check if the invite is still valid and pending */
  valid: Scalars['Boolean']['output'];
};


/** A single-use magic invite link that allows one person to join an organization. */
export type InviteCreatedMembershipsArgs = {
  filters?: InputMaybe<MembershipFilter>;
  ordering?: Array<MembershipOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A single-use magic invite link that allows one person to join an organization. */
export type InviteRolesArgs = {
  filters?: InputMaybe<RoleFilter>;
  ordering?: Array<RoleOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Invite(id, token, email, created_by, created_for, created_at, expires_at, public, status, accepted_by, declined_by, responded_at, shared_collaborations, max_uses, uses, mesh) */
export type InviteFilter = {
  AND?: InputMaybe<InviteFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<InviteFilter>;
  OR?: InputMaybe<InviteFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};

export type InviteOrdering =
  { createdAt: Ordering; id?: never; }
  |  { createdAt?: never; id: Ordering; };

/** Issue a mandate key for one instance of a mandate's subject (called by the mandate's agent). */
export type IssueChildMandateKeyInput = {
  /** Unique per instance: one key logs in one client per device. */
  deviceId: Scalars['String']['input'];
  /** The key stops working after this many days. Null: as long as the mandate. */
  expiresInDays?: InputMaybe<Scalars['Int']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  mandate: Scalars['ID']['input'];
};

/** Issue a mandate key for an app, acting as you. It is capped at your app's own scopes and dies with your app. */
export type IssueMandateKeyInput = {
  /** Whether a client logging in with the key may ask for a mesh key. */
  allowMesh?: Scalars['Boolean']['input'];
  /** Let every release of the app log in with the key, not only the manifest's version. */
  anyVersion?: Scalars['Boolean']['input'];
  /** The key stops working after this many days (1–30). */
  expiresInDays: Scalars['Int']['input'];
  /** The hub the app composes against. Defaults to the calling client's hub. */
  hub?: InputMaybe<Scalars['ID']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  /** The app the key logs in. Identifier, version and deviceId (when given) must match exactly; scopes and requirements are a ceiling. */
  manifest: ManifestInput;
  /** On how many devices the key may log in. Null: unlimited. */
  maxClients?: InputMaybe<Scalars['Int']['input']>;
};

/** A freshly issued mandate and its key. The key is shown only here, once. */
export type IssuedMandateKey = {
  __typename?: 'IssuedMandateKey';
  /** The mandate key. Hand it to the app as FAKTS_MANDATE_KEY; lok keeps only its hash. */
  key: Scalars['String']['output'];
  mandate: Mandate;
};

/** A Layer is a network through which service instances can be reached (e.g. the public web, a tailnet, a VPN, or a docker network). Instance aliases are resolved relative to the layer they belong to. */
export type Layer = {
  __typename?: 'Layer';
  /** The description of the layer. This should be a human readable description of the layer. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** The identifier of the layer. This should be a globally unique string that identifies the layer. We encourage you to use the reverse domain name notation. E.g. `com.example.mylayer` */
  identifier: Scalars['ServiceIdentifier']['output'];
  /** The logo of the layer. This should be a url to a logo that can be used to represent the layer. */
  logo?: Maybe<MediaStore>;
  /** The name of the layer */
  name: Scalars['String']['output'];
};

/** Layer(id, name, identifier, organization, logo, description, dns_probe, get_probe, kind) */
export type LayerFilter = {
  AND?: InputMaybe<LayerFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<LayerFilter>;
  OR?: InputMaybe<LayerFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type LayerOrdering =
  { id: Ordering; name?: never; }
  |  { id?: never; name: Ordering; };

export type LinkingRequestInput = {
  host: Scalars['String']['input'];
  isSecure?: Scalars['Boolean']['input'];
  port: Scalars['String']['input'];
};

/** A standing authority to act as the grantor, inside one hub, up to a pinned app. Whoever holds its key logs in as the grantor (a keyed mandate), or the agent app it names may issue keyed mandates under it (an agent mandate). It dies with whoever issued it. */
export type Mandate = {
  __typename?: 'Mandate';
  /** If set, only an agent running on this device may issue. */
  agentDevice?: Maybe<Device>;
  /** The app allowed to issue keys under this mandate. Null for a keyed mandate. */
  agentIdentifier?: Maybe<Scalars['String']['output']>;
  /** If set, only an agent acting as this user may issue. */
  agentUser?: Maybe<User>;
  /** Whether a client logging in with the key may ask for a mesh key. */
  allowMesh: Scalars['Boolean']['output'];
  /** Opaque binding set by the approving service (e.g. a release digest). */
  attestation: Scalars['String']['output'];
  /** The keyed mandates the agent issued under this one. */
  children: Array<Mandate>;
  /** Who may use the mandate. */
  claimant: MandateClaimant;
  /** The clients logged in with the key, one per device. */
  clients: Array<Client>;
  createdAt: Scalars['DateTime']['output'];
  /** After this the mandate no longer works. Null: as long as its issuer. */
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  /** The user the clients act as. */
  grantor: User;
  /** The hub the clients compose against. */
  hub: Hub;
  id: Scalars['ID']['output'];
  /** Whether the mandate still works. */
  isLive: Scalars['Boolean']['output'];
  /** The app that issued this mandate. */
  issuingClient?: Maybe<Client>;
  /** The first characters of the key, to recognise it by. Empty for an agent mandate. */
  keyPrefix: Scalars['String']['output'];
  /** A human name for the mandate. */
  label: Scalars['String']['output'];
  /** When the key was last exchanged for a token. */
  lastUsedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Keyed: on how many devices the key may log in. Agent: how many live keys may be issued under it. Null means unlimited. */
  maxClients?: Maybe<Scalars['Int']['output']>;
  /** Who issued the mandate. */
  origin: MandateOrigin;
  /** The agent mandate this one was issued under. */
  parent?: Maybe<Mandate>;
  /** Why the mandate was withdrawn. */
  revocationReason?: Maybe<MandateRevocation>;
  /** When the mandate was withdrawn; its clients were deleted then. */
  revokedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The app the mandate admits, and the ceilings it puts on it. */
  subject: MandatePin;
};


/** A standing authority to act as the grantor, inside one hub, up to a pinned app. Whoever holds its key logs in as the grantor (a keyed mandate), or the agent app it names may issue keyed mandates under it (an agent mandate). It dies with whoever issued it. */
export type MandateChildrenArgs = {
  filters?: InputMaybe<MandateFilter>;
  ordering?: Array<MandateOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A standing authority to act as the grantor, inside one hub, up to a pinned app. Whoever holds its key logs in as the grantor (a keyed mandate), or the agent app it names may issue keyed mandates under it (an agent mandate). It dies with whoever issued it. */
export type MandateClientsArgs = {
  filters?: InputMaybe<ClientFilter>;
  ordering?: Array<ClientOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Who may use a mandate. */
export enum MandateClaimant {
  Agent = 'AGENT',
  Key = 'KEY'
}

/**
 * A standing authority to act as the grantor, inside one hub, up to a pinned manifest.
 *
 * Every headless login goes through one. Who may use it is the *claimant*:
 *
 * - ``key``: whoever holds the mandate key exchanges it at the token endpoint
 *   (``urn:fakts:grant-type:mandate-key``) for an access token of a client acting as
 *   the grantor. Only the key's SHA-256 is stored. There is no refresh chain: the
 *   client runs the grant again when its access token expires, and every grant
 *   re-checks the mandate.
 * - ``agent``: the app named by ``agent_identifier`` (a deployer) may issue keyed
 *   child mandates under it, one per instance it runs. kabinet's release approvals
 *   are agent mandates.
 *
 * Who issued it is the *origin*, and a mandate dies with its issuer: the grantor
 * membership, the issuing client (``issuing_client``), the parent agent mandate
 * (``parent``), the hub that asked for it, or the deployment config entry
 * (``config_name``) that names it. Deletions cascade; revocations are pushed down
 * to every child by ``fakts.services.mandates.revoke_mandate``.
 */
export type MandateFilter = {
  AND?: InputMaybe<MandateFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<MandateFilter>;
  OR?: InputMaybe<MandateFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  live?: InputMaybe<Scalars['Boolean']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type MandateOrdering =
  { createdAt: Ordering; id?: never; lastUsedAt?: never; }
  |  { createdAt?: never; id: Ordering; lastUsedAt?: never; }
  |  { createdAt?: never; id?: never; lastUsedAt: Ordering; };

/** Who issued a mandate. A mandate dies with its issuer. */
export enum MandateOrigin {
  Agent = 'AGENT',
  Client = 'CLIENT',
  Config = 'CONFIG',
  Hub = 'HUB',
  Member = 'MEMBER'
}

/** The ceiling a mandate puts on the apps that log in under it. A null field is open. */
export type MandatePin = {
  __typename?: 'MandatePin';
  /** The device. Null: any device. */
  deviceId?: Maybe<Scalars['String']['output']>;
  /** The app. Null: fixed by the first app that logs in. */
  identifier?: Maybe<Scalars['String']['output']>;
  /** The most requirements an app may ask for. Null: any. */
  requirements?: Maybe<Array<RequirementPin>>;
  /** The most scopes an app may ask for. Null: the organization's. */
  scopes?: Maybe<Array<Scalars['String']['output']>>;
  /** The release. Null: every release. */
  version?: Maybe<Scalars['String']['output']>;
};

/** Why a mandate stopped working. */
export enum MandateRevocation {
  IssuerRevoked = 'ISSUER_REVOKED',
  OrganizationRevoked = 'ORGANIZATION_REVOKED',
  ParentRevoked = 'PARENT_REVOKED',
  RemovedFromConfig = 'REMOVED_FROM_CONFIG',
  Revoked = 'REVOKED',
  Superseded = 'SUPERSEDED'
}

export type ManifestInput = {
  authors?: Array<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  deviceId?: InputMaybe<Scalars['String']['input']>;
  homepage?: InputMaybe<Scalars['String']['input']>;
  identifier: Scalars['String']['input'];
  keywords?: Array<Scalars['String']['input']>;
  license?: InputMaybe<Scalars['String']['input']>;
  logo?: InputMaybe<Scalars['String']['input']>;
  /** @deprecated Use deviceId. */
  nodeId?: InputMaybe<Scalars['String']['input']>;
  publicSources?: InputMaybe<Array<PublicSourceInput>>;
  repoUrl?: InputMaybe<Scalars['String']['input']>;
  requirements?: Array<RequirementInput>;
  scopes?: Array<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  version: Scalars['String']['input'];
};

/**
 * Small helper around S3-backed stored objects.
 *
 * Provides convenience helpers for generating presigned URLs and
 * uploading content.
 */
export type MediaStore = {
  __typename?: 'MediaStore';
  bucket: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  /** The stodre of the image */
  path?: Maybe<Scalars['String']['output']>;
  presignedUrl: Scalars['String']['output'];
};


/**
 * Small helper around S3-backed stored objects.
 *
 * Provides convenience helpers for generating presigned URLs and
 * uploading content.
 */
export type MediaStorePresignedUrlArgs = {
  host?: InputMaybe<Scalars['String']['input']>;
};

/**
 *
 * A Membership is a relation between a User and an Organization. It can have multiple Roles assigned to it.
 *
 */
export type Membership = {
  __typename?: 'Membership';
  /** The member's personal brand chroma (0–1) for this organization, if set. Null means they have not overridden the organization's default — fall back to `organization.brandChroma`. */
  brandChroma?: Maybe<Scalars['Float']['output']>;
  /** The member's personal brand hue (0–360) for this organization, if set. Null means they have not overridden the organization's default — fall back to `organization.brandHue`. */
  brandHue?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  organization: Organization;
  /** The roles that the user has in the organization */
  roles: Array<Role>;
  user: User;
};


/**
 *
 * A Membership is a relation between a User and an Organization. It can have multiple Roles assigned to it.
 *
 */
export type MembershipRolesArgs = {
  filters?: InputMaybe<RoleFilter>;
  ordering?: Array<RoleOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** __doc__ */
export type MembershipFilter = {
  AND?: InputMaybe<MembershipFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<MembershipFilter>;
  OR?: InputMaybe<MembershipFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type MembershipOrdering =
  { id: Ordering; };

/** A request of a user who is not a member of an organization to become one. */
export type MembershipRequest = {
  __typename?: 'MembershipRequest';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** Optional note from the user explaining the request. */
  reason?: Maybe<Scalars['String']['output']>;
  resolvedBy?: Maybe<User>;
  respondedAt?: Maybe<Scalars['DateTime']['output']>;
  status: Scalars['String']['output'];
  /** The user who asks to join. Not a member yet, so they are visible here and nowhere else. */
  user: User;
};

export type Mutation = {
  __typename?: 'Mutation';
  acceptInvite: Membership;
  acknowledgeMessage: SystemMessage;
  addUserToOrganization: Membership;
  approveMembershipRequest: Membership;
  cancelInvite: Invite;
  createGroupProfile: GroupProfile;
  createInvite: Invite;
  createMandate: Mandate;
  createOrganization: Organization;
  createProfile: Profile;
  createServiceInstance: ServiceInstance;
  declineInvite: Invite;
  declineMembershipRequest: MembershipRequest;
  issueChildMandateKey: IssuedMandateKey;
  issueMandateKey: IssuedMandateKey;
  notifyUser: Scalars['Boolean']['output'];
  registerComChannel: ComChannel;
  render: Scalars['Fakt']['output'];
  requestMediaUpload: PresignedPostCredentials;
  requestMembership: Scalars['Boolean']['output'];
  revokeMandate: Mandate;
  updateDevice: Device;
  updateGroupProfile: GroupProfile;
  updateMembershipColors: Membership;
  updateOrganization: Organization;
  updateProfile: Profile;
  updateServiceInstance: ServiceInstance;
};


export type MutationAcceptInviteArgs = {
  input: AcceptInviteInput;
};


export type MutationAcknowledgeMessageArgs = {
  input: AcknowledgeMessageInput;
};


export type MutationAddUserToOrganizationArgs = {
  input: AddUserToOrganizationInput;
};


export type MutationApproveMembershipRequestArgs = {
  input: ApproveMembershipRequestInput;
};


export type MutationCancelInviteArgs = {
  input: CancelInviteInput;
};


export type MutationCreateGroupProfileArgs = {
  input: CreateGroupProfileInput;
};


export type MutationCreateInviteArgs = {
  input: CreateInviteInput;
};


export type MutationCreateMandateArgs = {
  input: CreateMandateInput;
};


export type MutationCreateOrganizationArgs = {
  input: CreateOrganizationInput;
};


export type MutationCreateProfileArgs = {
  input: CreateProfileInput;
};


export type MutationCreateServiceInstanceArgs = {
  input: CreateServiceInstanceInput;
};


export type MutationDeclineInviteArgs = {
  input: DeclineInviteInput;
};


export type MutationDeclineMembershipRequestArgs = {
  input: DeclineMembershipRequestInput;
};


export type MutationIssueChildMandateKeyArgs = {
  input: IssueChildMandateKeyInput;
};


export type MutationIssueMandateKeyArgs = {
  input: IssueMandateKeyInput;
};


export type MutationNotifyUserArgs = {
  input: NotifyUserInput;
};


export type MutationRegisterComChannelArgs = {
  input: RegisterComChannelInput;
};


export type MutationRenderArgs = {
  input: RenderInput;
};


export type MutationRequestMediaUploadArgs = {
  input: RequestMediaUploadInput;
};


export type MutationRequestMembershipArgs = {
  input: RequestMembershipInput;
};


export type MutationRevokeMandateArgs = {
  input: RevokeMandateInput;
};


export type MutationUpdateDeviceArgs = {
  input: UpdateDeviceInput;
};


export type MutationUpdateGroupProfileArgs = {
  input: UpdateGroupProfileInput;
};


export type MutationUpdateMembershipColorsArgs = {
  input: UpdateMembershipColorsInput;
};


export type MutationUpdateOrganizationArgs = {
  input: UpdateOrganizationInput;
};


export type MutationUpdateProfileArgs = {
  input: UpdateProfileInput;
};


export type MutationUpdateServiceInstanceArgs = {
  input: UpdateServiceInstanceInput;
};

export type NotifyUserInput = {
  message: Scalars['String']['input'];
  title?: InputMaybe<Scalars['String']['input']>;
  user: Scalars['ID']['input'];
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

/** An Organization is a group of users that can work together on a project. */
export type Organization = {
  __typename?: 'Organization';
  /** The users that are currently active in the organization */
  activeUsers: Array<User>;
  /** The logo of the organization. Mirrors `profile.avatar`; prefer that field. */
  avatar?: Maybe<MediaStore>;
  /** The organization's default brand chroma (0–1), if set. Members can override it per-membership. */
  brandChroma?: Maybe<Scalars['Float']['output']>;
  /** The organization's default brand hue (0–360), if set. Members can override it per-membership. */
  brandHue?: Maybe<Scalars['Float']['output']>;
  /** A short description of the organization */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** the invites for this organization */
  invites: Array<Invite>;
  /** Requests of non-members to join this organization. Only its owner and admins see any. */
  membershipRequests: Array<MembershipRequest>;
  /** the memberships of people */
  memberships: Array<Membership>;
  /** The name of this organization */
  name: Scalars['String']['output'];
  profile: OrganizationProfile;
  /** The roles that are available in the organization */
  roles: Array<Role>;
  slug: Scalars['String']['output'];
  /** The users that are part of the organization */
  users: Array<User>;
};


/** An Organization is a group of users that can work together on a project. */
export type OrganizationActiveUsersArgs = {
  filters?: InputMaybe<UserFilter>;
  ordering?: Array<UserOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** An Organization is a group of users that can work together on a project. */
export type OrganizationInvitesArgs = {
  filters?: InputMaybe<InviteFilter>;
  ordering?: Array<InviteOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** An Organization is a group of users that can work together on a project. */
export type OrganizationMembershipsArgs = {
  filters?: InputMaybe<MembershipFilter>;
  ordering?: Array<MembershipOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** __doc__ */
export type OrganizationFilter = {
  AND?: InputMaybe<OrganizationFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<OrganizationFilter>;
  OR?: InputMaybe<OrganizationFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  name?: InputMaybe<StrFilterLookup>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type OrganizationOrdering =
  { id: Ordering; name?: never; }
  |  { id?: never; name: Ordering; };

/**
 *
 * A Profile of an Organization. An OrganizationProfile can be used to display public information
 * about an organization, such as a display name, a short bio and an avatar (logo).
 *
 */
export type OrganizationProfile = {
  __typename?: 'OrganizationProfile';
  /** The avatar (logo) of the organization */
  avatar?: Maybe<MediaStore>;
  /** A short bio of the organization */
  bio?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** The display name of the organization */
  name?: Maybe<Scalars['String']['output']>;
};

/** Temporary Credentials for a file upload that can be used by a Client (e.g. in a python datalayer) */
export type PresignedPostCredentials = {
  __typename?: 'PresignedPostCredentials';
  bucket: Scalars['String']['output'];
  /** The Content-Type the upload form must send; the policy pins it exactly. */
  contentType: Scalars['String']['output'];
  datalayer: Scalars['String']['output'];
  key: Scalars['String']['output'];
  policy: Scalars['String']['output'];
  store: Scalars['String']['output'];
  xAmzAlgorithm: Scalars['String']['output'];
  xAmzCredential: Scalars['String']['output'];
  xAmzDate: Scalars['String']['output'];
  xAmzSignature: Scalars['String']['output'];
};

/**
 *
 * A Profile of a User. A Profile can be used to display personalised information about a user,
 * such as a display name, a short bio and an avatar.
 *
 */
export type Profile = {
  __typename?: 'Profile';
  /** The avatar of the user */
  avatar?: Maybe<MediaStore>;
  /** A short bio of the user */
  bio?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** The name of the user */
  name?: Maybe<Scalars['String']['output']>;
};

export type PublicSource = {
  __typename?: 'PublicSource';
  /** The kind of the public source. E.g. 'github' */
  kind: Scalars['String']['output'];
  /** The url of the public source */
  url: Scalars['String']['output'];
};

export type PublicSourceInput = {
  kind: PublicSourceKind;
  url: Scalars['String']['input'];
};

export enum PublicSourceKind {
  Github = 'GITHUB',
  Website = 'WEBSITE'
}

export type Query = {
  __typename?: 'Query';
  _service: _Service;
  app: App;
  apps: Array<App>;
  client: Client;
  clients: Array<Client>;
  device: Device;
  /** Look a device up by its raw device id, as reported by the client. Device ids are stored as a per-organization hash, so the raw id is hashed with the caller's organization before lookup. */
  deviceByDeviceId: Device;
  deviceGroup: DeviceGroup;
  deviceGroups: Array<DeviceGroup>;
  devices: Array<Device>;
  group: Group;
  groups: Array<Group>;
  hallo: Scalars['String']['output'];
  /** A hub of the caller's organization, including its last reported health. The caller's own hub is also reachable as `mycontext { hub }`. */
  hub: Hub;
  hubs: Array<Hub>;
  invites: Array<Invite>;
  layer: Layer;
  layers: Array<Layer>;
  mandate: Mandate;
  /** Mandates you granted, your app issued, or (as an agent app) you may issue under or did. Org admins see all. */
  mandates: Array<Mandate>;
  me: User;
  message: SystemMessage;
  myActiveMessages: Array<SystemMessage>;
  myManagedClients: Array<Client>;
  mycontext: Context;
  mygroups: Array<Group>;
  organization: Organization;
  organizations: Array<Organization>;
  release: Release;
  releases: Array<Release>;
  role: Role;
  roles: Array<Role>;
  scopes: Array<Scope>;
  service: Service;
  serviceInstance: ServiceInstance;
  serviceInstances: Array<ServiceInstance>;
  serviceRelease: ServiceRelease;
  serviceReleases: Array<ServiceRelease>;
  services: Array<Service>;
  user: User;
  userStats: UserStats;
  users: Array<User>;
};


export type QueryAppArgs = {
  clientId?: InputMaybe<Scalars['ID']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  identifier?: InputMaybe<Scalars['AppIdentifier']['input']>;
};


export type QueryAppsArgs = {
  filters?: InputMaybe<AppFilter>;
  ordering?: Array<AppOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryClientArgs = {
  clientId?: InputMaybe<Scalars['ID']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryClientsArgs = {
  filters?: InputMaybe<ClientFilter>;
  ordering?: Array<ClientOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryDeviceArgs = {
  id: Scalars['ID']['input'];
};


export type QueryDeviceByDeviceIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryDeviceGroupArgs = {
  id: Scalars['ID']['input'];
};


export type QueryDeviceGroupsArgs = {
  filters?: InputMaybe<DeviceGroupFilter>;
  ordering?: Array<DeviceGroupOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryDevicesArgs = {
  filters?: InputMaybe<DeviceFilter>;
  ordering?: Array<DeviceOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryGroupArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGroupsArgs = {
  filters?: InputMaybe<GroupFilter>;
  ordering?: Array<GroupOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryHubArgs = {
  id: Scalars['ID']['input'];
};


export type QueryHubsArgs = {
  filters?: InputMaybe<HubFilter>;
  ordering?: Array<HubOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryInvitesArgs = {
  filters?: InputMaybe<InviteFilter>;
  ordering?: Array<InviteOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryLayerArgs = {
  id: Scalars['ID']['input'];
};


export type QueryLayersArgs = {
  filters?: InputMaybe<LayerFilter>;
  ordering?: Array<LayerOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryMandateArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMandatesArgs = {
  filters?: InputMaybe<MandateFilter>;
  ordering?: Array<MandateOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryMessageArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMyManagedClientsArgs = {
  kind: ClientKind;
};


export type QueryOrganizationArgs = {
  id: Scalars['ID']['input'];
};


export type QueryOrganizationsArgs = {
  filters?: InputMaybe<OrganizationFilter>;
  ordering?: Array<OrganizationOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryReleaseArgs = {
  clientId?: InputMaybe<Scalars['ID']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  identifier?: InputMaybe<Scalars['AppIdentifier']['input']>;
  version?: InputMaybe<Scalars['Version']['input']>;
};


export type QueryReleasesArgs = {
  ordering?: Array<ReleaseOrdering>;
};


export type QueryRoleArgs = {
  id: Scalars['ID']['input'];
};


export type QueryRolesArgs = {
  filters?: InputMaybe<RoleFilter>;
  ordering?: Array<RoleOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryServiceArgs = {
  id: Scalars['ID']['input'];
};


export type QueryServiceInstanceArgs = {
  id: Scalars['ID']['input'];
};


export type QueryServiceInstancesArgs = {
  filters?: InputMaybe<ServiceInstanceFilter>;
  ordering?: Array<ServiceInstanceOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryServiceReleaseArgs = {
  id: Scalars['ID']['input'];
};


export type QueryServiceReleasesArgs = {
  filters?: InputMaybe<ServiceReleaseFilter>;
  ordering?: Array<ServiceReleaseOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryServicesArgs = {
  filters?: InputMaybe<ServiceFilter>;
  ordering?: Array<ServiceOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryUserArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUserStatsArgs = {
  filters?: InputMaybe<UserFilter>;
};


export type QueryUsersArgs = {
  filters?: InputMaybe<UserFilter>;
  ordering?: Array<UserOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type RegisterComChannelInput = {
  token: Scalars['String']['input'];
};

/** A Release is a version of an app. Releases might change over time. E.g. a release might be updated to fix a bug, and the release might be updated to add a new feature. This is why they are the home for `scopes` and `requirements`, which might change over the release cycle. */
export type Release = {
  __typename?: 'Release';
  /** The app that this release belongs to. */
  app: App;
  /** The clients of the release */
  clients: Array<Client>;
  id: Scalars['ID']['output'];
  /** The logo of the release. This should be a url to a logo that can be used to represent the release. */
  logo?: Maybe<MediaStore>;
  /** The name of the release. This should be a string that identifies the release beyond the version number. E.g. `canary`. */
  name: Scalars['String']['output'];
  /** The requirements of the release: the services (by key and service identifier) a client of this release needs composed against it. Each entry is a manifest `Requirement` object (`key`, `service`, `optional`, `description`). */
  requirements: Array<Scalars['JSON']['output']>;
  /** The scopes of the release. Scopes are used to limit the access of a client to a user's data. They represent app-level permissions. */
  scopes: Array<Scalars['String']['output']>;
  /** The version of the release. This should be a string that identifies the version of the release. We enforce semantic versioning notation. E.g. `0.1.0`. The version is unique per app. */
  version: Scalars['Version']['output'];
};


/** A Release is a version of an app. Releases might change over time. E.g. a release might be updated to fix a bug, and the release might be updated to add a new feature. This is why they are the home for `scopes` and `requirements`, which might change over the release cycle. */
export type ReleaseClientsArgs = {
  filters?: InputMaybe<ClientFilter>;
  ordering?: Array<ClientOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type ReleaseOrdering =
  { id: Ordering; name?: never; }
  |  { id?: never; name: Ordering; };

export type RenderInput = {
  client: Scalars['ID']['input'];
  hub?: InputMaybe<Scalars['ID']['input']>;
  manifest?: InputMaybe<ManifestInput>;
  request?: InputMaybe<LinkingRequestInput>;
};

export type RequestMediaUploadInput = {
  /** MIME type of the file. The upload must send the same Content-Type. Guessed from `key` when omitted. */
  contentType?: InputMaybe<Scalars['String']['input']>;
  datalayer: Scalars['String']['input'];
  key: Scalars['String']['input'];
};

export type RequestMembershipInput = {
  organization: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
};

export type RequirementInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  key: Scalars['String']['input'];
  optional?: Scalars['Boolean']['input'];
  service: Scalars['String']['input'];
};

/** A requirement as a mandate pins it. */
export type RequirementPin = {
  __typename?: 'RequirementPin';
  key: Scalars['String']['output'];
  service: Scalars['String']['output'];
};

export type RevokeMandateInput = {
  id: Scalars['ID']['input'];
};

/** A Role is a set of permissions that can be assigned to a user. It is used to define what a user can do in the system. */
export type Role = {
  __typename?: 'Role';
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  identifier: Scalars['String']['output'];
  organization: Organization;
};

/** __doc__ */
export type RoleFilter = {
  AND?: InputMaybe<RoleFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<RoleFilter>;
  OR?: InputMaybe<RoleFilter>;
  identifier?: InputMaybe<StrFilterLookup>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type RoleOrdering =
  { id: Ordering; };

/** A scope that can be assigned to a client. Scopes are used to limit the access of a client to a user's data. They represent app-level permissions. */
export type Scope = {
  __typename?: 'Scope';
  /** The description of the scope. This is a human readable description of the scope. */
  description: Scalars['String']['output'];
  /** The label of the scope. This is the human readable name of the scope. */
  label: Scalars['String']['output'];
  /** The value of the scope. This is the value that is used in the OAuth2 flow. */
  value: Scalars['String']['output'];
};

/** A Service is a Webservice that a Client might want to access. It is not the configured instance of the service, but the service itself. */
export type Service = {
  __typename?: 'Service';
  /** The description of the service. This should be a human readable description of the service. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** The identifier of the service. This should be a globally unique string that identifies the service. We encourage you to use the reverse domain name notation. E.g. `com.example.myservice` */
  identifier: Scalars['ServiceIdentifier']['output'];
  /** The logo of the service. This should be a url to a logo that can be used to represent the service. */
  logo?: Maybe<MediaStore>;
  /** The name of the service */
  name: Scalars['String']['output'];
  /** The releases of the service. A service release is a specific version of a service. It will be configured by a configuration backend and will be used to send to the client as a configuration. It should never contain sensitive information. */
  releases: Array<ServiceRelease>;
};


/** A Service is a Webservice that a Client might want to access. It is not the configured instance of the service, but the service itself. */
export type ServiceReleasesArgs = {
  filters?: InputMaybe<ServiceReleaseFilter>;
  ordering?: Array<ServiceReleaseOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Service(id, name, identifier, organization, logo, description) */
export type ServiceFilter = {
  AND?: InputMaybe<ServiceFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ServiceFilter>;
  OR?: InputMaybe<ServiceFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** A ServiceInstance is a configured instance of a Service. It will be configured by a configuration backend and will be used to send to the client as a configuration. It should never contain sensitive information. */
export type ServiceInstance = {
  __typename?: 'ServiceInstance';
  /** The aliases of the instance. An alias is a way to reach the instance. Clients can use these aliases to check if they can reach the instance. */
  aliases: Array<InstanceAlias>;
  /** The groups that are allowed to use this instance. */
  allowedGroups: Array<Group>;
  /** The users that are allowed to use this instance. */
  allowedUsers: Array<User>;
  /** The groups that are denied to use this instance. */
  deniedGroups: Array<Group>;
  /** The users that are denied to use this instance. */
  deniedUsers: Array<User>;
  id: Scalars['ID']['output'];
  /** The instance id of the instance. This is a unique string that identifies the instance. It is used to identify the instance in the code and in the database. */
  instanceId: Scalars['ID']['output'];
  /** The logo of the app. This should be a url to a logo that can be used to represent the app. */
  logo?: Maybe<MediaStore>;
  /** The mappings of the hub. A mapping is a mapping of a service to a service instance. This is used to configure the hub. */
  mappings: Array<ServiceInstanceMapping>;
  /** A human readable name of the instance, derived from its service identifier and instance id. */
  name: Scalars['String']['output'];
  /** The service release that this instance belongs to. */
  release: ServiceRelease;
};


/** A ServiceInstance is a configured instance of a Service. It will be configured by a configuration backend and will be used to send to the client as a configuration. It should never contain sensitive information. */
export type ServiceInstanceAliasesArgs = {
  ordering?: Array<InstanceAliasOrdering>;
};


/** A ServiceInstance is a configured instance of a Service. It will be configured by a configuration backend and will be used to send to the client as a configuration. It should never contain sensitive information. */
export type ServiceInstanceAllowedGroupsArgs = {
  filters?: InputMaybe<GroupFilter>;
  ordering?: Array<GroupOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A ServiceInstance is a configured instance of a Service. It will be configured by a configuration backend and will be used to send to the client as a configuration. It should never contain sensitive information. */
export type ServiceInstanceAllowedUsersArgs = {
  filters?: InputMaybe<UserFilter>;
  ordering?: Array<UserOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A ServiceInstance is a configured instance of a Service. It will be configured by a configuration backend and will be used to send to the client as a configuration. It should never contain sensitive information. */
export type ServiceInstanceDeniedGroupsArgs = {
  filters?: InputMaybe<GroupFilter>;
  ordering?: Array<GroupOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A ServiceInstance is a configured instance of a Service. It will be configured by a configuration backend and will be used to send to the client as a configuration. It should never contain sensitive information. */
export type ServiceInstanceDeniedUsersArgs = {
  filters?: InputMaybe<UserFilter>;
  ordering?: Array<UserOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A ServiceInstance is a configured instance of a Service. It will be configured by a configuration backend and will be used to send to the client as a configuration. It should never contain sensitive information. */
export type ServiceInstanceMappingsArgs = {
  ordering?: Array<ServiceInstanceMappingOrdering>;
};

/**
 * One service running in a hub, named by its name there (``instance_id``: ``mikro``).
 *
 * The hub names its services itself: the name is unique within the hub, and with the hub's own
 * uuid (``Hub.uid``) it is what a token composed for the service says (``aud: [mikro]``,
 * ``hub: <uid>``) and what a guest's collaborations are listed under. Authorized again, by
 * another admin or with another release, it is the same instance, updated in place.
 */
export type ServiceInstanceFilter = {
  AND?: InputMaybe<ServiceInstanceFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ServiceInstanceFilter>;
  OR?: InputMaybe<ServiceInstanceFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** A ServiceInstanceMapping binds one of a client's requirements (by key) to the ServiceInstance that fulfils it. The set of mappings of a client is its composed configuration. */
export type ServiceInstanceMapping = {
  __typename?: 'ServiceInstanceMapping';
  /** The client whose requirement this mapping fulfils. */
  client: Client;
  id: Scalars['ID']['output'];
  /** The service instance this requirement is mapped to. */
  instance: ServiceInstance;
  /** The requirement key of the client that this mapping fulfils. Unique per client. */
  key: Scalars['String']['output'];
  /** Is this mapping optional? If a mapping is optional, you can configure the client without this mapping. */
  optional: Scalars['Boolean']['output'];
};

export type ServiceInstanceMappingOrdering =
  { id: Ordering; };

export type ServiceInstanceOrdering =
  { id: Ordering; };

export type ServiceOrdering =
  { id: Ordering; name?: never; }
  |  { id?: never; name: Ordering; };

/** A ServiceRelease is a specific release of a Service. It contains the configuration for a particular version of the service. */
export type ServiceRelease = {
  __typename?: 'ServiceRelease';
  id: Scalars['ID']['output'];
  /** The instances of the service. A service instance is a configured instance of a service. It will be configured by a configuration backend and will be used to send to the client as a configuration. It should never contain sensitive information. */
  instances: Array<ServiceInstance>;
  /** The service that this release belongs to. */
  service: Service;
  /** The version of the service. This should be a human readable version string. */
  version: Scalars['String']['output'];
};


/** A ServiceRelease is a specific release of a Service. It contains the configuration for a particular version of the service. */
export type ServiceReleaseInstancesArgs = {
  filters?: InputMaybe<ServiceInstanceFilter>;
  ordering?: Array<ServiceInstanceOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** ServiceRelease(id, service, version) */
export type ServiceReleaseFilter = {
  AND?: InputMaybe<ServiceReleaseFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ServiceReleaseFilter>;
  OR?: InputMaybe<ServiceReleaseFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type ServiceReleaseOrdering =
  { id: Ordering; };

/** One collaboration a collaboration invite grants: a collaboration of a service instance, with the roles that hold inside it. */
export type SharedCollaboration = {
  __typename?: 'SharedCollaboration';
  /** The collaboration's id in that service. */
  collaboration: Scalars['String']['output'];
  /** The service instance the collaboration lives in. */
  instance: Scalars['ID']['output'];
  /** Identifiers of the organization's roles that hold inside the collaboration. Empty: view only. */
  roles: Array<Scalars['String']['output']>;
};

export type SharedCollaborationInput = {
  /** The collaboration's id in that service. */
  collaboration: Scalars['String']['input'];
  /** The service instance the collaboration lives in (on a hub of the organization). */
  instance: Scalars['ID']['input'];
  /** Identifiers of the organization's roles that hold for the guest inside the collaboration. Empty: view only. */
  roles?: Array<Scalars['String']['input']>;
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

export type Subscription = {
  __typename?: 'Subscription';
  communications: Communication;
};


export type SubscriptionCommunicationsArgs = {
  channels: Array<Scalars['ID']['input']>;
};

/**
 *
 * A System Message is a message that is sent to a user.
 * It can be used to notify the user of important events or to request their attention.
 * System messages can use Rekuest Hooks as actions to allow the user to interact with the message.
 *
 *
 *
 */
export type SystemMessage = {
  __typename?: 'SystemMessage';
  /** The action to take (e.g. the node) */
  action: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  message?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  user: User;
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

export type UpdateDeviceInput = {
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateGroupProfileInput = {
  avatar: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};

export type UpdateMembershipColorsInput = {
  brandChroma?: InputMaybe<Scalars['Float']['input']>;
  brandHue?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdateOrganizationInput = {
  avatar?: InputMaybe<Scalars['ID']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateProfileInput = {
  avatar: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};

export type UpdateServiceInstanceInput = {
  allowedGroups?: InputMaybe<Array<Scalars['ID']['input']>>;
  allowedUsers?: InputMaybe<Array<Scalars['ID']['input']>>;
  deniedGroups?: InputMaybe<Array<Scalars['ID']['input']>>;
  deniedUsers?: InputMaybe<Array<Scalars['ID']['input']>>;
  id: Scalars['ID']['input'];
};

/**
 *
 * A User is a person that can log in to the system. They are uniquely identified by their username.
 * And can have an email address associated with them (but don't have to).
 *
 * A user can be assigned to groups and has a profile that can be used to display information about them.
 * Detail information about a user can be found in the profile.
 *
 * All users can have social accounts associated with them. These are used to authenticate the user with external services,
 * such as ORCID or GitHub.
 *
 *
 */
export type User = {
  __typename?: 'User';
  /** A short-lived URL of the user's avatar (`profile.avatar`), if they have one. */
  avatar?: Maybe<Scalars['String']['output']>;
  /** The communication channels that the user has */
  comChannels: Array<ComChannel>;
  email?: Maybe<Scalars['String']['output']>;
  firstName?: Maybe<Scalars['String']['output']>;
  /** The groups this user belongs to. A user will get all permissions granted to each of their groups. */
  groups: Array<Group>;
  id: Scalars['ID']['output'];
  lastName?: Maybe<Scalars['String']['output']>;
  /** The memberships of the user in organizations */
  memberships: Array<Membership>;
  profile: Profile;
  /** Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. */
  username: Scalars['String']['output'];
};


/**
 *
 * A User is a person that can log in to the system. They are uniquely identified by their username.
 * And can have an email address associated with them (but don't have to).
 *
 * A user can be assigned to groups and has a profile that can be used to display information about them.
 * Detail information about a user can be found in the profile.
 *
 * All users can have social accounts associated with them. These are used to authenticate the user with external services,
 * such as ORCID or GitHub.
 *
 *
 */
export type UserComChannelsArgs = {
  filters?: InputMaybe<ComChannelFilter>;
  ordering?: Array<ComChannelOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/**
 *
 * A User is a person that can log in to the system. They are uniquely identified by their username.
 * And can have an email address associated with them (but don't have to).
 *
 * A user can be assigned to groups and has a profile that can be used to display information about them.
 * Detail information about a user can be found in the profile.
 *
 * All users can have social accounts associated with them. These are used to authenticate the user with external services,
 * such as ORCID or GitHub.
 *
 *
 */
export type UserGroupsArgs = {
  filters?: InputMaybe<GroupFilter>;
  ordering?: Array<GroupOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/**
 *
 * A User is a person that can log in to the system. They are uniquely identified by their username.
 * And can have an email address associated with them (but don't have to).
 *
 * A user can be assigned to groups and has a profile that can be used to display information about them.
 * Detail information about a user can be found in the profile.
 *
 * All users can have social accounts associated with them. These are used to authenticate the user with external services,
 * such as ORCID or GitHub.
 *
 *
 */
export type UserMembershipsArgs = {
  filters?: InputMaybe<MembershipFilter>;
  ordering?: Array<MembershipOrdering>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Numeric/aggregatable fields of User */
export enum UserField {
  CreatedAt = 'CREATED_AT'
}

/**
 * A User of the System
 *
 * Lok Users are the main users of the system. They can be assigned to groups and have profiles, that can be used to display information about them.
 * Each user is identifier by a unique username, and can have an email address associated with them.
 */
export type UserFilter = {
  AND?: InputMaybe<UserFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<UserFilter>;
  OR?: InputMaybe<UserFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
  /** Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. */
  username?: InputMaybe<StrFilterLookup>;
};

export type UserOrdering =
  { id: Ordering; };

export type UserStats = {
  __typename?: 'UserStats';
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


export type UserStatsAvgArgs = {
  field: UserField;
};


export type UserStatsDistinctCountArgs = {
  field: UserField;
};


export type UserStatsMaxArgs = {
  field: UserField;
};


export type UserStatsMinArgs = {
  field: UserField;
};


export type UserStatsSeriesArgs = {
  by: Granularity;
  field: UserField;
  timestampField: UserTimestampField;
};


export type UserStatsSumArgs = {
  field: UserField;
};

/** Datetime fields of User for bucketing */
export enum UserTimestampField {
  CreatedAt = 'CREATED_AT'
}

export type _Service = {
  __typename?: '_Service';
  sdl: Scalars['String']['output'];
};

export type InstanceAliasFragment = { __typename?: 'InstanceAlias', host?: string | null, port?: number | null, ssl: boolean, challenge: string, kind: string };

export type ListInstanceAliasFragment = { __typename?: 'InstanceAlias', host?: string | null, port?: number | null, ssl: boolean, challenge: string, kind: string };

export type DetailAppFragment = { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, releases: Array<{ __typename?: 'Release', id: string, version: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null } }> };

export type ListAppFragment = { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null };

export type DetailClientFragment = { __typename?: 'Client', id: string, name: string, kind: ClientKind, clientId: string, user?: { __typename?: 'User', id: string, username: string } | null, release?: { __typename?: 'Release', id: string, version: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null } } | null, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, mappings: Array<{ __typename?: 'ServiceInstanceMapping', id: string, key: string, optional: boolean, instance: { __typename?: 'ServiceInstance', id: string }, client: { __typename?: 'Client', id: string, name: string, kind: ClientKind, user?: { __typename?: 'User', id: string, username: string } | null, release?: { __typename?: 'Release', version: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null } } | null } }> };

export type ListClientFragment = { __typename?: 'Client', id: string, name: string, kind: ClientKind, user?: { __typename?: 'User', id: string, username: string } | null, release?: { __typename?: 'Release', version: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null } } | null };

export type ContextFragment = { __typename?: 'Context', roles: Array<string>, scope: Array<string>, organization: { __typename?: 'Organization', id: string, name: string, slug: string }, user: { __typename?: 'User', id: string, username: string } };

export type PresignedPostCredentialsFragment = { __typename?: 'PresignedPostCredentials', xAmzAlgorithm: string, xAmzCredential: string, xAmzDate: string, xAmzSignature: string, key: string, bucket: string, datalayer: string, policy: string, store: string };

export type DetailGroupFragment = { __typename?: 'Group', id: string, name: string, users: Array<{ __typename?: 'User', username: string, firstName?: string | null, lastName?: string | null, email?: string | null, avatar?: string | null, id: string }>, profile?: { __typename?: 'GroupProfile', id: string, name?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } | null };

export type ListGroupFragment = { __typename?: 'Group', id: string, name: string, profile?: { __typename?: 'GroupProfile', id: string, bio?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } | null };

export type GroupProfileFragment = { __typename?: 'GroupProfile', id: string, name?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null };

export type LayerFragment = { __typename?: 'Layer', id: string, name: string, description?: string | null, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null };

export type ListLayerFragment = { __typename?: 'Layer', id: string, name: string, description?: string | null, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null };

export type ProvisioningMandateFragment = { __typename?: 'Mandate', id: string, agentIdentifier?: string | null, claimant: MandateClaimant, allowMesh: boolean, subject: { __typename?: 'MandatePin', identifier?: string | null, version?: string | null }, parent?: { __typename?: 'Mandate', id: string } | null };

export type BrandMembershipFragment = { __typename?: 'Membership', id: string, brandHue?: number | null, brandChroma?: number | null, organization: { __typename?: 'Organization', id: string } };

export type BrandOrganizationFragment = { __typename?: 'Organization', id: string, brandHue?: number | null, brandChroma?: number | null };

export type ProfileFragment = { __typename?: 'Profile', id: string, name?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null };

export type DetailReleaseFragment = { __typename?: 'Release', id: string, version: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null }, clients: Array<{ __typename?: 'Client', id: string, name: string, kind: ClientKind, user?: { __typename?: 'User', id: string, username: string } | null, release?: { __typename?: 'Release', version: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null } } | null }> };

export type ListReleaseFragment = { __typename?: 'Release', id: string, version: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null } };

export type ListServiceFragment = { __typename?: 'Service', identifier: any, id: string, name: string };

export type ServiceFragment = { __typename?: 'Service', identifier: any, id: string, name: string, releases: Array<{ __typename?: 'ServiceRelease', id: string, version: string, service: { __typename?: 'Service', identifier: any, id: string, name: string } }> };

export type ServiceInstanceFragment = { __typename?: 'ServiceInstance', id: string, release: { __typename?: 'ServiceRelease', id: string, version: string, service: { __typename?: 'Service', identifier: any, id: string, name: string } }, allowedUsers: Array<{ __typename?: 'User', username: string, firstName?: string | null, lastName?: string | null, email?: string | null, avatar?: string | null, id: string }>, deniedUsers: Array<{ __typename?: 'User', username: string, firstName?: string | null, lastName?: string | null, email?: string | null, avatar?: string | null, id: string }>, allowedGroups: Array<{ __typename?: 'Group', id: string, name: string, profile?: { __typename?: 'GroupProfile', id: string, bio?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } | null }>, deniedGroups: Array<{ __typename?: 'Group', id: string, name: string, profile?: { __typename?: 'GroupProfile', id: string, bio?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } | null }>, mappings: Array<{ __typename?: 'ServiceInstanceMapping', id: string, key: string, optional: boolean, instance: { __typename?: 'ServiceInstance', id: string }, client: { __typename?: 'Client', id: string, name: string, kind: ClientKind, user?: { __typename?: 'User', id: string, username: string } | null, release?: { __typename?: 'Release', version: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null } } | null } }>, aliases: Array<{ __typename?: 'InstanceAlias', host?: string | null, port?: number | null, ssl: boolean, challenge: string, kind: string }>, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null };

export type ListServiceInstanceFragment = { __typename?: 'ServiceInstance', id: string };

export type ListServiceReleaseFragment = { __typename?: 'ServiceRelease', id: string, version: string, service: { __typename?: 'Service', identifier: any, id: string, name: string } };

export type ServiceReleaseFragment = { __typename?: 'ServiceRelease', id: string, version: string, service: { __typename?: 'Service', identifier: any }, instances: Array<{ __typename?: 'ServiceInstance', id: string }> };

export type ListServiceInstanceMappingFragment = { __typename?: 'ServiceInstanceMapping', id: string, key: string, optional: boolean, instance: { __typename?: 'ServiceInstance', id: string }, client: { __typename?: 'Client', id: string, name: string, kind: ClientKind, user?: { __typename?: 'User', id: string, username: string } | null, release?: { __typename?: 'Release', version: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null } } | null } };

export type ListUserFragment = { __typename?: 'User', username: string, firstName?: string | null, lastName?: string | null, email?: string | null, avatar?: string | null, id: string };

export type DetailUserFragment = { __typename?: 'User', id: string, username: string, email?: string | null, firstName?: string | null, lastName?: string | null, avatar?: string | null, groups: Array<{ __typename?: 'Group', id: string, name: string }>, profile: { __typename?: 'Profile', id: string, name?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } };

export type MeUserFragment = { __typename?: 'User', id: string, username: string, email?: string | null, firstName?: string | null, lastName?: string | null, avatar?: string | null };

export type RegisterComChannelMutationVariables = Exact<{
  input: RegisterComChannelInput;
}>;


export type RegisterComChannelMutation = { __typename?: 'Mutation', registerComChannel: { __typename?: 'ComChannel', id: string, user: { __typename?: 'User', id: string } } };

export type CreateGroupProfileMutationVariables = Exact<{
  input: CreateGroupProfileInput;
}>;


export type CreateGroupProfileMutation = { __typename?: 'Mutation', createGroupProfile: { __typename?: 'GroupProfile', id: string, name?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } };

export type UpdateGroupProfileMutationVariables = Exact<{
  input: UpdateGroupProfileInput;
}>;


export type UpdateGroupProfileMutation = { __typename?: 'Mutation', updateGroupProfile: { __typename?: 'GroupProfile', id: string, name?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } };

export type UpdateServiceInstanceMutationVariables = Exact<{
  input: UpdateServiceInstanceInput;
}>;


export type UpdateServiceInstanceMutation = { __typename?: 'Mutation', updateServiceInstance: { __typename?: 'ServiceInstance', id: string, release: { __typename?: 'ServiceRelease', id: string, version: string, service: { __typename?: 'Service', identifier: any, id: string, name: string } }, allowedUsers: Array<{ __typename?: 'User', username: string, firstName?: string | null, lastName?: string | null, email?: string | null, avatar?: string | null, id: string }>, deniedUsers: Array<{ __typename?: 'User', username: string, firstName?: string | null, lastName?: string | null, email?: string | null, avatar?: string | null, id: string }>, allowedGroups: Array<{ __typename?: 'Group', id: string, name: string, profile?: { __typename?: 'GroupProfile', id: string, bio?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } | null }>, deniedGroups: Array<{ __typename?: 'Group', id: string, name: string, profile?: { __typename?: 'GroupProfile', id: string, bio?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } | null }>, mappings: Array<{ __typename?: 'ServiceInstanceMapping', id: string, key: string, optional: boolean, instance: { __typename?: 'ServiceInstance', id: string }, client: { __typename?: 'Client', id: string, name: string, kind: ClientKind, user?: { __typename?: 'User', id: string, username: string } | null, release?: { __typename?: 'Release', version: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null } } | null } }>, aliases: Array<{ __typename?: 'InstanceAlias', host?: string | null, port?: number | null, ssl: boolean, challenge: string, kind: string }>, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null } };

export type CreateServiceInstanceMutationVariables = Exact<{
  input: CreateServiceInstanceInput;
}>;


export type CreateServiceInstanceMutation = { __typename?: 'Mutation', createServiceInstance: { __typename?: 'ServiceInstance', id: string, release: { __typename?: 'ServiceRelease', id: string, version: string, service: { __typename?: 'Service', identifier: any, id: string, name: string } }, allowedUsers: Array<{ __typename?: 'User', username: string, firstName?: string | null, lastName?: string | null, email?: string | null, avatar?: string | null, id: string }>, deniedUsers: Array<{ __typename?: 'User', username: string, firstName?: string | null, lastName?: string | null, email?: string | null, avatar?: string | null, id: string }>, allowedGroups: Array<{ __typename?: 'Group', id: string, name: string, profile?: { __typename?: 'GroupProfile', id: string, bio?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } | null }>, deniedGroups: Array<{ __typename?: 'Group', id: string, name: string, profile?: { __typename?: 'GroupProfile', id: string, bio?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } | null }>, mappings: Array<{ __typename?: 'ServiceInstanceMapping', id: string, key: string, optional: boolean, instance: { __typename?: 'ServiceInstance', id: string }, client: { __typename?: 'Client', id: string, name: string, kind: ClientKind, user?: { __typename?: 'User', id: string, username: string } | null, release?: { __typename?: 'Release', version: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null } } | null } }>, aliases: Array<{ __typename?: 'InstanceAlias', host?: string | null, port?: number | null, ssl: boolean, challenge: string, kind: string }>, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null } };

export type CreateMandateMutationVariables = Exact<{
  input: CreateMandateInput;
}>;


export type CreateMandateMutation = { __typename?: 'Mutation', createMandate: { __typename?: 'Mandate', id: string, agentIdentifier?: string | null, claimant: MandateClaimant, allowMesh: boolean, subject: { __typename?: 'MandatePin', identifier?: string | null, version?: string | null }, parent?: { __typename?: 'Mandate', id: string } | null } };

export type RevokeMandateMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RevokeMandateMutation = { __typename?: 'Mutation', revokeMandate: { __typename?: 'Mandate', id: string } };

export type IssueChildMandateKeyMutationVariables = Exact<{
  input: IssueChildMandateKeyInput;
}>;


export type IssueChildMandateKeyMutation = { __typename?: 'Mutation', issueChildMandateKey: { __typename?: 'IssuedMandateKey', key: string, mandate: { __typename?: 'Mandate', id: string } } };

export type CreateUserProfileMutationVariables = Exact<{
  input: CreateProfileInput;
}>;


export type CreateUserProfileMutation = { __typename?: 'Mutation', createProfile: { __typename?: 'Profile', id: string, name?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } };

export type UpdateUserProfileMutationVariables = Exact<{
  input: UpdateProfileInput;
}>;


export type UpdateUserProfileMutation = { __typename?: 'Mutation', updateProfile: { __typename?: 'Profile', id: string, name?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } };

export type RequestMediaUploadMutationVariables = Exact<{
  key: Scalars['String']['input'];
  datalayer: Scalars['String']['input'];
}>;


export type RequestMediaUploadMutation = { __typename?: 'Mutation', requestMediaUpload: { __typename?: 'PresignedPostCredentials', xAmzAlgorithm: string, xAmzCredential: string, xAmzDate: string, xAmzSignature: string, key: string, bucket: string, datalayer: string, policy: string, store: string } };

export type AppsQueryVariables = Exact<{
  filters?: InputMaybe<AppFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type AppsQuery = { __typename?: 'Query', apps: Array<{ __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null }> };

export type AppQueryVariables = Exact<{
  identifier?: InputMaybe<Scalars['AppIdentifier']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  clientId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type AppQuery = { __typename?: 'Query', app: { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, releases: Array<{ __typename?: 'Release', id: string, version: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null } }> } };

export type DetailAppQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailAppQuery = { __typename?: 'Query', app: { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, releases: Array<{ __typename?: 'Release', id: string, version: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null } }> } };

export type MyBrandQueryVariables = Exact<{ [key: string]: never; }>;


export type MyBrandQuery = { __typename?: 'Query', mycontext: { __typename?: 'Context', organization: { __typename?: 'Organization', id: string, brandHue?: number | null, brandChroma?: number | null } }, me: { __typename?: 'User', id: string, memberships: Array<{ __typename?: 'Membership', id: string, brandHue?: number | null, brandChroma?: number | null, organization: { __typename?: 'Organization', id: string } }> } };

export type ClientsQueryVariables = Exact<{
  filters?: InputMaybe<ClientFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ClientsQuery = { __typename?: 'Query', clients: Array<{ __typename?: 'Client', id: string, name: string, kind: ClientKind, user?: { __typename?: 'User', id: string, username: string } | null, release?: { __typename?: 'Release', version: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null } } | null }> };

export type DetailClientQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailClientQuery = { __typename?: 'Query', client: { __typename?: 'Client', id: string, name: string, kind: ClientKind, clientId: string, user?: { __typename?: 'User', id: string, username: string } | null, release?: { __typename?: 'Release', id: string, version: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null } } | null, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, mappings: Array<{ __typename?: 'ServiceInstanceMapping', id: string, key: string, optional: boolean, instance: { __typename?: 'ServiceInstance', id: string }, client: { __typename?: 'Client', id: string, name: string, kind: ClientKind, user?: { __typename?: 'User', id: string, username: string } | null, release?: { __typename?: 'Release', version: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null } } | null } }> } };

export type MyManagedClientsQueryVariables = Exact<{
  kind: ClientKind;
}>;


export type MyManagedClientsQuery = { __typename?: 'Query', myManagedClients: Array<{ __typename?: 'Client', id: string, name: string, kind: ClientKind, user?: { __typename?: 'User', id: string, username: string } | null, release?: { __typename?: 'Release', version: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null } } | null }> };

export type ClientQueryVariables = Exact<{
  clientId: Scalars['ID']['input'];
}>;


export type ClientQuery = { __typename?: 'Query', client: { __typename?: 'Client', id: string, name: string, kind: ClientKind, clientId: string, user?: { __typename?: 'User', id: string, username: string } | null, release?: { __typename?: 'Release', id: string, version: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null } } | null, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, mappings: Array<{ __typename?: 'ServiceInstanceMapping', id: string, key: string, optional: boolean, instance: { __typename?: 'ServiceInstance', id: string }, client: { __typename?: 'Client', id: string, name: string, kind: ClientKind, user?: { __typename?: 'User', id: string, username: string } | null, release?: { __typename?: 'Release', version: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null } } | null } }> } };

export type MyContextQueryVariables = Exact<{ [key: string]: never; }>;


export type MyContextQuery = { __typename?: 'Query', mycontext: { __typename?: 'Context', roles: Array<string>, scope: Array<string>, organization: { __typename?: 'Organization', id: string, name: string, slug: string }, user: { __typename?: 'User', id: string, username: string } } };

export type MyHubQueryVariables = Exact<{ [key: string]: never; }>;


export type MyHubQuery = { __typename?: 'Query', mycontext: { __typename?: 'Context', hub?: { __typename?: 'Hub', id: string } | null } };

export type GroupOptionsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type GroupOptionsQuery = { __typename?: 'Query', options: Array<{ __typename?: 'Group', value: string, label: string }> };

export type DetailGroupQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailGroupQuery = { __typename?: 'Query', group: { __typename?: 'Group', id: string, name: string, users: Array<{ __typename?: 'User', username: string, firstName?: string | null, lastName?: string | null, email?: string | null, avatar?: string | null, id: string }>, profile?: { __typename?: 'GroupProfile', id: string, name?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } | null } };

export type GroupsQueryVariables = Exact<{
  filters?: InputMaybe<GroupFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type GroupsQuery = { __typename?: 'Query', groups: Array<{ __typename?: 'Group', id: string, name: string, profile?: { __typename?: 'GroupProfile', id: string, bio?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } | null }> };

export type LayersQueryVariables = Exact<{
  filters?: InputMaybe<LayerFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type LayersQuery = { __typename?: 'Query', layers: Array<{ __typename?: 'Layer', id: string, name: string, description?: string | null, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null }> };

export type DetailLayerQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailLayerQuery = { __typename?: 'Query', layer: { __typename?: 'Layer', id: string, name: string, description?: string | null, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null } };

export type StandingMandatesQueryVariables = Exact<{ [key: string]: never; }>;


export type StandingMandatesQuery = { __typename?: 'Query', mandates: Array<{ __typename?: 'Mandate', id: string, agentIdentifier?: string | null, claimant: MandateClaimant, allowMesh: boolean, subject: { __typename?: 'MandatePin', identifier?: string | null, version?: string | null }, parent?: { __typename?: 'Mandate', id: string } | null }> };

export type MyActiveMessagesQueryVariables = Exact<{ [key: string]: never; }>;


export type MyActiveMessagesQuery = { __typename?: 'Query', myActiveMessages: Array<{ __typename?: 'SystemMessage', id: string, title?: string | null, message?: string | null, action: string }> };

export type MyOrganizationQueryVariables = Exact<{ [key: string]: never; }>;


export type MyOrganizationQuery = { __typename?: 'Query', mycontext: { __typename?: 'Context', organization: { __typename?: 'Organization', id: string, slug: string, profile: { __typename?: 'OrganizationProfile', id: string, name?: string | null } } } };

export type ReleasesQueryVariables = Exact<{ [key: string]: never; }>;


export type ReleasesQuery = { __typename?: 'Query', releases: Array<{ __typename?: 'Release', id: string, version: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null } }> };

export type ReleaseQueryVariables = Exact<{
  identifier?: InputMaybe<Scalars['AppIdentifier']['input']>;
  version?: InputMaybe<Scalars['Version']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  clientId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type ReleaseQuery = { __typename?: 'Query', release: { __typename?: 'Release', id: string, version: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null }, clients: Array<{ __typename?: 'Client', id: string, name: string, kind: ClientKind, user?: { __typename?: 'User', id: string, username: string } | null, release?: { __typename?: 'Release', version: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null } } | null }> } };

export type DetailReleaseQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailReleaseQuery = { __typename?: 'Query', release: { __typename?: 'Release', id: string, version: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null }, clients: Array<{ __typename?: 'Client', id: string, name: string, kind: ClientKind, user?: { __typename?: 'User', id: string, username: string } | null, release?: { __typename?: 'Release', version: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null } } | null }> } };

export type ScopesQueryVariables = Exact<{ [key: string]: never; }>;


export type ScopesQuery = { __typename?: 'Query', scopes: Array<{ __typename?: 'Scope', description: string, value: string, label: string }> };

export type ScopesOptionsQueryVariables = Exact<{ [key: string]: never; }>;


export type ScopesOptionsQuery = { __typename?: 'Query', options: Array<{ __typename?: 'Scope', value: string, label: string }> };

export type GlobalSearchQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  noUsers: Scalars['Boolean']['input'];
  noGroups: Scalars['Boolean']['input'];
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type GlobalSearchQuery = { __typename?: 'Query', users?: Array<{ __typename?: 'User', username: string, firstName?: string | null, lastName?: string | null, email?: string | null, avatar?: string | null, id: string }>, groups?: Array<{ __typename?: 'Group', id: string, name: string, profile?: { __typename?: 'GroupProfile', id: string, bio?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } | null }> };

export type ListServiceInstancesQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<ServiceInstanceFilter>;
}>;


export type ListServiceInstancesQuery = { __typename?: 'Query', serviceInstances: Array<{ __typename?: 'ServiceInstance', id: string }> };

export type GetServiceInstanceQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetServiceInstanceQuery = { __typename?: 'Query', serviceInstance: { __typename?: 'ServiceInstance', id: string, release: { __typename?: 'ServiceRelease', id: string, version: string, service: { __typename?: 'Service', identifier: any, id: string, name: string } }, allowedUsers: Array<{ __typename?: 'User', username: string, firstName?: string | null, lastName?: string | null, email?: string | null, avatar?: string | null, id: string }>, deniedUsers: Array<{ __typename?: 'User', username: string, firstName?: string | null, lastName?: string | null, email?: string | null, avatar?: string | null, id: string }>, allowedGroups: Array<{ __typename?: 'Group', id: string, name: string, profile?: { __typename?: 'GroupProfile', id: string, bio?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } | null }>, deniedGroups: Array<{ __typename?: 'Group', id: string, name: string, profile?: { __typename?: 'GroupProfile', id: string, bio?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } | null }>, mappings: Array<{ __typename?: 'ServiceInstanceMapping', id: string, key: string, optional: boolean, instance: { __typename?: 'ServiceInstance', id: string }, client: { __typename?: 'Client', id: string, name: string, kind: ClientKind, user?: { __typename?: 'User', id: string, username: string } | null, release?: { __typename?: 'Release', version: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null, app: { __typename?: 'App', id: string, identifier: any, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null } } | null } }>, aliases: Array<{ __typename?: 'InstanceAlias', host?: string | null, port?: number | null, ssl: boolean, challenge: string, kind: string }>, logo?: { __typename?: 'MediaStore', presignedUrl: string } | null } };

export type ListServiceReleaseQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<ServiceReleaseFilter>;
}>;


export type ListServiceReleaseQuery = { __typename?: 'Query', serviceReleases: Array<{ __typename?: 'ServiceRelease', id: string, version: string, service: { __typename?: 'Service', identifier: any, id: string, name: string } }> };

export type GetServiceReleaseQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetServiceReleaseQuery = { __typename?: 'Query', serviceRelease: { __typename?: 'ServiceRelease', id: string, version: string, service: { __typename?: 'Service', identifier: any }, instances: Array<{ __typename?: 'ServiceInstance', id: string }> } };

export type ListServicesQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<ServiceFilter>;
}>;


export type ListServicesQuery = { __typename?: 'Query', services: Array<{ __typename?: 'Service', identifier: any, id: string, name: string }> };

export type GetServiceQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetServiceQuery = { __typename?: 'Query', service: { __typename?: 'Service', identifier: any, id: string, name: string, releases: Array<{ __typename?: 'ServiceRelease', id: string, version: string, service: { __typename?: 'Service', identifier: any, id: string, name: string } }> } };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me: { __typename?: 'User', id: string, username: string, email?: string | null, firstName?: string | null, lastName?: string | null, avatar?: string | null, groups: Array<{ __typename?: 'Group', id: string, name: string }>, profile: { __typename?: 'Profile', id: string, name?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } } };

export type UserQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type UserQuery = { __typename?: 'Query', user: { __typename?: 'User', id: string, username: string, email?: string | null, firstName?: string | null, lastName?: string | null, avatar?: string | null, groups: Array<{ __typename?: 'Group', id: string, name: string }>, profile: { __typename?: 'Profile', id: string, name?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } } };

export type DetailUserQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailUserQuery = { __typename?: 'Query', user: { __typename?: 'User', id: string, username: string, email?: string | null, firstName?: string | null, lastName?: string | null, avatar?: string | null, groups: Array<{ __typename?: 'Group', id: string, name: string }>, profile: { __typename?: 'Profile', id: string, name?: string | null, avatar?: { __typename?: 'MediaStore', presignedUrl: string } | null } } };

export type UsersQueryVariables = Exact<{
  filters?: InputMaybe<UserFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type UsersQuery = { __typename?: 'Query', users: Array<{ __typename?: 'User', username: string, firstName?: string | null, lastName?: string | null, email?: string | null, avatar?: string | null, id: string }> };

export type UserOptionsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type UserOptionsQuery = { __typename?: 'Query', options: Array<{ __typename?: 'User', value: string, label: string }> };

export type ProfileQueryVariables = Exact<{ [key: string]: never; }>;


export type ProfileQuery = { __typename?: 'Query', me: { __typename?: 'User', id: string, username: string, email?: string | null, firstName?: string | null, lastName?: string | null, avatar?: string | null } };

export const InstanceAliasFragmentDoc = gql`
    fragment InstanceAlias on InstanceAlias {
  host
  port
  ssl
  challenge
  kind
}
    `;
export const ListAppFragmentDoc = gql`
    fragment ListApp on App {
  id
  identifier
  logo {
    presignedUrl
  }
}
    `;
export const ListReleaseFragmentDoc = gql`
    fragment ListRelease on Release {
  id
  version
  logo {
    presignedUrl
  }
  app {
    ...ListApp
  }
}
    ${ListAppFragmentDoc}`;
export const DetailAppFragmentDoc = gql`
    fragment DetailApp on App {
  id
  identifier
  logo {
    presignedUrl
  }
  releases {
    ...ListRelease
  }
}
    ${ListReleaseFragmentDoc}`;
export const ListServiceInstanceFragmentDoc = gql`
    fragment ListServiceInstance on ServiceInstance {
  id
}
    `;
export const ListClientFragmentDoc = gql`
    fragment ListClient on Client {
  id
  user {
    id
    username
  }
  name
  kind
  release {
    version
    logo {
      presignedUrl
    }
    app {
      id
      identifier
      logo {
        presignedUrl
      }
    }
  }
}
    `;
export const ListServiceInstanceMappingFragmentDoc = gql`
    fragment ListServiceInstanceMapping on ServiceInstanceMapping {
  id
  key
  instance {
    ...ListServiceInstance
  }
  client {
    ...ListClient
  }
  optional
}
    ${ListServiceInstanceFragmentDoc}
${ListClientFragmentDoc}`;
export const DetailClientFragmentDoc = gql`
    fragment DetailClient on Client {
  id
  name
  user {
    id
    username
  }
  kind
  release {
    ...ListRelease
  }
  logo {
    presignedUrl
  }
  clientId
  mappings {
    ...ListServiceInstanceMapping
  }
}
    ${ListReleaseFragmentDoc}
${ListServiceInstanceMappingFragmentDoc}`;
export const ContextFragmentDoc = gql`
    fragment Context on Context {
  organization {
    id
    name
    slug
  }
  user {
    id
    username
  }
  roles
  scope
}
    `;
export const PresignedPostCredentialsFragmentDoc = gql`
    fragment PresignedPostCredentials on PresignedPostCredentials {
  xAmzAlgorithm
  xAmzCredential
  xAmzDate
  xAmzSignature
  key
  bucket
  datalayer
  policy
  store
}
    `;
export const ListUserFragmentDoc = gql`
    fragment ListUser on User {
  username
  firstName
  lastName
  email
  avatar
  id
}
    `;
export const GroupProfileFragmentDoc = gql`
    fragment GroupProfile on GroupProfile {
  id
  name
  avatar {
    presignedUrl
  }
}
    `;
export const DetailGroupFragmentDoc = gql`
    fragment DetailGroup on Group {
  id
  name
  users {
    ...ListUser
  }
  profile {
    ...GroupProfile
  }
}
    ${ListUserFragmentDoc}
${GroupProfileFragmentDoc}`;
export const LayerFragmentDoc = gql`
    fragment Layer on Layer {
  id
  name
  description
  logo {
    presignedUrl
  }
}
    `;
export const ListLayerFragmentDoc = gql`
    fragment ListLayer on Layer {
  id
  name
  description
  logo {
    presignedUrl
  }
}
    `;
export const ProvisioningMandateFragmentDoc = gql`
    fragment ProvisioningMandate on Mandate {
  id
  agentIdentifier
  claimant
  allowMesh
  subject {
    identifier
    version
  }
  parent {
    id
  }
}
    `;
export const BrandMembershipFragmentDoc = gql`
    fragment BrandMembership on Membership {
  id
  brandHue
  brandChroma
  organization {
    id
  }
}
    `;
export const BrandOrganizationFragmentDoc = gql`
    fragment BrandOrganization on Organization {
  id
  brandHue
  brandChroma
}
    `;
export const DetailReleaseFragmentDoc = gql`
    fragment DetailRelease on Release {
  id
  version
  logo {
    presignedUrl
  }
  app {
    ...ListApp
  }
  clients {
    ...ListClient
  }
}
    ${ListAppFragmentDoc}
${ListClientFragmentDoc}`;
export const ListServiceFragmentDoc = gql`
    fragment ListService on Service {
  identifier
  id
  name
}
    `;
export const ListServiceReleaseFragmentDoc = gql`
    fragment ListServiceRelease on ServiceRelease {
  service {
    identifier
    id
    name
  }
  id
  version
}
    `;
export const ServiceFragmentDoc = gql`
    fragment Service on Service {
  identifier
  id
  name
  releases {
    ...ListServiceRelease
  }
}
    ${ListServiceReleaseFragmentDoc}`;
export const ListGroupFragmentDoc = gql`
    fragment ListGroup on Group {
  id
  name
  profile {
    id
    bio
    avatar {
      presignedUrl
    }
  }
}
    `;
export const ListInstanceAliasFragmentDoc = gql`
    fragment ListInstanceAlias on InstanceAlias {
  host
  port
  ssl
  challenge
  kind
}
    `;
export const ServiceInstanceFragmentDoc = gql`
    fragment ServiceInstance on ServiceInstance {
  release {
    id
    version
    service {
      identifier
      id
      name
    }
  }
  id
  allowedUsers {
    ...ListUser
  }
  deniedUsers {
    ...ListUser
  }
  allowedGroups {
    ...ListGroup
  }
  deniedGroups {
    ...ListGroup
  }
  mappings {
    ...ListServiceInstanceMapping
  }
  aliases {
    ...ListInstanceAlias
  }
  logo {
    presignedUrl
  }
}
    ${ListUserFragmentDoc}
${ListGroupFragmentDoc}
${ListServiceInstanceMappingFragmentDoc}
${ListInstanceAliasFragmentDoc}`;
export const ServiceReleaseFragmentDoc = gql`
    fragment ServiceRelease on ServiceRelease {
  service {
    identifier
  }
  id
  version
  instances {
    ...ListServiceInstance
  }
}
    ${ListServiceInstanceFragmentDoc}`;
export const ProfileFragmentDoc = gql`
    fragment Profile on Profile {
  id
  name
  avatar {
    presignedUrl
  }
}
    `;
export const DetailUserFragmentDoc = gql`
    fragment DetailUser on User {
  id
  username
  email
  firstName
  lastName
  avatar
  groups {
    id
    name
  }
  profile {
    ...Profile
  }
}
    ${ProfileFragmentDoc}`;
export const MeUserFragmentDoc = gql`
    fragment MeUser on User {
  id
  username
  email
  firstName
  lastName
  avatar
}
    `;
export const RegisterComChannelDocument = gql`
    mutation RegisterComChannel($input: RegisterComChannelInput!) {
  registerComChannel(input: $input) {
    id
    user {
      id
    }
  }
}
    `;
export type RegisterComChannelMutationFn = Apollo.MutationFunction<RegisterComChannelMutation, RegisterComChannelMutationVariables>;

/**
 * __useRegisterComChannelMutation__
 *
 * To run a mutation, you first call `useRegisterComChannelMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRegisterComChannelMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [registerComChannelMutation, { data, loading, error }] = useRegisterComChannelMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRegisterComChannelMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RegisterComChannelMutation, RegisterComChannelMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RegisterComChannelMutation, RegisterComChannelMutationVariables>(RegisterComChannelDocument, options);
      }
export type RegisterComChannelMutationHookResult = ReturnType<typeof useRegisterComChannelMutation>;
export type RegisterComChannelMutationResult = Apollo.MutationResult<RegisterComChannelMutation>;
export type RegisterComChannelMutationOptions = Apollo.BaseMutationOptions<RegisterComChannelMutation, RegisterComChannelMutationVariables>;
export const CreateGroupProfileDocument = gql`
    mutation CreateGroupProfile($input: CreateGroupProfileInput!) {
  createGroupProfile(input: $input) {
    ...GroupProfile
  }
}
    ${GroupProfileFragmentDoc}`;
export type CreateGroupProfileMutationFn = Apollo.MutationFunction<CreateGroupProfileMutation, CreateGroupProfileMutationVariables>;

/**
 * __useCreateGroupProfileMutation__
 *
 * To run a mutation, you first call `useCreateGroupProfileMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateGroupProfileMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createGroupProfileMutation, { data, loading, error }] = useCreateGroupProfileMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateGroupProfileMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateGroupProfileMutation, CreateGroupProfileMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateGroupProfileMutation, CreateGroupProfileMutationVariables>(CreateGroupProfileDocument, options);
      }
export type CreateGroupProfileMutationHookResult = ReturnType<typeof useCreateGroupProfileMutation>;
export type CreateGroupProfileMutationResult = Apollo.MutationResult<CreateGroupProfileMutation>;
export type CreateGroupProfileMutationOptions = Apollo.BaseMutationOptions<CreateGroupProfileMutation, CreateGroupProfileMutationVariables>;
export const UpdateGroupProfileDocument = gql`
    mutation UpdateGroupProfile($input: UpdateGroupProfileInput!) {
  updateGroupProfile(input: $input) {
    ...GroupProfile
  }
}
    ${GroupProfileFragmentDoc}`;
export type UpdateGroupProfileMutationFn = Apollo.MutationFunction<UpdateGroupProfileMutation, UpdateGroupProfileMutationVariables>;

/**
 * __useUpdateGroupProfileMutation__
 *
 * To run a mutation, you first call `useUpdateGroupProfileMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateGroupProfileMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateGroupProfileMutation, { data, loading, error }] = useUpdateGroupProfileMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateGroupProfileMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateGroupProfileMutation, UpdateGroupProfileMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateGroupProfileMutation, UpdateGroupProfileMutationVariables>(UpdateGroupProfileDocument, options);
      }
export type UpdateGroupProfileMutationHookResult = ReturnType<typeof useUpdateGroupProfileMutation>;
export type UpdateGroupProfileMutationResult = Apollo.MutationResult<UpdateGroupProfileMutation>;
export type UpdateGroupProfileMutationOptions = Apollo.BaseMutationOptions<UpdateGroupProfileMutation, UpdateGroupProfileMutationVariables>;
export const UpdateServiceInstanceDocument = gql`
    mutation UpdateServiceInstance($input: UpdateServiceInstanceInput!) {
  updateServiceInstance(input: $input) {
    ...ServiceInstance
  }
}
    ${ServiceInstanceFragmentDoc}`;
export type UpdateServiceInstanceMutationFn = Apollo.MutationFunction<UpdateServiceInstanceMutation, UpdateServiceInstanceMutationVariables>;

/**
 * __useUpdateServiceInstanceMutation__
 *
 * To run a mutation, you first call `useUpdateServiceInstanceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateServiceInstanceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateServiceInstanceMutation, { data, loading, error }] = useUpdateServiceInstanceMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateServiceInstanceMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateServiceInstanceMutation, UpdateServiceInstanceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateServiceInstanceMutation, UpdateServiceInstanceMutationVariables>(UpdateServiceInstanceDocument, options);
      }
export type UpdateServiceInstanceMutationHookResult = ReturnType<typeof useUpdateServiceInstanceMutation>;
export type UpdateServiceInstanceMutationResult = Apollo.MutationResult<UpdateServiceInstanceMutation>;
export type UpdateServiceInstanceMutationOptions = Apollo.BaseMutationOptions<UpdateServiceInstanceMutation, UpdateServiceInstanceMutationVariables>;
export const CreateServiceInstanceDocument = gql`
    mutation CreateServiceInstance($input: CreateServiceInstanceInput!) {
  createServiceInstance(input: $input) {
    ...ServiceInstance
  }
}
    ${ServiceInstanceFragmentDoc}`;
export type CreateServiceInstanceMutationFn = Apollo.MutationFunction<CreateServiceInstanceMutation, CreateServiceInstanceMutationVariables>;

/**
 * __useCreateServiceInstanceMutation__
 *
 * To run a mutation, you first call `useCreateServiceInstanceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateServiceInstanceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createServiceInstanceMutation, { data, loading, error }] = useCreateServiceInstanceMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateServiceInstanceMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateServiceInstanceMutation, CreateServiceInstanceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateServiceInstanceMutation, CreateServiceInstanceMutationVariables>(CreateServiceInstanceDocument, options);
      }
export type CreateServiceInstanceMutationHookResult = ReturnType<typeof useCreateServiceInstanceMutation>;
export type CreateServiceInstanceMutationResult = Apollo.MutationResult<CreateServiceInstanceMutation>;
export type CreateServiceInstanceMutationOptions = Apollo.BaseMutationOptions<CreateServiceInstanceMutation, CreateServiceInstanceMutationVariables>;
export const CreateMandateDocument = gql`
    mutation CreateMandate($input: CreateMandateInput!) {
  createMandate(input: $input) {
    ...ProvisioningMandate
  }
}
    ${ProvisioningMandateFragmentDoc}`;
export type CreateMandateMutationFn = Apollo.MutationFunction<CreateMandateMutation, CreateMandateMutationVariables>;

/**
 * __useCreateMandateMutation__
 *
 * To run a mutation, you first call `useCreateMandateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateMandateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createMandateMutation, { data, loading, error }] = useCreateMandateMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateMandateMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateMandateMutation, CreateMandateMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateMandateMutation, CreateMandateMutationVariables>(CreateMandateDocument, options);
      }
export type CreateMandateMutationHookResult = ReturnType<typeof useCreateMandateMutation>;
export type CreateMandateMutationResult = Apollo.MutationResult<CreateMandateMutation>;
export type CreateMandateMutationOptions = Apollo.BaseMutationOptions<CreateMandateMutation, CreateMandateMutationVariables>;
export const RevokeMandateDocument = gql`
    mutation RevokeMandate($id: ID!) {
  revokeMandate(input: {id: $id}) {
    id
  }
}
    `;
export type RevokeMandateMutationFn = Apollo.MutationFunction<RevokeMandateMutation, RevokeMandateMutationVariables>;

/**
 * __useRevokeMandateMutation__
 *
 * To run a mutation, you first call `useRevokeMandateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRevokeMandateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [revokeMandateMutation, { data, loading, error }] = useRevokeMandateMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRevokeMandateMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RevokeMandateMutation, RevokeMandateMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RevokeMandateMutation, RevokeMandateMutationVariables>(RevokeMandateDocument, options);
      }
export type RevokeMandateMutationHookResult = ReturnType<typeof useRevokeMandateMutation>;
export type RevokeMandateMutationResult = Apollo.MutationResult<RevokeMandateMutation>;
export type RevokeMandateMutationOptions = Apollo.BaseMutationOptions<RevokeMandateMutation, RevokeMandateMutationVariables>;
export const IssueChildMandateKeyDocument = gql`
    mutation IssueChildMandateKey($input: IssueChildMandateKeyInput!) {
  issueChildMandateKey(input: $input) {
    key
    mandate {
      id
    }
  }
}
    `;
export type IssueChildMandateKeyMutationFn = Apollo.MutationFunction<IssueChildMandateKeyMutation, IssueChildMandateKeyMutationVariables>;

/**
 * __useIssueChildMandateKeyMutation__
 *
 * To run a mutation, you first call `useIssueChildMandateKeyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useIssueChildMandateKeyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [issueChildMandateKeyMutation, { data, loading, error }] = useIssueChildMandateKeyMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useIssueChildMandateKeyMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<IssueChildMandateKeyMutation, IssueChildMandateKeyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<IssueChildMandateKeyMutation, IssueChildMandateKeyMutationVariables>(IssueChildMandateKeyDocument, options);
      }
export type IssueChildMandateKeyMutationHookResult = ReturnType<typeof useIssueChildMandateKeyMutation>;
export type IssueChildMandateKeyMutationResult = Apollo.MutationResult<IssueChildMandateKeyMutation>;
export type IssueChildMandateKeyMutationOptions = Apollo.BaseMutationOptions<IssueChildMandateKeyMutation, IssueChildMandateKeyMutationVariables>;
export const CreateUserProfileDocument = gql`
    mutation CreateUserProfile($input: CreateProfileInput!) {
  createProfile(input: $input) {
    ...Profile
  }
}
    ${ProfileFragmentDoc}`;
export type CreateUserProfileMutationFn = Apollo.MutationFunction<CreateUserProfileMutation, CreateUserProfileMutationVariables>;

/**
 * __useCreateUserProfileMutation__
 *
 * To run a mutation, you first call `useCreateUserProfileMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateUserProfileMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createUserProfileMutation, { data, loading, error }] = useCreateUserProfileMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateUserProfileMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateUserProfileMutation, CreateUserProfileMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateUserProfileMutation, CreateUserProfileMutationVariables>(CreateUserProfileDocument, options);
      }
export type CreateUserProfileMutationHookResult = ReturnType<typeof useCreateUserProfileMutation>;
export type CreateUserProfileMutationResult = Apollo.MutationResult<CreateUserProfileMutation>;
export type CreateUserProfileMutationOptions = Apollo.BaseMutationOptions<CreateUserProfileMutation, CreateUserProfileMutationVariables>;
export const UpdateUserProfileDocument = gql`
    mutation UpdateUserProfile($input: UpdateProfileInput!) {
  updateProfile(input: $input) {
    ...Profile
  }
}
    ${ProfileFragmentDoc}`;
export type UpdateUserProfileMutationFn = Apollo.MutationFunction<UpdateUserProfileMutation, UpdateUserProfileMutationVariables>;

/**
 * __useUpdateUserProfileMutation__
 *
 * To run a mutation, you first call `useUpdateUserProfileMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateUserProfileMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateUserProfileMutation, { data, loading, error }] = useUpdateUserProfileMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateUserProfileMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateUserProfileMutation, UpdateUserProfileMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateUserProfileMutation, UpdateUserProfileMutationVariables>(UpdateUserProfileDocument, options);
      }
export type UpdateUserProfileMutationHookResult = ReturnType<typeof useUpdateUserProfileMutation>;
export type UpdateUserProfileMutationResult = Apollo.MutationResult<UpdateUserProfileMutation>;
export type UpdateUserProfileMutationOptions = Apollo.BaseMutationOptions<UpdateUserProfileMutation, UpdateUserProfileMutationVariables>;
export const RequestMediaUploadDocument = gql`
    mutation RequestMediaUpload($key: String!, $datalayer: String!) {
  requestMediaUpload(input: {key: $key, datalayer: $datalayer}) {
    ...PresignedPostCredentials
  }
}
    ${PresignedPostCredentialsFragmentDoc}`;
export type RequestMediaUploadMutationFn = Apollo.MutationFunction<RequestMediaUploadMutation, RequestMediaUploadMutationVariables>;

/**
 * __useRequestMediaUploadMutation__
 *
 * To run a mutation, you first call `useRequestMediaUploadMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRequestMediaUploadMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [requestMediaUploadMutation, { data, loading, error }] = useRequestMediaUploadMutation({
 *   variables: {
 *      key: // value for 'key'
 *      datalayer: // value for 'datalayer'
 *   },
 * });
 */
export function useRequestMediaUploadMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RequestMediaUploadMutation, RequestMediaUploadMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RequestMediaUploadMutation, RequestMediaUploadMutationVariables>(RequestMediaUploadDocument, options);
      }
export type RequestMediaUploadMutationHookResult = ReturnType<typeof useRequestMediaUploadMutation>;
export type RequestMediaUploadMutationResult = Apollo.MutationResult<RequestMediaUploadMutation>;
export type RequestMediaUploadMutationOptions = Apollo.BaseMutationOptions<RequestMediaUploadMutation, RequestMediaUploadMutationVariables>;
export const AppsDocument = gql`
    query Apps($filters: AppFilter, $pagination: OffsetPaginationInput) {
  apps(filters: $filters, pagination: $pagination) {
    ...ListApp
  }
}
    ${ListAppFragmentDoc}`;

/**
 * __useAppsQuery__
 *
 * To run a query within a React component, call `useAppsQuery` and pass it any options that fit your needs.
 * When your component renders, `useAppsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAppsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useAppsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<AppsQuery, AppsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<AppsQuery, AppsQueryVariables>(AppsDocument, options);
      }
export function useAppsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<AppsQuery, AppsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<AppsQuery, AppsQueryVariables>(AppsDocument, options);
        }
export type AppsQueryHookResult = ReturnType<typeof useAppsQuery>;
export type AppsLazyQueryHookResult = ReturnType<typeof useAppsLazyQuery>;
export type AppsQueryResult = Apollo.QueryResult<AppsQuery, AppsQueryVariables>;
export const AppDocument = gql`
    query App($identifier: AppIdentifier, $id: ID, $clientId: ID) {
  app(identifier: $identifier, id: $id, clientId: $clientId) {
    ...DetailApp
  }
}
    ${DetailAppFragmentDoc}`;

/**
 * __useAppQuery__
 *
 * To run a query within a React component, call `useAppQuery` and pass it any options that fit your needs.
 * When your component renders, `useAppQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAppQuery({
 *   variables: {
 *      identifier: // value for 'identifier'
 *      id: // value for 'id'
 *      clientId: // value for 'clientId'
 *   },
 * });
 */
export function useAppQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<AppQuery, AppQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<AppQuery, AppQueryVariables>(AppDocument, options);
      }
export function useAppLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<AppQuery, AppQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<AppQuery, AppQueryVariables>(AppDocument, options);
        }
export type AppQueryHookResult = ReturnType<typeof useAppQuery>;
export type AppLazyQueryHookResult = ReturnType<typeof useAppLazyQuery>;
export type AppQueryResult = Apollo.QueryResult<AppQuery, AppQueryVariables>;
export const DetailAppDocument = gql`
    query DetailApp($id: ID!) {
  app(id: $id) {
    ...DetailApp
  }
}
    ${DetailAppFragmentDoc}`;

/**
 * __useDetailAppQuery__
 *
 * To run a query within a React component, call `useDetailAppQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailAppQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailAppQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailAppQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DetailAppQuery, DetailAppQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DetailAppQuery, DetailAppQueryVariables>(DetailAppDocument, options);
      }
export function useDetailAppLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DetailAppQuery, DetailAppQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DetailAppQuery, DetailAppQueryVariables>(DetailAppDocument, options);
        }
export type DetailAppQueryHookResult = ReturnType<typeof useDetailAppQuery>;
export type DetailAppLazyQueryHookResult = ReturnType<typeof useDetailAppLazyQuery>;
export type DetailAppQueryResult = Apollo.QueryResult<DetailAppQuery, DetailAppQueryVariables>;
export const MyBrandDocument = gql`
    query MyBrand {
  mycontext {
    organization {
      ...BrandOrganization
    }
  }
  me {
    id
    memberships {
      ...BrandMembership
    }
  }
}
    ${BrandOrganizationFragmentDoc}
${BrandMembershipFragmentDoc}`;

/**
 * __useMyBrandQuery__
 *
 * To run a query within a React component, call `useMyBrandQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyBrandQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyBrandQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyBrandQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<MyBrandQuery, MyBrandQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MyBrandQuery, MyBrandQueryVariables>(MyBrandDocument, options);
      }
export function useMyBrandLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MyBrandQuery, MyBrandQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MyBrandQuery, MyBrandQueryVariables>(MyBrandDocument, options);
        }
export type MyBrandQueryHookResult = ReturnType<typeof useMyBrandQuery>;
export type MyBrandLazyQueryHookResult = ReturnType<typeof useMyBrandLazyQuery>;
export type MyBrandQueryResult = Apollo.QueryResult<MyBrandQuery, MyBrandQueryVariables>;
export const ClientsDocument = gql`
    query Clients($filters: ClientFilter, $pagination: OffsetPaginationInput) {
  clients(filters: $filters, pagination: $pagination) {
    ...ListClient
  }
}
    ${ListClientFragmentDoc}`;

/**
 * __useClientsQuery__
 *
 * To run a query within a React component, call `useClientsQuery` and pass it any options that fit your needs.
 * When your component renders, `useClientsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useClientsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useClientsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ClientsQuery, ClientsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ClientsQuery, ClientsQueryVariables>(ClientsDocument, options);
      }
export function useClientsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ClientsQuery, ClientsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ClientsQuery, ClientsQueryVariables>(ClientsDocument, options);
        }
export type ClientsQueryHookResult = ReturnType<typeof useClientsQuery>;
export type ClientsLazyQueryHookResult = ReturnType<typeof useClientsLazyQuery>;
export type ClientsQueryResult = Apollo.QueryResult<ClientsQuery, ClientsQueryVariables>;
export const DetailClientDocument = gql`
    query DetailClient($id: ID!) {
  client(id: $id) {
    ...DetailClient
  }
}
    ${DetailClientFragmentDoc}`;

/**
 * __useDetailClientQuery__
 *
 * To run a query within a React component, call `useDetailClientQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailClientQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailClientQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailClientQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DetailClientQuery, DetailClientQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DetailClientQuery, DetailClientQueryVariables>(DetailClientDocument, options);
      }
export function useDetailClientLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DetailClientQuery, DetailClientQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DetailClientQuery, DetailClientQueryVariables>(DetailClientDocument, options);
        }
export type DetailClientQueryHookResult = ReturnType<typeof useDetailClientQuery>;
export type DetailClientLazyQueryHookResult = ReturnType<typeof useDetailClientLazyQuery>;
export type DetailClientQueryResult = Apollo.QueryResult<DetailClientQuery, DetailClientQueryVariables>;
export const MyManagedClientsDocument = gql`
    query MyManagedClients($kind: ClientKind!) {
  myManagedClients(kind: $kind) {
    ...ListClient
  }
}
    ${ListClientFragmentDoc}`;

/**
 * __useMyManagedClientsQuery__
 *
 * To run a query within a React component, call `useMyManagedClientsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyManagedClientsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyManagedClientsQuery({
 *   variables: {
 *      kind: // value for 'kind'
 *   },
 * });
 */
export function useMyManagedClientsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<MyManagedClientsQuery, MyManagedClientsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MyManagedClientsQuery, MyManagedClientsQueryVariables>(MyManagedClientsDocument, options);
      }
export function useMyManagedClientsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MyManagedClientsQuery, MyManagedClientsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MyManagedClientsQuery, MyManagedClientsQueryVariables>(MyManagedClientsDocument, options);
        }
export type MyManagedClientsQueryHookResult = ReturnType<typeof useMyManagedClientsQuery>;
export type MyManagedClientsLazyQueryHookResult = ReturnType<typeof useMyManagedClientsLazyQuery>;
export type MyManagedClientsQueryResult = Apollo.QueryResult<MyManagedClientsQuery, MyManagedClientsQueryVariables>;
export const ClientDocument = gql`
    query Client($clientId: ID!) {
  client(clientId: $clientId) {
    ...DetailClient
  }
}
    ${DetailClientFragmentDoc}`;

/**
 * __useClientQuery__
 *
 * To run a query within a React component, call `useClientQuery` and pass it any options that fit your needs.
 * When your component renders, `useClientQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useClientQuery({
 *   variables: {
 *      clientId: // value for 'clientId'
 *   },
 * });
 */
export function useClientQuery(baseOptions: ApolloReactHooks.QueryHookOptions<ClientQuery, ClientQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ClientQuery, ClientQueryVariables>(ClientDocument, options);
      }
export function useClientLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ClientQuery, ClientQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ClientQuery, ClientQueryVariables>(ClientDocument, options);
        }
export type ClientQueryHookResult = ReturnType<typeof useClientQuery>;
export type ClientLazyQueryHookResult = ReturnType<typeof useClientLazyQuery>;
export type ClientQueryResult = Apollo.QueryResult<ClientQuery, ClientQueryVariables>;
export const MyContextDocument = gql`
    query MyContext {
  mycontext {
    ...Context
  }
}
    ${ContextFragmentDoc}`;

/**
 * __useMyContextQuery__
 *
 * To run a query within a React component, call `useMyContextQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyContextQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyContextQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyContextQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<MyContextQuery, MyContextQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MyContextQuery, MyContextQueryVariables>(MyContextDocument, options);
      }
export function useMyContextLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MyContextQuery, MyContextQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MyContextQuery, MyContextQueryVariables>(MyContextDocument, options);
        }
export type MyContextQueryHookResult = ReturnType<typeof useMyContextQuery>;
export type MyContextLazyQueryHookResult = ReturnType<typeof useMyContextLazyQuery>;
export type MyContextQueryResult = Apollo.QueryResult<MyContextQuery, MyContextQueryVariables>;
export const MyHubDocument = gql`
    query MyHub {
  mycontext {
    hub {
      id
    }
  }
}
    `;

/**
 * __useMyHubQuery__
 *
 * To run a query within a React component, call `useMyHubQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyHubQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyHubQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyHubQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<MyHubQuery, MyHubQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MyHubQuery, MyHubQueryVariables>(MyHubDocument, options);
      }
export function useMyHubLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MyHubQuery, MyHubQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MyHubQuery, MyHubQueryVariables>(MyHubDocument, options);
        }
export type MyHubQueryHookResult = ReturnType<typeof useMyHubQuery>;
export type MyHubLazyQueryHookResult = ReturnType<typeof useMyHubLazyQuery>;
export type MyHubQueryResult = Apollo.QueryResult<MyHubQuery, MyHubQueryVariables>;
export const GroupOptionsDocument = gql`
    query GroupOptions($search: String, $values: [ID!]) {
  options: groups(filters: {search: $search, ids: $values}) {
    value: id
    label: name
  }
}
    `;

/**
 * __useGroupOptionsQuery__
 *
 * To run a query within a React component, call `useGroupOptionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGroupOptionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGroupOptionsQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *   },
 * });
 */
export function useGroupOptionsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GroupOptionsQuery, GroupOptionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GroupOptionsQuery, GroupOptionsQueryVariables>(GroupOptionsDocument, options);
      }
export function useGroupOptionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GroupOptionsQuery, GroupOptionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GroupOptionsQuery, GroupOptionsQueryVariables>(GroupOptionsDocument, options);
        }
export type GroupOptionsQueryHookResult = ReturnType<typeof useGroupOptionsQuery>;
export type GroupOptionsLazyQueryHookResult = ReturnType<typeof useGroupOptionsLazyQuery>;
export type GroupOptionsQueryResult = Apollo.QueryResult<GroupOptionsQuery, GroupOptionsQueryVariables>;
export const DetailGroupDocument = gql`
    query DetailGroup($id: ID!) {
  group(id: $id) {
    ...DetailGroup
  }
}
    ${DetailGroupFragmentDoc}`;

/**
 * __useDetailGroupQuery__
 *
 * To run a query within a React component, call `useDetailGroupQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailGroupQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailGroupQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailGroupQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DetailGroupQuery, DetailGroupQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DetailGroupQuery, DetailGroupQueryVariables>(DetailGroupDocument, options);
      }
export function useDetailGroupLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DetailGroupQuery, DetailGroupQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DetailGroupQuery, DetailGroupQueryVariables>(DetailGroupDocument, options);
        }
export type DetailGroupQueryHookResult = ReturnType<typeof useDetailGroupQuery>;
export type DetailGroupLazyQueryHookResult = ReturnType<typeof useDetailGroupLazyQuery>;
export type DetailGroupQueryResult = Apollo.QueryResult<DetailGroupQuery, DetailGroupQueryVariables>;
export const GroupsDocument = gql`
    query Groups($filters: GroupFilter, $pagination: OffsetPaginationInput) {
  groups(filters: $filters, pagination: $pagination) {
    ...ListGroup
  }
}
    ${ListGroupFragmentDoc}`;

/**
 * __useGroupsQuery__
 *
 * To run a query within a React component, call `useGroupsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGroupsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGroupsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useGroupsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GroupsQuery, GroupsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GroupsQuery, GroupsQueryVariables>(GroupsDocument, options);
      }
export function useGroupsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GroupsQuery, GroupsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GroupsQuery, GroupsQueryVariables>(GroupsDocument, options);
        }
export type GroupsQueryHookResult = ReturnType<typeof useGroupsQuery>;
export type GroupsLazyQueryHookResult = ReturnType<typeof useGroupsLazyQuery>;
export type GroupsQueryResult = Apollo.QueryResult<GroupsQuery, GroupsQueryVariables>;
export const LayersDocument = gql`
    query Layers($filters: LayerFilter, $pagination: OffsetPaginationInput) {
  layers(filters: $filters, pagination: $pagination) {
    ...ListLayer
  }
}
    ${ListLayerFragmentDoc}`;

/**
 * __useLayersQuery__
 *
 * To run a query within a React component, call `useLayersQuery` and pass it any options that fit your needs.
 * When your component renders, `useLayersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useLayersQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useLayersQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<LayersQuery, LayersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<LayersQuery, LayersQueryVariables>(LayersDocument, options);
      }
export function useLayersLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<LayersQuery, LayersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<LayersQuery, LayersQueryVariables>(LayersDocument, options);
        }
export type LayersQueryHookResult = ReturnType<typeof useLayersQuery>;
export type LayersLazyQueryHookResult = ReturnType<typeof useLayersLazyQuery>;
export type LayersQueryResult = Apollo.QueryResult<LayersQuery, LayersQueryVariables>;
export const DetailLayerDocument = gql`
    query DetailLayer($id: ID!) {
  layer(id: $id) {
    ...Layer
  }
}
    ${LayerFragmentDoc}`;

/**
 * __useDetailLayerQuery__
 *
 * To run a query within a React component, call `useDetailLayerQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailLayerQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailLayerQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailLayerQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DetailLayerQuery, DetailLayerQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DetailLayerQuery, DetailLayerQueryVariables>(DetailLayerDocument, options);
      }
export function useDetailLayerLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DetailLayerQuery, DetailLayerQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DetailLayerQuery, DetailLayerQueryVariables>(DetailLayerDocument, options);
        }
export type DetailLayerQueryHookResult = ReturnType<typeof useDetailLayerQuery>;
export type DetailLayerLazyQueryHookResult = ReturnType<typeof useDetailLayerLazyQuery>;
export type DetailLayerQueryResult = Apollo.QueryResult<DetailLayerQuery, DetailLayerQueryVariables>;
export const StandingMandatesDocument = gql`
    query StandingMandates {
  mandates(filters: {live: true}) {
    ...ProvisioningMandate
  }
}
    ${ProvisioningMandateFragmentDoc}`;

/**
 * __useStandingMandatesQuery__
 *
 * To run a query within a React component, call `useStandingMandatesQuery` and pass it any options that fit your needs.
 * When your component renders, `useStandingMandatesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useStandingMandatesQuery({
 *   variables: {
 *   },
 * });
 */
export function useStandingMandatesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<StandingMandatesQuery, StandingMandatesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<StandingMandatesQuery, StandingMandatesQueryVariables>(StandingMandatesDocument, options);
      }
export function useStandingMandatesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<StandingMandatesQuery, StandingMandatesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<StandingMandatesQuery, StandingMandatesQueryVariables>(StandingMandatesDocument, options);
        }
export type StandingMandatesQueryHookResult = ReturnType<typeof useStandingMandatesQuery>;
export type StandingMandatesLazyQueryHookResult = ReturnType<typeof useStandingMandatesLazyQuery>;
export type StandingMandatesQueryResult = Apollo.QueryResult<StandingMandatesQuery, StandingMandatesQueryVariables>;
export const MyActiveMessagesDocument = gql`
    query MyActiveMessages {
  myActiveMessages {
    id
    title
    message
    action
  }
}
    `;

/**
 * __useMyActiveMessagesQuery__
 *
 * To run a query within a React component, call `useMyActiveMessagesQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyActiveMessagesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyActiveMessagesQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyActiveMessagesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<MyActiveMessagesQuery, MyActiveMessagesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MyActiveMessagesQuery, MyActiveMessagesQueryVariables>(MyActiveMessagesDocument, options);
      }
export function useMyActiveMessagesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MyActiveMessagesQuery, MyActiveMessagesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MyActiveMessagesQuery, MyActiveMessagesQueryVariables>(MyActiveMessagesDocument, options);
        }
export type MyActiveMessagesQueryHookResult = ReturnType<typeof useMyActiveMessagesQuery>;
export type MyActiveMessagesLazyQueryHookResult = ReturnType<typeof useMyActiveMessagesLazyQuery>;
export type MyActiveMessagesQueryResult = Apollo.QueryResult<MyActiveMessagesQuery, MyActiveMessagesQueryVariables>;
export const MyOrganizationDocument = gql`
    query MyOrganization {
  mycontext {
    organization {
      id
      slug
      profile {
        id
        name
      }
    }
  }
}
    `;

/**
 * __useMyOrganizationQuery__
 *
 * To run a query within a React component, call `useMyOrganizationQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyOrganizationQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyOrganizationQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyOrganizationQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<MyOrganizationQuery, MyOrganizationQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MyOrganizationQuery, MyOrganizationQueryVariables>(MyOrganizationDocument, options);
      }
export function useMyOrganizationLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MyOrganizationQuery, MyOrganizationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MyOrganizationQuery, MyOrganizationQueryVariables>(MyOrganizationDocument, options);
        }
export type MyOrganizationQueryHookResult = ReturnType<typeof useMyOrganizationQuery>;
export type MyOrganizationLazyQueryHookResult = ReturnType<typeof useMyOrganizationLazyQuery>;
export type MyOrganizationQueryResult = Apollo.QueryResult<MyOrganizationQuery, MyOrganizationQueryVariables>;
export const ReleasesDocument = gql`
    query Releases {
  releases {
    ...ListRelease
  }
}
    ${ListReleaseFragmentDoc}`;

/**
 * __useReleasesQuery__
 *
 * To run a query within a React component, call `useReleasesQuery` and pass it any options that fit your needs.
 * When your component renders, `useReleasesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useReleasesQuery({
 *   variables: {
 *   },
 * });
 */
export function useReleasesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ReleasesQuery, ReleasesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ReleasesQuery, ReleasesQueryVariables>(ReleasesDocument, options);
      }
export function useReleasesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ReleasesQuery, ReleasesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ReleasesQuery, ReleasesQueryVariables>(ReleasesDocument, options);
        }
export type ReleasesQueryHookResult = ReturnType<typeof useReleasesQuery>;
export type ReleasesLazyQueryHookResult = ReturnType<typeof useReleasesLazyQuery>;
export type ReleasesQueryResult = Apollo.QueryResult<ReleasesQuery, ReleasesQueryVariables>;
export const ReleaseDocument = gql`
    query Release($identifier: AppIdentifier, $version: Version, $id: ID, $clientId: ID) {
  release(
    identifier: $identifier
    version: $version
    id: $id
    clientId: $clientId
  ) {
    ...DetailRelease
  }
}
    ${DetailReleaseFragmentDoc}`;

/**
 * __useReleaseQuery__
 *
 * To run a query within a React component, call `useReleaseQuery` and pass it any options that fit your needs.
 * When your component renders, `useReleaseQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useReleaseQuery({
 *   variables: {
 *      identifier: // value for 'identifier'
 *      version: // value for 'version'
 *      id: // value for 'id'
 *      clientId: // value for 'clientId'
 *   },
 * });
 */
export function useReleaseQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ReleaseQuery, ReleaseQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ReleaseQuery, ReleaseQueryVariables>(ReleaseDocument, options);
      }
export function useReleaseLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ReleaseQuery, ReleaseQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ReleaseQuery, ReleaseQueryVariables>(ReleaseDocument, options);
        }
export type ReleaseQueryHookResult = ReturnType<typeof useReleaseQuery>;
export type ReleaseLazyQueryHookResult = ReturnType<typeof useReleaseLazyQuery>;
export type ReleaseQueryResult = Apollo.QueryResult<ReleaseQuery, ReleaseQueryVariables>;
export const DetailReleaseDocument = gql`
    query DetailRelease($id: ID!) {
  release(id: $id) {
    ...DetailRelease
  }
}
    ${DetailReleaseFragmentDoc}`;

/**
 * __useDetailReleaseQuery__
 *
 * To run a query within a React component, call `useDetailReleaseQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailReleaseQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailReleaseQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailReleaseQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DetailReleaseQuery, DetailReleaseQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DetailReleaseQuery, DetailReleaseQueryVariables>(DetailReleaseDocument, options);
      }
export function useDetailReleaseLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DetailReleaseQuery, DetailReleaseQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DetailReleaseQuery, DetailReleaseQueryVariables>(DetailReleaseDocument, options);
        }
export type DetailReleaseQueryHookResult = ReturnType<typeof useDetailReleaseQuery>;
export type DetailReleaseLazyQueryHookResult = ReturnType<typeof useDetailReleaseLazyQuery>;
export type DetailReleaseQueryResult = Apollo.QueryResult<DetailReleaseQuery, DetailReleaseQueryVariables>;
export const ScopesDocument = gql`
    query Scopes {
  scopes {
    description
    value
    label
  }
}
    `;

/**
 * __useScopesQuery__
 *
 * To run a query within a React component, call `useScopesQuery` and pass it any options that fit your needs.
 * When your component renders, `useScopesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useScopesQuery({
 *   variables: {
 *   },
 * });
 */
export function useScopesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ScopesQuery, ScopesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ScopesQuery, ScopesQueryVariables>(ScopesDocument, options);
      }
export function useScopesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ScopesQuery, ScopesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ScopesQuery, ScopesQueryVariables>(ScopesDocument, options);
        }
export type ScopesQueryHookResult = ReturnType<typeof useScopesQuery>;
export type ScopesLazyQueryHookResult = ReturnType<typeof useScopesLazyQuery>;
export type ScopesQueryResult = Apollo.QueryResult<ScopesQuery, ScopesQueryVariables>;
export const ScopesOptionsDocument = gql`
    query ScopesOptions {
  options: scopes {
    value
    label
  }
}
    `;

/**
 * __useScopesOptionsQuery__
 *
 * To run a query within a React component, call `useScopesOptionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useScopesOptionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useScopesOptionsQuery({
 *   variables: {
 *   },
 * });
 */
export function useScopesOptionsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ScopesOptionsQuery, ScopesOptionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ScopesOptionsQuery, ScopesOptionsQueryVariables>(ScopesOptionsDocument, options);
      }
export function useScopesOptionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ScopesOptionsQuery, ScopesOptionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ScopesOptionsQuery, ScopesOptionsQueryVariables>(ScopesOptionsDocument, options);
        }
export type ScopesOptionsQueryHookResult = ReturnType<typeof useScopesOptionsQuery>;
export type ScopesOptionsLazyQueryHookResult = ReturnType<typeof useScopesOptionsLazyQuery>;
export type ScopesOptionsQueryResult = Apollo.QueryResult<ScopesOptionsQuery, ScopesOptionsQueryVariables>;
export const GlobalSearchDocument = gql`
    query GlobalSearch($search: String, $noUsers: Boolean!, $noGroups: Boolean!, $pagination: OffsetPaginationInput) {
  users: users(filters: {search: $search}, pagination: $pagination) @skip(if: $noUsers) {
    ...ListUser
  }
  groups: groups(filters: {search: $search}, pagination: $pagination) @skip(if: $noGroups) {
    ...ListGroup
  }
}
    ${ListUserFragmentDoc}
${ListGroupFragmentDoc}`;

/**
 * __useGlobalSearchQuery__
 *
 * To run a query within a React component, call `useGlobalSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useGlobalSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGlobalSearchQuery({
 *   variables: {
 *      search: // value for 'search'
 *      noUsers: // value for 'noUsers'
 *      noGroups: // value for 'noGroups'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useGlobalSearchQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GlobalSearchQuery, GlobalSearchQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GlobalSearchQuery, GlobalSearchQueryVariables>(GlobalSearchDocument, options);
      }
export function useGlobalSearchLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GlobalSearchQuery, GlobalSearchQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GlobalSearchQuery, GlobalSearchQueryVariables>(GlobalSearchDocument, options);
        }
export type GlobalSearchQueryHookResult = ReturnType<typeof useGlobalSearchQuery>;
export type GlobalSearchLazyQueryHookResult = ReturnType<typeof useGlobalSearchLazyQuery>;
export type GlobalSearchQueryResult = Apollo.QueryResult<GlobalSearchQuery, GlobalSearchQueryVariables>;
export const ListServiceInstancesDocument = gql`
    query ListServiceInstances($pagination: OffsetPaginationInput, $filters: ServiceInstanceFilter) {
  serviceInstances(pagination: $pagination, filters: $filters) {
    ...ListServiceInstance
  }
}
    ${ListServiceInstanceFragmentDoc}`;

/**
 * __useListServiceInstancesQuery__
 *
 * To run a query within a React component, call `useListServiceInstancesQuery` and pass it any options that fit your needs.
 * When your component renders, `useListServiceInstancesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListServiceInstancesQuery({
 *   variables: {
 *      pagination: // value for 'pagination'
 *      filters: // value for 'filters'
 *   },
 * });
 */
export function useListServiceInstancesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListServiceInstancesQuery, ListServiceInstancesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListServiceInstancesQuery, ListServiceInstancesQueryVariables>(ListServiceInstancesDocument, options);
      }
export function useListServiceInstancesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListServiceInstancesQuery, ListServiceInstancesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListServiceInstancesQuery, ListServiceInstancesQueryVariables>(ListServiceInstancesDocument, options);
        }
export type ListServiceInstancesQueryHookResult = ReturnType<typeof useListServiceInstancesQuery>;
export type ListServiceInstancesLazyQueryHookResult = ReturnType<typeof useListServiceInstancesLazyQuery>;
export type ListServiceInstancesQueryResult = Apollo.QueryResult<ListServiceInstancesQuery, ListServiceInstancesQueryVariables>;
export const GetServiceInstanceDocument = gql`
    query GetServiceInstance($id: ID!) {
  serviceInstance(id: $id) {
    ...ServiceInstance
  }
}
    ${ServiceInstanceFragmentDoc}`;

/**
 * __useGetServiceInstanceQuery__
 *
 * To run a query within a React component, call `useGetServiceInstanceQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetServiceInstanceQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetServiceInstanceQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetServiceInstanceQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetServiceInstanceQuery, GetServiceInstanceQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetServiceInstanceQuery, GetServiceInstanceQueryVariables>(GetServiceInstanceDocument, options);
      }
export function useGetServiceInstanceLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetServiceInstanceQuery, GetServiceInstanceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetServiceInstanceQuery, GetServiceInstanceQueryVariables>(GetServiceInstanceDocument, options);
        }
export type GetServiceInstanceQueryHookResult = ReturnType<typeof useGetServiceInstanceQuery>;
export type GetServiceInstanceLazyQueryHookResult = ReturnType<typeof useGetServiceInstanceLazyQuery>;
export type GetServiceInstanceQueryResult = Apollo.QueryResult<GetServiceInstanceQuery, GetServiceInstanceQueryVariables>;
export const ListServiceReleaseDocument = gql`
    query ListServiceRelease($pagination: OffsetPaginationInput, $filters: ServiceReleaseFilter) {
  serviceReleases(pagination: $pagination, filters: $filters) {
    ...ListServiceRelease
  }
}
    ${ListServiceReleaseFragmentDoc}`;

/**
 * __useListServiceReleaseQuery__
 *
 * To run a query within a React component, call `useListServiceReleaseQuery` and pass it any options that fit your needs.
 * When your component renders, `useListServiceReleaseQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListServiceReleaseQuery({
 *   variables: {
 *      pagination: // value for 'pagination'
 *      filters: // value for 'filters'
 *   },
 * });
 */
export function useListServiceReleaseQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListServiceReleaseQuery, ListServiceReleaseQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListServiceReleaseQuery, ListServiceReleaseQueryVariables>(ListServiceReleaseDocument, options);
      }
export function useListServiceReleaseLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListServiceReleaseQuery, ListServiceReleaseQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListServiceReleaseQuery, ListServiceReleaseQueryVariables>(ListServiceReleaseDocument, options);
        }
export type ListServiceReleaseQueryHookResult = ReturnType<typeof useListServiceReleaseQuery>;
export type ListServiceReleaseLazyQueryHookResult = ReturnType<typeof useListServiceReleaseLazyQuery>;
export type ListServiceReleaseQueryResult = Apollo.QueryResult<ListServiceReleaseQuery, ListServiceReleaseQueryVariables>;
export const GetServiceReleaseDocument = gql`
    query GetServiceRelease($id: ID!) {
  serviceRelease(id: $id) {
    ...ServiceRelease
  }
}
    ${ServiceReleaseFragmentDoc}`;

/**
 * __useGetServiceReleaseQuery__
 *
 * To run a query within a React component, call `useGetServiceReleaseQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetServiceReleaseQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetServiceReleaseQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetServiceReleaseQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetServiceReleaseQuery, GetServiceReleaseQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetServiceReleaseQuery, GetServiceReleaseQueryVariables>(GetServiceReleaseDocument, options);
      }
export function useGetServiceReleaseLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetServiceReleaseQuery, GetServiceReleaseQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetServiceReleaseQuery, GetServiceReleaseQueryVariables>(GetServiceReleaseDocument, options);
        }
export type GetServiceReleaseQueryHookResult = ReturnType<typeof useGetServiceReleaseQuery>;
export type GetServiceReleaseLazyQueryHookResult = ReturnType<typeof useGetServiceReleaseLazyQuery>;
export type GetServiceReleaseQueryResult = Apollo.QueryResult<GetServiceReleaseQuery, GetServiceReleaseQueryVariables>;
export const ListServicesDocument = gql`
    query ListServices($pagination: OffsetPaginationInput, $filters: ServiceFilter) {
  services(pagination: $pagination, filters: $filters) {
    ...ListService
  }
}
    ${ListServiceFragmentDoc}`;

/**
 * __useListServicesQuery__
 *
 * To run a query within a React component, call `useListServicesQuery` and pass it any options that fit your needs.
 * When your component renders, `useListServicesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListServicesQuery({
 *   variables: {
 *      pagination: // value for 'pagination'
 *      filters: // value for 'filters'
 *   },
 * });
 */
export function useListServicesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListServicesQuery, ListServicesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListServicesQuery, ListServicesQueryVariables>(ListServicesDocument, options);
      }
export function useListServicesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListServicesQuery, ListServicesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListServicesQuery, ListServicesQueryVariables>(ListServicesDocument, options);
        }
export type ListServicesQueryHookResult = ReturnType<typeof useListServicesQuery>;
export type ListServicesLazyQueryHookResult = ReturnType<typeof useListServicesLazyQuery>;
export type ListServicesQueryResult = Apollo.QueryResult<ListServicesQuery, ListServicesQueryVariables>;
export const GetServiceDocument = gql`
    query GetService($id: ID!) {
  service(id: $id) {
    ...Service
  }
}
    ${ServiceFragmentDoc}`;

/**
 * __useGetServiceQuery__
 *
 * To run a query within a React component, call `useGetServiceQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetServiceQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetServiceQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetServiceQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetServiceQuery, GetServiceQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetServiceQuery, GetServiceQueryVariables>(GetServiceDocument, options);
      }
export function useGetServiceLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetServiceQuery, GetServiceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetServiceQuery, GetServiceQueryVariables>(GetServiceDocument, options);
        }
export type GetServiceQueryHookResult = ReturnType<typeof useGetServiceQuery>;
export type GetServiceLazyQueryHookResult = ReturnType<typeof useGetServiceLazyQuery>;
export type GetServiceQueryResult = Apollo.QueryResult<GetServiceQuery, GetServiceQueryVariables>;
export const MeDocument = gql`
    query Me {
  me {
    ...DetailUser
  }
}
    ${DetailUserFragmentDoc}`;

/**
 * __useMeQuery__
 *
 * To run a query within a React component, call `useMeQuery` and pass it any options that fit your needs.
 * When your component renders, `useMeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMeQuery({
 *   variables: {
 *   },
 * });
 */
export function useMeQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<MeQuery, MeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MeQuery, MeQueryVariables>(MeDocument, options);
      }
export function useMeLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MeQuery, MeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MeQuery, MeQueryVariables>(MeDocument, options);
        }
export type MeQueryHookResult = ReturnType<typeof useMeQuery>;
export type MeLazyQueryHookResult = ReturnType<typeof useMeLazyQuery>;
export type MeQueryResult = Apollo.QueryResult<MeQuery, MeQueryVariables>;
export const UserDocument = gql`
    query User($id: ID!) {
  user(id: $id) {
    ...DetailUser
  }
}
    ${DetailUserFragmentDoc}`;

/**
 * __useUserQuery__
 *
 * To run a query within a React component, call `useUserQuery` and pass it any options that fit your needs.
 * When your component renders, `useUserQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUserQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useUserQuery(baseOptions: ApolloReactHooks.QueryHookOptions<UserQuery, UserQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<UserQuery, UserQueryVariables>(UserDocument, options);
      }
export function useUserLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<UserQuery, UserQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<UserQuery, UserQueryVariables>(UserDocument, options);
        }
export type UserQueryHookResult = ReturnType<typeof useUserQuery>;
export type UserLazyQueryHookResult = ReturnType<typeof useUserLazyQuery>;
export type UserQueryResult = Apollo.QueryResult<UserQuery, UserQueryVariables>;
export const DetailUserDocument = gql`
    query DetailUser($id: ID!) {
  user(id: $id) {
    ...DetailUser
  }
}
    ${DetailUserFragmentDoc}`;

/**
 * __useDetailUserQuery__
 *
 * To run a query within a React component, call `useDetailUserQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailUserQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailUserQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailUserQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DetailUserQuery, DetailUserQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DetailUserQuery, DetailUserQueryVariables>(DetailUserDocument, options);
      }
export function useDetailUserLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DetailUserQuery, DetailUserQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DetailUserQuery, DetailUserQueryVariables>(DetailUserDocument, options);
        }
export type DetailUserQueryHookResult = ReturnType<typeof useDetailUserQuery>;
export type DetailUserLazyQueryHookResult = ReturnType<typeof useDetailUserLazyQuery>;
export type DetailUserQueryResult = Apollo.QueryResult<DetailUserQuery, DetailUserQueryVariables>;
export const UsersDocument = gql`
    query Users($filters: UserFilter, $pagination: OffsetPaginationInput) {
  users(filters: $filters, pagination: $pagination) {
    ...ListUser
  }
}
    ${ListUserFragmentDoc}`;

/**
 * __useUsersQuery__
 *
 * To run a query within a React component, call `useUsersQuery` and pass it any options that fit your needs.
 * When your component renders, `useUsersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUsersQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useUsersQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<UsersQuery, UsersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<UsersQuery, UsersQueryVariables>(UsersDocument, options);
      }
export function useUsersLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<UsersQuery, UsersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<UsersQuery, UsersQueryVariables>(UsersDocument, options);
        }
export type UsersQueryHookResult = ReturnType<typeof useUsersQuery>;
export type UsersLazyQueryHookResult = ReturnType<typeof useUsersLazyQuery>;
export type UsersQueryResult = Apollo.QueryResult<UsersQuery, UsersQueryVariables>;
export const UserOptionsDocument = gql`
    query UserOptions($search: String, $values: [ID!]) {
  options: users(filters: {search: $search, ids: $values}) {
    value: id
    label: username
  }
}
    `;

/**
 * __useUserOptionsQuery__
 *
 * To run a query within a React component, call `useUserOptionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useUserOptionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUserOptionsQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *   },
 * });
 */
export function useUserOptionsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<UserOptionsQuery, UserOptionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<UserOptionsQuery, UserOptionsQueryVariables>(UserOptionsDocument, options);
      }
export function useUserOptionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<UserOptionsQuery, UserOptionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<UserOptionsQuery, UserOptionsQueryVariables>(UserOptionsDocument, options);
        }
export type UserOptionsQueryHookResult = ReturnType<typeof useUserOptionsQuery>;
export type UserOptionsLazyQueryHookResult = ReturnType<typeof useUserOptionsLazyQuery>;
export type UserOptionsQueryResult = Apollo.QueryResult<UserOptionsQuery, UserOptionsQueryVariables>;
export const ProfileDocument = gql`
    query Profile {
  me {
    ...MeUser
  }
}
    ${MeUserFragmentDoc}`;

/**
 * __useProfileQuery__
 *
 * To run a query within a React component, call `useProfileQuery` and pass it any options that fit your needs.
 * When your component renders, `useProfileQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProfileQuery({
 *   variables: {
 *   },
 * });
 */
export function useProfileQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ProfileQuery, ProfileQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ProfileQuery, ProfileQueryVariables>(ProfileDocument, options);
      }
export function useProfileLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ProfileQuery, ProfileQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ProfileQuery, ProfileQueryVariables>(ProfileDocument, options);
        }
export type ProfileQueryHookResult = ReturnType<typeof useProfileQuery>;
export type ProfileLazyQueryHookResult = ReturnType<typeof useProfileLazyQuery>;
export type ProfileQueryResult = Apollo.QueryResult<ProfileQuery, ProfileQueryVariables>;