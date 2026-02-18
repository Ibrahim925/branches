'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Minus, Plus, Sparkles, UserPlus } from 'lucide-react';
import {
  use,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type WheelEvent,
} from 'react';

import { FamilyTreeCard } from '@/components/tree/FamilyTreeCard';
import { NodeDetailSidebar } from '@/components/tree/NodeDetailSidebar';
import { MobilePrimaryAction } from '@/components/system/MobilePrimaryAction';
import { Skeleton } from '@/components/system/Skeleton';
import { createClient } from '@/lib/supabase/client';
import { trackLowFpsMode, trackPerformanceMetric } from '@/lib/telemetry/performance';
import { getDateOnlyYear } from '@/utils/dateOnly';
import {
  buildFamilyTreeLayout,
  FAMILY_TREE_NODE_HEIGHT,
  FAMILY_TREE_NODE_WIDTH,
  type FamilyTreeEdgeInput,
  type FamilyTreeNodeInput,
} from '@/utils/familyTreeLayout';

type RelationshipKind = 'parent' | 'child' | 'spouse';

type RawNodeRecord = {
  id: string;
  graph_id: string;
  first_name: string;
  last_name: string | null;
  birthdate: string | null;
  death_date: string | null;
  bio: string | null;
  avatar_url: string | null;
  avatar_zoom?: number | null;
  avatar_focus_x?: number | null;
  avatar_focus_y?: number | null;
  claimed_by: string | null;
  x: number | null;
  y: number | null;
};

type ClaimedProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  avatar_zoom: number | null;
  avatar_focus_x: number | null;
  avatar_focus_y: number | null;
  bio: string | null;
  birthdate: string | null;
};

type RawEdgeRecord = {
  id: string;
  graph_id: string;
  source_id: string;
  target_id: string;
  type: 'parent_child' | 'partnership';
};

const CANVAS_PADDING_X = 760;
const CANVAS_PADDING_Y = 420;
const DEFAULT_ZOOM = 1;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 1.85;
const ZOOM_STEP = 0.08;
const WHEEL_ZOOM_SENSITIVITY = 0.0015;
const CULLING_NODE_THRESHOLD = 120;
const CULLING_OVERSCAN = 240;

function resolveClaimedName(profile: ClaimedProfileRow, fallback: RawNodeRecord) {
  const fromDisplayFirst = profile.display_name
    ? profile.display_name.trim().split(/\s+/)[0] || null
    : null;
  const fromDisplayLast = profile.display_name
    ? profile.display_name.trim().split(/\s+/).slice(1).join(' ') || null
    : null;

  return {
    firstName: profile.first_name?.trim() || fromDisplayFirst || fallback.first_name,
    lastName: profile.last_name?.trim() || fromDisplayLast || fallback.last_name,
  };
}

function TreeView({ graphId }: { graphId: string }) {
  const supabase = createClient();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const noticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didInitialCenterRef = useRef(false);

  const [rawNodes, setRawNodes] = useState<RawNodeRecord[]>([]);
  const [rawEdges, setRawEdges] = useState<RawEdgeRecord[]>([]);
  const [viewerNodeId, setViewerNodeId] = useState<string | null>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [detailNodeId, setDetailNodeId] = useState<string | null>(null);
  const [graphName, setGraphName] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [creatingNode, setCreatingNode] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(min-width: 768px)').matches
      : false
  );
  const [lowFpsMode, setLowFpsMode] = useState(false);
  const [isInitialGraphLoading, setIsInitialGraphLoading] = useState(true);
  const [viewportSnapshot, setViewportSnapshot] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });

  const clampZoom = useCallback(
    (value: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value)),
    []
  );

  const showNotice = useCallback((message: string) => {
    if (noticeTimeoutRef.current) {
      clearTimeout(noticeTimeoutRef.current);
    }

    setNotice(message);

    noticeTimeoutRef.current = setTimeout(() => {
      setNotice(null);
    }, 2400);
  }, []);

  const handleQuickAdd = useCallback(
    async (sourceNodeId: string, relationship: RelationshipKind) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        showNotice('Sign in again to add family members.');
        return;
      }

      const [{ data: sourceNode }, { data: currentEdges }] = await Promise.all([
        supabase
          .from('nodes')
          .select('id,first_name,last_name')
          .eq('id', sourceNodeId)
          .single(),
        supabase
          .from('edges')
          .select('id,source_id,target_id,type,graph_id')
          .eq('graph_id', graphId),
      ]);

      if (!sourceNode || !currentEdges) {
        showNotice('Could not load this branch of the family yet.');
        return;
      }

      const edgesInGraph = currentEdges as RawEdgeRecord[];
      const parentCount = edgesInGraph.filter(
        (edge) => edge.type === 'parent_child' && edge.target_id === sourceNodeId
      ).length;

      const spouseEdge = edgesInGraph.find(
        (edge) =>
          edge.type === 'partnership' &&
          (edge.source_id === sourceNodeId || edge.target_id === sourceNodeId)
      );

      if (relationship === 'parent' && parentCount >= 2) {
        showNotice('This person already has two parents.');
        return;
      }

      if (relationship === 'spouse' && spouseEdge) {
        showNotice('This person already has a spouse.');
        return;
      }

      const labelByKind = {
        parent: 'New Parent',
        child: 'New Child',
        spouse: 'New Spouse',
      } as const;

      const { data: newNode, error: nodeError } = await supabase
        .from('nodes')
        .insert({
          graph_id: graphId,
          first_name: labelByKind[relationship],
          last_name: sourceNode.last_name || null,
          created_by: user.id,
        })
        .select('*')
        .single();

      if (nodeError || !newNode) {
        showNotice('Could not add this person.');
        return;
      }

      const nextEdges: Array<{
        graph_id: string;
        source_id: string;
        target_id: string;
        type: 'parent_child' | 'partnership';
        created_by: string;
      }> = [];

      if (relationship === 'parent') {
        nextEdges.push({
          graph_id: graphId,
          source_id: newNode.id,
          target_id: sourceNodeId,
          type: 'parent_child',
          created_by: user.id,
        });
      }

      if (relationship === 'spouse') {
        nextEdges.push({
          graph_id: graphId,
          source_id: sourceNodeId,
          target_id: newNode.id,
          type: 'partnership',
          created_by: user.id,
        });

        const parentCountByChild = new Map<string, number>();
        edgesInGraph.forEach((edge) => {
          if (edge.type !== 'parent_child') return;
          parentCountByChild.set(
            edge.target_id,
            (parentCountByChild.get(edge.target_id) || 0) + 1
          );
        });

        const existingChildIds = [
          ...new Set(
            edgesInGraph
              .filter(
                (edge) =>
                  edge.type === 'parent_child' && edge.source_id === sourceNodeId
              )
              .map((edge) => edge.target_id)
          ),
        ];

        existingChildIds.forEach((childId) => {
          const parentCountForChild = parentCountByChild.get(childId) || 0;
          if (parentCountForChild >= 2) return;

          nextEdges.push({
            graph_id: graphId,
            source_id: newNode.id,
            target_id: childId,
            type: 'parent_child',
            created_by: user.id,
          });
        });
      }

      if (relationship === 'child') {
        nextEdges.push({
          graph_id: graphId,
          source_id: sourceNodeId,
          target_id: newNode.id,
          type: 'parent_child',
          created_by: user.id,
        });

        if (spouseEdge) {
          const spouseId =
            spouseEdge.source_id === sourceNodeId ? spouseEdge.target_id : spouseEdge.source_id;

          nextEdges.push({
            graph_id: graphId,
            source_id: spouseId,
            target_id: newNode.id,
            type: 'parent_child',
            created_by: user.id,
          });
        }
      }

      const { error: edgeError } = await supabase.from('edges').insert(nextEdges);

      if (edgeError) {
        await supabase.from('nodes').delete().eq('id', newNode.id);
        showNotice(edgeError.message || 'Could not connect this person to the tree.');
        return;
      }

      setActiveNodeId(newNode.id);
      setDetailNodeId(newNode.id);
      setReloadNonce((value) => value + 1);
      showNotice('Family member added.');
    },
    [graphId, showNotice, supabase]
  );

  const handleCreateNode = useCallback(async () => {
    if (creatingNode) return;

    setCreatingNode(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      showNotice('Sign in again to add family members.');
      setCreatingNode(false);
      return;
    }

    const { data: node, error } = await supabase
      .from('nodes')
      .insert({
        graph_id: graphId,
        first_name: 'New Person',
        created_by: user.id,
      })
      .select('*')
      .single();

    if (error || !node) {
      showNotice('Could not add this person.');
      setCreatingNode(false);
      return;
    }

    const wasEmpty = rawNodes.length === 0;
    setActiveNodeId(node.id);
    setDetailNodeId(node.id);
    setReloadNonce((value) => value + 1);
    showNotice(
      wasEmpty
        ? 'First person created. Tap the card to edit details.'
        : 'New person added. Tap the card to edit details.'
    );
    setCreatingNode(false);
  }, [creatingNode, graphId, rawNodes.length, showNotice, supabase]);

  const loadGraphData = useCallback(async () => {
    const startedAt = typeof performance !== 'undefined' ? performance.now() : null;

    const [
      {
        data: { user: viewer },
      },
      { data: graphData },
      { data: nodeRows },
      { data: edgeRows },
    ] = await Promise.all(
      [
        supabase.auth.getUser(),
        supabase.from('graphs').select('name').eq('id', graphId).single(),
        supabase.from('nodes').select('*').eq('graph_id', graphId),
        supabase.from('edges').select('*').eq('graph_id', graphId),
      ]
    );

    if (graphData?.name) {
      setGraphName(graphData.name);
    }

    const loadedNodes = (nodeRows || []) as RawNodeRecord[];
    const loadedEdges = (edgeRows || []) as RawEdgeRecord[];
    const claimedProfileIds = [
      ...new Set(
        loadedNodes
          .map((node) => node.claimed_by)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    const { data: claimedProfiles } =
      claimedProfileIds.length > 0
        ? await supabase
            .from('profiles')
            .select(
              'id,first_name,last_name,display_name,avatar_url,avatar_zoom,avatar_focus_x,avatar_focus_y,bio,birthdate'
            )
            .in('id', claimedProfileIds)
        : { data: [] };

    const profileById = new Map<string, ClaimedProfileRow>(
      ((claimedProfiles as ClaimedProfileRow[]) || []).map((profile) => [
        profile.id,
        profile,
      ])
    );
    const viewerId = viewer?.id || null;

    const mergedNodes = loadedNodes.map((node) => {
      if (!node.claimed_by) return node;
      const isCurrentUserNode = viewerId === node.claimed_by;

      const profile = profileById.get(node.claimed_by);
      if (!profile) {
        if (!isCurrentUserNode) return node;

        return {
          ...node,
          first_name: 'You',
          last_name: null,
        };
      }

      const resolvedName = resolveClaimedName(profile, node);

      return {
        ...node,
        first_name: isCurrentUserNode ? 'You' : resolvedName.firstName,
        last_name: isCurrentUserNode ? null : resolvedName.lastName,
        avatar_url: profile.avatar_url,
        avatar_zoom: profile.avatar_zoom,
        avatar_focus_x: profile.avatar_focus_x,
        avatar_focus_y: profile.avatar_focus_y,
        bio: profile.bio,
        birthdate: profile.birthdate,
      };
    });

    setRawNodes(mergedNodes);
    setRawEdges(loadedEdges);
    setViewerNodeId(
      viewerId
        ? mergedNodes.find((node) => node.claimed_by === viewerId)?.id || null
        : null
    );

    setActiveNodeId((current) =>
      current && !mergedNodes.some((node) => node.id === current) ? null : current
    );
    setDetailNodeId((current) =>
      current && !mergedNodes.some((node) => node.id === current) ? null : current
    );

    if (startedAt !== null) {
      trackPerformanceMetric('tree.load_graph_data.ms', performance.now() - startedAt, {
        graphId,
        nodeCount: mergedNodes.length,
        edgeCount: loadedEdges.length,
      });
    }

    setIsInitialGraphLoading(false);
  }, [graphId, supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadGraphData();
  }, [loadGraphData, reloadNonce]);

  useEffect(() => {
    const channel = supabase
      .channel(`graph:${graphId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'nodes',
          filter: `graph_id=eq.${graphId}`,
        },
        () => setReloadNonce((value) => value + 1)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'edges',
          filter: `graph_id=eq.${graphId}`,
        },
        () => setReloadNonce((value) => value + 1)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);

      if (noticeTimeoutRef.current) {
        clearTimeout(noticeTimeoutRef.current);
      }
    };
  }, [graphId, supabase]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setPrefersReducedMotion(mediaQuery.matches);
    onChange();
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const onChange = () => setIsDesktopViewport(mediaQuery.matches);
    onChange();
    mediaQuery.addEventListener('change', onChange);

    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId = 0;
    let frameCount = 0;
    const start = performance.now();
    const sampleDurationMs = 2200;

    const tick = (timestamp: number) => {
      frameCount += 1;
      const elapsedMs = timestamp - start;

      if (elapsedMs >= sampleDurationMs) {
        const fps = (frameCount * 1000) / elapsedMs;
        const isLowFps = fps < 45;
        setLowFpsMode(isLowFps);
        trackLowFpsMode(isLowFps, { graphId, fps: Number(fps.toFixed(1)) });
        return;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [graphId]);

  const layoutInputNodes = useMemo<FamilyTreeNodeInput[]>(
    () =>
      rawNodes.map((node) => ({
        id: node.id,
        firstName: node.first_name,
        lastName: node.last_name || '',
        avatarUrl: node.avatar_url || undefined,
        avatarZoom: node.avatar_zoom,
        avatarFocusX: node.avatar_focus_x,
        avatarFocusY: node.avatar_focus_y,
        birthYear: getDateOnlyYear(node.birthdate),
        isAlive: !node.death_date,
        isClaimed: Boolean(node.claimed_by),
        x: node.x,
      })),
    [rawNodes]
  );

  const layoutInputEdges = useMemo<FamilyTreeEdgeInput[]>(
    () =>
      rawEdges.map((edge) => ({
        id: edge.id,
        source: edge.source_id,
        target: edge.target_id,
        type: edge.type,
      })),
    [rawEdges]
  );

  const deferredLayoutInputNodes = useDeferredValue(layoutInputNodes);
  const deferredLayoutInputEdges = useDeferredValue(layoutInputEdges);

  const layout = useMemo(
    () => buildFamilyTreeLayout(deferredLayoutInputNodes, deferredLayoutInputEdges),
    [deferredLayoutInputEdges, deferredLayoutInputNodes]
  );
  const isLayoutHydrating = rawNodes.length > 0 && layout.nodes.length === 0;

  const canvasMetrics = useMemo(() => {
    const baseWidth = layout.bounds.width + CANVAS_PADDING_X * 2;
    const baseHeight = layout.bounds.height + CANVAS_PADDING_Y * 2;

    return {
      baseWidth,
      baseHeight,
      scaledWidth: baseWidth * zoom,
      scaledHeight: baseHeight * zoom,
    };
  }, [layout.bounds.height, layout.bounds.width, zoom]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport || didInitialCenterRef.current || layout.nodes.length === 0) {
      return;
    }

    const viewerNode = viewerNodeId
      ? layout.nodes.find((node) => node.id === viewerNodeId)
      : null;
    const nextLeft = viewerNode
      ? (CANVAS_PADDING_X + viewerNode.centerX) * zoom - viewport.clientWidth / 2
      : (canvasMetrics.scaledWidth - viewport.clientWidth) / 2;
    const nextTop = viewerNode
      ? (CANVAS_PADDING_Y + viewerNode.centerY) * zoom - viewport.clientHeight / 2
      : CANVAS_PADDING_Y * zoom - 90;

    const maxLeft = Math.max(0, canvasMetrics.scaledWidth - viewport.clientWidth);
    const maxTop = Math.max(0, canvasMetrics.scaledHeight - viewport.clientHeight);
    const clampedLeft = Math.min(maxLeft, Math.max(0, nextLeft));
    const clampedTop = Math.min(maxTop, Math.max(0, nextTop));

    viewport.scrollTo({ left: clampedLeft, top: clampedTop, behavior: 'auto' });
    didInitialCenterRef.current = true;
  }, [
    canvasMetrics.scaledHeight,
    canvasMetrics.scaledWidth,
    layout.nodes,
    viewerNodeId,
    zoom,
  ]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    let rafId = 0;
    const updateSnapshot = () => {
      rafId = 0;
      setViewportSnapshot({
        left: viewport.scrollLeft,
        top: viewport.scrollTop,
        width: viewport.clientWidth,
        height: viewport.clientHeight,
      });
    };

    const scheduleSnapshot = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(updateSnapshot);
    };

    scheduleSnapshot();
    viewport.addEventListener('scroll', scheduleSnapshot, { passive: true });
    window.addEventListener('resize', scheduleSnapshot);

    return () => {
      viewport.removeEventListener('scroll', scheduleSnapshot);
      window.removeEventListener('resize', scheduleSnapshot);
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  const shouldCull =
    layout.nodes.length >= CULLING_NODE_THRESHOLD &&
    viewportSnapshot.width > 0 &&
    viewportSnapshot.height > 0;

  const visibleNodeIds = useMemo(() => {
    if (!shouldCull) return null;

    const worldLeft =
      viewportSnapshot.left / zoom - CANVAS_PADDING_X - CULLING_OVERSCAN;
    const worldTop =
      viewportSnapshot.top / zoom - CANVAS_PADDING_Y - CULLING_OVERSCAN;
    const worldRight =
      (viewportSnapshot.left + viewportSnapshot.width) / zoom -
      CANVAS_PADDING_X +
      CULLING_OVERSCAN;
    const worldBottom =
      (viewportSnapshot.top + viewportSnapshot.height) / zoom -
      CANVAS_PADDING_Y +
      CULLING_OVERSCAN;

    const next = new Set<string>();
    layout.nodes.forEach((node) => {
      const nodeLeft = node.x;
      const nodeTop = node.y;
      const nodeRight = node.x + FAMILY_TREE_NODE_WIDTH;
      const nodeBottom = node.y + FAMILY_TREE_NODE_HEIGHT;

      if (
        nodeRight >= worldLeft &&
        nodeLeft <= worldRight &&
        nodeBottom >= worldTop &&
        nodeTop <= worldBottom
      ) {
        next.add(node.id);
      }
    });

    return next;
  }, [layout.nodes, shouldCull, viewportSnapshot.height, viewportSnapshot.left, viewportSnapshot.top, viewportSnapshot.width, zoom]);

  const renderedNodes = useMemo(() => {
    if (!shouldCull || !visibleNodeIds) return layout.nodes;
    return layout.nodes.filter((node) => visibleNodeIds.has(node.id));
  }, [layout.nodes, shouldCull, visibleNodeIds]);

  const renderedEdges = useMemo(() => {
    if (!shouldCull || !visibleNodeIds) return layout.edges;
    return layout.edges.filter((edge) => edge.nodeIds.some((nodeId) => visibleNodeIds.has(nodeId)));
  }, [layout.edges, shouldCull, visibleNodeIds]);

  const shouldReduceMotion = prefersReducedMotion || shouldCull || lowFpsMode;

  useEffect(() => {
    if (layout.nodes.length === 0) return;

    trackPerformanceMetric('tree.layout_snapshot', layout.nodes.length, {
      graphId,
      edgeCount: layout.edges.length,
      cullingEnabled: shouldCull,
      lowFpsMode,
    });
  }, [graphId, layout.edges.length, layout.nodes.length, lowFpsMode, shouldCull]);

  const applyZoom = useCallback(
    (
      nextZoomResolver: (currentZoom: number) => number,
      focusClientX?: number,
      focusClientY?: number
    ) => {
      const viewport = viewportRef.current;

      setZoom((currentZoom) => {
        const nextZoom = clampZoom(nextZoomResolver(currentZoom));

        if (!viewport || nextZoom === currentZoom) {
          return nextZoom;
        }

        const viewportRect = viewport.getBoundingClientRect();
        const localFocusX =
          (focusClientX ?? viewportRect.left + viewportRect.width / 2) -
          viewportRect.left;
        const localFocusY =
          (focusClientY ?? viewportRect.top + viewportRect.height / 2) -
          viewportRect.top;

        const worldFocusX = (viewport.scrollLeft + localFocusX) / currentZoom;
        const worldFocusY = (viewport.scrollTop + localFocusY) / currentZoom;

        viewport.scrollLeft = worldFocusX * nextZoom - localFocusX;
        viewport.scrollTop = worldFocusY * nextZoom - localFocusY;

        return nextZoom;
      });
    },
    [clampZoom]
  );

  const handleZoomIn = useCallback(() => {
    applyZoom((value) => value + ZOOM_STEP);
  }, [applyZoom]);

  const handleZoomOut = useCallback(() => {
    applyZoom((value) => value - ZOOM_STEP);
  }, [applyZoom]);

  const handleZoomReset = useCallback(() => {
    applyZoom(() => DEFAULT_ZOOM);
  }, [applyZoom]);

  const handleViewportWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      if (!event.ctrlKey && !event.metaKey) return;

      event.preventDefault();
      applyZoom(
        (currentZoom) =>
          currentZoom * Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY),
        event.clientX,
        event.clientY
      );
    },
    [applyZoom]
  );

  const handleNodeTap = useCallback(
    (nodeId: string) => {
      if (isDesktopViewport) {
        setActiveNodeId(nodeId);
        setDetailNodeId(nodeId);
        return;
      }

      setActiveNodeId((currentActiveNodeId) => {
        if (currentActiveNodeId === nodeId) {
          setDetailNodeId(nodeId);
          return currentActiveNodeId;
        }

        return nodeId;
      });
    },
    [isDesktopViewport]
  );

  return (
    <div className="ios-gradient-fix h-full safe-bottom w-full relative overflow-hidden bg-gradient-to-br from-[#F5F1E8] via-stone to-[#EAE2D4]">
      <div className="absolute -top-28 -left-24 w-72 h-72 rounded-full bg-gradient-to-br from-white/50 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-28 -right-20 w-80 h-80 rounded-full bg-gradient-to-br from-sunrise/20 to-transparent blur-3xl pointer-events-none" />

      <div className="absolute top-[calc(var(--safe-area-top)+0.5rem)] left-4 z-20 bg-white/82 backdrop-blur-md rounded-2xl px-4 py-3 shadow-sm border border-stone/40">
        <p className="text-[11px] uppercase tracking-[0.18em] text-bark/45">Family Tree</p>
        <h2 className="text-sm font-semibold text-earth mt-0.5">{graphName || 'Untitled Graph'}</h2>
      </div>

      <div className="absolute top-[calc(var(--safe-area-top)+0.5rem)] right-4 z-20 hidden md:flex items-center gap-2 rounded-2xl border border-stone/50 bg-white/78 px-3 py-2 text-xs text-bark/60 backdrop-blur-sm">
        <Sparkles className="w-3.5 h-3.5 text-sunrise" />
        Tap card edges to add family. Ctrl/Cmd + wheel to zoom.
      </div>

      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-[calc(var(--safe-area-top)+0.5rem)] left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl bg-earth text-white text-xs shadow-lg"
          >
            {notice}
          </motion.div>
        )}
      </AnimatePresence>

      {isInitialGraphLoading || isLayoutHydrating ? (
        <TreePageSkeleton />
      ) : rawNodes.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full rounded-3xl border border-stone/55 bg-white/85 backdrop-blur-md shadow-xl p-8 text-center"
          >
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-moss/20 to-leaf/20 text-moss flex items-center justify-center mb-4">
              <UserPlus className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-earth">Start your family tree</h3>
            <p className="text-sm text-bark/60 mt-2 leading-relaxed">
              Create the first person, then keep building from card edges with animated add controls.
            </p>
            <button
              type="button"
              onClick={handleCreateNode}
              disabled={creatingNode}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-white font-medium shadow-lg shadow-moss/30 disabled:opacity-70"
              style={{ background: 'linear-gradient(135deg, #8B9D77 0%, #A8C090 100%)' }}
            >
              {creatingNode ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <PlusIcon />
                  Add first person
                </>
              )}
            </button>
          </motion.div>
        </div>
      ) : (
        <div
          ref={viewportRef}
          onClick={(event) => {
            const target = event.target;
            if (
              target instanceof Element &&
              target.closest('[data-tree-node-card="true"]')
            ) {
              return;
            }

            setActiveNodeId(null);
          }}
          onWheel={handleViewportWheel}
          className="absolute inset-0 overflow-auto pt-24 pb-12 px-6 md:px-8"
        >
          <div
            className="relative mx-auto"
            style={{ width: canvasMetrics.scaledWidth, height: canvasMetrics.scaledHeight }}
          >
            <div
              className="absolute left-0 top-0"
              style={{
                width: canvasMetrics.baseWidth,
                height: canvasMetrics.baseHeight,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
              }}
            >
              <div
                className="relative"
                style={{
                  width: layout.bounds.width,
                  height: layout.bounds.height,
                  left: CANVAS_PADDING_X,
                  top: CANVAS_PADDING_Y,
                }}
              >
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                  {renderedEdges.map((edge) =>
                    shouldReduceMotion ? (
                      <path
                        key={edge.id}
                        d={edge.path}
                        fill="none"
                        style={{
                          stroke: edge.kind === 'partnership' ? '#B18E67' : '#6E675D',
                          strokeWidth: edge.kind === 'partnership' ? 2.2 : 2.4,
                          strokeLinecap: 'round',
                          strokeLinejoin: 'round',
                          strokeDasharray: edge.kind === 'partnership' ? '7 5' : 'none',
                        }}
                      />
                    ) : (
                      <motion.path
                        key={edge.id}
                        d={edge.path}
                        fill="none"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.42, ease: 'easeOut' }}
                        style={{
                          stroke: edge.kind === 'partnership' ? '#B18E67' : '#6E675D',
                          strokeWidth: edge.kind === 'partnership' ? 2.2 : 2.4,
                          strokeLinecap: 'round',
                          strokeLinejoin: 'round',
                          strokeDasharray: edge.kind === 'partnership' ? '7 5' : 'none',
                        }}
                      />
                    )
                  )}
                </svg>

                <AnimatePresence initial={false}>
                  {renderedNodes.map((node) => (
                    <FamilyTreeCard
                      key={node.id}
                      node={node}
                      selected={activeNodeId === node.id}
                      reduceMotion={shouldReduceMotion}
                      onSelect={() => handleNodeTap(node.id)}
                      onAddMember={(relationship) => handleQuickAdd(node.id, relationship)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      )}

      {layout.nodes.length > 0 && (
        <>
          <MobilePrimaryAction
            label="Add family member"
            ariaLabel="Add family member"
            icon={<UserPlus className="w-6 h-6" />}
            onPress={handleCreateNode}
            loading={creatingNode}
            hidden={Boolean(activeNodeId || detailNodeId)}
          />

          <motion.button
            type="button"
            onClick={handleCreateNode}
            disabled={creatingNode}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="hidden md:inline-flex tap-target absolute bottom-[calc(var(--safe-area-bottom)+1.5rem)] left-6 z-30 items-center gap-2 rounded-2xl border border-stone/55 bg-white/90 px-4 h-11 text-sm font-medium text-earth backdrop-blur-md shadow-lg hover:bg-white disabled:opacity-70"
          >
            {creatingNode ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-moss" />
                Adding...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 text-moss" />
                Add node
              </>
            )}
          </motion.button>
        </>
      )}

      {layout.nodes.length > 0 && (
        <div className="absolute bottom-[calc(var(--safe-area-bottom)+var(--mobile-tab-bar-offset)+1.5rem)] left-4 md:bottom-[calc(var(--safe-area-bottom)+1.5rem)] md:left-auto md:right-6 z-30 rounded-2xl border border-stone/55 bg-white/88 backdrop-blur-md shadow-lg">
          <div className="flex items-center">
            <button
              type="button"
              onClick={handleZoomOut}
              className="tap-target w-11 h-11 flex items-center justify-center text-bark/70 hover:bg-stone/45 rounded-l-2xl transition-colors"
              aria-label="Zoom out"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomReset}
              className="tap-target h-11 px-3 text-xs font-semibold text-bark/75 border-l border-r border-stone/45 hover:bg-stone/35 transition-colors"
              title="Reset zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              className="tap-target w-11 h-11 flex items-center justify-center text-bark/70 hover:bg-stone/45 rounded-r-2xl transition-colors"
              aria-label="Zoom in"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {detailNodeId && (
          <NodeDetailSidebar
            key={detailNodeId}
            nodeId={detailNodeId}
            graphId={graphId}
            onClose={() => setDetailNodeId(null)}
            onUpdate={() => setReloadNonce((value) => value + 1)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function TreePageSkeleton() {
  return (
    <div className="absolute inset-0 p-6 md:p-8 pt-24">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-stone/45 bg-white/78 p-6">
          <div className="mb-6 flex items-center justify-between">
            <Skeleton className="h-6 w-48 rounded-lg" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-stone/40 bg-white/70 p-4"
              >
                <Skeleton className="mx-auto h-16 w-16 rounded-full" />
                <Skeleton className="mt-4 h-4 w-full rounded-md" />
                <Skeleton className="mt-2 h-3 w-2/3 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TreePage({
  params,
}: {
  params: Promise<{ graphId: string }>;
}) {
  const { graphId } = use(params);

  return <TreeView graphId={graphId} />;
}
