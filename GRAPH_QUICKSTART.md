# Guía Rápida: Usar el Grafo 3D de Patrones

## ✅ Ya está integrado en la app

El grafo 3D ya está completamente integrado en el módulo Descubrir. Sigue estos pasos:

## 🚀 Pasos para Usar

### 1. Desplegar Cloud Function (Una vez)

```bash
# Compilar functions
cd functions
npm run build

# Desplegar solo la función de grafo
firebase deploy --only functions:generateGraph

# O desplegar todas las functions
firebase deploy --only functions
```

### 2. Actualizar Reglas de Firestore (Una vez)

```bash
# Las reglas ya están actualizadas en firebase/firestore.rules
firebase deploy --only firestore:rules
```

### 3. Usar en la App

1. **Abre la app** y navega al módulo **Descubrir**
2. Verás **3 botones**:
   - 📊 Ver Dashboard con Gráficas (existente)
   - 🔮 Ver Grafo 3D de Patrones (nuevo - ver grafo)
   - ✨ Generar Nuevo Grafo (nuevo - generar/actualizar)

3. **Primera vez**: Click en "✨ Generar Nuevo Grafo"
   - Requiere estar autenticado
   - Requiere conexión a internet
   - Requiere tener al menos una entrada en el diario
   - Tarda 1-3 segundos

4. **Ver el Grafo**: Click en "🔮 Ver Grafo 3D de Patrones"
   - Muestra visualización 3D interactiva
   - Usa gestos táctiles:
     - 🤏 Pinch para zoom
     - 🔄 Dos dedos para rotar
     - 👆 Un dedo para mover
   - Tap en nodos para ver detalles

## 🔧 Desarrollo Local (Emuladores)

Si quieres probar sin desplegar:

```bash
# Terminal 1: Iniciar emuladores
firebase emulators:start

# Terminal 2: Correr la app
npm start
```

**Importante**: Asegúrate que `USE_EMULATORS=true` en tu configuración local.

## 📊 Qué Analiza el Sistema

El analizador de patrones detecta automáticamente:

- **Emociones**: ansiedad, alegría, tristeza, miedo, estrés, calma, etc.
- **Actividades**: trabajo, ejercicio, meditación, dormir, leer, etc.
- **Triggers**: deadline, conflicto, cambio, pérdida, presión, etc.

### Colores del Grafo

- 🟣 Morado: Emociones
- 🔵 Azul: Actividades  
- 🟢 Verde: Personas
- 🟠 Naranja: Lugares
- 🔴 Rojo: Triggers

## ⚠️ Troubleshooting

### "No hay grafo generado"
**Solución**: Click en "✨ Generar Nuevo Grafo"

### "Error generando grafo: unauthenticated"
**Solución**: Inicia sesión en la app primero

### "Error generando grafo: internal"
**Causas posibles**:
1. No tienes entradas en el diario → Crea al menos 3-5 entradas
2. Cloud Function no está desplegada → `firebase deploy --only functions:generateGraph`
3. Reglas de Firestore incorrectas → `firebase deploy --only firestore:rules`

### El grafo se ve vacío
**Solución**: Escribe más entradas con contenido relevante (emociones, actividades)

### No veo la pantalla del grafo 3D
**Verificar**:
1. ¿Actualizaste la navegación? → Ver `src/navigation/DiscoverStack.tsx`
2. ¿Se compiló correctamente? → Revisa errores de TypeScript
3. ¿Reiniciaste la app? → Ctrl+C y `npm start`

### "Necesitas estar conectado para generar el grafo"
**Solución**: Conéctate a internet. La generación del grafo requiere llamar a Cloud Functions.

## 🎨 Personalización Rápida

### Añadir nuevos patrones a detectar

Edita `functions/src/analyzers/patternAnalyzer.ts`:

```typescript
const EMOTION_PATTERNS = [
  'ansiedad', 'alegría', // ... añade más
  'tu_nueva_emocion',
];
```

Luego redespliega:
```bash
cd functions && npm run build && firebase deploy --only functions:generateGraph
```

### Cambiar colores del grafo

Edita `src/hooks/useGraphData.ts`:

```typescript
const PATTERN_COLORS = {
  emotion: '#8B5CF6', // Cambia este color
  // ...
};
```

## 📈 Próximos Pasos (Opcionales)

1. **Auto-generación**: Generar el grafo automáticamente cada N entradas
2. **Integración con IA**: Usar Claude API para análisis más avanzado
3. **Compartir insights**: Exportar patrones como reporte
4. **Recomendaciones**: Sugerir acciones basadas en patrones

## 📞 Archivos de Referencia

- Documentación completa: `GRAPH_3D_README.md`
- Ejemplos de código: `src/examples/graphIntegration.example.tsx`
- Resumen implementación: `IMPLEMENTATION_SUMMARY.md`

---

**¿Listo?** Ve al módulo Descubrir y haz click en "✨ Generar Nuevo Grafo" 🚀
