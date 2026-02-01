/**
 * useMetaOAuth Hook
 * Hook for managing Meta (Facebook/Instagram/WhatsApp) OAuth connection
 */

import { useState, useEffect, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../contexts/core/AuthContext';
import {
    MetaConnection,
    MetaConnectedPageInfo,
    MetaWhatsAppAccountInfo,
    MetaInstagramAccountInfo,
    MetaConnectionStatus,
} from '../types/metaOAuth';

// =============================================================================
// TYPES
// =============================================================================

export interface MetaOAuthState {
    // Connection status
    status: MetaConnectionStatus;
    isLoading: boolean;
    error: string | null;
    
    // Connection details
    connection: Partial<MetaConnection> | null;
    
    // Available assets
    pages: MetaConnectedPageInfo[];
    whatsappAccounts: MetaWhatsAppAccountInfo[];
    instagramAccounts: MetaInstagramAccountInfo[];
    
    // Selected assets
    selectedPageId: string | null;
    selectedWhatsAppPhoneNumberId: string | null;
    selectedInstagramAccountId: string | null;
}

export interface UseMetaOAuthReturn extends MetaOAuthState {
    // Actions
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    refreshToken: () => Promise<void>;
    selectAssets: (selections: {
        pageId?: string;
        whatsappPhoneNumberId?: string;
        instagramAccountId?: string;
    }) => Promise<void>;
    refreshConnection: () => Promise<void>;
    
    // Helpers
    isConnected: boolean;
    hasPages: boolean;
    hasWhatsApp: boolean;
    hasInstagram: boolean;
}

// =============================================================================
// HOOK
// =============================================================================

export const useMetaOAuth = (projectId: string): UseMetaOAuthReturn => {
    const { user } = useAuth();
    const functions = getFunctions();

    const [state, setState] = useState<MetaOAuthState>({
        status: 'disconnected',
        isLoading: true,
        error: null,
        connection: null,
        pages: [],
        whatsappAccounts: [],
        instagramAccounts: [],
        selectedPageId: null,
        selectedWhatsAppPhoneNumberId: null,
        selectedInstagramAccountId: null,
    });

    // ==========================================================================
    // LOAD CONNECTION
    // ==========================================================================

    const loadConnection = useCallback(async () => {
        if (!projectId || !user) {
            setState(prev => ({ ...prev, isLoading: false, status: 'disconnected' }));
            return;
        }

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const getConnection = httpsCallable(functions, 'metaOAuth-getConnection');
            const result = await getConnection({ projectId });
            const data = result.data as any;

            if (data.connected) {
                setState(prev => ({
                    ...prev,
                    status: data.status || 'connected',
                    isLoading: false,
                    connection: data,
                    pages: data.pages || [],
                    whatsappAccounts: data.whatsappAccounts || [],
                    instagramAccounts: data.instagramAccounts || [],
                    selectedPageId: data.selectedPageId || null,
                    selectedWhatsAppPhoneNumberId: data.selectedWhatsAppPhoneNumberId || null,
                    selectedInstagramAccountId: data.selectedInstagramAccountId || null,
                }));
            } else {
                setState(prev => ({
                    ...prev,
                    status: 'disconnected',
                    isLoading: false,
                    connection: null,
                    pages: [],
                    whatsappAccounts: [],
                    instagramAccounts: [],
                }));
            }
        } catch (error: any) {
            console.error('Error loading Meta connection:', error);
            setState(prev => ({
                ...prev,
                status: 'error',
                isLoading: false,
                error: error.message || 'Failed to load connection',
            }));
        }
    }, [projectId, user, functions]);

    // Load on mount and when projectId changes
    useEffect(() => {
        loadConnection();
    }, [loadConnection]);

    // Check URL params for connection callback
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const metaConnected = params.get('meta_connected');
        
        if (metaConnected === 'true') {
            // Remove params from URL
            window.history.replaceState({}, '', window.location.pathname);
            // Reload connection
            loadConnection();
        }
    }, [loadConnection]);

    // ==========================================================================
    // CONNECT
    // ==========================================================================

    const connect = useCallback(async () => {
        if (!projectId || !user) {
            setState(prev => ({ ...prev, error: 'Not authenticated' }));
            return;
        }

        setState(prev => ({ ...prev, status: 'connecting', error: null }));

        try {
            const initOAuth = httpsCallable(functions, 'metaOAuth-init');
            const result = await initOAuth({
                projectId,
                returnUrl: window.location.pathname,
            });
            
            const data = result.data as { oauthUrl: string };

            // Redirect to Meta OAuth
            window.location.href = data.oauthUrl;
        } catch (error: any) {
            console.error('Error initiating Meta OAuth:', error);
            setState(prev => ({
                ...prev,
                status: 'error',
                error: error.message || 'Failed to connect',
            }));
        }
    }, [projectId, user, functions]);

    // ==========================================================================
    // DISCONNECT
    // ==========================================================================

    const disconnect = useCallback(async () => {
        if (!projectId || !user) return;

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const disconnectMeta = httpsCallable(functions, 'metaOAuth-disconnect');
            await disconnectMeta({ projectId });

            setState({
                status: 'disconnected',
                isLoading: false,
                error: null,
                connection: null,
                pages: [],
                whatsappAccounts: [],
                instagramAccounts: [],
                selectedPageId: null,
                selectedWhatsAppPhoneNumberId: null,
                selectedInstagramAccountId: null,
            });
        } catch (error: any) {
            console.error('Error disconnecting Meta:', error);
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error.message || 'Failed to disconnect',
            }));
        }
    }, [projectId, user, functions]);

    // ==========================================================================
    // REFRESH TOKEN
    // ==========================================================================

    const refreshToken = useCallback(async () => {
        if (!projectId || !user) return;

        setState(prev => ({ ...prev, status: 'refreshing', error: null }));

        try {
            const refresh = httpsCallable(functions, 'metaOAuth-refreshToken');
            await refresh({ projectId });

            setState(prev => ({ ...prev, status: 'connected' }));
            await loadConnection();
        } catch (error: any) {
            console.error('Error refreshing token:', error);
            setState(prev => ({
                ...prev,
                status: 'error',
                error: error.message || 'Failed to refresh token',
            }));
        }
    }, [projectId, user, functions, loadConnection]);

    // ==========================================================================
    // SELECT ASSETS
    // ==========================================================================

    const selectAssets = useCallback(async (selections: {
        pageId?: string;
        whatsappPhoneNumberId?: string;
        instagramAccountId?: string;
    }) => {
        if (!projectId || !user) return;

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const select = httpsCallable(functions, 'metaOAuth-selectAssets');
            await select({
                projectId,
                ...selections,
            });

            setState(prev => ({
                ...prev,
                isLoading: false,
                selectedPageId: selections.pageId || prev.selectedPageId,
                selectedWhatsAppPhoneNumberId: selections.whatsappPhoneNumberId || prev.selectedWhatsAppPhoneNumberId,
                selectedInstagramAccountId: selections.instagramAccountId || prev.selectedInstagramAccountId,
            }));
        } catch (error: any) {
            console.error('Error selecting assets:', error);
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error.message || 'Failed to select assets',
            }));
        }
    }, [projectId, user, functions]);

    // ==========================================================================
    // COMPUTED VALUES
    // ==========================================================================

    const isConnected = state.status === 'connected';
    const hasPages = state.pages.length > 0;
    const hasWhatsApp = state.whatsappAccounts.length > 0;
    const hasInstagram = state.instagramAccounts.length > 0;

    // ==========================================================================
    // RETURN
    // ==========================================================================

    return {
        ...state,
        connect,
        disconnect,
        refreshToken,
        selectAssets,
        refreshConnection: loadConnection,
        isConnected,
        hasPages,
        hasWhatsApp,
        hasInstagram,
    };
};

export default useMetaOAuth;








