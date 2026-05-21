/**
 * graphLayout.ts
 * Algoritmo de posicionamiento determinístico para nodos del grafo.
 * Usa círculos concéntricos basados en tipo (emotion→topic→phrase) y peso.
 */

import type { GraphNode } from './graphRepo';

export type PositionedNode = GraphNode & {
  x: number;
  y: number;
  r: number; // radio visual del nodo
};

const MIN_RADIUS = 10;
const MAX_RADIUS = 28;

/**
 * Posiciona nodos en círculos concéntricos centrados en (width/2, height/2).
 * - Anillo 1 (interno): emotion
 * - Anillo 2: activity
 * - Anillo 3: topic
 * - Anillo 4: person
 * - Anillo 5: phrase
 * - Anillo 6 (externo): trigger
 * - Radio de nodo proporcional a weight
 * - Ángulo con variación aleatoria para layout dinámico
 */
export function layoutNodes(
  nodes: GraphNode[],
  dims: { width: number; height: number },
  seed?: number // Seed para reproducibilidad
): PositionedNode[] {
  const centerX = dims.width / 2;
  const centerY = dims.height / 2;
  
  // Usar seed o timestamp actual para variación
  const layoutSeed = seed ?? Date.now();
  
  // Función de random seeded simple
  const seededRandom = (index: number) => {
    const x = Math.sin(layoutSeed + index * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };

  // Normalizar weights a radio visual [MIN_RADIUS..MAX_RADIUS]
  const maxWeight = Math.max(...nodes.map((n) => n.weight), 1);
  const minWeight = Math.min(...nodes.map((n) => n.weight), 0);
  const weightRange = maxWeight - minWeight || 1;

  const normalizeRadius = (w: number) => {
    const ratio = (w - minWeight) / weightRange;
    return MIN_RADIUS + ratio * (MAX_RADIUS - MIN_RADIUS);
  };

  // Agrupar por tipo y ordenar alfabéticamente para determinismo
  const byType: Record<string, GraphNode[]> = {
    emotion: [],
    activity: [],
    topic: [],
    person: [],
    phrase: [],
    trigger: [],
  };

  nodes.forEach((n) => {
    if (byType[n.type]) {
      byType[n.type].push(n);
    } else {
      // Si es un tipo desconocido, añadirlo a 'phrase' por defecto
      byType.phrase.push(n);
    }
  });

  // Ordenar alfabéticamente por label
  Object.keys(byType).forEach((type) => {
    byType[type].sort((a, b) => a.label.localeCompare(b.label));
  });

  // Radios de anillos (distancia desde centro)
  const baseRadius = Math.min(dims.width, dims.height);
  const ringRadii = {
    emotion: baseRadius * 0.12,   // más interno
    activity: baseRadius * 0.22,
    topic: baseRadius * 0.30,
    person: baseRadius * 0.37,
    phrase: baseRadius * 0.43,
    trigger: baseRadius * 0.48,   // más externo
  };

  const positioned: PositionedNode[] = [];

  // Función para distribuir nodos en un anillo con variación
  const distributeRing = (nodeList: GraphNode[], ringRadius: number, typeIndex: number) => {
    const count = nodeList.length;
    if (count === 0) return;

    nodeList.forEach((node, i) => {
      // Ángulo base uniforme
      const baseAngle = (i / count) * 2 * Math.PI;
      
      // Agregar variación aleatoria de ±15 grados
      const variation = (seededRandom(typeIndex * 100 + i) - 0.5) * (Math.PI / 6);
      const angle = baseAngle + variation;
      
      // Pequeña variación en el radio también (±10%)
      const radiusVariation = 1 + (seededRandom(typeIndex * 200 + i) - 0.5) * 0.2;
      const finalRadius = ringRadius * radiusVariation;
      
      const x = centerX + finalRadius * Math.cos(angle);
      const y = centerY + finalRadius * Math.sin(angle);
      const r = normalizeRadius(node.weight);

      positioned.push({ ...node, x, y, r });
    });
  };

  // Distribuir por anillos con índice de tipo para seed
  distributeRing(byType.emotion, ringRadii.emotion, 0);
  distributeRing(byType.activity, ringRadii.activity, 1);
  distributeRing(byType.topic, ringRadii.topic, 2);
  distributeRing(byType.person, ringRadii.person, 3);
  distributeRing(byType.phrase, ringRadii.phrase, 4);
  distributeRing(byType.trigger, ringRadii.trigger, 5);

  return positioned;
}
