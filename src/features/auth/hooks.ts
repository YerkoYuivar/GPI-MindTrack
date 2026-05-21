/**
 * Auth Hooks
 * 
 * React hooks para manejar el estado de autenticación.
 */

import { useState, useEffect } from 'react';
import { onUserChanged } from './repo';
import type { AuthUser } from './types';

/**
 * Hook que escucha cambios en el estado de autenticación.
 * 
 * @returns Objeto con el usuario actual y un flag de loading
 * 
 * @example
 * ```tsx
 * const { user, loading } = useAuthListener();
 * if (loading) return <LoadingView />;
 * if (!user) return <SignInScreen />;
 * return <HomeScreen user={user} />;
 * ```
 */
export function useAuthListener(): { user: AuthUser | null; loading: boolean } {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onUserChanged((newUser) => {
      setUser(newUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
}

/**
 * Hook simple que retorna el usuario actual.
 * No incluye loading state, usar solo cuando ya se haya inicializado la auth.
 * 
 * @returns Usuario actual o null
 * 
 * @example
 * ```tsx
 * const user = useCurrentUser();
 * if (!user) return null;
 * return <Text>Welcome {user.email}</Text>;
 * ```
 */
export function useCurrentUser(): AuthUser | null {
  const { user } = useAuthListener();
  return user;
}
