/**
 * Script para resetear el flag de migración y recuperar estado
 * Ejecutar en DevMenu → Diagnostics → Reset Migration
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const MIGRATION_FLAG_KEY = 'ej.migration.completed';

/**
 * Resetea el flag de migración
 * SOLO usar si la migración falló y necesitas reintentar
 */
export async function resetMigrationFlag() {
  try {
    await AsyncStorage.removeItem(MIGRATION_FLAG_KEY);
    console.log('✅ Migration flag reset successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to reset migration flag:', error);
    return false;
  }
}

/**
 * Verifica el estado actual de la migración
 */
export async function checkMigrationStatus() {
  try {
    const flag = await AsyncStorage.getItem(MIGRATION_FLAG_KEY);
    if (flag) {
      console.log(`ℹ️ Migration completed for user: ${flag}`);
      return { completed: true, userId: flag };
    } else {
      console.log('ℹ️ No migration completed yet');
      return { completed: false, userId: null };
    }
  } catch (error) {
    console.error('❌ Failed to check migration status:', error);
    return { completed: false, userId: null };
  }
}

/**
 * Lista todos los drafts locales existentes
 */
export async function listAllDrafts() {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const draftKeys = allKeys.filter(k => k.startsWith('ej.draft.'));
    
    console.log(`📝 Found ${draftKeys.length} local drafts:`);
    
    for (const key of draftKeys) {
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        try {
          const draft = JSON.parse(raw);
          console.log(`  - ${key}: "${draft.title || '(sin título)'}"`);
        } catch {
          console.log(`  - ${key}: [invalid JSON]`);
        }
      }
    }
    
    return draftKeys;
  } catch (error) {
    console.error('❌ Failed to list drafts:', error);
    return [];
  }
}

/**
 * PELIGRO: Limpia TODOS los drafts locales
 * Solo usar si estás 100% seguro
 */
export async function clearAllDrafts() {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const draftKeys = allKeys.filter(k => k.startsWith('ej.draft.'));
    
    console.log(`⚠️ Deleting ${draftKeys.length} drafts...`);
    await AsyncStorage.multiRemove(draftKeys);
    console.log('✅ All drafts cleared');
    
    return draftKeys.length;
  } catch (error) {
    console.error('❌ Failed to clear drafts:', error);
    return 0;
  }
}
