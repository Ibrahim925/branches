'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { nativeBridge } from '@/lib/native';
import { motion } from 'framer-motion';
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
import { MobilePrimaryAction } from '@/components/system/MobilePrimaryAction';
import { MobileActionSheet } from '@/components/system/MobileActionSheet';
import { Skeleton } from '@/components/system/Skeleton';

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
  const [pendingDeleteInvite, setPendingDeleteInvite] = useState<Invite | null>(null);
  const hasUnclaimedNodes = unclaimedNodes.length > 0;
  const pendingClaimInviteNodeIds = useMemo(
    () =>
      new Set(
        invites
          .filter((invite) => invite.status === 'pending' && Boolean(invite.node_id))
          .map((invite) => invite.node_id as string)
      ),
    [invites]
  );
  const availableClaimNodes = useMemo(
    () => unclaimedNodes.filter((node) => !pendingClaimInviteNodeIds.has(node.id)),
    [pendingClaimInviteNodeIds, unclaimedNodes]
  );
  const hasClaimInviteTargets = availableClaimNodes.length > 0;
  const pendingClaimCount = pendingClaimInviteNodeIds.size;

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
    if (inviteType === 'claim' && pendingClaimInviteNodeIds.has(selectedNodeId)) {
      setError('A claim invite is already pending for this family member.');
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

    if (inviteType === 'claim') {
      const { data: existingInvite } = await supabase
        .from('invites')
        .select('id')
        .eq('graph_id', graphId)
        .eq('node_id', selectedNodeId)
        .eq('status', 'pending')
        .limit(1)
        .maybeSingle();

      if (existingInvite) {
        setError('A claim invite is already pending for this family member.');
        setCreating(false);
        return;
      }
    }

    const { error } = await supabase.from('invites').insert({
      graph_id: graphId,
      invited_by: user.id,
      email: email || null,
      role,
      node_id: inviteType === 'claim' ? selectedNodeId : null,
    });

    if (error) {
      if (
        error.code === '23505' &&
        error.message.includes('idx_invites_unique_pending_claim_per_node')
      ) {
        setError('A claim invite is already pending for this family member.');
      } else {
        setError(error.message);
      }
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
    const copied = await nativeBridge.copyText(url);
    if (copied) {
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
      return;
    }

    setError('Could not copy invite link.');
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

    const shared = await nativeBridge.share({
      title: shareTitle,
      text: shareText,
      url,
    });

    if (!shared) {
      const copied = await nativeBridge.copyText(url);
      if (!copied) {
        setError('Could not share invite link.');
        return;
      }
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
    }
  }

  async function deleteInvite(invite: Invite) {
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

  async function confirmDeleteInvite() {
    if (!pendingDeleteInvite) return;
    await deleteInvite(pendingDeleteInvite);
    setPendingDeleteInvite(null);
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
    <div className="max-w-3xl mx-auto px-4 py-8 pb-24 md:pb-8">
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
          className="hidden md:inline-flex px-5 py-2.5 bg-gradient-to-r from-moss to-leaf text-white rounded-xl text-sm font-medium shadow-md shadow-moss/15 hover:shadow-lg transition-shadow items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Invite
        </motion.button>
      </div>

      {/* Invites list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-4 rounded-xl border border-stone/30 bg-white/70 p-4"
            >
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-44 rounded-md" />
                <Skeleton className="mt-2 h-3 w-56 rounded-md" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
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
            const inviteTitle = invite.node
              ? getNodeName(invite.node)
              : invite.email || 'Link invitation';
            const inviteSubtitle = invite.node
              ? 'Claim invite'
              : `Tree invite • ${invite.role} role`;
            return (
              <motion.div
                key={invite.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-stone/30 bg-white/72 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-moss/20 to-leaf/20">
                    <Mail className="h-5 w-5 text-moss" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-semibold text-earth">{inviteTitle}</p>
                      <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium md:hidden ${statusColors[invite.status]}`}>
                        <StatusIcon className="h-3 w-3" />
                        {invite.status}
                      </div>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-bark/50">
                      {invite.node ? (
                        <UserRound className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <Link2 className="h-3.5 w-3.5 shrink-0" />
                      )}
                      {inviteSubtitle}
                    </p>
                    {invite.node ? (
                      <p className="mt-1 text-xs text-bark/45">
                        Personalized claim link for this family member.
                      </p>
                    ) : null}
                  </div>

                  <div className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusColors[invite.status]}`}>
                    <StatusIcon className="w-3 h-3" />
                    {invite.status}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-stone/20 pt-3">
                  {invite.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void shareLink(invite.token, invite)}
                        className="tap-target rounded-lg p-2.5 text-bark/55 transition-colors hover:bg-stone/30"
                        title="Share invite link"
                        aria-label="Share invite link"
                      >
                        <Share2 className="w-4 h-4 text-bark/40" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void copyLink(invite.token)}
                        className="tap-target rounded-lg p-2.5 text-bark/55 transition-colors hover:bg-stone/30"
                        title="Copy invite link"
                        aria-label="Copy invite link"
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
                    type="button"
                    onClick={() => setPendingDeleteInvite(invite)}
                    disabled={deletingInviteId === invite.id}
                    className="tap-target rounded-lg p-2.5 text-bark/55 transition-colors hover:bg-error/10 disabled:opacity-60"
                    title="Delete invite"
                    aria-label="Delete invite"
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

      <MobilePrimaryAction
        label="Invite member"
        ariaLabel="Invite member"
        icon={<UserPlus className="w-6 h-6" />}
        onPress={() => {
          setError(null);
          setShowCreate(true);
        }}
        hidden={showCreate || Boolean(pendingDeleteInvite)}
      />

      <MobileActionSheet
        open={showCreate}
        onClose={resetCreateState}
        title="Send Invitation"
        ariaLabel="Send invitation modal"
        className="md:max-w-md"
      >
        <form
          className="mobile-sheet-body pt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void createInvite();
          }}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address (optional for link invites)"
            className="w-full px-4 py-3 rounded-xl border border-stone focus:outline-none focus:ring-2 focus:ring-moss/50 text-sm text-earth placeholder:text-bark/30"
          />

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setInviteType('tree');
                setSelectedNodeId('');
                setError(null);
              }}
              className={`tap-target py-3 rounded-xl text-sm font-medium transition-all ${
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
                if (!hasClaimInviteTargets) return;
                setInviteType('claim');
                setError(null);
                if (
                  selectedNodeId &&
                  pendingClaimInviteNodeIds.has(selectedNodeId)
                ) {
                  setSelectedNodeId('');
                }
              }}
              disabled={!hasClaimInviteTargets}
              className={`tap-target py-3 rounded-xl text-sm font-medium transition-all ${
                inviteType === 'claim'
                  ? 'bg-moss/10 text-moss border-2 border-moss/30'
                  : 'bg-stone/20 text-bark/55 border-2 border-transparent'
              } ${!hasClaimInviteTargets ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Claim Member
            </button>
          </div>

          {inviteType === 'claim' ? (
            <div>
              {!hasClaimInviteTargets ? (
                <p className="text-xs text-bark/50 mb-3">
                  {hasUnclaimedNodes
                    ? 'All unclaimed members already have pending claim invites.'
                    : 'Everyone in this tree has already claimed a profile.'}
                </p>
              ) : null}
              <select
                value={selectedNodeId}
                onChange={(event) => setSelectedNodeId(event.target.value)}
                disabled={!hasClaimInviteTargets}
                className="w-full px-4 py-3 rounded-xl border border-stone focus:outline-none focus:ring-2 focus:ring-moss/50 text-sm text-earth bg-white"
              >
                <option value="">Select unclaimed member</option>
                {unclaimedNodes.map((node) => (
                  <option
                    key={node.id}
                    value={node.id}
                    disabled={pendingClaimInviteNodeIds.has(node.id)}
                  >
                    {pendingClaimInviteNodeIds.has(node.id)
                      ? `${getNodeName(node)} (invite pending)`
                      : getNodeName(node)}
                  </option>
                ))}
              </select>
              {pendingClaimCount > 0 ? (
                <p className="text-xs text-bark/45 mt-2">
                  {pendingClaimCount} pending claim invite{pendingClaimCount === 1 ? '' : 's'} already sent.
                </p>
              ) : null}
              <p className="text-xs text-bark/40 mt-2">
                This link lets that person claim their own profile in {graphName}.
              </p>
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRole('editor')}
              className={`tap-target flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
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
              className={`tap-target flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                role === 'viewer'
                  ? 'bg-moss/10 text-moss border-2 border-moss/30'
                  : 'bg-stone/20 text-bark/50 border-2 border-transparent'
              }`}
            >
              Viewer
            </button>
          </div>

          <p className="text-xs text-bark/40">
            {inviteType === 'claim'
              ? 'Claim links create a personalized invite preview using the selected member name.'
              : 'Editors can add and modify family members. Viewers can only browse the tree.'}
          </p>

          {error ? <p className="text-xs text-error">{error}</p> : null}

          <button
            type="submit"
            disabled={creating}
            className="tap-target w-full py-3 bg-gradient-to-r from-moss to-leaf text-white rounded-xl font-medium shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
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
        </form>
      </MobileActionSheet>

      <MobileActionSheet
        open={Boolean(pendingDeleteInvite)}
        onClose={() => setPendingDeleteInvite(null)}
        title="Delete Invitation"
        ariaLabel="Delete invitation confirmation"
        className="md:max-w-sm"
      >
        <div className="mobile-sheet-body pt-4 space-y-4">
          <p className="text-sm text-bark/70 leading-relaxed">
            Delete invite for{' '}
            <span className="font-medium text-earth">
              {pendingDeleteInvite
                ? pendingDeleteInvite.node
                  ? getNodeName(pendingDeleteInvite.node)
                  : pendingDeleteInvite.email || 'this invitation'
                : 'this invitation'}
            </span>
            ? This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPendingDeleteInvite(null)}
              className="tap-target flex-1 py-3 rounded-xl border border-stone/40 text-sm font-medium text-earth hover:bg-stone/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmDeleteInvite()}
              disabled={
                !pendingDeleteInvite || deletingInviteId === pendingDeleteInvite.id
              }
              className="tap-target flex-1 py-3 rounded-xl bg-error text-white text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {pendingDeleteInvite && deletingInviteId === pendingDeleteInvite.id ? (
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
