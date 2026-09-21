'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Camera, Copy, ExternalLink, MonitorSmartphone, Settings, X } from 'lucide-react';
import { ME_QUERY } from '@/lib/graphql/queries';
import { UPDATE_PROFILE_MUTATION } from '@/lib/graphql/mutations';
import { getToken } from '@/lib/apollo-client';
import { absoluteProfileUrl, apiOrigin, resolveMediaUrl } from '@/lib/media';
import { detectPlatform, platformLabel } from '@/lib/platform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserAvatar } from '@/components/UserAvatar';
import { SecuritySettingsPanel } from '@/components/SecuritySettings';
import { MediaDiagnostics } from '@/components/MediaDiagnostics';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function UserSettings({ open, onClose }: Props) {
  const { data, refetch } = useQuery(ME_QUERY, { skip: !open });
  const [updateProfile, { loading }] = useMutation(UPDATE_PROFILE_MUTATION);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const me = data?.me;
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!me) return;
    setDisplayName(me.displayName ?? '');
    setBio(me.bio ?? '');
  }, [me]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const username = me?.username ?? 'you';
  const publicUrl = absoluteProfileUrl(username);
  const detected = detectPlatform();

  async function onSaveProfile(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await updateProfile({
        variables: {
          input: {
            displayName: displayName.trim() || null,
            bio: bio.trim() || null,
          },
        },
      });
      setMessage('Profile saved.');
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile');
    }
  }

  async function onUploadAvatar(file: File) {
    setError(null);
    setMessage(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await fetch(`${apiOrigin()}/uploads/avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken() ?? ''}`,
        },
        body: form,
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Upload failed');
      }
      setMessage('Photo updated.');
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function copyPublicUrl() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setMessage('Public profile link copied.');
    } catch {
      setError('Could not copy link');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="User settings"
        className="relative flex h-dvh w-full max-w-3xl overflow-hidden rounded-none bg-[#313338] shadow-elev sm:h-[min(720px,92dvh)] sm:rounded-xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-md p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground"
          aria-label="Close settings"
        >
          <X className="h-5 w-5" />
        </button>

        <Tabs defaultValue="profile" className="flex h-full w-full flex-col md:flex-row">
          <TabsList className="flex h-auto w-full shrink-0 flex-row justify-start gap-1 rounded-none bg-[#2b2d31] p-2 md:w-48 md:flex-col">
            <TabsTrigger value="profile" className="w-full justify-start">
              Profile
            </TabsTrigger>
            <TabsTrigger value="account" className="w-full justify-start">
              Account
            </TabsTrigger>
            <TabsTrigger value="security" className="w-full justify-start">
              Security
            </TabsTrigger>
            <TabsTrigger value="devices" className="w-full justify-start">
              Devices
            </TabsTrigger>
          </TabsList>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <TabsContent value="profile" className="m-0 space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-white">My Profile</h2>
                <p className="text-sm text-muted-foreground">
                  Public page and photo others can see.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative">
                  <UserAvatar
                    name={me?.displayName || username}
                    avatarUrl={me?.avatarUrl}
                    size="xl"
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="absolute -bottom-1 -right-1 rounded-full bg-primary p-2 text-white shadow"
                    aria-label="Upload profile photo"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void onUploadAvatar(file);
                      e.target.value = '';
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-white">
                    {me?.displayName || username}
                  </p>
                  <p className="text-sm text-muted-foreground">@{username}</p>
                  {resolveMediaUrl(me?.avatarUrl) ? (
                    <p className="mt-1 text-xs text-muted-foreground">Photo ready</p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">No photo yet</p>
                  )}
                </div>
              </div>

              <form className="space-y-4" onSubmit={onSaveProfile}>
                <div className="space-y-1.5">
                  <Label htmlFor="display-name">Display name</Label>
                  <Input
                    id="display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={100}
                    placeholder={username}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bio">Bio</Label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={500}
                    rows={4}
                    className="w-full rounded-lg border-0 bg-[#1e1f22] px-3 py-2 text-sm text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Tell people a bit about yourself"
                  />
                </div>
                <Button type="submit" variant="blurple" disabled={loading || uploading}>
                  {loading ? 'Saving…' : 'Save profile'}
                </Button>
              </form>

              <div className="rounded-lg bg-[#1e1f22] p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Public profile URL
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded bg-black/30 px-2 py-1.5 text-sm text-[#dbdee1]">
                    {publicUrl}
                  </code>
                  <Button type="button" size="sm" variant="secondary" onClick={() => void copyPublicUrl()}>
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    Copy
                  </Button>
                  <Button type="button" size="sm" variant="ghost" asChild>
                    <a href={me?.publicProfilePath ?? `/u/${username}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-1 h-3.5 w-3.5" />
                      Open
                    </a>
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="account" className="m-0 space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Account</h2>
                <p className="text-sm text-muted-foreground">Sign-in details and detected device.</p>
              </div>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="font-medium text-white">{me?.email}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Username</dt>
                  <dd className="font-medium text-white">@{username}</dd>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-[#1e1f22] p-3">
                  <MonitorSmartphone className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-white">
                      Platform: {platformLabel(me?.platform || detected)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Detected on this device as {platformLabel(detected)}. Stored on your profile
                      for others to see.
                    </p>
                  </div>
                </div>
              </dl>
            </TabsContent>

            <TabsContent value="security" className="m-0">
              <SecuritySettingsPanel />
            </TabsContent>

            <TabsContent value="devices" className="m-0 space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Devices & permissions</h2>
                <p className="text-sm text-muted-foreground">
                  Check microphone/camera access for 1:1 and group calls (max 4).
                </p>
              </div>
              <MediaDiagnostics />
            </TabsContent>

            {(message || error) && (
              <p
                className={cn(
                  'mt-4 text-sm',
                  error ? 'text-destructive' : 'text-discord-online',
                )}
              >
                {error ?? message}
              </p>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}

export function SettingsMenuButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-md p-1.5 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
      aria-label="Open settings"
    >
      <Settings className="h-5 w-5" />
    </button>
  );
}
