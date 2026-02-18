'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Sarah M.',
    relation: 'Mom of 3',
    quote: "Finally, a family tree app that doesn't look like it was built in 2005. My kids actually want to use it.",
    stars: 5,
  },
  {
    name: 'James K.',
    relation: 'Family historian',
    quote: "I've been cataloging our family for years in spreadsheets. Branches brought it all to life in one afternoon.",
    stars: 5,
  },
  {
    name: 'Priya R.',
    relation: 'Grandmother',
    quote: 'The real-time updates are magical. I can see my granddaughter adding photos from across the world.',
    stars: 5,
  },
  {
    name: 'Miguel S.',
    relation: 'Uncle',
    quote: 'The chat feature is a game-changer. No more family group texts that get lost. Everything stays with the tree.',
    stars: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-semibold text-earth tracking-tight mb-4">
            Families{' '}
            <span className="bg-gradient-to-r from-sunrise to-sunrise/70 bg-clip-text text-transparent">
              love it
            </span>
          </h2>
          <p className="text-lg text-bark/50">
            Join thousands of families already growing together
          </p>
        </motion.div>

        {/* Testimonial grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
              className="bg-white/70 backdrop-blur-sm rounded-2xl p-7 border border-stone/30 hover:shadow-lg transition-shadow"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <Star
                    key={j}
                    className="w-4 h-4 fill-sunrise text-sunrise"
                  />
                ))}
              </div>

              {/* Quote */}
              <p className="text-earth leading-relaxed mb-5 text-[15px]">
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-moss/30 to-leaf/30 rounded-full flex items-center justify-center text-moss font-semibold text-sm">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-earth">{t.name}</p>
                  <p className="text-xs text-bark/40">{t.relation}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
