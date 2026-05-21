/**
 * @module screens/Discover/InsightsFeedScreen
 * @description Feed cronológico de insights recientes
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DiscoverStackParamList } from '@navigation/types';
import Text from '@components/ui/Text';
import InsightCard from '@components/discover/InsightCard';
import { getInsightsFeedPage, FeedItem } from '@features/discover/insightsRepo';
import { auth } from '@lib/firebase/auth';
import type { DocumentSnapshot } from 'firebase/firestore';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'DiscoverFeed'>;

/**
 * Pantalla de feed de insights
 * Lista insights recientes ordenados por updatedAt desc
 * Soporta pull-to-refresh y paginación
 */
export default function InsightsFeedScreen({ navigation }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<DocumentSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Obtener usuario autenticado
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user?.uid ?? null);
    });
    return unsubscribe;
  }, []);

  /**
   * Carga una página del feed
   */
  const load = useCallback(
    async (reset = false) => {
      if (!userId) {
        setError('Debes iniciar sesión para ver insights');
        setLoading(false);
        return;
      }

      try {
        if (reset) {
          setCursor(null);
          setItems([]);
          setLoading(true);
        }

        const { items: page, nextCursor } = await getInsightsFeedPage(
          userId,
          12,
          reset ? undefined : cursor ?? undefined
        );

        setItems((prev) => (reset ? page : [...prev, ...page]));
        setCursor(nextCursor ?? null);
        setError(null);
      } catch (e: any) {
        setError(e?.message || 'Error al cargar insights');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [userId, cursor]
  );

  // Cargar datos cuando cambia userId
  useEffect(() => {
    if (userId) {
      load(true);
    }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Handler para cargar más elementos (paginación)
   */
  const handleLoadMore = () => {
    if (!cursor || loadingMore || loading) return;
    setLoadingMore(true);
    load(false);
  };

  /**
   * Handler para navegar a la entrada
   */
  const handleOpenEntry = (entryId: string) => {
    navigation.navigate('EntryInsights', { entryId });
  };

  /**
   * Handler para navegar al grafo con un topic enfocado
   */
  const handleOpenGraphTopic = (topic: string) => {
    if (!topic) return;
    // @ts-ignore - focusLabel no está en types pero lo pasamos como param
    navigation.navigate('DiscoverGraph', { focusLabel: topic });
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-4 py-4 bg-white border-b border-gray-200">
        <Text className="text-xl font-bold text-gray-900">Insights recientes</Text>
        <Text className="text-sm text-gray-600 mt-1">
          Descubre patrones en tus entradas analizadas
        </Text>
      </View>

      {/* Error Banner */}
      {error && (
        <View className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <Text className="text-sm text-red-800">{error}</Text>
        </View>
      )}

      {/* Lista de insights */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="px-4 py-3">
            <InsightCard
              item={item}
              onOpenEntry={handleOpenEntry}
              onOpenGraphTopic={handleOpenGraphTopic}
            />
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={loading && items.length > 0}
            onRefresh={() => load(true)}
            tintColor="#4F46E5"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          !loading && !error ? (
            <View className="mt-16 items-center px-8">
              <Text className="text-6xl mb-4">📊</Text>
              <Text className="text-lg font-semibold text-gray-800 text-center">
                Aún no hay insights
              </Text>
              <Text className="text-sm text-gray-600 text-center mt-2">
                Escribe entradas en tu diario y ejecuta el análisis desde el Dashboard
                para generar insights automáticos.
              </Text>
            </View>
          ) : loading && items.length === 0 ? (
            <View className="mt-16 items-center">
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text className="text-gray-500 mt-4">Cargando insights...</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <View className="py-6 items-center">
              <ActivityIndicator size="small" color="#4F46E5" />
              <Text className="text-sm text-gray-500 mt-2">Cargando más...</Text>
            </View>
          ) : null
        }
        contentContainerStyle={items.length === 0 ? { flexGrow: 1 } : undefined}
      />
    </View>
  );
}
