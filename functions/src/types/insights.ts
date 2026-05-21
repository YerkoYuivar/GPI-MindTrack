/**
 * @module types/insights
 * @description Tipos para insights de análisis de IA
 */

import * as admin from 'firebase-admin';

export type SentimentLabel = 'neg' | 'neu' | 'pos';

export type Sentiment = {
  score: number; // -1 a 1
  label: SentimentLabel;
};

export type Topic = {
  key: string;
  weight: number; // 0 a 1
};

export type Quality = {
  completeness: number;     // 0..1 (proporción de campos presentes)
  confidence: number;       // 0..1 (heurística del analizador)
  hasTopics: boolean;
  hasKeyPhrases: boolean;
  status: 'OK' | 'WARN' | 'FAIL';
  processingTimeMs: number; // tiempo de procesamiento
  error?: string;           // mensaje de error si falla
};

export type EntryInsights = {
  entryId: string;
  sentiment: Sentiment;
  topics: Topic[]; // top 3-5 temas
  keyPhrases: string[]; // 3-8 frases/tokens clave
  quality?: Quality; // métricas de calidad del análisis
  updatedAt: admin.firestore.FieldValue | Date;
};

export type NodeType = 'topic' | 'phrase' | 'emotion';

export type GraphNode = {
  id: string; // stable hash (ej. topic:trabajo)
  label: string;
  type: NodeType;
  weight: number; // 0 a 1
  updatedAt: admin.firestore.FieldValue | Date;
};

export type GraphEdge = {
  id: string; // `${source}-${target}`
  source: string; // nodeId
  target: string; // nodeId
  weight: number; // frecuencia de co-ocurrencia
  updatedAt: admin.firestore.FieldValue | Date;
};
