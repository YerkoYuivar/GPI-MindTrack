/**
 * Abuse Detection Guard
 * Detecta y mitiga patrones de abuso basados en eventos de seguridad.
 * 
 * Reglas:
 * - Si un usuario acumula >= 3 eventos 'blocked' en 10 min → bloqueo de 10 min
 * - Los eventos 'warn' se rastrean pero no bloquean automáticamente
 * - Circuit breaker temporal para prevenir abuso sostenido
 */

import * as admin from 'firebase-admin';
import { db } from '../services/firestore';

/**
 * Resultado de la verificación de abuso
 */
export type AbuseDecision =
  | { ok: true }
  | { ok: false; code: 'abuse_blocked'; retryAfterSec: number };

/**
 * Registra un evento de seguridad y verifica si se debe bloquear por abuso.
 * 
 * @param uid - ID del usuario
 * @param label - Nivel de seguridad del evento
 * @returns Decisión de bloqueo si se detecta abuso
 */
export async function recordSafetyAndCheckAbuse(
  uid: string,
  label: 'ok' | 'warn' | 'blocked'
): Promise<AbuseDecision> {
  // Formato de fecha: YYYY-MM-DD
  const dayKey = new Date().toISOString().slice(0, 10);
  const ref = db.doc(`journals/${uid}/system/chat_usage/${dayKey}`);

  const snap = await ref.get();
  const nowTs = admin.firestore.Timestamp.now();
  const nowMs = Date.now();
  const cur = snap.exists ? (snap.data() as any) : {};

  // Helper: verificar si un timestamp está dentro de una ventana temporal
  const within = (ts: any, ms: number) => {
    if (!ts) return false;
    const tsMs = ts.toMillis?.() ?? ts;
    return nowMs - tsMs < ms;
  };

  // Leer contadores existentes de ventana de 10 min
  const bk = cur.abuse?.blocked10m;
  const wk = cur.abuse?.warn10m;
  
  const blk = bk && within(bk.ts, 10 * 60 * 1000) ? (bk.count ?? 0) : 0;
  const wrn = wk && within(wk.ts, 10 * 60 * 1000) ? (wk.count ?? 0) : 0;

  // Incrementar según el evento actual
  let newBlk = blk;
  let newWrn = wrn;

  if (label === 'blocked') {
    newBlk++;
  }
  if (label === 'warn') {
    newWrn++;
  }

  // Actualizar contadores
  await ref.set(
    {
      abuse: {
        blocked10m: {
          count: newBlk,
          ts: nowTs,
        },
        warn10m: {
          count: newWrn,
          ts: nowTs,
        },
        updatedAt: nowTs,
      },
    },
    { merge: true }
  );

  // CIRCUIT BREAKER: >= 3 eventos blocked en 10 min
  if (newBlk >= 3) {
    const penaltySec = 10 * 60; // 10 minutos
    const backoffUntil = admin.firestore.Timestamp.fromMillis(
      nowMs + penaltySec * 1000
    );

    await ref.set(
      {
        backoffUntil,
        updatedAt: nowTs,
      },
      { merge: true }
    );

    return {
      ok: false,
      code: 'abuse_blocked',
      retryAfterSec: penaltySec,
    };
  }

  return { ok: true };
}
