/**
 * @module guestSync
 * @description Sistema de sincronización del outbox de invitado a Firestore
 * 
 * Cuando un usuario invitado inicia sesión, este módulo drena el outbox
 * y sube todas las entradas pendientes a Firestore.
 * 
 * Uso:
 * ```typescript
 * // Después del login exitoso
 * await syncGuestOutbox(userId);
 * ```
 */

import { listGuestDrafts, clearGuestDraft, GuestDraft } from './guestOutbox';
import { createEntry, updateEntry } from './repo';
import { logger } from '@lib/diagnostics/logger';
import { metrics } from '@lib/diagnostics/metrics';

export type SyncResult = {
  total: number;
  synced: number;
  failed: number;
  errors: Array<{ draft: GuestDraft; error: any }>;
};

/**
 * Sincroniza todos los borradores de invitado a Firestore
 * @param userId - UID del usuario autenticado
 * @returns Resultado de la sincronización con contadores
 */
export async function syncGuestOutbox(userId: string): Promise<SyncResult> {
  const items = await listGuestDrafts();
  const result: SyncResult = {
    total: items.length,
    synced: 0,
    failed: 0,
    errors: [],
  };

  if (items.length === 0) {
    logger.info('Guest outbox: empty, nothing to sync', {}, 'sync');
    return result;
  }

  logger.info('Guest outbox: starting sync', { count: items.length }, 'sync');

  for (const item of items) {
    try {
      if (item.kind === 'create') {
        // Crear nueva entrada en Firestore
        const newId = await createEntry(userId, {
          title: item.payload.title || '',
          content: item.payload.content || '',
          mood: item.payload.mood,
          energy: item.payload.energy,
          tags: item.payload.tags || [],
          imageCount: item.payload.imageUris?.length || 0,
          hasAudio: item.payload.hasAudio || false,
          state: 'active' as const,
          isFavorite: false,
        });

        if (newId) {
          await clearGuestDraft(item.localId);
          result.synced++;
          metrics.inc('journal.editor.save.success');
          logger.info('Guest outbox: created entry', { localId: item.localId, newId }, 'sync');
        }
      } else if (item.kind === 'update' && item.entryId) {
        // Actualizar entrada existente en Firestore
        await updateEntry(userId, item.entryId!, {
          title: item.payload.title || '',
          content: item.payload.content || '',
          mood: item.payload.mood,
          energy: item.payload.energy,
          tags: item.payload.tags || [],
          imageCount: item.payload.imageUris?.length || 0,
          hasAudio: item.payload.hasAudio || false,
          isFavorite: item.payload.isFavorite || false,
        });

        await clearGuestDraft(item.localId);
        result.synced++;
        metrics.inc('journal.editor.save.success');
        logger.info('Guest outbox: updated entry', { localId: item.localId, entryId: item.entryId }, 'sync');
      }
    } catch (error) {
      // Error al sincronizar este item - dejar en outbox para retry
      result.failed++;
      result.errors.push({ draft: item, error });
      logger.error('Guest outbox: sync failed for item', { 
        error, 
        localId: item.localId, 
        kind: item.kind 
      }, 'sync');
    }
  }

  logger.info('Guest outbox: sync completed', {
    total: result.total,
    synced: result.synced,
    failed: result.failed,
  }, 'sync');

  return result;
}

/**
 * Intenta sincronizar el outbox con reintentos
 * Útil para casos donde la red puede estar intermitente
 */
export async function syncGuestOutboxWithRetry(
  userId: string, 
  maxRetries: number = 3
): Promise<SyncResult> {
  let lastResult: SyncResult = { total: 0, synced: 0, failed: 0, errors: [] };
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    lastResult = await syncGuestOutbox(userId);
    
    // Si todo se sincronizó o no hay más items, terminar
    if (lastResult.failed === 0 || lastResult.total === 0) {
      break;
    }
    
    // Esperar antes del siguiente reintento (backoff exponencial)
    if (attempt < maxRetries) {
      const delayMs = Math.min(1000 * Math.pow(2, attempt), 10000); // max 10s
      logger.info('Guest outbox: retrying sync', { 
        attempt, 
        maxRetries, 
        delayMs 
      }, 'sync');
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return lastResult;
}

/**
 * Hook de utilidad para sincronizar después del login
 * Llama a esto desde tu flujo de autenticación
 */
export async function onUserLogin(userId: string): Promise<void> {
  try {
    logger.info('User logged in: starting outbox sync', { userId }, 'sync');
    const result = await syncGuestOutboxWithRetry(userId);
    
    if (result.synced > 0) {
      logger.info('User logged in: sync successful', {
        synced: result.synced,
        failed: result.failed,
      }, 'sync');
    }
    
    if (result.failed > 0) {
      logger.warn('User logged in: some items failed to sync', {
        failed: result.failed,
      }, 'sync');
    }
  } catch (error) {
    logger.error('User logged in: outbox sync error', { error }, 'sync');
  }
}
