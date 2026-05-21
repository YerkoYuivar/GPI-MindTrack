/**
 * Support Chat Screen
 * 
 * Pantalla principal del chat de soporte emocional.
 * - Lista de mensajes (burbujas user/assistant)
 * - Input composer con botón enviar
 * - Scroll automático al final
 * - Persistencia en Firestore (offline-ready)
 * - IA conversacional con streaming simulado
 */

import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  AccessibilityInfo,
} from 'react-native';
import {useRoute, useNavigation} from '@react-navigation/native';
import {httpsCallable} from 'firebase/functions';
import {useChatSlice} from '@state/slices/chatSlice';
import {useChatUi} from '@state/slices/chatUiSlice';
import { useTheme } from '@contexts/ThemeContext';
import MessageBubble from '@components/chat/MessageBubble';
import BreathingModal from '@screens/Tools/BreathingModal';
import {Banner, type BannerType} from '@components/ui/Banner';
import type {ToolAction} from '@features/chat/types';
import {
  ensureConversation,
  listenMessages,
  sendUserMessage,
  deleteConversation,
} from '@features/chat/repo';
import {exportConversationToTxt} from '@features/chat/export';
import {auth, functions} from '@lib/firebase';

export default function SupportChatScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const convIdParam = route.params?.conversationId as string | undefined;
  
  // Theme
  const { isDark, colors } = useTheme();

  const {
    conversationId,
    setConversation,
    messages,
    setMessages,
    loading,
    setLoading,
  } = useChatSlice();

  const {typing, setTyping} = useChatUi();

  const [input, setInput] = useState('');
  const [banner, setBanner] = useState<{
    type: BannerType;
    text: string;
  } | null>(null);
  const [retryBlockedUntil, setRetryBlockedUntil] = useState<number>(0); // timestamp
  const [retryCountdown, setRetryCountdown] = useState<number>(0); // segundos
  const [breathingModal, setBreathingModal] = useState<{
    visible: boolean;
    pattern: 'box' | '478' | 'free';
    durationSec: number;
  }>({ visible: false, pattern: 'box', durationSec: 60 });
  const listRef = useRef<FlatList>(null);

  // Setup: asegurar conversación y listener de mensajes
  useEffect(() => {
    let unsub: (() => void) | undefined;

    (async () => {
      try {
        setLoading(true);

        // Obtener userId (puede venir de auth o ser demo)
        const userId = auth.currentUser?.uid || 'demo-user';

        // Asegurar que existe conversación
        const id = await ensureConversation(userId, convIdParam);
        setConversation(id);

        // Listener en tiempo real
        unsub = listenMessages(userId, id, (msgs) => {
          setMessages(msgs);
          setLoading(false);

          // Detectar cuando mensaje del asistente pasa de pending a sent
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg?.role === 'assistant' && lastMsg.status === 'sent') {
            setTyping(false);
          }

          // Scroll al final cuando hay nuevos mensajes
          requestAnimationFrame(() => {
            listRef.current?.scrollToEnd({animated: true});
          });
        });
      } catch (err) {
        console.error('Error setting up chat:', err);
        setLoading(false);
      }
    })();

    return () => {
      if (unsub) unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convIdParam]);

  // Countdown timer para retry bloqueado
  useEffect(() => {
    if (retryBlockedUntil <= 0) {
      setRetryCountdown(0);
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      if (now >= retryBlockedUntil) {
        setRetryBlockedUntil(0);
        setRetryCountdown(0);
        setBanner(null);
        return;
      }

      const remaining = Math.ceil((retryBlockedUntil - now) / 1000);
      setRetryCountdown(remaining);
    };

    // Update inmediato
    updateCountdown();

    // Update cada segundo
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [retryBlockedUntil]);

  // Accesibilidad: Anunciar cuando el asistente está escribiendo
  useEffect(() => {
    if (typing) {
      AccessibilityInfo.announceForAccessibility(
        'El asistente está escribiendo una respuesta'
      );
    }
  }, [typing]);

  // Enviar mensaje
  const onSend = async () => {
    const text = input.trim();
    if (!text || !conversationId) return;

    // Verificar si hay bloqueo activo
    if (retryBlockedUntil > Date.now()) {
      return; // Botón debería estar deshabilitado, pero doble check
    }

    setInput('');
    setBanner(null); // Limpiar banners previos

    try {
      const userId = auth.currentUser?.uid || 'demo-user';

      // 1) Guardar mensaje del usuario
      const {id: messageId} = await sendUserMessage(
        userId,
        conversationId,
        text
      );

      // 2) Activar typing indicator
      setTyping(true);

      // 3) Disparar callable para generar respuesta del asistente
      const chatRespondFn = httpsCallable(functions, 'chatRespond');
      await chatRespondFn({
        conversationId,
        lastUserMessageId: messageId,
        userId, // Solo para emulador sin auth
      });

      // typing se desactiva automáticamente cuando llega mensaje con status='sent'
    } catch (err: any) {
      console.error('Error in chat:', err);
      setTyping(false);

      // Extraer código de error y retryAfterSec
      const code = err?.details?.code || err?.code || err?.message || '';
      const retryAfterSec = err?.details?.retryAfterSec || 30;

      // Manejar diferentes tipos de error
      if (code.includes('rate_limited') || code.includes('over_quota')) {
        // Rate limiting o quota excedida
        const blockedUntil = Date.now() + retryAfterSec * 1000;
        setRetryBlockedUntil(blockedUntil);
        setBanner({
          type: 'info',
          text: `Estás yendo muy rápido. Podrás enviar otro mensaje en ${Math.ceil(retryAfterSec)}s.`,
        });
      } else if (code.includes('abuse_blocked')) {
        // Abuso detectado (circuit breaker)
        const blockedUntil = Date.now() + retryAfterSec * 1000;
        setRetryBlockedUntil(blockedUntil);
        setBanner({
          type: 'warn',
          text: 'Tu cuenta está temporalmente bloqueada por seguridad. Podrás continuar en unos minutos.',
        });
      } else if (code.includes('resource-exhausted')) {
        // Recursos agotados (genérico)
        setBanner({
          type: 'info',
          text: 'El servicio está temporalmente saturado. Intenta en unos momentos.',
        });
      } else {
        // Error interno o desconocido
        setBanner({
          type: 'error',
          text: 'No pude responder ahora. Por favor intenta nuevamente.',
        });
      }
    }
  };

  // Manejar acciones/herramientas sugeridas por el asistente
  const handleAction = (action: ToolAction) => {
    switch (action.type) {
      case 'journal.openTemplate':
        // Navegar al editor con plantilla prefillada
        nav.navigate('JournalEditor', {
          template: action.params?.key,
          prefill: action.params?.prefill,
        });
        break;

      case 'breathing.start':
        // Abrir modal de respiración
        setBreathingModal({
          visible: true,
          pattern: action.params?.pattern || 'box',
          durationSec: action.params?.durationSec || 60,
        });
        break;

      case 'exercise.run':
        // Abrir pantalla de ejercicio rápido
        nav.navigate('QuickExercise', {
          key: action.params?.key,
        });
        break;

      default:
        console.warn('Unknown action type:', action.type);
    }
  };

  // Exportar conversación a archivo de texto
  const handleExport = async () => {
    if (!conversationId || messages.length === 0) {
      Alert.alert(
        'Sin mensajes',
        'No hay mensajes para exportar en esta conversación.'
      );
      return;
    }

    try {
      setLoading(true);
      await exportConversationToTxt(conversationId, messages);
      // El Share dialog se abre automáticamente en la función
    } catch (err) {
      console.error('Error exporting conversation:', err);
      Alert.alert(
        'Error',
        'No se pudo exportar la conversación. Intenta nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Borrar conversación con confirmación
  const handleDelete = () => {
    if (!conversationId) return;

    Alert.alert(
      'Borrar conversación',
      'Esta acción eliminará todos los mensajes y no se puede deshacer. ¿Estás seguro?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const userId = auth.currentUser?.uid || 'demo-user';
              await deleteConversation(userId, conversationId);

              // Limpiar estado local
              setMessages([]);
              setConversation('');

              // Volver atrás o crear nueva conversación
              Alert.alert(
                'Eliminado',
                'La conversación se eliminó correctamente.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Navegar de vuelta o refrescar
                      nav.goBack();
                    },
                  },
                ]
              );
            } catch (err) {
              console.error('Error deleting conversation:', err);
              Alert.alert(
                'Error',
                'No se pudo eliminar la conversación. Intenta nuevamente.'
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      behavior={Platform.select({ios: 'padding', android: undefined})}
    >
      {/* Header */}
      <View 
        className="px-4 py-3 border-b"
        style={{ backgroundColor: colors.surface, borderBottomColor: colors.border }}
      >
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-1">
            <Text 
              className="text-xl font-bold"
              style={{ color: colors.text }}
            >
              Soporte emocional
            </Text>
            <Text 
              className="text-xs mt-1"
              style={{ color: colors.textSecondary }}
            >
              Chat confidencial con IA de apoyo emocional.
            </Text>
          </View>
        </View>

        {/* Acciones */}
        <View className="flex-row gap-2 mt-2">
          <Pressable
            onPress={() => nav.navigate('ChatMemory')}
            disabled={loading}
            className="px-3 py-2 rounded-lg flex-row items-center gap-1"
            style={{ backgroundColor: isDark ? colors.primary + '20' : '#EEF2FF' }}
            accessibilityRole="button"
            accessibilityLabel="Ver memoria de la conversación"
          >
            <Text style={{ color: colors.primary }} className="text-sm font-medium">🧠</Text>
            <Text style={{ color: colors.primary }} className="text-sm font-medium">Memoria</Text>
          </Pressable>

          <Pressable
            onPress={handleExport}
            disabled={loading || messages.length === 0}
            className="px-3 py-2 rounded-lg border"
            style={{ 
              backgroundColor: loading || messages.length === 0 
                ? (isDark ? colors.background : '#F9FAFB')
                : colors.surface,
              borderColor: colors.border
            }}
            accessibilityRole="button"
            accessibilityLabel="Exportar conversación"
          >
            <Text
              className="text-sm font-medium"
              style={{ 
                color: loading || messages.length === 0 
                  ? colors.textSecondary 
                  : colors.text 
              }}
            >
              📤 Exportar
            </Text>
          </Pressable>

          <Pressable
            onPress={handleDelete}
            disabled={loading || !conversationId}
            className="px-3 py-2 rounded-lg"
            style={{ 
              backgroundColor: loading || !conversationId 
                ? (isDark ? '#7F1D1D' : '#FECACA')
                : colors.danger
            }}
            accessibilityRole="button"
            accessibilityLabel="Borrar conversación"
          >
            <Text className="text-white text-sm font-medium">🗑️ Borrar</Text>
          </Pressable>
        </View>
      </View>

      {/* Lista de mensajes */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({item}) => <MessageBubble msg={item} onAction={handleAction} isDark={isDark} />}
        contentContainerStyle={{padding: 16}}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({animated: true})
        }
        ListEmptyComponent={
          !loading ? (
            <View className="items-center mt-16 px-8">
              <Text 
                className="text-lg font-semibold"
                style={{ color: colors.text }}
              >
                Comienza la conversación
              </Text>
              <Text 
                className="text-center mt-1"
                style={{ color: colors.textSecondary }}
              >
                Escribe cómo te sientes hoy.
              </Text>
            </View>
          ) : null
        }
      />

      {/* Typing indicator */}
      {typing && (
        <View 
          className="px-4 py-2"
          style={{ backgroundColor: colors.background }}
        >
          <View className="flex-row items-center gap-2">
            <View className="flex-row gap-1">
              <View 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: colors.textSecondary }}
              />
              <View 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: colors.textSecondary }}
              />
              <View 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: colors.textSecondary }}
              />
            </View>
            <Text 
              className="text-sm"
              style={{ color: colors.textSecondary }}
            >
              Asistente está escribiendo…
            </Text>
          </View>
        </View>
      )}

      {/* Banner de notificación */}
      {banner && (
        <View 
          className="px-4 py-2"
          style={{ backgroundColor: colors.background }}
        >
          <Banner
            type={banner.type}
            text={banner.text}
            onDismiss={() => setBanner(null)}
          />
        </View>
      )}

      {/* Input composer */}
      <View 
        className="p-3 border-t"
        style={{ backgroundColor: colors.surface, borderTopColor: colors.border }}
      >
        <View className="flex-row items-end gap-2">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Escribe un mensaje…"
            placeholderTextColor={colors.textSecondary}
            multiline
            editable={retryBlockedUntil === 0}
            className="flex-1 max-h-32 min-h-[44px] rounded-2xl px-3 py-2"
            style={{
              textAlignVertical: 'center',
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              color: colors.text,
            }}
            accessibilityLabel="Caja de mensaje"
            accessibilityHint="Escribe tu mensaje aquí"
          />
          <Pressable
            onPress={onSend}
            disabled={typing || retryBlockedUntil > Date.now()}
            className="px-4 py-2 rounded-2xl"
            style={{
              backgroundColor: typing || retryBlockedUntil > Date.now()
                ? (isDark ? colors.primary + '60' : '#A5B4FC')
                : colors.primary
            }}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensaje"
            accessibilityHint={
              retryCountdown > 0
                ? `Debes esperar ${retryCountdown} segundos`
                : typing
                ? 'El mensaje se está enviando'
                : 'Toca para enviar tu mensaje'
            }
            accessibilityState={{
              disabled: typing || retryBlockedUntil > Date.now(),
            }}
          >
            <Text className="text-white font-semibold">
              {retryCountdown > 0
                ? `${retryCountdown}s`
                : typing
                ? '...'
                : 'Enviar'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Modal de respiración */}
      <BreathingModal
        visible={breathingModal.visible}
        pattern={breathingModal.pattern}
        durationSec={breathingModal.durationSec}
        onClose={() => setBreathingModal(prev => ({ ...prev, visible: false }))}
      />
    </KeyboardAvoidingView>
  );
}
