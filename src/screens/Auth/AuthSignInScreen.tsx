/**
 * AuthSignInScreen
 * 
 * Pantalla de inicio de sesión con email y contraseña.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '@contexts/AuthContext';

type NavigationProp = NativeStackNavigationProp<any>;

/**
 * Pantalla de inicio de sesión.
 * Permite al usuario iniciar sesión con email y contraseña.
 */
export default function AuthSignInScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Maneja el inicio de sesión.
   */
  const handleSignIn = async () => {
    // Validación básica
    if (!email.trim() || !password.trim()) {
      setError('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email, password);
      // El AuthContext y RootNavigator manejarán la navegación automáticamente
    } catch (err: any) {
      console.error('Sign in error:', err);

      // Mapear errores de Firebase a mensajes amigables
      let message = 'Error al iniciar sesión';

      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        message = 'Email o contraseña incorrectos';
      } else if (err.code === 'auth/user-not-found') {
        message = 'No existe una cuenta con este email';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Demasiados intentos. Intenta más tarde';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Email inválido';
      } else if (err.code === 'auth/network-request-failed') {
        message = 'Error de conexión. Verifica tu internet';
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Navega a la pantalla de registro.
   */
  const handleGoToSignUp = () => {
    navigation.navigate('SignUp');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50 dark:bg-gray-900"
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full max-w-md mx-auto">
          {/* Título */}
          <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Iniciar sesión
          </Text>
          <Text className="text-base text-gray-600 dark:text-gray-400 mb-8">
            Ingresa tus credenciales para continuar
          </Text>

          {/* Mensaje de error */}
          {error ? (
            <View
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4"
              accessibilityRole="alert"
            >
              <Text className="text-red-800 dark:text-red-200 text-sm">
                {error}
              </Text>
            </View>
          ) : null}

          {/* Input Email */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </Text>
            <TextInput
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
              placeholder="tu@email.com"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              editable={!loading}
              accessibilityLabel="Campo de email"
              accessibilityHint="Ingresa tu dirección de email"
            />
          </View>

          {/* Input Contraseña */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Contraseña
            </Text>
            <TextInput
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              autoComplete="password"
              editable={!loading}
              accessibilityLabel="Campo de contraseña"
              accessibilityHint="Ingresa tu contraseña"
            />
          </View>

          {/* Botón Iniciar Sesión */}
          <TouchableOpacity
            className={`rounded - lg py - 3.5 mb - 4 ${loading ? 'bg-blue-400 dark:bg-blue-700' : 'bg-blue-600 dark:bg-blue-500'
              } `}
            onPress={handleSignIn}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Iniciar sesión"
            accessibilityHint="Toca para iniciar sesión con tus credenciales"
            accessibilityState={{ disabled: loading }}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white text-center font-semibold text-base">
                Iniciar sesión
              </Text>
            )}
          </TouchableOpacity>

          {/* Link a Recuperar Contraseña */}
          <View className="flex-row justify-center mb-4">
            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Recuperar contraseña"
            >
              <Text className="text-blue-600 dark:text-blue-400 text-sm">
                ¿Olvidaste tu contraseña?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Link a Registro */}
          <View className="flex-row justify-center">
            <Text className="text-gray-600 dark:text-gray-400 text-sm">
              ¿No tienes cuenta?{' '}
            </Text>
            <TouchableOpacity
              onPress={handleGoToSignUp}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Ir a crear cuenta"
              accessibilityHint="Toca para ir a la pantalla de registro"
            >
              <Text className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                Crear cuenta
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
