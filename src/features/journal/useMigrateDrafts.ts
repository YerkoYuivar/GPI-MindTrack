/**
 * @module useMigrateDrafts
 * @description Hook que migra automáticamente drafts locales a Firestore al autenticarse
 */

import { useEffect, useState } from 'react';
import { useCurrentUser } from '@features/auth/hooks'; // ← Importar desde hooks, no desde AuthGate
import { migrateLocalDraftsToFirestore, isMigrationCompleted } from './migrateDrafts';
import { logger } from '@lib/diagnostics/logger';

/**
 * Hook que ejecuta la migración de drafts locales a Firestore
 * una sola vez cuando el usuario se autentica
 * 
 * @returns Estado de la migración
 */
export function useMigrateDrafts() {
  const user = useCurrentUser();
  const [migrating, setMigrating] = useState(false);
  const [migratedCount, setMigratedCount] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      // Sin usuario, no hay migración
      setMigrating(false);
      setMigratedCount(null);
      setError(null);
      return;
    }

    // ⚠️ MIGRACIÓN DESHABILITADA TEMPORALMENTE
    // Usuario autenticado - verificar si necesitamos migrar
    const migrate = async () => {
      try {
        // Verificar si ya migramos para este usuario
        const completed = await isMigrationCompleted(user.uid);
        
        if (completed) {
          logger.debug('Migration already completed for user', { userId: user.uid }, 'journal');
          return;
        }

        // ⚠️ COMENTADO: No ejecutar migración automáticamente por ahora
        logger.warn('Migration available but disabled - manual migration required', { userId: user.uid }, 'journal');
        return;

        // Ejecutar migración
        // setMigrating(true);
        // setError(null);
        
        // logger.info('Starting automatic migration', { userId: user.uid }, 'journal');
        // const count = await migrateLocalDraftsToFirestore(user.uid);
        
        // setMigratedCount(count);
        // setMigrating(false);
        
        // if (count > 0) {
        //   logger.info('Migration successful', { userId: user.uid, count }, 'journal');
        // }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Migration failed');
        logger.error('Migration error', { userId: user.uid, error }, 'journal');
        setError(error);
        setMigrating(false);
      }
    };

    migrate();
  }, [user]);

  return {
    migrating,
    migratedCount,
    error,
  };
}
