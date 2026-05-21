export type DatePreset = 'all' | 'today' | '7d' | '30d';

export type JournalFilters = {
  query: string;
  onlyFavorites: boolean;
  mood: number | null; // 1..7 o null = cualquiera
  datePreset: DatePreset;
};

export type JournalFiltersSlice = {
  filters: JournalFilters;
  setQuery: (q: string) => void;
  setOnlyFavorites: (v: boolean) => void;
  setMood: (m: number | null) => void;
  setDatePreset: (p: DatePreset) => void;
  resetFilters: () => void;
};

export const defaultJournalFilters: JournalFilters = {
  query: '',
  onlyFavorites: false,
  mood: null,
  datePreset: 'all',
};

export const createJournalFiltersSlice = (set: any): JournalFiltersSlice => ({
  filters: defaultJournalFilters,
  setQuery: (q) => set((s: any) => ({ filters: { ...s.filters, query: q } })),
  setOnlyFavorites: (v) => set((s: any) => ({ filters: { ...s.filters, onlyFavorites: v } })),
  setMood: (m) => set((s: any) => ({ filters: { ...s.filters, mood: m } })),
  setDatePreset: (p) => set((s: any) => ({ filters: { ...s.filters, datePreset: p } })),
  resetFilters: () => set({ filters: defaultJournalFilters }),
});
