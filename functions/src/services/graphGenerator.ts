/**
 * @module services/graphGenerator
 * @description Servicio para generar grafos de patrones desde entradas de diario
 */

import * as admin from 'firebase-admin';
import { analyzePatterns } from '../analyzers/patternAnalyzer';
import type { Pattern, GraphEdge } from '../types/graph';

interface JournalEntry {
  id: string;
  content: string;
  mood: number;
  createdAt: Date;
}

/**
 * Genera y guarda el grafo de patrones para un usuario
 */
export async function generateGraphForUser(userId: string): Promise<{
  success: boolean;
  patternCount: number;
  edgeCount: number;
  error?: string;
}> {
  try {
    console.log(`Generating graph for user: ${userId}`);

    const db = admin.firestore();

    // 1. Obtener todas las entradas del usuario
    const entriesSnapshot = await db
      .collection('entries')
      .where('userId', '==', userId)
      .where('deleted', '==', false)
      .orderBy('createdAt', 'asc')
      .get();
    
    if (entriesSnapshot.empty) {
      console.log('No entries found for user');
      return {
        success: false,
        patternCount: 0,
        edgeCount: 0,
        error: 'No hay entradas para analizar',
      };
    }

    // 2. Convertir a formato JournalEntry
    const entries: JournalEntry[] = entriesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        content: data.content || '',
        mood: data.mood || 4,
        createdAt: data.createdAt?.toDate() || new Date(),
      };
    });

    console.log(`Found ${entries.length} entries to analyze`);

    // 3. Analizar patrones
    const { patterns, edges } = analyzePatterns(entries);

    console.log(`Extracted ${patterns.length} patterns and ${edges.length} edges`);

    // 4. Guardar en Firestore
    await db.collection('graphs').doc(userId).set({
      patterns: patterns.map(serializePattern),
      edges: edges.map(serializeEdge),
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      entryCount: entries.length,
      dateRange: {
        start: entries[0].createdAt,
        end: entries[entries.length - 1].createdAt,
      },
      version: '1.0',
    });

    console.log('Graph saved successfully');

    return {
      success: true,
      patternCount: patterns.length,
      edgeCount: edges.length,
    };
  } catch (error) {
    console.error('Error generating graph:', error);
    return {
      success: false,
      patternCount: 0,
      edgeCount: 0,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Serializa un Pattern para Firestore
 */
function serializePattern(pattern: Pattern) {
  return {
    id: pattern.id,
    label: pattern.label,
    type: pattern.type,
    frequency: pattern.frequency,
    importance: pattern.importance,
    firstSeen: pattern.firstSeen,
    lastSeen: pattern.lastSeen,
    sentiment: pattern.sentiment,
    metadata: pattern.metadata,
  };
}

/**
 * Serializa un GraphEdge para Firestore
 */
function serializeEdge(edge: GraphEdge) {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    weight: edge.weight,
    coOccurrences: edge.coOccurrences,
    correlation: edge.correlation,
    metadata: edge.metadata,
  };
}
