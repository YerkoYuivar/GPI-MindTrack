/**
 * RecommendationCard.tsx
 * Tarjeta de UI para mostrar una recomendación con acciones (CTAs)
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { RecItem, RecAction } from '@features/discover/recommendRepo';

type Props = {
  item: RecItem;
  onAction?: (action: RecAction) => void;
};

/**
 * Obtiene emoji según el tipo de recomendación
 */
function getTypeEmoji(type: string): string {
  switch (type) {
    case 'meditation':
      return '🧘';
    case 'breathing':
      return '🫁';
    case 'journaling':
      return '📝';
    case 'movement':
      return '🏃';
    case 'tip':
      return '💡';
    default:
      return '✨';
  }
}

/**
 * Obtiene color de badge según el tipo
 */
function getTypeBadgeColor(type: string): string {
  switch (type) {
    case 'meditation':
      return 'bg-purple-100 text-purple-700';
    case 'breathing':
      return 'bg-blue-100 text-blue-700';
    case 'journaling':
      return 'bg-indigo-100 text-indigo-700';
    case 'movement':
      return 'bg-green-100 text-green-700';
    case 'tip':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export default function RecommendationCard({ item, onAction }: Props) {
  const emoji = getTypeEmoji(item.type);
  const badgeColor = getTypeBadgeColor(item.type);

  return (
    <View className="p-4 bg-white border border-gray-200 rounded-2xl">
      {/* Header: tipo + emoji */}
      <View className="flex-row items-center justify-between">
        <View className={`px-2 py-1 rounded-lg ${badgeColor}`}>
          <Text className="text-xs font-semibold uppercase">{item.type}</Text>
        </View>
        <Text className="text-2xl">{emoji}</Text>
      </View>

      {/* Título */}
      <Text className="mt-3 text-lg font-bold text-gray-900">{item.title}</Text>

      {/* Resumen */}
      <Text className="mt-1 text-sm text-gray-700">{item.summary}</Text>

      {/* Tags (opcional) */}
      {item.tags && item.tags.length > 0 && (
        <View className="flex-row flex-wrap gap-2 mt-3">
          {item.tags.slice(0, 3).map((tag, idx) => (
            <View key={idx} className="px-2 py-1 bg-gray-100 rounded-md">
              <Text className="text-xs text-gray-600">#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Acciones (CTAs) */}
      {item.actions && item.actions.length > 0 && (
        <View className="flex-row flex-wrap gap-2 mt-4">
          {item.actions.map((action, idx) => (
            <Pressable
              key={idx}
              onPress={() => onAction?.(action)}
              className="px-4 py-2 bg-indigo-600 rounded-xl"
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <Text className="text-sm font-semibold text-white">{action.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Score (solo para debug, normalmente oculto) */}
      {__DEV__ && (
        <Text className="mt-2 text-xs text-gray-400">Score: {item.score.toFixed(2)}</Text>
      )}
    </View>
  );
}
