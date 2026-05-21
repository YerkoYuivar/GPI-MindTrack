import React from 'react';
import { Alert, FlatList, View, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { JournalStackParamList } from '@navigation/types';
import Screen from '@components/ui/Screen';
import Text from '@components/ui/Text';
import Button from '@components/ui/Button';
import JournalTrashItem from '@components/journal/JournalTrashItem';
import {
  useTrashedList,
  useRestoreEntry,
  useDeletePermanent,
  useEmptyTrash,
} from '@features/journal/hooks';

type Props = NativeStackScreenProps<JournalStackParamList, 'JournalTrash'>;

export default function JournalTrashScreen({ navigation }: Props) {
  const { items, loading } = useTrashedList();
  const { restore } = useRestoreEntry();
  const { removeForever } = useDeletePermanent();
  const { emptyAll, pending: emptying } = useEmptyTrash();

  const handleRestore = async (id: string) => {
    await restore(id);
  };

  const handleDeletePermanent = (id: string) => {
    Alert.alert(
      'Borrar permanentemente',
      'Esta acción no se puede deshacer. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            await removeForever(id);
          },
        },
      ]
    );
  };

  const handleEmptyTrash = () => {
    if (items.length === 0) return;

    Alert.alert(
      'Vaciar papelera',
      `Se eliminarán permanentemente ${items.length} entrada${items.length !== 1 ? 's' : ''}. Esta acción no se puede deshacer. ¿Continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Vaciar',
          style: 'destructive',
          onPress: async () => {
            const total = await emptyAll();
            Alert.alert(
              'Papelera vaciada',
              `Se eliminaron ${total} entrada${total !== 1 ? 's' : ''} permanentemente.`
            );
          },
        },
      ]
    );
  };

  return (
    <Screen className="px-0 py-0">
      {/* Header */}
      <View className="px-4 py-3 flex-row justify-between items-center border-b border-gray-200 bg-white">
        <Text className="text-xl font-bold">Papelera</Text>
        <Button
          title={emptying ? 'Vaciando...' : 'Vaciar'}
          variant="danger"
          size="sm"
          onPress={handleEmptyTrash}
          disabled={emptying || items.length === 0}
          accessibilityLabel="Vaciar papelera"
        />
      </View>

      {/* Estado de carga */}
      {loading && items.length === 0 && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text className="text-gray-500 mt-4">Cargando papelera...</Text>
        </View>
      )}

      {/* Lista */}
      {!loading || items.length > 0 ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View className="px-4">
              <JournalTrashItem
                item={item}
                onRestore={handleRestore}
                onDeletePermanent={handleDeletePermanent}
              />
            </View>
          )}
          ListEmptyComponent={
            !loading ? (
              <View className="flex-1 items-center justify-center mt-20 px-6">
                <Text className="text-lg text-gray-500 text-center mb-2">
                  No hay elementos en la papelera
                </Text>
                <Text className="text-sm text-gray-400 text-center">
                  Las entradas eliminadas aparecerán aquí
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={
            items.length === 0 ? { flexGrow: 1 } : { paddingTop: 12, paddingBottom: 32 }
          }
        />
      ) : null}
    </Screen>
  );
}
