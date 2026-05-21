/**
 * GraphView.tsx
 * Grafo interactivo con estilo cluster (áreas de color translúcidas) y gestos.
 * - Pan con 1 dedo
 * - Pinch-to-zoom con 2 dedos
 * - Tap para seleccionar nodos
 */

import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { View, PanResponder, GestureResponderEvent } from 'react-native';
import Svg, { G, Line, Circle, Text as SvgText, Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';
import { useTheme } from '@contexts/ThemeContext';
import type { PositionedNode } from '@features/discover/graphLayout';
import type { GraphEdge } from '@features/discover/graphRepo';

type Props = {
  nodes: PositionedNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
  filter?: { 
    topic?: boolean; 
    phrase?: boolean; 
    emotion?: boolean; 
    activity?: boolean; 
    person?: boolean; 
    trigger?: boolean; 
  };
  selectedId?: string;
  onSelectNode?: (id: string) => void;
  onTransformChange?: (transform: { scale: number; translateX: number; translateY: number }) => void;
  externalTransform?: { scale: number; translateX: number; translateY: number };
};

// Colores semánticos por tipo de nodo
const NODE_COLORS = {
  emotion: { fill: '#FEF3C7', stroke: '#F59E0B', area: 'rgba(255,200,150,0.15)' },    // amarillo/naranja
  activity: { fill: '#E9D5FF', stroke: '#A855F7', area: 'rgba(200,150,255,0.15)' },  // morado
  person: { fill: '#FBCFE8', stroke: '#EC4899', area: 'rgba(255,150,200,0.15)' },    // rosa
  topic: { fill: '#DBEAFE', stroke: '#3B82F6', area: 'rgba(150,200,255,0.12)' },     // azul
  phrase: { fill: '#D1FAE5', stroke: '#10B981', area: 'rgba(150,255,200,0.12)' },    // verde
  trigger: { fill: '#FED7AA', stroke: '#F97316', area: 'rgba(255,180,120,0.15)' },   // naranja
};

// Colores para modo oscuro
const NODE_COLORS_DARK = {
  emotion: { fill: '#78350F', stroke: '#FBBF24', area: 'rgba(255,200,150,0.1)' },
  activity: { fill: '#581C87', stroke: '#C084FC', area: 'rgba(200,150,255,0.1)' },
  person: { fill: '#831843', stroke: '#F472B6', area: 'rgba(255,150,200,0.1)' },
  topic: { fill: '#1E3A8A', stroke: '#60A5FA', area: 'rgba(150,200,255,0.08)' },
  phrase: { fill: '#064E3B', stroke: '#34D399', area: 'rgba(150,255,200,0.08)' },
  trigger: { fill: '#7C2D12', stroke: '#FB923C', area: 'rgba(255,180,120,0.1)' },
};

const COLORS = {
  node_text: '#374151',                // texto gris oscuro
  edge_stroke: 'rgba(0,0,0,0.25)',     // negro más visible para aristas
  selected_glow: '#8B5CF6',            // morado brillante para selección
};

const COLORS_DARK = {
  node_text: '#FFFFFF',                // texto blanco
  edge_stroke: 'rgba(255,255,255,0.5)', // aristas más visibles
  selected_glow: '#A78BFA',            // morado claro para selección
};


function GraphView({
  nodes,
  edges,
  width,
  height,
  filter = { 
    topic: true, 
    phrase: true, 
    emotion: true, 
    activity: true, 
    person: true, 
    trigger: true 
  },
  selectedId,
  onSelectNode,
  onTransformChange,
  externalTransform,
}: Props) {
  // Theme
  const { isDark, colors } = useTheme();
  const nodeColors = isDark ? NODE_COLORS_DARK : NODE_COLORS;
  const themeColors = isDark ? COLORS_DARK : COLORS;
  const backgroundColor = isDark ? '#111827' : '#F7F9FC';
  
  // Estado de transformación
  const [transform, setTransform] = useState({ scale: 1, translateX: 0, translateY: 0 });
  const transformRef = useRef({ scale: 1, translateX: 0, translateY: 0 });
  const lastUpdateTime = useRef(0);
  
  // Sincronizar con transform externo (del slider)
  useEffect(() => {
    if (externalTransform) {
      setTransform(externalTransform);
      transformRef.current = externalTransform;
    }
  }, [externalTransform]);
  
  // Animación de latido para nodo seleccionado
  const [heartbeatScale, setHeartbeatScale] = useState(1);
  
  useEffect(() => {
    if (selectedId) {
      // Animación de latido continua con setInterval
      let growing = true;
      const interval = setInterval(() => {
        setHeartbeatScale(prev => {
          if (growing) {
            if (prev >= 1.15) {
              growing = false;
              return prev;
            }
            return prev + 0.03;
          } else {
            if (prev <= 1) {
              growing = true;
              return prev;
            }
            return prev - 0.03;
          }
        });
      }, 30);
      
      return () => clearInterval(interval);
    } else {
      setHeartbeatScale(1);
    }
  }, [selectedId]);
  const gestureState = useRef({ 
    startScale: 1, 
    startTranslateX: 0, 
    startTranslateY: 0,
    lastDistance: 0,
    initialTouches: [] as Array<{x: number, y: number}>
  });

  // Throttled setTransform para evitar renders excesivos
  const updateTransform = useCallback((newTransform: typeof transform) => {
    transformRef.current = newTransform;
    
    // Throttle: actualizar UI máximo cada 16ms (~60fps)
    const now = Date.now();
    if (now - lastUpdateTime.current > 16) {
      setTransform(newTransform);
      lastUpdateTime.current = now;
    }
  }, []);

  // PanResponder para gestos táctiles mejorado
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      
      onPanResponderGrant: (evt) => {
        // Guardar estado inicial
        gestureState.current.startScale = transformRef.current.scale;
        gestureState.current.startTranslateX = transformRef.current.translateX;
        gestureState.current.startTranslateY = transformRef.current.translateY;
        
        // Guardar posiciones iniciales de toques
        gestureState.current.initialTouches = evt.nativeEvent.touches.map(t => ({
          x: t.pageX,
          y: t.pageY
        }));
        
        // Calcular distancia inicial para pinch
        if (evt.nativeEvent.touches.length === 2) {
          const [t1, t2] = evt.nativeEvent.touches;
          const dx = t1.pageX - t2.pageX;
          const dy = t1.pageY - t2.pageY;
          gestureState.current.lastDistance = Math.sqrt(dx * dx + dy * dy);
        }
      },
      
      onPanResponderMove: (evt, state) => {
        const touches = evt.nativeEvent.touches;
        
        if (touches.length === 2) {
          // PINCH TO ZOOM
          const [t1, t2] = touches;
          const dx = t1.pageX - t2.pageX;
          const dy = t1.pageY - t2.pageY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (gestureState.current.lastDistance > 0) {
            const scaleChange = distance / gestureState.current.lastDistance;
            let newScale = gestureState.current.startScale * scaleChange;
            
            // Limitar zoom entre 0.5x y 3x
            newScale = Math.max(0.5, Math.min(3, newScale));
            
            updateTransform({
              ...transformRef.current,
              scale: newScale
            });
          }
          
          gestureState.current.lastDistance = distance;
        } else if (touches.length === 1) {
          // PAN (deslizar)
          updateTransform({
            ...transformRef.current,
            translateX: gestureState.current.startTranslateX + state.dx,
            translateY: gestureState.current.startTranslateY + state.dy
          });
        }
      },
      
      onPanResponderRelease: (evt) => {
        // Asegurar actualización final
        setTransform(transformRef.current);
        
        // Detectar tap en nodo si no hubo movimiento significativo
        if (evt.nativeEvent.touches.length === 0 && onSelectNode) {
          const touch = evt.nativeEvent.changedTouches[0];
          if (touch) {
            // Usar locationX/locationY que son coordenadas relativas al componente
            // Si no están disponibles, usar pageX/pageY
            const x = touch.locationX ?? touch.pageX;
            const y = touch.locationY ?? touch.pageY;
            handleNodeTap(x, y);
          }
        }
        
        // Notificar cambio de transformación
        onTransformChange?.(transformRef.current);
        
        // Reset gesture state
        gestureState.current.lastDistance = 0;
      },
    })
  ).current;

  // Filtrar nodos visibles y pre-calcular datos (memoizado)
  const visibleNodes = useMemo(() => {
    const activeType = (t: string) => {
      if (t === 'topic') return filter.topic !== false;
      if (t === 'phrase') return filter.phrase !== false;
      if (t === 'emotion') return filter.emotion !== false;
      if (t === 'activity') return filter.activity !== false;
      if (t === 'person') return filter.person !== false;
      if (t === 'trigger') return filter.trigger !== false;
      return true;
    };
    
    // Ajuste de escala inverso para texto (más pequeño cuando hacemos zoom)
    const textScale = Math.max(0.6, Math.min(1, 1 / transform.scale));
    
    return nodes
      .filter((n) => activeType(n.type))
      .map((node) => {
        const nodeType = node.type as keyof typeof NODE_COLORS;
        const color = nodeColors[nodeType] || nodeColors.topic;
        
        // Mostrar label completo sin truncar
        const label = node.label;
        
        // Font size proporcional al radio pero ajustado por zoom
        const baseFontSize = Math.max(9, Math.min(13, node.r * 0.45));
        const fontSize = baseFontSize * textScale;
        
        return {
          ...node,
          color,
          displayLabel: label,
          fontSize,
        };
      });
  }, [nodes, filter, transform.scale, nodeColors]);

  const nodeMap = useMemo(() => 
    Object.fromEntries(visibleNodes.map((n) => [n.id, n])),
    [visibleNodes]
  );

  const visibleEdges = useMemo(() => 
    edges.filter((e) => nodeMap[e.source] && nodeMap[e.target]),
    [edges, nodeMap]
  );

  // Detectar tap en nodo (memoizado)
  const handleNodeTap = useCallback((touchX: number, touchY: number) => {
    if (!onSelectNode) return;
    
    // Las coordenadas vienen del SVG, ya transformadas por el sistema de coordenadas
    // Necesitamos aplicar la transformación inversa para obtener las coordenadas del grafo
    
    // Primero, calcular el centro del viewport (punto de origen de la transformación)
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Aplicar transformación inversa:
    // 1. Restar la traslación
    // 2. Dividir por la escala
    // 3. Ajustar por el centro
    const graphX = ((touchX - centerX - transform.translateX) / transform.scale) + centerX;
    const graphY = ((touchY - centerY - transform.translateY) / transform.scale) + centerY;
    
    // Buscar nodo más cercano
    let closestNode: PositionedNode | null = null;
    let minDistance = Infinity;
    
    for (const node of visibleNodes) {
      const dx = graphX - node.x;
      const dy = graphY - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Tolerancia de tap (en coordenadas del grafo)
      const tolerance = 15;
      if (dist <= node.r + tolerance && dist < minDistance) {
        minDistance = dist;
        closestNode = node;
      }
    }
    
    if (closestNode) {
      onSelectNode(closestNode.id);
    }
  }, [onSelectNode, transform, visibleNodes, width, height]);

  // Calcular clusters solo para triggers (memoizado)
  const clusters = useMemo(() => {
    if (visibleNodes.length === 0) return [];
    
    // Solo crear clusters para nodos tipo "trigger"
    const triggerNodes = visibleNodes.filter(n => n.type === 'trigger');
    if (triggerNodes.length === 0) return [];
    
    let sumX = 0, sumY = 0, maxDist = 0;
    for (const n of triggerNodes) {
      sumX += n.x;
      sumY += n.y;
    }
    const centerX = sumX / triggerNodes.length;
    const centerY = sumY / triggerNodes.length;
    
    for (const n of triggerNodes) {
      const dist = Math.sqrt((n.x - centerX) ** 2 + (n.y - centerY) ** 2) + n.r;
      if (dist > maxDist) maxDist = dist;
    }
    
    return [{ 
      type: 'trigger', 
      centerX, 
      centerY, 
      radiusX: maxDist + 40, 
      radiusY: maxDist + 30,
      color: nodeColors.trigger.area
    }];
  }, [visibleNodes, nodeColors]);

  // Pre-calcular edges con estilos y labels
  const styledEdges = useMemo(() => {
    // Ajuste de escala inverso para líneas (más delgadas cuando hacemos zoom)
    const lineScale = Math.max(0.5, Math.min(1, 1 / transform.scale));
    
    return visibleEdges.map(edge => {
      const source = nodeMap[edge.source];
      const target = nodeMap[edge.target];
      if (!source || !target) return null;
      
      // Calcular punto medio para label
      const midX = (source.x + target.x) / 2;
      const midY = (source.y + target.y) / 2;
      
      // Generar descripción de relación basada en tipos de nodos
      let relationLabel = '';
      const sourceType = source.type;
      const targetType = target.type;
      
      // Describir la relación según los tipos de nodos conectados
      if (sourceType === 'emotion' && targetType === 'activity') {
        relationLabel = 'siente al';
      } else if (sourceType === 'activity' && targetType === 'emotion') {
        relationLabel = 'genera';
      } else if (sourceType === 'person' && targetType === 'emotion') {
        relationLabel = 'provoca';
      } else if (sourceType === 'emotion' && targetType === 'person') {
        relationLabel = 'hacia';
      } else if (sourceType === 'trigger' && targetType === 'emotion') {
        relationLabel = 'causa';
      } else if (sourceType === 'activity' && targetType === 'person') {
        relationLabel = 'con';
      } else if (sourceType === 'person' && targetType === 'activity') {
        relationLabel = 'realiza';
      } else if (edge.weight >= 5) {
        relationLabel = 'muy unido';
      } else if (edge.weight >= 3) {
        relationLabel = 'conectado';
      } else {
        relationLabel = 'relacionado';
      }
      
      // Ajustar strokeWidth por zoom
      const baseStrokeWidth = Math.max(1.5, Math.min(4, edge.weight / 2));
      
      return {
        ...edge,
        strokeWidth: baseStrokeWidth * lineScale,
        opacity: edge.weight >= 5 ? 0.4 : 0.25,
        midX,
        midY,
        label: relationLabel,
        source,
        target
      };
    }).filter(Boolean);
  }, [visibleEdges, nodeMap, transform.scale]);

  return (
    <View 
      style={{ width, height, backgroundColor }}
      {...panResponder.panHandlers}
    >
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="selected-glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={themeColors.selected_glow} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={themeColors.selected_glow} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        <G
          transform={`translate(${transform.translateX}, ${transform.translateY}) scale(${transform.scale})`}
          origin={`${width/2}, ${height/2}`}
        >
          {/* ÁREAS DE FONDO (clusters optimizados) */}
          {clusters.map((cluster, i) => (
            <Ellipse
              key={`c${i}`}
              cx={cluster.centerX}
              cy={cluster.centerY}
              rx={cluster.radiusX}
              ry={cluster.radiusY}
              fill={cluster.color}
              opacity={0.6}
            />
          ))}

          {/* CONEXIONES (con labels descriptivos) */}
          {styledEdges.map((edge) => {
            if (!edge) return null;
            
            // Calcular font size responsive al zoom
            const textScale = Math.max(0.6, Math.min(1, 1 / transform.scale));
            const edgeFontSize = 9 * textScale;

            return (
              <G key={edge.id}>
                <Line
                  x1={edge.source.x}
                  y1={edge.source.y}
                  x2={edge.target.x}
                  y2={edge.target.y}
                  stroke={themeColors.edge_stroke}
                  strokeWidth={edge.strokeWidth}
                  opacity={edge.opacity}
                  strokeLinecap="round"
                />
                {edge.label && edge.weight >= 2 && (
                  <>
                    {/* Background para label */}
                    <SvgText
                      x={edge.midX}
                      y={edge.midY}
                      fontSize={edgeFontSize}
                      fill="white"
                      textAnchor="middle"
                      alignmentBaseline="central"
                      fontWeight="700"
                      stroke="white"
                      strokeWidth={3 * textScale}
                      opacity={0.95}
                    >
                      {edge.label}
                    </SvgText>
                    {/* Texto del label */}
                    <SvgText
                      x={edge.midX}
                      y={edge.midY}
                      fontSize={edgeFontSize}
                      fill="#6B7280"
                      textAnchor="middle"
                      alignmentBaseline="central"
                      fontWeight="600"
                    >
                      {edge.label}
                    </SvgText>
                  </>
                )}
              </G>
            );
          })}

          {/* NODOS (con iconos según tipo) */}
          {visibleNodes.map((node) => {
            const isSelected = node.id === selectedId;
            const nodeType = node.type;
            const showIcon = ['person', 'emotion', 'activity', 'trigger'].includes(nodeType);
            
            // Ajuste de escala para strokes (inversamente proporcional al zoom)
            const strokeScale = Math.max(0.5, Math.min(1, 1 / transform.scale));
            const nodeStrokeWidth = (isSelected ? 3 : 2) * strokeScale;
            const textStrokeWidth = 4 * strokeScale;

            return (
              <G key={node.id}>
                {isSelected && (
                  <>
                    {/* Aura externa pulsante */}
                    <Circle
                      cx={node.x}
                      cy={node.y}
                      r={(node.r + 25) * heartbeatScale}
                      fill="url(#selected-glow)"
                      opacity={0.3 / heartbeatScale}
                    />
                    {/* Aura media */}
                    <Circle
                      cx={node.x}
                      cy={node.y}
                      r={(node.r + 18) * heartbeatScale}
                      fill="url(#selected-glow)"
                      opacity={0.5 / heartbeatScale}
                    />
                    {/* Aura interna */}
                    <Circle
                      cx={node.x}
                      cy={node.y}
                      r={(node.r + 10) * heartbeatScale}
                      fill="url(#selected-glow)"
                      opacity={0.7 / heartbeatScale}
                    />
                  </>
                )}
                
                <Circle
                  cx={node.x}
                  cy={node.y}
                  r={node.r}
                  fill={node.color.fill}
                  stroke={isSelected ? themeColors.selected_glow : node.color.stroke}
                  strokeWidth={nodeStrokeWidth}
                />
                
                {showIcon ? (
                  <G>
                    {/* Iconos según tipo */}
                    {nodeType === 'person' && (
                      // Icono de persona
                      <>
                        <Circle
                          cx={node.x}
                          cy={node.y - node.r * 0.15}
                          r={node.r * 0.22}
                          fill={themeColors.node_text}
                        />
                        <Circle
                          cx={node.x}
                          cy={node.y + node.r * 0.3}
                          r={node.r * 0.32}
                          fill={themeColors.node_text}
                        />
                      </>
                    )}
                    {nodeType === 'emotion' && (
                      // Emoji de corazón
                      <SvgText
                        x={node.x}
                        y={node.y}
                        fontSize={node.r * 0.75}
                        fill={themeColors.node_text}
                        textAnchor="middle"
                        alignmentBaseline="central"
                        fontWeight="bold"
                      >
                        💛
                      </SvgText>
                    )}
                    {nodeType === 'activity' && (
                      // Rayo/bolt
                      <SvgText
                        x={node.x}
                        y={node.y}
                        fontSize={node.r * 0.8}
                        fill={themeColors.node_text}
                        textAnchor="middle"
                        alignmentBaseline="central"
                        fontWeight="bold"
                      >
                        ⚡
                      </SvgText>
                    )}
                    {nodeType === 'trigger' && (
                      // Alerta
                      <>
                        <SvgText
                          x={node.x}
                          y={node.y - node.r * 0.05}
                          fontSize={node.r * 0.7}
                          fill={themeColors.node_text}
                          textAnchor="middle"
                          alignmentBaseline="central"
                          fontWeight="bold"
                        >
                          ⚠
                        </SvgText>
                      </>
                    )}
                    {/* Nombre debajo del icono */}
                    {!isDark && (
                      <SvgText
                        x={node.x}
                        y={node.y + node.r + 12}
                        fontSize={node.fontSize}
                        fill="white"
                        textAnchor="middle"
                        fontWeight="700"
                        stroke="white"
                        strokeWidth={textStrokeWidth}
                        opacity={0.9}
                      >
                        {node.displayLabel}
                      </SvgText>
                    )}
                    <SvgText
                      x={node.x}
                      y={node.y + node.r + 12}
                      fontSize={node.fontSize}
                      fill={themeColors.node_text}
                      textAnchor="middle"
                      fontWeight={isSelected ? "700" : "600"}
                    >
                      {node.displayLabel}
                    </SvgText>
                  </G>
                ) : (
                  // Texto normal
                  <>
                    {!isDark && (
                      <SvgText
                        x={node.x}
                        y={node.y}
                        fontSize={node.fontSize}
                        fill="white"
                        textAnchor="middle"
                        alignmentBaseline="central"
                        fontWeight="700"
                        stroke="white"
                        strokeWidth={textStrokeWidth}
                        opacity={0.9}
                      >
                        {node.displayLabel}
                      </SvgText>
                    )}
                    <SvgText
                      x={node.x}
                      y={node.y}
                      fontSize={node.fontSize}
                      fill={themeColors.node_text}
                      textAnchor="middle"
                      alignmentBaseline="central"
                      fontWeight={isSelected ? "700" : "600"}
                    >
                      {node.displayLabel}
                    </SvgText>
                  </>
                )}
              </G>
            );
          })}
        </G>
      </Svg>
    </View>
  );
}

// Memoizar para evitar re-renders innecesarios
export default React.memo(GraphView, (prevProps, nextProps) => {
  // Solo re-renderizar si cambian estos props críticos
  return (
    prevProps.selectedId === nextProps.selectedId &&
    prevProps.nodes === nextProps.nodes &&
    prevProps.edges === nextProps.edges &&
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height &&
    JSON.stringify(prevProps.filter) === JSON.stringify(nextProps.filter)
  );
});
