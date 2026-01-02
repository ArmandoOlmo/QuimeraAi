/**
 * InviteMemberModal
 * Modal for inviting new members to a tenant workspace
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    X,
    Mail,
    UserPlus,
    Crown,
    Shield,
    Users,
    User,
    Send,
    AlertCircle,
    Loader2,
} from 'lucide-react';
import { useTenant } from '../../../contexts/tenant';
import {
    AgencyRole,
    AGENCY_ROLE_LABELS,
    AGENCY_ROLE_DESCRIPTIONS,
    AGENCY_ROLE_COLORS,
    DEFAULT_PERMISSIONS,
    TenantPermissions,
} from '../../../types/multiTenant';
import { useTenantInvites } from '../../../hooks/useTenantInvites';

interface InviteMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
}) => {
    const { t } = useTranslation();
    const { currentTenant, currentRole } = useTenant();
    const { createInvite } = useTenantInvites();

    const [email, setEmail] = useState('');
    const [selectedRole, setSelectedRole] = useState<AgencyRole>('agency_member');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Available roles based on current user's role
    const getAvailableRoles = (): AgencyRole[] => {
        if (currentRole === 'agency_owner') {
            return ['agency_admin', 'agency_member', 'client'];
        }
        if (currentRole === 'agency_admin') {
            return ['agency_member', 'client'];
        }
        return [];
    };

    const availableRoles = getAvailableRoles();

    const getRoleIcon = (role: AgencyRole) => {
        switch (role) {
            case 'agency_owner':
                return <Crown size={18} className="text-yellow-500" />;
            case 'agency_admin':
                return <Shield size={18} className="text-purple-500" />;
            case 'agency_member':
                return <Users size={18} className="text-blue-500" />;
            case 'client':
                return <User size={18} className="text-green-500" />;
            default:
                return null;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError(t('invite.invalidEmail', 'Por favor ingresa un email válido'));
            return;
        }

        setIsLoading(true);

        try {
            await createInvite({
                email: email.toLowerCase(),
                role: selectedRole,
                message: message || undefined,
            });

            setSuccess(true);
            setTimeout(() => {
                setEmail('');
                setMessage('');
                setSelectedRole('agency_member');
                setSuccess(false);
                onSuccess?.();
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err.message || t('invite.error', 'Error enviando invitación'));
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div
                    className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl transform transition-all"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-border">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <UserPlus size={20} className="text-primary" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-foreground">
                                    {t('invite.title', 'Invitar Miembro')}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {currentTenant?.name}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Email Input */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                {t('invite.email', 'Email')}
                            </label>
                            <div className="relative">
                                <Mail
                                    size={18}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t('invite.emailPlaceholder', 'nombre@ejemplo.com')}
                                    className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                    disabled={isLoading}
                                    required
                                />
                            </div>
                        </div>

                        {/* Role Selection */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                {t('invite.role', 'Rol')}
                            </label>
                            <div className="space-y-2">
                                {availableRoles.map((role) => (
                                    <button
                                        key={role}
                                        type="button"
                                        onClick={() => setSelectedRole(role)}
                                        className={`
                                            w-full flex items-start gap-3 p-4 rounded-xl border transition-all
                                            ${selectedRole === role
                                                ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                                                : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                                            }
                                        `}
                                        disabled={isLoading}
                                    >
                                        <div className="mt-0.5">{getRoleIcon(role)}</div>
                                        <div className="flex-1 text-left">
                                            <p className="font-medium text-foreground">
                                                {AGENCY_ROLE_LABELS[role]}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-0.5">
                                                {AGENCY_ROLE_DESCRIPTIONS[role]}
                                            </p>
                                        </div>
                                        <div
                                            className={`
                                                w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5
                                                ${selectedRole === role
                                                    ? 'border-primary bg-primary'
                                                    : 'border-muted-foreground/30'
                                                }
                                            `}
                                        >
                                            {selectedRole === role && (
                                                <div className="w-2 h-2 rounded-full bg-white" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Optional Message */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                {t('invite.message', 'Mensaje personal')}
                                <span className="text-muted-foreground font-normal ml-1">
                                    ({t('common.optional', 'opcional')})
                                </span>
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={t('invite.messagePlaceholder', 'Añade un mensaje personalizado para la invitación...')}
                                rows={3}
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                                disabled={isLoading}
                                maxLength={500}
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                                <AlertCircle size={18} className="text-destructive flex-shrink-0" />
                                <p className="text-sm text-destructive">{error}</p>
                            </div>
                        )}

                        {/* Success Message */}
                        {success && (
                            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                                <Send size={18} className="text-green-500 flex-shrink-0" />
                                <p className="text-sm text-green-500">
                                    {t('invite.success', '¡Invitación enviada exitosamente!')}
                                </p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2.5 text-muted-foreground hover:text-foreground transition-colors"
                                disabled={isLoading}
                            >
                                {t('common.cancel', 'Cancelar')}
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !email || success}
                                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        {t('common.sending', 'Enviando...')}
                                    </>
                                ) : (
                                    <>
                                        <Send size={18} />
                                        {t('invite.send', 'Enviar Invitación')}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default InviteMemberModal;






