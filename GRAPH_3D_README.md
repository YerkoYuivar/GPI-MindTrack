# Sistema de Grafo 3D de Patrones

## Descripción General

Este módulo implementa un sistema completo de análisis de patrones y visualización 3D interactiva para entradas de diario personal. Utiliza análisis basado en reglas (con capacidad de extensión a IA) para identificar patrones en las entradas y representa las relaciones en un grafo 3D navegable.

## Componentes Principales

### 1. Backend (Cloud Functions)

#### Analizador de Patrones
- **Ubicación**: `functions/src/analyzers/patternAnalyzer.ts`
- **Función**: Analiza entradas del diario para extraer patrones (emociones, actividades, personas, lugares, triggers)
- **Salida**: Lista de patrones y sus conexiones (aristas)

#### Tipos
- **Ubicación**: `functions/src/types/graph.ts`
- **Define**: Interfaces para Pattern, GraphEdge

### 2. Frontend (React Native)

#### Tipos
- **Ubicación**: `src/types/graph.ts`
- **Define**: GraphNode, Graph, GraphFilters, NodeInteraction

#### Componentes de Visualización

##### Graph3DView
- **Ubicación**: `src/components/graph/Graph3DView.tsx`
- **Tecnología**: Three.js + expo-gl
- **Características**:
  - Renderizado 3D de nodos y aristas
  - Nodos coloreados por tipo de patrón
  - Tamaño proporcional a importancia
  - Animación suave con auto-rotación

##### InteractiveGraph3D
- **Ubicación**: `src/components/graph/InteractiveGraph3D.tsx`
- **Características**:
  - Gestos táctiles: pinch-to-zoom, rotación, pan
  - Wrapper sobre Graph3DView
  - Control de transformaciones con react-native-reanimated

#### Hook de Datos

##### useGraphData
- **Ubicación**: `src/hooks/useGraphData.ts`
- **Funciones**:
  - Carga grafo desde Firestore
  - Aplicación de filtros
  - Generación de posiciones 3D
  - Conversión de Pattern a GraphNode

#### Pantallas

##### Discover3DGraphScreen
- **Ubicación**: `src/screens/Discover/Discover3DGraphScreen.tsx`
- **Características**:
  - Visualización del grafo 3D
  - Modales de detalles de nodos
  - Sistema de filtros
  - Leyenda de colores por tipo

## Estructura de Datos

### Firestore Collection: `graphs/{userId}`

```typescript
{
  patterns: Pattern[],      // Array de patrones identificados
  edges: GraphEdge[],        // Array de conexiones
  generatedAt: Timestamp,
  entryCount: number,
  dateRange: {
    start: Timestamp,
    end: Timestamp
  },
  version: string
}
```

### Pattern
```typescript
{
  id: string,
  label: string,             // Ej: "ansiedad", "trabajo"
  type: PatternType,         // emotion | activity | person | place | topic | trigger
  frequency: number,         // Veces que aparece
  importance: number,        // Score 0-1
  firstSeen: Date,
  lastSeen: Date,
  sentiment?: number,        // -1 a 1
  metadata?: {
    aliases?: string[],
    context?: string
  }
}
```

### GraphEdge
```typescript
{
  id: string,
  source: string,            // ID del patrón origen
  target: string,            // ID del patrón destino
  weight: number,            // Fuerza 0-1
  coOccurrences: number,     // Veces que co-ocurren
  metadata?: {
    sharedEntries?: string[],
    avgTimeDelta?: number
  }
}
```

## Flujo de Uso

### 1. Generación del Grafo (Backend)

```typescript
import { analyzePatterns } from './analyzers/patternAnalyzer';

// Obtener entradas del usuario
const entries = await getEntriesFromFirestore(userId);

// Analizar patrones
const { patterns, edges } = analyzePatterns(entries);

// Guardar en Firestore
await setDoc(doc(db, 'graphs', userId), {
  patterns,
  edges,
  generatedAt: new Date(),
  entryCount: entries.length,
  dateRange: {
    start: entries[0].createdAt,
    end: entries[entries.length - 1].createdAt
  },
  version: '1.0'
});
```

### 2. Visualización (Frontend)

```tsx
import Discover3DGraphScreen from './screens/Discover/Discover3DGraphScreen';

// Usar en navegación
<Stack.Screen 
  name="Discover3DGraph" 
  component={Discover3DGraphScreen}
  options={{ title: 'Patrones 3D' }}
/>
```

### 3. Aplicación de Filtros

```typescript
const { applyFilters } = useGraphData();

applyFilters({
  types: ['emotion', 'activity'],  // Solo emociones y actividades
  minFrequency: 3,                 // Mínimo 3 apariciones
  minWeight: 0.5,                  // Conexiones fuertes (>50%)
  searchQuery: 'ansiedad'          // Buscar texto
});
```

## Personalización

### Colores de Patrones

Editar en `src/hooks/useGraphData.ts`:

```typescript
const PATTERN_COLORS: Record<string, string> = {
  emotion: '#8B5CF6',    // purple-500
  activity: '#3B82F6',   // blue-500
  person: '#10B981',     // green-500
  place: '#F59E0B',      // amber-500
  topic: '#6366F1',      // indigo-500
  trigger: '#EF4444',    // red-500
};
```

### Diccionarios de Patrones

Editar en `functions/src/analyzers/patternAnalyzer.ts`:

```typescript
const EMOTION_PATTERNS = [
  'ansiedad', 'alegría', 'tristeza', ...
];

const ACTIVITY_PATTERNS = [
  'trabajo', 'ejercicio', 'meditación', ...
];
```

### Layout del Grafo

Actualmente usa distribución esférica. Para cambiar el algoritmo:

```typescript
// En src/hooks/useGraphData.ts - función generateNodePositions
function generateNodePositions(patterns: Pattern[]) {
  // Implementar algoritmo personalizado:
  // - Force-directed layout
  // - Grid layout
  // - Cluster layout
  // etc.
}
```

## Extensiones Futuras

### 1. Integración con Claude API

Reemplazar análisis basado en reglas con NLP avanzado:

```typescript
// En patternAnalyzer.ts
export async function analyzePatternsWithAI(entries: JournalEntry[]) {
  const response = await claude.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    messages: [{
      role: 'user',
      content: `Analiza estas entradas y extrae patrones: ${JSON.stringify(entries)}`
    }]
  });
  
  return parsePatterns(response.content);
}
```

### 2. Análisis Temporal

Añadir correlación temporal entre patrones:

```typescript
interface GraphEdge {
  correlation?: number;        // Ya existe
  metadata?: {
    avgTimeDelta?: number;     // Ya existe
    temporalPattern?: 'before' | 'after' | 'simultaneous';
  }
}
```

### 3. Clustering Automático

Agrupar patrones similares:

```typescript
function clusterPatterns(patterns: Pattern[]): Cluster[] {
  // Usar algoritmo como K-means o DBSCAN
  // Agrupar por similitud semántica
}
```

### 4. Exportar Grafo

```typescript
function exportGraph(graph: Graph, format: 'json' | 'csv' | 'graphml') {
  // Exportar para análisis externo o visualización en herramientas como Gephi
}
```

## Troubleshooting

### Problema: Grafo no se carga

**Solución**: Verificar que exista el documento en Firestore:
```typescript
const graphDoc = await getDoc(doc(db, 'graphs', userId));
console.log('Exists:', graphDoc.exists());
```

### Problema: Rendimiento lento con muchos nodos

**Solución 1**: Aplicar filtros para reducir cantidad de nodos visibles
**Solución 2**: Implementar LOD (Level of Detail) en el renderizado 3D
**Solución 3**: Usar instancing en Three.js para nodos similares

### Problema: Gestos no funcionan

**Solución**: Verificar que react-native-gesture-handler esté correctamente instalado:
```bash
npx expo install react-native-gesture-handler
```

Y que el proyecto esté envuelto en GestureHandlerRootView (en App.tsx).

## Testing

### Unit Tests (Backend)

```typescript
// tests/patternAnalyzer.test.ts
import { analyzePatterns } from '../src/analyzers/patternAnalyzer';

test('debe extraer emociones correctamente', () => {
  const entries = [
    { id: '1', content: 'Hoy sentí mucha ansiedad', mood: 3, createdAt: new Date() }
  ];
  
  const { patterns } = analyzePatterns(entries);
  
  expect(patterns).toContainEqual(
    expect.objectContaining({ label: 'ansiedad', type: 'emotion' })
  );
});
```

### Integration Tests (Frontend)

```typescript
// tests/useGraphData.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { useGraphData } from '../src/hooks/useGraphData';

test('debe cargar grafo desde Firestore', async () => {
  const { result } = renderHook(() => useGraphData());
  
  await waitFor(() => {
    expect(result.current.loading).toBe(false);
    expect(result.current.nodes.length).toBeGreaterThan(0);
  });
});
```

## Dependencias

- `expo-gl`: ^15.0.4
- `expo-three`: ^8.0.0
- `three`: ^0.166.0
- `react-native-gesture-handler`: ^2.20.2
- `react-native-reanimated`: ^3.16.7
- `@types/three`: ^0.166.0

## Licencia

Propietario del proyecto
