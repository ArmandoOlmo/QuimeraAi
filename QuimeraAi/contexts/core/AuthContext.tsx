/**
 * AuthContext
 * Maneja la autenticación, usuarios y permisos del sistema
 */

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

import { supabase } from '../../supabase';
import { User } from '@supabase/supabase-js';
import { UserDocument, UserRole, RolePermissions, IndividualRole, AgencyRole } from '../../types';
import { getPermissions, isOwner, determineRole } from '../../constants/roles';

interface AuthContextType {
    // User State
    user: User | null;
    loadingAuth: boolean;
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

    // Logout
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
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

        const handleAuthChange = async (supabaseUser: User | null) => {
            clearTimeout(timeout);
            console.log('[AuthProvider] Auth state changed:', supabaseUser ? `id=${supabaseUser.id}, email=${supabaseUser.email}` : 'null (signed out)');
            setUser(supabaseUser);

            if (supabaseUser) {
                try {
                    // Fetch from Supabase Postgres
                    const { data: userSnap, error: fetchError } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', supabaseUser.id)
                        .maybeSingle();

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

                    setUserDocument({ ...finalUserDoc, id: supabaseUser.id });
                    const effectiveRole = determineRole(supabaseUser.email!, finalUserDoc.role || 'user');
                    console.log('[AuthProvider] User doc loaded. role:', finalUserDoc.role, 'effectiveRole:', effectiveRole, 'tenantId:', finalUserDoc.tenantId);
                    setUserPermissions(getPermissions(effectiveRole));

                    // In Supabase, custom claims are usually stored in app_metadata
                    if (supabaseUser.app_metadata?.isOwner === true) {
                        setIsOwnerFromClaims(true);
                    }
                } catch (error) {
                    console.error('Error fetching user document:', error);
                    
                    let fallbackRole: string | undefined;
                    if (supabaseUser.app_metadata?.isOwner === true) {
                        setIsOwnerFromClaims(true);
                        fallbackRole = 'owner';
                    } else if (typeof supabaseUser.app_metadata?.role === 'string') {
                        fallbackRole = supabaseUser.app_metadata.role;
                    }

                    const fallbackDoc: UserDocument = {
                        id: supabaseUser.id,
                        name: supabaseUser.user_metadata?.full_name || 'User',
                        email: supabaseUser.email || '',
                        photoURL: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || '',
                        role: fallbackRole as any,
                    };
                    setUserDocument(fallbackDoc);
                    const effectiveRole = determineRole(supabaseUser.email!, fallbackRole || 'user');
                    setUserPermissions(getPermissions(effectiveRole));
                }
            } else {
                setUserDocument(null);
                setUserPermissions(getPermissions('user'));
            }

            setLoadingAuth(false);
        };

        // Initialize from existing session if available
        supabase.auth.getSession().then(({ data: { session } }) => {
            handleAuthChange(session?.user ?? null);
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                // Ignore initial setup events if they fire right after getSession
                handleAuthChange(session?.user ?? null);
            }
        );

        return () => {
            clearTimeout(timeout);
            subscription.unsubscribe();
        };
    }, []);

    // isUserOwner: App Metadata (primary) OR email check (fallback) OR Firestore role
    const isUserOwner = isOwnerFromClaims || isOwner(user?.email || '') || userDocument?.role === 'owner';
    const currentTenant = userDocument?.tenantId || null;
    const currentTenantRole = userDocument?.tenantRole || null;
    const canAccessSuperAdmin = isUserOwner || ['owner', 'superadmin', 'admin', 'manager'].includes(userDocument?.role || '');

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

    const value: AuthContextType = {
        user,
        loadingAuth,
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










