/**
 * @module components/charts/BarChartSimple
 * @description Gráfica de columnas simple usando react-native-svg
 */

import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';

type Props = {
  data: Array<{ t: number; v: number | null }>; // semanas
  width: number;
  height: number; // 140
  minY?: number;  // -1
  maxY?: number;  // 1
  zeroLine?: boolean; // dibuja línea en 0
};

/**
 * Gráfica de columnas vertical para visualizar sentiment (-1 a 1)
 * Columnas positivas crecen hacia arriba, negativas hacia abajo
 * 
 * @example
 * <BarChartSimple
 *   data={[
 *     { t: 1704067200000, v: 0.45 },
 *     { t: 1704672000000, v: -0.2 },
 *     { t: 1705276800000, v: 0.15 },
 *   ]}
 *   width={320}
 *   height={140}
 *   minY={-1}
 *   maxY={1}
 *   zeroLine={true}
 * />
 */
export default function BarChartSimple({
  data,
  width,
  height,
  minY = -1,
  maxY = 1,
  zeroLine = true,
}: Props) {
  const padding = { top: 12, right: 12, bottom: 20, left: 32 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Filtrar datos válidos
  const validData = data.map((d, i) => ({ ...d, index: i })).filter((d) => d.v !== null && d.v !== undefined);

  if (validData.length === 0) {
    return (
      <View
        style={{ width, height }}
        className="items-center justify-center bg-gray-50 rounded-lg"
        accessibilityRole="image"
        accessibilityLabel="Gráfica vacía - sin datos disponibles"
      >
        <SvgText fill="#9CA3AF" fontSize="12" textAnchor="middle" x={width / 2} y={height / 2}>
          Sin datos
        </SvgText>
      </View>
    );
  }

  // Calcular posición Y=0 (centro relativo al rango)
  const zeroY = padding.top + chartHeight * (maxY / (maxY - minY));

  // Ancho de cada columna
  const barWidth = chartWidth / data.length;
  const barPadding = barWidth * 0.2; // espacio entre columnas

  // Normalizar Y
  const normalizeY = (v: number) => {
    const ratio = (v - minY) / (maxY - minY);
    return padding.top + chartHeight * (1 - ratio);
  };

  // Generar columnas
  const bars = validData.map((point) => {
    const value = point.v!;
    const x = padding.left + point.index * barWidth + barPadding / 2;
    const barWidthActual = barWidth - barPadding;

    let y: number;
    let barHeight: number;
    let fill: string;

    if (value >= 0) {
      // Columna positiva (hacia arriba)
      y = normalizeY(value);
      barHeight = zeroY - y;
      fill = '#10B981'; // green-500
    } else {
      // Columna negativa (hacia abajo)
      y = zeroY;
      barHeight = normalizeY(value) - zeroY;
      fill = '#EF4444'; // red-500
    }

    return {
      x,
      y,
      width: barWidthActual,
      height: Math.abs(barHeight),
      fill,
      value,
    };
  });

  // Líneas de guía
  const guideTicks = [minY, 0, maxY].map((tickValue) => ({
    value: tickValue,
    y: normalizeY(tickValue),
  }));

  return (
    <View
      style={{ width, height }}
      accessibilityRole="image"
      accessibilityLabel={`Gráfica de columnas: ${validData.length} semanas, sentiment de ${minY} a ${maxY}`}
    >
      <Svg width={width} height={height}>
        {/* Líneas de guía */}
        {guideTicks.map((tick, i) => (
          <Line
            key={i}
            x1={padding.left}
            y1={tick.y}
            x2={width - padding.right}
            y2={tick.y}
            stroke={tick.value === 0 && zeroLine ? '#6B7280' : '#E5E7EB'}
            strokeWidth={tick.value === 0 && zeroLine ? '2' : '1'}
            strokeDasharray={tick.value === 0 ? undefined : '2,2'}
          />
        ))}

        {/* Columnas */}
        {bars.map((bar, i) => (
          <Rect
            key={i}
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            fill={bar.fill}
            opacity={0.8}
            rx={2}
          />
        ))}

        {/* Etiquetas Y */}
        {guideTicks.map((tick, i) => (
          <SvgText
            key={i}
            x={padding.left - 6}
            y={tick.y + 4}
            fontSize="10"
            fill="#9CA3AF"
            textAnchor="end"
          >
            {tick.value.toFixed(1)}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}
