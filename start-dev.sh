#!/bin/bash

# Script para iniciar todos los servicios necesarios para el desarrollo
# Emotional Journal App - Modo Desarrollo Completo

set -e  # Detener si hay error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Emotional Journal - Inicio de Desarrollo${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Debes ejecutar este script desde el directorio raíz del proyecto${NC}"
    exit 1
fi

# Verificar que firebase-tools está instalado
if ! command -v firebase &> /dev/null; then
    echo -e "${YELLOW}⚠️  firebase-tools no está instalado globalmente${NC}"
    echo -e "${BLUE}📦 Instalando firebase-tools...${NC}"
    npm install -g firebase-tools
fi

# Verificar dependencias de la app
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Instalando dependencias de la app...${NC}"
    npm install
fi

# Verificar dependencias de functions
if [ ! -d "functions/node_modules" ]; then
    echo -e "${YELLOW}📦 Instalando dependencias de Cloud Functions...${NC}"
    cd functions
    npm install
    cd ..
fi

# Compilar Cloud Functions
echo -e "${BLUE}🔨 Compilando Cloud Functions...${NC}"
cd functions
npm run build
cd ..

echo -e "${GREEN}✅ Compilación exitosa${NC}\n"

# Crear directorio para logs si no existe
mkdir -p .logs

# Función para matar procesos al salir
cleanup() {
    echo -e "\n${YELLOW}🛑 Deteniendo servicios...${NC}"
    kill $FIREBASE_PID 2>/dev/null || true
    echo -e "${GREEN}✅ Servicios detenidos${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🚀 Iniciando servicios backend...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Iniciar Firebase Emulators (con import/export para persistencia)
echo -e "${BLUE}🔥 Iniciando Firebase Emulators (persistencia habilitada)...${NC}"
firebase emulators:start --import="./.firebase-data" --export-on-exit > .logs/firebase-emulators.log 2>&1 &
FIREBASE_PID=$!

# Esperar a que los emuladores estén listos
echo -e "${YELLOW}⏳ Esperando a que los emuladores estén listos...${NC}"
sleep 10

# Verificar que los emuladores iniciaron correctamente
if ! kill -0 $FIREBASE_PID 2>/dev/null; then
    echo -e "${RED}❌ Error: Firebase Emulators no pudieron iniciar${NC}"
    echo -e "${YELLOW}📋 Revisa los logs en .logs/firebase-emulators.log${NC}"
    tail -20 .logs/firebase-emulators.log
    exit 1
fi

echo -e "${GREEN}✅ Firebase Emulators iniciados${NC}"
echo -e "${BLUE}   📍 UI: http://localhost:4000${NC}"
echo -e "${BLUE}   📍 Auth: http://localhost:9099${NC}"
echo -e "${BLUE}   📍 Firestore: http://localhost:8080${NC}"
echo -e "${BLUE}   📍 Functions: http://localhost:5001${NC}\n"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Servicios backend corriendo${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${GREEN}🔥 SERVICIOS:${NC}"
echo -e "   UI Dashboard: ${BLUE}http://localhost:4000${NC}"
echo -e "   Auth Emulator: ${BLUE}http://localhost:9099${NC}"
echo -e "   Firestore Emulator: ${BLUE}http://localhost:8080${NC}"
echo -e "   Functions Emulator: ${BLUE}http://localhost:5001${NC}\n"

echo -e "${GREEN}📊 LOGS:${NC}"
echo -e "   Ver logs: ${BLUE}tail -f .logs/firebase-emulators.log${NC}\n"

echo -e "${YELLOW}💡 SIGUIENTE PASO:${NC}"
echo -e "   Abre una nueva terminal y ejecuta:"
echo -e "   ${GREEN}npm start${NC}  o  ${GREEN}npx expo start${NC}\n"

echo -e "${GREEN}🔮 USAR GRAFO 3D:${NC}"
echo -e "   1. Inicia la app: ${GREEN}npm start${NC}"
echo -e "   2. Ve al módulo ${BLUE}Descubrir${NC}"
echo -e "   3. Crea algunas entradas en tu diario"
echo -e "   4. Click en ${GREEN}✨ Generar Nuevo Grafo${NC}"
echo -e "   5. Click en ${GREEN}🔮 Ver Grafo 3D de Patrones${NC}\n"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Presiona Ctrl+C para detener los servicios${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Mantener el script corriendo y mostrar logs en tiempo real
tail -f .logs/firebase-emulators.log &
TAIL_PID=$!

# Esperar indefinidamente
wait $FIREBASE_PID
