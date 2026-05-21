# 🔧 Guía de Solución - Bloqueo de App y Problemas de Cache

## 🎯 Problema Identificado

La app se quedaba en loop de carga sin mostrar errores debido a **3 problemas principales**:

### 1. **Configuración incorrecta de NativeWind v4**
- ❌ `tailwind.config.js` usaba `presets: [require('nativewind/preset')]` (sintaxis de v2/v3)
- ❌ `babel.config.js` tenía configuración duplicada con `jsxImportSource: "nativewind"`
- ✅ **Corregido**: Eliminado preset obsoleto y simplificada configuración de Babel

### 2. **Orden incorrecto de plugins en Babel**
- ❌ `react-native-reanimated/plugin` debe ser el **ÚLTIMO** plugin
- ✅ **Corregido**: Movido al final de la lista de plugins

### 3. **Cache corrupto de Metro/Expo**
- ❌ Configuración anterior generó cache inválido
- ✅ **Solución**: Script de limpieza completa

---

## ✅ Correcciones Aplicadas

### Archivo 1: `tailwind.config.js`
```diff
- presets: [require('nativewind/preset')],
+ darkMode: 'class',  // Agregado para NativeWind v4
```

### Archivo 2: `babel.config.js`
```diff
  presets: [
-   ["babel-preset-expo", { jsxImportSource: "nativewind" }],
+   'babel-preset-expo',
    'nativewind/babel',
  ],
  plugins: [
-   'react-native-reanimated/plugin',
    [
      'module-resolver',
      { ... }
    ],
+   'react-native-reanimated/plugin',  // Movido al final
  ]
```

### Archivo 3: `clean-restart.sh` (NUEVO)
Script automatizado para limpiar todos los caches.

---

## 🚀 Pasos para Resolver el Problema (IMPORTANTE)

### Paso 1: Limpiar todo el cache (OBLIGATORIO)

**Opción A - Script automatizado (RECOMENDADO):**
```bash
./clean-restart.sh
```

**Opción B - Limpiar manualmente:**
```bash
# Detener Metro
# Presiona Ctrl+C en la terminal de Metro

# Limpiar watchman (si lo tienes instalado)
watchman watch-del-all

# Limpiar caches de React Native
rm -rf $TMPDIR/react-*
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-*

# Limpiar cache de Expo
rm -rf ~/.expo/web-cache
rm -rf .expo

# Limpiar node_modules (opcional pero recomendado)
rm -rf node_modules
npm install

# Limpiar simuladores iOS (si usas iOS)
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# En Android (si usas Android)
cd android && ./gradlew clean && cd ..
```

### Paso 2: Iniciar con cache limpio

```bash
# Opción 1: Limpieza estándar
expo start -c

# Opción 2: Limpieza agresiva (si la anterior no funciona)
expo start --clear

# Opción 3: Reset completo
npx expo start --reset-cache --clear
```

### Paso 3: Verificar que carga correctamente

Deberías ver en la consola:
```
🚀 App.tsx: Componente montándose
🚀 App.tsx: useEffect inicializando logger
🔐 AuthProvider: Componente montándose
🔐 AuthContext: Iniciando listener de autenticación
🔐 AuthContext: onAuthStateChanged ejecutado
🔐 AuthContext: Finalizando carga, isLoading = false
🧭 RootNavigator: NavigationContainer listo
✅ DiscoverStack: Importado correctamente
```

---

## 🛡️ Prevenir Problemas Futuros

### 1. Siempre limpiar cache después de cambios en configuración

Cuando modifiques:
- `babel.config.js`
- `metro.config.js`
- `tailwind.config.js`
- Instalación/desinstalación de dependencias

**Ejecuta:**
```bash
expo start -c
```

### 2. Si el problema persiste después de limpieza

```bash
# 1. Borrar TODO el cache
./clean-restart.sh

# 2. Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install

# 3. Reiniciar simulador/emulador
# iOS: Cmd+D en Simulator → Reset Content and Settings
# Android: AVD Manager → Wipe Data

# 4. Iniciar de nuevo
expo start --clear
```

### 3. Uso del script de limpieza

```bash
# Ejecutar cuando:
- La app no carga y no hay errores en consola
- Después de cambiar configuración de Babel/Metro/Tailwind
- Después de instalar/actualizar dependencias
- Cuando el hot reload deja de funcionar
- Cuando aparecen errores raros de "Can't resolve..."

# Comando:
./clean-restart.sh
```

---

## 📋 Checklist de Diagnóstico

Si la app sigue sin cargar, verifica:

- [ ] ✅ Limpiaste TODO el cache (usa `./clean-restart.sh`)
- [ ] ✅ Reiniciaste Metro con `expo start -c`
- [ ] ✅ No hay errores en la terminal de Metro
- [ ] ✅ No hay errores en VS Code (revisa panel "Problems")
- [ ] ✅ `firebase.json` y `app.json` tienen configuración correcta
- [ ] ✅ El simulador/emulador está corriendo
- [ ] ✅ Ves los logs de `🚀 App.tsx` y `🔐 AuthProvider` en consola

Si todos están marcados y sigue sin funcionar:

1. Comparte los logs completos de la consola
2. Verifica `app.json` → `extra.firebase` tiene credenciales válidas
3. Revisa que no haya errores en el inspector del simulador (Cmd+D en iOS, Cmd+M en Android)

---

## 🔍 Logs de Diagnóstico

Los logs añadidos te ayudarán a identificar exactamente dónde se bloquea:

```
🚀 = App.tsx
🔐 = AuthContext
🧭 = RootNavigator
💦 = SplashScreen
✅ = Navegación/Stack cargado correctamente
```

Si ves que se detiene después de cierto emoji, ese es el punto de bloqueo.

---

## 📞 Soporte Adicional

Si después de seguir todos los pasos el problema persiste:

1. Ejecuta: `expo doctor` para verificar configuración
2. Verifica versiones de dependencias compatibles
3. Revisa que Node.js sea v18+ y npm v9+
4. Comparte logs completos desde el inicio hasta el bloqueo

---

**Fecha de última actualización:** 30 de noviembre de 2025
**Versión:** 1.0
