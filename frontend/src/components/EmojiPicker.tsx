'use client';

import { useState } from 'react';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const EMOJIS = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '🤩', '😎', '🤔', '😅',
  '😢', '😭', '😡', '👍', '👎', '👏', '🙏', '🔥', '✨', '🎉',
  '❤️', '💙', '💜', '💚', '💛', '🧡', '🖤', '💯', '✅', '❌',
  '🚀', '🎮', '🎵', '🍕', '☕', '🌈', '⭐', '💪', '🤝', '👀',
];

type Props = {
  onPick: (emoji: string) => void;
  className?: string;
};

export function EmojiPicker({ onPick, className }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn('relative', className)}>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-11 w-11 touch-manipulation sm:h-9 sm:w-9"
        aria-label="Insert emoji"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Smile className="h-5 w-5" />
      </Button>
      {open ? (
        <div className="absolute bottom-12 left-0 z-30 w-[min(18rem,calc(100vw-2rem))] rounded-lg bg-[#111214] p-2 shadow-elev sm:bottom-11 sm:w-64">
          <div className="grid grid-cols-8 gap-1">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="flex h-10 items-center justify-center rounded-md text-lg hover:bg-white/10 sm:h-8 sm:p-1"
                onClick={() => {
                  onPick(emoji);
                  setOpen(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
