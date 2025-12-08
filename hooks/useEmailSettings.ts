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
    // Use project-based path for email settings
    const settingsPath = `users/${userId}/projects/${projectId}/settings/email`;

    // Fetch or subscribe to settings
    useEffect(() => {
        if (!userId || !projectId) {
            setSettings(defaultEmailSettings);
            setIsLoading(false);
            return;
        }

        const settingsRef = doc(db, settingsPath);

        if (realtime) {
            // Realtime subscription
            const unsubscribe = onSnapshot(
                settingsRef,
                (snapshot) => {
                    if (snapshot.exists()) {
                        setSettings(snapshot.data() as EmailSettings);
                    } else {
                        setSettings(defaultEmailSettings);
                    }
                    setIsLoading(false);
                    setError(null);
                },
                (err) => {
                    console.error('Error fetching email settings:', err);
                    setError(err.message);
                    setIsLoading(false);
                }
            );

            return () => unsubscribe();
        } else {
            // One-time fetch
            getDoc(settingsRef)
                .then((snapshot) => {
                    if (snapshot.exists()) {
                        setSettings(snapshot.data() as EmailSettings);
                    } else {
                        setSettings(defaultEmailSettings);
                    }
                    setIsLoading(false);
                })
                .catch((err) => {
                    console.error('Error fetching email settings:', err);
                    setError(err.message);
                    setIsLoading(false);
                });
        }
    }, [userId, projectId, settingsPath, realtime]);

    // Update all settings
    const updateSettings = useCallback(
        async (updates: Partial<EmailSettings>) => {
            if (!userId || !projectId) return;

            setIsSaving(true);
            setError(null);

            try {
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
        [userId, projectId, settingsPath, realtime]
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

    const campaignsPath = `users/${userId}/projects/${projectId}/emailCampaigns`;

    // Fetch campaigns
    useEffect(() => {
        if (!userId || !projectId) {
            setCampaigns([]);
            setIsLoading(false);
            return;
        }

        const campaignsRef = collection(db, campaignsPath);
        const q = query(campaignsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const campaignsData = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setCampaigns(campaignsData);
                setIsLoading(false);
            },
            (err) => {
                console.error('Error fetching campaigns:', err);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userId, projectId, campaignsPath]);

    // Create campaign
    const createCampaign = async (campaignData: {
        name: string;
        subject: string;
        type: string;
        content?: string;
        audienceType?: string;
    }) => {
        if (!userId || !projectId) return null;

        setIsSaving(true);
        try {
            const campaignsRef = collection(db, campaignsPath);
            const newCampaign = {
                ...campaignData,
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

            const docRef = await addDoc(campaignsRef, newCampaign);
            return { id: docRef.id, ...newCampaign };
        } catch (err) {
            console.error('Error creating campaign:', err);
            throw err;
        } finally {
            setIsSaving(false);
        }
    };

    // Update campaign
    const updateCampaign = async (campaignId: string, updates: any) => {
        if (!userId || !projectId) return;

        setIsSaving(true);
        try {
            const campaignRef = doc(db, campaignsPath, campaignId);
            await updateDoc(campaignRef, {
                ...updates,
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
        if (!userId || !projectId) return;

        try {
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

    const logsPath = `users/${userId}/projects/${projectId}/emailLogs`;

    useEffect(() => {
        if (!userId || !projectId) {
            setLogs([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const logsRef = collection(db, logsPath);
        const q = query(logsRef, orderBy('sentAt', 'desc'));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const logsData = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
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
                console.error('Error fetching email logs:', err);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userId, projectId, logsPath, options?.limit]);

    return {
        logs,
        isLoading,
        stats,
    };
};

export default useEmailSettings;
