import React, { useEffect, useState } from 'react';
import { View, ScrollView, RefreshControl, Pressable, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DiscoverStackParamList } from '@navigation/types';
import Screen from '@components/ui/Screen';
import Text from '@components/ui/Text';
import { useOnline } from '@hooks/useOnline';
import { useTimeseries } from '@features/discover/useTimeseries';
import { useTheme } from '@contexts/ThemeContext';
import { auth } from '@lib/firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@lib/firebase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'DiscoverHome'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DiscoverHomeScreen({ navigation }: Props) {
  const online = useOnline();
  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState<string | null>(null);
  const [generatingGraph, setGeneratingGraph] = useState(false);
  
  // Cargar series temporales
  const { days, weeks, loading, error, refresh } = useTimeseries(userId, {
    daysLimit: 7,
    weeksLimit: 4,
  });

  // Obtener usuario autenticado
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user?.uid ?? null);
    });
    return unsubscribe;
  }, []);

  // Generar grafo
  const handleGenerateGraph = async () => {
    if (!userId) {
      Alert.alert('Error', 'Debes iniciar sesión para generar el grafo');
      return;
    }

    if (!online) {
      Alert.alert('Sin conexión', 'Necesitas estar conectado para generar el grafo');
      return;
    }

    setGeneratingGraph(true);
    try {
      const generateGraph = httpsCallable(functions, 'generateGraph');
      const result = await generateGraph();
      
      const data = result.data as {
        ok: boolean;
        patternCount: number;
        edgeCount: number;
      };
      
      if (data.ok) {
        Alert.alert(
          'Grafo Generado',
          `Se han identificado ${data.patternCount} patrones con ${data.edgeCount} conexiones.`,
          [
            { text: 'Ver Grafo', onPress: () => navigation.navigate('DiscoverGraph') },
            { text: 'Cerrar', style: 'cancel' }
          ]
        );
      }
    } catch (error: any) {
      console.error('Error generando grafo:', error);
      Alert.alert('Error', error.message || 'No se pudo generar el grafo. Asegúrate de tener entradas en tu diario.');
    } finally {
      setGeneratingGraph(false);
    }
  };

  // Calcular estadísticas
  const totalEntries = days.reduce((sum, day) => sum + day.count, 0);
  const avgMoodRecent = days.length > 0 && days[0]?.avgMood !== null
    ? days[0].avgMood.toFixed(1)
    : null;
  const avgSentimentRecent = days.length > 0 && days[0]?.avgSentiment !== null
    ? days[0].avgSentiment
    : null;

  // Determinar emoji de mood
  const getMoodEmoji = (mood: number | null) => {
    if (mood === null) return '😶';
    if (mood >= 6) return '😄';
    if (mood >= 4.5) return '🙂';
    if (mood >= 3) return '😐';
    if (mood >= 1.5) return '😔';
    return '😢';
  };

  // Card de acción grande - rediseñada
  const ActionCard = ({ 
    title, 
    subtitle, 
    icon, 
    gradientColors, 
    onPress, 
    disabled = false,
    isLoading = false 
  }: { 
    title: string; 
    subtitle: string; 
    icon: string; 
    gradientColors: [string, string]; 
    onPress: () => void;
    disabled?: boolean;
    isLoading?: boolean;
  }) => (
    <Pressable
      onPress={onPress}
      disabled={disabled || isLoading}
      style={{ 
        opacity: disabled ? 0.5 : 1,
        shadowColor: gradientColors[0],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
      }}
      className="mb-4"
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.5 }}
        style={{ 
          borderRadius: 20,
          paddingVertical: 20,
          paddingHorizontal: 20,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-xl font-bold text-white">{title}</Text>
            <Text className="mt-2 text-sm leading-5 text-white/75">{subtitle}</Text>
          </View>
          <View 
            className="items-center justify-center w-16 h-16 rounded-2xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="large" />
            ) : (
              <Text className="text-4xl">{icon}</Text>
            )}
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );

  // Mini stat card
  const StatCard = ({ label, value, icon, trend }: { label: string; value: string; icon: string; trend?: 'up' | 'down' | 'neutral' }) => (
    <View 
      className="flex-1 p-4 mr-2 rounded-2xl last:mr-0"
      style={{ backgroundColor: colors.backgroundSecondary }}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-2xl">{icon}</Text>
        {trend && (
          <Text className={`text-xs ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500'}`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          </Text>
        )}
      </View>
      <Text style={{ color: colors.text }} className="text-xl font-bold">{value}</Text>
      <Text style={{ color: colors.textSecondary }} className="mt-1 text-xs">{label}</Text>
    </View>
  );

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        {/* Header con gradiente */}
        <LinearGradient
          colors={isDark ? ['#4C1D95', '#1E1B4B'] : ['#8B5CF6', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ 
            paddingTop: insets.top + 16,
            paddingBottom: 24,
            paddingHorizontal: 20,
            marginHorizontal: 0,
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
          }}
        >
          <Text className="text-3xl font-bold text-white">Descubre</Text>
          <Text className="mt-1 text-base text-white/70">
            Explora patrones en tu bienestar emocional
          </Text>
          
          {/* Quick stats en el header */}
          {!loading && totalEntries > 0 && (
            <View className="flex-row mt-5">
              <View className="flex-1 p-3 mr-2 bg-white/15 rounded-xl">
                <Text className="text-xs text-white/70">Esta semana</Text>
                <Text className="text-xl font-bold text-white">{totalEntries} entradas</Text>
              </View>
              <View className="flex-1 p-3 bg-white/15 rounded-xl">
                <Text className="text-xs text-white/70">Estado de hoy</Text>
                <View className="flex-row items-center">
                  <Text className="mr-2 text-2xl">{getMoodEmoji(avgMoodRecent ? parseFloat(avgMoodRecent) : null)}</Text>
                  <Text className="text-xl font-bold text-white">
                    {avgMoodRecent || '--'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </LinearGradient>

        {/* Banner de conectividad */}
        {!online && (
          <View 
            className="flex-row items-center p-3 mx-4 mt-4 rounded-xl"
            style={{ backgroundColor: isDark ? '#78350F' : '#FEF3C7' }}
          >
            <Text className="mr-2 text-lg">📡</Text>
            <Text style={{ color: isDark ? '#FCD34D' : '#92400E' }} className="flex-1 text-sm">
              Modo offline - Los datos se sincronizarán al reconectar
            </Text>
          </View>
        )}

        {/* Acciones principales */}
        <View className="px-4 mt-6">
          <Text style={{ color: colors.text }} className="mb-3 text-lg font-semibold">
            Herramientas de análisis
          </Text>
          
          <ActionCard
            title="Ver Dashboard"
            subtitle="Gráficas y tendencias de tu estado emocional"
            icon="📊"
            gradientColors={['#3B82F6', '#1D4ED8']}
            onPress={() => navigation.navigate('DiscoverDashboard')}
          />
          
          <ActionCard
            title="Explorar Grafo"
            subtitle="Visualiza conexiones entre emociones, personas y actividades"
            icon="🔮"
            gradientColors={['#8B5CF6', '#6D28D9']}
            onPress={() => navigation.navigate('DiscoverGraph')}
          />
          
          <ActionCard
            title="Generar Nuevo Análisis"
            subtitle={generatingGraph ? 'Analizando tus entradas...' : 'IA analiza patrones en tu diario'}
            icon="✨"
            gradientColors={['#10B981', '#059669']}
            onPress={handleGenerateGraph}
            disabled={!online || !userId}
            isLoading={generatingGraph}
          />
        </View>

        {/* Estadísticas rápidas */}
        {!loading && days.length > 0 && (
          <View className="px-4 mt-6">
            <Text style={{ color: colors.text }} className="mb-3 text-lg font-semibold">
              Resumen rápido
            </Text>
            
            <View className="flex-row">
              <StatCard
                label="Entradas totales"
                value={totalEntries.toString()}
                icon="📝"
              />
              <StatCard
                label="Promedio mood"
                value={avgMoodRecent || '--'}
                icon="💜"
                trend={avgSentimentRecent !== null ? (avgSentimentRecent > 0.2 ? 'up' : avgSentimentRecent < -0.2 ? 'down' : 'neutral') : undefined}
              />
            </View>
          </View>
        )}

        {/* Actividad reciente */}
        {!loading && days.length > 0 && (
          <View className="px-4 mt-6">
            <Text style={{ color: colors.text }} className="mb-3 text-lg font-semibold">
              Actividad reciente
            </Text>
            
            <View 
              className="overflow-hidden rounded-2xl"
              style={{ backgroundColor: colors.backgroundSecondary }}
            >
              {days.slice(0, 5).map((day, index) => (
                <View
                  key={day.id}
                  className={`p-4 flex-row items-center justify-between ${index < Math.min(days.length, 5) - 1 ? 'border-b' : ''}`}
                  style={{ borderBottomColor: colors.border }}
                >
                  <View className="flex-row items-center flex-1">
                    <View 
                      className="items-center justify-center w-10 h-10 mr-3 rounded-full"
                      style={{ backgroundColor: isDark ? '#374151' : '#F3F4F6' }}
                    >
                      <Text>{getMoodEmoji(day.avgMood)}</Text>
                    </View>
                    <View>
                      <Text style={{ color: colors.text }} className="font-medium">{day.id}</Text>
                      <Text style={{ color: colors.textSecondary }} className="text-xs">
                        {day.count} {day.count === 1 ? 'entrada' : 'entradas'}
                      </Text>
                    </View>
                  </View>
                  
                  {day.avgMood !== null && (
                    <View className="items-end">
                      <Text style={{ color: colors.text }} className="font-semibold">
                        {day.avgMood.toFixed(1)}
                      </Text>
                      {day.avgSentiment !== null && (
                        <Text 
                          className="text-xs"
                          style={{ 
                            color: day.avgSentiment > 0.2 ? colors.success : 
                                   day.avgSentiment < -0.2 ? colors.danger : 
                                   colors.textSecondary 
                          }}
                        >
                          {day.avgSentiment > 0 ? '+' : ''}{day.avgSentiment.toFixed(2)}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Estado vacío mejorado */}
        {!loading && days.length === 0 && !error && (
          <View className="items-center px-6 py-12 mt-4">
            <View 
              className="items-center justify-center w-24 h-24 mb-4 rounded-full"
              style={{ backgroundColor: isDark ? '#374151' : '#F3F4F6' }}
            >
              <Text className="text-5xl">📊</Text>
            </View>
            <Text style={{ color: colors.text }} className="text-xl font-bold text-center">
              Comienza tu viaje
            </Text>
            <Text style={{ color: colors.textSecondary }} className="mt-2 leading-6 text-center">
              Crea algunas entradas en tu diario y descubre patrones únicos sobre tu bienestar emocional.
            </Text>
            
            <Pressable
              onPress={() => navigation.getParent()?.navigate('Journal')}
              className="px-6 py-3 mt-6 rounded-full"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="font-semibold text-white">Ir al Diario</Text>
            </Pressable>
          </View>
        )}

        {/* Error state */}
        {error && (
          <View 
            className="p-4 mx-4 mt-4 rounded-xl"
            style={{ backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2' }}
          >
            <Text style={{ color: isDark ? '#FECACA' : '#991B1B' }} className="font-semibold">
              Error al cargar datos
            </Text>
            <Text style={{ color: isDark ? '#FCA5A5' : '#B91C1C' }} className="mt-1 text-sm">
              {error}
            </Text>
          </View>
        )}

        {/* Tip footer */}
        <View className="px-4 mt-8 mb-4">
          <View 
            className="flex-row items-start p-4 rounded-2xl"
            style={{ backgroundColor: colors.backgroundSecondary }}
          >
            <Text className="mr-3 text-xl">💡</Text>
            <View className="flex-1">
              <Text style={{ color: colors.text }} className="mb-1 font-medium">
                Consejo
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-sm leading-5">
                Escribe en tu diario regularmente para obtener insights más precisos sobre tus patrones emocionales.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

