'use client';

import { motion } from 'framer-motion';
import { Users, Zap, MessageCircle, Image as ImageIcon, Shield, Smartphone } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Real-time, always',
    description: 'See changes the instant they happen. When someone adds Grandma to the tree, everyone sees it live.',
    color: 'moss',
    gradient: 'from-moss/20 to-leaf/20',
  },
  {
    icon: Users,
    title: 'Everyone contributes',
    description: 'Invite family near and far. Each person claims their spot and fills in their own story.',
    color: 'sunrise',
    gradient: 'from-sunrise/20 to-sunrise/10',
  },
  {
    icon: MessageCircle,
    title: 'Chat that belongs',
    description: 'Message one-on-one, in groups, or with the entire tree. Conversations stay where they matter.',
    color: 'dewdrop',
    gradient: 'from-dewdrop/20 to-dewdrop/10',
  },
  {
    icon: ImageIcon,
    title: 'Memories attached',
    description: "Photos, stories, and recipes pinned to the people they belong to. Grandpa's fishing trips live forever.",
    color: 'bark',
    gradient: 'from-bark/10 to-bark/5',
  },
  {
    icon: Shield,
    title: 'Private by default',
    description: "Your family's data stays yours. Row-level security ensures only members see what they should.",
    color: 'earth',
    gradient: 'from-earth/10 to-earth/5',
  },
  {
    icon: Smartphone,
    title: 'Works everywhere',
    description: 'Responsive design that feels native on any device. Desktop, tablet, or phone—always beautiful.',
    color: 'leaf',
    gradient: 'from-leaf/20 to-leaf/10',
  },
];

const colorMap: Record<string, string> = {
  moss: 'text-moss',
  sunrise: 'text-sunrise',
  dewdrop: 'text-dewdrop',
  bark: 'text-bark',
  earth: 'text-earth',
  leaf: 'text-leaf',
};

export function FeatureShowcase() {
  return (
    <section className="py-24 md:py-32 relative">
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
            Everything your family{' '}
            <span className="bg-gradient-to-r from-moss to-leaf bg-clip-text text-transparent">
              needs
            </span>
          </h2>
          <p className="text-lg text-bark/50 max-w-xl mx-auto">
            Built from the ground up for modern families who want to stay connected
          </p>
        </motion.div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -6 }}
                className="group p-7 rounded-2xl bg-white/70 backdrop-blur-sm border border-stone/30 hover:shadow-xl hover:shadow-moss/5 transition-all"
              >
                <div
                  className={`w-12 h-12 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}
                >
                  <Icon className={`w-6 h-6 ${colorMap[feature.color]}`} />
                </div>
                <h3 className="text-lg font-semibold text-earth mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-bark/50 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
