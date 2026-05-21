/**
 * @module features/discover/repo
 * @description Repositorio para consultar series temporales (agregaciones diarias y semanales)
 */

import { db } from '@lib/firebase/firestore';
import { collection, query, orderBy, limit as limitQuery, getDocs } from 'firebase/firestore';
import type { DayDoc, WeekDoc, TimeseriesQueryOptions, DaySeriesItem, WeekSeriesItem } from './types';

/**
 * Convierte DayDoc a DaySeriesItem (formato simplificado para gráficas)
 */
function toDaySeriesItem(doc: DayDoc): DaySeriesItem {
  return {
    id: doc.id,
    startAt: doc.startAt.toMillis(),
    count: doc.count,
    avgMood: doc.avgMood,
    avgSentiment: doc.avgSentiment,
  };
}

/**
 * Convierte WeekDoc a WeekSeriesItem (formato simplificado para gráficas)
 */
function toWeekSeriesItem(doc: WeekDoc): WeekSeriesItem {
  return {
    id: doc.id,
    startAt: doc.startAt.toMillis(),
    count: doc.count,
    avgMood: doc.avgMood,
    avgSentiment: doc.avgSentiment,
  };
}

/**
 * Obtiene las series temporales diarias de un usuario
 * 
 * @param userId - ID del usuario
 * @param options - Opciones de consulta (limit, from, to)
 * @returns Array de documentos diarios ordenados por fecha descendente
 * 
 * @example
 * // Obtener últimos 30 días
 * const days = await getDaySeries('user123', { limit: 30 });
 */
export async function getDaySeries(
  userId: string,
  options?: TimeseriesQueryOptions
): Promise<DaySeriesItem[]> {
  const { limit: resultLimit = 30 } = options ?? {};

  const colRef = collection(db, `journals/${userId}/insights/timeseries/day`);
  const q = query(colRef, orderBy('startAt', 'desc'), limitQuery(resultLimit));

  const snapshot = await getDocs(q);

  const docs = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as DayDoc[];

  return docs.map(toDaySeriesItem);
}

/**
 * Obtiene las series temporales semanales de un usuario
 * 
 * @param userId - ID del usuario
 * @param options - Opciones de consulta (limit, from, to)
 * @returns Array de documentos semanales ordenados por fecha descendente
 * 
 * @example
 * // Obtener últimas 12 semanas
 * const weeks = await getWeekSeries('user123', { limit: 12 });
 */
export async function getWeekSeries(
  userId: string,
  options?: TimeseriesQueryOptions
): Promise<WeekSeriesItem[]> {
  const { limit: resultLimit = 12 } = options ?? {};

  const colRef = collection(db, `journals/${userId}/insights/timeseries/week`);
  const q = query(colRef, orderBy('startAt', 'desc'), limitQuery(resultLimit));

  const snapshot = await getDocs(q);

  const docs = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as WeekDoc[];

  return docs.map(toWeekSeriesItem);
}
