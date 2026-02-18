'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { triggerPrimaryActionHaptic } from '@/lib/native/haptics';

export function SignOutButton() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    void triggerPrimaryActionHaptic();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => {
        void handleSignOut();
      }}
      disabled={signingOut}
      className="tap-target inline-flex items-center gap-2 rounded-xl bg-error px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
    >
      {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      Sign Out
    </button>
  );
}
