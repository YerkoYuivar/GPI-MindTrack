/**
 * AuthContext
 * 
 * Contexto global de autenticación que maneja el estado del usuario
 * y proporciona funciones para login, registro y logout.
 * 
 * Ventajas sobre hooks directos:
 * - Un solo listener de onAuthStateChanged para toda la app
 * - Mejor performance
 * - Estado centralizado
 * - Fácil acceso desde cualquier componente
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User, AuthError } from 'firebase/auth';
import { auth } from '@lib/firebase/firebaseApp';
import { validateImageUri } from '@utils/imageHelpers';

/**
 * Timeout wrapper para operaciones de Firebase
 * Previene que la app se quede en loading infinito
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
    )
  ]);
}
import {
  signInWithEmail,
  signUpWithEmail,
  signOut as firebaseSignOut,
  sendPasswordReset,
} from '@features/auth/repo';
import type { AuthUser } from '@features/auth/types';
import { getUserProfile, createUserDocument, ensureUserProfile } from '@features/auth/userService';
import type { UserProfile } from '@features/auth/types';
import { syncLocalEntriesToFirestore, hasLocalEntries } from '@features/journal/syncLocalEntries';

/**
 * Tipo del contexto de autenticación
 */
interface AuthContextType {
  // Estado
  user: AuthUser | null;
  userProfile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Funciones
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

/**
 * Contexto de autenticación
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Props del provider
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Convierte un User de Firebase a nuestro tipo AuthUser
 * SANITIZA photoURL para prevenir crashes de imagen
 */
function toAuthUser(firebaseUser: User | null): AuthUser | null {
  if (!firebaseUser) return null;

  // Validar y sanitizar photoURL - previene crash por URIs inválidos
  const sanitizedPhotoURL = validateImageUri(firebaseUser.photoURL);

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    isAnonymous: firebaseUser.isAnonymous,
    displayName: firebaseUser.displayName,
    photoURL: sanitizedPhotoURL, // ✅ Ahora garantizado como string válido o null
  };
}

/**
 * Provider del contexto de autenticación
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Listener de cambios en el estado de autenticación de Firebase
   */
  useEffect(() => {
    console.log('🔐 AuthContext: Iniciando listener de autenticación');
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔐 AuthContext: onAuthStateChanged ejecutado', {
        hasUser: !!firebaseUser,
        email: firebaseUser?.email
      });

      const authUser = toAuthUser(firebaseUser);
      setUser(authUser);

      // Si hay usuario, cargar su perfil de Firestore
      if (authUser && !authUser.isAnonymous) {
        try {
          console.log('🔐 AuthContext: Cargando perfil de usuario...');

          // Intentar obtener o crear automáticamente el perfil (evita error "not found")
          const profile = await withTimeout(
            ensureUserProfile(authUser.uid, {
              email: authUser.email || '',
              displayName: authUser.displayName || undefined,
              photoURL: authUser.photoURL || undefined,
            }),
            8000
          );
          setUserProfile(profile);
          console.log('🔐 AuthContext: Perfil verificado/cargado exitosamente');

          // Sincronizar entradas locales a Firestore (en background, no bloquear UI)
          hasLocalEntries().then(hasLocal => {
            if (hasLocal) {
              console.log('🔐 AuthContext: Sincronizando entradas locales en background...');
              syncLocalEntriesToFirestore(authUser.uid)
                .then(syncedCount => {
                  if (syncedCount > 0) {
                    console.log(`🔐 AuthContext: ${syncedCount} entradas sincronizadas exitosamente`);
                  }
                })
                .catch(syncError => {
                  console.error('Error syncing local entries:', syncError);
                });
            }
          }).catch(err => console.error('Error checking local entries:', err));

        } catch (error) {
          console.error('Error verifying/creating user profile:', error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }

      console.log('🔐 AuthContext: Finalizando carga, isLoading = false');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Login con email y contraseña
   */
  const login = async (email: string, password: string): Promise<void> => {
    try {
      await signInWithEmail(email, password);
      // onAuthStateChanged manejará la actualización del estado
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  /**
   * Registro con email y contraseña
   */
  const signup = async (
    email: string,
    password: string,
    displayName?: string
  ): Promise<void> => {
    try {
      const newUser = await signUpWithEmail(email, password);

      // Crear documento en Firestore
      await createUserDocument(newUser.uid, {
        email,
        displayName,
      });

      // onAuthStateChanged manejará la actualización del estado
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  /**
   * Cierra sesión
   */
  const logout = async (): Promise<void> => {
    try {
      await firebaseSignOut();
      setUser(null);
      setUserProfile(null);
      // onAuthStateChanged manejará la actualización del estado
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  /**
   * Envía email de recuperación de contraseña
   */
  const resetPassword = async (email: string): Promise<void> => {
    try {
      await sendPasswordReset(email);
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  };

  /**
   * Recarga el perfil del usuario desde Firestore
   */
  const refreshUserProfile = async (): Promise<void> => {
    if (!user || user.isAnonymous) return;

    try {
      const profile = await getUserProfile(user.uid);
      setUserProfile(profile);
    } catch (error) {
      console.error('Error refreshing user profile:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    isAuthenticated: !!user && !user.isAnonymous,
    isLoading,
    login,
    signup,
    logout,
    resetPassword,
    refreshUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook para acceder al contexto de autenticación
 * 
 * @example
 * ```tsx
 * const { user, isAuthenticated, login, logout } = useAuth();
 * 
 * if (isLoading) return <LoadingView />;
 * if (!isAuthenticated) return <LoginScreen />;
 * return <HomeScreen user={user} />;
 * ```
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
