# 🔧 Troubleshooting - Problemas Resueltos

Este documento registra problemas encontrados durante el desarrollo y sus soluciones.

---

## ❌ Error: Worklets Mismatch (RESUELTO)

### Síntomas
```
ERROR  [WorkletsError: [Worklets] Mismatch between JavaScript part and native part of Worklets (0.6.1 vs 0.5.1).
See https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting#mismatch-between-javascript-part-and-native-part-of-worklets for more details.]

ERROR  [TypeError: Cannot read property 'makeMutable' of undefined]
```

### Causa
- Se instaló manualmente `react-native-worklets-core@^1.6.2` como dependencia directa
- `react-native-reanimated@~4.1.1` requiere `react-native-worklets@0.5.1` específicamente
- Expo Go en el simulador tiene la versión nativa 0.5.1, pero JavaScript intentaba usar 0.6.1
- Incompatibilidad entre versiones JS y nativa

### Solución

#### 1. Desinstalar react-native-worklets-core manual
```bash
npm uninstall react-native-worklets-core
```

#### 2. Instalar react-native-worklets con Expo CLI
```bash
npx expo install react-native-reanimated react-native-worklets
```

Esto instala las versiones correctas compatibles con Expo SDK 54:
- `react-native-reanimated@~4.1.1`
- `react-native-worklets@0.5.1`

#### 3. Actualizar react-native-safe-area-context
```bash
npx expo install react-native-safe-area-context
```

Actualiza a `~5.6.0` (la versión correcta para SDK 54)

#### 4. Limpiar cachés completamente
```bash
rm -rf .expo node_modules/.cache node_modules
npm install
npx expo start --clear
```

### Resultado
✅ Error resuelto completamente. La app ahora carga sin errores de Worklets.

### Lección Aprendida
- **NUNCA instalar `react-native-worklets-core` manualmente**
- **SIEMPRE usar `npx expo install` para paquetes nativos**
- Expo maneja las versiones correctas automáticamente
- `react-native-reanimated` incluye `react-native-worklets` como dependencia

---

## ⚠️ Warning: Firebase Auth sin AsyncStorage

### Síntoma
```
WARN  @firebase/auth: Auth (12.4.0): 
You are initializing Firebase Auth for React Native without providing AsyncStorage. 
Auth state will default to memory persistence and will not persist between sessions.
```

### Causa
- Firebase Auth no está configurado con persistencia AsyncStorage
- El estado de autenticación se pierde al cerrar la app

### Solución (PENDIENTE)
Actualizar `src/lib/firebase.ts`:

```typescript
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// En lugar de getAuth(app)
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
```

**Estado**: ⏳ No implementado todavía (AsyncStorage ya está instalado)

---

## ⚠️ Warning: expo-av Deprecado

### Síntoma
```
WARN  [expo-av]: Expo AV has been deprecated and will be removed in SDK 54. 
Use the `expo-audio` and `expo-video` packages to replace the required functionality.
```

### Causa
- `expo-av` está deprecado en Expo SDK 54
- Usamos `expo-av` para grabación de audio en `useAudioRecorder.ts`
- Será removido en versiones futuras

### Solución Propuesta (PENDIENTE)

#### Migración a expo-audio

**Instalar:**
```bash
npx expo install expo-audio
```

**Actualizar `useAudioRecorder.ts`:**
```typescript
// Antes (expo-av)
import { Audio } from 'expo-av';

// Después (expo-audio)
import { 
  useAudioRecorder, 
  AudioModule,
  RecordingPresets 
} from 'expo-audio';
```

**Cambios de API:**
- `Audio.Recording` → `useAudioRecorder()` hook
- `Audio.requestPermissionsAsync()` → `AudioModule.requestRecordingPermissionsAsync()`
- `Audio.RecordingOptionsPresets.HIGH_QUALITY` → `RecordingPresets.HIGH_QUALITY`
- `Sound.createAsync()` → `useAudioPlayer()` hook

**Estado**: ⏳ No implementado todavía (funciona con expo-av por ahora)

**Prioridad**: Media (expo-av funciona en SDK 54, pero se debe migrar antes de SDK 55)

---

## ⚠️ Warning: SafeAreaView Deprecado

### Síntoma
```
WARN  SafeAreaView has been deprecated and will be removed in a future release. 
Please use 'react-native-safe-area-context' instead.
```

### Causa
- Algún componente o librería está usando el `SafeAreaView` nativo de React Native
- Ya tenemos `react-native-safe-area-context@~5.6.0` instalado

### Solución
Buscar usos de `SafeAreaView` de React Native y reemplazarlos:

```bash
grep -r "from 'react-native'" src/ | grep SafeAreaView
```

Reemplazar con:
```typescript
// Antes
import { SafeAreaView } from 'react-native';

// Después
import { SafeAreaView } from 'react-native-safe-area-context';
```

**Estado**: ⏳ Pendiente de verificación (puede venir de alguna dependencia)

---

## 📋 Checklist de Compatibilidad Expo SDK 54

- [x] `react-native@0.81.4`
- [x] `react-native-reanimated@~4.1.1`
- [x] `react-native-worklets@0.5.1`
- [x] `react-native-safe-area-context@~5.6.0`
- [x] `expo@~54.0.13`
- [ ] Migrar `expo-av` → `expo-audio` (pendiente)
- [ ] Configurar Firebase Auth con AsyncStorage (pendiente)
- [ ] Verificar SafeAreaView deprecated (pendiente)

---

## 🛠️ Comandos Útiles

### Limpiar cachés completamente
```bash
rm -rf .expo node_modules/.cache
npx expo start --clear
```

### Reinstalar todas las dependencias
```bash
rm -rf node_modules package-lock.json
npm install
```

### Verificar versiones de paquetes nativos
```bash
npm list react-native-reanimated
npm list react-native-worklets
npm list react-native-safe-area-context
```

### Instalar paquete con versión compatible de Expo
```bash
npx expo install <package-name>
```

### Ver logs detallados
```bash
npx expo start --clear --ios --dev-client
```

---

## 📚 Referencias

- [Expo SDK 54 Release Notes](https://expo.dev/changelog/2024/12-17-sdk-54)
- [React Native Reanimated Docs](https://docs.swmansion.com/react-native-reanimated/)
- [Worklets Troubleshooting](https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting)
- [expo-audio Migration Guide](https://docs.expo.dev/versions/latest/sdk/audio/)
- [Firebase Auth Persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence)

---

## 💡 Buenas Prácticas

1. **Siempre usar `npx expo install`** para dependencias nativas
2. **Mantener Expo Go actualizado** en simulador/dispositivo
3. **Limpiar cachés** cuando hay problemas de versiones
4. **Verificar compatibilidad** con Expo SDK antes de actualizar paquetes
5. **No instalar manualmente** paquetes que son dependencias de otros (como worklets-core)
6. **Documentar problemas y soluciones** en este archivo

---

_Última actualización: 18 de octubre de 2025_
