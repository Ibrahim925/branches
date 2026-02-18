'use client';

import { useEffect, type ReactNode, type RefObject } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export interface MobileActionSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  ariaLabel?: string;
  children: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>;
  showHandle?: boolean;
  className?: string;
}

export function MobileActionSheet({
  open,
  onClose,
  title,
  ariaLabel,
  children,
  initialFocusRef,
  showHandle = true,
  className = '',
}: MobileActionSheetProps) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';

    const frame = window.requestAnimationFrame(() => {
      initialFocusRef?.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = '';
    };
  }, [initialFocusRef, open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center md:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
            className={`w-full md:max-w-md bg-white shadow-2xl rounded-t-3xl md:rounded-2xl max-h-[min(92vh,var(--app-vh))] overflow-y-auto border-t border-x border-stone/30 md:border ${className}`}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel || title || 'Action sheet'}
          >
            {showHandle ? (
              <div className="md:hidden flex justify-center pt-2.5 pb-1">
                <span className="h-1.5 w-12 rounded-full bg-stone/70" />
              </div>
            ) : null}

            {title ? (
              <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-3 border-b border-stone/30 bg-white/96 backdrop-blur-sm">
                <h2 className="text-base font-semibold text-earth">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="tap-target rounded-lg text-bark/45 hover:bg-stone/30 transition-colors flex items-center justify-center"
                  aria-label={`Close ${title}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : null}

            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

