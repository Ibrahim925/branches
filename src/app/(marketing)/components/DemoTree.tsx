'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  type NodeProps,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion } from 'framer-motion';
import { CustomEdge } from '@/components/tree/CustomEdge';
import { FamilyHub } from '@/components/tree/FamilyHub';

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

interface DemoEdgeData extends Record<string, unknown> {
  type: 'parent_child' | 'partnership';
  connector?: ConnectorMeta;
  connectorGeometry?: ConnectorGeometry;
}

interface DemoHubData extends Record<string, unknown> {
  hub: {
    hubKind: FamilyKind;
    parentIds: string[];
    familyKey: string;
  };
}

type DemoTreeNode = Node<DemoNodeData | DemoHubData>;
type DemoTreeEdge = Edge<DemoEdgeData> & { data: DemoEdgeData };

interface DemoNodeData extends Record<string, unknown> {
  name: string;
  birthYear?: string;
  avatarUrl: string;
  isClaimed: boolean;
  isLiving: boolean;
  ring?: boolean;
}

function DemoNode({ data }: NodeProps<Node<DemoNodeData>>) {
  const initial = data.name.trim().charAt(0).toUpperCase() || '?';
  return (
    <div
      style={{
        width: W,
        height: H,
        borderRadius: 24,
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,243,236,0.98) 58%, rgba(239,232,221,0.98) 100%)',
        border: '1px solid rgba(138,132,124,0.35)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: 14,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: data.ring
          ? '0 0 0 2px rgba(219,159,97,0.45), 0 18px 32px rgba(88,70,42,0.22)'
          : '0 12px 28px rgba(88,70,42,0.14)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 14,
          right: 14,
          top: 12,
          height: 48,
          borderRadius: 16,
          background: 'linear-gradient(90deg, rgba(255,255,255,0.62), rgba(255,255,255,0.12))',
          pointerEvents: 'none',
        }}
      />
      <Handle type="target" position={Position.Top} id="target" style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="source" position={Position.Bottom} id="source" style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="target" position={Position.Left} id="p-left-target" style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="source" position={Position.Left} id="p-left-source" style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="target" position={Position.Right} id="p-right-target" style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="source" position={Position.Right} id="p-right-source" style={{ opacity: 0, width: 1, height: 1 }} />

      <div
        style={{
          width: 68,
          height: 68,
          position: 'relative',
          borderRadius: '50%',
          overflow: 'hidden',
          border: '2px solid rgba(168,192,144,0.8)',
          boxShadow: '0 5px 16px rgba(88,70,42,0.2)',
          background: 'linear-gradient(135deg, #8B9D77, #A8C090)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 700,
          fontSize: 22,
          zIndex: 1,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={data.avatarUrl}
          alt={data.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
        <span style={{ position: 'absolute' }}>{initial}</span>
      </div>

      <div
        style={{
          marginTop: 12,
          width: '100%',
          textAlign: 'center',
          color: '#3f3f3f',
          fontSize: 10,
          fontWeight: 600,
          lineHeight: 1.35,
          minHeight: 46,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 3,
        }}
      >
        <p style={{ margin: 0, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(84,71,54,0.45)' }}>
          Family Member
        </p>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: 0.1 }}>
          {data.name}
        </p>
        {data.birthYear ? (
          <p style={{ margin: 0, fontSize: 10, color: 'rgba(84,71,54,0.55)' }}>{data.birthYear}</p>
        ) : null}
      </div>

      <div
        style={{
          marginTop: 'auto',
          width: '100%',
          borderRadius: 999,
          border: '1px solid rgba(138,132,124,0.34)',
          background: 'rgba(255,255,255,0.78)',
          padding: '6px 10px',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10,
          color: 'rgba(84,71,54,0.72)',
          fontWeight: 600,
        }}
      >
        <span>{data.isLiving ? 'Living' : 'Passed'}</span>
        <span>{data.isClaimed ? 'Claimed' : 'Unclaimed'}</span>
      </div>
    </div>
  );
}

const nodeTypes = {
  demo: DemoNode,
  family_hub: FamilyHub,
};

const edgeTypes = {
  custom: CustomEdge,
};

const W = 156;
const H = 208;
const GAP = 40;
const ROW0_Y = 18;
const ROW1_Y = 284;
const ROW2_Y = 550;
const cx = 340;

const DEMO_NODES: Node<DemoNodeData>[] = [
  {
    id: '1',
    type: 'demo',
    position: { x: cx - W - GAP / 2, y: ROW0_Y },
    data: {
      name: 'Joseph Hale',
      birthYear: '1948',
      avatarUrl: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=400',
      isClaimed: true,
      isLiving: true,
    },
  },
  {
    id: '2',
    type: 'demo',
    position: { x: cx + GAP / 2, y: ROW0_Y },
    data: {
      name: 'Rosa Hale',
      birthYear: '1950',
      avatarUrl: 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=400',
      isClaimed: true,
      isLiving: true,
    },
  },
  {
    id: '3',
    type: 'demo',
    position: { x: cx - W * 2 - GAP, y: ROW1_Y },
    data: {
      name: 'Daniel Hale',
      birthYear: '1978',
      avatarUrl: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400',
      isClaimed: true,
      isLiving: true,
    },
  },
  {
    id: '4',
    type: 'demo',
    position: { x: cx - W - GAP / 2 + 10, y: ROW1_Y },
    data: {
      name: 'Maya Hale',
      birthYear: '1980',
      avatarUrl: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400',
      isClaimed: true,
      isLiving: true,
    },
  },
  {
    id: '5',
    type: 'demo',
    position: { x: cx + W + GAP, y: ROW1_Y },
    data: {
      name: 'Benjamin Hale',
      birthYear: '1984',
      avatarUrl: 'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=400',
      isClaimed: false,
      isLiving: true,
    },
  },
  {
    id: '6',
    type: 'demo',
    position: { x: cx - W * 2 - GAP - 15, y: ROW2_Y },
    data: {
      name: 'You',
      birthYear: '2007',
      avatarUrl: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400',
      isClaimed: true,
      isLiving: true,
      ring: true,
    },
  },
  {
    id: '7',
    type: 'demo',
    position: { x: cx - W / 2, y: ROW2_Y },
    data: {
      name: 'Sofia Hale',
      birthYear: '2010',
      avatarUrl: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=400',
      isClaimed: true,
      isLiving: true,
    },
  },
  {
    id: '8',
    type: 'demo',
    position: { x: cx + W + GAP, y: ROW2_Y },
    data: {
      name: 'Lily Hale',
      birthYear: '2012',
      avatarUrl: 'https://images.pexels.com/photos/1587009/pexels-photo-1587009.jpeg?auto=compress&cs=tinysrgb&w=400',
      isClaimed: false,
      isLiving: true,
    },
  },
];

const RAW_DEMO_EDGES: DemoTreeEdge[] = [
  { id: 'e1-3', source: '1', target: '3', type: 'custom', data: { type: 'parent_child' }, animated: false, style: { stroke: '#8B9D77', strokeWidth: 2 } },
  { id: 'e2-3', source: '2', target: '3', type: 'custom', data: { type: 'parent_child' }, animated: false, style: { stroke: '#8B9D77', strokeWidth: 2 } },
  { id: 'e1-5', source: '1', target: '5', type: 'custom', data: { type: 'parent_child' }, animated: false, style: { stroke: '#8B9D77', strokeWidth: 2 } },
  { id: 'e2-5', source: '2', target: '5', type: 'custom', data: { type: 'parent_child' }, animated: false, style: { stroke: '#8B9D77', strokeWidth: 2 } },

  { id: 'e3-6', source: '3', target: '6', type: 'custom', data: { type: 'parent_child' }, animated: false, style: { stroke: '#5D4E37', strokeWidth: 2 } },
  { id: 'e4-6', source: '4', target: '6', type: 'custom', data: { type: 'parent_child' }, animated: false, style: { stroke: '#5D4E37', strokeWidth: 2 } },
  { id: 'e3-7', source: '3', target: '7', type: 'custom', data: { type: 'parent_child' }, animated: false, style: { stroke: '#5D4E37', strokeWidth: 2 } },
  { id: 'e4-7', source: '4', target: '7', type: 'custom', data: { type: 'parent_child' }, animated: false, style: { stroke: '#5D4E37', strokeWidth: 2 } },

  { id: 'e5-8', source: '5', target: '8', type: 'custom', data: { type: 'parent_child' }, animated: false, style: { stroke: '#8B9D77', strokeWidth: 2 } },

  { id: 'e1-2', source: '1', target: '2', type: 'custom', data: { type: 'partnership' }, animated: false, style: { stroke: '#D4A373', strokeWidth: 1.5, strokeDasharray: '5 3' } },
  { id: 'e3-4', source: '3', target: '4', type: 'custom', data: { type: 'partnership' }, animated: false, style: { stroke: '#D4A373', strokeWidth: 1.5, strokeDasharray: '5 3' } },
];

function connectorData(
  connectorRole: ConnectorRole,
  familyKind: FamilyKind,
  familyKey: string
): DemoEdgeData {
  return {
    type: 'parent_child',
    connector: { connectorRole, familyKind, familyKey },
  };
}

function centerX(node: DemoTreeNode) {
  return node.type === 'family_hub' ? node.position.x : node.position.x + W / 2;
}

function topY(node: DemoTreeNode) {
  return node.position.y;
}

function bottomY(node: DemoTreeNode) {
  return node.type === 'family_hub' ? node.position.y : node.position.y + H;
}

function isDemoHubData(data: DemoNodeData | DemoHubData): data is DemoHubData {
  return typeof (data as DemoHubData).hub === 'object' && (data as DemoHubData).hub !== null;
}

function buildDemoGraph() {
  const baseNodes: DemoTreeNode[] = DEMO_NODES.map((node) => ({ ...node, data: { ...node.data } }));
  const baseEdges: DemoTreeEdge[] = RAW_DEMO_EDGES.map((edge) => ({ ...edge, data: { ...edge.data } }));

  const hubs: DemoTreeNode[] = [];
  const syntheticEdges: DemoTreeEdge[] = [];
  const rewiredEdgeIds = new Set<string>();

  const parentChildEdges = baseEdges.filter((edge) => edge.data?.type === 'parent_child');
  const partnershipEdges = baseEdges.filter((edge) => edge.data?.type === 'partnership');

  function createHubNode(hubId: string, familyKey: string, hubKind: FamilyKind, parentIds: string[]) {
    hubs.push({
      id: hubId,
      type: 'family_hub',
      data: {
        hub: {
          hubKind,
          parentIds,
          familyKey,
        },
      } satisfies DemoHubData,
      position: { x: 0, y: 0 },
      draggable: false,
    });
  }

  // Pass A: partnered parents with shared children.
  partnershipEdges.forEach((edge) => {
    const p1 = edge.source;
    const p2 = edge.target;
    const [leftParentId, rightParentId] = [p1, p2].sort();
    const familyKey = `partner__${leftParentId}__${rightParentId}`;
    const hubId = `hub__${familyKey}`;

    const p1Children = parentChildEdges.filter((childEdge) => !rewiredEdgeIds.has(childEdge.id) && childEdge.source === p1);
    const p2Children = parentChildEdges.filter((childEdge) => !rewiredEdgeIds.has(childEdge.id) && childEdge.source === p2);

    const sharedChildIds = p1Children
      .map((childEdge) => childEdge.target)
      .filter((childId) => p2Children.some((childEdge) => childEdge.target === childId))
      .sort();

    if (sharedChildIds.length === 0) return;

    createHubNode(hubId, familyKey, 'partner', [leftParentId, rightParentId]);

    [leftParentId, rightParentId].forEach((parentId) => {
      syntheticEdges.push({
        id: `edge__${familyKey}__${parentId}__hub`,
        source: parentId,
        target: hubId,
        type: 'custom',
        data: connectorData('parent_to_hub', 'partner', familyKey),
      });
    });

    sharedChildIds.forEach((childId) => {
      syntheticEdges.push({
        id: `edge__${familyKey}__hub__${childId}`,
        source: hubId,
        target: childId,
        type: 'custom',
        data: connectorData('hub_to_child', 'partner', familyKey),
      });

      const p1Edge = p1Children.find((candidate) => candidate.target === childId);
      const p2Edge = p2Children.find((candidate) => candidate.target === childId);
      if (p1Edge) rewiredEdgeIds.add(p1Edge.id);
      if (p2Edge) rewiredEdgeIds.add(p2Edge.id);
    });
  });

  // Pass B: single parent with 2+ children.
  const remainingParentEdges = parentChildEdges.filter((edge) => !rewiredEdgeIds.has(edge.id));
  const childrenByParent = new Map<string, DemoTreeEdge[]>();

  remainingParentEdges.forEach((edge) => {
    const bucket = childrenByParent.get(edge.source) || [];
    bucket.push(edge);
    childrenByParent.set(edge.source, bucket);
  });

  childrenByParent.forEach((childEdges, parentId) => {
    if (childEdges.length < 2) return;

    const familyKey = `single__${parentId}`;
    const hubId = `hub__${familyKey}`;
    createHubNode(hubId, familyKey, 'single', [parentId]);

    syntheticEdges.push({
      id: `edge__${familyKey}__${parentId}__hub`,
      source: parentId,
      target: hubId,
      type: 'custom',
      data: connectorData('parent_to_hub', 'single', familyKey),
    });

    childEdges
      .map((edge) => edge.target)
      .sort()
      .forEach((childId) => {
        syntheticEdges.push({
          id: `edge__${familyKey}__hub__${childId}`,
          source: hubId,
          target: childId,
          type: 'custom',
          data: connectorData('hub_to_child', 'single', familyKey),
        });
      });

    childEdges.forEach((edge) => rewiredEdgeIds.add(edge.id));
  });

  const finalNodes = [...baseNodes, ...hubs];
  const nodeById = new Map(finalNodes.map((node) => [node.id, node] as const));

  // Position demo hubs based on parent geometry.
  finalNodes.forEach((node) => {
    if (node.type !== 'family_hub') return;
    const hubData = node.data;
    if (!hubData || !isDemoHubData(hubData)) return;
    const hubMeta = hubData.hub;
    const parentNodes = hubMeta.parentIds
      .map((parentId) => nodeById.get(parentId))
      .filter((parent): parent is DemoTreeNode => Boolean(parent));

    if (hubMeta.hubKind === 'partner' && parentNodes.length >= 2) {
      const p1 = parentNodes[0];
      const p2 = parentNodes[1];
      node.position.x = (centerX(p1) + centerX(p2)) / 2;
      node.position.y = (topY(p1) + H / 2 + topY(p2) + H / 2) / 2;
      return;
    }

    if (parentNodes.length >= 1) {
      const parent = parentNodes[0];
      node.position.x = centerX(parent);
      node.position.y = bottomY(parent) + 42;
    }
  });

  const routedEdges = [...baseEdges.filter((edge) => !rewiredEdgeIds.has(edge.id)), ...syntheticEdges].map((edge) => {
    const sourceNode = nodeById.get(edge.source);
    const targetNode = nodeById.get(edge.target);
    const edgeData = edge.data;
    const connector = edgeData?.connector;

    if (edgeData?.type === 'partnership' && sourceNode && targetNode) {
      const sourceIsLeft = sourceNode.position.x < targetNode.position.x;
      return {
        ...edge,
        sourceHandle: sourceIsLeft ? 'p-right-source' : 'p-left-source',
        targetHandle: sourceIsLeft ? 'p-left-target' : 'p-right-target',
      };
    }

    if (connector && sourceNode && targetNode) {
      if (connector.connectorRole === 'parent_to_hub') {
        if (connector.familyKind === 'partner') {
          const sourceIsLeft = sourceNode.position.x < targetNode.position.x;
          return {
            ...edge,
            sourceHandle: sourceIsLeft ? 'p-right-source' : 'p-left-source',
            targetHandle: 'hub-target',
          };
        }

        return {
          ...edge,
          sourceHandle: 'source',
          targetHandle: 'hub-target',
        };
      }

      if (connector.connectorRole === 'hub_to_child') {
        return {
          ...edge,
          sourceHandle: 'hub-source',
          targetHandle: 'target',
        };
      }
    }

    return edge;
  });

  const groups = new Map<string, DemoTreeEdge[]>();
  routedEdges.forEach((edge) => {
    const connector = edge.data?.connector;
    if (!connector || connector.connectorRole !== 'hub_to_child') return;
    const bucket = groups.get(connector.familyKey) || [];
    bucket.push(edge);
    groups.set(connector.familyKey, bucket);
  });

  const geometryByFamily = new Map<string, { branchY: number; minX: number; maxX: number; anchorEdgeId: string }>();

  groups.forEach((groupEdges, familyKey) => {
    if (groupEdges.length === 0) return;
    const sourceNode = nodeById.get(groupEdges[0].source);
    if (!sourceNode) return;

    const points = groupEdges
      .map((edge) => {
        const targetNode = nodeById.get(edge.target);
        if (!targetNode) return null;
        return { edgeId: edge.id, x: centerX(targetNode), topY: topY(targetNode) };
      })
      .filter((point): point is { edgeId: string; x: number; topY: number } => Boolean(point));

    if (points.length === 0) return;

    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minChildTopY = Math.min(...points.map((point) => point.topY));
    const branchY = Math.max(sourceNode.position.y + 30, minChildTopY - 20);
    const anchorEdgeId = [...points].sort((a, b) => a.x - b.x || a.edgeId.localeCompare(b.edgeId))[0].edgeId;

    geometryByFamily.set(familyKey, { branchY, minX, maxX, anchorEdgeId });
  });

  const finalEdges = routedEdges.map((edge) => {
    const edgeData = edge.data;
    const connector = edgeData?.connector;
    if (!connector || connector.connectorRole !== 'hub_to_child') return edge;

    const geometry = geometryByFamily.get(connector.familyKey);
    if (!geometry) return edge;

    return {
      ...edge,
      data: {
        ...edgeData,
        connectorGeometry: {
          branchY: geometry.branchY,
          minX: geometry.minX,
          maxX: geometry.maxX,
          isAnchor: geometry.anchorEdgeId === edge.id,
        },
      } satisfies DemoEdgeData,
    };
  });

  return {
    nodes: finalNodes,
    edges: finalEdges,
  };
}

const DEMO_GRAPH = buildDemoGraph();

function DemoTreeInner() {
  const [nodes] = useNodesState<DemoTreeNode>(DEMO_GRAPH.nodes);
  const [edges] = useEdgesState<DemoTreeEdge>(DEMO_GRAPH.edges);
  const { fitView } = useReactFlow();
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  const startAutoHighlight = useCallback(() => {
    const nodeIds = ['6', '3', '1', '2', '4', '7', '5', '8'];
    let idx = 0;

    intervalRef.current = setInterval(() => {
      setHighlighted(nodeIds[idx % nodeIds.length]);
      idx++;
    }, 2000);
  }, []);

  useEffect(() => {
    setTimeout(() => fitView({ padding: 0.2 }), 200);
    startAutoHighlight();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fitView, startAutoHighlight]);

  const styledNodes = nodes.map((node) => ({
    ...node,
    className: highlighted === node.id ? 'demo-node-highlight' : '',
  }));

  return (
    <ReactFlow
      nodes={styledNodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      proOptions={{ hideAttribution: true }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnDrag={false}
      zoomOnScroll={false}
      zoomOnPinch={false}
      zoomOnDoubleClick={false}
      preventScrolling={false}
    >
      <Background color="#E8E4DF" gap={24} size={1} />
    </ReactFlow>
  );
}

export function DemoTree() {
  return (
    <>
      <style>{`
        .demo-node-highlight .react-flow__node {
          transform: scale(1.12) !important;
        }
        .demo-node-highlight > div {
          box-shadow: 0 8px 25px rgba(139,157,119,0.5) !important;
          transition: box-shadow 0.4s ease;
        }
        .react-flow__node {
          transition: transform 0.4s ease;
        }
      `}</style>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
        viewport={{ once: true, margin: '-100px' }}
        className="w-full h-[420px] md:h-[500px] rounded-3xl overflow-hidden border border-stone/40 shadow-2xl shadow-moss/10 bg-white/80 backdrop-blur-sm"
      >
        <ReactFlowProvider>
          <DemoTreeInner />
        </ReactFlowProvider>
      </motion.div>
    </>
  );
}
