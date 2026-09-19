'use client';

import { FormEvent, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { QRCodeSVG } from 'qrcode.react';
import { startRegistration } from '@simplewebauthn/browser';
import { Fingerprint, Shield, ShieldOff } from 'lucide-react';
import { ME_QUERY } from '@/lib/graphql/queries';
import {
  BEGIN_TOTP_SETUP,
  CONFIRM_TOTP,
  DISABLE_TOTP,
  BEGIN_PASSKEY_REGISTRATION,
  FINISH_PASSKEY_REGISTRATION,
} from '@/lib/graphql/mutations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function SecuritySettings() {
  const { data, refetch } = useQuery(ME_QUERY);
  const [beginTotp] = useMutation(BEGIN_TOTP_SETUP);
  const [confirmTotp] = useMutation(CONFIRM_TOTP);
  const [disableTotp] = useMutation(DISABLE_TOTP);
  const [beginPasskey] = useMutation(BEGIN_PASSKEY_REGISTRATION);
  const [finishPasskey] = useMutation(FINISH_PASSKEY_REGISTRATION);

  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totpEnabled = Boolean(data?.me?.totpEnabled);

  async function onEnable2FA() {
    setError(null);
    setMessage(null);
    try {
      const result = await beginTotp();
      setOtpauthUrl(result.data.beginTotpSetup.otpauthUrl);
      setSecret(result.data.beginTotpSetup.secret);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start 2FA setup');
    }
  }

  async function onConfirm2FA(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await confirmTotp({ variables: { input: { code } } });
      setOtpauthUrl(null);
      setSecret(null);
      setCode('');
      setMessage('Two-factor authentication is now required on sign-in.');
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    }
  }

  async function onDisable2FA(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await disableTotp({ variables: { input: { code } } });
      setCode('');
      setMessage('Two-factor authentication disabled.');
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    }
  }

  async function onAddPasskey() {
    setError(null);
    setMessage(null);
    try {
      const begin = await beginPasskey();
      const options = JSON.parse(begin.data.beginPasskeyRegistration.optionsJson);
      const attestation = await startRegistration({ optionsJSON: options });
      await finishPasskey({
        variables: { input: { responseJson: JSON.stringify(attestation) } },
      });
      setMessage('Passkey added. You can use it on the sign-in screen.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Passkey registration failed');
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="icon" variant="ghost" aria-label="Security settings">
          <Shield className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="top"
        className="w-80 border-none bg-[#111214] p-3 shadow-elev"
      >
        <DropdownMenuLabel>Account security</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />

        <div className="space-y-3 p-1">
          <div>
            <p className="text-sm font-medium text-foreground">Two-factor auth</p>
            <p className="text-xs text-muted-foreground">
              {totpEnabled
                ? 'Required at sign-in for this account.'
                : 'Add an authenticator app for extra protection.'}
            </p>
          </div>

          {!totpEnabled && !otpauthUrl ? (
            <Button type="button" variant="blurple" className="w-full" onClick={() => void onEnable2FA()}>
              Set up 2FA
            </Button>
          ) : null}

          {otpauthUrl ? (
            <form className="space-y-2" onSubmit={onConfirm2FA}>
              <div className="mx-auto w-fit rounded-md bg-white p-2">
                <QRCodeSVG value={otpauthUrl} size={140} />
              </div>
              {secret ? (
                <p className="break-all text-center text-[10px] text-muted-foreground">
                  Secret: {secret}
                </p>
              ) : null}
              <Label htmlFor="setup-code" className="text-xs uppercase text-muted-foreground">
                Confirm code
              </Label>
              <Input
                id="setup-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-9 bg-[#1e1f22]"
                required
              />
              <Button type="submit" variant="blurple" className="w-full">
                Enable 2FA
              </Button>
            </form>
          ) : null}

          {totpEnabled ? (
            <form className="space-y-2" onSubmit={onDisable2FA}>
              <Label htmlFor="disable-code" className="text-xs uppercase text-muted-foreground">
                Code to disable
              </Label>
              <Input
                id="disable-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-9 bg-[#1e1f22]"
                required
              />
              <Button type="submit" variant="destructive" className="w-full gap-2">
                <ShieldOff className="h-4 w-4" />
                Disable 2FA
              </Button>
            </form>
          ) : null}

          <DropdownMenuSeparator className="bg-white/10" />

          <Button
            type="button"
            variant="secondary"
            className="w-full gap-2"
            onClick={() => void onAddPasskey()}
          >
            <Fingerprint className="h-4 w-4" />
            Add passkey
          </Button>

          {message ? <p className="text-xs text-discord-online">{message}</p> : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
