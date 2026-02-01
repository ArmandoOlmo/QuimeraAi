/**
 * PendingInvites
 * List of pending tenant invitations with management actions
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Mail,
    Clock,
    MoreHorizontal,
    RefreshCw,
    X,
    Send,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    Crown,
    Shield,
    Users,
    User,
} from 'lucide-react';
import { useTenantInvites, TenantInviteWithActions } from '../../../hooks/useTenantInvites';
import {
    AgencyRole,
    AGENCY_ROLE_LABELS,
    AGENCY_ROLE_COLORS,
} from '../../../types/multiTenant';

interface PendingInvitesProps {
    className?: string;
    maxDisplay?: number;
    onViewAll?: () => void;
}

const PendingInvites: React.FC<PendingInvitesProps> = ({
    className = '',
    maxDisplay,
    onViewAll,
}) => {
    const { t } = useTranslation();
    const { invites, isLoading, error, cancelInvite, resendInvite, pendingCount } = useTenantInvites();

    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    // Filter to only pending invites
    const pendingInvites = invites.filter(i => i.status === 'pending' && !i.isExpired);
    const displayedInvites = maxDisplay ? pendingInvites.slice(0, maxDisplay) : pendingInvites;
    const hasMore = maxDisplay && pendingInvites.length > maxDisplay;

    const getRoleIcon = (role: AgencyRole) => {
        switch (role) {
            case 'agency_owner':
                return <Crown size={14} className="text-yellow-500" />;
            case 'agency_admin':
                return <Shield size={14} className="text-purple-500" />;
            case 'agency_member':
                return <Users size={14} className="text-blue-500" />;
            case 'client':
                return <User size={14} className="text-green-500" />;
            default:
                return null;
        }
    };

    const handleCancel = async (inviteId: string) => {
        setLoadingAction(inviteId);
        setActionError(null);
        setOpenDropdown(null);

        try {
            await cancelInvite(inviteId);
            setActionSuccess(t('invite.cancelled', 'Invitación cancelada'));
            setTimeout(() => setActionSuccess(null), 2000);
        } catch (err: any) {
            setActionError(err.message || t('invite.cancelError', 'Error cancelando invitación'));
        } finally {
            setLoadingAction(null);
        }
    };

    const handleResend = async (inviteId: string) => {
        setLoadingAction(inviteId);
        setActionError(null);
        setOpenDropdown(null);

        try {
            await resendInvite(inviteId);
            setActionSuccess(t('invite.resent', 'Invitación reenviada'));
            setTimeout(() => setActionSuccess(null), 2000);
        } catch (err: any) {
            setActionError(err.message || t('invite.resendError', 'Error reenviando invitación'));
        } finally {
            setLoadingAction(null);
        }
    };

    if (isLoading) {
        return (
            <div className={`flex items-center justify-center p-8 ${className}`}>
                <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (pendingInvites.length === 0) {
        return null; // Don't show anything if no pending invites
    }

    return (
        <div className={`bg-card border border-border rounded-xl ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                    <Mail size={18} className="text-primary" />
                    <h3 className="font-semibold text-foreground">
                        {t('invite.pending', 'Invitaciones Pendientes')}
                    </h3>
                    <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                        {pendingCount}
                    </span>
                </div>
                {hasMore && onViewAll && (
                    <button
                        onClick={onViewAll}
                        className="text-sm text-primary hover:text-primary/80 font-medium"
                    >
                        {t('common.viewAll', 'Ver todas')}
                    </button>
                )}
            </div>

            {/* Alerts */}
            {actionError && (
                <div className="mx-4 mt-4 flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <AlertTriangle size={16} className="text-destructive flex-shrink-0" />
                    <p className="text-sm text-destructive">{actionError}</p>
                    <button
                        onClick={() => setActionError(null)}
                        className="ml-auto text-destructive hover:text-destructive/80"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {actionSuccess && (
                <div className="mx-4 mt-4 flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                    <p className="text-sm text-green-500">{actionSuccess}</p>
                </div>
            )}

            {/* Invite List */}
            <div className="divide-y divide-border">
                {displayedInvites.map((invite) => (
                    <div
                        key={invite.id}
                        className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            {/* Email avatar */}
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-muted to-muted-foreground/30 flex items-center justify-center text-foreground font-medium flex-shrink-0">
                                {invite.email[0].toUpperCase()}
                            </div>

                            <div className="min-w-0">
                                <p className="font-medium text-foreground truncate">
                                    {invite.email}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <div className="flex items-center gap-1">
                                        {getRoleIcon(invite.role)}
                                        <span className="text-xs text-muted-foreground">
                                            {AGENCY_ROLE_LABELS[invite.role]}
                                        </span>
                                    </div>
                                    <span className="text-muted-foreground">•</span>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Clock size={12} />
                                        {invite.daysUntilExpiration > 0 ? (
                                            <span>
                                                {t('invite.expiresIn', 'Expira en')} {invite.daysUntilExpiration}{' '}
                                                {invite.daysUntilExpiration === 1 ? t('common.day', 'día') : t('common.days', 'días')}
                                            </span>
                                        ) : (
                                            <span className="text-yellow-500">
                                                {t('invite.expirestoday', 'Expira hoy')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="relative flex-shrink-0">
                            {loadingAction === invite.id ? (
                                <Loader2 size={18} className="animate-spin text-muted-foreground" />
                            ) : (
                                <>
                                    <button
                                        onClick={() => setOpenDropdown(openDropdown === invite.id ? null : invite.id)}
                                        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                    >
                                        <MoreHorizontal size={18} />
                                    </button>

                                    {/* Dropdown */}
                                    {openDropdown === invite.id && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-10"
                                                onClick={() => setOpenDropdown(null)}
                                            />
                                            <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-popover border border-border rounded-xl shadow-xl py-1 animate-in fade-in-0 zoom-in-95">
                                                <button
                                                    onClick={() => handleResend(invite.id)}
                                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                                                >
                                                    <RefreshCw size={16} className="text-muted-foreground" />
                                                    {t('invite.resend', 'Reenviar')}
                                                </button>
                                                <button
                                                    onClick={() => handleCancel(invite.id)}
                                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                                                >
                                                    <X size={16} />
                                                    {t('invite.cancel', 'Cancelar')}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Show more */}
            {hasMore && (
                <div className="p-3 text-center border-t border-border">
                    <button
                        onClick={onViewAll}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        +{pendingInvites.length - displayedInvites.length} {t('common.more', 'más')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default PendingInvites;






