/**
 * DiscoverGraphScreen.tsx
 * Pantalla principal del grafo interactivo con zoom, pan y selección de nodos.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl, useWindowDimensions, SafeAreaView } from 'react-native';
import { BlurView } from 'expo-blur';
import Slider from '@react-native-community/slider';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DiscoverStackParamList } from '@navigation/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@lib/firebase';
import { layoutNodes, type PositionedNode } from '@features/discover/graphLayout';
import { useTheme } from '@contexts/ThemeContext';
import GraphView from '@components/graph/GraphView';
import GraphControls from '@components/graph/GraphControls';
import NodeDetailSheet from '@components/graph/NodeDetailSheet';
import { logger } from '@lib/diagnostics/logger';
import { auth } from '@lib/firebase/auth';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'DiscoverGraph'>;

// Tipos para el grafo desde Firestore
type Pattern = {
  id: string;
  label: string;
  type: 'topic' | 'phrase' | 'emotion';
  frequency: number;
  importance: number;
  firstSeen: Date;
  lastSeen: Date;
  sentiment?: number;
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  weight: number;
  coOccurrences: number;
};

type GraphNode = {
  id: string;
  label: string;
  type: 'topic' | 'phrase' | 'emotion' | 'activity' | 'person' | 'trigger';
  weight: number;
  updatedAt: number;
};

type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export default function DiscoverGraphScreen({ navigation }: Props) {
  const dims = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({ topic: true, phrase: true, emotion: true, activity: true, person: true, trigger: true });
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [transform, setTransform] = useState({ scale: 1, translateX: 0, translateY: 0 });
  const [resetTrigger, setResetTrigger] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Obtener usuario autenticado
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user?.uid ?? null);
    });
    return unsubscribe;
  }, []);

  // Cargar datos
  const loadGraph = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setError('Debes iniciar sesión para ver el grafo de patrones');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Leer de graphs/{userId} donde se guarda el grafo generado
      const graphDoc = await getDoc(doc(db, 'graphs', userId));

      if (!graphDoc.exists()) {
        setError('No hay grafo generado. Genera un nuevo grafo desde el botón "Generar Nuevo Grafo".');
        setData(null);
        setLoading(false);
        return;
      }

      const graphData = graphDoc.data();
      
      // Convertir patterns a nodes (formato GraphNode)
      const patterns: Pattern[] = graphData.patterns || [];
      
      const nodes: GraphNode[] = patterns.map((pattern: any) => ({
        id: pattern.id,
        label: pattern.label,
        type: pattern.type,
        weight: pattern.importance || pattern.frequency || 1,
        updatedAt: pattern.lastSeen?.toMillis?.() || Date.now(),
      }));

      // Convertir edges
      const edges: GraphEdge[] = (graphData.edges || []).map((edge: any) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        weight: edge.weight || edge.coOccurrences || 1,
        coOccurrences: edge.coOccurrences || 1,
      }));

      setData({ nodes, edges });
      logger.info('Graph loaded', { 
        nodes: nodes.length, 
        edges: edges.length 
      }, 'discover');

    } catch (e: any) {
      const msg = e?.message || String(e);
      setError(msg);
      logger.error('Graph load failed', { error: msg }, 'discover');
    } finally {
      setLoading(false);
    }
  }, [userId]); // Dependencia: userId

  useEffect(() => {
    loadGraph();
  }, [loadGraph]); // Dependencia: loadGraph (que depende de userId)

  // Calcular layout - usar pantalla completa
  const graphHeight = dims.height;
  const graphWidth = dims.width;
  
  // Generar seed único para cada carga de datos
  const layoutSeed = useMemo(() => Date.now(), [data]);
  
  const nodesPos = useMemo(() => {
    if (!data) return [];
    
    // Limitar a 50 nodos máximo para rendimiento
    const nodesToRender = data.nodes.length > 50 
      ? data.nodes
          .sort((a, b) => b.weight - a.weight)
          .slice(0, 50)
      : data.nodes;
    
    return layoutNodes(nodesToRender, { width: graphWidth, height: graphHeight }, layoutSeed);
  }, [data, graphWidth, graphHeight, layoutSeed]);

  // Memoizar nodeMap
  const nodeMap = useMemo(() => 
    Object.fromEntries(nodesPos.map((n) => [n.id, n])),
    [nodesPos]
  );

  // Memoizar edges visibles (limitados para rendimiento)
  const edgesVisible = useMemo(() => {
    if (!data) return [];
    
    const activeType = (t: string) => {
      if (t === 'topic') return filter.topic;
      if (t === 'phrase') return filter.phrase;
      if (t === 'emotion') return filter.emotion;
      if (t === 'activity') return filter.activity !== false;
      if (t === 'person') return filter.person !== false;
      if (t === 'trigger') return filter.trigger !== false;
      return true;
    };
    
    const filtered = data.edges.filter((e) => {
      const a = nodeMap[e.source];
      const b = nodeMap[e.target];
      return a && b && activeType(a.type) && activeType(b.type);
    });
    
    // Limitar a 100 edges más importantes para rendimiento
    if (filtered.length > 100) {
      return filtered
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 100);
    }
    
    return filtered;
  }, [data, nodeMap, filter]);

  // Nodo seleccionado
  const selectedNode = selectedId ? nodeMap[selectedId] : undefined;

  // Reset viewport - recentrar grafo
  const handleReset = () => {
    setSelectedId(undefined);
    setTransform({ scale: 1, translateX: 0, translateY: 0 });
    setZoomLevel(1);
    setResetTrigger(prev => prev + 1); // Trigger para forzar re-render del grafo
  };
  
  // Manejar cambio de zoom desde slider
  const handleZoomChange = (value: number) => {
    setZoomLevel(value);
    setTransform(prev => ({ ...prev, scale: value }));
  };
  
  // Sincronizar zoomLevel cuando cambia el transform desde GraphView
  useEffect(() => {
    setZoomLevel(transform.scale);
  }, [transform.scale]);

  // Navegar a JournalList con query
  const handleViewEntries = useCallback((query: string) => {
    logger.debug('View entries', { query }, 'discover');
    // Navegar al stack de Journal y luego a JournalList
    // @ts-ignore - navegación anidada
    navigation.navigate('JournalStack', { 
      screen: 'JournalList',
      params: { searchQuery: query }
    });
  }, [navigation]);

  // Estados: loading
  if (loading && !data) {
    return (
      <View style={{ backgroundColor: colors.background }} className="items-center justify-center flex-1">
        <Text style={{ color: colors.textSecondary }} className="text-lg">Cargando grafo...</Text>
      </View>
    );
  }

  // Estados: error
  if (error && !data) {
    return (
      <View style={{ backgroundColor: colors.background }} className="items-center justify-center flex-1 px-6">
        <Text className="text-6xl">📘</Text>
        <Text style={{ color: colors.text }} className="mt-4 text-lg font-semibold text-center">
          {error.includes('No hay grafo generado') 
            ? 'No hay grafo generado aún' 
            : 'Error al cargar grafo'
          }
        </Text>
        <Text style={{ color: colors.textSecondary }} className="mt-2 text-sm text-center">
          {error.includes('No hay grafo generado')
            ? 'Genera tu primer grafo de patrones presionando el botón verde "✨ Generar Nuevo Grafo" en la pantalla de Discover.'
            : error
          }
        </Text>
        <View className="flex-row gap-3 mt-6">
          <Pressable
            onPress={() => navigation.goBack()}
            style={{ backgroundColor: colors.backgroundTertiary }}
            className="px-4 py-2 rounded-xl"
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Text style={{ color: colors.text }} className="font-semibold">← Volver</Text>
          </Pressable>
          {!error.includes('No hay grafo generado') && (
            <Pressable
              onPress={loadGraph}
              style={{ backgroundColor: colors.primary }}
              className="px-4 py-2 rounded-xl"
              accessibilityRole="button"
              accessibilityLabel="Reintentar"
            >
              <Text className="font-semibold text-white">🔄 Reintentar</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // Estados: empty
  if (data && data.nodes.length === 0) {
    return (
      <ScrollView
        style={{ backgroundColor: colors.background }}
        className="flex-1"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadGraph} tintColor={colors.primary} />}
      >
        <View className="items-center px-6 mt-16">
          <Text className="text-6xl">🕸️</Text>
          <Text style={{ color: colors.text }} className="mt-4 text-lg font-semibold">
            Aún no hay patrones detectados
          </Text>
          <Text style={{ color: colors.textSecondary }} className="mt-2 text-center">
            El grafo está vacío. Regresa a la pantalla de Discover y presiona el botón verde "✨ Generar Nuevo Grafo" para analizar tus entradas.
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            style={{ backgroundColor: colors.primary }}
            className="px-4 py-2 mt-4 rounded-xl"
            accessibilityRole="button"
            accessibilityLabel="Volver al Dashboard"
          >
            <Text className="font-semibold text-white">← Volver a Discover</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // Render principal
  return (
    <View style={{ backgroundColor: isDark ? '#0F172A' : '#F9FAFB' }} className="flex-1">
      {/* Grafo a pantalla completa */}
      <GraphView
        nodes={nodesPos}
        edges={edgesVisible}
        width={graphWidth}
        height={graphHeight}
        filter={filter}
        selectedId={selectedId}
        onSelectNode={setSelectedId}
        onTransformChange={setTransform}
        externalTransform={transform}
      />

      {/* Header superpuesto - centrado */}
      <SafeAreaView className="absolute top-0 left-0 right-0" pointerEvents="box-none">
        <View className="px-4 py-3" pointerEvents="box-none">
          <View className="flex-row items-center justify-between" pointerEvents="box-none">
            {/* Botón de volver - solo ícono */}
            <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} className="rounded-full overflow-hidden shadow-lg">
              <Pressable
                onPress={() => navigation.goBack()}
                className="px-3 py-2"
                accessibilityRole="button"
                accessibilityLabel="Volver"
              >
                <Text style={{ color: colors.text }} className="text-lg">←</Text>
              </Pressable>
            </BlurView>
            
            {/* Título centrado */}
            <View className="absolute left-0 right-0 items-center" pointerEvents="none">
              <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} className="rounded-full overflow-hidden shadow-lg">
                <View className="px-4 py-2">
                  <Text style={{ color: colors.text }} className="text-base font-bold">Grafo de Patrones</Text>
                </View>
              </BlurView>
            </View>
            
            {/* Botón de reset */}
            <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} className="rounded-full overflow-hidden shadow-lg">
              <Pressable
                onPress={handleReset}
                className="px-3 py-2"
                accessibilityRole="button"
                accessibilityLabel="Recentrar grafo"
              >
                <Text className="text-base">🔄</Text>
              </Pressable>
            </BlurView>
          </View>
          
          {/* Contador de nodos */}
          <View className="items-center mt-2" pointerEvents="none">
            <BlurView intensity={60} tint={isDark ? 'dark' : 'light'} className="rounded-full overflow-hidden">
              <View className="px-3 py-1">
                <Text style={{ color: colors.textSecondary }} className="text-xs">
                  {nodesPos.length} nodos • {edgesVisible.length} conexiones
                </Text>
              </View>
            </BlurView>
          </View>
        </View>
      </SafeAreaView>

      {/* Leyenda en esquina inferior izquierda - chips apilados */}
      <View className="absolute bottom-0 left-0 pb-24" pointerEvents="box-none" style={{ marginBottom: 4 }}>
        <View className="p-2 gap-1.5">
          <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} className="flex-row items-center px-2 py-1 rounded-full overflow-hidden">
            <View className="w-2 h-2 rounded-full bg-[#FEF3C7] mr-1.5" />
            <Text style={{ color: colors.text }} className="text-[10px] font-medium">Emoción</Text>
          </BlurView>
          <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} className="flex-row items-center px-2 py-1 rounded-full overflow-hidden">
            <View className="w-2 h-2 rounded-full bg-[#E9D5FF] mr-1.5" />
            <Text style={{ color: colors.text }} className="text-[10px] font-medium">Actividad</Text>
          </BlurView>
          <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} className="flex-row items-center px-2 py-1 rounded-full overflow-hidden">
            <View className="w-2 h-2 rounded-full bg-[#FBCFE8] mr-1.5" />
            <Text style={{ color: colors.text }} className="text-[10px] font-medium">Persona</Text>
          </BlurView>
          <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} className="flex-row items-center px-2 py-1 rounded-full overflow-hidden">
            <View className="w-2 h-2 rounded-full bg-[#FED7AA] mr-1.5" />
            <Text style={{ color: colors.text }} className="text-[10px] font-medium">Trigger</Text>
          </BlurView>
          <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} className="flex-row items-center px-2 py-1 rounded-full overflow-hidden">
            <View className="w-2 h-2 rounded-full bg-[#DBEAFE] mr-1.5" />
            <Text style={{ color: colors.text }} className="text-[10px] font-medium">Tema</Text>
          </BlurView>
        </View>
      </View>
      
      {/* Control de zoom en esquina inferior derecha */}
      <View className="absolute bottom-0 right-0 pb-24" pointerEvents="box-none" style={{ marginBottom: 4 }}>
        <View className="p-2">
          <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} className="rounded-2xl overflow-hidden p-2" style={{ minWidth: 140 }}>
            <Text style={{ color: colors.text }} className="text-[10px] font-semibold mb-1 text-center">Zoom: {zoomLevel.toFixed(1)}x</Text>
            <Slider
              style={{ width: 120, height: 30 }}
              minimumValue={0.5}
              maximumValue={3}
              value={zoomLevel}
              onValueChange={handleZoomChange}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
            />
            <View className="flex-row justify-between">
              <Text style={{ color: colors.textSecondary }} className="text-[9px]">0.5x</Text>
              <Text style={{ color: colors.textSecondary }} className="text-[9px]">3x</Text>
            </View>
          </BlurView>
        </View>
      </View>

      {/* Panel de detalle (overlay) */}
      {selectedNode && (
        <NodeDetailSheet
          node={selectedNode}
          onClose={() => setSelectedId(undefined)}
          related={[]} // TODO: cargar entradas relacionadas
          onViewEntries={handleViewEntries}
        />
      )}
    </View>
  );
}
