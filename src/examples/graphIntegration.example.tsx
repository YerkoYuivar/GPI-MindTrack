/**
 * Ejemplo de integración del sistema de grafos 3D
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

/**
 * 1. Generar el grafo desde una pantalla o botón
 */
export async function handleGenerateGraph() {
  try {
    const generateGraph = httpsCallable(functions, 'generateGraph');
    const result = await generateGraph();
    
    const data = result.data as {
      ok: boolean;
      patternCount: number;
      edgeCount: number;
    };
    
    if (data.ok) {
      console.log(`Grafo generado: ${data.patternCount} patrones, ${data.edgeCount} conexiones`);
      // Mostrar mensaje de éxito al usuario
      // Navegar a la pantalla del grafo 3D
    }
  } catch (error) {
    console.error('Error generando grafo:', error);
    // Mostrar mensaje de error al usuario
  }
}

/**
 * 2. Usar en un componente React Native
 */
import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';

export function GenerateGraphButton() {
  const [loading, setLoading] = useState(false);
  
  const handlePress = async () => {
    setLoading(true);
    try {
      const generateGraph = httpsCallable(functions, 'generateGraph');
      const result = await generateGraph();
      
      const data = result.data as {
        ok: boolean;
        patternCount: number;
        edgeCount: number;
      };
      
      if (data.ok) {
        alert(`Grafo generado con ${data.patternCount} patrones`);
        // Navegar a Discover3DGraphScreen
      }
    } catch (error) {
      alert('Error generando grafo');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Pressable
      onPress={handlePress}
      disabled={loading}
      style={{
        padding: 16,
        backgroundColor: '#8B5CF6',
        borderRadius: 12,
        alignItems: 'center',
      }}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
          Generar Grafo de Patrones
        </Text>
      )}
    </Pressable>
  );
}

/**
 * 3. Añadir a la navegación
 */

// En src/navigation/DiscoverStack.tsx
import Discover3DGraphScreen from '../screens/Discover/Discover3DGraphScreen';

export function DiscoverStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="DiscoverHome" 
        component={DiscoverHomeScreen}
        options={{ title: 'Descubrir' }}
      />
      <Stack.Screen 
        name="Discover3DGraph" 
        component={Discover3DGraphScreen}
        options={{ 
          title: 'Patrones 3D',
          headerShown: false, // Usar SafeAreaView en el componente
        }}
      />
    </Stack.Navigator>
  );
}

// Actualizar types.ts
export type DiscoverStackParamList = {
  DiscoverHome: undefined;
  Discover3DGraph: undefined;
  // ... otros screens
};

/**
 * 4. Navegar al grafo desde otra pantalla
 */
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { DiscoverStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<DiscoverStackParamList>;

export function SomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  
  const openGraph = () => {
    navigation.navigate('Discover3DGraph');
  };
  
  return (
    <Pressable onPress={openGraph}>
      <Text>Ver Grafo 3D</Text>
    </Pressable>
  );
}

/**
 * 5. Generar automáticamente después de crear entradas
 * 
 * Opción A: Trigger automático cada N entradas
 */
import { useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export function useAutoGenerateGraph() {
  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    
    // Escuchar cambios en metadatos del usuario
    const unsubscribe = onSnapshot(
      doc(db, 'users', userId, 'metadata', 'stats'),
      async (snapshot) => {
        const data = snapshot.data();
        const entryCount = data?.entryCount || 0;
        
        // Regenerar cada 10 entradas
        if (entryCount > 0 && entryCount % 10 === 0) {
          console.log('Auto-generating graph...');
          await handleGenerateGraph();
        }
      }
    );
    
    return unsubscribe;
  }, []);
}

/**
 * Opción B: Botón en la pantalla de Journal
 */
export function JournalHeaderActions() {
  const [generating, setGenerating] = useState(false);
  
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {/* ... otros botones ... */}
      
      <Pressable
        onPress={async () => {
          setGenerating(true);
          await handleGenerateGraph();
          setGenerating(false);
        }}
        disabled={generating}
      >
        {generating ? (
          <ActivityIndicator size="small" />
        ) : (
          <Text style={{ fontSize: 20 }}>🔮</Text>
        )}
      </Pressable>
    </View>
  );
}

/**
 * 6. Configurar reglas de Firestore para la colección 'graphs'
 * 
 * En firebase/firestore.rules:
 */
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ... otras reglas ...
    
    // Grafos de patrones
    match /graphs/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // Solo Cloud Functions pueden escribir
    }
  }
}
*/

/**
 * 7. Testing
 */
describe('Graph Generation', () => {
  it('should generate graph for user with entries', async () => {
    // Crear entradas de prueba
    const testEntries = [
      { content: 'Hoy me sentí con mucha ansiedad', mood: 3 },
      { content: 'Fui al trabajo y me sentí estresado', mood: 4 },
      { content: 'Hice ejercicio y me sentí mejor', mood: 6 },
    ];
    
    // ... crear en Firestore ...
    
    // Generar grafo
    const generateGraph = httpsCallable(functions, 'generateGraph');
    const result = await generateGraph();
    
    expect(result.data.ok).toBe(true);
    expect(result.data.patternCount).toBeGreaterThan(0);
  });
});
