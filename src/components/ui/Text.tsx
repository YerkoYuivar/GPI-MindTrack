import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';

export type TextProps = RNTextProps & {
  className?: string;
  children?: React.ReactNode;
  numberOfLines?: number;
};

export const Text: React.FC<TextProps> = ({ className, children, numberOfLines, ...rest }) => {
  return (
    <RNText className={className} numberOfLines={numberOfLines} {...rest}>
      {children}
    </RNText>
  );
};

export default Text;
