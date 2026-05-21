/**
 * @module components/discover/InsightCard
 * @description Tarjeta para mostrar un insight en el feed
 */

import React from 'react';
import { View, Pressable } from 'react-native';
import Text from '@components/ui/Text';
import type { Quality } from '@features/discover/insightsRepo';

/**
 * Props del componente InsightCard
 */
interface Props {
  item: {
    id: string;
    updatedAt: number;
    sentimentLabel: 'neg' | 'neu' | 'pos';
    sentimentScore: number;
    title?: string;
    snippet?: string;
    topics?: string[];
    quality?: Quality;
  };
  onOpenEntry?: (id: string) => void;
  onOpenGraphTopic?: (topic: string) => void;
}

/**
 * Retorna el tono de color según el sentimiento
 */
function getTone(label: 'neg' | 'neu' | 'pos'): string {
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
 * Tarjeta de insight para el feed
 * Muestra sentimiento, snippet, topics y botones de acción
 */
export default function InsightCard({ item, onOpenEntry, onOpenGraphTopic }: Props) {
  // Formatear fecha
  const dt = new Date(item.updatedAt);
  const dateStr = dt.toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' });

  const tone = getTone(item.sentimentLabel);
  const emoji = getSentimentEmoji(item.sentimentLabel);

  return (
    <View className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
      {/* Header: Título + Fecha */}
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold text-gray-900 flex-1" numberOfLines={1}>
          {item.title || 'Entrada sin título'}
        </Text>
        <Text className="text-xs text-gray-500 ml-2">{dateStr}</Text>
      </View>

      {/* Badge de Sentimiento + Quality */}
      <View className="flex-row items-center gap-2 mt-2 flex-wrap">
        <View className={`px-3 py-1 rounded-lg border ${tone} flex-row items-center gap-2`}>
          <Text className="text-lg">{emoji}</Text>
          <Text className="text-xs font-medium">
            {item.sentimentLabel.toUpperCase()} ({item.sentimentScore.toFixed(2)})
          </Text>
        </View>

        {/* Badge de Quality */}
        {item.quality && (
          <View className={`px-2 py-1 rounded-lg border ${getQualityColor(item.quality.status)} flex-row items-center gap-1`}>
            <Text className="text-xs font-medium">{item.quality.status}</Text>
            <Text className="text-xs opacity-70">⏱ {item.quality.processingTimeMs}ms</Text>
          </View>
        )}
      </View>

      {/* Snippet de contenido */}
      {!!item.snippet && (
        <Text className="text-sm text-gray-700 mt-3 leading-5" numberOfLines={3}>
          {item.snippet}
        </Text>
      )}

      {/* Topics (chips clicables) */}
      {!!item.topics?.length && (
        <View className="flex-row flex-wrap gap-2 mt-3">
          {item.topics.map((topic, idx) => (
            <Pressable
              key={`${topic}-${idx}`}
              onPress={() => onOpenGraphTopic?.(topic)}
              className="px-2 py-1 rounded-xl bg-indigo-50 border border-indigo-200"
              accessibilityRole="button"
              accessibilityLabel={`Ver tema ${topic} en el grafo`}
            >
              <Text className="text-indigo-700 text-xs font-medium">#{topic}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Botones de acción */}
      <View className="flex-row gap-3 mt-4">
        <Pressable
          onPress={() => onOpenEntry?.(item.id)}
          className="flex-1 px-3 py-2 rounded-xl bg-indigo-600"
          accessibilityRole="button"
          accessibilityLabel="Ver entrada completa"
        >
          <Text className="text-white text-sm font-semibold text-center">Ver entrada</Text>
        </Pressable>
        
        <Pressable
          onPress={() => onOpenGraphTopic?.(item.topics?.[0] ?? '')}
          className="flex-1 px-3 py-2 rounded-xl bg-white border border-gray-200"
          accessibilityRole="button"
          accessibilityLabel="Ver en grafo"
          disabled={!item.topics?.length}
        >
          <Text className="text-gray-800 text-sm font-semibold text-center">Ver en grafo</Text>
        </Pressable>
      </View>
    </View>
  );
}
