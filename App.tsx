import 'react-native-gesture-handler';
import './global.css';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import RootNavigator from '@navigation/RootNavigator';
import { logger } from './src/lib/diagnostics/logger';

// Captura global de errores de imágenes con URIs inválidos
if (__DEV__) {
  const originalWarn = console.warn;
  const originalError = console.error;

  // Interceptar warnings para detectar errores de imagen
  console.warn = (...args: any[]) => {
    const message = args[0]?.toString?.() || '';

    // Detectar el error específico de URIs inválidos
    if (message.includes('No suitable URL request handler')) {
      console.error('[IMAGE URI ERROR DETECTED]', {
        message,
        args,
        stack: new Error().stack,
        timestamp: new Date().toISOString(),
      });

      logger.error('Image URI error detected', {
        message,
        args: JSON.stringify(args)
      }, 'app');
    }

    originalWarn(...args);
  };

  // También capturar errores de RCTImageLoader
  console.error = (...args: any[]) => {
    const message = args[0]?.toString?.() || '';

    if (message.includes('RCTImageLoader') || message.includes('loadURLRequest')) {
      console.log('[IMAGE LOADER ERROR]', {
        message,
        args,
        stack: new Error().stack,
        timestamp: new Date().toISOString(),
      });

      logger.error('Image loader error', {
        message,
        args: JSON.stringify(args)
      }, 'app');
    }

    originalError(...args);
  };
}

// Componente interno que usa el tema para el StatusBar
function AppContent() {
  const { isDark } = useTheme();

  // Inicializar logger al arranque
  useEffect(() => {
    logger.init({
      key: 'ej.logs.v1',
      max: 500,
      consoleSink: __DEV__
    });
    logger.info('App started', { version: '1.0.0' }, 'app');

    if (__DEV__) {
      logger.info('Image URI error tracking enabled', {}, 'app');
    }
  }, []);

  return (
    <>
      <RootNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
