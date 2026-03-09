/**
 * useProjectTokenUsage Hook
 * Reads per-project token/credit usage from aiCreditsUsage/{tenantId}.usageByProject
 * Falls back to userId when no tenant context is available (matching backend behavior)
 * 
 * IMPORTANT: The backend (geminiProxy.ts getTenantIdForUser) may store usage under:
 *   - tenantMemberships lookup → tenantId
 *   - Fallback: userData.tenantId || userId (raw UID)
 * The frontend tenant context uses "tenant_{uid}" format for personal workspaces.
 * This mismatch means we need to check BOTH documents to find usage data.
 * 
 * Returns a map of projectId -> { tokensUsed, creditsUsed }
 */

import { useState, useEffect, useRef } from 'react';
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

/** Normalize usageByProject from a Firestore document */
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

/** Merge two usage maps, summing values for the same project */
function mergeUsageMaps(
    primary: Record<string, ProjectUsageData>,
    secondary: Record<string, ProjectUsageData>,
): Record<string, ProjectUsageData> {
    const merged = { ...primary };
    for (const [projectId, usage] of Object.entries(secondary)) {
        if (merged[projectId]) {
            // Both sources have data for this project — use the one with higher credits
            // (they should be the same doc in practice, but guard against partial writes)
            if (usage.creditsUsed > merged[projectId].creditsUsed) {
                merged[projectId] = usage;
            }
        } else {
            merged[projectId] = usage;
        }
    }
    return merged;
}

export function useProjectTokenUsage(): UseProjectTokenUsageReturn {
    const { user } = useAuth();
    const tenantContext = useSafeTenant();
    const [projectUsage, setProjectUsage] = useState<Record<string, ProjectUsageData>>({});
    const [isLoading, setIsLoading] = useState(true);

    const tenantId = tenantContext?.currentTenant?.id;
    const userId = user?.uid;

    // Detect personal tenant (format: tenant_{uid}) — needs dual-doc reading
    const isPersonalTenant = !!(tenantId && userId && tenantId === `tenant_${userId}`);

    // Primary ID: tenantId or userId
    const primaryId = tenantId || userId;
    // Secondary ID: raw userId (only when personal tenant creates a mismatch)
    const secondaryId = isPersonalTenant ? userId : null;

    // Refs to hold data from both listeners so we can merge them
    const primaryDataRef = useRef<Record<string, ProjectUsageData>>({});
    const secondaryDataRef = useRef<Record<string, ProjectUsageData>>({});

    useEffect(() => {
        if (!primaryId || !user) {
            setProjectUsage({});
            setIsLoading(false);
            return;
        }

        let loadCount = 0;
        const totalListeners = secondaryId ? 2 : 1;

        const updateMerged = () => {
            loadCount++;
            const merged = mergeUsageMaps(primaryDataRef.current, secondaryDataRef.current);
            setProjectUsage(merged);
            if (loadCount >= totalListeners) {
                setIsLoading(false);
            }
        };

        // Listener 1: primary document (tenantId or userId)
        const primaryRef = doc(db, 'aiCreditsUsage', primaryId);
        const unsubPrimary = onSnapshot(
            primaryRef,
            (snap) => {
                primaryDataRef.current = snap.exists()
                    ? normalizeUsageByProject(snap.data())
                    : {};
                updateMerged();
            },
            (error) => {
                if (error.code !== 'permission-denied') {
                    console.error('Error in project token usage listener (primary):', error);
                }
                updateMerged();
            },
        );

        // Listener 2: secondary document (raw userId) — only for personal tenants
        let unsubSecondary: (() => void) | null = null;
        if (secondaryId && secondaryId !== primaryId) {
            const secondaryRef = doc(db, 'aiCreditsUsage', secondaryId);
            unsubSecondary = onSnapshot(
                secondaryRef,
                (snap) => {
                    secondaryDataRef.current = snap.exists()
                        ? normalizeUsageByProject(snap.data())
                        : {};
                    updateMerged();
                },
                (error) => {
                    if (error.code !== 'permission-denied') {
                        console.error('Error in project token usage listener (secondary):', error);
                    }
                    updateMerged();
                },
            );
        }

        return () => {
            unsubPrimary();
            if (unsubSecondary) unsubSecondary();
            primaryDataRef.current = {};
            secondaryDataRef.current = {};
        };
    }, [primaryId, secondaryId, user]);

    return { projectUsage, isLoading };
}

export default useProjectTokenUsage;
