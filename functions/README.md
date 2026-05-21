# Firebase Functions - Análisis de IA

Sistema de análisis de inteligencia artificial para entradas del diario emocional usando Firebase Cloud Functions.

## 🚀 Quick Start

### Instalación

```bash
cd functions
npm install
```

### Desarrollo Local (Emuladores)

```bash
# Iniciar emuladores (Functions + Firestore + Auth + Storage)
npm run serve

# En otra terminal, probar funciones
npm run shell
```

### Build y Deploy

```bash
# Compilar TypeScript
npm run build

# Deploy a producción
npm run deploy

# Ver logs de producción
npm run logs
```

## 📁 Estructura

```
functions/
├── src/
│   ├── index.ts                  # Endpoints principales
│   ├── env.ts                    # Configuración de entorno
│   ├── analyzers/
│   │   ├── base.ts              # Interfaz Analyzer
│   │   └── mockAnalyzer.ts      # Implementación mock (sin APIs)
│   ├── recommend/               # Sistema de recomendaciones
│   │   ├── base.ts              # Interfaz Recommender
│   │   ├── sources.ts           # Recopilación de señales (timeseries, graph)
│   │   └── rulesRecommender.ts  # Motor de reglas + catálogo
│   ├── text2graph/              # Pipeline de extracción Text→Graph
│   │   ├── types.ts             # Tipos (Term, Pair, ExtractResult)
│   │   ├── normalize.ts         # Normalización (stemming, diacríticos)
│   │   ├── synonyms.ts          # Diccionarios (stopwords, emotions, sinónimos)
│   │   ├── extractor.ts         # Tokenización, n-grams, ponderación
│   │   ├── consolidator.ts      # Decay, merge de pesos
│   │   └── writer.ts            # Upsert de nodos/edges en Firestore
│   ├── services/
│   │   ├── firestore.ts         # Helpers Firestore
│   │   ├── insightsWriter.ts    # Escritura de insights
│   │   └── timeseries.ts        # Agregaciones temporales
│   └── types/
│       ├── journal.ts           # Tipos de entradas
│       ├── insights.ts          # Tipos de insights
│       ├── timeseries.ts        # Tipos de agregaciones
│       └── recommend.ts         # Tipos de recomendaciones
├── package.json
├── tsconfig.json
└── .eslintrc.js
```

## 🔌 Endpoints Disponibles

### `analyzeEntry`
Analiza una entrada individual del diario.

**Parámetros:**
- `entryId` (string, requerido): ID de la entrada
- `userId` (string, opcional): Solo en emulador sin auth

**Retorna:**
```typescript
{
  ok: true,
  insights: {
    sentiment: { score: -0.5, label: 'neg' },
    topicsCount: 3,
    keyPhrasesCount: 5
  }
}
```

**Ejemplo (desde React Native):**
```typescript
import functions from '@react-native-firebase/functions';

const result = await functions().httpsCallable('analyzeEntry')({
  entryId: 'abc123'
});
```

### `analyzeUserBatch`
Analiza múltiples entradas de un usuario en lote.

**Parámetros:**
- `limit` (number, opcional): Máximo de entradas (default: 50, max: 200)
- `userId` (string, opcional): Solo en emulador sin auth

**Retorna:**
```typescript
{
  ok: true,
  processed: 25,
  total: 30
}
```

**Ejemplo:**
```typescript
const result = await functions().httpsCallable('analyzeUserBatch')({
  limit: 100
});
```

### `updateTimeseriesForEntry`
Actualiza las agregaciones de series temporales (día y semana) para una entrada específica.

**Parámetros:**
- `entryId` (string, requerido): ID de la entrada
- `userId` (string, opcional): Solo en emulador sin auth

**Retorna:**
```typescript
{
  ok: true
}
```

**Ejemplo:**
```typescript
// Útil después de editar una entrada para recalcular agregaciones
const result = await functions().httpsCallable('updateTimeseriesForEntry')({
  entryId: 'abc123'
});
```

### `rebuildTimeseriesForUser`
Reconstruye todas las series temporales de un usuario desde cero. Útil para:
- Inicializar datos históricos
- Corregir inconsistencias
- Backfill después de cambios de esquema

**Parámetros:**
- `from` (string ISO, opcional): Fecha inicial (ej: '2024-01-01')
- `to` (string ISO, opcional): Fecha final (ej: '2024-12-31')
- `userId` (string, opcional): Solo en emulador sin auth

**Retorna:**
```typescript
{
  ok: true,
  processed: 150,  // Entradas procesadas
  days: 45,        // Buckets diarios creados
  weeks: 12        // Buckets semanales creados
}
```

**Ejemplo:**
```typescript
// Reconstruir todo el 2024
const result = await functions().httpsCallable('rebuildTimeseriesForUser')({
  from: '2024-01-01',
  to: '2024-12-31'
});

// Reconstruir todo (sin filtros)
const result = await functions().httpsCallable('rebuildTimeseriesForUser')({});
```

### `getRecommendations`
Genera recomendaciones personalizadas basadas en patrones emocionales del usuario. Usa un sistema de **reglas determinísticas** que analiza:
- Tendencias de mood y sentiment (últimos 14 días)
- Nivel de actividad (si hay entradas recientes)
- Palabras clave relacionadas con estrés o positividad
- Topics y frases frecuentes en el grafo

**Parámetros:**
- `limit` (number, opcional): Máximo de recomendaciones (default: 6, max: 10)
- `horizonDays` (number, opcional): Días históricos a analizar (default: 14)
- `userId` (string, opcional): Solo en emulador sin auth

**Retorna:**
```typescript
{
  items: [
    {
      id: string,                        // ej: "breathing:box-4444"
      type: 'meditation'|'breathing'|'journaling'|'tip'|'movement',
      title: string,                     // ej: "Respiración en caja 4-4-4-4"
      summary: string,                   // Descripción de la técnica
      actions: [                         // CTAs accionables
        {
          label: string,                 // ej: "Empezar ahora"
          type: 'open'|'navigate',
          screen?: string,               // ej: "BreathingGuide"
          params?: object,               // Parámetros de navegación
          href?: string                  // URL externa
        }
      ],
      tags?: string[],                   // ej: ["rápido", "5min", "ansiedad"]
      score: number,                     // Relevancia 0-1 (solo en dev)
      createdAt: Timestamp
    }
  ]
}
```

**Ejemplo:**
```typescript
// Obtener 6 recomendaciones basadas en últimos 14 días
const result = await functions().httpsCallable('getRecommendations')({
  limit: 6,
  horizonDays: 14
});

console.log(result.data.items);
// [
//   { id: 'breathing:478', type: 'breathing', title: 'Respiración 4-7-8', ... },
//   { id: 'meditation:body-scan-5', type: 'meditation', title: 'Escaneo corporal', ... }
// ]
```

**Catálogo de Recomendaciones:**
- **Meditation:** `body-scan-5` (Escaneo corporal 5 min)
- **Breathing:** `box-4444` (Caja 4-4-4-4), `478` (4-7-8 relajación)
- **Journaling:** `abc` (ABC de creencias), `3-good-things` (Gratitud), `quick-checkin` (Check-in rápido)
- **Movement:** `walk-10` (Caminata consciente), `stretch-5` (Estiramiento)
- **Tips:** `micro-break` (Pausa 2 min), `timeboxing` (Pomodoro 25/5)

**Reglas de Scoring:**
1. **Mood/Sentiment bajo** (≤3.0 o <-0.2) → Breathing, meditation, journaling ABC (+0.1)
2. **Tendencia descendente** → Movement, tips (+0.1)
3. **Baja actividad** (sin entradas últimos 3 días) → Quick check-in (+0.15)
4. **Keywords de estrés** (ansiedad, estrés, trabajo) → Breathing 4-7-8, timeboxing (+0.1)
5. **Keywords positivos** (gracias, logré, feliz) → 3 good things, stretch (+0.05-0.1)

**Notas:**
- Las recomendaciones son **determinísticas** (mismos inputs → mismo output)
- No requiere APIs externas ni modelos de ML
- Se puede cachear en cliente (TTL recomendado: 1 hora)
- Expandible: agregar más items al CATALOG o nuevas reglas

### `extractAndUpsertGraphForEntry`
Extrae términos y relaciones desde el texto de una entrada y actualiza el grafo de patrones.

**Sistema text2graph:**
Pipeline completo de extracción heurística en español que incluye:
- Tokenización y normalización (stemming, diacríticos)
- Generación de n-grams (1-3 palabras)
- Detección de emociones (lexicon de ~70 términos)
- Aplicación de sinónimos y aliases canónicos
- Ponderación por tipo (emotion:2.5, trigram:2.0, bigram:1.5, unigram:1.0)
- Consolidación con decay temporal (0.98 por actualización)
- Generación de pares de co-ocurrencia para aristas

**Parámetros:**
- `entryId` (string, requerido): ID de la entrada a procesar
- `userId` (string, opcional): Solo en emulador sin auth

**Retorna:**
```typescript
{
  ok: true,
  nodeCount: 5,      // Nodos creados/actualizados
  edgeCount: 8       // Aristas creadas/actualizadas
}
```

**Ejemplo:**
```typescript
// Procesar entrada específica
const result = await functions().httpsCallable('extractAndUpsertGraphForEntry')({
  entryId: 'abc123'
});

console.log(`Grafo actualizado: ${result.data.nodeCount} nodos, ${result.data.edgeCount} conexiones`);
```

**Ejemplo de Extracción:**
```
Entrada: "Me siento ansioso por el trabajo y los plazos de entrega. Necesito descanso."

Extraído:
  Nodos:
  - emotion:ansiedad (weight: 2.5)
  - topic:laboral (weight: 1.0, alias de "trabajo")
  - topic:descanso (weight: 1.0)
  - phrase:plazo de entrega (weight: 2.0, en whitelist)
  
  Aristas:
  - emotion:ansiedad ~ topic:laboral (weight: 2.0, contexto cercano)
  - topic:laboral ~ phrase:plazo de entrega (weight: 2.0, en mismo trigram)
  - emotion:ansiedad ~ topic:descanso (weight: 1.0)
  - topic:laboral ~ topic:descanso (weight: 1.0)
```

**Características:**
- **Decay:** Pesos antiguos se multiplican por 0.98 antes de sumar nuevos deltas
- **Cap:** Peso máximo de 5.0 por nodo/edge
- **Deduplicación:** Sinónimos se mapean a término canónico (ej: "trabajo"→"laboral")
- **Stopwords:** Filtra ~100 palabras comunes en español
- **Sin APIs externas:** Todo rule-based, sin llamadas a servicios NLP

### `rebuildGraphForUser`
Reconstruye el grafo completo de un usuario procesando todas las entradas en un rango de fechas.

Útil para:
- Inicialización del grafo desde entradas históricas
- Recalibrar después de cambios en diccionarios
- Corregir inconsistencias
- Aplicar decay masivo (limpieza de patrones antiguos)

**Parámetros:**
- `from` (string ISO, opcional): Fecha inicio (ej: '2024-01-01')
- `to` (string ISO, opcional): Fecha fin (ej: '2024-12-31')
- `userId` (string, opcional): Solo en emulador sin auth

**Retorna:**
```typescript
{
  ok: true,
  processed: 45,     // Entradas procesadas
  nodeCount: 28,     // Nodos en grafo final
  edgeCount: 62      // Aristas en grafo final
}
```

**Ejemplo:**
```typescript
// Reconstruir todo el 2024
const result = await functions().httpsCallable('rebuildGraphForUser')({
  from: '2024-01-01',
  to: '2024-12-31'
});

// Reconstruir todo sin filtros
const result = await functions().httpsCallable('rebuildGraphForUser')({});
```

**Proceso:**
1. Query de entradas activas en rango (ordenadas por createdAt)
2. Para cada entrada:
   - Extraer términos con text2graph
   - Acumular pesos por término único
   - Acumular pesos por par de co-ocurrencia
3. Upsert batch con consolidación y decay
4. Resultado: grafo completo actualizado

**Notas:**
- **No borra** nodos/edges existentes, solo los consolida con decay
- **Idempotente:** Ejecutar múltiples veces produce mismo resultado
- **Latencia:** ~50-200ms por entrada en emulador (depende de longitud del texto)
- **Límite recomendado:** <500 entradas por llamada (usar paginación si más)

## 📊 Esquema Firestore

### Entradas (existentes)
```
journals/{userId}/entries/{entryId}
```

### Insights (nuevos)

#### Resumen por entrada
```
journals/{userId}/entries/{entryId}/insights/summary
{
  entryId: string,
  sentiment: { score: number, label: 'neg'|'neu'|'pos' },
  topics: [{ key: string, weight: number }],
  keyPhrases: string[],
  updatedAt: Timestamp
}
```

#### Nodos del grafo
```
journals/{userId}/insights/nodes/{nodeId}
{
  id: string,           // ej: "topic:trabajo"
  label: string,        // ej: "trabajo"
  type: 'topic'|'phrase'|'emotion',
  weight: number,
  updatedAt: Timestamp
}
```

#### Aristas del grafo
```
journals/{userId}/insights/edges/{edgeId}
{
  id: string,           // ej: "e:trabajo~familia"
  source: string,       // nodeId origen
  target: string,       // nodeId destino
  weight: number,       // co-ocurrencias
  updatedAt: Timestamp
}
```

#### Series Temporales (agregaciones)
```
journals/{userId}/insights/timeseries/day/{YYYY-MM-DD}
journals/{userId}/insights/timeseries/week/{YYYY-Www}
{
  id: string,                              // ej: "2024-03-15" o "2024-W11"
  period: 'day' | 'week',
  startAt: Timestamp,                      // Inicio del bucket (UTC)
  endAt: Timestamp,                        // Fin del bucket (UTC)
  updatedAt: Timestamp,
  
  // Agregaciones
  count: number,                           // Número de entradas
  avgMood: number | null,                  // Promedio de mood (1-7)
  moodCounts: {                            // Histograma de moods
    '1': number,
    '2': number,
    // ... hasta '7'
  },
  avgSentiment: number | null,             // Promedio de sentiment (-1 a 1)
  sentimentCounts: {                       // Histograma de sentimientos
    neg: number,
    neu: number,
    pos: number
  },
  lastEntryIds: string[]                   // Últimas 10 entradas (más reciente primero)
}
```

**Notas:**
- Los buckets usan **UTC** exclusivamente
- Las semanas siguen el estándar **ISO 8601** (lunes a domingo)
- Las agregaciones se actualizan **incrementalmente** con transacciones
- `rebuildTimeseriesForUser` recalcula todos los buckets desde cero

## 🧪 MockAnalyzer

Implementación determinística **sin APIs externas**:

### Análisis de Sentimiento
Cuenta palabras positivas y negativas en español:
- **Positivas:** gracias, feliz, logré, amor, paz...
- **Negativas:** triste, miedo, frustrado, dolor...

**Score:** `-1` (muy negativo) a `+1` (muy positivo)

### Extracción de Topics
1. Normaliza texto (quita acentos)
2. Tokeniza y filtra stopwords
3. Cuenta frecuencias
4. Retorna top 5 palabras más frecuentes

### Key Phrases
Top 5 términos relevantes del texto.

### Grafo
- **Nodos:** Topics extraídos
- **Aristas:** Conecta topics co-ocurrentes (peso = 1)

## 🔧 Testing en Emulador

### 1. Iniciar emuladores
```bash
npm run serve
```

### 2. Desde Firebase Emulator UI
Navega a `http://localhost:4000` → Functions → Llamar función

### 3. Desde cURL
```bash
# analyzeEntry
curl -X POST http://localhost:5001/[PROJECT-ID]/us-central1/analyzeEntry \
  -H "Content-Type: application/json" \
  -d '{"data": {"entryId": "abc123", "userId": "demo-user"}}'

# analyzeUserBatch
curl -X POST http://localhost:5001/[PROJECT-ID]/us-central1/analyzeUserBatch \
  -H "Content-Type: application/json" \
  -d '{"data": {"limit": 10, "userId": "demo-user"}}'
```

### 4. Desde React Native (app)
```typescript
// Configurar para usar emulador (en desarrollo)
if (__DEV__) {
  functions().useFunctionsEmulator('http://localhost:5001');
}

// Llamar función
const result = await functions().httpsCallable('analyzeEntry')({
  entryId: 'local-1729285030879-k3x7p2q1a'
});
```

### 5. Testing de Recomendaciones

#### Caso 1: Usuario con mood bajo
```typescript
// 1. Crear entradas con mood bajo (≤3)
await createEntry({ mood: 2, content: 'Me siento triste hoy...' });
await createEntry({ mood: 3, content: 'Ansiedad y estrés...' });

// 2. Ejecutar análisis
await functions().httpsCallable('analyzeUserBatch')({ limit: 10 });

// 3. Actualizar timeseries
await functions().httpsCallable('rebuildTimeseriesForUser')({});

// 4. Obtener recomendaciones
const result = await functions().httpsCallable('getRecommendations')({});

// Esperado: Breathing exercises, meditation, journaling ABC
console.log(result.data.items);
```

#### Caso 2: Usuario inactivo
```typescript
// 1. No crear entradas por 4+ días

// 2. Obtener recomendaciones
const result = await functions().httpsCallable('getRecommendations')({});

// Esperado: Quick check-in con score alto
console.log(result.data.items.find(i => i.id === 'journaling:quick-checkin'));
```

#### Caso 3: Usuario con keywords de estrés
```typescript
// 1. Crear entradas con palabras clave
await createEntry({ content: 'Mucho estrés en el trabajo, plazos ajustados...' });
await createEntry({ content: 'Ansiedad por la reunión de mañana...' });

// 2. Analizar y procesar
await functions().httpsCallable('analyzeUserBatch')({});
await functions().httpsCallable('rebuildTimeseriesForUser')({});

// 3. Obtener recomendaciones
const result = await functions().httpsCallable('getRecommendations')({});

// Esperado: Breathing 4-7-8, timeboxing con bonus
console.log(result.data.items.filter(i => 
  i.id === 'breathing:478' || i.id === 'tip:timeboxing'
));
```

#### Caso 4: Usuario positivo
```typescript
// 1. Crear entradas con gratitud
await createEntry({ mood: 6, content: 'Hoy logré terminar mi proyecto. Gracias a mi equipo.' });
await createEntry({ mood: 7, content: 'Me siento feliz por los buenos resultados.' });

// 2. Procesar
await functions().httpsCallable('analyzeUserBatch')({});
await functions().httpsCallable('rebuildTimeseriesForUser')({});

// 3. Obtener recomendaciones
const result = await functions().httpsCallable('getRecommendations')({});

// Esperado: 3 good things, stretch con bonus
console.log(result.data.items.filter(i => 
  i.id === 'journaling:3-good-things' || i.id === 'movement:stretch-5'
));
```

## 🎯 Criterios de Éxito

✅ Functions compilan sin errores (`npm run build`)  
✅ Emuladores funcionan (`npm run serve`)  
✅ `analyzeEntry` crea docs en Firestore:
  - `journals/{userId}/entries/{entryId}/insights/summary`
  - Nodos en `journals/{userId}/insights/nodes/`
  - Aristas en `journals/{userId}/insights/edges/`  
✅ `analyzeUserBatch` procesa múltiples entradas  
✅ `rebuildTimeseriesForUser` reconstruye agregaciones correctamente  
✅ `getRecommendations` genera recomendaciones personalizadas:
  - Detecta mood/sentiment bajo
  - Identifica tendencias descendentes
  - Reconoce inactividad
  - Coincide keywords de estrés/positividad
  - Retorna items ordenados por score  
✅ `extractAndUpsertGraphForEntry` extrae términos del texto:
  - Tokeniza y normaliza (stemming, lowercase, sin diacríticos)
  - Detecta emociones del lexicon (~70 términos)
  - Genera n-grams 1-3 y filtra por whitelist
  - Aplica sinónimos y aliases canónicos
  - Crea nodos (topic/phrase/emotion) y edges (co-ocurrencia)
  - Aplica decay (0.98) a pesos existentes
  - Limita pesos máximos (5.0)  
✅ `rebuildGraphForUser` reconstruye grafo completo:
  - Procesa todas las entradas activas
  - Acumula pesos por término y par
  - Consolida con decay
  - Retorna estadísticas (processed, nodeCount, edgeCount)  
✅ MockAnalyzer funciona sin APIs externas  
✅ Resultados determinísticos y coherentes  
✅ Cache de recomendaciones funciona en cliente (1h TTL)  
✅ Dashboard muestra botón "Recalcular Grafo" funcional  
✅ DiscoverGraphScreen refleja cambios tras rebuild (pull-to-refresh)
  - Detecta mood/sentiment bajo
  - Identifica tendencias descendentes
  - Reconoce inactividad
  - Coincide keywords de estrés/positividad
  - Retorna items ordenados por score
✅ MockAnalyzer funciona sin APIs externas  
✅ Resultados determinísticos y coherentes  
✅ Cache de recomendaciones funciona en cliente (1h TTL)  

## 🚀 Próximos Pasos

### Fase 2: Integración de IA Real
- [ ] Crear `OpenAIAnalyzer` o `VertexAIAnalyzer`
- [ ] Agregar variables de entorno para API keys
- [ ] Implementar rate limiting
- [ ] Manejo de errores y retries

### Fase 3: Triggers Automáticos
- [ ] `onEntryCreated` - Analizar automáticamente al crear
- [ ] `onEntryUpdated` - Re-analizar si cambia contenido
- [ ] Queue background jobs con Pub/Sub

### Fase 4: Optimizaciones
- [ ] Cache de análisis (evitar re-procesar)
- [ ] Análisis incremental (solo diff)
- [ ] Batch processing con límites de tiempo

## 📚 Referencias

- [Firebase Functions Docs](https://firebase.google.com/docs/functions)
- [TypeScript Guide](https://firebase.google.com/docs/functions/typescript)
- [Callable Functions](https://firebase.google.com/docs/functions/callable)
- [Emulator Suite](https://firebase.google.com/docs/emulator-suite)

---

**Versión:** 1.0.0  
**Node:** 20  
**TypeScript:** 5.6.0  
**Firebase Functions:** 6.0.0
