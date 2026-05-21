# Plan de Implementación del Grafo 3D Emocional

## 📊 Estado Actual (Auditado)

### ✅ Componentes Implementados
1. **Frontend:**
   - `Discover3DGraphScreen.tsx` - Pantalla con UI completa
   - `InteractiveGraph3D.tsx` - Componente con gestos táctiles
   - `Graph3DView.tsx` - Visualización Three.js
   - `useGraphData.ts` - Hook para cargar datos desde Firestore

2. **Backend (Functions):**
   - `patternAnalyzer.ts` - Análisis basado en reglas (diccionarios de palabras clave)
   - `graphGenerator.ts` - Servicio para generar y guardar grafos

3. **Cliente (sin Functions):**
   - `clientGraphGenerator.ts` - Generador local (funciona sin backend)

### ❌ Problemas Identificados

1. **El grafo NO tiene datos porque:**
   - Las entradas del diario nunca disparan la generación del grafo
   - No hay trigger automático cuando el usuario crea/edita entradas
   - El análisis actual es muy básico (solo busca palabras exactas)

2. **Sin integración con IA:**
   - `patternAnalyzer.ts` tiene función `analyzePatternsWithAI` pero es mock
   - Comentario: "En producción, esto se reemplazaría con Claude API"
   - No hay extracción real de entidades, relaciones ni contexto

3. **Estructura de datos inconsistente:**
   - Dos fuentes: `types/graph.ts` (frontend) y `graphRepo.ts` (formato diferente)
   - `graphRepo.ts` busca en `journals/{userId}/insights/nodes` y `edges`
   - `useGraphData.ts` busca en `graphs/{userId}`

---

## 🎯 Solución: Arquitectura Completa

### Opción 1: Con IA (Recomendado para producción)
```
Entrada Usuario → Firestore → Cloud Function → IA (Claude/OpenAI) → Grafo → Firestore → UI 3D
```

### Opción 2: Sin IA (Rápido para empezar)
```
Entrada Usuario → Cliente → Análisis Local → Grafo → Firestore → UI 3D
```

---

## 📋 Plan de Implementación Paso a Paso

### Fase 1: Arreglar Pipeline Básico (Sin IA) ⚡️
**Tiempo: 30 minutos**

1. **Trigger Automático:**
   - Añadir botón "Generar Grafo" en Discover
   - Hook `useGraphGenerator` ya existe, solo conectar

2. **Corregir Estructura de Datos:**
   - Unificar formato: usar `graphs/{userId}` como fuente única
   - `clientGraphGenerator.ts` ya guarda ahí

3. **Mejorar Análisis Local:**
   - Expandir diccionarios de patrones
   - Añadir análisis de n-gramas para frases compuestas
   - Detección de personas (nombres propios)

### Fase 2: Integración con IA (Claude API) 🤖
**Tiempo: 1-2 horas**

1. **Setup API:**
   - Instalar `@anthropic-ai/sdk` en Functions
   - Configurar API key en Firebase Functions config

2. **Prompt Engineering:**
   - Diseñar prompt para extraer:
     - Emociones con intensidad
     - Actividades y contexto
     - Personas mencionadas
     - Lugares
     - Relaciones causales (X provoca Y)
     - Relaciones temporales (X antes de Y)
     - Triggers y patrones

3. **Implementar `analyzePatternsWithClaudeAPI`:**
   ```typescript
   async function analyzePatternsWithClaudeAPI(entries: JournalEntry[]): Promise<{
     patterns: Pattern[];
     edges: GraphEdge[];
   }> {
     const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
     
     // Combinar últimas 10 entradas para contexto
     const recentEntries = entries.slice(-10);
     const combinedText = recentEntries.map(e => 
       `[${e.createdAt.toISOString()}] ${e.content}`
     ).join('\n\n');

     const message = await anthropic.messages.create({
       model: "claude-3-5-sonnet-20241022",
       max_tokens: 4096,
       messages: [{
         role: "user",
         content: ANALYSIS_PROMPT + combinedText
       }]
     });

     return parseClaudeResponse(message.content);
   }
   ```

### Fase 3: Trigger Automático en Firebase 🔥
**Tiempo: 30 minutos**

1. **Cloud Function Trigger:**
   ```typescript
   export const onEntryCreated = functions.firestore
     .document('entries/{entryId}')
     .onCreate(async (snap, context) => {
       const data = snap.data();
       const userId = data.userId;
       
       // Re-generar grafo cada 5 entradas o semanalmente
       await scheduleGraphGeneration(userId);
     });
   ```

2. **Scheduled Function:**
   ```typescript
   export const weeklyGraphGeneration = functions.pubsub
     .schedule('every sunday 00:00')
     .onRun(async () => {
       // Regenerar grafos de usuarios activos
       const activeUsers = await getActiveUsers(7); // últimos 7 días
       for (const userId of activeUsers) {
         await generateGraphForUser(userId);
       }
     });
   ```

---

## 🔧 Formato JSON de Datos

### Nodos (Pattern)
```json
{
  "id": "emotion_anxiety_001",
  "label": "Ansiedad",
  "type": "emotion",
  "frequency": 12,
  "importance": 0.85,
  "firstSeen": "2025-01-15T10:00:00Z",
  "lastSeen": "2025-11-28T14:30:00Z",
  "sentiment": -0.6,
  "metadata": {
    "aliases": ["nervios", "estrés", "tensión"],
    "context": "Aparece principalmente antes de reuniones de trabajo"
  }
}
```

### Aristas (GraphEdge)
```json
{
  "id": "edge_001",
  "source": "emotion_anxiety_001",
  "target": "activity_work_meetings",
  "weight": 0.92,
  "coOccurrences": 8,
  "correlation": 0.87,
  "metadata": {
    "sharedEntries": ["entry_123", "entry_456"],
    "avgTimeDelta": 0.5,
    "relationType": "causal"
  }
}
```

### Grafo Completo (en Firestore: `graphs/{userId}`)
```json
{
  "patterns": [ /* array de Pattern */ ],
  "edges": [ /* array de GraphEdge */ ],
  "generatedAt": "2025-11-28T15:00:00Z",
  "entryCount": 47,
  "dateRange": {
    "start": "2025-01-01T00:00:00Z",
    "end": "2025-11-28T23:59:59Z"
  },
  "version": "2.0",
  "metadata": {
    "analysisMethod": "claude-3-5-sonnet",
    "processingTimeMs": 2340
  }
}
```

---

## 🎨 Prompt para Claude API

```text
Eres un asistente especializado en análisis psicológico de diarios emocionales. 

Analiza las siguientes entradas de diario y extrae:

1. **NODOS (Patrones):**
   - Emociones (con intensidad 0-1)
   - Actividades/eventos
   - Personas mencionadas
   - Lugares
   - Temas/tópicos recurrentes
   - Triggers (disparadores emocionales)

2. **ARISTAS (Relaciones):**
   - Causales: X provoca/causa Y
   - Temporales: X ocurre antes/después de Y
   - Correlacionales: X aparece junto a Y frecuentemente
   - Asociativas: X está relacionado con Y

Para cada nodo, proporciona:
- label: nombre del patrón
- type: emotion|activity|person|place|topic|trigger
- importance: 0-1 (qué tan significativo es)
- sentiment: -1 a 1 (negativo a positivo)

Para cada arista:
- source y target: IDs de nodos
- weight: 0-1 (fuerza de la conexión)
- relationType: causal|temporal|correlational|associative

Responde SOLO con JSON válido en este formato:
{
  "patterns": [
    {
      "label": "Ansiedad",
      "type": "emotion",
      "importance": 0.85,
      "sentiment": -0.6,
      "context": "Descripción breve del contexto"
    }
  ],
  "edges": [
    {
      "sourceLabel": "Ansiedad",
      "targetLabel": "Reuniones de trabajo",
      "weight": 0.9,
      "relationType": "causal",
      "description": "La ansiedad aumenta antes de reuniones"
    }
  ]
}

ENTRADAS DEL DIARIO:
{JOURNAL_ENTRIES}
```

---

## 🚀 Pasos Inmediatos para Empezar

### 1. Arreglar el flujo básico (SIN IA)
```bash
# Ya tengo todos los archivos necesarios
# Solo necesito conectar el botón
```

### 2. Añadir botón "Generar Grafo" en DiscoverHomeScreen
```typescript
// src/screens/Discover/DiscoverHomeScreen.tsx
import { useGraphGenerator } from '@hooks/useGraphGenerator';

const { generating, generateGraph, result } = useGraphGenerator();

<Button
  title={generating ? "Generando..." : "Generar Grafo de Patrones"}
  onPress={generateGraph}
  disabled={generating}
/>
```

### 3. Verificar que se guarden datos
```bash
# Abrir Firebase Console
# Ir a Firestore > graphs > {userId}
# Debería aparecer documento con patterns y edges
```

### 4. Verificar visualización 3D
```bash
# Navegar a Discover > Grafo 3D
# Debería mostrar nodos y conexiones
```

---

## 🔮 Siguientes Pasos (Con IA)

1. **Instalar SDK:**
   ```bash
   cd functions
   npm install @anthropic-ai/sdk
   ```

2. **Configurar API Key:**
   ```bash
   firebase functions:config:set claude.api_key="sk-ant-..."
   ```

3. **Implementar `analyzePatternsWithClaudeAPI` en `patternAnalyzer.ts`**

4. **Actualizar `graphGenerator.ts` para usar Claude**

5. **Deploy functions:**
   ```bash
   firebase deploy --only functions
   ```

---

## 📊 Métricas de Éxito

- [ ] Usuario puede generar grafo manualmente
- [ ] Grafo aparece en Firebase Console
- [ ] Visualización 3D muestra nodos y aristas
- [ ] Al tocar un nodo, se ve detalle
- [ ] Filtros funcionan correctamente
- [ ] Generación automática tras N entradas
- [ ] (Con IA) Patrones más precisos y contextuales
- [ ] (Con IA) Relaciones causales detectadas

---

## 🎯 Recomendaciones

### Para Empezar YA (5 minutos):
1. Añadir botón "Generar Grafo" en DiscoverHomeScreen
2. Probar con entradas existentes
3. Ver si aparecen datos en Firestore

### Para Mejor Calidad (1 hora):
1. Integrar Claude API
2. Diseñar prompt especializado
3. Parsear respuesta JSON de Claude

### Para Producción (2-3 horas):
1. Trigger automático
2. Rate limiting
3. Cache de grafos
4. Scheduled regeneration
5. Error handling robusto
