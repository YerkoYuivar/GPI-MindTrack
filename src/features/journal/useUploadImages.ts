/**
 * @module useUploadImages
 * @description Hook para gestión de subida de imágenes con progreso
 * - Estados por imagen: pending, uploading, done, error
 * - Procesamiento secuencial con feedback visual
 * - Límite de 4 imágenes por entrada
 * - Deduplicación automática por URI
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { uploadImagePair } from './upload';
import { upsertEntryImage, bumpImageCount } from './repo';
import { ensureAuthUser } from '@lib/firebase/auth';
import { metrics } from '../../lib/diagnostics/metrics';
import { logger } from '../../lib/diagnostics/logger';

export type UploadStateItem = {
  uri: string;
  id: string;          // UUID de la imagen
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;    // 0..1 (simulado por pasos)
  error?: string;
};

/**
 * Genera UUID simple (compatible con crypto.randomUUID cuando disponible)
 */
function uuid(): string {
  // @ts-ignore - crypto.randomUUID puede no estar disponible en todos los entornos
  if (typeof crypto !== 'undefined' && crypto?.randomUUID) {
    // @ts-ignore
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Hook para gestión de subida de imágenes con estados
 * @param entryId - ID de la entrada de diario (requerido para subir)
 */
export function useUploadImages(entryId: string) {
  const [items, setItems] = useState<UploadStateItem[]>([]);
  const busyRef = useRef(false);

  /**
   * Agrega un lote de URIs al queue de subida
   * Evita duplicados y respeta límite de 4 imágenes
   */
  const pushBatch = useCallback((uris: string[]) => {
    const newItems = uris.map((uri) => ({
      uri,
      id: uuid(),
      status: 'pending' as const,
      progress: 0,
    }));

    setItems((prev) => {
      // Deduplicar por URI
      const seen = new Set(prev.map((x) => x.uri));
      const merged = [...prev, ...newItems.filter((n) => !seen.has(n.uri))];
      // Respetar límite de 4
      return merged.slice(0, 4);
    });
  }, []);

  /**
   * Elimina una imagen del queue (antes o después de subir)
   */
  const remove = useCallback((uri: string) => {
    setItems((prev) => prev.filter((x) => x.uri !== uri));
  }, []);

  /**
   * Inicia la subida de todas las imágenes pendientes
   * Procesamiento secuencial con estados individuales
   */
  const start = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;

    try {
      const userId = await ensureAuthUser();
      let uploadedCount = 0;

      // Procesar secuencialmente
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Saltar si ya está subida
        if (item.status === 'done') {
          uploadedCount++;
          continue;
        }

        // Marcar como subiendo
        setItems((prev) =>
          prev.map((p) =>
            p.uri === item.uri
              ? { ...p, status: 'uploading', progress: 0.1 }
              : p
          )
        );

        try {
          // Instrumentación: medir tiempo de subida de imagen
          await metrics.time('journal.image.upload', async () => {
            // Subir par original + thumbnail
            const result = await uploadImagePair(userId, entryId, item.id, item.uri);
            
            // Guardar metadatos en Firestore
            await upsertEntryImage(userId, entryId, item.id, result);
          });
          
          uploadedCount++;

          // Instrumentación: track subida exitosa
          metrics.inc('journal.image.upload.success');
          logger.info('Image upload success', { entryId, imageId: item.id }, 'journal');

          // Marcar como completada
          setItems((prev) =>
            prev.map((p) =>
              p.uri === item.uri
                ? { ...p, status: 'done', progress: 1 }
                : p
            )
          );

          // Actualizar contador en entrada
          await bumpImageCount(userId, entryId, uploadedCount);
        } catch (error: any) {
          // Instrumentación: track subida fallida
          metrics.inc('journal.image.upload.fail');
          logger.error('Image upload fail', { error, entryId, imageId: item.id }, 'journal');

          // Marcar como error
          setItems((prev) =>
            prev.map((p) =>
              p.uri === item.uri
                ? {
                    ...p,
                    status: 'error',
                    progress: 0,
                    error: String(error?.message || error),
                  }
                : p
            )
          );
        }
      }
    } finally {
      busyRef.current = false;
    }
  }, [items, entryId]);

  /**
   * Limpia todas las imágenes del queue
   */
  const clearAll = useCallback(() => setItems([]), []);

  /**
   * Resumen del estado actual de subidas
   */
  const summary = useMemo(() => {
    const total = items.length;
    const done = items.filter((i) => i.status === 'done').length;
    const uploading = items.some((i) => i.status === 'uploading');
    const hasError = items.some((i) => i.status === 'error');
    
    return { total, done, uploading, hasError };
  }, [items]);

  return {
    items,
    pushBatch,
    remove,
    start,
    clearAll,
    summary,
  };
}
