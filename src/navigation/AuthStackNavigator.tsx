/**
 * AuthStackNavigator
 * 
 * Stack de navegación para el flujo de autenticación.
 * Incluye pantallas de bienvenida, inicio de sesión, registro y recuperación de contraseña.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from '@screens/Auth/WelcomeScreen';
import AuthSignInScreen from '@screens/Auth/AuthSignInScreen';
import AuthSignUpScreen from '@screens/Auth/AuthSignUpScreen';
import ForgotPasswordScreen from '@screens/Auth/ForgotPasswordScreen';

export type AuthStackParamList = {
    Welcome: undefined;
    SignIn: undefined;
    SignUp: undefined;
    ForgotPassword: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * Navegador de autenticación para usuarios no autenticados
 */
export default function AuthStackNavigator() {
    console.log('🔑 AuthStackNavigator: Renderizando stack de autenticación');
    
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen
                name="Welcome"
                component={WelcomeScreen}
                options={{ title: 'Bienvenido' }}
            />
            <Stack.Screen
                name="SignIn"
                component={AuthSignInScreen}
                options={{
                    title: 'Iniciar sesión',
                    headerShown: true,
                    headerShadowVisible: false,
                }}
            />
            <Stack.Screen
                name="SignUp"
                component={AuthSignUpScreen}
                options={{
                    title: 'Crear cuenta',
                    headerShown: true,
                    headerShadowVisible: false,
                }}
            />
            <Stack.Screen
                name="ForgotPassword"
                component={ForgotPasswordScreen}
                options={{
                    title: 'Recuperar contraseña',
                    headerShown: true,
                    headerShadowVisible: false,
                }}
            />
        </Stack.Navigator>
    );
}
