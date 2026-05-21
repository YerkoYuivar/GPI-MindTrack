/**
 * Hook para checklist de QA persistente
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const QA_KEY = 'ej.qa.v1';

export type QAItem = {
  id: string;
  label: string;
  checked: boolean;
};

const DEFAULT_ITEMS: Omit<QAItem, 'checked'>[] = [
  { id: 'create-entry', label: 'Crear entrada funciona' },
  { id: 'edit-save', label: 'Editar/Guardar funciona' },
  { id: 'favorites', label: 'Favoritos aparece en vista Favoritos' },
  { id: 'soft-delete', label: 'Soft delete → aparece en Papelera' },
  { id: 'restore', label: 'Restaurar desde Papelera' },
  { id: 'export', label: 'Exportar JSON/TXT' },
  { id: 'upload-images', label: 'Subir imágenes' },
  { id: 'record-audio', label: 'Grabar y subir audio' },
  { id: 'offline-mode', label: 'Modo offline: autosave y reconexión' },
  { id: 'search', label: 'Búsqueda local devuelve resultados esperados' },
];

export function useQAChecklist() {
  const [items, setItems] = useState<QAItem[]>(
    DEFAULT_ITEMS.map(item => ({ ...item, checked: false }))
  );
  const [isLoading, setIsLoading] = useState(true);

  // Cargar estado guardado
  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    try {
      const stored = await AsyncStorage.getItem(QA_KEY);
      if (stored) {
        const saved = JSON.parse(stored) as Record<string, boolean>;
        setItems(prev =>
          prev.map(item => ({
            ...item,
            checked: saved[item.id] ?? false,
          }))
        );
      }
    } catch (error) {
      console.error('[QAChecklist] Error loading state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggle = useCallback(async (id: string) => {
    setItems(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      );

      // Persistir
      const state = updated.reduce(
        (acc, item) => {
          acc[item.id] = item.checked;
          return acc;
        },
        {} as Record<string, boolean>
      );

      AsyncStorage.setItem(QA_KEY, JSON.stringify(state)).catch(error => {
        console.error('[QAChecklist] Error saving state:', error);
      });

      return updated;
    });
  }, []);

  const reset = useCallback(async () => {
    setItems(prev => prev.map(item => ({ ...item, checked: false })));
    await AsyncStorage.removeItem(QA_KEY);
  }, []);

  const progress = {
    completed: items.filter(item => item.checked).length,
    total: items.length,
    percentage: items.length > 0
      ? Math.round((items.filter(item => item.checked).length / items.length) * 100)
      : 0,
  };

  return {
    items,
    isLoading,
    toggle,
    reset,
    progress,
  };
}
