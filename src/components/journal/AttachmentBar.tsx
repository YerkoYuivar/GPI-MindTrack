import React from 'react';
import { View, Pressable, Text } from 'react-native';

type Props = {
  imageCount: number;
  onAddImages: () => void;
  hasAudio: boolean;
  onToggleAudio: () => void;
  className?: string;
};

/**
 * Barra de adjuntos: botones para agregar imágenes y marcar audio.
 * Muestra contador de imágenes actuales.
 */
export default function AttachmentBar({ 
  imageCount, 
  onAddImages, 
  hasAudio, 
  onToggleAudio, 
  className 
}: Props) {
  return (
    <View className={`flex-row items-center gap-3 ${className ?? ''}`}>
      {/* Botón Agregar Imagen */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Agregar imagen"
        onPress={onAddImages}
        className="px-3 py-2 rounded-xl bg-white border border-gray-200 active:bg-gray-50"
      >
        <Text className="text-gray-800">🖼️ Agregar</Text>
      </Pressable>

      {/* Botón Toggle Audio */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Marcar audio"
        onPress={onToggleAudio}
        className={`px-3 py-2 rounded-xl border ${
          hasAudio 
            ? 'bg-indigo-50 border-indigo-200 active:bg-indigo-100' 
            : 'bg-white border-gray-200 active:bg-gray-50'
        }`}
      >
        <Text className={hasAudio ? 'text-indigo-700' : 'text-gray-800'}>
          {hasAudio ? '🎙️ Con audio' : '🎙️ Audio'}
        </Text>
      </Pressable>

      {/* Contador de Imágenes */}
      <View className="ml-auto">
        <Text className="text-gray-500 text-sm">
          {imageCount > 0 
            ? `${imageCount} imagen${imageCount > 1 ? 'es' : ''}` 
            : 'Sin imágenes'}
        </Text>
      </View>
    </View>
  );
}
