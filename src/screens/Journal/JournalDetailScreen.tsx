import React, { useEffect, useState } from 'react';
import { View, Alert, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { JournalStackParamList } from '@navigation/types';
import Screen from '@components/ui/Screen';
import Text from '@components/ui/Text';
import Button from '@components/ui/Button';
import Header from '@components/ui/Header';
import AudioPlayer from '@components/journal/AudioPlayer';
import { useHybridEntry } from '@features/journal/useHybridEntry';
import { useToggleFavorite, useSoftDeleteEntry } from '@features/journal/hooks';
import { getEntryAudio } from '@features/journal/repo';
import { ensureAuthUser } from '@lib/firebase/auth';
import { metrics } from '../../lib/diagnostics/metrics';
import { logger } from '../../lib/diagnostics/logger';

type Props = NativeStackScreenProps<JournalStackParamList, 'JournalDetail'>;

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export default function JournalDetailScreen({ route, navigation }: Props) {
  const { entryId } = route.params || {};

  if (!entryId) {
    return (
      <Screen>
        <Text className="text-lg text-center text-gray-500">Entrada no especificada</Text>
      </Screen>
    );
  }

  const { data, loading, isLocal } = useHybridEntry(entryId);
  const { toggle, pending: favPending } = useToggleFavorite();
  const { softDelete, pending: delPending } = useSoftDeleteEntry();
  
  // Estado para audio
  const [audioData, setAudioData] = useState<{ url: string; durationMs: number } | null>(null);
  
  // Instrumentación: track vista de detalle
  useEffect(() => {
    if (data && !loading) {
      metrics.inc('journal.detail.view');
      logger.debug('Journal detail viewed', { entryId }, 'journal');
    }
  }, [data, loading, entryId]);
  
  // Cargar audio si existe
  useEffect(() => {
    if (!data?.hasAudio) return;
    
    const loadAudio = async () => {
      try {
        const userId = await ensureAuthUser();
        const audio = await getEntryAudio(userId, entryId);
        if (audio) {
          setAudioData({ url: audio.url, durationMs: audio.durationMs });
        }
      } catch (error) {
        console.error('[JournalDetailScreen] Error loading audio:', error);
      }
    };
    
    loadAudio();
  }, [entryId, data?.hasAudio]);  const handleToggleFavorite = async () => {
    if (!data || isLocal) return; // No permitir favoritos en entradas locales
    await toggle(data.id, !data.isFavorite);
  };

  const handleDelete = () => {
    if (isLocal) {
      // Para entradas locales, mostrar mensaje diferente
      Alert.alert(
        'Entrada local',
        'Esta entrada aún no está sincronizada. Para eliminarla, edítala y descarta los cambios, o inicia sesión y sincroniza primero.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    Alert.alert(
      'Eliminar entrada',
      '¿Mover esta entrada a la papelera?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, eliminar',
          style: 'destructive',
          onPress: async () => {
            if (!data) return;
            await softDelete(data.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    // TODO: Implementar precarga de draft en el editor (próximo prompt)
    // Por ahora solo navega con el entryId
    navigation.navigate('JournalEditor', { entryId });
  };

  if (loading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text className="text-gray-500 mt-4">Cargando entrada...</Text>
        </View>
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <Text className="text-lg text-gray-500">Entrada no encontrada</Text>
          <Button
            title="Volver"
            onPress={() => navigation.goBack()}
            variant="primary"
            size="md"
            className="mt-4"
          />
        </View>
      </Screen>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Header con botón favorito */}
      <Header
        title={data.title || 'Sin título'}
        right={
          <Pressable
            onPress={handleToggleFavorite}
            disabled={favPending || isLocal}
            className="w-10 h-10 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel={data.isFavorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
          >
            <Text className={`text-2xl ${isLocal ? 'text-gray-200' : data.isFavorite ? 'text-yellow-500' : 'text-gray-300'}`}>
              {favPending ? '...' : '★'}
            </Text>
          </Pressable>
        }
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
      />

      {/* Banner de entrada local */}
      {isLocal && (
        <View className="px-4 py-2 bg-amber-50 border-b border-amber-200">
          <Text className="text-xs text-amber-800">
            📱 Entrada guardada localmente. Inicia sesión para sincronizar y acceder desde otros dispositivos.
          </Text>
        </View>
      )}

      <ScrollView className="flex-1">
        <View className="p-4">
          {/* Fecha de creación */}
          <Text className="text-sm text-gray-500 mb-4">
            {formatDate(data.createdAt)}
          </Text>

          {/* Mood y Energy */}
          {(data.mood || data.energy) && (
            <View className="flex-row gap-2 mb-4">
              {data.mood && (
                <View className="bg-yellow-100 rounded-full px-3 py-1.5">
                  <Text className="text-sm text-yellow-700">😊 Mood: {data.mood}/7</Text>
                </View>
              )}
              {data.energy && (
                <View className="bg-green-100 rounded-full px-3 py-1.5">
                  <Text className="text-sm text-green-700">⚡ Energía: {data.energy}/7</Text>
                </View>
              )}
            </View>
          )}

          {/* Tags */}
          {data.tags.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mb-4">
              {data.tags.map((tag, idx) => (
                <View key={idx} className="bg-gray-100 rounded-full px-3 py-1">
                  <Text className="text-sm text-gray-700">{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Badges de adjuntos */}
          {((data.imageCount ?? 0) > 0 || data.hasAudio) && (
            <View className="flex-row gap-2 mb-4">
              {(data.imageCount ?? 0) > 0 && (
                <View className="bg-blue-100 rounded-full px-3 py-1.5">
                  <Text className="text-sm text-blue-700">📷 {data.imageCount} imagen{(data.imageCount ?? 0) > 1 ? 'es' : ''}</Text>
                </View>
              )}
              {data.hasAudio && (
                <View className="bg-purple-100 rounded-full px-3 py-1.5">
                  <Text className="text-sm text-purple-700">🎤 Audio</Text>
                </View>
              )}
            </View>
          )}

          {/* Contenido */}
          <View className="bg-gray-50 rounded-lg p-4 mb-4">
            <Text className="text-base text-gray-900 leading-6">
              {data.content || 'Sin contenido'}
            </Text>
          </View>

          {/* Reproductor de audio */}
          {audioData && (
            <AudioPlayer 
              url={audioData.url}
              durationMs={audioData.durationMs}
              className="mb-4"
            />
          )}

          {/* Info adicional */}
          {data.wordCount !== undefined && data.wordCount > 0 && (
            <Text className="text-xs text-gray-400 mb-2">
              {data.wordCount} palabra{data.wordCount !== 1 ? 's' : ''}
            </Text>
          )}
          <Text className="text-xs text-gray-400">
            Última actualización: {formatDate(data.updatedAt)}
          </Text>
        </View>
      </ScrollView>

      {/* Botones de acción */}
      <View className="flex-row gap-3 px-4 py-3 border-t border-gray-200 bg-white">
        <Button
          title="Editar"
          onPress={handleEdit}
          variant="secondary"
          size="lg"
          className="flex-1"
          accessibilityLabel="Editar entrada"
        />
        <Button
          title="Eliminar"
          onPress={handleDelete}
          variant="danger"
          size="lg"
          className="flex-1"
          disabled={delPending}
          accessibilityLabel="Eliminar entrada"
        />
      </View>
    </View>
  );
}
