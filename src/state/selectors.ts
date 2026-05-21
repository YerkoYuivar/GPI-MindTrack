import { useStore } from './store';

export const useAppReady = () => useStore((s) => s.ready);
export const useThemePref = () => useStore((s) => s.theme);
export const useSetTheme = () => useStore((s) => s.setTheme);

// Selectores de filtros
export const useFilters = () => useStore((s) => s.filters);
export const useFiltersActions = () => {
  const setQuery = useStore((s) => s.setQuery);
  const setOnlyFavorites = useStore((s) => s.setOnlyFavorites);
  const setMood = useStore((s) => s.setMood);
  const setDatePreset = useStore((s) => s.setDatePreset);
  const resetFilters = useStore((s) => s.resetFilters);
  return { setQuery, setOnlyFavorites, setMood, setDatePreset, resetFilters };
};
