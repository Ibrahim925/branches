import { HeroSection } from './components/HeroSection';
import { DemoTree } from './components/DemoTree';
import { FeatureShowcase } from './components/FeatureShowcase';
import { HowItWorksTimeline } from './components/HowItWorksTimeline';
import { TestimonialsSection } from './components/TestimonialsSection';
import { FinalCTA } from './components/FinalCTA';
import Link from 'next/link';
import { TreePine } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F2ED] via-white to-[#F5F2ED]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/60 backdrop-blur-xl border-b border-stone/20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-moss to-leaf rounded-xl flex items-center justify-center shadow-sm">
              <TreePine className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-earth tracking-tight">
              Branches
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-bark/60 hover:text-earth transition-colors hidden sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="px-5 py-2.5 bg-gradient-to-r from-moss to-leaf text-white text-sm rounded-xl font-medium shadow-md shadow-moss/10 hover:shadow-lg transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <HeroSection />

      {/* Interactive Demo */}
      <section id="demo" className="pb-24 md:pb-32">
        <div className="max-w-4xl mx-auto px-6">
          <DemoTree />
        </div>
      </section>

      {/* Features */}
      <FeatureShowcase />

      {/* How It Works */}
      <HowItWorksTimeline />

      {/* Testimonials */}
      <TestimonialsSection />

      {/* Final CTA */}
      <FinalCTA />

      {/* Footer */}
      <footer className="border-t border-stone/20 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-moss to-leaf rounded-lg flex items-center justify-center">
              <TreePine className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-earth">Branches</span>
          </div>
          <p className="text-xs text-bark/30">
            Built with love for families everywhere.
          </p>
        </div>
      </footer>
    </div>
  );
}
