/**
 * Utilidades para mapear mood (1-7) a emoji y colores de gradiente
 */

export type MoodConfig = {
  emoji: string;
  label: string;
  gradientFrom: string;
  gradientTo: string;
  bgTailwind: string;
};

const MOOD_MAP: Record<number, MoodConfig> = {
  1: {
    emoji: '😠',
    label: 'Enojo',
    gradientFrom: '#EF4444',
    gradientTo: '#F97316',
    bgTailwind: 'bg-gradient-to-br from-red-500 to-orange-500',
  },
  2: {
    emoji: '😢',
    label: 'Triste',
    gradientFrom: '#6366F1',
    gradientTo: '#8B5CF6',
    bgTailwind: 'bg-gradient-to-br from-indigo-500 to-purple-500',
  },
  3: {
    emoji: '😟',
    label: 'Preocupado',
    gradientFrom: '#9333EA',
    gradientTo: '#C084FC',
    bgTailwind: 'bg-gradient-to-br from-purple-600 to-purple-400',
  },
  4: {
    emoji: '😐',
    label: 'Neutral',
    gradientFrom: '#6B7280',
    gradientTo: '#9CA3AF',
    bgTailwind: 'bg-gradient-to-br from-gray-500 to-gray-400',
  },
  5: {
    emoji: '🙂',
    label: 'Bien',
    gradientFrom: '#10B981',
    gradientTo: '#34D399',
    bgTailwind: 'bg-gradient-to-br from-emerald-500 to-emerald-400',
  },
  6: {
    emoji: '😊',
    label: 'Feliz',
    gradientFrom: '#14B8A6',
    gradientTo: '#5EEAD4',
    bgTailwind: 'bg-gradient-to-br from-teal-500 to-teal-300',
  },
  7: {
    emoji: '😁',
    label: 'Muy Feliz',
    gradientFrom: '#F59E0B',
    gradientTo: '#FCD34D',
    bgTailwind: 'bg-gradient-to-br from-amber-500 to-amber-300',
  },
};

const DEFAULT_MOOD: MoodConfig = {
  emoji: '📝',
  label: 'Sin mood',
  gradientFrom: '#D1D5DB',
  gradientTo: '#E5E7EB',
  bgTailwind: 'bg-gradient-to-br from-gray-300 to-gray-200',
};

export function getMoodConfig(mood?: number | null): MoodConfig {
  if (!mood || mood < 1 || mood > 7) return DEFAULT_MOOD;
  return MOOD_MAP[mood] || DEFAULT_MOOD;
}

export function getMoodEmoji(mood?: number | null): string {
  return getMoodConfig(mood).emoji;
}

export function getMoodGradient(mood?: number | null): { from: string; to: string } {
  const config = getMoodConfig(mood);
  return { from: config.gradientFrom, to: config.gradientTo };
}
