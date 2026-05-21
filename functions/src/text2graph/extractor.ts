/**
 * @module text2graph/extractor
 * @description Extracción de términos y relaciones desde texto en español
 */

import type { Term, Pair, ExtractResult } from './types';
import { normalizeTerm } from './normalize';
import {
  aliasToCanonical,
  isStopToken,
  maybeEmotion,
  isValidPhrase,
} from './synonyms';

/**
 * Pesos por tipo de n-gram
 */
const WEIGHTS = {
  UNIGRAM: 1.0,
  BIGRAM: 1.5,
  TRIGRAM: 2.0,
  EMOTION: 2.5,
};

/**
 * Límites de extracción
 */
const LIMITS = {
  MAX_TERMS: 8, // Top K términos
  MIN_TOKEN_LENGTH: 3, // Longitud mínima de token
};

/**
 * Tokeniza texto manteniendo solo letras y números
 * Divide por caracteres no alfanuméricos
 */
function tokenize(text: string): string[] {
  // Reemplazar caracteres no alfanuméricos por espacios
  const normalized = text.replace(/[^\p{L}\p{N}\s]+/gu, ' ');
  
  // Dividir por espacios y filtrar vacíos
  return normalized
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= LIMITS.MIN_TOKEN_LENGTH);
}

/**
 * Genera bigramas desde un array de tokens
 * @example generateBigrams(['hola', 'mundo', 'cruel']) => ['hola mundo', 'mundo cruel']
 */
function generateBigrams(tokens: string[]): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return bigrams;
}

/**
 * Genera trigramas desde un array de tokens
 * @example generateTrigrams(['a', 'b', 'c', 'd']) => ['a b c', 'b c d']
 */
function generateTrigrams(tokens: string[]): string[] {
  const trigrams: string[] = [];
  for (let i = 0; i < tokens.length - 2; i++) {
    trigrams.push(`${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`);
  }
  return trigrams;
}

/**
 * Extrae términos y pares de co-ocurrencia desde texto
 * 
 * Pipeline:
 * 1. Tokenización y normalización
 * 2. Generación de n-grams (1, 2, 3)
 * 3. Filtrado por stopwords y whitelist
 * 4. Ponderación por frecuencia y tipo
 * 5. Detección de emociones
 * 6. Aplicación de sinónimos
 * 7. Selección de top-K términos
 * 8. Generación de pares de co-ocurrencia
 * 
 * @param title Título de la entrada (opcional)
 * @param content Contenido de la entrada
 * @returns Términos y pares extraídos
 */
export function extract(title: string, content: string): ExtractResult {
  // 1. Preprocesar: combinar title + content
  const rawText = `${title || ''} ${content}`.toLowerCase();
  
  // 2. Tokenizar
  const tokens = tokenize(rawText);
  
  // Filtrar tokens que son stopwords
  const filteredTokens = tokens
    .map((t) => normalizeTerm(t))
    .filter((t) => !isStopToken(t));
  
  if (filteredTokens.length === 0) {
    return { terms: [], pairs: [] };
  }
  
  // 3. Generar n-grams
  const unigrams = filteredTokens;
  const bigrams = generateBigrams(filteredTokens).map((bg) => normalizeTerm(bg));
  const trigrams = generateTrigrams(filteredTokens).map((tg) => normalizeTerm(tg));
  
  // 4. Conteo de frecuencias y clasificación
  const termFreq = new Map<string, { count: number; kind: 'topic' | 'phrase' | 'emotion' }>();
  
  // Procesar emociones (prioridad alta)
  const emotionsFound = new Set<string>();
  for (const token of unigrams) {
    const emotion = maybeEmotion(token);
    if (emotion) {
      emotionsFound.add(emotion);
      const key = `emotion:${emotion}`;
      const current = termFreq.get(key) || { count: 0, kind: 'emotion' as const };
      termFreq.set(key, { count: current.count + 1, kind: 'emotion' });
    }
  }
  
  // Procesar trigramas válidos (peso alto)
  for (const trigram of trigrams) {
    if (isValidPhrase(trigram)) {
      const canonical = aliasToCanonical(trigram);
      const key = `phrase:${canonical}`;
      const current = termFreq.get(key) || { count: 0, kind: 'phrase' as const };
      termFreq.set(key, { count: current.count + 1, kind: 'phrase' });
    }
  }
  
  // Procesar bigramas válidos (peso medio)
  for (const bigram of bigrams) {
    if (isValidPhrase(bigram)) {
      const canonical = aliasToCanonical(bigram);
      const key = `phrase:${canonical}`;
      const current = termFreq.get(key) || { count: 0, kind: 'phrase' as const };
      termFreq.set(key, { count: current.count + 1, kind: 'phrase' });
    }
  }
  
  // Procesar unigramas (topics)
  for (const token of unigrams) {
    // Saltar si ya es emoción
    if (maybeEmotion(token)) continue;
    
    const canonical = aliasToCanonical(token);
    const key = `topic:${canonical}`;
    const current = termFreq.get(key) || { count: 0, kind: 'topic' as const };
    termFreq.set(key, { count: current.count + 1, kind: 'topic' });
  }
  
  // 5. Calcular pesos
  const terms: Term[] = [];
  
  for (const [key, { count, kind }] of termFreq.entries()) {
    let weight = 0;
    
    if (kind === 'emotion') {
      weight = count * WEIGHTS.EMOTION;
    } else if (kind === 'phrase') {
      // Las phrases pueden ser bigramas o trigramas
      const phraseKey = key.replace('phrase:', '');
      const wordCount = phraseKey.split(' ').length;
      if (wordCount === 3) {
        weight = count * WEIGHTS.TRIGRAM;
      } else {
        weight = count * WEIGHTS.BIGRAM;
      }
    } else {
      // topic (unigram)
      weight = count * WEIGHTS.UNIGRAM;
    }
    
    terms.push({ key, weight, kind });
  }
  
  // 6. Ordenar por peso descendente y tomar top-K
  terms.sort((a, b) => {
    // Priorizar: emotion > phrase > topic, luego peso
    if (a.kind !== b.kind) {
      const kindOrder = { emotion: 0, phrase: 1, topic: 2 };
      return kindOrder[a.kind] - kindOrder[b.kind];
    }
    return b.weight - a.weight;
  });
  
  const topTerms = terms.slice(0, LIMITS.MAX_TERMS);
  
  // 7. Generar pares de co-ocurrencia (edges)
  const pairs: Pair[] = [];
  const topKeys = topTerms.map((t) => t.key);
  
  for (let i = 0; i < topKeys.length; i++) {
    for (let j = i + 1; j < topKeys.length; j++) {
      const a = topKeys[i];
      const b = topKeys[j];
      
      // No crear edges entre emociones (opcional)
      if (a.startsWith('emotion:') && b.startsWith('emotion:')) {
        continue;
      }
      
      // Orden lexicográfico para ID estable
      const [src, dst] = a < b ? [a, b] : [b, a];
      
      // Peso base 1, aumentar a 2 si comparten contexto cercano
      let weight = 1.0;
      
      // Verificar si ambos aparecen en un bigram/trigram juntos
      const aLabel = a.split(':')[1];
      const bLabel = b.split(':')[1];
      
      for (const bigram of bigrams) {
        if (bigram.includes(aLabel) && bigram.includes(bLabel)) {
          weight = 2.0;
          break;
        }
      }
      
      if (weight === 1.0) {
        for (const trigram of trigrams) {
          if (trigram.includes(aLabel) && trigram.includes(bLabel)) {
            weight = 2.0;
            break;
          }
        }
      }
      
      pairs.push({ a: src, b: dst, weight });
    }
  }
  
  return { terms: topTerms, pairs };
}

/**
 * Extrae términos desde un objeto de entrada
 * Helper para uso desde callables
 * 
 * @param entry Objeto con campos title y content
 * @returns Resultado de extracción
 */
export function extractFromEntry(entry: { title?: string; content: string }): ExtractResult {
  return extract(entry.title || '', entry.content);
}
