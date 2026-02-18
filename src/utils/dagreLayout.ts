import { type Node, type Edge } from '@xyflow/react';

const NODE_WIDTH = 160;
const NODE_HEIGHT = 220;
const SPOUSE_GAP = 36;
const UNIT_GAP = 96;
const ROW_GAP = 180;
const TOP_PADDING = 80;
const SIDE_PADDING = 140;

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
  type: 'parent_child' | 'partnership';
  connector?: ConnectorMeta;
  connectorGeometry?: ConnectorGeometry;
}

interface HubNodeData {
  hub: {
    hubKind: FamilyKind;
    parentIds: string[];
    familyKey: string;
  };
}

interface FamilyGroup {
  familyKey: string;
  familyKind: FamilyKind;
  parentIds: string[];
  childIds: string[];
}

interface Unit {
  kind: 'single' | 'pair';
  members: string[];
}

const average = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

export function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const personNodes: Node[] = nodes.map((node) => ({
    ...node,
    data: { ...(node.data as Record<string, unknown>) },
    position: { ...node.position },
  }));

  const rawEdges: Edge[] = edges.map((edge) => ({
    ...edge,
    data: { ...(edge.data as Record<string, unknown>) },
  }));

  const personNodeById = new Map(personNodes.map((node) => [node.id, node] as const));
  const parentChildEdges = rawEdges.filter(
    (edge) => (edge.data as TreeEdgeData | undefined)?.type === 'parent_child'
  );
  const partnershipEdges = rawEdges.filter(
    (edge) => (edge.data as TreeEdgeData | undefined)?.type === 'partnership'
  );

  const parentByChild = new Map<string, Set<string>>();
  const spouseByNode = new Map<string, string>();

  parentChildEdges.forEach((edge) => {
    if (!personNodeById.has(edge.source) || !personNodeById.has(edge.target)) return;
    const parents = parentByChild.get(edge.target) || new Set<string>();
    parents.add(edge.source);
    parentByChild.set(edge.target, parents);
  });

  partnershipEdges.forEach((edge) => {
    if (!personNodeById.has(edge.source) || !personNodeById.has(edge.target)) return;
    if (!spouseByNode.has(edge.source)) spouseByNode.set(edge.source, edge.target);
    if (!spouseByNode.has(edge.target)) spouseByNode.set(edge.target, edge.source);
  });

  // Generation assignment with spouse-level constraints.
  const generation = new Map<string, number>();
  personNodes.forEach((node) => generation.set(node.id, 0));

  const maxIterations = Math.max(6, personNodes.length * 6);
  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let changed = false;

    parentChildEdges.forEach((edge) => {
      if (!generation.has(edge.source) || !generation.has(edge.target)) return;
      const nextGen = (generation.get(edge.source) || 0) + 1;
      const currentGen = generation.get(edge.target) || 0;
      if (nextGen > currentGen) {
        generation.set(edge.target, nextGen);
        changed = true;
      }
    });

    partnershipEdges.forEach((edge) => {
      if (!generation.has(edge.source) || !generation.has(edge.target)) return;
      const sourceGen = generation.get(edge.source) || 0;
      const targetGen = generation.get(edge.target) || 0;
      const syncedGen = Math.max(sourceGen, targetGen);

      if (syncedGen > sourceGen) {
        generation.set(edge.source, syncedGen);
        changed = true;
      }
      if (syncedGen > targetGen) {
        generation.set(edge.target, syncedGen);
        changed = true;
      }
    });

    if (!changed) break;
  }

  const maxGeneration = Math.max(0, ...Array.from(generation.values()));
  const existingCenterX = new Map<string, number>(
    personNodes.map((node) => [node.id, node.position.x + NODE_WIDTH / 2])
  );

  const unitsByGeneration = new Map<number, Unit[]>();

  for (let currentGeneration = 0; currentGeneration <= maxGeneration; currentGeneration += 1) {
    const rowNodeIds = personNodes
      .filter((node) => (generation.get(node.id) || 0) === currentGeneration)
      .map((node) => node.id)
      .sort((a, b) => a.localeCompare(b));

    const visited = new Set<string>();
    const rowUnits: Unit[] = [];

    rowNodeIds.forEach((nodeId) => {
      if (visited.has(nodeId)) return;

      const spouseId = spouseByNode.get(nodeId);
      if (
        spouseId &&
        !visited.has(spouseId) &&
        rowNodeIds.includes(spouseId) &&
        (generation.get(spouseId) || 0) === currentGeneration
      ) {
        const members = [nodeId, spouseId].sort(
          (a, b) => (existingCenterX.get(a) || 0) - (existingCenterX.get(b) || 0)
        );
        rowUnits.push({ kind: 'pair', members });
        visited.add(nodeId);
        visited.add(spouseId);
        return;
      }

      rowUnits.push({ kind: 'single', members: [nodeId] });
      visited.add(nodeId);
    });

    unitsByGeneration.set(currentGeneration, rowUnits);
  }

  const preliminaryX = new Map<string, number>();
  const centerXById = new Map<string, number>();
  const rowWidthByGeneration = new Map<number, number>();

  for (let currentGeneration = 0; currentGeneration <= maxGeneration; currentGeneration += 1) {
    const units = [...(unitsByGeneration.get(currentGeneration) || [])];

    units.sort((a, b) => {
      const aParents = new Set<string>();
      const bParents = new Set<string>();

      a.members.forEach((member) =>
        (parentByChild.get(member) || new Set<string>()).forEach((parentId) => aParents.add(parentId))
      );
      b.members.forEach((member) =>
        (parentByChild.get(member) || new Set<string>()).forEach((parentId) => bParents.add(parentId))
      );

      const aParentCenters = Array.from(aParents)
        .map((parentId) => centerXById.get(parentId))
        .filter((value): value is number => value !== undefined);
      const bParentCenters = Array.from(bParents)
        .map((parentId) => centerXById.get(parentId))
        .filter((value): value is number => value !== undefined);

      const aKey =
        aParentCenters.length > 0
          ? average(aParentCenters)
          : average(a.members.map((member) => existingCenterX.get(member) || 0));
      const bKey =
        bParentCenters.length > 0
          ? average(bParentCenters)
          : average(b.members.map((member) => existingCenterX.get(member) || 0));

      if (aKey !== bKey) return aKey - bKey;
      return a.members.join('__').localeCompare(b.members.join('__'));
    });

    let cursorX = 0;

    units.forEach((unit) => {
      if (unit.kind === 'pair') {
        const [leftMember, rightMember] = unit.members;
        preliminaryX.set(leftMember, cursorX);
        preliminaryX.set(rightMember, cursorX + NODE_WIDTH + SPOUSE_GAP);
        centerXById.set(leftMember, cursorX + NODE_WIDTH / 2);
        centerXById.set(rightMember, cursorX + NODE_WIDTH + SPOUSE_GAP + NODE_WIDTH / 2);
        cursorX += NODE_WIDTH * 2 + SPOUSE_GAP + UNIT_GAP;
        return;
      }

      const [memberId] = unit.members;
      preliminaryX.set(memberId, cursorX);
      centerXById.set(memberId, cursorX + NODE_WIDTH / 2);
      cursorX += NODE_WIDTH + UNIT_GAP;
    });

    rowWidthByGeneration.set(currentGeneration, Math.max(0, cursorX - UNIT_GAP));
  }

  const maxRowWidth = Math.max(0, ...Array.from(rowWidthByGeneration.values()));

  personNodes.forEach((node) => {
    const nodeGeneration = generation.get(node.id) || 0;
    const rowWidth = rowWidthByGeneration.get(nodeGeneration) || 0;
    const rowOffset = (maxRowWidth - rowWidth) / 2 + SIDE_PADDING;
    node.position = {
      x: (preliminaryX.get(node.id) || 0) + rowOffset,
      y: TOP_PADDING + nodeGeneration * (NODE_HEIGHT + ROW_GAP),
    };
    centerXById.set(node.id, node.position.x + NODE_WIDTH / 2);
  });

  const familyGroups = new Map<string, FamilyGroup>();

  personNodes.forEach((childNode) => {
    const parentIds = Array.from(parentByChild.get(childNode.id) || new Set<string>())
      .filter((parentId) => personNodeById.has(parentId))
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 2);

    if (parentIds.length === 0) return;

    const familyKind: FamilyKind = parentIds.length === 2 ? 'partner' : 'single';
    const familyKey = `${familyKind}__${parentIds.join('__')}`;

    if (!familyGroups.has(familyKey)) {
      familyGroups.set(familyKey, {
        familyKey,
        familyKind,
        parentIds,
        childIds: [],
      });
    }

    familyGroups.get(familyKey)!.childIds.push(childNode.id);
  });

  familyGroups.forEach((group) => {
    group.childIds.sort(
      (a, b) => (centerXById.get(a) || 0) - (centerXById.get(b) || 0) || a.localeCompare(b)
    );
  });

  const hubNodes: Node[] = [];
  const familyEdges: Edge[] = [];

  const centerYOfPerson = (nodeId: string) => {
    const person = personNodes.find((entry) => entry.id === nodeId);
    return person ? person.position.y + NODE_HEIGHT / 2 : 0;
  };

  familyGroups.forEach((group) => {
    const hubId = `hub__${group.familyKey}`;
    const parentCenters = group.parentIds.map((parentId) => centerXById.get(parentId) || 0);
    const parentCenterYs = group.parentIds.map((parentId) => centerYOfPerson(parentId));

    const hubX = average(parentCenters);
    const hubY =
      group.familyKind === 'partner'
        ? average(parentCenterYs)
        : (() => {
            const parentNode = personNodes.find((entry) => entry.id === group.parentIds[0]);
            return parentNode ? parentNode.position.y + NODE_HEIGHT + 42 : average(parentCenterYs);
          })();

    hubNodes.push({
      id: hubId,
      type: 'family_hub',
      data: {
        hub: {
          hubKind: group.familyKind,
          parentIds: group.parentIds,
          familyKey: group.familyKey,
        },
      } satisfies HubNodeData,
      position: { x: hubX, y: hubY },
      draggable: false,
      selectable: false,
    });

    group.parentIds.forEach((parentId) => {
      const parentCenterX = centerXById.get(parentId) || 0;
      const sourceIsLeft = parentCenterX <= hubX;

      familyEdges.push({
        id: `edge__${hubId}__from__${parentId}`,
        source: parentId,
        target: hubId,
        type: 'custom',
        sourceHandle:
          group.familyKind === 'partner'
            ? sourceIsLeft
              ? 'p-right-source'
              : 'p-left-source'
            : 'source',
        targetHandle: 'hub-target',
        data: {
          type: 'parent_child',
          connector: {
            connectorRole: 'parent_to_hub',
            familyKind: group.familyKind,
            familyKey: group.familyKey,
          },
        } satisfies TreeEdgeData,
      });
    });

    const childCenterXs = group.childIds.map((childId) => centerXById.get(childId) || 0);
    const childTopYs = group.childIds
      .map((childId) => personNodes.find((entry) => entry.id === childId)?.position.y)
      .filter((value): value is number => value !== undefined);

    const minX = Math.min(...childCenterXs);
    const maxX = Math.max(...childCenterXs);
    const minChildTopY = childTopYs.length > 0 ? Math.min(...childTopYs) : hubY + 100;
    const branchY = Math.max(hubY + 30, minChildTopY - 20);

    const anchorChildId = [...group.childIds].sort(
      (a, b) => (centerXById.get(a) || 0) - (centerXById.get(b) || 0) || a.localeCompare(b)
    )[0];

    group.childIds.forEach((childId) => {
      familyEdges.push({
        id: `edge__${hubId}__to__${childId}`,
        source: hubId,
        target: childId,
        type: 'custom',
        sourceHandle: 'hub-source',
        targetHandle: 'target',
        data: {
          type: 'parent_child',
          connector: {
            connectorRole: 'hub_to_child',
            familyKind: group.familyKind,
            familyKey: group.familyKey,
          },
          connectorGeometry: {
            branchY,
            minX,
            maxX,
            isAnchor: childId === anchorChildId,
          },
        } satisfies TreeEdgeData,
      });
    });
  });

  const partnershipRenderEdges = partnershipEdges
    .filter((edge) => personNodeById.has(edge.source) && personNodeById.has(edge.target))
    .map((edge) => {
      const sourceCenter = centerXById.get(edge.source) || 0;
      const targetCenter = centerXById.get(edge.target) || 0;
      const sourceIsLeft = sourceCenter <= targetCenter;

      return {
        ...edge,
        type: 'custom',
        sourceHandle: sourceIsLeft ? 'p-right-source' : 'p-left-source',
        targetHandle: sourceIsLeft ? 'p-left-target' : 'p-right-target',
        data: {
          type: 'partnership',
        } satisfies TreeEdgeData,
      };
    });

  return {
    nodes: [...personNodes, ...hubNodes],
    edges: [...partnershipRenderEdges, ...familyEdges],
  };
}
