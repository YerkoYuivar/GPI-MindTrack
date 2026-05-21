/**
 * Plantillas de journaling guiado
 * 
 * Plantillas que el asistente puede sugerir para facilitar
 * la escritura reflexiva con estructura.
 */

export type TemplateKey = 'abc' | '3good' | 'tension-release';

export type JournalTemplate = {
  title: string;
  content: string;
  mood?: number; // opcional: mood sugerido
};

/**
 * Obtiene una plantilla de journaling por su clave
 * 
 * @param key - Identificador de la plantilla
 * @returns Plantilla con título y contenido prefillado
 */
export function getTemplate(key: TemplateKey): JournalTemplate {
  switch (key) {
    case 'abc':
      return {
        title: 'ABC: Activador - Creencia - Consecuencia',
        content: `Activador (¿qué pasó?):


Creencia (¿qué pensaste/sentiste al respecto?):


Consecuencia (¿cómo te comportaste/qué resultó?):


Nueva perspectiva (¿hay otra forma de verlo?):

`,
      };

    case '3good':
      return {
        title: '3 cosas que salieron bien hoy',
        content: `1) 


2) 


3) 


¿Por qué ocurrieron estas cosas buenas?

`,
        mood: 4, // sugerir mood positivo
      };

    case 'tension-release':
      return {
        title: 'Descarga de tensión',
        content: `¿Dónde sientes la tensión en tu cuerpo?


¿Qué crees que la provoca?


¿Qué te ayuda a aliviarla?


¿Qué podrías probar ahora?

`,
      };

    default:
      // Fallback (nunca debería ocurrir con el tipo TemplateKey)
      return {
        title: 'Entrada libre',
        content: '',
      };
  }
}

/**
 * Obtiene información descriptiva de una plantilla
 * Útil para mostrar en UI de selección
 */
export function getTemplateInfo(key: TemplateKey): {
  name: string;
  description: string;
  icon: string;
} {
  switch (key) {
    case 'abc':
      return {
        name: 'Modelo ABC',
        description: 'Analiza situaciones identificando activador, creencias y consecuencias',
        icon: '🔍',
      };
    case '3good':
      return {
        name: '3 Cosas Buenas',
        description: 'Enfócate en lo positivo recordando 3 cosas que salieron bien',
        icon: '✨',
      };
    case 'tension-release':
      return {
        name: 'Descarga de Tensión',
        description: 'Explora dónde sientes tensión y qué podría ayudarte',
        icon: '💆',
      };
  }
}
