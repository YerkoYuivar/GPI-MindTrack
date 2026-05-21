import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, Button, RefreshControl } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { JournalStackParamList } from '@navigation/types';
import { useFavoritesListPaged, useToggleFavorite } from '@features/journal/hooks';
import { useFilters, useFiltersActions } from '@state/selectors';
import JournalCard from '@components/journal/JournalCard';
import Chip from '@components/ui/Chip';
import type { DatePreset } from '@state/slices/journalFiltersSlice';

type Props = NativeStackScreenProps<JournalStackParamList, 'JournalFavorites'>;

export default function JournalFavoritesScreen({ navigation }: Props) {
  const { items, loading, loadingMore, loadMore, refresh, reachedEnd } = useFavoritesListPaged(20);
  const filters = useFilters();
  const { setQuery, setMood, setDatePreset, resetFilters } = useFiltersActions();
  const { toggle } = useToggleFavorite();
  const [showMoodPicker, setShowMoodPicker] = useState(false);

  const hasActiveFilters = filters.query !== '' || filters.mood !== null || filters.datePreset !== 'all';

  const dateLabel =
    filters.datePreset === 'today'
      ? 'Hoy'
      : filters.datePreset === '7d'
      ? '7 días'
      : filters.datePreset === '30d'
      ? '30 días'
      : 'Fecha';

  const cycleDatePreset = () => {
    const presets: DatePreset[] = ['all', 'today', '7d', '30d'];
    const currentIndex = presets.indexOf(filters.datePreset);
    const nextIndex = (currentIndex + 1) % presets.length;
    setDatePreset(presets[nextIndex]);
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1">
        {/* Filtros */}
        <View className="px-4 pt-4 pb-2 border-b border-gray-200">
          {/* Search bar */}
          <TextInput
            value={filters.query}
            onChangeText={setQuery}
            placeholder="Buscar en favoritos..."
            className="border border-gray-300 rounded-lg px-3 py-2 text-base mb-3"
            accessibilityLabel="Buscar favoritos"
          />

          {/* Chips de filtros */}
          <View className="flex-row flex-wrap gap-2 mb-2">
            <Pressable
              onPress={() => setMood(filters.mood ? null : 1)}
              className={`rounded-full px-3 py-1.5 ${
                filters.mood !== null ? 'bg-blue-500' : 'bg-gray-200'
              }`}
              accessibilityRole="button"
              accessibilityLabel="Filtrar por mood"
              onLongPress={() => setShowMoodPicker(!showMoodPicker)}
            >
              <Text className={`text-sm ${filters.mood !== null ? 'text-white' : 'text-gray-700'}`}>
                😊 Mood {filters.mood !== null ? `(${filters.mood})` : ''}
              </Text>
            </Pressable>

            <Pressable
              onPress={cycleDatePreset}
              className={`rounded-full px-3 py-1.5 ${
                filters.datePreset !== 'all' ? 'bg-green-500' : 'bg-gray-200'
              }`}
              accessibilityRole="button"
              accessibilityLabel="Filtrar por fecha"
            >
              <Text className={`text-sm ${filters.datePreset !== 'all' ? 'text-white' : 'text-gray-700'}`}>
                📅 {dateLabel}
              </Text>
            </Pressable>

            {hasActiveFilters && (
              <Pressable
                onPress={resetFilters}
                className="rounded-full px-3 py-1.5 bg-red-500"
                accessibilityRole="button"
                accessibilityLabel="Limpiar filtros"
              >
                <Text className="text-sm text-white">✕ Limpiar</Text>
              </Pressable>
            )}
          </View>

          {showMoodPicker && (
            <View className="mb-3 p-3 bg-gray-100 rounded-lg">
              <Text className="text-sm font-semibold mb-2">Selecciona Mood</Text>
              <View className="flex-row flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => {
                      setMood(m);
                      setShowMoodPicker(false);
                    }}
                    className={`px-4 py-2 rounded ${filters.mood === m ? 'bg-blue-500' : 'bg-white border border-gray-300'}`}
                  >
                    <Text className={filters.mood === m ? 'text-white' : 'text-gray-700'}>{m}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Loading inicial */}
        {loading && items.length === 0 && (
          <View className="flex-1 justify-center items-center">
            <Text className="text-gray-500">Cargando...</Text>
          </View>
        )}

        {/* FlatList con paginación */}
        {!loading || items.length > 0 ? (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <JournalCard
                item={item}
                onPress={(id) => navigation.navigate('JournalDetail', { entryId: id })}
                onToggleFavorite={(id, next) => toggle(id, next)}
              />
            )}
            refreshControl={
              <RefreshControl refreshing={loading && items.length > 0} onRefresh={refresh} />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              loadingMore && !reachedEnd ? (
                <View className="py-4 items-center">
                  <Text className="text-gray-500">Cargando más...</Text>
                </View>
              ) : null
            }
            contentContainerStyle={
              items.length === 0 ? { flexGrow: 1 } : { padding: 16, paddingBottom: 96, backgroundColor: '#F9FAFB' }
            }
            ListEmptyComponent={
              !loading ? (
                <View className="flex-1 justify-center items-center p-6">
                  <Text className="text-gray-500 text-center mb-4">
                    {hasActiveFilters ? 'No hay favoritos que coincidan con los filtros.' : 'No tienes favoritos aún.'}
                  </Text>
                  <Button title="Ver todas las entradas" onPress={() => navigation.navigate('JournalList')} />
                </View>
              ) : null
            }
          />
        ) : null}
      </View>
    </View>
  );
}
