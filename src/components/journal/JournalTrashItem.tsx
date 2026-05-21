import React from 'react';
import { View } from 'react-native';
import Text from '@components/ui/Text';
import Button from '@components/ui/Button';
import type { JournalListItem } from '@features/journal/types';

type Props = {
  item: JournalListItem;
  onRestore: (id: string) => void;
  onDeletePermanent: (id: string) => void;
  className?: string;
};

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export default function JournalTrashItem({ item, onRestore, onDeletePermanent, className }: Props) {
  return (
    <View className={`border border-gray-200 rounded-xl p-4 mb-3 bg-white ${className ?? ''}`}>
      <View className="mb-2">
        <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
          {item.title || 'Sin título'}
        </Text>
        <Text className="text-xs text-gray-500 mt-1">
          {formatDate(item.createdAt)}
        </Text>
      </View>

      <Text className="text-sm text-gray-700 mb-3" numberOfLines={2}>
        {item.excerpt}
      </Text>

      {/* Tags si existen */}
      {item.tags.length > 0 && (
        <View className="flex-row flex-wrap gap-1 mb-3">
          {item.tags.slice(0, 3).map((tag, idx) => (
            <View key={idx} className="bg-gray-100 rounded-full px-2 py-0.5">
              <Text className="text-xs text-gray-600">{tag}</Text>
            </View>
          ))}
          {item.tags.length > 3 && (
            <View className="bg-gray-100 rounded-full px-2 py-0.5">
              <Text className="text-xs text-gray-600">+{item.tags.length - 3}</Text>
            </View>
          )}
        </View>
      )}

      {/* Botones de acción */}
      <View className="flex-row gap-2">
        <Button
          title="Restaurar"
          onPress={() => onRestore(item.id)}
          variant="secondary"
          size="sm"
          className="flex-1"
          accessibilityLabel="Restaurar entrada"
        />
        <Button
          title="Borrar permanente"
          onPress={() => onDeletePermanent(item.id)}
          variant="danger"
          size="sm"
          className="flex-1"
          accessibilityLabel="Borrar permanentemente"
        />
      </View>
    </View>
  );
}
