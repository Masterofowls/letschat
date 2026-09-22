'use client';

import { ApolloClient, InMemoryCache, HttpLink, split, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

const TOKEN_KEY = 'letschat_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function resolveWsUri(httpUri: string): string {
  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  if (explicit) return explicit;
  try {
    const url = new URL(httpUri);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return url.toString().replace(/\/$/, '');
  } catch {
    return 'ws://localhost:9000/graphql';
  }
}

function createApolloClient() {
  const httpUri = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:9000/graphql';
  const wsUri = resolveWsUri(httpUri);

  const httpLink = new HttpLink({
    uri: httpUri,
  });

  const authLink = setContext((_, { headers }) => {
    const token = getToken();
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : '',
      },
    };
  });

  const wsLink =
    typeof window !== 'undefined'
      ? new GraphQLWsLink(
          createClient({
            url: wsUri,
            connectionParams: () => {
              const token = getToken();
              return token ? { Authorization: `Bearer ${token}` } : {};
            },
            // Render free tier: cold start + ~55s idle drop
            keepAlive: 25_000,
            retryAttempts: Infinity,
            shouldRetry: () => true,
            retryWait: async (retries) => {
              // Exponential backoff, cap 10s — covers Render spin-up
              await new Promise((r) => setTimeout(r, Math.min(10_000, 500 * 2 ** retries)));
            },
            lazy: true,
          }),
        )
      : null;

  const splitLink =
    wsLink != null
      ? split(
          ({ query }) => {
            const definition = getMainDefinition(query);
            return (
              definition.kind === 'OperationDefinition' &&
              definition.operation === 'subscription'
            );
          },
          wsLink,
          from([authLink, httpLink]),
        )
      : from([authLink, httpLink]);

  return new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: { fetchPolicy: 'cache-and-network' },
    },
  });
}

let browserClient: ApolloClient<unknown> | null = null;

export function getApolloClient() {
  if (typeof window === 'undefined') {
    return createApolloClient();
  }
  if (!browserClient) {
    browserClient = createApolloClient();
  }
  return browserClient;
}
