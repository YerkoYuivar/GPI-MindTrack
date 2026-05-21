/**
 * @module syncLocalEntries
 * @description Sincroniza entradas locales (borradores) a Firestore cuando el usuario inicia sesión
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@lib/firebase';
import type { DraftEntry } from './types';
import { logger } from '@lib/diagnostics/logger';

const DRAFT_KEY_PREFIX = 'ej.draft.';
const SYNC_STATUS_KEY = 'ej.sync.lastSyncTime';

/**
 * Lista todos los borradores locales
 */
async function listAllLocalDrafts(): Promise<Array<{ key: string; draft: DraftEntry }>> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const draftKeys = allKeys.filter(k => k.startsWith(DRAFT_KEY_PREFIX));
    
    const drafts: Array<{ key: string; draft: DraftEntry }> = [];
    
    for (const key of draftKeys) {
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        try {
          const draft = JSON.parse(raw) as DraftEntry;
          // Solo incluir borradores con contenido válido
          if (draft.content?.trim() || draft.title?.trim()) {
            drafts.push({ key, draft });
          }
        } catch (error) {
          logger.warn('Invalid draft JSON, skipping', { key }, 'sync');
        }
      }
    }
    
    return drafts;
  } catch (error) {
    logger.error('Failed to list local drafts', { error }, 'sync');
    return [];
  }
}

/**
 * Sincroniza una entrada local a Firestore
 */
async function syncDraftToFirestore(
  userId: string,
  draftKey: string,
  draft: DraftEntry
): Promise<boolean> {
  try {
    // Extraer entryId del key o generar uno nuevo
    const keyPart = draftKey.replace(DRAFT_KEY_PREFIX, '');
    const entryId = keyPart === 'new' ? doc(collection(db, 'entries')).id : keyPart;
    
    const entryRef = doc(db, 'entries', entryId);
    
    // Construir el documento de entrada
    const entryData = {
      userId,
      title: draft.title || 'Sin título',
      content: draft.content || '',
      mood: draft.mood ?? null,
      energy: draft.energy ?? null,
      tags: draft.tags || [],
      imageCount: draft.imageUris?.length || 0,
      imageUris: draft.imageUris || [],
      hasAudio: draft.hasAudio || false,
      isFavorite: false,
      isArchived: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    await setDoc(entryRef, entryData);
    
    logger.info('Synced draft to Firestore', { entryId, draftKey }, 'sync');
    return true;
  } catch (error) {
    logger.error('Failed to sync draft', { draftKey, error }, 'sync');
    return false;
  }
}

/**
 * Sincroniza todas las entradas locales a Firestore
 * 
 * @param userId - ID del usuario autenticado
 * @returns Número de entradas sincronizadas exitosamente
 */
export async function syncLocalEntriesToFirestore(userId: string): Promise<number> {
  try {
    logger.info('Starting local entries sync', { userId }, 'sync');
    
    // Listar todos los borradores locales
    const drafts = await listAllLocalDrafts();
    
    if (drafts.length === 0) {
      logger.info('No local drafts to sync', {}, 'sync');
      return 0;
    }
    
    logger.info('Found local drafts', { count: drafts.length }, 'sync');
    
    // Sincronizar cada borrador
    let syncedCount = 0;
    const failedKeys: string[] = [];
    
    for (const { key, draft } of drafts) {
      const success = await syncDraftToFirestore(userId, key, draft);
      
      if (success) {
        syncedCount++;
        // Eliminar el borrador local después de sincronizar exitosamente
        try {
          await AsyncStorage.removeItem(key);
          logger.debug('Removed synced draft', { key }, 'sync');
        } catch (removeError) {
          logger.warn('Failed to remove synced draft', { key, error: removeError }, 'sync');
        }
      } else {
        failedKeys.push(key);
      }
    }
    
    // Actualizar timestamp de última sincronización
    await AsyncStorage.setItem(SYNC_STATUS_KEY, Date.now().toString());
    
    logger.info('Sync completed', { 
      total: drafts.length, 
      synced: syncedCount, 
      failed: failedKeys.length 
    }, 'sync');
    
    return syncedCount;
  } catch (error) {
    logger.error('Sync process failed', { userId, error }, 'sync');
    return 0;
  }
}

/**
 * Verifica si hay entradas locales pendientes de sincronización
 */
export async function hasLocalEntries(): Promise<boolean> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const draftKeys = allKeys.filter(k => k.startsWith(DRAFT_KEY_PREFIX));
    return draftKeys.length > 0;
  } catch (error) {
    logger.error('Failed to check local entries', { error }, 'sync');
    return false;
  }
}

/**
 * Obtiene la última fecha de sincronización
 */
export async function getLastSyncTime(): Promise<number | null> {
  try {
    const time = await AsyncStorage.getItem(SYNC_STATUS_KEY);
    return time ? parseInt(time, 10) : null;
  } catch (error) {
    logger.error('Failed to get last sync time', { error }, 'sync');
    return null;
  }
}
