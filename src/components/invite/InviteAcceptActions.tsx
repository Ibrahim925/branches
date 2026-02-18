'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Loader2, LogIn } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';

type InviteAcceptActionsProps = {
  token: string;
  graphId: string;
  isLoggedIn: boolean;
  isExpired: boolean;
  isAccepted: boolean;
  acceptedByCurrentUser: boolean;
};

export function InviteAcceptActions({
  token,
  graphId,
  isLoggedIn,
  isExpired,
  isAccepted,
  acceptedByCurrentUser,
}: InviteAcceptActionsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextInvitePath = `/invite/${token}`;
  const loginHref = `/login?next=${encodeURIComponent(nextInvitePath)}`;
  const treeHref = `/${graphId}`;

  async function handleAccept() {
    setIsSubmitting(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsSubmitting(false);
      router.push(loginHref);
      return;
    }

    const { data, error: rpcError } = await supabase.rpc('accept_invite', {
      _token: token,
    });

    if (rpcError) {
      setError(rpcError.message);
      setIsSubmitting(false);
      return;
    }

    const acceptedGraphId =
      Array.isArray(data) && data[0]?.graph_id ? data[0].graph_id : graphId;
    router.push(`/${acceptedGraphId}`);
    router.refresh();
  }

  if (isAccepted && acceptedByCurrentUser) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2 text-sm text-success font-medium">
          <CheckCircle2 className="w-4 h-4" />
          Invite already accepted by you
        </div>
        <Link
          href={treeHref}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-moss to-leaf text-white font-medium shadow-md shadow-moss/20 hover:shadow-lg transition-shadow"
        >
          Open Tree
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  if (isAccepted) {
    return (
      <p className="text-sm text-bark/60 text-center">
        This invite has already been accepted.
      </p>
    );
  }

  if (isExpired) {
    return (
      <p className="text-sm text-bark/60 text-center">
        This invite has expired. Ask a tree admin for a new link.
      </p>
    );
  }

  if (!isLoggedIn) {
    return (
      <Link
        href={loginHref}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-moss to-leaf text-white font-medium shadow-md shadow-moss/20 hover:shadow-lg transition-shadow"
      >
        <LogIn className="w-4 h-4" />
        Sign In To Accept
      </Link>
    );
  }

  return (
    <div className="space-y-3">
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        type="button"
        onClick={handleAccept}
        disabled={isSubmitting}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-moss to-leaf text-white font-medium shadow-md shadow-moss/20 hover:shadow-lg transition-shadow disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Accepting Invite...
          </>
        ) : (
          <>
            Accept Invite
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </motion.button>

      {error ? (
        <p className="text-sm text-error text-center">{error}</p>
      ) : null}
    </div>
  );
}
