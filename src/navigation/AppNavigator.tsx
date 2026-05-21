/**
 * AppNavigator
 * 
 * Navegador principal de la aplicación.
 * Incluye tabs principales (Diario, Descubrir, Chat) y rutas de autenticación.
 */

import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AppTabParamList } from './types';
import JournalStack from './JournalStack';
import DiscoverStack from './DiscoverStack';
import ChatStack from './ChatStack';
import AuthSignInScreen from '@screens/Auth/AuthSignInScreen';
import AuthSignUpScreen from '@screens/Auth/AuthSignUpScreen';
import AuthProfileScreen from '@screens/Auth/AuthProfileScreen';
import { Feather } from '@expo/vector-icons';
import { linking } from './linking';
import AuthGate from '@components/auth/AuthGate';

const Tab = createBottomTabNavigator<AppTabParamList>();
const RootStack = createNativeStackNavigator();

/**
 * Navegador de tabs principales.
 */
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarLabelStyle: { fontSize: 12 },
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Feather.glyphMap = 'circle';
          if (route.name === 'JournalTab') iconName = 'book-open';
          if (route.name === 'DiscoverTab') iconName = 'trending-up';
          if (route.name === 'ChatTab') iconName = 'message-circle';
          return <Feather name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="JournalTab"
        component={JournalStack}
        options={{ tabBarLabel: 'Diario', tabBarAccessibilityLabel: 'Diario' }}
      />
      <Tab.Screen
        name="DiscoverTab"
        component={DiscoverStack}
        options={{ tabBarLabel: 'Descubrir', tabBarAccessibilityLabel: 'Descubrir' }}
      />
      <Tab.Screen name="ChatTab" options={{ tabBarLabel: 'Chat', tabBarAccessibilityLabel: 'Chat' }}>
        {() => (
          <AuthGate requireAuth>
            <ChatStack />
          </AuthGate>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

/**
 * Navegador raíz de la aplicación.
 * Incluye tabs principales y pantallas de autenticación.
 */
export default function AppNavigator() {
  return (
    <NavigationContainer linking={linking} theme={DefaultTheme}>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* Tabs principales */}
        <RootStack.Screen name="Main" component={MainTabs} />

        {/* Pantallas de autenticación */}
        <RootStack.Group
          screenOptions={{
            presentation: 'modal',
            headerShown: true,
            headerShadowVisible: false,
          }}
        >
          <RootStack.Screen
            name="AuthSignIn"
            component={AuthSignInScreen}
            options={{ title: 'Iniciar sesión', headerShown: false }}
          />
          <RootStack.Screen
            name="AuthSignUp"
            component={AuthSignUpScreen}
            options={{ title: 'Crear cuenta', headerShown: false }}
          />
          <RootStack.Screen
            name="AuthProfile"
            component={AuthProfileScreen}
            options={{ title: 'Mi perfil' }}
          />
        </RootStack.Group>
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
