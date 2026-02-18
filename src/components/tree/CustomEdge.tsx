'use client';

import { type EdgeProps, getSmoothStepPath, getStraightPath } from '@xyflow/react';
import { motion } from 'framer-motion';

type ConnectorRole = 'parent_to_hub' | 'hub_to_child';
type FamilyKind = 'partner' | 'single';

interface ConnectorMeta {
  connectorRole: ConnectorRole;
  familyKind: FamilyKind;
  familyKey: string;
}

interface ConnectorGeometry {
  branchY: number;
  minX: number;
  maxX: number;
  isAnchor: boolean;
}

interface TreeEdgeData {
  type?: 'parent_child' | 'partnership';
  connector?: ConnectorMeta;
  connectorGeometry?: ConnectorGeometry;
}

const asPathTuple = (path: string) => [path, 0, 0, 0, 0] as const;

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style = {},
}: EdgeProps) {
  const edgeData = (data as TreeEdgeData | undefined) || {};
  const connector = edgeData.connector;
  const geometry = edgeData.connectorGeometry;

  const isPartnership = edgeData.type === 'partnership';
  const stroke = isPartnership ? '#8A847C' : '#6F695F';
  const strokeWidth = isPartnership ? 2 : 2.4;

  const hasValidGeometry =
    geometry &&
    Number.isFinite(geometry.branchY) &&
    Number.isFinite(geometry.minX) &&
    Number.isFinite(geometry.maxX);

  const [path] = isPartnership
    ? getStraightPath({ sourceX, sourceY, targetX, targetY: sourceY })
    : connector?.connectorRole === 'parent_to_hub'
      ? connector.familyKind === 'single'
        ? asPathTuple(`M ${sourceX} ${sourceY} L ${sourceX} ${targetY}`)
        : asPathTuple(`M ${sourceX} ${sourceY} L ${targetX} ${sourceY} L ${targetX} ${targetY}`)
      : connector?.connectorRole === 'hub_to_child' && hasValidGeometry
        ? geometry.isAnchor
          ? asPathTuple(
              `M ${sourceX} ${sourceY} L ${sourceX} ${geometry.branchY} ` +
                `M ${geometry.minX} ${geometry.branchY} L ${geometry.maxX} ${geometry.branchY} ` +
                `M ${targetX} ${geometry.branchY} L ${targetX} ${targetY}`
            )
          : asPathTuple(`M ${targetX} ${geometry.branchY} L ${targetX} ${targetY}`)
        : getSmoothStepPath({
            sourceX,
            sourceY,
            sourcePosition,
            targetX,
            targetY,
            targetPosition,
            borderRadius: 0,
          });

  return (
    <g data-id={id}>
      <motion.path
        d={path}
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{
          ...style,
          stroke,
          strokeWidth,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeDasharray: isPartnership ? '6 4' : 'none',
        }}
      />
      <path d={path} fill="none" stroke="transparent" strokeWidth={18} />
    </g>
  );
}
