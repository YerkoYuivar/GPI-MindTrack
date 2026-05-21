import React from 'react';
import { View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Text from '@components/ui/Text';
import { useTheme } from '@contexts/ThemeContext';
import { getMoodConfig } from '@utils/moodHelpers';

export type JournalListItem = {
  id: string;
  title?: string;
  excerpt: string;
  createdAt: number; // epoch ms
  mood?: number; // 1–7
  energy?: number; // 1–7
  tags: string[];
  isFavorite?: boolean;
  imageCount?: number;
  hasAudio?: boolean;
  isLocal?: boolean; // Indicador de borrador local no sincronizado
};

type JournalCardProps = {
  item: JournalListItem;
  onPress?: (id: string) => void;
  onToggleFavorite?: (id: string, next: boolean) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onLongPress?: (id: string) => void;
  className?: string;
  testID?: string;
};

const formatFecha = (ms: number) => {
  const date = new Date(ms);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
};

// Mapeo de tags a colores para chips
const TAG_COLORS: Record<string, string> = {
  Enojo: 'bg-red-200 text-red-700',
  Triste: 'bg-purple-200 text-purple-700',
  Feliz: 'bg-green-200 text-green-700',
  Tranquilo: 'bg-teal-200 text-teal-700',
  Ansioso: 'bg-orange-200 text-orange-700',
  Emocionado: 'bg-yellow-200 text-yellow-700',
};


export default function JournalCard({
  item,
  onPress,
  onToggleFavorite,
  onEdit,
  onDelete,
  onLongPress,
  className,
  testID,
}: JournalCardProps) {
  const { isDark, colors } = useTheme();
  const moodConfig = getMoodConfig(item.mood);
  const gradient = { from: moodConfig.gradientFrom, to: moodConfig.gradientTo };

  return (
    <Pressable
      onPress={() => onPress?.(item.id)}
      onLongPress={() => onLongPress?.(item.id)}
      className={`rounded-3xl overflow-hidden mb-3 ${className ?? ''}`}
      style={{
        backgroundColor: colors.surface,
        shadowColor: isDark ? '#000' : '#000',
        shadowOpacity: isDark ? 0.4 : 0.2,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
      }}
      accessibilityRole="button"
      accessibilityLabel={`Entrada: ${item.title || 'Sin título'}`}
      testID={testID}
    >
      <View className="flex-row">
        {/* Lado izquierdo: Emoji con gradiente */}
        <LinearGradient
          colors={[gradient.from, gradient.to]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 110,
            height: 120,
            alignItems: 'center',
            justifyContent: 'center',
            borderTopLeftRadius: 24,
            borderBottomLeftRadius: 24,
          }}
        >
          <Text
            style={{
              fontSize: 68,
              textShadowColor: 'rgba(0, 0, 0, 0.3)',
              textShadowOffset: { width: 0, height: 4 },
              textShadowRadius: 6,
            }}
          >
            {moodConfig.emoji}
          </Text>
        </LinearGradient>

        {/* Lado derecho: Contenido */}
        <View 
          className="flex-1 p-3"
          style={{ backgroundColor: isDark ? colors.surface : '#F9FAFB' }}
        >
          {/* Título y fecha */}
          <View className="flex-row items-start justify-between mb-1">
            <Text 
              className="flex-1 text-lg font-bold" 
              style={{ color: colors.text }}
              numberOfLines={1}
            >
              {(item.title ?? '').trim() !== '' ? item.title : 'Titulo de ejemplo'}
            </Text>
            <View className="flex-row items-center ml-2">
              <Text style={{ color: colors.textSecondary }} className="text-xs">📅</Text>
              <Text style={{ color: colors.textSecondary }} className="text-xs ml-1">{formatFecha(item.createdAt)}</Text>
            </View>
          </View>

          {/* Excerpt */}
          <Text 
            className="text-sm mb-2 leading-5" 
            style={{ color: isDark ? colors.textSecondary : '#374151' }}
            numberOfLines={2}
          >
            {item.excerpt || 'Sin contenido'}
          </Text>

          {/* Tags como chips */}
          {item.tags.length > 0 && (
            <View className="flex-row flex-wrap gap-2">
              {item.tags.slice(0, 3).map((tag, idx) => {
                const colorClass = TAG_COLORS[tag] || (isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700');
                return (
                  <View
                    key={idx}
                    className={`px-3 py-1 rounded-full ${colorClass}`}
                  >
                    <Text className="text-xs font-semibold">{tag}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Indicadores adicionales (local, favorito, adjuntos) */}
          <View className="flex-row items-center gap-2 mt-2">
            {item.isLocal && (
              <View 
                className="px-2 py-0.5 rounded-full"
                style={{ backgroundColor: isDark ? '#78350F' : '#FEF3C7' }}
              >
                <Text 
                  className="text-[9px] font-medium"
                  style={{ color: isDark ? '#FCD34D' : '#92400E' }}
                >
                  📱 Local
                </Text>
              </View>
            )}
            {(item.imageCount ?? 0) > 0 && (
              <Text className="text-xs" style={{ color: colors.textSecondary }}>🖼️ {item.imageCount}</Text>
            )}
            {item.hasAudio && <Text className="text-xs" style={{ color: colors.textSecondary }}>🎙️</Text>}
            {onToggleFavorite && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(item.id, !item.isFavorite);
                }}
                accessibilityRole="button"
                accessibilityLabel={item.isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                className="ml-auto"
              >
                <Text className={item.isFavorite ? 'text-yellow-500 text-lg' : 'text-lg'} style={!item.isFavorite ? { color: colors.textSecondary } : {}}>
                  ★
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}
