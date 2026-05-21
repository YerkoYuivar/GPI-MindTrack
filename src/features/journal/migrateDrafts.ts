/**
 * @module migrateDrafts
 * @description Migración automática de entradas locales a Firestore
 * 
 * Cuando un usuario se autentica, todas las entradas guardadas localmente
 * en AsyncStorage deben subirse a Firestore y asociarse con su userId.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createEntry } from './repo';
import type { DraftEntry } from './types';
import { logger } from '@lib/diagnostics/logger';

const DRAFT_KEY_PREFIX = 'ej.draft.';
const MIGRATION_FLAG_KEY = 'ej.migration.completed';

/**
 * Lista todos los drafts locales de AsyncStorage
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
          drafts.push({ key, draft });
        } catch (err) {
          logger.warn('Invalid draft JSON', { key, error: err }, 'journal');
        }
      }
    }
    
    return drafts;
  } catch (error) {
    logger.error('Failed to list local drafts', { error }, 'journal');
    return [];
  }
}

/**
 * Convierte un DraftEntry a formato de entrada de Firestore
 */
function draftToEntryPayload(draft: DraftEntry) {
  return {
    title: draft.title,
    content: draft.content || '',
    mood: draft.mood,
    energy: draft.energy,
    tags: draft.tags || [],
    isFavorite: false,
    state: 'active' as const,
    wordCount: draft.content ? draft.content.split(/\s+/).filter(w => w.length > 0).length : 0,
    imageCount: draft.imageUris?.length || 0,
    hasAudio: draft.hasAudio || false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Migra todas las entradas locales a Firestore
 * 
 * @param userId - UID del usuario autenticado
 * @returns Número de entradas migradas exitosamente
 */
export async function migrateLocalDraftsToFirestore(userId: string): Promise<number> {
  try {
    logger.info('Starting migration of local drafts to Firestore', { userId }, 'journal');
    
    // Obtener todos los drafts locales
    const localDrafts = await listAllLocalDrafts();
    
    if (localDrafts.length === 0) {
      logger.info('No local drafts to migrate', { userId }, 'journal');
      return 0;
    }

    // Filtrar drafts válidos (con contenido o mood)
    const validDrafts = localDrafts.filter(
      ({ draft }) => (draft.content && draft.content.trim().length > 0) || draft.mood !== undefined
    );

    if (validDrafts.length === 0) {
      logger.info('No valid drafts to migrate (all empty)', { userId, total: localDrafts.length }, 'journal');
      // Limpiar drafts vacíos
      await Promise.all(localDrafts.map(({ key }) => AsyncStorage.removeItem(key)));
      return 0;
    }

    logger.debug('Found valid drafts to migrate', { count: validDrafts.length }, 'journal');

    // Migrar cada draft a Firestore
    let migratedCount = 0;
    const errors: string[] = [];

    for (const { key, draft } of validDrafts) {
      try {
        const payload = draftToEntryPayload(draft);
        const entryId = await createEntry(userId, payload);
        
        // ✅ Solo eliminar draft local SI la migración fue exitosa
        if (entryId) {
          await AsyncStorage.removeItem(key);
          logger.debug('Migrated draft to Firestore', { key, entryId }, 'journal');
          migratedCount++;
        } else {
          logger.warn('createEntry returned no ID, keeping local draft', { key }, 'journal');
          errors.push(key);
        }
      } catch (error) {
        logger.error('Failed to migrate draft', { key, error }, 'journal');
        errors.push(key);
      }
    }

    // ✅ Solo marcar como completado si NO hubo errores
    if (errors.length === 0) {
      await AsyncStorage.setItem(MIGRATION_FLAG_KEY, userId);
      logger.info('Migration completed successfully', { 
        userId, 
        migratedCount, 
        total: validDrafts.length 
      }, 'journal');
    } else {
      logger.warn('Migration completed with errors', { 
        userId, 
        migratedCount, 
        failedCount: errors.length,
        total: validDrafts.length,
        failedKeys: errors
      }, 'journal');
    }

    return migratedCount;
  } catch (error) {
    logger.error('Migration failed', { userId, error }, 'journal');
    throw error;
  }
}

/**
 * Verifica si ya se completó la migración para un usuario
 */
export async function isMigrationCompleted(userId: string): Promise<boolean> {
  try {
    const lastMigratedUserId = await AsyncStorage.getItem(MIGRATION_FLAG_KEY);
    return lastMigratedUserId === userId;
  } catch {
    return false;
  }
}

/**
 * Reinicia el flag de migración (útil para desarrollo/testing)
 */
export async function resetMigrationFlag(): Promise<void> {
  await AsyncStorage.removeItem(MIGRATION_FLAG_KEY);
  logger.debug('Migration flag reset', {}, 'journal');
}
