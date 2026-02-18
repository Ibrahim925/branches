'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';

export function FamilyHub({}: NodeProps) {
  return (
    <div className="relative w-1 h-1 overflow-visible">
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute w-2.5 h-2.5 bg-[#5D4E37] rounded-full shadow-sm ring-2 ring-white/20"
        style={{ left: '50%', top: '50%', x: '-50%', y: '-50%' }}
      />
      <Handle
        id="hub-target"
        type="target"
        position={Position.Top}
        isConnectable={false}
        className="opacity-0 !w-1 !h-1 !min-w-0 !min-h-0 !p-0 !m-0 !bg-transparent !border-none"
        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
      />
      <Handle
        id="hub-source"
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className="opacity-0 !w-1 !h-1 !min-w-0 !min-h-0 !p-0 !m-0 !bg-transparent !border-none"
        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
      />
    </div>
  );
}
