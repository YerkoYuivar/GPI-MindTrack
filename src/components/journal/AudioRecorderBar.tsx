/**
 * @module AudioRecorderBar
 * @description Barra de grabación de audio con controles y visualización de duración
 * - Estados: idle, recording, paused, finished
 * - Botones: Grabar, Pausar, Reanudar, Detener, Descartar
 * - Indicador de duración MM:SS
 * - Indicador de subida
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';

type Props = {
  state: 'idle' | 'recording' | 'paused' | 'finished';
  durationMs: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onReset: () => void;
  uploading?: boolean;
};

/**
 * Formatea milisegundos a MM:SS
 */
const formatDuration = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

/**
 * Barra de grabación de audio
 */
export default function AudioRecorderBar({
  state,
  durationMs,
  onStart,
  onPause,
  onResume,
  onStop,
  onReset,
  uploading = false,
}: Props) {
  return (
    <View className="mt-4 p-3 bg-white border border-gray-200 rounded-xl">
      {/* Header con duración e indicador de subida */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <Text className="text-gray-700 font-semibold">
            🎙️ {formatDuration(durationMs)}
          </Text>
          {state === 'recording' && (
            <View className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </View>
        
        {uploading && (
          <Text className="text-indigo-600 text-sm font-medium">
            Subiendo...
          </Text>
        )}
      </View>

      {/* Botones de control */}
      <View className="flex-row gap-2 flex-wrap">
        {/* Estado: Idle - Mostrar botón Grabar */}
        {state === 'idle' && (
          <Pressable
            className="px-4 py-2 rounded-xl bg-indigo-600 active:bg-indigo-700"
            onPress={onStart}
            accessibilityRole="button"
            accessibilityLabel="Grabar audio"
          >
            <Text className="text-white font-semibold">▶ Grabar</Text>
          </Pressable>
        )}

        {/* Estado: Grabando - Mostrar Pausar y Detener */}
        {state === 'recording' && (
          <>
            <Pressable
              className="px-4 py-2 rounded-xl bg-amber-500 active:bg-amber-600"
              onPress={onPause}
              accessibilityRole="button"
              accessibilityLabel="Pausar grabación"
            >
              <Text className="text-white font-semibold">⏸ Pausar</Text>
            </Pressable>
            
            <Pressable
              className="px-4 py-2 rounded-xl bg-rose-600 active:bg-rose-700"
              onPress={onStop}
              accessibilityRole="button"
              accessibilityLabel="Detener grabación"
            >
              <Text className="text-white font-semibold">⏹ Detener</Text>
            </Pressable>
          </>
        )}

        {/* Estado: Pausado - Mostrar Reanudar y Finalizar */}
        {state === 'paused' && (
          <>
            <Pressable
              className="px-4 py-2 rounded-xl bg-indigo-600 active:bg-indigo-700"
              onPress={onResume}
              accessibilityRole="button"
              accessibilityLabel="Reanudar grabación"
            >
              <Text className="text-white font-semibold">▶ Reanudar</Text>
            </Pressable>
            
            <Pressable
              className="px-4 py-2 rounded-xl bg-rose-600 active:bg-rose-700"
              onPress={onStop}
              accessibilityRole="button"
              accessibilityLabel="Finalizar grabación"
            >
              <Text className="text-white font-semibold">⏹ Finalizar</Text>
            </Pressable>
          </>
        )}

        {/* Estado: Finalizado - Mostrar Descartar */}
        {state === 'finished' && (
          <Pressable
            className="px-4 py-2 rounded-xl bg-gray-500 active:bg-gray-600"
            onPress={onReset}
            accessibilityRole="button"
            accessibilityLabel="Descartar grabación"
            disabled={uploading}
          >
            <Text className="text-white font-semibold">
              {uploading ? '⏳ Subiendo...' : '🗑️ Descartar'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Mensaje informativo según estado */}
      {state === 'finished' && !uploading && (
        <Text className="text-xs text-gray-500 mt-2">
          ✓ Grabación lista. Se subirá al guardar la entrada.
        </Text>
      )}
    </View>
  );
}
