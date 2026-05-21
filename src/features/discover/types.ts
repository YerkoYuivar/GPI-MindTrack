/**
 * @module features/discover/types
 * @description Tipos TypeScript para el módulo Descubrimientos (series temporales)
 */

import type { Timestamp } from 'firebase/firestore';

export type Period = 'day' | 'week';

export type MoodHistogram = Record<'1' | '2' | '3' | '4' | '5' | '6' | '7', number>;

export interface SentimentBuckets {
  neg: number;
  neu: number;
  pos: number;
}

/**
 * Documento base de series temporales (día o semana)
 */
export interface BaseTimeseriesDoc {
  id: string;
  period: Period;
  startAt: Timestamp;
  endAt: Timestamp;
  updatedAt: Timestamp;
  
  // Agregaciones
  count: number;
  avgMood: number | null;
  moodCounts: MoodHistogram;
  avgSentiment: number | null;
  sentimentCounts: SentimentBuckets;
  lastEntryIds: string[];
}

/**
 * Documento de agregación diaria
 * Path: journals/{userId}/insights/timeseries/day/{YYYY-MM-DD}
 */
export interface DayDoc extends BaseTimeseriesDoc {
  period: 'day';
}

/**
 * Documento de agregación semanal
 * Path: journals/{userId}/insights/timeseries/week/{YYYY-Www}
 */
export interface WeekDoc extends BaseTimeseriesDoc {
  period: 'week';
}

/**
 * Opciones para queries de series temporales
 */
export interface TimeseriesQueryOptions {
  limit?: number;
  from?: Date;
  to?: Date;
}

/**
 * Tipos simplificados para gráficas
 */
export type DaySeriesItem = {
  id: string;             // 'YYYY-MM-DD'
  startAt: number;        // epoch ms (UTC 00:00)
  count: number;
  avgMood: number | null; // 1..7
  avgSentiment: number | null; // -1..1
};

export type WeekSeriesItem = {
  id: string;             // 'YYYY-Www'
  startAt: number;        // epoch ms (lunes 00:00)
  count: number;
  avgMood: number | null;
  avgSentiment: number | null;
};
