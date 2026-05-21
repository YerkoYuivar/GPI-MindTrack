/**
 * @module features/discover/useDiscoverData
 * @description Hook para cargar datos de series temporales para el dashboard
 */

import { useState, useEffect } from 'react';
import { getDaySeries, getWeekSeries } from './repo';
import type { DaySeriesItem, WeekSeriesItem } from './types';
import { log as logger } from '@utils/logger';

interface UseDiscoverDataResult {
  day: DaySeriesItem[];
  week: WeekSeriesItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook para cargar datos de series temporales (días y semanas)
 * 
 * @param userId - ID del usuario (null si no está autenticado)
 * @param daysLimit - Límite de días a cargar (default: 30)
 * @param weeksLimit - Límite de semanas a cargar (default: 12)
 * @returns Estado con datos, loading, error y función refresh
 * 
 * @example
 * const { day, week, loading, error, refresh } = useDiscoverData(userId, 30, 12);
 */
export function useDiscoverData(
  userId: string | null,
  daysLimit: number = 30,
  weeksLimit: number = 12
): UseDiscoverDataResult {
  const [day, setDay] = useState<DaySeriesItem[]>([]);
  const [week, setWeek] = useState<WeekSeriesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!userId) {
      setDay([]);
      setWeek([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      logger.debug('[Discover] Loading dashboard data', { userId, daysLimit, weeksLimit });

      const [dayData, weekData] = await Promise.all([
        getDaySeries(userId, { limit: daysLimit }),
        getWeekSeries(userId, { limit: weeksLimit }),
      ]);

      setDay(dayData);
      setWeek(weekData);

      logger.info('[Discover] Dashboard data loaded', {
        userId,
        daysCount: dayData.length,
        weeksCount: weekData.length,
      });
    } catch (err) {
      logger.error('[Discover] Failed to load dashboard data', { userId, error: err });
      setError(err instanceof Error ? err.message : 'Error desconocido al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId, daysLimit, weeksLimit]);

  return {
    day,
    week,
    loading,
    error,
    refresh: loadData,
  };
}
