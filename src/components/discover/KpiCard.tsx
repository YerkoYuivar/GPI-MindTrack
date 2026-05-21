/**
 * @module components/discover/KpiCard
 * @description Tarjeta de KPI (Key Performance Indicator) para el módulo Descubrimientos
 */

import React from 'react';
import { View } from 'react-native';
import Text from '@components/ui/Text';

type Props = {
  label: string;          // "Promedio Mood (7 días)"
  value: string;          // "4.6"
  help?: string;          // "vs semana anterior +0.3" (opcional)
  tone?: 'default' | 'good' | 'bad'; // colorea borde/texto
};

/**
 * Tarjeta de KPI con estilos adaptativos según el tono
 * 
 * @example
 * <KpiCard
 *   label="Promedio Mood (7 días)"
 *   value="4.6"
 *   tone="good"
 * />
 */
export default function KpiCard({ label, value, help, tone = 'default' }: Props) {
  // Clases según tono
  const borderClass = 
    tone === 'good' ? 'border-emerald-200' :
    tone === 'bad' ? 'border-rose-200' :
    'border-gray-200';
  
  const valueClass = 
    tone === 'good' ? 'text-emerald-700' :
    tone === 'bad' ? 'text-rose-700' :
    'text-gray-800';

  return (
    <View className={`bg-white rounded-2xl border shadow-sm p-4 ${borderClass}`}>
      {/* Label */}
      <Text className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </Text>
      
      {/* Value */}
      <Text className={`text-3xl font-bold ${valueClass}`}>
        {value}
      </Text>
      
      {/* Help text (opcional) */}
      {help && (
        <Text className="text-xs text-gray-400 mt-1">
          {help}
        </Text>
      )}
    </View>
  );
}
