import { db } from '@lib/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  writeBatch,
  getDocs,
  limit as qLimit,
  Timestamp,
  DocumentData,
  Unsubscribe,
  QueryConstraint,
  QueryDocumentSnapshot,
  setDoc,
} from 'firebase/firestore';
import type { JournalEntry, JournalListItem, EntryId } from './types';

const PAGE_SIZE_DEFAULT = 20;

// Referencias a la colección de entradas (formato nuevo)
const colEntries = () => collection(db, 'entries');
const entryDoc = (entryId: string) => doc(db, 'entries', entryId);

// Referencias para subcolección de imágenes
const imagesCol = (entryId: EntryId) => 
  collection(db, `entries/${entryId}/images`);
const imageDoc = (entryId: EntryId, imageId: string) => 
  doc(db, `entries/${entryId}/images/${imageId}`);
// Mapear DocumentData -> JournalListItem (para lista)
const toListItem = (docId: string, d: DocumentData): JournalListItem => {
  const created = d.createdAt as Timestamp | Date | undefined;
  const createdAt =
    created instanceof Timestamp
      ? created.toDate().getTime()
      : created instanceof Date
      ? created.getTime()
      : Date.now();
  const excerpt: string = String(d.content ?? '').slice(0, 160);
  return {
    id: docId,
    title: d.title || undefined,
    excerpt,
    createdAt,
    mood: d.mood,
    energy: d.energy,
    tags: Array.isArray(d.tags) ? d.tags : [],
    isFavorite: !!d.isFavorite,
    imageCount: d.imageCount || 0,
    hasAudio: !!d.hasAudio,
  };
};

export async function createEntry(
  userId: string,
  payload: Omit<JournalEntry, 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(colEntries(), {
    ...payload,
    userId, // Agregar userId al documento
    isFavorite: payload.isFavorite ?? false,
    state: payload.state ?? 'active',
    wordCount: payload.content?.length ?? 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export function subscribeActiveEntries(
  userId: string,
  cb: (items: JournalListItem[]) => void
): Unsubscribe {
  const q = query(
    colEntries(),
    where('userId', '==', userId),
    where('state', '==', 'active'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => toListItem(d.id, d.data()));
    cb(items);
  });
}

// ========== OPERACIONES CRUD INDIVIDUALES ==========

export async function updateEntry(
  userId: string,
  entryId: EntryId,
  patch: Partial<Pick<JournalEntry, 'title' | 'content' | 'mood' | 'energy' | 'tags' | 'isFavorite' | 'imageCount' | 'hasAudio'>>
) {
  await updateDoc(entryDoc(entryId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function toggleFavorite(userId: string, entryId: EntryId, next: boolean) {
  await updateDoc(entryDoc(entryId), {
    isFavorite: next,
    updatedAt: serverTimestamp(),
  });
}

export async function softDeleteEntry(userId: string, entryId: EntryId) {
  await updateDoc(entryDoc(entryId), {
    state: 'trashed',
    updatedAt: serverTimestamp(),
  });
}

export async function restoreEntry(userId: string, entryId: EntryId) {
  await updateDoc(entryDoc(entryId), {
    state: 'active',
    updatedAt: serverTimestamp(),
  });
}

// Suscripción a un documento individual (para detalle)
export function subscribeEntry(
  userId: string,
  entryId: EntryId,
  cb: (data: (JournalEntry & { id: EntryId }) | null) => void
): Unsubscribe {
  return onSnapshot(entryDoc(entryId), (snap) => {
    if (!snap.exists()) {
      cb(null);
      return;
    }
    const d = snap.data() as DocumentData;
    cb({
      id: snap.id as EntryId,
      title: d.title,
      content: d.content ?? '',
      mood: d.mood,
      energy: d.energy,
      tags: Array.isArray(d.tags) ? d.tags : [],
      isFavorite: !!d.isFavorite,
      state: d.state ?? 'active',
      wordCount: d.wordCount,
      imageCount: d.imageCount ?? 0,
      hasAudio: !!d.hasAudio,
      createdAt: d.createdAt?.toDate?.() ?? new Date(),
      updatedAt: d.updatedAt?.toDate?.() ?? new Date(),
    });
  });
}

// ========== OPERACIONES DE PAPELERA ==========

export function subscribeTrashedEntries(
  userId: string,
  cb: (items: JournalListItem[]) => void
): Unsubscribe {
  const q = query(
    colEntries(),
    where('userId', '==', userId),
    where('state', '==', 'trashed'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => toListItem(d.id, d.data()));
    cb(rows);
  });
}

export async function deleteEntryPermanent(userId: string, entryId: EntryId) {
  await deleteDoc(entryDoc(entryId));
}

export async function emptyTrash(userId: string, batchSize: number = 25): Promise<number> {
  // Borra en lotes para evitar limitaciones del batch (máx 500 operaciones)
  const q = query(
    colEntries(),
    where('userId', '==', userId),
    where('state', '==', 'trashed'),
    qLimit(batchSize)
  );
  const snap = await getDocs(q);
  
  if (snap.empty) return 0;
  
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  
  return snap.size; // cantidad borrada en este ciclo
}

// ========== CONSULTAS PAGINADAS ==========

// Convertir preset de fecha a timestamp
export function datePresetToFromMs(preset: 'all' | 'today' | '7d' | '30d'): number | null {
  if (preset === 'all') return null;
  const now = Date.now();
  if (preset === 'today') {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (preset === '7d') return now - 7 * 24 * 60 * 60 * 1000;
  if (preset === '30d') return now - 30 * 24 * 60 * 60 * 1000;
  return null;
}

type PageResult<T> = {
  rows: T[];
  nextCursor: QueryDocumentSnapshot<DocumentData> | null;
};

export async function queryActivePage(
  userId: string,
  opts: {
    mood?: number | null;
    fromMs?: number | null; // createdAt >= fromMs
    pageSize?: number;
    cursor?: QueryDocumentSnapshot<DocumentData> | null;
  }
): Promise<PageResult<JournalListItem>> {
  const clauses: QueryConstraint[] = [
    where('userId', '==', userId),
    where('state', '==', 'active'),
    orderBy('createdAt', 'desc'),
    limit(opts.pageSize ?? PAGE_SIZE_DEFAULT),
  ];
  
  if (opts.mood) clauses.splice(2, 0, where('mood', '==', opts.mood));
  if (opts.cursor) clauses.push(startAfter(opts.cursor));

  // Nota: el filtro de fecha lo hacemos CLIENT-SIDE para evitar índices compuestos adicionales
  const q = query(colEntries(), ...clauses);
  const snap = await getDocs(q);
  let docs = snap.docs;

  // Filtro fecha client-side si aplica
  if (opts.fromMs) {
    docs = docs.filter((d) => {
      const ts = d.data().createdAt;
      const ms = ts?.toDate ? ts.toDate().getTime() : ts instanceof Date ? ts.getTime() : 0;
      return ms >= opts.fromMs!;
    });
  }

  const rows = docs.map((d) => toListItem(d.id, d.data()));
  const nextCursor =
    snap.docs.length === (opts.pageSize ?? PAGE_SIZE_DEFAULT) ? snap.docs[snap.docs.length - 1] : null;
  return { rows, nextCursor };
}

export async function queryFavoritesPage(
  userId: string,
  opts: {
    fromMs?: number | null;
    pageSize?: number;
    cursor?: QueryDocumentSnapshot<DocumentData> | null;
  }
): Promise<PageResult<JournalListItem>> {
  const clauses: QueryConstraint[] = [
    where('userId', '==', userId),
    where('state', '==', 'active'),
    where('isFavorite', '==', true),
    orderBy('createdAt', 'desc'),
    limit(opts.pageSize ?? PAGE_SIZE_DEFAULT),
  ];
  
  if (opts.cursor) clauses.push(startAfter(opts.cursor));
  
  const q = query(colEntries(), ...clauses);
  const snap = await getDocs(q);

  let docs = snap.docs;
  
  // Filtro fecha client-side si aplica
  if (opts.fromMs) {
    docs = docs.filter((d) => {
      const ts = d.data().createdAt;
      const ms = ts?.toDate ? ts.toDate().getTime() : ts instanceof Date ? ts.getTime() : 0;
      return ms >= opts.fromMs!;
    });
  }

  const rows = docs.map((d) => toListItem(d.id, d.data()));
  const nextCursor =
    snap.docs.length === (opts.pageSize ?? PAGE_SIZE_DEFAULT) ? snap.docs[snap.docs.length - 1] : null;
  return { rows, nextCursor };
}


// ============================================================================
// SUBCOLECCIÓN DE IMÁGENES
// ============================================================================

/**
 * Inserta o actualiza metadatos de una imagen en la subcolección images
 */
export async function upsertEntryImage(
  userId: string,
  entryId: EntryId,
  imageId: string,
  payload: {
    path: string;
    url: string;
    thumbPath: string;
    thumbUrl: string;
    width: number;
    height: number;
    bytes: number;
  }
) {
  await setDoc(
    imageDoc(entryId, imageId),
    {
      id: imageId,
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Actualiza el contador de imágenes en la entrada principal
 */
export async function bumpImageCount(userId: string, entryId: EntryId, count: number) {
  await updateDoc(entryDoc(entryId), {
    imageCount: count,
    updatedAt: serverTimestamp(),
  });
}



// ============================================================================
// SUBCOLECCIÓN DE AUDIO
// ============================================================================

const audioCol = (entryId: EntryId) =>
  collection(db, `entries/${entryId}/audio`);
const audioDoc = (entryId: EntryId, audioId: string) =>
  doc(db, `entries/${entryId}/audio/${audioId}`);

/**
 * Inserta o actualiza metadatos de un audio en la subcolección audio
 */
export async function upsertEntryAudio(
  userId: string,
  entryId: EntryId,
  audioId: string,
  payload: {
    path: string;
    url: string;
    durationMs: number;
    bytes: number;
  }
) {
  await setDoc(
    audioDoc(entryId, audioId),
    {
      id: audioId,
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Actualiza el flag hasAudio en la entrada principal
 */
export async function setHasAudio(userId: string, entryId: EntryId, has: boolean) {
  await updateDoc(entryDoc(entryId), {
    hasAudio: has,
    updatedAt: serverTimestamp(),
  });
}



/**
 * Obtiene el primer audio de una entrada (si existe)
 */
export async function getEntryAudio(userId: string, entryId: EntryId): Promise<{
  id: string;
  url: string;
  durationMs: number;
} | null> {
  try {
    const snap = await getDocs(
      query(audioCol(entryId), orderBy("createdAt", "desc"), qLimit(1))
    );
    if (snap.empty) return null;
    const doc = snap.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      url: data.url,
      durationMs: data.durationMs || 0,
    };
  } catch (error) {
    console.error("[repo] Error getting entry audio:", error);
    return null;
  }
}


/**
 * Obtiene todas las entradas activas (no eliminadas) con paginación
 * Para construcción de índice de búsqueda y exportación
 */
export async function fetchAllActiveEntries(
  userId: string,
  limit: number = 2000
): Promise<Array<{
  id: string;
  createdAt: number;
  title?: string;
  content?: string;
  tags?: string[];
}>> {
  try {
    const q = query(
      colEntries(),
      where('userId', '==', userId),
      where('state', '==', 'active'),
      orderBy('createdAt', 'desc'),
      qLimit(limit)
    );

    const snapshot = await getDocs(q);
    
    const entries = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        createdAt: data.createdAt || 0,
        title: data.title,
        content: data.content,
        tags: data.tags || [],
      };
    });

    return entries;
  } catch (error) {
    console.error('[repo] Error fetching all active entries:', error);
    throw error;
  }
}
