/**
 * Mock Chat Provider
 * 
 * Provider de IA simulado con:
 * - Respuestas empáticas generadas localmente
 * - Streaming simulado (chunks con delays)
 * - Reglas de seguridad integradas
 * - Sin dependencias de APIs externas
 */

import type {ChatProvider, ChatTurn, ChatChunk} from './base';
import {classifySafety, safeResponseFor} from './safety';

export class MockProvider implements ChatProvider {
  /**
   * Genera respuesta con streaming simulado
   */
  async *respond(ctx: {
    system: string;
    history: ChatTurn[];
    user: string;
  }): AsyncGenerator<ChatChunk> {
    const {user} = ctx;

    // 1) Clasificar seguridad
    const {label, crisis} = classifySafety(user);

    // 2) Manejar casos especiales
    if (crisis) {
      // Crisis: respuesta empática + derivación
      const parts = [
        'Siento mucho que estés pasando por esto. ',
        'Tu seguridad es lo más importante. ',
        'No estás solo/a. ',
      ];

      for (const part of parts) {
        await this.delay(100);
        yield {delta: part, safety: 'ok'};
      }

      await this.delay(150);
      yield {delta: safeResponseFor('crisis'), safety: 'ok'};
      yield {done: true, safety: 'ok', crisis: true};
      return;
    }

    if (label === 'blocked') {
      // Contenido bloqueado: no proporcionar información peligrosa
      await this.delay(120);
      yield {delta: safeResponseFor('blocked'), safety: 'blocked'};
      yield {done: true, safety: 'blocked'};
      return;
    }

    if (label === 'warn') {
      // Advertencia: redirigir a conversación constructiva
      await this.delay(120);
      yield {delta: safeResponseFor('warn'), safety: 'warn'};
      yield {done: true, safety: 'warn'};
      return;
    }

    // 3) Generar respuesta empática normal
    const response = this.generateEmpatheticResponse(user, ctx.history);

    // Dividir en chunks para simular streaming
    const chunks = this.splitIntoChunks(response);

    for (const chunk of chunks) {
      await this.delay(100); // Simular latencia de red/procesamiento
      yield {delta: chunk, safety: 'ok'};
    }

    // 4) Sugerir acciones/herramientas basadas en el contenido
    const suggestedActions = this.suggestActions(user);

    yield {done: true, safety: 'ok', actions: suggestedActions};
  }

  /**
   * Genera respuesta empática basada en el contexto
   */
  private generateEmpatheticResponse(
    userMessage: string,
    _history: ChatTurn[] // Prefijo _ indica que no se usa (futuro: analizar historial)
  ): string {
    const lower = userMessage.toLowerCase();

    // Detectar emociones comunes
    const emotions = {
      sad: ['triste', 'tristeza', 'deprimido', 'melanc'],
      anxious: ['ansiedad', 'ansioso', 'nervioso', 'preocup', 'estrés'],
      angry: ['enojado', 'enfadado', 'molesto', 'furioso', 'rabia'],
      lonely: ['solo', 'sola', 'soledad', 'aislado', 'aislada'],
      overwhelmed: ['abrumado', 'abrumada', 'sobrepasado', 'desbordado'],
      hopeless: ['sin esperanza', 'desesperanza', 'perdido', 'perdida'],
    };

    let detectedEmotion: string | null = null;

    for (const [emotion, keywords] of Object.entries(emotions)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        detectedEmotion = emotion;
        break;
      }
    }

    // Respuestas empáticas según emoción
    const responses: Record<string, string[]> = {
      sad: [
        'Entiendo que te sientas triste. Es normal sentirse así a veces. ',
        '¿Puedes contarme más sobre qué ha provocado esta tristeza? ',
        'Mientras tanto, ¿has probado salir a caminar o hablar con alguien cercano? ',
        'A veces ayuda escribir en tu diario lo que sientes.',
      ],
      anxious: [
        'La ansiedad puede ser muy abrumadora. Gracias por compartirlo. ',
        'Vamos a intentar algo juntos: respira hondo 4 segundos, mantén 4, exhala 4, pausa 4. ',
        '¿Qué evento específico te está preocupando ahora? ',
        'Recordar que la ansiedad es temporal puede ayudar a calmarla.',
      ],
      angry: [
        'Es válido sentir enojo. Es una emoción natural. ',
        '¿Qué situación te ha hecho sentir así? ',
        'A veces ayuda tomar distancia y volver cuando estés más calmado/a. ',
        '¿Has intentado escribir lo que sientes o hacer ejercicio?',
      ],
      lonely: [
        'La soledad es difícil. No estás solo/a en sentirte así. ',
        '¿Hay alguien con quien puedas conectar hoy, aunque sea con un mensaje? ',
        'A veces dar un paseo o visitar un lugar concurrido ayuda. ',
        'Tu compañía es valiosa, incluso para ti mismo/a.',
      ],
      overwhelmed: [
        'Sentirse abrumado/a es muy real. Vamos paso a paso. ',
        '¿Cuál es la cosa más urgente que necesitas resolver hoy? ',
        'A veces ayuda hacer una lista y priorizar solo 1-3 cosas. ',
        'Recuerda: no tienes que hacerlo todo hoy.',
      ],
      hopeless: [
        'Entiendo que puedas sentir que no hay salida. Eso es muy duro. ',
        'Aunque no lo parezca ahora, las cosas pueden cambiar. ',
        '¿Hay algo pequeño que puedas hacer hoy que te haga sentir un poco mejor? ',
        'Considera hablar con un profesional que pueda ayudarte a encontrar perspectiva.',
      ],
    };

    // Respuesta por defecto si no se detecta emoción específica
    const defaultResponse = [
      'Gracias por compartir lo que estás sintiendo. ',
      'Estoy aquí para apoyarte. ',
      '¿Hay algo específico que te gustaría explorar o alguna situación que quieras comentar? ',
      'A veces ayuda poner las cosas en palabras.',
    ];

    const selectedResponse =
      detectedEmotion && responses[detectedEmotion]
        ? responses[detectedEmotion]
        : defaultResponse;

    return selectedResponse.join('');
  }

  /**
   * Divide texto en chunks para simular streaming
   */
  private splitIntoChunks(text: string): string[] {
    // Dividir por oraciones (aproximado)
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    const chunks: string[] = [];

    for (const sentence of sentences) {
      // Dividir oraciones largas en pedazos más pequeños
      if (sentence.length > 60) {
        const words = sentence.split(' ');
        let chunk = '';

        for (const word of words) {
          if (chunk.length + word.length > 50) {
            chunks.push(chunk);
            chunk = word + ' ';
          } else {
            chunk += word + ' ';
          }
        }

        if (chunk.trim()) {
          chunks.push(chunk);
        }
      } else {
        chunks.push(sentence);
      }
    }

    return chunks;
  }

  /**
   * Sugiere herramientas/acciones basadas en el contenido del mensaje del usuario
   */
  private suggestActions(userText: string): Array<{
    type: string;
    label: string;
    params?: any;
  }> {
    const lower = userText.toLowerCase();
    const suggestions: Array<{type: string; label: string; params?: any}> = [];

    // 1. Respiración: para ansiedad, nervios, pánico
    if (
      /respira|ansioso|ansiedad|nervios|nervioso|p[aá]nico|agitado|taquicardia/.test(
        lower
      )
    ) {
      suggestions.push({
        type: 'breathing.start',
        label: '🫁 Respirar 4-4-4-4',
        params: {pattern: 'box', durationSec: 60},
      });
    }

    // 2. Journaling: para pensamientos, escribir, reflexionar, rumiar
    if (
      /escribir|pensamiento|reflexion|rumi|diario|analiz|organiz.*idea/.test(
        lower
      )
    ) {
      suggestions.push({
        type: 'journal.openTemplate',
        label: '📝 Plantilla ABC',
        params: {key: 'abc'},
      });
    }

    // 3. Ejercicios: para tensión, estrés físico, espalda, cuello
    if (/tens[oió]n|estr[eé]s|espalda|cuello|m[uú]sculos|cuerpo|dolor/.test(lower)) {
      suggestions.push({
        type: 'exercise.run',
        label: '💆 Escaneo corporal',
        params: {key: 'body-scan-5'},
      });
    }

    // 4. 3 Cosas Buenas: para gratitud, positivo, agradecer
    if (/gratitud|agrade|positiv|bueno|bien|mejor/.test(lower)) {
      suggestions.push({
        type: 'journal.openTemplate',
        label: '✨ 3 Cosas Buenas',
        params: {key: '3good'},
      });
    }

    // 5. Caminata: si menciona caminar, pasear, salir
    if (/camin|paseo|pasear|salir|aire.*libre/.test(lower)) {
      suggestions.push({
        type: 'exercise.run',
        label: '🚶 Caminata consciente',
        params: {key: 'walk-10'},
      });
    }

    // Limitar a máximo 2 sugerencias para no saturar
    return suggestions.slice(0, 2);
  }

  /**
   * Delay simulado (para streaming)
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
