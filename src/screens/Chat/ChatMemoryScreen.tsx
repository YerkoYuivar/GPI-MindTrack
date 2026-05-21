/**
 * ChatMemoryScreen - Pantalla para ver y gestionar la memoria conversacional
 * - Ver checkpoints (resúmenes por hito)
 * - Ver perfil (triggers, prácticas útiles, preferencias)
 * - Borrar memoria con confirmación
 * - Forzar creación de checkpoint
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { auth } from '@lib/firebase/auth';
import { useChatSlice } from '@state/slices/chatSlice';
import {
  getCheckpoints,
  getProfileSlots,
  deleteCheckpoints,
  deleteProfileSlots,
  forceCheckpoint,
  type Checkpoint,
  type ProfileSlots,
} from '@features/chat/memoryRepo';

export default function ChatMemoryScreen() {
  const userId = auth.currentUser?.uid;
  const conversationId = useChatSlice(s => s.conversationId);

  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [profile, setProfile] = useState<ProfileSlots | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Cargar datos al montar
  useEffect(() => {
    loadData();
  }, [userId, conversationId]);

  const loadData = async () => {
    if (!userId || !conversationId) return;

    try {
      setLoading(true);
      const [cps, prof] = await Promise.all([
        getCheckpoints(userId, conversationId, 5),
        getProfileSlots(userId),
      ]);
      setCheckpoints(cps);
      setProfile(prof);
    } catch (error) {
      console.error('Error loading memory:', error);
      Alert.alert('Error', 'No se pudo cargar la memoria');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfile = () => {
    Alert.alert(
      '¿Borrar perfil?',
      'Se eliminarán todos los triggers, prácticas y preferencias recordadas. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            if (!userId) return;
            try {
              setActionLoading(true);
              await deleteProfileSlots(userId);
              setProfile(null);
              Alert.alert('✓', 'Perfil borrado exitosamente');
            } catch (error) {
              console.error('Error deleting profile:', error);
              Alert.alert('Error', 'No se pudo borrar el perfil');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteCheckpoints = () => {
    Alert.alert(
      '¿Borrar resúmenes?',
      'Se eliminarán todos los checkpoints de esta conversación. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            if (!userId || !conversationId) return;
            try {
              setActionLoading(true);
              await deleteCheckpoints(userId, conversationId);
              setCheckpoints([]);
              Alert.alert('✓', 'Resúmenes borrados exitosamente');
            } catch (error) {
              console.error('Error deleting checkpoints:', error);
              Alert.alert('Error', 'No se pudieron borrar los resúmenes');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleForceCheckpoint = async () => {
    if (!conversationId) return;

    try {
      setActionLoading(true);
      await forceCheckpoint(conversationId, 20);
      Alert.alert('✓', 'Checkpoint creado exitosamente');
      // Recargar checkpoints
      await loadData();
    } catch (error) {
      console.error('Error forcing checkpoint:', error);
      Alert.alert('Error', 'No se pudo crear el checkpoint');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="mt-4 text-gray-600">Cargando memoria...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        {/* Header */}
        <Text className="text-2xl font-bold text-gray-900 mb-2">
          Memoria Conversacional
        </Text>
        <Text className="text-gray-600 mb-6">
          Tu perfil y resúmenes de conversación se guardan de forma segura sin
          datos sensibles.
        </Text>

        {/* Sección: Perfil recordado */}
        <View className="mb-8">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xl font-semibold text-gray-900">
              🧠 Perfil recordado
            </Text>
            {profile && (
              <TouchableOpacity
                onPress={handleDeleteProfile}
                disabled={actionLoading}
                className="px-3 py-1 bg-red-50 rounded-lg"
              >
                <Text className="text-red-600 text-sm font-medium">
                  🧹 Borrar
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {profile ? (
            <View>
              {/* Triggers */}
              {profile.triggers && profile.triggers.length > 0 && (
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Desencadenantes:
                  </Text>
                  <View className="flex-row flex-wrap">
                    {profile.triggers.map((trigger, idx) => (
                      <View
                        key={idx}
                        className="bg-red-50 px-3 py-1 rounded-full mr-2 mb-2"
                      >
                        <Text className="text-red-700 text-sm">{trigger}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Helpful Practices */}
              {profile.helpfulPractices && profile.helpfulPractices.length > 0 && (
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Prácticas útiles:
                  </Text>
                  <View className="flex-row flex-wrap">
                    {profile.helpfulPractices.map((practice, idx) => (
                      <View
                        key={idx}
                        className="bg-green-50 px-3 py-1 rounded-full mr-2 mb-2"
                      >
                        <Text className="text-green-700 text-sm">
                          {practice}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Preferencias */}
              {(profile.preferredTone || profile.checkInTime) && (
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Preferencias:
                  </Text>
                  {profile.preferredTone && (
                    <Text className="text-gray-600 text-sm mb-1">
                      • Tono: {profile.preferredTone}
                    </Text>
                  )}
                  {profile.checkInTime && (
                    <Text className="text-gray-600 text-sm">
                      • Horario preferido: {profile.checkInTime}
                    </Text>
                  )}
                </View>
              )}
            </View>
          ) : (
            <View className="bg-gray-50 p-4 rounded-lg">
              <Text className="text-gray-500 text-center">
                No hay perfil guardado aún. El sistema aprenderá tus patrones a
                medida que conversamos.
              </Text>
            </View>
          )}
        </View>

        {/* Sección: Resúmenes recientes */}
        <View className="mb-8">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xl font-semibold text-gray-900">
              📝 Resúmenes recientes
            </Text>
            <View className="flex-row">
              <TouchableOpacity
                onPress={handleForceCheckpoint}
                disabled={actionLoading}
                className="px-3 py-1 bg-indigo-50 rounded-lg mr-2"
              >
                <Text className="text-indigo-600 text-sm font-medium">
                  ➕ Crear
                </Text>
              </TouchableOpacity>
              {checkpoints.length > 0 && (
                <TouchableOpacity
                  onPress={handleDeleteCheckpoints}
                  disabled={actionLoading}
                  className="px-3 py-1 bg-red-50 rounded-lg"
                >
                  <Text className="text-red-600 text-sm font-medium">
                    🧹 Borrar
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {checkpoints.length > 0 ? (
            <View>
              {checkpoints.map((cp, idx) => (
                <View
                  key={cp.id}
                  className="bg-gray-50 p-4 rounded-lg mb-3 border border-gray-200"
                >
                  <View className="flex-row items-center mb-2">
                    <Text className="text-xs font-medium text-gray-500">
                      Turno {cp.turn}
                    </Text>
                  </View>

                  <Text className="text-gray-800 mb-3">{cp.summary}</Text>

                  {cp.keyTopics && cp.keyTopics.length > 0 && (
                    <View className="mb-2">
                      <Text className="text-xs font-medium text-gray-600 mb-1">
                        Temas:
                      </Text>
                      <View className="flex-row flex-wrap">
                        {cp.keyTopics.map((topic, tidx) => (
                          <View
                            key={tidx}
                            className="bg-indigo-50 px-2 py-1 rounded mr-2 mb-1"
                          >
                            <Text className="text-indigo-700 text-xs">
                              {topic}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {cp.actionsTried && cp.actionsTried.length > 0 && (
                    <View>
                      <Text className="text-xs font-medium text-gray-600 mb-1">
                        Estrategias:
                      </Text>
                      <View className="flex-row flex-wrap">
                        {cp.actionsTried.map((action, aidx) => (
                          <View
                            key={aidx}
                            className="bg-purple-50 px-2 py-1 rounded mr-2 mb-1"
                          >
                            <Text className="text-purple-700 text-xs">
                              {action}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View className="bg-gray-50 p-4 rounded-lg">
              <Text className="text-gray-500 text-center">
                No hay checkpoints aún. Se crean automáticamente cada 20
                mensajes, o puedes crear uno manualmente.
              </Text>
            </View>
          )}
        </View>

        {/* Información de privacidad */}
        <View className="bg-blue-50 p-4 rounded-lg">
          <Text className="text-sm font-medium text-blue-900 mb-2">
            🔒 Privacidad
          </Text>
          <Text className="text-xs text-blue-700">
            • Solo se guardan resúmenes y etiquetas, no texto literal extenso
            {'\n'}• No se almacena información personal identificable (PII)
            {'\n'}• Puedes borrar toda la memoria en cualquier momento
            {'\n'}• Los datos son privados y solo tú puedes verlos
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
