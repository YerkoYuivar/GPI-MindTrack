/**
 * Chat Base Types
 * 
 * Tipos compartidos entre provider, context, writer y callable.
 */

export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatTurn = {
  role: ChatRole;
  content: string;
  createdAt?: number;
};

export type ChatRequest = {
  userId: string;
  conversationId: string;
  lastUserMessageId: string; // id del msg del user que disparó la respuesta
  maxContext?: number; // default 12 mensajes
  maxChars?: number; // default 6000 (aprox token cap)
};

export type ChatChunk = {
  delta?: string; // texto incremental
  done?: boolean; // último chunk
  safety?: 'ok' | 'warn' | 'blocked'; // etiqueta final
  crisis?: boolean; // activar derivación
  actions?: Array<{
    type: string;
    label: string;
    params?: any;
  }>; // herramientas/acciones sugeridas
};

export interface ChatProvider {
  respond(ctx: {
    system: string;
    history: ChatTurn[];
    user: string;
  }): AsyncGenerator<ChatChunk>;
}
