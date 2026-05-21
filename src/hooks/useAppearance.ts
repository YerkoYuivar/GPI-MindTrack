import { useColorScheme as useRNColorScheme, Appearance } from 'react-native';

export function useColorScheme() {
  const scheme = useRNColorScheme();
  return scheme ?? (Appearance.getColorScheme() ?? 'light');
}
