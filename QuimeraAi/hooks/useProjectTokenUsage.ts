/**
 * useProjectTokenUsage Hook
 * Reads per-project token/credit usage from aiCreditsUsage/{tenantId}.usageByProject
 * Falls back to userId when no tenant context is available (matching backend behavior)
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

    // Use tenantId if available, otherwise fallback to userId (matches backend getTenantIdForUser)
    const tenantId = tenantContext?.currentTenant?.id;
    const effectiveId = tenantId || user?.uid;

    useEffect(() => {
        if (!effectiveId || !user) {
            setProjectUsage({});
            setIsLoading(false);
            return;
        }

        const usageRef = doc(db, 'aiCreditsUsage', effectiveId);
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
    }, [effectiveId, user]);

    return { projectUsage, isLoading };
}

export default useProjectTokenUsage;

