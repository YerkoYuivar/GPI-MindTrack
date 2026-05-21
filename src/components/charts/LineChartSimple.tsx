/**
 * @module components/charts/LineChartSimple
 * @description Gráfica de líneas simple usando react-native-svg
 */

import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';

type Props = {
  data: Array<{ t: number; v: number | null }>; // ordenado asc por tiempo
  width: number;  // px
  height: number; // px (recomendado 160)
  minY?: number;  // default 1
  maxY?: number;  // default 7
  showDots?: boolean; // default true
  padding?: { top: number; right: number; bottom: number; left: number }; // default {12,12,18,12}
};

/**
 * Gráfica de líneas simple para visualizar series temporales
 * Maneja valores null cortando la línea en segmentos
 * 
 * @example
 * <LineChartSimple
 *   data={[
 *     { t: 1704067200000, v: 5.5 },
 *     { t: 1704153600000, v: 6.2 },
 *     { t: 1704240000000, v: null },
 *     { t: 1704326400000, v: 4.8 },
 *   ]}
 *   width={320}
 *   height={160}
 *   minY={1}
 *   maxY={7}
 * />
 */
export default function LineChartSimple({
  data,
  width,
  height,
  minY = 1,
  maxY = 7,
  showDots = true,
  padding = { top: 12, right: 12, bottom: 18, left: 12 },
}: Props) {
  // Área de dibujo (sin padding)
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Filtrar datos válidos
  const validData = data.filter((d) => d.v !== null && d.v !== undefined);
  
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

  // Normalizar coordenadas
  const xStep = chartWidth / Math.max(1, validData.length - 1);
  
  const normalizeY = (v: number) => {
    const ratio = (v - minY) / (maxY - minY);
    return padding.top + chartHeight * (1 - ratio); // invertir Y (SVG crece hacia abajo)
  };

  // Generar segmentos de path (cortar en valores null)
  const segments: string[] = [];
  let currentSegment: string[] = [];

  data.forEach((point, i) => {
    if (point.v === null || point.v === undefined) {
      // Terminar segmento actual
      if (currentSegment.length > 0) {
        segments.push(currentSegment.join(' '));
        currentSegment = [];
      }
    } else {
      const x = padding.left + i * xStep;
      const y = normalizeY(point.v);
      const command = currentSegment.length === 0 ? 'M' : 'L';
      currentSegment.push(`${command} ${x.toFixed(2)} ${y.toFixed(2)}`);
    }
  });

  // Agregar último segmento
  if (currentSegment.length > 0) {
    segments.push(currentSegment.join(' '));
  }

  // Puntos para dots
  const points = validData.map((point, i) => {
    const x = padding.left + i * xStep;
    const y = normalizeY(point.v!);
    return { x, y, value: point.v! };
  });

  // Líneas de guía (3 ticks horizontales)
  const guideTicks = [minY, (minY + maxY) / 2, maxY].map((tickValue) => ({
    value: tickValue,
    y: normalizeY(tickValue),
  }));

  return (
    <View
      style={{ width, height }}
      accessibilityRole="image"
      accessibilityLabel={`Gráfica de líneas: ${validData.length} puntos, rango ${minY} a ${maxY}`}
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
            stroke="#E5E7EB"
            strokeWidth="1"
            strokeDasharray="2,2"
          />
        ))}

        {/* Path de línea(s) */}
        {segments.map((segment, i) => (
          <Path
            key={i}
            d={segment}
            stroke="#6366F1"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Puntos */}
        {showDots && points.map((point, i) => (
          <Circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#6366F1"
            stroke="#FFFFFF"
            strokeWidth="2"
          />
        ))}

        {/* Etiquetas Y (ticks) */}
        {guideTicks.map((tick, i) => (
          <SvgText
            key={i}
            x={padding.left - 4}
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
