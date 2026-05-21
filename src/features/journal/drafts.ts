/**
 * @module drafts
 * @description Gestión de borradores locales con AsyncStorage
 * - Autosave local de drafts (nuevo o edición)
 * - Persistencia por clave: ej.draft.new o ej.draft.{entryId}
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DraftEntry } from './types';

const DRAFT_KEY_PREFIX = 'ej.draft.';
const KEY_NEW = `${DRAFT_KEY_PREFIX}new`;

/**
 * Genera la clave de almacenamiento para un draft
 * @param entryId - ID de entrada (undefined para draft nuevo)
 * @returns Clave de AsyncStorage
 */
export const draftKey = (entryId?: string): string => {
  return entryId ? `${DRAFT_KEY_PREFIX}${entryId}` : KEY_NEW;
};

/**
 * Carga un draft desde AsyncStorage
 * @param entryId - ID de entrada (undefined para draft nuevo)
 * @returns Draft o null si no existe
 */
export async function loadDraft(entryId?: string): Promise<DraftEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(draftKey(entryId));
    if (!raw) return null;
    return JSON.parse(raw) as DraftEntry;
  } catch (error) {
    console.error('[drafts] Error loading draft:', error);
    return null;
  }
}

/**
 * Guarda un draft en AsyncStorage
 * @param entryId - ID de entrada (undefined para draft nuevo)
 * @param draft - Contenido del draft
 * @returns true si se guardó correctamente
 */
export async function saveDraft(
  entryId: string | undefined,
  draft: DraftEntry
): Promise<boolean> {
  try {
    await AsyncStorage.setItem(draftKey(entryId), JSON.stringify(draft));
    return true;
  } catch (error) {
    console.error('[drafts] Error saving draft:', error);
    return false;
  }
}

/**
 * Elimina un draft de AsyncStorage
 * @param entryId - ID de entrada (undefined para draft nuevo)
 */
export async function clearDraft(entryId?: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(draftKey(entryId));
  } catch (error) {
    console.error('[drafts] Error clearing draft:', error);
  }
}

/**
 * Crea un draft vacío
 * @returns Draft vacío con valores por defecto
 */
export function createEmptyDraft(): DraftEntry {
  return {
    title: '',
    content: '',
    mood: undefined,
    energy: undefined,
    tags: [],
    imageCount: 0,
    hasAudio: false,
  };
}
