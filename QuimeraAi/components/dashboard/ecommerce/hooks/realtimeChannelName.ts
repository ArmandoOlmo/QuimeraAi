const sanitizeChannelPart = (value: string): string =>
    value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'scope';

export const createRealtimeChannelName = (baseName: string, scope = 'global'): string => {
    const suffix = Math.random().toString(36).slice(2, 10);
    return `${baseName}:${sanitizeChannelPart(scope)}:${Date.now()}:${suffix}`;
};
