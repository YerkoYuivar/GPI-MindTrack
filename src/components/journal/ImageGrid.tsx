import React from 'react';
import { View, Pressable, Text, ActivityIndicator } from 'react-native';
import type { UploadStateItem } from '@features/journal/useUploadImages';
import { validateImageUri, debugImageUri } from '@utils/imageHelpers';
import SafeImage from '@components/ui/SafeImage';

type Props = {
  uris: string[] | UploadStateItem[];
  onRemove: (uri: string) => void;
  className?: string;
  /** Habilitar debug logging de URIs inválidos */
  debug?: boolean;
};

/**
 * Rejilla de previews de imágenes con botón de eliminación.
 * Muestra hasta 4 imágenes en cuadrícula 3 columnas.
 * Soporta estados de subida (pending, uploading, done, error).
 * 
 * Ahora con validación robusta de URIs para prevenir crashes.
 */
export default function ImageGrid({ uris, onRemove, className, debug = false }: Props) {
  if (!uris?.length) return null;

  return (
    <View className={`mt-3 flex-row flex-wrap gap-3 ${className ?? ''}`}>
      {uris.map((item) => {
        // Soportar tanto string[] como UploadStateItem[]
        const uri = typeof item === 'string' ? item : item.uri;
        const status = typeof item === 'string' ? undefined : item.status;

        // Validar URI usando el helper robusto
        const validUri = validateImageUri(uri);
        const isValidUri = validUri !== null;

        // Debug logging si está habilitado
        if (debug && uri && !isValidUri) {
          const debugInfo = debugImageUri(uri, 'ImageGrid');
          console.warn('[ImageGrid] Invalid URI detected:', debugInfo);
        }

        const key = typeof item === 'string' ? (isValidUri ? uri : `invalid-${Math.random().toString(36).slice(2)}`) : item.id;

        return (
          <View
            key={key}
            className="w-[31%] aspect-square rounded-xl overflow-hidden bg-gray-200 relative"
          >
            {/* Preview de la imagen */}
            {isValidUri ? (
              <SafeImage
                source={{ uri: validUri }}
                className="w-full h-full"
                resizeMode="cover"
                accessibilityLabel="Preview de imagen adjunta"
                fallbackIcon="📷"
                debug={debug}
                debugLabel="ImageGrid"
              />
            ) : (
              <View className="absolute inset-0 items-center justify-center">
                <Text className="text-gray-500 text-xs">Sin vista previa</Text>
              </View>
            )}

            {/* Overlay: Subiendo */}
            {status === 'uploading' && (
              <View className="absolute inset-0 bg-black/50 items-center justify-center">
                <ActivityIndicator size="small" color="#fff" />
                <Text className="text-white text-xs mt-1 font-medium">Subiendo...</Text>
              </View>
            )}

            {/* Overlay: Error */}
            {status === 'error' && (
              <View className="absolute inset-0 bg-red-600/60 items-center justify-center">
                <Text className="text-white text-xs font-bold">❌ Error</Text>
              </View>
            )}

            {/* Overlay: Completado (checkmark temporal) */}
            {status === 'done' && (
              <View className="absolute top-1 left-1 bg-green-500 rounded-full w-6 h-6 items-center justify-center">
                <Text className="text-white text-xs font-bold">✓</Text>
              </View>
            )}

            {/* Botón eliminar */}
            <Pressable
              onPress={() => isValidUri && onRemove(uri)}
              accessibilityRole="button"
              accessibilityLabel="Quitar imagen"
              className="absolute top-1 right-1 bg-black/60 rounded-full px-2 py-1 active:bg-black/80"
              disabled={status === 'uploading' || !isValidUri}
            >
              <Text className="text-white text-xs font-bold">✕</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

