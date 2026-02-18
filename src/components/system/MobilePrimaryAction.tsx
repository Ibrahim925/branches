'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { triggerPrimaryActionHaptic } from '@/lib/native/haptics';

type BottomOffsetMode = 'default' | 'composer';

export interface MobilePrimaryActionProps {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  hidden?: boolean;
  disabled?: boolean;
  loading?: boolean;
  ariaLabel?: string;
  bottomOffsetMode?: BottomOffsetMode;
  allowWhenKeyboardOpen?: boolean;
  className?: string;
}

export function MobilePrimaryAction({
  label,
  icon,
  onPress,
  hidden = false,
  disabled = false,
  loading = false,
  ariaLabel,
  bottomOffsetMode = 'default',
  allowWhenKeyboardOpen = false,
  className = '',
}: MobilePrimaryActionProps) {
  if (hidden) return null;

  const bottomClass =
    bottomOffsetMode === 'composer'
      ? 'bottom-[calc(var(--safe-area-bottom)+var(--mobile-tab-bar-offset)+var(--keyboard-inset)+5.25rem)]'
      : 'bottom-[calc(var(--safe-area-bottom)+var(--mobile-tab-bar-offset)+1rem)]';

  const handlePress = () => {
    if (disabled || loading) return;
    void triggerPrimaryActionHaptic();
    onPress();
  };

  return (
    <button
      type="button"
      onClick={handlePress}
      disabled={disabled || loading}
      aria-label={ariaLabel || label}
      data-allow-with-keyboard={allowWhenKeyboardOpen ? 'true' : 'false'}
      className={`mobile-fab ios-gradient-fix tap-target md:hidden fixed right-4 ${bottomClass} z-30 w-14 h-14 rounded-2xl bg-gradient-to-br from-moss to-leaf text-white shadow-xl shadow-moss/30 flex items-center justify-center transition-all transform-gpu will-change-transform disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : icon}
      <span className="sr-only">{label}</span>
    </button>
  );
}
