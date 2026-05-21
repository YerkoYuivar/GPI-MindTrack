/**
 * MainTabNavigator
 * 
 * Navegador principal de tabs para usuarios autenticados.
 * Incluye tabs de Journal, Discover y Chat.
 * 
 * NOTA: Esta es la versión refactorizada del AppNavigator original,
 * ahora solo se muestra para usuarios autenticados.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { AppTabParamList } from './types';
import JournalStack from './JournalStack';
import DiscoverStack from './DiscoverStack';
import ChatStack from './ChatStack';
import ProfileScreen from '@screens/Profile/ProfileScreen';
import CustomTabBar from '@components/ui/CustomTabBar';

const Tab = createBottomTabNavigator<AppTabParamList>();

/**
 * Navegador de tabs principales (protegido por autenticación)
 */
export default function MainTabNavigator() {
    return (
        <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
            }}
            sceneContainerStyle={{ paddingBottom: 90 }}
        >
            <Tab.Screen
                name="JournalTab"
                component={JournalStack}
                options={{
                    tabBarLabel: 'Diario',
                    tabBarAccessibilityLabel: 'Diario'
                }}
            />
            <Tab.Screen
                name="DiscoverTab"
                component={DiscoverStack}
                options={{
                    tabBarLabel: 'Descubrir',
                    tabBarAccessibilityLabel: 'Descubrir'
                }}
            />
            <Tab.Screen
                name="ChatTab"
                component={ChatStack}
                options={{
                    tabBarLabel: 'Chat',
                    tabBarAccessibilityLabel: 'Chat'
                }}
            />
            <Tab.Screen
                name="ProfileTab"
                component={ProfileScreen}
                options={{
                    tabBarLabel: 'Perfil',
                    tabBarAccessibilityLabel: 'Perfil'
                }}
            />
        </Tab.Navigator>
    );
}
