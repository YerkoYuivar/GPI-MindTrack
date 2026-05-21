/**
 * @module types/recommend
 * @description Tipos para el sistema de recomendaciones personalizadas
 */

export type RecType = 'meditation' | 'breathing' | 'journaling' | 'tip' | 'movement';

/**
 * Acción recomendada (CTA en la UI)
 */
export type RecommendationAction = {
  label: string;
  href?: string; // URL externa
  screen?: string; // Pantalla de navegación
  params?: Record<string, any>; // Parámetros de navegación
};

/**
 * Recomendación personalizada
 */
export type Recommendation = {
  id: string; // e.g. 'meditation:box-breathing'
  type: RecType;
  title: string; // "Respiración en caja (4-4-4-4)"
  summary: string; // Descripción breve: 1–2 líneas
  actions: RecommendationAction[]; // CTAs
  score: number; // 0..1 (para ranking)
  tags?: string[]; // Tópicos a los que responde
  createdAt: FirebaseFirestore.FieldValue | Date;
};

/**
 * Input para generar recomendaciones
 */
export type GetRecommendationsInput = {
  userId?: string; // Permitido en emulador para testing
  limit?: number; // Default 6, max 10
  horizonDays?: number; // Default 14 (ventana para señales)
};

/**
 * Señales recolectadas del usuario para generar recomendaciones
 */
export type Signals = {
  avgMood7: number | null; // Promedio de mood últimos 7 días
  avgSent14: number | null; // Promedio de sentiment últimos 14 días
  trendMood: 'up' | 'down' | 'flat' | null; // Tendencia de mood
  trendSent: 'up' | 'down' | 'flat' | null; // Tendencia de sentiment
  topTopics: string[]; // 3–8 topics más frecuentes
  topPhrases: string[]; // 3–8 frases más frecuentes
  lowActivity: boolean; // Sin entradas en últimos 3 días
};
