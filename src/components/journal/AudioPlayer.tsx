/**
 * @module AudioPlayer
 * @description Reproductor simple de audio con Play/Pause
 * - Reproduce archivos de audio desde URL
 * - Muestra duración total y progreso
 * - Controles básicos Play/Pause
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';

type Props = {
  url: string;
  durationMs: number;
  className?: string;
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
 * Reproductor de audio simple
 */
export default function AudioPlayer({ url, durationMs, className }: Props) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [positionMs, setPositionMs] = useState(0);

  /**
   * Cargar audio al montar
   */
  useEffect(() => {
    let mounted = true;

    const loadAudio = async () => {
      try {
        setIsLoading(true);
        const { sound: audioSound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: false },
          (status) => {
            if (mounted && status.isLoaded) {
              setPositionMs(status.positionMillis);
              setIsPlaying(status.isPlaying);
            }
          }
        );
        if (mounted) {
          setSound(audioSound);
        }
      } catch (error) {
        console.error('[AudioPlayer] Error loading audio:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadAudio();

    return () => {
      mounted = false;
      sound?.unloadAsync();
    };
  }, [url]);

  /**
   * Toggle Play/Pause
   */
  const togglePlayback = useCallback(async () => {
    if (!sound) return;

    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await sound.pauseAsync();
        } else {
          // Si llegó al final, reiniciar
          if (status.positionMillis >= status.durationMillis!) {
            await sound.setPositionAsync(0);
          }
          await sound.playAsync();
        }
      }
    } catch (error) {
      console.error('[AudioPlayer] Error toggling playback:', error);
    }
  }, [sound]);

  return (
    <View className={`p-3 bg-white border border-gray-200 rounded-xl ${className ?? ''}`}>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-gray-700 font-medium">🎧 Nota de voz</Text>
        <Text className="text-gray-500 text-sm">
          {formatDuration(positionMs)} / {formatDuration(durationMs)}
        </Text>
      </View>

      {/* Controles */}
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={togglePlayback}
          disabled={isLoading || !sound}
          className={`px-4 py-2 rounded-xl ${
            isPlaying 
              ? 'bg-amber-500 active:bg-amber-600' 
              : 'bg-indigo-600 active:bg-indigo-700'
          } ${(isLoading || !sound) ? 'opacity-50' : ''}`}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pausar audio' : 'Reproducir audio'}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white font-semibold">
              {isPlaying ? '⏸ Pausar' : '▶ Reproducir'}
            </Text>
          )}
        </Pressable>

        {isPlaying && (
          <View className="flex-row items-center gap-1">
            <View className="w-1 h-4 bg-indigo-600 rounded animate-pulse" />
            <View className="w-1 h-3 bg-indigo-600 rounded animate-pulse delay-75" />
            <View className="w-1 h-4 bg-indigo-600 rounded animate-pulse delay-150" />
          </View>
        )}
      </View>
    </View>
  );
}
