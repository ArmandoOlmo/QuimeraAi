/**
 * useLightAuthState Hook
 * 
 * A lightweight hook that checks Supabase authentication state WITHOUT
 * requiring the full AuthProvider context. Used to determine which 
 * providers to load before the main app renders.
 * 
 * Performance: This runs before any heavy contexts load, allowing the app
 * to use LightProviders for unauthenticated routes (login, register, etc.)
 */

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { User } from '@supabase/supabase-js';

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
        const timeout = setTimeout(() => {
            setIsLoading((current) => {
                if (current) {
                    console.warn('[useLightAuthState] Auth state timeout after 8s - forcing loading to false');
                }
                return false;
            });
        }, 8000);

        supabase.auth.getSession().then(({ data: { session } }) => {
            clearTimeout(timeout);
            setUser(session?.user ?? null);
            setIsLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                clearTimeout(timeout);
                setUser(session?.user ?? null);
                setIsLoading(false);
            }
        );

        return () => {
            clearTimeout(timeout);
            subscription.unsubscribe();
        };
    }, []);

    return {
        user,
        isLoading,
        isAuthenticated: !!user,
    };
};

export default useLightAuthState;
