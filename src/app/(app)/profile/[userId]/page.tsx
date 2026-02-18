import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Calendar, UserRound } from 'lucide-react';

import { ProfileEditorForm } from '@/components/profile/ProfileEditorForm';
import { createClient } from '@/lib/supabase/server';
import { formatDateOnly } from '@/utils/dateOnly';
import { buildImageCropStyle } from '@/utils/imageCrop';
import { buildStoryExcerpt, extractFirstMarkdownImage } from '@/utils/markdown';

type ProfilePageProps = {
  params: Promise<{ userId: string }>;
};

type ProfileRow = {
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

type AuthorProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email: string | null;
};

type SharedMembershipRow = {
  graph_id: string;
  graphs: { name: string } | { name: string }[] | null;
};

type ClaimedNodeRow = {
  id: string;
};

type MemorySubjectRow = {
  memory_id: string;
};

type MemoryRow = {
  id: string;
  graph_id: string;
  author_id: string;
  type: 'story' | 'photo' | 'document';
  title: string | null;
  content: string | null;
  media_url: string | null;
  media_zoom: number | null;
  media_focus_x: number | null;
  media_focus_y: number | null;
  created_at: string;
  event_date: string | null;
};

function formatProfileName(
  profile: Pick<ProfileRow, 'first_name' | 'last_name' | 'display_name' | 'email'>
) {
  const fullName = [profile.first_name?.trim(), profile.last_name?.trim()]
    .filter(Boolean)
    .join(' ')
    .trim();
  return fullName || profile.display_name?.trim() || profile.email?.trim() || 'Family Member';
}

function resolveGraphName(
  graphRef: SharedMembershipRow['graphs']
): string | null {
  if (!graphRef) return null;
  return Array.isArray(graphRef) ? graphRef[0]?.name || null : graphRef.name;
}

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { userId } = await params;
  return {
    title: `Profile | ${userId}`,
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { userId } = await params;
  const supabase = await createClient();

  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  if (!viewer) {
    redirect('/login');
  }

  const { data: subjectProfile } = await supabase
    .from('profiles')
    .select(
      'id,first_name,last_name,display_name,email,avatar_url,avatar_zoom,avatar_focus_x,avatar_focus_y,gender,bio,birthdate,onboarding_completed'
    )
    .eq('id', userId)
    .single();

  if (!subjectProfile) {
    notFound();
  }

  const { data: sharedMembershipRows } = await supabase
    .from('user_graph_memberships')
    .select('graph_id,graphs(name)')
    .eq('profile_id', userId);

  const sharedMemberships = (sharedMembershipRows as SharedMembershipRow[]) ?? [];
  const sharedGraphIds = [
    ...new Set(sharedMemberships.map((row) => row.graph_id).filter(Boolean)),
  ];

  const graphNameById: Record<string, string> = {};
  sharedMemberships.forEach((row) => {
    graphNameById[row.graph_id] = resolveGraphName(row.graphs) || 'Family Tree';
  });

  const { data: claimedNodeRows } =
    sharedGraphIds.length > 0
      ? await supabase
          .from('nodes')
          .select('id')
          .eq('claimed_by', userId)
          .in('graph_id', sharedGraphIds)
      : { data: [] };

  const claimedNodeIds = [
    ...new Set(
      ((claimedNodeRows as ClaimedNodeRow[]) ?? [])
        .map((row) => row.id)
        .filter(Boolean)
    ),
  ];

  let taggedMemoryRows: MemorySubjectRow[] = [];
  if (sharedGraphIds.length > 0) {
    const nodeFilter =
      claimedNodeIds.length > 0
        ? `subject_node_id.in.(${claimedNodeIds.join(',')})`
        : null;
    const subjectFilter = nodeFilter
      ? `subject_user_id.eq.${userId},${nodeFilter}`
      : `subject_user_id.eq.${userId}`;
    const { data } = await supabase
      .from('memory_subjects')
      .select('memory_id')
      .or(subjectFilter);

    taggedMemoryRows = (data as MemorySubjectRow[] | null) ?? [];
  }

  const taggedMemoryIds = [
    ...new Set(
      taggedMemoryRows.map((row) => row.memory_id).filter(Boolean)
    ),
  ];

  const { data: memoryRows } =
    sharedGraphIds.length > 0 && taggedMemoryIds.length > 0
      ? await supabase
          .from('memories')
          .select('id,graph_id,author_id,type,title,content,media_url,media_zoom,media_focus_x,media_focus_y,created_at,event_date')
          .in('graph_id', sharedGraphIds)
          .in('id', taggedMemoryIds)
          .order('created_at', { ascending: false })
          .limit(80)
      : { data: [] };

  const memories = (memoryRows as MemoryRow[]) ?? [];

  const authorIds = [...new Set(memories.map((memory) => memory.author_id).filter(Boolean))];
  const { data: authorProfiles } =
    authorIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id,first_name,last_name,display_name,email')
          .in('id', authorIds)
      : { data: [] };

  const authorNameById: Record<string, string> = {};
  ((authorProfiles as AuthorProfileRow[]) ?? []).forEach((author) => {
    authorNameById[author.id] = formatProfileName(author);
  });

  const subjectName = formatProfileName(subjectProfile);
  const isSelf = viewer.id === userId;
  const subjectInitials =
    `${subjectProfile.first_name?.[0] || ''}${subjectProfile.last_name?.[0] || ''}` ||
    subjectName[0] ||
    '?';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8 rounded-2xl border border-stone/40 bg-white/75 p-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden border border-stone/45">
            {subjectProfile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={subjectProfile.avatar_url}
                alt={subjectName}
                className="w-full h-full object-cover"
                style={buildImageCropStyle(
                  {
                    zoom: subjectProfile.avatar_zoom,
                    focusX: subjectProfile.avatar_focus_x,
                    focusY: subjectProfile.avatar_focus_y,
                  },
                  { minZoom: 1, maxZoom: 3 }
                )}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-moss to-leaf text-white font-semibold text-2xl flex items-center justify-center">
                {subjectInitials}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-bark/45 mb-2">
              Profile
            </p>
            <h1 className="text-3xl font-semibold text-earth tracking-tight">
              {subjectName}
            </h1>
            <p className="text-sm text-bark/55 mt-2">
              Memories tagged to this person across shared trees
            </p>
            <div className="flex flex-wrap gap-2 mt-2 text-xs text-bark/55">
              {subjectProfile.gender ? (
                <span className="px-2 py-1 rounded-full bg-stone/35 capitalize">
                  {subjectProfile.gender.replace('_', ' ')}
                </span>
              ) : null}
              {subjectProfile.birthdate ? (
                <span className="px-2 py-1 rounded-full bg-stone/35">
                  Born {formatDateOnly(subjectProfile.birthdate) || 'Unknown'}
                </span>
              ) : null}
            </div>
            {subjectProfile.email ? (
              <p className="text-xs text-bark/45 mt-2">{subjectProfile.email}</p>
            ) : null}
          </div>
        </div>
        {subjectProfile.bio ? (
          <p className="text-sm text-earth/85 mt-4 leading-relaxed">{subjectProfile.bio}</p>
        ) : null}
      </div>

      {isSelf ? (
        <div className="mb-8">
          <ProfileEditorForm
            profile={subjectProfile as ProfileRow}
            title="Edit Your Profile"
            description="Changes here update your claimed identity across trees."
            submitLabel="Save Changes"
          />
        </div>
      ) : null}

      {sharedGraphIds.length === 0 ? (
        <div className="rounded-2xl border border-stone/35 bg-white/70 p-6 text-sm text-bark/55">
          No shared trees with this profile.
        </div>
      ) : memories.length === 0 ? (
        <div className="rounded-2xl border border-stone/35 bg-white/70 p-6 text-sm text-bark/55">
          No tagged memories found across your shared trees.
        </div>
      ) : (
        <div className="space-y-4">
          {memories.map((memory) => {
            const previewImage =
              memory.type === 'photo'
                ? memory.media_url
                : extractFirstMarkdownImage(memory.content || '') || memory.media_url;

            return (
              <article
                key={memory.id}
                className="rounded-2xl border border-stone/35 bg-white/78 overflow-hidden"
              >
                {previewImage ? (
                  <div
                    className={`w-full overflow-hidden ${
                      memory.type === 'photo' ? 'aspect-[4/5]' : 'aspect-video'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewImage}
                      alt={memory.title || 'Memory'}
                      className="w-full h-full object-cover"
                      style={
                        memory.type === 'photo'
                          ? buildImageCropStyle(
                              {
                                zoom: memory.media_zoom,
                                focusX: memory.media_focus_x,
                                focusY: memory.media_focus_y,
                              },
                              { minZoom: 1, maxZoom: 3 }
                            )
                          : undefined
                      }
                    />
                  </div>
                ) : null}

                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-bark/45 mb-2">
                    <span className="inline-flex items-center gap-1">
                      <UserRound className="w-3.5 h-3.5" />
                      {graphNameById[memory.graph_id] || 'Family Tree'}
                    </span>
                    <span>•</span>
                    <span>{memory.type}</span>
                    <span>•</span>
                    <span>by {authorNameById[memory.author_id] || 'Family Member'}</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(memory.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <h2 className="text-lg font-semibold text-earth">
                    {memory.title || 'Untitled memory'}
                  </h2>
                  {memory.content ? (
                    <p className="mt-2 text-sm text-bark/65 leading-relaxed">
                      {memory.type === 'story'
                        ? buildStoryExcerpt(memory.content, 240)
                        : memory.content}
                    </p>
                  ) : null}

                  <Link
                    href={`/${memory.graph_id}/memories`}
                    className="inline-block mt-3 text-sm text-moss font-medium hover:underline"
                  >
                    Open in tree feed
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
