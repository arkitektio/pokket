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
  /** Date with time (isoformat) */
  DateTime: { input: string; output: string; }
  _Any: { input: any; output: any; }
};

/** One read of your data. */
export type AccessLogEntry = {
  __typename?: 'AccessLogEntry';
  at: Scalars['DateTime']['output'];
  /** The reading token's OAuth client. */
  clientId?: Maybe<Scalars['String']['output']>;
  /** The reading token's client_device claim. */
  deviceId?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  operation: Scalars['String']['output'];
  range: Scalars['String']['output'];
  rows: Scalars['Int']['output'];
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

export type DeletedInput = {
  clientId: Scalars['ID']['input'];
  deletedAt: Scalars['DateTime']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Delete all of your data on this server (confirm = "DELETE"). Returns how many points, visits, trips and places were deleted. */
  deleteServerCopy: Scalars['Int']['output'];
  /** In one transaction, make this device's visits and trips starting at or after `from` exactly the ones sent. */
  replaceSegments: ReplaceResult;
  /** Keep your points and segments this many days (null: forever). Older ones are deleted now and on every later upload. */
  setRetention: Retention;
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


export type MutationSetRetentionArgs = {
  days?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationSyncPlacesArgs = {
  deleted: Array<DeletedInput>;
  places: Array<PlaceInput>;
};


export type MutationUploadPointsArgs = {
  points: Array<PointInput>;
};

/** A named place, shared by all of a user's phones. A tombstone has deletedAt set and nothing else but its key. */
export type Place = {
  __typename?: 'Place';
  clientId: Scalars['ID']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  lat?: Maybe<Scalars['Float']['output']>;
  lon?: Maybe<Scalars['Float']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  radius?: Maybe<Scalars['Float']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type PlaceInput = {
  clientId: Scalars['ID']['input'];
  lat: Scalars['Float']['input'];
  lon: Scalars['Float']['input'];
  name: Scalars['String']['input'];
  radius: Scalars['Float']['input'];
  updatedAt: Scalars['DateTime']['input'];
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
  acc?: Maybe<Scalars['Float']['output']>;
  alt?: Maybe<Scalars['Float']['output']>;
  clientId: Scalars['ID']['output'];
  /** The device (token client_device) that recorded it. */
  deviceId: Scalars['ID']['output'];
  heading?: Maybe<Scalars['Float']['output']>;
  lat: Scalars['Float']['output'];
  lon: Scalars['Float']['output'];
  speed?: Maybe<Scalars['Float']['output']>;
  ts: Scalars['DateTime']['output'];
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

export type Query = {
  __typename?: 'Query';
  _service: _Service;
  /** Every read of your data, newest first. */
  accessLog: Array<AccessLogEntry>;
  /** Everything of the user's, from all their devices, changed after `cursor`, oldest first (limit at most 1000). Page until hasMore is false; used to restore. */
  changes: ChangeSet;
  /** How long the server keeps your points and segments. */
  retention: Retention;
  /** The calling device's watermarks. */
  syncState: SyncState;
};


export type QueryAccessLogArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryChangesArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export type ReplaceResult = {
  __typename?: 'ReplaceResult';
  deletedTrips: Scalars['Int']['output'];
  deletedVisits: Scalars['Int']['output'];
  trips: Scalars['Int']['output'];
  visits: Scalars['Int']['output'];
};

/** How long the server keeps your points and segments. */
export type Retention = {
  __typename?: 'Retention';
  /** Null: forever. */
  days?: Maybe<Scalars['Int']['output']>;
};

/** The calling device's watermarks. */
export type SyncState = {
  __typename?: 'SyncState';
  lastPointTs?: Maybe<Scalars['DateTime']['output']>;
  pointCount: Scalars['Int']['output'];
  /** The `from` of this device's last replaceSegments. */
  segmentsFrom?: Maybe<Scalars['DateTime']['output']>;
};

/** A movement between two visits. */
export type Trip = {
  __typename?: 'Trip';
  clientId: Scalars['ID']['output'];
  deviceId: Scalars['ID']['output'];
  distance: Scalars['Float']['output'];
  end: Scalars['DateTime']['output'];
  fromVisit?: Maybe<Scalars['ID']['output']>;
  mode: TripMode;
  start: Scalars['DateTime']['output'];
  toVisit?: Maybe<Scalars['ID']['output']>;
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

export type UploadResult = {
  __typename?: 'UploadResult';
  accepted: Scalars['Int']['output'];
  duplicates: Scalars['Int']['output'];
};

/** A stay at one spot. */
export type Visit = {
  __typename?: 'Visit';
  clientId: Scalars['ID']['output'];
  deviceId: Scalars['ID']['output'];
  end: Scalars['DateTime']['output'];
  lat: Scalars['Float']['output'];
  lon: Scalars['Float']['output'];
  placeClientId?: Maybe<Scalars['ID']['output']>;
  pointCount: Scalars['Int']['output'];
  radius: Scalars['Float']['output'];
  start: Scalars['DateTime']['output'];
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