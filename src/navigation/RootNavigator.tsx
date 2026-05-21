/**
 * RootNavigator
 * 
 * Navegador raíz de la aplicación.
 * Maneja la lógica de switching entre Auth y Main basándose en el estado de autenticación.
 * 
 * Flujo:
 * 1. Muestra SplashScreen mientras verifica la sesión
 * 2. Si NO autenticado → Muestra AuthStack
 * 3. Si autenticado → Muestra MainTabs
 */

import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { useAuth } from '@contexts/AuthContext';
import SplashScreen from '@screens/Auth/SplashScreen';
import AuthStackNavigator from './AuthStackNavigator';
import MainTabNavigator from './MainTabNavigator';
import { linking } from './linking';

/**
 * Navegador raíz con switching condicional
 */
export default function RootNavigator() {
    const { isAuthenticated, isLoading } = useAuth();

    console.log('🧭 RootNavigator: Renderizando', { isLoading, isAuthenticated });

    // Mostrar splash mientras se verifica la sesión
    if (isLoading) {
        console.log('🧭 RootNavigator: Mostrando SplashScreen');
        return <SplashScreen />;
    }

    console.log('🧭 RootNavigator: Mostrando', isAuthenticated ? 'MainTabNavigator' : 'AuthStackNavigator');

    return (
        <NavigationContainer linking={linking} theme={DefaultTheme}>
            {isAuthenticated ? <MainTabNavigator /> : <AuthStackNavigator />}
        </NavigationContainer>
    );
}
