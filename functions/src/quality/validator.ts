/**
 * @module quality/validator
 * @description Validador de calidad para insights generados
 */

/**
 * Estructura de métricas de calidad de un insight
 */
export type Quality = {
  completeness: number;     // 0..1 (proporción de campos presentes)
  confidence: number;       // 0..1 (heurística del analizador)
  hasTopics: boolean;
  hasKeyPhrases: boolean;
  status: 'OK' | 'WARN' | 'FAIL';
  processingTimeMs: number; // tiempo de procesamiento
  error?: string;           // mensaje de error si falla
};

/**
 * Calcula la completitud del insight basado en campos presentes
 * 
 * @param ins - Objeto con sentiment, topics y keyPhrases
 * @returns Número entre 0 y 1 representando proporción de campos completos
 */
export function computeCompleteness(ins: {
  sentiment?: any;
  topics?: any[];
  keyPhrases?: string[];
}): number {
  const parts = 3;
  let got = 0;

  if (ins.sentiment) got++;
  if (Array.isArray(ins.topics) && ins.topics.length > 0) got++;
  if (Array.isArray(ins.keyPhrases) && ins.keyPhrases.length > 0) got++;

  return got / parts;
}

/**
 * Decide el status de calidad basado en métricas
 * 
 * Reglas:
 * - FAIL: completeness < 0.34 ó error presente
 * - WARN: completeness < 0.67 ó confidence < 0.4 ó processingTimeMs > 2000
 * - OK: resto de casos
 * 
 * @param q - Métricas de calidad sin status
 * @returns Status: 'OK' | 'WARN' | 'FAIL'
 */
export function decideStatus(
  q: Omit<Quality, 'status'>
): Quality['status'] {
  // FAIL: error presente o completitud muy baja
  if (q.error) return 'FAIL';
  if (q.completeness < 0.34) return 'FAIL';

  // WARN: completitud baja o confianza baja o procesamiento lento
  if (q.completeness < 0.67) return 'WARN';
  if (q.confidence < 0.4) return 'WARN';
  if (q.processingTimeMs > 2000) return 'WARN';

  // OK: cumple todos los criterios
  return 'OK';
}

/**
 * Construye el objeto Quality completo para un insight
 * 
 * @param ins - Insight generado (con sentiment, topics, keyPhrases)
 * @param confidence - Nivel de confianza del analizador (0..1)
 * @param dtMs - Tiempo de procesamiento en milisegundos
 * @param error - Mensaje de error opcional
 * @returns Objeto Quality completo con status calculado
 */
export function buildQuality(
  ins: any,
  confidence: number,
  dtMs: number,
  error?: string
): Quality {
  const completeness = computeCompleteness(ins);
  const hasTopics = Array.isArray(ins?.topics) && ins.topics.length > 0;
  const hasKeyPhrases = Array.isArray(ins?.keyPhrases) && ins.keyPhrases.length > 0;

  const base = {
    completeness,
    confidence,
    hasTopics,
    hasKeyPhrases,
    processingTimeMs: dtMs,
    error,
  };

  const status = decideStatus(base);

  return { ...base, status };
}
