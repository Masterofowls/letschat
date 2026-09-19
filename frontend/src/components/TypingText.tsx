'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type TypingTextProps = {
  text: string;
  className?: string;
  speedMs?: number;
  startDelayMs?: number;
  showCursor?: boolean;
  as?: 'h1' | 'h2' | 'p' | 'span';
};

export function TypingText({
  text,
  className,
  speedMs = 38,
  startDelayMs = 200,
  showCursor = true,
  as: Tag = 'span',
}: TypingTextProps) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    setCount(0);
    setStarted(false);
    const start = window.setTimeout(() => setStarted(true), startDelayMs);
    return () => window.clearTimeout(start);
  }, [text, startDelayMs]);

  useEffect(() => {
    if (!started || count >= text.length) {
      return;
    }
    const tick = window.setTimeout(() => setCount((c) => c + 1), speedMs);
    return () => window.clearTimeout(tick);
  }, [started, count, text, speedMs]);

  const done = count >= text.length;

  return (
    <Tag className={cn(className)} aria-label={text}>
      <span aria-hidden="true">{text.slice(0, count)}</span>
      {showCursor ? (
        <span
          aria-hidden="true"
          className={cn(
            'ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.12em] bg-primary align-baseline',
            done ? 'animate-pulse' : 'opacity-100',
          )}
        />
      ) : null}
    </Tag>
  );
}
