# Emotional Journal (Soporte Emocional)

Aplicación móvil de soporte emocional construida con React Native (Expo), TypeScript, Tailwind (NativeWind) y Firebase (SDK modular). Incluye navegación con React Navigation, estado global con Zustand y utilidades listas para escalar.

## Requisitos

- Node.js LTS (18 o 20 recomendado)
- npm (o pnpm/yarn)
- Expo (no requiere instalación global): usamos `npx expo`
- iOS (opcional): Xcode + simulador
- Android (opcional): Android Studio + emulador
- Firebase CLI (opcional, para desplegar reglas): `npm i -g firebase-tools`

## Inicio rápido

1. Instalar dependencias

```bash
npm i
```

2. Arrancar el bundler

```bash
npm run dev
```

3. Ejecutar en una plataforma

- iOS: `npm run ios`
- Android: `npm run android`
- Web: `npm run web`

## Scripts disponibles

- `dev`: inicia Expo
- `ios` / `android` / `web`: abre el proyecto en cada plataforma
- `lint`: ejecuta ESLint con soporte para TS/TSX
- `format`: verifica formato con Prettier (modo check)
- `format:write`: re-formatea el código con Prettier (modo write)
- `rules:deploy`: despliega reglas de Firestore y Storage a Firebase

## Estructura del proyecto

```
src/
├─ components/           # UI atómica (Button, Input, Text, Header, Screen)
├─ hooks/                # Hooks personalizados (useOnline, useAppearance)
├─ lib/                  # Integraciones (firebase/ auth, firestore, storage)
├─ navigation/           # React Navigation (stacks, tabs, linking, tipos)
├─ screens/              # Pantallas por módulo (Journal, Discover, Chat, Auth)
├─ state/                # Zustand store y slices
├─ theme/                # Tokens y colores
└─ utils/                # Logger, env, result, error mapper
```

## Configuración de Firebase

Las credenciales están definidas en `app.json` bajo `expo.extra.firebase`. No publiques credenciales sensibles en repositorios públicos.

- Inicialización: `src/lib/firebase/firebaseApp.ts`
- Utilidades de Auth/Firestore/Storage: `src/lib/firebase/{auth,firestore,storage}.ts`
- Reglas: `firebase/firestore.rules`, `firebase/storage.rules`

### Emuladores y reglas

- Toggle de emuladores: bandera `useFirebaseEmulators` en `app.json` (leída en `firebaseApp.ts`).
- Despliegue de reglas:

```bash
npm run rules:deploy
```

Asegúrate de haber iniciado sesión con `firebase login` y tener el proyecto apuntando al ID correcto.

## Convenciones de código

- TypeScript estricto
- Tailwind via NativeWind (`className` en componentes RN)
- Aliases de importación: `@components`, `@navigation`, `@screens`, `@state`, `@utils`, `@hooks`, `@theme`, `@lib`, `@types`
- Logger simple en `src/utils/logger.ts`

## SVG e íconos

Para SVGs, usa `react-native-svg` directamente o componentes de `@expo/vector-icons`:

```tsx
import { Feather } from '@expo/vector-icons';

export function Example() {
  return <Feather name="heart" size={24} color="black" />;
}
```

Para SVGs personalizados, puedes usar `react-native-svg` con componentes Path/Circle/etc. La configuración de `react-native-svg-transformer` se omitió intencionalmente por compatibilidad con Expo SDK 54.

## Solución de problemas

- Limpiar caché de Metro/Expo:

```bash
npx expo start -c
```

- Errores de Babel/aliases: revisa `babel.config.js` y limpia caché. Asegura no duplicar presets/plugins.
- Errores de tipo con SVG: comprueba `src/types/svg.d.ts` esté presente y que `react-native-svg` y el transformer estén instalados.

## Notas

- Este repo no incluye autenticación real aún. Existe un `AuthGate` (stub) para proteger rutas futuramente.
- Mantén las credenciales fuera del control de versiones público.
