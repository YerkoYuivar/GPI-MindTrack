/**
 * @module recommend/base
 * @description Interfaz base para proveedores de recomendaciones
 */

import {Recommendation, GetRecommendationsInput} from '../types/recommend';

/**
 * Interfaz que deben implementar todos los proveedores de recomendaciones
 */
export interface Recommender {
  /**
   * Genera recomendaciones personalizadas para un usuario
   * @param input Parámetros de generación (userId, límite, horizonte temporal)
   * @returns Array de recomendaciones ordenadas por score descendente
   */
  recommend(input: GetRecommendationsInput): Promise<Recommendation[]>;
}
