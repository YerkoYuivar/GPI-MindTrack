/**
 * @module guestOutbox
 * @description Sistema de "outbox" para guardar borradores de usuarios no autenticados
 * 
 * Cuando un usuario invitado crea/edita entradas, estas se guardan:
 * 1. Localmente en AsyncStorage (borrador)
 * 2. En el outbox (cola de sincronización)
 * 
 * Al iniciar sesión, el outbox se drena y las entradas se suben a Firestore.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'ej.guest.outbox.v1';

export type GuestDraft = {
  localId: string;        // p.ej. 'new' o un uuid
  kind: 'create' | 'update';
  entryId?: string;       // si era edición
  payload: any;           // DraftEntry serializable
  savedAt: number;        // Date.now()
};

/**
 * Agrega un borrador al outbox de invitado
 * Si ya existe uno con el mismo localId+kind+entryId, actualiza el payload
 */
export async function addGuestDraft(item: GuestDraft): Promise<void> {
  try {
    const raw = (await AsyncStorage.getItem(KEY)) || '[]';
    const arr = JSON.parse(raw) as GuestDraft[];
    
    // Evita duplicar por localId+kind+entryId
    const existingIndex = arr.findIndex(
      i => i.localId === item.localId && i.kind === item.kind && i.entryId === item.entryId
    );
    
    if (existingIndex === -1) {
      // No existe, agregar al inicio
      arr.unshift(item);
    } else {
      // Ya existe, actualizar con última versión
      arr[existingIndex].payload = item.payload;
      arr[existingIndex].savedAt = item.savedAt;
    }
    
    // Limitar a 100 items más recientes
    await AsyncStorage.setItem(KEY, JSON.stringify(arr.slice(0, 100)));
  } catch (error) {
    console.error('[guestOutbox] Error adding draft:', error);
    throw error;
  }
}

/**
 * Lista todos los borradores pendientes en el outbox
 */
export async function listGuestDrafts(): Promise<GuestDraft[]> {
  try {
    const raw = (await AsyncStorage.getItem(KEY)) || '[]';
    return JSON.parse(raw) as GuestDraft[];
  } catch (error) {
    console.error('[guestOutbox] Error listing drafts:', error);
    return [];
  }
}

/**
 * Elimina un borrador del outbox (después de sincronizarlo exitosamente)
 */
export async function clearGuestDraft(localId: string): Promise<void> {
  try {
    const raw = (await AsyncStorage.getItem(KEY)) || '[]';
    const arr = (JSON.parse(raw) as GuestDraft[]).filter(i => i.localId !== localId);
    await AsyncStorage.setItem(KEY, JSON.stringify(arr));
  } catch (error) {
    console.error('[guestOutbox] Error clearing draft:', error);
    throw error;
  }
}

/**
 * Limpia todo el outbox (útil después de sincronización completa)
 */
export async function clearAllGuestDrafts(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (error) {
    console.error('[guestOutbox] Error clearing all drafts:', error);
    throw error;
  }
}

/**
 * Cuenta cuántos borradores hay pendientes
 */
export async function countGuestDrafts(): Promise<number> {
  try {
    const drafts = await listGuestDrafts();
    return drafts.length;
  } catch {
    return 0;
  }
}
