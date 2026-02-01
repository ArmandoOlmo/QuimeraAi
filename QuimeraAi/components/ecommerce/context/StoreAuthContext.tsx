/**
 * StoreAuthContext
 * Context para manejar la autenticación de usuarios de tienda (clientes)
 * Multi-tenant: cada tienda tiene sus propios usuarios
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
    onAuthStateChanged,
    User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../../../firebase';
import { StoreUser, StoreAuthContextType, StoreAuthState } from '../../../types/storeUsers';

interface StoreAuthProviderProps {
    storeId: string;
    children: React.ReactNode;
}

const StoreAuthContext = createContext<StoreAuthContextType | null>(null);

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

    // Cloud Functions
    const createStoreUserFn = httpsCallable(functions, 'storeUsers-create');
    const recordLoginFn = httpsCallable(functions, 'storeUsers-recordLogin');
    const getStoreUserFn = httpsCallable(functions, 'storeUsers-get');

    // Fetch store user data from Firestore
    const fetchStoreUser = useCallback(async (email: string): Promise<StoreUser | null> => {
        try {
            const usersRef = collection(db, `storeUsers/${storeId}/users`);
            const q = query(usersRef, where('email', '==', email.toLowerCase()));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                return null;
            }

            const userDoc = snapshot.docs[0];
            return {
                id: userDoc.id,
                ...userDoc.data(),
            } as StoreUser;
        } catch (error) {
            console.error('Error fetching store user:', error);
            return null;
        }
    }, [storeId]);

    // Listen to Firebase Auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
            if (firebaseUser && firebaseUser.email) {
                // User is signed in, check if they belong to this store
                const storeUser = await fetchStoreUser(firebaseUser.email);

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
                    // User exists in Firebase Auth but not in this store
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
            // First check if user exists in this store
            const storeUser = await fetchStoreUser(email);

            if (!storeUser) {
                throw new Error('No existe una cuenta con este email en esta tienda');
            }

            if (storeUser.status === 'banned') {
                throw new Error('Tu cuenta ha sido suspendida. Contacta al soporte.');
            }

            if (storeUser.status === 'inactive') {
                throw new Error('Tu cuenta está inactiva. Contacta al soporte.');
            }

            // Sign in with Firebase Auth
            await signInWithEmailAndPassword(auth, email, password);

            // Record login (async, don't wait)
            recordLoginFn({ storeId, email }).catch(console.error);

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
    }, [storeId, fetchStoreUser, recordLoginFn]);

    // Register
    const register = useCallback(async (
        email: string,
        password: string,
        displayName: string
    ): Promise<void> => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            // Use Cloud Function to create store user
            const result = await createStoreUserFn({
                storeId,
                email,
                password,
                displayName,
                source: 'self_register',
            });

            const data = result.data as { success: boolean; message?: string };

            if (!data.success) {
                throw new Error(data.message || 'Error al crear la cuenta');
            }

            // Sign in with Firebase Auth
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
    }, [storeId, createStoreUserFn]);

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
            // First check if user exists in this store
            const storeUser = await fetchStoreUser(email);

            if (!storeUser) {
                throw new Error('No existe una cuenta con este email en esta tienda');
            }

            await sendPasswordResetEmail(auth, email);
        } catch (error: any) {
            let errorMessage = 'Error al enviar el email de recuperación';

            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No existe una cuenta con este email';
            } else if (error.message) {
                errorMessage = error.message;
            }

            throw new Error(errorMessage);
        }
    }, [fetchStoreUser]);

    // Update Profile
    const updateProfile = useCallback(async (updates: Partial<StoreUser>): Promise<void> => {
        if (!state.user) {
            throw new Error('No hay sesión activa');
        }

        // Note: Profile updates are done via Cloud Functions for security
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











