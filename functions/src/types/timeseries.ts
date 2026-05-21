/**
 * @module types/timeseries
 * @description Tipos para series temporales de sentimiento y mood
 */

import * as admin from 'firebase-admin';

export type MoodValue = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type MoodHistogram = Record<'1' | '2' | '3' | '4' | '5' | '6' | '7', number>;
export type SentimentLabel = 'neg' | 'neu' | 'pos';
export type SentimentBuckets = Record<SentimentLabel, number>;

/**
 * Documento de agregación diaria
 */
export type DayDoc = {
  id: string; // YYYY-MM-DD
  period: 'day';
  startAt: admin.firestore.Timestamp; // 00:00 UTC
  endAt: admin.firestore.Timestamp; // 00:00 UTC del día siguiente
  updatedAt: admin.firestore.FieldValue | admin.firestore.Timestamp;
  count: number; // número de entradas en el día
  avgMood: number | null; // media de mood (1-7)
  moodCounts: MoodHistogram; // histograma de moods
  avgSentiment: number | null; // media de sentiment.score (-1 a 1)
  sentimentCounts: SentimentBuckets; // conteo por label
  lastEntryIds: string[]; // últimos 10 IDs (más reciente primero)
};

/**
 * Documento de agregación semanal (ISO week)
 */
export type WeekDoc = {
  id: string; // YYYY-Www
  period: 'week';
  startAt: admin.firestore.Timestamp; // Lunes 00:00 UTC
  endAt: admin.firestore.Timestamp; // Lunes siguiente 00:00 UTC
  updatedAt: admin.firestore.FieldValue | admin.firestore.Timestamp;
  count: number;
  avgMood: number | null;
  moodCounts: MoodHistogram;
  avgSentiment: number | null;
  sentimentCounts: SentimentBuckets;
  lastEntryIds: string[];
};

/**
 * Union type para cualquier documento de timeseries
 */
export type TimeseriesDoc = DayDoc | WeekDoc;

/**
 * Opciones para consultas de timeseries
 */
export type TimeseriesQueryOptions = {
  limit?: number;
  from?: string; // ISO date
  to?: string; // ISO date
};
