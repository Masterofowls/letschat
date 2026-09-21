export type PermissionStateLike = 'granted' | 'denied' | 'prompt' | 'unsupported';

export type MediaDeviceSummary = {
  hasMicrophone: boolean;
  hasCamera: boolean;
  microphones: MediaDeviceInfo[];
  cameras: MediaDeviceInfo[];
};

export type PermissionCheckResult = {
  microphone: PermissionStateLike;
  camera: PermissionStateLike;
  secureContext: boolean;
  devices: MediaDeviceSummary;
};

function permissionState(value: PermissionStatus | null): PermissionStateLike {
  if (!value) return 'unsupported';
  return value.state as PermissionStateLike;
}

export async function queryMediaPermission(
  name: 'microphone' | 'camera',
): Promise<PermissionStateLike> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return 'unsupported';
  }
  try {
    const status = await navigator.permissions.query({
      name: name as PermissionName,
    });
    return permissionState(status);
  } catch {
    return 'unsupported';
  }
}

export async function listMediaDevices(): Promise<MediaDeviceSummary> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
    return { hasMicrophone: false, hasCamera: false, microphones: [], cameras: [] };
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  const microphones = devices.filter((d) => d.kind === 'audioinput');
  const cameras = devices.filter((d) => d.kind === 'videoinput');
  return {
    hasMicrophone: microphones.length > 0,
    hasCamera: cameras.length > 0,
    microphones,
    cameras,
  };
}

export async function checkMediaPermissions(): Promise<PermissionCheckResult> {
  const [microphone, camera, devices] = await Promise.all([
    queryMediaPermission('microphone'),
    queryMediaPermission('camera'),
    listMediaDevices(),
  ]);
  return {
    microphone,
    camera,
    secureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
    devices,
  };
}

export async function requestMicrophoneAccess(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone API is not available in this browser');
  }
  return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
}

export async function requestCameraAccess(
  withAudio = true,
): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera API is not available in this browser');
  }
  return navigator.mediaDevices.getUserMedia({
    audio: withAudio,
    video: { facingMode: 'user' },
  });
}

export async function requestCallMedia(
  mediaType: 'audio' | 'video',
): Promise<MediaStream> {
  if (mediaType === 'audio') {
    return requestMicrophoneAccess();
  }
  try {
    return await requestCameraAccess(true);
  } catch {
    // Fall back to audio-only if camera is blocked/missing
    return requestMicrophoneAccess();
  }
}

export function stopMediaStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop());
}

export function describePermissionError(error: unknown): string {
  if (!(error instanceof Error)) return 'Could not access media devices';
  const name = 'name' in error ? String((error as { name?: string }).name) : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Permission denied. Allow microphone/camera in the browser site settings.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No microphone or camera was detected on this device.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Device is busy or unreadable. Close other apps using the camera/mic.';
  }
  if (name === 'SecurityError') {
    return 'Media requires HTTPS (or localhost). Open the app over a secure origin.';
  }
  return error.message || 'Could not access media devices';
}
