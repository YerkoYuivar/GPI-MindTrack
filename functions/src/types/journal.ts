/**
 * @module types/journal
 * @description Tipos para entradas del diario
 */

import * as admin from 'firebase-admin';

export type JournalEntry = {
  id: string;
  title?: string;
  content: string;
  tags?: string[];
  mood?: number; // 1-7
  energy?: number; // 1-7
  createdAt: admin.firestore.Timestamp | Date;
  updatedAt?: admin.firestore.Timestamp | Date;
  state?: 'active' | 'trashed';
  wordCount?: number;
  imageCount?: number;
  hasAudio?: boolean;
  isFavorite?: boolean;
};
