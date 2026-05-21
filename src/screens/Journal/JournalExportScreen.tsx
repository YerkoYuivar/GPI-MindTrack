/**
 * Pantalla de exportación de diario
 * 
 * Permite exportar entradas a JSON y TXT plano
 */

import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { JournalStackParamList } from '../../navigation/types';
import { Screen } from '../../components/ui/Screen';
import Header from '../../components/ui/Header';
import { fetchAllActiveEntries } from '../../features/journal/repo';
import { ensureAuthUser } from '../../lib/firebase/auth';

type Props = NativeStackScreenProps<JournalStackParamList, 'JournalExport'>;

type ExportFormat = 'json' | 'txt';

/**
 * Formatea fecha para export
 */
function formatDateForExport(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Genera archivo JSON de exportación
 */
async function generateJSON(userId: string): Promise<string> {
  const entries = await fetchAllActiveEntries(userId, 2000);

  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    userId,
    entryCount: entries.length,
    entries: entries.map(entry => ({
      id: entry.id,
      title: entry.title || '',
      content: entry.content || '',
      tags: entry.tags || [],
      createdAt: entry.createdAt,
      createdAtFormatted: formatDateForExport(entry.createdAt),
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Genera archivo TXT de exportación
 */
async function generateTXT(userId: string): Promise<string> {
  const entries = await fetchAllActiveEntries(userId, 2000);

  let txt = '';
  txt += '═══════════════════════════════════════\n';
  txt += '        MI DIARIO EMOCIONAL\n';
  txt += '═══════════════════════════════════════\n\n';
  txt += `Exportado: ${formatDateForExport(Date.now())}\n`;
  txt += `Total de entradas: ${entries.length}\n\n`;
  txt += '═══════════════════════════════════════\n\n';

  for (const entry of entries) {
    txt += `\n\n`;
    txt += `════ ${formatDateForExport(entry.createdAt)} (ID: ${entry.id}) ════\n\n`;

    if (entry.title) {
      txt += `TÍTULO: ${entry.title}\n\n`;
    }

    if (entry.tags && entry.tags.length > 0) {
      txt += `ETIQUETAS: ${entry.tags.join(', ')}\n\n`;
    }

    if (entry.content) {
      txt += `CONTENIDO:\n`;
      txt += `${entry.content}\n`;
    } else {
      txt += `(Sin contenido)\n`;
    }

    txt += `\n${'─'.repeat(50)}\n`;
  }

  txt += `\n\n═══════════════════════════════════════\n`;
  txt += `Fin del diario - ${entries.length} entradas\n`;
  txt += `═══════════════════════════════════════\n`;

  return txt;
}

/**
 * Exporta archivo y comparte
 */
async function exportAndShare(
  userId: string,
  format: ExportFormat
): Promise<void> {
  try {
    // Generar contenido
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      content = await generateJSON(userId);
      filename = `diario-${Date.now()}.json`;
      mimeType = 'application/json';
    } else {
      content = await generateTXT(userId);
      filename = `diario-${Date.now()}.txt`;
      mimeType = 'text/plain';
    }

    // Guardar en FileSystem usando nueva API
    const file = new File(Paths.cache, filename);
    file.write(content);

    // Compartir
    const sharingAvailable = await Sharing.isAvailableAsync();
    
    if (!sharingAvailable) {
      Alert.alert(
        'No disponible',
        'La función de compartir no está disponible en este dispositivo'
      );
      return;
    }

    await Sharing.shareAsync(file.uri, {
      mimeType,
      dialogTitle: 'Exportar Diario',
      UTI: format === 'json' ? 'public.json' : 'public.plain-text',
    });
  } catch (error) {
    console.error('[ExportScreen] Export error:', error);
    throw error;
  }
}

export function JournalExportScreen({ navigation }: Props) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(
    null
  );

  /**
   * Maneja exportación
   */
  const handleExport = useCallback(async (format: ExportFormat) => {
    try {
      setIsExporting(true);
      setExportingFormat(format);

      const userId = await ensureAuthUser();
      await exportAndShare(userId, format);
    } catch (error) {
      console.error('[ExportScreen] Error exporting:', error);
      Alert.alert(
        'Error',
        'No se pudo exportar el diario. Por favor intenta de nuevo.'
      );
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  }, []);

  return (
    <Screen>
      <Header
        title="Exportar Diario"
        left={
          <Pressable
            onPress={() => navigation.goBack()}
            className="w-10 h-10 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Volver"
            disabled={isExporting}
          >
            <Text className="text-xl text-[#4F46E5]">←</Text>
          </Pressable>
        }
      />

      <View className="flex-1 bg-gray-50 p-6">
        {/* Header */}
        <View className="mb-8">
          <Text className="text-3xl mb-2">📦</Text>
          <Text className="text-2xl font-semibold text-gray-900 mb-2">
            Exportar tu diario
          </Text>
          <Text className="text-base text-gray-600">
            Descarga tus entradas en formato JSON o texto plano para
            respaldo o análisis.
          </Text>
        </View>

        {/* Opciones de exportación */}
        <View className="space-y-4">
          {/* JSON */}
          <Pressable
            onPress={() => handleExport('json')}
            disabled={isExporting}
            className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm active:bg-gray-50"
          >
            <View className="flex-row items-start">
              <View className="flex-1">
                <View className="flex-row items-center mb-2">
                  <Text className="text-xl mr-2">📄</Text>
                  <Text className="text-lg font-semibold text-gray-900">
                    Formato JSON
                  </Text>
                </View>
                
                <Text className="text-sm text-gray-600 mb-3">
                  Archivo estructurado con todos los datos. Ideal para
                  importar a otras aplicaciones o hacer análisis.
                </Text>

                <View className="bg-gray-50 rounded p-3">
                  <Text className="text-xs font-mono text-gray-700">
                    {'{'} version, exportedAt, entries: [...] {'}'}
                  </Text>
                </View>
              </View>

              {isExporting && exportingFormat === 'json' ? (
                <ActivityIndicator size="small" color="#4F46E5" />
              ) : (
                <Text className="text-[#4F46E5] text-2xl ml-2">→</Text>
              )}
            </View>
          </Pressable>

          {/* TXT */}
          <Pressable
            onPress={() => handleExport('txt')}
            disabled={isExporting}
            className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm active:bg-gray-50"
          >
            <View className="flex-row items-start">
              <View className="flex-1">
                <View className="flex-row items-center mb-2">
                  <Text className="text-xl mr-2">📝</Text>
                  <Text className="text-lg font-semibold text-gray-900">
                    Formato TXT
                  </Text>
                </View>
                
                <Text className="text-sm text-gray-600 mb-3">
                  Archivo de texto plano, fácil de leer y compartir.
                  Compatible con cualquier editor de texto.
                </Text>

                <View className="bg-gray-50 rounded p-3">
                  <Text className="text-xs font-mono text-gray-700">
                    ═══ MI DIARIO EMOCIONAL ═══{'\n'}
                    Título: Mi entrada...{'\n'}
                    Contenido: Hoy fue un día...
                  </Text>
                </View>
              </View>

              {isExporting && exportingFormat === 'txt' ? (
                <ActivityIndicator size="small" color="#4F46E5" />
              ) : (
                <Text className="text-[#4F46E5] text-2xl ml-2">→</Text>
              )}
            </View>
          </Pressable>
        </View>

        {/* Info adicional */}
        <View className="mt-8 bg-blue-50 rounded-lg p-4 border border-blue-200">
          <View className="flex-row">
            <Text className="text-2xl mr-3">ℹ️</Text>
            <View className="flex-1">
              <Text className="text-sm font-medium text-blue-900 mb-1">
                Información importante
              </Text>
              <Text className="text-xs text-blue-700 leading-5">
                • Se exportarán hasta 2,000 entradas{'\n'}
                • Las imágenes y audios no se incluyen (solo metadatos){'\n'}
                • Los archivos se guardan temporalmente{'\n'}
                • Usa la función de compartir para guardarlos
              </Text>
            </View>
          </View>
        </View>

        {/* Loading global */}
        {isExporting && (
          <View className="mt-6 items-center">
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text className="text-gray-600 mt-3">
              Preparando exportación...
            </Text>
          </View>
        )}
      </View>
    </Screen>
  );
}
