import React from 'react';
import { ScrollView, ViewProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@contexts/ThemeContext';

export type ScreenProps = ViewProps & {
  children?: React.ReactNode;
  scroll?: boolean;
  className?: string;
};

export const Screen: React.FC<ScreenProps> = ({ children, scroll = false, className, style, ...rest }) => {
  const { colors } = useTheme();
  
  if (scroll) {
    return (
      <SafeAreaView 
        className={`flex-1 ${className ?? ''}`}
        style={[{ backgroundColor: colors.background }, style]}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-4 py-6" {...rest}>
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView 
      className={`flex-1 px-4 py-6 ${className ?? ''}`} 
      style={[{ backgroundColor: colors.background }, style]}
      {...rest}
    >
      {children}
    </SafeAreaView>
  );
};

export default Screen;
