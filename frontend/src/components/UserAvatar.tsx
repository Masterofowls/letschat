import { cn } from '@/lib/utils';

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
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  online?: boolean;
};

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

export function UserAvatar({ name, size = 'md', className, online }: AvatarProps) {
  return (
    <div className={cn('relative shrink-0', className)}>
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
      {online ? (
        <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[3px] border-discord-sidebar bg-discord-online" />
      ) : null}
    </div>
  );
}
