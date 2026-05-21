/**
 * Auth Types
 * 
 * Tipos para autenticación de usuarios.
 */

/**
 * Usuario autenticado (Firebase Auth).
 * Representa el usuario actual con información básica de autenticación.
 */
export type AuthUser = {
  /** ID único del usuario en Firebase Auth */
  uid: string;
  /** Email del usuario (puede ser null si es anónimo) */
  email?: string | null;
  /** Indica si el usuario es anónimo */
  isAnonymous?: boolean;
  /** Nombre para mostrar del usuario */
  displayName?: string | null;
  /** URL de la foto de perfil */
  photoURL?: string | null;
};

/**
 * Perfil completo del usuario (Firestore).
 * Contiene información adicional almacenada en Firestore.
 */
export type UserProfile = {
  /** ID único del usuario */
  uid: string;
  /** Email del usuario */
  email: string;
  /** Nombre para mostrar */
  displayName: string | null;
  /** URL de la foto de perfil */
  photoURL: string | null;
  /** Biografía o descripción del usuario */
  bio: string | null;
  /** Fecha de creación de la cuenta (ISO string) */
  createdAt: string;
  /** Fecha de última actualización del perfil (ISO string) */
  updatedAt: string;
  /** Número de entradas del diario */
  diaryEntriesCount: number;
  /** Última vez que el usuario estuvo activo (ISO string) */
  lastActive: string;
};
