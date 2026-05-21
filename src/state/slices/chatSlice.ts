/**
 * Chat Slice (Zustand)
 * 
 * Estado local de la conversación activa y mensajes.
 */

import {create} from 'zustand';
import type {ChatMessage} from '@features/chat/types';

type ChatState = {
  conversationId?: string;
  messages: ChatMessage[];
  loading: boolean;
  setConversation: (id?: string) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  setLoading: (b: boolean) => void;
};

export const useChatSlice = create<ChatState>((set) => ({
  conversationId: undefined,
  messages: [],
  loading: true,
  setConversation: (id) => set({conversationId: id}),
  setMessages: (msgs) => set({messages: msgs}),
  setLoading: (b) => set({loading: b}),
}));
