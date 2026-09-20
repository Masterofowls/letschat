import { cn } from '@/lib/utils';
import { resolveMediaUrl } from '@/lib/media';

const PALETTE = [
  'bg-[#5865F2]',
  'bg-[#57F287]',
  'bg-[#FEE75C]',
  'bg-[#EB459E]',
  'bg-[#ED4245]',
  'bg-[#3BA55D]',
  'bg-[#FAA61A]',
  'bg-[#593695]',
];

export function hashColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

type AvatarProps = {
  name: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  online?: boolean;
};

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-24 w-24 text-3xl',
};

export function UserAvatar({ name, avatarUrl, size = 'md', className, online }: AvatarProps) {
  const src = resolveMediaUrl(avatarUrl);

  return (
    <div className={cn('relative shrink-0', className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className={cn('rounded-full object-cover', sizeMap[size])}
        />
      ) : (
        <div
          className={cn(
            'flex items-center justify-center rounded-full font-semibold text-white',
            hashColor(name),
            sizeMap[size],
          )}
          aria-hidden
        >
          {initials(name)}
        </div>
      )}
      {online ? (
        <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[3px] border-discord-sidebar bg-discord-online" />
      ) : null}
    </div>
  );
}
