'use client';

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLazyQuery, useMutation } from '@apollo/client';
import { Eye, EyeOff, Fingerprint, QrCode, RefreshCw, Shield } from 'lucide-react';
import { LockIcon, MailCheckIcon, UserRoundPlusIcon } from 'lucide-animated';
import { startAuthentication } from '@simplewebauthn/browser';
import { QRCodeSVG } from 'qrcode.react';
import {
  LOGIN_MUTATION,
  REGISTER_MUTATION,
  VERIFY_2FA_MUTATION,
  BEGIN_PASSKEY_LOGIN,
  FINISH_PASSKEY_LOGIN,
  CREATE_QR_LOGIN,
} from '@/lib/graphql/mutations';
import {
  CHECK_EMAIL_QUERY,
  CHECK_USERNAME_QUERY,
  QR_LOGIN_SESSION_QUERY,
} from '@/lib/graphql/queries';
import { setToken } from '@/lib/apollo-client';
import {
  evaluatePassword,
  generateSecurePassword,
  validateEmailFormat,
  validateUsernameFormat,
} from '@/lib/auth-validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type Props = {
  onSuccess: () => void;
  onModeChange?: (mode: 'login' | 'register') => void;
};

type AuthResult = {
  accessToken?: string | null;
  requires2FA: boolean;
  pendingToken?: string | null;
};

export function AuthForm({ onSuccess, onModeChange }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending2FA, setPending2FA] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [emailOk, setEmailOk] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState<string | null>(null);
  const [usernameOk, setUsernameOk] = useState(false);

  const passwordStrength = useMemo(() => evaluatePassword(password), [password]);

  const [login, { loading: loginLoading }] = useMutation(LOGIN_MUTATION);
  const [register, { loading: registerLoading }] = useMutation(REGISTER_MUTATION);
  const [verify2FA, { loading: verifyLoading }] = useMutation(VERIFY_2FA_MUTATION);
  const [beginPasskeyLogin] = useMutation(BEGIN_PASSKEY_LOGIN);
  const [finishPasskeyLogin, { loading: passkeyLoading }] = useMutation(FINISH_PASSKEY_LOGIN);
  const [createQrLogin] = useMutation(CREATE_QR_LOGIN);
  const [checkEmail] = useLazyQuery(CHECK_EMAIL_QUERY);
  const [checkUsername] = useLazyQuery(CHECK_USERNAME_QUERY);
  const [pollQr] = useLazyQuery(QR_LOGIN_SESSION_QUERY, { fetchPolicy: 'network-only' });

  useEffect(() => {
    onModeChange?.(mode);
  }, [mode, onModeChange]);

  useEffect(() => {
    const formatError = validateEmailFormat(email);
    if (!email) {
      setEmailMsg(null);
      setEmailOk(false);
      return;
    }
    if (formatError) {
      setEmailMsg(formatError);
      setEmailOk(false);
      return;
    }
    if (mode !== 'register') {
      setEmailMsg('Looks valid');
      setEmailOk(true);
      return;
    }
    const handle = window.setTimeout(async () => {
      const { data } = await checkEmail({ variables: { email } });
      setEmailOk(Boolean(data?.checkEmail?.available));
      setEmailMsg(data?.checkEmail?.message ?? null);
    }, 350);
    return () => window.clearTimeout(handle);
  }, [email, mode, checkEmail]);

  useEffect(() => {
    if (mode !== 'register') return;
    const formatError = validateUsernameFormat(username);
    if (!username) {
      setUsernameMsg(null);
      setUsernameOk(false);
      return;
    }
    if (formatError) {
      setUsernameMsg(formatError);
      setUsernameOk(false);
      return;
    }
    const handle = window.setTimeout(async () => {
      const { data } = await checkUsername({ variables: { username } });
      setUsernameOk(Boolean(data?.checkUsername?.available));
      setUsernameMsg(data?.checkUsername?.message ?? null);
    }, 350);
    return () => window.clearTimeout(handle);
  }, [username, mode, checkUsername]);

  useEffect(() => {
    if (!qrSessionId || !showQr) return;
    const tick = window.setInterval(async () => {
      const { data } = await pollQr({ variables: { sessionId: qrSessionId } });
      const session = data?.qrLoginSession;
      if (session?.status === 'approved' && session.accessToken) {
        setToken(session.accessToken);
        onSuccess();
      }
      if (session?.status === 'expired') {
        setError('QR code expired — generate a new one');
        setShowQr(false);
        setQrSessionId(null);
      }
    }, 2000);
    return () => window.clearInterval(tick);
  }, [qrSessionId, showQr, pollQr, onSuccess]);

  function handleAuthResult(result: AuthResult) {
    if (result.requires2FA && result.pendingToken) {
      setPending2FA(result.pendingToken);
      setError(null);
      return;
    }
    if (result.accessToken) {
      setToken(result.accessToken);
      onSuccess();
      return;
    }
    setError('Authentication failed');
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      if (mode === 'login') {
        const result = await login({ variables: { input: { email, password } } });
        handleAuthResult(result.data.login);
      } else {
        if (!emailOk || !usernameOk || !passwordStrength.ok) {
          setError('Fix the highlighted fields before continuing');
          return;
        }
        const result = await register({
          variables: { input: { email, username, password } },
        });
        handleAuthResult(result.data.register);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
  }

  async function onVerify2FA(event: FormEvent) {
    event.preventDefault();
    if (!pending2FA) return;
    setError(null);
    try {
      const result = await verify2FA({
        variables: { input: { pendingToken: pending2FA, code: totpCode } },
      });
      handleAuthResult(result.data.verify2FA);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    }
  }

  async function onPasskeyLogin() {
    setError(null);
    try {
      const begin = await beginPasskeyLogin();
      const options = JSON.parse(begin.data.beginPasskeyLogin.optionsJson);
      const assertion = await startAuthentication({ optionsJSON: options });
      const finish = await finishPasskeyLogin({
        variables: { input: { responseJson: JSON.stringify(assertion) } },
      });
      handleAuthResult(finish.data.finishPasskeyLogin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Passkey sign-in failed');
    }
  }

  async function onShowQr() {
    setError(null);
    try {
      const result = await createQrLogin();
      setQrSessionId(result.data.createQrLoginSession.sessionId);
      setShowQr(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create QR session');
    }
  }

  const loading = loginLoading || registerLoading || verifyLoading || passkeyLoading;
  const qrUrl =
    typeof window !== 'undefined' && qrSessionId
      ? `${window.location.origin}/qr-auth?session=${qrSessionId}`
      : '';

  if (pending2FA) {
    return (
      <form className="space-y-4" onSubmit={onVerify2FA}>
        <div className="flex items-center gap-2 text-primary">
          <Shield className="h-5 w-5" />
          <h3 className="font-semibold text-white">Two-factor authentication</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code from your authenticator app to finish signing in.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="totp" className="text-xs font-bold uppercase text-muted-foreground">
            Authentication code
          </Label>
          <Input
            id="totp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value)}
            className="h-11 bg-[#1e1f22] tracking-[0.3em]"
            placeholder="000000"
            required
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" variant="blurple" className="h-11 w-full" disabled={loading}>
          Verify & continue
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => {
            setPending2FA(null);
            setTotpCode('');
          }}
        >
          Back
        </Button>
      </form>
    );
  }

  return (
    <div className="relative flex h-[580px] w-full flex-col">
      <Tabs
        value={mode}
        onValueChange={(value) => setMode(value as 'login' | 'register')}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="grid h-11 w-full shrink-0 grid-cols-2 rounded-md bg-[#1e1f22] p-1">
          <TabsTrigger
            value="login"
            className="h-9 min-w-0 rounded px-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            Sign in
          </TabsTrigger>
          <TabsTrigger
            value="register"
            className="h-9 min-w-0 rounded px-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            Create account
          </TabsTrigger>
        </TabsList>

        <form className="mt-4 flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
          <div className="relative h-[380px] shrink-0 overflow-hidden">
            <TabsContent
              value="login"
              forceMount
              className={cn(
                'absolute inset-0 m-0 space-y-4 overflow-hidden',
                mode !== 'login' && 'pointer-events-none invisible',
              )}
            >
              <fieldset disabled={mode !== 'login'} className="space-y-4 border-0 p-0">
                <Field
                  id="email"
                  label="Email"
                  icon={<MailCheckIcon size={16} />}
                  type="email"
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
                  hint={emailMsg}
                  valid={emailOk}
                />
                <PasswordField
                  id="password"
                  value={password}
                  onChange={setPassword}
                  showPassword={showPassword}
                  onToggleShow={() => setShowPassword((v) => !v)}
                  autoComplete="current-password"
                />
              </fieldset>
            </TabsContent>

            <TabsContent
              value="register"
              forceMount
              className={cn(
                'absolute inset-0 m-0 overflow-hidden',
                mode !== 'register' && 'pointer-events-none invisible',
              )}
            >
              <fieldset disabled={mode !== 'register'} className="space-y-2 border-0 p-0">
                <Field
                  id="reg-email"
                  label="Email"
                  icon={<MailCheckIcon size={16} />}
                  type="email"
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
                  hint={emailMsg}
                  valid={emailOk}
                />
                <Field
                  id="username"
                  label="Username"
                  icon={<UserRoundPlusIcon size={16} />}
                  value={username}
                  onChange={setUsername}
                  autoComplete="username"
                  hint={usernameMsg}
                  valid={usernameOk}
                />
                <PasswordField
                  id="reg-password"
                  value={password}
                  onChange={setPassword}
                  showPassword={showPassword}
                  onToggleShow={() => setShowPassword((v) => !v)}
                  autoComplete="new-password"
                  showGenerator
                  onGenerate={() => {
                    const next = generateSecurePassword();
                    setPassword(next);
                    setShowPassword(true);
                  }}
                />
                <PasswordMeter strength={passwordStrength} />
              </fieldset>
            </TabsContent>
          </div>

          <div className="mt-2 h-5 shrink-0">
            {error ? <p className="truncate text-sm text-destructive">{error}</p> : null}
          </div>

          <Button
            type="submit"
            variant="blurple"
            className="mt-3 h-11 w-full shrink-0 text-[15px]"
            disabled={loading}
          >
            <span className="inline-flex w-[9.5rem] justify-center">
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </span>
          </Button>
        </form>
      </Tabs>

      <div className="relative mt-4 h-[88px] shrink-0">
        <div
          className={cn(
            'absolute inset-0 space-y-2 transition-opacity',
            mode === 'login' ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <span className="h-px flex-1 bg-white/10" />
            or
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              onClick={() => void onPasskeyLogin()}
              disabled={loading || mode !== 'login'}
            >
              <Fingerprint className="h-4 w-4" />
              Passkey
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              onClick={() => void onShowQr()}
              disabled={loading || mode !== 'login'}
            >
              <QrCode className="h-4 w-4" />
              QR code
            </Button>
          </div>
        </div>
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center text-center text-sm text-muted-foreground transition-opacity',
            mode === 'register' ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          Already chatting somewhere? Switch to Sign in anytime.
        </div>
      </div>

      {showQr && qrUrl && mode === 'login' ? (
        <div className="absolute inset-x-0 bottom-0 top-14 z-20 overflow-y-auto rounded-lg bg-[#313338] p-4 shadow-elev">
          <div className="rounded-lg bg-[#1e1f22] p-4 text-center">
            <p className="mb-3 text-sm text-muted-foreground">
              Scan with a signed-in LetsChat session, or open the link on another device.
            </p>
            <div className="mx-auto inline-block rounded-md bg-white p-3">
              <QRCodeSVG value={qrUrl} size={160} />
            </div>
            <p className="mt-3 break-all text-xs text-muted-foreground">{qrUrl}</p>
            <Button
              type="button"
              variant="ghost"
              className="mt-3"
              onClick={() => {
                setShowQr(false);
                setQrSessionId(null);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  id,
  label,
  icon,
  value,
  onChange,
  type = 'text',
  autoComplete,
  hint,
  valid,
}: {
  id: string;
  label: string;
  icon: ReactNode;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  hint?: string | null;
  valid?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-3 text-muted-foreground">{icon}</span>
        <Input
          id={id}
          type={type}
          className={cn(
            'h-11 bg-[#1e1f22] pl-9',
            value && valid === false && 'ring-2 ring-destructive',
            value && valid === true && 'ring-2 ring-discord-online',
          )}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoComplete={autoComplete}
        />
      </div>
      {hint ? (
        <p className={cn('h-4 truncate text-xs', valid ? 'text-discord-online' : 'text-destructive')}>
          {hint}
        </p>
      ) : (
        <p className="h-4" aria-hidden />
      )}
    </div>
  );
}

function PasswordField({
  id,
  value,
  onChange,
  showPassword,
  onToggleShow,
  autoComplete,
  showGenerator,
  onGenerate,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  showPassword: boolean;
  onToggleShow: () => void;
  autoComplete?: string;
  showGenerator?: boolean;
  onGenerate?: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Password
        </Label>
        {showGenerator ? (
          <button
            type="button"
            onClick={onGenerate}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <RefreshCw className="h-3 w-3" />
            Generate secure
          </button>
        ) : null}
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-3 text-muted-foreground">
          <LockIcon size={16} />
        </span>
        <Input
          id={id}
          type={showPassword ? 'text' : 'password'}
          className="h-11 bg-[#1e1f22] pl-9 pr-11"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          minLength={8}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function PasswordMeter({
  strength,
}: {
  strength: ReturnType<typeof evaluatePassword>;
}) {
  const empty = !strength.checks.some((c) => c.ok) && strength.score === 0;

  return (
    <div
      className={cn(
        'h-[88px] space-y-1.5 rounded-md p-2.5',
        empty ? 'bg-transparent' : 'bg-[#1e1f22]/80',
      )}
      aria-hidden={empty}
    >
      {!empty ? (
        <>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Strength</span>
            <span className="font-medium text-foreground">{strength.label}</span>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1 rounded-full',
                  i < strength.score ? 'bg-primary' : 'bg-white/10',
                )}
              />
            ))}
          </div>
          <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] leading-tight text-muted-foreground">
            {strength.checks.map((check) => (
              <li key={check.id} className={check.ok ? 'text-discord-online' : undefined}>
                {check.ok ? '✓' : '○'} {check.label}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
