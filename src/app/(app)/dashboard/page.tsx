import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { GraphCard } from '@/components/dashboard/GraphCard';
import { CreateGraphButton } from '@/components/dashboard/CreateGraphButton';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Home | Branches',
  description: 'View and manage your family trees',
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

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const tabParam = resolvedSearchParams?.tab;
  const rawTab = Array.isArray(tabParam) ? tabParam[0] : tabParam;
  if (rawTab === 'pulse') {
    redirect('/pulse');
  }

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

        <div className="pb-[calc(var(--mobile-tab-bar-offset)+5.25rem)] md:pb-0">
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

            <CreateGraphButton triggerVariant="card" />
          </div>

          <CreateGraphButton triggerVariant="fab" />
        </div>
      </div>
    </div>
  );
}
