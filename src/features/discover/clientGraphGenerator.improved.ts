/**
 * Generador de grafo del lado del cliente - MEJORADO
 * Analiza las entradas del usuario y crea el grafo directamente
 * Incluye: emociones, actividades, personas, y conexiones mejoradas
 */

import { collection, getDocs, query, where, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@lib/firebase';
import type { Pattern, GraphEdge } from '../../types/graph';

// =====================================
// DETECCIÓN DE PATRONES
// =====================================

/**
 * Detecta emociones en el texto con diccionario expandido
 */
function detectEmotions(text: string): Pattern[] {
    const emotionPatterns: Record<string, string[]> = {
        felicidad: ['feliz', 'alegre', 'contento', 'alegría', 'felicidad', 'emocionado', 'optimist', 'bien', 'genial', 'fantástico', 'maravilloso', 'dichoso', 'radiante', 'entusiasmado'],
        tristeza: ['triste', 'tristeza', 'deprimido', 'melancólico', 'decaído', 'lágrimas', 'llor', 'apesadumbrado', 'afligido', 'desanimado', 'desolado', 'abatido'],
        ansiedad: ['ansioso', 'ansiedad', 'nervioso', 'preocupado', 'estresado', 'angustia', 'estrés', 'inquiet', 'intranquil', 'tens', 'agobiad', 'abrumad', 'pánico'],
        enojo: ['enojado', 'molesto', 'irritado', 'frustrado', 'rabia', 'ira', 'furioso', 'enfadado', 'indignado', 'colérico', 'resentido', 'exasperado'],
        miedo: ['miedo', 'temor', 'asustado', 'pánico', 'terror', 'espanto', 'pavor', 'fobia', 'temeros', 'aprensivo'],
        amor: ['amor', 'cariño', 'quiero', 'amo', 'adoro', 'cariñoso', 'afecto', 'ternura', 'apego', 'devoción'],
        gratitud: ['agradecido', 'gracias', 'gratitud', 'aprecio', 'reconocimiento', 'valorar', 'bendecido'],
        paz: ['paz', 'calma', 'tranquil', 'sereno', 'sosiego', 'placidez', 'equilibrio', 'armonía', 'relajado'],
        culpa: ['culpa', 'culpable', 'remordimiento', 'arrepentimiento', 'responsable por'],
        vergüenza: ['vergüenza', 'avergonzado', 'pena', 'bochorno', 'humillación', 'mortificado'],
    };

    const lowerText = text.toLowerCase();
    const emotions: Pattern[] = [];

    for (const [emotion, keywords] of Object.entries(emotionPatterns)) {
        const count = keywords.filter(kw => lowerText.includes(kw)).length;
        if (count > 0) {
            emotions.push({
                id: `emotion_${emotion}`,
                label: emotion.charAt(0).toUpperCase() + emotion.slice(1),
                type: 'emotion',
                frequency: count,
                importance: Math.min(count / 3, 1),
                firstSeen: new Date(),
                lastSeen: new Date(),
            });
        }
    }

    return emotions;
}

/**
 * Detecta actividades en el texto con diccionario expandido
 */
function extractActivities(text: string): Pattern[] {
    const activityPatterns: Record<string, string[]> = {
        trabajo: ['trabajo', 'oficina', 'reunión', 'tarea', 'proyecto', 'laboral', 'jefe', 'compañero', 'deadline', 'presentación', 'cliente', 'reunión'],
        ejercicio: ['correr', 'gym', 'ejercicio', 'deporte', 'caminar', 'entrenar', 'gimnasio', 'atletismo', 'físico', 'actividad física', 'cardio', 'pesas'],
        estudio: ['estudio', 'clase', 'examen', 'aprender', 'libro', 'universidad', 'escuela', 'tarea', 'lectura', 'investigar', 'curso', 'aprendizaje'],
        socializar: ['amigos', 'salir', 'fiesta', 'reunión', 'charla', 'gente', 'conversar', 'reunirse', 'visita', 'café', 'conversación', 'encuentro'],
        descanso: ['dormir', 'descansar', 'siesta', 'relajar', 'sueño', 'cama', 'reposo', 'pausa', 'acostarse'],
        familia: ['familia', 'padres', 'hermanos', 'hijos', 'esposo', 'esposa', 'mamá', 'papá', 'hogar', 'casa', 'familiar'],
        hobbies: ['leer', 'pintar', 'música', 'escribir', 'cocinar', 'jugar', 'videojuegos', 'película', 'serie', 'hobby', 'pasatiempo'],
        terapia: ['terapia', 'psicólogo', 'terapeuta', 'sesión', 'consulta', 'tratamiento', 'psiquiatra', 'consejería'],
        meditacion: ['meditar', 'meditación', 'mindfulness', 'respirar', 'yoga', 'zen', 'consciencia plena', 'atención plena'],
    };

    const lowerText = text.toLowerCase();
    const activities: Pattern[] = [];

    for (const [activity, keywords] of Object.entries(activityPatterns)) {
        const count = keywords.filter(kw => lowerText.includes(kw)).length;
        if (count > 0) {
            activities.push({
                id: `activity_${activity}`,
                label: activity.charAt(0).toUpperCase() + activity.slice(1),
                type: 'activity',
                frequency: count,
                importance: Math.min(count / 2, 1),
                firstSeen: new Date(),
                lastSeen: new Date(),
            });
        }
    }

    return activities;
}

/**
 * Detecta personas mencionadas (búsqueda simple de nombres propios)
 */
function extractPeople(text: string): Pattern[] {
    // Palabras comunes que NO son nombres
    const commonWords = new Set([
        'El', 'La', 'Los', 'Las', 'Un', 'Una', 'Unos', 'Unas',
        'Mi', 'Tu', 'Su', 'Nuestro', 'Vuestro', 'Mis', 'Tus', 'Sus',
        'Este', 'Esta', 'Estos', 'Estas',
        'Ese', 'Esa', 'Esos', 'Esas',
        'Aquel', 'Aquella', 'Aquellos', 'Aquellas',
        'Yo', 'Tú', 'Él', 'Ella', 'Nosotros', 'Vosotros', 'Ellos', 'Ellas',
        'Pero', 'Aunque', 'Porque', 'Cuando', 'Si', 'Como', 'Mientras',
        'Hoy', 'Ayer', 'Mañana', 'Ahora', 'Siempre', 'Nunca',
        'Muy', 'Más', 'Menos', 'Tan', 'También', 'Tampoco',
    ]);

    const words = text.split(/\s+/);
    const personMap = new Map<string, number>();

    for (let i = 0; i < words.length; i++) {
        const word = words[i].replace(/[.,;:!?¿¡()\[\]{}\"']/g, '');
        
        // Debe empezar con mayúscula, tener al menos 2 letras, y no ser palabra común
        if (word.length >= 2 && /^[A-ZÁÉÍÓÚÑ]/.test(word) && !commonWords.has(word)) {
            // No contar si es la primera palabra de frase (podría ser inicio de oración)
            if (i === 0) continue;
            
            // También omitir si la palabra anterior termina con punto (inicio de frase)
            if (i > 0 && words[i - 1].includes('.')) continue;
            
            // Contar frecuencia
            personMap.set(word, (personMap.get(word) || 0) + 1);
        }
    }

    const people: Pattern[] = [];
    for (const [name, count] of personMap.entries()) {
        // Solo incluir si aparece al menos 2 veces o tiene al menos 3 caracteres
        if (count >= 1 && name.length >= 3) {
            people.push({
                id: `person_${name.toLowerCase()}`,
                label: name,
                type: 'person',
                frequency: count,
                importance: Math.min(count / 3, 1),
                firstSeen: new Date(),
                lastSeen: new Date(),
            });
        }
    }

    return people;
}

/**
 * Detecta triggers (disparadores emocionales)
 */
function extractTriggers(text: string): Pattern[] {
    const triggerPatterns: Record<string, string[]> = {
        deadline: ['plazo', 'deadline', 'fecha límite', 'entregar', 'vence'],
        conflicto: ['conflicto', 'discusión', 'pelea', 'problema', 'disputa', 'desacuerdo'],
        cambio: ['cambio', 'cambiar', 'mudanza', 'nuevo trabajo', 'nueva situación'],
        rechazo: ['rechazo', 'rechazado', 'ignorado', 'excluido', 'no aceptado'],
        crítica: ['crítica', 'criticaron', 'juzgaron', 'comentario negativo'],
        éxito: ['éxito', 'logro', 'logré', 'conseguí', 'alcancé'],
    };

    const lowerText = text.toLowerCase();
    const triggers: Pattern[] = [];

    for (const [trigger, keywords] of Object.entries(triggerPatterns)) {
        const count = keywords.filter(kw => lowerText.includes(kw)).length;
        if (count > 0) {
            triggers.push({
                id: `trigger_${trigger}`,
                label: trigger.charAt(0).toUpperCase() + trigger.slice(1),
                type: 'trigger',
                frequency: count,
                importance: Math.min(count / 2, 1),
                firstSeen: new Date(),
                lastSeen: new Date(),
            });
        }
    }

    return triggers;
}

// =====================================
// GENERACIÓN DEL GRAFO
// =====================================

/**
 * Genera patrones desde las entradas del usuario
 */
async function generatePatterns(userId: string): Promise<Pattern[]> {
    console.log(`📊 Generando patrones para usuario: ${userId}`);

    // Obtener todas las entradas activas del usuario
    // Primero intentar con state: 'active' (nuevo formato)
    let entriesQuery = query(
        collection(db, 'entries'),
        where('userId', '==', userId),
        where('state', '==', 'active')
    );

    let entriesSnapshot = await getDocs(entriesQuery);
    console.log(`📊 Encontradas ${entriesSnapshot.size} entradas con state='active'`);

    // Si no hay resultados, intentar con deleted: false (formato antiguo)
    if (entriesSnapshot.empty) {
        console.log(`📊 Intentando con deleted=false...`);
        entriesQuery = query(
            collection(db, 'entries'),
            where('userId', '==', userId),
            where('deleted', '==', false)
        );
        entriesSnapshot = await getDocs(entriesQuery);
        console.log(`📊 Encontradas ${entriesSnapshot.size} entradas con deleted=false`);
    }

    // Si aún está vacío, intentar solo con userId
    if (entriesSnapshot.empty) {
        console.log(`📊 Intentando solo con userId...`);
        entriesQuery = query(
            collection(db, 'entries'),
            where('userId', '==', userId)
        );
        entriesSnapshot = await getDocs(entriesQuery);
        console.log(`📊 Encontradas ${entriesSnapshot.size} entradas totales para userId`);
    }

    if (entriesSnapshot.empty) {
        console.log(`⚠️ No se encontraron entradas para el usuario ${userId}`);
        return [];
    }

    const patternMap = new Map<string, Pattern>();

    // Procesar cada entrada
    entriesSnapshot.forEach((docSnap, index) => {
        const data = docSnap.data();
        const content = data.content || '';
        const createdAt = data.createdAt?.toDate() || new Date();

        console.log(`   Procesando entrada ${index + 1}/${entriesSnapshot.size}: "${content.substring(0, 40)}..."`);

        // Detectar todos los tipos de patrones
        const allPatterns = [
            ...detectEmotions(content),
            ...extractActivities(content),
            ...extractPeople(content),
            ...extractTriggers(content),
        ];

        console.log(`      → Detectados: ${allPatterns.length} patrones`);

        allPatterns.forEach(pattern => {
            const existing = patternMap.get(pattern.id);
            if (existing) {
                existing.frequency += pattern.frequency;
                existing.importance = Math.max(existing.importance, pattern.importance);
                existing.lastSeen = createdAt;
                existing.firstSeen = existing.firstSeen < createdAt ? existing.firstSeen : createdAt;
            } else {
                pattern.firstSeen = createdAt;
                pattern.lastSeen = createdAt;
                patternMap.set(pattern.id, pattern);
            }
        });
    });

    const patterns = Array.from(patternMap.values());
    console.log(`✅ Generados ${patterns.length} patrones únicos:`);
    console.log(`   - Emociones: ${patterns.filter(p => p.type === 'emotion').length}`);
    console.log(`   - Actividades: ${patterns.filter(p => p.type === 'activity').length}`);
    console.log(`   - Personas: ${patterns.filter(p => p.type === 'person').length}`);
    console.log(`   - Triggers: ${patterns.filter(p => p.type === 'trigger').length}`);

    return patterns;
}

/**
 * Genera conexiones entre patrones con lógica mejorada
 */
function generateEdges(patterns: Pattern[]): GraphEdge[] {
    const edges: GraphEdge[] = [];
    let edgeId = 0;

    for (let i = 0; i < patterns.length; i++) {
        for (let j = i + 1; j < patterns.length; j++) {
            const pattern1 = patterns[i];
            const pattern2 = patterns[j];

            let shouldConnect = false;
            let weight = 0;

            // Conectar emociones con actividades (conexión fuerte)
            if (
                (pattern1.type === 'emotion' && pattern2.type === 'activity') ||
                (pattern1.type === 'activity' && pattern2.type === 'emotion')
            ) {
                shouldConnect = true;
                weight = Math.min((pattern1.frequency + pattern2.frequency) / 10, 1);
            }
            // Conectar emociones con triggers (conexión causal)
            else if (
                (pattern1.type === 'emotion' && pattern2.type === 'trigger') ||
                (pattern1.type === 'trigger' && pattern2.type === 'emotion')
            ) {
                shouldConnect = true;
                weight = Math.min((pattern1.frequency + pattern2.frequency) / 8, 1);
            }
            // Conectar personas con emociones
            else if (
                (pattern1.type === 'person' && pattern2.type === 'emotion') ||
                (pattern1.type === 'emotion' && pattern2.type === 'person')
            ) {
                shouldConnect = true;
                weight = Math.min((pattern1.frequency + pattern2.frequency) / 12, 1);
            }
            // Conectar personas con actividades
            else if (
                (pattern1.type === 'person' && pattern2.type === 'activity') ||
                (pattern1.type === 'activity' && pattern2.type === 'person')
            ) {
                shouldConnect = true;
                weight = Math.min((pattern1.frequency + pattern2.frequency) / 12, 1);
            }
            // Conectar emociones entre sí (conexión débil)
            else if (pattern1.type === 'emotion' && pattern2.type === 'emotion') {
                shouldConnect = true;
                weight = Math.min((pattern1.frequency + pattern2.frequency) / 20, 1);
            }

            if (shouldConnect && weight > 0.1) {
                edges.push({
                    id: `edge_${edgeId++}`,
                    source: pattern1.id,
                    target: pattern2.id,
                    weight,
                    coOccurrences: Math.min(pattern1.frequency, pattern2.frequency),
                });
            }
        }
    }

    console.log(`📊 Generadas ${edges.length} conexiones`);

    return edges;
}

/**
 * Genera y guarda el grafo completo
 */
export async function generateUserGraph(userId: string): Promise<{
    success: boolean;
    patternCount: number;
    edgeCount: number;
    message: string;
}> {
    try {
        console.log(`🚀 Generando grafo para usuario: ${userId}`);

        // Generar patrones
        const patterns = await generatePatterns(userId);

        if (patterns.length === 0) {
            return {
                success: false,
                patternCount: 0,
                edgeCount: 0,
                message: 'No hay suficientes entradas para generar el grafo. Escribe al menos 3 entradas.',
            };
        }

        // Generar conexiones
        const edges = generateEdges(patterns);

        // Guardar en Firestore
        const graphDoc = doc(db, 'graphs', userId);
        await setDoc(graphDoc, {
            patterns,
            edges,
            generatedAt: serverTimestamp(),
            entryCount: patterns.length,
            version: '2.0',
            dateRange: {
                start: patterns.reduce((min, p) => (p.firstSeen < min ? p.firstSeen : min), patterns[0].firstSeen),
                end: patterns.reduce((max, p) => (p.lastSeen > max ? p.lastSeen : max), patterns[0].lastSeen),
            },
        });

        console.log(`✅ Grafo generado exitosamente!`);
        console.log(`   - Patrones: ${patterns.length}`);
        console.log(`   - Conexiones: ${edges.length}`);

        return {
            success: true,
            patternCount: patterns.length,
            edgeCount: edges.length,
            message: `Grafo generado con ${patterns.length} patrones y ${edges.length} conexiones.`,
        };
    } catch (error: any) {
        console.error('❌ Error generando grafo:', error);
        throw new Error(`Error al generar el grafo: ${error.message}`);
    }
}
