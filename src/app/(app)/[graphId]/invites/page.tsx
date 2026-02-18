'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus,
  Mail,
  Copy,
  Check,
  Loader2,
  Clock,
  CheckCircle,
  X,
  UserRound,
  Link2,
  Share2,
  Trash2,
} from 'lucide-react';

type InviteRole = 'admin' | 'editor' | 'viewer';
type InviteStatus = 'pending' | 'accepted' | 'expired';
type InviteType = 'tree' | 'claim';

type NodeTarget = {
  id: string;
  first_name: string;
  last_name: string | null;
  claimed_by: string | null;
};

type Invite = {
  id: string;
  email: string | null;
  token: string;
  role: InviteRole;
  status: InviteStatus;
  node_id: string | null;
  node: NodeTarget | null;
  created_at: string;
  expires_at: string;
};

function getNodeName(node: Pick<NodeTarget, 'first_name' | 'last_name'>) {
  return `${node.first_name} ${node.last_name ?? ''}`.trim();
}

export default function InvitesPage() {
  const { graphId } = useParams<{ graphId: string }>();
  const supabase = useMemo(() => createClient(), []);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [unclaimedNodes, setUnclaimedNodes] = useState<NodeTarget[]>([]);
  const [graphName, setGraphName] = useState('Family Tree');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [inviteType, setInviteType] = useState<InviteType>('tree');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [deletingInviteId, setDeletingInviteId] = useState<string | null>(null);
  const hasUnclaimedNodes = unclaimedNodes.length > 0;

  const loadData = useCallback(async () => {
    setLoading(true);

    const [invitesResult, graphResult, nodesResult] = await Promise.all([
      supabase
        .from('invites')
        .select('id,email,token,role,status,node_id,created_at,expires_at')
        .eq('graph_id', graphId)
        .order('created_at', { ascending: false }),
      supabase.from('graphs').select('name').eq('id', graphId).single(),
      supabase
        .from('nodes')
        .select('id,first_name,last_name,claimed_by')
        .eq('graph_id', graphId)
        .is('claimed_by', null)
        .order('first_name', { ascending: true }),
    ]);

    if (graphResult.data?.name) {
      setGraphName(graphResult.data.name);
    }

    const rawInvites = (invitesResult.data ?? []) as Array<Omit<Invite, 'node'>>;
    const inviteNodeIds = [
      ...new Set(
        rawInvites
          .map((invite) => invite.node_id)
          .filter((nodeId): nodeId is string => Boolean(nodeId))
      ),
    ];

    let inviteTargetNodes: NodeTarget[] = [];
    if (inviteNodeIds.length > 0) {
      const { data } = await supabase
        .from('nodes')
        .select('id,first_name,last_name,claimed_by')
        .in('id', inviteNodeIds);

      inviteTargetNodes = (data as NodeTarget[]) ?? [];
    }

    const inviteTargetNodeById = new Map(
      inviteTargetNodes.map((node) => [node.id, node] as const)
    );
    const normalizedInvites: Invite[] = rawInvites.map((invite) => ({
      ...invite,
      node: invite.node_id ? (inviteTargetNodeById.get(invite.node_id) ?? null) : null,
    }));

    setInvites(normalizedInvites);
    setUnclaimedNodes((nodesResult.data as NodeTarget[]) ?? []);
    setLoading(false);
  }, [graphId, supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  function resetCreateState() {
    setEmail('');
    setRole('editor');
    setInviteType('tree');
    setSelectedNodeId('');
    setError(null);
    setShowCreate(false);
  }

  async function createInvite() {
    setError(null);

    if (inviteType === 'claim' && !selectedNodeId) {
      setError('Choose an unclaimed family member for this claim invite.');
      return;
    }

    setCreating(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('Sign in again to create invite links.');
      setCreating(false);
      return;
    }

    const { error } = await supabase.from('invites').insert({
      graph_id: graphId,
      invited_by: user.id,
      email: email || null,
      role,
      node_id: inviteType === 'claim' ? selectedNodeId : null,
    });

    if (error) {
      setError(error.message);
      setCreating(false);
      return;
    }

    await loadData();
    resetCreateState();
    setCreating(false);
  }

  function getInviteUrl(token: string) {
    return `${window.location.origin}/invite/${token}`;
  }

  async function copyLink(token: string) {
    const url = getInviteUrl(token);
    await navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  async function shareLink(token: string, invite: Invite) {
    const url = getInviteUrl(token);
    const targetName = invite.node
      ? getNodeName(invite.node)
      : `${graphName} Family Tree`;
    const shareTitle = invite.node
      ? `${targetName}, join ${graphName}`
      : `Join ${graphName}`;
    const shareText = invite.node
      ? `${targetName}, claim your place in ${graphName}.`
      : `You are invited to join ${graphName}.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url,
        });
      } catch {
        // User canceled native sharing.
      }
      return;
    }

    await navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  async function deleteInvite(invite: Invite) {
    const targetLabel = invite.node
      ? getNodeName(invite.node)
      : invite.email || 'this invitation';

    const confirmed = window.confirm(
      `Delete invite for ${targetLabel}? This action cannot be undone.`
    );
    if (!confirmed) return;

    setListError(null);
    setDeletingInviteId(invite.id);

    const { error: deleteError } = await supabase
      .from('invites')
      .delete()
      .eq('id', invite.id);

    if (deleteError) {
      setListError(deleteError.message);
      setDeletingInviteId(null);
      return;
    }

    setInvites((current) => current.filter((currentInvite) => currentInvite.id !== invite.id));
    setDeletingInviteId(null);
  }

  const statusIcons = {
    pending: Clock,
    accepted: CheckCircle,
    expired: X,
  };

  const statusColors = {
    pending: 'text-sunrise bg-sunrise/10',
    accepted: 'text-success bg-success/10',
    expired: 'text-error bg-error/10',
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-earth tracking-tight">
            Invitations
          </h1>
          <p className="text-bark/50 text-sm mt-1">
            Send invite links for {graphName}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setError(null);
            setShowCreate(true);
          }}
          className="px-5 py-2.5 bg-gradient-to-r from-moss to-leaf text-white rounded-xl text-sm font-medium shadow-md shadow-moss/15 hover:shadow-lg transition-shadow flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Invite
        </motion.button>
      </div>

      {/* Invites list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 text-moss animate-spin" />
        </div>
      ) : invites.length === 0 ? (
        <div className="text-center py-20">
          <Mail className="w-12 h-12 text-bark/20 mx-auto mb-4" />
          <p className="text-bark/40 text-sm">No invitations yet</p>
          <button
            onClick={() => {
              setError(null);
              setShowCreate(true);
            }}
            className="mt-4 text-moss text-sm font-medium hover:underline"
          >
            Send your first invitation
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {listError ? (
            <p className="text-sm text-error">{listError}</p>
          ) : null}
          {invites.map((invite, i) => {
            const StatusIcon = statusIcons[invite.status];
            return (
              <motion.div
                key={invite.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/70 border border-stone/30"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-moss/20 to-leaf/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-moss" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-earth">
                    {invite.email || 'Link invitation'}
                  </p>
                  <p className="text-xs text-bark/40 mt-0.5 flex items-center gap-1.5">
                    {invite.node ? (
                      <UserRound className="w-3.5 h-3.5" />
                    ) : (
                      <Link2 className="w-3.5 h-3.5" />
                    )}
                    {invite.node
                      ? `Claim invite: ${getNodeName(invite.node)}`
                      : `Tree invite - ${invite.role} role`}
                  </p>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusColors[invite.status]}`}>
                  <StatusIcon className="w-3 h-3" />
                  {invite.status}
                </div>
                <div className="flex items-center gap-1">
                  {invite.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => void shareLink(invite.token, invite)}
                        className="p-2 hover:bg-stone/30 rounded-lg transition-colors"
                        title="Share invite link"
                      >
                        <Share2 className="w-4 h-4 text-bark/40" />
                      </button>
                      <button
                        onClick={() => void copyLink(invite.token)}
                        className="p-2 hover:bg-stone/30 rounded-lg transition-colors"
                        title="Copy invite link"
                      >
                        {copied === invite.token ? (
                          <Check className="w-4 h-4 text-success" />
                        ) : (
                          <Copy className="w-4 h-4 text-bark/40" />
                        )}
                      </button>
                    </>
                  ) : null}
                  <button
                    onClick={() => void deleteInvite(invite)}
                    disabled={deletingInviteId === invite.id}
                    className="p-2 hover:bg-error/10 rounded-lg transition-colors disabled:opacity-60"
                    title="Delete invite"
                  >
                    {deletingInviteId === invite.id ? (
                      <Loader2 className="w-4 h-4 text-bark/40 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-bark/40" />
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create invite modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={resetCreateState}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-earth">
                  Send Invitation
                </h2>
                <button
                  onClick={resetCreateState}
                  className="p-1.5 hover:bg-stone/50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-bark/40" />
                </button>
              </div>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address (optional for link invites)"
                className="w-full px-4 py-3 rounded-xl border border-stone focus:outline-none focus:ring-2 focus:ring-moss/50 text-sm text-earth placeholder:text-bark/30 mb-4"
              />

              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setInviteType('tree');
                    setSelectedNodeId('');
                    setError(null);
                  }}
                  className={`py-3 rounded-xl text-sm font-medium transition-all ${
                    inviteType === 'tree'
                      ? 'bg-moss/10 text-moss border-2 border-moss/30'
                      : 'bg-stone/20 text-bark/55 border-2 border-transparent'
                  }`}
                >
                  Tree Invite
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInviteType('claim');
                    setError(null);
                  }}
                  disabled={!hasUnclaimedNodes}
                  className={`py-3 rounded-xl text-sm font-medium transition-all ${
                    inviteType === 'claim'
                      ? 'bg-moss/10 text-moss border-2 border-moss/30'
                      : 'bg-stone/20 text-bark/55 border-2 border-transparent'
                  } ${!hasUnclaimedNodes ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Claim Member
                </button>
              </div>

              {inviteType === 'claim' && (
                <div className="mb-4">
                  {!hasUnclaimedNodes ? (
                    <p className="text-xs text-bark/50 mb-3">
                      Everyone in this tree has already claimed a profile.
                    </p>
                  ) : null}
                  <select
                    value={selectedNodeId}
                    onChange={(event) => setSelectedNodeId(event.target.value)}
                    disabled={!hasUnclaimedNodes}
                    className="w-full px-4 py-3 rounded-xl border border-stone focus:outline-none focus:ring-2 focus:ring-moss/50 text-sm text-earth bg-white"
                  >
                    <option value="">Select unclaimed member</option>
                    {unclaimedNodes.map((node) => (
                      <option key={node.id} value={node.id}>
                        {getNodeName(node)}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-bark/40 mt-2">
                    This link lets that person claim their own profile in {graphName}.
                  </p>
                </div>
              )}

              {/* Role selector */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setRole('editor')}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                    role === 'editor'
                      ? 'bg-moss/10 text-moss border-2 border-moss/30'
                      : 'bg-stone/20 text-bark/50 border-2 border-transparent'
                  }`}
                >
                  Editor
                </button>
                <button
                  type="button"
                  onClick={() => setRole('viewer')}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                    role === 'viewer'
                      ? 'bg-moss/10 text-moss border-2 border-moss/30'
                      : 'bg-stone/20 text-bark/50 border-2 border-transparent'
                  }`}
                >
                  Viewer
                </button>
              </div>

              <p className="text-xs text-bark/40 mb-4">
                {inviteType === 'claim'
                  ? 'Claim links create a personalized invite preview using the selected member name.'
                  : 'Editors can add and modify family members. Viewers can only browse the tree.'}
              </p>

              {error ? (
                <p className="text-xs text-error mb-4">{error}</p>
              ) : null}

              <button
                onClick={createInvite}
                disabled={creating}
                className="w-full py-3 bg-gradient-to-r from-moss to-leaf text-white rounded-xl font-medium shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    {email ? 'Send Invitation' : 'Create Invite Link'}
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
