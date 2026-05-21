/**
 * useGraphData - Hook para cargar y gestionar datos del grafo de patrones
 */

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Graph, GraphNode, GraphEdge, GraphFilters, Pattern } from '../types/graph';

interface UseGraphDataReturn {
  graph: Graph | null;
  nodes: GraphNode[];
  edges: GraphEdge[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  applyFilters: (filters: GraphFilters) => void;
}

/**
 * Colores por tipo de patrón
 */
const PATTERN_COLORS: Record<string, string> = {
  emotion: '#8B5CF6', // purple-500
  activity: '#3B82F6', // blue-500
  person: '#10B981', // green-500
  place: '#F59E0B', // amber-500
  topic: '#6366F1', // indigo-500
  trigger: '#EF4444', // red-500
};

/**
 * Genera posiciones 3D para nodos usando layout de fuerza
 */
function generateNodePositions(patterns: Pattern[]): Map<string, { x: number; y: number; z: number }> {
  const positions = new Map<string, { x: number; y: number; z: number }>();

  // Distribuir en una esfera
  const radius = 10;
  patterns.forEach((pattern, index) => {
    const phi = Math.acos(-1 + (2 * index) / patterns.length);
    const theta = Math.sqrt(patterns.length * Math.PI) * phi;

    positions.set(pattern.id, {
      x: radius * Math.cos(theta) * Math.sin(phi),
      y: radius * Math.sin(theta) * Math.sin(phi),
      z: radius * Math.cos(phi),
    });
  });

  return positions;
}

/**
 * Convierte Pattern a GraphNode con posición y visualización
 */
function patternsToNodes(patterns: Pattern[]): GraphNode[] {
  const positions = generateNodePositions(patterns);

  return patterns.map((pattern) => ({
    pattern,
    position: positions.get(pattern.id) || { x: 0, y: 0, z: 0 },
    size: 0.3 + (pattern.importance * 0.7), // Tamaño entre 0.3 y 1.0
    color: PATTERN_COLORS[pattern.type] || '#6B7280', // gray-500 default
  }));
}

/**
 * Hook principal
 */
export function useGraphData(): UseGraphDataReturn {
  const { user, isAuthenticated } = useAuth();

  const [graph, setGraph] = useState<Graph | null>(null);
  const [filteredNodes, setFilteredNodes] = useState<GraphNode[]>([]);
  const [filteredEdges, setFilteredEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<GraphFilters>({});

  /**
   * Carga el grafo desde Firestore
   */
  const loadGraph = useCallback(async () => {
    console.log('📊 useGraphData: loadGraph called', { hasUser: !!user, userId: user?.uid });

    if (!isAuthenticated || !user) {
      console.log('📊 useGraphData: Usuario no autenticado');
      setError('Usuario no autenticado');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('📊 useGraphData: Cargando grafo para userId:', user.uid);
      // Intentar cargar grafo pre-calculado
      const graphDoc = await getDoc(doc(db, 'graphs', user.uid));

      if (graphDoc.exists()) {
        console.log('📊 useGraphData: Grafo encontrado en Firestore');
        const data = graphDoc.data();
        const loadedGraph: Graph = {
          nodes: patternsToNodes(data.patterns || []),
          edges: data.edges || [],
          metadata: {
            userId: user.uid,
            generatedAt: data.generatedAt?.toDate() || new Date(),
            entryCount: data.entryCount || 0,
            dateRange: {
              start: data.dateRange?.start?.toDate() || new Date(),
              end: data.dateRange?.end?.toDate() || new Date(),
            },
            version: data.version || '1.0',
          },
        };

        setGraph(loadedGraph);
        setFilteredNodes(loadedGraph.nodes);
        setFilteredEdges(loadedGraph.edges);
        console.log('📊 useGraphData: Grafo cargado exitosamente', {
          nodeCount: loadedGraph.nodes.length,
          edgeCount: loadedGraph.edges.length
        });
      } else {
        // Si no existe, mostrar mensaje para generar
        console.log('📊 useGraphData: No existe grafo para userId:', user.uid);
        setError('No hay grafo generado. Crea entradas en tu diario para ver patrones.');
      }
    } catch (err) {
      console.error('Error loading graph:', err);
      setError('Error al cargar el grafo');
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated]);

  /**
   * Aplica filtros al grafo
   */
  const applyFilters = useCallback((filters: GraphFilters) => {
    if (!graph) return;

    setActiveFilters(filters);

    // Filtrar nodos
    let nodes = graph.nodes;

    if (filters.types && filters.types.length > 0) {
      nodes = nodes.filter((node) => filters.types!.includes(node.pattern.type));
    }

    if (filters.minFrequency) {
      nodes = nodes.filter((node) => node.pattern.frequency >= filters.minFrequency!);
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      nodes = nodes.filter((node) => node.pattern.label.toLowerCase().includes(query));
    }

    if (filters.dateRange) {
      nodes = nodes.filter((node) => {
        const { start, end } = filters.dateRange!;
        return node.pattern.lastSeen >= start && node.pattern.firstSeen <= end;
      });
    }

    // Filtrar aristas (solo las que conectan nodos visibles)
    const visibleNodeIds = new Set(nodes.map((n) => n.pattern.id));
    let edges = graph.edges.filter(
      (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );

    if (filters.minWeight) {
      edges = edges.filter((edge) => edge.weight >= filters.minWeight!);
    }

    setFilteredNodes(nodes);
    setFilteredEdges(edges);
  }, [graph]);

  /**
   * Refresh
   */
  const refresh = useCallback(async () => {
    await loadGraph();
  }, [loadGraph]);

  // Cargar al montar
  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  return {
    graph,
    nodes: filteredNodes,
    edges: filteredEdges,
    loading,
    error,
    refresh,
    applyFilters,
  };
}
