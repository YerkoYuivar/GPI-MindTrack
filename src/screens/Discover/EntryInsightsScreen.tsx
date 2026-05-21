/**
 * @module screens/Discover/EntryInsightsScreen
 * @description Pantalla de insights para una entrada específica
 */

import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DiscoverStackParamList } from '@navigation/types';
import Text from '@components/ui/Text';
import { getEntryInsights, EntryInsights, Quality } from '@features/discover/insightsRepo';
import { auth } from '@lib/firebase/auth';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'EntryInsights'>;

/**
 * Obtiene el tono de color según el sentimiento
 */
function getSentimentTone(label: 'neg' | 'neu' | 'pos'): string {
  switch (label) {
    case 'pos':
      return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    case 'neg':
      return 'text-rose-700 bg-rose-50 border-rose-200';
    default:
      return 'text-gray-700 bg-gray-50 border-gray-200';
  }
}

/**
 * Obtiene el emoji según el sentimiento
 */
function getSentimentEmoji(label: 'neg' | 'neu' | 'pos'): string {
  switch (label) {
    case 'pos':
      return '😊';
    case 'neg':
      return '😔';
    default:
      return '😐';
  }
}

/**
 * Obtiene el color del badge de calidad
 */
function getQualityColor(status: 'OK' | 'WARN' | 'FAIL'): string {
  switch (status) {
    case 'OK':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'WARN':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'FAIL':
      return 'bg-red-100 text-red-700 border-red-200';
  }
}

/**
 * Renderiza el badge de calidad con métricas
 */
function QualityBadge({ quality }: { quality: Quality }) {
  const completenessPercent = Math.round(quality.completeness * 100);
  const confidencePercent = Math.round(quality.confidence * 100);

  return (
    <View className="bg-white rounded-xl border border-gray-200 p-4">
      <Text className="text-sm font-semibold text-gray-900 mb-3">Métricas de Calidad</Text>
      
      {/* Status Badge */}
      <View className={`self-start px-3 py-2 rounded-lg border ${getQualityColor(quality.status)} mb-3`}>
        <Text className="font-semibold text-base">{quality.status}</Text>
      </View>

      {/* Error message si existe */}
      {quality.error && (
        <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
          <Text className="text-red-700 text-sm">{quality.error}</Text>
        </View>
      )}

      {/* Métricas */}
      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-gray-600">Completitud:</Text>
          <Text className="text-sm font-medium text-gray-900">{completenessPercent}%</Text>
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-gray-600">Confianza:</Text>
          <Text className="text-sm font-medium text-gray-900">{confidencePercent}%</Text>
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-gray-600">Tiempo de proceso:</Text>
          <Text className="text-sm font-medium text-gray-900">{quality.processingTimeMs}ms</Text>
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-gray-600">Topics encontrados:</Text>
          <Text className="text-sm font-medium text-gray-900">{quality.hasTopics ? '✓ Sí' : '✗ No'}</Text>
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-gray-600">Frases clave:</Text>
          <Text className="text-sm font-medium text-gray-900">{quality.hasKeyPhrases ? '✓ Sí' : '✗ No'}</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Pantalla de insights de una entrada específica
 * Muestra sentimiento, tópicos, frases clave y deep-links a Dashboard/Grafo
 */
export default function EntryInsightsScreen({ navigation, route }: Props) {
  const { entryId } = route.params;
  
  const [userId, setUserId] = useState<string | null>(null);
  const [insights, setInsights] = useState<EntryInsights | null>(null);
  const [loading, setLoading] = useState(true);

  // Obtener usuario autenticado
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user?.uid ?? null);
    });
    return unsubscribe;
  }, []);

  // Cargar insights cuando tenemos userId
  useEffect(() => {
    if (!userId) return;

    (async () => {
      setLoading(true);
      try {
        const data = await getEntryInsights(userId, entryId);
        setInsights(data);
      } catch (error) {
        console.error('Error loading insights:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, entryId]);

  // Estado de carga
  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="text-gray-500 mt-4">Cargando insights...</Text>
      </View>
    );
  }

  // Sin insights
  if (!insights) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-8">
        <Text className="text-6xl mb-4">📊</Text>
        <Text className="text-lg font-semibold text-gray-800 text-center">
          Sin insights disponibles
        </Text>
        <Text className="text-sm text-gray-600 text-center mt-2">
          Ejecuta el análisis para esta entrada desde el Dashboard o el feed de insights.
        </Text>
        <Pressable
          onPress={() => navigation.navigate('DiscoverDashboard')}
          className="mt-6 px-4 py-2 bg-indigo-600 rounded-xl"
        >
          <Text className="text-white font-semibold">Ir al Dashboard</Text>
        </Pressable>
      </View>
    );
  }

  const tone = getSentimentTone(insights.sentiment.label);
  const emoji = getSentimentEmoji(insights.sentiment.label);

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-4 py-4 bg-white border-b border-gray-200">
        <Text className="text-xl font-bold text-gray-900">Insights de la entrada</Text>
        <Text className="text-sm text-gray-600 mt-1">
          Análisis automático de patrones y emociones
        </Text>
      </View>

      {/* Contenido */}
      <View className="px-4 py-6">
        {/* Sentimiento */}
        <View>
          <Text className="text-base font-semibold text-gray-900 mb-3">Sentimiento</Text>
          <View className={`self-start px-4 py-2 rounded-xl border ${tone} flex-row items-center gap-2`}>
            <Text className="text-2xl">{emoji}</Text>
            <View>
              <Text className="font-semibold text-base">
                {insights.sentiment.label.toUpperCase()}
              </Text>
              <Text className="text-xs opacity-80">
                Score: {insights.sentiment.score.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Métricas de Calidad */}
        {insights.quality && (
          <View className="mt-6">
            <QualityBadge quality={insights.quality} />
          </View>
        )}

        {/* Tópicos */}
        {insights.topics && insights.topics.length > 0 && (
          <View className="mt-6">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              Tópicos detectados ({insights.topics.length})
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {insights.topics.map((topic, idx) => (
                <Pressable
                  key={`${topic.key}-${idx}`}
                  onPress={() =>
                    // @ts-ignore - focusLabel no está en types
                    navigation.navigate('DiscoverGraph', { focusLabel: topic.key })
                  }
                  className="px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200 flex-row items-center gap-2"
                  accessibilityRole="button"
                  accessibilityLabel={`Ver tema ${topic.key} en el grafo`}
                >
                  <Text className="text-indigo-700 font-medium">#{topic.key}</Text>
                  <Text className="text-indigo-500 text-xs">({topic.weight.toFixed(1)})</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Frases clave */}
        {insights.keyPhrases && insights.keyPhrases.length > 0 && (
          <View className="mt-6">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              Frases clave ({insights.keyPhrases.length})
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {insights.keyPhrases.map((phrase, idx) => (
                <Pressable
                  key={`${phrase}-${idx}`}
                  onPress={() =>
                    // @ts-ignore - focusLabel no está en types
                    navigation.navigate('DiscoverGraph', { focusLabel: phrase })
                  }
                  className="px-3 py-2 rounded-xl bg-gray-100 border border-gray-200"
                  accessibilityRole="button"
                  accessibilityLabel={`Ver frase ${phrase} en el grafo`}
                >
                  <Text className="text-gray-700 text-sm">{phrase}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Deep-links */}
        <View className="mt-8">
          <Text className="text-base font-semibold text-gray-900 mb-3">
            Explorar más
          </Text>
          <View className="gap-3">
            <Pressable
              onPress={() => navigation.navigate('DiscoverDashboard')}
              className="p-4 bg-white border border-gray-200 rounded-xl flex-row items-center justify-between"
              accessibilityRole="button"
            >
              <View>
                <Text className="font-semibold text-gray-900">Ver Dashboard</Text>
                <Text className="text-sm text-gray-600 mt-1">
                  Visualiza tendencias y estadísticas
                </Text>
              </View>
              <Text className="text-2xl">📊</Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('DiscoverGraph')}
              className="p-4 bg-indigo-600 rounded-xl flex-row items-center justify-between"
              accessibilityRole="button"
            >
              <View>
                <Text className="font-semibold text-white">Ver Grafo de Patrones</Text>
                <Text className="text-sm text-indigo-100 mt-1">
                  Explora conexiones entre temas
                </Text>
              </View>
              <Text className="text-2xl">🕸️</Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('DiscoverFeed')}
              className="p-4 bg-white border border-gray-200 rounded-xl flex-row items-center justify-between"
              accessibilityRole="button"
            >
              <View>
                <Text className="font-semibold text-gray-900">Ver Feed de Insights</Text>
                <Text className="text-sm text-gray-600 mt-1">
                  Descubre insights de otras entradas
                </Text>
              </View>
              <Text className="text-2xl">📰</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
