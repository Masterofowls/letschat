'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Mic, ShieldCheck } from 'lucide-react';
import {
  checkMediaPermissions,
  describePermissionError,
  requestCameraAccess,
  requestMicrophoneAccess,
  stopMediaStream,
  type PermissionCheckResult,
} from '@/lib/media-permissions';
import { Button } from '@/components/ui/button';

export function MediaDiagnostics() {
  const [result, setResult] = useState<PermissionCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState<'idle' | 'mic' | 'cam'>('idle');
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function refresh() {
    setError(null);
    setResult(await checkMediaPermissions());
  }

  useEffect(() => {
    void refresh();
    return () => stopMediaStream(streamRef.current);
  }, []);

  async function testMic() {
    setTesting('mic');
    setError(null);
    try {
      stopMediaStream(streamRef.current);
      const stream = await requestMicrophoneAccess();
      streamRef.current = stream;
      await refresh();
    } catch (err) {
      setError(describePermissionError(err));
    } finally {
      setTesting('idle');
    }
  }

  async function testCamera() {
    setTesting('cam');
    setError(null);
    try {
      stopMediaStream(streamRef.current);
      const stream = await requestCameraAccess(false);
      streamRef.current = stream;
      if (previewRef.current) {
        previewRef.current.srcObject = stream;
      }
      await refresh();
    } catch (err) {
      setError(describePermissionError(err));
    } finally {
      setTesting('idle');
    }
  }

  return (
    <section className="space-y-4 rounded-lg bg-[#2b2d31] p-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-semibold text-white">Camera & microphone</h3>
          <p className="text-xs text-muted-foreground">
            Test browser permissions before joining a call. Requires HTTPS or localhost.
          </p>
        </div>
      </div>

      <ul className="space-y-2 text-sm">
        <li className="flex justify-between gap-2">
          <span className="text-muted-foreground">Secure context</span>
          <span className="text-white">{result?.secureContext ? 'Yes' : 'No'}</span>
        </li>
        <li className="flex justify-between gap-2">
          <span className="text-muted-foreground">Microphone permission</span>
          <span className="text-white">{result?.microphone ?? '…'}</span>
        </li>
        <li className="flex justify-between gap-2">
          <span className="text-muted-foreground">Camera permission</span>
          <span className="text-white">{result?.camera ?? '…'}</span>
        </li>
        <li className="flex justify-between gap-2">
          <span className="text-muted-foreground">Mics detected</span>
          <span className="text-white">{result?.devices.microphones.length ?? 0}</span>
        </li>
        <li className="flex justify-between gap-2">
          <span className="text-muted-foreground">Cameras detected</span>
          <span className="text-white">{result?.devices.cameras.length ?? 0}</span>
        </li>
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="blurple"
          className="gap-2"
          disabled={testing !== 'idle'}
          onClick={() => void testMic()}
        >
          <Mic className="h-4 w-4" />
          Test microphone
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="gap-2"
          disabled={testing !== 'idle'}
          onClick={() => void testCamera()}
        >
          <Camera className="h-4 w-4" />
          Test camera
        </Button>
        <Button type="button" variant="ghost" onClick={() => void refresh()}>
          Refresh status
        </Button>
      </div>

      <video
        ref={previewRef}
        autoPlay
        muted
        playsInline
        className="aspect-video w-full rounded-lg bg-black object-cover"
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
