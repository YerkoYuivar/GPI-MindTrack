/**
 * Pantalla de búsqueda avanzada con índice local
 * 
 * Búsqueda rápida en entradas con resaltado de coincidencias
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { JournalStackParamList } from '../../navigation/types';
import { Screen } from '../../components/ui/Screen';
import Header from '../../components/ui/Header';
import { useLocalSearch, SearchHit } from '../../features/search/useLocalSearch';
import { fetchAllActiveEntries } from '../../features/journal/repo';
import { ensureAuthUser } from '../../lib/firebase/auth';

type Props = NativeStackScreenProps<JournalStackParamList, 'JournalSearch'>;

/**
 * Componente para renderizar texto con resaltado
 * Convierte [[ y ]] en texto en negrita
 */
function Highlighted({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\[\[|\]\])/g);
  const elements: React.ReactNode[] = [];
  let isHighlighted = false;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (part === '[[') {
      isHighlighted = true;
    } else if (part === ']]') {
      isHighlighted = false;
    } else if (part) {
      elements.push(
        <Text
          key={i}
          className={isHighlighted ? 'font-semibold text-indigo-600' : undefined}
        >
          {part}
        </Text>
      );
    }
  }

  return <Text className={className}>{elements}</Text>;
}

/**
 * Formatea fecha para display
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Hoy';
  } else if (diffDays === 1) {
    return 'Ayer';
  } else if (diffDays < 7) {
    return `Hace ${diffDays} días`;
  } else {
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

export function JournalSearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchHit[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);

  const localSearch = useLocalSearch();

  // Construir índice si no existe o es antiguo
  useEffect(() => {
    if (localSearch.needsRebuild() && !isBuilding) {
      buildIndex();
    }
  }, [localSearch.needsRebuild()]);

  /**
   * Construye el índice desde Firestore
   */
  const buildIndex = useCallback(async () => {
    try {
      setIsBuilding(true);

      const userId = await ensureAuthUser();
      const entries = await fetchAllActiveEntries(userId, 1000);

      await localSearch.buildFromRemote(async () => entries);
    } catch (error) {
      console.error('[JournalSearchScreen] Error building index:', error);
    } finally {
      setIsBuilding(false);
    }
  }, [localSearch]);

  /**
   * Ejecuta búsqueda cuando cambia el query
   */
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    if (!localSearch.isReady) {
      return;
    }

    const hits = localSearch.search(query);
    setResults(hits);
  }, [query, localSearch.isReady]);

  /**
   * Navega a detalle de entrada
   */
  const handleSelectResult = useCallback(
    (entryId: string) => {
      navigation.navigate('JournalDetail', { entryId });
    },
    [navigation]
  );

  /**
   * Limpia búsqueda
   */
  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
  }, []);

  /**
   * Renderiza un resultado de búsqueda
   */
  const renderResult = useCallback(
    ({ item }: { item: SearchHit }) => (
      <Pressable
        onPress={() => handleSelectResult(item.id)}
        className="bg-white px-4 py-3 border-b border-gray-100 active:bg-gray-50"
      >
        <View className="flex-row items-start justify-between mb-1">
          <View className="flex-1 mr-2">
            <Highlighted
              text={item.title || 'Sin título'}
              className="text-base text-gray-900"
            />
          </View>
          <Text className="text-xs text-gray-500">
            {formatDate(item.createdAt)}
          </Text>
        </View>

        {item.snippet && (
          <Highlighted
            text={item.snippet}
            className="text-sm text-gray-600 leading-5"
          />
        )}

        <Text className="text-xs text-gray-400 mt-1">
          Score: {item.score.toFixed(1)}
        </Text>
      </Pressable>
    ),
    [handleSelectResult]
  );

  return (
    <Screen>
      <Header
        title="Buscar"
        left={
          <Pressable
            onPress={() => navigation.goBack()}
            className="w-10 h-10 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Text className="text-xl text-[#4F46E5]">←</Text>
          </Pressable>
        }
        right={
          query ? (
            <Pressable
              onPress={handleClear}
              className="px-3 py-1.5"
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda"
            >
              <Text className="text-sm text-[#4F46E5]">Limpiar</Text>
            </Pressable>
          ) : null
        }
      />

      {/* Barra de búsqueda */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar en tus entradas..."
          autoFocus
          className="bg-gray-100 rounded-lg px-4 py-2.5 text-base text-gray-900"
          placeholderTextColor="#9CA3AF"
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Estado del índice */}
        <View className="flex-row items-center mt-2">
          <Text className="text-xs text-gray-500">
            {localSearch.hasIndex
              ? `${localSearch.entryCount} entradas indexadas`
              : 'Sin índice'}
          </Text>
          
          {localSearch.needsRebuild() && !isBuilding && (
            <Pressable onPress={buildIndex} className="ml-2">
              <Text className="text-xs text-indigo-600">Reconstruir</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Contenido */}
      <View className="flex-1">
        {/* Construyendo índice */}
        {(isBuilding || localSearch.isLoading) && (
          <View className="flex-1 items-center justify-center p-8">
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text className="text-gray-500 mt-4 text-center">
              Construyendo índice de búsqueda...
            </Text>
            <Text className="text-gray-400 text-sm mt-2 text-center">
              Esto solo toma unos segundos
            </Text>
          </View>
        )}

        {/* Sin índice */}
        {!localSearch.hasIndex && !isBuilding && !localSearch.isLoading && (
          <View className="flex-1 items-center justify-center p-8">
            <Text className="text-6xl mb-4">🔍</Text>
            <Text className="text-lg text-gray-700 mb-2">
              Índice no disponible
            </Text>
            <Text className="text-gray-500 text-center mb-4">
              Construye el índice para buscar en tus entradas
            </Text>
            <Pressable
              onPress={buildIndex}
              className="bg-indigo-600 px-6 py-3 rounded-lg"
            >
              <Text className="text-white font-medium">Construir índice</Text>
            </Pressable>
          </View>
        )}

        {/* Sin query */}
        {localSearch.isReady && !query.trim() && !isBuilding && (
          <View className="flex-1 items-center justify-center p-8">
            <Text className="text-6xl mb-4">🔎</Text>
            <Text className="text-lg text-gray-700 mb-2">
              Busca en tu diario
            </Text>
            <Text className="text-gray-500 text-center">
              Busca por título, contenido o etiquetas
            </Text>
          </View>
        )}

        {/* Sin resultados */}
        {localSearch.isReady &&
          query.trim() &&
          results.length === 0 &&
          !isBuilding && (
            <View className="flex-1 items-center justify-center p-8">
              <Text className="text-6xl mb-4">📭</Text>
              <Text className="text-lg text-gray-700 mb-2">
                Sin resultados
              </Text>
              <Text className="text-gray-500 text-center">
                No se encontraron entradas que coincidan con "{query}"
              </Text>
            </View>
          )}

        {/* Resultados */}
        {localSearch.isReady && results.length > 0 && (
          <FlatList
            data={results}
            renderItem={renderResult}
            keyExtractor={item => item.id}
            contentContainerClassName="bg-white"
            ListHeaderComponent={
              <View className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <Text className="text-sm text-gray-600">
                  {results.length} resultado{results.length !== 1 ? 's' : ''}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </Screen>
  );
}
