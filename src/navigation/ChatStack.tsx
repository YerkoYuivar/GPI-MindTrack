import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ChatHomeScreen from '@screens/Chat/ChatHomeScreen';
import SupportChatScreen from '@screens/Chat/SupportChatScreen';
import ChatMemoryScreen from '@screens/Chat/ChatMemoryScreen';
import QuickExerciseScreen from '@screens/Tools/QuickExerciseScreen';
import { useTheme } from '@contexts/ThemeContext';
import { ChatStackParamList } from './types';

const Stack = createNativeStackNavigator<ChatStackParamList>();

export default function ChatStack() {
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
        name="ChatHome" 
        component={ChatHomeScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="ChatSupport" 
        component={SupportChatScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="ChatMemory" 
        component={ChatMemoryScreen} 
        options={{ title: 'Memoria Conversacional' }} 
      />
      <Stack.Screen 
        name="QuickExercise" 
        component={QuickExerciseScreen} 
        options={{ title: 'Ejercicio Rápido' }} 
      />
    </Stack.Navigator>
  );
}
