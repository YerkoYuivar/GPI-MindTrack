import React, { ReactNode } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';

type SwipeableRowProps = {
  onEdit: () => void;
  onRename: () => void;
  onDelete: () => void;
  children: ReactNode;
};

/**
 * SwipeableRow con acciones de editar, renombrar y eliminar
 * Diseño limpio y alineado horizontalmente
 */
export default function SwipeableRow({ onEdit, onRename, onDelete, children }: SwipeableRowProps) {
  const renderRightActions = () => {
    return (
      <View style={styles.rightActionsContainer}>
        {/* Renombrar */}
        <Pressable
          onPress={onRename}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.renameBtn,
            pressed && styles.actionPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Renombrar entrada"
        >
          <Feather name="edit-3" size={22} color="#6366F1" />
          <Text style={[styles.actionText, styles.renameText]}>Renombrar</Text>
        </Pressable>

        {/* Editar */}
        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.editBtn,
            pressed && styles.actionPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Editar entrada"
        >
          <Feather name="edit" size={22} color="#10B981" />
          <Text style={[styles.actionText, styles.editText]}>Editar</Text>
        </Pressable>

        {/* Eliminar */}
        <Pressable
          onPress={onDelete}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.deleteBtn,
            pressed && styles.actionPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Eliminar entrada"
        >
          <Feather name="trash-2" size={22} color="#EF4444" />
          <Text style={[styles.actionText, styles.deleteText]}>Eliminar</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  rightActionsContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  actionBtn: {
    width: 100,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  actionPressed: {
    opacity: 0.6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Renombrar - Indigo
  renameBtn: {
    backgroundColor: '#6366F1',
  },
  renameText: {
    color: '#FFFFFF',
  },
  // Editar - Green
  editBtn: {
    backgroundColor: '#10B981',
  },
  editText: {
    color: '#FFFFFF',
  },
  // Eliminar - Red
  deleteBtn: {
    backgroundColor: '#EF4444',
  },
  deleteText: {
    color: '#FFFFFF',
  },
});
