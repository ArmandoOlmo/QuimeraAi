/**
 * TeamSettings
 * Workspace team management with member access, role controls, and invites.
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
import type { LucideIcon } from 'lucide-react';
import { useSafeTenant } from '../../../contexts/tenant';
import { useTenantMembers, useRoleDisplay } from '../../../hooks/useTenantMembers';
import { useTenantInvites } from '../../../hooks/useTenantInvites';
import { InviteMemberModal, PendingInvites } from '../tenant';
import EditMemberModal from '../tenant/EditMemberModal';
import { TenantMembership, AgencyRole } from '../../../types/multiTenant';
import { settingsPanelClass } from './SettingsStatCard';

const TeamMetric = ({
    label,
    value,
    icon: Icon,
    tone = 'default',
}: {
    label: string;
    value: React.ReactNode;
    icon: LucideIcon;
    tone?: 'default' | 'accent' | 'warning';
}) => {
    const toneClass = tone === 'warning'
        ? 'text-q-warning'
        : tone === 'accent'
            ? 'text-q-accent'
            : 'text-foreground';

    return (
        <div className="rounded-lg border border-q-border/60 bg-q-bg/50 p-3.5">
            <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-q-text-muted">{label}</span>
                <Icon size={15} className={tone === 'default' ? 'text-q-text-muted' : toneClass} />
            </div>
            <div className={`mt-3 text-2xl font-semibold leading-none ${toneClass}`}>
                {value}
            </div>
        </div>
    );
};

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
        if (role === 'agency_owner') return <Crown size={14} className="text-q-accent" />;
        if (role === 'agency_admin') return <ShieldCheck size={14} className="text-q-accent" />;
        return <UserCheck size={14} className="text-q-text-muted" />;
    };

    const pendingInvites = invites.filter(inv => inv.status === 'pending');
    const ownerCount = members.filter(m => m.role === 'agency_owner').length;
    const adminCount = members.filter(m => m.role === 'agency_admin').length;
    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-q-border bg-q-surface">
                            <Users size={20} className="quimera-dashboard-header-icon" strokeWidth={2} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-q-accent">
                                {t('settings.team', 'Equipo')}
                            </p>
                            <h2 className="text-2xl font-semibold leading-tight text-foreground">
                                {t('team.workspaceTeamTitle', 'Equipo del workspace')}
                            </h2>
                        </div>
                    </div>
                    <p className="mt-3 text-sm text-q-text-muted">
                        {t('team.workspaceTeamDescription', 'Controla quién puede entrar, qué rol tiene cada persona y qué invitaciones siguen pendientes.')}
                    </p>
                </div>

                <button
                    onClick={() => setIsInviteModalOpen(true)}
                    disabled={!canInvite}
                    className="quimera-guide-cta inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <UserPlus size={17} />
                    {t('team.invite', 'Invitar')}
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
                    <AlertCircle size={18} />
                    <span className="text-sm">{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="ml-auto text-xs font-semibold hover:underline"
                    >
                        {t('common.dismiss', 'Descartar')}
                    </button>
                </div>
            )}

            <div className={settingsPanelClass}>
                <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_28rem]">
                    <div className="border-b border-q-border p-5 lg:border-b-0 lg:border-r lg:p-6">
                        <p className="text-xs font-semibold uppercase tracking-wide text-q-text-muted">
                            {t('team.currentWorkspace', 'Workspace actual')}
                        </p>
                        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <h3 className="truncate text-xl font-semibold text-foreground">
                                    {currentTenant?.name || t('settings.workspace', 'Workspace')}
                                </h3>
                                <p className="mt-1 text-sm text-q-text-muted">
                                    {currentMembership?.role
                                        ? t('team.yourRoleInWorkspace', 'Tu rol: {{role}}', { role: getRoleLabel(currentMembership.role) })
                                        : t('team.roleNotAvailable', 'Rol no disponible')}
                                </p>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-lg border border-q-border bg-q-bg/60 px-3 py-2 text-xs font-semibold text-q-text-muted">
                                <Shield size={14} className="text-q-accent" />
                                {canManageMembers
                                    ? t('team.memberManagementEnabled', 'Gestión habilitada')
                                    : t('team.readOnlyAccess', 'Solo lectura')}
                            </div>
                        </div>
                        <div className="mt-5 rounded-lg border border-q-border/60 bg-q-bg/40 p-4">
                            <p className="text-sm font-medium text-foreground">
                                {t('team.accessPolicyTitle', 'Acceso por roles')}
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-q-text-muted">
                                {t('team.accessPolicyDescription', 'Los propietarios y administradores pueden gestionar miembros. Los colaboradores mantienen acceso operativo sin control administrativo del workspace.')}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-5 lg:p-6">
                        <TeamMetric
                            label={t('team.totalMembers', 'Total')}
                            value={members.length}
                            icon={Users}
                        />
                        <TeamMetric
                            label={t('team.owners', 'Propietarios')}
                            value={ownerCount}
                            icon={Crown}
                            tone="accent"
                        />
                        <TeamMetric
                            label={t('team.admins', 'Admins')}
                            value={adminCount}
                            icon={Shield}
                            tone="accent"
                        />
                        <TeamMetric
                            label={t('team.pending', 'Pendientes')}
                            value={pendingInvites.length}
                            icon={Clock}
                            tone="warning"
                        />
                    </div>
                </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
                <div className={settingsPanelClass}>
                    <div className="flex flex-col gap-3 border-b border-q-border p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">
                                {t('team.members', 'Miembros del equipo')}
                            </h3>
                            <p className="text-sm text-q-text-muted">
                                {t('team.membersDescription', 'Gestiona quién tiene acceso a este workspace y sus roles.')}
                            </p>
                        </div>
                        <span className="inline-flex w-fit items-center rounded-full border border-q-border bg-q-bg/60 px-3 py-1 text-xs font-semibold text-q-text-muted">
                            {t('team.activeMembersCount', '{{count}} activos', { count: members.length })}
                        </span>
                    </div>

                    {membersLoading ? (
                        <div className="p-12 text-center">
                            <Loader2 className="mx-auto mb-3 animate-spin quimera-status-card-accent-text" size={32} />
                            <p className="text-q-text-muted">
                                {t('common.loading', 'Cargando equipo...')}
                            </p>
                        </div>
                    ) : members.length === 0 ? (
                        <div className="p-12 text-center">
                            <Users size={40} className="mx-auto mb-4 text-q-text-muted/40" strokeWidth={1.5} />
                            <h3 className="mb-2 text-lg font-medium text-foreground">
                                {t('team.noMembersTitle', 'Tu equipo está vacío')}
                            </h3>
                            <p className="mx-auto mb-5 max-w-sm text-q-text-muted">
                                {t('team.noMembers', 'Invita a colegas para colaborar en proyectos y gestionar clientes.')}
                            </p>
                            {canInvite && (
                                <button
                                    onClick={() => setIsInviteModalOpen(true)}
                                    className="quimera-guide-cta inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all"
                                >
                                    <UserPlus size={16} />
                                    {t('team.inviteFirst', 'Invitar al primer miembro')}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px]">
                                <thead>
                                    <tr className="border-b border-q-border bg-secondary/30">
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-q-text-muted">
                                            {t('team.member', 'Miembro')}
                                        </th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-q-text-muted">
                                            {t('team.role', 'Rol')}
                                        </th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-q-text-muted">
                                            {t('team.department', 'Departamento')}
                                        </th>
                                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-q-text-muted">
                                            {t('team.actions', 'Acciones')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {members.map((member) => (
                                        <tr
                                            key={member.id}
                                            className="hover:bg-secondary/20 transition-colors"
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div className="relative flex-shrink-0">
                                                        {member.userPhotoURL ? (
                                                            <img
                                                                src={member.userPhotoURL}
                                                                alt={member.userName || member.userEmail || ''}
                                                                className="h-10 w-10 rounded-lg border border-q-border object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-q-border bg-secondary text-sm font-bold text-q-text-muted">
                                                                {(member.userName || member.userEmail || '?').charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                        {member.userId === currentMembership?.userId && (
                                                            <span className="absolute -bottom-1 -right-1 rounded-full border-2 border-card bg-[color-mix(in_srgb,var(--quimera-status-accent-from)_85%,transparent)] px-1 py-0.5 text-[8px] font-bold text-white">
                                                                TÚ
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium text-foreground">
                                                            {member.userName || t('team.unnamed', 'Sin nombre')}
                                                        </p>
                                                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-q-text-muted">
                                                            <Mail size={10} />
                                                            {member.userEmail}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${getRoleColor(member.role)}`}>
                                                    {getRoleIcon(member.role)}
                                                    {getRoleLabel(member.role)}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex flex-wrap items-center gap-2 text-sm text-q-text-muted">
                                                    {member.department && (
                                                        <span className="rounded-md bg-secondary/50 px-2 py-0.5 text-xs">
                                                            {member.department}
                                                        </span>
                                                    )}
                                                    {member.title && (
                                                        <span className="text-xs text-q-text-muted">
                                                            {member.title}
                                                        </span>
                                                    )}
                                                    {!member.department && !member.title && (
                                                        <span className="text-xs text-q-text-muted/50">-</span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-5 py-4 text-right">
                                                {canManageMembers && member.role !== 'agency_owner' && member.userId !== currentMembership?.userId ? (
                                                    <button
                                                        onClick={() => setEditingMember(member)}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-q-border bg-q-bg/60 px-3 py-1.5 text-xs font-semibold text-q-text-muted transition-all hover:border-q-accent/50 hover:text-foreground"
                                                    >
                                                        <Edit size={12} />
                                                        {t('team.manage', 'Gestionar')}
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-q-text-muted/40">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className={settingsPanelClass}>
                    <div className="border-b border-q-border p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-q-warning/10 text-q-warning">
                                    <Mail size={18} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground">
                                        {t('team.pendingInvites', 'Invitaciones pendientes')}
                                    </h3>
                                    <p className="mt-1 text-sm text-q-text-muted">
                                        {pendingInvites.length > 0
                                            ? t('team.pendingCount', '{{count}} invitación(es) esperando respuesta', { count: pendingInvites.length })
                                            : t('team.noPending', 'No hay invitaciones pendientes')
                                        }
                                    </p>
                                </div>
                            </div>
                            {pendingInvites.length > 0 && (
                                <span className="rounded-full bg-q-warning/10 px-2.5 py-1 text-xs font-bold text-q-warning">
                                    {pendingInvites.length}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="p-5">
                        {invitesLoading ? (
                            <div className="py-8 text-center">
                                <Loader2 className="mx-auto mb-2 animate-spin quimera-status-card-accent-text" size={24} />
                                <p className="text-sm text-q-text-muted">{t('common.loading', 'Cargando...')}</p>
                            </div>
                        ) : pendingInvites.length === 0 ? (
                            <div className="py-8 text-center">
                                <Mail size={32} className="mx-auto mb-3 text-q-text-muted/40" strokeWidth={1.5} />
                                <p className="text-sm text-q-text-muted">
                                    {t('team.noPendingInvites', 'Todas las invitaciones han sido respondidas')}
                                </p>
                            </div>
                        ) : (
                            <PendingInvites />
                        )}
                    </div>
                </div>
            </div>

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
