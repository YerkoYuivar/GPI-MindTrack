/**
 * @module text2graph/writer
 * @description Escritura incremental de nodos y edges en Firestore con decay
 */

import { db } from '../services/firestore';
import admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import type { GraphNode, GraphEdge } from './types';
import { mergeWeight, DEFAULT_DECAY_FACTOR, MIN_WEIGHT, makeEdgeId } from './consolidator';

const logger = functions.logger;

/**
 * Inserta o actualiza un grafo en Firestore con consolidación de pesos
 * 
 * Estrategia:
 * 1. Lee pesos actuales de nodos/edges existentes
 * 2. Aplica decay a pesos antiguos
 * 3. Suma deltas nuevos
 * 4. Escribe solo cambios significativos (>= MIN_WEIGHT)
 * 5. Usa batch para atomicidad
 * 
 * @param userId ID del usuario
 * @param nodes Nodos a upsert
 * @param edges Edges a upsert
 * @param applyDecay Si aplicar decay a pesos existentes (default: true)
 */
export async function upsertGraph(
  userId: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  applyDecay = true
): Promise<void> {
  logger.debug('[writer] upsertGraph', { userId, nodeCount: nodes.length, edgeCount: edges.length, applyDecay });

  if (nodes.length === 0 && edges.length === 0) {
    logger.debug('[writer] No hay nodos ni edges para escribir');
    return;
  }

  const batch = db.batch();
  let writtenNodes = 0;
  let writtenEdges = 0;

  // Procesar nodos
  for (const node of nodes) {
    const nodeRef = db.doc(`journals/${userId}/insights/graph`).collection('nodes').doc(node.id);

    if (applyDecay) {
      // Leer peso actual para aplicar decay
      const nodeSnap = await nodeRef.get();
      let newWeight = node.delta;

      if (nodeSnap.exists) {
        const current = nodeSnap.data()?.weight || 0;
        newWeight = mergeWeight(current, node.delta, 5.0, DEFAULT_DECAY_FACTOR);
      }

      // Solo escribir si peso es significativo
      if (newWeight >= MIN_WEIGHT) {
        batch.set(
          nodeRef,
          {
            id: node.id,
            label: node.label,
            type: node.type,
            weight: newWeight,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        writtenNodes++;
      }
    } else {
      // Sin decay: incremento simple
      batch.set(
        nodeRef,
        {
          id: node.id,
          label: node.label,
          type: node.type,
          weight: admin.firestore.FieldValue.increment(node.delta),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      writtenNodes++;
    }
  }

  // Procesar edges
  for (const edge of edges) {
    const edgeRef = db.doc(`journals/${userId}/insights/graph`).collection('edges').doc(edge.id);

    if (applyDecay) {
      // Leer peso actual para aplicar decay
      const edgeSnap = await edgeRef.get();
      let newWeight = edge.delta;

      if (edgeSnap.exists) {
        const current = edgeSnap.data()?.weight || 0;
        newWeight = mergeWeight(current, edge.delta, 5.0, DEFAULT_DECAY_FACTOR);
      }

      // Solo escribir si peso es significativo
      if (newWeight >= MIN_WEIGHT) {
        batch.set(
          edgeRef,
          {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            weight: newWeight,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        writtenEdges++;
      }
    } else {
      // Sin decay: incremento simple
      batch.set(
        edgeRef,
        {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          weight: admin.firestore.FieldValue.increment(edge.delta),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      writtenEdges++;
    }
  }

  // Commit batch
  await batch.commit();
  logger.info(`[writer] Escritos ${writtenNodes} nodos y ${writtenEdges} edges`);
}

/**
 * Convierte términos extraídos a nodos para upsert
 * 
 * @param terms Términos del extractor
 * @returns Array de GraphNode
 */
export function termsToNodes(
  terms: Array<{ key: string; weight: number; kind: 'topic' | 'phrase' | 'emotion' }>
): GraphNode[] {
  return terms.map((term) => {
    // key viene con formato 'tipo:label' (ej: 'topic:laboral')
    const [type, label] = term.key.split(':');

    return {
      id: term.key,
      label: label,
      type: type as 'topic' | 'phrase' | 'emotion',
      delta: Math.max(0.1, term.weight), // Normalizar a mínimo 0.1
    };
  });
}

/**
 * Convierte pares extraídos a edges para upsert
 * Asegura IDs estables con orden lexicográfico
 * 
 * @param pairs Pares del extractor
 * @returns Array de GraphEdge
 */
export function pairsToEdges(
  pairs: Array<{ a: string; b: string; weight: number }>
): GraphEdge[] {
  return pairs.map((pair) => {
    const edgeId = makeEdgeId(pair.a, pair.b);

    return {
      id: edgeId,
      source: pair.a,
      target: pair.b,
      delta: Math.max(0.1, pair.weight), // Normalizar a mínimo 0.1
    };
  });
}

/**
 * Limpia nodos y edges con peso bajo el umbral
 * Útil para mantenimiento periódico del grafo
 * 
 * @param userId ID del usuario
 * @param minWeight Umbral mínimo (default: MIN_WEIGHT)
 * @returns Cantidad de nodos y edges eliminados
 */
export async function cleanLowWeightItems(
  userId: string,
  minWeight = MIN_WEIGHT
): Promise<{ nodesDeleted: number; edgesDeleted: number }> {
  logger.info(`[writer] Limpiando items con weight < ${minWeight} para usuario ${userId}`);

  let nodesDeleted = 0;
  let edgesDeleted = 0;

  // Limpiar nodos
  const nodesRef = db.doc(`journals/${userId}/insights/graph`).collection('nodes');
  const nodesSnap = await nodesRef.where('weight', '<', minWeight).get();

  if (!nodesSnap.empty) {
    const batch = db.batch();
    nodesSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
      nodesDeleted++;
    });
    await batch.commit();
  }

  // Limpiar edges
  const edgesRef = db.doc(`journals/${userId}/insights/graph`).collection('edges');
  const edgesSnap = await edgesRef.where('weight', '<', minWeight).get();

  if (!edgesSnap.empty) {
    const batch = db.batch();
    edgesSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
      edgesDeleted++;
    });
    await batch.commit();
  }

  logger.info(`[writer] Limpieza completada: ${nodesDeleted} nodos, ${edgesDeleted} edges eliminados`);
  return { nodesDeleted, edgesDeleted };
}
