'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, TreePine } from 'lucide-react';

import { ProfileEditorForm, type EditableProfile } from '@/components/profile/ProfileEditorForm';

type OnboardingFlowProps = {
  profile: EditableProfile;
  nextPath: string;
};

export function OnboardingFlow({ profile, nextPath }: OnboardingFlowProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-stone/15 via-white to-leaf/10">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-3xl"
      >
        <div className="mb-5 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-stone/35 text-xs text-bark/60 mb-3">
            <TreePine className="w-3.5 h-3.5 text-moss" />
            Welcome to Branches
          </div>
          <h1 className="text-3xl font-semibold text-earth tracking-tight">
            Let&apos;s set up your profile
          </h1>
          <p className="text-sm text-bark/55 mt-2">
            Add your name, photo, and details so your family can recognize you.
          </p>
        </div>

        <ProfileEditorForm
          profile={profile}
          title="Your Identity"
          description="This profile is used anywhere you are claimed in a tree."
          submitLabel="Finish Setup"
          markOnboardingComplete
          onSaved={() => {
            router.push(nextPath);
            router.refresh();
          }}
        />

        <div className="mt-4 text-xs text-bark/45 flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-sunrise" />
          You can edit all of this later from profile and settings.
        </div>
      </motion.div>
    </div>
  );
}
