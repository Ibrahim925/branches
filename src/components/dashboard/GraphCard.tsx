'use client';

import { motion } from 'framer-motion';
import { TreePine, Users, Crown, Pencil, Eye } from 'lucide-react';
import Link from 'next/link';

const roleConfig = {
  admin: { label: 'Admin', icon: Crown, color: 'text-sunrise' },
  editor: { label: 'Editor', icon: Pencil, color: 'text-moss' },
  viewer: { label: 'Viewer', icon: Eye, color: 'text-dewdrop' },
};

interface GraphCardProps {
  graph: {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
  };
  role: 'admin' | 'editor' | 'viewer';
}

export function GraphCard({ graph, role }: GraphCardProps) {
  const roleInfo = roleConfig[role];
  const RoleIcon = roleInfo.icon;

  return (
    <Link href={`/${graph.id}`}>
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone/40 p-6 cursor-pointer hover:shadow-xl hover:shadow-moss/10 transition-shadow group"
      >
        {/* Tree icon */}
        <div className="w-12 h-12 bg-gradient-to-br from-moss/20 to-leaf/20 rounded-2xl flex items-center justify-center mb-4 group-hover:from-moss/30 group-hover:to-leaf/30 transition-colors">
          <TreePine className="w-6 h-6 text-moss" />
        </div>

        {/* Name */}
        <h3 className="text-lg font-semibold text-earth mb-1 tracking-tight">
          {graph.name}
        </h3>

        {/* Description */}
        {graph.description && (
          <p className="text-sm text-bark/50 mb-4 line-clamp-2">
            {graph.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-stone/30">
          {/* Role badge */}
          <div className={`flex items-center gap-1.5 text-xs ${roleInfo.color}`}>
            <RoleIcon className="w-3.5 h-3.5" />
            <span className="font-medium">{roleInfo.label}</span>
          </div>

          {/* Created date */}
          <span className="text-xs text-bark/40">
            {new Date(graph.created_at).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      </motion.div>
    </Link>
  );
}
