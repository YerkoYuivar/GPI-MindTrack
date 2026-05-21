/**
 * Rate Limiting Guard
 * Controla la frecuencia de respuestas del chat para prevenir abuso y sobrecarga.
 * 
 * Límites:
 * - Por usuario: máx 20 respuestas en 10 min, 200 al día
 * - Por conversación: máx 10 respuestas en 5 min
 * - Backoff exponencial: 60-180s al alcanzar límite
 */

import * as admin from 'firebase-admin';
import { db } from '../services/firestore';

/**
 * Resultado de la verificación de rate limit
 */
export type RlDecision =
  | { ok: true }
  | { ok: false; code: 'rate_limited' | 'over_quota'; retryAfterSec: number };

/**
 * Verifica y consume un slot de rate limit para el usuario y conversación.
 * 
 * @param uid - ID del usuario
 * @param cid - ID de la conversación
 * @param now - Timestamp actual (inyectable para testing)
 * @returns Decisión de rate limit con código y tiempo de reintento si bloqueado
 */
export async function checkAndConsumeRate(
  uid: string,
  cid: string,
  now = new Date()
): Promise<RlDecision> {
  // Formato de fecha: YYYY-MM-DD
  const dayKey = now.toISOString().slice(0, 10);
  
  const userRef = db.doc(`journals/${uid}/system/chat_usage/${dayKey}`);
  const convRef = db.doc(`journals/${uid}/conversations/${cid}/system/rl`);

  // Leer documentos en paralelo
  const [userSnap, convSnap] = await Promise.all([
    userRef.get(),
    convRef.get(),
  ]);

  const user = userSnap.exists ? (userSnap.data() as any) : null;
  const conv = convSnap.exists ? (convSnap.data() as any) : null;

  const nowTs = admin.firestore.Timestamp.now();
  const nowMs = Date.now();

  // Helper: verificar si un timestamp ya pasó
  const isAfter = (ts?: any) => {
    if (!ts) return true;
    const ms = ts.toMillis?.() ?? ts;
    return ms <= nowMs;
  };

  // 1. VERIFICAR BACKOFF ACTIVO
  if (user?.backoffUntil && !isAfter(user.backoffUntil)) {
    const retry = Math.ceil((user.backoffUntil.toMillis() - nowMs) / 1000);
    return {
      ok: false,
      code: 'rate_limited',
      retryAfterSec: Math.max(1, retry),
    };
  }

  if (conv?.backoffUntil && !isAfter(conv.backoffUntil)) {
    const retry = Math.ceil((conv.backoffUntil.toMillis() - nowMs) / 1000);
    return {
      ok: false,
      code: 'rate_limited',
      retryAfterSec: Math.max(1, retry),
    };
  }

  // Helper: verificar si un timestamp está dentro de una ventana temporal
  const within = (ts: any, ms: number) => {
    if (!ts) return false;
    const tsMs = ts.toMillis?.() ?? ts;
    return nowMs - tsMs < ms;
  };

  // 2. CALCULAR CONTADORES EN VENTANAS DESLIZANTES
  const u10m = user?.window10m && within(user.window10m.ts, 10 * 60 * 1000)
    ? user.window10m.count
    : 0;

  const c5m = conv?.window5m && within(conv.window5m.ts, 5 * 60 * 1000)
    ? conv.window5m.count
    : 0;

  const dayCount = user?.dayCount ?? 0;

  // 3. VERIFICAR LÍMITES
  // Límite diario: 200 respuestas
  if (dayCount >= 200) {
    return {
      ok: false,
      code: 'over_quota',
      retryAfterSec: 3600, // Reintentar en 1 hora
    };
  }

  // Límites de frecuencia: 20/10min usuario, 10/5min conversación
  if (u10m >= 20 || c5m >= 10) {
    // Backoff exponencial: min 60s, max 180s
    // Aumenta según cuánto se excede el límite
    const penaltySec = Math.min(180, 60 + Math.floor((u10m + c5m) * 2));
    const backoffUntil = admin.firestore.Timestamp.fromMillis(
      nowMs + penaltySec * 1000
    );

    // Aplicar backoff en ambos documentos
    await Promise.all([
      userRef.set(
        {
          backoffUntil,
          updatedAt: nowTs,
        },
        { merge: true }
      ),
      convRef.set(
        {
          backoffUntil,
          updatedAt: nowTs,
        },
        { merge: true }
      ),
    ]);

    return {
      ok: false,
      code: 'rate_limited',
      retryAfterSec: penaltySec,
    };
  }

  // 4. CONSUMIR UN SLOT (incrementar contadores)
  await Promise.all([
    userRef.set(
      {
        dayCount: dayCount + 1,
        window10m: {
          count: u10m + 1,
          ts: nowTs,
        },
        updatedAt: nowTs,
      },
      { merge: true }
    ),
    convRef.set(
      {
        window5m: {
          count: c5m + 1,
          ts: nowTs,
        },
        updatedAt: nowTs,
      },
      { merge: true }
    ),
  ]);

  return { ok: true };
}
