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

interface DemoEdgeData {
  type: 'parent_child' | 'partnership';
  connector?: ConnectorMeta;
  connectorGeometry?: ConnectorGeometry;
}

interface DemoHubData {
  hub: {
    hubKind: FamilyKind;
    parentIds: string[];
    familyKey: string;
  };
}

interface DemoNodeData extends Record<string, unknown> {
  label: string;
  bg: string;
  color: string;
  ring?: boolean;
}

function DemoNode({ data }: NodeProps<Node<DemoNodeData>>) {
  return (
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: '50%',
        background: data.bg,
        color: data.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 600,
        textAlign: 'center',
        lineHeight: 1.2,
        padding: 6,
        boxShadow: data.ring
          ? '0 0 0 3px #A8C090, 0 6px 20px rgba(168,192,144,0.4)'
          : '0 4px 12px rgba(0,0,0,0.1)',
      }}
    >
      <Handle type="target" position={Position.Top} id="target" style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="source" position={Position.Bottom} id="source" style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="target" position={Position.Left} id="p-left-target" style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="source" position={Position.Left} id="p-left-source" style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="target" position={Position.Right} id="p-right-target" style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="source" position={Position.Right} id="p-right-source" style={{ opacity: 0, width: 1, height: 1 }} />
      {data.label}
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

const W = 64;
const H = 64;
const GAP = 40;
const ROW0_Y = 20;
const ROW1_Y = 140;
const ROW2_Y = 260;
const cx = 340;

const DEMO_NODES: Node<DemoNodeData>[] = [
  {
    id: '1',
    type: 'demo',
    position: { x: cx - W - GAP / 2, y: ROW0_Y },
    data: { label: 'Grandpa\nJoe', bg: 'linear-gradient(135deg, #8B9D77, #A8C090)', color: '#fff' },
  },
  {
    id: '2',
    type: 'demo',
    position: { x: cx + GAP / 2, y: ROW0_Y },
    data: { label: 'Grandma\nRose', bg: 'linear-gradient(135deg, #D4A373, #E8C9A0)', color: '#fff' },
  },
  {
    id: '3',
    type: 'demo',
    position: { x: cx - W * 2 - GAP, y: ROW1_Y },
    data: { label: 'Dad', bg: 'linear-gradient(135deg, #5D4E37, #8B7355)', color: '#fff' },
  },
  {
    id: '4',
    type: 'demo',
    position: { x: cx - W - GAP / 2 + 10, y: ROW1_Y },
    data: { label: 'Mom', bg: 'linear-gradient(135deg, #C4D4A5, #A8C090)', color: '#3A3A3A' },
  },
  {
    id: '5',
    type: 'demo',
    position: { x: cx + W + GAP, y: ROW1_Y },
    data: { label: 'Uncle\nBen', bg: 'linear-gradient(135deg, #8B9D77, #6B8B5E)', color: '#fff' },
  },
  {
    id: '6',
    type: 'demo',
    position: { x: cx - W * 2 - GAP - 15, y: ROW2_Y },
    data: { label: 'You', bg: 'linear-gradient(135deg, #D4A373, #C8956E)', color: '#fff', ring: true },
  },
  {
    id: '7',
    type: 'demo',
    position: { x: cx - W / 2, y: ROW2_Y },
    data: { label: 'Sister', bg: 'linear-gradient(135deg, #A8C090, #C4D4A5)', color: '#3A3A3A' },
  },
  {
    id: '8',
    type: 'demo',
    position: { x: cx + W + GAP, y: ROW2_Y },
    data: { label: 'Cousin\nLily', bg: 'linear-gradient(135deg, #E8C9A0, #D4A373)', color: '#3A3A3A' },
  },
];

const RAW_DEMO_EDGES: Edge[] = [
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

function centerX(node: Node) {
  return node.type === 'family_hub' ? node.position.x : node.position.x + W / 2;
}

function topY(node: Node) {
  return node.position.y;
}

function bottomY(node: Node) {
  return node.type === 'family_hub' ? node.position.y : node.position.y + H;
}

function buildDemoGraph() {
  const baseNodes: Node[] = DEMO_NODES.map((node) => ({ ...node, data: { ...(node.data as DemoNodeData) } }));
  const baseEdges: Edge[] = RAW_DEMO_EDGES.map((edge) => ({ ...edge, data: { ...(edge.data as DemoEdgeData) } }));

  const hubs: Node[] = [];
  const syntheticEdges: Edge[] = [];
  const rewiredEdgeIds = new Set<string>();

  const parentChildEdges = baseEdges.filter((edge) => (edge.data as DemoEdgeData).type === 'parent_child');
  const partnershipEdges = baseEdges.filter((edge) => (edge.data as DemoEdgeData).type === 'partnership');

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
  const childrenByParent = new Map<string, Edge[]>();

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
    const hubMeta = (node.data as DemoHubData).hub;
    const parentNodes = hubMeta.parentIds
      .map((parentId) => nodeById.get(parentId))
      .filter((parent): parent is Node => Boolean(parent));

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
    const edgeData = edge.data as DemoEdgeData | undefined;
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

  const groups = new Map<string, Edge[]>();
  routedEdges.forEach((edge) => {
    const connector = (edge.data as DemoEdgeData | undefined)?.connector;
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
    const edgeData = edge.data as DemoEdgeData | undefined;
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
  const [nodes] = useNodesState<Node>(DEMO_GRAPH.nodes);
  const [edges] = useEdgesState<Edge>(DEMO_GRAPH.edges);
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
