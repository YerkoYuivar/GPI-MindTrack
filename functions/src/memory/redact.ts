/**
 * Funciones para sanitizar y redactar texto libre
 * Remueve PII y limita longitud para proteger privacidad
 */

/**
 * Redacta texto libre removiendo PII y limitando longitud
 * - Reemplaza emails por [email]
 * - Reemplaza teléfonos por [tel]
 * - Limita a 600 caracteres
 * 
 * @param s - Texto a redactar
 * @returns Texto sanitizado
 */
export function redactFreeText(s: string): string {
  return (s ?? '')
    .replace(/\b[\w._%+-]+@[\w.-]+\.\w{2,}\b/g, '[email]')
    .replace(/\b\+?\d{7,}\b/g, '[tel]')
    .trim()
    .slice(0, 600);
}

/**
 * Stopwords comunes en español para filtrado de términos
 */
export const SPANISH_STOPWORDS = new Set([
  'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no', 'haber',
  'por', 'con', 'su', 'para', 'como', 'estar', 'tener', 'le', 'lo', 'todo',
  'pero', 'más', 'hacer', 'o', 'poder', 'decir', 'este', 'ir', 'otro', 'ese',
  'la', 'si', 'me', 'ya', 'ver', 'porque', 'dar', 'cuando', 'él', 'muy',
  'sin', 'vez', 'mucho', 'saber', 'qué', 'sobre', 'mi', 'alguno', 'mismo',
  'yo', 'también', 'hasta', 'año', 'dos', 'querer', 'entre', 'así', 'primero',
  'desde', 'grande', 'eso', 'ni', 'nos', 'llegar', 'pasar', 'tiempo', 'ella',
  'sí', 'día', 'uno', 'bien', 'poco', 'deber', 'entonces', 'poner', 'cosa',
  'tanto', 'hombre', 'parecer', 'nuestro', 'tan', 'donde', 'ahora', 'parte',
  'después', 'vida', 'quedar', 'siempre', 'creer', 'hablar', 'llevar', 'dejar',
  'nada', 'cada', 'seguir', 'menos', 'nuevo', 'encontrar', 'algo', 'solo',
  'decir', 'puede', 'tengo', 'estoy', 'soy', 'he', 'ha', 'han', 'es', 'son',
  'fue', 'era', 'sea', 'sido', 'están', 'una', 'unos', 'unas', 'los', 'las'
]);
