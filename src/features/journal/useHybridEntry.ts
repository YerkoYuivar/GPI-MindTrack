/**
 * @module useHybridEntry
 * @description Hook que carga una entrada desde Firestore o AsyncStorage según su origen
 * 
 * Comportamiento:
 * - Si entryId empieza con 'local-': carga desde AsyncStorage (draft local)
 * - Si no: carga desde Firestore (entrada sincronizada)
 * 
 * Permite ver entradas locales en JournalDetailScreen sin errores.
 */

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEntry } from './hooks';
import { loadDraft } from './drafts';
import type { JournalEntry, DraftEntry } from './types';
import { logger } from '@lib/diagnostics/logger';

const DRAFT_KEY_PREFIX = 'ej.draft.';

export type HybridEntryData = (JournalEntry & { id: string }) & {
  isLocal?: boolean;
};

/**
 * Convierte un DraftEntry a formato JournalEntry para visualización
 */
function draftToEntry(id: string, draft: DraftEntry): HybridEntryData {
  return {
    id,
    title: draft.title || '',
    content: draft.content,
    mood: draft.mood,
    energy: draft.energy,
    tags: draft.tags || [],
    createdAt: new Date(), // Aproximación - no tenemos fecha en draft
    updatedAt: new Date(),
    isFavorite: false,
    state: 'active',
    imageCount: draft.imageCount || 0,
    hasAudio: draft.hasAudio || false,
    isLocal: true, // Marcador de entrada local
  };
}

/**
 * Hook que carga entrada desde Firestore o AsyncStorage según origen
 */
export function useHybridEntry(entryId: string) {
  const isLocalEntry = entryId.startsWith('local-');
  
  // Hook de Firestore (solo se usa si NO es local)
  const { data: firestoreData, loading: firestoreLoading } = useEntry(entryId);
  
  // Estado para draft local
  const [localData, setLocalData] = useState<HybridEntryData | null>(null);
  const [localLoading, setLocalLoading] = useState(false);

  // Cargar desde AsyncStorage si es entrada local
  useEffect(() => {
    if (!isLocalEntry) {
      // No es local, usar Firestore
      return;
    }

    const loadLocal = async () => {
      setLocalLoading(true);
      try {
        const draft = await loadDraft(entryId);
        
        if (draft) {
          setLocalData(draftToEntry(entryId, draft));
          logger.debug('Loaded local entry for detail', { entryId }, 'journal');
        } else {
          logger.warn('Local entry not found', { entryId }, 'journal');
          setLocalData(null);
        }
      } catch (error) {
        logger.error('Failed to load local entry', { error, entryId }, 'journal');
        setLocalData(null);
      } finally {
        setLocalLoading(false);
      }
    };

    loadLocal();
  }, [entryId, isLocalEntry]);

  // Retornar datos según origen
  if (isLocalEntry) {
    return {
      data: localData,
      loading: localLoading,
      isLocal: true,
    };
  } else {
    return {
      data: firestoreData,
      loading: firestoreLoading,
      isLocal: false,
    };
  }
}
