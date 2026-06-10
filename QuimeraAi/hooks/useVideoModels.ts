import { useCallback, useEffect, useState } from 'react';
import { fetchVideoModels } from '../utils/videoProxyClient';
import type { VideoModelCapabilities } from '../types/videoGeneration';

export function useVideoModels() {
    const [models, setModels] = useState<VideoModelCapabilities[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchVideoModels();
            setModels(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load video models');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const availableModels = models.filter(m => m.available && !m.comingSoon);

    return { models, availableModels, loading, error, refresh };
}

export function getModelCapabilities(
    models: VideoModelCapabilities[],
    modelId: string
): VideoModelCapabilities | undefined {
    return models.find(m => m.id === modelId);
}
