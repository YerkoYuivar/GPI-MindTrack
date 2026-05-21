/**
 * NodeDetailSheet.tsx
 * Panel inferior mejorado que muestra detalles del nodo con diseño moderno.
 */

import React from 'react';
import { View, Text, Pressable, ScrollView, Clipboard } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@contexts/ThemeContext';
import type { PositionedNode } from '@features/discover/graphLayout';

type RelatedEntry = {
  id: string;
  title?: string;
  createdAt: number;
};

type Props = {
  node?: PositionedNode | null;
  onClose: () => void;
  related?: RelatedEntry[];
  onViewEntries?: (query: string) => void;
};

export default function NodeDetailSheet({ node, onClose, related = [], onViewEntries }: Props) {
  const { isDark, colors } = useTheme();
  
  if (!node) return null;

  const handleCopy = () => {
    Clipboard.setString(node.label);
  };

  const handleViewEntries = () => {
    if (onViewEntries) {
      onViewEntries(node.label);
    }
  };

  // Emojis y labels por tipo - con soporte para tema oscuro
  const typeConfig = {
    emotion: { 
      emoji: '💛', 
      label: 'Emoción', 
      bgColor: isDark ? 'bg-yellow-900/30' : 'bg-yellow-50',
      borderColor: isDark ? 'border-yellow-700' : 'border-yellow-200',
      badgeColor: isDark ? 'bg-yellow-800/50' : 'bg-yellow-100',
      textColor: isDark ? 'text-yellow-300' : 'text-yellow-800' 
    },
    activity: { 
      emoji: '⚡', 
      label: 'Actividad', 
      bgColor: isDark ? 'bg-purple-900/30' : 'bg-purple-50',
      borderColor: isDark ? 'border-purple-700' : 'border-purple-200',
      badgeColor: isDark ? 'bg-purple-800/50' : 'bg-purple-100',
      textColor: isDark ? 'text-purple-300' : 'text-purple-800' 
    },
    person: { 
      emoji: '👤', 
      label: 'Persona', 
      bgColor: isDark ? 'bg-pink-900/30' : 'bg-pink-50',
      borderColor: isDark ? 'border-pink-700' : 'border-pink-200',
      badgeColor: isDark ? 'bg-pink-800/50' : 'bg-pink-100',
      textColor: isDark ? 'text-pink-300' : 'text-pink-800' 
    },
    topic: { 
      emoji: '📚', 
      label: 'Tema', 
      bgColor: isDark ? 'bg-blue-900/30' : 'bg-blue-50',
      borderColor: isDark ? 'border-blue-700' : 'border-blue-200',
      badgeColor: isDark ? 'bg-blue-800/50' : 'bg-blue-100',
      textColor: isDark ? 'text-blue-300' : 'text-blue-800' 
    },
    phrase: { 
      emoji: '💬', 
      label: 'Frase', 
      bgColor: isDark ? 'bg-green-900/30' : 'bg-green-50',
      borderColor: isDark ? 'border-green-700' : 'border-green-200',
      badgeColor: isDark ? 'bg-green-800/50' : 'bg-green-100',
      textColor: isDark ? 'text-green-300' : 'text-green-800' 
    },
    trigger: { 
      emoji: '⚠️', 
      label: 'Trigger', 
      bgColor: isDark ? 'bg-orange-900/30' : 'bg-orange-50',
      borderColor: isDark ? 'border-orange-700' : 'border-orange-200',
      badgeColor: isDark ? 'bg-orange-800/50' : 'bg-orange-100',
      textColor: isDark ? 'text-orange-300' : 'text-orange-800' 
    },
  };

  const config = typeConfig[node.type as keyof typeof typeConfig] || typeConfig.topic;

  // Calcular nivel de importancia (basado en weight)
  const getImportanceLevel = (weight: number) => {
    if (weight >= 0.8) return { label: 'Muy frecuente', emoji: '🔥' };
    if (weight >= 0.5) return { label: 'Frecuente', emoji: '⭐' };
    return { label: 'Ocasional', emoji: '💫' };
  };

  const importance = getImportanceLevel(node.weight);

  return (
    <BlurView 
      intensity={95} 
      tint={isDark ? 'dark' : 'light'} 
      className="absolute bottom-0 left-0 right-0 rounded-t-3xl shadow-2xl overflow-hidden" 
      style={{ elevation: 10, marginBottom: 70 }}
    >
      {/* Header con color según tipo de nodo */}
      <View className={`px-5 pt-6 pb-4 ${config.bgColor} border-b-2 ${config.borderColor}`}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <View className="flex-row items-center mb-2">
              <Text className="text-2xl mr-2">{config.emoji}</Text>
              <BlurView 
                intensity={60} 
                tint={isDark ? 'dark' : 'light'} 
                className={`px-3 py-1 rounded-full overflow-hidden ${config.badgeColor}`}
              >
                <Text className={`text-xs font-semibold ${config.textColor}`}>{config.label}</Text>
              </BlurView>
            </View>
            
            <Text 
              className="text-xl font-bold mb-1" 
              style={{ color: colors.text }}
              numberOfLines={2}
            >
              {node.label}
            </Text>
            
            <View className="flex-row items-center gap-2">
              <Text 
                className="text-sm"
                style={{ color: colors.textSecondary }}
              >
                {importance.emoji} {importance.label}
              </Text>
              <Text style={{ color: colors.textSecondary }}>•</Text>
              <Text 
                className="text-sm"
                style={{ color: colors.textSecondary }}
              >
                Aparece {Math.round(node.weight * 10)} veces
              </Text>
            </View>
          </View>

          <BlurView 
            intensity={80} 
            tint={isDark ? 'dark' : 'light'} 
            className="p-2 rounded-full overflow-hidden shadow-sm"
          >
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <Text className="text-xl" style={{ color: colors.textSecondary }}>✕</Text>
            </Pressable>
          </BlurView>
        </View>
      </View>

      {/* Acciones */}
      <View 
        className="px-5 py-4 border-t"
        style={{ borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
      >
        <View className="flex-row gap-3">
          {onViewEntries && (
            <Pressable
              onPress={handleViewEntries}
              className="flex-1 px-4 py-3 rounded-xl shadow-sm"
              style={{ backgroundColor: colors.primary }}
              accessibilityRole="button"
            >
              <Text className="text-sm font-semibold text-center text-white">
                📖 Ver en diario
              </Text>
            </Pressable>
          )}

          <BlurView 
            intensity={60} 
            tint={isDark ? 'dark' : 'light'} 
            className="rounded-xl overflow-hidden"
          >
            <Pressable
              onPress={handleCopy}
              className="px-4 py-3"
              accessibilityRole="button"
            >
              <Text className="text-sm font-semibold" style={{ color: colors.text }}>📋</Text>
            </Pressable>
          </BlurView>
        </View>
      </View>

      {/* Info adicional */}
      <View 
        className="px-5 py-4 border-t"
        style={{ borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
      >
        <Text className="text-xs text-center" style={{ color: colors.textSecondary }}>
          {related.length > 0 
            ? `Aparece en ${related.length} entrada${related.length > 1 ? 's' : ''} de tu diario` 
            : 'Toca "Ver en diario" para explorar contextos relacionados'}
        </Text>
      </View>
    </BlurView>
  );
}
