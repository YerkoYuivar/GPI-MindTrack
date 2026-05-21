/**
 * Chat Message Writer
 * 
 * Funciones para escribir mensajes del asistente en Firestore:
 * - Crear mensaje placeholder (pending)
 * - Actualizar contenido con chunks incrementales
 * - Finalizar mensaje (sent) con metadata de seguridad
 */

import {db} from '../services/firestore';
import {FieldValue} from 'firebase-admin/firestore';

/**
 * Crea un mensaje placeholder del asistente con status='pending'
 * Retorna el messageId
 */
export async function createAssistantMessage(
  userId: string,
  conversationId: string
): Promise<string> {
  const messagesRef = db.collection(
    `journals/${userId}/conversations/${conversationId}/messages`
  );

  const docRef = await messagesRef.add({
    role: 'assistant',
    content: '',
    createdAt: FieldValue.serverTimestamp(),
    status: 'pending',
    meta: {},
  });

  return docRef.id;
}

/**
 * Agrega texto incremental al mensaje del asistente
 */
export async function appendToAssistantMessage(
  userId: string,
  conversationId: string,
  messageId: string,
  delta: string
): Promise<void> {
  const messageRef = db.doc(
    `journals/${userId}/conversations/${conversationId}/messages/${messageId}`
  );

  // Obtener contenido actual
  const doc = await messageRef.get();
  const currentContent = (doc.data()?.content as string) || '';

  // Agregar delta
  await messageRef.update({
    content: currentContent + delta,
  });
}

/**
 * Finaliza el mensaje del asistente
 * Marca como 'sent' y agrega metadata de seguridad y acciones sugeridas
 */
export async function finalizeAssistantMessage(
  userId: string,
  conversationId: string,
  messageId: string,
  safety: 'ok' | 'warn' | 'blocked',
  crisis?: boolean,
  actions?: Array<{type: string; label: string; params?: any}>
): Promise<void> {
  const messageRef = db.doc(
    `journals/${userId}/conversations/${conversationId}/messages/${messageId}`
  );

  await messageRef.update({
    status: 'sent',
    'meta.safety': safety,
    ...(crisis !== undefined && {'meta.crisis': crisis}),
    ...(actions && actions.length > 0 && {actions}),
  });

  // Actualizar resumen de conversación
  const conversationRef = db.doc(
    `journals/${userId}/conversations/${conversationId}`
  );

  const messageDoc = await messageRef.get();
  const content = (messageDoc.data()?.content as string) || '';

  await conversationRef.update({
    updatedAt: FieldValue.serverTimestamp(),
    lastMessagePreview: content.slice(0, 80),
  });
}

/**
 * Marca mensaje como fallido (en caso de error)
 */
export async function markMessageFailed(
  userId: string,
  conversationId: string,
  messageId: string,
  error: string
): Promise<void> {
  const messageRef = db.doc(
    `journals/${userId}/conversations/${conversationId}/messages/${messageId}`
  );

  await messageRef.update({
    status: 'failed',
    'meta.error': error,
  });
}
