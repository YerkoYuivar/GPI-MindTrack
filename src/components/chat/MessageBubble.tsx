/**
 * MessageBubble Component
 * 
 * Renderiza una burbuja de mensaje (user o assistant).
 * User: derecha, indigo
 * Assistant: izquierda, blanco con borde
 * Incluye botones de acciones (tool-calls) si el asistente las sugiere
 */

import React from 'react';
import {View, Text, Pressable} from 'react-native';
import { useTheme } from '@contexts/ThemeContext';
import type {ChatMessage, ToolAction} from '@features/chat/types';

type Props = {
  msg: ChatMessage;
  onAction?: (action: ToolAction) => void;
  isDark?: boolean;
};

export default function MessageBubble({msg, onAction, isDark: propIsDark}: Props) {
  const { colors, isDark: contextIsDark } = useTheme();
  const isDark = propIsDark ?? contextIsDark;
  
  const isUser = msg.role === 'user';

  // Accesibilidad: Label descriptivo
  const roleLabel = isUser ? 'Tú' : 'Asistente';
  const contentPreview = (msg.content ?? '').slice(0, 120);
  const accessibilityLabel = `${roleLabel} dice: ${contentPreview}`;

  // Colores según rol y tema
  const bubbleStyle = isUser
    ? { backgroundColor: colors.primary }
    : { 
        backgroundColor: isDark ? '#374151' : colors.surface, // gray-700 for dark
        borderColor: colors.border,
        borderWidth: 1,
      };
  
  const textColor = isUser ? '#FFFFFF' : colors.text;

  return (
    <View className={`w-full my-1 ${isUser ? 'items-end' : 'items-start'}`}>
      <View
        className="max-w-[88%] rounded-2xl px-4 py-2"
        style={bubbleStyle}
        accessibilityRole="text"
        accessibilityLabel={accessibilityLabel}
      >
        <Text style={{ color: textColor }}>{msg.content}</Text>

        {/* Botones de acciones (tool-calls) */}
        {msg.actions && msg.actions.length > 0 && (
          <View className="flex-row flex-wrap gap-2 mt-3">
            {msg.actions.map((action, idx) => (
              <Pressable
                key={idx}
                onPress={() => onAction?.(action)}
                className="px-3 py-2 rounded-xl"
                style={{ backgroundColor: colors.primary }}
                accessibilityRole="button"
                accessibilityLabel={`Acción: ${action.label}`}
                accessibilityHint="Toca para ejecutar esta acción sugerida"
              >
                <Text className="text-white font-semibold text-sm">
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
