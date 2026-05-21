import React, {useEffect} from 'react';
import {View, Text, Pressable} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {ChatStackParamList} from '@navigation/types';

type NavigationProp = NativeStackNavigationProp<ChatStackParamList, 'ChatHome'>;

export default function ChatHomeScreen() {
  const navigation = useNavigation<NavigationProp>();

  // Auto-navegar a ChatSupport (o mostrar lista de conversaciones en el futuro)
  useEffect(() => {
    // Por ahora, navegar automáticamente al chat
    navigation.replace('ChatSupport', {});
  }, [navigation]);

  return (
    <View className="flex-1 bg-gray-50 items-center justify-center px-8">
      <Text className="text-2xl font-bold text-gray-900 text-center mb-4">
        Chat de Soporte
      </Text>
      <Text className="text-gray-600 text-center mb-8">
        Iniciando conversación...
      </Text>
      <Pressable
        onPress={() => navigation.navigate('ChatSupport', {})}
        className="bg-indigo-600 rounded-xl px-6 py-3"
      >
        <Text className="text-white font-semibold">Iniciar Chat</Text>
      </Pressable>
    </View>
  );
}
