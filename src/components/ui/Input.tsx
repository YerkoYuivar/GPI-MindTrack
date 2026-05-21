import React from 'react';
import { View, TextInput, TextInputProps } from 'react-native';
import Text from './Text';
import { colors } from '@theme/colors';

export type InputProps = TextInputProps & {
  label?: string;
  errorText?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
  inputClassName?: string;
  testID?: string;
};

export default function Input({
  label,
  errorText,
  helperText,
  leftIcon,
  rightIcon,
  containerClassName,
  inputClassName,
  testID,
  accessibilityLabel,
  ...rest
}: InputProps) {
  const borderBase = 'border rounded-md';
  const base = 'flex-row items-center px-4 py-3 bg-white';
  const borderColor = errorText ? `border-[${colors.danger}]` : 'border-gray-300';
  const focus = `focus:border-[${colors.brand.primary}]`;

  return (
    <View className={`w-full ${containerClassName ?? ''}`} testID={testID}>
      {label ? (
        <Text className="mb-2 text-gray-700" accessibilityRole="text">
          {label}
        </Text>
      ) : null}
      <View className={`${borderBase} ${borderColor}`}>
        <View className={`${base}`}>
          {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}
          <TextInput
            className={`flex-1 text-base ${focus} ${inputClassName ?? ''}`}
            accessibilityLabel={accessibilityLabel ?? label}
            accessibilityHint={helperText}
            {...rest}
          />
          {rightIcon ? <View className="ml-2">{rightIcon}</View> : null}
        </View>
      </View>
      {helperText && !errorText ? (
        <Text className="mt-1 text-gray-500">{helperText}</Text>
      ) : null}
      {errorText ? <Text className="mt-1 text-[\#DC2626]">{errorText}</Text> : null}
    </View>
  );
}
