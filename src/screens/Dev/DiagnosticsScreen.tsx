/**
 * Pantalla de Diagnóstico y QA
 * 
 * Herramientas internas para debugging, métricas y checklist de QA.
 * Solo accesible en modo desarrollo.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Screen } from '../../components/ui/Screen';
import Header from '../../components/ui/Header';
import { logger, LogLevel, LogRecord } from '../../lib/diagnostics/logger';
import { metrics } from '../../lib/diagnostics/metrics';
import { getRuntimeInfo, formatDuration, formatTimestamp, RuntimeInfo } from '../../lib/diagnostics/runtime';
import { useQAChecklist } from '../../state/dev/qaChecklist';

type LogLevelFilter = LogLevel | 'all';

export function DiagnosticsScreen({ navigation }: any) {
  const [runtimeInfo, setRuntimeInfo] = useState<RuntimeInfo | null>(null);
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [logFilter, setLogFilter] = useState<LogLevelFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'logs' | 'qa'>('overview');
  
  const qa = useQAChecklist();
  const metricsSnapshot = metrics.getSnapshot();

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [runtime, allLogs] = await Promise.all([
        getRuntimeInfo(),
        logger.getAll(),
      ]);
      
      setRuntimeInfo(runtime);
      setLogs(allLogs.reverse()); // Más recientes primero
    } catch (error) {
      console.error('[DiagnosticsScreen] Error loading data:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleClearLogs = async () => {
    await logger.clear();
    setLogs([]);
  };

  const filteredLogs = logs.filter(log => 
    logFilter === 'all' || log.level === logFilter
  );

  // ========================================
  // RENDERIZADO
  // ========================================

  return (
    <Screen>
      <Header
        title="Diagnóstico"
        left={
          <Pressable
            onPress={() => navigation.goBack()}
            className="w-10 h-10 items-center justify-center"
          >
            <Text className="text-xl text-[#4F46E5]">←</Text>
          </Pressable>
        }
      />

      {/* Tabs */}
      <View className="flex-row bg-white border-b border-gray-200">
        {(['overview', 'metrics', 'logs', 'qa'] as const).map(tab => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 py-3 ${activeTab === tab ? 'border-b-2 border-indigo-600' : ''}`}
          >
            <Text
              className={`text-center text-sm ${activeTab === tab ? 'text-indigo-600 font-semibold' : 'text-gray-600'}`}
            >
              {tab === 'overview' && '📊 Info'}
              {tab === 'metrics' && '📈 Métricas'}
              {tab === 'logs' && '📝 Logs'}
              {tab === 'qa' && '✅ QA'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        className="flex-1 bg-gray-50"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <View className="p-4 space-y-4">
            {/* Conectividad */}
            <View className="bg-white rounded-lg p-4 border border-gray-200">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                🌐 Conectividad
              </Text>
              
              {runtimeInfo ? (
                <View className="space-y-2">
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">Estado:</Text>
                    <Text className={`font-medium ${runtimeInfo.online ? 'text-green-600' : 'text-red-600'}`}>
                      {runtimeInfo.online ? '✓ Online' : '✗ Offline'}
                    </Text>
                  </View>
                  
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">Tipo:</Text>
                    <Text className="font-medium text-gray-900">
                      {runtimeInfo.type || 'Desconocido'}
                    </Text>
                  </View>
                  
                  {runtimeInfo.ip && (
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600">IP:</Text>
                      <Text className="font-mono text-sm text-gray-900">
                        {runtimeInfo.ip}
                      </Text>
                    </View>
                  )}
                  
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">Actualizado:</Text>
                    <Text className="text-sm text-gray-500">
                      {formatTimestamp(runtimeInfo.ts)}
                    </Text>
                  </View>
                </View>
              ) : (
                <ActivityIndicator />
              )}
            </View>

            {/* Emuladores */}
            <View className="bg-white rounded-lg p-4 border border-gray-200">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                🔧 Emuladores
              </Text>
              
              {runtimeInfo ? (
                <View className="space-y-2">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-gray-600">Firestore:</Text>
                    <Text className={`font-medium ${runtimeInfo.emulators.firestore ? 'text-orange-600' : 'text-gray-400'}`}>
                      {runtimeInfo.emulators.firestore ? '⚡ Activo' : 'Inactivo'}
                    </Text>
                  </View>
                  
                  <View className="flex-row justify-between items-center">
                    <Text className="text-gray-600">Storage:</Text>
                    <Text className={`font-medium ${runtimeInfo.emulators.storage ? 'text-orange-600' : 'text-gray-400'}`}>
                      {runtimeInfo.emulators.storage ? '⚡ Activo' : 'Inactivo'}
                    </Text>
                  </View>
                </View>
              ) : (
                <ActivityIndicator />
              )}
            </View>

            {/* Progreso QA */}
            <View className="bg-white rounded-lg p-4 border border-gray-200">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                ✅ Progreso QA
              </Text>
              
              <View className="flex-row items-center mb-2">
                <View className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-green-500"
                    style={{ width: `${qa.progress.percentage}%` }}
                  />
                </View>
                <Text className="ml-3 font-semibold text-gray-900">
                  {qa.progress.percentage}%
                </Text>
              </View>
              
              <Text className="text-sm text-gray-600">
                {qa.progress.completed} de {qa.progress.total} pruebas completadas
              </Text>
            </View>
          </View>
        )}

        {/* MÉTRICAS */}
        {activeTab === 'metrics' && (
          <View className="p-4 space-y-4">
            {/* Contadores */}
            <View className="bg-white rounded-lg p-4 border border-gray-200">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                📊 Contadores
              </Text>
              
              {Object.keys(metricsSnapshot.counters).length > 0 ? (
                <View className="space-y-2">
                  {Object.entries(metricsSnapshot.counters).map(([key, value]) => (
                    <View key={key} className="flex-row justify-between items-center py-1">
                      <Text className="text-sm text-gray-600 flex-1">{key}</Text>
                      <Text className="font-mono font-semibold text-indigo-600">
                        {value}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="text-gray-500 text-center py-4">
                  Sin contadores aún
                </Text>
              )}
            </View>

            {/* Timers */}
            <View className="bg-white rounded-lg p-4 border border-gray-200">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                ⏱️ Timers
              </Text>
              
              {Object.keys(metricsSnapshot.timers).length > 0 ? (
                <View className="space-y-3">
                  {Object.entries(metricsSnapshot.timers).map(([key, stats]) => (
                    <View key={key} className="border-l-2 border-indigo-200 pl-3">
                      <Text className="text-sm font-medium text-gray-900 mb-1">
                        {key}
                      </Text>
                      <View className="flex-row flex-wrap gap-3">
                        <Text className="text-xs text-gray-600">
                          Count: <Text className="font-mono font-semibold">{stats.count}</Text>
                        </Text>
                        <Text className="text-xs text-gray-600">
                          P50: <Text className="font-mono font-semibold">{formatDuration(stats.p50)}</Text>
                        </Text>
                        <Text className="text-xs text-gray-600">
                          P95: <Text className="font-mono font-semibold">{formatDuration(stats.p95)}</Text>
                        </Text>
                        <Text className="text-xs text-gray-600">
                          Last: <Text className="font-mono font-semibold">{formatDuration(stats.last)}</Text>
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="text-gray-500 text-center py-4">
                  Sin timers aún
                </Text>
              )}
            </View>

            {/* Botón reset */}
            <Pressable
              onPress={() => {
                metrics.reset();
                handleRefresh();
              }}
              className="bg-red-50 border border-red-200 rounded-lg p-3"
            >
              <Text className="text-red-600 font-medium text-center">
                🔄 Resetear Métricas
              </Text>
            </Pressable>
          </View>
        )}

        {/* LOGS */}
        {activeTab === 'logs' && (
          <View className="p-4 space-y-4">
            {/* Filtros */}
            <View className="bg-white rounded-lg p-3 border border-gray-200">
              <View className="flex-row flex-wrap gap-2">
                {(['all', 'debug', 'info', 'warn', 'error'] as LogLevelFilter[]).map(level => (
                  <Pressable
                    key={level}
                    onPress={() => setLogFilter(level)}
                    className={`px-3 py-1.5 rounded ${
                      logFilter === level
                        ? 'bg-indigo-600'
                        : 'bg-gray-100'
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        logFilter === level ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      {level.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
                
                <Pressable
                  onPress={handleClearLogs}
                  className="px-3 py-1.5 rounded bg-red-50 border border-red-200 ml-auto"
                >
                  <Text className="text-xs font-medium text-red-600">
                    Limpiar
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Lista de logs */}
            <View className="space-y-2">
              {filteredLogs.length > 0 ? (
                filteredLogs.slice(0, 100).map((log) => (
                  <View
                    key={log.id}
                    className={`rounded-lg p-3 border ${
                      log.level === 'error' ? 'bg-red-50 border-red-200' :
                      log.level === 'warn' ? 'bg-yellow-50 border-yellow-200' :
                      log.level === 'info' ? 'bg-blue-50 border-blue-200' :
                      'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <View className="flex-row items-start justify-between mb-1">
                      <Text className={`text-xs font-semibold ${
                        log.level === 'error' ? 'text-red-700' :
                        log.level === 'warn' ? 'text-yellow-700' :
                        log.level === 'info' ? 'text-blue-700' :
                        'text-gray-700'
                      }`}>
                        {log.level.toUpperCase()}
                        {log.tag && ` [${log.tag}]`}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {new Date(log.ts).toLocaleTimeString('es-ES')}
                      </Text>
                    </View>
                    
                    <Text className="text-sm text-gray-900 mb-1">
                      {log.msg}
                    </Text>
                    
                    {log.data && Object.keys(log.data).length > 0 && (
                      <Text className="text-xs font-mono text-gray-600 mt-1">
                        {JSON.stringify(log.data, null, 2)}
                      </Text>
                    )}
                  </View>
                ))
              ) : (
                <View className="bg-white rounded-lg p-8 border border-gray-200">
                  <Text className="text-gray-500 text-center">
                    {logs.length === 0 ? 'Sin logs aún' : 'Sin logs para este filtro'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* QA CHECKLIST */}
        {activeTab === 'qa' && (
          <View className="p-4 space-y-4">
            <View className="bg-white rounded-lg p-4 border border-gray-200">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                ✅ Checklist de QA
              </Text>
              
              {qa.isLoading ? (
                <ActivityIndicator />
              ) : (
                <View className="space-y-3">
                  {qa.items.map((item) => (
                    <View
                      key={item.id}
                      className="flex-row items-center py-2 border-b border-gray-100"
                    >
                      <Switch
                        value={item.checked}
                        onValueChange={() => qa.toggle(item.id)}
                        trackColor={{ false: '#D1D5DB', true: '#818CF8' }}
                        thumbColor={item.checked ? '#4F46E5' : '#F3F4F6'}
                      />
                      <Text
                        className={`ml-3 flex-1 ${
                          item.checked ? 'text-gray-500 line-through' : 'text-gray-900'
                        }`}
                      >
                        {item.label}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Botón reset */}
            <Pressable
              onPress={qa.reset}
              className="bg-gray-50 border border-gray-200 rounded-lg p-3"
            >
              <Text className="text-gray-600 font-medium text-center">
                🔄 Resetear Checklist
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
