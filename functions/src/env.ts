/**
 * @module env
 * @description Variables de entorno y configuración
 */

/**
 * Verifica si se está ejecutando en el emulador
 */
export const isEmulator = (): boolean => {
  return process.env.FUNCTIONS_EMULATOR === 'true';
};

/**
 * Obtiene el userId desde el contexto de autenticación o usa demo-user en emulador
 */
export const getUserId = (authUid: string | undefined, fallbackUserId?: string): string | null => {
  if (authUid) {
    return authUid;
  }

  if (isEmulator()) {
    return fallbackUserId || 'demo-user';
  }

  return null;
};
