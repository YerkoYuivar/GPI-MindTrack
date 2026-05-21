/**
 * @module useHybridJournalList
 * @description Hook que combina entradas de Firestore con borradores locales
 * 
 * Comportamiento:
 * - Sin usuario: muestra solo borradores locales de AsyncStorage
 * - Con usuario: muestra entradas de Firestore + borradores locales no sincronizados
 * - Merge inteligente: evita duplicados, ordena por fecha
 * - Indicadores: marca entradas locales con flag `isLocal`
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCurrentUser } from '@components/auth/AuthGate';
import { useJournalListPaged } from './hooks';
import type { JournalListItem, DraftEntry } from './types';
import { logger } from '@lib/diagnostics/logger';

const DRAFT_KEY_PREFIX = 'ej.draft.';

export type HybridEntry = JournalListItem & {
  isLocal?: boolean;        // true si es borrador local no sincronizado
  localDraftKey?: string;   // key de AsyncStorage si aplica
};

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
        } catch {
          // Skip invalid JSON
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
 * Convierte un DraftEntry a HybridEntry (formato de lista)
 */
function draftToHybridEntry(key: string, draft: DraftEntry): HybridEntry {
  // Extraer entryId del key (ej: "ej.draft.abc123" -> "abc123")
  const entryId = key.replace(DRAFT_KEY_PREFIX, '') || 'local-' + Date.now();
  
  // Crear excerpt (primeras 100 chars del content)
  const excerpt = draft.content ? draft.content.slice(0, 100) : '';
  
  return {
    id: entryId,
    title: draft.title,
    excerpt,
    createdAt: Date.now(), // Timestamp actual como fallback
    mood: draft.mood,
    energy: draft.energy,
    tags: draft.tags || [],
    imageCount: draft.imageUris?.length || 0,
    hasAudio: draft.hasAudio || false,
    isFavorite: false,
    isLocal: true,
    localDraftKey: key,
  };
}

/**
 * Hook híbrido que combina Firestore + AsyncStorage
 */
export function useHybridJournalList() {
  const user = useCurrentUser();
  const [localEntries, setLocalEntries] = useState<HybridEntry[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(true);
  
  // Hook de Firestore (funciona incluso sin usuario, pero no carga datos)
  const {
    items: firestoreItems,
    loading: loadingFirestore,
    loadMore,
    refresh: refreshFirestore,
    reachedEnd,
  } = useJournalListPaged(20);

  /**
   * Cargar borradores locales de AsyncStorage
   */
  const loadLocalDrafts = useCallback(async () => {
    setLoadingLocal(true);
    try {
      const drafts = await listAllLocalDrafts();
      const entries = drafts.map(({ key, draft }) => draftToHybridEntry(key, draft));
      
      // Filtrar drafts vacíos (sin excerpt ni mood)
      const validEntries = entries.filter(
        e => e.excerpt.trim().length > 0 || e.mood !== undefined
      );
      
      setLocalEntries(validEntries);
      logger.debug('Loaded local drafts', { count: validEntries.length }, 'journal');
    } catch (error) {
      logger.error('Failed to load local drafts', { error }, 'journal');
      setLocalEntries([]);
    } finally {
      setLoadingLocal(false);
    }
  }, []);

  /**
   * Cargar borradores al montar o cuando cambia el usuario
   */
  useEffect(() => {
    loadLocalDrafts();
  }, [loadLocalDrafts, user]);

  /**
   * Merge: combinar Firestore + Local, evitando duplicados
   */
  const mergedItems = useCallback((): HybridEntry[] => {
    if (!user) {
      // Modo invitado: solo locales
      return [...localEntries].sort((a, b) => b.createdAt - a.createdAt);
    }

    // Modo autenticado: Firestore + locales no duplicados
    const firestoreIds = new Set(firestoreItems.map((item: JournalListItem) => item.id));
    
    // Filtrar locales que NO están en Firestore (aún no sincronizados)
    const unsyncedLocal = localEntries.filter(local => {
      const localId = local.localDraftKey?.replace(DRAFT_KEY_PREFIX, '');
      return localId && !firestoreIds.has(localId);
    });

    // Combinar y ordenar por fecha
    const combined: HybridEntry[] = [
      ...firestoreItems.map((item: JournalListItem) => ({ ...item, isLocal: false } as HybridEntry)),
      ...unsyncedLocal,
    ];

    return combined.sort((a, b) => b.createdAt - a.createdAt);
  }, [user, firestoreItems, localEntries]);

  /**
   * Refresh: recargar tanto Firestore como locales
   */
  const refresh = useCallback(async () => {
    await Promise.all([
      refreshFirestore(),
      loadLocalDrafts(),
    ]);
  }, [refreshFirestore, loadLocalDrafts]);

  const loading = loadingLocal || (user ? loadingFirestore : false);
  const items = mergedItems();

  // Mostrar banner solo si NO está autenticado y tiene borradores locales
  const showLocalBanner = !user && localEntries.length > 0;

  return {
    items,
    loading,
    loadingMore: false, // Por ahora no implementamos loadingMore en el híbrido
    loadingLocal,
    loadingFirestore: user ? loadingFirestore : false,
    loadMore: user ? loadMore : () => {}, // Paginación solo para Firestore
    refresh,
    reachedEnd: user ? reachedEnd : true, // En modo local no hay paginación
    hasLocalDrafts: showLocalBanner,
    localCount: localEntries.length,
    firestoreCount: firestoreItems.length,
  };
}
