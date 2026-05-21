import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Chip from '@components/ui/Chip';
import { useTheme } from '@contexts/ThemeContext';

export type JournalHeaderProps = {
  title?: string;
  query: string;
  onChangeQuery: (text: string) => void;
  onPressMore: () => void; // abre menú/sheet de opciones
  // Chips
  moodActive: boolean;
  moodLabel: string; // Ej: "🙂 Mood" o con valor
  onPressMood: () => void;
  dateActive: boolean;
  dateLabel: string; // Ej: "📅 Hoy"
  onPressDate: () => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  className?: string;
};

export default function JournalHeader({
  title = 'Diario',
  query,
  onChangeQuery,
  onPressMore,
  moodActive,
  moodLabel,
  onPressMood,
  dateActive,
  dateLabel,
  onPressDate,
  hasActiveFilters,
  onClearFilters,
  className,
}: JournalHeaderProps) {
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  
  return (
    <LinearGradient
      colors={isDark ? ['#1E3A5F', '#0F172A'] : ['#3B82F6', '#1D4ED8']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ 
        paddingTop: insets.top + 16,
        paddingBottom: 16,
        paddingHorizontal: 16,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
      }}
    >
      {/* Título */}
      <Text className="text-2xl font-extrabold text-white">{title}</Text>

      {/* Búsqueda + botón de opciones */}
      <View className="mt-3 flex-row items-center gap-2">
        <TextInput
          value={query}
          onChangeText={onChangeQuery}
          placeholder="Buscar en entradas…"
          placeholderTextColor="rgba(255,255,255,0.5)"
          className="flex-1 px-4 h-12 rounded-xl"
          style={{ 
            backgroundColor: 'rgba(255,255,255,0.15)', 
            borderColor: 'rgba(255,255,255,0.2)', 
            borderWidth: 1,
            color: '#FFFFFF' 
          }}
          accessibilityLabel="Buscar entradas"
          returnKeyType="search"
        />
        <Pressable
          onPress={onPressMore}
          accessibilityRole="button"
          accessibilityLabel="Más opciones"
          className="w-12 h-12 items-center justify-center rounded-xl"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          testID="btn-more-options"
        >
          <Text className="text-xl">⚙️</Text>
        </Pressable>
      </View>

      {/* Chips de filtros principales */}
      <View className="flex-row flex-wrap gap-2 mt-3">
        <Chip
          label={moodLabel}
          active={moodActive}
          onPress={onPressMood}
          testID="filter-mood"
        />
        <Chip
          label={dateLabel}
          active={dateActive}
          onPress={onPressDate}
          testID="filter-date"
        />
        {hasActiveFilters && (
          <Chip label="Limpiar" onPress={onClearFilters} testID="filter-clear" />
        )}
      </View>
    </LinearGradient>
  );
}
