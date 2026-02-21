/**
 * useProjectTokenUsage Hook
 * Reads per-project token/credit usage from aiCreditsUsage/{tenantId}.usageByProject
 * Returns a map of projectId -> { tokensUsed, creditsUsed }
 */

import { useState, useEffect } from 'react';
import { useSafeTenant } from '../contexts/tenant';
import { useAuth } from '../contexts/core/AuthContext';
import { db, doc, onSnapshot } from '../firebase';

export interface ProjectUsageData {
    tokensUsed: number;
    creditsUsed: number;
    lastUsed?: any;
}

interface UseProjectTokenUsageReturn {
    projectUsage: Record<string, ProjectUsageData>;
    isLoading: boolean;
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

        const usageRef = doc(db, 'aiCreditsUsage', tenantId);
        const unsubscribe = onSnapshot(
            usageRef,
            (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const data = docSnapshot.data();
                    const byProject = data.usageByProject || {};
                    // Normalize the data
                    const normalized: Record<string, ProjectUsageData> = {};
                    for (const [projectId, usage] of Object.entries(byProject)) {
                        const u = usage as any;
                        normalized[projectId] = {
                            tokensUsed: u.tokensUsed || 0,
                            creditsUsed: u.creditsUsed || 0,
                            lastUsed: u.lastUsed,
                        };
                    }
                    setProjectUsage(normalized);
                } else {
                    setProjectUsage({});
                }
                setIsLoading(false);
            },
            (error) => {
                if (error.code !== 'permission-denied') {
                    console.error('Error in project token usage listener:', error);
                }
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [tenantId, user]);

    return { projectUsage, isLoading };
}

export default useProjectTokenUsage;
