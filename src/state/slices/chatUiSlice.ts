/**
 * Chat UI Slice (Zustand)
 * 
 * Estado de UI del chat:
 * - typing: indica si el asistente está "escribiendo"
 */

import {create} from 'zustand';

type ChatUiState = {
  typing: boolean;
  setTyping: (v: boolean) => void;
};

export const useChatUi = create<ChatUiState>((set) => ({
  typing: false,
  setTyping: (v) => set({typing: v}),
}));
