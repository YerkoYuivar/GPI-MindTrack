export type AppErrorCode =
  | 'auth/unauthenticated'
  | 'auth/invalid-credentials'
  | 'net/offline'
  | 'fs/permission-denied'
  | 'unknown';

export type AppError = { code: AppErrorCode; message?: string; cause?: unknown };

export const mapFirebaseError = (e: any): AppError => {
  const msg = typeof e?.message === 'string' ? e.message : undefined;
  const code = String(e?.code ?? '');
  if (code.startsWith('auth/invalid-credential'))
    return { code: 'auth/invalid-credentials', message: msg, cause: e };
  if (code === 'permission-denied') return { code: 'fs/permission-denied', message: msg, cause: e };
  return { code: 'unknown', message: msg, cause: e };
};
