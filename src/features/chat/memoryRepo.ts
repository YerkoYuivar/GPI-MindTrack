/**
 * Repositorio para acceso a la memoria conversacional
 * - Checkpoints: resúmenes por hito
 * - ProfileSlots: slots de perfil del usuario
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  limit,
  deleteDoc,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * Tipo para Checkpoint
 */
export type Checkpoint = {
  id: string;
  turn: number;
  summary: string;
  keyTopics: string[];
  actionsTried: string[];
  updatedAt: any;
};

/**
 * Tipo para ProfileSlots
 */
export type ProfileSlots = {
  triggers: string[];
  helpfulPractices: string[];
  preferredTone?: 'directo' | 'suave' | 'neutro';
  checkInTime?: string;
  crisisHistory?: boolean;
  updatedAt: any;
};

/**
 * Obtiene los checkpoints más recientes de una conversación
 * 
 * @param userId - ID del usuario
 * @param conversationId - ID de la conversación
 * @param max - Número máximo de checkpoints a obtener (default: 5)
 * @returns Array de checkpoints ordenados por turno descendente
 */
export async function getCheckpoints(
  userId: string,
  conversationId: string,
  max = 5
): Promise<Checkpoint[]> {
  const col = collection(
    db,
    `journals/${userId}/conversations/${conversationId}/memory/checkpoints`
  );
  const q = query(col, orderBy('turn', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as Checkpoint);
}

/**
 * Obtiene los slots del perfil del usuario
 * 
 * @param userId - ID del usuario
 * @returns Slots del perfil o null si no existe
 */
export async function getProfileSlots(userId: string): Promise<ProfileSlots | null> {
  const ref = doc(db, `journals/${userId}/memory/profile`);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as ProfileSlots) : null;
}

/**
 * Borra el perfil del usuario
 * 
 * @param userId - ID del usuario
 */
export async function deleteProfileSlots(userId: string): Promise<void> {
  const ref = doc(db, `journals/${userId}/memory/profile`);
  await setDoc(ref, {
    triggers: [],
    helpfulPractices: [],
    updatedAt: new Date(),
  });
}

/**
 * Borra todos los checkpoints de una conversación
 * NOTA: En producción, considerar paginación para grandes volúmenes
 * 
 * @param userId - ID del usuario
 * @param conversationId - ID de la conversación
 */
export async function deleteCheckpoints(
  userId: string,
  conversationId: string
): Promise<void> {
  const col = collection(
    db,
    `journals/${userId}/conversations/${conversationId}/memory/checkpoints`
  );
  const snap = await getDocs(col);

  // Usar batch para eliminar en lotes de 500 (límite de Firestore)
  const batchSize = 500;
  let batch = writeBatch(db);
  let count = 0;

  for (const docSnap of snap.docs) {
    batch.delete(docSnap.ref);
    count++;

    if (count % batchSize === 0) {
      await batch.commit();
      batch = writeBatch(db);
    }
  }

  // Commit final si quedan documentos
  if (count % batchSize !== 0) {
    await batch.commit();
  }
}

/**
 * Fuerza la creación de un checkpoint
 * 
 * @param conversationId - ID de la conversación
 * @param lastN - Número de mensajes a incluir (default: 20)
 */
export async function forceCheckpoint(
  conversationId: string,
  lastN = 20
): Promise<void> {
  const functions = getFunctions();
  const callable = httpsCallable(functions, 'forceCheckpoint');
  await callable({ conversationId, lastN });
}
