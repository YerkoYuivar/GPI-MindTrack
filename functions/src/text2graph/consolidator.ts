/**
 * @module text2graph/consolidator
 * @description Consolidación de nodos y edges con decay temporal
 */

/**
 * Factor de decay por defecto (0.98 ≈ -18% mensual si se actualiza semanalmente)
 */
export const DEFAULT_DECAY_FACTOR = 0.98;

/**
 * Peso máximo permitido por nodo/edge
 */
export const MAX_WEIGHT = 5.0;

/**
 * Peso mínimo para mantener un nodo/edge (por debajo se considera ruido)
 */
export const MIN_WEIGHT = 0.1;

/**
 * Aplica decay exponencial a un peso
 * Simula "olvido" gradual de patrones antiguos
 * 
 * @param current Peso actual
 * @param factor Factor de decay (default: 0.98)
 * @returns Peso con decay aplicado
 * 
 * @example
 * applyDecay(1.0, 0.98) => 0.98
 * applyDecay(0.5, 0.95) => 0.475
 */
export function applyDecay(current: number, factor = DEFAULT_DECAY_FACTOR): number {
  return current * factor;
}

/**
 * Mezcla peso actual (con decay) con un delta nuevo
 * Aplica límite máximo para evitar inflación
 * 
 * @param current Peso actual antes del decay
 * @param delta Peso a sumar (del extract actual)
 * @param max Peso máximo permitido (default: 5.0)
 * @param decay Factor de decay a aplicar primero (default: 0.98)
 * @returns Peso consolidado
 * 
 * @example
 * mergeWeight(1.0, 0.5) => 1.48  // 1.0 * 0.98 + 0.5 = 1.48
 * mergeWeight(4.8, 0.5) => 5.0   // cap al máximo
 * mergeWeight(0.05, 0.02) => 0.07 // pero puede quedar bajo MIN_WEIGHT
 */
export function mergeWeight(
  current: number,
  delta: number,
  max = MAX_WEIGHT,
  decay = DEFAULT_DECAY_FACTOR
): number {
  const withDecay = applyDecay(current, decay);
  const merged = withDecay + delta;
  return Math.min(merged, max);
}

/**
 * Verifica si un peso es suficientemente significativo
 * 
 * @param weight Peso a verificar
 * @returns true si el peso es >= MIN_WEIGHT
 */
export function isSignificantWeight(weight: number): boolean {
  return weight >= MIN_WEIGHT;
}

/**
 * Normaliza un array de pesos a un rango específico
 * Útil para visualización
 * 
 * @param weights Array de pesos
 * @param minOut Valor mínimo de salida
 * @param maxOut Valor máximo de salida
 * @returns Array de pesos normalizados
 */
export function normalizeWeights(
  weights: number[],
  minOut = 0,
  maxOut = 1
): number[] {
  if (weights.length === 0) return [];
  
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  
  if (min === max) {
    // Todos los pesos iguales
    return weights.map(() => (minOut + maxOut) / 2);
  }
  
  return weights.map((w) => {
    const normalized = (w - min) / (max - min);
    return minOut + normalized * (maxOut - minOut);
  });
}

/**
 * Genera ID de edge estable (orden lexicográfico)
 * 
 * @param a ID del primer nodo
 * @param b ID del segundo nodo
 * @returns ID de edge ordenado
 * 
 * @example
 * makeEdgeId('topic:b', 'topic:a') => 'topic:a~topic:b'
 * makeEdgeId('emotion:x', 'phrase:y') => 'emotion:x~phrase:y'
 */
export function makeEdgeId(a: string, b: string): string {
  const [src, dst] = a < b ? [a, b] : [b, a];
  return `${src}~${dst}`;
}

/**
 * Parsea un edge ID a sus componentes
 * 
 * @param edgeId ID de edge (formato: 'nodeA~nodeB')
 * @returns Tupla [source, target] o null si formato inválido
 * 
 * @example
 * parseEdgeId('topic:a~topic:b') => ['topic:a', 'topic:b']
 */
export function parseEdgeId(edgeId: string): [string, string] | null {
  const parts = edgeId.split('~');
  if (parts.length !== 2) return null;
  return [parts[0], parts[1]];
}
