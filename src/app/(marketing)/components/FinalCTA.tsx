'use client';

import { motion } from 'framer-motion';
import { ArrowRight, TreePine } from 'lucide-react';
import Link from 'next/link';

export function FinalCTA() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute w-[600px] h-[600px] bg-moss/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.1, 1], x: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          style={{ top: '-20%', right: '-10%' }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] bg-leaf/8 rounded-full blur-3xl"
          animate={{ scale: [1, 1.15, 1], y: [0, -20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          style={{ bottom: '-15%', left: '-5%' }}
        />
      </div>

      <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
        {/* Icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          viewport={{ once: true }}
          className="w-20 h-20 bg-gradient-to-br from-moss to-leaf rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-moss/20"
        >
          <TreePine className="w-10 h-10 text-white" />
        </motion.div>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-3xl md:text-5xl font-semibold text-earth tracking-tight mb-6"
        >
          Your family&apos;s story
          <br />
          starts here
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          viewport={{ once: true }}
          className="text-lg text-bark/50 mb-10 max-w-lg mx-auto leading-relaxed"
        >
          Free to start. No credit card needed. Plant your family tree and
          watch it grow with the people who matter most.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <Link
            href="/login"
            className="group inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-moss to-leaf text-white rounded-2xl font-medium text-lg shadow-xl shadow-moss/20 hover:shadow-2xl hover:shadow-moss/30 transition-all"
          >
            Start Your Family Tree
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          viewport={{ once: true }}
          className="text-sm text-bark/30 mt-6"
        >
          Takes less than 30 seconds
        </motion.p>
      </div>
    </section>
  );
}
