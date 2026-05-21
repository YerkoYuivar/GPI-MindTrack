/**
 * Hook para generar el grafo manualmente
 */

import { useState } from 'react';
import { generateUserGraph } from '@features/discover/clientGraphGenerator.improved';
import { useAuth } from '@contexts/AuthContext';

interface UseGraphGeneratorReturn {
    generating: boolean;
    error: string | null;
    result: {
        success: boolean;
        patternCount: number;
        edgeCount: number;
        message: string;
    } | null;
    generateGraph: () => Promise<void>;
}

export function useGraphGenerator(): UseGraphGeneratorReturn {
    const { user } = useAuth();
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<UseGraphGeneratorReturn['result']>(null);

    const generateGraph = async () => {
        if (!user) {
            setError('Usuario no autenticado');
            return;
        }

        setGenerating(true);
        setError(null);
        setResult(null);

        try {
            console.log('🎯 Iniciando generación de grafo...');
            const res = await generateUserGraph(user.uid);
            setResult(res);
            console.log('✅ Grafo generado:', res);
        } catch (err: any) {
            console.error('❌ Error:', err);
            setError(err.message || 'Error desconocido');
        } finally {
            setGenerating(false);
        }
    };

    return {
        generating,
        error,
        result,
        generateGraph,
    };
}
