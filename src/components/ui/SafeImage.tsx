/**
 * SafeImage.tsx
 * Componente de imagen con manejo robusto de errores y validación de URIs.
 * Previene crashes por URIs inválidos mostrando un fallback visual.
 */

import React, { useState } from 'react';
import { Image, View, Text, type ImageProps, type StyleProp, type ViewStyle } from 'react-native';
import { validateImageUri, debugImageUri } from '@utils/imageHelpers';

export type SafeImageProps = Omit<ImageProps, 'source'> & {
    /** URI de la imagen a cargar */
    source: { uri?: string | null } | number;
    /** Emoji o texto a mostrar si falla la carga */
    fallbackIcon?: string;
    /** Estilo del contenedor de fallback */
    fallbackStyle?: StyleProp<ViewStyle>;
    /** Si se debe mostrar debug info en consola */
    debug?: boolean;
    /** Label para debug logging */
    debugLabel?: string;
};

/**
 * Componente seguro para renderizar imágenes que previene el error:
 * "No suitable URL request handler found for (null)"
 * 
 * Características:
 * - Valida URIs antes de renderizar
 * - Maneja errores de carga gracefully
 * - Muestra fallback visual cuando falla
 * - Debug logging opcional
 * 
 * @example
 * // Uso básico
 * <SafeImage source={{ uri: user.photoURL }} style={styles.avatar} />
 * 
 * @example
 * // Con fallback personalizado
 * <SafeImage 
 *   source={{ uri: imageUrl }} 
 *   fallbackIcon="📷"
 *   style={styles.image}
 * />
 * 
 * @example
 * // Con debugging
 * <SafeImage 
 *   source={{ uri: user.photoURL }} 
 *   debug
 *   debugLabel="UserAvatar"
 *   style={styles.avatar}
 * />
 */
export default function SafeImage({
    source,
    fallbackIcon = '🖼️',
    fallbackStyle,
    debug = false,
    debugLabel,
    style,
    ...props
}: SafeImageProps) {
    const [hasError, setHasError] = useState(false);

    // Soportar tanto URIs como recursos locales (require)
    const isUriSource = typeof source === 'object' && 'uri' in source;

    if (!isUriSource) {
        // Es un recurso local, renderizar directamente
        return <Image {...props} source={source as number} style={style} />;
    }

    // Validar URI
    const uri = source.uri;
    const validUri = validateImageUri(uri);

    // Debug logging si está habilitado
    if (debug && !validUri) {
        const debugInfo = debugImageUri(uri, debugLabel);
        console.warn('[SafeImage] Invalid URI detected:', debugInfo);
    }

    // 🚨 LOGGING AGRESIVO: Si recibimos null, loggear SIEMPRE con stack trace
    if (!validUri && uri !== undefined) {
        console.error('🚨 [SafeImage] BLOCKED NULL/INVALID URI FROM REACHING NATIVE CODE', {
            uri,
            type: typeof uri,
            debugLabel,
            stack: new Error().stack,
        });
    }

    // Si URI inválido o hubo error al cargar, mostrar fallback
    if (!validUri || hasError) {
        const fallbackContainerStyle: StyleProp<ViewStyle> = [
            {
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#E5E7EB', // gray-200
            },
            style,
            fallbackStyle,
        ];

        return (
            <View style={fallbackContainerStyle}>
                <Text style={{ fontSize: 24 }}>{fallbackIcon}</Text>
            </View>
        );
    }

    // Renderizar imagen con manejo de errores
    return (
        <Image
            {...props}
            source={{ uri: validUri }}
            style={style}
            onError={(e) => {
                if (debug) {
                    console.warn('[SafeImage] Failed to load:', {
                        uri: validUri,
                        error: e.nativeEvent.error,
                        debugLabel,
                    });
                }
                setHasError(true);

                // Llamar al handler original si existe
                if (props.onError) {
                    props.onError(e);
                }
            }}
        />
    );
}
