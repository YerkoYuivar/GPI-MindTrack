/**
 * GraphControls.tsx
 * Controles para el grafo: reset de viewport y filtros por tipo de nodo.
 */

import React from 'react';
import { View, Pressable, Text } from 'react-native';

type Props = {
  onReset: () => void;
  filter: { topic: boolean; phrase: boolean; emotion: boolean };
  onFilterChange: (filter: { topic: boolean; phrase: boolean; emotion: boolean }) => void;
};

export default function GraphControls({ onReset, filter, onFilterChange }: Props) {
  const toggleTopic = () => onFilterChange({ ...filter, topic: !filter.topic });
  const togglePhrase = () => onFilterChange({ ...filter, phrase: !filter.phrase });
  const toggleEmotion = () => onFilterChange({ ...filter, emotion: !filter.emotion });

  return (
    <View className="flex-row items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-2xl">
      {/* Botón Reset */}
      <Pressable
        onPress={onReset}
        className="px-3 py-1 bg-gray-100 border border-gray-300 rounded-xl"
        accessibilityRole="button"
        accessibilityLabel="Recentrar vista"
      >
        <Text className="text-sm font-semibold text-gray-700">🔄 Reset</Text>
      </Pressable>

      {/* Chips de filtro */}
      <View className="flex-row gap-2">
        <Pressable
          onPress={toggleTopic}
          className={`px-3 py-1 rounded-xl border ${
            filter.topic
              ? 'bg-blue-50 border-blue-200'
              : 'bg-gray-50 border-gray-300'
          }`}
          accessibilityRole="button"
          accessibilityLabel="Filtrar topics"
        >
          <Text
            className={`text-sm font-semibold ${
              filter.topic ? 'text-blue-700' : 'text-gray-500'
            }`}
          >
            Topic
          </Text>
        </Pressable>

        <Pressable
          onPress={togglePhrase}
          className={`px-3 py-1 rounded-xl border ${
            filter.phrase
              ? 'bg-green-50 border-green-200'
              : 'bg-gray-50 border-gray-300'
          }`}
          accessibilityRole="button"
          accessibilityLabel="Filtrar frases"
        >
          <Text
            className={`text-sm font-semibold ${
              filter.phrase ? 'text-green-700' : 'text-gray-500'
            }`}
          >
            Phrase
          </Text>
        </Pressable>

        <Pressable
          onPress={toggleEmotion}
          className={`px-3 py-1 rounded-xl border ${
            filter.emotion
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-gray-50 border-gray-300'
          }`}
          accessibilityRole="button"
          accessibilityLabel="Filtrar emociones"
        >
          <Text
            className={`text-sm font-semibold ${
              filter.emotion ? 'text-yellow-700' : 'text-gray-500'
            }`}
          >
            Emotion
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
