/**
 * @module index
 * @description Firebase Cloud Functions para análisis de IA del diario emocional
 * 
 * Endpoints disponibles:
 * - analyzeEntry: Analiza una entrada individual
 * - analyzeUserBatch: Analiza múltiples entradas de un usuario en lote
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Export other functions (existing)
import * as functions from 'firebase-functions';
import { userEntriesCol } from './services/firestore';
import { MockAnalyzer } from './analyzers/mockAnalyzer';
import { writeEntryInsights, upsertNodes, upsertEdges } from './services/insightsWriter';
import { upsertForEntry, rebuildUser } from './services/timeseries';
import { getUserId } from './env';
import { JournalEntry } from './types/journal';
import { EntryInsights } from './types/insights';
import { RulesRecommender } from './recommend/rulesRecommender';
import { extractFromEntry } from './text2graph/extractor';
import { upsertGraph, termsToNodes, pairsToEdges } from './text2graph/writer';
import { maybeCreateCheckpoint } from './memory/checkpoints';
import { updateSlotsFromTurn } from './memory/slots';

// Inicializar analizador
const analyzer = new MockAnalyzer();

/**
 * analyzeEntry - Analiza una entrada individual del diario
 * 
 * @param data.entryId - ID de la entrada a analizar
 * @param data.userId - (Opcional) ID del usuario (solo en emulador sin auth)
 * @returns {ok: boolean, insights?: object}
 * 
 * @example
 * // Desde la app:
 * const result = await functions().httpsCallable('analyzeEntry')({
 *   entryId: 'abc123'
 * });
 */
export const analyzeEntry = functions.https.onCall(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (data: unknown, context: any) => {
    const payload = data as {
      userId?: string;
      entryId: string;
    };
    const { userId: fallbackUserId, entryId } = payload;

    // Validar entryId
    if (!entryId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'entryId is required'
      );
    }

    // Obtener userId
    const userId = getUserId(context.auth?.uid, fallbackUserId);
    if (!userId) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Authentication required'
      );
    }

    // Verificar que la entrada existe
    const entrySnap = await userEntriesCol(userId).doc(entryId).get();
    if (!entrySnap.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        `Entry ${entryId} not found`
      );
    }

    // Obtener datos de la entrada
    const entry = {
      id: entryId,
      ...entrySnap.data(),
    } as JournalEntry;

    // Analizar entrada
    functions.logger.info('Analyzing entry', { userId, entryId });
    const { insights, nodes, edges } = await analyzer.analyzeEntry(entry);

    // Escribir resultados
    await writeEntryInsights(userId, entryId, insights);
    await upsertNodes(userId, nodes ?? []);
    await upsertEdges(userId, edges ?? []);

    // Actualizar series temporales
    await upsertForEntry(userId, entry, insights);
    functions.logger.info('Timeseries updated', { userId, entryId });

    functions.logger.info('Entry analyzed successfully', {
      userId,
      entryId,
      sentiment: insights.sentiment.label,
      topicsCount: insights.topics.length,
      nodesCount: nodes?.length ?? 0,
      edgesCount: edges?.length ?? 0,
    });

    return {
      ok: true,
      insights: {
        sentiment: insights.sentiment,
        topicsCount: insights.topics.length,
        keyPhrasesCount: insights.keyPhrases.length,
      },
    };
  });

/**
 * analyzeUserBatch - Analiza múltiples entradas de un usuario en lote
 * 
 * @param data.limit - (Opcional) Número máximo de entradas a procesar (default: 50, max: 200)
 * @param data.userId - (Opcional) ID del usuario (solo en emulador sin auth)
 * @returns {ok: boolean, processed: number}
 * 
 * @example
 * // Desde la app:
 * const result = await functions().httpsCallable('analyzeUserBatch')({
 *   limit: 100
 * });
 */
export const analyzeUserBatch = functions.https.onCall(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (data: unknown, context: any) => {
    const payload = data as {
      userId?: string;
      limit?: number;
    };
    const { userId: fallbackUserId, limit = 50 } = payload;

    // Obtener userId
    const userId = getUserId(context.auth?.uid, fallbackUserId);
    if (!userId) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Authentication required'
      );
    }

    // Validar y limitar cantidad
    const processLimit = Math.min(200, Math.max(1, limit));

    functions.logger.info('Starting batch analysis', { userId, limit: processLimit });

    // Consultar entradas activas
    const entriesSnap = await userEntriesCol(userId)
      .where('state', '==', 'active')
      .orderBy('createdAt', 'desc')
      .limit(processLimit)
      .get();

    if (entriesSnap.empty) {
      functions.logger.info('No active entries found', { userId });
      return { ok: true, processed: 0 };
    }

    // Procesar cada entrada
    let processed = 0;
    for (const doc of entriesSnap.docs) {
      const entry = {
        id: doc.id,
        ...doc.data(),
      } as JournalEntry;

      try {
        const { insights, nodes, edges } = await analyzer.analyzeEntry(entry);
        await writeEntryInsights(userId, doc.id, insights);
        await upsertNodes(userId, nodes ?? []);
        await upsertEdges(userId, edges ?? []);
        processed++;

        functions.logger.debug('Entry processed', {
          userId,
          entryId: doc.id,
          sentiment: insights.sentiment.label,
        });
      } catch (error) {
        functions.logger.error('Error processing entry', {
          userId,
          entryId: doc.id,
          error,
        });
        // Continuar con las demás entradas
      }
    }

    functions.logger.info('Batch analysis completed', {
      userId,
      total: entriesSnap.size,
      processed,
    });

    return {
      ok: true,
      processed,
      total: entriesSnap.size,
    };
  });

/**
 * updateTimeseriesForEntry - Actualiza las series temporales para una entrada específica
 * 
 * Útil para recalcular las agregaciones de una entrada cuando se editan sus datos.
 * 
 * @param data.entryId - ID de la entrada
 * @param data.userId - (Opcional) ID del usuario (solo en emulador sin auth)
 * @returns {ok: boolean}
 * 
 * @example
 * const result = await functions().httpsCallable('updateTimeseriesForEntry')({
 *   entryId: 'abc123'
 * });
 */
export const updateTimeseriesForEntry = functions.https.onCall(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (data: unknown, context: any) => {
    const payload = data as {
      userId?: string;
      entryId: string;
    };
    const { userId: fallbackUserId, entryId } = payload;

    // Validar entryId
    if (!entryId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'entryId is required'
      );
    }

    // Obtener userId
    const userId = getUserId(context.auth?.uid, fallbackUserId);
    if (!userId) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Authentication required'
      );
    }

    // Verificar que la entrada existe
    const entrySnap = await userEntriesCol(userId).doc(entryId).get();
    if (!entrySnap.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        `Entry ${entryId} not found`
      );
    }

    const entry = {
      id: entryId,
      ...entrySnap.data(),
    } as JournalEntry;

    // Leer insights si existen
    const insightsSnap = await userEntriesCol(userId)
      .doc(entryId)
      .collection('insights')
      .doc('summary')
      .get();

    const insights = insightsSnap.exists
      ? (insightsSnap.data() as EntryInsights)
      : undefined;

    // Actualizar timeseries
    functions.logger.info('Updating timeseries for entry', { userId, entryId });
    await upsertForEntry(userId, entry, insights);

    functions.logger.info('Timeseries updated successfully', { userId, entryId });

    return { ok: true };
  }
);

/**
 * rebuildTimeseriesForUser - Reconstruye todas las series temporales de un usuario
 * 
 * Útil para inicializar datos históricos o corregir inconsistencias.
 * 
 * @param data.userId - (Opcional) ID del usuario (solo en emulador sin auth)
 * @param data.from - (Opcional) Fecha inicial (ISO string)
 * @param data.to - (Opcional) Fecha final (ISO string)
 * @returns {ok: boolean, processed: number, days: number, weeks: number}
 * 
 * @example
 * const result = await functions().httpsCallable('rebuildTimeseriesForUser')({
 *   from: '2024-01-01',
 *   to: '2024-12-31'
 * });
 */
export const rebuildTimeseriesForUser = functions.https.onCall(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (data: unknown, context: any) => {
    const payload = data as {
      userId?: string;
      from?: string;
      to?: string;
    };
    const { userId: fallbackUserId, from, to } = payload;

    // Obtener userId
    const userId = getUserId(context.auth?.uid, fallbackUserId);
    if (!userId) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Authentication required'
      );
    }

    functions.logger.info('Starting timeseries rebuild', {
      userId,
      from,
      to,
    });

    // Reconstruir series temporales
    const result = await rebuildUser(userId, {
      from,
      to,
    });

    functions.logger.info('Timeseries rebuild completed', {
      userId,
      ...result,
    });

    return {
      ok: true,
      ...result,
    };
  }
);

/**
 * getRecommendations - Obtiene recomendaciones personalizadas para el usuario
 * 
 * @param data.userId - (Opcional) ID del usuario (solo en emulador sin auth)
 * @param data.limit - (Opcional) Número máximo de recomendaciones (default 6, max 10)
 * @param data.horizonDays - (Opcional) Ventana temporal en días (default 14)
 * @returns {items: Recommendation[]}
 * 
 * @example
 * const result = await functions().httpsCallable('getRecommendations')({
 *   limit: 6
 * });
 */
export const getRecommendations = functions.https.onCall(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (data: unknown, context: any) => {
    const payload = data as {
      userId?: string;
      limit?: number;
      horizonDays?: number;
    };
    const { userId: fallbackUserId, limit, horizonDays } = payload;

    // Obtener userId
    const userId = getUserId(context.auth?.uid, fallbackUserId);
    if (!userId) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Authentication required'
      );
    }

    functions.logger.info('Getting recommendations', {
      userId,
      limit,
      horizonDays,
    });

    // Generar recomendaciones
    const recommender = new RulesRecommender();
    const items = await recommender.recommend({
      userId,
      limit,
      horizonDays,
    });

    functions.logger.info('Recommendations generated', {
      userId,
      count: items.length,
    });

    return { items };
  }
);

/**
 * extractAndUpsertGraphForEntry - Extrae y actualiza el grafo para una entrada
 * 
 * Proceso:
 * 1. Lee la entrada
 * 2. Extrae términos y relaciones con text2graph
 * 3. Aplica decay a nodos/edges existentes
 * 4. Inserta/actualiza grafo en Firestore
 * 
 * @param data.entryId - ID de la entrada
 * @param data.userId - (Opcional) ID del usuario (solo en emulador)
 * @returns {ok: boolean, nodeCount: number, edgeCount: number}
 * 
 * @example
 * const result = await functions().httpsCallable('extractAndUpsertGraphForEntry')({
 *   entryId: 'abc123'
 * });
 */
export const extractAndUpsertGraphForEntry = functions.https.onCall(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (data: unknown, context: any) => {
    const payload = data as {
      userId?: string;
      entryId: string;
    };
    const { userId: fallbackUserId, entryId } = payload;

    // Validar entryId
    if (!entryId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'entryId is required'
      );
    }

    // Obtener userId
    const userId = getUserId(context.auth?.uid, fallbackUserId);
    if (!userId) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Authentication required'
      );
    }

    functions.logger.info('Extracting graph for entry', { userId, entryId });

    try {
      // Leer entrada
      const entryRef = userEntriesCol(userId).doc(entryId);
      const entrySnap = await entryRef.get();

      if (!entrySnap.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'Entry not found'
        );
      }

      const entry = entrySnap.data() as JournalEntry;

      // Validar que tenga contenido
      if (!entry.content || entry.content.trim().length === 0) {
        functions.logger.debug('Entry has no content, skipping graph extraction');
        return { ok: true, nodeCount: 0, edgeCount: 0 };
      }

      // Extraer términos y pares
      const extractResult = extractFromEntry({
        title: entry.title || '',
        content: entry.content,
      });

      if (extractResult.terms.length === 0) {
        functions.logger.debug('No terms extracted, skipping');
        return { ok: true, nodeCount: 0, edgeCount: 0 };
      }

      // Convertir a nodos y edges
      const nodes = termsToNodes(extractResult.terms);
      const edges = pairsToEdges(extractResult.pairs);

      // Upsert con decay
      await upsertGraph(userId, nodes, edges, true);

      functions.logger.info('Graph updated successfully', {
        userId,
        entryId,
        nodeCount: nodes.length,
        edgeCount: edges.length,
      });

      return {
        ok: true,
        nodeCount: nodes.length,
        edgeCount: edges.length,
      };
    } catch (error) {
      functions.logger.error('Error extracting graph', {
        userId,
        entryId,
        error,
      });
      throw new functions.https.HttpsError(
        'internal',
        'Failed to extract graph'
      );
    }
  }
);

/**
 * rebuildGraphForUser - Reconstruye el grafo completo de un usuario
 * 
 * Proceso:
 * 1. Itera todas las entradas activas en rango de fechas
 * 2. Extrae términos y relaciones de cada entrada
 * 3. Consolida con decay
 * 4. Actualiza grafo completo
 * 
 * @param data.from - (Opcional) Fecha inicio ISO (ej: '2024-01-01')
 * @param data.to - (Opcional) Fecha fin ISO (ej: '2024-12-31')
 * @param data.userId - (Opcional) ID del usuario (solo en emulador)
 * @returns {ok: boolean, processed: number, nodeCount: number, edgeCount: number}
 * 
 * @example
 * const result = await functions().httpsCallable('rebuildGraphForUser')({
 *   from: '2024-01-01',
 *   to: '2024-12-31'
 * });
 */
export const rebuildGraphForUser = functions.https.onCall(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (data: unknown, context: any) => {
    const payload = data as {
      userId?: string;
      from?: string;
      to?: string;
    };
    const { userId: fallbackUserId, from, to } = payload;

    // Obtener userId
    const userId = getUserId(context.auth?.uid, fallbackUserId);
    if (!userId) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Authentication required'
      );
    }

    functions.logger.info('Starting graph rebuild', {
      userId,
      from: from || 'all',
      to: to || 'all',
    });

    try {
      // Query de entradas activas
      let query = userEntriesCol(userId)
        .where('deleted', '==', false)
        .orderBy('createdAt', 'asc');

      if (from) {
        const fromDate = new Date(from);
        query = query.where('createdAt', '>=', fromDate);
      }

      if (to) {
        const toDate = new Date(to);
        query = query.where('createdAt', '<=', toDate);
      }

      const entriesSnap = await query.get();

      if (entriesSnap.empty) {
        functions.logger.info('No entries found', { userId });
        return { ok: true, processed: 0, nodeCount: 0, edgeCount: 0 };
      }

      functions.logger.info('Processing entries', {
        userId,
        count: entriesSnap.size,
      });

      // Acumuladores para términos y pares
      const allTermsMap = new Map<string, {
        label: string;
        type: 'topic' | 'phrase' | 'emotion';
        weight: number;
      }>();
      const allPairsMap = new Map<string, {
        a: string;
        b: string;
        weight: number;
      }>();

      let processed = 0;

      // Procesar cada entrada
      for (const entryDoc of entriesSnap.docs) {
        const entry = entryDoc.data() as JournalEntry;

        // Validar contenido
        if (!entry.content || entry.content.trim().length === 0) {
          continue;
        }

        try {
          // Extraer términos
          const extractResult = extractFromEntry({
            title: entry.title || '',
            content: entry.content,
          });

          // Acumular términos (sumar pesos)
          for (const term of extractResult.terms) {
            const existing = allTermsMap.get(term.key);
            if (existing) {
              existing.weight += term.weight;
            } else {
              const [type, label] = term.key.split(':');
              allTermsMap.set(term.key, {
                label,
                type: type as 'topic' | 'phrase' | 'emotion',
                weight: term.weight,
              });
            }
          }

          // Acumular pares (sumar pesos)
          for (const pair of extractResult.pairs) {
            const pairKey = `${pair.a}~${pair.b}`;
            const existing = allPairsMap.get(pairKey);
            if (existing) {
              existing.weight += pair.weight;
            } else {
              allPairsMap.set(pairKey, pair);
            }
          }

          processed++;
        } catch (error) {
          functions.logger.error('Error processing entry in rebuild', {
            userId,
            entryId: entryDoc.id,
            error,
          });
          // Continuar con siguiente entrada
        }
      }

      // Convertir mapas a arrays
      const nodes = Array.from(allTermsMap.entries()).map(([id, data]) => ({
        id,
        label: data.label,
        type: data.type,
        delta: Math.max(0.1, data.weight),
      }));

      const edges = Array.from(allPairsMap.values()).map((pair) => ({
        id: `${pair.a}~${pair.b}`,
        source: pair.a,
        target: pair.b,
        delta: Math.max(0.1, pair.weight),
      }));

      // Upsert con decay (consolidar con grafo existente)
      await upsertGraph(userId, nodes, edges, true);

      functions.logger.info('Graph rebuild completed', {
        userId,
        processed,
        nodeCount: nodes.length,
        edgeCount: edges.length,
      });

      return {
        ok: true,
        processed,
        nodeCount: nodes.length,
        edgeCount: edges.length,
      };
    } catch (error) {
      functions.logger.error('Error rebuilding graph', {
        userId,
        error,
      });
      throw new functions.https.HttpsError(
        'internal',
        'Failed to rebuild graph'
      );
    }
  }
);

/**
 * recomputeAll - Recalcula todos los análisis, series y grafo de un usuario
 * 
 * Orquesta 3 pasos:
 * 1. Re-analiza todas las entradas (analyzeUserBatch)
 * 2. Reconstruye series temporales (rebuildTimeseries)
 * 3. Reconstruye grafo de patrones (rebuildGraph)
 * 
 * @param data.userId - (Opcional) ID del usuario (solo en emulador sin auth)
 * @param data.limit - (Opcional) Límite de entradas a procesar (default 500)
 * @returns {ok: boolean, analyzed: number, timeseries: {days, weeks}, graph: {nodes, edges}}
 * 
 * @example
 * const result = await functions().httpsCallable('recomputeAll')({});
 */
export const recomputeAll = functions.https.onCall(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (data: unknown, context: any) => {
    const payload = data as {
      userId?: string;
      limit?: number;
    };
    const { userId: fallbackUserId, limit = 500 } = payload;

    // Obtener userId
    const userId = getUserId(context.auth?.uid, fallbackUserId);
    if (!userId) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Authentication required'
      );
    }

    functions.logger.info('Starting full recompute', {
      userId,
      limit,
    });

    try {
      // 1. Re-analizar entradas (batch)
      functions.logger.info('Step 1: Analyzing entries', { userId });
      const entriesSnap = await userEntriesCol(userId)
        .where('deleted', '==', false)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      let analyzed = 0;
      for (const entryDoc of entriesSnap.docs) {
        try {
          const entry = {
            id: entryDoc.id,
            ...entryDoc.data(),
          } as JournalEntry;

          const { insights, nodes, edges } = await analyzer.analyzeEntry(entry);
          await writeEntryInsights(userId, entryDoc.id, insights);
          await upsertNodes(userId, nodes ?? []);
          await upsertEdges(userId, edges ?? []);
          await upsertForEntry(userId, entry, insights);
          analyzed++;
        } catch (error) {
          functions.logger.error('Error analyzing entry', {
            userId,
            entryId: entryDoc.id,
            error,
          });
          // Continuar con siguiente
        }
      }

      // 2. Reconstruir series temporales
      functions.logger.info('Step 2: Rebuilding timeseries', { userId });
      const timeseriesResult = await rebuildUser(userId, {});

      // 3. Reconstruir grafo
      functions.logger.info('Step 3: Rebuilding graph', { userId });
      // Reutilizar lógica de rebuildGraphForUser
      const query = userEntriesCol(userId)
        .where('deleted', '==', false)
        .orderBy('createdAt', 'asc');

      const graphEntriesSnap = await query.get();
      const allTermsMap = new Map<string, {
        label: string;
        type: 'topic' | 'phrase' | 'emotion';
        weight: number;
      }>();
      const allPairsMap = new Map<string, {
        a: string;
        b: string;
        weight: number;
      }>();

      for (const entryDoc of graphEntriesSnap.docs) {
        const entry = entryDoc.data() as JournalEntry;
        if (!entry.content || entry.content.trim().length === 0) {
          continue;
        }

        try {
          const extractResult = extractFromEntry({
            title: entry.title || '',
            content: entry.content,
          });

          for (const term of extractResult.terms) {
            const existing = allTermsMap.get(term.key);
            if (existing) {
              existing.weight += term.weight;
            } else {
              const [type, label] = term.key.split(':');
              allTermsMap.set(term.key, {
                label: label || term.key,
                type: (type as 'topic' | 'phrase' | 'emotion') || 'topic',
                weight: term.weight,
              });
            }
          }

          for (const pair of extractResult.pairs) {
            const pairId = `${pair.a}~${pair.b}`;
            const existing = allPairsMap.get(pairId);
            if (existing) {
              existing.weight += pair.weight;
            } else {
              allPairsMap.set(pairId, {
                a: pair.a,
                b: pair.b,
                weight: pair.weight,
              });
            }
          }
        } catch (error) {
          functions.logger.error('Error extracting graph data', {
            userId,
            entryId: entryDoc.id,
            error,
          });
        }
      }

      const nodes = Array.from(allTermsMap.entries()).map(([id, data]) => ({
        id,
        label: data.label,
        type: data.type,
        delta: Math.max(0.1, data.weight),
      }));

      const edges = Array.from(allPairsMap.values()).map((pair) => ({
        id: `${pair.a}~${pair.b}`,
        source: pair.a,
        target: pair.b,
        delta: Math.max(0.1, pair.weight),
      }));

      await upsertGraph(userId, nodes, edges, true);

      functions.logger.info('Full recompute completed', {
        userId,
        analyzed,
        timeseries: timeseriesResult,
        graph: { nodes: nodes.length, edges: edges.length },
      });

      return {
        ok: true,
        analyzed,
        timeseries: timeseriesResult,
        graph: { nodeCount: nodes.length, edgeCount: edges.length },
      };
    } catch (error) {
      functions.logger.error('Error in recomputeAll', {
        userId,
        error,
      });
      throw new functions.https.HttpsError(
        'internal',
        'Failed to recompute all data'
      );
    }
  }
);

/**
 * chatRespond - Genera respuesta del asistente de IA conversacional
 * 
 * @param data.conversationId - ID de la conversación
 * @param data.lastUserMessageId - ID del último mensaje del usuario
 * @param data.maxContext - (Opcional) Número máximo de mensajes de contexto (default: 12)
 * @param data.maxChars - (Opcional) Máximo de caracteres de contexto (default: 6000)
 * @param data.userId - (Opcional) ID del usuario (solo en emulador sin auth)
 * @returns {ok: boolean, messageId: string}
 * 
 * @example
 * // Desde la app:
 * const result = await functions().httpsCallable('chatRespond')({
 *   conversationId: 'conv123',
 *   lastUserMessageId: 'msg456'
 * });
 */
export const chatRespond = functions.https.onCall(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (data: unknown, context: any) => {
    const startTime = Date.now();
    const { loadContext } = await import('./chat/context');
    const { MockProvider } = await import('./chat/mockProvider');
    const {
      createAssistantMessage,
      appendToAssistantMessage,
      finalizeAssistantMessage,
      markMessageFailed,
    } = await import('./chat/writer');
    const { db } = await import('./services/firestore');
    const { checkAndConsumeRate } = await import('./guard/rateLimit');
    const { recordSafetyAndCheckAbuse } = await import('./guard/abuse');
    const { recordMetric } = await import('./guard/telemetry');

    const payload = data as {
      userId?: string;
      conversationId: string;
      lastUserMessageId: string;
      maxContext?: number;
      maxChars?: number;
    };

    const {
      userId: fallbackUserId,
      conversationId,
      lastUserMessageId,
      maxContext,
      maxChars,
    } = payload;

    // Validar parámetros requeridos
    if (!conversationId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'conversationId is required'
      );
    }

    if (!lastUserMessageId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'lastUserMessageId is required'
      );
    }

    // Obtener userId
    const userId = getUserId(context.auth?.uid, fallbackUserId);
    if (!userId) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Authentication required'
      );
    }

    functions.logger.info('Chat respond initiated', {
      userId,
      conversationId,
      lastUserMessageId,
    });

    // GUARD 1: Rate limiting
    const rateDecision = await checkAndConsumeRate(userId, conversationId);
    if (!rateDecision.ok) {
      functions.logger.warn('Rate limit exceeded', {
        userId,
        conversationId,
        code: rateDecision.code,
        retryAfterSec: rateDecision.retryAfterSec,
      });

      throw new functions.https.HttpsError(
        'resource-exhausted',
        rateDecision.code,
        {
          code: rateDecision.code,
          retryAfterSec: rateDecision.retryAfterSec,
        }
      );
    }

    // 1) Cargar último mensaje del usuario
    const userMsgSnap = await db
      .doc(
        `journals/${userId}/conversations/${conversationId}/messages/${lastUserMessageId}`
      )
      .get();

    if (!userMsgSnap.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'lastUserMessage not found'
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userText = (userMsgSnap.data() as any)?.content ?? '';

    if (!userText) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'User message content is empty'
      );
    }

    // 2) Cargar contexto de conversación
    const { history } = await loadContext(
      userId,
      conversationId,
      maxContext ?? 12,
      maxChars ?? 6000
    );

    // 3) System prompt
    const system =
      'Eres un asistente de apoyo emocional. ' +
      'Sé empático, breve, no des consejos médicos ni legales. ' +
      'Deriva a ayuda profesional ante riesgo.';

    // 4) Crear placeholder del asistente
    const assistantId = await createAssistantMessage(userId, conversationId);

    functions.logger.info('Assistant message created', {
      userId,
      conversationId,
      assistantId,
    });

    // 5) Invocar provider mock con seguridad
    const provider = new MockProvider();

    try {
      let finalSafety: 'ok' | 'warn' | 'blocked' = 'ok';
      let finalCrisis = false;
      let finalActions: Array<{ type: string; label: string; params?: any }> = [];

      for await (const chunk of provider.respond({
        system,
        history,
        user: userText,
      })) {
        if (chunk.delta) {
          await appendToAssistantMessage(
            userId,
            conversationId,
            assistantId,
            chunk.delta
          );
        }

        if (chunk.safety) {
          finalSafety = chunk.safety;
        }

        if (chunk.crisis) {
          finalCrisis = true;
        }

        if (chunk.actions) {
          finalActions = chunk.actions;
        }

        // Si detectamos blocked, terminamos aquí
        if (chunk.safety === 'blocked') {
          break;
        }
      }

      // 6) Finalizar mensaje
      await finalizeAssistantMessage(
        userId,
        conversationId,
        assistantId,
        finalSafety,
        finalCrisis,
        finalActions
      );

      // GUARD 2: Registrar evento de seguridad y verificar abuso
      const abuseDecision = await recordSafetyAndCheckAbuse(
        userId,
        finalSafety
      );

      // Si se detecta abuso, registrar pero no bloquear mensaje ya enviado
      // El bloqueo aplicará para próximas llamadas
      if (!abuseDecision.ok) {
        functions.logger.warn('Abuse detected, circuit breaker activated', {
          userId,
          conversationId,
          code: abuseDecision.code,
          retryAfterSec: abuseDecision.retryAfterSec,
        });
      }

      // GUARD 3: Telemetría (latencia y eventos de seguridad)
      const latencyMs = Date.now() - startTime;
      await recordMetric(finalSafety, latencyMs);

      functions.logger.info('Chat respond completed', {
        userId,
        conversationId,
        assistantId,
        safety: finalSafety,
        crisis: finalCrisis,
        actionsCount: finalActions.length,
        latencyMs,
      });

      // 7) Actualizar memoria conversacional (checkpoints + slots)
      // Se ejecuta en background sin bloquear la respuesta
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      (async () => {
        try {
          // Obtener texto completo del asistente para memoria
          const assistantMsgSnap = await db
            .doc(
              `journals/${userId}/conversations/${conversationId}/messages/${assistantId}`
            )
            .get();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const assistantText = (assistantMsgSnap.data() as any)?.content ?? '';

          // Checkpoint automático cada 20 mensajes
          await maybeCreateCheckpoint(userId, conversationId);

          // Actualizar slots de perfil del usuario
          await updateSlotsFromTurn(userId, userText + ' ' + assistantText);

          functions.logger.info('Memory updated', { userId, conversationId });
        } catch (memError) {
          functions.logger.error('Error updating memory', {
            userId,
            conversationId,
            error: memError,
          });
          // No lanzamos error para no bloquear la respuesta
        }
      })();

      return {
        ok: true,
        messageId: assistantId,
      };
    } catch (error) {
      // Registrar telemetría de error
      const latencyMs = Date.now() - startTime;
      await recordMetric('blocked', latencyMs);

      // Marcar mensaje como fallido
      await markMessageFailed(
        userId,
        conversationId,
        assistantId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error as any)?.message || 'Unknown error'
      );

      functions.logger.error('Error in chatRespond', {
        userId,
        conversationId,
        error,
        latencyMs,
      });

      throw new functions.https.HttpsError(
        'internal',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error as any)?.message || 'Chat error'
      );
    }
  }
);

/**
 * forceCheckpoint - Fuerza la creación de un checkpoint de memoria
 * 
 * @param data.conversationId - ID de la conversación
 * @param data.lastN - Número de mensajes a incluir (default: 20)
 * @param data.userId - (Opcional) ID del usuario (solo en emulador sin auth)
 * @returns {ok: boolean}
 * 
 * @example
 * // Desde la app:
 * const result = await functions().httpsCallable('forceCheckpoint')({
 *   conversationId: 'conv123',
 *   lastN: 15
 * });
 */
export const forceCheckpoint = functions.https.onCall(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (data: unknown, context: any) => {
    const payload = data as {
      userId?: string;
      conversationId: string;
      lastN?: number;
    };

    const { userId: fallbackUserId, conversationId, lastN = 20 } = payload;

    // Validar conversationId
    if (!conversationId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'conversationId is required'
      );
    }

    // Obtener userId
    const userId = getUserId(context.auth?.uid, fallbackUserId);
    if (!userId) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Authentication required'
      );
    }

    functions.logger.info('Force checkpoint initiated', {
      userId,
      conversationId,
      lastN,
    });

    try {
      await maybeCreateCheckpoint(userId, conversationId, lastN);

      functions.logger.info('Checkpoint created successfully', {
        userId,
        conversationId,
      });

      return {
        ok: true,
      };
    } catch (error) {
      functions.logger.error('Error creating checkpoint', {
        userId,
        conversationId,
        error,
      });

      throw new functions.https.HttpsError(
        'internal',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error as any)?.message || 'Checkpoint creation error'
      );
    }
  }
);

/**
 * generateGraph - Genera el grafo de patrones para un usuario
 * 
 * @param data.userId - (Opcional) ID del usuario (solo en emulador sin auth)
 * @returns {ok: boolean, patternCount: number, edgeCount: number}
 * 
 * @example
 * // Desde la app:
 * const result = await functions().httpsCallable('generateGraph')();
 */
export const generateGraph = functions.https.onCall(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (data: unknown, context: any) => {
    const payload = data as { userId?: string };
    const fallbackUserId = payload?.userId;

    // Obtener userId
    const userId = getUserId(context, fallbackUserId);
    if (!userId) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Usuario no autenticado'
      );
    }

    try {
      functions.logger.info('Generating graph for user', { userId });

      const { generateGraphForUser } = await import('./services/graphGenerator');
      const result = await generateGraphForUser(userId);

      if (!result.success) {
        throw new functions.https.HttpsError(
          'internal',
          result.error || 'Error generando grafo'
        );
      }

      functions.logger.info('Graph generated successfully', {
        userId,
        patternCount: result.patternCount,
        edgeCount: result.edgeCount,
      });

      return {
        ok: true,
        patternCount: result.patternCount,
        edgeCount: result.edgeCount,
      };
    } catch (error) {
      functions.logger.error('Error generating graph', {
        userId,
        error,
      });

      throw new functions.https.HttpsError(
        'internal',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error as any)?.message || 'Graph generation error'
      );
    }
  }
);

