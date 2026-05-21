/**
 * Chat QA Screen
 * 
 * Checklist de Quality Assurance para validación manual del módulo de Chat.
 * Permite marcar tareas completadas y persistir el estado en AsyncStorage.
 */

import React, {useState, useEffect} from 'react';
import {View, Text, Pressable, ScrollView, Switch} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Screen} from '@components/ui/Screen';
import Header from '@components/ui/Header';

const QA_STORAGE_KEY = '@qa.chat.v1';

type QAItem = {
  id: string;
  title: string;
  description: string;
  checked: boolean;
};

const INITIAL_CHECKLIST: QAItem[] = [
  {
    id: '1',
    title: 'Enviar mensaje aparece en UI',
    description: 'El mensaje del usuario se muestra inmediatamente en la lista',
    checked: false,
  },
  {
    id: '2',
    title: 'Respuesta mock con streaming',
    description: 'El asistente responde con typing indicator y texto progresivo',
    checked: false,
  },
  {
    id: '3',
    title: 'Botones de herramientas funcionan',
    description: 'Los botones de acciones abren las pantallas/modales correctas',
    checked: false,
  },
  {
    id: '4',
    title: 'Exportación genera .txt',
    description: 'Se puede exportar la conversación y compartir el archivo',
    checked: false,
  },
  {
    id: '5',
    title: 'Borrado elimina conversación',
    description: 'Borrar elimina todos los mensajes sin dejar huérfanos',
    checked: false,
  },
  {
    id: '6',
    title: 'Accesibilidad: lectores de pantalla',
    description: 'VoiceOver/TalkBack lee burbujas con rol correcto',
    checked: false,
  },
  {
    id: '7',
    title: 'Accesibilidad: anuncio de typing',
    description: 'Se anuncia "El asistente está escribiendo" al activar typing',
    checked: false,
  },
  {
    id: '8',
    title: 'Rate limiting se activa',
    description: 'Spamear 10+ mensajes activa el límite y muestra countdown',
    checked: false,
  },
  {
    id: '9',
    title: 'Banner de errores visible',
    description: 'Los errores muestran banner contextual con mensaje claro',
    checked: false,
  },
  {
    id: '10',
    title: 'Memoria conversacional funciona',
    description: 'Pantalla de memoria muestra checkpoints y slots correctos',
    checked: false,
  },
  {
    id: '11',
    title: 'Modal de respiración anima',
    description: 'El modal de respiración muestra círculo animado y fases',
    checked: false,
  },
  {
    id: '12',
    title: 'Ejercicios rápidos muestran pasos',
    description: 'La pantalla de ejercicios muestra instrucciones completas',
    checked: false,
  },
];

type Props = NativeStackScreenProps<any, 'ChatQA'>;

export default function ChatQAScreen({navigation}: Props) {
  const [checklist, setChecklist] = useState<QAItem[]>(INITIAL_CHECKLIST);
  const [loading, setLoading] = useState(true);

  // Cargar estado desde AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(QA_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as QAItem[];
          setChecklist(parsed);
        }
      } catch (err) {
        console.error('Error loading QA checklist:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Guardar estado en AsyncStorage
  const saveChecklist = async (newChecklist: QAItem[]) => {
    try {
      await AsyncStorage.setItem(QA_STORAGE_KEY, JSON.stringify(newChecklist));
    } catch (err) {
      console.error('Error saving QA checklist:', err);
    }
  };

  // Toggle item
  const toggleItem = (id: string) => {
    const updated = checklist.map((item) =>
      item.id === id ? {...item, checked: !item.checked} : item
    );
    setChecklist(updated);
    saveChecklist(updated);
  };

  // Reset checklist
  const resetChecklist = () => {
    setChecklist(INITIAL_CHECKLIST);
    saveChecklist(INITIAL_CHECKLIST);
  };

  // Stats
  const totalItems = checklist.length;
  const checkedItems = checklist.filter((i) => i.checked).length;
  const progress = Math.round((checkedItems / totalItems) * 100);

  if (loading) {
    return (
      <Screen className="flex-1">
        <Header title="Chat QA" />
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-600">Cargando...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen className="flex-1">
      <Header title="Chat QA Checklist" />

      <ScrollView className="flex-1 bg-gray-50">
        {/* Progress */}
        <View className="bg-white px-4 py-6 border-b border-gray-200">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-2xl font-bold text-gray-900">
              {progress}% Completo
            </Text>
            <Pressable
              onPress={resetChecklist}
              className="px-3 py-1 rounded-lg bg-rose-50"
            >
              <Text className="text-rose-600 text-sm font-medium">
                Resetear
              </Text>
            </Pressable>
          </View>
          <Text className="text-gray-600 text-sm">
            {checkedItems} de {totalItems} tareas completadas
          </Text>

          {/* Progress bar */}
          <View className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
            <View
              className="h-full bg-indigo-600"
              style={{width: `${progress}%`}}
            />
          </View>
        </View>

        {/* Checklist */}
        <View className="p-4">
          {checklist.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => toggleItem(item.id)}
              className={`mb-3 p-4 rounded-xl border ${
                item.checked
                  ? 'bg-indigo-50 border-indigo-200'
                  : 'bg-white border-gray-200'
              }`}
            >
              <View className="flex-row items-start gap-3">
                {/* Número */}
                <View
                  className={`w-6 h-6 rounded-full items-center justify-center ${
                    item.checked ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      item.checked ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    {index + 1}
                  </Text>
                </View>

                {/* Content */}
                <View className="flex-1">
                  <Text
                    className={`text-base font-semibold mb-1 ${
                      item.checked ? 'text-indigo-900' : 'text-gray-900'
                    }`}
                  >
                    {item.title}
                  </Text>
                  <Text
                    className={`text-sm ${
                      item.checked ? 'text-indigo-700' : 'text-gray-600'
                    }`}
                  >
                    {item.description}
                  </Text>
                </View>

                {/* Switch */}
                <Switch
                  value={item.checked}
                  onValueChange={() => toggleItem(item.id)}
                  trackColor={{false: '#d1d5db', true: '#818cf8'}}
                  thumbColor={item.checked ? '#4f46e5' : '#f3f4f6'}
                />
              </View>
            </Pressable>
          ))}
        </View>

        {/* Footer info */}
        <View className="p-4 pb-8">
          <View className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
            <Text className="text-indigo-900 font-semibold mb-2">
              📝 Instrucciones
            </Text>
            <Text className="text-indigo-700 text-sm leading-5">
              • Marca cada tarea como completada al verificarla manualmente{'\n'}
              • El progreso se guarda automáticamente{'\n'}
              • Usa "Resetear" para volver a empezar{'\n'}
              • Esta pantalla es solo para desarrollo/QA
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
