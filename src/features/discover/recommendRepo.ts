/**
 * recommendRepo.ts
 * Repositorio para obtener recomendaciones personalizadas desde Firebase Functions
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '@lib/firebase/functions';
import { logger } from '@lib/diagnostics/logger';

export type RecType = 'meditation' | 'breathing' | 'journaling' | 'tip' | 'movement';

export type RecAction = {
  label: string;
  href?: string;
  screen?: string;
  params?: Record<string, any>;
};

export type RecItem = {
  id: string;
  type: RecType;
  title: string;
  summary: string;
  actions: RecAction[];
  score: number;
  tags?: string[];
  createdAt?: any; // Timestamp de Functions
};

/**
 * Obtiene recomendaciones personalizadas del usuario
 * @param limit Número máximo de recomendaciones (default 6, max 10)
 * @param horizonDays Ventana temporal en días (default 14)
 * @returns Array de recomendaciones ordenadas por score
 */
export async function fetchRecommendations(
  limit = 6,
  horizonDays = 14
): Promise<RecItem[]> {
  logger.debug('fetchRecommendations', { limit, horizonDays }, 'discover');

  try {
    const fn = httpsCallable<
      { limit?: number; horizonDays?: number },
      { items: RecItem[] }
    >(functions, 'getRecommendations');

    const res = await fn({ limit, horizonDays });

    logger.info(
      'fetchRecommendations success',
      { count: res.data.items.length },
      'discover'
    );

    return res.data.items ?? [];
  } catch (error: any) {
    logger.error(
      'fetchRecommendations failed',
      { error: error?.message },
      'discover'
    );
    throw new Error(`Error obteniendo recomendaciones: ${error?.message || error}`);
  }
}
