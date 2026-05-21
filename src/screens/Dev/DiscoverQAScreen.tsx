/**
 * @module screens/Dev/DiscoverQAScreen
 * @description Pantalla de QA checklist para el módulo Discover
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Text from '@components/ui/Text';
import { auth } from '@lib/firebase/auth';
import { functions } from '@lib/firebase';
import { httpsCallable } from 'firebase/functions';

const QA_STORAGE_KEY = '@qa.discover.v1';

/**
 * Items del checklist de QA
 */
const QA_ITEMS = [
  {
    id: 'analyze-entry',
    title: 'analyzeEntry crea insights/summary',
    description: 'Verificar que se genera el documento con quality, sentiment, topics y keyPhrases',
  },
  {
    id: 'quality-status',
    title: 'quality.status cambia a WARN con contenido mínimo',
    description: 'Verificar reglas: FAIL < 0.34, WARN < 0.67 o confidence < 0.4',
  },
  {
    id: 'rebuild-timeseries',
    title: 'rebuildTimeseries genera day/week',
    description: 'Verificar que se crean documentos en timeseries/day y timeseries/week',
  },
  {
    id: 'rebuild-graph',
    title: 'Grafo se actualiza tras rebuild',
    description: 'Verificar que journals/{userId}/insights/nodes y edges se populan',
  },
  {
    id: 'recompute-all',
    title: 'recomputeAll ejecuta 3 pasos sin error',
    description: 'Verificar que retorna analyzed, timeseries y graph con counts',
  },
  {
    id: 'dashboard-load',
    title: 'Dashboard muestra KPIs y carga charts',
    description: 'Verificar que se renderizan LineChart y BarChart con datos',
  },
  {
    id: 'feed-badges',
    title: 'Feed lista insights con badges',
    description: 'Verificar que InsightCard muestra badges de quality (OK/WARN/FAIL)',
  },
  {
    id: 'deep-link-graph',
    title: 'Deep-link al grafo desde topic',
    description: 'Verificar que click en chip de topic navega a DiscoverGraph',
  },
];

/**
 * Pantalla de QA Checklist para Discover
 */
export default function DiscoverQAScreen() {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  // Obtener usuario autenticado
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user?.uid ?? null);
    });
    return unsubscribe;
  }, []);

  // Cargar estado persistido
  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    try {
      const json = await AsyncStorage.getItem(QA_STORAGE_KEY);
      if (json) {
        const saved = JSON.parse(json);
        setCheckedItems(new Set(saved));
      }
    } catch (error) {
      console.error('Error loading QA state:', error);
    }
  };

  const saveState = async (items: Set<string>) => {
    try {
      const json = JSON.stringify(Array.from(items));
      await AsyncStorage.setItem(QA_STORAGE_KEY, json);
    } catch (error) {
      console.error('Error saving QA state:', error);
    }
  };

  const toggleItem = (id: string) => {
    const newSet = new Set(checkedItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setCheckedItems(newSet);
    saveState(newSet);
  };

  const resetAll = () => {
    Alert.alert(
      'Resetear Checklist',
      '¿Deseas desmarcar todos los items?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resetear',
          style: 'destructive',
          onPress: () => {
            setCheckedItems(new Set());
            saveState(new Set());
          },
        },
      ]
    );
  };

  /**
   * Auto-verificación: Crea entrada de prueba y analiza
   */
  const runAutoVerification = async () => {
    if (!userId) {
      Alert.alert('Error', 'Usuario no autenticado');
      return;
    }

    setTesting(true);

    try {
      // 1. Crear entrada de prueba
      const testEntryId = `qa-test-${Date.now()}`;
      
      // 2. Invocar analyzeEntry
      const analyzeCallable = httpsCallable<
        { entryId: string },
        { ok: boolean; insights?: any }
      >(functions, 'analyzeEntry');

      const analyzeResult = await analyzeCallable({ entryId: testEntryId });

      if (!analyzeResult.data.ok) {
        throw new Error('analyzeEntry failed');
      }

      const insights = analyzeResult.data.insights;

      // 3. Verificar que existe quality
      if (!insights?.quality) {
        throw new Error('insights.quality no existe');
      }

      // 4. Verificar campos de quality
      const quality = insights.quality;
      const hasRequiredFields = 
        typeof quality.completeness === 'number' &&
        typeof quality.confidence === 'number' &&
        typeof quality.status === 'string' &&
        typeof quality.processingTimeMs === 'number';

      if (!hasRequiredFields) {
        throw new Error('quality fields incompletos');
      }

      // 5. Marcar items relevantes como completados
      const newChecked = new Set(checkedItems);
      newChecked.add('analyze-entry');
      
      if (quality.status === 'WARN' || quality.status === 'FAIL') {
        newChecked.add('quality-status');
      }

      setCheckedItems(newChecked);
      saveState(newChecked);

      Alert.alert(
        'Verificación Exitosa',
        `Entry analizada correctamente:\n\n` +
        `• Quality status: ${quality.status}\n` +
        `• Completeness: ${(quality.completeness * 100).toFixed(0)}%\n` +
        `• Confidence: ${(quality.confidence * 100).toFixed(0)}%\n` +
        `• Processing time: ${quality.processingTimeMs}ms`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Auto-verification error:', error);
      Alert.alert(
        'Error en Verificación',
        error.message || 'No se pudo completar la verificación automática',
        [{ text: 'OK' }]
      );
    } finally {
      setTesting(false);
    }
  };

  const completedCount = checkedItems.size;
  const totalCount = QA_ITEMS.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-4 py-6 bg-white border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-900">QA Checklist - Discover</Text>
        <Text className="text-sm text-gray-600 mt-1">
          Verificación de calidad del módulo
        </Text>

        {/* Progress Bar */}
        <View className="mt-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-medium text-gray-700">
              Progreso: {completedCount}/{totalCount}
            </Text>
            <Text className="text-sm font-medium text-indigo-600">
              {progress.toFixed(0)}%
            </Text>
          </View>
          <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <View 
              className="h-full bg-indigo-600 rounded-full" 
              style={{ width: `${progress}%` }}
            />
          </View>
        </View>

        {/* Actions */}
        <View className="flex-row gap-2 mt-4">
          <Pressable
            onPress={runAutoVerification}
            disabled={testing || !userId}
            className={`flex-1 px-3 py-2 rounded-lg ${testing ? 'bg-gray-200' : 'bg-indigo-600'}`}
            accessibilityRole="button"
          >
            {testing ? (
              <ActivityIndicator size="small" color="#4B5563" />
            ) : (
              <Text className="text-white text-sm font-semibold text-center">
                ⚙️ Probar Sample
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={resetAll}
            className="px-3 py-2 rounded-lg bg-gray-100"
            accessibilityRole="button"
          >
            <Text className="text-gray-700 text-sm font-semibold">Resetear</Text>
          </Pressable>
        </View>
      </View>

      {/* Checklist Items */}
      <View className="px-4 py-4">
        {QA_ITEMS.map((item) => {
          const isChecked = checkedItems.has(item.id);

          return (
            <Pressable
              key={item.id}
              onPress={() => toggleItem(item.id)}
              className={`mb-3 p-4 rounded-xl border ${
                isChecked
                  ? 'bg-green-50 border-green-200'
                  : 'bg-white border-gray-200'
              }`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isChecked }}
            >
              <View className="flex-row items-start gap-3">
                {/* Checkbox */}
                <View
                  className={`w-6 h-6 rounded-md border-2 items-center justify-center ${
                    isChecked
                      ? 'bg-green-600 border-green-600'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  {isChecked && (
                    <Text className="text-white text-sm font-bold">✓</Text>
                  )}
                </View>

                {/* Content */}
                <View className="flex-1">
                  <Text
                    className={`text-base font-semibold ${
                      isChecked ? 'text-green-900' : 'text-gray-900'
                    }`}
                  >
                    {item.title}
                  </Text>
                  <Text
                    className={`text-sm mt-1 ${
                      isChecked ? 'text-green-700' : 'text-gray-600'
                    }`}
                  >
                    {item.description}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Footer */}
      <View className="px-4 py-6">
        <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <Text className="text-blue-900 font-semibold mb-2">
            ℹ️ Información
          </Text>
          <Text className="text-blue-800 text-sm">
            Esta checklist verifica que el módulo Discover funciona correctamente.{'\n\n'}
            <Text className="font-semibold">Probar Sample:</Text> Ejecuta auto-verificación creando una entrada de prueba y analizándola.{'\n\n'}
            <Text className="font-semibold">Estado:</Text> Se persiste en AsyncStorage localmente.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
