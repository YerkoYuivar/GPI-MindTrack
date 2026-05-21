/**
 * Tipos para el sistema de grafos 3D de patrones
 */

export type PatternType = 'emotion' | 'activity' | 'person' | 'place' | 'topic' | 'trigger';

export interface Pattern {
  id: string;
  label: string;
  type: PatternType;
  frequency: number; // Número de veces que aparece
  importance: number; // Score de importancia (0-1)
  firstSeen: Date;
  lastSeen: Date;
  sentiment?: number; // Sentimiento promedio asociado (-1 a 1)
  metadata?: {
    aliases?: string[]; // Variaciones del patrón
    context?: string; // Contexto común
  };
}

export interface GraphEdge {
  id: string;
  source: string; // ID del nodo origen
  target: string; // ID del nodo destino
  weight: number; // Fuerza de la conexión (0-1)
  coOccurrences: number; // Veces que aparecen juntos
  correlation?: number; // Correlación temporal (-1 a 1)
  metadata?: {
    sharedEntries?: string[]; // IDs de entradas donde co-ocurren
    avgTimeDelta?: number; // Delta promedio en días
  };
}

export interface GraphNode {
  pattern: Pattern;
  position: { x: number; y: number; z: number };
  velocity?: { x: number; y: number; z: number };
  size: number; // Radio visual del nodo
  color: string;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    userId: string;
    generatedAt: Date;
    entryCount: number;
    dateRange: {
      start: Date;
      end: Date;
    };
    version: string;
  };
}

export interface GraphFilters {
  types?: PatternType[];
  minFrequency?: number;
  minWeight?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
}

export interface NodeInteraction {
  nodeId: string;
  pattern: Pattern;
  relatedEntries: Array<{
    id: string;
    date: Date;
    excerpt: string;
  }>;
  connections: Array<{
    pattern: Pattern;
    weight: number;
  }>;
}
