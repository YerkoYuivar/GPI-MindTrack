/**
 * @module services/firestore
 * @description Inicialización de Firebase Admin y helpers para referencias Firestore
 */

import * as admin from 'firebase-admin';

// Inicializar Firebase Admin una sola vez
if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();

/**
 * Referencia a una entrada del diario
 */
export const entryRef = (userId: string, entryId: string) =>
  db.doc(`journals/${userId}/entries/${entryId}`);

/**
 * Referencia al documento de insights de una entrada
 */
export const entryInsightsRef = (userId: string, entryId: string) =>
  db.doc(`journals/${userId}/entries/${entryId}/insights/summary`);

/**
 * Colección de nodos del grafo de un usuario
 */
export const userNodesCol = (userId: string) =>
  db.collection(`journals/${userId}/insights/graph/nodes`);

/**
 * Colección de aristas del grafo de un usuario
 */
export const userEdgesCol = (userId: string) =>
  db.collection(`journals/${userId}/insights/graph/edges`);

/**
 * Colección de entradas de un usuario
 */
export const userEntriesCol = (userId: string) =>
  db.collection(`journals/${userId}/entries`);
