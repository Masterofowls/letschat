'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@apollo/client';
import { APPROVE_QR_LOGIN } from '@/lib/graphql/mutations';
import { getToken } from '@/lib/apollo-client';
import { Button } from '@/components/ui/button';

function QrAuthInner() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get('session');
  const [approveQr] = useMutation(APPROVE_QR_LOGIN);
  const [status, setStatus] = useState<'ready' | 'done' | 'error'>('ready');
  const [message, setMessage] = useState('Approve this login on your other device.');

  useEffect(() => {
    if (!getToken()) {
      setStatus('error');
      setMessage('Sign in on this device first, then scan again.');
    }
  }, []);

  async function onApprove() {
    if (!sessionId) return;
    try {
      await approveQr({ variables: { input: { sessionId } } });
      setStatus('done');
      setMessage('Login approved. You can return to the other device.');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Could not approve login');
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-discord-deepest p-4 sm:p-6">
      <div className="w-full max-w-md rounded-lg bg-discord-sidebar p-5 text-center shadow-elev sm:p-6">
        <h1 className="text-xl font-semibold text-white">QR sign-in</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        {status === 'ready' && sessionId ? (
          <Button type="button" variant="blurple" className="mt-6 w-full" onClick={() => void onApprove()}>
            Approve login
          </Button>
        ) : null}
        <Button type="button" variant="ghost" className="mt-3 w-full" onClick={() => router.push('/')}>
          Back to LetsChat
        </Button>
      </div>
    </main>
  );
}

export default function QrAuthPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-discord-deepest text-muted-foreground">
          Loading…
        </main>
      }
    >
      <QrAuthInner />
    </Suspense>
  );
}
