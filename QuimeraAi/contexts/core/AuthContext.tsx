/**
 * AuthContext
 * Maneja la autenticación, usuarios y permisos del sistema
 */

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged, auth, db, doc, getDoc, setDoc } from '../../firebase';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [userDocument, setUserDocument] = useState<UserDocument | null>(null);
    const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
    const [userPermissions, setUserPermissions] = useState<RolePermissions>(getPermissions('user'));
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    // Auth State Observer
    useEffect(() => {
        // Safari safety: if onAuthStateChanged never fires (IndexedDB lock hang),
        // force loadingAuth to false after 8 seconds
        const timeout = setTimeout(() => {
            setLoadingAuth((current) => {
                if (current) {
                    console.warn('[AuthProvider] Auth state timeout after 8s - forcing loadingAuth to false');
                }
                return false;
            });
        }, 8000);

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            clearTimeout(timeout);
            console.log('[AuthProvider] onAuthStateChanged fired:', firebaseUser ? `uid=${firebaseUser.uid}, email=${firebaseUser.email}` : 'null (signed out)');
            setUser(firebaseUser);

            if (firebaseUser) {
                try {
                    const userDocRef = doc(db, 'users', firebaseUser.uid);
                    const userSnap = await getDoc(userDocRef);

                    let finalUserDoc: Omit<UserDocument, 'id'>;

                    if (userSnap.exists()) {
                        finalUserDoc = userSnap.data() as Omit<UserDocument, 'id'>;
                    } else {
                        // Create user document if doesn't exist (using merge: true to prevent accidental wipes of existing fields)
                        const newUserDocData = {
                            name: firebaseUser.displayName || 'Unnamed User',
                            email: firebaseUser.email!,
                            photoURL: firebaseUser.photoURL || '',
                        };
                        await setDoc(userDocRef, newUserDocData, { merge: true });
                        finalUserDoc = newUserDocData;
                    }

                    // Auto-promote owner (fallback until Custom Claims are deployed)
                    if (isOwner(firebaseUser.email!) && finalUserDoc.role !== 'owner') {
                        try {
                            finalUserDoc.role = 'owner';
                            await setDoc(userDocRef, { role: 'owner' }, { merge: true });
                        } catch (e) {
                            console.warn('Failed to auto-promote owner:', e);
                        }
                    }

                    setUserDocument({ ...finalUserDoc, id: firebaseUser.uid });
                    const effectiveRole = determineRole(firebaseUser.email!, finalUserDoc.role || 'user');
                    console.log('[AuthProvider] User doc loaded. role:', finalUserDoc.role, 'effectiveRole:', effectiveRole, 'tenantId:', finalUserDoc.tenantId);
                    setUserPermissions(getPermissions(effectiveRole));

                    // Read isOwner from Custom Claims (set by server-side Cloud Function)
                    try {
                        const tokenResult = await firebaseUser.getIdTokenResult();
                        if (tokenResult.claims.isOwner === true) {
                            setIsOwnerFromClaims(true);
                        }
                    } catch (claimsErr) {
                        console.warn('[AuthProvider] Could not read custom claims:', claimsErr);
                    }
                } catch (error) {
                    console.error('Error fetching user document:', error);
                    // Fallback user document
                    console.error('[AuthProvider] Using fallback user document — role will be undefined');
                    const fallbackDoc: UserDocument = {
                        id: firebaseUser.uid,
                        name: firebaseUser.displayName || 'User',
                        email: firebaseUser.email || '',
                        photoURL: firebaseUser.photoURL || '',
                    };
                    setUserDocument(fallbackDoc);
                    setUserPermissions(getPermissions('user'));
                }
            } else {
                setUserDocument(null);
                setUserPermissions(getPermissions('user'));
            }

            console.log('[AuthProvider] Auth state resolved. loadingAuth -> false');
            setLoadingAuth(false);
        });

        return () => {
            clearTimeout(timeout);
            unsubscribe();
        };
    }, []);

    const [isOwnerFromClaims, setIsOwnerFromClaims] = useState(false);

    // isUserOwner: Custom Claims (primary) OR email check (fallback) OR Firestore role
    const isUserOwner = isOwnerFromClaims || isOwner(user?.email || '') || userDocument?.role === 'owner';
    const currentTenant = userDocument?.tenantId || null;
    const currentTenantRole = userDocument?.tenantRole || null;
    // Include isUserOwner as fallback to handle race condition where userDocument.role
    // hasn't loaded yet but we can verify owner by claims
    const canAccessSuperAdmin = isUserOwner || ['owner', 'superadmin', 'admin', 'manager'].includes(userDocument?.role || '');

    // Functions
    const canPerform = (permission: keyof RolePermissions): boolean => {
        if (isUserOwner) return true;
        return (userPermissions as any)[permission] === true;
    };

    const openProfileModal = () => setIsProfileModalOpen(true);
    const closeProfileModal = () => setIsProfileModalOpen(false);

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










