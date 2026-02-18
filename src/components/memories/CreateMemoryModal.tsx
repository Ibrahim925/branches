'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { MarkdownArticle } from '@/components/memories/MarkdownArticle';
import { buildImageCropStyle, resolveImageCrop } from '@/utils/imageCrop';
import { extractFirstMarkdownImage } from '@/utils/markdown';
import {
  X,
  Upload,
  Image as ImageIcon,
  BookOpen,
  Tag,
  Check,
  Loader2,
  Bold,
  Code2,
  Eye,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  PenSquare,
  Quote,
  Users,
} from 'lucide-react';

interface GraphMembershipRow {
  profile_id: string;
}

interface ProfileOption {
  id: string;
  display_name: string | null;
  email: string | null;
}

interface TreeNodeOption {
  id: string;
  first_name: string;
  last_name: string | null;
  claimed_by: string | null;
}

type SubjectOption =
  | {
      key: string;
      kind: 'user';
      id: string;
      label: string;
      sublabel: string;
      isCurrentUser: boolean;
    }
  | {
      key: string;
      kind: 'node';
      id: string;
      label: string;
      sublabel: string;
      isCurrentUser: false;
    };

interface Props {
  graphId: string;
  nodeId?: string;
  preselectedSubjectIds?: string[];
  preselectedSubjectNodeIds?: string[];
  onClose: () => void;
  onCreated: () => void;
}

function formatProfileName(profile: Pick<ProfileOption, 'display_name' | 'email'>): string {
  return profile.display_name?.trim() || profile.email?.trim() || 'Family Member';
}

function formatNodeName(node: Pick<TreeNodeOption, 'first_name' | 'last_name'>): string {
  const fullName = `${node.first_name || ''} ${node.last_name || ''}`.trim();
  return fullName || 'Family Member';
}

export function CreateMemoryModal({
  graphId,
  nodeId,
  preselectedSubjectIds = [],
  preselectedSubjectNodeIds = [],
  onClose,
  onCreated,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const fileRef = useRef<HTMLInputElement>(null);
  const storyImageRef = useRef<HTMLInputElement>(null);
  const storyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [type, setType] = useState<'story' | 'photo'>('photo');
  const [storyMode, setStoryMode] = useState<'write' | 'preview'>('write');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoZoom, setPhotoZoom] = useState(1);
  const [photoFocusX, setPhotoFocusX] = useState(50);
  const [photoFocusY, setPhotoFocusY] = useState(50);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [subjectQuery, setSubjectQuery] = useState('');
  const [subjectUserIds, setSubjectUserIds] = useState<string[]>([]);
  const [subjectNodeIds, setSubjectNodeIds] = useState<string[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [insertingStoryImage, setInsertingStoryImage] = useState(false);
  const [error, setError] = useState('');

  const preselectedSubjectIdsKey = useMemo(
    () =>
      [...new Set(preselectedSubjectIds.filter(Boolean))]
        .sort((a, b) => a.localeCompare(b))
        .join(','),
    [preselectedSubjectIds]
  );
  const stablePreselectedSubjectIds = useMemo(
    () => (preselectedSubjectIdsKey ? preselectedSubjectIdsKey.split(',') : []),
    [preselectedSubjectIdsKey]
  );
  const preselectedSubjectNodeIdsKey = useMemo(
    () =>
      [...new Set(preselectedSubjectNodeIds.filter(Boolean))]
        .sort((a, b) => a.localeCompare(b))
        .join(','),
    [preselectedSubjectNodeIds]
  );
  const stablePreselectedSubjectNodeIds = useMemo(
    () => (preselectedSubjectNodeIdsKey ? preselectedSubjectNodeIdsKey.split(',') : []),
    [preselectedSubjectNodeIdsKey]
  );

  useEffect(() => {
    let active = true;

    async function loadSubjectOptions() {
      setLoadingMembers(true);
      setError('');

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!user) {
        setCurrentUserId(null);
        setSubjectOptions([]);
        setSubjectUserIds([]);
        setSubjectNodeIds([]);
        setLoadingMembers(false);
        return;
      }

      setCurrentUserId(user.id);

      const [
        { data: membershipRows, error: membershipError },
        { data: nodeRows, error: nodeError },
      ] = await Promise.all([
        supabase
          .from('user_graph_memberships')
          .select('profile_id')
          .eq('graph_id', graphId),
        supabase
          .from('nodes')
          .select('id,first_name,last_name,claimed_by')
          .eq('graph_id', graphId)
          .order('first_name', { ascending: true }),
      ]);

      if (!active) return;

      const memberIds = [
        ...new Set(
          ((membershipRows as GraphMembershipRow[]) || [])
            .map((row) => row.profile_id)
            .filter(Boolean)
        ),
      ];

      const { data: profileRows, error: profileError } =
        memberIds.length > 0
          ? await supabase
              .from('profiles')
              .select('id,display_name,email')
              .in('id', memberIds)
          : { data: [], error: null };

      if (!active) return;

      if (membershipError || nodeError || profileError) {
        setError('Could not load tree members.');
        setSubjectUserIds([user.id]);
        setSubjectNodeIds([]);
        setSubjectOptions([]);
        setLoadingMembers(false);
        return;
      }

      const profiles = ((profileRows as ProfileOption[]) || []).sort((a, b) =>
        formatProfileName(a).localeCompare(formatProfileName(b))
      );
      const graphNodes = (nodeRows as TreeNodeOption[]) || [];
      const unclaimedNodes = graphNodes.filter((node) => !node.claimed_by);

      const userOptions: SubjectOption[] = profiles.map((profile) => ({
        key: `user:${profile.id}`,
        kind: 'user',
        id: profile.id,
        label: formatProfileName(profile),
        sublabel: profile.email || 'No email',
        isCurrentUser: profile.id === user.id,
      }));

      const nodeOptions: SubjectOption[] = unclaimedNodes.map((node) => ({
        key: `node:${node.id}`,
        kind: 'node',
        id: node.id,
        label: formatNodeName(node),
        sublabel: 'Unclaimed person',
        isCurrentUser: false,
      }));

      const options = [...userOptions, ...nodeOptions].sort((a, b) =>
        a.label.localeCompare(b.label)
      );

      const userOptionIdSet = new Set(
        options.filter((option) => option.kind === 'user').map((option) => option.id)
      );
      const nodeOptionIdSet = new Set(
        options.filter((option) => option.kind === 'node').map((option) => option.id)
      );

      const defaultUserIds = [
        ...new Set([user.id, ...stablePreselectedSubjectIds]),
      ].filter((id) => userOptionIdSet.has(id));

      const defaultNodeIds = [...new Set(stablePreselectedSubjectNodeIds)].filter((id) =>
        nodeOptionIdSet.has(id)
      );

      const selectedNode = graphNodes.find((node) => node.id === nodeId);
      if (selectedNode && !selectedNode.claimed_by && nodeOptionIdSet.has(selectedNode.id)) {
        defaultNodeIds.push(selectedNode.id);
      }

      const normalizedDefaultNodeIds = [...new Set(defaultNodeIds)];
      const normalizedDefaultUserIds =
        defaultUserIds.length > 0 || normalizedDefaultNodeIds.length > 0
          ? defaultUserIds
          : userOptionIdSet.has(user.id)
            ? [user.id]
            : [];

      setSubjectOptions(options);
      setSubjectUserIds(normalizedDefaultUserIds);
      setSubjectNodeIds(normalizedDefaultNodeIds);
      setLoadingMembers(false);
    }

    void loadSubjectOptions();

    return () => {
      active = false;
    };
  }, [
    graphId,
    nodeId,
    preselectedSubjectIdsKey,
    preselectedSubjectNodeIdsKey,
    stablePreselectedSubjectIds,
    stablePreselectedSubjectNodeIds,
    supabase,
  ]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPhotoZoom(1);
    setPhotoFocusX(50);
    setPhotoFocusY(50);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(f);
    }
  }

  function restoreStorySelection(start: number, end = start) {
    requestAnimationFrame(() => {
      const textarea = storyTextareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(start, end);
    });
  }

  function wrapStorySelection(
    prefix: string,
    suffix: string,
    placeholder: string,
  ) {
    const textarea = storyTextareaRef.current;
    if (!textarea) {
      setContent((current) => `${current}${prefix}${placeholder}${suffix}`);
      return;
    }

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const selected = content.slice(selectionStart, selectionEnd) || placeholder;
    const nextContent = `${content.slice(0, selectionStart)}${prefix}${selected}${suffix}${content.slice(selectionEnd)}`;
    const nextSelectionStart = selectionStart + prefix.length;
    const nextSelectionEnd = nextSelectionStart + selected.length;

    setContent(nextContent);
    restoreStorySelection(nextSelectionStart, nextSelectionEnd);
  }

  function prependToCurrentStoryLine(prefix: string) {
    const textarea = storyTextareaRef.current;
    if (!textarea) {
      setContent((current) => `${current}\n${prefix}`);
      return;
    }

    const cursor = textarea.selectionStart;
    const lineStart = content.lastIndexOf('\n', Math.max(0, cursor - 1)) + 1;
    const nextContent = `${content.slice(0, lineStart)}${prefix}${content.slice(lineStart)}`;
    const nextCursor = cursor + prefix.length;

    setContent(nextContent);
    restoreStorySelection(nextCursor);
  }

  async function handleStoryImageInsert(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const image = e.target.files?.[0];
    if (!image) return;

    setError('');
    setInsertingStoryImage(true);

    const textarea = storyTextareaRef.current;
    const insertAt = textarea?.selectionStart ?? content.length;
    const ext = image.name.split('.').pop() || 'png';
    const path = `${graphId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('memories')
      .upload(path, image);

    if (uploadError) {
      setError(`Image upload failed: ${uploadError.message}`);
      setInsertingStoryImage(false);
      e.target.value = '';
      return;
    }

    const { data: urlData } = supabase.storage.from('memories').getPublicUrl(path);
    const alt = image.name.replace(/\.[^/.]+$/, '').trim() || 'Story image';
    const snippet = `\n![${alt}](${urlData.publicUrl})\n`;
    const nextCursor = insertAt + snippet.length;

    setContent((current) => {
      const safeIndex = Math.max(0, Math.min(insertAt, current.length));
      return `${current.slice(0, safeIndex)}${snippet}${current.slice(safeIndex)}`;
    });

    restoreStorySelection(nextCursor);
    setInsertingStoryImage(false);
    e.target.value = '';
  }

  function toggleSubject(option: SubjectOption) {
    if (option.kind === 'user') {
      setSubjectUserIds((current) => {
        if (current.includes(option.id)) {
          return current.filter((id) => id !== option.id);
        }
        return [...current, option.id];
      });
      return;
    }

    setSubjectNodeIds((current) => {
      if (current.includes(option.id)) {
        return current.filter((id) => id !== option.id);
      }
      return [...current, option.id];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (type === 'story' && !content.trim()) {
      setError('Story content is required');
      return;
    }
    if (type === 'photo' && !file) {
      setError('Please upload a photo');
      return;
    }
    if (subjectUserIds.length === 0 && subjectNodeIds.length === 0) {
      setError('Tag at least one person for this memory.');
      return;
    }

    setUploading(true);
    setError('');

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError('Please sign in again');
      setUploading(false);
      return;
    }

    let mediaUrl: string | null = null;
    let mediaType: string | null = null;

    // Upload file to Supabase Storage for photo memories
    if (type === 'photo' && file) {
      const ext = file.name.split('.').pop();
      const path = `${graphId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('memories')
        .upload(path, file);

      if (uploadError) {
        setError('Upload failed: ' + uploadError.message);
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('memories')
        .getPublicUrl(path);

      mediaUrl = urlData.publicUrl;
      mediaType = file.type;
    }

    if (type === 'story') {
      const firstImage = extractFirstMarkdownImage(content);
      if (firstImage) {
        mediaUrl = firstImage;
        mediaType = 'image/markdown';
      }
    }

    const normalizedContent = content.replace(/\r\n/g, '\n');
    const parsedTags = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const normalizedPhotoCrop = resolveImageCrop(
      {
        zoom: photoZoom,
        focusX: photoFocusX,
        focusY: photoFocusY,
      },
      { minZoom: 1, maxZoom: 3 }
    );

    const createPayload = {
      _graph_id: graphId,
      _node_id: nodeId || null,
      _type: type,
      _title: title.trim(),
      _content: normalizedContent.trim() ? normalizedContent : null,
      _media_url: mediaUrl,
      _media_type: mediaType,
      _event_date: eventDate || null,
      _tags: parsedTags,
      _subject_user_ids: subjectUserIds,
      _subject_node_ids: subjectNodeIds,
      _media_zoom: normalizedPhotoCrop.zoom,
      _media_focus_x: normalizedPhotoCrop.focusX,
      _media_focus_y: normalizedPhotoCrop.focusY,
    };

    let { error: insertError } = await supabase.rpc(
      'create_memory_with_subjects',
      createPayload
    );

    if (
      insertError &&
      /does not exist|unknown|unexpected|function/i.test(insertError.message || '')
    ) {
      const legacyPayload = {
        ...createPayload,
      };
      delete (legacyPayload as Record<string, unknown>)._media_zoom;
      delete (legacyPayload as Record<string, unknown>)._media_focus_x;
      delete (legacyPayload as Record<string, unknown>)._media_focus_y;

      const fallbackResult = await supabase.rpc(
        'create_memory_with_subjects',
        legacyPayload
      );
      insertError = fallbackResult.error;
    }

    if (insertError) {
      setError('Failed to save: ' + insertError.message);
      setUploading(false);
      return;
    }

    setUploading(false);
    onCreated();
    onClose();
  }

  const types = [
    { key: 'photo' as const, icon: ImageIcon, label: 'Photo' },
    { key: 'story' as const, icon: BookOpen, label: 'Story' },
  ];

  const filteredSubjects = subjectOptions.filter((option) => {
    if (!subjectQuery.trim()) return true;
    const normalizedQuery = subjectQuery.trim().toLowerCase();
    return (
      option.label.toLowerCase().includes(normalizedQuery) ||
      option.sublabel.toLowerCase().includes(normalizedQuery)
    );
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] overflow-y-auto"
        >
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4">
              <h2 className="text-lg font-semibold text-earth">
                Add Memory
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 hover:bg-stone/50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-bark/40" />
              </button>
            </div>

            <div className="px-6 space-y-4">
              {/* Type selector */}
              <div className="flex gap-2">
                {types.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      setType(t.key);
                      setError('');
                      if (t.key === 'story') {
                        setFile(null);
                        setPreview(null);
                      }
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      type === t.key
                        ? 'bg-moss/10 text-moss border-2 border-moss/30'
                        : 'bg-stone/20 text-bark/50 border-2 border-transparent'
                    }`}
                  >
                    <t.icon className="w-4 h-4" />
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Title */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                className="w-full px-4 py-3 rounded-xl border border-stone focus:outline-none focus:ring-2 focus:ring-moss/50 text-sm text-earth placeholder:text-bark/30"
              />

              {/* Content */}
              {type === 'story' ? (
                <div className="space-y-2">
                  <input
                    ref={storyImageRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handleStoryImageInsert(e)}
                    className="hidden"
                  />

                  <div className="rounded-xl border border-stone overflow-hidden">
                    <div className="flex items-center justify-between gap-3 px-2 py-2 bg-stone/20 border-b border-stone/40">
                      <div className="flex items-center gap-1 flex-wrap">
                        <button
                          type="button"
                          title="Heading 1"
                          aria-label="Heading 1"
                          onClick={() => prependToCurrentStoryLine('# ')}
                          className="w-8 h-8 rounded-lg text-bark/60 hover:text-moss hover:bg-white/85 flex items-center justify-center transition-colors"
                        >
                          <Heading1 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Heading 2"
                          aria-label="Heading 2"
                          onClick={() => prependToCurrentStoryLine('## ')}
                          className="w-8 h-8 rounded-lg text-bark/60 hover:text-moss hover:bg-white/85 flex items-center justify-center transition-colors"
                        >
                          <Heading2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Heading 3"
                          aria-label="Heading 3"
                          onClick={() => prependToCurrentStoryLine('### ')}
                          className="w-8 h-8 rounded-lg text-bark/60 hover:text-moss hover:bg-white/85 flex items-center justify-center transition-colors"
                        >
                          <Heading3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Bold"
                          aria-label="Bold"
                          onClick={() => wrapStorySelection('**', '**', 'bold text')}
                          className="w-8 h-8 rounded-lg text-bark/60 hover:text-moss hover:bg-white/85 flex items-center justify-center transition-colors"
                        >
                          <Bold className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Italic"
                          aria-label="Italic"
                          onClick={() => wrapStorySelection('*', '*', 'italic text')}
                          className="w-8 h-8 rounded-lg text-bark/60 hover:text-moss hover:bg-white/85 flex items-center justify-center transition-colors"
                        >
                          <Italic className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Bullet list"
                          aria-label="Bullet list"
                          onClick={() => prependToCurrentStoryLine('- ')}
                          className="w-8 h-8 rounded-lg text-bark/60 hover:text-moss hover:bg-white/85 flex items-center justify-center transition-colors"
                        >
                          <List className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Numbered list"
                          aria-label="Numbered list"
                          onClick={() => prependToCurrentStoryLine('1. ')}
                          className="w-8 h-8 rounded-lg text-bark/60 hover:text-moss hover:bg-white/85 flex items-center justify-center transition-colors"
                        >
                          <ListOrdered className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Quote"
                          aria-label="Quote"
                          onClick={() => prependToCurrentStoryLine('> ')}
                          className="w-8 h-8 rounded-lg text-bark/60 hover:text-moss hover:bg-white/85 flex items-center justify-center transition-colors"
                        >
                          <Quote className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Link"
                          aria-label="Link"
                          onClick={() =>
                            wrapStorySelection('[', '](https://example.com)', 'link text')
                          }
                          className="w-8 h-8 rounded-lg text-bark/60 hover:text-moss hover:bg-white/85 flex items-center justify-center transition-colors"
                        >
                          <LinkIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Code block"
                          aria-label="Code block"
                          onClick={() =>
                            wrapStorySelection('```\n', '\n```', 'const message = "Hello";')
                          }
                          className="w-8 h-8 rounded-lg text-bark/60 hover:text-moss hover:bg-white/85 flex items-center justify-center transition-colors"
                        >
                          <Code2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Insert image"
                          aria-label="Insert image"
                          onClick={() => storyImageRef.current?.click()}
                          disabled={insertingStoryImage}
                          className="w-8 h-8 rounded-lg text-bark/60 hover:text-moss hover:bg-white/85 flex items-center justify-center transition-colors disabled:opacity-50"
                        >
                          {insertingStoryImage ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ImageIcon className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center rounded-lg bg-white/80 p-1 border border-stone/40">
                        <button
                          type="button"
                          onClick={() => setStoryMode('write')}
                          className={`px-2.5 py-1 text-xs rounded-md flex items-center gap-1.5 transition-colors ${
                            storyMode === 'write'
                              ? 'bg-moss/15 text-moss'
                              : 'text-bark/45 hover:text-bark/70'
                          }`}
                        >
                          <PenSquare className="w-3 h-3" />
                          Write
                        </button>
                        <button
                          type="button"
                          onClick={() => setStoryMode('preview')}
                          className={`px-2.5 py-1 text-xs rounded-md flex items-center gap-1.5 transition-colors ${
                            storyMode === 'preview'
                              ? 'bg-moss/15 text-moss'
                              : 'text-bark/45 hover:text-bark/70'
                          }`}
                        >
                          <Eye className="w-3 h-3" />
                          Preview
                        </button>
                      </div>
                    </div>

                    {storyMode === 'write' ? (
                      <textarea
                        ref={storyTextareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Write your story in markdown..."
                        rows={12}
                        className="w-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-moss/50 text-sm text-earth placeholder:text-bark/30 resize-y min-h-[250px]"
                      />
                    ) : (
                      <div className="max-h-[360px] overflow-y-auto p-4 bg-white">
                        {content.trim() ? (
                          <MarkdownArticle markdown={content} />
                        ) : (
                          <p className="text-sm text-bark/40">Start writing to preview your story.</p>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-bark/45">
                    Use headings, lists, links, quotes, and images. The first image becomes the story thumbnail.
                  </p>
                </div>
              ) : (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Add a caption or notes..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-stone focus:outline-none focus:ring-2 focus:ring-moss/50 text-sm text-earth placeholder:text-bark/30 resize-none"
                />
              )}

              {/* File upload */}
              {type === 'photo' && (
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {preview ? (
                    <div className="relative rounded-xl border border-stone/35 bg-stone/10 p-3 space-y-3">
                      <div className="relative mx-auto w-full max-w-[260px] aspect-[4/5] rounded-xl overflow-hidden border border-stone/35 bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={preview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          style={buildImageCropStyle(
                            {
                              zoom: photoZoom,
                              focusX: photoFocusX,
                              focusY: photoFocusY,
                            },
                            { minZoom: 1, maxZoom: 3 }
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-2.5">
                        <label className="text-xs text-bark/55 flex items-center justify-between gap-3">
                          <span>Zoom</span>
                          <span className="tabular-nums text-bark/45">
                            {photoZoom.toFixed(2)}x
                          </span>
                          <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.01}
                            value={photoZoom}
                            onChange={(event) => setPhotoZoom(Number(event.target.value))}
                            className="flex-1 accent-moss"
                          />
                        </label>
                        <label className="text-xs text-bark/55 flex items-center justify-between gap-3">
                          <span>X</span>
                          <span className="tabular-nums text-bark/45">
                            {Math.round(photoFocusX)}%
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={photoFocusX}
                            onChange={(event) => setPhotoFocusX(Number(event.target.value))}
                            className="flex-1 accent-moss"
                          />
                        </label>
                        <label className="text-xs text-bark/55 flex items-center justify-between gap-3">
                          <span>Y</span>
                          <span className="tabular-nums text-bark/45">
                            {Math.round(photoFocusY)}%
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={photoFocusY}
                            onChange={(event) => setPhotoFocusY(Number(event.target.value))}
                            className="flex-1 accent-moss"
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFile(null);
                          setPreview(null);
                          setPhotoZoom(1);
                          setPhotoFocusX(50);
                          setPhotoFocusY(50);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-black/40 rounded-full"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-full py-8 border-2 border-dashed border-stone rounded-xl text-bark/40 hover:border-moss/40 hover:text-moss transition-colors flex flex-col items-center gap-2"
                    >
                      <Upload className="w-6 h-6" />
                      <span className="text-sm">Click to upload a photo</span>
                    </button>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs text-bark/50 mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Tagged People
                </label>

                <div className="rounded-xl border border-stone p-3 space-y-2">
                  <input
                    type="text"
                    value={subjectQuery}
                    onChange={(event) => setSubjectQuery(event.target.value)}
                    placeholder="Search people in this tree..."
                    className="w-full px-3 py-2 rounded-lg border border-stone/70 focus:outline-none focus:ring-2 focus:ring-moss/45 text-sm text-earth placeholder:text-bark/35"
                  />

                  {loadingMembers ? (
                    <div className="text-xs text-bark/45 flex items-center gap-2 py-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Loading people...
                    </div>
                  ) : filteredSubjects.length === 0 ? (
                    <p className="text-xs text-bark/45 py-1">
                      No matching people.
                    </p>
                  ) : (
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {filteredSubjects.map((subject) => {
                        const isSelected =
                          subject.kind === 'user'
                            ? subjectUserIds.includes(subject.id)
                            : subjectNodeIds.includes(subject.id);
                        const isCurrentUser =
                          subject.kind === 'user' && currentUserId === subject.id;

                        return (
                          <button
                            key={subject.key}
                            type="button"
                            onClick={() => toggleSubject(subject)}
                            className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left text-sm transition-colors ${
                              isSelected
                                ? 'bg-moss/12 border border-moss/30 text-earth'
                                : 'hover:bg-stone/25 text-bark/75 border border-transparent'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="truncate">
                                {subject.label}
                                {isCurrentUser ? ' (You)' : ''}
                              </p>
                              <p className="text-[11px] text-bark/45 truncate">
                                {subject.sublabel}
                              </p>
                            </div>
                            {isSelected ? (
                              <Check className="w-4 h-4 text-moss shrink-0" />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-bark/45">
                  Tag at least one person in this tree.
                </p>
              </div>

              {/* Date */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-bark/50 mb-1 block">
                    Event Date
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone focus:outline-none focus:ring-2 focus:ring-moss/50 text-sm text-earth"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-bark/50 mb-1 flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    Tags
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="wedding, birthday"
                    className="w-full px-4 py-2.5 rounded-xl border border-stone focus:outline-none focus:ring-2 focus:ring-moss/50 text-sm text-earth placeholder:text-bark/30"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-error">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 pt-4">
              <button
                type="submit"
                disabled={uploading}
                className="w-full py-3 bg-gradient-to-r from-moss to-leaf text-white rounded-xl font-medium shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Memory'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
