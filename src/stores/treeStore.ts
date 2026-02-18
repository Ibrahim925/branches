import { create } from 'zustand';
import { type Node, type Edge } from '@xyflow/react';

interface TreeState {
    nodes: Node[];
    edges: Edge[];
    selectedNode: string | null;
    zoomLevel: number;

    setNodes: (nodes: Node[]) => void;
    setEdges: (edges: Edge[]) => void;
    setSelectedNode: (id: string | null) => void;
    setZoomLevel: (zoom: number) => void;

    addNode: (node: Node) => void;
    updateNode: (id: string, data: Partial<Node['data']>) => void;
    deleteNode: (id: string) => void;

    addEdge: (edge: Edge) => void;
    deleteEdge: (id: string) => void;
}

export const useTreeStore = create<TreeState>((set) => ({
    nodes: [],
    edges: [],
    selectedNode: null,
    zoomLevel: 1,

    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),
    setSelectedNode: (id) => set({ selectedNode: id }),
    setZoomLevel: (zoom) => set({ zoomLevel: zoom }),

    addNode: (node) =>
        set((state) => ({
            nodes: [...state.nodes, node],
        })),

    updateNode: (id, data) =>
        set((state) => ({
            nodes: state.nodes.map((node) =>
                node.id === id ? { ...node, data: { ...node.data, ...data } } : node
            ),
        })),

    deleteNode: (id) =>
        set((state) => ({
            nodes: state.nodes.filter((node) => node.id !== id),
            edges: state.edges.filter(
                (edge) => edge.source !== id && edge.target !== id
            ),
        })),

    addEdge: (edge) =>
        set((state) => ({
            edges: [...state.edges, edge],
        })),

    deleteEdge: (id) =>
        set((state) => ({
            edges: state.edges.filter((edge) => edge.id !== id),
        })),
}));
