/**
 * Banner de Notificación
 * Componente reutilizable para mostrar mensajes de info/warn/error
 */

import React, { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';

export type BannerType = 'info' | 'warn' | 'error';

export interface BannerProps {
  /** Tipo de banner (determina el color) */
  type: BannerType;
  /** Texto a mostrar */
  text: string;
  /** Callback al presionar el botón de cerrar */
  onDismiss?: () => void;
  /** Auto-cerrar después de N milisegundos (opcional) */
  autoDismissMs?: number;
}

/**
 * Banner de notificación con estilos según tipo
 */
export function Banner({ type, text, onDismiss, autoDismissMs }: BannerProps) {
  // Auto-dismiss timer
  useEffect(() => {
    if (autoDismissMs && onDismiss) {
      const timer = setTimeout(onDismiss, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [autoDismissMs, onDismiss]);

  // Estilos según tipo
  const bgColor =
    type === 'info'
      ? 'bg-indigo-50 dark:bg-indigo-900/30'
      : type === 'warn'
      ? 'bg-amber-50 dark:bg-amber-900/30'
      : 'bg-rose-50 dark:bg-rose-900/30';

  const borderColor =
    type === 'info'
      ? 'border-indigo-200 dark:border-indigo-700'
      : type === 'warn'
      ? 'border-amber-200 dark:border-amber-700'
      : 'border-rose-200 dark:border-rose-700';

  const textColor =
    type === 'info'
      ? 'text-indigo-900 dark:text-indigo-100'
      : type === 'warn'
      ? 'text-amber-900 dark:text-amber-100'
      : 'text-rose-900 dark:text-rose-100';

  const icon =
    type === 'info' ? 'ℹ️' : type === 'warn' ? '⚠️' : '❌';

  return (
    <View
      className={`rounded-xl px-4 py-3 border flex-row items-start gap-3 ${bgColor} ${borderColor}`}
    >
      <Text className="text-base leading-none mt-0.5">{icon}</Text>
      <Text className={`flex-1 text-sm font-medium ${textColor}`}>
        {text}
      </Text>
      {onDismiss && (
        <Pressable
          onPress={onDismiss}
          className="ml-2 px-2 py-1"
          accessibilityLabel="Cerrar notificación"
          accessibilityRole="button"
        >
          <Text className={`text-base font-bold ${textColor}`}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}
