import { redirect } from 'next/navigation';

import { OnboardingFlow } from '@/components/profile/OnboardingFlow';
import { createClient } from '@/lib/supabase/server';
import type { EditableProfile } from '@/components/profile/ProfileEditorForm';

type OnboardingPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function resolveSafeNextPath(
  rawValue: string | string[] | undefined,
  fallback = '/dashboard'
) {
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;

  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }

  return value;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/onboarding');
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath = resolveSafeNextPath(resolvedSearchParams?.next);

  const { data: profileRow } = await supabase
    .from('profiles')
    .select(
      'id,email,first_name,last_name,display_name,avatar_url,avatar_zoom,avatar_focus_x,avatar_focus_y,gender,bio,birthdate,onboarding_completed'
    )
    .eq('id', user.id)
    .maybeSingle();

  if (!profileRow) {
    redirect(nextPath);
  }

  if ((profileRow as EditableProfile).onboarding_completed) {
    redirect(nextPath);
  }

  return (
    <OnboardingFlow
      profile={profileRow as EditableProfile}
      nextPath={nextPath}
    />
  );
}
