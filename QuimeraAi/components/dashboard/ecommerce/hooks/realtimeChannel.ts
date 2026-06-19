export const createRealtimeChannelName = (baseName: string, scopeId?: string) => {
    const scope = scopeId ? `:${scopeId}` : '';
    const nonce = `${Date.now()}:${Math.random().toString(36).slice(2)}`;

    return `${baseName}${scope}:${nonce}`;
};
