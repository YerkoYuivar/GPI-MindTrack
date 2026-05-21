import React from 'react';
import { View, Text } from 'react-native';
import SafeImage from './SafeImage';
import { validateImageUri, debugImageUri } from '@utils/imageHelpers';

export type AvatarProps = {
  uri?: string | null;
  size?: number;
  name?: string | null;
  className?: string;
  /** Habilitar debug logging de URIs inválidos */
  debug?: boolean;
};

// Extrae iniciales del nombre para placeholder
function getInitials(name?: string | null): string {
  if (!name) return '👤';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const initials = parts.map(p => p[0]?.toUpperCase()).join('');
  return initials || '👤';
}

/**
 * Componente Avatar con validación robusta de URIs.
 * Muestra la imagen del usuario o sus iniciales como fallback.
 * 
 * Previene el error "No suitable URL request handler found for (null)"
 * validando URIs antes de renderizar.
 * 
 * @example
 * <Avatar uri={user.photoURL} name={user.displayName} size={48} />
 */
export default function Avatar({
  uri,
  size = 96,
  name,
  className,
  debug = false,
}: AvatarProps) {
  const radius = size / 2;
  const initials = getInitials(name);

  // Validar URI usando el helper robusto
  const validUri = validateImageUri(uri);
  const showImage = validUri !== null;

  // Debug logging mejorado con más detalles
  if (debug && uri && !showImage) {
    const debugInfo = debugImageUri(uri, `Avatar(${name || 'unknown'})`);
    console.warn('[Avatar] Invalid URI detected:', debugInfo);
  }

  return (
    <View
      className={`bg-gray-200 items-center justify-center overflow-hidden ${className ?? ''}`}
      style={{ width: size, height: size, borderRadius: radius }}
      accessibilityRole="image"
      accessibilityLabel={name ? `Avatar de ${name}` : 'Avatar de usuario'}
    >
      {showImage ? (
        <SafeImage
          source={{ uri: validUri }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          fallbackIcon={initials}
          debug={debug}
          debugLabel={`Avatar(${name || 'unknown'})`}
        />
      ) : (
        <Text className="text-gray-600 font-semibold" style={{ fontSize: size * 0.35 }}>
          {initials}
        </Text>
      )}
    </View>
  );
}
