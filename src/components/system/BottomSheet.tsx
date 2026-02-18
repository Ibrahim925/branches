'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  AnimatePresence,
  animate,
  motion,
  useDragControls,
  useMotionValue,
  type PanInfo,
} from 'framer-motion';

import { triggerLightImpactHaptic } from '@/lib/native';

const SHEET_SPRING = {
  type: 'spring',
  stiffness: 430,
  damping: 40,
  mass: 0.45,
} as const;

function normalizeSnapPoints(points: number[]) {
  const normalized = points
    .filter((point) => Number.isFinite(point))
    .map((point) => Math.max(0.2, Math.min(0.96, point)))
    .sort((a, b) => a - b);

  if (normalized.length === 0) {
    return [0.4, 0.9];
  }

  return [...new Set(normalized)];
}

function pickClosestSnapIndex(
  projectedHeight: number,
  snapHeights: number[],
  fallbackIndex: number
) {
  if (snapHeights.length === 0) return fallbackIndex;

  let closestIndex = 0;
  let smallestDistance = Number.POSITIVE_INFINITY;

  snapHeights.forEach((height, index) => {
    const distance = Math.abs(projectedHeight - height);
    if (distance < smallestDistance) {
      smallestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  snapPoints?: number[];
  initialSnap?: number;
  title?: string;
  ariaLabel?: string;
  className?: string;
  contentClassName?: string;
  onSnapChange?: (index: number) => void;
  onExited?: () => void;
}

export function BottomSheet({
  open,
  onClose,
  children,
  snapPoints = [0.4, 0.9],
  initialSnap = 0,
  title,
  ariaLabel,
  className = '',
  contentClassName = '',
  onSnapChange,
  onExited,
}: BottomSheetProps) {
  const dragControls = useDragControls();
  const y = useMotionValue(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const resolvedSnapPoints = useMemo(
    () => normalizeSnapPoints(snapPoints),
    [snapPoints]
  );
  const safeInitialSnap = Math.min(
    Math.max(initialSnap, 0),
    resolvedSnapPoints.length - 1
  );
  const [snapIndex, setSnapIndex] = useState(safeInitialSnap);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncHeight = () => {
      setViewportHeight(window.innerHeight);
    };

    syncHeight();
    window.addEventListener('resize', syncHeight);

    return () => {
      window.removeEventListener('resize', syncHeight);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSnapIndex(safeInitialSnap);
    y.set(0);
  }, [open, safeInitialSnap, y]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      void triggerLightImpactHaptic();
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [open]);

  const measuredViewportHeight = viewportHeight || 844;
  const snapHeights = useMemo(
    () => resolvedSnapPoints.map((point) => point * measuredViewportHeight),
    [measuredViewportHeight, resolvedSnapPoints]
  );
  const currentSnapHeight = snapHeights[snapIndex] || snapHeights[0] || 0;

  const applySnap = useCallback(
    (nextSnapIndex: number) => {
      if (nextSnapIndex < 0 || nextSnapIndex >= snapHeights.length) return;

      setSnapIndex(nextSnapIndex);
      onSnapChange?.(nextSnapIndex);
      void triggerLightImpactHaptic();
    },
    [onSnapChange, snapHeights.length]
  );

  const handleDragEnd = useCallback(
    (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
      const velocityY = info.velocity.y;
      const offsetY = info.offset.y;
      const projectedHeight = currentSnapHeight - offsetY - velocityY * 0.18;
      const dismissThreshold = (snapHeights[0] || currentSnapHeight) * 0.55;

      if (velocityY > 1300 || projectedHeight < dismissThreshold) {
        onClose();
        return;
      }

      const closestSnapIndex = pickClosestSnapIndex(
        projectedHeight,
        snapHeights,
        snapIndex
      );

      applySnap(closestSnapIndex);
      animate(y, 0, SHEET_SPRING);
    },
    [applySnap, currentSnapHeight, onClose, snapHeights, snapIndex, y]
  );

  return (
    <AnimatePresence mode="wait" onExitComplete={onExited}>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            type="button"
            aria-label="Dismiss sheet"
            onClick={onClose}
            className="absolute inset-0 bg-black/28 backdrop-blur-[4px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel || title || 'Paper view'}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.02, bottom: 0.3 }}
            onDragEnd={handleDragEnd}
            style={{ y, height: currentSnapHeight }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SHEET_SPRING}
            className={`relative z-[91] w-full rounded-t-[26px] border border-stone/35 bg-white/96 shadow-[0_-24px_60px_rgba(36,24,10,0.2)] overflow-hidden flex flex-col ${className}`}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onPointerDown={(event) => dragControls.start(event)}
              aria-label="Drag sheet"
              className="pt-3 pb-2 flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
            >
              <span className="h-[5px] w-9 rounded-full bg-stone/70" />
            </button>

            {title ? (
              <div className="px-5 pb-3 border-b border-stone/30">
                <h2 className="text-base font-semibold text-earth">{title}</h2>
              </div>
            ) : null}

            <div
              className={`min-h-0 flex-1 overflow-y-auto px-5 pb-[var(--safe-area-bottom)] ${contentClassName}`}
            >
              {children}
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
