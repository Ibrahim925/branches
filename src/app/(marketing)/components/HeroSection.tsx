'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { AnimatedTreeLogo } from './AnimatedTreeLogo';

export function HeroSection() {
  return (
    <section className="relative pt-12 pb-24 md:pt-20 md:pb-36 overflow-hidden">
      {/* Floating orbs background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute w-[500px] h-[500px] bg-moss/8 rounded-full blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          style={{ top: '-10%', right: '-5%' }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] bg-sunrise/8 rounded-full blur-3xl"
          animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          style={{ bottom: '0%', left: '-5%' }}
        />
        <motion.div
          className="absolute w-[300px] h-[300px] bg-dewdrop/6 rounded-full blur-3xl"
          animate={{ x: [0, 20, 0], y: [0, 20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          style={{ top: '40%', left: '30%' }}
        />
      </div>

      <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
        {/* Animated tree */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-8"
        >
          <AnimatedTreeLogo size={100} />
        </motion.div>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.6 }}
          className="inline-flex items-center gap-2 px-5 py-2 bg-moss/10 rounded-full text-moss text-sm font-medium mb-8 border border-moss/20"
        >
          <span className="w-2 h-2 bg-moss rounded-full animate-pulse" />
          Live collaboration for families
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.0, duration: 0.7, ease: [0.43, 0.13, 0.23, 0.96] }}
          className="text-5xl md:text-7xl lg:text-8xl font-semibold text-earth tracking-tight leading-[1.05] mb-6"
        >
          Your family tree,
          <br />
          <span className="bg-gradient-to-r from-moss via-leaf to-moss bg-clip-text text-transparent bg-[length:200%_auto] animate-[shimmer_3s_ease-in-out_infinite]">
            reimagined
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.3, duration: 0.6 }}
          className="text-lg md:text-xl text-bark/60 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          A private, beautiful space where your family grows together—
          <br className="hidden md:block" />
          beautifully visualized, always connected, infinitely personal.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.5, duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/login"
            className="group px-8 py-4 bg-gradient-to-r from-moss to-leaf text-white rounded-2xl font-medium shadow-xl shadow-moss/20 hover:shadow-2xl hover:shadow-moss/30 transition-all flex items-center gap-2 text-lg"
          >
            Start Your Tree
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a
            href="#demo"
            className="px-8 py-4 bg-white/60 backdrop-blur-sm border border-stone/50 text-earth rounded-2xl font-medium hover:bg-white/80 transition-all text-lg"
          >
            See a Demo
          </a>
        </motion.div>
      </div>
    </section>
  );
}
