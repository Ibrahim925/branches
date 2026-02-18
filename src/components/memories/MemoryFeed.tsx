'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Heart,
  ImageIcon,
  Loader2,
  MessageCircle,
  Send,
  BookOpen,
  Trash2,
} from 'lucide-react';
import { buildStoryExcerpt, extractFirstMarkdownImage } from '@/utils/markdown';
import { buildImageCropStyle } from '@/utils/imageCrop';
import { MobileActionSheet } from '@/components/system/MobileActionSheet';

type Memory = {
  id: string;
  type: 'story' | 'photo' | 'document';
  title: string | null;
  content: string | null;
  media_url: string | null;
  media_zoom: number | null;
  media_focus_x: number | null;
  media_focus_y: number | null;
  event_date: string | null;
  tags: string[];
  created_at: string;
  author_id: string;
  author_name: string;
  subject_names: string[];
  like_count: number;
  comment_count: number;
  isLiked: boolean;
};

type MemoryComment = {
  id: string;
  memory_id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
};

interface Props {
  memories: Memory[];
  commentsByMemory: Record<string, MemoryComment[]>;
  onToggleLike: (memoryId: string) => Promise<void>;
  onAddComment: (memoryId: string, content: string) => Promise<string | null>;
  onOpenStory?: (memory: Memory) => void;
  onDeleteMemory?: (memory: Memory) => Promise<string | null>;
  currentUserId?: string | null;
  canDeleteAsAdmin?: boolean;
  likeLoadingByMemory?: Record<string, boolean>;
  commentLoadingByMemory?: Record<string, boolean>;
  deleteLoadingByMemory?: Record<string, boolean>;
}

function formatCommentTime(dateString: string) {
  return new Date(dateString).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MemoryFeed({
  memories,
  commentsByMemory,
  onToggleLike,
  onAddComment,
  onOpenStory,
  onDeleteMemory,
  currentUserId,
  canDeleteAsAdmin = false,
  likeLoadingByMemory = {},
  commentLoadingByMemory = {},
  deleteLoadingByMemory = {},
}: Props) {
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentErrors, setCommentErrors] = useState<Record<string, string | null>>({});
  const [pendingDeleteMemory, setPendingDeleteMemory] = useState<Memory | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const typeIcons = {
    story: BookOpen,
    photo: ImageIcon,
    document: BookOpen,
  };

  const typeColors = {
    story: 'from-dewdrop/30 to-dewdrop/10 text-dewdrop',
    photo: 'from-leaf/30 to-leaf/10 text-leaf',
    document: 'from-bark/20 to-bark/10 text-bark',
  };

  async function submitComment(memoryId: string) {
    const draft = commentDrafts[memoryId] || '';
    const error = await onAddComment(memoryId, draft);
    if (error) {
      setCommentErrors((current) => ({ ...current, [memoryId]: error }));
      return;
    }

    setCommentDrafts((current) => ({ ...current, [memoryId]: '' }));
    setCommentErrors((current) => ({ ...current, [memoryId]: null }));
  }

  async function confirmDeleteMemory() {
    if (!pendingDeleteMemory || !onDeleteMemory) return;

    const deletionError = await onDeleteMemory(pendingDeleteMemory);
    if (deletionError) {
      setDeleteError(deletionError);
      return;
    }

    setDeleteError(null);
    setPendingDeleteMemory(null);
  }

  if (memories.length === 0) {
    return (
      <div className="text-center py-20">
        <ImageIcon className="w-12 h-12 text-bark/20 mx-auto mb-4" />
        <p className="text-bark/40 text-sm">No memories yet</p>
        <p className="text-bark/30 text-xs mt-1">
          Add a photo, story, or document to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {memories.map((memory, index) => {
        const Icon = typeIcons[memory.type];
        const comments = commentsByMemory[memory.id] || [];
        const isCommentsOpen = openComments[memory.id] || false;
        const likeLoading = likeLoadingByMemory[memory.id] || false;
        const commentLoading = commentLoadingByMemory[memory.id] || false;
        const deleteLoading = deleteLoadingByMemory[memory.id] || false;
        const isStory = memory.type === 'story';
        const storyThumbnail =
          isStory && (memory.media_url || extractFirstMarkdownImage(memory.content || ''));
        const storyExcerpt = isStory ? buildStoryExcerpt(memory.content || '', 230) : '';
        const canOpenStory = isStory && Boolean(onOpenStory);
        const canDelete = Boolean(
          onDeleteMemory &&
            (currentUserId === memory.author_id || canDeleteAsAdmin)
        );

        return (
          <motion.article
            key={memory.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => {
              if (canOpenStory && onOpenStory) {
                onOpenStory(memory);
              }
            }}
            onKeyDown={(event) => {
              if (!canOpenStory || !onOpenStory) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpenStory(memory);
              }
            }}
            role={canOpenStory ? 'button' : undefined}
            tabIndex={canOpenStory ? 0 : -1}
            className={`bg-white/70 backdrop-blur-sm rounded-2xl border border-stone/30 overflow-hidden hover:shadow-lg transition-shadow ${
              canOpenStory
                ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-moss/35'
                : ''
            }`}
          >
            {memory.media_url && memory.type === 'photo' && (
              <div className="w-full aspect-[4/5] overflow-hidden bg-stone/15">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={memory.media_url}
                  alt={memory.title || 'Memory'}
                  className="w-full h-full object-cover"
                  style={buildImageCropStyle(
                    {
                      zoom: memory.media_zoom,
                      focusX: memory.media_focus_x,
                      focusY: memory.media_focus_y,
                    },
                    { minZoom: 1, maxZoom: 3 }
                  )}
                />
              </div>
            )}
            {storyThumbnail ? (
              <div className="w-full aspect-video overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={storyThumbnail}
                  alt={memory.title || 'Story preview'}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : null}

            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${typeColors[memory.type]}`}
                >
                  <Icon className="w-3 h-3" />
                  {memory.type.charAt(0).toUpperCase() + memory.type.slice(1)}
                </div>
                {memory.event_date && (
                  <span className="text-xs text-bark/40 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(memory.event_date).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                )}
              </div>

              {memory.title ? (
                <h3 className="text-base font-semibold text-earth mb-1.5">{memory.title}</h3>
              ) : null}

              {memory.content ? (
                isStory ? (
                  <p className="text-sm text-bark/60 leading-relaxed">
                    {storyExcerpt || 'Open to read this story.'}
                  </p>
                ) : (
                  <p className="text-sm text-bark/60 leading-relaxed whitespace-pre-wrap">
                    {memory.content}
                  </p>
                )
              ) : null}

              {memory.subject_names.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {memory.subject_names.map((subjectName) => (
                    <span
                      key={`${memory.id}-${subjectName}`}
                      className="text-xs text-bark/65 bg-stone/35 px-2 py-0.5 rounded-full"
                    >
                      {subjectName}
                    </span>
                  ))}
                </div>
              ) : null}

              {isStory && canOpenStory ? (
                <p className="text-xs text-moss font-medium mt-2">Click to read full article</p>
              ) : null}

              {memory.tags && memory.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {memory.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs text-moss bg-moss/10 px-2 py-0.5 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-stone/20">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void onToggleLike(memory.id);
                  }}
                  disabled={likeLoading}
                  className={`tap-target flex items-center gap-1.5 text-xs transition-colors ${
                    memory.isLiked ? 'text-error' : 'text-bark/40 hover:text-error'
                  }`}
                >
                  {likeLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Heart className={`w-3.5 h-3.5 ${memory.isLiked ? 'fill-current' : ''}`} />
                  )}
                  {memory.like_count}
                </button>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenComments((current) => ({
                      ...current,
                      [memory.id]: !current[memory.id],
                    }));
                  }}
                  className="tap-target flex items-center gap-1.5 text-xs text-bark/40 hover:text-moss transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {memory.comment_count}
                </button>

                {canDelete ? (
                  <button
                    type="button"
                    onClick={async (event) => {
                      event.stopPropagation();
                      setDeleteError(null);
                      setPendingDeleteMemory(memory);
                    }}
                    disabled={deleteLoading}
                    className="tap-target flex items-center gap-1.5 text-xs text-bark/40 hover:text-error transition-colors disabled:opacity-60"
                    title="Delete memory"
                    aria-label="Delete memory"
                  >
                    {deleteLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Delete
                  </button>
                ) : null}

                <span className="text-xs text-bark/30 ml-auto">by {memory.author_name}</span>
              </div>

              {isCommentsOpen ? (
                <div
                  className="mt-4 pt-4 border-t border-stone/20 space-y-3"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {comments.length === 0 ? (
                      <p className="text-xs text-bark/40">No comments yet.</p>
                    ) : (
                      comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="rounded-xl border border-stone/30 bg-stone/20 px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-earth">
                              {comment.author_name}
                            </span>
                            <span className="text-[11px] text-bark/35">
                              {formatCommentTime(comment.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-bark/70 mt-1 whitespace-pre-wrap">
                            {comment.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={commentDrafts[memory.id] || ''}
                      onChange={(event) =>
                        setCommentDrafts((current) => ({
                          ...current,
                          [memory.id]: event.target.value,
                        }))
                      }
                      placeholder="Add a comment..."
                      className="flex-1 px-3 py-2 rounded-xl border border-stone/35 bg-white text-sm text-earth placeholder:text-bark/35 focus:outline-none focus:ring-2 focus:ring-moss/45"
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void submitComment(memory.id);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void submitComment(memory.id);
                      }}
                      disabled={commentLoading}
                      className="tap-target w-9 h-9 rounded-xl bg-gradient-to-r from-moss to-leaf text-white flex items-center justify-center disabled:opacity-60"
                    >
                      {commentLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {commentErrors[memory.id] ? (
                    <p className="text-xs text-error">{commentErrors[memory.id]}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </motion.article>
        );
      })}

      <MobileActionSheet
        open={Boolean(pendingDeleteMemory)}
        onClose={() => {
          setDeleteError(null);
          setPendingDeleteMemory(null);
        }}
        title="Delete Memory"
        ariaLabel="Delete memory confirmation"
        className="md:max-w-sm"
      >
        <div className="mobile-sheet-body pt-4 space-y-4">
          <p className="text-sm text-bark/70 leading-relaxed">
            Delete{' '}
            <span className="font-medium text-earth">
              {pendingDeleteMemory?.title || 'this memory'}
            </span>
            ? This action cannot be undone.
          </p>

          {deleteError ? <p className="text-xs text-error">{deleteError}</p> : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setDeleteError(null);
                setPendingDeleteMemory(null);
              }}
              className="tap-target flex-1 py-3 rounded-xl border border-stone/40 text-sm font-medium text-earth hover:bg-stone/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmDeleteMemory()}
              disabled={
                !pendingDeleteMemory ||
                Boolean(deleteLoadingByMemory[pendingDeleteMemory.id])
              }
              className="tap-target flex-1 py-3 rounded-xl bg-error text-white text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {pendingDeleteMemory &&
              deleteLoadingByMemory[pendingDeleteMemory.id] ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              Delete
            </button>
          </div>
        </div>
      </MobileActionSheet>
    </div>
  );
}
