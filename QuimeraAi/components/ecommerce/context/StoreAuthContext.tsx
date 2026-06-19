/**
 * StoreAuthContext
 * Context para manejar la autenticación de usuarios de tienda (clientes)
 * Multi-tenant: cada tienda tiene sus propios usuarios
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User as StoreAuthUser,
} from '@/utils/compatData';
import { auth } from '@/utils/compatData';
import { supabase } from '../../../supabase';
import { StoreUser, StoreAuthContextType, StoreAuthState } from '../../../types/storeUsers';

interface StoreAuthProviderProps {
    storeId: string;
    children: React.ReactNode;
}

const StoreAuthContext = createContext<StoreAuthContextType | null>(null);

const isStorefrontEditorPreview = (): boolean => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('preview') === 'storefront-editor';
};

const isExpectedStoreUserLookupError = (error: unknown): boolean => {
    const maybeError = error as {
        status?: number;
        context?: { status?: number };
        message?: string;
    };
    const status = maybeError.context?.status ?? maybeError.status;

    return [400, 401, 403, 404].includes(Number(status));
};

const getSignedOutState = (): StoreAuthState => ({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    error: null,
});

export const StoreAuthProvider: React.FC<StoreAuthProviderProps> = ({
    storeId,
    children,
}) => {
    const [state, setState] = useState<StoreAuthState>({
        user: null,
        isLoading: true,
        isAuthenticated: false,
        error: null,
    });

    const fetchCurrentStoreUser = useCallback(async (
        options: { suppressExpectedErrors?: boolean } = {},
    ): Promise<StoreUser | null> => {
        if (!storeId || isStorefrontEditorPreview()) return null;

        try {
            const result = await supabase.functions.invoke('stripe-api', {
                body: { action: 'storeUsers-getCurrent', storeId },
            });
            if (result.error) throw result.error;
            const payload = result.data?.data || result.data;
            return payload?.user || null;
        } catch (error) {
            if (!options.suppressExpectedErrors || !isExpectedStoreUserLookupError(error)) {
                console.error('Error fetching store user:', error);
            }
            return null;
        }
    }, [storeId]);

    // Listen to storefront auth state changes.
    useEffect(() => {
        if (isStorefrontEditorPreview()) {
            setState(getSignedOutState());
            return undefined;
        }

        const unsubscribe = onAuthStateChanged(auth, async (authUser: StoreAuthUser | null) => {
            if (authUser && authUser.email) {
                const storeUser = await fetchCurrentStoreUser({ suppressExpectedErrors: true });

                if (storeUser) {
                    // Check if user is banned
                    if (storeUser.status === 'banned') {
                        setState({
                            user: null,
                            isLoading: false,
                            isAuthenticated: false,
                            error: 'Tu cuenta ha sido suspendida. Contacta al soporte.',
                        });
                        await signOut(auth);
                        return;
                    }

                    // Check if user is inactive
                    if (storeUser.status === 'inactive') {
                        setState({
                            user: null,
                            isLoading: false,
                            isAuthenticated: false,
                            error: 'Tu cuenta está inactiva. Contacta al soporte.',
                        });
                        await signOut(auth);
                        return;
                    }

                    setState({
                        user: storeUser,
                        isLoading: false,
                        isAuthenticated: true,
                        error: null,
                    });
                } else {
                    // User exists in auth but not in this store.
                    setState(getSignedOutState());
                }
            } else {
                // User is signed out
                setState(getSignedOutState());
            }
        });

        return () => unsubscribe();
    }, [fetchCurrentStoreUser]);

    // Login
    const login = useCallback(async (email: string, password: string): Promise<void> => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            await signInWithEmailAndPassword(auth, email, password);
            const storeUser = await fetchCurrentStoreUser();

            if (!storeUser) {
                await signOut(auth);
                throw new Error('No existe una cuenta con este email en esta tienda');
            }

            if (storeUser.status === 'banned') {
                await signOut(auth);
                throw new Error('Tu cuenta ha sido suspendida. Contacta al soporte.');
            }

            if (storeUser.status === 'inactive') {
                await signOut(auth);
                throw new Error('Tu cuenta está inactiva. Contacta al soporte.');
            }

            // Record login (async, don't wait)
            supabase.functions.invoke('stripe-api', {
                body: { action: 'storeUsers-recordLogin', storeId, email }
            }).catch(console.error);

        } catch (error: any) {
            let errorMessage = 'Error al iniciar sesión';

            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorMessage = 'Email o contraseña incorrectos';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Demasiados intentos. Intenta más tarde.';
            } else if (error.code === 'auth/invalid-credential') {
                errorMessage = 'Email o contraseña incorrectos';
            } else if (error.message) {
                errorMessage = error.message;
            }

            setState(prev => ({
                ...prev,
                isLoading: false,
                error: errorMessage,
            }));

            throw new Error(errorMessage);
        }
    }, [storeId, fetchCurrentStoreUser]);

    // Register
    const register = useCallback(async (
        email: string,
        password: string,
        displayName: string
    ): Promise<void> => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            // Use Cloud Function to create store user
            const result = await supabase.functions.invoke('stripe-api', {
                body: {
                    action: 'storeUsers-create',
                    storeId,
                    email,
                    password,
                    displayName,
                    source: 'self_register',
                }
            });
            if (result.error) throw result.error;

            const data = (result.data?.data || result.data) as { success: boolean; message?: string };

            if (!data.success) {
                throw new Error(data.message || 'Error al crear la cuenta');
            }

            await signInWithEmailAndPassword(auth, email, password);
            const storeUser = await fetchCurrentStoreUser();
            setState({
                user: storeUser,
                isLoading: false,
                isAuthenticated: Boolean(storeUser),
                error: null,
            });

        } catch (error: any) {
            let errorMessage = 'Error al crear la cuenta';

            if (error.code === 'functions/already-exists') {
                errorMessage = 'Ya existe una cuenta con este email';
            } else if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'Ya existe una cuenta con este email';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'La contraseña debe tener al menos 6 caracteres';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'El email no es válido';
            } else if (error.message) {
                errorMessage = error.message;
            }

            setState(prev => ({
                ...prev,
                isLoading: false,
                error: errorMessage,
            }));

            throw new Error(errorMessage);
        }
    }, [storeId, fetchCurrentStoreUser]);

    // Logout
    const logout = useCallback(async (): Promise<void> => {
        try {
            await signOut(auth);
            setState({
                user: null,
                isLoading: false,
                isAuthenticated: false,
                error: null,
            });
        } catch (error: any) {
            console.error('Error signing out:', error);
            throw error;
        }
    }, []);

    // Reset Password
    const resetPassword = useCallback(async (email: string): Promise<void> => {
        try {
            const result = await supabase.functions.invoke('stripe-api', {
                body: { action: 'storeUsers-resetPassword', storeId, email },
            });
            if (result.error) throw result.error;
        } catch (error: any) {
            let errorMessage = 'Error al enviar el email de recuperación';

            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No existe una cuenta con este email';
            } else if (error.message) {
                errorMessage = error.message;
            }

            throw new Error(errorMessage);
        }
    }, [storeId]);

    // Update Profile
    const updateProfile = useCallback(async (updates: Partial<StoreUser>): Promise<void> => {
        if (!state.user) {
            throw new Error('No hay sesión activa');
        }

        const result = await supabase.functions.invoke('stripe-api', {
            body: {
                action: 'storeUsers-updateProfile',
                storeId,
                profile: updates,
                addresses: updates.addresses,
                defaultShippingAddress: updates.defaultShippingAddress,
                defaultBillingAddress: updates.defaultBillingAddress,
            },
        });
        if (result.error) throw result.error;
        const payload = result.data?.data || result.data;
        setState(prev => ({
            ...prev,
            user: payload?.user || prev.user,
            isLoading: false,
            isAuthenticated: Boolean(payload?.user || prev.user),
            error: null,
        }));
    }, [state.user, storeId]);

    // Delete Account
    const deleteAccount = useCallback(async (): Promise<void> => {
        if (!state.user) {
            throw new Error('No hay sesión activa');
        }

        const result = await supabase.functions.invoke('stripe-api', {
            body: { action: 'storeUsers-deleteAccount', storeId },
        });
        if (result.error) throw result.error;

        await signOut(auth);
        setState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
            error: null,
        });
    }, [state.user, storeId]);

    // Refresh User
    const refreshUser = useCallback(async (): Promise<void> => {
        if (!auth.currentUser?.email) return;

        const storeUser = await fetchCurrentStoreUser();

        if (storeUser) {
            setState(prev => ({
                ...prev,
                user: storeUser,
            }));
        }
    }, [fetchCurrentStoreUser]);

    // Context value
    const value = useMemo<StoreAuthContextType>(() => ({
        ...state,
        login,
        register,
        logout,
        resetPassword,
        updateProfile,
        deleteAccount,
        refreshUser,
    }), [state, login, register, logout, resetPassword, updateProfile, deleteAccount, refreshUser]);

    return (
        <StoreAuthContext.Provider value={value}>
            {children}
        </StoreAuthContext.Provider>
    );
};

// Hook to use store auth context
export const useStoreAuth = (): StoreAuthContextType => {
    const context = useContext(StoreAuthContext);

    if (!context) {
        throw new Error('useStoreAuth must be used within a StoreAuthProvider');
    }

    return context;
};

// Optional hook that returns null if not in provider (for conditional usage)
export const useStoreAuthOptional = (): StoreAuthContextType | null => {
    return useContext(StoreAuthContext);
};

export default StoreAuthContext;






