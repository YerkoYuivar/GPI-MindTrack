import React from 'react';
import { View } from 'react-native';
import Text from './Text';

export type HeaderProps = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode; // acciones (p.ej. botón)
  left?: React.ReactNode; // back u otro
  className?: string;
  testID?: string;
};

export default function Header({ title, subtitle, right, left, className, testID }: HeaderProps) {
  return (
    <View
      className={`flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200 ${className ?? ''}`}
      accessibilityRole="header"
      testID={testID}
    >
      <View className="min-w-10 items-start justify-center pr-2">{left}</View>
      <View className="flex-1 items-center">
        <Text className="text-base font-semibold" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-sm text-gray-500" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View className="min-w-10 items-end justify-center pl-2">{right}</View>
    </View>
  );
}
