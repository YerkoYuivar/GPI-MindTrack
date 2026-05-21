/**
 * Graph3DView - Visualización 3D de grafo de patrones con Three.js
 * Compatible con React Native usando expo-gl
 * Incluye controles táctiles integrados (orbit)
 */

import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Text, Pressable } from 'react-native';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
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

interface Graph3DViewProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodePress?: (nodeId: string) => void;
}

export default function Graph3DView({
  nodes,
  edges,
  onNodePress,
}: Graph3DViewProps) {
  const glRef = useRef<GLView>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const nodeObjectsRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const animationFrameRef = useRef<number | null>(null);

  // Estado para cámara orbital
  const cameraDistance = useSharedValue(20);
  const cameraTheta = useSharedValue(0); // ángulo horizontal
  const cameraPhi = useSharedValue(Math.PI / 4); // ángulo vertical

  // Estados guardados para gestos
  const savedDistance = useSharedValue(20);
  const savedTheta = useSharedValue(0);
  const savedPhi = useSharedValue(Math.PI / 4);

  // Estado para nodo seleccionado
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Actualizar posición de cámara
  const updateCamera = useCallback(() => {
    if (!cameraRef.current) return;

    const r = cameraDistance.value;
    const theta = cameraTheta.value;
    const phi = cameraPhi.value;

    // Convertir coordenadas esféricas a cartesianas
    cameraRef.current.position.x = r * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.position.y = r * Math.cos(phi);
    cameraRef.current.position.z = r * Math.sin(phi) * Math.sin(theta);
    cameraRef.current.lookAt(0, 0, 0);
  }, []);

  // Gesto de pan (rotar cámara)
  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTheta.value = cameraTheta.value;
      savedPhi.value = cameraPhi.value;
    })
    .onUpdate((e) => {
      // Rotar horizontalmente con movimiento X
      cameraTheta.value = savedTheta.value + e.translationX * 0.01;
      // Rotar verticalmente con movimiento Y (limitado)
      const newPhi = savedPhi.value - e.translationY * 0.01;
      cameraPhi.value = Math.max(0.1, Math.min(Math.PI - 0.1, newPhi));
      runOnJS(updateCamera)();
    })
    .minDistance(5);

  // Gesto de pinch (zoom)
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedDistance.value = cameraDistance.value;
    })
    .onUpdate((e) => {
      const newDistance = savedDistance.value / e.scale;
      cameraDistance.value = Math.max(5, Math.min(50, newDistance));
      runOnJS(updateCamera)();
    });

  // Gesto de doble tap (reset)
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      cameraDistance.value = 20;
      cameraTheta.value = 0;
      cameraPhi.value = Math.PI / 4;
      runOnJS(updateCamera)();
    });

  // Combinar gestos
  const composedGesture = Gesture.Simultaneous(
    panGesture,
    pinchGesture,
    doubleTapGesture
  );

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    // Setup renderer
    const renderer = new Renderer({ gl });
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
    renderer.setSize(width, height);
    renderer.setClearColor(0xf3f4f6, 1); // bg-gray-100

    rendererRef.current = renderer;

    // Setup scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      60,
      width / height,
      0.1,
      1000
    );
    camera.position.set(0, 10, 20);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
    backLight.position.set(-10, -10, -10);
    scene.add(backLight);

    // Create graph objects
    const nodeObjects = new Map<string, THREE.Mesh>();

    // Render nodes
    for (const node of nodes) {
      const size = 0.5 + node.size * 0.8; // Escalar tamaño
      const geometry = new THREE.SphereGeometry(size, 32, 32);
      
      // Color por tipo
      const color = TYPE_COLORS[node.pattern.type] || '#6B7280';
      
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(color).multiplyScalar(0.15),
        shininess: 50,
        specular: new THREE.Color(0x444444),
      });

      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(
        node.position.x * 1.5,
        node.position.y * 1.5,
        node.position.z * 1.5
      );
      sphere.userData = { nodeId: node.pattern.id, pattern: node.pattern };

      scene.add(sphere);
      nodeObjects.set(node.pattern.id, sphere);
    }

    nodeObjectsRef.current = nodeObjects;

    // Render edges
    for (const edge of edges) {
      const sourceNode = nodeObjects.get(edge.source);
      const targetNode = nodeObjects.get(edge.target);

      if (!sourceNode || !targetNode) continue;

      const points = [
        sourceNode.position.clone(),
        targetNode.position.clone(),
      ];

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      
      // Color y opacidad según peso
      const opacity = 0.3 + (edge.weight || 0.5) * 0.4;
      const material = new THREE.LineBasicMaterial({
        color: 0x94a3b8,
        opacity,
        transparent: true,
      });

      const line = new THREE.Line(geometry, material);
      scene.add(line);
    }

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // Leve animación de "respiración" en los nodos
      const time = Date.now() * 0.001;
      for (const [nodeId, mesh] of nodeObjects.entries()) {
        const originalNode = nodes.find(n => n.pattern.id === nodeId);
        if (originalNode) {
          const baseY = originalNode.position.y * 1.5;
          mesh.position.y = baseY + Math.sin(time * 0.5 + mesh.position.x) * 0.08;
        }
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        gl.endFrameEXP();
      }
    };

    // Inicializar posición de cámara
    updateCamera();
    animate();
  };

  // Cleanup
  React.useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <View style={styles.glContainer} collapsable={false}>
          <GLView
            ref={glRef}
            style={styles.glView}
            onContextCreate={onContextCreate}
          />
        </View>
      </GestureDetector>

      {/* Leyenda de colores */}
      <View style={styles.legend}>
        <LegendItem color={TYPE_COLORS.emotion} label="Emociones" />
        <LegendItem color={TYPE_COLORS.activity} label="Actividades" />
        <LegendItem color={TYPE_COLORS.person} label="Personas" />
        <LegendItem color={TYPE_COLORS.trigger} label="Triggers" />
        <LegendItem color={TYPE_COLORS.context} label="Contextos" />
      </View>

      {/* Instrucciones */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          👆 Arrastra para rotar • 🤏 Pinch para zoom • 👆👆 Doble tap para resetear
        </Text>
      </View>
    </GestureHandlerRootView>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  glContainer: {
    flex: 1,
  },
  glView: {
    flex: 1,
  },
  legend: {
    position: 'absolute',
    bottom: 60,
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
    bottom: 16,
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
});
