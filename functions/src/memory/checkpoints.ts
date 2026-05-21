/**
 * Sistema de checkpoints (resúmenes por hito)
 * Crea resúmenes automáticos cada ~20 turnos con topics y acciones
 */

import { db } from '../services/firestore';
import admin from 'firebase-admin';
import { redactFreeText, SPANISH_STOPWORDS } from './redact';
import type { Checkpoint } from './types';

/**
 * Extrae los términos más frecuentes del texto (excluye stopwords)
 * 
 * @param text - Texto a analizar
 * @param count - Número máximo de términos a retornar
 * @returns Array de términos ordenados por frecuencia
 */
export function extractTopTerms(text: string, count: number): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^\wáéíóúñü\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !SPANISH_STOPWORDS.has(w));

  const freq = new Map<string, number>();
  words.forEach(w => freq.set(w, (freq.get(w) ?? 0) + 1));

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([word]) => word);
}

/**
 * Extrae acciones/estrategias mencionadas usando patrones
 * 
 * @param text - Texto a analizar
 * @returns Array de acciones detectadas
 */
export function extractActions(text: string): string[] {
  const lower = text.toLowerCase();
  const actions: string[] = [];

  const patterns = [
    { regex: /respiraci[oó]n\s*(?:[\d-]+)?/gi, label: 'respiración' },
    { regex: /caminata\s*(?:consciente)?/gi, label: 'caminata' },
    { regex: /meditaci[oó]n/gi, label: 'meditación' },
    { regex: /journaling|escribir\s+diario/gi, label: 'journaling' },
    { regex: /ejercicio\s*(?:f[ií]sico)?/gi, label: 'ejercicio' },
    { regex: /yoga/gi, label: 'yoga' },
    { regex: /mindfulness/gi, label: 'mindfulness' },
    { regex: /ducha\s*(?:fr[ií]a)?/gi, label: 'ducha' },
    { regex: /m[uú]sica/gi, label: 'música' },
    { regex: /lectura|leer/gi, label: 'lectura' },
  ];

  patterns.forEach(({ regex, label }) => {
    if (regex.test(lower)) {
      actions.push(label);
    }
  });

  return Array.from(new Set(actions));
}

/**
 * Sintetiza un resumen de 4-6 oraciones del texto
 * Heurística simple: extrae las primeras y últimas oraciones del usuario
 * 
 * @param text - Texto completo (ya redactado)
 * @param topics - Topics extraídos (para contexto)
 * @param actions - Acciones extraídas (para mención)
 * @returns Resumen de 4-6 oraciones
 */
export function synthesizeSummary(
  text: string,
  topics: string[],
  actions: string[]
): string {
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20);

  if (sentences.length === 0) {
    return 'Conversación breve sin contenido significativo.';
  }

  // Estrategia: primera, última, y algunas intermedias
  const selected: string[] = [];
  
  // Primera oración
  if (sentences.length > 0) {
    selected.push(sentences[0]);
  }

  // Algunas intermedias (buscar menciones de emociones)
  const emotionKeywords = ['siento', 'sentí', 'me siento', 'ansiedad', 'tristeza', 'enojo', 'frustración'];
  const emotionSentences = sentences.filter(s => 
    emotionKeywords.some(kw => s.toLowerCase().includes(kw))
  );
  if (emotionSentences.length > 0 && selected.length < 5) {
    selected.push(emotionSentences[0]);
  }

  // Última oración
  if (sentences.length > 1 && selected.length < 5) {
    selected.push(sentences[sentences.length - 1]);
  }

  // Agregar mención de acciones si hay
  if (actions.length > 0 && selected.length < 6) {
    selected.push(`Se mencionaron estrategias como: ${actions.join(', ')}.`);
  }

  // Agregar mención de topics si hay espacio
  if (topics.length > 0 && selected.length < 6) {
    selected.push(`Temas principales: ${topics.slice(0, 5).join(', ')}.`);
  }

  const summary = selected.join(' ').slice(0, 500);
  return summary || 'Conversación sin resumen disponible.';
}

/**
 * Construye un checkpoint a partir de los últimos turnos
 * 
 * @param uid - User ID
 * @param cid - Conversation ID
 * @param turns - Array de turnos recientes (user/assistant)
 * @param turnNumber - Número de turno actual
 */
export async function buildCheckpointFromTurns(
  uid: string,
  cid: string,
  turns: { role: 'user' | 'assistant'; content: string }[],
  turnNumber: number
): Promise<void> {
  // Concatenar todo el texto
  const text = turns.map(t => t.content).join(' ');
  const safe = redactFreeText(text);

  // Extraer información
  const keyTopics = extractTopTerms(safe, 7);
  const actions = extractActions(safe);
  const summary = synthesizeSummary(safe, keyTopics, actions);

  // Generar ID con padding
  const id = `t${String(turnNumber).padStart(4, '0')}`;

  // Guardar en Firestore
  await db
    .doc(`journals/${uid}/conversations/${cid}/memory/checkpoints/${id}`)
    .set(
      {
        id,
        turn: turnNumber,
        summary,
        keyTopics,
        actionsTried: actions,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      } as Checkpoint,
      { merge: true }
    );
}

/**
 * Crea checkpoint automáticamente si es múltiplo de lastN
 * 
 * @param uid - User ID
 * @param cid - Conversation ID
 * @param lastN - Cada cuántos mensajes crear checkpoint (default: 20)
 */
export async function maybeCreateCheckpoint(
  uid: string,
  cid: string,
  lastN = 20
): Promise<void> {
  // Contar mensajes totales
  const msgs = await db
    .collection(`journals/${uid}/conversations/${cid}/messages`)
    .orderBy('createdAt', 'asc')
    .get();

  const turn = msgs.size;

  // Solo crear si es múltiplo de lastN y hay mensajes
  if (turn > 0 && turn % lastN === 0) {
    // Obtener los últimos lastN mensajes
    const recent = msgs.docs
      .slice(-lastN)
      .map(d => d.data() as any)
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content ?? '',
      }));

    await buildCheckpointFromTurns(uid, cid, recent, turn);
  }
}
