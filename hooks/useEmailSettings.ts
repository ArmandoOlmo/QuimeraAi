/**
 * useEmailSettings Hook
 * Hook para gestionar la configuracion de email de una tienda
 */

import { useState, useEffect, useCallback } from 'react';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    onSnapshot,
    serverTimestamp,
    collection,
    query,
    orderBy,
    addDoc,
    deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
    EmailSettings,
    TransactionalEmailSettings,
    MarketingEmailSettings,
    EmailSocialLinks,
} from '../types/email';

// Default settings
const defaultTransactionalSettings: TransactionalEmailSettings = {
    orderConfirmation: true,
    orderShipped: true,
    orderDelivered: true,
    orderCancelled: true,
    orderRefunded: true,
    reviewRequest: true,
    reviewRequestDelayDays: 3,
    newOrderNotification: true,
    lowStockNotification: true,
};

const defaultMarketingSettings: MarketingEmailSettings = {
    enabled: false,
    welcomeEmail: true,
    abandonedCartEnabled: false,
    abandonedCartDelayHours: 1,
    winBackEnabled: false,
    winBackDelayDays: 30,
};

const defaultEmailSettings: Partial<EmailSettings> = {
    provider: 'resend',
    apiKeyConfigured: false,
    fromEmail: '',
    fromName: '',
    primaryColor: '#4f46e5',
    transactional: defaultTransactionalSettings,
    marketing: defaultMarketingSettings,
};

interface UseEmailSettingsOptions {
    realtime?: boolean;
}

export const useEmailSettings = (
    userId: string,
    projectId: string,
    options: UseEmailSettingsOptions = {}
) => {
    const [settings, setSettings] = useState<Partial<EmailSettings> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { realtime = true } = options;

    // Fetch or subscribe to settings
    useEffect(() => {
        // Only proceed if we have valid userId and projectId (not empty or 'default')
        if (!userId || !projectId || projectId === 'default') {
            console.log('⚠️ [useEmailSettings] Invalid userId/projectId, using defaults');
            setSettings(defaultEmailSettings);
            setIsLoading(false);
            return;
        }

        console.log(`🔄 [useEmailSettings] Init for Project: ${projectId}`);
        const settingsPath = `users/${userId}/projects/${projectId}/settings/email`;
        const settingsRef = doc(db, settingsPath);
        let unsubscribe: (() => void) | undefined;
        let isMounted = true;

        // Safety timeout to prevent infinite loading
        const safetyTimeout = setTimeout(() => {
            if (isMounted && isLoading) {
                console.warn('⚠️ [useEmailSettings] Safety timeout triggered - forcing loading to completion');
                setIsLoading(false);
                // We keep the current settings (or null/default) but stop the spinner
                if (!settings) setSettings(defaultEmailSettings);
            }
        }, 15000); // 15 seconds timeout

        if (realtime) {
            // Realtime subscription
            unsubscribe = onSnapshot(
                settingsRef,
                (snapshot) => {
                    if (!isMounted) return;
                    console.log(`✅ [useEmailSettings] Snapshot received via realtime`);
                    clearTimeout(safetyTimeout); // Clear timeout on success

                    if (snapshot.exists()) {
                        setSettings(snapshot.data() as EmailSettings);
                    } else {
                        console.log('ℹ️ [useEmailSettings] No settings found, using defaults');
                        setSettings(defaultEmailSettings);
                    }
                    setIsLoading(false);
                    setError(null);
                },
                (err) => {
                    if (!isMounted) return;
                    console.error('❌ [useEmailSettings] Error fetching settings:', err);
                    clearTimeout(safetyTimeout);
                    setError(err.message);
                    setSettings(defaultEmailSettings);
                    setIsLoading(false);
                }
            );
        } else {
            // One-time fetch
            getDoc(settingsRef)
                .then((snapshot) => {
                    if (!isMounted) return;
                    console.log(`✅ [useEmailSettings] Snapshot received via getDoc`);
                    clearTimeout(safetyTimeout);

                    if (snapshot.exists()) {
                        setSettings(snapshot.data() as EmailSettings);
                    } else {
                        setSettings(defaultEmailSettings);
                    }
                    setIsLoading(false);
                })
                .catch((err) => {
                    if (!isMounted) return;
                    console.error('❌ [useEmailSettings] Error fetching settings:', err);
                    clearTimeout(safetyTimeout);
                    setError(err.message);
                    setSettings(defaultEmailSettings);
                    setIsLoading(false);
                });
        }

        return () => {
            isMounted = false;
            clearTimeout(safetyTimeout);
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [userId, projectId, realtime]);

    // Update all settings
    const updateSettings = useCallback(
        async (updates: Partial<EmailSettings>) => {
            if (!userId || !projectId || projectId === 'default') return;

            setIsSaving(true);
            setError(null);

            try {
                const settingsPath = `users/${userId}/projects/${projectId}/settings/email`;
                const settingsRef = doc(db, settingsPath);
                const settingsDoc = await getDoc(settingsRef);

                if (settingsDoc.exists()) {
                    await updateDoc(settingsRef, {
                        ...updates,
                        updatedAt: serverTimestamp(),
                    });
                } else {
                    await setDoc(settingsRef, {
                        ...defaultEmailSettings,
                        ...updates,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    });
                }

                if (!realtime) {
                    setSettings((prev) => ({ ...prev, ...updates }));
                }
            } catch (err: any) {
                console.error('Error updating email settings:', err);
                setError(err.message);
                throw err;
            } finally {
                setIsSaving(false);
            }
        },
        [userId, projectId, realtime]
    );

    // Update sender info
    const updateSenderInfo = useCallback(
        async (senderInfo: { fromEmail: string; fromName: string; replyTo?: string }) => {
            return updateSettings(senderInfo);
        },
        [updateSettings]
    );

    // Update branding
    const updateBranding = useCallback(
        async (branding: {
            logoUrl?: string;
            primaryColor?: string;
            footerText?: string;
            socialLinks?: EmailSocialLinks;
        }) => {
            return updateSettings(branding);
        },
        [updateSettings]
    );

    // Update transactional email settings
    const updateTransactionalSettings = useCallback(
        async (transactionalSettings: Partial<TransactionalEmailSettings>) => {
            return updateSettings({
                transactional: {
                    ...defaultTransactionalSettings,
                    ...settings?.transactional,
                    ...transactionalSettings,
                },
            });
        },
        [updateSettings, settings?.transactional]
    );

    // Update marketing email settings
    const updateMarketingSettings = useCallback(
        async (marketingSettings: Partial<MarketingEmailSettings>) => {
            return updateSettings({
                marketing: {
                    ...defaultMarketingSettings,
                    ...settings?.marketing,
                    ...marketingSettings,
                },
            });
        },
        [updateSettings, settings?.marketing]
    );

    // Toggle individual transactional email
    const toggleTransactionalEmail = useCallback(
        async (emailType: keyof TransactionalEmailSettings, enabled: boolean) => {
            return updateTransactionalSettings({ [emailType]: enabled });
        },
        [updateTransactionalSettings]
    );

    // Toggle marketing enabled
    const toggleMarketing = useCallback(
        async (enabled: boolean) => {
            return updateMarketingSettings({ enabled });
        },
        [updateMarketingSettings]
    );

    // Check if API key is configured
    const checkApiKeyStatus = useCallback(async () => {
        // This would typically call a cloud function to verify the API key
        // For now, we just return the stored status
        return settings?.apiKeyConfigured || false;
    }, [settings?.apiKeyConfigured]);

    return {
        // State
        settings,
        isLoading,
        isSaving,
        error,

        // Actions
        updateSettings,
        updateSenderInfo,
        updateBranding,
        updateTransactionalSettings,
        updateMarketingSettings,
        toggleTransactionalEmail,
        toggleMarketing,
        checkApiKeyStatus,

        // Computed values
        isConfigured: settings?.apiKeyConfigured && settings?.fromEmail,
        transactionalEnabled: settings?.transactional || defaultTransactionalSettings,
        marketingEnabled: settings?.marketing?.enabled || false,
    };
};

// Hook for email campaigns
export const useEmailCampaigns = (userId: string, projectId: string) => {
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch campaigns
    useEffect(() => {
        // Only proceed if we have valid userId and projectId (not empty or 'default')
        if (!userId || !projectId || projectId === 'default') {
            setCampaigns([]);
            setIsLoading(false);
            return;
        }

        let unsubscribe: (() => void) | undefined;
        let isMounted = true;

        const setupListener = async () => {
            try {
                const campaignsPath = `users/${userId}/projects/${projectId}/emailCampaigns`;
                const campaignsRef = collection(db, campaignsPath);
                const q = query(campaignsRef, orderBy('createdAt', 'desc'));

                unsubscribe = onSnapshot(
                    q,
                    (snapshot) => {
                        if (!isMounted) return;
                        const campaignsData = snapshot.docs.map((doc) => ({
                            id: doc.id,
                            ...doc.data(),
                        }));
                        setCampaigns(campaignsData);
                        setIsLoading(false);
                    },
                    (err) => {
                        if (!isMounted) return;
                        console.error('Error fetching campaigns:', err);
                        setCampaigns([]);
                        setIsLoading(false);
                    }
                );
            } catch (err) {
                if (!isMounted) return;
                console.error('Error setting up campaigns listener:', err);
                setCampaigns([]);
                setIsLoading(false);
            }
        };

        setupListener();

        return () => {
            isMounted = false;
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [userId, projectId]);

    // Create campaign
    const createCampaign = async (campaignData: {
        name: string;
        subject: string;
        type: string;
        content?: string;
        audienceType?: string;
        previewText?: string;
        htmlContent?: string;
        emailDocument?: any;
        audienceSegmentId?: string;
    }) => {
        if (!userId || !projectId || projectId === 'default') return null;

        setIsSaving(true);
        try {
            const campaignsPath = `users/${userId}/projects/${projectId}/emailCampaigns`;
            const campaignsRef = collection(db, campaignsPath);
            // Sanitize to remove undefined values which Firestore rejects
            const sanitizedData: any = {};
            Object.keys(campaignData).forEach(key => {
                const val = (campaignData as any)[key];
                if (val !== undefined) {
                    sanitizedData[key] = val;
                }
            });

            const finalCampaign = {
                ...sanitizedData,
                status: 'draft',
                stats: {
                    totalRecipients: 0,
                    sent: 0,
                    delivered: 0,
                    opened: 0,
                    uniqueOpens: 0,
                    clicked: 0,
                    uniqueClicks: 0,
                    bounced: 0,
                    complained: 0,
                    unsubscribed: 0,
                },
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            const docRef = await addDoc(campaignsRef, finalCampaign);
            return { id: docRef.id, ...finalCampaign };
        } catch (err) {
            console.error('Error creating campaign:', err);
            throw err;
        } finally {
            setIsSaving(false);
        }
    };

    // Update campaign
    const updateCampaign = async (campaignId: string, updates: any) => {
        if (!userId || !projectId || projectId === 'default') return;

        setIsSaving(true);
        try {
            const campaignsPath = `users/${userId}/projects/${projectId}/emailCampaigns`;
            const campaignRef = doc(db, campaignsPath, campaignId);

            // Sanitize updates to remove undefined values
            const sanitizedUpdates: any = {};
            Object.keys(updates).forEach(key => {
                if (updates[key] !== undefined) {
                    sanitizedUpdates[key] = updates[key];
                }
            });

            await updateDoc(campaignRef, {
                ...sanitizedUpdates,
                updatedAt: serverTimestamp(),
            });
        } catch (err) {
            console.error('Error updating campaign:', err);
            throw err;
        } finally {
            setIsSaving(false);
        }
    };

    // Delete campaign
    const deleteCampaign = async (campaignId: string) => {
        if (!userId || !projectId || projectId === 'default') return;

        try {
            const campaignsPath = `users/${userId}/projects/${projectId}/emailCampaigns`;
            const campaignRef = doc(db, campaignsPath, campaignId);
            await deleteDoc(campaignRef);
        } catch (err) {
            console.error('Error deleting campaign:', err);
            throw err;
        }
    };

    return {
        campaigns,
        isLoading,
        isSaving,
        createCampaign,
        updateCampaign,
        deleteCampaign,
    };
};

// Hook for email logs
export const useEmailLogs = (userId: string, projectId: string, options?: { limit?: number }) => {
    const [logs, setLogs] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalSent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
    });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Only proceed if we have valid userId and projectId (not empty or 'default')
        if (!userId || !projectId || projectId === 'default') {
            setLogs([]);
            setStats({ totalSent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 });
            setIsLoading(false);
            return;
        }

        console.log(`🔄 [useEmailLogs] Init for Project: ${projectId}`);
        let unsubscribe: (() => void) | undefined;
        let isMounted = true;

        // Safety timeout
        const safetyTimeout = setTimeout(() => {
            if (isMounted) { // Note: useEmailLogs doesn't have local isLoading state check here because we set it inside
                console.warn('⚠️ [useEmailLogs] Safety timeout triggered - forcing loading to completion');
                setLogs([]); // Return empty logs on timeout
                setIsLoading(false);
            }
        }, 15000);

        const setupListener = async () => {
            setIsLoading(true);
            try {
                const logsPath = `users/${userId}/projects/${projectId}/emailLogs`;
                const logsRef = collection(db, logsPath);
                const q = query(logsRef, orderBy('sentAt', 'desc'));

                unsubscribe = onSnapshot(
                    q,
                    (snapshot) => {
                        if (!isMounted) return;
                        console.log(`✅ [useEmailLogs] Snapshot received, docs: ${snapshot.docs.length}`);
                        clearTimeout(safetyTimeout);

                        const logsData = snapshot.docs.map((doc) => ({
                            id: doc.id,
                            ...doc.data(),
                        })) as Array<{ id: string; status?: string; opened?: boolean; clicked?: boolean;[key: string]: any }>;
                        setLogs(logsData);

                        // Calculate stats from logs
                        const calculatedStats = logsData.reduce(
                            (acc, log) => ({
                                totalSent: acc.totalSent + 1,
                                delivered: acc.delivered + (log.status === 'delivered' ? 1 : 0),
                                opened: acc.opened + (log.opened ? 1 : 0),
                                clicked: acc.clicked + (log.clicked ? 1 : 0),
                                bounced: acc.bounced + (log.status === 'bounced' ? 1 : 0),
                            }),
                            { totalSent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 }
                        );
                        setStats(calculatedStats);
                        setIsLoading(false);
                    },
                    (err) => {
                        if (!isMounted) return;
                        console.error('❌ [useEmailLogs] Error fetching email logs:', err);
                        clearTimeout(safetyTimeout);
                        setLogs([]);
                        setStats({ totalSent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 });
                        setIsLoading(false);
                    }
                );
            } catch (err) {
                if (!isMounted) return;
                console.error('❌ [useEmailLogs] Error setting up logs listener:', err);
                clearTimeout(safetyTimeout);
                setLogs([]);
                setStats({ totalSent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 });
                setIsLoading(false);
            }
        };

        setupListener();

        return () => {
            isMounted = false;
            clearTimeout(safetyTimeout);
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [userId, projectId, options?.limit]);

    return {
        logs,
        isLoading,
        stats,
    };
};

// Hook for email audiences/segments
export const useEmailAudiences = (userId: string, projectId: string) => {
    const [audiences, setAudiences] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch audiences with realtime updates
    useEffect(() => {
        // Only proceed if we have valid userId and projectId (not empty or 'default')
        if (!userId || !projectId || projectId === 'default') {
            setAudiences([]);
            setIsLoading(false);
            return;
        }

        console.log(`🔄 [useEmailAudiences] Init for Project: ${projectId}`);
        let unsubscribe: (() => void) | undefined;
        let isMounted = true;

        // Safety timeout
        const safetyTimeout = setTimeout(() => {
            if (isMounted) {
                console.warn('⚠️ [useEmailAudiences] Safety timeout triggered');
                setAudiences([]);
                setIsLoading(false);
            }
        }, 15000);

        const setupListener = async () => {
            try {
                const audiencesPath = `users/${userId}/projects/${projectId}/emailAudiences`;
                const audiencesRef = collection(db, audiencesPath);
                const q = query(audiencesRef, orderBy('createdAt', 'desc'));

                unsubscribe = onSnapshot(
                    q,
                    (snapshot) => {
                        if (!isMounted) return;
                        console.log(`✅ [useEmailAudiences] Snapshot received, docs: ${snapshot.docs.length}`);
                        clearTimeout(safetyTimeout);

                        const audiencesData = snapshot.docs.map((doc) => ({
                            id: doc.id,
                            ...doc.data(),
                        }));
                        setAudiences(audiencesData);
                        setIsLoading(false);
                        setError(null);
                    },
                    (err) => {
                        if (!isMounted) return;
                        console.error('❌ [useEmailAudiences] Error fetching audiences:', err);
                        clearTimeout(safetyTimeout);
                        setAudiences([]);
                        setError(err.message);
                        setIsLoading(false);
                    }
                );
            } catch (err: any) {
                if (!isMounted) return;
                console.error('❌ [useEmailAudiences] Error setting up listener:', err);
                clearTimeout(safetyTimeout);
                setAudiences([]);
                setError(err.message);
                setIsLoading(false);
            }
        };

        setupListener();

        return () => {
            isMounted = false;
            clearTimeout(safetyTimeout);
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [userId, projectId]);

    // Create audience
    const createAudience = useCallback(async (audienceData: {
        name: string;
        description?: string;
        acceptsMarketing?: boolean;
        hasOrdered?: boolean;
        minOrders?: number;
        maxOrders?: number;
        minTotalSpent?: number;
        maxTotalSpent?: number;
        tags?: string[];
        excludeTags?: string[];
        lastOrderDaysAgo?: number;
        source?: string[];
        filters?: any[];
    }) => {
        if (!userId || !projectId || projectId === 'default') return null;

        setIsSaving(true);
        setError(null);

        try {
            const audiencesPath = `users/${userId}/projects/${projectId}/emailAudiences`;
            const audiencesRef = collection(db, audiencesPath);

            const newAudience = {
                ...audienceData,
                estimatedCount: 0,
                isDefault: false,
                createdBy: userId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            const docRef = await addDoc(audiencesRef, newAudience);
            console.log(`✅ [useEmailAudiences] Created audience: ${docRef.id}`);
            return { id: docRef.id, ...newAudience };
        } catch (err: any) {
            console.error('❌ [useEmailAudiences] Error creating audience:', err);
            setError(err.message);
            throw err;
        } finally {
            setIsSaving(false);
        }
    }, [userId, projectId]);

    // Update audience
    const updateAudience = useCallback(async (audienceId: string, updates: Partial<{
        name: string;
        description?: string;
        acceptsMarketing?: boolean;
        hasOrdered?: boolean;
        minOrders?: number;
        maxOrders?: number;
        minTotalSpent?: number;
        maxTotalSpent?: number;
        tags?: string[];
        excludeTags?: string[];
        lastOrderDaysAgo?: number;
        source?: string[];
        filters?: any[];
        estimatedCount?: number;
        staticMembers?: {
            leadIds?: string[];
            customerIds?: string[];
            emails?: string[];
        };
        staticMemberCount?: number;
    }>) => {
        if (!userId || !projectId || projectId === 'default') return;

        setIsSaving(true);
        setError(null);

        try {
            const audiencePath = `users/${userId}/projects/${projectId}/emailAudiences`;
            const audienceRef = doc(db, audiencePath, audienceId);

            await updateDoc(audienceRef, {
                ...updates,
                updatedAt: serverTimestamp(),
            });
            console.log(`✅ [useEmailAudiences] Updated audience: ${audienceId}`);
        } catch (err: any) {
            console.error('❌ [useEmailAudiences] Error updating audience:', err);
            setError(err.message);
            throw err;
        } finally {
            setIsSaving(false);
        }
    }, [userId, projectId]);

    // Delete audience
    const deleteAudience = useCallback(async (audienceId: string) => {
        if (!userId || !projectId || projectId === 'default') return;

        try {
            const audiencePath = `users/${userId}/projects/${projectId}/emailAudiences`;
            const audienceRef = doc(db, audiencePath, audienceId);
            await deleteDoc(audienceRef);
            console.log(`✅ [useEmailAudiences] Deleted audience: ${audienceId}`);
        } catch (err: any) {
            console.error('❌ [useEmailAudiences] Error deleting audience:', err);
            setError(err.message);
            throw err;
        }
    }, [userId, projectId]);

    // Duplicate audience
    const duplicateAudience = useCallback(async (audienceId: string) => {
        const original = audiences.find(a => a.id === audienceId);
        if (!original) return null;

        const { id, createdAt, updatedAt, ...audienceData } = original;
        return createAudience({
            ...audienceData,
            name: `${audienceData.name} (copia)`,
        });
    }, [audiences, createAudience]);

    return {
        audiences,
        isLoading,
        isSaving,
        error,
        createAudience,
        updateAudience,
        deleteAudience,
        duplicateAudience,
    };
};

export default useEmailSettings;
