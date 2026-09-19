'use client';

import { ApolloProvider } from '@apollo/client';
import { ReactNode, useMemo } from 'react';
import { getApolloClient } from '@/lib/apollo-client';

export function ApolloWrapper({ children }: { children: ReactNode }) {
  const client = useMemo(() => getApolloClient(), []);
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
