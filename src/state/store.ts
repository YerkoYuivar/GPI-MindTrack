import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAppSlice, type AppSlice } from './slices/appSlice';
import { createJournalFiltersSlice, type JournalFiltersSlice } from './slices/journalFiltersSlice';

export type RootState = AppSlice & JournalFiltersSlice;

export const useStore = create<RootState>()(
  persist(
    (set, get) => ({
      ...createAppSlice(set),
      ...createJournalFiltersSlice(set),
    }),
    {
      name: 'ej.filters', // clave de almacenamiento
      partialize: (state) => ({ filters: state.filters }), // solo persistir filtros
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
