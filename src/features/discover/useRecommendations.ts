/**
 * useRecommendations.ts
 * Hook para cargar y cachear recomendaciones personalizadas
 */

import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchRecommendations, type RecItem } from './recommendRepo';
import { logger } from '@lib/diagnostics/logger';

const CACHE_KEY = 'ej.recs.cache.v1';
const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hora

type CachedData = {
  items: RecItem[];
  timestamp: number;
};

/**
 * Hook para obtener recomendaciones personalizadas con caché local
 * @param limit Número máximo de recomendaciones (default 6)
 * @param horizonDays Ventana temporal en días (default 14)
 * @returns Estado de recomendaciones: items, loading, error, refresh
 */
export function useRecommendations(limit = 6, horizonDays = 14) {
  const [items, setItems] = useState<RecItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carga recomendaciones desde caché o servidor
   */
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Intentar cargar desde caché
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const data: CachedData = JSON.parse(cached);
          const age = Date.now() - data.timestamp;

          // Si el caché es válido (< 1 hora), usarlo inmediatamente
          if (age < CACHE_EXPIRY_MS && data.items?.length > 0) {
            logger.debug('useRecommendations: cache hit', { age }, 'discover');
            setItems(data.items);
            setLoading(false);
            return; // No hacer request si el caché es reciente
          }

          // Si el caché expiró pero hay datos, mostrarlos mientras se actualiza
          if (data.items?.length > 0) {
            logger.debug('useRecommendations: cache expired, showing stale', {}, 'discover');
            setItems(data.items);
          }
        } catch (e) {
          logger.warn('useRecommendations: cache parse error', { error: e }, 'discover');
        }
      }

      // 2. Hacer request al servidor
      logger.debug('useRecommendations: fetching from server', { limit, horizonDays }, 'discover');
      const freshItems = await fetchRecommendations(limit, horizonDays);

      // 3. Actualizar estado y caché
      setItems(freshItems);
      const cacheData: CachedData = {
        items: freshItems,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

      logger.info('useRecommendations: loaded', { count: freshItems.length }, 'discover');
    } catch (e: any) {
      const msg = e?.message || String(e);
      setError(msg);
      logger.error('useRecommendations: error', { error: msg }, 'discover');
    } finally {
      setLoading(false);
    }
  }, [limit, horizonDays]);

  /**
   * Refresca forzadamente (ignora caché)
   */
  const refresh = useCallback(async () => {
    await AsyncStorage.removeItem(CACHE_KEY);
    await load();
  }, [load]);

  // Cargar al montar
  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, error, refresh };
}
