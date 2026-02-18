export const FAMILY_TREE_NODE_WIDTH = 188;
export const FAMILY_TREE_NODE_HEIGHT = 236;

const SPOUSE_GAP = 44;
const UNIT_GAP = 188;
const ROW_GAP = 180;
const TOP_PADDING = 120;
const SIDE_PADDING = 180;
const EDGE_LANE_STEP = 20;
const EDGE_LANE_GAP = 22;
const EDGE_LANE_RANGE_PADDING = 18;

type RelationshipType = 'parent_child' | 'partnership';

export interface FamilyTreeNodeInput {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  avatarZoom?: number | null;
  avatarFocusX?: number | null;
  avatarFocusY?: number | null;
  birthYear: number | null;
  isAlive: boolean;
  isClaimed: boolean;
  x?: number | null;
}

export interface FamilyTreeEdgeInput {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
}

export interface PositionedFamilyNode extends FamilyTreeNodeInput {
  x: number;
  y: number;
  centerX: number;
  centerY: number;
  generation: number;
  parentCount: number;
  spouseCount: number;
  canAddParent: boolean;
  canAddSpouse: boolean;
  canAddChild: boolean;
}

export interface FamilyTreeRenderEdge {
  id: string;
  kind: RelationshipType;
  path: string;
}

export interface FamilyTreeLayoutResult {
  nodes: PositionedFamilyNode[];
  edges: FamilyTreeRenderEdge[];
  bounds: {
    width: number;
    height: number;
  };
}

interface FamilyUnit {
  kind: 'single' | 'pair';
  members: string[];
}

interface FamilyGroup {
  key: string;
  parentIds: string[];
  childIds: string[];
}

function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

const average = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const round = (value: number) => Number(value.toFixed(2));

function polyline(points: Array<[number, number]>) {
  const cleaned: Array<[number, number]> = [];

  points.forEach(([x, y]) => {
    const next: [number, number] = [round(x), round(y)];
    const previous = cleaned[cleaned.length - 1];

    if (!previous || previous[0] !== next[0] || previous[1] !== next[1]) {
      cleaned.push(next);
    }
  });

  if (cleaned.length < 2) {
    return `M ${cleaned[0]?.[0] || 0} ${cleaned[0]?.[1] || 0}`;
  }

  return cleaned
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`)
    .join(' ');
}

function rangesOverlap(
  leftMinX: number,
  leftMaxX: number,
  rightMinX: number,
  rightMaxX: number,
  padding = EDGE_LANE_RANGE_PADDING
) {
  return !(
    leftMaxX < rightMinX + padding ||
    rightMaxX < leftMinX + padding
  );
}

function solveAnchoredLeftPositions(
  targetLefts: number[],
  widths: number[],
  minGap: number
) {
  const count = targetLefts.length;
  if (count === 0) return [];

  const offsets = new Array<number>(count).fill(0);
  for (let index = 1; index < count; index += 1) {
    offsets[index] = offsets[index - 1]! + widths[index - 1]! + minGap;
  }

  interface Block {
    start: number;
    end: number;
    sum: number;
    count: number;
    mean: number;
  }

  const blocks: Block[] = [];

  for (let index = 0; index < count; index += 1) {
    const value = targetLefts[index]! - offsets[index]!;
    blocks.push({
      start: index,
      end: index,
      sum: value,
      count: 1,
      mean: value,
    });

    while (blocks.length >= 2) {
      const rightBlock = blocks[blocks.length - 1]!;
      const leftBlock = blocks[blocks.length - 2]!;

      if (leftBlock.mean <= rightBlock.mean) break;

      const mergedBlock: Block = {
        start: leftBlock.start,
        end: rightBlock.end,
        sum: leftBlock.sum + rightBlock.sum,
        count: leftBlock.count + rightBlock.count,
        mean: (leftBlock.sum + rightBlock.sum) / (leftBlock.count + rightBlock.count),
      };

      blocks.splice(blocks.length - 2, 2, mergedBlock);
    }
  }

  const resolved = new Array<number>(count).fill(0);

  blocks.forEach((block) => {
    for (let index = block.start; index <= block.end; index += 1) {
      resolved[index] = block.mean + offsets[index]!;
    }
  });

  return resolved;
}

function normalizeGeneration(generationById: Map<string, number>) {
  const values = Array.from(generationById.values());
  const minGeneration = Math.min(0, ...values);

  if (minGeneration >= 0) return generationById;

  const normalized = new Map<string, number>();
  generationById.forEach((generation, nodeId) => {
    normalized.set(nodeId, generation - minGeneration);
  });

  return normalized;
}

export function buildFamilyTreeLayout(
  nodes: FamilyTreeNodeInput[],
  edges: FamilyTreeEdgeInput[]
): FamilyTreeLayoutResult {
  if (nodes.length === 0) {
    return {
      nodes: [],
      edges: [],
      bounds: {
        width: 1200,
        height: 760,
      },
    };
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node] as const));

  const parentChildEdges = edges.filter(
    (edge) => edge.type === 'parent_child' && nodeById.has(edge.source) && nodeById.has(edge.target)
  );

  const partnershipEdges = edges.filter(
    (edge) => edge.type === 'partnership' && nodeById.has(edge.source) && nodeById.has(edge.target)
  );

  const parentByChild = new Map<string, Set<string>>();
  const partnerByNode = new Map<string, Set<string>>();

  parentChildEdges.forEach((edge) => {
    const parents = parentByChild.get(edge.target) || new Set<string>();
    parents.add(edge.source);
    parentByChild.set(edge.target, parents);
  });

  partnershipEdges.forEach((edge) => {
    const sourcePartners = partnerByNode.get(edge.source) || new Set<string>();
    const targetPartners = partnerByNode.get(edge.target) || new Set<string>();

    sourcePartners.add(edge.target);
    targetPartners.add(edge.source);

    partnerByNode.set(edge.source, sourcePartners);
    partnerByNode.set(edge.target, targetPartners);
  });

  let generationById = new Map<string, number>(nodes.map((node) => [node.id, 0]));

  const maxIterations = Math.max(8, nodes.length * 8);

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let changed = false;

    parentChildEdges.forEach((edge) => {
      const sourceGeneration = generationById.get(edge.source) || 0;
      const targetGeneration = generationById.get(edge.target) || 0;
      const nextTargetGeneration = sourceGeneration + 1;

      if (nextTargetGeneration > targetGeneration) {
        generationById.set(edge.target, nextTargetGeneration);
        changed = true;
      }
    });

    partnershipEdges.forEach((edge) => {
      const sourceGeneration = generationById.get(edge.source) || 0;
      const targetGeneration = generationById.get(edge.target) || 0;
      const syncedGeneration = Math.max(sourceGeneration, targetGeneration);

      if (sourceGeneration !== syncedGeneration) {
        generationById.set(edge.source, syncedGeneration);
        changed = true;
      }

      if (targetGeneration !== syncedGeneration) {
        generationById.set(edge.target, syncedGeneration);
        changed = true;
      }
    });

    if (!changed) {
      break;
    }
  }

  generationById = normalizeGeneration(generationById);

  const maxGeneration = Math.max(0, ...Array.from(generationById.values()));
  const seedCenterXById = new Map<string, number>(
    nodes.map((node, index) => {
      const seed = typeof node.x === 'number' ? node.x + FAMILY_TREE_NODE_WIDTH / 2 : index * 220;
      return [node.id, seed] as const;
    })
  );

  const preliminaryXById = new Map<string, number>();
  const centerXById = new Map<string, number>();

  for (let generation = 0; generation <= maxGeneration; generation += 1) {
    const rowIds = nodes
      .filter((node) => (generationById.get(node.id) || 0) === generation)
      .map((node) => node.id)
      .sort((a, b) => a.localeCompare(b));

    const rowSet = new Set(rowIds);
    const visited = new Set<string>();
    const units: FamilyUnit[] = [];

    rowIds.forEach((nodeId) => {
      if (visited.has(nodeId)) return;

      const availablePartners = Array.from(partnerByNode.get(nodeId) || [])
        .filter((partnerId) => rowSet.has(partnerId) && !visited.has(partnerId))
        .sort((a, b) => a.localeCompare(b));

      const partnerId = availablePartners[0];

      if (partnerId) {
        const members = [nodeId, partnerId].sort((a, b) => {
          const aSeed = seedCenterXById.get(a) || 0;
          const bSeed = seedCenterXById.get(b) || 0;
          return aSeed - bSeed;
        });

        units.push({ kind: 'pair', members });
        visited.add(nodeId);
        visited.add(partnerId);
        return;
      }

      units.push({ kind: 'single', members: [nodeId] });
      visited.add(nodeId);
    });

    const getUnitAnchor = (unit: FamilyUnit) => {
      const parentCenters: number[] = [];

      unit.members.forEach((memberId) => {
        Array.from(parentByChild.get(memberId) || []).forEach((parentId) => {
          const center = centerXById.get(parentId);
          if (center !== undefined) {
            parentCenters.push(center);
          }
        });
      });

      if (parentCenters.length > 0) {
        return average(parentCenters);
      }

      return average(unit.members.map((memberId) => seedCenterXById.get(memberId) || 0));
    };

    const getUnitWidth = (unit: FamilyUnit) =>
      unit.kind === 'pair'
        ? FAMILY_TREE_NODE_WIDTH * 2 + SPOUSE_GAP
        : FAMILY_TREE_NODE_WIDTH;

    const rowUnits = units
      .map((unit) => {
        const width = getUnitWidth(unit);
        const anchorX = getUnitAnchor(unit);
        return {
          unit,
          width,
          anchorX,
          targetLeftX: anchorX - width / 2,
        };
      })
      .sort((left, right) => {
        if (left.anchorX !== right.anchorX) {
          return left.anchorX - right.anchorX;
        }

        return left.unit.members.join('__').localeCompare(right.unit.members.join('__'));
      });

    const resolvedLeftPositions = solveAnchoredLeftPositions(
      rowUnits.map((entry) => entry.targetLeftX),
      rowUnits.map((entry) => entry.width),
      UNIT_GAP
    );

    rowUnits.forEach((entry, index) => {
      const leftX = resolvedLeftPositions[index]!;

      if (entry.unit.kind === 'pair') {
        const [leftId, rightId] = entry.unit.members;

        preliminaryXById.set(leftId, leftX);
        preliminaryXById.set(rightId, leftX + FAMILY_TREE_NODE_WIDTH + SPOUSE_GAP);

        centerXById.set(leftId, leftX + FAMILY_TREE_NODE_WIDTH / 2);
        centerXById.set(
          rightId,
          leftX + FAMILY_TREE_NODE_WIDTH + SPOUSE_GAP + FAMILY_TREE_NODE_WIDTH / 2
        );
        return;
      }

      const [memberId] = entry.unit.members;
      preliminaryXById.set(memberId, leftX);
      centerXById.set(memberId, leftX + FAMILY_TREE_NODE_WIDTH / 2);
    });
  }

  let positionedNodes = nodes
    .map((node) => {
      const generation = generationById.get(node.id) || 0;
      const rowOffset = SIDE_PADDING;
      const parentCount = (parentByChild.get(node.id) || new Set<string>()).size;
      const spouseCount = (partnerByNode.get(node.id) || new Set<string>()).size;

      const x = (preliminaryXById.get(node.id) || 0) + rowOffset;
      const y = TOP_PADDING + generation * (FAMILY_TREE_NODE_HEIGHT + ROW_GAP);

      return {
        ...node,
        generation,
        x,
        y,
        centerX: x + FAMILY_TREE_NODE_WIDTH / 2,
        centerY: y + FAMILY_TREE_NODE_HEIGHT / 2,
        parentCount,
        spouseCount,
        canAddParent: parentCount < 2,
        canAddSpouse: spouseCount < 1,
        canAddChild: true,
      } as PositionedFamilyNode;
    })
    .sort((a, b) => a.y - b.y || a.x - b.x);

  const rawMinX = Math.min(...positionedNodes.map((node) => node.x));
  const rawMinY = Math.min(...positionedNodes.map((node) => node.y));
  const shiftX = rawMinX < SIDE_PADDING ? SIDE_PADDING - rawMinX : 0;
  const shiftY = rawMinY < TOP_PADDING ? TOP_PADDING - rawMinY : 0;

  if (shiftX !== 0 || shiftY !== 0) {
    positionedNodes = positionedNodes.map((node) => ({
      ...node,
      x: node.x + shiftX,
      y: node.y + shiftY,
      centerX: node.centerX + shiftX,
      centerY: node.centerY + shiftY,
    }));
  }

  const positionedNodeById = new Map(positionedNodes.map((node) => [node.id, node] as const));

  const familyGroups = new Map<string, FamilyGroup>();

  positionedNodes.forEach((childNode) => {
    const parentIds = Array.from(parentByChild.get(childNode.id) || [])
      .filter((parentId) => positionedNodeById.has(parentId))
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 2);

    if (parentIds.length === 0) return;

    const key = parentIds.join('|');

    if (!familyGroups.has(key)) {
      familyGroups.set(key, {
        key,
        parentIds,
        childIds: [],
      });
    }

    familyGroups.get(key)!.childIds.push(childNode.id);
  });

  familyGroups.forEach((group) => {
    group.childIds.sort((leftChild, rightChild) => {
      const leftX = positionedNodeById.get(leftChild)?.centerX || 0;
      const rightX = positionedNodeById.get(rightChild)?.centerX || 0;
      return leftX - rightX;
    });
  });

  const renderEdges: FamilyTreeRenderEdge[] = [];

  const renderedPartnerships = new Set<string>();

  partnershipEdges.forEach((edge) => {
    const pairKey = [edge.source, edge.target].sort((a, b) => a.localeCompare(b)).join('|');

    if (renderedPartnerships.has(pairKey)) return;

    const sourceNode = positionedNodeById.get(edge.source);
    const targetNode = positionedNodeById.get(edge.target);

    if (!sourceNode || !targetNode) return;

    const [leftNode, rightNode] =
      sourceNode.centerX <= targetNode.centerX
        ? [sourceNode, targetNode]
        : [targetNode, sourceNode];

    const lineY = average([leftNode.centerY, rightNode.centerY]);

    renderEdges.push({
      id: `partner__${pairKey}`,
      kind: 'partnership',
      path: polyline([
        [leftNode.x + FAMILY_TREE_NODE_WIDTH, lineY],
        [rightNode.x, lineY],
      ]),
    });

    renderedPartnerships.add(pairKey);
  });

  const horizontalLaneRegistry = new Map<
    string,
    Array<{ y: number; minX: number; maxX: number }>
  >();

  const pickHorizontalLane = (
    laneKey: string,
    minY: number,
    maxY: number,
    preferredY: number,
    minX: number,
    maxX: number
  ) => {
    const lanes = horizontalLaneRegistry.get(laneKey) || [];
    const rangeMinX = Math.min(minX, maxX);
    const rangeMaxX = Math.max(minX, maxX);
    const clampedMinY = round(minY);
    const clampedMaxY = round(Math.max(minY, maxY));
    const baseY = round(Math.max(clampedMinY, Math.min(clampedMaxY, preferredY)));

    const candidates: number[] = [];
    const seen = new Set<number>();
    const maxSteps = Math.max(
      2,
      Math.ceil((clampedMaxY - clampedMinY) / EDGE_LANE_STEP) + 2
    );

    const pushCandidate = (value: number) => {
      const normalized = round(Math.max(clampedMinY, Math.min(clampedMaxY, value)));
      if (!seen.has(normalized)) {
        seen.add(normalized);
        candidates.push(normalized);
      }
    };

    pushCandidate(baseY);

    for (let step = 1; step <= maxSteps; step += 1) {
      const offset = step * EDGE_LANE_STEP;
      pushCandidate(baseY - offset);
      pushCandidate(baseY + offset);
    }

    let selectedY = baseY;

    for (const candidate of candidates) {
      const conflict = lanes.some(
        (lane) =>
          Math.abs(lane.y - candidate) < EDGE_LANE_GAP &&
          rangesOverlap(lane.minX, lane.maxX, rangeMinX, rangeMaxX)
      );

      if (!conflict) {
        selectedY = candidate;
        break;
      }
    }

    lanes.push({
      y: selectedY,
      minX: rangeMinX,
      maxX: rangeMaxX,
    });
    horizontalLaneRegistry.set(laneKey, lanes);

    return selectedY;
  };

  const routedGroups = Array.from(familyGroups.values())
    .map((group) => {
      const parentNodes = group.parentIds
        .map((parentId) => positionedNodeById.get(parentId))
        .filter(isDefined)
        .sort((left, right) => left.centerX - right.centerX);

      const childNodes = group.childIds
        .map((childId) => positionedNodeById.get(childId))
        .filter(isDefined);

      if (parentNodes.length === 0 || childNodes.length === 0) return null;

      const parentGeneration = Math.max(...parentNodes.map((parentNode) => parentNode.generation));
      const childGeneration = Math.min(...childNodes.map((childNode) => childNode.generation));
      const parentBottomY = Math.max(
        ...parentNodes.map((parentNode) => parentNode.y + FAMILY_TREE_NODE_HEIGHT)
      );
      const parentSpanMinX = Math.min(...parentNodes.map((parentNode) => parentNode.centerX));
      const parentSpanMaxX = Math.max(...parentNodes.map((parentNode) => parentNode.centerX));
      const childTopY = Math.min(...childNodes.map((childNode) => childNode.y));
      const isPair = parentNodes.length === 2;
      const parentAnchorX = isPair
        ? average(parentNodes.map((parentNode) => parentNode.centerX))
        : parentNodes[0]!.centerX;

      const [horizontalMinX, horizontalMaxX] =
        childNodes.length === 1
          ? [
              Math.min(parentAnchorX, childNodes[0]!.centerX),
              Math.max(parentAnchorX, childNodes[0]!.centerX),
            ]
          : [
              Math.min(
                parentAnchorX,
                ...childNodes.map((childNode) => childNode.centerX)
              ),
              Math.max(
                parentAnchorX,
                ...childNodes.map((childNode) => childNode.centerX)
              ),
            ];

      return {
        group,
        parentNodes,
        childNodes,
        parentGeneration,
        childGeneration,
        isPair,
        parentAnchorX,
        parentBottomY,
        parentSpanMinX,
        parentSpanMaxX,
        childTopY,
        horizontalMinX,
        horizontalMaxX,
      };
    })
    .filter(isDefined)
    .sort(
      (left, right) =>
        left.parentBottomY - right.parentBottomY ||
        left.parentAnchorX - right.parentAnchorX
    );

  routedGroups.forEach((routedGroup) => {
    const mergeY = routedGroup.isPair
      ? pickHorizontalLane(
          `h:${routedGroup.parentGeneration}`,
          routedGroup.parentBottomY + 18,
          Math.max(routedGroup.parentBottomY + 18, routedGroup.childTopY - 80),
          routedGroup.parentBottomY + 28,
          routedGroup.parentSpanMinX,
          routedGroup.parentSpanMaxX
        )
      : routedGroup.parentBottomY + 18;

    const minBranchY = Math.max(routedGroup.parentBottomY + 46, mergeY + 32);
    const maxBranchY = Math.max(minBranchY, routedGroup.childTopY - 24);
    const preferredBranchY = Math.max(
      minBranchY,
      Math.min(maxBranchY, routedGroup.childTopY - 36)
    );

    const branchY = pickHorizontalLane(
      `h:${routedGroup.childGeneration}`,
      minBranchY,
      maxBranchY,
      preferredBranchY,
      routedGroup.horizontalMinX,
      routedGroup.horizontalMaxX
    );

    if (routedGroup.isPair) {
      const leftParent = routedGroup.parentNodes[0];
      const rightParent = routedGroup.parentNodes[1];

      if (!leftParent || !rightParent) return;

      const midX = routedGroup.parentAnchorX;

      renderEdges.push({
        id: `family__${routedGroup.group.key}__left-parent`,
        kind: 'parent_child',
        path: polyline([
          [leftParent.centerX, leftParent.y + FAMILY_TREE_NODE_HEIGHT],
          [leftParent.centerX, mergeY],
          [midX, mergeY],
        ]),
      });

      renderEdges.push({
        id: `family__${routedGroup.group.key}__right-parent`,
        kind: 'parent_child',
        path: polyline([
          [rightParent.centerX, rightParent.y + FAMILY_TREE_NODE_HEIGHT],
          [rightParent.centerX, mergeY],
          [midX, mergeY],
        ]),
      });

      if (routedGroup.childNodes.length === 1) {
        const childNode = routedGroup.childNodes[0];
        if (!childNode) return;

        renderEdges.push({
          id: `family__${routedGroup.group.key}__single-child`,
          kind: 'parent_child',
          path: polyline([
            [midX, mergeY],
            [midX, branchY],
            [childNode.centerX, branchY],
            [childNode.centerX, childNode.y],
          ]),
        });

        return;
      }

      renderEdges.push({
        id: `family__${routedGroup.group.key}__trunk`,
        kind: 'parent_child',
        path: polyline([
          [midX, mergeY],
          [midX, branchY],
        ]),
      });

      renderEdges.push({
        id: `family__${routedGroup.group.key}__sibling-line`,
        kind: 'parent_child',
        path: polyline([
          [routedGroup.horizontalMinX, branchY],
          [routedGroup.horizontalMaxX, branchY],
        ]),
      });

      routedGroup.childNodes.forEach((childNode) => {
        renderEdges.push({
          id: `family__${routedGroup.group.key}__child__${childNode.id}`,
          kind: 'parent_child',
          path: polyline([
            [childNode.centerX, branchY],
            [childNode.centerX, childNode.y],
          ]),
        });
      });

      return;
    }

    const parentNode = routedGroup.parentNodes[0];
    if (!parentNode) return;

    if (routedGroup.childNodes.length === 1) {
      const childNode = routedGroup.childNodes[0];
      if (!childNode) return;

      renderEdges.push({
        id: `family__${routedGroup.group.key}__single-parent-child`,
        kind: 'parent_child',
        path: polyline([
          [parentNode.centerX, parentNode.y + FAMILY_TREE_NODE_HEIGHT],
          [parentNode.centerX, branchY],
          [childNode.centerX, branchY],
          [childNode.centerX, childNode.y],
        ]),
      });

      return;
    }

    renderEdges.push({
      id: `family__${routedGroup.group.key}__single-parent-trunk`,
      kind: 'parent_child',
      path: polyline([
        [parentNode.centerX, parentNode.y + FAMILY_TREE_NODE_HEIGHT],
        [parentNode.centerX, branchY],
      ]),
    });

    renderEdges.push({
      id: `family__${routedGroup.group.key}__single-parent-sibling-line`,
      kind: 'parent_child',
      path: polyline([
        [routedGroup.horizontalMinX, branchY],
        [routedGroup.horizontalMaxX, branchY],
      ]),
    });

    routedGroup.childNodes.forEach((childNode) => {
      renderEdges.push({
        id: `family__${routedGroup.group.key}__single-parent-child__${childNode.id}`,
        kind: 'parent_child',
        path: polyline([
          [childNode.centerX, branchY],
          [childNode.centerX, childNode.y],
        ]),
      });
    });
  });

  const minX = Math.min(...positionedNodes.map((node) => node.x));
  const maxX = Math.max(...positionedNodes.map((node) => node.x + FAMILY_TREE_NODE_WIDTH));
  const minY = Math.min(...positionedNodes.map((node) => node.y));
  const maxY = Math.max(...positionedNodes.map((node) => node.y + FAMILY_TREE_NODE_HEIGHT));

  return {
    nodes: positionedNodes,
    edges: renderEdges,
    bounds: {
      width: Math.max(1200, maxX - minX + SIDE_PADDING * 2),
      height: Math.max(760, maxY - minY + TOP_PADDING * 2),
    },
  };
}
