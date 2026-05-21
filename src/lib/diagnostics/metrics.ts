/**
 * Sistema de métricas locales (contadores + timers)
 * 
 * Recolecta contadores simples y mediciones de tiempo con percentiles.
 * Todo en memoria, sin persistencia automática.
 */

import { logger } from './logger';

// ========================================
// TIPOS
// ========================================

export type CounterKey =
  | 'journal.list.loaded'
  | 'journal.list.paginated'
  | 'journal.detail.view'
  | 'journal.editor.open'
  | 'journal.editor.save.success'
  | 'journal.editor.save.fail'
  | 'journal.image.upload.success'
  | 'journal.image.upload.fail'
  | 'journal.audio.upload.success'
  | 'journal.audio.upload.fail';

export type TimerKey =
  | 'journal.list.fetch'
  | 'journal.editor.save.remote'
  | 'journal.image.upload'
  | 'journal.audio.upload';

export type TimerStats = {
  count: number;
  p50: number;
  p95: number;
  last: number;
};

// ========================================
// ESTADO INTERNO
// ========================================

class Metrics {
  private counters: Partial<Record<CounterKey, number>> = {};
  private timers: Partial<Record<TimerKey, number[]>> = {}; // Histogramas
  private maxSamples: number = 200; // Ventana de muestras

  /**
   * Incrementa contador
   */
  inc(key: CounterKey, by: number = 1): void {
    this.counters[key] = (this.counters[key] || 0) + by;
  }

  /**
   * Obtiene todos los contadores
   */
  getCounters(): Record<string, number> {
    return { ...this.counters } as Record<string, number>;
  }

  /**
   * Mide tiempo de ejecución de función async
   */
  async time<T>(key: TimerKey, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.recordDuration(key, duration);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.recordDuration(key, duration);
      throw error;
    }
  }

  /**
   * Registra duración en histograma
   */
  private recordDuration(key: TimerKey, duration: number): void {
    if (!this.timers[key]) {
      this.timers[key] = [];
    }

    const samples = this.timers[key]!;
    samples.push(duration);

    // Mantener ventana limitada (descartar más antiguas)
    if (samples.length > this.maxSamples) {
      samples.shift();
    }

    // Log para debug
    logger.debug(`Timer ${key}: ${duration}ms`, { duration }, 'metrics');
  }

  /**
   * Obtiene estadísticas de timers
   */
  getTimers(): Record<string, TimerStats> {
    const result: Record<string, TimerStats> = {};

    for (const [key, samples] of Object.entries(this.timers)) {
      if (!samples || samples.length === 0) continue;

      const sorted = [...samples].sort((a, b) => a - b);
      const count = sorted.length;
      const p50Index = Math.floor(count * 0.5);
      const p95Index = Math.floor(count * 0.95);

      result[key] = {
        count,
        p50: sorted[p50Index] || 0,
        p95: sorted[p95Index] || 0,
        last: samples[samples.length - 1] || 0,
      };
    }

    return result;
  }

  /**
   * Resetea todas las métricas
   */
  reset(): void {
    this.counters = {};
    this.timers = {};
    logger.info('Metrics reset', {}, 'metrics');
  }

  /**
   * Obtiene snapshot completo para persistencia
   */
  getSnapshot(): {
    counters: Record<string, number>;
    timers: Record<string, TimerStats>;
  } {
    return {
      counters: this.getCounters(),
      timers: this.getTimers(),
    };
  }
}

// ========================================
// EXPORTACIÓN SINGLETON
// ========================================

export const metrics = new Metrics();
