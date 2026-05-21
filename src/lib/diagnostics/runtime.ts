/**
 * Información de runtime: conectividad, emuladores, etc.
 */

import NetInfo from '@react-native-community/netinfo';

export type RuntimeInfo = {
  online: boolean;
  type: string | null;
  ip: string | null;
  emulators: {
    firestore: boolean;
    storage: boolean;
  };
  ts: number;
};

/**
 * Obtiene información del runtime actual
 */
export async function getRuntimeInfo(): Promise<RuntimeInfo> {
  const net = await NetInfo.fetch();

  // Detectar si estamos usando emuladores
  // Verifica si firebaseApp.ts tiene connectFirestoreEmulator activo
  const isUsingEmulators = __DEV__ && (
    // Puedes agregar lógica para detectar si los emuladores están conectados
    // Por ahora, asumimos que en dev mode con ciertas variables están activos
    process.env.EXPO_PUBLIC_USE_EMULATORS === 'true' ||
    false // Cambiar según tu configuración
  );

  return {
    online: (net.isConnected ?? false) && (net.isInternetReachable ?? false),
    type: net.type || null,
    ip: (net.details as any)?.ipAddress ?? null,
    emulators: {
      firestore: isUsingEmulators,
      storage: isUsingEmulators,
    },
    ts: Date.now(),
  };
}

/**
 * Formatea duración en ms a string legible
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else {
    return `${(ms / 60000).toFixed(1)}m`;
  }
}

/**
 * Formatea timestamp a string legible
 */
export function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
