/**
 * InteractiveGraph3D - Visualización 3D con gestos táctiles integrados
 * Versión mejorada con controles de cámara orbital
 */

import React from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import Graph3DViewImproved from './Graph3DViewImproved';
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
  // Si no hay datos, mostrar placeholder
  if (nodes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyTitle}>Sin datos para mostrar</Text>
        <Text style={styles.emptyText}>
          Genera el grafo desde el botón "Generar Nuevo Grafo" en la pantalla de Discover.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Graph3DViewImproved
        nodes={nodes}
        edges={edges}
        onNodePress={onNodePress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});
