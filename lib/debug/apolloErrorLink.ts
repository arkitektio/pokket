import { ApolloLink } from '@apollo/client';
// Type-only: `ServerError`/`ServerParseError` are interfaces, not runtime values.
import type { ServerError, ServerParseError } from '@apollo/client';
import { onError } from '@apollo/client/link/error';

import { describe, reportError, stringify } from './errorLog';

/**
 * Makes GraphQL failures visible.
 *
 * Every service client is built by `createGraphQLServiceBuilder` with no error
 * link, so a query that failed resolved with `data: undefined` and the
 * component rendered as though the server had simply returned nothing. A broken
 * endpoint and an empty result looked identical from the UI.
 *
 * This only reports — it never swallows or retries, so `useQuery`'s own `error`
 * still behaves exactly as before.
 */
export const createErrorReportingLink = (label: string, uri: string): ApolloLink =>
  onError(({ graphQLErrors, networkError, operation }) => {
    const where = `${label}.${operation.operationName ?? 'anonymous'}`;

    for (const error of graphQLErrors ?? []) {
      reportError(
        'graphql',
        `${where}: ${error.message}`,
        [
          error.path ? `path: ${error.path.join('.')}` : undefined,
          Object.keys(operation.variables ?? {}).length > 0
            ? `variables: ${stringify(operation.variables)}`
            : undefined,
          error.extensions ? `extensions: ${stringify(error.extensions)}` : undefined,
        ]
          .filter(Boolean)
          .join('\n\n'),
      );
    }

    if (networkError) {
      // A rejected fetch and a 500 with a body arrive as the same union member;
      // the status code is the thing that tells you which problem you have.
      const status = (networkError as ServerError | ServerParseError).statusCode;
      const body = (networkError as ServerError).result;

      reportError(
        'network',
        `${where}: ${status ? `HTTP ${status} — ` : ''}${describe(networkError)}`,
        [
          `uri: ${uri}`,
          body ? `response: ${stringify(body)}` : undefined,
          !status
            ? 'No status code — the request never reached the server (wrong host, DNS, TLS, or the device is offline).'
            : undefined,
        ]
          .filter(Boolean)
          .join('\n\n'),
      );
    }
  });


/**
 * Logs every operation, not just the failing ones.
 *
 * Without this, a blank field has two indistinguishable explanations: the query
 * ran and errored, or the query never ran at all (guard never opened, hook
 * never mounted, `skip` stayed true). The first shows up in the error log; the
 * second shows up as nothing whatsoever, which reads as "no problem here".
 * Seeing the request list settles it immediately.
 */
export const createOperationLogLink = (label: string): ApolloLink =>
  new ApolloLink((operation, forward) => {
    const started = Date.now();
    reportError('request', `→ ${label}.${operation.operationName ?? 'anonymous'}`);

    return forward(operation).map((result) => {
      const errors = result.errors?.length ?? 0;
      reportError(
        'request',
        `${errors > 0 ? '✕' : '✓'} ${label}.${operation.operationName ?? 'anonymous'} (${Date.now() - started}ms)`,
        errors > 0 ? undefined : `keys: ${Object.keys(result.data ?? {}).join(', ') || 'none'}`,
      );
      return result;
    });
  });
