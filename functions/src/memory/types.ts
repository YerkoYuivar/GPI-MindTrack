/**
 * Tipos para el sistema de memoria conversacional
 * - Checkpoints: resúmenes por hito cada ~20 turnos
 * - ProfileSlots: slots estructurados del perfil del usuario
 */

import type * as FirebaseFirestore from 'firebase-admin/firestore';

/**
 * Checkpoint: resumen de conversación por hito
 * Se crea automáticamente cada ~20 turnos o manualmente
 */
export type Checkpoint = {
  /** ID único (ej: "t0020", "t0040") */
  id: string;
  /** Número de turno (count de mensajes) */
  turn: number;
  /** Resumen de 4-6 oraciones, tono neutro/empático */
  summary: string;
  /** 3-7 etiquetas de temas clave (coinciden con grafo si posible) */
  keyTopics: string[];
  /** Ejercicios/estrategias mencionadas (respiración, caminata, etc.) */
  actionsTried: string[];
  /** Timestamp de creación/actualización */
  updatedAt: FirebaseFirestore.FieldValue | Date;
};

/**
 * ProfileSlots: slots estructurados del perfil del usuario
 * Almacena patrones detectados sin texto literal extenso
 */
export type ProfileSlots = {
  /** Desencadenantes frecuentes (max 20): "plazos", "conflictos laborales" */
  triggers: string[];
  /** Prácticas que ayudan (max 20): "respiración 4-7-8", "caminata consciente" */
  helpfulPractices: string[];
  /** Tono preferido del asistente */
  preferredTone?: 'directo' | 'suave' | 'neutro';
  /** Horario preferido para escribir (ej: "21:00") */
  checkInTime?: string;
  /** Indica si ha tenido crisis (sin detalles explícitos por privacidad) */
  crisisHistory?: boolean;
  /** Timestamp de última actualización */
  updatedAt: FirebaseFirestore.FieldValue | Date;
};
