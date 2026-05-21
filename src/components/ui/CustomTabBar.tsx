import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated, Dimensions, Platform, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTheme } from '@contexts/ThemeContext';

const { width } = Dimensions.get('window');

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;

  const totalTabs = state.routes.length;
  const tabWidth = (width - 40) / totalTabs; // 40 = márgenes laterales

  useEffect(() => {
    // Animación de escala (squeeze/stretch effect)
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleValue, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Animación de posición
    Animated.spring(animatedValue, {
      toValue: state.index,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, [state.index]);

  const translateX = animatedValue.interpolate({
    inputRange: state.routes.map((_, i) => i),
    outputRange: state.routes.map((_, i) => i * tabWidth + tabWidth / 2 - 30),
  });

  const getIconName = (routeName: string): keyof typeof Feather.glyphMap => {
    switch (routeName) {
      case 'JournalTab':
        return 'book-open';
      case 'DiscoverTab':
        return 'trending-up';
      case 'ChatTab':
        return 'message-circle';
      case 'ProfileTab':
        return 'user';
      default:
        return 'circle';
    }
  };

  return (
    <View
      style={{
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? insets.bottom : 10,
        left: 20,
        right: 20,
        height: 70,
      }}
    >
      {/* Círculo morado flotante animado - fuera del blur para que no se recorte */}
      <Animated.View
        style={{
          position: 'absolute',
          top: -10,
          left: 0,
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.5,
          shadowRadius: 12,
          elevation: 10,
          zIndex: 10,
          transform: [
            { translateX },
            { scaleX: scaleValue },
            { scaleY: scaleValue },
          ],
        }}
      >
        <Feather
          name={getIconName(state.routes[state.index].name)}
          size={26}
          color="#FFFFFF"
        />
      </Animated.View>

      {/* Fondo con blur */}
      <BlurView
        intensity={80}
        tint={isDark ? 'dark' : 'light'}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 35,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            backgroundColor: colors.tabBar,
            borderRadius: 35,
            borderWidth: 1,
            borderColor: colors.tabBarBorder,
          }}
        >
          {/* Botones de tabs */}
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                onPress={onPress}
                onLongPress={onLongPress}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {!isFocused && (
                  <Feather
                    name={getIconName(route.name)}
                    size={24}
                    color={colors.iconSecondary}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}
