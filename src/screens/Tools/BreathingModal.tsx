/**
 * BreathingModal - Modal de respiración guiada
 * 
 * Guía al usuario a través de ejercicios de respiración:
 * - Box (4-4-4-4): Inhala 4s, retén 4s, exhala 4s, retén 4s
 * - 4-7-8: Inhala 4s, retén 7s, exhala 8s
 * - Free (libre): Respiración consciente sin timer
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  Animated,
  Easing,
} from 'react-native';

type BreathingPattern = 'box' | '478' | 'free';

type Props = {
  visible: boolean;
  pattern: BreathingPattern;
  durationSec?: number;
  onClose: () => void;
};

const PATTERNS: Record<
  BreathingPattern,
  {
    name: string;
    phases: Array<{ label: string; seconds: number }>;
  }
> = {
  box: {
    name: 'Respiración Box 4-4-4-4',
    phases: [
      { label: 'Inhala', seconds: 4 },
      { label: 'Retén', seconds: 4 },
      { label: 'Exhala', seconds: 4 },
      { label: 'Retén', seconds: 4 },
    ],
  },
  '478': {
    name: 'Respiración 4-7-8',
    phases: [
      { label: 'Inhala', seconds: 4 },
      { label: 'Retén', seconds: 7 },
      { label: 'Exhala', seconds: 8 },
    ],
  },
  free: {
    name: 'Respiración Libre',
    phases: [
      { label: 'Inhala', seconds: 4 },
      { label: 'Exhala', seconds: 4 },
    ],
  },
};

export default function BreathingModal({
  visible,
  pattern,
  durationSec = 60,
  onClose,
}: Props) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(durationSec);
  const [phaseProgress, setPhaseProgress] = useState(0);

  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const patternConfig = PATTERNS[pattern];
  const currentPhase = patternConfig.phases[currentPhaseIndex];

  // Reset al abrir
  useEffect(() => {
    if (visible) {
      setIsRunning(false);
      setCurrentPhaseIndex(0);
      setSecondsLeft(durationSec);
      setPhaseProgress(0);
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(1);
    }
  }, [visible, durationSec]);

  // Timer principal
  useEffect(() => {
    if (!isRunning || !visible) return;

    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, visible]);

  // Timer de fase
  useEffect(() => {
    if (!isRunning || !currentPhase) return;

    const interval = setInterval(() => {
      setPhaseProgress(prev => {
        if (prev >= currentPhase.seconds) {
          // Avanzar a siguiente fase
          const nextIndex =
            (currentPhaseIndex + 1) % patternConfig.phases.length;
          setCurrentPhaseIndex(nextIndex);
          return 0;
        }
        return prev + 0.1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning, currentPhase, currentPhaseIndex, patternConfig.phases.length]);

  // Animación de círculo
  useEffect(() => {
    if (!isRunning || !currentPhase) return;

    const isInhale = currentPhase.label === 'Inhala';
    const targetScale = isInhale ? 1.2 : 0.8;

    Animated.timing(scaleAnim, {
      toValue: targetScale,
      duration: currentPhase.seconds * 1000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [currentPhaseIndex, isRunning, currentPhase, scaleAnim]);

  const handleStart = () => {
    setIsRunning(true);
    setCurrentPhaseIndex(0);
    setPhaseProgress(0);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleClose = () => {
    setIsRunning(false);
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/60 items-center justify-center p-6">
        <View className="bg-white rounded-3xl p-8 w-full max-w-md">
          {/* Header */}
          <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
            {patternConfig.name}
          </Text>
          <Text className="text-gray-600 text-center mb-6">
            {formatTime(secondsLeft)} restantes
          </Text>

          {/* Círculo de respiración */}
          <View className="items-center justify-center mb-8" style={{ height: 220 }}>
            <Animated.View
              style={{
                width: 160,
                height: 160,
                borderRadius: 80,
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
              }}
              className="bg-indigo-100 items-center justify-center"
            >
              <View className="bg-indigo-500 rounded-full items-center justify-center w-32 h-32">
                <Text className="text-white text-2xl font-bold">
                  {currentPhase?.label}
                </Text>
                <Text className="text-white text-sm mt-1">
                  {Math.ceil(currentPhase?.seconds - phaseProgress)}s
                </Text>
              </View>
            </Animated.View>
          </View>

          {/* Instrucciones */}
          {!isRunning && secondsLeft === durationSec && (
            <View className="mb-6">
              <Text className="text-gray-700 text-center">
                Encuentra un lugar cómodo y tranquilo. Respira siguiendo el ritmo
                del círculo.
              </Text>
            </View>
          )}

          {/* Botones */}
          <View className="gap-3">
            {!isRunning ? (
              <>
                {secondsLeft === durationSec ? (
                  <Pressable
                    onPress={handleStart}
                    className="bg-indigo-600 py-4 rounded-xl"
                  >
                    <Text className="text-white text-center font-semibold text-lg">
                      🫁 Comenzar
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={handleStart}
                    className="bg-indigo-600 py-4 rounded-xl"
                  >
                    <Text className="text-white text-center font-semibold text-lg">
                      ▶️ Continuar
                    </Text>
                  </Pressable>
                )}
              </>
            ) : (
              <Pressable
                onPress={handlePause}
                className="bg-amber-500 py-4 rounded-xl"
              >
                <Text className="text-white text-center font-semibold text-lg">
                  ⏸️ Pausar
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleClose}
              className="bg-gray-200 py-4 rounded-xl"
            >
              <Text className="text-gray-700 text-center font-semibold text-lg">
                Cerrar
              </Text>
            </Pressable>
          </View>

          {/* Beneficios */}
          {!isRunning && secondsLeft === durationSec && (
            <View className="mt-6 bg-blue-50 p-4 rounded-xl">
              <Text className="text-xs font-medium text-blue-900 mb-2">
                💡 Beneficios:
              </Text>
              <Text className="text-xs text-blue-700">
                La respiración consciente activa el sistema nervioso parasimpático,
                reduciendo la ansiedad y promoviendo la calma.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
