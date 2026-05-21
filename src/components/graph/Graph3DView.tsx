/**
 * Graph3DView - Visualización 3D de grafo de patrones con Three.js
 * Compatible con React Native usando expo-gl
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import type { GraphNode, GraphEdge } from '../../types/graph';

interface Graph3DViewProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodePress?: (nodeId: string) => void;
  autoRotate?: boolean;
}

export default function Graph3DView({
  nodes,
  edges,
  onNodePress,
  autoRotate = true,
}: Graph3DViewProps) {
  const requestAnimationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (requestAnimationFrameRef.current) {
        cancelAnimationFrame(requestAnimationFrameRef.current);
      }
    };
  }, []);

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    // Setup renderer
    const renderer = new Renderer({ gl });
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
    renderer.setSize(width, height);
    renderer.setClearColor(0xf9fafb, 1); // bg-gray-50

    // Setup scene
    const scene = new THREE.Scene();

    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      75,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.1,
      1000
    );
    camera.position.z = 15;
    camera.position.y = 5;
    camera.lookAt(0, 0, 0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    // Create graph objects
    const nodeObjects = new Map<string, THREE.Mesh>();
    const edgeObjects: THREE.Line[] = [];

    // Render nodes
    for (const node of nodes) {
      const geometry = new THREE.SphereGeometry(node.size, 32, 32);
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(node.color),
        emissive: new THREE.Color(node.color).multiplyScalar(0.2),
        shininess: 30,
      });

      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(node.position.x, node.position.y, node.position.z);
      sphere.userData = { nodeId: node.pattern.id, pattern: node.pattern };

      scene.add(sphere);
      nodeObjects.set(node.pattern.id, sphere);
    }

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
      const material = new THREE.LineBasicMaterial({
        color: 0x94a3b8, // slate-400
        opacity: edge.weight * 0.6,
        transparent: true,
        linewidth: Math.max(1, edge.weight * 3),
      });

      const line = new THREE.Line(geometry, material);
      scene.add(line);
      edgeObjects.push(line);
    }

    // Animation loop
    let rotation = 0;
    const animate = () => {
      requestAnimationFrameRef.current = requestAnimationFrame(animate);

      // Auto-rotate if enabled
      if (autoRotate) {
        rotation += 0.005;
        camera.position.x = Math.sin(rotation) * 15;
        camera.position.z = Math.cos(rotation) * 15;
        camera.lookAt(0, 0, 0);
      }

      // Animate nodes with gentle bobbing
      const time = Date.now() * 0.001;
      for (const [nodeId, mesh] of nodeObjects.entries()) {
        const baseY = nodes.find(n => n.pattern.id === nodeId)?.position.y || 0;
        mesh.position.y = baseY + Math.sin(time + mesh.position.x) * 0.1;
      }

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };

    animate();
  };

  return (
    <View style={styles.container}>
      <GLView
        style={styles.glView}
        onContextCreate={onContextCreate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  glView: {
    flex: 1,
  },
});
