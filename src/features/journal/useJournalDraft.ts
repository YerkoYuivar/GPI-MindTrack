/**
 * @module useJournalDraft
 * @description Hook para gestión de drafts con autosave local y guardado remoto
 * - Precarga desde Firestore en modo edición
 * - Autosave local con debounce (~600ms)
 * - Guardado remoto (create/update) con feedback
 * - Offline-friendly: mantiene draft local si falla guardado remoto
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { JournalStackParamList } from '@navigation/types';
import { useEntry, useCreateEntry, useUpdateEntry } from './hooks';
import { loadDraft, saveDraft, clearDraft, createEmptyDraft } from './drafts';
import { addGuestDraft } from './guestOutbox';
import { useCurrentUser } from '@components/auth/AuthGate';
import { logger } from '@lib/diagnostics/logger';
import type { DraftEntry } from './types';

type LoadState = 'idle' | 'loading' | 'ready';

const AUTOSAVE_DEBOUNCE_MS = 600;

export function useJournalDraft(entryId?: string) {
  const navigation = useNavigation<NativeStackNavigationProp<JournalStackParamList>>();
  const user = useCurrentUser();
  
  // Estado del draft
  const [draft, setDraftState] = useState<DraftEntry>(createEmptyDraft());
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [isDirty, setIsDirty] = useState(false);
  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | undefined>();

  // Refs para debounce
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadRef = useRef(false);

  // Hooks de operaciones remotas
  const { data: remoteEntry, loading: loadingRemote } = useEntry(entryId || '');
  const { create, pending: pendingCreate } = useCreateEntry();
  const { update, pending: pendingUpdate } = useUpdateEntry();

  const isSavingRemote = pendingCreate || pendingUpdate;

  /**
   * Carga inicial del draft
   */
  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;

    const initialize = async () => {
      setLoadState('loading');

      // Cargar draft local
      const localDraft = await loadDraft(entryId);

      // En modo edición, esperar datos remotos
      if (entryId && remoteEntry) {
        // Priorizar local si existe, si no usar remoto
        if (localDraft && localDraft.content.trim().length > 0) {
          setDraftState(localDraft);
        } else {
          // Inicializar desde remoto
          const remoteDraft: DraftEntry = {
            title: remoteEntry.title,
            content: remoteEntry.content,
            mood: remoteEntry.mood,
            energy: remoteEntry.energy,
            tags: remoteEntry.tags || [],
            imageUris: [],  // Las URIs locales no se recuperan desde Firestore
            hasAudio: remoteEntry.hasAudio || false,
          };
          setDraftState(remoteDraft);
        }
        setLoadState('ready');
      } else if (!entryId) {
        // Modo nuevo: usar local o vacío
        setDraftState(localDraft || createEmptyDraft());
        setLoadState('ready');
      } else {
        // Esperando datos remotos
        setLoadState('loading');
      }
    };

    initialize();
  }, [entryId, remoteEntry]);

  /**
   * Actualizar draft con merge patch y trigger autosave
   */
  const setDraft = useCallback(
    (patch: Partial<DraftEntry>) => {
      setDraftState((prev) => {
        const next = { ...prev, ...patch };
        
        // Trigger autosave con debounce
        setIsSavingLocal(true);
        setIsDirty(true);

        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
        }

        saveTimerRef.current = setTimeout(async () => {
          const success = await saveDraft(entryId, next);
          if (success) {
            setLastSavedAt(Date.now());
          }
          setIsSavingLocal(false);
        }, AUTOSAVE_DEBOUNCE_MS);

        return next;
      });
    },
    [entryId]
  );

  /**
   * Guardar draft en Firestore (create o update)
   * En modo invitado, guarda solo localmente y agrega al outbox
   */
  const saveRemote = useCallback(async () => {
    // Validación mínima
    const isValid = draft.content.trim().length > 0 || draft.mood !== undefined;
    if (!isValid) {
      console.warn('[useJournalDraft] Cannot save: content empty and no mood');
      return;
    }

    // 🎭 MODO INVITADO: Guardar solo localmente y registrar en outbox
    if (!user) {
      try {
        // Si es nuevo draft (sin ID), generar ID único persistente
        const finalId = entryId || `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Guardar draft en AsyncStorage con ID único
        await saveDraft(finalId, draft);
        
        // Si era "new", limpiar el draft temporal
        if (!entryId) {
          await clearDraft(); // Limpia draft:new
        }
        
        // Registrar en outbox para sincronización futura
        await addGuestDraft({
          localId: finalId,
          kind: entryId ? 'update' : 'create',
          entryId: entryId,
          payload: draft,
          savedAt: Date.now(),
        });
        
        // Actualizar estado de UI
        setIsDirty(false);
        setLastSavedAt(Date.now());
        
        logger.info('Guest mode: saved locally, queued for sync', { 
          entryId: finalId,
          kind: entryId ? 'update' : 'create'
        }, 'journal');
        
        // Navegar de vuelta a la lista para ver la entrada guardada
        navigation.navigate('JournalList');
        
        // No lanzar error - es éxito local
        return;
      } catch (error) {
        logger.error('Guest mode: local save failed', { error, entryId: entryId || 'new' }, 'journal');
        throw error;
      }
    }

    // 🔐 MODO AUTENTICADO: Flujo remoto normal
    try {
      if (!entryId) {
        // Modo crear
        const newId = await create({
          title: draft.title || '',
          content: draft.content,
          mood: draft.mood,
          energy: draft.energy,
          tags: draft.tags,
          imageCount: draft.imageUris?.length || 0,
          hasAudio: draft.hasAudio || false,
        });

        if (newId) {
          // Limpiar draft local y navegar al detalle
          await clearDraft();
          setIsDirty(false);
          navigation.replace('JournalDetail', { entryId: newId });
        }
      } else {
        // Modo editar
        await update(entryId, {
          title: draft.title || '',
          content: draft.content,
          mood: draft.mood,
          energy: draft.energy,
          tags: draft.tags,
          imageCount: draft.imageUris?.length || 0,
          hasAudio: draft.hasAudio || false,
        });

        // Limpiar draft local y marcar como guardado
        await clearDraft(entryId);
        setIsDirty(false);
        setLastSavedAt(Date.now());
      }
    } catch (error) {
      // Error de red: mantener draft local
      console.error('[useJournalDraft] Error saving remote:', error);
      logger.error('Authenticated mode: remote save failed', { error, entryId: entryId || 'new' }, 'journal');
      // El draft local se mantiene intacto para retry posterior
      throw error; // Re-throw para que el componente maneje el error
    }
  }, [draft, entryId, create, update, navigation, user]);

  /**
   * Descartar draft local
   */
  const discardLocal = useCallback(async () => {
    await clearDraft(entryId);
    setDraftState(createEmptyDraft());
    setIsDirty(false);
    setLastSavedAt(undefined);
  }, [entryId]);

  /**
   * Cleanup: cancelar timer pendiente
   */
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  return {
    draft,
    setDraft,
    isDirty,
    isSavingLocal,
    isSavingRemote,
    lastSavedAt,
    saveRemote,
    discardLocal,
    loadState,
  };
}
