'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, X } from 'lucide-react';
import { MarkdownArticle } from '@/components/memories/MarkdownArticle';
import { extractFirstMarkdownImage } from '@/utils/markdown';

type StoryMemory = {
  id: string;
  title: string | null;
  content: string | null;
  media_url: string | null;
  event_date: string | null;
  created_at: string;
  author_name: string;
  tags: string[];
};

interface Props {
  story: StoryMemory | null;
  onClose: () => void;
}

export function StoryViewerModal({ story, onClose }: Props) {
  useEffect(() => {
    if (!story) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, story]);

  if (!story) return null;

  const heroImage = story.media_url || extractFirstMarkdownImage(story.content || '');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm p-4 flex items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 230, damping: 24 }}
          onClick={(event) => event.stopPropagation()}
          className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-stone/30 bg-white shadow-2xl"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/92 backdrop-blur border-b border-stone/20">
            <span className="text-xs tracking-[0.2em] uppercase text-bark/35">Story</span>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl text-bark/45 hover:text-bark/70 hover:bg-stone/25 transition-colors flex items-center justify-center"
              aria-label="Close story"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {heroImage ? (
            <div className="w-full max-h-[380px] overflow-hidden border-b border-stone/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImage}
                alt={story.title || 'Story image'}
                className="w-full h-full object-cover"
              />
            </div>
          ) : null}

          <div className="px-6 py-6 md:px-10 md:py-8">
            <h2 className="text-3xl font-semibold text-earth tracking-tight">
              {story.title || 'Untitled story'}
            </h2>

            <div className="flex flex-wrap items-center gap-3 mt-3 mb-7 text-sm text-bark/45">
              <span>by {story.author_name}</span>
              {story.event_date ? (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(story.event_date).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              ) : (
                <span>
                  {new Date(story.created_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              )}
            </div>

            <MarkdownArticle
              markdown={story.content || ''}
              className="text-[16px]"
            />

            {story.tags.length > 0 ? (
              <div className="mt-8 flex flex-wrap gap-2">
                {story.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-full text-xs text-moss bg-moss/10"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
