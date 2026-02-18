import { motion } from 'framer-motion';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Image from 'next/image';
import { Heart, UserPlus, Users, Lock } from 'lucide-react';
import { type ReactNode } from 'react';

interface CustomNodeData {
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  birthYear?: number;
  isAlive: boolean;
  isClaimed: boolean;
  canAddParent?: boolean;
  canAddChild?: boolean;
  canAddSpouse?: boolean;
  onAddMember?: (type: 'parent' | 'child' | 'spouse') => void;
  [key: string]: unknown;
}

interface AddButtonProps {
  enabled: boolean;
  onClick: () => void;
  icon: ReactNode;
  className: string;
  disabledLabel: string;
}

function AddButton({ enabled, onClick, icon, className, disabledLabel }: AddButtonProps) {
  if (!enabled) {
    return (
      <div
        title={disabledLabel}
        className="opacity-0 pointer-events-none group-hover:opacity-100 w-8 h-8 rounded-full bg-stone/90 border border-stone/60 text-bark/40 flex items-center justify-center"
      >
        <Lock size={13} />
      </div>
    );
  }

  return (
    <button
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`opacity-0 group-hover:opacity-100 text-white p-1.5 rounded-full shadow-lg transition-all transform scale-90 group-hover:scale-100 ${className}`}
    >
      {icon}
    </button>
  );
}

export function CustomNode({ data, selected }: NodeProps) {
  const nodeData = data as CustomNodeData;
  const initials = `${nodeData.firstName?.[0] || ''}${nodeData.lastName?.[0] || ''}`;

  const canAddParent = nodeData.canAddParent ?? true;
  const canAddChild = nodeData.canAddChild ?? true;
  const canAddSpouse = nodeData.canAddSpouse ?? true;

  return (
    <motion.div
      className={`
        relative w-[160px] h-[220px] rounded-2xl cursor-pointer group
        bg-earth/95 backdrop-blur-md border-2
        ${selected ? 'border-sunrise shadow-2xl shadow-sunrise/20' : 'border-stone/30 shadow-xl'}
        transition-all duration-300
      `}
      initial={{ opacity: 0, scale: 0.92, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
    >
      <div className="flex flex-col items-center p-6 h-full">
        <div
          className={`
            w-20 h-20 rounded-full overflow-hidden mb-4 border-2 shadow-sm
            ${nodeData.isAlive ? 'border-leaf' : 'border-stone grayscale'}
          `}
        >
          {nodeData.avatarUrl ? (
            <Image
              src={nodeData.avatarUrl}
              alt={`${nodeData.firstName} ${nodeData.lastName || ''}`}
              width={80}
              height={80}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-moss to-leaf text-white font-semibold text-2xl">
              {initials}
            </div>
          )}
        </div>

        <div className="text-center flex-1">
          <h3 className="text-white font-semibold text-base leading-tight">
            {nodeData.firstName}
            <br />
            {nodeData.lastName || ''}
          </h3>
          {nodeData.birthYear && (
            <p className="text-white/40 text-xs mt-2 font-medium">
              {nodeData.birthYear}—
            </p>
          )}
        </div>

        {!nodeData.isClaimed && (
          <div className="mt-2 px-2 py-0.5 bg-sunrise/20 border border-sunrise/30 rounded-full">
            <span className="text-[10px] font-bold text-sunrise uppercase tracking-wider">
              Unclaimed
            </span>
          </div>
        )}
      </div>

      {/* Top: Add Parent (max 2) */}
      <div className="absolute -top-8 left-0 right-0 h-12 flex justify-center items-center group">
        <AddButton
          enabled={canAddParent}
          onClick={() => nodeData.onAddMember?.('parent')}
          icon={<Users size={16} />}
          className="bg-moss hover:bg-leaf"
          disabledLabel="Max parents reached"
        />
      </div>

      {/* Bottom: Add Child (unlimited) */}
      <div className="absolute -bottom-8 left-0 right-0 h-12 flex justify-center items-center group">
        <AddButton
          enabled={canAddChild}
          onClick={() => nodeData.onAddMember?.('child')}
          icon={<UserPlus size={16} />}
          className="bg-moss hover:bg-leaf"
          disabledLabel="Cannot add child"
        />
      </div>

      {/* Left + Right: Add Spouse (max 1) */}
      <div className="absolute top-0 bottom-0 -left-8 w-12 flex justify-center items-center group">
        <AddButton
          enabled={canAddSpouse}
          onClick={() => nodeData.onAddMember?.('spouse')}
          icon={<Heart size={16} />}
          className="bg-sunrise hover:bg-sunrise/80"
          disabledLabel="Spouse already exists"
        />
      </div>
      <div className="absolute top-0 bottom-0 -right-8 w-12 flex justify-center items-center group">
        <AddButton
          enabled={canAddSpouse}
          onClick={() => nodeData.onAddMember?.('spouse')}
          icon={<Heart size={16} />}
          className="bg-sunrise hover:bg-sunrise/80"
          disabledLabel="Spouse already exists"
        />
      </div>

      <Handle type="target" position={Position.Top} id="target" isConnectable={false} className="opacity-0 !top-0" style={{ left: '50%' }} />
      <Handle type="source" position={Position.Bottom} id="source" isConnectable={false} className="opacity-0 !bottom-0" style={{ left: '50%' }} />
      <Handle type="target" position={Position.Left} id="p-left-target" isConnectable={false} className="opacity-0 !left-0" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Left} id="p-left-source" isConnectable={false} className="opacity-0 !left-0" style={{ top: '50%' }} />
      <Handle type="target" position={Position.Right} id="p-right-target" isConnectable={false} className="opacity-0 !right-0" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="p-right-source" isConnectable={false} className="opacity-0 !right-0" style={{ top: '50%' }} />
    </motion.div>
  );
}
