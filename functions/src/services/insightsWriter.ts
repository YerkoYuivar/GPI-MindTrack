/**
 * @module services/insightsWriter
 * @description Servicios para escribir insights en Firestore
 */

import {db, entryInsightsRef, userNodesCol, userEdgesCol} from './firestore';
import {EntryInsights, GraphNode, GraphEdge} from '../types/insights';

/**
 * Escribe/actualiza los insights de una entrada
 */
export async function writeEntryInsights(
  userId: string,
  entryId: string,
  data: EntryInsights
): Promise<void> {
  await entryInsightsRef(userId, entryId).set(data, {merge: true});
}

/**
 * Upsert de nodos del grafo (merge para acumular weight)
 */
export async function upsertNodes(
  userId: string,
  nodes: GraphNode[]
): Promise<void> {
  if (!nodes?.length) return;

  const batch = db.batch();
  nodes.forEach((n) => {
    const ref = userNodesCol(userId).doc(n.id);
    batch.set(ref, n, {merge: true});
  });

  await batch.commit();
}

/**
 * Upsert de aristas del grafo (merge para acumular weight)
 */
export async function upsertEdges(
  userId: string,
  edges: GraphEdge[]
): Promise<void> {
  if (!edges?.length) return;

  const batch = db.batch();
  edges.forEach((e) => {
    const ref = userEdgesCol(userId).doc(e.id);
    batch.set(ref, e, {merge: true});
  });

  await batch.commit();
}
