'use client';

import { motion } from 'framer-motion';
import { Heart, Lock, Plus, Users } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import {
  FAMILY_TREE_NODE_HEIGHT,
  FAMILY_TREE_NODE_WIDTH,
  type PositionedFamilyNode,
} from '@/utils/familyTreeLayout';
import { buildImageCropStyle } from '@/utils/imageCrop';

type RelationshipKind = 'parent' | 'child' | 'spouse';

interface FamilyTreeCardProps {
  node: PositionedFamilyNode;
  selected: boolean;
  onSelect: () => void;
  onAddMember: (relationship: RelationshipKind) => void;
}

interface EdgeActionProps {
  enabled: boolean;
  icon: ReactNode;
  label: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  disabledLabel: string;
  onClick: () => void;
}

function EdgeAction({
  enabled,
  icon,
  label,
  placement,
  disabledLabel,
  onClick,
}: EdgeActionProps) {
  const placementClassBySide = {
    top: 'left-1/2 -translate-x-1/2 -top-9',
    bottom: 'left-1/2 -translate-x-1/2 -bottom-9',
    left: '-left-9 top-1/2 -translate-y-1/2',
    right: '-right-9 top-1/2 -translate-y-1/2',
  } as const;

  if (!enabled) {
    return (
      <div
        title={disabledLabel}
        className={`absolute ${placementClassBySide[placement]} w-9 h-9 rounded-full bg-white/95 border border-stone/60 text-bark/40 shadow-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center`}
      >
        <Lock size={13} />
      </div>
    );
  }

  return (
    <motion.button
      type="button"
      title={label}
      aria-label={label}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`absolute ${placementClassBySide[placement]} w-9 h-9 rounded-full text-white shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 border border-white/50 flex items-center justify-center leading-none`}
      style={{
        background:
          placement === 'left' || placement === 'right'
            ? 'linear-gradient(135deg, #E6B17E 0%, #DB9F61 100%)'
            : 'linear-gradient(135deg, #8B9D77 0%, #A8C090 100%)',
      }}
    >
      <span className="sr-only">{label}</span>
      <span className="inline-flex items-center justify-center">{icon}</span>
    </motion.button>
  );
}

export function FamilyTreeCard({
  node,
  selected,
  onSelect,
  onAddMember,
}: FamilyTreeCardProps) {
  const [failedAvatarSrc, setFailedAvatarSrc] = useState<string | null>(null);
  const initials = `${node.firstName?.[0] || ''}${node.lastName?.[0] || ''}`;
  const shouldShowAvatar =
    Boolean(node.avatarUrl) && failedAvatarSrc !== node.avatarUrl;

  return (
    <motion.div
      role="button"
      tabIndex={0}
      layout
      layoutId={`person-${node.id}`}
      initial={{ opacity: 0, scale: 0.88, y: 26 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.84, y: -18 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      whileHover={{ y: -6 }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          onSelect();
        }
      }}
      className={`group absolute rounded-[26px] text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/70 ${
        selected
          ? 'shadow-[0_18px_48px_rgba(88,70,42,0.22)] ring-2 ring-sunrise/65'
          : 'shadow-[0_12px_34px_rgba(88,70,42,0.16)]'
      }`}
      style={{
        width: FAMILY_TREE_NODE_WIDTH,
        height: FAMILY_TREE_NODE_HEIGHT,
        left: node.x,
        top: node.y,
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,243,236,0.98) 58%, rgba(239,232,221,0.98) 100%)',
        border: '1px solid rgba(138,132,124,0.35)',
      }}
    >
      <div className="absolute inset-x-4 top-4 h-16 rounded-2xl bg-gradient-to-r from-white/60 via-white/30 to-transparent pointer-events-none" />

      <div className="relative h-full p-5 flex flex-col items-center">
        <div
          className={`w-20 h-20 rounded-full overflow-hidden border-2 shadow-sm ${
            node.isAlive ? 'border-leaf/80' : 'border-stone/80 grayscale'
          }`}
        >
          {shouldShowAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={node.avatarUrl || ''}
              alt={`${node.firstName} ${node.lastName}`}
              className="w-full h-full object-cover"
              style={buildImageCropStyle(
                {
                  zoom: node.avatarZoom,
                  focusX: node.avatarFocusX,
                  focusY: node.avatarFocusY,
                },
                { minZoom: 1, maxZoom: 3 }
              )}
              onError={() => setFailedAvatarSrc(node.avatarUrl || null)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-moss to-leaf text-white font-semibold text-2xl">
              {initials || '?'}
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <p className="text-earth text-base font-semibold leading-tight">
            {node.firstName}
            {node.lastName ? ` ${node.lastName}` : ''}
          </p>
          {node.birthYear && (
            <p className="text-bark/50 text-xs font-medium tracking-wide mt-1">
              {node.birthYear}
            </p>
          )}
        </div>

        <div className="mt-auto w-full pt-4">
          <div className="rounded-2xl bg-white/72 border border-stone/55 px-3 py-2 text-[11px] font-medium text-bark/65 flex items-center justify-between">
            <span>{node.isAlive ? 'Living' : 'Passed'}</span>
            <span>{node.isClaimed ? 'Claimed' : 'Unclaimed'}</span>
          </div>
        </div>
      </div>

      <EdgeAction
        enabled={node.canAddParent}
        icon={<Users size={14} />}
        label="Add parent"
        placement="top"
        disabledLabel="This person already has two parents"
        onClick={() => onAddMember('parent')}
      />

      <EdgeAction
        enabled={node.canAddChild}
        icon={<Plus size={14} />}
        label="Add child"
        placement="bottom"
        disabledLabel="Cannot add child"
        onClick={() => onAddMember('child')}
      />

      <EdgeAction
        enabled={node.canAddSpouse}
        icon={<Heart size={14} />}
        label="Add spouse"
        placement="left"
        disabledLabel="This person already has a spouse"
        onClick={() => onAddMember('spouse')}
      />

      <EdgeAction
        enabled={node.canAddSpouse}
        icon={<Heart size={14} />}
        label="Add spouse"
        placement="right"
        disabledLabel="This person already has a spouse"
        onClick={() => onAddMember('spouse')}
      />
    </motion.div>
  );
}
