import React, { useRef } from 'react';
import { Pressable, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import JournalHomeScreen from '@screens/Journal/JournalHomeScreen';
import JournalFavoritesScreen from '@screens/Journal/JournalFavoritesScreen';
import JournalDetailScreen from '@screens/Journal/JournalDetailScreen';
import JournalEditorScreen from '@screens/Journal/JournalEditorScreen';
import JournalTrashScreen from '@screens/Journal/JournalTrashScreen';
import { JournalSearchScreen } from '@screens/Journal/JournalSearchScreen';
import { JournalExportScreen } from '@screens/Journal/JournalExportScreen';
import { DiagnosticsScreen } from '@screens/Dev/DiagnosticsScreen';
import { JournalStackParamList } from './types';

const Stack = createNativeStackNavigator<JournalStackParamList>();

export default function JournalStack() {
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTitlePress = (navigation: any) => {
    tapCountRef.current += 1;

    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
    }

    if (tapCountRef.current === 3) {
      // Triple tap detectado - abrir Diagnostics
      navigation.navigate('Diagnostics');
      tapCountRef.current = 0;
    } else {
      // Resetear contador después de 500ms
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 500);
    }
  };

  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: 'center' }}>
      <Stack.Screen 
        name="JournalList" 
        component={JournalHomeScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen name="JournalFavorites" component={JournalFavoritesScreen} options={{ title: 'Favoritos' }} />
      <Stack.Screen name="JournalDetail" component={JournalDetailScreen} options={{ title: 'Detail' }} />
      <Stack.Screen name="JournalEditor" component={JournalEditorScreen} options={{ title: 'Nueva entrada' }} />
      <Stack.Screen name="JournalTrash" component={JournalTrashScreen} options={{ title: 'Papelera' }} />
      <Stack.Screen name="JournalSearch" component={JournalSearchScreen} options={{ headerShown: false }} />
      <Stack.Screen name="JournalExport" component={JournalExportScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Diagnostics" component={DiagnosticsScreen} options={{ title: '🔧 Diagnostics' }} />
    </Stack.Navigator>
  );
}
