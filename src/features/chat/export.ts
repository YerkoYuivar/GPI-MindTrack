/**
 * Chat Export
 * Exportación segura de transcripciones de chat a formato texto
 */

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { ChatMessage } from './types';

/**
 * Exporta una conversación completa a un archivo de texto plano.
 * 
 * Formato:
 * - Cada mensaje: [timestamp ISO] ROLE: contenido
 * - Sin PII adicional (solo contenido del chat)
 * - Archivo temporal en caché (no se guarda permanentemente)
 * 
 * @param convId - ID de la conversación
 * @param msgs - Array de mensajes a exportar
 * @returns URI del archivo generado
 */
export async function exportConversationToTxt(
  convId: string,
  msgs: ChatMessage[]
): Promise<string> {
  // Generar líneas del archivo
  const lines = msgs.map((m) => {
    // Timestamp en formato ISO
    const ts = new Date(m.createdAt).toISOString();
    
    // Role en mayúsculas
    const role = m.role.toUpperCase();
    
    // Sanitizar contenido (normalizar espacios en blanco)
    const text = (m.content ?? '')
      .replace(/\s+/g, ' ')
      .trim();
    
    return `[${ts}] ${role}: ${text}`;
  });

  // Construir contenido del archivo
  const body = [
    `Conversación ${convId}`,
    `Exportado: ${new Date().toISOString()}`,
    `Total mensajes: ${msgs.length}`,
    '',
    ...lines,
    '',
  ].join('\n');

  // Escribir a archivo temporal (nueva API expo-file-system)
  const filename = `chat-${convId}.txt`;
  const file = new File(Paths.cache, filename);
  await file.create();
  await file.write(body);

  // Compartir si está disponible
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/plain',
      dialogTitle: 'Exportar conversación',
    });
  }

  return file.uri;
}
