/**
 * useProjectTokenUsage Hook
 * Reads per-project token/credit usage from the subscriptions table in Supabase
 * 
 * Returns a map of projectId -> { tokensUsed, creditsUsed }
 */

import { useState, useEffect, useRef } from 'react';
import { useSafeTenant } from '../contexts/tenant';
import { useAuth } from '../contexts/core/AuthContext';
import { supabase } from '../supabase';

export interface ProjectUsageData {
    tokensUsed: number;
    creditsUsed: number;
    lastUsed?: any;
}

interface UseProjectTokenUsageReturn {
    projectUsage: Record<string, ProjectUsageData>;
    isLoading: boolean;
}

/** Normalize usageByProject from a Supabase JSONB document */
function normalizeUsageByProject(data: any): Record<string, ProjectUsageData> {
    const byProject = data?.usageByProject || {};
    const normalized: Record<string, ProjectUsageData> = {};
    for (const [projectId, usage] of Object.entries(byProject)) {
        const u = usage as any;
        normalized[projectId] = {
            tokensUsed: u.tokensUsed || 0,
            creditsUsed: u.creditsUsed || 0,
            lastUsed: u.lastUsed,
        };
    }
    return normalized;
}

export function useProjectTokenUsage(): UseProjectTokenUsageReturn {
    const { user } = useAuth();
    const tenantContext = useSafeTenant();
    const [projectUsage, setProjectUsage] = useState<Record<string, ProjectUsageData>>({});
    const [isLoading, setIsLoading] = useState(true);

    const tenantId = tenantContext?.currentTenant?.id;

    useEffect(() => {
        if (!tenantId || !user) {
            setProjectUsage({});
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        const fetchUsage = async () => {
            try {
                const { data, error } = await supabase
                    .from('subscriptions')
                    .select('ai_credits_usage')
                    .eq('tenant_id', tenantId)
                    .maybeSingle();

                if (error) {
                    if (error.code !== 'PGRST116') { // not found
                        console.error('Error fetching project token usage:', error);
                    }
                    setProjectUsage({});
                } else if (data && data.ai_credits_usage) {
                    setProjectUsage(normalizeUsageByProject(data.ai_credits_usage));
                } else {
                    setProjectUsage({});
                }
            } catch (error) {
                console.error('Unexpected error fetching token usage:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsage();

        // Subscribe to changes
        const channel = supabase.channel(`public:subscriptions:tenant_id=eq.${tenantId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'subscriptions',
                    filter: `tenant_id=eq.${tenantId}`,
                },
                (payload) => {
                    if (payload.new && (payload.new as any).ai_credits_usage) {
                        setProjectUsage(normalizeUsageByProject((payload.new as any).ai_credits_usage));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tenantId, user]);

    return { projectUsage, isLoading };
}

export default useProjectTokenUsage;
