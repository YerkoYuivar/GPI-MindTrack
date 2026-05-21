# Developer Documentation

## 🚀 Scripts de Desarrollo Rápido

### Inicio Todo-en-Uno (Recomendado)

**macOS/Linux:**
```bash
./start-dev.sh
```

**Windows:**
```bash
start-dev.bat
```

Este script automáticamente inicia:
- ✅ Firebase Emulators (Auth, Firestore, Functions, Storage)
- ✅ Expo Dev Server
- ✅ Compila Cloud Functions
- ✅ Muestra logs en tiempo real

### NPM Scripts Disponibles

```bash
npm run dev:full              # Todo (emuladores + expo)
npm run dev:emulators         # Solo emuladores Firebase
npm run dev:functions         # Solo Functions emulator
npm start                     # Solo Expo

npm run functions:build       # Compilar functions
npm run functions:deploy      # Desplegar functions
npm run deploy:all            # Desplegar todo
```

### Servicios Disponibles

- **Firebase UI**: http://localhost:4000
- **Firestore**: http://localhost:8080
- **Functions**: http://localhost:5001
- **Auth**: http://localhost:9099

### Usar el Grafo 3D

1. Inicia: `./start-dev.sh`
2. Abre la app en tu dispositivo
3. Crea 3-5 entradas en el diario
4. Ve a **Descubrir** → "✨ Generar Nuevo Grafo"
5. Click en "🔮 Ver Grafo 3D de Patrones"

Ver más detalles en `GRAPH_QUICKSTART.md`

---

## 🔧 Diagnostics & QA System

Este documento describe las herramientas de diagnóstico y QA integradas en el proyecto.

---

## 📊 Sistema de Métricas

### Ubicación
- `src/lib/diagnostics/metrics.ts`

### Tipos de Métricas

#### Contadores (Counters)
Eventos discretos que se incrementan cada vez que ocurren:

```typescript
// Disponibles:
'journal.list.loaded'        // Lista de diario cargada
'journal.list.paginated'     // Paginación activada
'journal.detail.view'        // Entrada de detalle visualizada
'journal.editor.open'        // Editor abierto
'journal.editor.save.success' // Guardado exitoso
'journal.editor.save.fail'   // Guardado fallido
'journal.image.upload.success' // Imagen subida exitosamente
'journal.image.upload.fail'  // Fallo al subir imagen
'journal.audio.upload.success' // Audio subido exitosamente
'journal.audio.upload.fail'  // Fallo al subir audio
```

#### Temporizadores (Timers)
Operaciones asíncronas con medición de tiempo (p50/p95):

```typescript
// Disponibles:
'journal.editor.save.remote' // Tiempo de guardado remoto
'journal.image.upload'       // Tiempo de subida de imagen
'journal.audio.upload'       // Tiempo de subida de audio
'journal.export'             // Tiempo de exportación
```

### Uso de Métricas

```typescript
import { metrics } from '@lib/diagnostics/metrics';

// Incrementar contador
metrics.inc('journal.editor.save.success');

// Medir operación asíncrona
await metrics.time('journal.editor.save.remote', async () => {
  await saveRemote();
});

// Obtener snapshot de métricas
const snapshot = metrics.getSnapshot();
console.log(snapshot.counters);
console.log(snapshot.timers);
```

---

## 📝 Sistema de Logs

### Ubicación
- `src/lib/diagnostics/logger.ts`

### Inicialización

El logger se inicializa automáticamente en `App.tsx`:

```typescript
logger.init({ 
  key: 'ej.logs.v1',     // Clave de AsyncStorage
  max: 500,              // Máximo de logs en buffer circular
  consoleSink: __DEV__   // Imprimir en consola solo en dev
});
```

### Niveles de Log

```typescript
import { logger } from '@lib/diagnostics/logger';

// Debug: información detallada para debugging
logger.debug('Editor opened', { entryId: '123' }, 'journal');

// Info: eventos importantes del flujo normal
logger.info('Save success', { entryId: '123' }, 'journal');

// Warn: situaciones anormales pero no críticas
logger.warn('Image queue full', { count: 4 }, 'journal');

// Error: errores que requieren atención
logger.error('Upload fail', { error, entryId: '123' }, 'journal');
```

### API del Logger

```typescript
// Obtener todos los logs
const logs = await logger.getAll();

// Limpiar logs
await logger.clear();

// Forzar escritura a AsyncStorage
await logger.flush();
```

### Console Sink

**Solo en desarrollo (`__DEV__`)**, todos los logs se imprimen en consola:

```
[2024-01-15 10:30:45] [INFO] [journal] Save success { entryId: '123' }
```

**En producción**, los logs solo se guardan en AsyncStorage sin imprimir en consola.

---

## 🩺 Información de Runtime

### Ubicación
- `src/lib/diagnostics/runtime.ts`

### API

```typescript
import { getRuntimeInfo, formatDuration, formatTimestamp } from '@lib/diagnostics/runtime';

// Obtener info de conectividad y emuladores
const info = await getRuntimeInfo();
console.log(info);
// {
//   online: true,
//   type: 'wifi',
//   ip: '192.168.1.100',
//   emulators: { firestore: false, storage: false },
//   ts: 1705320645000
// }

// Formatear duración
formatDuration(2500);  // "2.5s"
formatDuration(500);   // "500ms"
formatDuration(75000); // "1.2m"

// Formatear timestamp
formatTimestamp(Date.now()); // "15/01/2024, 10:30:45"
```

---

## ✅ QA Checklist

### Ubicación
- `src/state/dev/qaChecklist.ts`

### Items del Checklist

1. ✅ **Crear entrada** - Crear nueva entrada con texto y mood
2. ✅ **Editar entrada** - Modificar entrada existente
3. ✅ **Marcar favorito** - Agregar/quitar favorito
4. ✅ **Eliminar** - Mover entrada a papelera
5. ✅ **Restaurar** - Recuperar entrada de papelera
6. ✅ **Exportar** - Exportar a JSON y TXT
7. ✅ **Imágenes** - Subir y visualizar imágenes
8. ✅ **Audio** - Grabar y reproducir audio
9. ✅ **Modo offline** - Editar sin conexión
10. ✅ **Buscar** - Buscar con índice local

### Uso del Hook

```typescript
import { useQAChecklist } from '@state/dev/qaChecklist';

function Component() {
  const { items, toggle, reset, progress } = useQAChecklist();
  
  // Marcar item como completado/pendiente
  toggle('create-entry');
  
  // Resetear todos los items
  reset();
  
  // Ver progreso
  console.log(progress);
  // { completed: 3, total: 10, percentage: 30 }
}
```

---

## 🖥️ Diagnostics Screen

### Acceso

**Triple-tap en el título "Journal"** en la pantalla principal del diario.

### Tabs

#### 1. Overview
- Estado de conectividad (online/offline, tipo de red, IP)
- Detección de emuladores de Firebase
- Progreso del QA checklist (X de 10 completados)

#### 2. Metrics
- **Counters**: tabla con todas las métricas de contadores
- **Timers**: tabla con p50, p95 y last (último valor)

#### 3. Logs
- Filtro por nivel: All, Debug, Info, Warn, Error
- Últimos 100 logs mostrados
- Botón "Clear logs" para limpiar
- Pull-to-refresh para actualizar

#### 4. QA
- Lista de 10 items del checklist con switches
- Botón "Reset All" para marcar todos como pendientes
- Persistencia automática en AsyncStorage

### Uso

1. Abrir la app
2. Navegar a la pantalla principal de Journal
3. Hacer **triple-tap rápido** en el título "Journal"
4. Se abrirá la pantalla de Diagnostics

---

## 🔍 Testing Manual

### Checklist de Funcionalidad

Use la pantalla de Diagnostics para llevar un registro de las pruebas manuales:

1. **Crear entrada**
   - Abrir editor nuevo
   - Escribir contenido
   - Seleccionar mood
   - Guardar
   - Verificar que aparece en la lista

2. **Editar entrada**
   - Abrir entrada existente
   - Modificar contenido/mood/tags
   - Guardar
   - Verificar cambios

3. **Marcar favorito**
   - Abrir detalle de entrada
   - Tap en estrella
   - Verificar que aparece en Favoritos

4. **Eliminar**
   - Swipe left en entrada
   - Tap en 🗑️
   - Verificar que se mueve a Papelera

5. **Restaurar**
   - Ir a Papelera
   - Tap en "Restaurar"
   - Verificar que vuelve a lista principal

6. **Exportar**
   - Tap en 📦 en lista
   - Exportar a JSON y TXT
   - Verificar que se comparte correctamente

7. **Imágenes**
   - Abrir editor
   - Agregar 1-4 imágenes
   - Guardar
   - Verificar preview y fullscreen

8. **Audio**
   - Abrir editor
   - Grabar audio (5-10 segundos)
   - Guardar
   - Reproducir en detalle

9. **Modo offline**
   - Activar modo avión
   - Editar entrada
   - Verificar que se guarda localmente
   - Desactivar modo avión
   - Volver a guardar
   - Verificar sincronización

10. **Buscar**
    - Tap en 🔍
    - Buscar texto parcial
    - Verificar resultados con highlighting

### Verificación de Métricas

Después de completar el checklist, revisar la tab **Metrics** en Diagnostics:

- **Counters**: deben reflejar las operaciones realizadas
- **Timers**: deben mostrar p50/p95 razonables
  - `save.remote`: ~500ms - 2s
  - `image.upload`: ~1s - 5s
  - `audio.upload`: ~500ms - 3s
  - `export`: ~100ms - 1s

### Verificación de Logs

Revisar la tab **Logs** en Diagnostics:

- Filtrar por nivel "Error"
- No debe haber errores inesperados
- Errores de red esperados en modo offline

---

## 🚀 Performance Tips

### Optimizaciones Implementadas

1. **Logger**
   - Buffer circular con límite de 500 entries
   - Persist cada 10 logs o 5 segundos (evita escrituras constantes)
   - Console sink solo en `__DEV__`

2. **Metrics**
   - Todo en memoria (cero I/O durante operación normal)
   - Histogramas con ventana de 200 samples
   - Cálculo de percentiles bajo demanda

3. **QA Checklist**
   - AsyncStorage solo en toggle/reset (no en cada render)
   - Estado local para UI responsiva

### Red Flags

Si encuentras alguno de estos, reportar:

- Timers con p95 > 10s
- Más de 10 errores del mismo tipo en Logs
- App lenta después de usar Diagnostics
- Crashes al abrir Diagnostics Screen

---

## 📦 Persistencia

### AsyncStorage Keys

- `ej.logs.v1` - Buffer circular de logs
- `ej.qa.v1` - Estado del QA checklist

### Limpiar Datos

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Limpiar logs
await AsyncStorage.removeItem('ej.logs.v1');

// Limpiar QA checklist
await AsyncStorage.removeItem('ej.qa.v1');
```

---

## 🛠️ Extensión

### Agregar Nuevos Counters

1. Editar `src/lib/diagnostics/metrics.ts`
2. Agregar key a `CounterKey` type
3. Usar con `metrics.inc('tu.nuevo.counter')`

### Agregar Nuevos Timers

1. Editar `src/lib/diagnostics/metrics.ts`
2. Agregar key a `TimerKey` type
3. Usar con `metrics.time('tu.nuevo.timer', async () => {...})`

### Agregar Items al QA Checklist

1. Editar `src/state/dev/qaChecklist.ts`
2. Agregar nuevo objeto a `DEFAULT_ITEMS`
3. El hook detectará automáticamente nuevos items

---

## 📚 Referencias

- **Logger**: Inspirado en Winston y Pino (Node.js loggers)
- **Metrics**: Basado en StatsD/Prometheus patterns
- **QA Checklist**: Pattern común en testing de QA manual

---

## 🎭 Modo Invitado y Guest Outbox

### Descripción

La app soporta **modo invitado** completo: usuarios sin autenticación pueden crear y editar entradas. Todo se guarda localmente en AsyncStorage y se marca para sincronización futura.

### Módulos

- **guestOutbox.ts**: Queue persistente de borradores
- **guestSync.ts**: Sistema de sincronización automática
- **useJournalDraft**: Detección de modo invitado

### Flujo

1. **Usuario invitado crea entrada**
   - Se guarda en AsyncStorage (borrador)
   - Se agrega al outbox (cola de sincronización)
   - UI muestra: "Guardado localmente — inicia sesión para sincronizar"

2. **Usuario inicia sesión**
   - `onUserLogin(userId)` se llama automáticamente
   - Outbox se drena (hasta 3 reintentos con backoff)
   - Entradas se suben a Firestore
   - Items exitosos se eliminan del outbox
   - Items fallidos permanecen para retry

### API de Guest Outbox

```typescript
import { 
  addGuestDraft, 
  listGuestDrafts, 
  clearGuestDraft, 
  countGuestDrafts 
} from '@features/journal/guestOutbox';

// Agregar borrador
await addGuestDraft({
  localId: 'new',
  kind: 'create',
  payload: draft,
  savedAt: Date.now(),
});

// Listar pendientes
const drafts = await listGuestDrafts();

// Contar pendientes
const count = await countGuestDrafts();
```

### API de Guest Sync

```typescript
import { 
  syncGuestOutbox, 
  onUserLogin 
} from '@features/journal/guestSync';

// En tu flujo de login
async function handleLogin(userId: string) {
  // ... tu lógica de auth
  
  // Sincronizar outbox
  await onUserLogin(userId);
}

// Ver resultado
const result = await syncGuestOutbox(userId);
console.log(result);
// { total: 5, synced: 5, failed: 0, errors: [] }
```

### AsyncStorage Keys

- `ej.guest.outbox.v1` - Queue de borradores de invitado

### Verificar Outbox en Diagnostics

1. Triple-tap en "Journal" → Diagnostics
2. Tab "Logs" → filtrar por tag `sync`
3. Buscar mensajes "Guest outbox: ..."

---

**Última actualización**: Prompt #12A - Octubre 2025
