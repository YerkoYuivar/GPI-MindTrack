/**
 * ForgotPasswordScreen
 * 
 * Pantalla para recuperar la contraseña mediante email.
 * Envía un email de recuperación usando Firebase Auth.
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
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { sendPasswordReset } from '@features/auth/repo';

type NavigationProp = NativeStackNavigationProp<any>;

export default function ForgotPasswordScreen() {
    const navigation = useNavigation<NavigationProp>();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [error, setError] = useState('');

    /**
     * Maneja el envío del email de recuperación
     */
    const handleResetPassword = async () => {
        // Validación
        if (!email.trim()) {
            setError('Ingresa tu email');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await sendPasswordReset(email);
            setEmailSent(true);
        } catch (err: any) {
            console.error('Reset password error:', err);

            let message = 'Error al enviar el email';

            if (err.code === 'auth/invalid-email') {
                message = 'Email inválido';
            } else if (err.code === 'auth/user-not-found') {
                message = 'No existe una cuenta con este email';
            } else if (err.code === 'auth/network-request-failed') {
                message = 'Error de conexión. Verifica tu internet';
            } else if (err.code === 'auth/too-many-requests') {
                message = 'Demasiados intentos. Intenta más tarde';
            }

            setError(message);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Vuelve a la pantalla de inicio de sesión
     */
    const handleBackToSignIn = () => {
        navigation.goBack();
    };

    // Vista de éxito
    if (emailSent) {
        return (
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 bg-gray-50 dark:bg-gray-900"
            >
                <ScrollView
                    contentContainerClassName="flex-grow justify-center px-6"
                    keyboardShouldPersistTaps="handled"
                >
                    <View className="w-full max-w-md mx-auto items-center">
                        {/* Ícono de éxito */}
                        <View className="bg-green-100 dark:bg-green-900/30 rounded-full p-6 mb-6">
                            <Text className="text-6xl">✅</Text>
                        </View>

                        {/* Mensaje de éxito */}
                        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
                            Email enviado
                        </Text>
                        <Text className="text-base text-gray-600 dark:text-gray-400 mb-8 text-center">
                            Revisa tu bandeja de entrada. Te hemos enviado un email con instrucciones para recuperar tu contraseña.
                        </Text>

                        {/* Nota informativa */}
                        <View className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                            <Text className="text-blue-800 dark:text-blue-200 text-sm text-center">
                                💡 Si no recibes el email en los próximos minutos, revisa tu carpeta de spam.
                            </Text>
                        </View>

                        {/* Botón volver */}
                        <TouchableOpacity
                            className="bg-blue-600 dark:bg-blue-500 rounded-lg py-3.5 w-full"
                            onPress={handleBackToSignIn}
                            accessibilityRole="button"
                            accessibilityLabel="Volver a iniciar sesión"
                        >
                            <Text className="text-white text-center font-semibold text-base">
                                Volver a iniciar sesión
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        );
    }

    // Vista de formulario
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
                        Recuperar contraseña
                    </Text>
                    <Text className="text-base text-gray-600 dark:text-gray-400 mb-8">
                        Ingresa tu email y te enviaremos instrucciones para recuperar tu contraseña
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
                    <View className="mb-6">
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

                    {/* Botón Enviar */}
                    <TouchableOpacity
                        className={`rounded-lg py-3.5 mb-4 ${loading ? 'bg-blue-400 dark:bg-blue-700' : 'bg-blue-600 dark:bg-blue-500'
                            }`}
                        onPress={handleResetPassword}
                        disabled={loading}
                        accessibilityRole="button"
                        accessibilityLabel="Enviar email de recuperación"
                        accessibilityState={{ disabled: loading }}
                    >
                        {loading ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text className="text-white text-center font-semibold text-base">
                                Enviar email
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Link volver */}
                    <View className="flex-row justify-center">
                        <TouchableOpacity
                            onPress={handleBackToSignIn}
                            disabled={loading}
                            accessibilityRole="button"
                            accessibilityLabel="Volver a iniciar sesión"
                        >
                            <Text className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                                ← Volver a iniciar sesión
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
