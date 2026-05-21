/**
 * @module useAudioRecorder
 * @description Hook para grabación de audio con expo-av
 * - Estados: idle, recording, paused, finished
 * - Controles: start, pause, resume, stop, reset
 * - Tracking de duración en tiempo real
 * - Generación de archivo .m4a (AAC)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

export type RecState = 'idle' | 'recording' | 'paused' | 'finished';

/**
 * Hook para grabación de audio
 * @returns Estados y controles de grabación
 */
export function useAudioRecorder() {
  const [state, setState] = useState<RecState>('idle');
  const [uri, setUri] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  
  const recRef = useRef<Audio.Recording | null>(null);
  const subRef = useRef<any>(null);

  /**
   * Configurar modo de audio al montar
   */
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: true,
      staysActiveInBackground: false,
    });

    // Cleanup al desmontar
    return () => {
      subRef.current?.remove?.();
      recRef.current?.stopAndUnloadAsync?.().catch(() => {});
    };
  }, []);

  /**
   * Iniciar grabación
   */
  const start = useCallback(async () => {
    try {
      // Resetear estado
      setUri(null);
      setDurationMs(0);

      // Solicitar permisos
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        throw new Error('Permiso de micrófono denegado');
      }

      // Crear y configurar grabación
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY // m4a AAC por defecto
      );

      // Suscribirse a actualizaciones de estado
      subRef.current = recording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording || status.isDoneRecording) {
          setDurationMs(status.durationMillis ?? 0);
        }
      });

      // Iniciar grabación
      await recording.startAsync();
      recRef.current = recording;
      setState('recording');
    } catch (error) {
      console.error('[useAudioRecorder] Error starting:', error);
      throw error;
    }
  }, []);

  /**
   * Pausar grabación
   */
  const pause = useCallback(async () => {
    if (recRef.current && state === 'recording') {
      await recRef.current.pauseAsync();
      setState('paused');
    }
  }, [state]);

  /**
   * Reanudar grabación
   */
  const resume = useCallback(async () => {
    if (recRef.current && state === 'paused') {
      await recRef.current.startAsync();
      setState('recording');
    }
  }, [state]);

  /**
   * Detener y finalizar grabación
   */
  const stop = useCallback(async () => {
    if (!recRef.current) return;

    try {
      await recRef.current.stopAndUnloadAsync();
      const localUri = recRef.current.getURI();
      setUri(localUri ?? null);
      setState('finished');
    } catch (error) {
      console.error('[useAudioRecorder] Error stopping:', error);
    }
  }, []);

  /**
   * Resetear a estado inicial
   */
  const reset = useCallback(() => {
    recRef.current = null;
    subRef.current?.remove?.();
    subRef.current = null;
    setUri(null);
    setDurationMs(0);
    setState('idle');
  }, []);

  return {
    state,
    uri,
    durationMs,
    start,
    pause,
    resume,
    stop,
    reset,
  };
}
