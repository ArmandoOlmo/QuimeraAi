export const MEDIA_GENERATOR_LAUNCH_EVENT = 'quimera:media-generator-launch';
export const MEDIA_GENERATOR_LAUNCH_STORAGE_KEY = 'quimera_media_generator_launch_request';

export type MediaGeneratorLaunchMode = 'image' | 'video';

export interface MediaGeneratorLaunchOptions {
    aspectRatio?: string;
    resolution?: string;
    style?: string;
}

export interface MediaGeneratorLaunchRequest {
    mode: MediaGeneratorLaunchMode;
    prompt: string;
    autoStart: boolean;
    projectId?: string | null;
    source?: string;
    options?: MediaGeneratorLaunchOptions;
    createdAt: string;
}

const isBrowser = () => typeof window !== 'undefined';

const isLaunchRequest = (value: unknown): value is MediaGeneratorLaunchRequest => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const record = value as Record<string, unknown>;
    return (record.mode === 'image' || record.mode === 'video')
        && typeof record.prompt === 'string'
        && record.prompt.trim().length > 0;
};

export const storeMediaGeneratorLaunchRequest = (request: Omit<MediaGeneratorLaunchRequest, 'createdAt'>): MediaGeneratorLaunchRequest | null => {
    if (!isBrowser()) return null;
    const normalized: MediaGeneratorLaunchRequest = {
        ...request,
        autoStart: request.source === 'global_assistant' ? false : request.autoStart,
        prompt: request.prompt.trim(),
        createdAt: new Date().toISOString(),
    };
    if (!normalized.prompt) return null;
    window.sessionStorage.setItem(MEDIA_GENERATOR_LAUNCH_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
};

export const dispatchMediaGeneratorLaunchRequest = (request: MediaGeneratorLaunchRequest): void => {
    if (!isBrowser()) return;
    window.dispatchEvent(new CustomEvent(MEDIA_GENERATOR_LAUNCH_EVENT, { detail: request }));
};

export const consumeMediaGeneratorLaunchRequest = (
    mode: MediaGeneratorLaunchMode,
    projectId?: string | null,
): MediaGeneratorLaunchRequest | null => {
    if (!isBrowser()) return null;
    const raw = window.sessionStorage.getItem(MEDIA_GENERATOR_LAUNCH_STORAGE_KEY);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw);
        if (!isLaunchRequest(parsed) || parsed.mode !== mode) return null;
        if (parsed.projectId && (!projectId || parsed.projectId !== projectId)) return null;
        window.sessionStorage.removeItem(MEDIA_GENERATOR_LAUNCH_STORAGE_KEY);
        return parsed;
    } catch {
        window.sessionStorage.removeItem(MEDIA_GENERATOR_LAUNCH_STORAGE_KEY);
        return null;
    }
};

export const peekMediaGeneratorLaunchRequest = (
    projectId?: string | null,
): MediaGeneratorLaunchRequest | null => {
    if (!isBrowser()) return null;
    const raw = window.sessionStorage.getItem(MEDIA_GENERATOR_LAUNCH_STORAGE_KEY);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw);
        if (!isLaunchRequest(parsed)) return null;
        if (parsed.projectId && (!projectId || parsed.projectId !== projectId)) return null;
        return parsed;
    } catch {
        window.sessionStorage.removeItem(MEDIA_GENERATOR_LAUNCH_STORAGE_KEY);
        return null;
    }
};

export const readMediaGeneratorLaunchEvent = (event: Event): MediaGeneratorLaunchRequest | null => {
    const detail = (event as CustomEvent<unknown>).detail;
    return isLaunchRequest(detail) ? detail : null;
};
