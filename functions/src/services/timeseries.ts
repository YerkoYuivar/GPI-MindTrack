/**
 * @module services/timeseries
 * @description Servicios para actualizar y reconstruir series temporales
 */

import * as admin from 'firebase-admin';
import {db} from './firestore';
import {
  DayDoc,
  WeekDoc,
  MoodHistogram,
  SentimentBuckets,
  SentimentLabel,
} from '../types/timeseries';
import {JournalEntry} from '../types/journal';
import {EntryInsights} from '../types/insights';
import {
  toDate,
  dayKeyUTC,
  isoWeek,
  weekKeyISO,
  startOfDayUTC,
  endOfDayUTC,
} from '../utils/datetime';

/**
 * Referencia a la colección de días de un usuario
 */
const userDaysCol = (userId: string) =>
  db.collection(`journals/${userId}/insights/timeseries/day`);

/**
 * Referencia a la colección de semanas de un usuario
 */
const userWeeksCol = (userId: string) =>
  db.collection(`journals/${userId}/insights/timeseries/week`);

/**
 * Determina el label de sentimiento basándose en el score
 */
function getSentimentLabel(score: number): SentimentLabel {
  if (score > 0.2) return 'pos';
  if (score < -0.2) return 'neg';
  return 'neu';
}

/**
 * Crea un histograma de mood vacío
 */
function emptyMoodHistogram(): MoodHistogram {
  return {'1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0};
}

/**
 * Crea contadores de sentimiento vacíos
 */
function emptySentimentBuckets(): SentimentBuckets {
  return {neg: 0, neu: 0, pos: 0};
}

/**
 * Actualiza incrementalmente los documentos de timeseries para una entrada
 */
export async function upsertForEntry(
  userId: string,
  entry: JournalEntry,
  insights?: EntryInsights
): Promise<void> {
  const created = toDate(entry.createdAt);
  const dayId = dayKeyUTC(created);
  const weekId = weekKeyISO(created);
  const {start: weekStart, end: weekEnd} = isoWeek(created);

  const dayRef = userDaysCol(userId).doc(dayId);
  const weekRef = userWeeksCol(userId).doc(weekId);

  const moodValue = typeof entry.mood === 'number' ? entry.mood : null;
  const sentimentScore = insights?.sentiment?.score ?? null;
  const sentimentLabel = insights?.sentiment?.label ??
    (sentimentScore != null ? getSentimentLabel(sentimentScore) : null);

  await db.runTransaction(async (tx) => {
    // Procesar día y semana
    const buckets: Array<{
      ref: FirebaseFirestore.DocumentReference;
      period: 'day' | 'week';
      startAt: Date;
      endAt: Date;
    }> = [
      {
        ref: dayRef as any,
        period: 'day',
        startAt: startOfDayUTC(created),
        endAt: endOfDayUTC(created),
      },
      {
        ref: weekRef as any,
        period: 'week',
        startAt: weekStart,
        endAt: weekEnd,
      },
    ];

    for (const bucket of buckets) {
      const snap = await tx.get(bucket.ref);

      // Documento base (nuevo o existente)
      const base = snap.exists ?
        (snap.data() as DayDoc | WeekDoc) :
        {
          id: snap.ref.id,
          period: bucket.period,
          startAt: admin.firestore.Timestamp.fromDate(bucket.startAt),
          endAt: admin.firestore.Timestamp.fromDate(bucket.endAt),
          count: 0,
          avgMood: null,
          moodCounts: emptyMoodHistogram(),
          avgSentiment: null,
          sentimentCounts: emptySentimentBuckets(),
          lastEntryIds: [],
        };

      // Nuevo count
      const newCount = base.count + 1;

      // Actualizar mood
      let newAvgMood = base.avgMood;
      const newMoodCounts = {...base.moodCounts};
      if (moodValue != null && moodValue >= 1 && moodValue <= 7) {
        // Recalcular media incremental
        newAvgMood =
          base.avgMood == null ?
            moodValue :
            (base.avgMood * base.count + moodValue) / newCount;

        // Incrementar histograma
        const key = String(moodValue) as keyof MoodHistogram;
        newMoodCounts[key] = (newMoodCounts[key] ?? 0) + 1;
      }

      // Actualizar sentiment
      let newAvgSentiment = base.avgSentiment;
      const newSentimentCounts = {...base.sentimentCounts};
      if (sentimentScore != null) {
        // Recalcular media incremental
        newAvgSentiment =
          base.avgSentiment == null ?
            sentimentScore :
            (base.avgSentiment * base.count + sentimentScore) / newCount;

        // Incrementar bucket
        if (sentimentLabel) {
          newSentimentCounts[sentimentLabel] =
            (newSentimentCounts[sentimentLabel] ?? 0) + 1;
        }
      }

      // Actualizar lastEntryIds (máximo 10, más reciente primero)
      const lastEntryIds = [
        entry.id,
        ...base.lastEntryIds.filter((id) => id !== entry.id),
      ].slice(0, 10);

      // Escribir documento actualizado
      tx.set(
        bucket.ref,
        {
          ...base,
          count: newCount,
          avgMood: newAvgMood,
          moodCounts: newMoodCounts,
          avgSentiment: newAvgSentiment,
          sentimentCounts: newSentimentCounts,
          lastEntryIds,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        {merge: true}
      );
    }
  });
}

/**
 * Reconstruye todos los documentos de timeseries para un usuario
 */
export async function rebuildUser(
  userId: string,
  options: {from?: string; to?: string} = {}
): Promise<{processed: number; days: number; weeks: number}> {
  const {from, to} = options;

  // Construir query
  let query = db
    .collection(`journals/${userId}/entries`)
    .where('state', '==', 'active') as FirebaseFirestore.Query;

  if (from) {
    query = query.where(
      'createdAt',
      '>=',
      admin.firestore.Timestamp.fromDate(new Date(from))
    );
  }
  if (to) {
    query = query.where(
      'createdAt',
      '<=',
      admin.firestore.Timestamp.fromDate(new Date(to))
    );
  }

  const entriesSnap = await query.get();

  if (entriesSnap.empty) {
    return {processed: 0, days: 0, weeks: 0};
  }

  // Agrupar por buckets
  const dayBuckets = new Map<string, JournalEntry[]>();
  const weekBuckets = new Map<string, JournalEntry[]>();

  for (const doc of entriesSnap.docs) {
    const entry = {id: doc.id, ...doc.data()} as JournalEntry;
    const created = toDate(entry.createdAt);

    const dayId = dayKeyUTC(created);
    const weekId = weekKeyISO(created);

    if (!dayBuckets.has(dayId)) dayBuckets.set(dayId, []);
    if (!weekBuckets.has(weekId)) weekBuckets.set(weekId, []);

    dayBuckets.get(dayId)!.push(entry);
    weekBuckets.get(weekId)!.push(entry);
  }

  // Reconstruir días
  for (const [dayId, entries] of dayBuckets) {
    await rebuildDayBucket(userId, dayId, entries);
  }

  // Reconstruir semanas
  for (const [weekId, entries] of weekBuckets) {
    await rebuildWeekBucket(userId, weekId, entries);
  }

  return {
    processed: entriesSnap.size,
    days: dayBuckets.size,
    weeks: weekBuckets.size,
  };
}

/**
 * Reconstruye un bucket de día desde cero
 */
async function rebuildDayBucket(
  userId: string,
  dayId: string,
  entries: JournalEntry[]
): Promise<void> {
  const ref = userDaysCol(userId).doc(dayId);

  // Calcular agregados
  let count = 0;
  let moodSum = 0;
  let moodCount = 0;
  let sentimentSum = 0;
  let sentimentCount = 0;
  const moodCounts = emptyMoodHistogram();
  const sentimentCounts = emptySentimentBuckets();
  const lastEntryIds: string[] = [];

  for (const entry of entries) {
    count++;
    lastEntryIds.push(entry.id);

    // Mood
    if (typeof entry.mood === 'number' && entry.mood >= 1 && entry.mood <= 7) {
      moodSum += entry.mood;
      moodCount++;
      const key = String(entry.mood) as keyof MoodHistogram;
      moodCounts[key]++;
    }

    // Sentiment (leer de insights/summary si existe)
    const insightsRef = db.doc(
      `journals/${userId}/entries/${entry.id}/insights/summary`
    );
    const insightsSnap = await insightsRef.get();

    if (insightsSnap.exists) {
      const insights = insightsSnap.data() as EntryInsights;
      if (insights?.sentiment?.score != null) {
        sentimentSum += insights.sentiment.score;
        sentimentCount++;
        const label =
          insights.sentiment.label ?? getSentimentLabel(insights.sentiment.score);
        sentimentCounts[label]++;
      }
    }
  }

  // Calcular medias
  const avgMood = moodCount > 0 ? moodSum / moodCount : null;
  const avgSentiment =
    sentimentCount > 0 ? sentimentSum / sentimentCount : null;

  // Calcular límites del día
  const [year, month, day] = dayId.split('-').map(Number);
  const startAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
  );
  const endAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0))
  );

  // Escribir documento
  await ref.set({
    id: dayId,
    period: 'day',
    startAt,
    endAt,
    count,
    avgMood,
    moodCounts,
    avgSentiment,
    sentimentCounts,
    lastEntryIds: lastEntryIds.slice(-10).reverse(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Reconstruye un bucket de semana desde cero
 */
async function rebuildWeekBucket(
  userId: string,
  weekId: string,
  entries: JournalEntry[]
): Promise<void> {
  const ref = userWeeksCol(userId).doc(weekId);

  // Usar la primera entrada para calcular los límites de la semana
  const firstEntry = entries[0];
  const created = toDate(firstEntry.createdAt);
  const {start, end} = isoWeek(created);

  // Calcular agregados (mismo proceso que días)
  let count = 0;
  let moodSum = 0;
  let moodCount = 0;
  let sentimentSum = 0;
  let sentimentCount = 0;
  const moodCounts = emptyMoodHistogram();
  const sentimentCounts = emptySentimentBuckets();
  const lastEntryIds: string[] = [];

  for (const entry of entries) {
    count++;
    lastEntryIds.push(entry.id);

    if (typeof entry.mood === 'number' && entry.mood >= 1 && entry.mood <= 7) {
      moodSum += entry.mood;
      moodCount++;
      const key = String(entry.mood) as keyof MoodHistogram;
      moodCounts[key]++;
    }

    const insightsRef = db.doc(
      `journals/${userId}/entries/${entry.id}/insights/summary`
    );
    const insightsSnap = await insightsRef.get();

    if (insightsSnap.exists) {
      const insights = insightsSnap.data() as EntryInsights;
      if (insights?.sentiment?.score != null) {
        sentimentSum += insights.sentiment.score;
        sentimentCount++;
        const label =
          insights.sentiment.label ?? getSentimentLabel(insights.sentiment.score);
        sentimentCounts[label]++;
      }
    }
  }

  const avgMood = moodCount > 0 ? moodSum / moodCount : null;
  const avgSentiment =
    sentimentCount > 0 ? sentimentSum / sentimentCount : null;

  await ref.set({
    id: weekId,
    period: 'week',
    startAt: admin.firestore.Timestamp.fromDate(start),
    endAt: admin.firestore.Timestamp.fromDate(end),
    count,
    avgMood,
    moodCounts,
    avgSentiment,
    sentimentCounts,
    lastEntryIds: lastEntryIds.slice(-10).reverse(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}
