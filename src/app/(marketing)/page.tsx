import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { DemoTree } from './components/DemoTree';
import { FeatureShowcase } from './components/FeatureShowcase';
import { FinalCTA } from './components/FinalCTA';
import { HeroSection } from './components/HeroSection';
import { HowItWorksTimeline } from './components/HowItWorksTimeline';
import { MobileOnboarding } from './components/MobileOnboarding';
import { TestimonialsSection } from './components/TestimonialsSection';

type OnboardingProfileRow = {
  onboarding_completed: boolean;
};

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .maybeSingle();

    if (profileRow && !(profileRow as OnboardingProfileRow).onboarding_completed) {
      redirect('/onboarding');
    }

    redirect('/dashboard');
  }

  return (
    <>
      <div className="md:hidden">
        <MobileOnboarding />
      </div>

      <div className="hidden min-h-screen bg-[radial-gradient(circle_at_top,#f8f6f1_0%,#f4f1ea_45%,#f9f8f4_100%)] text-earth md:block">
        <main>
          <HeroSection />

          <section id="demo" className="pb-24 md:pb-32">
            <div className="mx-auto max-w-6xl px-6">
              <div className="mb-8 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-bark/45">
                  Interactive Preview
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-earth">
                  See your tree in motion
                </h2>
              </div>
              <DemoTree />
            </div>
          </section>

          <FeatureShowcase />
          <HowItWorksTimeline />
          <TestimonialsSection />
          <FinalCTA />
        </main>
      </div>
    </>
  );
}
