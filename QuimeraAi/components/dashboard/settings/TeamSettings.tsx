/**
 * TeamSettings
 * Team management UI with members list, invitations, and invite modal
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Users,
    UserPlus,
    Mail,
    Shield,
    MoreVertical,
    Trash2,
    Edit,
    Crown,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { useTenant, useSafeTenant } from '../../../contexts/tenant';
import { useTenantMembers, useRoleDisplay } from '../../../hooks/useTenantMembers';
import { useTenantInvites } from '../../../hooks/useTenantInvites';
import { InviteMemberModal, PendingInvites } from '../tenant';
import EditMemberModal from '../tenant/EditMemberModal';
import { TenantMembership, AgencyRole } from '../../../types/multiTenant';

const TeamSettings: React.FC = () => {
    const { t } = useTranslation();
    const { currentTenant, currentMembership } = useSafeTenant(); // Removed canPerformInTenant
    const {
        members,
        isLoading: membersLoading,
        canManageMembers,
        canInviteMembers: canInvite
    } = useTenantMembers();
    const { invites, isLoading: invitesLoading } = useTenantInvites(); // Removed actions as PendingInvites handles them
    const { getRoleLabel, getRoleColor } = useRoleDisplay();

    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<TenantMembership | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Removed manual permission checks

    const getRoleIcon = (role: AgencyRole) => {
        if (role === 'agency_owner') return <Crown size={14} className="text-yellow-500" />;
        if (role === 'agency_admin') return <Shield size={14} className="text-blue-500" />;
        return null; // Regular members
    };

    const pendingInvites = invites.filter(inv => inv.status === 'pending');

    return (
        <div className="space-y-8">
            {/* Error Alert */}
            {error && (
                <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive">
                    <AlertCircle size={18} />
                    <span className="text-sm">{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="ml-auto text-xs hover:underline"
                    >
                        {t('common.dismiss', 'Descartar')}
                    </button>
                </div>
            )}

            {/* Team Members Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <Users size={24} className="text-primary" />
                            {t('team.members', 'Miembros del Equipo')}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t('team.membersDescription', 'Gestiona quién tiene acceso a este workspace y sus roles.')}
                        </p>
                    </div>

                    <button
                        onClick={() => setIsInviteModalOpen(true)}
                        disabled={!canInvite}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <UserPlus size={18} />
                        {t('team.invite', 'Invitar')}
                    </button>
                </div>

                {membersLoading ? (
                    <div className="p-12 text-center border border-border rounded-2xl bg-card/50">
                        <Loader2 className="animate-spin mx-auto mb-3 text-primary" size={32} />
                        <p className="text-muted-foreground">
                            {t('common.loading', 'Cargando equipo...')}
                        </p>
                    </div>
                ) : members.length === 0 ? (
                    <div className="p-12 text-center border border-border rounded-2xl bg-card/50">
                        <Users size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
                        <h3 className="text-lg font-medium text-foreground mb-2">
                            {t('team.noMembersTitle', 'Tu equipo está vacío')}
                        </h3>
                        <p className="text-muted-foreground max-w-sm mx-auto">
                            {t('team.noMembers', 'Invita a colegas para colaborar en proyectos y gestionar clientes.')}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {members.map((member) => (
                            <div
                                key={member.id}
                                className="group relative bg-card border border-border rounded-2xl p-5 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 flex flex-col"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="relative">
                                        {member.userPhotoURL ? (
                                            <img
                                                src={member.userPhotoURL}
                                                alt={member.userName || member.userEmail || ''}
                                                className="w-12 h-12 rounded-xl object-cover border border-border group-hover:border-primary/50 transition-colors"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center text-xl font-bold text-muted-foreground border border-border group-hover:border-primary/50 transition-colors">
                                                {(member.userName || member.userEmail || '?').charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        {member.userId === currentMembership?.userId && (
                                            <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-background">
                                                {t('team.you', 'TÚ')}
                                            </span>
                                        )}
                                    </div>
                                    <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${getRoleColor(member.role)}`}>
                                        {getRoleLabel(member.role)}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <h3 className="font-bold text-foreground truncate text-base">
                                            {member.userName || t('team.unnamed', 'Sin nombre')}
                                        </h3>
                                        {getRoleIcon(member.role)}
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5 mb-2">
                                        <Mail size={12} />
                                        {member.userEmail}
                                    </p>

                                    {(member.title || member.department) && (
                                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
                                            {member.title && (
                                                <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md">
                                                    {member.title}
                                                </span>
                                            )}
                                            {member.department && (
                                                <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md">
                                                    {member.department}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {canManageMembers && member.role !== 'agency_owner' && member.userId !== currentMembership?.userId && (
                                    <div className="mt-4 pt-3 border-t border-border">
                                        <button
                                            onClick={() => setEditingMember(member)}
                                            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                        >
                                            <Edit size={14} />
                                            {t('team.manage', 'Gestionar Miembro')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pending Invites Section */}
            {pendingInvites.length > 0 && (
                <div className="pt-6 border-t border-border">
                    <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                        <Mail size={20} className="text-muted-foreground" />
                        {t('team.pendingInvites', 'Invitaciones Pendientes')}
                    </h3>
                    <PendingInvites />
                </div>
            )}

            {/* Modals */}
            <InviteMemberModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
            />

            <EditMemberModal
                isOpen={!!editingMember}
                member={editingMember}
                onClose={() => setEditingMember(null)}
                onSuccess={() => {
                    setEditingMember(null);
                    // Refresh handled by real-time listener
                }}
            />
        </div>
    );
};

export default TeamSettings;






