/**
 * Auth Repository
 * 
 * Funciones para interactuar con Firebase Auth.
 * Maneja sign up, sign in, sign out, y listeners de cambios de usuario.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from '@lib/firebase/firebaseApp';
import type { AuthUser } from './types';

/**
 * Convierte un User de Firebase a nuestro tipo AuthUser.
 */
function toAuthUser(user: User | null): AuthUser | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    isAnonymous: user.isAnonymous,
  };
}

/**
 * Listener de cambios de autenticación.
 * Se llama cada vez que el usuario cambia (login, logout, etc).
 * 
 * @param callback - Función que recibe el usuario actual o null
 * @returns Función para cancelar el listener
 */
export function onUserChanged(callback: (user: AuthUser | null) => void): () => void {
  return onAuthStateChanged(auth, (firebaseUser) => {
    callback(toAuthUser(firebaseUser));
  });
}

/**
 * Crea una cuenta con email y contraseña.
 * 
 * @param email - Email del usuario
 * @param password - Contraseña (mínimo 6 caracteres)
 * @returns Usuario creado
 * @throws Error si falla (email-already-in-use, invalid-email, weak-password)
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<AuthUser> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = toAuthUser(userCredential.user);
  if (!user) throw new Error('Failed to create user');
  return user;
}

/**
 * Inicia sesión con email y contraseña.
 * 
 * @param email - Email del usuario
 * @param password - Contraseña
 * @returns Usuario autenticado
 * @throws Error si falla (user-not-found, wrong-password, invalid-credential)
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthUser> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = toAuthUser(userCredential.user);
  if (!user) throw new Error('Failed to sign in');
  return user;
}

/**
 * Cierra sesión del usuario actual.
 */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Envía un email de recuperación de contraseña.
 * 
 * @param email - Email del usuario que olvidó su contraseña
 * @throws Error si falla (invalid-email, user-not-found)
 */
export async function sendPasswordReset(email: string): Promise<void> {
  const { sendPasswordResetEmail } = await import('firebase/auth');
  await sendPasswordResetEmail(auth, email);
}
