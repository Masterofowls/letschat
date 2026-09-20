export type ClientPlatform =
  | 'windows'
  | 'macos'
  | 'linux'
  | 'ios'
  | 'android'
  | 'web';

export function detectPlatform(): ClientPlatform {
  if (typeof navigator === 'undefined') return 'web';

  const ua = navigator.userAgent;
  const platform = (navigator as Navigator & { userAgentData?: { platform?: string } })
    .userAgentData?.platform;

  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Win/i.test(platform ?? ua)) return 'windows';
  if (/Mac/i.test(platform ?? ua)) return 'macos';
  if (/Linux/i.test(platform ?? ua)) return 'linux';
  return 'web';
}

export function platformLabel(platform?: string | null): string {
  switch ((platform ?? '').toLowerCase()) {
    case 'windows':
      return 'Windows';
    case 'macos':
      return 'macOS';
    case 'linux':
      return 'Linux';
    case 'ios':
      return 'iOS';
    case 'android':
      return 'Android';
    case 'web':
      return 'Web';
    default:
      return platform ? platform : 'Unknown';
  }
}
