/**
 * @module analyzers/mockAnalyzer
 * @description Implementación mock del analizador de IA con heurísticas determinísticas
 * 
 * Este analizador NO requiere APIs externas y genera resultados coherentes
 * basándose en análisis simple de texto:
 * - Sentimiento: cuenta palabras positivas/negativas
 * - Topics: extrae palabras más frecuentes
 * - KeyPhrases: identifica términos relevantes
 * - Grafo: conecta topics co-ocurrentes
 */

import {Analyzer} from './base';
import {JournalEntry} from '../types/journal';
import {EntryInsights, GraphNode, GraphEdge, Topic} from '../types/insights';
import {buildQuality} from '../quality/validator';
import * as admin from 'firebase-admin';

// Palabras positivas en español
const POSITIVE_WORDS = [
  'gracias', 'feliz', 'contento', 'bien', 'logré', 'amé', 'calma',
  'orgullo', 'alegre', 'amor', 'éxito', 'satisfecho', 'genial',
  'hermoso', 'increíble', 'perfecto', 'maravilloso', 'excelente',
  'paz', 'tranquilo', 'esperanza', 'motivado', 'agradecido',
];

// Palabras negativas en español
const NEGATIVE_WORDS = [
  'triste', 'ansioso', 'miedo', 'enojo', 'mal', 'frustrado', 'culpa',
  'fallé', 'dolor', 'preocupado', 'estresado', 'deprimido',
  'desesperado', 'terrible', 'horrible', 'odio', 'furioso',
  'nervioso', 'angustia', 'solo', 'vacío', 'perdido',
];

// Stopwords en español (palabras comunes a ignorar)
const STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'de', 'del', 'y', 'o', 'a', 'en', 'un', 'una',
  'que', 'con', 'por', 'para', 'mi', 'me', 'es', 'no', 'si', 'su', 'al',
  'lo', 'le', 'se', 'está', 'están', 'fue', 'ser', 'ha', 'he', 'muy',
  'pero', 'como', 'más', 'también', 'solo', 'ya', 'todo', 'todos',
  'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas',
  'otro', 'otra', 'otros', 'otras', 'cuando', 'donde', 'quien',
  'cual', 'cuales', 'aunque', 'porque', 'desde', 'hasta', 'sin',
]);

const now = () => admin.firestore.FieldValue.serverTimestamp();

/**
 * Mock Analyzer - Implementación determinística sin APIs externas
 */
export class MockAnalyzer implements Analyzer {
  /**
   * Analiza una entrada del diario
   */
  async analyzeEntry(entry: JournalEntry): Promise<{
    insights: EntryInsights;
    nodes: GraphNode[];
    edges: GraphEdge[];
  }> {
    const t0 = Date.now();

    try {
      // 1. Preparar texto
      const text = `${entry.title ?? ''} ${entry.content}`.toLowerCase();

      // 2. Calcular sentimiento
      const sentiment = this.calculateSentiment(text);

      // 3. Extraer topics
      const topics = this.extractTopics(text);

      // 4. Extraer key phrases
      const keyPhrases = topics.slice(0, 5).map((t) => t.key);

      // 5. Crear nodos del grafo
      const nodes: GraphNode[] = topics.map((t) => ({
        id: `topic:${t.key}`,
        label: t.key,
        type: 'topic',
        weight: t.weight,
        updatedAt: now(),
      }));

      // 6. Crear aristas del grafo (conectar topics co-ocurrentes)
      const edges: GraphEdge[] = [];
      for (let i = 0; i < topics.length; i++) {
        for (let j = i + 1; j < topics.length; j++) {
          const a = topics[i];
          const b = topics[j];
          edges.push({
            id: `e:${a.key}~${b.key}`,
            source: `topic:${a.key}`,
            target: `topic:${b.key}`,
            weight: 1,
            updatedAt: now(),
          });
        }
      }

      // 7. Calcular métricas de calidad
      const dt = Date.now() - t0;
      // Heurística simple: confianza basada en número de topics
      const confidence = Math.max(0, Math.min(1, 0.5 + (topics.length ?? 0) * 0.1));
      const quality = buildQuality({sentiment, topics, keyPhrases}, confidence, dt);

      // 8. Crear insights
      const insights: EntryInsights = {
        entryId: entry.id,
        sentiment,
        topics,
        keyPhrases,
        quality,
        updatedAt: now(),
      };

      return {insights, nodes, edges};
    } catch (error: any) {
      // En caso de error, crear insights mínimos con quality FAIL
      const dt = Date.now() - t0;
      const quality = buildQuality({}, 0, dt, error?.message || 'Error desconocido');

      const insights: EntryInsights = {
        entryId: entry.id,
        sentiment: {score: 0, label: 'neu'},
        topics: [],
        keyPhrases: [],
        quality,
        updatedAt: now(),
      };

      return {insights, nodes: [], edges: []};
    }
  }

  /**
   * Calcula el sentimiento basándose en palabras positivas/negativas
   */
  private calculateSentiment(text: string): {score: number; label: 'neg' | 'neu' | 'pos'} {
    const posCount = POSITIVE_WORDS.filter((w) => text.includes(w)).length;
    const negCount = NEGATIVE_WORDS.filter((w) => text.includes(w)).length;

    // Score: diferencia normalizada (-1 a 1)
    const rawScore = posCount - negCount;
    const score = Math.max(-1, Math.min(1, rawScore / 3));

    // Label: clasificación
    const label = score > 0.2 ? 'pos' : score < -0.2 ? 'neg' : 'neu';

    return {score, label};
  }

  /**
   * Extrae topics (palabras más frecuentes) del texto
   */
  private extractTopics(text: string): Topic[] {
    // 1. Normalizar texto (quitar acentos)
    const normalized = text
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');

    // 2. Tokenizar (dividir en palabras)
    const tokens = normalized
      .split(/[^a-záéíóúñü0-9]+/i)
      .filter((t) => t.length > 2 && !STOPWORDS.has(t))
      .slice(0, 200); // Limitar a 200 tokens

    // 3. Contar frecuencias
    const freq = new Map<string, number>();
    tokens.forEach((t) => freq.set(t, (freq.get(t) ?? 0) + 1));

    // 4. Ordenar por frecuencia y tomar top 5
    const topics = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, count]) => ({
        key,
        weight: Math.min(1, count / 5), // Normalizar peso
      }));

    return topics;
  }
}
