/**
 * Chat Context Loader
 * 
 * Carga el contexto de conversación desde Firestore:
 * - Últimos N mensajes
 * - Truncado por maxChars (prioriza mensajes más recientes)
 */

import {db} from '../services/firestore';
import type {ChatTurn} from './base';

export async function loadContext(
  userId: string,
  conversationId: string,
  maxContext = 12,
  maxChars = 6000
): Promise<{history: ChatTurn[]}> {
  const messagesRef = db
    .collection(`journals/${userId}/conversations/${conversationId}/messages`)
    .orderBy('createdAt', 'desc')
    .limit(maxContext);

  const snapshot = await messagesRef.get();

  // Convertir a ChatTurn y revertir orden (más antiguo primero)
  let turns: ChatTurn[] = snapshot.docs
    .map((doc) => {
      const data = doc.data();
      return {
        role: data.role as 'user' | 'assistant' | 'system',
        content: data.content || '',
        createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
      };
    })
    .reverse();

  // Truncar si supera maxChars (prioriza mensajes más recientes)
  let totalChars = 0;
  const truncated: ChatTurn[] = [];

  // Iterar desde el más reciente (invertir para truncar desde el final)
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    const charCount = turn.content.length;

    if (totalChars + charCount > maxChars && truncated.length > 0) {
      // Ya tenemos contexto suficiente, detenemos
      break;
    }

    totalChars += charCount;
    truncated.unshift(turn); // Agregar al inicio
  }

  return {history: truncated};
}
