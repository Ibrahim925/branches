'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  AlertTriangle,
  Loader2,
  Save,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { MobileActionSheet } from '@/components/system/MobileActionSheet';
import { Skeleton } from '@/components/system/Skeleton';

type GraphRow = {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
};

type MembershipRow = {
  id: string;
  profile_id: string;
  role: 'admin' | 'editor' | 'viewer';
  joined_at: string;
};

type MemberProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  avatar_zoom: number | null;
  avatar_focus_x: number | null;
  avatar_focus_y: number | null;
  gender: string | null;
  bio: string | null;
  birthdate: string | null;
  onboarding_completed: boolean;
};

type MemberEntry = MembershipRow & {
  profile: MemberProfileRow | null;
};

type InviteSummaryRow = {
  id: string;
  status: 'pending' | 'accepted' | 'expired' | string;
};

type InviteSummary = {
  total: number;
  pending: number;
  accepted: number;
  expired: number;
};

function formatProfileName(profile: MemberProfileRow | null) {
  if (!profile) return 'Family Member';
  const full = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
  return full || profile.display_name?.trim() || profile.email?.trim() || 'Family Member';
}

export default function GraphSettingsPage() {
  const { graphId } = useParams<{ graphId: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [graph, setGraph] = useState<GraphRow | null>(null);
  const [members, setMembers] = useState<MemberEntry[]>([]);
  const [inviteSummary, setInviteSummary] = useState<InviteSummary>({
    total: 0,
    pending: 0,
    accepted: 0,
    expired: 0,
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<'admin' | 'editor' | 'viewer' | null>(null);

  const [graphName, setGraphName] = useState('');
  const [graphDescription, setGraphDescription] = useState('');
  const [graphCoverImageUrl, setGraphCoverImageUrl] = useState('');
  const [savingGraph, setSavingGraph] = useState(false);
  const [roleSavingId, setRoleSavingId] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [deletingGraph, setDeletingGraph] = useState(false);
  const [pendingRemoveMember, setPendingRemoveMember] = useState<MemberEntry | null>(null);
  const [showDeleteGraphConfirm, setShowDeleteGraphConfirm] = useState(false);

  const canManageGraph = currentRole === 'admin';

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    setCurrentUserId(user.id);

    const [
      { data: graphRow, error: graphError },
      { data: membershipRows, error: membershipError },
      { data: inviteRows },
    ] =
      await Promise.all([
        supabase
          .from('graphs')
          .select('id,name,description,cover_image_url')
          .eq('id', graphId)
          .single(),
        supabase
          .from('user_graph_memberships')
          .select('id,profile_id,role,joined_at')
          .eq('graph_id', graphId)
          .order('joined_at', { ascending: true }),
        supabase
          .from('invites')
          .select('id,status')
          .eq('graph_id', graphId),
      ]);

    if (graphError || !graphRow || membershipError) {
      setError(
        graphError?.message ||
          membershipError?.message ||
          'Could not load settings for this tree.'
      );
      setGraph(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    const memberships = (membershipRows as MembershipRow[]) || [];
    const profileIds = [
      ...new Set(memberships.map((membership) => membership.profile_id).filter(Boolean)),
    ];

    const { data: profileRows } =
      profileIds.length > 0
        ? await supabase
            .from('profiles')
            .select(
              'id,first_name,last_name,display_name,email,avatar_url,avatar_zoom,avatar_focus_x,avatar_focus_y,gender,bio,birthdate,onboarding_completed'
            )
            .in('id', profileIds)
        : { data: [] };

    const profileById = new Map<string, MemberProfileRow>(
      ((profileRows as MemberProfileRow[]) || []).map((profile) => [profile.id, profile])
    );

    const nextMembers = memberships.map((membership) => ({
      ...membership,
      profile: profileById.get(membership.profile_id) || null,
    }));
    const invites = (inviteRows as InviteSummaryRow[] | null) ?? [];
    const nextInviteSummary: InviteSummary = {
      total: invites.length,
      pending: invites.filter((invite) => invite.status === 'pending').length,
      accepted: invites.filter((invite) => invite.status === 'accepted').length,
      expired: invites.filter((invite) => invite.status === 'expired').length,
    };

    const myMembership = memberships.find((membership) => membership.profile_id === user.id);

    setGraph(graphRow as GraphRow);
    setGraphName(graphRow.name);
    setGraphDescription(graphRow.description || '');
    setGraphCoverImageUrl(graphRow.cover_image_url || '');
    setMembers(nextMembers);
    setInviteSummary(nextInviteSummary);
    setCurrentRole(myMembership?.role || null);
    setLoading(false);
  }, [graphId, router, supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSettings();
  }, [loadSettings]);

  async function handleSaveGraph() {
    if (!graph || !canManageGraph) return;

    setSavingGraph(true);
    setError(null);
    setNotice(null);

    const { error: updateError } = await supabase
      .from('graphs')
      .update({
        name: graphName.trim(),
        description: graphDescription.trim() || null,
        cover_image_url: graphCoverImageUrl.trim() || null,
      })
      .eq('id', graph.id);

    if (updateError) {
      setError(updateError.message || 'Could not save tree settings.');
      setSavingGraph(false);
      return;
    }

    setNotice('Tree settings saved.');
    setSavingGraph(false);
    await loadSettings();
  }

  async function handleRoleChange(member: MemberEntry, nextRole: 'admin' | 'editor' | 'viewer') {
    if (!canManageGraph || member.role === nextRole) return;

    const adminMembers = members.filter((entry) => entry.role === 'admin');
    if (
      member.role === 'admin' &&
      nextRole !== 'admin' &&
      adminMembers.length === 1
    ) {
      setError('A tree must keep at least one admin.');
      return;
    }

    setRoleSavingId(member.id);
    setError(null);
    setNotice(null);

    const { error: updateError } = await supabase
      .from('user_graph_memberships')
      .update({ role: nextRole })
      .eq('id', member.id);

    if (updateError) {
      setError(updateError.message || 'Could not update role.');
      setRoleSavingId(null);
      return;
    }

    setRoleSavingId(null);
    setNotice('Member role updated.');
    await loadSettings();
  }

  async function handleRemoveMember(member: MemberEntry) {
    if (!canManageGraph) return;

    const adminMembers = members.filter((entry) => entry.role === 'admin');
    if (
      member.role === 'admin' &&
      adminMembers.length === 1
    ) {
      setError('A tree must keep at least one admin.');
      return;
    }

    setRemovingMemberId(member.id);
    setError(null);
    setNotice(null);

    const { error: deleteError } = await supabase
      .from('user_graph_memberships')
      .delete()
      .eq('id', member.id);

    if (deleteError) {
      setError(deleteError.message || 'Could not remove member.');
      setRemovingMemberId(null);
      return;
    }

    setRemovingMemberId(null);
    setNotice('Member removed.');
    await loadSettings();
  }

  async function handleDeleteGraph() {
    if (!graph || !canManageGraph) return;

    setDeletingGraph(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from('graphs')
      .delete()
      .eq('id', graph.id);

    if (deleteError) {
      setError(deleteError.message || 'Could not delete tree.');
      setDeletingGraph(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  async function confirmRemoveMember() {
    if (!pendingRemoveMember) return;
    const target = pendingRemoveMember;
    setPendingRemoveMember(null);
    await handleRemoveMember(target);
  }

  async function confirmDeleteGraph() {
    setShowDeleteGraphConfirm(false);
    await handleDeleteGraph();
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <div className="rounded-2xl border border-stone/35 bg-white/76 p-5 md:p-6">
          <Skeleton className="h-6 w-40 rounded-md" />
          <Skeleton className="mt-4 h-11 w-full rounded-xl" />
          <Skeleton className="mt-3 h-20 w-full rounded-xl" />
          <Skeleton className="mt-3 h-11 w-full rounded-xl" />
        </div>
        <div className="rounded-2xl border border-stone/35 bg-white/76 p-5 md:p-6">
          <Skeleton className="h-6 w-32 rounded-md" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-earth tracking-tight">Settings</h1>
        <p className="text-sm text-bark/55 mt-1">
          Configure this tree and manage membership.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl bg-error/10 text-error text-sm px-4 py-3">{error}</div>
      ) : null}
      {notice ? (
        <div className="mb-4 rounded-xl bg-moss/10 text-moss text-sm px-4 py-3">{notice}</div>
      ) : null}

      <div className="space-y-6">
        <section className="rounded-2xl border border-stone/35 bg-white/76 p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-moss" />
            <h2 className="text-xl font-semibold text-earth">Tree Settings</h2>
          </div>

          {!graph ? (
            <p className="text-sm text-bark/55">Tree not found.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-bark/55 mb-1 block">Tree Name</label>
                <input
                  type="text"
                  value={graphName}
                  onChange={(event) => setGraphName(event.target.value)}
                  disabled={!canManageGraph}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone focus:outline-none focus:ring-2 focus:ring-moss/45 text-sm text-earth disabled:opacity-60"
                />
              </div>
              <div>
                <label className="text-xs text-bark/55 mb-1 block">Description</label>
                <textarea
                  value={graphDescription}
                  onChange={(event) => setGraphDescription(event.target.value)}
                  disabled={!canManageGraph}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone focus:outline-none focus:ring-2 focus:ring-moss/45 text-sm text-earth disabled:opacity-60 resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-bark/55 mb-1 block">Cover Image URL</label>
                <input
                  type="url"
                  value={graphCoverImageUrl}
                  onChange={(event) => setGraphCoverImageUrl(event.target.value)}
                  disabled={!canManageGraph}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone focus:outline-none focus:ring-2 focus:ring-moss/45 text-sm text-earth disabled:opacity-60"
                />
              </div>

              {canManageGraph ? (
                <button
                  type="button"
                  onClick={() => void handleSaveGraph()}
                  disabled={savingGraph || !graphName.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-moss to-leaf text-white text-sm font-medium shadow-md disabled:opacity-60"
                >
                  {savingGraph ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Tree Settings
                </button>
              ) : (
                <p className="text-xs text-bark/50">Only tree admins can edit these settings.</p>
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-stone/35 bg-white/76 p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-moss" />
            <h2 className="text-xl font-semibold text-earth">Members</h2>
          </div>

          <div className="mb-4 rounded-2xl border border-moss/25 bg-gradient-to-br from-leaf/10 via-moss/10 to-white/90 p-4 md:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-bark/50">Access</p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight text-earth">Manage Invites</h3>
                <p className="mt-1 text-sm text-bark/60">
                  Invite relatives, share claim links, and monitor invite status.
                </p>
              </div>
              <Link
                href={`/${graphId}/invites`}
                className="tap-target inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-moss to-leaf px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-95"
              >
                <Users className="h-4 w-4" />
                Open Invites
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-stone/30 bg-white/70 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-bark/45">Pending</p>
                <p className="text-lg font-semibold leading-tight text-earth">{inviteSummary.pending}</p>
              </div>
              <div className="rounded-xl border border-stone/30 bg-white/70 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-bark/45">Accepted</p>
                <p className="text-lg font-semibold leading-tight text-earth">{inviteSummary.accepted}</p>
              </div>
              <div className="rounded-xl border border-stone/30 bg-white/70 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-bark/45">Total</p>
                <p className="text-lg font-semibold leading-tight text-earth">{inviteSummary.total}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {members.map((member) => {
              const isCurrentUser = member.profile_id === currentUserId;
              const isSavingRole = roleSavingId === member.id;
              const isRemoving = removingMemberId === member.id;
              const canChangeMember = canManageGraph;

              return (
                <div
                  key={member.id}
                  className="rounded-xl border border-stone/35 bg-white/85 px-3 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-earth truncate">
                      {formatProfileName(member.profile)}
                      {isCurrentUser ? ' (You)' : ''}
                    </p>
                    <p className="text-xs text-bark/50 truncate">
                      {member.profile?.email || 'No email'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={member.role}
                      disabled={!canChangeMember || isSavingRole}
                      onChange={(event) =>
                        void handleRoleChange(
                          member,
                          event.target.value as 'admin' | 'editor' | 'viewer'
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-stone bg-white text-xs text-earth disabled:opacity-60"
                    >
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    {canManageGraph ? (
                      <button
                        type="button"
                        onClick={() => setPendingRemoveMember(member)}
                        disabled={isRemoving}
                        className="px-2.5 py-1.5 rounded-lg border border-error/30 text-error text-xs hover:bg-error/10 transition-colors disabled:opacity-60"
                      >
                        {isRemoving ? 'Removing…' : 'Remove'}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {canManageGraph ? (
          <section className="rounded-2xl border border-error/35 bg-white/76 p-5 md:p-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-error" />
              <h2 className="text-lg font-semibold text-earth">Danger Zone</h2>
            </div>
            <p className="text-sm text-bark/55 mb-4">
              Permanently delete this tree and all associated nodes, chats, invites, and memories.
            </p>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="button"
              onClick={() => setShowDeleteGraphConfirm(true)}
              disabled={deletingGraph}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-error text-white text-sm font-medium disabled:opacity-60"
            >
              {deletingGraph ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete Tree
            </motion.button>
          </section>
        ) : null}
      </div>

      <MobileActionSheet
        open={Boolean(pendingRemoveMember)}
        onClose={() => setPendingRemoveMember(null)}
        title="Remove Member"
        ariaLabel="Remove member confirmation"
        className="md:max-w-sm"
      >
        <div className="mobile-sheet-body pt-4 space-y-4">
          <p className="text-sm text-bark/70 leading-relaxed">
            Remove{' '}
            <span className="font-medium text-earth">
              {pendingRemoveMember ? formatProfileName(pendingRemoveMember.profile) : 'this member'}
            </span>{' '}
            from this tree?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPendingRemoveMember(null)}
              className="tap-target flex-1 py-3 rounded-xl border border-stone/40 text-sm font-medium text-earth hover:bg-stone/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmRemoveMember()}
              disabled={
                !pendingRemoveMember ||
                removingMemberId === pendingRemoveMember.id
              }
              className="tap-target flex-1 py-3 rounded-xl bg-error text-white text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {pendingRemoveMember && removingMemberId === pendingRemoveMember.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              Remove
            </button>
          </div>
        </div>
      </MobileActionSheet>

      <MobileActionSheet
        open={showDeleteGraphConfirm}
        onClose={() => setShowDeleteGraphConfirm(false)}
        title="Delete Tree"
        ariaLabel="Delete tree confirmation"
        className="md:max-w-sm"
      >
        <div className="mobile-sheet-body pt-4 space-y-4">
          <p className="text-sm text-bark/70 leading-relaxed">
            Delete this tree and all related data? This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteGraphConfirm(false)}
              className="tap-target flex-1 py-3 rounded-xl border border-stone/40 text-sm font-medium text-earth hover:bg-stone/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmDeleteGraph()}
              disabled={deletingGraph}
              className="tap-target flex-1 py-3 rounded-xl bg-error text-white text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {deletingGraph ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Delete
            </button>
          </div>
        </div>
      </MobileActionSheet>
    </div>
  );
}
