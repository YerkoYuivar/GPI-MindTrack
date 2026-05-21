/**
 * @module analyzers/base
 * @description Interfaz base para analizadores de IA
 */

import {JournalEntry} from '../types/journal';
import {EntryInsights, GraphNode, GraphEdge} from '../types/insights';

/**
 * Interfaz que debe implementar cualquier analizador de IA
 */
export interface Analyzer {
  /**
   * Analiza una entrada del diario y genera insights
   * @param entry - Entrada del diario a analizar
   * @returns Insights, nodos y aristas del grafo
   */
  analyzeEntry(entry: JournalEntry): Promise<{
    insights: EntryInsights;
    nodes?: GraphNode[];
    edges?: GraphEdge[];
  }>;
}
