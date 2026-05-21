/**
 * Chat Types
 * 
 * Define los tipos para conversaciones y mensajes del chat de soporte.
 * Incluye tool-calls (actions) que el asistente puede sugerir.
 */

export type ChatRole = 'user' | 'assistant' | 'system';

/**
 * Tipos de acciones que el asistente puede invocar
 */
export type ToolActionType = 
  | 'journal.openTemplate'
  | 'breathing.start'
  | 'exercise.run';

/**
 * Acción/herramienta que el asistente sugiere al usuario
 */
export type ToolAction = {
  type: ToolActionType;
  label: string; // texto del botón
  params?: Record<string, any>; // parámetros específicos por tipo
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number; // epoch ms
  status?: 'sent' | 'pending' | 'failed';
  meta?: {
    tokens?: number; // para el futuro
    safety?: 'ok' | 'warn' | 'blocked'; // placeholder para moderación
  };
  /** Acciones/herramientas que el asistente sugiere (botones en el mensaje) */
  actions?: ToolAction[];
};

export type Conversation = {
  id: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
  lastMessagePreview?: string;
  messageCount: number;
  state: 'active' | 'archived';
};
