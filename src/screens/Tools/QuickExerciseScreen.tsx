/**
 * QuickExerciseScreen - Ejercicios rápidos de bienestar
 * 
 * Instrucciones paso a paso para microrutinas:
 * - walk-10: Caminata consciente de 10 minutos
 * - micro-break-2: Micro-pausa de 2 minutos
 * - body-scan-5: Escaneo corporal de 5 minutos
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';

type ExerciseKey = 'walk-10' | 'micro-break-2' | 'body-scan-5';

type Exercise = {
  title: string;
  duration: string;
  icon: string;
  description: string;
  steps: string[];
  benefits: string[];
};

const EXERCISES: Record<ExerciseKey, Exercise> = {
  'walk-10': {
    title: 'Caminata Consciente',
    duration: '10 minutos',
    icon: '🚶',
    description:
      'Una caminata breve enfocada en conectar con el presente a través del movimiento.',
    steps: [
      'Encuentra un lugar donde puedas caminar sin interrupciones (interior o exterior)',
      'Comienza a caminar a un ritmo cómodo, más lento de lo usual',
      'Enfoca tu atención en las sensaciones de tus pies tocando el suelo',
      'Nota cómo se mueve tu cuerpo: brazos, piernas, caderas',
      'Si tu mente divaga, simplemente regresa la atención a las sensaciones físicas',
      'Observa tu entorno sin juzgar: sonidos, colores, temperatura',
      'En los últimos 2 minutos, expande tu conciencia a todo tu cuerpo en movimiento',
      'Termina deteniéndote y tomando 3 respiraciones profundas',
    ],
    benefits: [
      'Reduce rumia mental',
      'Activa el cuerpo de forma suave',
      'Mejora estado de ánimo',
      'Conecta con el momento presente',
    ],
  },
  'micro-break-2': {
    title: 'Micro-Pausa Activa',
    duration: '2 minutos',
    icon: '⏸️',
    description:
      'Pausa breve para resetear tu energía y atención cuando te sientes saturado.',
    steps: [
      'Levántate de tu silla o cambia de posición',
      'Estira los brazos hacia arriba lo más que puedas (10 segundos)',
      'Gira el cuello suavemente de lado a lado (5 veces)',
      'Encoge y relaja los hombros (5 veces)',
      'Cierra los ojos y toma 5 respiraciones profundas',
      'Abre los ojos y observa algo en tu entorno que nunca habías notado',
      'Bebe un sorbo de agua',
      'Sonríe (incluso si es forzado, ayuda)',
    ],
    benefits: [
      'Interrumpe el estrés acumulado',
      'Mejora circulación',
      'Refresca la mente',
      'Previene fatiga',
    ],
  },
  'body-scan-5': {
    title: 'Escaneo Corporal',
    duration: '5 minutos',
    icon: '💆',
    description:
      'Recorrido mental por tu cuerpo para identificar y liberar tensión acumulada.',
    steps: [
      'Siéntate o acuéstate en una posición cómoda',
      'Cierra los ojos y toma 3 respiraciones profundas',
      'Lleva tu atención a tus pies. Nota cualquier sensación sin juzgar',
      'Sube mentalmente a tus pantorrillas y muslos. ¿Hay tensión?',
      'Continúa con la zona de caderas y abdomen. Respira en esas áreas',
      'Pasa a tu pecho, hombros y brazos. Relaja cualquier rigidez',
      'Enfócate en cuello y mandíbula. Suelta cualquier apretón',
      'Finaliza en tu rostro y cabeza. Suaviza la expresión',
      'Toma 3 respiraciones profundas y abre los ojos lentamente',
    ],
    benefits: [
      'Identifica tensión no consciente',
      'Promueve relajación profunda',
      'Mejora conexión mente-cuerpo',
      'Reduce dolor muscular',
    ],
  },
};

export default function QuickExerciseScreen() {
  const route = useRoute<any>();
  const nav = useNavigation();
  const [completed, setCompleted] = useState(false);

  const exerciseKey = route.params?.key as ExerciseKey;
  const exercise = EXERCISES[exerciseKey];

  if (!exercise) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-6">
        <Text className="text-gray-600 text-center">
          Ejercicio no encontrado
        </Text>
        <Pressable
          onPress={() => nav.goBack()}
          className="mt-4 px-6 py-3 bg-gray-200 rounded-xl"
        >
          <Text className="text-gray-700 font-semibold">Volver</Text>
        </Pressable>
      </View>
    );
  }

  const handleComplete = () => {
    setCompleted(true);
    Alert.alert(
      '✓ ¡Completado!',
      `Has terminado: ${exercise.title}. ¿Cómo te sientes ahora?`,
      [
        {
          text: 'Bien',
          onPress: () => nav.goBack(),
        },
        {
          text: 'Escribir en el diario',
          onPress: () => {
            nav.goBack();
            // Opcional: navegar al journal con prefill
          },
        },
      ]
    );
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-6">
        {/* Header */}
        <View className="items-center mb-6">
          <Text className="text-6xl mb-3">{exercise.icon}</Text>
          <Text className="text-3xl font-bold text-gray-900 text-center">
            {exercise.title}
          </Text>
          <Text className="text-indigo-600 font-semibold mt-1">
            {exercise.duration}
          </Text>
        </View>

        {/* Description */}
        <View className="bg-indigo-50 p-4 rounded-xl mb-6">
          <Text className="text-gray-800">{exercise.description}</Text>
        </View>

        {/* Steps */}
        <View className="mb-6">
          <Text className="text-xl font-bold text-gray-900 mb-4">
            📋 Pasos a seguir:
          </Text>
          {exercise.steps.map((step, idx) => (
            <View key={idx} className="flex-row mb-3">
              <View className="bg-indigo-600 rounded-full w-7 h-7 items-center justify-center mr-3">
                <Text className="text-white font-bold text-sm">{idx + 1}</Text>
              </View>
              <Text className="flex-1 text-gray-700 leading-6">{step}</Text>
            </View>
          ))}
        </View>

        {/* Benefits */}
        <View className="mb-6">
          <Text className="text-xl font-bold text-gray-900 mb-4">
            ✨ Beneficios:
          </Text>
          {exercise.benefits.map((benefit, idx) => (
            <View key={idx} className="flex-row items-center mb-2">
              <Text className="text-green-600 mr-2">✓</Text>
              <Text className="text-gray-700">{benefit}</Text>
            </View>
          ))}
        </View>

        {/* Buttons */}
        <View className="gap-3 mb-8">
          {!completed ? (
            <Pressable
              onPress={handleComplete}
              className="bg-green-600 py-4 rounded-xl"
            >
              <Text className="text-white text-center font-bold text-lg">
                ✓ Marcar como hecho
              </Text>
            </Pressable>
          ) : (
            <View className="bg-green-100 py-4 rounded-xl">
              <Text className="text-green-800 text-center font-bold text-lg">
                ✓ ¡Completado!
              </Text>
            </View>
          )}

          <Pressable
            onPress={() => nav.goBack()}
            className="bg-gray-200 py-4 rounded-xl"
          >
            <Text className="text-gray-700 text-center font-semibold text-lg">
              Volver al chat
            </Text>
          </Pressable>
        </View>

        {/* Tip */}
        <View className="bg-amber-50 p-4 rounded-xl">
          <Text className="text-xs font-medium text-amber-900 mb-2">
            💡 Consejo:
          </Text>
          <Text className="text-xs text-amber-700">
            La práctica regular de estos ejercicios potencia sus beneficios. Intenta
            incorporarlos en tu rutina diaria.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
