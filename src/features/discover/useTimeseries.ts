/**
 * @module features/discover/useTimeseries
 * @description Hook React para cargar y gestionar series temporales
 */

import { useState, useEffect } from 'react';
import { getDaySeries, getWeekSeries } from './repo';
import type { DayDoc, WeekDoc } from './types';
import { log as logger } from '@utils/logger';

interface UseTimeseriesResult {
  days: DayDoc[];
  weeks: WeekDoc[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook para cargar series temporales de un usuario
 * 
 * @param userId - ID del usuario (null si no está autenticado)
 * @param options - Opciones de carga (daysLimit, weeksLimit)
 * @returns Estado de las series temporales con métodos de control
 * 
 * @example
 * const { days, weeks, loading, refresh } = useTimeseries(userId, {
 *   daysLimit: 30,
 *   weeksLimit: 12
 * });
 */
export function useTimeseries(
  userId: string | null,
  options?: {
    daysLimit?: number;
    weeksLimit?: number;
  }
): UseTimeseriesResult {
  const { daysLimit = 30, weeksLimit = 12 } = options ?? {};
  
  const [days, setDays] = useState<DayDoc[]>([]);
  const [weeks, setWeeks] = useState<WeekDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!userId) {
      setDays([]);
      setWeeks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      logger.debug('[Discover] Loading timeseries data', { userId });

      const [daysData, weeksData] = await Promise.all([
        getDaySeries(userId, { limit: daysLimit }),
        getWeekSeries(userId, { limit: weeksLimit }),
      ]);

      setDays(daysData);
      setWeeks(weeksData);

      logger.info('[Discover] Timeseries data loaded', {
        userId,
        daysCount: daysData.length,
        weeksCount: weeksData.length,
      });
    } catch (err) {
      logger.error('[Discover] Failed to load timeseries data', { userId, error: err });
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId, daysLimit, weeksLimit]);

  return {
    days,
    weeks,
    loading,
    error,
    refresh: loadData,
  };
}
