/**
 * Tipos para el sistema de grafos 3D de patrones (Backend)
 */

export type PatternType = 'emotion' | 'activity' | 'person' | 'place' | 'topic' | 'trigger';

export interface Pattern {
  id: string;
  label: string;
  type: PatternType;
  frequency: number;
  importance: number;
  firstSeen: Date;
  lastSeen: Date;
  sentiment?: number;
  metadata?: {
    aliases?: string[];
    context?: string;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  coOccurrences: number;
  correlation?: number;
  metadata?: {
    sharedEntries?: string[];
    avgTimeDelta?: number;
  };
}
