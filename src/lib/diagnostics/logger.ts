/**
 * Sistema de logging local con buffer circular y persistencia
 * 
 * Logger simple para diagnóstico y debugging sin dependencias externas.
 * Mantiene logs en memoria con persistencia periódica en AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ========================================
// TIPOS
// ========================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogRecord = {
  id: string;
  ts: number;
  level: LogLevel;
  tag?: string;
  msg: string;
  data?: Record<string, unknown>;
};

export type LoggerOptions = {
  key?: string;           // AsyncStorage key
  max?: number;           // tamaño del buffer
  consoleSink?: boolean;  // imprime a console.*
};

// ========================================
// ESTADO INTERNO
// ========================================

class Logger {
  private buffer: LogRecord[] = [];
  private key: string = 'ej.logs.v1';
  private max: number = 500;
  private consoleSink: boolean = false;
  private lastPersist: number = 0;
  private pendingCount: number = 0;
  private persistThreshold: number = 10;
  private persistInterval: number = 5000; // 5 segundos
  private initialized: boolean = false;

  /**
   * Inicializa el logger con opciones
   */
  async init(opts?: LoggerOptions): Promise<void> {
    if (this.initialized) return;

    this.key = opts?.key || 'ej.logs.v1';
    this.max = opts?.max || 500;
    this.consoleSink = opts?.consoleSink ?? false;

    // Cargar logs existentes
    try {
      const stored = await AsyncStorage.getItem(this.key);
      if (stored) {
        const parsed = JSON.parse(stored) as LogRecord[];
        this.buffer = parsed.slice(-this.max); // Solo los más recientes
      }
    } catch (error) {
      console.error('[Logger] Error loading logs:', error);
    }

    this.initialized = true;
    this.lastPersist = Date.now();
  }

  /**
   * Registra un log con nivel específico
   */
  log(
    level: LogLevel,
    msg: string,
    data?: Record<string, unknown>,
    tag?: string
  ): void {
    const record: LogRecord = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ts: Date.now(),
      level,
      tag,
      msg,
      data,
    };

    // Agregar al buffer (circular)
    this.buffer.push(record);
    if (this.buffer.length > this.max) {
      this.buffer.shift();
    }

    this.pendingCount++;

    // Console sink
    if (this.consoleSink) {
      this.printToConsole(record);
    }

    // Persistir si es necesario
    this.maybePersist();
  }

  /**
   * Logs por nivel
   */
  debug(msg: string, data?: Record<string, unknown>, tag?: string): void {
    this.log('debug', msg, data, tag);
  }

  info(msg: string, data?: Record<string, unknown>, tag?: string): void {
    this.log('info', msg, data, tag);
  }

  warn(msg: string, data?: Record<string, unknown>, tag?: string): void {
    this.log('warn', msg, data, tag);
  }

  error(msg: string, data?: Record<string, unknown>, tag?: string): void {
    this.log('error', msg, data, tag);
  }

  /**
   * Obtiene todos los logs
   */
  async getAll(): Promise<LogRecord[]> {
    return [...this.buffer];
  }

  /**
   * Limpia todos los logs
   */
  async clear(): Promise<void> {
    this.buffer = [];
    this.pendingCount = 0;
    await AsyncStorage.removeItem(this.key);
  }

  /**
   * Imprime a consola según nivel
   */
  private printToConsole(record: LogRecord): void {
    const prefix = record.tag ? `[${record.tag}]` : '';
    const message = `${prefix} ${record.msg}`;
    const timestamp = new Date(record.ts).toISOString();

    switch (record.level) {
      case 'debug':
        console.debug(`[DEBUG ${timestamp}]`, message, record.data || '');
        break;
      case 'info':
        console.info(`[INFO ${timestamp}]`, message, record.data || '');
        break;
      case 'warn':
        console.warn(`[WARN ${timestamp}]`, message, record.data || '');
        break;
      case 'error':
        console.error(`[ERROR ${timestamp}]`, message, record.data || '');
        break;
    }
  }

  /**
   * Persiste logs si se cumplen las condiciones
   */
  private maybePersist(): void {
    const now = Date.now();
    const timeSinceLastPersist = now - this.lastPersist;

    const shouldPersist =
      this.pendingCount >= this.persistThreshold ||
      timeSinceLastPersist >= this.persistInterval;

    if (shouldPersist) {
      this.persist();
    }
  }

  /**
   * Persiste logs a AsyncStorage
   */
  private persist(): void {
    const snapshot = [...this.buffer];
    this.pendingCount = 0;
    this.lastPersist = Date.now();

    // Persistir asíncronamente sin bloquear
    AsyncStorage.setItem(this.key, JSON.stringify(snapshot)).catch(error => {
      console.error('[Logger] Error persisting logs:', error);
    });
  }

  /**
   * Fuerza persistencia inmediata
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    try {
      await AsyncStorage.setItem(this.key, JSON.stringify(this.buffer));
      this.pendingCount = 0;
      this.lastPersist = Date.now();
    } catch (error) {
      console.error('[Logger] Error flushing logs:', error);
    }
  }
}

// ========================================
// EXPORTACIÓN SINGLETON
// ========================================

export const logger = new Logger();
