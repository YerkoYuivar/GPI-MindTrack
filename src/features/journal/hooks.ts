import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  createEntry,
  subscribeActiveEntries,
  subscribeEntry,
  updateEntry,
  toggleFavorite,
  softDeleteEntry,
  restoreEntry,
  subscribeTrashedEntries,
  deleteEntryPermanent,
  emptyTrash,
  queryActivePage,
  queryFavoritesPage,
  datePresetToFromMs,
} from './repo';
import type { JournalEntry, JournalListItem, EntryId } from './types';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { useFilters } from '@state/selectors';
import { ensureAuthUser } from '@lib/firebase/auth';

/**
 * Hook para obtener el UID del usuario autenticado
 * Usa autenticación anónima si no hay usuario
 */
function useUserId() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    ensureAuthUser().then(setUserId);
  }, []);

  return userId;
}

export function useJournalList() {
  const [items, setItems] = useState<JournalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = useUserId();

  useEffect(() => {
    if (!userId) return;
    
    const unsub = subscribeActiveEntries(userId, (rows) => {
      setItems(rows);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { items, loading };
}

export function useCreateEntry() {
  const [pending, setPending] = useState(false);
  const userId = useUserId();

  const create = async (
    entry: Omit<JournalEntry, 'createdAt' | 'updatedAt' | 'state' | 'isFavorite' | 'wordCount'>
  ) => {
    if (!userId) throw new Error('User not authenticated');
    
    setPending(true);
    try {
      const id = await createEntry(userId, {
        ...entry,
        state: 'active',
        isFavorite: false,
      });
      return id;
    } finally {
      setPending(false);
    }
  };

  return { create, pending };
}

// ========== HOOKS PARA OPERACIONES INDIVIDUALES ==========

export function useEntry(entryId: EntryId) {
  const [data, setData] = useState<(JournalEntry & { id: EntryId }) | null>(null);
  const [loading, setLoading] = useState(true);
  const userId = useUserId();

  useEffect(() => {
    if (!userId || !entryId) {
      setLoading(false);
      return;
    }
    const unsub = subscribeEntry(userId, entryId, (d) => {
      setData(d);
      setLoading(false);
    });
    return () => unsub();
  }, [entryId, userId]);

  return { data, loading };
}

export function useUpdateEntry() {
  const [pending, setPending] = useState(false);

  const update = useCallback(async (entryId: EntryId, patch: Parameters<typeof updateEntry>[2]) => {
    const userId = await ensureAuthUser();
    setPending(true);
    try {
      await updateEntry(userId, entryId, patch);
    } finally {
      setPending(false);
    }
  }, []);

  return { update, pending };
}

export function useToggleFavorite() {
  const [pending, setPending] = useState(false);

  const toggle = useCallback(async (entryId: EntryId, next: boolean) => {
    const userId = await ensureAuthUser();
    setPending(true);
    try {
      await toggleFavorite(userId, entryId, next);
    } finally {
      setPending(false);
    }
  }, []);

  return { toggle, pending };
}

export function useSoftDeleteEntry() {
  const [pending, setPending] = useState(false);

  const softDelete = useCallback(async (entryId: EntryId) => {
    const userId = await ensureAuthUser();
    setPending(true);
    try {
      await softDeleteEntry(userId, entryId);
    } finally {
      setPending(false);
    }
  }, []);

  return { softDelete, pending };
}

export function useRestoreEntry() {
  const [pending, setPending] = useState(false);

  const restore = useCallback(async (entryId: EntryId) => {
    const userId = await ensureAuthUser();
    setPending(true);
    try {
      await restoreEntry(userId, entryId);
    } finally {
      setPending(false);
    }
  }, []);

  return { restore, pending };
}

// ========== HOOKS PARA PAPELERA ==========

export function useTrashedList() {
  const [items, setItems] = useState<JournalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = useUserId();

  useEffect(() => {
    if (!userId) return;
    
    const unsub = subscribeTrashedEntries(userId, (rows) => {
      setItems(rows);
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  return { items, loading };
}

export function useDeletePermanent() {
  const [pending, setPending] = useState(false);

  const removeForever = useCallback(async (entryId: EntryId) => {
    const userId = await ensureAuthUser();
    setPending(true);
    try {
      await deleteEntryPermanent(userId, entryId);
    } finally {
      setPending(false);
    }
  }, []);

  return { removeForever, pending };
}

export function useEmptyTrash() {
  const [pending, setPending] = useState(false);

  const emptyAll = useCallback(async () => {
    setPending(true);
    try {
      let total = 0;
      let removed;
      // Ejecutar en bucle hasta que no haya más elementos
      const userId = await ensureAuthUser();
      do {
        removed = await emptyTrash(userId, 25);
        total += removed;
      } while (removed > 0);
      return total;
    } finally {
      setPending(false);
    }
  }, []);

  return { emptyAll, pending };
}

// ========== HOOKS PAGINADOS CON FILTROS ==========

type Paged<T> = {
  items: T[];
  loading: boolean;
  loadingMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  reachedEnd: boolean;
};

// Filtro de texto client-side
function useTextFilter<T extends JournalListItem>(
  rows: T[],
  query: string,
  mood: number | null
): T[] {
  const q = query.trim().toLowerCase();
  return useMemo(() => {
    const base = rows.filter((it) => (mood ? it.mood === mood : true));
    if (!q) return base;
    return base.filter((it) => {
      const bag = `${it.title ?? ''} ${it.excerpt} ${it.tags.join(' ')}`.toLowerCase();
      return bag.includes(q);
    });
  }, [rows, q, mood]);
}

export function useJournalListPaged(pageSize = 20): Paged<JournalListItem> {
  const { query, mood, datePreset } = useFilters();
  const userId = useUserId();
  const fromMs = datePresetToFromMs(datePreset);

  const cursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [rows, setRows] = useState<JournalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);

  const fetchFirst = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const { rows: fetchedRows, nextCursor } = await queryActivePage(userId, {
        mood,
        fromMs,
        pageSize,
        cursor: null,
      });
      cursorRef.current = nextCursor;
      setRows(fetchedRows);
      setReachedEnd(!nextCursor);
    } finally {
      setLoading(false);
    }
  }, [userId, mood, fromMs, pageSize]);

  const loadMore = useCallback(async () => {
    if (!userId || loading || loadingMore || reachedEnd) return;
    if (!cursorRef.current) return;
    setLoadingMore(true);
    try {
      const { rows: more, nextCursor } = await queryActivePage(userId, {
        mood,
        fromMs,
        pageSize,
        cursor: cursorRef.current,
      });
      setRows((prev) => [...prev, ...more]);
      cursorRef.current = nextCursor;
      if (!nextCursor || more.length === 0) setReachedEnd(true);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, reachedEnd, mood, fromMs, pageSize]);

  const refresh = useCallback(async () => {
    cursorRef.current = null;
    setReachedEnd(false);
    await fetchFirst();
  }, [fetchFirst]);

  useEffect(() => {
    fetchFirst();
  }, [fetchFirst]);

  const filtered = useTextFilter(rows, query, mood ?? null);
  return { items: filtered, loading, loadingMore, loadMore, refresh, reachedEnd };
}

export function useFavoritesListPaged(pageSize = 20): Paged<JournalListItem> {
  const { query, datePreset, mood } = useFilters(); // mood se usa como filtro local
  const userId = useUserId();
  const fromMs = datePresetToFromMs(datePreset);
  const cursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [rows, setRows] = useState<JournalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);

  const fetchFirst = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const { rows: fetchedRows, nextCursor } = await queryFavoritesPage(userId, {
        fromMs,
        pageSize,
        cursor: null,
      });
      cursorRef.current = nextCursor;
      setRows(fetchedRows);
      setReachedEnd(!nextCursor);
    } finally {
      setLoading(false);
    }
  }, [fromMs, pageSize]);

  const loadMore = useCallback(async () => {
    if (!userId || loading || loadingMore || reachedEnd) return;
    if (!cursorRef.current) return;
    setLoadingMore(true);
    try {
      const { rows: more, nextCursor } = await queryFavoritesPage(userId, {
        fromMs,
        pageSize,
        cursor: cursorRef.current,
      });
      setRows((prev) => [...prev, ...more]);
      cursorRef.current = nextCursor;
      if (!nextCursor || more.length === 0) setReachedEnd(true);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, reachedEnd, fromMs, pageSize]);

  const refresh = useCallback(async () => {
    cursorRef.current = null;
    setReachedEnd(false);
    await fetchFirst();
  }, [fetchFirst]);

  useEffect(() => {
    fetchFirst();
  }, [fetchFirst]);

  // Filtro local de texto + mood sobre rows ya favoritos
  const filtered = useTextFilter(rows, query, mood ?? null);
  return { items: filtered, loading, loadingMore, loadMore, refresh, reachedEnd };
}
