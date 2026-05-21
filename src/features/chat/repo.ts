/**
 * Chat Repository
 * 
 * Funciones para interactuar con Firestore:
 * - Conversaciones del usuario
 * - Mensajes (lectura en tiempo real)
 * - Envío de mensajes
 */

import {db} from '@lib/firebase';
import {
  collection,
  doc,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  deleteDoc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import type {ChatMessage, Conversation} from './types';

/**
 * Referencia a una conversación específica
 */
export function conversationRef(userId: string, conversationId: string) {
  return doc(db, `journals/${userId}/conversations/${conversationId}`);
}

/**
 * Colección de mensajes de una conversación
 */
export function messagesCol(userId: string, conversationId: string) {
  return collection(
    db,
    `journals/${userId}/conversations/${conversationId}/messages`
  );
}

/**
 * Asegura que existe una conversación (crea una nueva si no se proporciona ID)
 */
export async function ensureConversation(
  userId: string,
  conversationId?: string
): Promise<string> {
  if (conversationId) return conversationId;

  // Crear nueva conversación
  const col = collection(db, `journals/${userId}/conversations`);
  const ref = await addDoc(col, {
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    messageCount: 0,
    state: 'active',
  });

  return ref.id;
}

/**
 * Listener en tiempo real de mensajes de una conversación
 * Retorna función unsubscribe
 */
export function listenMessages(
  userId: string,
  conversationId: string,
  cb: (msgs: ChatMessage[]) => void
) {
  const q = query(
    messagesCol(userId, conversationId),
    orderBy('createdAt', 'asc'),
    limit(500)
  );

  return onSnapshot(q, (snap) => {
    const res: ChatMessage[] = snap.docs.map((d) => {
      const x = d.data() as any;
      return {
        id: d.id,
        role: x.role,
        content: x.content,
        createdAt: x.createdAt?.toMillis?.() ?? Date.now(),
        status: x.status ?? 'sent',
        meta: x.meta ?? {},
      };
    });
    cb(res);
  });
}

/**
 * Envía un mensaje del usuario
 * Actualiza el resumen de la conversación
 * Retorna el ID del mensaje creado
 */
export async function sendUserMessage(
  userId: string,
  conversationId: string,
  content: string
): Promise<{id: string}> {
  const col = messagesCol(userId, conversationId);

  // Guardar mensaje
  const ref = await addDoc(col, {
    role: 'user',
    content,
    createdAt: serverTimestamp(),
    status: 'sent',
  });

  // Actualizar resumen de conversación
  await updateDoc(conversationRef(userId, conversationId), {
    updatedAt: serverTimestamp(),
    lastMessagePreview: content.slice(0, 80),
  });

  return {id: ref.id};
}

/**
 * Elimina una conversación completa y todos sus mensajes.
 * 
 * Proceso:
 * 1. Elimina todos los mensajes en lotes (máximo 500 por batch)
 * 2. Elimina el documento de la conversación
 * 
 * @param userId - ID del usuario
 * @param conversationId - ID de la conversación a eliminar
 */
export async function deleteConversation(
  userId: string,
  conversationId: string
): Promise<void> {
  // Obtener todos los mensajes
  const col = messagesCol(userId, conversationId);
  const snap = await getDocs(col);

  // Eliminar mensajes en lotes (Firestore tiene límite de 500 operaciones por batch)
  const batchSize = 500;
  let i = 0;

  while (i < snap.docs.length) {
    const slice = snap.docs.slice(i, i + batchSize);
    const batch = writeBatch(db);

    slice.forEach((d) => batch.delete(d.ref));

    await batch.commit();
    i += batchSize;
  }

  // Eliminar documento de conversación
  await deleteDoc(conversationRef(userId, conversationId));
}
