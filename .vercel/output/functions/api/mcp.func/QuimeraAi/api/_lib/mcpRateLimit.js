const LIMITS = {
    read: 120,
    write: 60,
    ai: 20,
    batch: 3,
};
function bucketForTool(toolName) {
    if (toolName === 'ai_generate_full_project' || toolName === 'ai_generate_project_assets')
        return 'batch';
    if (toolName.startsWith('ai_'))
        return 'ai';
    if (toolName.startsWith('list_') ||
        toolName.startsWith('get_') ||
        toolName.startsWith('validate_')) {
        return 'read';
    }
    return 'write';
}
function currentMinuteWindow() {
    const date = new Date();
    date.setUTCSeconds(0, 0);
    return date.toISOString();
}
export async function enforceMcpRateLimit(supabase, auth, toolName) {
    const bucket = bucketForTool(toolName);
    const limit = LIMITS[bucket];
    const windowStart = currentMinuteWindow();
    const { data, error } = await supabase
        .from('mcp_rate_limits')
        .select('request_count')
        .eq('api_key_id', auth.apiKeyId)
        .eq('bucket', bucket)
        .eq('window_start', windowStart)
        .maybeSingle();
    if (error)
        throw error;
    const currentCount = Number(data?.request_count || 0);
    if (currentCount >= limit) {
        throw Object.assign(new Error(`Rate limit exceeded for ${bucket} tools.`), {
            status: 429,
            code: 'RATE_LIMIT_EXCEEDED',
            details: { bucket, limit, windowStart },
        });
    }
    const nextCount = currentCount + 1;
    const { error: upsertError } = await supabase
        .from('mcp_rate_limits')
        .upsert({
        api_key_id: auth.apiKeyId,
        tenant_id: auth.tenantId,
        bucket,
        window_start: windowStart,
        request_count: nextCount,
        last_request_at: new Date().toISOString(),
    }, { onConflict: 'api_key_id,bucket,window_start' });
    if (upsertError)
        throw upsertError;
    return { bucket, limit, remaining: Math.max(0, limit - nextCount) };
}
//# sourceMappingURL=mcpRateLimit.js.map