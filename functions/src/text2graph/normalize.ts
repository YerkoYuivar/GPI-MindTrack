/**
 * @module text2graph/normalize
 * @description Normalización de texto en español para extracción de términos
 */

/**
 * Mapa de diacríticos a caracteres base
 */
const DIACRITICS_MAP: Record<string, string> = {
  'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
  'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
  'ñ': 'n', 'Ñ': 'N',
  'ü': 'u', 'Ü': 'U',
};

/**
 * Elimina diacríticos de una cadena
 * @example stripDiacritics('está') => 'esta'
 */
export function stripDiacritics(s: string): string {
  return s.replace(/[áéíóúÁÉÍÓÚñÑüÜ]/g, (char) => DIACRITICS_MAP[char] || char);
}

/**
 * Convierte a clave canónica: lowercase + sin diacríticos + trim + colapsar espacios
 * @example toCanonicalKey('  ESTÁ  muy  bien  ') => 'esta muy bien'
 */
export function toCanonicalKey(s: string): string {
  return stripDiacritics(s.toLowerCase().trim()).replace(/\s+/g, ' ');
}

/**
 * Aplica stemming heurístico para español
 * Reglas conservadoras para evitar romper palabras cortas
 * 
 * @example stemEsHeuristic('trabajando') => 'trabajar'
 * @example stemEsHeuristic('tristeza') => 'trist'
 * @example stemEsHeuristic('amigos') => 'amigo'
 */
export function stemEsHeuristic(s: string): string {
  // No procesar palabras muy cortas
  if (s.length <= 3) return s;

  let result = s;

  // 1. Plurales: -es, -s
  if (result.endsWith('es') && result.length > 4) {
    result = result.slice(0, -2);
  } else if (result.endsWith('s') && result.length > 3) {
    result = result.slice(0, -1);
  }

  // 2. Gerundios: -ando, -iendo → -ar, -er
  if (result.endsWith('ando') && result.length > 5) {
    result = result.slice(0, -4) + 'ar';
  } else if (result.endsWith('iendo') && result.length > 6) {
    result = result.slice(0, -5) + 'er';
  }

  // 3. Participios: -ado, -ido
  if (result.endsWith('ado') && result.length > 5) {
    result = result.slice(0, -3) + 'ar';
  } else if (result.endsWith('ido') && result.length > 5) {
    result = result.slice(0, -3) + 'ir';
  }

  // 4. Adverbios: -mente
  if (result.endsWith('mente') && result.length > 7) {
    result = result.slice(0, -5);
  }

  // 5. Sufijos comunes de sustantivos: -ción, -sión, -dad, -tad, -ez, -eza
  if (result.endsWith('cion') && result.length > 6) {
    result = result.slice(0, -4);
  } else if (result.endsWith('sion') && result.length > 6) {
    result = result.slice(0, -4);
  } else if (result.endsWith('dad') && result.length > 5) {
    result = result.slice(0, -3);
  } else if (result.endsWith('tad') && result.length > 5) {
    result = result.slice(0, -3);
  } else if (result.endsWith('eza') && result.length > 5) {
    result = result.slice(0, -3);
  } else if (result.endsWith('ez') && result.length > 4) {
    result = result.slice(0, -2);
  }

  // 6. Adjetivos: -oso, -osa, -ivo, -iva
  if (result.endsWith('oso') && result.length > 5) {
    result = result.slice(0, -3);
  } else if (result.endsWith('osa') && result.length > 5) {
    result = result.slice(0, -3);
  } else if (result.endsWith('ivo') && result.length > 5) {
    result = result.slice(0, -3);
  } else if (result.endsWith('iva') && result.length > 5) {
    result = result.slice(0, -3);
  }

  // 7. Diminutivos: -ito, -ita, -illo, -illa
  if (result.endsWith('ito') && result.length > 5) {
    result = result.slice(0, -3);
  } else if (result.endsWith('ita') && result.length > 5) {
    result = result.slice(0, -3);
  } else if (result.endsWith('illo') && result.length > 6) {
    result = result.slice(0, -4);
  } else if (result.endsWith('illa') && result.length > 6) {
    result = result.slice(0, -4);
  }

  return result;
}

/**
 * Normaliza un término aplicando todas las transformaciones
 * @example normalizeTerm('  Trabajando  ') => 'trabajar'
 */
export function normalizeTerm(s: string): string {
  const canonical = toCanonicalKey(s);
  return stemEsHeuristic(canonical);
}
