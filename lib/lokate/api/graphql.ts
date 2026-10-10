import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloReactHooks from '@/lib/lokate/funcs';
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
  /** Date (isoformat) */
  Date: { input: any; output: any; }
  /** Date with time (isoformat) */
  DateTime: { input: string; output: string; }
  _Any: { input: any; output: any; }
};

/** A lat/lon rectangle, e.g. a map viewport. */
export type BoxInput = {
  east: Scalars['Float']['input'];
  north: Scalars['Float']['input'];
  south: Scalars['Float']['input'];
  west: Scalars['Float']['input'];
};

/** One page of everything the user has, from all their devices, in change order. */
export type ChangeSet = {
  __typename?: 'ChangeSet';
  deletedPlaces: Array<Scalars['ID']['output']>;
  hasMore: Scalars['Boolean']['output'];
  nextCursor?: Maybe<Scalars['String']['output']>;
  places: Array<Place>;
  points: Array<Point>;
  trips: Array<Trip>;
  visits: Array<Visit>;
};

/** One calendar day of the timeline, across all your devices. */
export type Day = {
  __typename?: 'Day';
  date: Scalars['Date']['output'];
  /** Meters travelled, summed over the day's trips. */
  distance: Scalars['Float']['output'];
  end: Scalars['DateTime']['output'];
  pointCount: Scalars['Int']['output'];
  /** Midnight, in the requested time zone. */
  start: Scalars['DateTime']['output'];
  /** Trips overlapping the day, oldest first. */
  trips: Array<Trip>;
  /** Visits overlapping the day, oldest first. */
  visits: Array<Visit>;
};

export type DeletedInput = {
  clientId: Scalars['ID']['input'];
  deletedAt: Scalars['DateTime']['input'];
};

/** One of your phones (an install): the token's client_device. */
export type Device = {
  __typename?: 'Device';
  /** The client_device claim it uploads with. */
  deviceId: Scalars['String']['output'];
  firstSeenAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** When this device last wrote anything. */
  lastUploadAt?: Maybe<Scalars['DateTime']['output']>;
  /** How many points it has uploaded. */
  pointCount: Scalars['Int']['output'];
  /** The `from` of its last replaceSegments. */
  segmentsFrom?: Maybe<Scalars['DateTime']['output']>;
};

/**
 * One phone (install) of a user: the ``client_device`` claim of its token.
 *
 * Keyed by user as well, so two accounts on one phone never share rows. A reinstall that
 * is issued a new device id is a new ``Device``; its old one's history stays readable
 * through ``changes``.
 */
export type DeviceFilter = {
  AND?: InputMaybe<DeviceFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<DeviceFilter>;
  OR?: InputMaybe<DeviceFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type DeviceOrder =
  { firstSeenAt: Ordering; lastUploadAt?: never; }
  |  { firstSeenAt?: never; lastUploadAt: Ordering; };

/** The width of a stats bucket. */
export enum Granularity {
  Day = 'DAY',
  Month = 'MONTH',
  Week = 'WEEK'
}

/** Trips of one mode within a stats bucket. */
export type ModeStat = {
  __typename?: 'ModeStat';
  /** Meters. */
  distance: Scalars['Float']['output'];
  mode: TripMode;
  seconds: Scalars['Float']['output'];
  trips: Scalars['Int']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Delete all of your data on this server (confirm = "DELETE"). Returns how many points, visits, trips and places were deleted. */
  deleteServerCopy: Scalars['Int']['output'];
  /** In one transaction, make this device's visits and trips starting at or after `from` exactly the ones sent. */
  replaceSegments: ReplaceResult;
  /** Merge places and tombstones, last write wins on updatedAt; newer server copies come back in `stale`. */
  syncPlaces: PlaceSyncResult;
  /** Store points (at most 1000 per call). Safe to repeat: a point already stored counts as a duplicate. */
  uploadPoints: UploadResult;
};


export type MutationDeleteServerCopyArgs = {
  confirm: Scalars['String']['input'];
};


export type MutationReplaceSegmentsArgs = {
  from: Scalars['DateTime']['input'];
  trips: Array<TripInput>;
  visits: Array<VisitInput>;
};


export type MutationSyncPlacesArgs = {
  deleted: Array<DeletedInput>;
  places: Array<PlaceInput>;
};


export type MutationUploadPointsArgs = {
  points: Array<PointInput>;
};

/** Within `radius` meters of a point. */
export type NearInput = {
  lat: Scalars['Float']['input'];
  lon: Scalars['Float']['input'];
  radius: Scalars['Float']['input'];
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

/** A named place, shared by all of your phones. */
export type Place = {
  __typename?: 'Place';
  clientId: Scalars['ID']['output'];
  /** Set on a tombstone (only ever seen in syncPlaces' `stale`). */
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  /** When the latest visit to it ended. */
  lastVisitAt?: Maybe<Scalars['DateTime']['output']>;
  lat?: Maybe<Scalars['Float']['output']>;
  lon?: Maybe<Scalars['Float']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  /** Meters. */
  radius?: Maybe<Scalars['Float']['output']>;
  /** The phone's edit time; last write wins on it. */
  updatedAt: Scalars['DateTime']['output'];
  /** How many visits were matched to it. */
  visitCount: Scalars['Int']['output'];
};

/**
 * A named place, shared by all of a user's phones (so keyed by user, not device).
 *
 * Last write wins on ``updated_at``. A deleted place stays as a tombstone (``deleted_at``
 * set) so another phone's older copy is not uploaded again. A tombstone can arrive for a
 * place the server never saw, so everything but the key and the stamps is nullable.
 */
export type PlaceFilter = {
  AND?: InputMaybe<PlaceFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<PlaceFilter>;
  OR?: InputMaybe<PlaceFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  inBox?: InputMaybe<BoxInput>;
  near?: InputMaybe<NearInput>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type PlaceInput = {
  clientId: Scalars['ID']['input'];
  lat: Scalars['Float']['input'];
  lon: Scalars['Float']['input'];
  name: Scalars['String']['input'];
  radius: Scalars['Float']['input'];
  updatedAt: Scalars['DateTime']['input'];
};

export type PlaceOrder =
  { name: Ordering; updatedAt?: never; }
  |  { name?: never; updatedAt: Ordering; };

/** Time spent at one place. */
export type PlaceStat = {
  __typename?: 'PlaceStat';
  firstVisitAt: Scalars['DateTime']['output'];
  lastVisitAt: Scalars['DateTime']['output'];
  /** None if the place was deleted. */
  place?: Maybe<Place>;
  placeClientId: Scalars['ID']['output'];
  seconds: Scalars['Float']['output'];
  visitCount: Scalars['Int']['output'];
};

export type PlaceSyncResult = {
  __typename?: 'PlaceSyncResult';
  applied: Scalars['Int']['output'];
  /** Places whose server copy is newer; the phone takes them (deletedAt set: delete it). */
  stale: Array<Place>;
};

/** One location fix. */
export type Point = {
  __typename?: 'Point';
  /** Horizontal accuracy, meters. */
  acc?: Maybe<Scalars['Float']['output']>;
  /** Altitude, meters. */
  alt?: Maybe<Scalars['Float']['output']>;
  clientId: Scalars['ID']['output'];
  device: Device;
  /** The client_device of the device that recorded it. */
  deviceId: Scalars['ID']['output'];
  /** Degrees from north. */
  heading?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  lat: Scalars['Float']['output'];
  lon: Scalars['Float']['output'];
  /** Meters per second. */
  speed?: Maybe<Scalars['Float']['output']>;
  ts: Scalars['DateTime']['output'];
};

/** One location fix. Partitioned by month of ``ts`` (see the module docstring). */
export type PointFilter = {
  AND?: InputMaybe<PointFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<PointFilter>;
  OR?: InputMaybe<PointFilter>;
  devices?: InputMaybe<Array<Scalars['ID']['input']>>;
  inBox?: InputMaybe<BoxInput>;
  maxAccuracy?: InputMaybe<Scalars['Float']['input']>;
  near?: InputMaybe<NearInput>;
  since?: InputMaybe<Scalars['DateTime']['input']>;
  until?: InputMaybe<Scalars['DateTime']['input']>;
};

export type PointInput = {
  acc?: InputMaybe<Scalars['Float']['input']>;
  alt?: InputMaybe<Scalars['Float']['input']>;
  clientId: Scalars['ID']['input'];
  heading?: InputMaybe<Scalars['Float']['input']>;
  lat: Scalars['Float']['input'];
  lon: Scalars['Float']['input'];
  speed?: InputMaybe<Scalars['Float']['input']>;
  ts: Scalars['DateTime']['input'];
};

export type PointOrder =
  { ts: Ordering; };

export type Query = {
  __typename?: 'Query';
  _entities: Array<Maybe<_Entity>>;
  _service: _Service;
  /** Everything of yours, from all your devices, changed after `cursor`, oldest first (limit at most 1000). Page until hasMore is false; used to restore. */
  changes: ChangeSet;
  /** One calendar day (in `timezone`, IANA name): its visits and trips in order, and totals. */
  day: Day;
  /** A device by id. */
  device: Device;
  /** Your phones (installs) that have backed up here. */
  devices: Array<Device>;
  /** A place by id. */
  place: Place;
  /** Time spent per place, most first. */
  placeStats: Array<PlaceStat>;
  /** Your named places (paginated, filterable by name, box or distance). */
  places: Array<Place>;
  /** A point by id. */
  point: Point;
  /** Location fixes (paginated, filterable by time, device, box or distance). */
  points: Array<Point>;
  /** How many points match (the same filters as `points`). */
  pointsCount: Scalars['Int']['output'];
  /** Your path between `since` and `until`, one GeoJSON line per device. */
  route: Array<Track>;
  /** Points, visits, trips and distance per day, week or month. */
  stats: Array<StatsBucket>;
  /** The calling device's watermarks. */
  syncState: SyncState;
  /** A trip by id. */
  trip: Trip;
  /** Movements between visits (paginated, filterable by time, device, mode or distance). */
  trips: Array<Trip>;
  /** How many trips match (the same filters as `trips`). */
  tripsCount: Scalars['Int']['output'];
  /** A visit by id. */
  visit: Visit;
  /** Stays (paginated, filterable by time, device, place, box or distance). */
  visits: Array<Visit>;
  /** How many visits match (the same filters as `visits`). */
  visitsCount: Scalars['Int']['output'];
};


export type Query_EntitiesArgs = {
  representations: Array<Scalars['_Any']['input']>;
};


export type QueryChangesArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryDayArgs = {
  date: Scalars['Date']['input'];
  timezone?: InputMaybe<Scalars['String']['input']>;
};


export type QueryDeviceArgs = {
  id: Scalars['ID']['input'];
};


export type QueryDevicesArgs = {
  filters?: InputMaybe<DeviceFilter>;
  ordering?: Array<DeviceOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryPlaceArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPlaceStatsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  since?: InputMaybe<Scalars['DateTime']['input']>;
  until?: InputMaybe<Scalars['DateTime']['input']>;
};


export type QueryPlacesArgs = {
  filters?: InputMaybe<PlaceFilter>;
  ordering?: Array<PlaceOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryPointArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPointsArgs = {
  filters?: InputMaybe<PointFilter>;
  ordering?: Array<PointOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryPointsCountArgs = {
  filters?: InputMaybe<PointFilter>;
};


export type QueryRouteArgs = {
  devices?: InputMaybe<Array<Scalars['ID']['input']>>;
  maxAccuracy?: InputMaybe<Scalars['Float']['input']>;
  simplify?: InputMaybe<Scalars['Float']['input']>;
  since: Scalars['DateTime']['input'];
  until: Scalars['DateTime']['input'];
};


export type QueryStatsArgs = {
  granularity?: InputMaybe<Granularity>;
  since: Scalars['DateTime']['input'];
  timezone?: InputMaybe<Scalars['String']['input']>;
  until: Scalars['DateTime']['input'];
};


export type QueryTripArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTripsArgs = {
  filters?: InputMaybe<TripFilter>;
  ordering?: Array<TripOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryTripsCountArgs = {
  filters?: InputMaybe<TripFilter>;
};


export type QueryVisitArgs = {
  id: Scalars['ID']['input'];
};


export type QueryVisitsArgs = {
  filters?: InputMaybe<VisitFilter>;
  ordering?: Array<VisitOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryVisitsCountArgs = {
  filters?: InputMaybe<VisitFilter>;
};

export type ReplaceResult = {
  __typename?: 'ReplaceResult';
  deletedTrips: Scalars['Int']['output'];
  deletedVisits: Scalars['Int']['output'];
  trips: Scalars['Int']['output'];
  visits: Scalars['Int']['output'];
};

/** Totals for one day, week or month. */
export type StatsBucket = {
  __typename?: 'StatsBucket';
  byMode: Array<ModeStat>;
  /** Meters, over all trips. */
  distance: Scalars['Float']['output'];
  pointCount: Scalars['Int']['output'];
  start: Scalars['DateTime']['output'];
  tripCount: Scalars['Int']['output'];
  visitCount: Scalars['Int']['output'];
};

/** The calling device's watermarks. */
export type SyncState = {
  __typename?: 'SyncState';
  lastPointTs?: Maybe<Scalars['DateTime']['output']>;
  pointCount: Scalars['Int']['output'];
  /** The `from` of this device's last replaceSegments. */
  segmentsFrom?: Maybe<Scalars['DateTime']['output']>;
};

/** One device's points over a time range, joined into a line. */
export type Track = {
  __typename?: 'Track';
  device: Device;
  /** Geodesic length of the (unsimplified) line, meters. */
  distance: Scalars['Float']['output'];
  end: Scalars['DateTime']['output'];
  /** A GeoJSON LineString (coordinates are [lon, lat]). */
  geojson: Scalars['String']['output'];
  pointCount: Scalars['Int']['output'];
  start: Scalars['DateTime']['output'];
};

/** A movement between two visits. */
export type Trip = {
  __typename?: 'Trip';
  clientId: Scalars['ID']['output'];
  device: Device;
  /** The client_device of the device that recorded it. */
  deviceId: Scalars['ID']['output'];
  /** Meters. */
  distance: Scalars['Float']['output'];
  /** How long it took, seconds. */
  duration: Scalars['Float']['output'];
  end: Scalars['DateTime']['output'];
  /** The clientId of the visit it left. */
  fromVisit?: Maybe<Scalars['ID']['output']>;
  id: Scalars['ID']['output'];
  /** How it was travelled. */
  mode: TripMode;
  start: Scalars['DateTime']['output'];
  /** The clientId of the visit it arrived at. */
  toVisit?: Maybe<Scalars['ID']['output']>;
};

/** A movement between two visits, as the phone segmented it. */
export type TripFilter = {
  AND?: InputMaybe<TripFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<TripFilter>;
  OR?: InputMaybe<TripFilter>;
  devices?: InputMaybe<Array<Scalars['ID']['input']>>;
  minDistance?: InputMaybe<Scalars['Float']['input']>;
  modes?: InputMaybe<Array<TripMode>>;
  since?: InputMaybe<Scalars['DateTime']['input']>;
  until?: InputMaybe<Scalars['DateTime']['input']>;
};

export type TripInput = {
  clientId: Scalars['ID']['input'];
  distance: Scalars['Float']['input'];
  end: Scalars['DateTime']['input'];
  fromVisit?: InputMaybe<Scalars['ID']['input']>;
  mode: TripMode;
  start: Scalars['DateTime']['input'];
  toVisit?: InputMaybe<Scalars['ID']['input']>;
};

/** How a trip was travelled, as the phone classified it. */
export enum TripMode {
  Bike = 'BIKE',
  Unknown = 'UNKNOWN',
  Vehicle = 'VEHICLE',
  Walk = 'WALK'
}

export type TripOrder =
  { distance: Ordering; start?: never; }
  |  { distance?: never; start: Ordering; };

export type UploadResult = {
  __typename?: 'UploadResult';
  accepted: Scalars['Int']['output'];
  duplicates: Scalars['Int']['output'];
};

/** A stay at one spot. */
export type Visit = {
  __typename?: 'Visit';
  clientId: Scalars['ID']['output'];
  device: Device;
  /** The client_device of the device that recorded it. */
  deviceId: Scalars['ID']['output'];
  /** How long it lasted, seconds. */
  duration: Scalars['Float']['output'];
  end: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  lat: Scalars['Float']['output'];
  lon: Scalars['Float']['output'];
  /** The place it was matched to (none if deleted or unmatched). */
  place?: Maybe<Place>;
  /** The clientId of the place it was matched to. */
  placeClientId?: Maybe<Scalars['ID']['output']>;
  pointCount: Scalars['Int']['output'];
  /** Meters. */
  radius: Scalars['Float']['output'];
  start: Scalars['DateTime']['output'];
};

/** A stay at one spot, as the phone segmented it. */
export type VisitFilter = {
  AND?: InputMaybe<VisitFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<VisitFilter>;
  OR?: InputMaybe<VisitFilter>;
  devices?: InputMaybe<Array<Scalars['ID']['input']>>;
  hasPlace?: InputMaybe<Scalars['Boolean']['input']>;
  inBox?: InputMaybe<BoxInput>;
  minDuration?: InputMaybe<Scalars['Float']['input']>;
  near?: InputMaybe<NearInput>;
  places?: InputMaybe<Array<Scalars['ID']['input']>>;
  since?: InputMaybe<Scalars['DateTime']['input']>;
  until?: InputMaybe<Scalars['DateTime']['input']>;
};

export type VisitInput = {
  clientId: Scalars['ID']['input'];
  end: Scalars['DateTime']['input'];
  lat: Scalars['Float']['input'];
  lon: Scalars['Float']['input'];
  placeClientId?: InputMaybe<Scalars['ID']['input']>;
  pointCount: Scalars['Int']['input'];
  radius: Scalars['Float']['input'];
  start: Scalars['DateTime']['input'];
};

export type VisitOrder =
  { end: Ordering; start?: never; }
  |  { end?: never; start: Ordering; };

export type _Entity = Device | Place | Point | Trip | Visit;

export type _Service = {
  __typename?: '_Service';
  sdl: Scalars['String']['output'];
};

export type LokatePointFragment = { __typename?: 'Point', clientId: string, deviceId: string, ts: string, lat: number, lon: number, acc?: number | null, speed?: number | null, heading?: number | null, alt?: number | null };

export type LokateVisitFragment = { __typename?: 'Visit', clientId: string, deviceId: string, start: string, end: string, lat: number, lon: number, radius: number, pointCount: number, placeClientId?: string | null };

export type LokateTripFragment = { __typename?: 'Trip', clientId: string, deviceId: string, start: string, end: string, fromVisit?: string | null, toVisit?: string | null, distance: number, mode: TripMode };

export type LokatePlaceFragment = { __typename?: 'Place', clientId: string, name?: string | null, lat?: number | null, lon?: number | null, radius?: number | null, updatedAt: string, deletedAt?: string | null };

export type UploadPointsMutationVariables = Exact<{
  points: Array<PointInput> | PointInput;
}>;


export type UploadPointsMutation = { __typename?: 'Mutation', uploadPoints: { __typename?: 'UploadResult', accepted: number, duplicates: number } };

export type ReplaceSegmentsMutationVariables = Exact<{
  from: Scalars['DateTime']['input'];
  visits: Array<VisitInput> | VisitInput;
  trips: Array<TripInput> | TripInput;
}>;


export type ReplaceSegmentsMutation = { __typename?: 'Mutation', replaceSegments: { __typename?: 'ReplaceResult', deletedVisits: number, deletedTrips: number, visits: number, trips: number } };

export type SyncPlacesMutationVariables = Exact<{
  places: Array<PlaceInput> | PlaceInput;
  deleted: Array<DeletedInput> | DeletedInput;
}>;


export type SyncPlacesMutation = { __typename?: 'Mutation', syncPlaces: { __typename?: 'PlaceSyncResult', applied: number, stale: Array<{ __typename?: 'Place', clientId: string, name?: string | null, lat?: number | null, lon?: number | null, radius?: number | null, updatedAt: string, deletedAt?: string | null }> } };

export type DeleteServerCopyMutationVariables = Exact<{
  confirm: Scalars['String']['input'];
}>;


export type DeleteServerCopyMutation = { __typename?: 'Mutation', deleteServerCopy: number };

export type SyncStateQueryVariables = Exact<{ [key: string]: never; }>;


export type SyncStateQuery = { __typename?: 'Query', syncState: { __typename?: 'SyncState', lastPointTs?: string | null, pointCount: number, segmentsFrom?: string | null } };

export type ChangesQueryVariables = Exact<{
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ChangesQuery = { __typename?: 'Query', changes: { __typename?: 'ChangeSet', deletedPlaces: Array<string>, nextCursor?: string | null, hasMore: boolean, points: Array<{ __typename?: 'Point', clientId: string, deviceId: string, ts: string, lat: number, lon: number, acc?: number | null, speed?: number | null, heading?: number | null, alt?: number | null }>, visits: Array<{ __typename?: 'Visit', clientId: string, deviceId: string, start: string, end: string, lat: number, lon: number, radius: number, pointCount: number, placeClientId?: string | null }>, trips: Array<{ __typename?: 'Trip', clientId: string, deviceId: string, start: string, end: string, fromVisit?: string | null, toVisit?: string | null, distance: number, mode: TripMode }>, places: Array<{ __typename?: 'Place', clientId: string, name?: string | null, lat?: number | null, lon?: number | null, radius?: number | null, updatedAt: string, deletedAt?: string | null }> } };

export const LokatePointFragmentDoc = gql`
    fragment LokatePoint on Point {
  clientId
  deviceId
  ts
  lat
  lon
  acc
  speed
  heading
  alt
}
    `;
export const LokateVisitFragmentDoc = gql`
    fragment LokateVisit on Visit {
  clientId
  deviceId
  start
  end
  lat
  lon
  radius
  pointCount
  placeClientId
}
    `;
export const LokateTripFragmentDoc = gql`
    fragment LokateTrip on Trip {
  clientId
  deviceId
  start
  end
  fromVisit
  toVisit
  distance
  mode
}
    `;
export const LokatePlaceFragmentDoc = gql`
    fragment LokatePlace on Place {
  clientId
  name
  lat
  lon
  radius
  updatedAt
  deletedAt
}
    `;
export const UploadPointsDocument = gql`
    mutation UploadPoints($points: [PointInput!]!) {
  uploadPoints(points: $points) {
    accepted
    duplicates
  }
}
    `;
export type UploadPointsMutationFn = Apollo.MutationFunction<UploadPointsMutation, UploadPointsMutationVariables>;

/**
 * __useUploadPointsMutation__
 *
 * To run a mutation, you first call `useUploadPointsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUploadPointsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [uploadPointsMutation, { data, loading, error }] = useUploadPointsMutation({
 *   variables: {
 *      points: // value for 'points'
 *   },
 * });
 */
export function useUploadPointsMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UploadPointsMutation, UploadPointsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UploadPointsMutation, UploadPointsMutationVariables>(UploadPointsDocument, options);
      }
export type UploadPointsMutationHookResult = ReturnType<typeof useUploadPointsMutation>;
export type UploadPointsMutationResult = Apollo.MutationResult<UploadPointsMutation>;
export type UploadPointsMutationOptions = Apollo.BaseMutationOptions<UploadPointsMutation, UploadPointsMutationVariables>;
export const ReplaceSegmentsDocument = gql`
    mutation ReplaceSegments($from: DateTime!, $visits: [VisitInput!]!, $trips: [TripInput!]!) {
  replaceSegments(from: $from, visits: $visits, trips: $trips) {
    deletedVisits
    deletedTrips
    visits
    trips
  }
}
    `;
export type ReplaceSegmentsMutationFn = Apollo.MutationFunction<ReplaceSegmentsMutation, ReplaceSegmentsMutationVariables>;

/**
 * __useReplaceSegmentsMutation__
 *
 * To run a mutation, you first call `useReplaceSegmentsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReplaceSegmentsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [replaceSegmentsMutation, { data, loading, error }] = useReplaceSegmentsMutation({
 *   variables: {
 *      from: // value for 'from'
 *      visits: // value for 'visits'
 *      trips: // value for 'trips'
 *   },
 * });
 */
export function useReplaceSegmentsMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ReplaceSegmentsMutation, ReplaceSegmentsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ReplaceSegmentsMutation, ReplaceSegmentsMutationVariables>(ReplaceSegmentsDocument, options);
      }
export type ReplaceSegmentsMutationHookResult = ReturnType<typeof useReplaceSegmentsMutation>;
export type ReplaceSegmentsMutationResult = Apollo.MutationResult<ReplaceSegmentsMutation>;
export type ReplaceSegmentsMutationOptions = Apollo.BaseMutationOptions<ReplaceSegmentsMutation, ReplaceSegmentsMutationVariables>;
export const SyncPlacesDocument = gql`
    mutation SyncPlaces($places: [PlaceInput!]!, $deleted: [DeletedInput!]!) {
  syncPlaces(places: $places, deleted: $deleted) {
    applied
    stale {
      ...LokatePlace
    }
  }
}
    ${LokatePlaceFragmentDoc}`;
export type SyncPlacesMutationFn = Apollo.MutationFunction<SyncPlacesMutation, SyncPlacesMutationVariables>;

/**
 * __useSyncPlacesMutation__
 *
 * To run a mutation, you first call `useSyncPlacesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSyncPlacesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [syncPlacesMutation, { data, loading, error }] = useSyncPlacesMutation({
 *   variables: {
 *      places: // value for 'places'
 *      deleted: // value for 'deleted'
 *   },
 * });
 */
export function useSyncPlacesMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<SyncPlacesMutation, SyncPlacesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<SyncPlacesMutation, SyncPlacesMutationVariables>(SyncPlacesDocument, options);
      }
export type SyncPlacesMutationHookResult = ReturnType<typeof useSyncPlacesMutation>;
export type SyncPlacesMutationResult = Apollo.MutationResult<SyncPlacesMutation>;
export type SyncPlacesMutationOptions = Apollo.BaseMutationOptions<SyncPlacesMutation, SyncPlacesMutationVariables>;
export const DeleteServerCopyDocument = gql`
    mutation DeleteServerCopy($confirm: String!) {
  deleteServerCopy(confirm: $confirm)
}
    `;
export type DeleteServerCopyMutationFn = Apollo.MutationFunction<DeleteServerCopyMutation, DeleteServerCopyMutationVariables>;

/**
 * __useDeleteServerCopyMutation__
 *
 * To run a mutation, you first call `useDeleteServerCopyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteServerCopyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteServerCopyMutation, { data, loading, error }] = useDeleteServerCopyMutation({
 *   variables: {
 *      confirm: // value for 'confirm'
 *   },
 * });
 */
export function useDeleteServerCopyMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteServerCopyMutation, DeleteServerCopyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteServerCopyMutation, DeleteServerCopyMutationVariables>(DeleteServerCopyDocument, options);
      }
export type DeleteServerCopyMutationHookResult = ReturnType<typeof useDeleteServerCopyMutation>;
export type DeleteServerCopyMutationResult = Apollo.MutationResult<DeleteServerCopyMutation>;
export type DeleteServerCopyMutationOptions = Apollo.BaseMutationOptions<DeleteServerCopyMutation, DeleteServerCopyMutationVariables>;
export const SyncStateDocument = gql`
    query SyncState {
  syncState {
    lastPointTs
    pointCount
    segmentsFrom
  }
}
    `;

/**
 * __useSyncStateQuery__
 *
 * To run a query within a React component, call `useSyncStateQuery` and pass it any options that fit your needs.
 * When your component renders, `useSyncStateQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSyncStateQuery({
 *   variables: {
 *   },
 * });
 */
export function useSyncStateQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<SyncStateQuery, SyncStateQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SyncStateQuery, SyncStateQueryVariables>(SyncStateDocument, options);
      }
export function useSyncStateLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SyncStateQuery, SyncStateQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SyncStateQuery, SyncStateQueryVariables>(SyncStateDocument, options);
        }
export type SyncStateQueryHookResult = ReturnType<typeof useSyncStateQuery>;
export type SyncStateLazyQueryHookResult = ReturnType<typeof useSyncStateLazyQuery>;
export type SyncStateQueryResult = Apollo.QueryResult<SyncStateQuery, SyncStateQueryVariables>;
export const ChangesDocument = gql`
    query Changes($cursor: String, $limit: Int) {
  changes(cursor: $cursor, limit: $limit) {
    points {
      ...LokatePoint
    }
    visits {
      ...LokateVisit
    }
    trips {
      ...LokateTrip
    }
    places {
      ...LokatePlace
    }
    deletedPlaces
    nextCursor
    hasMore
  }
}
    ${LokatePointFragmentDoc}
${LokateVisitFragmentDoc}
${LokateTripFragmentDoc}
${LokatePlaceFragmentDoc}`;

/**
 * __useChangesQuery__
 *
 * To run a query within a React component, call `useChangesQuery` and pass it any options that fit your needs.
 * When your component renders, `useChangesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useChangesQuery({
 *   variables: {
 *      cursor: // value for 'cursor'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useChangesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ChangesQuery, ChangesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ChangesQuery, ChangesQueryVariables>(ChangesDocument, options);
      }
export function useChangesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ChangesQuery, ChangesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ChangesQuery, ChangesQueryVariables>(ChangesDocument, options);
        }
export type ChangesQueryHookResult = ReturnType<typeof useChangesQuery>;
export type ChangesLazyQueryHookResult = ReturnType<typeof useChangesLazyQuery>;
export type ChangesQueryResult = Apollo.QueryResult<ChangesQuery, ChangesQueryVariables>;