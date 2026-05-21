/**
 * Discover3DGraphScreen - Pantalla con grafo 3D interactivo
 * Nueva versión con visualización Three.js
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DiscoverStackParamList } from '../../navigation/types';
import InteractiveGraph3D from '../../components/graph/InteractiveGraph3DImproved';
import Graph2DView from '../../components/graph/Graph2DView';
import { useGraphData } from '../../hooks/useGraphData';
import type { NodeInteraction, GraphFilters, PatternType } from '../../types/graph';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';

type ViewMode = '2D' | '3D';
const VIEW_MODE_KEY = '@graph_view_mode';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'Discover3DGraph'>;

export default function Discover3DGraphScreen({ navigation }: Props) {
  const { nodes, edges, loading, error, refresh, applyFilters } = useGraphData();
  
  const [selectedNode, setSelectedNode] = useState<NodeInteraction | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<GraphFilters>({});
  const [viewMode, setViewMode] = useState<ViewMode>('2D');

  // Cargar preferencia de vista guardada
  useEffect(() => {
    AsyncStorage.getItem(VIEW_MODE_KEY).then(mode => {
      if (mode === '2D' || mode === '3D') {
        setViewMode(mode);
      }
    });
  }, []);

  // Guardar preferencia cuando cambia
  const handleViewModeChange = async (mode: ViewMode) => {
    setViewMode(mode);
    await AsyncStorage.setItem(VIEW_MODE_KEY, mode);
  };

  /**
   * Handler para cuando se toca un nodo
   */
  const handleNodePress = (nodeId: string) => {
    const node = nodes.find((n) => n.pattern.id === nodeId);
    if (!node) return;

    // Obtener conexiones del nodo
    const connections = edges
      .filter((e) => e.source === nodeId || e.target === nodeId)
      .map((edge) => {
        const connectedNodeId = edge.source === nodeId ? edge.target : edge.source;
        const connectedNode = nodes.find((n) => n.pattern.id === connectedNodeId);
        return {
          pattern: connectedNode!.pattern,
          weight: edge.weight,
        };
      })
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5);

    setSelectedNode({
      nodeId,
      pattern: node.pattern,
      relatedEntries: [],
      connections,
    });
  };

  /**
   * Aplicar filtros
   */
  const handleApplyFilters = (filters: GraphFilters) => {
    setActiveFilters(filters);
    applyFilters(filters);
    setShowFilters(false);
  };

  /**
   * Limpiar filtros
   */
  const handleClearFilters = () => {
    const emptyFilters: GraphFilters = {};
    setActiveFilters(emptyFilters);
    applyFilters(emptyFilters);
  };

  if (loading && nodes.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Cargando patrones...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Patrones {viewMode}</Text>
          <Text style={styles.subtitle}>
            {nodes.length} patrones • {edges.length} conexiones
          </Text>
        </View>
        <View style={styles.headerActions}>
          {/* Toggle 2D/3D */}
          <View style={styles.viewToggle}>
            <Pressable
              style={[styles.toggleButton, viewMode === '2D' && styles.toggleButtonActive]}
              onPress={() => handleViewModeChange('2D')}
            >
              <Text style={[styles.toggleButtonText, viewMode === '2D' && styles.toggleButtonTextActive]}>2D</Text>
            </Pressable>
            <Pressable
              style={[styles.toggleButton, viewMode === '3D' && styles.toggleButtonActive]}
              onPress={() => handleViewModeChange('3D')}
            >
              <Text style={[styles.toggleButtonText, viewMode === '3D' && styles.toggleButtonTextActive]}>3D</Text>
            </Pressable>
          </View>
          <Pressable
            style={styles.iconButton}
            onPress={() => setShowFilters(true)}
          >
            <Text style={styles.iconButtonText}>🔍</Text>
          </Pressable>
          <Pressable style={styles.iconButton} onPress={refresh}>
            <Text style={styles.iconButtonText}>🔄</Text>
          </Pressable>
        </View>
      </View>

      {/* Grafo 2D/3D */}
      <View style={styles.graphContainer}>
        {nodes.length > 0 ? (
          viewMode === '2D' ? (
            <Graph2DView
              nodes={nodes}
              edges={edges}
              onNodePress={handleNodePress}
            />
          ) : (
            <InteractiveGraph3D
              nodes={nodes}
              edges={edges}
              onNodePress={handleNodePress}
            />
          )
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>No hay patrones aún</Text>
            <Text style={styles.emptyText}>
              Escribe más entradas en tu diario para que el análisis pueda
              detectar patrones y conexiones.
            </Text>
          </View>
        )}
      </View>

      {/* Leyenda de colores */}
      <View style={styles.legend}>
        <LegendItem color="#8B5CF6" label="Emociones" />
        <LegendItem color="#3B82F6" label="Actividades" />
        <LegendItem color="#10B981" label="Personas" />
        <LegendItem color="#F59E0B" label="Lugares" />
        <LegendItem color="#EF4444" label="Triggers" />
      </View>

      {/* Modal de detalles del nodo */}
      {selectedNode && (
        <NodeDetailModal
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {/* Modal de filtros */}
      {showFilters && (
        <FiltersModal
          activeFilters={activeFilters}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
          onClose={() => setShowFilters(false)}
        />
      )}
    </SafeAreaView>
  );
}

/**
 * Componente de item de leyenda
 */
function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

/**
 * Modal de detalles del nodo
 */
function NodeDetailModal({
  node,
  onClose,
}: {
  node: NodeInteraction;
  onClose: () => void;
}) {
  return (
    <Modal visible transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{node.pattern.label}</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Tipo:</Text>
              <Text style={styles.statValue}>{node.pattern.type}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Frecuencia:</Text>
              <Text style={styles.statValue}>{node.pattern.frequency} veces</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Importancia:</Text>
              <Text style={styles.statValue}>
                {(node.pattern.importance * 100).toFixed(0)}%
              </Text>
            </View>

            {node.connections.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Conexiones principales</Text>
                {node.connections.map((conn, idx) => (
                  <View key={idx} style={styles.connectionItem}>
                    <Text style={styles.connectionLabel}>{conn.pattern.label}</Text>
                    <Text style={styles.connectionWeight}>
                      {(conn.weight * 100).toFixed(0)}%
                    </Text>
                  </View>
                ))}
              </>
            )}
          </ScrollView>

          <Pressable style={styles.modalButton} onPress={onClose}>
            <Text style={styles.modalButtonText}>Cerrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Modal de filtros
 */
function FiltersModal({
  activeFilters,
  onApply,
  onClear,
  onClose,
}: {
  activeFilters: GraphFilters;
  onApply: (filters: GraphFilters) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [types, setTypes] = useState<PatternType[]>(activeFilters.types || []);

  const toggleType = (type: PatternType) => {
    setTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleApply = () => {
    onApply({ types });
  };

  return (
    <Modal visible transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtros</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.sectionTitle}>Tipos de patrones</Text>
            {(['emotion', 'activity', 'person', 'place', 'trigger'] as PatternType[]).map((type) => (
              <Pressable
                key={type}
                style={[
                  styles.filterTypeButton,
                  types.includes(type) && styles.filterTypeButtonActive,
                ]}
                onPress={() => toggleType(type)}
              >
                <Text
                  style={[
                    styles.filterTypeText,
                    types.includes(type) && styles.filterTypeTextActive,
                  ]}
                >
                  {type}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.modalActions}>
            <Pressable style={styles.modalButtonSecondary} onPress={onClear}>
              <Text style={styles.modalButtonSecondaryText}>Limpiar</Text>
            </Pressable>
            <Pressable style={styles.modalButton} onPress={handleApply}>
              <Text style={styles.modalButtonText}>Aplicar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  toggleButtonTextActive: {
    color: '#8B5CF6',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonText: {
    fontSize: 20,
  },
  graphContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    fontSize: 24,
    color: '#6B7280',
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statLabel: {
    fontSize: 16,
    color: '#6B7280',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 20,
    marginBottom: 12,
  },
  connectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  connectionLabel: {
    fontSize: 15,
    color: '#374151',
  },
  connectionWeight: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  modalButton: {
    margin: 20,
    padding: 16,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
  },
  modalButtonSecondary: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTypeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 8,
  },
  filterTypeButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  filterTypeText: {
    fontSize: 15,
    color: '#374151',
    textTransform: 'capitalize',
  },
  filterTypeTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
