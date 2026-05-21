/**
 * Graph2DView - Visualización 2D de grafo de patrones con SVG
 * Renderizado rápido y eficiente para dispositivos con menos potencia
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Text, Pressable, ScrollView, Platform } from 'react-native';
import Svg, { Circle, Line, G, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@contexts/ThemeContext';
import type { GraphNode, GraphEdge } from '../../types/graph';

// Colores por tipo de patrón
const TYPE_COLORS: Record<string, string> = {
  emotion: '#8B5CF6',    // purple-500
  activity: '#3B82F6',   // blue-500
  person: '#10B981',     // green-500
  place: '#F59E0B',      // amber-500
  topic: '#6366F1',      // indigo-500
  trigger: '#EF4444',    // red-500
  thought_pattern: '#EC4899', // pink-500
  need: '#14B8A6',       // teal-500
  context: '#F97316',    // orange-500
};

interface Graph2DViewProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodePress?: (nodeId: string) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CANVAS_SIZE = Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.8; // Reducido de 1.5 a 0.8
const CENTER_X = CANVAS_SIZE / 2;
const CENTER_Y = CANVAS_SIZE / 2;

// Offset para mantener UI encima de la navigation bar / home indicator
const NAV_BAR_HEIGHT = SCREEN_HEIGHT >= 812 ? 90 : 72;

export default function Graph2DView({
  nodes,
  edges,
  onNodePress,
}: Graph2DViewProps) {
  const { isDark, colors } = useTheme();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  // Colores dinámicos según el tema
  const themeColors = useMemo(() => ({
    background: isDark ? '#111827' : '#f9fafb',
    controlBg: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    buttonBg: isDark ? '#374151' : '#f3f4f6',
    text: isDark ? '#F9FAFB' : '#374151',
    textSecondary: isDark ? '#9CA3AF' : '#6b7280',
    edgeColor: isDark ? '#6B7280' : '#94a3b8',
    labelColor: isDark ? '#E5E7EB' : '#374151',
  }), [isDark]);

  // Convertir coordenadas 3D a 2D (proyección en plano XY)
  const get2DPosition = (node: GraphNode) => {
    // Escalar y centrar las posiciones (reducido de 150 a 80)
    const scale = 80 * zoom;
    const x = CENTER_X + node.position.x * scale + panX;
    const y = CENTER_Y + node.position.y * scale + panY;
    return { x, y };
  };

  // Control handlers
  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.3, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.3, 0.3));
  const handleResetView = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };
  const handlePanUp = () => setPanY(prev => prev + 50);
  const handlePanDown = () => setPanY(prev => prev - 50);
  const handlePanLeft = () => setPanX(prev => prev + 50);
  const handlePanRight = () => setPanX(prev => prev - 50);

  const handleNodePress = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    onNodePress?.(nodeId);
  };

  // Soporte de teclado para navegación (desktop)
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (e: any) => {
      switch (e.key) {
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
        case '_':
          handleZoomOut();
          break;
        case '0':
          handleResetView();
          break;
        case 'ArrowUp':
          e.preventDefault();
          handlePanUp();
          break;
        case 'ArrowDown':
          e.preventDefault();
          handlePanDown();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePanLeft();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handlePanRight();
          break;
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, []);

  if (nodes.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: themeColors.background }]}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={[styles.emptyTitle, { color: themeColors.text }]}>Sin datos para mostrar</Text>
        <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
          Genera el grafo desde el botón "Generar Nuevo Grafo".
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        horizontal={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        bounces={true}
        bouncesZoom={true}
        maximumZoomScale={2}
        minimumZoomScale={0.5}
      >
        <View style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}>
          <Svg width={CANVAS_SIZE} height={CANVAS_SIZE} style={[styles.svg, { backgroundColor: themeColors.background }]}>
            {/* Renderizar edges primero (debajo de los nodos) */}
            <G>
              {edges.map((edge, index) => {
                const sourceNode = nodes.find(n => n.pattern.id === edge.source);
                const targetNode = nodes.find(n => n.pattern.id === edge.target);

                if (!sourceNode || !targetNode) return null;

                const source = get2DPosition(sourceNode);
                const target = get2DPosition(targetNode);

                // Opacidad basada en peso
                const opacity = 0.3 + (edge.weight || 0.5) * 0.4;

                return (
                  <Line
                    key={`edge-${index}`}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={themeColors.edgeColor}
                    strokeWidth={2}
                    opacity={opacity}
                  />
                );
              })}
            </G>

            {/* Renderizar nodos */}
            <G>
              {nodes.map((node) => {
                const position = get2DPosition(node);
                const radius = 10 + node.size * 30; // Radio basado en tamaño
                const color = TYPE_COLORS[node.pattern.type] || '#6B7280';
                const isSelected = selectedNodeId === node.pattern.id;

                return (
                  <G key={node.pattern.id}>
                    {/* Halo de selección */}
                    {isSelected && (
                      <Circle
                        cx={position.x}
                        cy={position.y}
                        r={radius + 8}
                        fill="none"
                        stroke={color}
                        strokeWidth={3}
                        opacity={0.5}
                      />
                    )}

                    {/* Nodo */}
                    <Circle
                      cx={position.x}
                      cy={position.y}
                      r={radius}
                      fill={color}
                      opacity={0.9}
                      onPress={() => handleNodePress(node.pattern.id)}
                    />

                    {/* Etiqueta del nodo */}
                    <SvgText
                      x={position.x}
                      y={position.y + radius + 16}
                      fontSize={12}
                      fontWeight="600"
                      fill={themeColors.labelColor}
                      textAnchor="middle"
                      onPress={() => handleNodePress(node.pattern.id)}
                    >
                      {node.pattern.label}
                    </SvgText>
                  </G>
                );
              })}
            </G>
          </Svg>
        </View>
      </ScrollView>

      {/* Controles de navegación */}
      <View style={styles.controls}>
        {/* Zoom controls */}
        <View style={[styles.zoomControls, { backgroundColor: themeColors.controlBg }]}>
          <Pressable style={[styles.controlButton, { backgroundColor: themeColors.buttonBg }]} onPress={handleZoomIn}>
            <Text style={[styles.controlButtonText, { color: themeColors.text }]}>+</Text>
          </Pressable>
          <Pressable style={[styles.controlButton, { backgroundColor: themeColors.buttonBg }]} onPress={handleZoomOut}>
            <Text style={[styles.controlButtonText, { color: themeColors.text }]}>−</Text>
          </Pressable>
          <Pressable style={[styles.controlButton, { backgroundColor: themeColors.buttonBg }]} onPress={handleResetView}>
            <Text style={[styles.controlButtonTextSmall, { color: themeColors.text }]}>⟲</Text>
          </Pressable>
        </View>

        {/* Pan controls */}
        <View style={[styles.panControls, { backgroundColor: themeColors.controlBg }]}>
          <Pressable style={[styles.controlButton, { backgroundColor: themeColors.buttonBg }]} onPress={handlePanUp}>
            <Text style={[styles.controlButtonText, { color: themeColors.text }]}>↑</Text>
          </Pressable>
          <View style={styles.panRow}>
            <Pressable style={[styles.controlButton, { backgroundColor: themeColors.buttonBg }]} onPress={handlePanLeft}>
              <Text style={[styles.controlButtonText, { color: themeColors.text }]}>←</Text>
            </Pressable>
            <Pressable style={[styles.controlButton, { backgroundColor: themeColors.buttonBg }]} onPress={handlePanRight}>
              <Text style={[styles.controlButtonText, { color: themeColors.text }]}>→</Text>
            </Pressable>
          </View>
          <Pressable style={[styles.controlButton, { backgroundColor: themeColors.buttonBg }]} onPress={handlePanDown}>
            <Text style={[styles.controlButtonText, { color: themeColors.text }]}>↓</Text>
          </Pressable>
        </View>
      </View>

      {/* Leyenda de colores */}
      <View style={[styles.legend, { backgroundColor: themeColors.controlBg }]}>
        <LegendItem color={TYPE_COLORS.emotion} label="Emociones" textColor={themeColors.textSecondary} />
        <LegendItem color={TYPE_COLORS.activity} label="Actividades" textColor={themeColors.textSecondary} />
        <LegendItem color={TYPE_COLORS.person} label="Personas" textColor={themeColors.textSecondary} />
        <LegendItem color={TYPE_COLORS.trigger} label="Triggers" textColor={themeColors.textSecondary} />
        <LegendItem color={TYPE_COLORS.context} label="Contextos" textColor={themeColors.textSecondary} />
      </View>

      {/* Instrucciones */}
      <View style={[styles.instructions, { backgroundColor: themeColors.controlBg }]}>
        <Text style={[styles.instructionText, { color: themeColors.textSecondary }]}>
          {Platform.OS === 'web' 
            ? '👆 Clic en nodo • ⌨️ Flechas=mover • +/- =zoom • 0=reset'
            : '👆 Toca un nodo para ver detalles • 🔍 Desplázate para explorar'
          }
        </Text>
      </View>
    </View>
  );
}

function LegendItem({ color, label, textColor }: { color: string; label: string; textColor?: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, textColor ? { color: textColor } : {}]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    backgroundColor: '#f9fafb',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f9fafb',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  legend: {
    position: 'absolute',
    bottom: NAV_BAR_HEIGHT + 12,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 11,
    color: '#4b5563',
  },
  instructions: {
    position: 'absolute',
    bottom: NAV_BAR_HEIGHT + 64,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  instructionText: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
  },
  controls: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 12,
  },
  zoomControls: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 10,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  panControls: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  panRow: {
    flexDirection: 'row',
    gap: 4,
  },
  controlButton: {
    width: 44,
    height: 44,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#374151',
  },
  controlButtonTextSmall: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
  },
});
