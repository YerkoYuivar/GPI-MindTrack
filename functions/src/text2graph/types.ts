/**
 * @module text2graph/types
 * @description Tipos para el pipeline de extracción Text→Graph
 */

/**
 * Token raw con parte de oración opcional (heurística)
 */
export interface RawToken {
  /** Texto del token */
  t: string;
  /** Parte de oración (opcional) */
  pos?: 'n' | 'v' | 'adj' | 'other';
}

/**
 * Término extraído con peso y clasificación
 */
export interface Term {
  /** Clave normalizada del término */
  key: string;
  /** Peso calculado según frecuencia y tipo */
  weight: number;
  /** Clasificación del término */
  kind: 'topic' | 'phrase' | 'emotion';
}

/**
 * Par de términos co-ocurrentes (para aristas)
 */
export interface Pair {
  /** Primer término (orden lexicográfico) */
  a: string;
  /** Segundo término (orden lexicográfico) */
  b: string;
  /** Peso de la relación */
  weight: number;
}

/**
 * Resultado de la extracción de texto
 */
export interface ExtractResult {
  /** Términos extraídos */
  terms: Term[];
  /** Pares de co-ocurrencia para aristas */
  pairs: Pair[];
}

/**
 * Input para upsert de grafo
 */
export interface GraphNode {
  /** ID del nodo (ej: 'topic:laboral') */
  id: string;
  /** Label visible */
  label: string;
  /** Tipo de nodo */
  type: 'topic' | 'phrase' | 'emotion';
  /** Delta de peso a incrementar */
  delta: number;
}

/**
 * Input para upsert de arista
 */
export interface GraphEdge {
  /** ID de la arista (ej: 'topic:laboral~emotion:ansiedad') */
  id: string;
  /** ID del nodo origen */
  source: string;
  /** ID del nodo destino */
  target: string;
  /** Delta de peso a incrementar */
  delta: number;
}
