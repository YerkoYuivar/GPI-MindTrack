import React, { useEffect, useState } from 'react';
import { View, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { JournalStackParamList } from '@navigation/types';
import Screen from '@components/ui/Screen';
import Text from '@components/ui/Text';
import Button from '@components/ui/Button';
import Input from '@components/ui/Input';
import MoodPicker from '@components/journal/MoodPicker';
import TagInput from '@components/journal/TagInput';
import AttachmentBar from '@components/journal/AttachmentBar';
import ImageGrid from '@components/journal/ImageGrid';
import AudioRecorderBar from '@components/journal/AudioRecorderBar';
import { useJournalDraft } from '@features/journal/useJournalDraft';
import { pickImages } from '@features/journal/useImagePicker';
import { useUploadImages } from '@features/journal/useUploadImages';
import { useAudioRecorder } from '@features/journal/useAudioRecorder';
import { uploadAudio } from '@features/journal/uploadAudio';
import { upsertEntryAudio, setHasAudio } from '@features/journal/repo';
import { ensureAuthUser } from '@lib/firebase/auth';
import { useCurrentUser } from '@components/auth/AuthGate';
import { getTemplate, type TemplateKey } from '@features/journal/templates';
import { metrics } from '../../lib/diagnostics/metrics';
import { logger } from '../../lib/diagnostics/logger';

type Props = NativeStackScreenProps<JournalStackParamList, 'JournalEditor'>;

const STATIC_SUGGESTIONS = ['gratitud', 'trabajo', 'familia', 'ansiedad', 'logro', 'relaciones', 'salud'];
const MAX_IMAGES = 4;

export default function JournalEditorScreen({ route, navigation }: Props) {
  const entryId = route.params?.entryId;
  const templateKey = route.params?.template as TemplateKey | undefined;
  const prefill = route.params?.prefill;
  const user = useCurrentUser();
  
  const {
    draft,
    setDraft,
    isDirty,
    isSavingLocal,
    isSavingRemote,
    lastSavedAt,
    saveRemote,
    discardLocal,
    loadState,
  } = useJournalDraft(entryId);

  // Hook de subida de imágenes (solo si hay entryId o después de crear)
  const upload = useUploadImages(entryId || 'temp');

  // Hook de grabación de audio
  const audio = useAudioRecorder();
  const [uploadingAudio, setUploadingAudio] = useState(false);

  const isValid = draft.content.trim().length > 0 || !!draft.mood;

  // Confirmación al salir con cambios no guardados
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isDirty || isSavingRemote) return; // No hay cambios o estamos guardando

      e.preventDefault();
      Alert.alert(
        'Descartar cambios',
        'Tienes cambios sin guardar. ¿Seguro que quieres salir y descartarlos?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Salir sin guardar',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
          {
            text: 'Guardar y salir',
            onPress: async () => {
              try {
                await saveRemote();
                navigation.dispatch(e.data.action);
              } catch {
                // el propio saveRemote muestra feedback de error
              }
            },
          },
        ]
      );
    });
    return unsubscribe;
  }, [navigation, isDirty, isSavingRemote, saveRemote]);

  // Instrumentación: track apertura del editor
  useEffect(() => {
    metrics.inc('journal.editor.open');
    logger.debug('Journal editor opened', { entryId: entryId || 'new' }, 'journal');
  }, [entryId]);

  // Aplicar plantilla si viene del chat (tool-call)
  useEffect(() => {
    if (templateKey && !entryId && draft.content === '') {
      const template = getTemplate(templateKey);
      setDraft({
        title: prefill?.title || template.title,
        content: prefill?.content || template.content,
        mood: prefill?.mood !== undefined ? prefill.mood : template.mood,
      });
      logger.info('Template applied', { template: templateKey }, 'journal');
    }
  }, [templateKey, entryId, draft.content]);

  /**
   * Sincronizar imágenes del draft con el upload hook cuando carga la entrada
   */
  useEffect(() => {
    if (entryId && draft.imageUris && draft.imageUris.length > 0 && upload.items.length === 0) {
      upload.pushBatch(draft.imageUris);
    }
  }, [entryId, draft.imageUris, upload]);

  /**
   * Agregar imágenes desde la galería
   */
  const handleAddImages = async () => {
    const next = await pickImages(MAX_IMAGES, draft.imageUris ?? []);
    if (next) {
      setDraft({ imageUris: next });
      // Preparar para subida (sin subir aún)
      const newUris = next.filter(uri => !draft.imageUris?.includes(uri));
      if (newUris.length > 0 && entryId) {
        upload.pushBatch(newUris);
      }
    }
  };

  /**
   * Quitar una imagen del draft
   */
  const handleRemoveImage = (uri: string) => {
    const next = (draft.imageUris ?? []).filter(u => u !== uri);
    setDraft({ imageUris: next });
    upload.remove(uri);
  };

  /**
   * Toggle del marcador de audio (deprecated - ahora usamos grabación real)
   */
  const handleToggleAudio = () => {
    setDraft({ hasAudio: !draft.hasAudio });
  };

  /**
   * Subir audio si existe grabación finalizada
   */
  const saveAudioIfNeeded = async (targetEntryId: string) => {
    if (!audio.uri) return;
    
    setUploadingAudio(true);
    try {
      // Instrumentación: medir tiempo de subida de audio
      await metrics.time('journal.audio.upload', async () => {
        if (!audio.uri) return; // Double-check para TypeScript
        
        const userId = await ensureAuthUser();
        const audioId = 
          // @ts-ignore - crypto.randomUUID puede no estar disponible
          (typeof crypto !== 'undefined' && crypto?.randomUUID) 
            ? crypto.randomUUID() 
            : String(Date.now());
        
        // Subir audio a Storage
        const result = await uploadAudio(userId, targetEntryId, audioId, audio.uri);
        
        // Guardar metadatos en Firestore
        await upsertEntryAudio(userId, targetEntryId, audioId, {
          path: result.path,
          url: result.url,
          durationMs: audio.durationMs,
          bytes: result.bytes,
        });
        
        // Actualizar flag hasAudio
        await setHasAudio(userId, targetEntryId, true);
      });
      
      // Instrumentación: track subida exitosa
      metrics.inc('journal.audio.upload.success');
      logger.info('Audio upload success', { entryId: targetEntryId, durationMs: audio.durationMs }, 'journal');
      
      // Resetear grabadora
      audio.reset();
    } catch (error) {
      // Instrumentación: track subida fallida
      metrics.inc('journal.audio.upload.fail');
      logger.error('Audio upload fail', { error, entryId: targetEntryId }, 'journal');
      
      console.error('[JournalEditorScreen] Error uploading audio:', error);
      throw error;
    } finally {
      setUploadingAudio(false);
    }
  };

  /**
   * Guardar cambios en Firestore + subir imágenes + subir audio
   */
  const handleSave = async () => {
    if (!isValid) return;

    try {
      // Instrumentación: medir tiempo de guardado remoto
      await metrics.time('journal.editor.save.remote', async () => {
        await saveRemote();
      });
      
      // Si hay imágenes pendientes y tenemos entryId, subir
      if (entryId && upload.items.length > 0) {
        await upload.start();
      }
      
      // Si hay audio grabado y tenemos entryId, subir
      if (entryId && audio.uri) {
        await saveAudioIfNeeded(entryId);
      }
      
      // Instrumentación: track guardado exitoso
      metrics.inc('journal.editor.save.success');
      logger.info('Journal editor save success', { entryId: entryId || 'new' }, 'journal');
      
      // Mostrar confirmación según modo
      if (!user) {
        // Modo invitado
        Alert.alert(
          '✓ Entrada guardada',
          entryId 
            ? 'Tus cambios están guardados en tu dispositivo. Inicia sesión para sincronizar en la nube.'
            : 'Tu entrada está guardada localmente. Inicia sesión para sincronizar en la nube y acceder desde otros dispositivos.',
          [{ text: 'OK' }]
        );
      } else if (entryId) {
        // Modo autenticado - edición
        Alert.alert('Éxito', 'Cambios guardados correctamente');
      }
      // Modo autenticado - creación: navegará automáticamente a detalle (sin Alert)
    } catch (error) {
      // Instrumentación: track guardado fallido
      metrics.inc('journal.editor.save.fail');
      logger.error('Journal editor save fail', { error, entryId: entryId || 'new' }, 'journal');
      
      console.error('[JournalEditorScreen] Error saving:', error);
      Alert.alert(
        'Error de conexión',
        'Sin conexión. Tus cambios están guardados localmente y se subirán cuando vuelvas a guardar.',
        [{ text: 'OK' }]
      );
    }
  };

  /**
   * Cancelar y descartar cambios
   */
  const handleCancel = () => {
    if (isDirty) {
      Alert.alert(
        'Descartar cambios',
        '¿Estás seguro de que quieres descartar los cambios no guardados?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Descartar',
            style: 'destructive',
            onPress: async () => {
              await discardLocal();
              navigation.goBack();
            },
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  /**
   * Formatear timestamp de último guardado
   */
  const formatLastSaved = (timestamp?: number) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Mostrar skeleton mientras carga
  if (loadState === 'loading') {
    return (
      <Screen>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" />
          <Text className="mt-4 text-gray-500">Cargando...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView 
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          className="flex-1"
          contentContainerStyle={{ padding: 16 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          {/* Header con estado de guardado */}
          <View className="mb-4">
            {isSavingLocal && (
              <Text className="text-xs text-blue-500">⏳ Guardando borrador...</Text>
            )}
            {!isSavingLocal && lastSavedAt && !user && (
              <Text className="text-xs text-amber-600">
                ✓ Borrador guardado localmente — inicia sesión para sincronizar en la nube
              </Text>
            )}
            {!isSavingLocal && lastSavedAt && user && (
              <Text className="text-xs text-gray-500">
                ✓ Borrador guardado a las {formatLastSaved(lastSavedAt)}
              </Text>
            )}
          </View>

          {/* Título */}
          <View className="mb-4">
            <Input
              label="Título (opcional)"
              value={draft.title || ''}
              onChangeText={(title) => setDraft({ title })}
              placeholder="Escribe un título..."
            />
          </View>

          {/* Contenido */}
          <View className="mb-4">
            <Input
              label="Contenido"
              value={draft.content}
              onChangeText={(content) => setDraft({ content })}
              placeholder="¿Cómo te sientes hoy?..."
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />
          </View>

          {/* Mood */}
          <View className="mb-4">
            <Text className="text-sm font-medium mb-2">¿Cómo te sientes?</Text>
            <MoodPicker
              value={draft.mood}
              onChange={(mood) => setDraft({ mood })}
            />
          </View>

          {/* Energy */}
          <View className="mb-4">
            <Text className="text-sm font-medium mb-2">Nivel de energía</Text>
            <MoodPicker
              value={draft.energy}
              onChange={(energy) => setDraft({ energy })}
            />
          </View>

          {/* Tags */}
          <View className="mb-4">
            <TagInput
              value={draft.tags}
              onChange={(tags) => setDraft({ tags })}
              suggestions={STATIC_SUGGESTIONS}
            />
          </View>

          {/* Adjuntos: Imágenes y Audio */}
          <AttachmentBar
            imageCount={(draft.imageUris?.length ?? 0)}
            onAddImages={handleAddImages}
            hasAudio={!!draft.hasAudio}
            onToggleAudio={handleToggleAudio}
            className="mb-2"
          />

          {/* Grid de previews de imágenes con estados de subida */}
          <ImageGrid 
            uris={entryId ? upload.items : (draft.imageUris ?? [])} 
            onRemove={handleRemoveImage} 
          />

          {/* Indicador de progreso de subida */}
          {upload.summary.uploading && (
            <Text className="text-xs text-blue-500 mt-2">
              ⬆️ Subiendo imágenes... ({upload.summary.done}/{upload.summary.total})
            </Text>
          )}

          {/* Grabadora de Audio */}
          <AudioRecorderBar
            state={audio.state}
            durationMs={audio.durationMs}
            onStart={audio.start}
            onPause={audio.pause}
            onResume={audio.resume}
            onStop={audio.stop}
            onReset={audio.reset}
            uploading={uploadingAudio}
          />

          {/* Botones de acción */}
          <View className="flex-row gap-3 mt-6 mb-4">
            <View className="flex-1">
              <Button
                title="Cancelar"
                onPress={handleCancel}
                variant="ghost"
                disabled={isSavingRemote}
              />
            </View>
            <View className="flex-1">
              <Button
                title={isSavingRemote ? 'Guardando...' : 'Guardar'}
                onPress={handleSave}
                disabled={!isValid || isSavingRemote}
              />
            </View>
          </View>

          {/* Indicador de validación */}
          {!isValid && (
            <Text className="text-xs text-red-500 mt-2 text-center mb-4">
              Debes escribir contenido o seleccionar un mood para guardar
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
