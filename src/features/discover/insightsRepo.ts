/**
 * @module features/discover/insightsRepo
 * @description Repositorio para leer insights de entradas desde Firestore
 */

import { db } from '@lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  startAfter,
  DocumentSnapshot,
} from 'firebase/firestore';
import { log } from '@utils/logger';

/**
 * Métricas de calidad de un insight
 */
export interface Quality {
  completeness: number;     // 0..1 (proporción de campos presentes)
  confidence: number;       // 0..1 (heurística del analizador)
  hasTopics: boolean;
  hasKeyPhrases: boolean;
  status: 'OK' | 'WARN' | 'FAIL';
  processingTimeMs: number; // tiempo de procesamiento
  error?: string;           // mensaje de error si falla
}

/**
 * Insights de una entrada individual
 */
export interface EntryInsights {
  entryId: string;
  sentiment: { score: number; label: 'neg' | 'neu' | 'pos' };
  topics: { key: string; weight: number }[];
  keyPhrases: string[];
  quality?: Quality; // métricas de calidad
  updatedAt: number; // epoch ms
}

/**
 * Item del feed de insights
 */
export interface FeedItem {
  id: string; // entryId
  updatedAt: number;
  sentimentLabel: 'neg' | 'neu' | 'pos';
  sentimentScore: number;
  title?: string;
  snippet?: string;
  topics: string[];
  quality?: Quality; // métricas de calidad
}

/**
 * Obtiene los insights de una entrada específica
 * 
 * @param userId ID del usuario
 * @param entryId ID de la entrada
 * @returns Insights o null si no existen
 */
export async function getEntryInsights(
  userId: string,
  entryId: string
): Promise<EntryInsights | null> {
  try {
    log.debug('[insightsRepo] getEntryInsights', { userId, entryId });

    const ref = doc(db, `journals/${userId}/entries/${entryId}/insights/summary`);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      log.debug('[insightsRepo] No insights found for entry', { entryId });
      return null;
    }

    const data = snap.data();

    const insights: EntryInsights = {
      entryId,
      sentiment: data.sentiment || { score: 0, label: 'neu' },
      topics: data.topics || [],
      keyPhrases: data.keyPhrases || [],
      quality: data.quality || undefined,
      updatedAt: data.updatedAt?.toMillis?.() || Date.now(),
    };

    log.debug('[insightsRepo] Insights retrieved', { entryId, topicsCount: insights.topics.length });

    return insights;
  } catch (error) {
    log.error('[insightsRepo] Error getting entry insights', { userId, entryId, error });
    throw error;
  }
}

/**
 * Obtiene una página del feed de insights
 * 
 * Estrategia: Lee entradas recientes y luego busca sus insights
 * Nota: Esto hace N+1 lecturas. Para optimizar, se podría materializar
 * una colección journals/{userId}/insights/activity
 * 
 * @param userId ID del usuario
 * @param pageSize Tamaño de página (default: 20)
 * @param cursor Cursor de paginación (opcional)
 * @returns Items del feed y cursor para siguiente página
 */
export async function getInsightsFeedPage(
  userId: string,
  pageSize = 20,
  cursor?: DocumentSnapshot
): Promise<{ items: FeedItem[]; nextCursor?: DocumentSnapshot }> {
  try {
    log.debug('[insightsRepo] getInsightsFeedPage', { userId, pageSize, hasCursor: !!cursor });

    const col = collection(db, `journals/${userId}/entries`);

    // Query base: entradas activas ordenadas por updatedAt desc
    let q = query(
      col,
      where('state', '==', 'active'),
      orderBy('updatedAt', 'desc'),
      limit(pageSize + 1)
    );

    // Si hay cursor, continuar desde ahí
    if (cursor) {
      q = query(
        col,
        where('state', '==', 'active'),
        orderBy('updatedAt', 'desc'),
        startAfter(cursor),
        limit(pageSize + 1)
      );
    }

    const snap = await getDocs(q);

    // Tomar solo pageSize elementos (el +1 es para detectar si hay más)
    const docs = snap.docs.slice(0, pageSize);
    const nextCursor = snap.docs.length > pageSize ? snap.docs[pageSize] : undefined;

    log.info('[insightsRepo] Entries loaded', { count: docs.length, hasMore: !!nextCursor });

    // Cargar insights de cada entrada
    const items: FeedItem[] = [];

    for (const entryDoc of docs) {
      const entryId = entryDoc.id;
      const entryData = entryDoc.data();

      // Intentar cargar insights
      const insights = await getEntryInsights(userId, entryId);

      if (!insights) {
        // Si no hay insights, skip (o podríamos mostrar sin insights)
        log.debug('[insightsRepo] Skipping entry without insights', { entryId });
        continue;
      }

      const feedItem: FeedItem = {
        id: entryId,
        updatedAt: insights.updatedAt,
        sentimentLabel: insights.sentiment.label,
        sentimentScore: insights.sentiment.score,
        title: entryData.title || '',
        snippet: (entryData.content || '').slice(0, 160),
        topics: (insights.topics || []).map((t) => t.key).slice(0, 5),
        quality: insights.quality,
      };

      items.push(feedItem);
    }

    log.info('[insightsRepo] Feed page loaded', { itemCount: items.length });

    return { items, nextCursor };
  } catch (error) {
    log.error('[insightsRepo] Error getting insights feed', { userId, error });
    throw error;
  }
}
