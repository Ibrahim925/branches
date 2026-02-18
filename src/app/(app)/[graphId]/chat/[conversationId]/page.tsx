'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { nativeBridge } from '@/lib/native';
import { trackPerformanceMetric } from '@/lib/telemetry/performance';
import { buildImageCropStyle } from '@/utils/imageCrop';
import { motion } from 'framer-motion';
import { ArrowLeft, ImagePlus, Loader2, Send, X } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/system/Skeleton';

type Message = {
  id: string;
  content: string | null;
  image_url: string | null;
  image_type: string | null;
  sender_id: string;
  created_at: string;
};

type ConversationInfo = {
  id: string;
  name: string | null;
  type: 'direct' | 'group' | 'tree';
  participant_ids: string[];
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  avatar_zoom: number | null;
  avatar_focus_x: number | null;
  avatar_focus_y: number | null;
};

type TypingRow = {
  user_id: string;
  updated_at: string;
};

type CachedProfile = {
  name: string;
  initials: string;
  avatarUrl: string | null;
  avatarZoom: number | null;
  avatarFocusX: number | null;
  avatarFocusY: number | null;
};

type MessageGroup = {
  id: string;
  senderId: string;
  messages: Message[];
  startsAt: string;
  endsAt: string;
  showTimestamp: boolean;
};

const TYPING_IDLE_MS = 1200;
const TYPING_TTL_MS = 2600;
const TYPING_POLL_INTERVAL_MS = 900;
const MESSAGE_POLL_INTERVAL_MS = 1500;
const MESSAGE_GROUP_WINDOW_MS = 3 * 60 * 1000;
const TIMESTAMP_BREAK_MS = 8 * 60 * 1000;

function formatProfileName(profile: Pick<ProfileRow, 'display_name' | 'email'>): string {
  return profile.display_name?.trim() || profile.email?.trim() || 'Unknown';
}

function toEpoch(dateIso: string) {
  const timestamp = new Date(dateIso).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ME';
  if (parts.length === 1) return (parts[0]?.[0] || 'M').toUpperCase();
  return `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase();
}

function toCachedProfile(profile: ProfileRow): CachedProfile {
  const name = formatProfileName(profile);
  return {
    name,
    initials: getInitials(name),
    avatarUrl: profile.avatar_url,
    avatarZoom: profile.avatar_zoom,
    avatarFocusX: profile.avatar_focus_x,
    avatarFocusY: profile.avatar_focus_y,
  };
}

export default function ChatThreadPage() {
  const { graphId, conversationId } = useParams<{
    graphId: string;
    conversationId: string;
  }>();
  const supabase = useMemo(() => createClient(), []);

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<ConversationInfo | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileCache, setProfileCache] = useState<Record<string, CachedProfile>>({});
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const draftStorageKey = useMemo(
    () => `branches:draft:chat:${graphId}:${conversationId}`,
    [conversationId, graphId]
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileCacheRef = useRef<Record<string, CachedProfile>>({});
  const typingStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localTypingRef = useRef(false);
  const isRefreshingMessagesRef = useRef(false);
  const imagePreviewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    profileCacheRef.current = profileCache;
  }, [profileCache]);

  useEffect(() => {
    imagePreviewUrlRef.current = imagePreviewUrl;
  }, [imagePreviewUrl]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const cachedDraft = window.localStorage.getItem(draftStorageKey);
    const nextDraft = cachedDraft || '';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNewMessage(nextDraft);
  }, [draftStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (newMessage.trim()) {
      window.localStorage.setItem(draftStorageKey, newMessage);
      return;
    }

    window.localStorage.removeItem(draftStorageKey);
  }, [draftStorageKey, newMessage]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }, 80);
  }, []);

  const mergeMessages = useCallback((incomingMessages: Message[]) => {
    if (incomingMessages.length === 0) return;

    setMessages((current) => {
      const byId = new Map(current.map((message) => [message.id, message] as const));
      incomingMessages.forEach((message) => {
        byId.set(message.id, message);
      });

      return Array.from(byId.values()).sort((left, right) =>
        left.created_at.localeCompare(right.created_at)
      );
    });
  }, []);

  const ensureProfilesLoaded = useCallback(
    async (profileIds: string[]) => {
      const uniqueProfileIds = [...new Set(profileIds.filter(Boolean))];
      if (uniqueProfileIds.length === 0) return;

      const missingProfileIds = uniqueProfileIds.filter(
        (profileId) => !profileCacheRef.current[profileId]
      );
      if (missingProfileIds.length === 0) return;

      const { data: profileRows } = await supabase
        .from('profiles')
        .select(
          'id,display_name,email,avatar_url,avatar_zoom,avatar_focus_x,avatar_focus_y'
        )
        .in('id', missingProfileIds);

      const rows = (profileRows as ProfileRow[]) ?? [];
      if (rows.length === 0) return;

      setProfileCache((current) => {
        const next = { ...current };
        rows.forEach((profile) => {
          next[profile.id] = toCachedProfile(profile);
        });
        return next;
      });
    },
    [supabase]
  );

  const refreshMessages = useCallback(
    async (scrollAfterRefresh = false) => {
      if (isRefreshingMessagesRef.current) return;
      isRefreshingMessagesRef.current = true;

      const { data: messageRows } = await supabase
        .from('messages')
        .select('id,content,image_url,image_type,sender_id,created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      const rows = (messageRows as Message[]) ?? [];
      mergeMessages(rows);
      await ensureProfilesLoaded(rows.map((message) => message.sender_id));

      isRefreshingMessagesRef.current = false;

      if (scrollAfterRefresh) {
        scrollToBottom();
      }
    },
    [conversationId, ensureProfilesLoaded, mergeMessages, scrollToBottom, supabase]
  );

  const refreshTypingUsers = useCallback(async () => {
    if (!currentUserId) return;

    const cutoffIso = new Date(Date.now() - TYPING_TTL_MS).toISOString();
    const { data } = await supabase
      .from('conversation_typing')
      .select('user_id,updated_at')
      .eq('conversation_id', conversationId)
      .gt('updated_at', cutoffIso)
      .neq('user_id', currentUserId);

    const rows = (data as TypingRow[]) ?? [];
    await ensureProfilesLoaded(rows.map((row) => row.user_id));
    setTypingUserIds([...new Set(rows.map((row) => row.user_id))]);
  }, [conversationId, currentUserId, ensureProfilesLoaded, supabase]);

  const loadConversation = useCallback(async () => {
    const startedAt = typeof performance !== 'undefined' ? performance.now() : null;
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCurrentUserId(null);
      setConversation(null);
      setMessages([]);
      setTypingUserIds([]);
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    const [{ data: conversationRow }, { data: participantRows }] = await Promise.all([
      supabase
        .from('conversations')
        .select('id,name,type')
        .eq('id', conversationId)
        .single(),
      supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId),
    ]);

    if (!conversationRow) {
      setConversation(null);
      setMessages([]);
      setTypingUserIds([]);
      setLoading(false);
      return;
    }

    const participantIds = [
      ...new Set(
        ((participantRows as Array<{ user_id: string }> | null) ?? []).map(
          (row) => row.user_id
        )
      ),
    ];

    setConversation({
      ...(conversationRow as Omit<ConversationInfo, 'participant_ids'>),
      participant_ids: participantIds,
    });

    await ensureProfilesLoaded(participantIds);
    await refreshMessages(true);
    await refreshTypingUsers();
    setLoading(false);

    if (startedAt !== null) {
      trackPerformanceMetric('chat.load_conversation.ms', performance.now() - startedAt, {
        graphId,
        conversationId,
        participantCount: participantIds.length,
      });
    }
  }, [
    graphId,
    conversationId,
    ensureProfilesLoaded,
    refreshMessages,
    refreshTypingUsers,
    supabase,
  ]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incomingMessage = payload.new as Message;
          mergeMessages([incomingMessage]);
          void ensureProfilesLoaded([incomingMessage.sender_id]);
          scrollToBottom();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void refreshMessages();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    conversationId,
    ensureProfilesLoaded,
    mergeMessages,
    refreshMessages,
    scrollToBottom,
    supabase,
  ]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void refreshMessages();
    }, MESSAGE_POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [refreshMessages]);

  const setTypingHeartbeat = useCallback(async () => {
    if (!currentUserId) return;

    await supabase.from('conversation_typing').upsert({
      conversation_id: conversationId,
      user_id: currentUserId,
      updated_at: new Date().toISOString(),
    });
  }, [conversationId, currentUserId, supabase]);

  const stopLocalTyping = useCallback(async () => {
    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
      typingStopTimeoutRef.current = null;
    }

    if (!localTypingRef.current || !currentUserId) return;

    localTypingRef.current = false;
    await supabase
      .from('conversation_typing')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', currentUserId);
  }, [conversationId, currentUserId, supabase]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void refreshTypingUsers();
    }, TYPING_POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [refreshTypingUsers]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!localTypingRef.current) return;
      void setTypingHeartbeat();
    }, TYPING_POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [setTypingHeartbeat]);

  useEffect(() => {
    return () => {
      void stopLocalTyping();
      if (imagePreviewUrlRef.current) {
        URL.revokeObjectURL(imagePreviewUrlRef.current);
      }
    };
  }, [stopLocalTyping]);

  function clearSelectedImage() {
    if (imagePreviewUrlRef.current) {
      URL.revokeObjectURL(imagePreviewUrlRef.current);
    }
    setSelectedImage(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setNewMessage(value);

    if (!currentUserId) return;

    if (!value.trim()) {
      void stopLocalTyping();
      return;
    }

    if (!localTypingRef.current) {
      localTypingRef.current = true;
      void setTypingHeartbeat();
    }

    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
    }

    typingStopTimeoutRef.current = setTimeout(() => {
      void stopLocalTyping();
    }, TYPING_IDLE_MS);
  }

  function applySelectedImage(file: File) {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSendError('Only image files are supported.');
      return;
    }

    clearSelectedImage();
    setSelectedImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setSendError(null);
  }

  function handleImageSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    applySelectedImage(file);
  }

  async function handleAttachImage() {
    if (nativeBridge.isNativeApp()) {
      const file = await nativeBridge.pickImage();
      if (file) {
        applySelectedImage(file);
      }
      return;
    }

    fileInputRef.current?.click();
  }

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!currentUserId) return;

    const content = newMessage.trim();
    const imageFile = selectedImage;

    if (!content && !imageFile) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSendError('You are offline. Message sending will resume when reconnected.');
      return;
    }

    setSending(true);
    setSendError(null);
    await stopLocalTyping();
    const sendStartedAt = typeof performance !== 'undefined' ? performance.now() : null;

    let imageUrl: string | null = null;
    let imageType: string | null = null;

    if (imageFile) {
      const ext = imageFile.name.split('.').pop() || 'jpg';
      const path = `${graphId}/${conversationId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(path, imageFile, {
          cacheControl: '3600',
          contentType: imageFile.type,
          upsert: false,
        });

      if (uploadError) {
        setSendError(uploadError.message || 'Could not upload image.');
        setSending(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('chat-media')
        .getPublicUrl(path);

      imageUrl = urlData.publicUrl;
      imageType = imageFile.type;
    }

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: content || null,
      image_url: imageUrl,
      image_type: imageType,
    });

    if (error) {
      setSendError(error.message || 'Could not send message.');
      setSending(false);
      return;
    }

    setNewMessage('');
    clearSelectedImage();
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(draftStorageKey);
    }
    await refreshMessages(true);
    setSending(false);
    inputRef.current?.focus();

    if (sendStartedAt !== null) {
      trackPerformanceMetric('chat.send_message.ms', performance.now() - sendStartedAt, {
        graphId,
        conversationId,
        hasImage: Boolean(imageFile),
      });
    }
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }

  const conversationTitle = (() => {
    if (!conversation) return 'Conversation';
    if (conversation.type !== 'direct') {
      return conversation.name || (conversation.type === 'tree' ? 'Full Tree Chat' : 'Group Chat');
    }

    const otherParticipantId = conversation.participant_ids.find(
      (participantId) => participantId !== currentUserId
    );

    if (!otherParticipantId) return 'Direct Message';
    return profileCache[otherParticipantId]?.name || 'Direct Message';
  })();

  const typingNames = typingUserIds.map((userId) => profileCache[userId]?.name || 'Someone');
  const typingLabel =
    typingNames.length === 0
      ? ''
      : typingNames.length === 1
        ? `${typingNames[0]} is typing...`
        : `${typingNames.slice(0, 2).join(', ')} are typing...`;

  const groupedMessages = useMemo<MessageGroup[]>(() => {
    if (messages.length === 0) return [];

    const groups: Array<Omit<MessageGroup, 'showTimestamp'>> = [];

    messages.forEach((message) => {
      const currentTimestamp = toEpoch(message.created_at);
      const previousGroup = groups[groups.length - 1];

      if (!previousGroup) {
        groups.push({
          id: message.id,
          senderId: message.sender_id,
          messages: [message],
          startsAt: message.created_at,
          endsAt: message.created_at,
        });
        return;
      }

      const lastGroupMessage = previousGroup.messages[previousGroup.messages.length - 1];
      const lastTimestamp = toEpoch(lastGroupMessage.created_at);
      const withinWindow =
        currentTimestamp >= lastTimestamp &&
        currentTimestamp - lastTimestamp <= MESSAGE_GROUP_WINDOW_MS;
      const sameSender = previousGroup.senderId === message.sender_id;

      if (sameSender && withinWindow) {
        previousGroup.messages.push(message);
        previousGroup.endsAt = message.created_at;
        return;
      }

      groups.push({
        id: message.id,
        senderId: message.sender_id,
        messages: [message],
        startsAt: message.created_at,
        endsAt: message.created_at,
      });
    });

    return groups.map((group, index) => {
      const nextGroup = groups[index + 1];
      const isLastGroup = index === groups.length - 1;
      const gapToNext = nextGroup ? toEpoch(nextGroup.startsAt) - toEpoch(group.endsAt) : Infinity;

      return {
        ...group,
        showTimestamp: isLastGroup || gapToNext >= TIMESTAMP_BREAK_MS,
      };
    });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center gap-3 border-b border-stone/30 bg-white/60 px-4 pb-3 pt-[calc(var(--safe-area-top)+0.75rem)] backdrop-blur-sm">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div>
            <Skeleton className="h-4 w-36 rounded-md" />
            <Skeleton className="mt-1 h-3 w-24 rounded-md" />
          </div>
        </div>
        <div className="flex-1 space-y-4 px-4 py-6">
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              key={index}
              className={`flex ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}
            >
              <Skeleton className="h-12 w-48 rounded-2xl" />
            </div>
          ))}
        </div>
        <div className="border-t border-stone/30 bg-white/60 px-4 pt-3 pb-[calc(var(--mobile-tab-bar-offset)+var(--keyboard-inset)+0.35rem)] backdrop-blur-sm">
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <p className="text-sm text-bark/50">Conversation not found.</p>
        <Link href={`/${graphId}/chat`} className="mt-3 text-sm text-moss font-medium hover:underline">
          Back to chats
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 px-4 pt-[calc(var(--safe-area-top)+0.75rem)] pb-3 border-b border-stone/30 bg-white/60 backdrop-blur-sm">
        <Link
          href={`/${graphId}/chat`}
          className="tap-target p-2 hover:bg-stone/30 rounded-lg transition-colors"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="w-5 h-5 text-bark/50" />
        </Link>
        <div>
          <h2 className="text-sm font-semibold text-earth">{conversationTitle}</h2>
          <p className="text-xs text-bark/40 capitalize">
            {conversation.type === 'tree' ? 'Full tree chat' : `${conversation.type} chat`}
          </p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-bark/30 text-sm py-10">
            No messages yet. Say hello!
          </div>
        ) : (
          groupedMessages.map((group) => {
            const isOwn = group.senderId === currentUserId;
            const senderProfile = profileCache[group.senderId];
            const senderName = senderProfile?.name || 'Unknown';
            const showSenderName = !isOwn && conversation.type !== 'direct';

            return (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex max-w-[88%] items-end gap-2 ${
                    isOwn ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-stone/35 bg-gradient-to-br from-moss/90 to-leaf/90">
                    {senderProfile?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={senderProfile.avatarUrl}
                        alt={senderName}
                        className="h-full w-full object-cover"
                        style={buildImageCropStyle(
                          {
                            zoom: senderProfile.avatarZoom,
                            focusX: senderProfile.avatarFocusX,
                            focusY: senderProfile.avatarFocusY,
                          },
                          { minZoom: 1, maxZoom: 3 }
                        )}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-white">
                        {senderProfile?.initials || 'ME'}
                      </div>
                    )}
                  </div>

                  <div className={`flex min-w-0 flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                    {showSenderName ? (
                      <p className="mb-1 px-1 text-xs text-bark/40">{senderName}</p>
                    ) : null}

                    <div className="space-y-1.5">
                      {group.messages.map((message, messageIndex) => {
                        const isLastInGroup = messageIndex === group.messages.length - 1;

                        return (
                          <div key={message.id} className="max-w-[min(78vw,34rem)]">
                            {message.image_url ? (
                              <div className="overflow-hidden rounded-2xl border border-stone/35 bg-white shadow-sm">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={message.image_url}
                                  alt="Chat attachment"
                                  className="max-h-80 w-auto object-cover"
                                />
                              </div>
                            ) : null}

                            {message.content ? (
                              <div
                                className={`px-4 py-2.5 text-sm leading-relaxed ${
                                  message.image_url ? 'mt-2' : ''
                                } ${
                                  isOwn
                                    ? `bg-gradient-to-r from-moss to-leaf text-white ${
                                        isLastInGroup ? 'rounded-br-md' : 'rounded-br-2xl'
                                      } rounded-2xl`
                                    : `bg-stone/30 text-earth ${
                                        isLastInGroup ? 'rounded-bl-md' : 'rounded-bl-2xl'
                                      } rounded-2xl`
                                }`}
                              >
                                {message.content}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    {group.showTimestamp ? (
                      <p
                        className={`mt-1 px-1 text-[10px] text-bark/30 ${
                          isOwn ? 'text-right' : 'text-left'
                        }`}
                      >
                        {formatTime(group.endsAt)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <div className="px-4 min-h-5 text-xs text-bark/45">{typingLabel}</div>

      {imagePreviewUrl ? (
        <div className="px-4 pb-2">
          <div className="relative inline-flex rounded-xl overflow-hidden border border-stone/40 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreviewUrl} alt="Selected upload" className="h-20 w-20 object-cover" />
            <button
              type="button"
              onClick={clearSelectedImage}
              className="absolute top-1 right-1 p-1 rounded-full bg-black/45 text-white hover:bg-black/60"
              aria-label="Remove selected image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      <form
        onSubmit={sendMessage}
        className="flex items-center gap-3 border-t border-stone/30 bg-white/60 px-4 pt-3 pb-[calc(var(--mobile-tab-bar-offset)+var(--keyboard-inset)+0.35rem)] backdrop-blur-sm"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelected}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => void handleAttachImage()}
          className="tap-target p-3 rounded-xl bg-stone/30 text-bark/60 hover:bg-stone/45 transition-colors"
          title="Attach image"
          aria-label="Attach image"
        >
          <ImagePlus className="w-5 h-5" />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={handleInputChange}
          onBlur={() => {
            void stopLocalTyping();
          }}
          onFocus={() => {
            scrollToBottom();
          }}
          placeholder="Type a message..."
          className="flex-1 px-4 py-3 rounded-xl bg-stone/20 border border-stone/30 focus:outline-none focus:ring-2 focus:ring-moss/40 text-sm text-earth placeholder:text-bark/30"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          disabled={(!newMessage.trim() && !selectedImage) || sending}
          className="tap-target p-3 bg-gradient-to-r from-moss to-leaf text-white rounded-xl shadow-sm disabled:opacity-40 transition-opacity"
          aria-label={sending ? 'Sending message' : 'Send message'}
        >
          {sending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </motion.button>
      </form>

      {sendError ? <div className="px-4 pb-3 text-xs text-error">{sendError}</div> : null}
    </div>
  );
}
