#!/usr/bin/env node

/**
 * Script para generar el grafo inicial con las entradas existentes
 * Uso: node scripts/generateInitialGraph.js <userId>
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json'); // Necesitarás descargar esto de Firebase Console

// Inicializar Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://emotional-journal-1879a.firebaseio.com'
});

const db = admin.firestore();

// =====================================
// FUNCIONES DE ANÁLISIS
// =====================================

function extractKeywords(text) {
    const stopwords = new Set([
        'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no', 'haber',
        'por', 'con', 'su', 'para', 'como', 'estar', 'tener', 'le', 'lo', 'todo',
        'pero', 'más', 'hacer', 'o', 'poder', 'decir', 'este', 'ir', 'otro', 'ese',
        'mi', 'tu', 'me', 'te', 'si', 'yo', 'muy', 'bien', 'es', 'fue', 'al', 'del'
    ]);

    const words = text
        .toLowerCase()
        .replace(/[^\wáéíóúñü\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3 && !stopwords.has(w));

    return words;
}

function detectEmotions(text) {
    const emotionPatterns = {
        felicidad: ['feliz', 'alegre', 'contento', 'alegría', 'felicidad', 'emocionado', 'optimista'],
        tristeza: ['triste', 'tristeza', 'deprimido', 'melancólico', 'decaído', 'lágrimas'],
        ansiedad: ['ansioso', 'ansiedad', 'nervioso', 'preocupado', 'estresado', 'angustia'],
        enojo: ['enojado', 'molesto', 'irritado', 'frustrado', 'rabia', 'ira'],
        miedo: ['miedo', 'temor', 'asustado', 'pánico', 'terror'],
        amor: ['amor', 'cariño', 'quiero', 'amo', 'adoro', 'cariñoso'],
        gratitud: ['agradecido', 'gracias', 'gratitud', 'aprecio'],
    };

    const lowerText = text.toLowerCase();
    const emotions = [];

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

function extractActivities(text) {
    const activityPatterns = {
        trabajo: ['trabajo', 'oficina', 'reunión', 'tarea', 'proyecto'],
        ejercicio: ['correr', 'gym', 'ejercicio', 'deporte', 'caminar'],
        estudio: ['estudio', 'clase', 'examen', 'aprender', 'libro'],
        socializar: ['amigos', 'salir', 'fiesta', 'reunión', 'charla'],
        descanso: ['dormir', 'descansar', 'siesta', 'relajar'],
    };

    const lowerText = text.toLowerCase();
    const activities = [];

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

async function generatePatterns(userId) {
    console.log(`📊 Generando patrones para usuario: ${userId}`);

    const entriesSnapshot = await db
        .collection('entries')
        .where('userId', '==', userId)
        .where('state', '==', 'active')
        .get();

    console.log(`📊 Encontradas ${entriesSnapshot.size} entradas`);

    const patternMap = new Map();

    for (const doc of entriesSnapshot.docs) {
        const data = doc.data();
        const content = data.content || '';

        console.log(`  📝 Procesando entrada: ${doc.id.substring(0, 8)}...`);

        const emotions = detectEmotions(content);
        emotions.forEach(emotion => {
            const existing = patternMap.get(emotion.id);
            if (existing) {
                existing.frequency += emotion.frequency;
                existing.importance = Math.max(existing.importance, emotion.importance);
                existing.lastSeen = emotion.lastSeen;
            } else {
                patternMap.set(emotion.id, emotion);
            }
        });

        const activities = extractActivities(content);
        activities.forEach(activity => {
            const existing = patternMap.get(activity.id);
            if (existing) {
                existing.frequency += activity.frequency;
                existing.importance = Math.max(existing.importance, activity.importance);
                existing.lastSeen = activity.lastSeen;
            } else {
                patternMap.set(activity.id, activity);
            }
        });
    }

    const patterns = Array.from(patternMap.values());
    console.log(`📊 Generados ${patterns.length} patrones:`, patterns.map(p => p.label).join(', '));

    return patterns;
}

function generateEdges(patterns) {
    const edges = [];

    for (let i = 0; i < patterns.length; i++) {
        for (let j = i + 1; j < patterns.length; j++) {
            const pattern1 = patterns[i];
            const pattern2 = patterns[j];

            if (
                (pattern1.type === 'emotion' && pattern2.type === 'activity') ||
                (pattern1.type === 'activity' && pattern2.type === 'emotion')
            ) {
                edges.push({
                    source: pattern1.id,
                    target: pattern2.id,
                    weight: Math.min((pattern1.frequency + pattern2.frequency) / 10, 1),
                });
            } else if (pattern1.type === 'emotion' && pattern2.type === 'emotion') {
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

// =====================================
// SCRIPT PRINCIPAL
// =====================================

async function main() {
    const userId = process.argv[2];

    if (!userId) {
        console.error('❌ Error: Debes proporcionar un userId');
        console.log('Uso: node scripts/generateInitialGraph.js <userId>');
        process.exit(1);
    }

    console.log(`\n🚀 Generando grafo para userId: ${userId}\n`);

    try {
        // Generar patrones
        const patterns = await generatePatterns(userId);

        if (patterns.length === 0) {
            console.error('❌ No hay suficientes entradas para generar el grafo');
            process.exit(1);
        }

        // Generar conexiones
        const edges = generateEdges(patterns);

        // Guardar en Firestore
        await db.collection('graphs').doc(userId).set({
            patterns,
            edges,
            generatedAt: admin.firestore.FieldValue.serverTimestamp(),
            entryCount: patterns.length,
            version: '1.0',
            dateRange: {
                start: patterns.reduce((min, p) => p.firstSeen < min ? p.firstSeen : min, patterns[0].firstSeen),
                end: patterns.reduce((max, p) => p.lastSeen > max ? p.lastSeen : max, patterns[0].lastSeen),
            },
        });

        console.log(`\n✅ Grafo generado y guardado exitosamente!`);
        console.log(`   - Patrones: ${patterns.length}`);
        console.log(`   - Conexiones: ${edges.length}`);
        console.log(`   - Documento: graphs/${userId}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error generando grafo:', error);
        process.exit(1);
    }
}

main();
