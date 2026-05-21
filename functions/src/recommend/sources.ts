/**
 * @module recommend/sources
 * @description Recolección de señales del usuario para generar recomendaciones
 */

import {db} from '../services/firestore';
import {Signals} from '../types/recommend';

/**
 * Calcula promedio ignorando nulls
 */
function avg(arr: (number | null | undefined)[]): number | null {
  const xs = arr.filter((n): n is number => typeof n === 'number');
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/**
 * Calcula tendencia comparando últimos 3 vs previos 3
 */
function trend(recent: number[], previous: number[]): 'up' | 'down' | 'flat' | null {
  const avgRecent = avg(recent);
  const avgPrev = avg(previous);
  if (avgRecent === null || avgPrev === null) return null;
  const diff = avgRecent - avgPrev;
  if (Math.abs(diff) < 0.3) return 'flat'; // umbral pequeño
  return diff > 0 ? 'up' : 'down';
}

/**
 * Recolecta señales del usuario para generar recomendaciones
 * @param userId ID del usuario
 * @param horizonDays Ventana temporal en días (default 14)
 * @returns Señales agregadas
 */
export async function collectSignals(
  userId: string,
  horizonDays = 14
): Promise<Signals> {
  const now = Date.now();
  const cutoff = now - horizonDays * 24 * 60 * 60 * 1000;
  const cutoff7 = now - 7 * 24 * 60 * 60 * 1000;
  const cutoff3 = now - 3 * 24 * 60 * 60 * 1000;

  // 1. Timeseries: últimos horizonDays
  const daySnap = await db
    .collection(`journals/${userId}/timeseries/day`)
    .where('startAt', '>=', new Date(cutoff))
    .orderBy('startAt', 'desc')
    .limit(horizonDays)
    .get();

  const days = daySnap.docs.map((doc) => {
    const data = doc.data();
    return {
      startAt: data.startAt?.toMillis?.() ?? 0,
      avgMood: data.avgMood ?? null,
      avgSentiment: data.avgSentiment ?? null,
      count: data.count ?? 0,
    };
  });

  // Ordenar cronológicamente (más antiguo primero)
  days.sort((a, b) => a.startAt - b.startAt);

  // Promedio mood últimos 7 días
  const last7 = days.filter((d) => d.startAt >= cutoff7);
  const avgMood7 = avg(last7.map((d) => d.avgMood));

  // Promedio sentiment últimos 14 días
  const avgSent14 = avg(days.map((d) => d.avgSentiment));

  // Tendencias (últimos 3 vs previos 3)
  const moods = days.map((d) => d.avgMood).filter((v): v is number => v !== null);
  const sents = days.map((d) => d.avgSentiment).filter((v): v is number => v !== null);

  const trendMood = moods.length >= 6
    ? trend(moods.slice(-3), moods.slice(-6, -3))
    : null;

  const trendSent = sents.length >= 6
    ? trend(sents.slice(-3), sents.slice(-6, -3))
    : null;

  // Actividad baja: sin entradas en últimos 3 días
  const countLast3 = days
    .filter((d) => d.startAt >= cutoff3)
    .reduce((sum, d) => sum + d.count, 0);
  const lowActivity = countLast3 === 0;

  // 2. Top topics de nodos (weight desc, type='topic')
  const topicsSnap = await db
    .collection(`journals/${userId}/insights`)
    .doc('insights')
    .collection('nodes')
    .where('type', '==', 'topic')
    .orderBy('weight', 'desc')
    .limit(8)
    .get();

  const topTopics = topicsSnap.docs
    .map((doc) => doc.data().label as string)
    .filter(Boolean)
    .slice(0, 8);

  // 3. Top phrases de nodos (weight desc, type='phrase')
  const phrasesSnap = await db
    .collection(`journals/${userId}/insights`)
    .doc('insights')
    .collection('nodes')
    .where('type', '==', 'phrase')
    .orderBy('weight', 'desc')
    .limit(8)
    .get();

  const topPhrases = phrasesSnap.docs
    .map((doc) => doc.data().label as string)
    .filter(Boolean)
    .slice(0, 8);

  return {
    avgMood7,
    avgSent14,
    trendMood,
    trendSent,
    topTopics,
    topPhrases,
    lowActivity,
  };
}
