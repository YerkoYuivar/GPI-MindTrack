/**
 * AuthStack
 * 
 * Stack de navegación para autenticación.
 * Incluye pantallas de Sign In, Sign Up y Profile.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from './types';
import AuthSignInScreen from '@screens/Auth/AuthSignInScreen';
import AuthSignUpScreen from '@screens/Auth/AuthSignUpScreen';
import AuthProfileScreen from '@screens/Auth/AuthProfileScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * Stack de autenticación.
 * Contiene las pantallas de inicio de sesión, registro y perfil.
 */
export default function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="AuthSignIn"
        component={AuthSignInScreen}
        options={{
          title: 'Iniciar sesión',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="AuthSignUp"
        component={AuthSignUpScreen}
        options={{
          title: 'Crear cuenta',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="AuthProfile"
        component={AuthProfileScreen}
        options={{
          title: 'Mi perfil',
        }}
      />
    </Stack.Navigator>
  );
}
