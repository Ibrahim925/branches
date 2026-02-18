'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircleHelp, ExternalLink, Loader2, UserX } from 'lucide-react';

import { MobileActionSheet } from '@/components/system/MobileActionSheet';
import { nativeBridge } from '@/lib/native';
import { requestAccountDeletion } from '@/lib/supabase/accountDeletion';
import { createClient } from '@/lib/supabase/client';

export function AccountSupportSection() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const privacyPolicyUrl =
    process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL || 'https://branches-azure.vercel.app/privacy';
  const supportUrl =
    process.env.NEXT_PUBLIC_SUPPORT_URL || 'https://branches-azure.vercel.app/support';
  const accountHelpUrl =
    process.env.NEXT_PUBLIC_ACCOUNT_HELP_URL || 'https://branches-azure.vercel.app/help/account';

  async function handleDeleteAccount() {
    setDeletingAccount(true);
    setError(null);

    try {
      await requestAccountDeletion(supabase);
      await supabase.auth.signOut();
      router.push('/login?deleted=account');
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Could not delete account.'
      );
      setDeletingAccount(false);
    }
  }

  return (
    <>
      <section className="rounded-2xl border border-stone/35 bg-white/78 p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <CircleHelp className="w-4 h-4 text-moss" />
          <h2 className="text-xl font-semibold text-earth">Account and Support</h2>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => void nativeBridge.openExternalUrl(privacyPolicyUrl)}
            className="w-full rounded-xl border border-stone/35 bg-white/85 px-3 py-3 flex items-center justify-between text-sm text-earth hover:bg-stone/20 transition-colors"
          >
            Privacy Policy
            <ExternalLink className="w-3.5 h-3.5 text-bark/45" />
          </button>
          <button
            type="button"
            onClick={() => void nativeBridge.openExternalUrl(supportUrl)}
            className="w-full rounded-xl border border-stone/35 bg-white/85 px-3 py-3 flex items-center justify-between text-sm text-earth hover:bg-stone/20 transition-colors"
          >
            Support
            <ExternalLink className="w-3.5 h-3.5 text-bark/45" />
          </button>
          <button
            type="button"
            onClick={() => void nativeBridge.openExternalUrl(accountHelpUrl)}
            className="w-full rounded-xl border border-stone/35 bg-white/85 px-3 py-3 flex items-center justify-between text-sm text-earth hover:bg-stone/20 transition-colors"
          >
            Account Help
            <ExternalLink className="w-3.5 h-3.5 text-bark/45" />
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl bg-error/10 px-3 py-2 text-xs text-error">{error}</div>
        ) : null}

        <div className="mt-4 rounded-xl border border-error/30 bg-error/5 p-4">
          <p className="text-sm text-bark/65 mb-3">
            Need to leave Branches? You can permanently delete your account from here.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteAccountConfirm(true)}
            disabled={deletingAccount}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-error text-white text-sm font-medium disabled:opacity-60"
          >
            {deletingAccount ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserX className="w-4 h-4" />
            )}
            Delete Account
          </button>
        </div>
      </section>

      <MobileActionSheet
        open={showDeleteAccountConfirm}
        onClose={() => setShowDeleteAccountConfirm(false)}
        title="Delete Account"
        ariaLabel="Delete account confirmation"
        className="md:max-w-sm"
      >
        <div className="mobile-sheet-body pt-4 space-y-4">
          <p className="text-sm text-bark/70 leading-relaxed">
            Delete your account and all related data? This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteAccountConfirm(false)}
              className="tap-target flex-1 py-3 rounded-xl border border-stone/40 text-sm font-medium text-earth hover:bg-stone/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setShowDeleteAccountConfirm(false);
                void handleDeleteAccount();
              }}
              disabled={deletingAccount}
              className="tap-target flex-1 py-3 rounded-xl bg-error text-white text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {deletingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Delete
            </button>
          </div>
        </div>
      </MobileActionSheet>
    </>
  );
}
