/**
 * ThemeContext
 * 
 * Contexto global para el manejo de tema claro/oscuro.
 * Persiste la preferencia del usuario en AsyncStorage.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tipos
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  // Fondos
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  card: string;
  
  // Texto
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  
  // Bordes y separadores
  border: string;
  borderLight: string;
  separator: string;
  
  // Marca
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  // Estados
  success: string;
  warning: string;
  danger: string;
  info: string;
  
  // Componentes específicos
  tabBar: string;
  tabBarBorder: string;
  inputBackground: string;
  overlay: string;
  
  // Iconos
  icon: string;
  iconSecondary: string;
}

// Colores para modo claro
const lightColors: ThemeColors = {
  background: '#F9FAFB',
  backgroundSecondary: '#FFFFFF',
  backgroundTertiary: '#F3F4F6',
  card: '#FFFFFF',
  
  text: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',
  
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  separator: '#E5E7EB',
  
  primary: '#7C3AED',
  primaryLight: '#A78BFA',
  primaryDark: '#5B21B6',
  
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  
  tabBar: 'rgba(255, 255, 255, 0.75)',
  tabBarBorder: 'rgba(255, 255, 255, 0.5)',
  inputBackground: '#F3F4F6',
  overlay: 'rgba(0, 0, 0, 0.5)',
  
  icon: '#374151',
  iconSecondary: '#6B7280',
};

// Colores para modo oscuro
const darkColors: ThemeColors = {
  background: '#0F172A',
  backgroundSecondary: '#1E293B',
  backgroundTertiary: '#334155',
  card: '#1E293B',
  
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  textInverse: '#0F172A',
  
  border: '#334155',
  borderLight: '#1E293B',
  separator: '#334155',
  
  primary: '#A78BFA',
  primaryLight: '#C4B5FD',
  primaryDark: '#7C3AED',
  
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  info: '#60A5FA',
  
  tabBar: 'rgba(30, 41, 59, 0.85)',
  tabBarBorder: 'rgba(51, 65, 85, 0.5)',
  inputBackground: '#334155',
  overlay: 'rgba(0, 0, 0, 0.7)',
  
  icon: '#E2E8F0',
  iconSecondary: '#94A3B8',
};

// Clave de almacenamiento
const THEME_STORAGE_KEY = '@emotional_journal_theme';

// Tipo del contexto
interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Cargar preferencia guardada al iniciar
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Guardar cuando cambia el modo
  useEffect(() => {
    if (isLoaded) {
      saveThemePreference(mode);
    }
  }, [mode, isLoaded]);

  const loadThemePreference = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
        setMode(savedMode as ThemeMode);
      }
    } catch (error) {
      console.warn('Error loading theme preference:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveThemePreference = async (themeMode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch (error) {
      console.warn('Error saving theme preference:', error);
    }
  };

  const setThemeMode = (newMode: ThemeMode) => {
    setMode(newMode);
  };

  const toggleTheme = () => {
    setMode(current => {
      if (current === 'light') return 'dark';
      if (current === 'dark') return 'light';
      // Si está en 'system', cambia al opuesto del sistema actual
      return systemColorScheme === 'dark' ? 'light' : 'dark';
    });
  };

  // Determinar si el tema efectivo es oscuro
  const isDark = useMemo(() => {
    if (mode === 'system') {
      return systemColorScheme === 'dark';
    }
    return mode === 'dark';
  }, [mode, systemColorScheme]);

  // Seleccionar paleta de colores
  const colors = useMemo(() => {
    return isDark ? darkColors : lightColors;
  }, [isDark]);

  const value = useMemo(() => ({
    mode,
    isDark,
    colors,
    setThemeMode,
    toggleTheme,
  }), [mode, isDark, colors]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook para acceder al tema
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Hook de conveniencia para solo obtener los colores
 */
export function useColors(): ThemeColors {
  const { colors } = useTheme();
  return colors;
}

export { lightColors, darkColors };
