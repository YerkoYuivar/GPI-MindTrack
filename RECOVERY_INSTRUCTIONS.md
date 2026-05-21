# ⚠️ INSTRUCCIONES DE RECUPERACIÓN - ENTRADAS PERDIDAS

**Fecha:** 2025-01-19  
**Problema:** La migración automática eliminó entradas locales antes de subirlas correctamente a Firestore.

---

## 🚨 Estado Actual

- ✅ Migración automática **DESHABILITADA** temporalmente
- ⚠️ Entradas locales **ELIMINADAS** de AsyncStorage
- ❌ Entradas **NO están** en Firestore (migración falló)
- 📊 Resultado: **Diario vacío**

---

## 🔧 Soluciones Disponibles

### Opción 1: Recuperar desde Firestore Emulator (Si estaban guardadas)

Si las entradas se guardaron en Firestore antes de la migración:

1. **Abrir Firestore Emulator UI:**
   ```
   http://localhost:4000/firestore
   ```

2. **Navegar a:**
   ```
   journals → {tu userId} → entries
   ```

3. **Verificar si hay documentos:**
   - Si hay documentos → Las entradas están a salvo ✅
   - Si no hay documentos → Las entradas se perdieron ❌

### Opción 2: Crear Entradas de Prueba Nuevas

Ya que la migración está deshabilitada, puedes crear nuevas entradas:

1. **Abrir la app**
2. **Ir al Diario**
3. **Crear nueva entrada:**
   - Título: "Entrada de prueba 1"
   - Contenido: "Probando después del fix"
   - Mood: 7
   - Guardar

4. **Verificar:**
   - La entrada debe aparecer inmediatamente
   - NO debe tener badge "📱 Local"
   - Debe estar en Firestore

### Opción 3: Resetear Flag de Migración (Para debugging)

Si encuentras tus entradas en AsyncStorage y quieres reintentar:

```javascript
// En React Native Debugger o en el código:
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Verificar drafts locales
AsyncStorage.getAllKeys().then(keys => {
  const drafts = keys.filter(k => k.startsWith('ej.draft.'));
  console.log('Drafts encontrados:', drafts.length);
  drafts.forEach(k => console.log('  -', k));
});

// 2. Resetear flag de migración
AsyncStorage.removeItem('ej.migration.completed');

// 3. Recargar app
```

---

## 🐛 Por Qué Pasó Esto

### Problema en el Código Original

```typescript
// ❌ ANTES (src/features/journal/migrateDrafts.ts)
for (const { key, draft } of validDrafts) {
  try {
    const entryId = await createEntry(userId, payload);
    
    // ❌ PROBLEMA: Eliminaba SIEMPRE, incluso si createEntry fallaba
    await AsyncStorage.removeItem(key);
    
    migratedCount++;
  } catch (error) {
    // Solo logueaba el error, pero el draft ya fue eliminado
    logger.error('Failed to migrate draft', { key, error });
  }
}

// ❌ PROBLEMA 2: Marcaba como completado SIEMPRE
await AsyncStorage.setItem(MIGRATION_FLAG_KEY, userId);
```

### Fix Aplicado

```typescript
// ✅ DESPUÉS
for (const { key, draft } of validDrafts) {
  try {
    const entryId = await createEntry(userId, payload);
    
    // ✅ Solo eliminar SI createEntry devolvió un ID
    if (entryId) {
      await AsyncStorage.removeItem(key);
      migratedCount++;
    } else {
      logger.warn('createEntry returned no ID, keeping local draft');
      errors.push(key);
    }
  } catch (error) {
    logger.error('Failed to migrate draft', { key, error });
    errors.push(key);
  }
}

// ✅ Solo marcar como completado si NO hubo errores
if (errors.length === 0) {
  await AsyncStorage.setItem(MIGRATION_FLAG_KEY, userId);
}
```

---

## 📋 Checklist de Verificación

Antes de re-habilitar la migración automática:

- [ ] Verificar que `createEntry()` funciona correctamente
- [ ] Confirmar que el usuario está autenticado (`userId` válido)
- [ ] Probar crear entrada manual en Firestore
- [ ] Verificar logs en consola (buscar errores de Firebase)
- [ ] Confirmar que emuladores están corriendo
- [ ] Verificar en Firestore UI que las entradas se guardan

---

## 🔄 Re-habilitar Migración (Cuando esté lista)

**Archivo:** `src/features/journal/useMigrateDrafts.ts`

**Cambio:**

```typescript
// Buscar la sección comentada:
// ⚠️ COMENTADO: No ejecutar migración automáticamente por ahora
logger.warn('Migration available but disabled...');
return;

// // Ejecutar migración
// setMigrating(true);
// ...

// PASO 1: Eliminar el `return;`
// PASO 2: Descomentar todo el bloque de migración
// PASO 3: Probar con UNA entrada de prueba primero
```

---

## 📞 Próximos Pasos

1. **Verificar Firestore Emulator** - ¿Hay entradas guardadas?
2. **Crear entradas de prueba** - Confirmar que el sistema funciona
3. **Revisar logs** - Buscar errores de `createEntry()`
4. **Cuando esté estable** - Re-habilitar migración con cuidado

---

**Lamento el inconveniente. He deshabilitado la migración para prevenir más pérdida de datos.**
