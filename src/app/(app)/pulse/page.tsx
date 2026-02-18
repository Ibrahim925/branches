import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { buildImageCropStyle } from '@/utils/imageCrop';
import { buildStoryExcerpt } from '@/utils/markdown';

export const metadata: Metadata = {
  title: 'Family Pulse | Branches',
  description: 'Recent memories across all your family trees',
};

type MembershipRow = {
  graph_id: string;
  graphs:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
};

type PulseMemoryRow = {
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
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
};

function formatProfileName(profile: Pick<ProfileRow, 'display_name' | 'email'>) {
  return profile.display_name?.trim() || profile.email?.trim() || 'Family Member';
}

function resolveGraphName(graphRef: MembershipRow['graphs']) {
  if (!graphRef) return null;
  return Array.isArray(graphRef) ? graphRef[0]?.name || null : graphRef.name;
}

export default async function PulsePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: memberships } = await supabase
    .from('user_graph_memberships')
    .select('graph_id,graphs(id,name)')
    .eq('profile_id', user.id);

  const normalizedMemberships = ((memberships as MembershipRow[]) ?? []).filter(
    (membership): membership is MembershipRow => Boolean(membership.graphs)
  );

  const graphIds = [...new Set(normalizedMemberships.map((membership) => membership.graph_id))];

  const { data: memoryRows } =
    graphIds.length > 0
      ? await supabase
          .from('memories')
          .select('id,graph_id,author_id,type,title,content,media_url,media_zoom,media_focus_x,media_focus_y,created_at')
          .in('graph_id', graphIds)
          .order('created_at', { ascending: false })
          .limit(30)
      : { data: [] };

  const memories = (memoryRows as PulseMemoryRow[]) ?? [];
  const authorIds = [...new Set(memories.map((memory) => memory.author_id).filter(Boolean))];

  const { data: profileRows } =
    authorIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id,display_name,email')
          .in('id', authorIds)
      : { data: [] };

  const authorNameById: Record<string, string> = {};
  ((profileRows as ProfileRow[]) ?? []).forEach((profile) => {
    authorNameById[profile.id] = formatProfileName(profile);
  });

  const graphNameById: Record<string, string> = {};
  normalizedMemberships.forEach((membership) => {
    graphNameById[membership.graph_id] = resolveGraphName(membership.graphs) || 'Family Tree';
  });

  return (
    <div className="min-h-full p-6 md:p-8 lg:p-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-earth">
            Family Pulse
          </h1>
          <p className="mt-2 text-sm text-bark/60">
            Recent memories across all your shared trees.
          </p>
        </div>

        {memories.length === 0 ? (
          <div className="rounded-2xl border border-stone/35 bg-white/65 p-8 text-center">
            <p className="text-sm text-bark/45">No memories yet across your trees.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {memories.map((memory) => (
              <article
                key={memory.id}
                className="rounded-2xl border border-stone/35 bg-white/72 p-4 md:p-5"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-bark/45">
                    {memory.type}
                  </span>
                  <span className="text-xs text-bark/35">•</span>
                  <span className="text-xs font-medium text-moss">
                    {graphNameById[memory.graph_id] || 'Family Tree'}
                  </span>
                  <span className="text-xs text-bark/35">•</span>
                  <span className="text-xs text-bark/45">
                    by {authorNameById[memory.author_id] || 'Family Member'}
                  </span>
                  <span className="text-xs text-bark/35">•</span>
                  <span className="text-xs text-bark/45">
                    {new Date(memory.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <h2 className="text-base font-semibold text-earth">
                  {memory.title || 'Untitled memory'}
                </h2>

                {memory.media_url && memory.type === 'photo' ? (
                  <div className="mt-3 aspect-[4/5] max-w-[340px] overflow-hidden rounded-xl border border-stone/25">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={memory.media_url}
                      alt={memory.title || 'Memory'}
                      className="h-full w-full object-cover"
                      style={buildImageCropStyle(
                        {
                          zoom: memory.media_zoom,
                          focusX: memory.media_focus_x,
                          focusY: memory.media_focus_y,
                        },
                        { minZoom: 1, maxZoom: 3 }
                      )}
                    />
                  </div>
                ) : null}

                {memory.content ? (
                  <p className="mt-2 text-sm leading-relaxed text-bark/65">
                    {memory.type === 'story'
                      ? buildStoryExcerpt(memory.content, 220)
                      : memory.content}
                  </p>
                ) : null}

                <div className="mt-3">
                  <Link
                    href={`/${memory.graph_id}/memories`}
                    className="text-sm font-medium text-moss hover:underline"
                  >
                    Open tree memories
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
