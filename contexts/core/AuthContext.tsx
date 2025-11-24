/**
 * AuthContext
 * Maneja la autenticación, usuarios y permisos del sistema
 */

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged, auth, db, doc, getDoc } from '../../firebase';
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
    
    // Permissions
    userPermissions: RolePermissions;
    canPerform: (permission: keyof RolePermissions) => boolean;
    
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
    
    // Auth State Observer
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            
            if (firebaseUser) {
                try {
                    const userDocRef = doc(db, 'users', firebaseUser.uid);
                    const userSnap = await getDoc(userDocRef);
                    
                    if (userSnap.exists()) {
                        const userData = userSnap.data() as UserDocument;
                        
                        // Determine role
                        const role = determineRole(firebaseUser.email || '');
                        const finalUserData = {
                            ...userData,
                            role: userData.role || role
                        };
                        
                        setUserDocument(finalUserData);
                        setUserPermissions(getPermissions(finalUserData.role || 'user'));
                    } else {
                        // Create user document if doesn't exist
                        const role = determineRole(firebaseUser.email || '');
                        const newUserDoc: UserDocument = {
                            id: firebaseUser.uid,
                            name: firebaseUser.displayName || 'User',
                            email: firebaseUser.email || '',
                            photoURL: firebaseUser.photoURL || '',
                            role: role,
                        };
                        setUserDocument(newUserDoc);
                        setUserPermissions(getPermissions(role));
                    }
                } catch (error) {
                    console.error('Error fetching user document:', error);
                }
            } else {
                setUserDocument(null);
                setUserPermissions(getPermissions('user'));
            }
            
            setLoadingAuth(false);
        });
        
        return () => unsubscribe();
    }, []);
    
    // Functions
    const canPerform = (permission: keyof RolePermissions): boolean => {
        return userPermissions[permission] || false;
    };
    
    const currentTenant = userDocument?.tenantId || null;
    const currentTenantRole = userDocument?.tenantRole || null;
    const canAccessSuperAdmin = ['owner', 'superadmin', 'admin', 'manager'].includes(userDocument?.role || '');
    
    const value: AuthContextType = {
        user,
        loadingAuth,
        userDocument,
        setUserDocument,
        verificationEmail,
        setVerificationEmail,
        userPermissions,
        canPerform,
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

