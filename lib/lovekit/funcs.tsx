import {
  LazyQueryHookOptions,
  MutationHookOptions,
  QueryHookOptions,
  SubscriptionHookOptions,
  useLazyQuery as useApolloLazyQuery,
  useMutation as useApolloMutation,
  useQuery as useApolloQuery,
  useSubscription as useApolloSubscription,
} from "@apollo/client";
import { useService } from "../arkitekt/provider";

type MutationFuncType = typeof useApolloMutation;
type QueryFuncType = typeof useApolloQuery;
type LazyQueryFuncType = typeof useApolloLazyQuery;
type SubscriptionFuncType = typeof useApolloSubscription;

export type {
  LazyQueryHookOptions,
  MutationHookOptions,
  QueryHookOptions,
  SubscriptionHookOptions
};

export const ServiceName = "lovekit";

export const useMutation: MutationFuncType = (doc, options) => {
  const service = useService(ServiceName);

  return useApolloMutation(doc, {
    ...options,
    client: service.client,
  });
};

export const useQuery: QueryFuncType = (doc, options) => {
  const service = useService(ServiceName);

  return useApolloQuery(doc, { ...options, client: service.client });
};

export const useSubscription: SubscriptionFuncType = (doc, options) => {
  const service = useService(ServiceName);

  return useApolloSubscription(doc, { ...options, client: service.client });
};

export const useLazyQuery: LazyQueryFuncType = (doc, options) => {
  const service = useService(ServiceName);

  return useApolloLazyQuery(doc, { ...options, client: service.client });
};
