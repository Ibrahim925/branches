'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import {
  CheckCircle2,
  Image as ImageIcon,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  TreePine,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { triggerSelectionHaptic } from '@/lib/native';

const SWIPE_DISTANCE_THRESHOLD = 58;
const SWIPE_VELOCITY_THRESHOLD = 420;

const slides = [
  {
    key: 'welcome',
    title: 'Build one living family tree',
    description:
      'Start with one person, then grow it together in real time with your whole family.',
    icon: TreePine,
    eyebrow: 'Shared by everyone',
    highlights: [
      'Add parents, children, and partners in seconds.',
      'See updates instantly as relatives contribute.',
      'Keep every connection in one clear view.',
    ],
    gradient: 'from-moss/95 to-leaf/90',
  },
  {
    key: 'memories',
    title: 'Memories stay with the people',
    description:
      'Attach stories, photos, and important moments directly to each family member.',
    icon: ImageIcon,
    eyebrow: 'More than names and dates',
    highlights: [
      'Turn your tree into a family archive.',
      'Keep photos and stories in context.',
      'Revisit the people behind every memory.',
    ],
    gradient: 'from-sunrise/95 to-sunrise/75',
  },
  {
    key: 'chat',
    title: 'Chat where your family already is',
    description:
      'Message one-on-one, in groups, or with your whole tree without losing context.',
    icon: MessageCircle,
    eyebrow: 'Conversations that belong',
    highlights: [
      'Direct chats, groups, and full-tree chat.',
      'Invite relatives and bring them in quickly.',
      'Keep discussion close to the family graph.',
    ],
    gradient: 'from-dewdrop/95 to-dewdrop/75',
  },
  {
    key: 'get-started',
    title: 'Private by default. Ready to start?',
    description:
      'Only invited family members can access your tree. You control who can view and edit.',
    icon: ShieldCheck,
    eyebrow: 'Your family, your space',
    highlights: [
      'Roles for admins, editors, and viewers.',
      'Controlled access to your private tree.',
      'Start now and build together.',
    ],
    gradient: 'from-bark/90 to-earth/90',
  },
] as const;

function clampIndex(index: number) {
  return Math.max(0, Math.min(index, slides.length - 1));
}

export function MobileOnboarding() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const isInitialRender = useRef(true);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    void triggerSelectionHaptic();
  }, [activeIndex]);

  const goToIndex = useCallback((nextIndex: number) => {
    setActiveIndex(clampIndex(nextIndex));
  }, []);

  const handleSwipeEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const shouldSwipeForward =
        info.offset.x < -SWIPE_DISTANCE_THRESHOLD ||
        info.velocity.x < -SWIPE_VELOCITY_THRESHOLD;
      const shouldSwipeBackward =
        info.offset.x > SWIPE_DISTANCE_THRESHOLD ||
        info.velocity.x > SWIPE_VELOCITY_THRESHOLD;

      if (shouldSwipeForward) {
        goToIndex(activeIndex + 1);
        return;
      }

      if (shouldSwipeBackward) {
        goToIndex(activeIndex - 1);
      }
    },
    [activeIndex, goToIndex]
  );

  const isLastSlide = activeIndex === slides.length - 1;
  const activeSlide = slides[activeIndex];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f8f6f1_0%,#f4f1ea_45%,#f9f8f4_100%)] text-earth">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pt-[calc(var(--safe-area-top)+0.75rem)] pb-[calc(var(--safe-area-bottom)+1rem)]">
        <div className="mb-3 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full border border-stone/40 bg-white/85 px-3 py-1 text-xs font-medium text-bark/75">
            <TreePine className="h-3.5 w-3.5 text-moss" />
            Branches
          </div>

          {!isLastSlide ? (
            <button
              type="button"
              onClick={() => goToIndex(slides.length - 1)}
              className="tap-target rounded-full px-3 py-1 text-sm font-medium text-bark/65 hover:bg-white/70"
            >
              Skip
            </button>
          ) : (
            <div className="h-10 w-12" />
          )}
        </div>

        <div className="relative flex-1 overflow-hidden">
          <div className="pointer-events-none absolute -left-20 -top-20 h-52 w-52 rounded-full bg-moss/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-sunrise/10 blur-3xl" />

          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={handleSwipeEnd}
            animate={{ x: `-${activeIndex * 100}%` }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="flex h-full"
          >
            {slides.map((slide, index) => {
              const Icon = slide.icon;
              return (
                <section
                  key={slide.key}
                  aria-hidden={index !== activeIndex}
                  className="flex h-full w-full shrink-0 flex-col justify-center px-1"
                >
                  <div className="rounded-[28px] border border-stone/40 bg-white/90 p-7 shadow-[0_18px_50px_rgba(70,54,33,0.12)]">
                    <div
                      className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white ${slide.gradient}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bark/50">
                        {slide.eyebrow}
                      </p>
                      <p className="text-[11px] font-medium text-bark/45">
                        {index + 1} / {slides.length}
                      </p>
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight text-earth">
                      {slide.title}
                    </h1>
                    <p className="mt-3 text-sm leading-relaxed text-bark/70">
                      {slide.description}
                    </p>

                    <div className="mt-5 space-y-2.5">
                      {slide.highlights.map((point) => (
                        <div
                          key={point}
                          className="flex items-start gap-2.5 rounded-xl border border-stone/45 bg-white/80 px-3 py-2.5"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
                          <p className="text-xs leading-relaxed text-bark/75">{point}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              );
            })}
          </motion.div>
        </div>

        <div className="pt-6">
          <div className="mb-5 flex items-center justify-center gap-2">
            {slides.map((slide, index) => {
              const selected = index === activeIndex;
              return (
                <button
                  key={slide.key}
                  type="button"
                  aria-label={`Go to ${slide.title}`}
                  aria-current={selected}
                  onClick={() => goToIndex(index)}
                  className={`h-2.5 rounded-full transition-all ${
                    selected
                      ? 'w-8 bg-moss'
                      : 'w-2.5 bg-stone/80 hover:bg-stone/95'
                  }`}
                />
              );
            })}
          </div>

          <div className="space-y-2.5">
            {isLastSlide ? (
              <button
                type="button"
                onClick={() => router.push('/login')}
                className={`tap-target flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(92,121,75,0.3)] ${activeSlide.gradient}`}
              >
                <Sparkles className="h-4 w-4" />
                Start Your Tree
              </button>
            ) : (
              <button
                type="button"
                onClick={() => goToIndex(activeIndex + 1)}
                className="tap-target flex w-full items-center justify-center gap-2 rounded-2xl border border-stone/55 bg-white/90 px-5 py-3 text-sm font-semibold text-earth"
              >
                <Zap className="h-4 w-4 text-moss" />
                Continue
              </button>
            )}

            {!isLastSlide ? (
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="tap-target w-full rounded-2xl bg-white/70 px-5 py-3 text-sm font-medium text-bark/75"
              >
                Already have an account
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
