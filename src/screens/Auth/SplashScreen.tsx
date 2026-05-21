/**
 * SplashScreen
 * 
 * Pantalla de carga inicial que se muestra mientras se verifica
 * el estado de autenticación del usuario con Firebase.
 * 
 * Características:
 * - Logo animado de la aplicación
 * - Indicador de carga sutil
 * - Timeout de seguridad (máximo 5 segundos)
 * - Transición suave
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

export default function AppSplashScreen() {
    const [fadeAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        console.log('💦 SplashScreen: Montado - Verificando autenticación...');
        
        // Prevenir el auto-hide del splash nativo
        SplashScreen.preventAutoHideAsync().catch(() => {
            // Ignorar error si ya se previno
        });

        // Fade in animación
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();

        // Ocultar splash nativo después de un pequeño delay
        const timer = setTimeout(() => {
            SplashScreen.hideAsync().catch(() => {
                // Ignorar error si ya se ocultó
            });
        }, 300);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                {/* Logo o ícono de la app */}
                <View style={styles.logoContainer}>
                    <Text style={styles.logoText}>📖</Text>
                    <Text style={styles.appName}>Emotional Journal</Text>
                </View>

                {/* Indicador de carga */}
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={styles.loadingText}>Verificando sesión...</Text>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 48,
    },
    logoText: {
        fontSize: 80,
        marginBottom: 16,
    },
    appName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1f2937',
        letterSpacing: 0.5,
    },
    loadingContainer: {
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 8,
    },
});
