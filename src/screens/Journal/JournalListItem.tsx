import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { JournalListItem as JournalListItemType } from '@features/journal/types';

type Props = {
  item: JournalListItemType;
  onPress: () => void;
  onToggleFavorite: () => void;
};

export default function JournalListItem({ item, onPress, onToggleFavorite }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="px-4 py-3 border-b border-gray-200 bg-white active:bg-gray-50"
      accessibilityRole="button"
      accessibilityLabel={`Entrada: ${item.title || 'Sin título'}`}
    >
      <View className="flex-row justify-between items-start mb-1">
        <Text className="text-lg font-semibold text-gray-900 flex-1" numberOfLines={1}>
          {item.title || 'Sin título'}
        </Text>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="ml-2 p-1"
          accessibilityRole="button"
          accessibilityLabel={item.isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        >
          <Text className="text-2xl">{item.isFavorite ? '★' : '☆'}</Text>
        </Pressable>
      </View>

      {item.excerpt && (
        <Text className="text-sm text-gray-600 mb-2" numberOfLines={2}>
          {item.excerpt}
        </Text>
      )}

      <View className="flex-row flex-wrap gap-2 items-center">
        {item.mood !== null && (
          <View className="flex-row items-center">
            <Text className="text-sm text-gray-500">😊 {item.mood}</Text>
          </View>
        )}
        {item.energy !== null && (
          <View className="flex-row items-center">
            <Text className="text-sm text-gray-500">⚡ {item.energy}</Text>
          </View>
        )}
        {item.tags && item.tags.length > 0 && (
          <View className="flex-row flex-wrap gap-1">
            {item.tags.slice(0, 3).map((tag, idx) => (
              <Text key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                #{tag}
              </Text>
            ))}
            {item.tags.length > 3 && (
              <Text className="text-xs text-gray-500">+{item.tags.length - 3}</Text>
            )}
          </View>
        )}
      </View>

      <Text className="text-xs text-gray-400 mt-2">
        {new Date(item.createdAt).toLocaleString('es-ES', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </Pressable>
  );
}
