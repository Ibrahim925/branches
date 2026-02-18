'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { ArrowLeft, ImagePlus, Loader2, Send, X } from 'lucide-react';
import Link from 'next/link';

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
};

type TypingRow = {
  user_id: string;
  updated_at: string;
};

const TYPING_IDLE_MS = 1200;
const TYPING_TTL_MS = 2600;
const TYPING_POLL_INTERVAL_MS = 900;
const MESSAGE_POLL_INTERVAL_MS = 1500;

function formatProfileName(profile: Pick<ProfileRow, 'display_name' | 'email'>): string {
  return profile.display_name?.trim() || profile.email?.trim() || 'Unknown';
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
  const [profileCache, setProfileCache] = useState<Record<string, string>>({});
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileCacheRef = useRef<Record<string, string>>({});
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
        .select('id,display_name,email')
        .in('id', missingProfileIds);

      const rows = (profileRows as ProfileRow[]) ?? [];
      if (rows.length === 0) return;

      setProfileCache((current) => {
        const next = { ...current };
        rows.forEach((profile) => {
          next[profile.id] = formatProfileName(profile);
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
  }, [
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

  function handleImageSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
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

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!currentUserId) return;

    const content = newMessage.trim();
    const imageFile = selectedImage;

    if (!content && !imageFile) return;

    setSending(true);
    setSendError(null);
    await stopLocalTyping();

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
    await refreshMessages(true);
    setSending(false);
    inputRef.current?.focus();
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
    return profileCache[otherParticipantId] || 'Direct Message';
  })();

  const typingNames = typingUserIds.map((userId) => profileCache[userId] || 'Someone');
  const typingLabel =
    typingNames.length === 0
      ? ''
      : typingNames.length === 1
        ? `${typingNames[0]} is typing...`
        : `${typingNames.slice(0, 2).join(', ')} are typing...`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-moss animate-spin" />
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
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-stone/30 bg-white/60 backdrop-blur-sm">
        <Link
          href={`/${graphId}/chat`}
          className="p-2 hover:bg-stone/30 rounded-lg transition-colors"
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

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-bark/30 text-sm py-10">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwn = message.sender_id === currentUserId;
            const showSender =
              index === 0 || messages[index - 1].sender_id !== message.sender_id;

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                  {showSender && !isOwn ? (
                    <p className="text-xs text-bark/40 mb-1 ml-1">
                      {profileCache[message.sender_id] || 'Unknown'}
                    </p>
                  ) : null}

                  {message.image_url ? (
                    <div className="rounded-2xl overflow-hidden border border-stone/35 bg-white shadow-sm">
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
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        message.image_url ? 'mt-2' : ''
                      } ${
                        isOwn
                          ? 'bg-gradient-to-r from-moss to-leaf text-white rounded-br-md'
                          : 'bg-stone/30 text-earth rounded-bl-md'
                      }`}
                    >
                      {message.content}
                    </div>
                  ) : null}

                  <p
                    className={`text-[10px] text-bark/30 mt-1 ${
                      isOwn ? 'text-right mr-1' : 'ml-1'
                    }`}
                  >
                    {formatTime(message.created_at)}
                  </p>
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
        className="flex items-center gap-3 px-4 py-3 border-t border-stone/30 bg-white/60 backdrop-blur-sm"
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
          onClick={() => fileInputRef.current?.click()}
          className="p-3 rounded-xl bg-stone/30 text-bark/60 hover:bg-stone/45 transition-colors"
          title="Attach image"
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
          placeholder="Type a message..."
          className="flex-1 px-4 py-3 rounded-xl bg-stone/20 border border-stone/30 focus:outline-none focus:ring-2 focus:ring-moss/40 text-sm text-earth placeholder:text-bark/30"
          autoFocus
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          disabled={(!newMessage.trim() && !selectedImage) || sending}
          className="p-3 bg-gradient-to-r from-moss to-leaf text-white rounded-xl shadow-sm disabled:opacity-40 transition-opacity"
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
