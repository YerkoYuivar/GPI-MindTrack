import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, Alert, Platform, ActionSheetIOS } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { JournalStackParamList } from '@navigation/types';
import { useToggleFavorite, useSoftDeleteEntry } from '@features/journal/hooks';
import { useHybridJournalList } from '@features/journal/useHybridJournalList';
import { useFilters, useFiltersActions } from '@state/selectors';
import { useTheme } from '@contexts/ThemeContext';
import JournalCard from '@components/journal/JournalCard';
import SwipeableRow from '@components/journal/SwipeableRow';
import Chip from '@components/ui/Chip';
import FAB from '@components/ui/FAB';
import JournalHeader from '@components/journal/JournalHeader';
import type { DatePreset } from '@state/slices/journalFiltersSlice';
import { metrics } from '../../lib/diagnostics/metrics';
import { logger } from '../../lib/diagnostics/logger';
import { useUpdateEntry } from '@features/journal/hooks';

type Props = NativeStackScreenProps<JournalStackParamList, 'JournalList'>;

export default function JournalListScreen({ navigation, route }: Props) {
  const { items, loading, loadingMore, loadMore, refresh, reachedEnd, hasLocalDrafts } = useHybridJournalList();
  const filters = useFilters();
  const { setQuery, setMood, setDatePreset, resetFilters } = useFiltersActions();
  const { toggle } = useToggleFavorite();
  const { softDelete } = useSoftDeleteEntry();
  const { update } = useUpdateEntry();
  const { colors } = useTheme();
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [showLegacyMenuAndroid, setShowLegacyMenuAndroid] = useState(false);

  // Aplicar búsqueda si viene desde otro screen (ej: DiscoverGraph)
  useEffect(() => {
    if (route.params?.searchQuery) {
      setQuery(route.params.searchQuery);
      // Limpiar el parámetro después de usarlo
      navigation.setParams({ searchQuery: undefined });
    }
  }, [route.params?.searchQuery, setQuery, navigation]);

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

  const toggleMoodFilter = () => {
    if (filters.mood === null) {
      setShowMoodPicker(!showMoodPicker);
    } else {
      setMood(null);
    }
  };

  const openMoreOptions = () => {
    const options = [
      'Búsqueda avanzada',
      'Favoritos',
      'Papelera',
      'Exportar',
      'Cancelar',
    ];

    const handlers = [
      () => navigation.navigate('JournalSearch'),
      () => navigation.navigate('JournalFavorites'),
      () => navigation.navigate('JournalTrash'),
      () => navigation.navigate('JournalExport'),
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          title: 'Opciones',
        },
        (buttonIndex) => {
          if (buttonIndex >= 0 && buttonIndex < handlers.length) handlers[buttonIndex]!();
        }
      );
    } else {
      // Fallback simple para Android: pequeño panel usando Alert
      Alert.alert('Opciones', undefined, [
        { text: options[0], onPress: handlers[0] },
        { text: options[1], onPress: handlers[1] },
        { text: options[2], onPress: handlers[2] },
        { text: options[3], onPress: handlers[3] },
        { text: options[4], style: 'cancel' },
      ]);
    }
  };

  // Instrumentación: track primera carga
  useEffect(() => {
    if (!loading && items.length > 0) {
      metrics.inc('journal.list.loaded');
      logger.debug('Journal list loaded', { count: items.length }, 'journal');
    }
  }, [loading, items.length]);

  // Wrap loadMore para instrumentar paginación
  const handleLoadMore = () => {
    if (!loadingMore && !reachedEnd) {
      metrics.inc('journal.list.paginated');
      logger.debug('Journal list pagination', {}, 'journal');
      loadMore();
    }
  };

  // Acciones rápidas en tarjeta
  const handleEdit = (id: string) => {
    navigation.navigate('JournalEditor', { entryId: id });
  };

  const handleDelete = (id: string) => {
    const item = items.find((x) => x.id === id);
    if (item?.isLocal) {
      Alert.alert(
        'Entrada local',
        'Esta entrada es un borrador local. Ábrela para descartar los cambios si deseas eliminarla.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir', style: 'default', onPress: () => navigation.navigate('JournalEditor', { entryId: id }) },
        ]
      );
      return;
    }

    Alert.alert(
      'Eliminar entrada',
      '¿Mover esta entrada a la papelera?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await softDelete(id);
            } catch (e) {
              Alert.alert('Error', 'No se pudo eliminar la entrada.');
            }
          },
        },
      ]
    );
  };

  const handleRename = (id: string) => {
    const current = items.find((x) => x.id === id);
    let nextTitle = current?.title ?? '';
    Alert.prompt(
      'Renombrar título',
      'Escribe un nuevo título para la nota',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Guardar',
          onPress: async (text?: string) => {
            const title = (text ?? '').trim();
            try {
              await update(id, { title });
            } catch (e) {
              Alert.alert('Error', 'No se pudo renombrar la entrada.');
            }
          },
        },
      ],
      'plain-text',
      nextTitle
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View className="flex-1">
      {/* Banner de modo local (si hay borradores locales) */}
      {hasLocalDrafts && (
        <View style={{ backgroundColor: colors.warning + '15', borderBottomColor: colors.warning, borderBottomWidth: 1 }} className="px-4 py-2">
          <Text style={{ color: colors.warning }} className="text-xs">
            📱 Mostrando borradores locales. Inicia sesión para sincronizar en la nube.
          </Text>
        </View>
      )}
      
      {/* Header limpio y reutilizable */}
      <JournalHeader
        title="Diario"
        query={filters.query}
        onChangeQuery={setQuery}
        onPressMore={openMoreOptions}
        moodActive={filters.mood !== null}
        moodLabel={`🙂 Mood${filters.mood !== null ? ` (${filters.mood})` : ''}`}
        onPressMood={toggleMoodFilter}
        dateActive={filters.datePreset !== 'all'}
        dateLabel={`📅 ${dateLabel}`}
        onPressDate={cycleDatePreset}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={resetFilters}
      />

      {/* Mood picker expandible */}
      {showMoodPicker && (
        <View className="px-4">
          <View style={{ backgroundColor: colors.backgroundTertiary }} className="p-3 mt-3 rounded-lg">
            <Text style={{ color: colors.text }} className="mb-2 text-sm font-semibold">Selecciona Mood</Text>
            <View className="flex-row flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((m) => (
                <Pressable
                  key={m}
                  onPress={() => {
                    setMood(m);
                    setShowMoodPicker(false);
                  }}
                  style={{ 
                    backgroundColor: filters.mood === m ? colors.primary : colors.card,
                    borderColor: filters.mood === m ? colors.primary : colors.border,
                    borderWidth: 1
                  }}
                  className="px-4 py-2 rounded-lg"
                  accessibilityRole="button"
                  accessibilityLabel={`Filtrar por mood ${m}`}
                >
                  <Text style={{ color: filters.mood === m ? '#FFFFFF' : colors.text }} className="text-sm">
                    {m}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Loading inicial */}
      {loading && items.length === 0 && (
        <View className="items-center justify-center flex-1">
          <Text style={{ color: colors.textSecondary }}>Cargando...</Text>
        </View>
      )}

      {/* FlatList con cards estilizadas */}
      {!loading || items.length > 0 ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SwipeableRow
              onEdit={() => handleEdit(item.id)}
              onRename={() => handleRename(item.id)}
              onDelete={() => handleDelete(item.id)}
            >
              <JournalCard
                item={item}
                onPress={(id) => navigation.navigate('JournalDetail', { entryId: id })}
                onToggleFavorite={(id, next) => toggle(id, next)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onLongPress={handleRename}
              />
            </SwipeableRow>
          )}
          refreshControl={<RefreshControl refreshing={loading && items.length > 0} onRefresh={refresh} tintColor={colors.primary} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore && !reachedEnd ? (
              <View className="items-center py-4">
                <Text style={{ color: colors.textSecondary }}>Cargando más...</Text>
              </View>
            ) : null
          }
          contentContainerStyle={
            items.length === 0
              ? { flexGrow: 1, backgroundColor: colors.background }
              : { padding: 16, paddingBottom: 120, backgroundColor: colors.background }
          }
          ListEmptyComponent={
            !loading ? (
              <View className="items-center px-6 mt-16">
                <Text style={{ color: colors.text }} className="text-lg font-semibold">
                  {hasActiveFilters ? 'No hay entradas que coincidan' : 'Aún no tienes entradas'}
                </Text>
                <Text style={{ color: colors.textSecondary }} className="mt-1 text-center">
                  {hasActiveFilters
                    ? 'Intenta ajustar los filtros para ver más resultados.'
                    : 'Escribe tus pensamientos y emociones. Tu diario vive aquí.'}
                </Text>
                {!hasActiveFilters && (
                  <Pressable
                    onPress={() => navigation.navigate('JournalEditor')}
                    className="mt-4"
                    accessibilityRole="button"
                    accessibilityLabel="Crear nueva entrada"
                  >
                    <Text style={{ color: colors.primary }} className="text-base font-semibold">Nueva entrada</Text>
                  </Pressable>
                )}
              </View>
            ) : null
          }
        />
      ) : null}

      {/* FAB para nueva entrada */}
      <FAB
        onPress={() => navigation.navigate('JournalEditor')}
        label="Crear nueva entrada"
        testID="fab-new-entry"
        stickToTabBar
      />
      </View>
    </SafeAreaView>
  );
}
