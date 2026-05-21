/**
 * Generador de grafo del lado del cliente
 * Analiza las entradas del usuario y crea el grafo directamente
 */

import { collection, getDocs, query, where, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@lib/firebase';
import type { Pattern, GraphEdge } from '../types/graph';

// =====================================
// DETECCIÓN DE PATRONES
// =====================================

/**
 * Detecta emociones en el texto
 */
function detectEmotions(text: string): Pattern[] {
    const emotionPatterns: Record<string, string[]> = {
        felicidad: ['feliz', 'alegre', 'contento', 'alegría', 'felicidad', 'emocionado', 'optimist', 'bien', 'genial', 'fantástico', 'maravilloso', 'dichoso', 'radiante'],
        tristeza: ['triste', 'tristeza', 'deprimido', 'melancólico', 'decaído', 'lágrimas', 'llor', 'apesadumbrado', 'afligido', 'desanimado', 'desolado'],
        ansiedad: ['ansioso', 'ansiedad', 'nervioso', 'preocupado', 'estresado', 'angustia', 'estrés', 'inquiet', 'intranquil', 'tens', 'agobiad', 'abrumad'],
        enojo: ['enojado', 'molesto', 'irritado', 'frustrado', 'rabia', 'ira', 'furioso', 'enfadado', 'indignado', 'colérico', 'resentido'],
        miedo: ['miedo', 'temor', 'asustado', 'pánico', 'terror', 'espanto', 'pavor', 'fobia', 'temeros'],
        amor: ['amor', 'cariño', 'quiero', 'amo', 'adoro', 'cariñoso', 'afecto', 'ternura', 'apego', 'devoción'],
        gratitud: ['agradecido', 'gracias', 'gratitud', 'aprecio', 'reconocimiento', 'valorar'],
        paz: ['paz', 'calma', 'tranquil', 'sereno', 'sosiego', 'placidez', 'equilibrio', 'armonía'],
        culpa: ['culpa', 'culpable', 'remordimiento', 'arrepentimiento', 'responsable'],
        vergüenza: ['vergüenza', 'avergonzado', 'pena', 'bochorno', 'humillación'],
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
 * Detecta actividades en el texto
 */
function extractActivities(text: string): Pattern[] {
    const activityPatterns: Record<string, string[]> = {
        trabajo: ['trabajo', 'oficina', 'reunión', 'tarea', 'proyecto', 'laboral', 'jefe', 'compañero', 'deadline', 'presentación'],
        ejercicio: ['correr', 'gym', 'ejercicio', 'deporte', 'caminar', 'entrenar', 'gimnasio', 'atletismo', 'físico', 'actividad física'],
        estudio: ['estudio', 'clase', 'examen', 'aprender', 'libro', 'universidad', 'escuela', 'tarea', 'lectura', 'investigar'],
        socializar: ['amigos', 'salir', 'fiesta', 'reunión', 'charla', 'gente', 'conversar', 'reunirse', 'visita', 'café'],
        descanso: ['dormir', 'descansar', 'siesta', 'relajar', 'sueño', 'cama', 'reposo', 'pausa'],
        familia: ['familia', 'padres', 'hermanos', 'hijos', 'esposo', 'esposa', 'mamá', 'papá', 'hogar', 'casa'],
        hobbies: ['leer', 'pintar', 'música', 'escribir', 'cocinar', 'jugar', 'videojuegos', 'película', 'serie'],
        terapia: ['terapia', 'psicólogo', 'terapeuta', 'sesión', 'consulta', 'tratamiento'],
        meditacion: ['meditar', 'meditación', 'mindfulness', 'respirar', 'yoga', 'zen', 'consciencia plena'],
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

// =====================================
// GENERACIÓN DEL GRAFO
// =====================================

/**
 * Genera patrones desde las entradas del usuario
 */
async function generatePatterns(userId: string): Promise<Pattern[]> {
    console.log(`📊 Generando patrones para usuario: ${userId}`);

    // Obtener todas las entradas activas del usuario
    const entriesQuery = query(
        collection(db, 'entries'),
        where('userId', '==', userId),
        where('state', '==', 'active')
    );

    const entriesSnapshot = await getDocs(entriesQuery);
    console.log(`📊 Encontradas ${entriesSnapshot.size} entradas`);

    const patternMap = new Map<string, Pattern>();

    // Procesar cada entrada
    entriesSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const content = data.content || '';

        // Detectar emociones
        const emotions = detectEmotions(content);
        emotions.forEach(emotion => {
            const existing = patternMap.get(emotion.id);
            if (existing) {
                existing.frequency += emotion.frequency;
                existing.importance = Math.max(existing.importance, emotion.importance);
                existing.lastSeen = new Date();
            } else {
                patternMap.set(emotion.id, emotion);
            }
        });

        // Detectar actividades
        const activities = extractActivities(content);
        activities.forEach(activity => {
            const existing = patternMap.get(activity.id);
            if (existing) {
                existing.frequency += activity.frequency;
                existing.importance = Math.max(existing.importance, activity.importance);
                existing.lastSeen = new Date();
            } else {
                patternMap.set(activity.id, activity);
            }
        });

        // Detectar personas
        const people = extractPeople(content);
        people.forEach(person => {
            const existing = patternMap.get(person.id);
            if (existing) {
                existing.frequency += person.frequency;
                existing.importance = Math.max(existing.importance, person.importance);
                existing.lastSeen = new Date();
            } else {
                patternMap.set(person.id, person);
            }
        });
    });

    const patterns = Array.from(patternMap.values());
    console.log(`📊 Generados ${patterns.length} patrones`);

    return patterns;
}

/**
 * Genera conexiones entre patrones
 */
function generateEdges(patterns: Pattern[]): GraphEdge[] {
    const edges: GraphEdge[] = [];

    for (let i = 0; i < patterns.length; i++) {
        for (let j = i + 1; j < patterns.length; j++) {
            const pattern1 = patterns[i];
            const pattern2 = patterns[j];

            // Conectar emociones con actividades
            if (
                (pattern1.type === 'emotion' && pattern2.type === 'activity') ||
                (pattern1.type === 'activity' && pattern2.type === 'emotion')
            ) {
                edges.push({
                    source: pattern1.id,
                    target: pattern2.id,
                    weight: Math.min((pattern1.frequency + pattern2.frequency) / 10, 1),
                });
            }
            // Conectar emociones entre sí
            else if (pattern1.type === 'emotion' && pattern2.type === 'emotion') {
                edges.push({
                    source: pattern1.id,
                    target: pattern2.id,
                    weight: Math.min((pattern1.frequency + pattern2.frequency) / 15, 1),
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
            version: '1.0',
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
            message: 'Grafo generado exitosamente',
        };
    } catch (error: any) {
        console.error('❌ Error generando grafo:', error);
        throw new Error(`Error al generar el grafo: ${error.message}`);
    }
}
