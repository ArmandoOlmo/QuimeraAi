/**
 * useLightAuthState Hook
 * 
 * A lightweight hook that checks Firebase authentication state WITHOUT
 * requiring the full AuthProvider context. Used to determine which 
 * providers to load before the main app renders.
 * 
 * Performance: This runs before any heavy contexts load, allowing the app
 * to use LightProviders for unauthenticated routes (login, register, etc.)
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User, auth } from '../firebase';

interface LightAuthState {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

/**
 * Lightweight auth state hook that doesn't require AuthProvider
 * Use this at the top level of the app to decide which providers to load
 */
export const useLightAuthState = (): LightAuthState => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return {
        user,
        isLoading,
        isAuthenticated: !!user,
    };
};

export default useLightAuthState;
