/**
 * @module analyzers/patternAnalyzer
 * @description Analiza entradas del diario para identificar patrones de alto nivel
 * (emociones, actividades, personas, lugares, temas)
 */

import type { Pattern, GraphEdge } from '../types/graph';

/**
 * Diccionarios de patrones conocidos
 */
const EMOTION_PATTERNS = [
  'ansiedad', 'alegría', 'tristeza', 'miedo', 'enojo', 'frustración',
  'paz', 'estrés', 'calma', 'nervios', 'felicidad', 'melancolía',
  'angustia', 'esperanza', 'gratitud', 'culpa', 'vergüenza', 'orgullo'
];

const ACTIVITY_PATTERNS = [
  'trabajo', 'ejercicio', 'meditación', 'dormir', 'comer', 'estudiar',
  'leer', 'caminar', 'correr', 'yoga', 'terapia', 'reunión', 'familia',
  'amigos', 'deporte', 'cocinar', 'música', 'arte', 'escribir'
];

const TRIGGER_PATTERNS = [
  'deadline', 'examen', 'conflicto', 'decisión', 'cambio', 'pérdida',
  'fracaso', 'éxito', 'rechazo', 'crítica', 'presión', 'soledad'
];

interface JournalEntry {
  id: string;
  content: string;
  mood: number;
  createdAt: Date;
}

interface PatternMatch {
  pattern: string;
  type: 'emotion' | 'activity' | 'trigger' | 'topic';
  entryId: string;
  position: number; // Posición en el texto
  context: string; // Fragmento de contexto
}

/**
 * Extrae coincidencias de patrones desde una entrada
 */
function extractPatternMatches(entry: JournalEntry): PatternMatch[] {
  const content = entry.content.toLowerCase();
  const matches: PatternMatch[] = [];

  // Buscar emociones
  for (const emotion of EMOTION_PATTERNS) {
    const index = content.indexOf(emotion);
    if (index !== -1) {
      matches.push({
        pattern: emotion,
        type: 'emotion',
        entryId: entry.id,
        position: index,
        context: extractContext(content, index, emotion.length),
      });
    }
  }

  // Buscar actividades
  for (const activity of ACTIVITY_PATTERNS) {
    const index = content.indexOf(activity);
    if (index !== -1) {
      matches.push({
        pattern: activity,
        type: 'activity',
        entryId: entry.id,
        position: index,
        context: extractContext(content, index, activity.length),
      });
    }
  }

  // Buscar triggers
  for (const trigger of TRIGGER_PATTERNS) {
    const index = content.indexOf(trigger);
    if (index !== -1) {
      matches.push({
        pattern: trigger,
        type: 'trigger',
        entryId: entry.id,
        position: index,
        context: extractContext(content, index, trigger.length),
      });
    }
  }

  return matches;
}

/**
 * Extrae contexto alrededor de una coincidencia
 */
function extractContext(text: string, position: number, length: number): string {
  const contextLength = 50;
  const start = Math.max(0, position - contextLength);
  const end = Math.min(text.length, position + length + contextLength);
  return text.substring(start, end).trim();
}

/**
 * Agrupa coincidencias en patrones
 */
function aggregatePatterns(matches: PatternMatch[], entries: JournalEntry[]): Pattern[] {
  const patternMap = new Map<string, {
    count: number;
    type: PatternMatch['type'];
    entries: Set<string>;
    firstSeen: Date;
    lastSeen: Date;
    totalMood: number;
  }>();

  // Agrupar por patrón
  for (const match of matches) {
    const entry = entries.find(e => e.id === match.entryId);
    if (!entry) continue;

    if (!patternMap.has(match.pattern)) {
      patternMap.set(match.pattern, {
        count: 0,
        type: match.type,
        entries: new Set(),
        firstSeen: entry.createdAt,
        lastSeen: entry.createdAt,
        totalMood: 0,
      });
    }

    const data = patternMap.get(match.pattern)!;
    data.count++;
    data.entries.add(match.entryId);
    data.totalMood += entry.mood;
    
    if (entry.createdAt < data.firstSeen) data.firstSeen = entry.createdAt;
    if (entry.createdAt > data.lastSeen) data.lastSeen = entry.createdAt;
  }

  // Convertir a Pattern[]
  const patterns: Pattern[] = [];
  let index = 0;

  for (const [label, data] of patternMap.entries()) {
    const avgMood = data.totalMood / data.count;
    
    // Calcular importancia basada en frecuencia y recencia
    const daysSinceFirst = (Date.now() - data.firstSeen.getTime()) / (1000 * 60 * 60 * 24);
    const recencyFactor = Math.max(0.1, 1 - daysSinceFirst / 365);
    const importance = Math.min(1, (data.count / entries.length) * recencyFactor);

    patterns.push({
      id: `pattern_${index++}`,
      label,
      type: data.type,
      frequency: data.count,
      importance,
      firstSeen: data.firstSeen,
      lastSeen: data.lastSeen,
      sentiment: (avgMood - 4) / 3, // Normalizar mood (1-7) a sentimiento (-1 a 1)
      metadata: {
        aliases: [],
        context: `Aparece en ${data.entries.size} entradas`,
      },
    });
  }

  return patterns;
}

/**
 * Calcula conexiones entre patrones basándose en co-ocurrencia
 */
function calculateEdges(matches: PatternMatch[], patterns: Pattern[]): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const edgeMap = new Map<string, {
    coOccurrences: number;
    entries: Set<string>;
  }>();

  // Agrupar matches por entrada
  const entriesMap = new Map<string, PatternMatch[]>();
  for (const match of matches) {
    if (!entriesMap.has(match.entryId)) {
      entriesMap.set(match.entryId, []);
    }
    entriesMap.get(match.entryId)!.push(match);
  }

  // Calcular co-ocurrencias
  for (const [entryId, entryMatches] of entriesMap.entries()) {
    for (let i = 0; i < entryMatches.length; i++) {
      for (let j = i + 1; j < entryMatches.length; j++) {
        const p1 = entryMatches[i].pattern;
        const p2 = entryMatches[j].pattern;
        const edgeKey = p1 < p2 ? `${p1}::${p2}` : `${p2}::${p1}`;

        if (!edgeMap.has(edgeKey)) {
          edgeMap.set(edgeKey, { coOccurrences: 0, entries: new Set() });
        }

        const edgeData = edgeMap.get(edgeKey)!;
        edgeData.coOccurrences++;
        edgeData.entries.add(entryId);
      }
    }
  }

  // Convertir a GraphEdge[]
  let edgeIndex = 0;
  for (const [edgeKey, data] of edgeMap.entries()) {
    const [p1Label, p2Label] = edgeKey.split('::');
    const source = patterns.find(p => p.label === p1Label);
    const target = patterns.find(p => p.label === p2Label);

    if (!source || !target) continue;

    // Peso normalizado basado en frecuencias
    const maxFreq = Math.max(source.frequency, target.frequency);
    const weight = data.coOccurrences / maxFreq;

    edges.push({
      id: `edge_${edgeIndex++}`,
      source: source.id,
      target: target.id,
      weight: Math.min(1, weight),
      coOccurrences: data.coOccurrences,
      metadata: {
        sharedEntries: Array.from(data.entries),
      },
    });
  }

  return edges;
}

/**
 * Analiza un conjunto de entradas y genera patrones + conexiones
 */
export function analyzePatterns(entries: JournalEntry[]): {
  patterns: Pattern[];
  edges: GraphEdge[];
} {
  // 1. Extraer coincidencias de todas las entradas
  const allMatches = entries.flatMap(extractPatternMatches);

  // 2. Agregar en patrones
  const patterns = aggregatePatterns(allMatches, entries);

  // 3. Calcular conexiones
  const edges = calculateEdges(allMatches, patterns);

  return { patterns, edges };
}

/**
 * Mock function para testing (sin IA real)
 * En producción, esto se reemplazaría con Claude API
 */
export function analyzePatternsWithAI(entries: JournalEntry[]): Promise<{
  patterns: Pattern[];
  edges: GraphEdge[];
}> {
  // Por ahora, usar análisis basado en reglas
  return Promise.resolve(analyzePatterns(entries));
}
