import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DiscoverHomeScreen from '@screens/Discover/DiscoverHomeScreen';
import DiscoverDashboardScreen from '@screens/Discover/DiscoverDashboardScreen';
import DiscoverGraphScreen from '@screens/Discover/DiscoverGraphScreen';
import InsightsFeedScreen from '@screens/Discover/InsightsFeedScreen';
import EntryInsightsScreen from '@screens/Discover/EntryInsightsScreen';
import { useTheme } from '@contexts/ThemeContext';
import { DiscoverStackParamList } from './types';

const Stack = createNativeStackNavigator<DiscoverStackParamList>();

export default function DiscoverStack() {
  const { isDark, colors } = useTheme();
  
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen 
        name="DiscoverHome" 
        component={DiscoverHomeScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen
        name="DiscoverDashboard"
        component={DiscoverDashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Stack.Screen
        name="DiscoverGraph"
        component={DiscoverGraphScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DiscoverFeed"
        component={InsightsFeedScreen}
        options={{ title: 'Insights Recientes' }}
      />
      <Stack.Screen
        name="EntryInsights"
        component={EntryInsightsScreen}
        options={{ title: 'Insights de Entrada' }}
      />
    </Stack.Navigator>
  );
}
