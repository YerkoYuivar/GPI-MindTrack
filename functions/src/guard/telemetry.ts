/**
 * Telemetry Guard
 * Recopila métricas agregadas del chat para monitoreo y diagnóstico.
 * 
 * Métricas:
 * - Conteo total de respuestas por día
 * - Conteo de eventos warn/blocked
 * - Latencia promedio de respuestas
 * - Sin PII (solo agregados anónimos)
 */

import * as admin from 'firebase-admin';
import { db } from '../services/firestore';

/**
 * Registra una métrica de chat en los agregados diarios globales.
 * 
 * @param label - Nivel de seguridad de la respuesta
 * @param latencyMs - Tiempo de respuesta en milisegundos
 */
export async function recordMetric(
  label: 'ok' | 'warn' | 'blocked',
  latencyMs: number
): Promise<void> {
  try {
    // Formato de fecha: YYYY-MM-DD
    const dayKey = new Date().toISOString().slice(0, 10);
    const ref = db.doc(`admin/metrics/chat/${dayKey}`);

    const snap = await ref.get();
    const nowTs = admin.firestore.Timestamp.now();

    // Valores actuales o iniciales
    const cur = snap.exists
      ? (snap.data() as any)
      : {
          count: 0,
          warn: 0,
          blocked: 0,
          sumLatency: 0,
        };

    // Calcular nuevos valores
    const next = {
      count: cur.count + 1,
      warn: cur.warn + (label === 'warn' ? 1 : 0),
      blocked: cur.blocked + (label === 'blocked' ? 1 : 0),
      sumLatency: (cur.sumLatency ?? 0) + latencyMs,
      avgLatencyMs: Math.round(
        ((cur.sumLatency ?? 0) + latencyMs) / (cur.count + 1)
      ),
      updatedAt: nowTs,
    };

    await ref.set(next, { merge: true });
  } catch (err) {
    // No fallar la función si la telemetría falla
    console.warn('Failed to record metric:', err);
  }
}
