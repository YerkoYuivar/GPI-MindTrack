/**
 * imageHelpers.ts
 * Utilidades para validación y normalización de URIs de imágenes
 */

import { useMemo } from 'react';

/**
 * Valida y normaliza URIs de imágenes.
 * Retorna un string válido o null si el URI es inválido.
 * 
 * @param uri - URI a validar (puede ser de cualquier tipo)
 * @returns string válido o null
 * 
 * @example
 * validateImageUri('https://example.com/image.jpg') // 'https://example.com/image.jpg'
 * validateImageUri(null) // null
 * validateImageUri('null') // null
 * validateImageUri('') // null
 */
export function validateImageUri(uri: unknown): string | null {
    // Verificar que sea un string
    if (typeof uri !== 'string') {
        return null;
    }

    const trimmed = uri.trim();

    // Verificar valores inválidos comunes
    if (
        trimmed === '' ||
        trimmed === 'null' ||
        trimmed === 'undefined' ||
        trimmed === 'false' ||
        trimmed.toLowerCase() === 'none'
    ) {
        return null;
    }

    // Verificar que comience con protocolo válido
    // Soporta: http://, https://, file://, data:, content:// (Android), ph:// (iOS Photos)
    const validProtocols = ['http://', 'https://', 'file://', 'data:', 'content://', 'ph://'];
    const hasValidProtocol = validProtocols.some(protocol => trimmed.startsWith(protocol));

    if (!hasValidProtocol) {
        return null;
    }

    return trimmed;
}

/**
 * Hook de React que valida y memoriza URIs de imágenes.
 * Útil para evitar revalidaciones innecesarias en re-renders.
 * 
 * @param uri - URI a validar
 * @returns string válido o null
 * 
 * @example
 * const validUri = useValidatedImageUri(user.photoURL);
 * if (validUri) {
 *   return <Image source={{ uri: validUri }} />;
 * }
 */
export function useValidatedImageUri(uri: unknown): string | null {
    return useMemo(() => validateImageUri(uri), [uri]);
}

/**
 * Valida una lista de URIs y retorna solo los válidos.
 * Útil para filtrar arrays de URIs de imágenes.
 * 
 * @param uris - Array de URIs a validar
 * @returns Array de strings válidos
 * 
 * @example
 * const validUris = validateImageUris(['https://example.com/1.jpg', null, 'null', 'https://example.com/2.jpg']);
 * // ['https://example.com/1.jpg', 'https://example.com/2.jpg']
 */
export function validateImageUris(uris: unknown[]): string[] {
    return uris
        .map(uri => validateImageUri(uri))
        .filter((uri): uri is string => uri !== null);
}

/**
 * Depura información sobre un URI para logging.
 * Útil para diagnosticar problemas con URIs inválidos.
 * 
 * @param uri - URI a depurar
 * @param label - Etiqueta opcional para el log
 * @returns Objeto con información de depuración
 */
export function debugImageUri(uri: unknown, label?: string): {
    original: unknown;
    type: string;
    isNull: boolean;
    isStringNull: boolean;
    isUndefined: boolean;
    isEmpty: boolean;
    validated: string | null;
    label?: string;
} {
    const validated = validateImageUri(uri);

    return {
        original: uri,
        type: typeof uri,
        isNull: uri === null,
        isStringNull: uri === 'null',
        isUndefined: uri === undefined,
        isEmpty: typeof uri === 'string' && uri.trim() === '',
        validated,
        ...(label && { label }),
    };
}
