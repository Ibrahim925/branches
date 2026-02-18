import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { AccountSupportSection } from '@/components/profile/AccountSupportSection';
import { ProfileEditorForm, type EditableProfile } from '@/components/profile/ProfileEditorForm';
import { ProfileSecurityForm } from '@/components/profile/ProfileSecurityForm';
import { SignOutButton } from '@/components/profile/SignOutButton';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Profile Settings',
};

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/profile/settings');
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select(
      'id,email,first_name,last_name,display_name,avatar_url,avatar_zoom,avatar_focus_x,avatar_focus_y,gender,bio,birthdate,onboarding_completed'
    )
    .eq('id', user.id)
    .maybeSingle();

  if (!profileRow) {
    redirect(`/profile/${user.id}`);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
      <section className="rounded-2xl border border-stone/35 bg-white/78 p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-bark/45">Profile Settings</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-earth">
              Manage your account
            </h1>
            <p className="mt-1 text-sm text-bark/55">
              Edit your profile, update login credentials, and manage support tools.
            </p>
          </div>
          <Link
            href={`/profile/${user.id}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone/45 px-3 py-2 text-sm font-medium text-earth transition-colors hover:bg-stone/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Profile
          </Link>
        </div>
      </section>

      <ProfileEditorForm
        profile={profileRow as EditableProfile}
        title="Edit Profile"
        description="Changes here update your claimed identity across trees."
        submitLabel="Save Changes"
      />

      <ProfileSecurityForm email={profileRow.email} />
      <AccountSupportSection />

      <section className="rounded-2xl border border-stone/35 bg-white/78 p-5 md:p-6">
        <h2 className="text-lg font-semibold tracking-tight text-earth">Session</h2>
        <p className="mt-1 mb-3 text-sm text-bark/55">Sign out of your account on this device.</p>
        <SignOutButton />
      </section>
    </div>
  );
}
