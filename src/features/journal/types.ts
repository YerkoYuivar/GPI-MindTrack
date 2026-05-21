export type EntryId = string;

export type JournalEntry = {
  title?: string;
  content: string;
  mood?: number; // 1–7
  energy?: number; // 1–7
  tags: string[];
  isFavorite?: boolean;
  state: 'active' | 'trashed';
  wordCount?: number;
  imageCount?: number;
  hasAudio?: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Metadatos de imagen subida a Storage
export type EntryImage = {
  id: string;          // imageId (uuid)
  path: string;        // ruta en Storage del original
  url: string;         // downloadURL del original
  thumbPath: string;   // ruta en Storage del thumbnail
  thumbUrl: string;    // downloadURL del thumbnail
  width: number;       // dimensiones del original
  height: number;
  bytes: number;       // tamaño del original subido
  createdAt: Date;     // serverTimestamp
  updatedAt: Date;     // serverTimestamp
};

// Metadatos de audio subido a Storage
export type EntryAudio = {
  id: string;          // audioId (uuid)
  path: string;        // ruta en Storage del audio
  url: string;         // downloadURL del audio
  durationMs: number;  // duración en milisegundos
  bytes: number;       // tamaño del archivo
  createdAt: Date;     // serverTimestamp
  updatedAt: Date;     // serverTimestamp
};

// Draft entry (para autosave local)
export type DraftEntry = {
  title?: string;
  content: string;
  mood?: number;   // 1–7
  energy?: number; // 1–7
  tags: string[];
  imageCount?: number;
  imageUris?: string[];  // URIs locales de imágenes seleccionadas (máx 4)
  hasAudio?: boolean;
};

// Item para lista (derivado de JournalEntry)
export type JournalListItem = {
  id: EntryId;
  title?: string;
  excerpt: string;
  createdAt: number; // epoch ms
  mood?: number;
  energy?: number;
  tags: string[];
  isFavorite?: boolean;
  imageCount?: number;
  hasAudio?: boolean;
};
