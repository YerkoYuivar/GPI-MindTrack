/**
 * Local Search Index - Sistema de búsqueda local con índice invertido
 * 
 * Construcción, actualización, consulta y persistencia de índice de búsqueda
 * para entradas del diario sin dependencias externas.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ========================================
// TIPOS
// ========================================

export type IndexedEntry = {
  id: string;
  createdAt: number;
  title?: string;
  content?: string;
  tags?: string[];
};

/** Diccionario: token → array de entryIds que contienen ese token */
export type InvertedIndex = Record<string, string[]>;

export type LocalIndexStore = {
  entries: Record<string, IndexedEntry>; // id → documento mínimo
  inverted: InvertedIndex;               // token → ids[]
  lastBuiltAt: number;                   // epoch ms
};

export type SearchResult = {
  id: string;
  score: number;
};

// ========================================
// CONSTANTES
// ========================================

const STORAGE_KEY = 'search.index.v1';
const MAX_INDEX_ENTRIES = 1000;

// Pesos para scoring
const WEIGHTS = {
  title: 3,
  tags: 2,
  content: 1,
};

// ========================================
// NORMALIZACIÓN Y TOKENIZACIÓN
// ========================================

/**
 * Normaliza texto: lowercase y elimina diacríticos básicos
 */
export function normalize(str: string): string {
  if (!str) return '';
  
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina diacríticos
    .trim();
}

/**
 * Tokeniza texto en palabras de 2+ caracteres
 */
export function tokenize(str: string): string[] {
  if (!str) return [];
  
  const normalized = normalize(str);
  const tokens = normalized.match(/\w{2,}/g) || [];
  
  // Eliminar duplicados
  return Array.from(new Set(tokens));
}

// ========================================
// CONSTRUCCIÓN DE ÍNDICE
// ========================================

/**
 * Construye índice completo desde cero
 */
export function buildIndex(entries: IndexedEntry[]): LocalIndexStore {
  const store: LocalIndexStore = {
    entries: {},
    inverted: {},
    lastBuiltAt: Date.now(),
  };

  // Limitar cantidad de entradas
  const limitedEntries = entries.slice(0, MAX_INDEX_ENTRIES);

  for (const entry of limitedEntries) {
    // Guardar entry mínima
    store.entries[entry.id] = {
      id: entry.id,
      createdAt: entry.createdAt,
      title: entry.title,
      content: entry.content,
      tags: entry.tags,
    };

    // Indexar campos
    indexField(store.inverted, entry.id, entry.title || '');
    indexField(store.inverted, entry.id, entry.content || '');
    
    if (entry.tags) {
      for (const tag of entry.tags) {
        indexField(store.inverted, entry.id, tag);
      }
    }
  }

  return store;
}

/**
 * Indexa un campo de texto agregando sus tokens al índice invertido
 */
function indexField(inverted: InvertedIndex, entryId: string, text: string): void {
  const tokens = tokenize(text);
  
  for (const token of tokens) {
    if (!inverted[token]) {
      inverted[token] = [];
    }
    
    // Evitar duplicados (un entry puede tener el mismo token en varios campos)
    if (!inverted[token].includes(entryId)) {
      inverted[token].push(entryId);
    }
  }
}

/**
 * Actualiza índice existente con nuevas entradas (merge incremental)
 */
export function mergeIndex(
  prevIndex: LocalIndexStore,
  newEntries: IndexedEntry[]
): LocalIndexStore {
  const store: LocalIndexStore = {
    entries: { ...prevIndex.entries },
    inverted: { ...prevIndex.inverted },
    lastBuiltAt: Date.now(),
  };

  for (const entry of newEntries) {
    // Actualizar o agregar entry
    store.entries[entry.id] = {
      id: entry.id,
      createdAt: entry.createdAt,
      title: entry.title,
      content: entry.content,
      tags: entry.tags,
    };

    // Reindexar (nota: esto podría dejar tokens huérfanos del entry anterior
    // pero es aceptable para este caso de uso)
    indexField(store.inverted, entry.id, entry.title || '');
    indexField(store.inverted, entry.id, entry.content || '');
    
    if (entry.tags) {
      for (const tag of entry.tags) {
        indexField(store.inverted, entry.id, tag);
      }
    }
  }

  // Aplicar límite de entradas (mantener las más recientes)
  return pruneIndex(store, MAX_INDEX_ENTRIES);
}

/**
 * Poda el índice manteniendo solo las N entradas más recientes
 */
export function pruneIndex(
  index: LocalIndexStore,
  maxEntries: number = MAX_INDEX_ENTRIES
): LocalIndexStore {
  const entryIds = Object.keys(index.entries);
  
  if (entryIds.length <= maxEntries) {
    return index;
  }

  // Ordenar por createdAt desc y tomar las primeras N
  const sortedIds = entryIds
    .sort((a, b) => {
      const entryA = index.entries[a];
      const entryB = index.entries[b];
      return entryB.createdAt - entryA.createdAt;
    })
    .slice(0, maxEntries);

  const idsToKeep = new Set(sortedIds);

  // Crear nuevo índice con solo las entradas a mantener
  const prunedEntries: Record<string, IndexedEntry> = {};
  const prunedInverted: InvertedIndex = {};

  for (const id of sortedIds) {
    prunedEntries[id] = index.entries[id];
  }

  // Reconstruir índice invertido solo con IDs válidos
  for (const [token, ids] of Object.entries(index.inverted)) {
    const validIds = ids.filter(id => idsToKeep.has(id));
    if (validIds.length > 0) {
      prunedInverted[token] = validIds;
    }
  }

  return {
    entries: prunedEntries,
    inverted: prunedInverted,
    lastBuiltAt: index.lastBuiltAt,
  };
}

// ========================================
// CONSULTA
// ========================================

/**
 * Consulta el índice con términos de búsqueda
 * Retorna resultados ordenados por score descendente
 */
export function queryIndex(
  index: LocalIndexStore,
  searchTerms: string[]
): SearchResult[] {
  if (searchTerms.length === 0) {
    return [];
  }

  const tokens = searchTerms.flatMap(term => tokenize(term));
  
  if (tokens.length === 0) {
    return [];
  }

  // Mapa: entryId → score
  const scores = new Map<string, number>();

  // Para cada token de búsqueda
  for (const token of tokens) {
    const matchingIds = index.inverted[token] || [];

    for (const entryId of matchingIds) {
      const entry = index.entries[entryId];
      if (!entry) continue;

      // Calcular score para este token en esta entrada
      const tokenScore = calculateTokenScore(entry, token);
      
      // Acumular score
      const currentScore = scores.get(entryId) || 0;
      scores.set(entryId, currentScore + tokenScore);
    }
  }

  // Convertir a array y ordenar
  const results: SearchResult[] = Array.from(scores.entries()).map(
    ([id, score]) => ({ id, score })
  );

  // Ordenar por score desc, desempate por createdAt desc
  results.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    
    const entryA = index.entries[a.id];
    const entryB = index.entries[b.id];
    return entryB.createdAt - entryA.createdAt;
  });

  return results;
}

/**
 * Calcula score de un token en una entrada
 */
function calculateTokenScore(entry: IndexedEntry, token: string): number {
  let score = 0;

  // Contar ocurrencias en título
  if (entry.title) {
    const titleTokens = tokenize(entry.title);
    const titleCount = titleTokens.filter(t => t === token).length;
    score += titleCount * WEIGHTS.title;
  }

  // Contar ocurrencias en tags
  if (entry.tags) {
    for (const tag of entry.tags) {
      const tagTokens = tokenize(tag);
      const tagCount = tagTokens.filter(t => t === token).length;
      score += tagCount * WEIGHTS.tags;
    }
  }

  // Contar ocurrencias en contenido
  if (entry.content) {
    const contentTokens = tokenize(entry.content);
    const contentCount = contentTokens.filter(t => t === token).length;
    score += contentCount * WEIGHTS.content;
  }

  return score;
}

// ========================================
// PERSISTENCIA
// ========================================

/**
 * Serializa índice a AsyncStorage
 */
export async function saveIndexToStorage(index: LocalIndexStore): Promise<void> {
  try {
    const serialized = JSON.stringify(index);
    await AsyncStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.error('[localIndex] Error saving to storage:', error);
    throw error;
  }
}

/**
 * Deserializa índice desde AsyncStorage
 */
export async function loadIndexFromStorage(): Promise<LocalIndexStore | null> {
  try {
    const serialized = await AsyncStorage.getItem(STORAGE_KEY);
    
    if (!serialized) {
      return null;
    }

    const parsed = JSON.parse(serialized) as LocalIndexStore;
    return parsed;
  } catch (error) {
    console.error('[localIndex] Error loading from storage:', error);
    return null;
  }
}

/**
 * Elimina índice de AsyncStorage
 */
export async function clearIndexFromStorage(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('[localIndex] Error clearing storage:', error);
    throw error;
  }
}

// ========================================
// UTILIDADES
// ========================================

/**
 * Verifica si el índice necesita reconstrucción (antiguo o vacío)
 */
export function shouldRebuildIndex(
  index: LocalIndexStore | null,
  maxAgeMs: number = 24 * 60 * 60 * 1000 // 24 horas
): boolean {
  if (!index) return true;
  
  const age = Date.now() - index.lastBuiltAt;
  return age > maxAgeMs || Object.keys(index.entries).length === 0;
}
