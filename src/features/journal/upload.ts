/**
 * @module upload
 * @description Helpers para subida de imágenes a Firebase Storage
 * - Generación de thumbnails client-side
 * - Subida de pares original + thumbnail
 * - Conversión de URIs locales a Blobs
 */

import * as ImageManipulator from 'expo-image-manipulator';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@lib/firebase';

export type UploadResult = {
  path: string;
  url: string;
  thumbPath: string;
  thumbUrl: string;
  width: number;
  height: number;
  bytes: number;
};

/**
 * Genera un thumbnail de la imagen manteniendo aspecto
 * @param uri - URI local de la imagen original
 * @param maxWidth - Ancho máximo del thumbnail (default 512px)
 * @returns URI del thumbnail + dimensiones
 */
export async function makeThumbnail(
  uri: string,
  maxWidth = 512
): Promise<{ uri: string; width: number; height: number }> {
  const manip = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxWidth } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );

  return {
    uri: manip.uri,
    width: manip.width!,
    height: manip.height!,
  };
}

/**
 * Convierte una URI local a Blob para subida
 */
async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  return await response.blob();
}

/**
 * Sube par de imágenes (original + thumbnail) a Storage
 * @param userId - ID del usuario propietario
 * @param entryId - ID de la entrada de diario
 * @param imageId - UUID único de la imagen
 * @param localUri - URI local de la imagen original
 * @returns Metadatos de las imágenes subidas (paths, URLs, dimensiones, bytes)
 */
export async function uploadImagePair(
  userId: string,
  entryId: string,
  imageId: string,
  localUri: string
): Promise<UploadResult> {
  // 1. Generar thumbnail
  const thumb = await makeThumbnail(localUri, 512);

  // 2. Definir rutas en Storage
  const base = `users/${userId}/journals/${entryId}/images/${imageId}`;
  const originalPath = `${base}.jpg`;
  const thumbPath = `${base}_thumb.jpg`;

  // 3. Subir imagen original
  const originalBlob = await uriToBlob(localUri);
  const originalRef = ref(storage, originalPath);
  await uploadBytes(originalRef, originalBlob, { contentType: 'image/jpeg' });
  const url = await getDownloadURL(originalRef);

  // 4. Subir thumbnail
  const thumbBlob = await uriToBlob(thumb.uri);
  const thumbRef = ref(storage, thumbPath);
  await uploadBytes(thumbRef, thumbBlob, { contentType: 'image/jpeg' });
  const thumbUrl = await getDownloadURL(thumbRef);

  // 5. Retornar metadatos completos
  return {
    path: originalPath,
    url,
    thumbPath,
    thumbUrl,
    width: thumb.width,
    height: thumb.height,
    bytes: originalBlob.size,
  };
}
