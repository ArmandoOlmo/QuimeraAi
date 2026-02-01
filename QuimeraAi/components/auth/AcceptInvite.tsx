/**
 * AcceptInvite
 * Page for accepting tenant invitations via token link
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Building2,
    UserPlus,
    Check,
    X,
    AlertCircle,
    Loader2,
    LogIn,
    Crown,
    Shield,
    Users,
    User,
    Clock,
    Mail,
    ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/core/AuthContext';
import { useRouter } from '../../hooks/useRouter';
import { useInviteByToken } from '../../hooks/useTenantInvites';
import {
    AgencyRole,
    AGENCY_ROLE_LABELS,
    AGENCY_ROLE_DESCRIPTIONS,
} from '../../types/multiTenant';
import { ROUTES } from '../../routes/config';

interface AcceptInviteProps {
    token: string;
}

const AcceptInvite: React.FC<AcceptInviteProps> = ({ token }) => {
    const { t } = useTranslation();
    const { user, isLoading: isAuthLoading } = useAuth();
    const { navigate } = useRouter();
    const {
        invite,
        isLoading: isInviteLoading,
        error: inviteError,
        isValid,
        isExpired,
        acceptInvite,
    } = useInviteByToken(token);

    const [isAccepting, setIsAccepting] = useState(false);
    const [acceptError, setAcceptError] = useState<string | null>(null);
    const [accepted, setAccepted] = useState(false);

    const getRoleIcon = (role: AgencyRole) => {
        switch (role) {
            case 'agency_owner':
                return <Crown size={24} className="text-yellow-500" />;
            case 'agency_admin':
                return <Shield size={24} className="text-purple-500" />;
            case 'agency_member':
                return <Users size={24} className="text-blue-500" />;
            case 'client':
                return <User size={24} className="text-green-500" />;
            default:
                return null;
        }
    };

    const handleAccept = async () => {
        if (!user) {
            // Redirect to login with return URL
            navigate(`${ROUTES.LOGIN}?redirect=/invite/${token}`);
            return;
        }

        setIsAccepting(true);
        setAcceptError(null);

        try {
            await acceptInvite();
            setAccepted(true);
            // Redirect to dashboard after a short delay
            setTimeout(() => {
                navigate(ROUTES.DASHBOARD);
            }, 2000);
        } catch (err: any) {
            setAcceptError(err.message || t('invite.acceptError', 'Error aceptando invitación'));
        } finally {
            setIsAccepting(false);
        }
    };

    const handleDecline = () => {
        navigate(ROUTES.HOME);
    };

    // Loading state
    if (isAuthLoading || isInviteLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <Loader2 size={40} className="animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">
                        {t('common.loading', 'Cargando...')}
                    </p>
                </div>
            </div>
        );
    }

    // Error state
    if (inviteError || !invite) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                        <AlertCircle size={32} className="text-destructive" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">
                        {t('invite.notFound', 'Invitación no encontrada')}
                    </h1>
                    <p className="text-muted-foreground mb-6">
                        {inviteError || t('invite.invalidLink', 'Este enlace de invitación no es válido o ya no está disponible.')}
                    </p>
                    <button
                        onClick={() => navigate(ROUTES.HOME)}
                        className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
                    >
                        {t('common.goHome', 'Ir al inicio')}
                    </button>
                </div>
            </div>
        );
    }

    // Expired state
    if (isExpired) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-6">
                        <Clock size={32} className="text-yellow-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">
                        {t('invite.expired', 'Invitación expirada')}
                    </h1>
                    <p className="text-muted-foreground mb-6">
                        {t('invite.expiredDescription', 'Esta invitación ha expirado. Contacta al administrador del workspace para recibir una nueva invitación.')}
                    </p>
                    <button
                        onClick={() => navigate(ROUTES.HOME)}
                        className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
                    >
                        {t('common.goHome', 'Ir al inicio')}
                    </button>
                </div>
            </div>
        );
    }

    // Already accepted state
    if (invite.status !== 'pending') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                        <Check size={32} className="text-green-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">
                        {t('invite.alreadyAccepted', 'Invitación ya aceptada')}
                    </h1>
                    <p className="text-muted-foreground mb-6">
                        {t('invite.alreadyAcceptedDescription', 'Esta invitación ya fue aceptada. Puedes acceder al workspace desde tu dashboard.')}
                    </p>
                    <button
                        onClick={() => navigate(ROUTES.DASHBOARD)}
                        className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
                    >
                        {t('common.goToDashboard', 'Ir al Dashboard')}
                    </button>
                </div>
            </div>
        );
    }

    // Success state
    if (accepted) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                        <Check size={32} className="text-green-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">
                        {t('invite.accepted', '¡Bienvenido!')}
                    </h1>
                    <p className="text-muted-foreground mb-4">
                        {t('invite.acceptedDescription', 'Te has unido exitosamente a')} <strong>{invite.tenantName}</strong>
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {t('invite.redirecting', 'Redirigiendo al dashboard...')}
                    </p>
                </div>
            </div>
        );
    }

    // Main invitation view
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-lg w-full">
                {/* Card */}
                <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
                    {/* Header with branding */}
                    <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 text-center border-b border-border">
                        {invite.tenantLogo ? (
                            <img
                                src={invite.tenantLogo}
                                alt={invite.tenantName}
                                className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4 shadow-lg"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg">
                                {invite.tenantName?.[0]?.toUpperCase() || 'W'}
                            </div>
                        )}
                        <h1 className="text-2xl font-bold text-foreground mb-1">
                            {invite.tenantName}
                        </h1>
                        <p className="text-muted-foreground">
                            {t('invite.invitedBy', 'Te ha invitado')} {invite.invitedByName || 'alguien'}
                        </p>
                    </div>

                    {/* Content */}
                    <div className="p-8">
                        {/* Role info */}
                        <div className="flex items-start gap-4 p-4 bg-secondary/50 rounded-xl mb-6">
                            <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center flex-shrink-0">
                                {getRoleIcon(invite.role)}
                            </div>
                            <div>
                                <p className="font-medium text-foreground">
                                    {t('invite.invitedAs', 'Serás invitado como')}
                                </p>
                                <p className="text-lg font-bold text-foreground">
                                    {AGENCY_ROLE_LABELS[invite.role]}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {AGENCY_ROLE_DESCRIPTIONS[invite.role]}
                                </p>
                            </div>
                        </div>

                        {/* Personal message */}
                        {invite.message && (
                            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl mb-6">
                                <p className="text-sm text-muted-foreground mb-1">
                                    {t('invite.personalMessage', 'Mensaje personal:')}
                                </p>
                                <p className="text-foreground italic">"{invite.message}"</p>
                            </div>
                        )}

                        {/* Email verification notice */}
                        {user && user.email?.toLowerCase() !== invite.email.toLowerCase() && (
                            <div className="flex items-center gap-2 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl mb-6">
                                <AlertCircle size={18} className="text-yellow-500 flex-shrink-0" />
                                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                                    {t('invite.emailMismatch', 'Esta invitación fue enviada a')} <strong>{invite.email}</strong>. {t('invite.emailMismatchDescription', 'Asegúrate de iniciar sesión con el email correcto.')}
                                </p>
                            </div>
                        )}

                        {/* Error message */}
                        {acceptError && (
                            <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/30 rounded-xl mb-6">
                                <AlertCircle size={18} className="text-destructive flex-shrink-0" />
                                <p className="text-sm text-destructive">{acceptError}</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="space-y-3">
                            {user ? (
                                <>
                                    <button
                                        onClick={handleAccept}
                                        disabled={isAccepting}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {isAccepting ? (
                                            <>
                                                <Loader2 size={20} className="animate-spin" />
                                                {t('invite.accepting', 'Aceptando...')}
                                            </>
                                        ) : (
                                            <>
                                                <Check size={20} />
                                                {t('invite.acceptInvite', 'Aceptar Invitación')}
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleDecline}
                                        disabled={isAccepting}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-4 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl font-medium transition-all"
                                    >
                                        <X size={20} />
                                        {t('invite.decline', 'Rechazar')}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => navigate(`${ROUTES.LOGIN}?redirect=/invite/${token}`)}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all"
                                    >
                                        <LogIn size={20} />
                                        {t('invite.loginToAccept', 'Iniciar Sesión para Aceptar')}
                                    </button>
                                    <p className="text-center text-sm text-muted-foreground">
                                        {t('invite.noAccount', '¿No tienes cuenta?')}{' '}
                                        <button
                                            onClick={() => navigate(`${ROUTES.SIGNUP}?redirect=/invite/${token}&email=${encodeURIComponent(invite.email)}`)}
                                            className="text-primary hover:underline"
                                        >
                                            {t('invite.createAccount', 'Crear una cuenta')}
                                        </button>
                                    </p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-4 bg-secondary/30 border-t border-border">
                        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                            <Mail size={14} />
                            <span>{t('invite.sentTo', 'Invitación enviada a')} {invite.email}</span>
                        </div>
                    </div>
                </div>

                {/* Quimera branding */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-muted-foreground">
                        {t('common.poweredBy', 'Desarrollado con')}{' '}
                        <span className="font-bold text-foreground">Quimera<span className="text-primary">.ai</span></span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AcceptInvite;






