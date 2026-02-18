'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { MemoryFeed } from '@/components/memories/MemoryFeed';
import { CreateMemoryModal } from '@/components/memories/CreateMemoryModal';
import { StoryViewerModal } from '@/components/memories/StoryViewerModal';
import { extractMarkdownImageUrls } from '@/utils/markdown';
import { motion } from 'framer-motion';
import { Filter, Loader2, Plus } from 'lucide-react';

type MemoryType = 'story' | 'photo' | 'document';

type MemoryRow = {
  id: string;
  graph_id: string;
  node_id: string | null;
  author_id: string;
  type: MemoryType;
  title: string | null;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  event_date: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

type MemoryLikeRow = {
  memory_id: string;
  user_id: string;
};

type MemoryCommentRow = {
  id: string;
  memory_id: string;
  author_id: string;
  content: string;
  created_at: string;
};

type MemorySubjectRow = {
  memory_id: string;
  subject_user_id: string | null;
  subject_node_id: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
};

type NodeSubjectRow = {
  id: string;
  first_name: string;
  last_name: string | null;
};

type Memory = {
  id: string;
  type: MemoryType;
  title: string | null;
  content: string | null;
  media_url: string | null;
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

type GraphMembershipRoleRow = {
  role: 'admin' | 'editor' | 'viewer';
};

function extractMemoriesStoragePath(url: string): string | null {
  try {
    const parsed = new URL(url);
    const marker = '/storage/v1/object/public/memories/';
    const markerIndex = parsed.pathname.indexOf(marker);

    if (markerIndex < 0) return null;

    const path = decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
    return path || null;
  } catch {
    return null;
  }
}

function formatProfileName(profile: Pick<ProfileRow, 'display_name' | 'email'>): string {
  return profile.display_name?.trim() || profile.email?.trim() || 'Family Member';
}

function buildNameMap(profiles: ProfileRow[]) {
  const map: Record<string, string> = {};
  profiles.forEach((profile) => {
    map[profile.id] = formatProfileName(profile);
  });
  return map;
}

function formatNodeName(node: Pick<NodeSubjectRow, 'first_name' | 'last_name'>) {
  const fullName = `${node.first_name || ''} ${node.last_name || ''}`.trim();
  return fullName || 'Family Member';
}

export default function MemoriesPage() {
  const { graphId } = useParams<{ graphId: string }>();
  const supabase = useMemo(() => createClient(), []);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [commentsByMemory, setCommentsByMemory] = useState<Record<string, MemoryComment[]>>({});
  const [profileNameById, setProfileNameById] = useState<Record<string, string>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<
    'admin' | 'editor' | 'viewer' | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Memory | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [likeLoadingByMemory, setLikeLoadingByMemory] = useState<Record<string, boolean>>({});
  const [commentLoadingByMemory, setCommentLoadingByMemory] = useState<
    Record<string, boolean>
  >({});
  const [deleteLoadingByMemory, setDeleteLoadingByMemory] = useState<
    Record<string, boolean>
  >({});

  const loadMemories = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);
    setCurrentUserRole(null);

    if (user?.id) {
      const { data: membershipRow } = await supabase
        .from('user_graph_memberships')
        .select('role')
        .eq('graph_id', graphId)
        .eq('profile_id', user.id)
        .maybeSingle();

      const typedMembershipRow = membershipRow as GraphMembershipRoleRow | null;
      setCurrentUserRole(typedMembershipRow?.role ?? null);
    }

    let memoriesQuery = supabase
      .from('memories')
      .select('*')
      .eq('graph_id', graphId)
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      memoriesQuery = memoriesQuery.eq('type', filter);
    }

    const { data: memoryRows } = await memoriesQuery;
    const rows = (memoryRows as MemoryRow[]) ?? [];

    if (rows.length === 0) {
      setMemories([]);
      setCommentsByMemory({});
      setLoading(false);
      return;
    }

    const memoryIds = rows.map((memory) => memory.id);

    const [{ data: likeRows }, { data: commentRows }, { data: subjectRows }] =
      await Promise.all([
        supabase
          .from('memory_likes')
          .select('memory_id,user_id')
          .in('memory_id', memoryIds),
        supabase
          .from('memory_comments')
          .select('id,memory_id,author_id,content,created_at')
          .in('memory_id', memoryIds)
          .order('created_at', { ascending: true }),
        supabase
          .from('memory_subjects')
          .select('memory_id,subject_user_id,subject_node_id')
          .in('memory_id', memoryIds),
      ]);

    const likes = (likeRows as MemoryLikeRow[]) ?? [];
    const comments = (commentRows as MemoryCommentRow[]) ?? [];
    const memorySubjects = (subjectRows as MemorySubjectRow[]) ?? [];

    const subjectUserIds = memorySubjects
      .map((subject) => subject.subject_user_id)
      .filter((id): id is string => Boolean(id));

    const profileIds = [
      ...new Set(
        rows
          .map((memory) => memory.author_id)
          .concat(comments.map((comment) => comment.author_id))
          .concat(subjectUserIds)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    const nodeSubjectIds = [
      ...new Set(
        memorySubjects
          .map((subject) => subject.subject_node_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    const [{ data: profileRows }, { data: nodeRows }] = await Promise.all([
      profileIds.length > 0
        ? supabase
            .from('profiles')
            .select('id,display_name,email')
            .in('id', profileIds)
        : Promise.resolve({ data: [] }),
      nodeSubjectIds.length > 0
        ? supabase
            .from('nodes')
            .select('id,first_name,last_name')
            .in('id', nodeSubjectIds)
        : Promise.resolve({ data: [] }),
    ]);

    const nameById = buildNameMap((profileRows as ProfileRow[]) ?? []);
    const nodeNameById: Record<string, string> = {};
    ((nodeRows as NodeSubjectRow[]) ?? []).forEach((node) => {
      nodeNameById[node.id] = formatNodeName(node);
    });
    setProfileNameById(nameById);

    const likeCountByMemory: Record<string, number> = {};
    const likedByCurrentUser = new Set<string>();
    likes.forEach((like) => {
      likeCountByMemory[like.memory_id] = (likeCountByMemory[like.memory_id] || 0) + 1;
      if (like.user_id === user?.id) {
        likedByCurrentUser.add(like.memory_id);
      }
    });

    const commentsMap: Record<string, MemoryComment[]> = {};
    comments.forEach((comment) => {
      if (!commentsMap[comment.memory_id]) {
        commentsMap[comment.memory_id] = [];
      }

      commentsMap[comment.memory_id].push({
        ...comment,
        author_name: nameById[comment.author_id] || 'Family Member',
      });
    });
    setCommentsByMemory(commentsMap);

    const subjectNamesByMemory: Record<string, string[]> = {};
    memorySubjects.forEach((subject) => {
      if (!subjectNamesByMemory[subject.memory_id]) {
        subjectNamesByMemory[subject.memory_id] = [];
      }

      const displayName = subject.subject_user_id
        ? nameById[subject.subject_user_id] || 'Family Member'
        : subject.subject_node_id
          ? nodeNameById[subject.subject_node_id] || 'Family Member'
          : 'Family Member';
      if (!subjectNamesByMemory[subject.memory_id].includes(displayName)) {
        subjectNamesByMemory[subject.memory_id].push(displayName);
      }
    });

    const normalizedMemories: Memory[] = rows.map((memory) => ({
      id: memory.id,
      type: memory.type,
      title: memory.title,
      content: memory.content,
      media_url: memory.media_url,
      event_date: memory.event_date,
      tags: memory.tags ?? [],
      created_at: memory.created_at,
      author_id: memory.author_id,
      author_name: nameById[memory.author_id] || 'Family Member',
      subject_names: subjectNamesByMemory[memory.id] || [],
      like_count: likeCountByMemory[memory.id] || 0,
      comment_count: commentsMap[memory.id]?.length || 0,
      isLiked: likedByCurrentUser.has(memory.id),
    }));

    setMemories(normalizedMemories);
    setLoading(false);
  }, [filter, graphId, supabase]);

  useEffect(() => {
    void loadMemories();
  }, [loadMemories]);

  const toggleLike = useCallback(
    async (memoryId: string) => {
      if (!currentUserId) return;

      const memory = memories.find((item) => item.id === memoryId);
      if (!memory) return;

      setLikeLoadingByMemory((current) => ({ ...current, [memoryId]: true }));

      if (memory.isLiked) {
        const { error } = await supabase
          .from('memory_likes')
          .delete()
          .eq('memory_id', memoryId)
          .eq('user_id', currentUserId);

        if (!error) {
          setMemories((current) =>
            current.map((item) =>
              item.id === memoryId
                ? {
                    ...item,
                    isLiked: false,
                    like_count: Math.max(0, item.like_count - 1),
                  }
                : item
            )
          );
        }
      } else {
        const { error } = await supabase.from('memory_likes').insert({
          memory_id: memoryId,
          user_id: currentUserId,
        });

        if (!error) {
          setMemories((current) =>
            current.map((item) =>
              item.id === memoryId
                ? {
                    ...item,
                    isLiked: true,
                    like_count: item.like_count + 1,
                  }
                : item
            )
          );
        }
      }

      setLikeLoadingByMemory((current) => ({ ...current, [memoryId]: false }));
    },
    [currentUserId, memories, supabase]
  );

  const addComment = useCallback(
    async (memoryId: string, content: string): Promise<string | null> => {
      const commentText = content.trim();
      if (!commentText) return 'Comment cannot be empty.';
      if (!currentUserId) return 'Sign in again to comment.';

      setCommentLoadingByMemory((current) => ({ ...current, [memoryId]: true }));

      const { data, error } = await supabase
        .from('memory_comments')
        .insert({
          memory_id: memoryId,
          author_id: currentUserId,
          content: commentText,
        })
        .select('id,memory_id,author_id,content,created_at')
        .single();

      if (error || !data) {
        setCommentLoadingByMemory((current) => ({ ...current, [memoryId]: false }));
        return error?.message || 'Could not add comment.';
      }

      const insertedComment = data as MemoryCommentRow;
      const authorName = profileNameById[currentUserId] || 'You';
      const nextComment: MemoryComment = {
        ...insertedComment,
        author_name: authorName,
      };

      setCommentsByMemory((current) => ({
        ...current,
        [memoryId]: [...(current[memoryId] || []), nextComment],
      }));

      setMemories((current) =>
        current.map((item) =>
          item.id === memoryId
            ? { ...item, comment_count: item.comment_count + 1 }
            : item
        )
      );

      setCommentLoadingByMemory((current) => ({ ...current, [memoryId]: false }));
      return null;
    },
    [currentUserId, profileNameById, supabase]
  );

  const deleteMemory = useCallback(
    async (memory: Memory): Promise<string | null> => {
      if (!currentUserId) return 'Sign in again to delete memories.';
      const isAuthor = memory.author_id === currentUserId;
      const isAdmin = currentUserRole === 'admin';

      if (!isAuthor && !isAdmin) {
        return 'Only the memory creator or a tree admin can delete this memory.';
      }

      setDeleteLoadingByMemory((current) => ({ ...current, [memory.id]: true }));

      try {
        const memoryImageUrls = [
          memory.media_url,
          ...extractMarkdownImageUrls(memory.content || ''),
        ].filter((url): url is string => Boolean(url));

        const memoryStoragePaths = [
          ...new Set(
            memoryImageUrls
              .map((url) => extractMemoriesStoragePath(url))
              .filter((path): path is string => Boolean(path))
          ),
        ];

        if (memoryStoragePaths.length > 0) {
          const { error: removeError } = await supabase.storage
            .from('memories')
            .remove(memoryStoragePaths);

          if (removeError && !removeError.message.toLowerCase().includes('not found')) {
            // Do not block deletion if some media files are already gone.
            console.warn('Memory media cleanup failed:', removeError.message);
          }
        }

        const { error } = await supabase
          .from('memories')
          .delete()
          .eq('id', memory.id);

        if (error) return error.message;

        setMemories((current) => current.filter((item) => item.id !== memory.id));
        setCommentsByMemory((current) => {
          const next = { ...current };
          delete next[memory.id];
          return next;
        });
        setSelectedStory((current) => (current?.id === memory.id ? null : current));

        return null;
      } finally {
        setDeleteLoadingByMemory((current) => ({ ...current, [memory.id]: false }));
      }
    },
    [currentUserId, currentUserRole, supabase]
  );

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'photo', label: 'Photos' },
    { key: 'story', label: 'Stories' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold text-earth tracking-tight">
            Memories
          </h1>
          <p className="text-bark/50 text-sm mt-1">
            Photos, stories, and documents
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreate(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-moss to-leaf text-white rounded-xl text-sm font-medium shadow-md shadow-moss/15 hover:shadow-lg transition-shadow flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Memory
        </motion.button>
      </div>

      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-bark/30 flex-shrink-0" />
        {filters.map((currentFilter) => (
          <button
            key={currentFilter.key}
            onClick={() => {
              setFilter(currentFilter.key);
              setLoading(true);
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
              filter === currentFilter.key
                ? 'bg-moss/10 text-moss border border-moss/30'
                : 'text-bark/40 hover:text-bark/60 border border-transparent'
            }`}
          >
            {currentFilter.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 text-moss animate-spin" />
        </div>
      ) : (
        <MemoryFeed
          memories={memories}
          commentsByMemory={commentsByMemory}
          onToggleLike={toggleLike}
          onAddComment={addComment}
          onOpenStory={(story) => setSelectedStory(story)}
          onDeleteMemory={deleteMemory}
          currentUserId={currentUserId}
          canDeleteAsAdmin={currentUserRole === 'admin'}
          likeLoadingByMemory={likeLoadingByMemory}
          commentLoadingByMemory={commentLoadingByMemory}
          deleteLoadingByMemory={deleteLoadingByMemory}
        />
      )}

      {showCreate && (
        <CreateMemoryModal
          graphId={graphId}
          onClose={() => setShowCreate(false)}
          onCreated={loadMemories}
        />
      )}

      <StoryViewerModal
        story={selectedStory}
        onClose={() => setSelectedStory(null)}
      />
    </div>
  );
}
