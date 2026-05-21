/**
 * InteractiveGraph3D - Visualización 3D con gestos táctiles
 */

import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Graph3DView from './Graph3DView';
import type { GraphNode, GraphEdge } from '../../types/graph';

interface InteractiveGraph3DProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodePress?: (nodeId: string) => void;
}

export default function InteractiveGraph3D({
  nodes,
  edges,
  onNodePress,
}: InteractiveGraph3DProps) {
  // Shared values para transformaciones
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Referencias para gestos
  const savedScale = useSharedValue(1);
  const savedRotation = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Pinch gesture (zoom)
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  // Rotation gesture
  const rotationGesture = Gesture.Rotation()
    .onUpdate((e) => {
      rotation.value = savedRotation.value + e.rotation;
    })
    .onEnd(() => {
      savedRotation.value = rotation.value;
    });

  // Pan gesture (arrastar)
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Combinar gestos
  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    rotationGesture,
    panGesture
  );

  // Estilo animado
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
        { rotateZ: `${rotation.value}rad` },
      ],
    };
  });

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.graphContainer, animatedStyle]}>
          <Graph3DView
            nodes={nodes}
            edges={edges}
            onNodePress={onNodePress}
            autoRotate={false} // Desactivar rotación automática con gestos
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  graphContainer: {
    flex: 1,
  },
});
