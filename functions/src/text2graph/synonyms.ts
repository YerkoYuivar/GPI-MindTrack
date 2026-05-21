/**
 * @module text2graph/synonyms
 * @description Diccionarios y listas para normalización semántica en español
 */

import { normalizeTerm } from './normalize';

/**
 * Stopwords comunes en español (lista expandida)
 */
export const STOPWORDS = new Set([
  // Artículos
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  // Pronombres
  'yo', 'tu', 'mi', 'me', 'te', 'se', 'le', 'lo', 'les', 'nos', 'os',
  'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas',
  'aquel', 'aquella', 'aquellos', 'aquellas',
  // Preposiciones
  'a', 'de', 'en', 'por', 'para', 'con', 'sin', 'sobre', 'bajo', 'entre',
  'desde', 'hasta', 'hacia', 'tras', 'durante', 'mediante',
  // Conjunciones
  'y', 'e', 'o', 'u', 'ni', 'pero', 'mas', 'sino', 'aunque', 'porque',
  'como', 'cuando', 'donde', 'si', 'que',
  // Verbos auxiliares comunes
  'ser', 'estar', 'haber', 'tener', 'hacer', 'ir', 'poder', 'dar',
  'es', 'esta', 'estoy', 'hay', 'tengo', 'hace', 'voy', 'puedo',
  'fue', 'era', 'sido', 'estado', 'tenido', 'hecho', 'ido',
  // Adverbios comunes
  'muy', 'mas', 'menos', 'tan', 'tanto', 'poco', 'mucho', 'bien', 'mal',
  'asi', 'tambien', 'tampoco', 'siempre', 'nunca', 'ya', 'aun',
  // Otros
  'del', 'al', 'no', 'si', 'mas', 'menos', 'todo', 'nada', 'algo', 'alguien', 'nadie',
]);

/**
 * Topics demasiado genéricos para incluir en el grafo
 */
export const STOP_TOPICS = new Set([
  'cosa', 'cosas', 'gente', 'persona', 'personas', 'vez', 'veces',
  'momento', 'momentos', 'tiempo', 'tiempos', 'forma', 'formas',
  'parte', 'partes', 'lado', 'lados', 'manera', 'maneras',
  'dia', 'dias', 'mes', 'meses', 'ano', 'anos', 'semana', 'semanas',
  'lugar', 'lugares', 'hoy', 'ayer', 'manana',
]);

/**
 * Lexicon de emociones → label canónico
 * Mapea variaciones a una emoción canónica
 */
export const EMOTIONS: Record<string, string> = {
  // Tristeza
  'triste': 'tristeza',
  'tristes': 'tristeza',
  'tristeza': 'tristeza',
  'melancolico': 'tristeza',
  'melancolica': 'tristeza',
  'deprimido': 'tristeza',
  'deprimida': 'tristeza',
  'depresion': 'tristeza',
  'abatido': 'tristeza',
  'abatida': 'tristeza',
  
  // Ansiedad
  'ansioso': 'ansiedad',
  'ansiosa': 'ansiedad',
  'ansiedad': 'ansiedad',
  'nervioso': 'ansiedad',
  'nerviosa': 'ansiedad',
  'nervios': 'ansiedad',
  'preocupado': 'ansiedad',
  'preocupada': 'ansiedad',
  'preocupacion': 'ansiedad',
  'inquieto': 'ansiedad',
  'inquieta': 'ansiedad',
  
  // Estrés
  'estres': 'estres',
  'estresado': 'estres',
  'estresada': 'estres',
  'agobiado': 'estres',
  'agobiada': 'estres',
  'abrumado': 'estres',
  'abrumada': 'estres',
  'sobrecargado': 'estres',
  'sobrecargada': 'estres',
  
  // Enojo
  'enojo': 'enojo',
  'enojado': 'enojo',
  'enojada': 'enojo',
  'enojarse': 'enojo',
  'ira': 'enojo',
  'rabia': 'enojo',
  'furioso': 'enojo',
  'furiosa': 'enojo',
  'molesto': 'enojo',
  'molesta': 'enojo',
  'irritado': 'enojo',
  'irritada': 'enojo',
  
  // Miedo
  'miedo': 'miedo',
  'miedoso': 'miedo',
  'miedosa': 'miedo',
  'asustado': 'miedo',
  'asustada': 'miedo',
  'temeroso': 'miedo',
  'temerosa': 'miedo',
  'panico': 'miedo',
  'terror': 'miedo',
  
  // Alegría
  'feliz': 'alegria',
  'felices': 'alegria',
  'felicidad': 'alegria',
  'alegre': 'alegria',
  'alegres': 'alegria',
  'alegria': 'alegria',
  'contento': 'alegria',
  'contenta': 'alegria',
  'contentos': 'alegria',
  'contentas': 'alegria',
  'dichoso': 'alegria',
  'dichosa': 'alegria',
  'gozoso': 'alegria',
  'gozosa': 'alegria',
  
  // Gratitud
  'gracias': 'gratitud',
  'agradecido': 'gratitud',
  'agradecida': 'gratitud',
  'agradecidos': 'gratitud',
  'agradecidas': 'gratitud',
  'gratitud': 'gratitud',
  'reconocido': 'gratitud',
  'reconocida': 'gratitud',
  
  // Orgullo
  'orgulloso': 'orgullo',
  'orgullosa': 'orgullo',
  'orgullo': 'orgullo',
  'satisfecho': 'orgullo',
  'satisfecha': 'orgullo',
  'logro': 'orgullo',
  'logre': 'orgullo',
  
  // Calma
  'calmado': 'calma',
  'calmada': 'calma',
  'calma': 'calma',
  'tranquilo': 'calma',
  'tranquila': 'calma',
  'tranquilidad': 'calma',
  'relajado': 'calma',
  'relajada': 'calma',
  'paz': 'calma',
  'sereno': 'calma',
  'serena': 'calma',
  'serenidad': 'calma',
};

/**
 * Mapa de sinónimos y aliases → término canónico
 * Agrupa variaciones bajo un mismo concepto
 */
export const SYNONYM_MAP: Record<string, string> = {
  // Trabajo/laboral
  'trabajo': 'laboral',
  'trabajar': 'laboral',
  'trabajando': 'laboral',
  'trabajos': 'laboral',
  'oficina': 'laboral',
  'empresa': 'laboral',
  'jefe': 'laboral',
  'jefa': 'laboral',
  'compañero': 'laboral',
  'compañera': 'laboral',
  'reunion': 'laboral',
  'reuniones': 'laboral',
  'proyecto': 'laboral',
  'proyectos': 'laboral',
  
  // Familia
  'familia': 'familia',
  'familiar': 'familia',
  'familiares': 'familia',
  'padre': 'familia',
  'madre': 'familia',
  'padres': 'familia',
  'hijo': 'familia',
  'hija': 'familia',
  'hijos': 'familia',
  'hermano': 'familia',
  'hermana': 'familia',
  'hermanos': 'familia',
  
  // Amistad
  'amigo': 'amistad',
  'amiga': 'amistad',
  'amigos': 'amistad',
  'amigas': 'amistad',
  'amistad': 'amistad',
  'amistades': 'amistad',
  
  // Pareja/relación
  'pareja': 'relacion',
  'novio': 'relacion',
  'novia': 'relacion',
  'esposo': 'relacion',
  'esposa': 'relacion',
  'matrimonio': 'relacion',
  'relacion': 'relacion',
  'relaciones': 'relacion',
  
  // Salud
  'salud': 'salud',
  'saludable': 'salud',
  'enfermo': 'salud',
  'enferma': 'salud',
  'enfermedad': 'salud',
  'doctor': 'salud',
  'doctora': 'salud',
  'medico': 'salud',
  'medica': 'salud',
  'hospital': 'salud',
  
  // Ejercicio/deporte
  'ejercicio': 'ejercicio',
  'ejercicios': 'ejercicio',
  'deporte': 'ejercicio',
  'deportes': 'ejercicio',
  'entrenar': 'ejercicio',
  'entrenamiento': 'ejercicio',
  'gimnasio': 'ejercicio',
  'correr': 'ejercicio',
  'caminar': 'ejercicio',
  'caminata': 'ejercicio',
  
  // Sueño/descanso
  'sueno': 'descanso',
  'dormir': 'descanso',
  'durmiendo': 'descanso',
  'dormido': 'descanso',
  'dormida': 'descanso',
  'descanso': 'descanso',
  'descansar': 'descanso',
  'cansancio': 'descanso',
  'cansado': 'descanso',
  'cansada': 'descanso',
  'agotado': 'descanso',
  'agotada': 'descanso',
  'agotamiento': 'descanso',
  
  // Dinero/finanzas
  'dinero': 'financiero',
  'plata': 'financiero',
  'finanzas': 'financiero',
  'financiero': 'financiero',
  'financiera': 'financiero',
  'deuda': 'financiero',
  'deudas': 'financiero',
  'pago': 'financiero',
  'pagos': 'financiero',
  'sueldo': 'financiero',
  'salario': 'financiero',
  
  // Tiempo/plazos
  'tiempo': 'temporal',
  'plazo': 'temporal',
  'plazos': 'temporal',
  'deadline': 'temporal',
  'entrega': 'temporal',
  'entregas': 'temporal',
  'urgente': 'temporal',
  'urgencia': 'temporal',
};

/**
 * Whitelist de frases 2-3 gram útiles
 * Solo estas n-grams se extraerán como phrases
 */
export const PHRASE_WHITELIST = new Set([
  // Problemas comunes
  'falta tiempo',
  'falta de tiempo',
  'falta sueno',
  'falta de sueno',
  'problema sueno',
  'problemas sueno',
  'problema de sueno',
  'problemas de sueno',
  'plazo entrega',
  'plazo de entrega',
  'plazos entrega',
  'problema trabajo',
  'problemas trabajo',
  'problema de trabajo',
  'problemas de trabajo',
  'falta energia',
  'falta de energia',
  'baja autoestima',
  'falta confianza',
  'falta de confianza',
  
  // Actividades positivas
  'caminata consciente',
  'meditacion guiada',
  'ejercicio respiracion',
  'ejercicios respiracion',
  'ejercicio de respiracion',
  'ejercicios de respiracion',
  'tiempo calidad',
  'tiempo de calidad',
  'momento paz',
  'momento de paz',
  'momentos paz',
  'momentos de paz',
  'actividad fisica',
  'actividades fisicas',
  
  // Técnicas
  'respiracion profunda',
  'respiracion profundas',
  'atencion plena',
  'mindfulness',
  'escribir diario',
  'escribir en diario',
  'escribir journal',
  'escribir en journal',
]);

/**
 * Convierte un término alias a su forma canónica
 * Aplica normalización + stemming + sinónimos
 * 
 * @example aliasToCanonical('trabajando') => 'laboral'
 * @example aliasToCanonical('amigos') => 'amistad'
 */
export function aliasToCanonical(term: string): string {
  const normalized = normalizeTerm(term);
  
  // Buscar en mapa de sinónimos
  if (SYNONYM_MAP[normalized]) {
    return SYNONYM_MAP[normalized];
  }
  
  return normalized;
}

/**
 * Verifica si un término es stopword o stop-topic
 * 
 * @example isStopToken('de') => true
 * @example isStopToken('cosa') => true
 * @example isStopToken('trabajo') => false
 */
export function isStopToken(term: string): boolean {
  const normalized = normalizeTerm(term);
  return STOPWORDS.has(normalized) || STOP_TOPICS.has(normalized);
}

/**
 * Detecta si un término es una emoción y devuelve su label canónico
 * 
 * @example maybeEmotion('ansioso') => 'ansiedad'
 * @example maybeEmotion('feliz') => 'alegria'
 * @example maybeEmotion('trabajo') => null
 */
export function maybeEmotion(term: string): string | null {
  const normalized = normalizeTerm(term);
  return EMOTIONS[normalized] || null;
}

/**
 * Verifica si una frase (2-3 gram) está en el whitelist
 * 
 * @example isValidPhrase('falta de tiempo') => true
 * @example isValidPhrase('el de la') => false
 */
export function isValidPhrase(phrase: string): boolean {
  const normalized = normalizeTerm(phrase);
  return PHRASE_WHITELIST.has(normalized);
}
