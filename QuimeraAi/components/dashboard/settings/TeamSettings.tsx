/**
 * TeamSettings
 * Modern team management UI with stats header, table layout, and enhanced invites
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Users,
    UserPlus,
    Mail,
    Shield,
    Crown,
    Loader2,
    AlertCircle,
    Edit,
    Clock,
    UserCheck,
    ShieldCheck,
} from 'lucide-react';
import { useTenant, useSafeTenant } from '../../../contexts/tenant';
import { useTenantMembers, useRoleDisplay } from '../../../hooks/useTenantMembers';
import { useTenantInvites } from '../../../hooks/useTenantInvites';
import { InviteMemberModal, PendingInvites } from '../tenant';
import EditMemberModal from '../tenant/EditMemberModal';
import { TenantMembership, AgencyRole } from '../../../types/multiTenant';

const TeamSettings: React.FC = () => {
    const { t } = useTranslation();
    const { currentTenant, currentMembership } = useSafeTenant();
    const {
        members,
        isLoading: membersLoading,
        canManageMembers,
        canInviteMembers: canInvite
    } = useTenantMembers();
    const { invites, isLoading: invitesLoading } = useTenantInvites();
    const { getRoleLabel, getRoleColor } = useRoleDisplay();

    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<TenantMembership | null>(null);
    const [error, setError] = useState<string | null>(null);

    const getRoleIcon = (role: AgencyRole) => {
        if (role === 'agency_owner') return <Crown size={14} className="text-yellow-500" />;
        if (role === 'agency_admin') return <ShieldCheck size={14} className="text-blue-500" />;
        return <UserCheck size={14} className="text-muted-foreground" />;
    };

    const pendingInvites = invites.filter(inv => inv.status === 'pending');

    // Count by role
    const ownerCount = members.filter(m => m.role === 'agency_owner').length;
    const adminCount = members.filter(m => m.role === 'agency_admin').length;
    const memberCount = members.filter(m => m.role !== 'agency_owner' && m.role !== 'agency_admin').length;

    return (
        <div className="space-y-6">
            {/* Error Alert */}
            {error && (
                <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive">
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

            {/* ─── Stats Header ─── */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Users size={20} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">
                                {t('team.members', 'Miembros del Equipo')}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {t('team.membersDescription', 'Gestiona quién tiene acceso a este workspace y sus roles.')}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsInviteModalOpen(true)}
                        disabled={!canInvite}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <UserPlus size={18} />
                        {t('team.invite', 'Invitar')}
                    </button>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-4 divide-x divide-border">
                    {[
                        { label: t('team.totalMembers', 'Total'), value: members.length, icon: Users, color: 'text-primary' },
                        { label: t('team.owners', 'Propietarios'), value: ownerCount, icon: Crown, color: 'text-yellow-500' },
                        { label: t('team.admins', 'Admins'), value: adminCount, icon: Shield, color: 'text-blue-500' },
                        { label: t('team.pending', 'Pendientes'), value: pendingInvites.length, icon: Clock, color: 'text-orange-500' },
                    ].map((stat) => (
                        <div key={stat.label} className="p-4 text-center">
                            <stat.icon size={16} className={`mx-auto mb-1.5 ${stat.color}`} />
                            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                            <p className="text-xs text-muted-foreground">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ─── Members Table ─── */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                {membersLoading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="animate-spin mx-auto mb-3 text-primary" size={32} />
                        <p className="text-muted-foreground">
                            {t('common.loading', 'Cargando equipo...')}
                        </p>
                    </div>
                ) : members.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4">
                            <Users size={36} className="text-primary/60" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground mb-2">
                            {t('team.noMembersTitle', 'Tu equipo está vacío')}
                        </h3>
                        <p className="text-muted-foreground max-w-sm mx-auto mb-4">
                            {t('team.noMembers', 'Invita a colegas para colaborar en proyectos y gestionar clientes.')}
                        </p>
                        {canInvite && (
                            <button
                                onClick={() => setIsInviteModalOpen(true)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all"
                            >
                                <UserPlus size={16} />
                                {t('team.inviteFirst', 'Invitar al primer miembro')}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border bg-secondary/30">
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        {t('team.member', 'Miembro')}
                                    </th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        {t('team.role', 'Rol')}
                                    </th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                                        {t('team.department', 'Departamento')}
                                    </th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        {t('team.actions', 'Acciones')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {members.map((member) => (
                                    <tr
                                        key={member.id}
                                        className="group hover:bg-secondary/20 transition-colors"
                                    >
                                        {/* Avatar + Name + Email */}
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="relative flex-shrink-0">
                                                    {member.userPhotoURL ? (
                                                        <img
                                                            src={member.userPhotoURL}
                                                            alt={member.userName || member.userEmail || ''}
                                                            className="w-9 h-9 rounded-lg object-cover border border-border"
                                                        />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center text-sm font-bold text-muted-foreground border border-border">
                                                            {(member.userName || member.userEmail || '?').charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    {member.userId === currentMembership?.userId && (
                                                        <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[8px] font-bold px-1 py-0.5 rounded-full border-2 border-card">
                                                            TÚ
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-foreground truncate text-sm">
                                                        {member.userName || t('team.unnamed', 'Sin nombre')}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                                        <Mail size={10} />
                                                        {member.userEmail}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Role badge */}
                                        <td className="px-5 py-3.5">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border ${getRoleColor(member.role)}`}>
                                                {getRoleIcon(member.role)}
                                                {getRoleLabel(member.role)}
                                            </span>
                                        </td>

                                        {/* Department + Title */}
                                        <td className="px-5 py-3.5 hidden md:table-cell">
                                            <div className="text-sm text-muted-foreground">
                                                {member.department && (
                                                    <span className="text-xs bg-secondary/50 px-2 py-0.5 rounded-md mr-2">
                                                        {member.department}
                                                    </span>
                                                )}
                                                {member.title && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {member.title}
                                                    </span>
                                                )}
                                                {!member.department && !member.title && (
                                                    <span className="text-xs text-muted-foreground/50">—</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-5 py-3.5 text-right">
                                            {canManageMembers && member.role !== 'agency_owner' && member.userId !== currentMembership?.userId ? (
                                                <button
                                                    onClick={() => setEditingMember(member)}
                                                    className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all"
                                                >
                                                    <Edit size={12} />
                                                    {t('team.manage', 'Gestionar')}
                                                </button>
                                            ) : (
                                                <span className="text-xs text-muted-foreground/40">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ─── Pending Invites ─── */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                            <Mail size={20} className="text-orange-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                                {t('team.pendingInvites', 'Invitaciones Pendientes')}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {pendingInvites.length > 0
                                    ? t('team.pendingCount', '{{count}} invitación(es) esperando respuesta', { count: pendingInvites.length })
                                    : t('team.noPending', 'No hay invitaciones pendientes')
                                }
                            </p>
                        </div>
                    </div>
                    {pendingInvites.length > 0 && (
                        <span className="px-2.5 py-1 text-xs font-bold bg-orange-500/10 text-orange-500 rounded-full">
                            {pendingInvites.length}
                        </span>
                    )}
                </div>

                <div className="p-5">
                    {invitesLoading ? (
                        <div className="py-6 text-center">
                            <Loader2 className="animate-spin mx-auto mb-2 text-primary" size={24} />
                            <p className="text-sm text-muted-foreground">{t('common.loading', 'Cargando...')}</p>
                        </div>
                    ) : pendingInvites.length === 0 ? (
                        <div className="py-6 text-center">
                            <div className="w-14 h-14 rounded-xl bg-secondary/50 flex items-center justify-center mx-auto mb-3">
                                <Mail size={24} className="text-muted-foreground/50" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {t('team.noPendingInvites', 'Todas las invitaciones han sido respondidas')}
                            </p>
                        </div>
                    ) : (
                        <PendingInvites />
                    )}
                </div>
            </div>

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
                }}
            />
        </div>
    );
};

export default TeamSettings;
