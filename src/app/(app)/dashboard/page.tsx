import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { GraphCard } from '@/components/dashboard/GraphCard';
import { CreateGraphButton } from '@/components/dashboard/CreateGraphButton';
import type { Metadata } from 'next';
import Link from 'next/link';
import { buildStoryExcerpt } from '@/utils/markdown';

export const metadata: Metadata = {
  title: 'My Trees | Branches',
  description: 'View and manage your family trees',
};

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type MembershipRow = {
  id: string;
  graph_id: string;
  role: 'admin' | 'editor' | 'viewer';
  graphs: {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
  } | null;
};

type DashboardMemoryRow = {
  id: string;
  graph_id: string;
  author_id: string;
  type: 'story' | 'photo' | 'document';
  title: string | null;
  content: string | null;
  media_url: string | null;
  created_at: string;
  event_date: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
};

function formatProfileName(profile: Pick<ProfileRow, 'display_name' | 'email'>) {
  return profile.display_name?.trim() || profile.email?.trim() || 'Family Member';
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const tabParam = resolvedSearchParams?.tab;
  const rawTab = Array.isArray(tabParam) ? tabParam[0] : tabParam;
  const activeTab = rawTab === 'pulse' ? 'pulse' : 'trees';

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: memberships } = await supabase
    .from('user_graph_memberships')
    .select('*, graphs(*)')
    .eq('profile_id', user.id);

  const normalizedMemberships = ((memberships as MembershipRow[]) ?? []).filter(
    (membership): membership is MembershipRow => Boolean(membership.graphs)
  );
  const graphIds = [...new Set(normalizedMemberships.map((membership) => membership.graph_id))];

  const { data: memoryRows } =
    graphIds.length > 0
      ? await supabase
          .from('memories')
          .select('id,graph_id,author_id,type,title,content,media_url,created_at,event_date')
          .in('graph_id', graphIds)
          .order('created_at', { ascending: false })
          .limit(24)
      : { data: [] };

  const recentMemories = (memoryRows as DashboardMemoryRow[]) ?? [];
  const authorIds = [...new Set(recentMemories.map((memory) => memory.author_id).filter(Boolean))];

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
    graphNameById[membership.graph_id] = membership.graphs?.name || 'Family Tree';
  });

  return (
    <div className="min-h-full p-6 md:p-8 lg:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-semibold text-earth mb-2 tracking-tight">
            Dashboard
          </h1>
          <p className="text-bark/60">
            Manage your trees and stay up to date with family activity
          </p>
        </div>

        <div className="mb-8 rounded-2xl border border-stone/35 bg-white/70 p-2 inline-flex items-center gap-2">
          <Link
            href="/dashboard"
            className={`px-4 h-10 rounded-xl text-sm font-medium inline-flex items-center transition-colors ${
              activeTab === 'trees'
                ? 'bg-moss/12 text-moss border border-moss/30'
                : 'text-bark/60 hover:text-earth hover:bg-stone/40'
            }`}
          >
            Trees
          </Link>
          <Link
            href="/dashboard?tab=pulse"
            className={`px-4 h-10 rounded-xl text-sm font-medium inline-flex items-center transition-colors ${
              activeTab === 'pulse'
                ? 'bg-moss/12 text-moss border border-moss/30'
                : 'text-bark/60 hover:text-earth hover:bg-stone/40'
            }`}
          >
            Family Pulse
          </Link>
        </div>

        {activeTab === 'trees' ? (
          <>
            <div>
              <h2 className="text-2xl font-semibold text-earth tracking-tight mb-1">
                Your Family Trees
              </h2>
              <p className="text-sm text-bark/55 mb-5">
                Select a tree to open it, or create a new one.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {normalizedMemberships.map((membership) => (
                <GraphCard
                  key={membership.id}
                  graph={membership.graphs!}
                  role={membership.role}
                />
              ))}

              <CreateGraphButton />
            </div>
          </>
        ) : (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-semibold text-earth tracking-tight">
                  Family Pulse
                </h2>
                <p className="text-sm text-bark/55 mt-1">
                  Recent memories across all your trees
                </p>
              </div>
            </div>

            {recentMemories.length === 0 ? (
              <div className="rounded-2xl border border-stone/35 bg-white/65 p-8 text-center">
                <p className="text-sm text-bark/45">No memories yet across your trees.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentMemories.map((memory) => (
                  <article
                    key={memory.id}
                    className="rounded-2xl border border-stone/35 bg-white/72 p-4 md:p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs uppercase tracking-wider text-bark/45">
                        {memory.type}
                      </span>
                      <span className="text-xs text-bark/35">•</span>
                      <span className="text-xs text-moss font-medium">
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

                    <h3 className="text-base font-semibold text-earth">
                      {memory.title || 'Untitled memory'}
                    </h3>

                    {memory.media_url && memory.type === 'photo' ? (
                      <div className="mt-3 rounded-xl overflow-hidden border border-stone/25 max-w-xl">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={memory.media_url}
                          alt={memory.title || 'Memory'}
                          className="w-full h-52 object-cover"
                        />
                      </div>
                    ) : null}

                    {memory.content ? (
                      <p className="mt-2 text-sm text-bark/65 leading-relaxed">
                        {memory.type === 'story'
                          ? buildStoryExcerpt(memory.content, 220)
                          : memory.content}
                      </p>
                    ) : null}

                    <div className="mt-3">
                      <Link
                        href={`/${memory.graph_id}/memories`}
                        className="text-sm text-moss font-medium hover:underline"
                      >
                        Open tree memories
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
