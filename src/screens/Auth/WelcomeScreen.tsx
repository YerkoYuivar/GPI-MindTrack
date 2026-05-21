/**
 * WelcomeScreen
 * 
 * Pantalla de bienvenida para usuarios no autenticados.
 * Presenta la aplicación y ofrece opciones para crear cuenta o iniciar sesión.
 */

import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavigationProp = NativeStackNavigationProp<any>;

export default function WelcomeScreen() {
    const navigation = useNavigation<NavigationProp>();

    console.log('👋 WelcomeScreen: Renderizando pantalla de bienvenida');

    const handleSignIn = () => {
        navigation.navigate('SignIn');
    };

    const handleSignUp = () => {
        navigation.navigate('SignUp');
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.content}>
                {/* Logo y título */}
                <View style={styles.header}>
                    <Text style={styles.logo}>📖</Text>
                    <Text style={styles.title}>Emotional Journal</Text>
                    <Text style={styles.subtitle}>
                        Tu espacio seguro para explorar y entender tus emociones
                    </Text>
                </View>

                {/* Features */}
                <View style={styles.features}>
                    <View style={styles.feature}>
                        <Text style={styles.featureIcon}>✍️</Text>
                        <Text style={styles.featureText}>Escribe tu diario emocional</Text>
                    </View>
                    <View style={styles.feature}>
                        <Text style={styles.featureIcon}>📊</Text>
                        <Text style={styles.featureText}>Analiza tus patrones con IA</Text>
                    </View>
                    <View style={styles.feature}>
                        <Text style={styles.featureIcon}>🔒</Text>
                        <Text style={styles.featureText}>Privado y seguro</Text>
                    </View>
                </View>

                {/* Botones de acción */}
                <View style={styles.buttons}>
                    <TouchableOpacity
                        style={[styles.button, styles.primaryButton]}
                        onPress={handleSignUp}
                        accessibilityRole="button"
                        accessibilityLabel="Crear cuenta nueva"
                    >
                        <Text style={styles.primaryButtonText}>Crear cuenta</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.secondaryButton]}
                        onPress={handleSignIn}
                        accessibilityRole="button"
                        accessibilityLabel="Iniciar sesión"
                    >
                        <Text style={styles.secondaryButtonText}>Ya tengo cuenta</Text>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Al continuar, aceptas nuestros términos de servicio y política de privacidad
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 24,
        justifyContent: 'space-between',
    },
    header: {
        alignItems: 'center',
        marginTop: 40,
    },
    logo: {
        fontSize: 80,
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    features: {
        gap: 24,
    },
    feature: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingHorizontal: 8,
    },
    featureIcon: {
        fontSize: 28,
    },
    featureText: {
        fontSize: 16,
        color: '#374151',
        flex: 1,
    },
    buttons: {
        gap: 12,
    },
    button: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButton: {
        backgroundColor: '#3b82f6',
    },
    primaryButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#d1d5db',
    },
    secondaryButtonText: {
        color: '#374151',
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        paddingTop: 16,
    },
    footerText: {
        fontSize: 12,
        color: '#9ca3af',
        textAlign: 'center',
        lineHeight: 18,
    },
});
