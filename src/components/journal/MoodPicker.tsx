import React from 'react';
import { View, Pressable } from 'react-native';
import Text from '@components/ui/Text';

export type MoodPickerProps = {
  label?: string; // default "Estado emocional"
  value?: number; // 1–7
  onChange: (v: number) => void;
  className?: string;
};

export default function MoodPicker({
  label = 'Estado emocional',
  value,
  onChange,
  className,
}: MoodPickerProps) {
  const moods = [1, 2, 3, 4, 5, 6, 7];

  return (
    <View className={className}>
      <Text className="text-sm font-medium text-gray-700 mb-2">{label}</Text>
      <View className="flex-row justify-between gap-2">
        {moods.map((mood) => {
          const isSelected = value === mood;
          return (
            <Pressable
              key={mood}
              onPress={() => onChange(mood)}
              className={`w-11 h-11 rounded-full items-center justify-center ${
                isSelected ? 'bg-[#4F46E5]' : 'bg-gray-100'
              }`}
              accessibilityRole="button"
              accessibilityLabel={`${label} nivel ${mood}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                className={`text-base font-semibold ${
                  isSelected ? 'text-white' : 'text-gray-700'
                }`}
              >
                {mood}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
