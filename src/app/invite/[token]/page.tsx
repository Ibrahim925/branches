import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarClock, ShieldCheck, TreePine, UserRound } from 'lucide-react';

import { InviteAcceptActions } from '@/components/invite/InviteAcceptActions';
import { formatInviteeName, getInvitePreviewByToken } from '@/lib/invites';
import { createClient } from '@/lib/supabase/server';

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

function buildInviteCopy(
  treeName: string,
  inviteeName: string | null
): { title: string; description: string } {
  if (inviteeName) {
    return {
      title: `${inviteeName}, you are invited to join ${treeName}`,
      description: `Claim your branch in ${treeName} and start sharing your family story.`,
    };
  }

  return {
    title: `You are invited to join ${treeName}`,
    description: `Join the ${treeName} family tree on Branches and collaborate with relatives in real time.`,
  };
}

function resolvePublicAppUrl(): string {
  const envCandidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ];

  const rawUrl = envCandidates.find((candidate) => Boolean(candidate)) || 'https://branches-azure.vercel.app';

  try {
    const parsed = new URL(rawUrl);
    return parsed.origin;
  } catch {
    return 'https://branches-azure.vercel.app';
  }
}

export async function generateMetadata({
  params,
}: InvitePageProps): Promise<Metadata> {
  const { token } = await params;
  const preview = await getInvitePreviewByToken(token);

  const treeName = preview?.graph_name ?? 'a family tree';
  const inviteeName = formatInviteeName(preview);
  const { title, description } = buildInviteCopy(treeName, inviteeName);
  const appUrl = resolvePublicAppUrl();
  const canonicalUrl = new URL(`/invite/${token}`, appUrl).toString();
  const imageUrl = new URL(`/invite/${token}/opengraph-image`, appUrl).toString();

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Branches',
      type: 'website',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `Invitation preview for ${treeName}`,
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const preview = await getInvitePreviewByToken(token);

  if (!preview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone/25 via-white to-leaf/10 flex items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-3xl border border-stone/40 bg-white/85 backdrop-blur-xl shadow-2xl p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-stone/50 mx-auto mb-4 flex items-center justify-center">
            <TreePine className="w-7 h-7 text-bark/40" />
          </div>
          <h1 className="text-2xl font-semibold text-earth tracking-tight mb-2">
            Invite Not Found
          </h1>
          <p className="text-sm text-bark/55 mb-6">
            This invite link is invalid or has already been removed.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-gradient-to-r from-moss to-leaf text-white font-medium shadow-md shadow-moss/20"
          >
            Go To Branches
          </Link>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const inviteeName = formatInviteeName(preview);
  const expiresAtMs = new Date(preview.expires_at).getTime();
  const hasValidExpiry = Number.isFinite(expiresAtMs);
  const isExpired = preview.status === 'expired' || preview.is_expired;
  const isAccepted = preview.status === 'accepted';
  const acceptedByCurrentUser =
    Boolean(user?.id) && preview.invite_claimed_by === user?.id;

  const roleLabel =
    preview.role.charAt(0).toUpperCase() + preview.role.slice(1);
  const expiresText = hasValidExpiry
    ? new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
      }).format(new Date(expiresAtMs))
    : 'Unknown';

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone/25 via-white to-leaf/10 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl rounded-[28px] border border-stone/40 bg-white/90 backdrop-blur-xl shadow-2xl p-8 md:p-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-moss to-leaf shadow-md flex items-center justify-center">
            <TreePine className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-bark/45">
              Branches Invite
            </p>
            <h1 className="text-xl md:text-2xl font-semibold text-earth tracking-tight">
              {preview.graph_name}
            </h1>
          </div>
        </div>

        <div className="rounded-2xl border border-stone/45 bg-gradient-to-br from-white to-stone/35 p-5 mb-6">
          <p className="text-sm text-bark/60 mb-2">
            {inviteeName
              ? `${inviteeName}, this invitation is waiting for you.`
              : 'You have been invited to this family tree.'}
          </p>
          {inviteeName ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-leaf/15 text-moss text-xs font-medium">
              <UserRound className="w-3.5 h-3.5" />
              Claim profile: {inviteeName}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-7">
          <div className="rounded-xl border border-stone/40 bg-white/70 p-3.5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-bark/45 mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Access Role
            </div>
            <p className="text-sm font-medium text-earth">{roleLabel}</p>
          </div>

          <div className="rounded-xl border border-stone/40 bg-white/70 p-3.5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-bark/45 mb-1.5">
              <CalendarClock className="w-3.5 h-3.5" />
              Expires
            </div>
            <p className="text-sm font-medium text-earth">{expiresText}</p>
          </div>
        </div>

        <InviteAcceptActions
          token={token}
          graphId={preview.graph_id}
          isLoggedIn={Boolean(user)}
          isExpired={isExpired}
          isAccepted={isAccepted}
          acceptedByCurrentUser={acceptedByCurrentUser}
        />
      </div>
    </div>
  );
}
