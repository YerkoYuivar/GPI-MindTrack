/**
 * Hook de búsqueda local con índice invertido
 * 
 * Proporciona API para construir índice, consultar y obtener
 * resultados con snippets resaltados.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  LocalIndexStore,
  IndexedEntry,
  buildIndex,
  mergeIndex,
  queryIndex,
  loadIndexFromStorage,
  saveIndexToStorage,
  clearIndexFromStorage,
  normalize,
  tokenize,
  shouldRebuildIndex,
} from './localIndex';

// ========================================
// TIPOS
// ========================================

export type SearchHit = {
  id: string;
  score: number;
  title: string;
  snippet: string;    // extracto con términos resaltados
  createdAt: number;
};

type IndexState = 'idle' | 'loading' | 'ready' | 'error';

// ========================================
// UTILIDADES DE RESALTADO
// ========================================

/**
 * Genera snippet de texto con términos de búsqueda resaltados
 * usando marcadores [[ y ]]
 */
function generateSnippet(
  text: string,
  searchTerms: string[],
  maxLength: number = 160
): string {
  if (!text || searchTerms.length === 0) {
    return text?.slice(0, maxLength) || '';
  }

  const normalized = normalize(text);
  const tokens = searchTerms.flatMap(term => tokenize(term));
  
  if (tokens.length === 0) {
    return text.slice(0, maxLength);
  }

  // Encontrar primera coincidencia para centrar el snippet
  let firstMatchIndex = -1;
  let matchedToken = '';
  
  for (const token of tokens) {
    const index = normalized.indexOf(token);
    if (index !== -1 && (firstMatchIndex === -1 || index < firstMatchIndex)) {
      firstMatchIndex = index;
      matchedToken = token;
    }
  }

  let startIndex = 0;
  let endIndex = text.length;

  // Si hay coincidencia, centrar snippet alrededor de ella
  if (firstMatchIndex !== -1) {
    const contextBefore = 40;
    const contextAfter = maxLength - contextBefore;
    
    startIndex = Math.max(0, firstMatchIndex - contextBefore);
    endIndex = Math.min(text.length, firstMatchIndex + matchedToken.length + contextAfter);
    
    // Ajustar al inicio de palabra si es posible
    if (startIndex > 0) {
      const spaceIndex = text.lastIndexOf(' ', startIndex + 10);
      if (spaceIndex > startIndex) {
        startIndex = spaceIndex + 1;
      }
    }
    
    // Ajustar al final de palabra si es posible
    if (endIndex < text.length) {
      const spaceIndex = text.indexOf(' ', endIndex - 10);
      if (spaceIndex !== -1 && spaceIndex < endIndex + 20) {
        endIndex = spaceIndex;
      }
    }
  } else {
    endIndex = Math.min(maxLength, text.length);
  }

  let snippet = text.slice(startIndex, endIndex);
  
  // Agregar elipsis
  if (startIndex > 0) snippet = '...' + snippet;
  if (endIndex < text.length) snippet = snippet + '...';

  // Resaltar términos
  snippet = highlightTerms(snippet, tokens);

  return snippet;
}

/**
 * Resalta términos en texto usando marcadores [[ y ]]
 */
function highlightTerms(text: string, tokens: string[]): string {
  if (tokens.length === 0) return text;

  let result = text;
  const normalizedText = normalize(text);
  
  // Crear lista de rangos a resaltar
  const highlights: Array<{ start: number; end: number; token: string }> = [];

  for (const token of tokens) {
    let searchIndex = 0;
    
    while (true) {
      const index = normalizedText.indexOf(token, searchIndex);
      if (index === -1) break;
      
      highlights.push({
        start: index,
        end: index + token.length,
        token,
      });
      
      searchIndex = index + token.length;
    }
  }

  // Ordenar por posición y eliminar solapamientos
  highlights.sort((a, b) => a.start - b.start);
  
  const mergedHighlights: Array<{ start: number; end: number }> = [];
  for (const highlight of highlights) {
    if (mergedHighlights.length === 0) {
      mergedHighlights.push(highlight);
    } else {
      const last = mergedHighlights[mergedHighlights.length - 1];
      if (highlight.start <= last.end) {
        // Solapamiento: extender el último
        last.end = Math.max(last.end, highlight.end);
      } else {
        mergedHighlights.push(highlight);
      }
    }
  }

  // Aplicar marcadores de fin a inicio para no alterar índices
  for (let i = mergedHighlights.length - 1; i >= 0; i--) {
    const { start, end } = mergedHighlights[i];
    result = result.slice(0, end) + ']]' + result.slice(end);
    result = result.slice(0, start) + '[[' + result.slice(start);
  }

  return result;
}

// ========================================
// HOOK
// ========================================

export function useLocalSearch() {
  const [index, setIndex] = useState<LocalIndexStore | null>(null);
  const [state, setState] = useState<IndexState>('idle');
  const [lastBuiltAt, setLastBuiltAt] = useState<number | null>(null);

  // Cargar índice desde storage al montar
  useEffect(() => {
    loadIndex();
  }, []);

  /**
   * Carga índice desde AsyncStorage
   */
  const loadIndex = useCallback(async () => {
    try {
      setState('loading');
      const stored = await loadIndexFromStorage();
      
      if (stored) {
        setIndex(stored);
        setLastBuiltAt(stored.lastBuiltAt);
        setState('ready');
      } else {
        setState('idle');
      }
    } catch (error) {
      console.error('[useLocalSearch] Error loading index:', error);
      setState('error');
    }
  }, []);

  /**
   * Construye índice desde función de fetch remoto
   */
  const buildFromRemote = useCallback(
    async (fetchFn: () => Promise<IndexedEntry[]>) => {
      try {
        setState('loading');
        
        const entries = await fetchFn();
        const newIndex = buildIndex(entries);
        
        await saveIndexToStorage(newIndex);
        
        setIndex(newIndex);
        setLastBuiltAt(newIndex.lastBuiltAt);
        setState('ready');
        
        console.log(`[useLocalSearch] Index built with ${entries.length} entries`);
      } catch (error) {
        console.error('[useLocalSearch] Error building index:', error);
        setState('error');
        throw error;
      }
    },
    []
  );

  /**
   * Actualiza índice con nuevas entradas (incremental)
   */
  const addOrUpdate = useCallback(
    async (entries: IndexedEntry[]) => {
      if (!index) {
        console.warn('[useLocalSearch] No index to update, use buildFromRemote first');
        return;
      }

      try {
        const updatedIndex = mergeIndex(index, entries);
        await saveIndexToStorage(updatedIndex);
        
        setIndex(updatedIndex);
        setLastBuiltAt(updatedIndex.lastBuiltAt);
        
        console.log(`[useLocalSearch] Index updated with ${entries.length} entries`);
      } catch (error) {
        console.error('[useLocalSearch] Error updating index:', error);
        throw error;
      }
    },
    [index]
  );

  /**
   * Busca en el índice y retorna hits con snippets resaltados
   */
  const search = useCallback(
    (query: string): SearchHit[] => {
      if (!index || !query.trim()) {
        return [];
      }

      const searchTerms = query.trim().split(/\s+/);
      const results = queryIndex(index, searchTerms);

      // Mapear a SearchHit con snippets
      const hits: SearchHit[] = results.map(result => {
        const entry = index.entries[result.id];
        
        if (!entry) {
          return {
            id: result.id,
            score: result.score,
            title: 'Sin título',
            snippet: '',
            createdAt: 0,
          };
        }

        // Generar título resaltado
        const highlightedTitle = entry.title
          ? highlightTerms(entry.title, searchTerms.flatMap(t => tokenize(t)))
          : 'Sin título';

        // Generar snippet del contenido
        const snippet = generateSnippet(
          entry.content || '',
          searchTerms,
          160
        );

        return {
          id: entry.id,
          score: result.score,
          title: highlightedTitle,
          snippet,
          createdAt: entry.createdAt,
        };
      });

      return hits;
    },
    [index]
  );

  /**
   * Limpia índice de memoria y storage
   */
  const clearIndex = useCallback(async () => {
    try {
      await clearIndexFromStorage();
      setIndex(null);
      setLastBuiltAt(null);
      setState('idle');
      
      console.log('[useLocalSearch] Index cleared');
    } catch (error) {
      console.error('[useLocalSearch] Error clearing index:', error);
      throw error;
    }
  }, []);

  /**
   * Verifica si el índice necesita reconstrucción
   */
  const needsRebuild = useCallback(() => {
    return shouldRebuildIndex(index);
  }, [index]);

  return {
    // Estado
    state,
    isReady: state === 'ready',
    isLoading: state === 'loading',
    hasIndex: index !== null,
    lastBuiltAt,
    entryCount: index ? Object.keys(index.entries).length : 0,

    // Acciones
    buildFromRemote,
    addOrUpdate,
    search,
    clearIndex,
    needsRebuild,
    reload: loadIndex,
  };
}
