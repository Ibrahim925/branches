'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Plus,
  Users,
  User,
  TreePine,
  X,
  Loader2,
  Check,
} from 'lucide-react';

type ConversationType = 'direct' | 'group' | 'tree';

type ConversationRow = {
  id: string;
  type: ConversationType;
  name: string | null;
  created_at: string;
  updated_at: string;
};

type ConversationListItem = ConversationRow & {
  title: string;
  subtitle: string;
  participant_count: number;
};

type ParticipantRow = {
  conversation_id: string;
  user_id: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
};

type MembershipRow = {
  profile_id: string;
  role: 'admin' | 'editor' | 'viewer';
  profiles: ProfileRow | ProfileRow[] | null;
};

type MemberOption = {
  id: string;
  name: string;
  email: string | null;
};

function resolveProfile(
  rawProfile: MembershipRow['profiles'],
  fallbackId: string
): ProfileRow {
  if (Array.isArray(rawProfile)) {
    return (
      rawProfile[0] ?? {
        id: fallbackId,
        display_name: null,
        email: null,
      }
    );
  }

  if (!rawProfile) {
    return {
      id: fallbackId,
      display_name: null,
      email: null,
    };
  }

  return rawProfile;
}

function formatProfileName(profile: Pick<ProfileRow, 'display_name' | 'email'>): string {
  return profile.display_name?.trim() || profile.email?.trim() || 'Member';
}

function arraysEqualAsSet(valuesA: string[], valuesB: string[]) {
  if (valuesA.length !== valuesB.length) return false;
  const lookup = new Set(valuesA);
  return valuesB.every((value) => lookup.has(value));
}

export default function ChatListPage() {
  const { graphId } = useParams<{ graphId: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [participantsByConversation, setParticipantsByConversation] = useState<
    Record<string, string[]>
  >({});
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [newType, setNewType] = useState<ConversationType>('direct');
  const [newName, setNewName] = useState('');
  const [selectedDmMemberId, setSelectedDmMemberId] = useState('');
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const memberOptions = useMemo(
    () => members.filter((member) => member.id !== currentUserId),
    [currentUserId, members]
  );

  const loadData = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCurrentUserId(null);
      setConversations([]);
      setMembers([]);
      setParticipantsByConversation({});
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    const [{ data: membershipRows }, { data: myParticipantRows }] = await Promise.all([
      supabase
        .from('user_graph_memberships')
        .select('profile_id,role,profiles(id,display_name,email)')
        .eq('graph_id', graphId),
      supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id),
    ]);

    const normalizedMembers: MemberOption[] = ((membershipRows as MembershipRow[]) ?? []).map(
      (row) => {
        const profile = resolveProfile(row.profiles, row.profile_id);
        return {
          id: row.profile_id,
          name: formatProfileName(profile),
          email: profile.email,
        };
      }
    );
    setMembers(normalizedMembers);

    const myConversationIds = [
      ...new Set(
        ((myParticipantRows as Array<{ conversation_id: string }> | null) ?? []).map(
          (row) => row.conversation_id
        )
      ),
    ];

    if (myConversationIds.length === 0) {
      setConversations([]);
      setParticipantsByConversation({});
      setLoading(false);
      return;
    }

    const { data: conversationRows } = await supabase
      .from('conversations')
      .select('id,type,name,created_at,updated_at')
      .eq('graph_id', graphId)
      .in('id', myConversationIds)
      .order('updated_at', { ascending: false });

    const normalizedConversations = (conversationRows as ConversationRow[]) ?? [];
    const conversationIds = normalizedConversations.map((conversation) => conversation.id);

    if (conversationIds.length === 0) {
      setConversations([]);
      setParticipantsByConversation({});
      setLoading(false);
      return;
    }

    const { data: participantRows } = await supabase
      .from('conversation_participants')
      .select('conversation_id,user_id')
      .in('conversation_id', conversationIds);

    const participants = (participantRows as ParticipantRow[]) ?? [];
    const participantMap: Record<string, string[]> = {};
    participants.forEach((row) => {
      if (!participantMap[row.conversation_id]) {
        participantMap[row.conversation_id] = [];
      }
      participantMap[row.conversation_id].push(row.user_id);
    });
    setParticipantsByConversation(participantMap);

    const uniqueParticipantIds = [
      ...new Set(participants.map((participant) => participant.user_id)),
    ];

    const memberNameById = new Map(
      normalizedMembers.map((member) => [member.id, member.name] as const)
    );

    if (uniqueParticipantIds.length > 0) {
      const missingProfileIds = uniqueParticipantIds.filter(
        (participantId) => !memberNameById.has(participantId)
      );

      if (missingProfileIds.length > 0) {
        const { data: extraProfiles } = await supabase
          .from('profiles')
          .select('id,display_name,email')
          .in('id', missingProfileIds);

        ((extraProfiles as ProfileRow[]) ?? []).forEach((profile) => {
          memberNameById.set(profile.id, formatProfileName(profile));
        });
      }
    }

    const listItems: ConversationListItem[] = normalizedConversations.map((conversation) => {
      const participantIds = participantMap[conversation.id] ?? [];
      const participantCount = participantIds.length;

      if (conversation.type === 'direct') {
        const otherParticipantId = participantIds.find((participantId) => participantId !== user.id);
        const otherName = otherParticipantId
          ? (memberNameById.get(otherParticipantId) ?? 'Direct Message')
          : 'Direct Message';

        return {
          ...conversation,
          title: otherName,
          subtitle: 'Direct Message',
          participant_count: participantCount,
        };
      }

      if (conversation.type === 'tree') {
        return {
          ...conversation,
          title: conversation.name || 'Full Tree Chat',
          subtitle: `${participantCount} members`,
          participant_count: participantCount,
        };
      }

      return {
        ...conversation,
        title: conversation.name || 'Group Chat',
        subtitle: `${participantCount} members`,
        participant_count: participantCount,
      };
    });

    setConversations(listItems);
    setLoading(false);
  }, [graphId, supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  function resetCreateForm() {
    setShowCreate(false);
    setNewType('direct');
    setNewName('');
    setSelectedDmMemberId('');
    setSelectedGroupMemberIds([]);
    setFormError(null);
  }

  function toggleGroupMember(memberId: string) {
    setSelectedGroupMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId]
    );
  }

  async function createConversation() {
    if (!currentUserId) {
      setFormError('Sign in again to create a conversation.');
      return;
    }

    setFormError(null);

    if (newType === 'direct' && !selectedDmMemberId) {
      setFormError('Select a family member to start a direct message.');
      return;
    }

    if (newType === 'group' && selectedGroupMemberIds.length === 0) {
      setFormError('Select at least one member for a group chat.');
      return;
    }

    setCreating(true);

    if (newType === 'tree') {
      const existingTreeChat = conversations.find(
        (conversation) => conversation.type === 'tree'
      );

      if (existingTreeChat) {
        resetCreateForm();
        setCreating(false);
        router.push(`/${graphId}/chat/${existingTreeChat.id}`);
        return;
      }
    }

    if (newType === 'direct' && selectedDmMemberId) {
      const existingDirectChat = conversations.find((conversation) => {
        if (conversation.type !== 'direct') return false;
        const participantIds = participantsByConversation[conversation.id] ?? [];
        return arraysEqualAsSet(participantIds, [currentUserId, selectedDmMemberId]);
      });

      if (existingDirectChat) {
        resetCreateForm();
        setCreating(false);
        router.push(`/${graphId}/chat/${existingDirectChat.id}`);
        return;
      }
    }

    const baseName = newName.trim();
    const conversationId = crypto.randomUUID();
    const { error: conversationError } = await supabase.from('conversations').insert({
      id: conversationId,
      graph_id: graphId,
      type: newType,
      name:
        newType === 'direct'
          ? null
          : baseName || (newType === 'tree' ? 'Full Tree Chat' : 'Group Chat'),
    });

    if (conversationError) {
      setFormError(conversationError.message || 'Could not create conversation.');
      setCreating(false);
      return;
    }

    let participantIds: string[] = [];

    if (newType === 'tree') {
      participantIds = [
        ...new Set(members.map((member) => member.id).concat(currentUserId)),
      ];
    } else if (newType === 'group') {
      participantIds = [...new Set([currentUserId, ...selectedGroupMemberIds])];
    } else {
      participantIds = [...new Set([currentUserId, selectedDmMemberId])];
    }

    const { error: participantError } = await supabase
      .from('conversation_participants')
      .insert(
        participantIds.map((participantId) => ({
          conversation_id: conversationId,
          user_id: participantId,
        }))
      );

    if (participantError) {
      setFormError(participantError.message || 'Could not add participants.');
      setCreating(false);
      return;
    }

    setCreating(false);
    resetCreateForm();
    await loadData();
    router.push(`/${graphId}/chat/${conversationId}`);
  }

  const typeIcons = {
    direct: User,
    group: Users,
    tree: TreePine,
  };

  const typeLabels = {
    direct: 'Direct Message',
    group: 'Group Chat',
    tree: 'Full Tree Chat',
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-earth tracking-tight">
            Messages
          </h1>
          <p className="text-bark/50 text-sm mt-1">
            DM relatives, create groups, or chat with the full tree.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setFormError(null);
            setShowCreate(true);
          }}
          className="p-3 bg-gradient-to-r from-moss to-leaf text-white rounded-xl shadow-md shadow-moss/15 hover:shadow-lg transition-shadow"
          title="New conversation"
        >
          <Plus className="w-5 h-5" />
        </motion.button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 text-moss animate-spin" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-20">
          <MessageCircle className="w-12 h-12 text-bark/20 mx-auto mb-4" />
          <p className="text-bark/40 text-sm">No conversations yet</p>
          <button
            onClick={() => {
              setFormError(null);
              setShowCreate(true);
            }}
            className="mt-4 text-moss text-sm font-medium hover:underline"
          >
            Start your first conversation
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conversation, index) => {
            const Icon = typeIcons[conversation.type];
            return (
              <motion.button
                key={conversation.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => router.push(`/${graphId}/chat/${conversation.id}`)}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/70 border border-stone/30 hover:bg-white hover:shadow-md transition-all text-left"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-moss/20 to-leaf/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-moss" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-earth truncate">
                    {conversation.title}
                  </p>
                  <p className="text-xs text-bark/40 mt-0.5">
                    {conversation.type === 'direct'
                      ? conversation.subtitle
                      : `${typeLabels[conversation.type]} · ${conversation.subtitle}`}
                  </p>
                </div>
                <span className="text-xs text-bark/30">
                  {new Date(conversation.updated_at).toLocaleDateString()}
                </span>
              </motion.button>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={resetCreateForm}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(event) => event.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-earth">New Conversation</h2>
                <button
                  onClick={resetCreateForm}
                  className="p-1.5 hover:bg-stone/50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-bark/40" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setNewType('direct');
                    setFormError(null);
                  }}
                  className={`py-3 rounded-xl text-sm font-medium transition-all ${
                    newType === 'direct'
                      ? 'bg-moss/10 text-moss border-2 border-moss/30'
                      : 'bg-stone/20 text-bark/50 border-2 border-transparent'
                  }`}
                >
                  DM
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewType('group');
                    setFormError(null);
                  }}
                  className={`py-3 rounded-xl text-sm font-medium transition-all ${
                    newType === 'group'
                      ? 'bg-moss/10 text-moss border-2 border-moss/30'
                      : 'bg-stone/20 text-bark/50 border-2 border-transparent'
                  }`}
                >
                  Group
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewType('tree');
                    setFormError(null);
                  }}
                  className={`py-3 rounded-xl text-sm font-medium transition-all ${
                    newType === 'tree'
                      ? 'bg-moss/10 text-moss border-2 border-moss/30'
                      : 'bg-stone/20 text-bark/50 border-2 border-transparent'
                  }`}
                >
                  Full Tree
                </button>
              </div>

              {newType === 'direct' && (
                <div className="mb-4">
                  <select
                    value={selectedDmMemberId}
                    onChange={(event) => setSelectedDmMemberId(event.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone focus:outline-none focus:ring-2 focus:ring-moss/50 text-sm text-earth bg-white"
                  >
                    <option value="">Select a family member</option>
                    {memberOptions.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                        {member.email ? ` (${member.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {newType === 'group' && (
                <div className="mb-4 max-h-44 overflow-y-auto border border-stone/35 rounded-xl p-2">
                  {memberOptions.length === 0 ? (
                    <p className="text-xs text-bark/45 px-2 py-3">
                      No other members are in this tree yet.
                    </p>
                  ) : (
                    memberOptions.map((member) => {
                      const selected = selectedGroupMemberIds.includes(member.id);
                      return (
                        <button
                          type="button"
                          key={member.id}
                          onClick={() => toggleGroupMember(member.id)}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                            selected ? 'bg-moss/15 text-moss' : 'hover:bg-stone/35 text-earth'
                          }`}
                        >
                          <span className="truncate">{member.name}</span>
                          {selected ? <Check className="w-4 h-4" /> : null}
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {newType !== 'direct' && (
                <input
                  type="text"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder={
                    newType === 'tree' ? 'Tree chat name (optional)' : 'Group name (optional)'
                  }
                  className="w-full px-4 py-3 rounded-xl border border-stone focus:outline-none focus:ring-2 focus:ring-moss/50 text-sm text-earth placeholder:text-bark/30 mb-4"
                />
              )}

              <p className="text-xs text-bark/40 mb-4">
                {newType === 'direct'
                  ? 'Start a one-to-one conversation.'
                  : newType === 'group'
                    ? 'Create a group with selected members.'
                    : 'Create one shared conversation for everyone in this tree.'}
              </p>

              {formError ? <p className="text-xs text-error mb-4">{formError}</p> : null}

              <button
                onClick={createConversation}
                disabled={creating}
                className="w-full py-3 bg-gradient-to-r from-moss to-leaf text-white rounded-xl font-medium shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4" />
                    {newType === 'direct'
                      ? 'Start DM'
                      : newType === 'group'
                        ? 'Create Group'
                        : 'Create Tree Chat'}
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
