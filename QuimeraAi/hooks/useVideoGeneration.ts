import { useCallback, useRef, useState } from 'react';
import { pollVideoJobUntilComplete, submitVideoJob } from '../utils/videoProxyClient';
import type { VideoGenerationOptions, VideoJobPollResult } from '../types/videoGeneration';

export type VideoGenerationPhase = 'idle' | 'submitting' | 'polling' | 'completed' | 'error';

export function useVideoGeneration() {
    const [phase, setPhase] = useState<VideoGenerationPhase>('idle');
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<VideoJobPollResult | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const cancel = useCallback(() => {
        abortRef.current?.abort();
        abortRef.current = null;
        setPhase('idle');
        setProgress(0);
        setStatusMessage('');
    }, []);

    const generate = useCallback(async (
        userId: string,
        prompt: string,
        options: VideoGenerationOptions,
        projectId?: string
    ): Promise<{ videoUrl: string; job: VideoJobPollResult }> => {
        cancel();
        const controller = new AbortController();
        abortRef.current = controller;

        setPhase('submitting');
        setProgress(5);
        setError(null);
        setResult(null);
        setStatusMessage('Submitting video job...');

        try {
            const submit = await submitVideoJob(userId, prompt, options, projectId);
            setPhase('polling');
            setProgress(15);
            setStatusMessage('Generating video...');

            const job = await pollVideoJobUntilComplete(submit.pollingUrl, {
                intervalMs: 8000,
                maxAttempts: 180,
                signal: controller.signal,
                onProgress: (poll) => {
                    if (poll.status === 'processing' || poll.status === 'in_progress' || poll.status === 'pending') {
                        setProgress(prev => Math.min(prev + 3, 92));
                        setStatusMessage(`Status: ${poll.status}`);
                    }
                },
            });

            setProgress(100);
            setPhase('completed');
            setResult(job);
            setStatusMessage('Video ready');

            return {
                videoUrl: job.unsignedUrls![0],
                job,
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Video generation failed';
            setError(message);
            setPhase('error');
            throw err;
        } finally {
            abortRef.current = null;
        }
    }, [cancel]);

    const reset = useCallback(() => {
        cancel();
        setError(null);
        setResult(null);
    }, [cancel]);

    return {
        phase,
        progress,
        statusMessage,
        error,
        result,
        generate,
        cancel,
        reset,
        isGenerating: phase === 'submitting' || phase === 'polling',
    };
}
