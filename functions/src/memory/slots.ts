/**
 * Sistema de slots de perfil del usuario
 * Detecta y actualiza patrones: triggers, prácticas útiles, preferencias
 */

import { db } from '../services/firestore';
import admin from 'firebase-admin';
import type { ProfileSlots } from './types';

/**
 * Detecta triggers/desencadenantes mencionados en el texto
 * Busca patrones como "me gatilla X", "me dispara X", "me estresa X"
 * 
 * @param text - Texto a analizar
 * @returns Array de triggers detectados
 */
export function detectTriggers(text: string): string[] {
  const lower = text.toLowerCase();
  const triggers: string[] = [];

  // Patrones comunes
  const patterns = [
    /me\s+(?:gatilla|dispara|estresa|angustia|preocupa)\s+(?:cuando\s+)?([^.,!?]{5,50})/gi,
    /(?:cuando|si)\s+([^.,!?]{5,50})\s+me\s+(?:estresa|angustia|preocupa)/gi,
  ];

  patterns.forEach(regex => {
    const matches = Array.from(lower.matchAll(regex));
    matches.forEach(match => {
      const trigger = match[1]?.trim();
      if (trigger && trigger.length > 3) {
        triggers.push(trigger);
      }
    });
  });

  // Triggers comunes específicos
  const commonTriggers = [
    'plazos', 'fechas límite', 'reuniones', 'trabajo', 'conflictos',
    'soledad', 'rechazo', 'críticas', 'incertidumbre', 'cambios',
    'multitudes', 'ruido', 'espacios cerrados', 'hablar en público'
  ];

  commonTriggers.forEach(ct => {
    if (lower.includes(ct)) {
      triggers.push(ct);
    }
  });

  return Array.from(new Set(triggers));
}

/**
 * Detecta prácticas útiles mencionadas en el texto
 * Busca patrones como "me ayuda X", "me resultó X", "me sirvió X"
 * 
 * @param text - Texto a analizar
 * @returns Array de prácticas útiles detectadas
 */
export function detectHelpful(text: string): string[] {
  const lower = text.toLowerCase();
  const helpful: string[] = [];

  // Patrones de prácticas útiles
  const patterns = [
    /me\s+(?:ayuda|ayudó|sirve|sirvió|resultó|funciona|funcionó)\s+(?:la\s+|el\s+)?([^.,!?]{5,50})/gi,
    /([^.,!?]{5,50})\s+me\s+(?:ayuda|ayudó|sirve|sirvió|resultó)/gi,
  ];

  patterns.forEach(regex => {
    const matches = Array.from(lower.matchAll(regex));
    matches.forEach(match => {
      const practice = match[1]?.trim();
      if (practice && practice.length > 3) {
        helpful.push(practice);
      }
    });
  });

  // Prácticas comunes específicas
  const commonPractices = [
    'respiración 4-7-8', 'respiración profunda', 'caminata', 'caminata consciente',
    'meditación', 'yoga', 'ejercicio', 'ducha fría', 'música', 'escribir',
    'hablar con alguien', 'journaling', 'mindfulness', 'descanso',
    'técnica 5-4-3-2-1', 'progressive muscle relaxation'
  ];

  commonPractices.forEach(cp => {
    if (lower.includes(cp)) {
      helpful.push(cp);
    }
  });

  return Array.from(new Set(helpful));
}

/**
 * Detecta horario preferido para check-in
 * Busca patrones de tiempo como "21:00", "en la noche", "por la mañana"
 * 
 * @param text - Texto a analizar
 * @returns Horario en formato "HH:MM" o undefined
 */
export function detectCheckInTime(text: string): string | undefined {
  const lower = text.toLowerCase();

  // Buscar formato HH:MM explícito
  const timeMatch = lower.match(/\b([0-2]?\d):([0-5]\d)\b/);
  if (timeMatch) {
    const hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2];
    if (hour >= 0 && hour < 24) {
      return `${String(hour).padStart(2, '0')}:${minute}`;
    }
  }

  // Detectar momentos del día
  if (/(en\s+la\s+)?noche|nocturno|antes\s+de\s+dormir/.test(lower)) {
    return '21:00';
  }
  if (/(en\s+la\s+)?ma[ñn]ana|matutino|al\s+despertar/.test(lower)) {
    return '08:00';
  }
  if (/(en\s+la\s+)?tarde/.test(lower)) {
    return '17:00';
  }
  if (/(al\s+)?mediod[ií]a/.test(lower)) {
    return '12:00';
  }

  return undefined;
}

/**
 * Detecta tono preferido del usuario
 * Busca patrones como "prefiero que seas directo", "háblame suave"
 * 
 * @param text - Texto a analizar
 * @returns Tono preferido o undefined
 */
export function detectPreferredTone(
  text: string
): 'directo' | 'suave' | 'neutro' | undefined {
  const lower = text.toLowerCase();

  if (/directo|claro|sin\s+rodeos|franco/.test(lower)) {
    return 'directo';
  }
  if (/suave|delicado|amable|emp[aá]tico/.test(lower)) {
    return 'suave';
  }
  if (/neutro|objetivo|imparcial/.test(lower)) {
    return 'neutro';
  }

  return undefined;
}

/**
 * Actualiza los slots del perfil a partir del texto de un turno
 * (combinación de mensaje de usuario + respuesta de asistente)
 * 
 * @param uid - User ID
 * @param text - Texto completo del turno (user + assistant)
 */
export async function updateSlotsFromTurn(
  uid: string,
  text: string
): Promise<void> {
  const ref = db.doc(`journals/${uid}/memory/profile`);
  const snap = await ref.get();
  const cur = snap.exists ? (snap.data() as Partial<ProfileSlots>) : {};

  // Detectar nuevos elementos
  const newTriggers = detectTriggers(text);
  const newHelpful = detectHelpful(text);
  const newTime = detectCheckInTime(text);
  const newTone = detectPreferredTone(text);

  // Función helper para deduplicar y limitar arrays
  const uniq = (arr: string[]) => Array.from(new Set(arr)).slice(0, 20);

  // Merge con límites
  const updated: Partial<ProfileSlots> = {
    triggers: uniq([...(cur.triggers ?? []), ...newTriggers]),
    helpfulPractices: uniq([...(cur.helpfulPractices ?? []), ...newHelpful]),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Solo actualizar si hay cambios
  if (newTime) {
    updated.checkInTime = newTime;
  }
  if (newTone) {
    updated.preferredTone = newTone;
  }

  await ref.set(updated, { merge: true });
}
