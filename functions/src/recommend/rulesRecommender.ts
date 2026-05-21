/**
 * @module recommend/rulesRecommender
 * @description Proveedor de recomendaciones basado en reglas determinísticas
 */

import * as admin from 'firebase-admin';
import {Recommender} from './base';
import {collectSignals} from './sources';
import {
  Recommendation,
  GetRecommendationsInput,
  RecType,
} from '../types/recommend';

/**
 * Catálogo de recomendaciones hardcodeadas
 */
const CATALOG: Record<
  string,
  Omit<Recommendation, 'id' | 'score' | 'createdAt'>
> = {
  'meditation:body-scan-5': {
    type: 'meditation',
    title: 'Escaneo corporal (5 min)',
    summary: 'Recorre tu cuerpo con atención amable y sin juicio.',
    actions: [
      {
        label: 'Empezar ahora',
        screen: 'MeditationPlayer',
        params: {id: 'body-scan-5'},
      },
    ],
    tags: ['calma', 'atencion'],
  },
  'breathing:box-4444': {
    type: 'breathing',
    title: 'Respiración en caja 4-4-4-4',
    summary: 'Inhala 4s, retén 4s, exhala 4s, retén 4s. 4 ciclos.',
    actions: [
      {
        label: 'Guía rápida',
        screen: 'BreathingGuide',
        params: {pattern: 'box'},
      },
    ],
    tags: ['ansiedad', 'estres'],
  },
  'breathing:478': {
    type: 'breathing',
    title: 'Respiración 4-7-8',
    summary: 'Inhala 4s, retén 7s, exhala 8s. Repite 4 veces.',
    actions: [
      {
        label: 'Guía rápida',
        screen: 'BreathingGuide',
        params: {pattern: '478'},
      },
    ],
    tags: ['sueño', 'estres'],
  },
  'journaling:abc': {
    type: 'journaling',
    title: 'ABC: Activador-Belief-Consequence',
    summary: 'Describe el activador, tus creencias y consecuencias.',
    actions: [
      {
        label: 'Abrir plantilla',
        screen: 'JournalEditor',
        params: {template: 'abc'},
      },
    ],
    tags: ['reestructuracion', 'pensamientos'],
  },
  'journaling:3-good-things': {
    type: 'journaling',
    title: '3 cosas que salieron bien',
    summary: 'Anota tres cosas positivas de tu día.',
    actions: [
      {
        label: 'Abrir plantilla',
        screen: 'JournalEditor',
        params: {template: '3good'},
      },
    ],
    tags: ['gratitud', 'positivo'],
  },
  'journaling:quick-checkin': {
    type: 'journaling',
    title: 'Check-in rápido (3 líneas)',
    summary: '¿Cómo estás? ¿Qué necesitas ahora? ¿Un paso pequeño?',
    actions: [
      {
        label: 'Abrir plantilla',
        screen: 'JournalEditor',
        params: {template: 'checkin'},
      },
    ],
    tags: ['rapido', 'habito'],
  },
  'movement:walk-10': {
    type: 'movement',
    title: 'Caminata consciente (10 min)',
    summary: 'Camina observando respiración y paso.',
    actions: [{label: 'Empezar ahora'}],
    tags: ['energia', 'mindfulness'],
  },
  'movement:stretch-5': {
    type: 'movement',
    title: 'Estiramiento suave (5 min)',
    summary: 'Estira cuello, hombros y espalda con suavidad.',
    actions: [{label: 'Empezar ahora'}],
    tags: ['energia', 'higiene'],
  },
  'tip:micro-break': {
    type: 'tip',
    title: 'Micro-pausa 2 min',
    summary: 'Detente, mira lejos, respira y estira cuello/hombros.',
    actions: [{label: 'Ok'}],
    tags: ['higiene', 'laboral'],
  },
  'tip:timeboxing': {
    type: 'tip',
    title: 'Timeboxing 25/5',
    summary: 'Enfoque 25 min + 5 min descanso. 4 ciclos.',
    actions: [{label: 'Ver cómo hacerlo'}],
    tags: ['productividad', 'estres'],
  },
};

/**
 * Score base por tipo de recomendación
 */
const BASE_SCORES: Record<RecType, number> = {
  breathing: 0.8,
  meditation: 0.75,
  journaling: 0.7,
  movement: 0.65,
  tip: 0.6,
};

/**
 * Verifica si un array de topics/phrases contiene alguna palabra clave
 */
function containsKeywords(items: string[], keywords: string[]): boolean {
  const lower = items.map((s) => s.toLowerCase());
  return keywords.some((kw) =>
    lower.some((item) => item.includes(kw.toLowerCase()))
  );
}

/**
 * Proveedor de recomendaciones basado en reglas
 */
export class RulesRecommender implements Recommender {
  async recommend(input: GetRecommendationsInput): Promise<Recommendation[]> {
    const {userId, limit = 6, horizonDays = 14} = input;

    if (!userId) {
      throw new Error('userId is required');
    }

    // 1. Recolectar señales
    const signals = await collectSignals(userId, horizonDays);

    // 2. Construir candidatos desde CATALOG aplicando reglas
    const candidates: Array<{id: string; score: number}> = [];

    // Regla 1: Mood bajo o sentiment negativo → priorizar breathing, meditation, journaling ABC
    if (
      (signals.avgMood7 !== null && signals.avgMood7 <= 3.0) ||
      (signals.avgSent14 !== null && signals.avgSent14 < -0.2)
    ) {
      candidates.push({id: 'breathing:box-4444', score: BASE_SCORES.breathing + 0.1});
      candidates.push({id: 'meditation:body-scan-5', score: BASE_SCORES.meditation + 0.1});
      candidates.push({id: 'journaling:abc', score: BASE_SCORES.journaling + 0.1});
    }

    // Regla 2: Tendencia a la baja → añadir movement, tip
    if (signals.trendMood === 'down' || signals.trendSent === 'down') {
      candidates.push({id: 'movement:walk-10', score: BASE_SCORES.movement + 0.1});
      candidates.push({id: 'tip:micro-break', score: BASE_SCORES.tip + 0.1});
    }

    // Regla 3: Baja actividad → promover journaling rápido
    if (signals.lowActivity) {
      candidates.push({id: 'journaling:quick-checkin', score: BASE_SCORES.journaling + 0.15});
    }

    // Regla 4: Topics/frases de estrés/ansiedad → breathing 4-7-8, tip timeboxing
    const stressKeywords = ['ansiedad', 'estrés', 'trabajo', 'plazo', 'presión'];
    if (
      containsKeywords(signals.topTopics, stressKeywords) ||
      containsKeywords(signals.topPhrases, stressKeywords)
    ) {
      candidates.push({id: 'breathing:478', score: BASE_SCORES.breathing + 0.1});
      candidates.push({id: 'tip:timeboxing', score: BASE_SCORES.tip + 0.1});
    }

    // Regla 5: Topics/frases positivos (gratitud, logro) → journaling 3 cosas buenas, stretch
    const positiveKeywords = ['gracias', 'agradecido', 'logré', 'amigos', 'feliz'];
    if (
      containsKeywords(signals.topTopics, positiveKeywords) ||
      containsKeywords(signals.topPhrases, positiveKeywords)
    ) {
      candidates.push({id: 'journaling:3-good-things', score: BASE_SCORES.journaling + 0.1});
      candidates.push({id: 'movement:stretch-5', score: BASE_SCORES.movement + 0.05});
    }

    // Regla fallback: si no hay candidatos, agregar algunos básicos
    if (candidates.length === 0) {
      candidates.push({id: 'breathing:box-4444', score: BASE_SCORES.breathing});
      candidates.push({id: 'journaling:quick-checkin', score: BASE_SCORES.journaling});
      candidates.push({id: 'movement:walk-10', score: BASE_SCORES.movement});
    }

    // 3. Deduplicar candidatos (tomar el de mayor score si se repite)
    const uniqueMap = new Map<string, number>();
    candidates.forEach((c) => {
      const existing = uniqueMap.get(c.id);
      if (!existing || c.score > existing) {
        uniqueMap.set(c.id, c.score);
      }
    });

    // 4. Ordenar por score desc y truncar a limit
    const sorted = Array.from(uniqueMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.min(limit, 10)); // max 10

    // 5. Construir recomendaciones completas
    const recommendations: Recommendation[] = sorted.map(([id, score]) => {
      const template = CATALOG[id];
      if (!template) {
        throw new Error(`Recommendation template not found: ${id}`);
      }

      return {
        id,
        ...template,
        score,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
    });

    return recommendations;
  }
}
