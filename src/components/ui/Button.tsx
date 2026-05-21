import React from 'react';
import { Pressable, View, PressableProps } from 'react-native';
import Text from './Text';
import { colors } from '@theme/colors';

export type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string; // Tailwind extra
  testID?: string;
  accessibilityLabel?: string;
} & Omit<PressableProps, 'onPress' | 'accessibilityLabel'>;

const variantClasses = {
  primary: `bg-[${colors.brand.primary}] active:bg-[${colors.brand.primaryDark}] border border-transparent`,
  secondary: 'bg-white border border-gray-300 active:bg-gray-100',
  ghost: 'bg-transparent active:bg-gray-100',
  danger: `bg-[${colors.danger}] active:bg-red-700 border border-transparent`,
} as const;

const textVariantClasses = {
  primary: 'text-white',
  secondary: 'text-gray-900',
  ghost: 'text-gray-900',
  danger: 'text-white',
} as const;

const sizeClasses = {
  sm: 'px-3 py-2',
  md: 'px-4 py-3',
  lg: 'px-5 py-4',
} as const;

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
} as const;

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  leftIcon,
  rightIcon,
  className,
  testID,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const base = 'rounded-md flex-row items-center justify-center gap-2';
  const disabledCls = disabled ? 'opacity-50' : '';
  const ripple = { color: colors.gray[200] };

  return (
    <Pressable
      android_ripple={ripple}
      className={`${base} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledCls} ${className ?? ''}`}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={accessibilityLabel ?? title}
      testID={testID}
      {...rest}
    >
      {leftIcon ? <View className="mr-1">{leftIcon}</View> : null}
      <Text className={`${textVariantClasses[variant]} ${textSizeClasses[size]} font-medium`} numberOfLines={1}>
        {title}
      </Text>
      {rightIcon ? <View className="ml-1">{rightIcon}</View> : null}
    </Pressable>
  );
}
