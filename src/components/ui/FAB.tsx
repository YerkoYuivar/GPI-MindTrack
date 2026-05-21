import React from 'react';
import { Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  onPress: () => void;
  label?: string;
  icon?: string;
  testID?: string;
  stickToTabBar?: boolean; // Posicionar siempre sobre la tab bar personalizada
};

export default function FAB({ onPress, label = '', icon = '＋', testID, stickToTabBar = false }: Props) {
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 70;
  const MARGIN_ABOVE_BAR = 16;
  const defaultBottom = 24;
  const bottom = stickToTabBar ? insets.bottom + TAB_BAR_HEIGHT + MARGIN_ABOVE_BAR : defaultBottom;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label || 'Nueva entrada'}
      testID={testID}
      onPress={onPress}
      className="absolute right-5 h-14 w-14 rounded-full items-center justify-center shadow-lg bg-purple-600"
      style={{
        shadowColor: '#7C3AED',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 6, // Para Android
        zIndex: 20,
        bottom,
      }}
    >
      <Text className="text-white text-3xl">{icon}</Text>
    </Pressable>
  );
}
