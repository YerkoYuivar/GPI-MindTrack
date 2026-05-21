/**
 * @module uploadAudio
 * @description Helper para subida de archivos de audio a Firebase Storage
 * - Conversión de URI local a Blob
 * - Subida de archivos .m4a (AAC)
 * - Obtención de downloadURL
 */

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@lib/firebase';

export type UploadAudioResult = {
  path: string;
  url: string;
  bytes: number;
};

/**
 * Convierte una URI local a Blob para subida
 */
async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  return await response.blob();
}

/**
 * Sube archivo de audio a Firebase Storage
 * @param userId - ID del usuario propietario
 * @param entryId - ID de la entrada de diario
 * @param audioId - UUID único del audio
 * @param localUri - URI local del archivo de audio
 * @returns Metadatos del audio subido (path, URL, bytes)
 */
export async function uploadAudio(
  userId: string,
  entryId: string,
  audioId: string,
  localUri: string
): Promise<UploadAudioResult> {
  // Ruta en Storage
  const path = `users/${userId}/journals/${entryId}/audio/${audioId}.m4a`;
  
  // Convertir URI a Blob
  const blob = await uriToBlob(localUri);
  
  // Subir a Storage
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { 
    contentType: 'audio/mp4' // m4a usa codec AAC en contenedor MP4
  });
  
  // Obtener downloadURL
  const url = await getDownloadURL(storageRef);
  
  return {
    path,
    url,
    bytes: blob.size,
  };
}
