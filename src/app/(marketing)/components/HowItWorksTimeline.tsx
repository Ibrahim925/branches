'use client';

import { motion } from 'framer-motion';
import { TreePine, UserPlus, Share2, Heart } from 'lucide-react';

const steps = [
  {
    icon: TreePine,
    title: 'Plant your tree',
    description: 'Create a family tree in seconds. Give it a name and start building.',
    color: 'bg-gradient-to-br from-moss to-leaf',
  },
  {
    icon: UserPlus,
    title: 'Add your people',
    description: 'Add parents, siblings, children. Each person becomes a node on your living tree.',
    color: 'bg-gradient-to-br from-bark to-bark/70',
  },
  {
    icon: Share2,
    title: 'Invite family',
    description: 'Share a link. Family members claim their spot and start contributing their stories.',
    color: 'bg-gradient-to-br from-sunrise to-sunrise/70',
  },
  {
    icon: Heart,
    title: 'Watch it grow',
    description: 'Your tree grows in real-time as family members add memories, photos, and connections.',
    color: 'bg-gradient-to-br from-dewdrop to-dewdrop/70',
  },
];

export function HowItWorksTimeline() {
  return (
    <section className="py-24 md:py-32 bg-gradient-to-b from-transparent via-stone/10 to-transparent">
      <div className="max-w-4xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-semibold text-earth tracking-tight mb-4">
            Four steps to{' '}
            <span className="bg-gradient-to-r from-sunrise to-sunrise/70 bg-clip-text text-transparent">
              forever
            </span>
          </h2>
          <p className="text-lg text-bark/50">
            From zero to a thriving family network in minutes
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-8 md:left-1/2 md:-translate-x-px top-0 bottom-0 w-0.5 bg-gradient-to-b from-moss/30 via-sunrise/30 to-dewdrop/30" />

          {steps.map((step, i) => {
            const Icon = step.icon;
            const isLeft = i % 2 === 0;

            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: isLeft ? -40 : 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                viewport={{ once: true }}
                className={`relative flex items-start gap-6 mb-16 last:mb-0 ${
                  isLeft ? 'md:flex-row' : 'md:flex-row-reverse'
                }`}
              >
                {/* Number circle on the line */}
                <div className="absolute left-8 md:left-1/2 md:-translate-x-1/2 z-10">
                  <div className={`w-10 h-10 ${step.color} rounded-full flex items-center justify-center shadow-lg text-white font-bold text-sm`}>
                    {i + 1}
                  </div>
                </div>

                {/* Content card */}
                <div
                  className={`ml-20 md:ml-0 md:w-[calc(50%-40px)] ${
                    isLeft ? 'md:pr-8' : 'md:pl-8'
                  }`}
                >
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-stone/30 shadow-sm hover:shadow-md transition-shadow">
                    <div className={`w-10 h-10 ${step.color} rounded-xl flex items-center justify-center mb-4`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-earth mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-bark/50 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
