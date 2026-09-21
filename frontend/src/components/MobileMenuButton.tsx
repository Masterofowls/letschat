'use client';

import { Menu, X } from 'lucide-react';
import { useMobileNav } from '@/components/MobileNavContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type MobileMenuButtonProps = {
  className?: string;
};

export function MobileMenuButton({ className }: MobileMenuButtonProps) {
  const { navOpen, toggleNav } = useMobileNav();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('h-11 w-11 shrink-0 touch-manipulation md:hidden', className)}
      aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
      aria-expanded={navOpen}
      aria-controls="mobile-nav-drawer"
      onClick={toggleNav}
    >
      {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </Button>
  );
}
