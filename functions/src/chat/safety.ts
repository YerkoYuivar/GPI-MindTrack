/**
 * Chat Safety & Moderation
 * 
 * Reglas de seguridad y respuestas para casos especiales:
 * - Crisis (derivación a ayuda profesional)
 * - Warn (contenido inapropiado)
 * - Blocked (solicitudes peligrosas)
 */

export type SafetyLabel = 'ok' | 'warn' | 'blocked';

export interface SafetyResult {
  label: SafetyLabel;
  crisis: boolean;
}

/**
 * Clasifica el contenido del mensaje según reglas de seguridad
 */
export function classifySafety(text: string): SafetyResult {
  const lower = text.toLowerCase();

  // Crisis keywords (señales de riesgo inmediato)
  const crisisPatterns = [
    'quiero morir',
    'quiero morirme',
    'suicid',
    'me hago daño',
    'hacerme daño',
    'matarme',
    'matar me',
    'sin ganas de vivir',
    'no quiero vivir',
    'terminar con todo',
    'acabar con mi vida',
    'no vale la pena vivir',
  ];

  const hasCrisis = crisisPatterns.some((pattern) => lower.includes(pattern));

  if (hasCrisis) {
    return {label: 'ok', crisis: true};
  }

  // Blocked patterns (solicitudes peligrosas)
  const blockedPatterns = [
    'cómo suicidarme',
    'como suicidarme',
    'métodos de suicidio',
    'metodos de suicidio',
    'cómo hacerme daño',
    'como hacerme daño',
    'formas de morir',
    'cómo matarme',
    'como matarme',
  ];

  const isBlocked = blockedPatterns.some((pattern) => lower.includes(pattern));

  if (isBlocked) {
    return {label: 'blocked', crisis: false};
  }

  // Warn patterns (contenido inapropiado pero no crítico)
  const warnPatterns = [
    'puto',
    'puta',
    'mierda',
    'cabrón',
    'cabron',
    'pendejo',
    'idiota',
    'estúpido',
    'estupido',
  ];

  const hasWarn = warnPatterns.some((pattern) => lower.includes(pattern));

  if (hasWarn) {
    return {label: 'warn', crisis: false};
  }

  // Todo OK
  return {label: 'ok', crisis: false};
}

/**
 * Genera respuesta segura según el tipo de clasificación
 */
export function safeResponseFor(
  type: 'crisis' | 'warn' | 'blocked'
): string {
  switch (type) {
    case 'crisis':
      return (
        'Por favor considera contactar con servicios de emergencia o una línea de ayuda:\n\n' +
        '• 📞 Línea de Prevención del Suicidio: 988 (USA) o tu línea local\n' +
        '• 🚨 Emergencias: 911 (USA) o tu número local\n' +
        '• 💬 Crisis Text Line: envía AYUDA al 741741\n\n' +
        'Tu vida tiene valor y hay personas dispuestas a ayudarte ahora mismo.'
      );

    case 'warn':
      return (
        'Entiendo que puedas estar frustrado/a. ' +
        'Estoy aquí para apoyarte de forma constructiva. ' +
        '¿Puedes contarme más sobre lo que está pasando sin usar lenguaje ofensivo?'
      );

    case 'blocked':
      return (
        'No puedo proporcionar información sobre métodos de autolesión. ' +
        'Sin embargo, sí puedo ayudarte a encontrar apoyo profesional:\n\n' +
        '• 📞 Línea de ayuda 24/7: 988\n' +
        '• 💬 Crisis Text Line: envía AYUDA al 741741\n\n' +
        '¿Te gustaría hablar sobre lo que estás sintiendo?'
      );
  }
}
