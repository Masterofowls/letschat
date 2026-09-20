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
        aria-label="Insert emoji"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Smile className="h-5 w-5" />
      </Button>
      {open ? (
        <div className="absolute bottom-11 left-0 z-30 w-64 rounded-lg bg-[#111214] p-2 shadow-elev">
          <div className="grid grid-cols-8 gap-1">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="rounded-md p-1 text-lg hover:bg-white/10"
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
