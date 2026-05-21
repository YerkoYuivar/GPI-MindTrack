#!/bin/bash
# Script de limpieza completa para resolver problemas de cache y bloqueos
# Uso: ./clean-restart.sh

echo "🧹 Limpiando proyecto Emotional Journal..."
echo ""

# 1. Detener Metro si está corriendo
echo "1️⃣ Deteniendo procesos de Metro y Expo..."
pkill -f "expo start" 2>/dev/null || true
pkill -f "react-native start" 2>/dev/null || true
sleep 1

# 2. Limpiar cachés de Watchman (si está instalado)
if command -v watchman &> /dev/null; then
    echo "2️⃣ Limpiando Watchman cache..."
    watchman watch-del-all 2>/dev/null || true
else
    echo "2️⃣ Watchman no instalado, saltando..."
fi

# 3. Limpiar cachés de React Native y Metro
echo "3️⃣ Limpiando cachés de React Native..."
rm -rf $TMPDIR/react-* 2>/dev/null || true
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/haste-* 2>/dev/null || true

# 4. Limpiar cache de Expo
echo "4️⃣ Limpiando caché de Expo..."
rm -rf ~/.expo/web-cache 2>/dev/null || true
rm -rf .expo 2>/dev/null || true

# 5. Limpiar node_modules y reinstalar (opcional pero recomendado)
echo "5️⃣ ¿Deseas reinstalar node_modules? (s/N)"
read -t 5 -n 1 reinstall
echo ""
if [[ $reinstall =~ ^[Ss]$ ]]; then
    echo "   Eliminando node_modules..."
    rm -rf node_modules
    echo "   Reinstalando dependencias..."
    npm install
else
    echo "   Saltando reinstalación de node_modules"
fi

# 6. Limpiar builds de iOS (si existen)
if [ -d "ios" ]; then
    echo "6️⃣ Limpiando build de iOS..."
    rm -rf ios/build 2>/dev/null || true
    rm -rf ios/Pods 2>/dev/null || true
    rm -rf ~/Library/Developer/Xcode/DerivedData/* 2>/dev/null || true
else
    echo "6️⃣ No hay carpeta iOS, saltando..."
fi

# 7. Limpiar builds de Android (si existen)
if [ -d "android" ]; then
    echo "7️⃣ Limpiando build de Android..."
    cd android && ./gradlew clean 2>/dev/null || true
    cd ..
    rm -rf android/build 2>/dev/null || true
    rm -rf android/app/build 2>/dev/null || true
else
    echo "7️⃣ No hay carpeta Android, saltando..."
fi

# 8. Limpiar cache de Metro Bundler
echo "8️⃣ Limpiando Metro Bundler cache..."
rm -rf .metro 2>/dev/null || true

echo ""
echo "✅ Limpieza completada!"
echo ""
echo "📱 Para iniciar la app con cache limpio, ejecuta:"
echo "   expo start -c"
echo ""
echo "O para un reset más agresivo:"
echo "   expo start --clear"
echo ""
