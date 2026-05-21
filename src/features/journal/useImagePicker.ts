import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

/**
 * Abre el selector de imágenes permitiendo seleccionar hasta `max` imágenes.
 * Respeta el límite combinando las URIs actuales con las nuevas.
 * 
 * @param max - Número máximo de imágenes permitidas
 * @param current - URIs actualmente seleccionadas
 * @returns Array de URIs actualizado o null si se canceló
 */
export async function pickImages(
  max: number, 
  current: string[] = []
): Promise<string[] | null> {
  // Solicita permisos si no están concedidos
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(
      'Permiso requerido', 
      'Activa el permiso de Fotos para adjuntar imágenes.'
    );
    return null;
  }

  // Calcula cuántas imágenes se pueden agregar todavía
  const remaining = Math.max(1, max - current.length);
  
  // Lanza selector (múltiple si la plataforma lo soporta)
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    selectionLimit: remaining,
    quality: 0.8,
  });

  if (res.canceled) return null;

  // Extrae URIs de los assets seleccionados
  const newUris = (res.assets ?? [])
    .map(a => a.uri)
    .filter(Boolean) as string[];
  
  // Dedup por URI y respeta límite máximo
  const merged = Array.from(new Set([...current, ...newUris])).slice(0, max);
  
  return merged;
}
