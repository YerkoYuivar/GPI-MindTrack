import React from 'react';
import { Pressable, Text } from 'react-native';

type Props = {
  label: string;
  active?: boolean;
  onPress?: () => void;
  className?: string;
  testID?: string;
};

export default function Chip({ label, active, onPress, className, testID }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      onPress={onPress}
      className={`px-3 py-1 rounded-full text-sm ${
        active
          ? 'bg-indigo-500'
          : 'bg-gray-100'
      } ${className || ''}`}
    >
      <Text
        className={`text-sm font-medium ${
          active ? 'text-white' : 'text-gray-700'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
