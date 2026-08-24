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
import { toast } from "sonner-native";
import { useSelfService } from "../arkitekt/hooks";
import { reportError } from "../debug/errorLog";
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

export const ServiceName = "lok";

/** The operation name off a parsed document, so a reported failure says which
 *  query or mutation it was rather than just "something failed". */
const operationName = (doc: any): string => {
  const definition = doc?.definitions?.find((each: any) => each.kind === "OperationDefinition");
  return definition?.name?.value ?? "anonymous";
};

export const useMutation: MutationFuncType = (doc, options) => {
  const service = useSelfService();

  return useApolloMutation(doc, {
    ...options,
    client: service.client,
    onError: (error) => {
      /* `toast` was the only report path here, and sonner-native drops every
         toast when no <Toaster /> is mounted — which was the case app-wide. So
         every failed lok mutation, registerComChannel included, reported itself
         into nothing. The error log does not depend on a renderer existing. */
      reportError("graphql", `${operationName(doc)} failed: ${error.message}`, error.stack);
      toast.error("Error in useMutation: " + error.message);
    },
  });
};

export const useQuery: QueryFuncType = (doc, options) => {
   const service = useSelfService();

  return useApolloQuery(doc, {
    ...options,
    client: service.client,
    // Queries had no error handling at all — a failed one rendered as an empty
    // field, which is why a missing username looked like no error.
    onError: (error) => {
      reportError("graphql", `${operationName(doc)} failed: ${error.message}`, error.stack);
      options?.onError?.(error);
    },
  });
};

export const useSubscription: SubscriptionFuncType = (doc, options) => {
   const service = useSelfService();


  return useApolloSubscription(doc, { ...options, client: service.client });
};

export const useLazyQuery: LazyQueryFuncType = (doc, options) => {
   const service = useSelfService();


  return useApolloLazyQuery(doc, { ...options, client: service.client });
};
