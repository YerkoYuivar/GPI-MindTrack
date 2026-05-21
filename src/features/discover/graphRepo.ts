/**
 * graphRepo.ts
 * Repositorio para cargar nodos y aristas del grafo de patrones desde Firestore.
 */

import { collection, collectionGroup, getDocs, query, orderBy, limit, where, doc } from 'firebase/firestore';
import { db } from '@lib/firebase/firestore';
import { logger } from '@lib/diagnostics/logger';

export type GraphNode = {
  id: string;
  label: string;
  type: 'topic' | 'phrase' | 'emotion' | 'activity' | 'person' | 'trigger';
  weight: number;
  updatedAt: number; // epoch ms
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  weight: number;
  updatedAt: number; // epoch ms
};

/**
 * Carga nodos y aristas del grafo de patrones del usuario.
 * Nodos se ordenan por peso descendente y se truncan a limitNodes.
 * Aristas se filtran para que ambos extremos existan en el conjunto de nodos.
 */
export async function getGraph(
  userId: string,
  { limitNodes = 100, limitEdges = 200 } = {}
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  logger.debug('getGraph', { userId, limitNodes, limitEdges }, 'discover');

  try {
    // 1. Cargar nodos (ordenados por weight desc)
    // Path: journals/{userId}/insights/graph/nodes (5 segmentos - colección válida)
    const nodesRef = collection(db, `journals/${userId}/insights/graph/nodes`);
    const nodesQuery = query(nodesRef, orderBy('weight', 'desc'), limit(limitNodes));
    const nodesSnap = await getDocs(nodesQuery);

    const nodes: GraphNode[] = nodesSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        label: data.label ?? '',
        type: data.type ?? 'topic',
        weight: data.weight ?? 0,
        updatedAt: data.updatedAt?.toMillis?.() ?? Date.now(),
      };
    });

    logger.info('getGraph nodes loaded', { count: nodes.length }, 'discover');

    // Si no hay nodos, retornar vacío
    if (nodes.length === 0) {
      return { nodes: [], edges: [] };
    }

    // 2. Cargar aristas (ordenadas por weight desc)
    // Path: journals/{userId}/insights/graph/edges (5 segmentos - colección válida)
    const edgesRef = collection(db, `journals/${userId}/insights/graph/edges`);
    const edgesQuery = query(edgesRef, orderBy('weight', 'desc'), limit(limitEdges));
    const edgesSnap = await getDocs(edgesQuery);

    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges: GraphEdge[] = [];

    for (const doc of edgesSnap.docs) {
      const data = doc.data();
      const source = data.source ?? '';
      const target = data.target ?? '';

      // Filtrar: ambos extremos deben existir en el conjunto de nodos
      if (nodeIds.has(source) && nodeIds.has(target)) {
        edges.push({
          id: doc.id,
          source,
          target,
          weight: data.weight ?? 0,
          updatedAt: data.updatedAt?.toMillis?.() ?? Date.now(),
        });
      }

      // Truncar a limitEdges
      if (edges.length >= limitEdges) break;
    }

    logger.info('getGraph edges loaded', { count: edges.length }, 'discover');

    return { nodes, edges };
  } catch (error: any) {
    logger.error('getGraph failed', { error: error?.message }, 'discover');
    throw new Error(`Error cargando grafo: ${error?.message || error}`);
  }
}
