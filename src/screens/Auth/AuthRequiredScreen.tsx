/**
 * AuthRequiredScreen
 * 
 * Pantalla que se muestra cuando se requiere autenticación.
 * Informa al usuario y proporciona un botón para iniciar sesión.
 */

import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Text from '@components/ui/Text';
import Button from '@components/ui/Button';

type NavigationProp = NativeStackNavigationProp<any>;

/**
 * Pantalla de acceso requerido.
 * Se muestra cuando el usuario intenta acceder a una funcionalidad protegida sin estar autenticado.
 */
export default function AuthRequiredScreen() {
  const navigation = useNavigation<NavigationProp>();

  const handleGoToSignIn = () => {
    navigation.navigate('AuthSignIn');
  };

  return (
    <View className="flex-1 items-center justify-center px-6 bg-gray-50 dark:bg-gray-900">
      <Text className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
        Acceso requerido
      </Text>
      <Text className="text-gray-600 dark:text-gray-400 text-center mb-6">
        Inicia sesión para usar esta sección y guardar tus datos de forma segura.
      </Text>
      <Button
        title="Ir a Iniciar sesión"
        onPress={handleGoToSignIn}
        accessibilityLabel="Ir a iniciar sesión"
        accessibilityHint="Toca para ir a la pantalla de inicio de sesión"
      />
    </View>
  );
}
