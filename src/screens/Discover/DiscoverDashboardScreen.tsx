/**
 * @module screens/Discover/DiscoverDashboardScreen
 * @description Pantalla de dashboard con gráficas y KPIs del módulo Descubrimientos
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Pressable, useWindowDimensions, ActivityIndicator, Linking, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DiscoverStackParamList } from '@navigation/types';
import Text from '@components/ui/Text';
import Chip from '@components/ui/Chip';
import KpiCard from '@components/discover/KpiCard';
import LineChartSimple from '@components/charts/LineChartSimple';
import BarChartSimple from '@components/charts/BarChartSimple';
import { useDiscoverData } from '@features/discover/useDiscoverData';
import { auth } from '@lib/firebase/auth';
import { useRecommendations } from '@features/discover/useRecommendations';
import RecommendationCard from '@components/discover/RecommendationCard';
import type { RecAction } from '@features/discover/recommendRepo';
import { functions } from '@lib/firebase';
import { httpsCallable } from 'firebase/functions';

type RangeType = '7d' | '30d';
type Props = NativeStackScreenProps<DiscoverStackParamList, 'DiscoverDashboard'>;

/**
 * Calcula el promedio de un array ignorando valores null/undefined
 */
function avg(arr: (number | null | undefined)[]): number | null {
  const xs = arr.filter((n): n is number => typeof n === 'number');
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/**
 * Pantalla de dashboard con visualizaciones de series temporales
 */
export default function DiscoverDashboardScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const [userId, setUserId] = useState<string | null>(null);
  const [range, setRange] = useState<RangeType>('30d');
  const [rebuildingGraph, setRebuildingGraph] = useState(false);
  const [recomputingAll, setRecomputingAll] = useState(false);

  // Cargar datos
  const { day, week, loading, error, refresh } = useDiscoverData(userId, 30, 12);

  // Cargar recomendaciones
  const {
    items: recommendations,
    loading: recsLoading,
    error: recsError,
    refresh: refreshRecs,
  } = useRecommendations(6, 14);

  // Obtener usuario autenticado
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user?.uid ?? null);
    });
    return unsubscribe;
  }, []);

  // Handler para acciones de recomendaciones
  const handleRecommendationAction = (action: RecAction) => {
    if (action.screen) {
      // Navegar a pantalla (si existe)
      navigation.navigate(action.screen as any, action.params);
    } else if (action.href) {
      // Abrir URL externa
      Linking.openURL(action.href).catch((err) =>
        console.error('Error al abrir URL:', err)
      );
    }
  };

  // Handler para recalcular grafo
  const handleRebuildGraph = async () => {
    Alert.alert(
      'Recalcular Grafo',
      '¿Deseas reconstruir el grafo de patrones desde todas tus entradas? Este proceso puede tardar unos segundos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Recalcular',
          style: 'default',
          onPress: async () => {
            try {
              setRebuildingGraph(true);
              
              const callable = httpsCallable<
                { from?: string; to?: string },
                { ok: boolean; processed: number; nodeCount: number; edgeCount: number }
              >(functions, 'rebuildGraphForUser');
              
              const result = await callable({});
              
              Alert.alert(
                'Éxito',
                `Grafo recalculado:\n• ${result.data.processed} entradas procesadas\n• ${result.data.nodeCount} nodos\n• ${result.data.edgeCount} conexiones`,
                [{ text: 'OK' }]
              );
            } catch (err: any) {
              console.error('Error al recalcular grafo:', err);
              Alert.alert(
                'Error',
                'No se pudo recalcular el grafo. Intenta de nuevo más tarde.',
                [{ text: 'OK' }]
              );
            } finally {
              setRebuildingGraph(false);
            }
          },
        },
      ]
    );
  };

  // Handler para recalcular todo (análisis + series + grafo)
  const handleRecomputeAll = async () => {
    Alert.alert(
      'Recalcular Todo',
      'Esto ejecutará análisis, series temporales y grafo nuevamente para todas tus entradas. El proceso puede tardar varios segundos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Recalcular',
          style: 'destructive',
          onPress: async () => {
            try {
              setRecomputingAll(true);
              
              const callable = httpsCallable<
                { limit?: number },
                { 
                  ok: boolean; 
                  analyzed: number; 
                  timeseries: { days: number; weeks: number }; 
                  graph: { nodeCount: number; edgeCount: number };
                }
              >(functions, 'recomputeAll');
              
              const result = await callable({ limit: 500 });
              
              Alert.alert(
                'Éxito',
                `Recálculo completo:\n\n` +
                `• ${result.data.analyzed} entradas analizadas\n` +
                `• ${result.data.timeseries.days} días de series\n` +
                `• ${result.data.timeseries.weeks} semanas de series\n` +
                `• ${result.data.graph.nodeCount} nodos en grafo\n` +
                `• ${result.data.graph.edgeCount} conexiones`,
                [{ text: 'OK', onPress: () => refresh() }]
              );
            } catch (err: any) {
              console.error('Error al recalcular todo:', err);
              Alert.alert(
                'Error',
                'No se pudo completar el recálculo. ¿Deseas ver el diagnóstico?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { 
                    text: 'Ver Diagnóstico', 
                    onPress: () => navigation.navigate('DiagnosticsScreen' as any)
                  },
                ]
              );
            } finally {
              setRecomputingAll(false);
            }
          },
        },
      ]
    );
  };

  // Calcular KPIs (últimos 7 días)
  const last7 = day.slice(0, 7);
  const kMood = avg(last7.map((i) => i.avgMood));
  const kSent = avg(last7.map((i) => i.avgSentiment));
  const kCount = last7.reduce((s, i) => s + (i.count || 0), 0);

  // Preparar datos para gráficas
  // Nota: repo devuelve desc, pero charts esperan asc
  const dayReversed = [...day].reverse();
  const weekReversed = [...week].reverse();

  // Filtrar datos según rango seleccionado
  const dayFiltered = range === '7d' ? dayReversed.slice(-7) : dayReversed.slice(-30);

  // Datos para LineChart (avgMood)
  const lineData = dayFiltered.map((d) => ({
    t: d.startAt,
    v: d.avgMood,
  }));

  // Datos para BarChart (avgSentiment, últimas 12 semanas)
  const barData = weekReversed.slice(-12).map((w) => ({
    t: w.startAt,
    v: w.avgSentiment,
  }));

  // Ancho de gráficas (padding lateral 16px)
  const chartWidth = Math.min(width - 32, 400);

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      >
        {/* Header */}
        <View className="px-4 py-6 bg-white border-b border-gray-200">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-gray-900">Descubrimientos</Text>
              <Text className="text-sm text-gray-600 mt-1">Dashboard de insights</Text>
            </View>

            <View className="flex-row gap-2">
              {/* Botón Feed */}
              <Pressable
                onPress={() => navigation.navigate('DiscoverFeed')}
                className="px-3 py-2 bg-emerald-500 rounded-lg"
                accessibilityRole="button"
                accessibilityLabel="Ver feed de insights"
              >
                <Text className="text-sm font-medium text-white">📰</Text>
              </Pressable>

              {/* Botón Grafo */}
              <Pressable
                onPress={() => navigation.navigate('DiscoverGraph')}
                className="px-3 py-2 bg-indigo-500 rounded-lg"
                accessibilityRole="button"
                accessibilityLabel="Ver grafo de patrones"
              >
                <Text className="text-sm font-medium text-white">🕸️</Text>
              </Pressable>

              {/* Botón Recalcular Grafo */}
              <Pressable
                onPress={handleRebuildGraph}
                disabled={rebuildingGraph}
                className={`px-3 py-2 rounded-lg ${rebuildingGraph ? 'bg-gray-200' : 'bg-gray-100'}`}
                accessibilityRole="button"
                accessibilityLabel="Recalcular grafo de patrones"
              >
                {rebuildingGraph ? (
                  <ActivityIndicator size="small" color="#4B5563" />
                ) : (
                  <Text className="text-sm font-medium text-gray-700">🔄</Text>
                )}
              </Pressable>

              {/* Botón Recalcular TODO */}
              <Pressable
                onPress={handleRecomputeAll}
                disabled={recomputingAll || rebuildingGraph}
                className={`px-3 py-2 rounded-lg ${recomputingAll ? 'bg-orange-200' : 'bg-orange-100'}`}
                accessibilityRole="button"
                accessibilityLabel="Recalcular todo: análisis, series y grafo"
              >
                {recomputingAll ? (
                  <ActivityIndicator size="small" color="#EA580C" />
                ) : (
                  <Text className="text-sm font-medium text-orange-700">⚡</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {/* Estado de carga inicial */}
        {loading && day.length === 0 && (
          <View className="px-4 py-12">
            {/* Skeleton simple */}
            <View className="space-y-4">
              <View className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
              <View className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
              <View className="h-40 bg-gray-200 rounded-2xl animate-pulse" />
            </View>
          </View>
        )}

        {/* Estado de error */}
        {error && (
          <View className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <Text className="text-sm font-semibold text-red-800">Error al cargar datos</Text>
            <Text className="mt-1 text-sm text-red-700">{error}</Text>
            <Pressable
              onPress={refresh}
              className="mt-3 px-4 py-2 bg-red-100 rounded-lg self-start"
            >
              <Text className="text-sm font-medium text-red-800">Reintentar</Text>
            </Pressable>
          </View>
        )}

        {/* Contenido principal */}
        {!loading || day.length > 0 ? (
          <>
            {/* Estado vacío */}
            {day.length === 0 && !error && (
              <View className="items-center px-6 py-16">
                <Text className="text-6xl mb-4">📊</Text>
                <Text className="text-lg font-semibold text-gray-800 text-center">
                  Aún no hay suficientes datos
                </Text>
                <Text className="mt-2 text-center text-gray-600">
                  Escribe en tu diario para generar descubrimientos y ver tus patrones emocionales.
                </Text>
              </View>
            )}

            {/* KPIs */}
            {day.length > 0 && (
              <View className="px-4 py-4">
                <Text className="text-lg font-semibold text-gray-900 mb-3">
                  Resumen (últimos 7 días)
                </Text>

                <View className="space-y-3">
                  {/* Promedio Mood */}
                  <KpiCard
                    label="Promedio Mood"
                    value={kMood !== null ? kMood.toFixed(1) : 'N/A'}
                    tone={kMood && kMood >= 5 ? 'good' : kMood && kMood < 4 ? 'bad' : 'default'}
                  />

                  {/* Promedio Sentiment */}
                  <KpiCard
                    label="Promedio Sentimiento"
                    value={kSent !== null ? kSent.toFixed(2) : 'N/A'}
                    tone={kSent && kSent > 0.2 ? 'good' : kSent && kSent < -0.2 ? 'bad' : 'default'}
                  />

                  {/* Total de entradas */}
                  <KpiCard label="Total de entradas" value={String(kCount)} tone="default" />
                </View>
              </View>
            )}

            {/* Recomendaciones personalizadas */}
            {day.length > 0 && (
              <View className="px-4 py-4">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-lg font-semibold text-gray-900">
                    Recomendaciones para hoy
                  </Text>
                  <Pressable
                    onPress={refreshRecs}
                    className="p-2 bg-indigo-50 rounded-lg"
                    accessibilityRole="button"
                    accessibilityLabel="Refrescar recomendaciones"
                  >
                    <Text className="text-base">🔄</Text>
                  </Pressable>
                </View>

                {/* Estado de carga */}
                {recsLoading && !recommendations && (
                  <View className="items-center py-8">
                    <ActivityIndicator size="large" color="#4F46E5" />
                    <Text className="mt-2 text-sm text-gray-600">Generando recomendaciones...</Text>
                  </View>
                )}

                {/* Estado de error */}
                {recsError && (
                  <View className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <Text className="text-sm font-semibold text-red-800">Error al cargar recomendaciones</Text>
                    <Text className="mt-1 text-xs text-red-700">{recsError}</Text>
                    <Pressable
                      onPress={refreshRecs}
                      className="mt-3 px-3 py-2 bg-red-100 rounded-lg self-start"
                    >
                      <Text className="text-xs font-medium text-red-800">Reintentar</Text>
                    </Pressable>
                  </View>
                )}

                {/* Estado vacío */}
                {!recsLoading && !recsError && recommendations && recommendations.length === 0 && (
                  <View className="p-6 bg-gray-50 rounded-xl border border-gray-200">
                    <Text className="text-center text-gray-600">
                      No hay recomendaciones disponibles en este momento.
                    </Text>
                    <Text className="mt-2 text-xs text-center text-gray-500">
                      Escribe más entradas en tu diario para recibir sugerencias personalizadas.
                    </Text>
                  </View>
                )}

                {/* Lista de recomendaciones */}
                {recommendations && recommendations.length > 0 && (
                  <View className="space-y-3">
                    {recommendations.map((item) => (
                      <RecommendationCard
                        key={item.id}
                        item={item}
                        onAction={handleRecommendationAction}
                      />
                    ))}
                  </View>
                )}

                {/* Info adicional */}
                {recommendations && recommendations.length > 0 && (
                  <View className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <Text className="text-xs text-indigo-800">
                      💡 Las recomendaciones se actualizan cada hora según tus patrones emocionales recientes.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Selector de rango */}
            {day.length > 0 && (
              <View className="px-4 py-3">
                <Text className="text-sm font-medium text-gray-700 mb-2">Rango temporal</Text>
                <View className="flex-row gap-2">
                  <Chip
                    label="7 días"
                    active={range === '7d'}
                    onPress={() => setRange('7d')}
                    testID="range-7d"
                  />
                  <Chip
                    label="30 días"
                    active={range === '30d'}
                    onPress={() => setRange('30d')}
                    testID="range-30d"
                  />
                </View>
              </View>
            )}

            {/* Gráfica de líneas (Mood) */}
            {lineData.length > 0 && (
              <View className="px-4 py-4">
                <Text className="text-lg font-semibold text-gray-900 mb-3">
                  Evolución del Mood ({range === '7d' ? '7 días' : '30 días'})
                </Text>
                <View className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                  <LineChartSimple
                    data={lineData}
                    width={chartWidth}
                    height={160}
                    minY={1}
                    maxY={7}
                    showDots={true}
                  />
                </View>
                <Text className="text-xs text-gray-500 mt-2 text-center">
                  Escala: 1 (muy bajo) - 7 (muy alto)
                </Text>
              </View>
            )}

            {/* Gráfica de columnas (Sentiment) */}
            {barData.length > 0 && (
              <View className="px-4 py-4">
                <Text className="text-lg font-semibold text-gray-900 mb-3">
                  Sentimiento Semanal (últimas 12 semanas)
                </Text>
                <View className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                  <BarChartSimple
                    data={barData}
                    width={chartWidth}
                    height={140}
                    minY={-1}
                    maxY={1}
                    zeroLine={true}
                  />
                </View>
                <Text className="text-xs text-gray-500 mt-2 text-center">
                  Verde: positivo | Rojo: negativo | Escala: -1 a +1
                </Text>
              </View>
            )}

            {/* Footer informativo */}
            <View className="px-4 py-6 mt-4">
              <View className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Text className="text-xs text-blue-800">
                  💡 Los datos se actualizan automáticamente cuando creas o analizas entradas.
                  {'\n\n'}
                  📊 Las gráficas muestran tendencias de tu estado emocional a lo largo del tiempo.
                </Text>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
