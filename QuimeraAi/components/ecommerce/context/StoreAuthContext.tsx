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

const timestampFromIso = (value?: string | null) => ({
    seconds: value ? Math.floor(new Date(value).getTime() / 1000) : Math.floor(Date.now() / 1000),
    nanoseconds: 0,
});

const mapStoreUserRow = (row: any): StoreUser => ({
    id: row.id,
    email: row.email,
    displayName: row.display_name || row.email,
    firstName: row.first_name || undefined,
    lastName: row.last_name || undefined,
    photoURL: row.photo_url || undefined,
    phone: row.phone || undefined,
    role: row.role || 'customer',
    status: row.status || 'active',
    segments: row.segments || [],
    tags: row.tags || [],
    customerId: row.customer_id || undefined,
    totalOrders: Number(row.total_orders || 0),
    totalSpent: Number(row.total_spent || 0),
    averageOrderValue: Number(row.average_order_value || 0),
    lastLoginAt: row.last_login_at ? timestampFromIso(row.last_login_at) as any : undefined,
    lastOrderAt: row.last_order_at ? timestampFromIso(row.last_order_at) as any : undefined,
    createdAt: timestampFromIso(row.created_at) as any,
    updatedAt: timestampFromIso(row.updated_at) as any,
    metadata: row.metadata || { source: 'self_register' },
    acceptsMarketing: row.accepts_marketing,
    preferredLanguage: row.preferred_language || undefined,
    internalNotes: row.internal_notes || undefined,
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

    // Uses Supabase client inline.

    // Fetch store user data from Supabase.
    const fetchStoreUser = useCallback(async (email: string): Promise<StoreUser | null> => {
        try {
            const { data, error } = await supabase
                .from('store_users')
                .select('*')
                .eq('project_id', storeId)
                .eq('email', email.toLowerCase())
                .maybeSingle();

            if (error) throw error;
            return data ? mapStoreUserRow(data) : null;
        } catch (error) {
            console.error('Error fetching store user:', error);
            return null;
        }
    }, [storeId]);

    // Listen to storefront auth state changes.
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (authUser: StoreAuthUser | null) => {
            if (authUser && authUser.email) {
                // User is signed in, check if they belong to this store
                const storeUser = await fetchStoreUser(authUser.email);

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
                    setState({
                        user: null,
                        isLoading: false,
                        isAuthenticated: false,
                        error: null,
                    });
                }
            } else {
                // User is signed out
                setState({
                    user: null,
                    isLoading: false,
                    isAuthenticated: false,
                    error: null,
                });
            }
        });

        return () => unsubscribe();
    }, [fetchStoreUser]);

    // Login
    const login = useCallback(async (email: string, password: string): Promise<void> => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            await signInWithEmailAndPassword(auth, email, password);

            // After auth, RLS can verify if the user belongs to this store.
            const storeUser = await fetchStoreUser(email);

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

            setState({
                user: storeUser,
                isLoading: false,
                isAuthenticated: true,
                error: null,
            });

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
    }, [storeId, fetchStoreUser]);

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
    }, [storeId]);

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
                body: {
                    action: 'storeUsers-resetPassword',
                    storeId,
                    email,
                },
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

        // Note: Profile updates should be done via server-side API routes for security.
        // For now, just refresh the user data
        await refreshUser();
    }, [state.user]);

    // Refresh User
    const refreshUser = useCallback(async (): Promise<void> => {
        if (!auth.currentUser?.email) return;

        const storeUser = await fetchStoreUser(auth.currentUser.email);

        if (storeUser) {
            setState(prev => ({
                ...prev,
                user: storeUser,
            }));
        }
    }, [fetchStoreUser]);

    // Context value
    const value = useMemo<StoreAuthContextType>(() => ({
        ...state,
        login,
        register,
        logout,
        resetPassword,
        updateProfile,
        refreshUser,
    }), [state, login, register, logout, resetPassword, updateProfile, refreshUser]);

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






