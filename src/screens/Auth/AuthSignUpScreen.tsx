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
 * Pantalla de registro.
 * Permite al usuario crear una cuenta con email y contraseña.
 */
export default function AuthSignUpScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { signup } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Valida los datos antes de enviar.
   */
  const validate = (): string | null => {
    if (!email.trim()) return 'El email es requerido';
    if (!password.trim()) return 'La contraseña es requerida';
    if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
    if (password !== confirmPassword) return 'Las contraseñas no coinciden';
    return null;
  };

  /**
   * Maneja el registro del usuario.
   */
  const handleSignUp = async () => {
    // Validación
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signup(email, password);
      // El AuthContext y RootNavigator manejarán la navegación automáticamente
    } catch (err: any) {
      console.error('Sign up error:', err);

      // Mapear errores de Firebase a mensajes amigables
      let message = 'Error al crear la cuenta';

      if (err.code === 'auth/email-already-in-use') {
        message = 'Ya existe una cuenta con este email';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Email inválido';
      } else if (err.code === 'auth/weak-password') {
        message = 'La contraseña es muy débil. Usa al menos 6 caracteres';
      } else if (err.code === 'auth/network-request-failed') {
        message = 'Error de conexión. Verifica tu internet';
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Navega a la pantalla de inicio de sesión.
   */
  const handleGoToSignIn = () => {
    navigation.navigate('SignIn');
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
            Crear cuenta
          </Text>
          <Text className="text-base text-gray-600 dark:text-gray-400 mb-8">
            Completa los datos para registrarte
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
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Contraseña
            </Text>
            <TextInput
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
              textContentType="newPassword"
              autoComplete="password-new"
              passwordRules="minlength: 6;"
              accessibilityLabel="Campo de contraseña"
              accessibilityHint="Ingresa una contraseña de al menos 6 caracteres"
            />
          </View>

          {/* Input Confirmar Contraseña */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirmar contraseña
            </Text>
            <TextInput
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
              placeholder="Repite tu contraseña"
              placeholderTextColor="#9ca3af"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!loading}
              textContentType="newPassword"
              autoComplete="password-new"
              accessibilityLabel="Campo de confirmar contraseña"
              accessibilityHint="Repite la contraseña para confirmar"
            />
          </View>

          {/* Botón Crear Cuenta */}
          <TouchableOpacity
            className={`rounded-lg py-3.5 mb-4 ${loading ? 'bg-blue-400 dark:bg-blue-700' : 'bg-blue-600 dark:bg-blue-500'
              }`}
            onPress={handleSignUp}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Crear cuenta"
            accessibilityHint="Toca para crear tu cuenta"
            accessibilityState={{ disabled: loading }}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white text-center font-semibold text-base">
                Crear cuenta
              </Text>
            )}
          </TouchableOpacity>

          {/* Link a Inicio de Sesión */}
          <View className="flex-row justify-center">
            <Text className="text-gray-600 dark:text-gray-400 text-sm">
              ¿Ya tienes cuenta?{' '}
            </Text>
            <TouchableOpacity
              onPress={handleGoToSignIn}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Ir a iniciar sesión"
              accessibilityHint="Toca para ir a la pantalla de inicio de sesión"
            >
              <Text className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                Iniciar sesión
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
