'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import {
  X,
  Calendar,
  BookOpen,
  Edit3,
  UserPlus,
  Heart,
  Users,
  Link2,
  CheckCircle2,
  Trash2,
  Save,
  Loader2,
  Upload,
  Camera,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { CreateMemoryModal } from '@/components/memories/CreateMemoryModal';
import { formatDateOnly, getDateOnlyYear } from '@/utils/dateOnly';
import { buildStoryExcerpt } from '@/utils/markdown';
import { buildImageCropStyle } from '@/utils/imageCrop';

interface NodeData {
  id: string;
  first_name: string;
  last_name: string | null;
  birthdate: string | null;
  death_date: string | null;
  bio: string | null;
  avatar_url: string | null;
  avatar_zoom?: number | null;
  avatar_focus_x?: number | null;
  avatar_focus_y?: number | null;
  claimed_by: string | null;
  created_at: string;
}

interface ClaimedProfileData {
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
}

type ExistingRelationshipKind = 'parent' | 'child' | 'spouse';
type GraphMembershipRole = 'admin' | 'editor' | 'viewer';

interface CandidateNodeData {
  id: string;
  first_name: string;
  last_name: string | null;
  birthdate: string | null;
  claimed_by: string | null;
}

interface GraphEdgeData {
  id: string;
  source_id: string;
  target_id: string;
  type: 'parent_child' | 'partnership';
}

type MemoryPreviewType = 'story' | 'photo' | 'document';

interface MemoryPreviewRecord {
  id: string;
  type: MemoryPreviewType;
  title: string | null;
  content: string | null;
  media_url: string | null;
  created_at: string;
  author_id: string;
  author_name: string;
}

interface MemoryAuthorProfile {
  id: string;
  display_name: string | null;
  email: string | null;
}

interface NodeDetailSidebarProps {
  nodeId: string;
  graphId: string;
  onClose: () => void;
  onUpdate?: () => void;
}

export function NodeDetailSidebar({
  nodeId,
  graphId,
  onClose,
  onUpdate,
}: NodeDetailSidebarProps) {
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [node, setNode] = useState<NodeData | null>(null);
  const [claimedProfile, setClaimedProfile] = useState<ClaimedProfileData | null>(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    first_name: '',
    last_name: '',
    bio: '',
    birthdate: '',
    death_date: '',
  });
  const [avatarUploadFile, setAvatarUploadFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [linkMode, setLinkMode] = useState<ExistingRelationshipKind | null>(null);
  const [candidates, setCandidates] = useState<CandidateNodeData[]>([]);
  const [candidateQuery, setCandidateQuery] = useState('');
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [linkingCandidateId, setLinkingCandidateId] = useState<string | null>(null);
  const [showCreateMemory, setShowCreateMemory] = useState(false);
  const [memoryPreviews, setMemoryPreviews] = useState<MemoryPreviewRecord[]>([]);
  const [loadingMemoryPreviews, setLoadingMemoryPreviews] = useState(false);
  const [memoryPreviewError, setMemoryPreviewError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentGraphRole, setCurrentGraphRole] = useState<GraphMembershipRole | null>(null);
  const [hasClaimedNodeInGraph, setHasClaimedNodeInGraph] = useState(false);
  const [loadingClaimStatus, setLoadingClaimStatus] = useState(true);
  const [claimingNode, setClaimingNode] = useState(false);
  const [unclaimingNode, setUnclaimingNode] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const formatProfileName = useCallback(
    (profile: Pick<MemoryAuthorProfile, 'display_name' | 'email'>) =>
      profile.display_name?.trim() || profile.email?.trim() || 'Family Member',
    []
  );

  const resolveClaimedName = useCallback(
    (profile: ClaimedProfileData, fallbackNode: NodeData) => {
      const displayParts = (profile.display_name || '').trim().split(/\s+/).filter(Boolean);
      const firstFromDisplay = displayParts[0] || null;
      const lastFromDisplay =
        displayParts.length > 1 ? displayParts.slice(1).join(' ') : null;

      return {
        first_name:
          profile.first_name?.trim() ||
          firstFromDisplay ||
          fallbackNode.first_name,
        last_name:
          profile.last_name?.trim() ||
          lastFromDisplay ||
          fallbackNode.last_name,
      };
    },
    []
  );

  const loadNode = useCallback(async () => {
    const { data } = await supabase
      .from('nodes')
      .select('*')
      .eq('id', nodeId)
      .eq('graph_id', graphId)
      .single();

    if (data) {
      let mergedNode = data as NodeData;
      let profileForClaimedNode: ClaimedProfileData | null = null;

      if (mergedNode.claimed_by) {
        const { data: profileRow } = await supabase
          .from('profiles')
          .select(
            'id,first_name,last_name,display_name,email,avatar_url,avatar_zoom,avatar_focus_x,avatar_focus_y,gender,bio,birthdate'
          )
          .eq('id', mergedNode.claimed_by)
          .maybeSingle();

        if (profileRow) {
          profileForClaimedNode = profileRow as ClaimedProfileData;
          const resolvedNames = resolveClaimedName(profileForClaimedNode, mergedNode);

          mergedNode = {
            ...mergedNode,
            first_name: resolvedNames.first_name,
            last_name: resolvedNames.last_name,
            avatar_url: profileForClaimedNode.avatar_url,
            avatar_zoom: profileForClaimedNode.avatar_zoom,
            avatar_focus_x: profileForClaimedNode.avatar_focus_x,
            avatar_focus_y: profileForClaimedNode.avatar_focus_y,
            bio: profileForClaimedNode.bio,
            birthdate: profileForClaimedNode.birthdate,
          };
        }
      }

      setActionError(null);
      setNode(mergedNode);
      setClaimedProfile(profileForClaimedNode);
      setEditData({
        first_name: mergedNode.first_name,
        last_name: mergedNode.last_name || '',
        bio: mergedNode.bio || '',
        birthdate: mergedNode.birthdate || '',
        death_date: mergedNode.death_date || '',
      });
      setAvatarPreview(mergedNode.avatar_url);
      setAvatarUploadFile(null);
      setAvatarRemoved(false);
    }
  }, [graphId, nodeId, resolveClaimedName, supabase]);

  const loadMemoryPreviews = useCallback(
    async (claimedBy: string | null) => {
      setLoadingMemoryPreviews(true);
      setMemoryPreviewError(null);

      const { data: nodeScopedRows, error: nodeScopedError } = await supabase
        .from('memories')
        .select('id,type,title,content,media_url,created_at,author_id')
        .eq('graph_id', graphId)
        .eq('node_id', nodeId)
        .order('created_at', { ascending: false })
        .limit(8);

      if (nodeScopedError) {
        setMemoryPreviewError('Could not load recent memories.');
        setMemoryPreviews([]);
        setLoadingMemoryPreviews(false);
        return;
      }

      let taggedRows: MemoryPreviewRecord[] = [];
      const subjectFilter = claimedBy
        ? `subject_user_id.eq.${claimedBy},subject_node_id.eq.${nodeId}`
        : `subject_node_id.eq.${nodeId}`;

      const { data: memorySubjectRows, error: subjectError } = await supabase
        .from('memory_subjects')
        .select('memory_id')
        .or(subjectFilter);

      if (subjectError) {
        setMemoryPreviewError('Could not load tagged memories.');
        setMemoryPreviews([]);
        setLoadingMemoryPreviews(false);
        return;
      }

      const taggedMemoryIds = [
        ...new Set(
          (memorySubjectRows || [])
            .map((row) => row.memory_id as string)
            .filter(Boolean)
        ),
      ];

      if (taggedMemoryIds.length > 0) {
        const { data: taggedMemoryRows, error: taggedMemoryError } = await supabase
          .from('memories')
          .select('id,type,title,content,media_url,created_at,author_id')
          .eq('graph_id', graphId)
          .in('id', taggedMemoryIds)
          .order('created_at', { ascending: false })
          .limit(14);

        if (taggedMemoryError) {
          setMemoryPreviewError('Could not load tagged memories.');
          setMemoryPreviews([]);
          setLoadingMemoryPreviews(false);
          return;
        }

        taggedRows = (taggedMemoryRows || []) as MemoryPreviewRecord[];
      }

      const nodeScoped = (nodeScopedRows || []) as MemoryPreviewRecord[];
      const mergedById = new Map<string, MemoryPreviewRecord>();

      [...nodeScoped, ...taggedRows].forEach((memory) => {
        mergedById.set(memory.id, memory);
      });

      const merged = [...mergedById.values()]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 5);

      const authorIds = [
        ...new Set(merged.map((memory) => memory.author_id).filter(Boolean)),
      ];

      const { data: authorProfiles } =
        authorIds.length > 0
          ? await supabase
              .from('profiles')
              .select('id,display_name,email')
              .in('id', authorIds)
          : { data: [] };

      const authorNameById: Record<string, string> = {};
      (authorProfiles as MemoryAuthorProfile[] | null)?.forEach((profile) => {
        authorNameById[profile.id] = formatProfileName(profile);
      });

      setMemoryPreviews(
        merged.map((memory) => ({
          ...memory,
          author_name: authorNameById[memory.author_id] || 'Family Member',
        }))
      );
      setLoadingMemoryPreviews(false);
    },
    [formatProfileName, graphId, nodeId, supabase]
  );

  const loadCandidates = useCallback(async () => {
    setLoadingCandidates(true);

    const { data, error } = await supabase
      .from('nodes')
      .select('id,first_name,last_name,birthdate,claimed_by')
      .eq('graph_id', graphId)
      .neq('id', nodeId)
      .order('first_name', { ascending: true });

    if (error) {
      setActionError('Could not load people to connect.');
      setCandidates([]);
      setLoadingCandidates(false);
      return;
    }

    setCandidates((data || []) as CandidateNodeData[]);
    setLoadingCandidates(false);
  }, [graphId, nodeId, supabase]);

  const openLinkPicker = useCallback(
    (kind: ExistingRelationshipKind) => {
      setActionError(null);
      setActionNotice(null);
      setCandidateQuery('');
      setLinkMode(kind);
      void loadCandidates();
    },
    [loadCandidates]
  );

  const closeLinkPicker = useCallback(() => {
    setLinkMode(null);
    setCandidateQuery('');
    setLinkingCandidateId(null);
  }, []);

  const loadClaimStatus = useCallback(async () => {
    setLoadingClaimStatus(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCurrentUserId(null);
      setCurrentGraphRole(null);
      setHasClaimedNodeInGraph(false);
      setLoadingClaimStatus(false);
      return;
    }

    setCurrentUserId(user.id);

    const { data: membershipRow } = await supabase
      .from('user_graph_memberships')
      .select('role')
      .eq('graph_id', graphId)
      .eq('profile_id', user.id)
      .maybeSingle();

    setCurrentGraphRole((membershipRow?.role as GraphMembershipRole | undefined) || null);

    const { data: claimedRows } = await supabase
      .from('nodes')
      .select('id')
      .eq('graph_id', graphId)
      .eq('claimed_by', user.id)
      .limit(1);

    setHasClaimedNodeInGraph(Boolean((claimedRows || []).length));
    setLoadingClaimStatus(false);
  }, [graphId, supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadNode();
  }, [loadNode]);

  useEffect(() => {
    if (!node) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMemoryPreviews(node.claimed_by);
  }, [loadMemoryPreviews, node]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadClaimStatus();
  }, [loadClaimStatus]);

  function handleAvatarFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarUploadFile(file);
    setAvatarRemoved(false);

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!node) return;

    if (node.claimed_by) {
      setActionError('This person is claimed. Edit profile details from their profile page.');
      setEditing(false);
      return;
    }

    setSaving(true);
    setActionError(null);

    let nextAvatarUrl: string | null = avatarRemoved ? null : node.avatar_url;

    if (avatarUploadFile) {
      const ext = avatarUploadFile.name.split('.').pop() || 'jpg';
      const uploadPath = `${graphId}/nodes/${nodeId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('memories')
        .upload(uploadPath, avatarUploadFile);

      if (uploadError) {
        setActionError(`Avatar upload failed: ${uploadError.message}`);
        setSaving(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('memories')
        .getPublicUrl(uploadPath);
      nextAvatarUrl = publicUrlData.publicUrl;
    }

    const { error: saveError } = await supabase
      .from('nodes')
      .update({
        first_name: editData.first_name,
        last_name: editData.last_name || null,
        bio: editData.bio || null,
        birthdate: editData.birthdate || null,
        death_date: editData.death_date || null,
        avatar_url: nextAvatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', nodeId)
      .eq('graph_id', graphId);

    if (saveError) {
      setActionError(saveError.message || 'Could not save details.');
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditing(false);
    void loadNode();
    onUpdate?.();
  }

  async function handleDelete() {
    if (deleting) return;
    if (!confirm('Are you sure you want to remove this person from the tree?')) return;

    setDeleting(true);
    setActionError(null);

    const { error } = await supabase
      .from('nodes')
      .delete()
      .eq('id', nodeId)
      .eq('graph_id', graphId);

    if (error) {
      setActionError(
        error.message.includes('row-level security')
          ? 'You do not have permission to remove this person.'
          : error.message
      );
      setDeleting(false);
      return;
    }

    setDeleting(false);
    onClose();
    onUpdate?.();
  }

  async function handleClaimNode() {
    if (!node || claimingNode || node.claimed_by) return;

    setClaimingNode(true);
    setActionError(null);
    setActionNotice(null);

    const { error } = await supabase.rpc('claim_tree_node', {
      _graph_id: graphId,
      _node_id: node.id,
    });

    if (error) {
      setActionError(error.message || 'Could not claim this family member.');
      setClaimingNode(false);
      return;
    }

    setActionNotice('This profile is now linked to your account.');
    setHasClaimedNodeInGraph(true);
    setClaimingNode(false);
    void loadNode();
    onUpdate?.();
  }

  async function handleUnclaimNode() {
    if (!node || unclaimingNode || node.claimed_by !== currentUserId) return;

    if (!confirm('Unclaim this profile from your account?')) return;

    setUnclaimingNode(true);
    setActionError(null);
    setActionNotice(null);

    const { error } = await supabase.rpc('unclaim_tree_node', {
      _graph_id: graphId,
      _node_id: node.id,
    });

    if (error) {
      setActionError(error.message || 'Could not unclaim this profile.');
      setUnclaimingNode(false);
      return;
    }

    setActionNotice('You have unclaimed this profile.');
    setHasClaimedNodeInGraph(false);
    setUnclaimingNode(false);
    void loadNode();
    onUpdate?.();
  }

  async function handleLinkExisting(
    targetNodeId: string,
    relationship: ExistingRelationshipKind
  ) {
    if (linkingCandidateId) return;

    setLinkingCandidateId(targetNodeId);
    setActionError(null);
    setActionNotice(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setActionError('Sign in again to create relationships.');
      setLinkingCandidateId(null);
      return;
    }

    const { data: edgeRows, error: edgeLoadError } = await supabase
      .from('edges')
      .select('id,source_id,target_id,type')
      .eq('graph_id', graphId);

    if (edgeLoadError) {
      setActionError('Could not load existing relationships.');
      setLinkingCandidateId(null);
      return;
    }

    const edges = (edgeRows || []) as GraphEdgeData[];

    const countParents = (childId: string) =>
      edges.filter(
        (edge) => edge.type === 'parent_child' && edge.target_id === childId
      ).length;

    const countSpouses = (personId: string) =>
      edges.filter(
        (edge) =>
          edge.type === 'partnership' &&
          (edge.source_id === personId || edge.target_id === personId)
      ).length;

    const hasExactEdge = (
      sourceId: string,
      targetId: string,
      type: 'parent_child' | 'partnership'
    ) =>
      edges.some(
        (edge) =>
          edge.source_id === sourceId &&
          edge.target_id === targetId &&
          edge.type === type
      );

    const hasAnyEdgeDirection = (sourceId: string, targetId: string) =>
      edges.some(
        (edge) => edge.source_id === sourceId && edge.target_id === targetId
      );

    const hasPartnership = (personA: string, personB: string) =>
      edges.some(
        (edge) =>
          edge.type === 'partnership' &&
          ((edge.source_id === personA && edge.target_id === personB) ||
            (edge.source_id === personB && edge.target_id === personA))
      );

    const edgesToInsert: Array<{
      graph_id: string;
      source_id: string;
      target_id: string;
      type: 'parent_child' | 'partnership';
      created_by: string;
    }> = [];

    if (relationship === 'parent') {
      if (countParents(nodeId) >= 2) {
        setActionError('This person already has two parents.');
        setLinkingCandidateId(null);
        return;
      }

      if (hasExactEdge(targetNodeId, nodeId, 'parent_child')) {
        setActionError('That parent relationship already exists.');
        setLinkingCandidateId(null);
        return;
      }

      if (hasAnyEdgeDirection(nodeId, targetNodeId)) {
        setActionError(
          'Cannot create this relationship because there is already an opposite-direction link.'
        );
        setLinkingCandidateId(null);
        return;
      }

      edgesToInsert.push({
        graph_id: graphId,
        source_id: targetNodeId,
        target_id: nodeId,
        type: 'parent_child',
        created_by: user.id,
      });
    }

    if (relationship === 'child') {
      if (countParents(targetNodeId) >= 2) {
        setActionError('That person already has two parents.');
        setLinkingCandidateId(null);
        return;
      }

      if (hasExactEdge(nodeId, targetNodeId, 'parent_child')) {
        setActionError('That child relationship already exists.');
        setLinkingCandidateId(null);
        return;
      }

      if (hasAnyEdgeDirection(targetNodeId, nodeId)) {
        setActionError(
          'Cannot create this relationship because there is already an opposite-direction link.'
        );
        setLinkingCandidateId(null);
        return;
      }

      edgesToInsert.push({
        graph_id: graphId,
        source_id: nodeId,
        target_id: targetNodeId,
        type: 'parent_child',
        created_by: user.id,
      });
    }

    if (relationship === 'spouse') {
      if (countSpouses(nodeId) >= 1) {
        setActionError('This person already has a spouse.');
        setLinkingCandidateId(null);
        return;
      }

      if (countSpouses(targetNodeId) >= 1) {
        setActionError('That person already has a spouse.');
        setLinkingCandidateId(null);
        return;
      }

      if (hasPartnership(nodeId, targetNodeId)) {
        setActionError('That spouse relationship already exists.');
        setLinkingCandidateId(null);
        return;
      }

      if (hasAnyEdgeDirection(targetNodeId, nodeId)) {
        setActionError(
          'Cannot create spouse relationship when the opposite direction is already linked.'
        );
        setLinkingCandidateId(null);
        return;
      }

      edgesToInsert.push({
        graph_id: graphId,
        source_id: nodeId,
        target_id: targetNodeId,
        type: 'partnership',
        created_by: user.id,
      });
    }

    const { error: edgeInsertError } = await supabase.from('edges').insert(edgesToInsert);

    if (edgeInsertError) {
      setActionError(edgeInsertError.message || 'Could not connect these people.');
      setLinkingCandidateId(null);
      return;
    }

    const relationshipLabel =
      relationship === 'parent'
        ? 'parent'
        : relationship === 'child'
          ? 'child'
          : 'spouse';

    setActionNotice(`Connected existing person as ${relationshipLabel}.`);
    setLinkingCandidateId(null);
    closeLinkPicker();
    void loadNode();
    onUpdate?.();
  }

  const filteredCandidates = candidates.filter((candidate) => {
    if (!candidateQuery.trim()) return true;

    const fullName = `${candidate.first_name} ${candidate.last_name || ''}`
      .trim()
      .toLowerCase();

    return fullName.includes(candidateQuery.toLowerCase());
  });

  const linkModeLabel =
    linkMode === 'parent'
      ? 'Parent'
      : linkMode === 'child'
        ? 'Child'
        : 'Spouse';
  const canLinkExistingRelationships =
    currentGraphRole === 'admin' || currentGraphRole === 'editor';
  const canClaimThisNode =
    Boolean(node) &&
    !node?.claimed_by &&
    Boolean(currentUserId) &&
    !hasClaimedNodeInGraph &&
    !loadingClaimStatus;

  if (!node) {
    return (
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed right-0 top-0 h-full w-96 bg-white/95 backdrop-blur-xl shadow-2xl border-l border-stone/30 z-30 p-6 flex items-center justify-center"
      >
        <Loader2 className="w-6 h-6 animate-spin text-moss" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed right-0 top-0 h-full w-96 bg-white/95 backdrop-blur-xl shadow-2xl border-l border-stone/30 z-30 overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-sm p-4 border-b border-stone/30 flex items-center justify-between z-10">
        <h3 className="text-lg font-semibold text-earth">Person Details</h3>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone/40 transition-colors"
        >
          <X className="w-4 h-4 text-bark/40" />
        </button>
      </div>

      <div className="p-6">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div
            className={`w-24 h-24 rounded-full overflow-hidden shadow-lg ring-4 ${
              !node.death_date ? 'ring-leaf/30' : 'ring-stone/30 grayscale'
            }`}
          >
            {node.avatar_url ? (
              <Image
                src={node.avatar_url}
                alt={`${node.first_name} ${node.last_name || ''}`}
                width={96}
                height={96}
                className="object-cover w-full h-full"
                style={buildImageCropStyle(
                  {
                    zoom: node.avatar_zoom,
                    focusX: node.avatar_focus_x,
                    focusY: node.avatar_focus_y,
                  },
                  { minZoom: 1, maxZoom: 3 }
                )}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-moss to-leaf text-white font-bold text-3xl">
                {node.first_name[0]}
                {node.last_name?.[0] || ''}
              </div>
            )}
          </div>

          {!editing && (
            <>
              <h2 className="text-2xl font-semibold text-earth mt-4">
                {node.first_name} {node.last_name || ''}
              </h2>
              {node.birthdate && (
                <p className="text-sm text-bark/50 flex items-center gap-1.5 mt-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDateOnly(node.birthdate, 'en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  }) || 'Unknown'}
                  {node.death_date && (
                    <>
                      {' — '}
                      {formatDateOnly(node.death_date, 'en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      }) || 'Unknown'}
                    </>
                  )}
                </p>
              )}
              {!node.claimed_by && (
                <span className="mt-2 px-3 py-1 bg-sunrise/10 text-sunrise text-xs font-medium rounded-full">
                  Not yet claimed
                </span>
              )}
              {node.claimed_by && (
                <>
                  <span className="mt-2 px-3 py-1 bg-moss/10 text-moss text-xs font-medium rounded-full">
                    Claimed profile
                  </span>
                  {claimedProfile?.gender ? (
                    <p className="text-xs text-bark/50 mt-2 capitalize">
                      {claimedProfile.gender.replace('_', ' ')}
                    </p>
                  ) : null}
                  <Link
                    href={`/profile/${node.claimed_by}`}
                    className="mt-2 text-xs text-moss font-medium hover:underline"
                  >
                    View profile
                  </Link>
                </>
              )}
            </>
          )}
        </div>

        {editing ? (
          /* Edit form */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-earth mb-2">
                Profile Picture
              </label>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full overflow-hidden border border-stone/60 bg-stone/20">
                  {avatarPreview && !avatarRemoved ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                      style={buildImageCropStyle(
                        {
                          zoom: node.avatar_zoom,
                          focusX: node.avatar_focus_x,
                          focusY: node.avatar_focus_y,
                        },
                        { minZoom: 1, maxZoom: 3 }
                      )}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-bark/35">
                      <Camera className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-stone text-xs text-earth hover:bg-stone/30 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-moss" />
                    Upload
                  </button>
                  {(avatarPreview || node.avatar_url) && (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarUploadFile(null);
                        setAvatarPreview(null);
                        setAvatarRemoved(true);
                      }}
                      className="px-3 py-2 rounded-lg border border-stone text-xs text-bark/65 hover:bg-stone/30 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-earth mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={editData.first_name}
                  onChange={(e) =>
                    setEditData({ ...editData, first_name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-stone focus:outline-none focus:ring-2 focus:ring-moss/50 text-sm text-earth"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-earth mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={editData.last_name}
                  onChange={(e) =>
                    setEditData({ ...editData, last_name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-stone focus:outline-none focus:ring-2 focus:ring-moss/50 text-sm text-earth"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-earth mb-1">
                Bio
              </label>
              <textarea
                value={editData.bio}
                onChange={(e) =>
                  setEditData({ ...editData, bio: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-stone focus:outline-none focus:ring-2 focus:ring-moss/50 text-sm text-earth resize-none"
                placeholder="Tell their story..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-earth mb-1">
                  Birth Date
                </label>
                <input
                  type="date"
                  value={editData.birthdate}
                  onChange={(e) =>
                    setEditData({ ...editData, birthdate: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-stone focus:outline-none focus:ring-2 focus:ring-moss/50 text-sm text-earth"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-earth mb-1">
                  Death Date
                </label>
                <input
                  type="date"
                  value={editData.death_date}
                  onChange={(e) =>
                    setEditData({ ...editData, death_date: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-stone focus:outline-none focus:ring-2 focus:ring-moss/50 text-sm text-earth"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={saving || !editData.first_name.trim()}
                className="flex-1 bg-gradient-to-r from-moss to-leaf text-white py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  void loadNode();
                }}
                className="px-4 py-2.5 rounded-xl border border-stone text-bark/60 text-sm hover:bg-stone/30 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Bio */}
            {node.bio && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-bark/40 uppercase tracking-wider mb-2">
                  About
                </h4>
                <p className="text-earth text-sm leading-relaxed">{node.bio}</p>
              </div>
            )}

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-bark/40 uppercase tracking-wider">
                  Tagged Memories
                </h4>
                <Link
                  href={`/${graphId}/memories`}
                  className="text-xs text-moss font-medium hover:underline"
                >
                  View all
                </Link>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateMemory(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-moss to-leaf text-white text-sm font-medium shadow-md mb-3"
              >
                <BookOpen className="w-4 h-4" />
                Create Memory
              </button>

              {memoryPreviewError ? (
                <p className="text-xs text-error mb-2">{memoryPreviewError}</p>
              ) : null}

              {loadingMemoryPreviews ? (
                <div className="text-xs text-bark/50 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading recent memories...
                </div>
              ) : memoryPreviews.length === 0 ? (
                <p className="text-xs text-bark/45">
                  No memories tagged to this person in this tree yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {memoryPreviews.map((memory) => (
                    <div
                      key={memory.id}
                      className="rounded-xl border border-stone/35 bg-white/80 p-3"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-earth truncate">
                          {memory.title || 'Untitled memory'}
                        </p>
                        <span className="text-[11px] uppercase tracking-wide text-bark/40 shrink-0">
                          {memory.type}
                        </span>
                      </div>
                      {memory.content ? (
                        <p className="text-xs text-bark/60 leading-relaxed">
                          {memory.type === 'story'
                            ? buildStoryExcerpt(memory.content, 120)
                            : memory.content}
                        </p>
                      ) : (
                        <p className="text-xs text-bark/50">
                          {memory.type === 'photo' ? 'Photo memory' : 'Story'}
                        </p>
                      )}
                      <p className="text-[11px] text-bark/45 mt-2">
                        by {memory.author_name} ·{' '}
                        {new Date(memory.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-bark/40 uppercase tracking-wider mb-3">
                Actions
              </h4>

              {actionError && (
                <div className="px-3 py-2 rounded-lg bg-error/10 text-error text-xs">
                  {actionError}
                </div>
              )}

              {actionNotice && (
                <div className="px-3 py-2 rounded-lg bg-success/10 text-success text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {actionNotice}
                </div>
              )}

              {!node.claimed_by && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-stone/30 transition-colors text-earth text-sm"
                >
                  <Edit3 className="w-4 h-4 text-moss" />
                  Edit Details
                </button>
              )}

              {canClaimThisNode && (
                <button
                  type="button"
                  onClick={() => void handleClaimNode()}
                  disabled={claimingNode}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-moss/10 border border-moss/35 text-earth text-sm hover:bg-moss/15 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {claimingNode ? (
                    <Loader2 className="w-4 h-4 text-moss animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-moss" />
                  )}
                  {claimingNode ? 'Claiming…' : 'Claim This Profile'}
                </button>
              )}

              {node.claimed_by === currentUserId ? (
                <button
                  type="button"
                  onClick={() => void handleUnclaimNode()}
                  disabled={unclaimingNode}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-stone/50 text-earth text-sm hover:bg-stone/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {unclaimingNode ? (
                    <Loader2 className="w-4 h-4 text-bark/60 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4 text-bark/60" />
                  )}
                  {unclaimingNode ? 'Unclaiming…' : 'Unclaim Profile'}
                </button>
              ) : null}

              {!node.claimed_by &&
              !loadingClaimStatus &&
              Boolean(currentUserId) &&
              hasClaimedNodeInGraph ? (
                <p className="px-1 text-xs text-bark/55">
                  You already have a claimed profile in this tree.
                </p>
              ) : null}

              {canLinkExistingRelationships ? (
                <>
                  <button
                    type="button"
                    onClick={() => openLinkPicker('parent')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-earth text-sm ${
                      linkMode === 'parent' ? 'bg-moss/10 border border-moss/30' : 'hover:bg-stone/30'
                    }`}
                  >
                    <Users className="w-4 h-4 text-moss" />
                    Link Existing Parent
                  </button>

                  <button
                    type="button"
                    onClick={() => openLinkPicker('child')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-earth text-sm ${
                      linkMode === 'child' ? 'bg-moss/10 border border-moss/30' : 'hover:bg-stone/30'
                    }`}
                  >
                    <UserPlus className="w-4 h-4 text-moss" />
                    Link Existing Child
                  </button>

                  <button
                    type="button"
                    onClick={() => openLinkPicker('spouse')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-earth text-sm ${
                      linkMode === 'spouse'
                        ? 'bg-sunrise/10 border border-sunrise/30'
                        : 'hover:bg-stone/30'
                    }`}
                  >
                    <Heart className="w-4 h-4 text-sunrise" />
                    Link Existing Spouse
                  </button>
                </>
              ) : null}

              {canLinkExistingRelationships && linkMode && (
                <div className="mt-1 rounded-xl border border-stone/50 bg-white/70 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-earth">
                      Choose existing {linkModeLabel.toLowerCase()}
                    </p>
                    <button
                      type="button"
                      onClick={closeLinkPicker}
                      className="text-bark/50 hover:text-earth transition-colors"
                      aria-label="Close picker"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="relative mb-2">
                    <input
                      type="text"
                      value={candidateQuery}
                      onChange={(event) => setCandidateQuery(event.target.value)}
                      placeholder="Search people..."
                      className="w-full px-3 py-2 rounded-lg border border-stone/60 bg-white text-earth text-sm focus:outline-none focus:ring-2 focus:ring-moss/35"
                    />
                    <Link2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-bark/40" />
                  </div>

                  <div className="max-h-56 overflow-y-auto rounded-lg border border-stone/40 bg-white/80 divide-y divide-stone/35">
                    {loadingCandidates ? (
                      <div className="px-3 py-4 text-xs text-bark/60 flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Loading people...
                      </div>
                    ) : filteredCandidates.length === 0 ? (
                      <div className="px-3 py-4 text-xs text-bark/60">
                        No matching people found.
                      </div>
                    ) : (
                      filteredCandidates.map((candidate) => (
                        <div
                          key={candidate.id}
                          className="px-3 py-2.5 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-earth truncate">
                              {candidate.first_name} {candidate.last_name || ''}
                            </p>
                            <p className="text-[11px] text-bark/55">
                              {getDateOnlyYear(candidate.birthdate) || 'No birth year'}
                              {candidate.claimed_by ? ' • Claimed' : ' • Unclaimed'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleLinkExisting(candidate.id, linkMode)}
                            disabled={Boolean(linkingCandidateId)}
                            className="shrink-0 px-2.5 py-1.5 rounded-md bg-moss/15 text-moss text-xs font-medium hover:bg-moss/25 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {linkingCandidateId === candidate.id ? 'Linking…' : 'Link'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="h-px bg-stone/30 my-2" />

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-error/10 transition-colors text-error/70 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? 'Removing...' : 'Remove from Tree'}
              </button>
            </div>
          </>
        )}
      </div>

      {showCreateMemory && (
        <CreateMemoryModal
          graphId={graphId}
          nodeId={nodeId}
          preselectedSubjectIds={node?.claimed_by ? [node.claimed_by] : undefined}
          preselectedSubjectNodeIds={!node?.claimed_by ? [nodeId] : undefined}
          onClose={() => setShowCreateMemory(false)}
          onCreated={() => {
            void loadNode();
            void loadMemoryPreviews(node?.claimed_by ?? null);
            onUpdate?.();
          }}
        />
      )}
    </motion.div>
  );
}
