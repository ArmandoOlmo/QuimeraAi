/**
 * AuthContext
 * Maneja la autenticación, usuarios y permisos del sistema
 */

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

import { supabase } from '../../supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { signInWithGoogle as signInWithGoogleProvider } from '../../utils/googleAuth';
import { toCompatUser, type User as CompatUser } from '../../utils/compatData';
import { UserDocument, UserRole, RolePermissions, IndividualRole, AgencyRole } from '../../types';
import { determineRole, getPermissions, isAdminRole, isOwner, isPlatformOwnerRole } from '../../constants/roles';

interface AuthContextType {
    // User State
    user: CompatUser | null;
    loadingAuth: boolean;
    /** @deprecated Use loadingAuth */
    isLoading: boolean;
    userDocument: UserDocument | null;
    setUserDocument: React.Dispatch<React.SetStateAction<UserDocument | null>>;

    // Verification
    verificationEmail: string | null;
    setVerificationEmail: React.Dispatch<React.SetStateAction<string | null>>;

    // Profile Modal
    isProfileModalOpen: boolean;
    openProfileModal: () => void;
    closeProfileModal: () => void;

    // Permissions
    userPermissions: RolePermissions;
    canPerform: (permission: keyof RolePermissions) => boolean;
    isUserOwner: boolean;

    // Tenant
    currentTenant: string | null;
    currentTenantRole: IndividualRole | AgencyRole | null;

    // Admin Access
    canAccessSuperAdmin: boolean;

    // Auth actions (portal + login pages)
    login?: (email: string, password: string) => Promise<void>;
    signInWithGoogle?: () => Promise<void>;
    sendMagicLink?: (email: string, redirectTo?: string) => Promise<void>;

    // Logout
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<CompatUser | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [userDocument, setUserDocument] = useState<UserDocument | null>(null);
    const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
    const [userPermissions, setUserPermissions] = useState<RolePermissions>(getPermissions('user'));
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isOwnerFromClaims, setIsOwnerFromClaims] = useState(false);

    // Auth State Observer
    useEffect(() => {
        // Safe timeout in case auth takes too long
        const timeout = setTimeout(() => {
            setLoadingAuth((current) => {
                if (current) {
                    console.warn('[AuthProvider] Auth state timeout after 8s - forcing loadingAuth to false');
                }
                return false;
            });
        }, 8000);

        let authChangeRunId = 0;

        const handleAuthChange = async (supabaseUser: SupabaseUser | null) => {
            const runId = ++authChangeRunId;
            console.log('[AuthProvider] Auth state changed:', supabaseUser ? `id=${supabaseUser.id}, email=${supabaseUser.email}` : 'null (signed out)');
            setUser(toCompatUser(supabaseUser));

            if (supabaseUser) {
                try {
                    // Fetch from Supabase Postgres. Guard against a hung network
                    // request (e.g. Supabase auth/CORS 522) so loadingAuth can still resolve.
                    const usersQuery = supabase
                        .from('users')
                        .select('*')
                        .eq('id', supabaseUser.id)
                        .maybeSingle();
                    const { data: userSnap, error: fetchError } = await Promise.race([
                        usersQuery,
                        new Promise<never>((_, reject) =>
                            setTimeout(() => reject(new Error('users query timed out')), 6000),
                        ),
                    ]) as Awaited<typeof usersQuery>;

                    let finalUserDoc: Omit<UserDocument, 'id'>;

                    if (userSnap) {
                        finalUserDoc = {
                            ...userSnap,
                            photoURL: userSnap.photo_url || supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || '',
                        } as any;
                    } else {
                        // Create user document if doesn't exist
                        const newUserDocData = {
                            id: supabaseUser.id,
                            name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'Unnamed User',
                            email: supabaseUser.email!,
                            photo_url: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || '',
                            role: 'user'
                        };
                        await supabase.from('users').upsert(newUserDocData);
                        finalUserDoc = { ...newUserDocData, photoURL: newUserDocData.photo_url } as any;
                    }

                    // Auto-promote owner
                    if (isOwner(supabaseUser.email!) && finalUserDoc.role !== 'owner') {
                        try {
                            finalUserDoc.role = 'owner';
                            await supabase.from('users').update({ role: 'owner' }).eq('id', supabaseUser.id);
                        } catch (e) {
                            console.warn('Failed to auto-promote owner:', e);
                        }
                    }

                    if (runId !== authChangeRunId) return;

                    const claimRole = supabaseUser.app_metadata?.isOwner === true
                        ? 'owner'
                        : typeof supabaseUser.app_metadata?.role === 'string'
                        ? supabaseUser.app_metadata.role
                        : undefined;
                    const effectiveRole = determineRole(
                        supabaseUser.email!,
                        isPlatformOwnerRole(claimRole) ? claimRole : finalUserDoc.role || claimRole || 'user',
                    );
                    setUserDocument({ ...finalUserDoc, role: effectiveRole as any, id: supabaseUser.id });
                    console.log('[AuthProvider] User doc loaded. role:', finalUserDoc.role, 'effectiveRole:', effectiveRole, 'tenantId:', finalUserDoc.tenantId);
                    setUserPermissions(getPermissions(effectiveRole));

                    // In Supabase, custom claims are usually stored in app_metadata
                    setIsOwnerFromClaims(supabaseUser.app_metadata?.isOwner === true);
                } catch (error) {
                    console.error('Error fetching user document:', error);
                    
                    let fallbackRole: string | undefined;
                    if (supabaseUser.app_metadata?.isOwner === true) {
                        setIsOwnerFromClaims(true);
                        fallbackRole = 'owner';
                    } else if (typeof supabaseUser.app_metadata?.role === 'string') {
                        setIsOwnerFromClaims(false);
                        fallbackRole = supabaseUser.app_metadata.role;
                    } else {
                        setIsOwnerFromClaims(false);
                    }

                    const effectiveRole = determineRole(supabaseUser.email!, fallbackRole || 'user');
                    const fallbackDoc: UserDocument = {
                        id: supabaseUser.id,
                        name: supabaseUser.user_metadata?.full_name || 'User',
                        email: supabaseUser.email || '',
                        photoURL: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || '',
                        role: effectiveRole as any,
                    };
                    if (runId !== authChangeRunId) return;

                    setUserDocument(fallbackDoc);
                    setUserPermissions(getPermissions(effectiveRole));
                }
            } else {
                if (runId !== authChangeRunId) return;

                setUserDocument(null);
                setUserPermissions(getPermissions('user'));
                setIsOwnerFromClaims(false);
            }

            clearTimeout(timeout);
            setLoadingAuth(false);
        };

        // Initialize from existing session if available. A rejection here
        // (e.g. auth refresh CORS/522 or a stolen Navigator lock) must still
        // resolve the loading state instead of hanging on the Loading screen.
        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                handleAuthChange(session?.user ?? null);
            })
            .catch((error) => {
                console.error('[AuthProvider] getSession failed; continuing unauthenticated:', error);
                handleAuthChange(null);
            });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                setTimeout(() => {
                    void handleAuthChange(session?.user ?? null);
                }, 0);
            }
        );

        return () => {
            authChangeRunId++;
            clearTimeout(timeout);
            subscription.unsubscribe();
        };
    }, []);

    // isUserOwner: App Metadata (primary) OR email check (fallback) OR Supabase role
    const isUserOwner = isOwnerFromClaims || isOwner(user?.email || '') || isPlatformOwnerRole(userDocument?.role);
    const currentTenant = userDocument?.tenantId || null;
    const currentTenantRole = userDocument?.tenantRole || null;
    const canAccessSuperAdmin = isUserOwner || isAdminRole(userDocument?.role);

    // Functions
    const canPerform = (permission: keyof RolePermissions): boolean => {
        if (isUserOwner) return true;
        return (userPermissions as any)[permission] === true;
    };

    const openProfileModal = () => setIsProfileModalOpen(true);
    const closeProfileModal = () => setIsProfileModalOpen(false);

    const logout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Error during logout:', error);
        }
    };

    const login = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
    };

    const signInWithGoogle = async () => {
        await signInWithGoogleProvider();
    };

    const sendMagicLink = async (email: string, redirectTo?: string) => {
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: redirectTo || window.location.origin },
        });
        if (error) throw error;
    };

    const value: AuthContextType = {
        user,
        loadingAuth,
        isLoading: loadingAuth,
        userDocument,
        setUserDocument,
        verificationEmail,
        setVerificationEmail,
        isProfileModalOpen,
        openProfileModal,
        closeProfileModal,
        userPermissions,
        canPerform,
        isUserOwner,
        currentTenant,
        currentTenantRole,
        canAccessSuperAdmin,
        login,
        signInWithGoogle,
        sendMagicLink,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const useSafeAuth = (): AuthContextType | null => {
    return useContext(AuthContext) || null;
};




