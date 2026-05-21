import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@contexts/AuthContext';

/**
 * Pantalla de perfil del usuario.
 * Muestra información del usuario y permite cerrar sesión.
 */
export default function AuthProfileScreen() {
  const navigation = useNavigation();
  const { user, userProfile, logout } = useAuth();
  const [loading, setLoading] = useState(false);

  /**
   * Maneja el cierre de sesión con confirmación.
   */
  const handleSignOut = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await logout();
              // El AuthContext y RootNavigator manejarán la navegación automáticamente
            } catch (err) {
              console.error('Sign out error:', err);
              Alert.alert('Error', 'No se pudo cerrar sesión');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900 items-center justify-center">
        <Text className="text-gray-600 dark:text-gray-400">
          No hay usuario autenticado
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="px-6 py-8">
        {/* Header */}
        <View className="mb-8">
          <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Mi perfil
          </Text>
          <Text className="text-base text-gray-600 dark:text-gray-400">
            Información de tu cuenta
          </Text>
        </View>

        {/* Información del usuario */}
        <View className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Email
            </Text>
            <Text className="text-base text-gray-900 dark:text-white">
              {user.email || 'Sin email'}
            </Text>
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              ID de usuario
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-500 font-mono">
              {user.uid}
            </Text>
          </View>

          {/* Datos adicionales de Firestore */}
          {userProfile && (
            <>
              {userProfile.displayName && (
                <View className="mt-4">
                  <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Nombre
                  </Text>
                  <Text className="text-base text-gray-900 dark:text-white">
                    {userProfile.displayName}
                  </Text>
                </View>
              )}

              <View className="mt-4">
                <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Entradas en el diario
                </Text>
                <Text className="text-base text-gray-900 dark:text-white">
                  {userProfile.diaryEntriesCount || 0}
                </Text>
              </View>

              <View className="mt-4">
                <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Miembro desde
                </Text>
                <Text className="text-base text-gray-900 dark:text-white">
                  {new Date(userProfile.createdAt).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>
            </>
          )}

          {user.isAnonymous && (
            <View className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <Text className="text-yellow-800 dark:text-yellow-200 text-sm">
                ⚠️ Cuenta anónima
              </Text>
            </View>
          )}
        </View>

        {/* Sección de privacidad */}
        <View className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Privacidad y seguridad
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400 leading-6">
            Tu información está protegida y encriptada. No compartimos tus datos con terceros.
            Las entradas del diario son privadas y solo tú puedes acceder a ellas.
          </Text>
        </View>

        {/* Botón Cerrar Sesión */}
        <TouchableOpacity
          className={`rounded-lg py-3.5 ${loading
            ? 'bg-red-400 dark:bg-red-700'
            : 'bg-red-600 dark:bg-red-500'
            }`}
          onPress={handleSignOut}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
          accessibilityHint="Toca para cerrar tu sesión actual"
          accessibilityState={{ disabled: loading }}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white text-center font-semibold text-base">
              Cerrar sesión
            </Text>
          )}
        </TouchableOpacity>

        {/* Nota informativa */}
        <View className="mt-6">
          <Text className="text-xs text-center text-gray-500 dark:text-gray-500">
            Al cerrar sesión, deberás volver a iniciar sesión para acceder a tu cuenta.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
