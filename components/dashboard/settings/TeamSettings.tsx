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
import { TenantMembership, AgencyRole } from '../../../types/multiTenant';

const TeamSettings: React.FC = () => {
    const { t } = useTranslation();
    const { currentTenant, currentMembership, removeMember, updateMemberRole, canPerformInTenant } = useSafeTenant();
    const { members, isLoading: membersLoading } = useTenantMembers();
    const { invites, isLoading: invitesLoading, cancelInvite, resendInvite } = useTenantInvites();
    const { getRoleLabel, getRoleColor } = useRoleDisplay();
    
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<TenantMembership | null>(null);
    const [isRemoving, setIsRemoving] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const canManageMembers = canPerformInTenant('canManageMembers');
    const canInvite = canPerformInTenant('canInviteMembers');
    
    // Debug: Log current state
    console.log('[TeamSettings] Debug:', {
        currentTenant: currentTenant?.id,
        currentMembership: currentMembership ? {
            role: currentMembership.role,
            permissions: currentMembership.permissions,
        } : null,
        canManageMembers,
        canInvite,
        membersCount: members.length,
    });
    
    const handleRemoveMember = async (member: TenantMembership) => {
        if (!currentTenant) return;
        
        // Can't remove owner
        if (member.role === 'agency_owner') {
            setError(t('team.cannotRemoveOwner', 'No puedes eliminar al propietario'));
            return;
        }
        
        // Can't remove yourself
        if (member.userId === currentMembership?.userId) {
            setError(t('team.cannotRemoveSelf', 'No puedes eliminarte a ti mismo'));
            return;
        }
        
        if (!confirm(t('team.confirmRemove', '¿Estás seguro de eliminar a este miembro?'))) {
            return;
        }
        
        setIsRemoving(member.id);
        setError(null);
        
        try {
            await removeMember(member.userId);
        } catch (err: any) {
            setError(err.message || 'Error eliminando miembro');
        } finally {
            setIsRemoving(null);
        }
    };
    
    const handleRoleChange = async (member: TenantMembership, newRole: AgencyRole) => {
        if (!currentTenant) return;
        
        // Can't change owner role
        if (member.role === 'agency_owner') {
            setError(t('team.cannotChangeOwnerRole', 'No puedes cambiar el rol del propietario'));
            return;
        }
        
        try {
            await updateMemberRole(member.userId, newRole);
            setSelectedMember(null);
        } catch (err: any) {
            setError(err.message || 'Error actualizando rol');
        }
    };
    
    const getRoleIcon = (role: AgencyRole) => {
        if (role === 'agency_owner') return <Crown size={14} className="text-yellow-500" />;
        if (role === 'agency_admin') return <Shield size={14} className="text-blue-500" />;
        return null;
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
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-6 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Users size={20} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">
                                {t('team.members', 'Miembros del Equipo')}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {members.length} {t('team.membersCount', 'miembros')}
                            </p>
                        </div>
                    </div>
                    
                    {/* Always show button for now - debug mode */}
                    <button
                        onClick={() => setIsInviteModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                        title={canInvite ? 'Tienes permiso' : 'Sin permiso (debug)'}
                    >
                        <UserPlus size={18} />
                        {t('team.invite', 'Invitar')}
                        {!canInvite && <span className="text-xs opacity-70">(debug)</span>}
                    </button>
                </div>
                
                <div className="divide-y divide-border">
                    {membersLoading ? (
                        <div className="p-8 text-center">
                            <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                            <p className="text-muted-foreground text-sm">
                                {t('common.loading', 'Cargando...')}
                            </p>
                        </div>
                    ) : members.length === 0 ? (
                        <div className="p-8 text-center">
                            <Users size={40} className="mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">
                                {t('team.noMembers', 'No hay miembros todavía')}
                            </p>
                        </div>
                    ) : (
                        members.map((member) => (
                            <div 
                                key={member.id}
                                className="p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                                        {(member.displayName || member.email || '?').charAt(0).toUpperCase()}
                                    </div>
                                    
                                    {/* Info */}
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-foreground">
                                                {member.displayName || t('team.unnamed', 'Sin nombre')}
                                            </span>
                                            {getRoleIcon(member.role)}
                                            {member.userId === currentMembership?.userId && (
                                                <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                                                    {t('team.you', 'Tú')}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Mail size={14} />
                                            {member.email}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    {/* Role Badge */}
                                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getRoleColor(member.role)}`}>
                                        {getRoleLabel(member.role)}
                                    </span>
                                    
                                    {/* Actions */}
                                    {canManageMembers && member.role !== 'agency_owner' && member.userId !== currentMembership?.userId && (
                                        <div className="relative">
                                            <button
                                                onClick={() => setSelectedMember(selectedMember?.id === member.id ? null : member)}
                                                className="p-2 hover:bg-secondary rounded-lg transition-colors"
                                            >
                                                <MoreVertical size={16} className="text-muted-foreground" />
                                            </button>
                                            
                                            {/* Dropdown Menu */}
                                            {selectedMember?.id === member.id && (
                                                <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-10">
                                                    <div className="p-2">
                                                        <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase">
                                                            {t('team.changeRole', 'Cambiar rol')}
                                                        </p>
                                                        {(['agency_admin', 'agency_member', 'client'] as AgencyRole[]).map((role) => (
                                                            <button
                                                                key={role}
                                                                onClick={() => handleRoleChange(member, role)}
                                                                className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-secondary transition-colors ${
                                                                    member.role === role ? 'text-primary font-medium' : 'text-foreground'
                                                                }`}
                                                            >
                                                                {getRoleLabel(role)}
                                                            </button>
                                                        ))}
                                                        <div className="border-t border-border my-2" />
                                                        <button
                                                            onClick={() => handleRemoveMember(member)}
                                                            disabled={isRemoving === member.id}
                                                            className="w-full text-left px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded transition-colors flex items-center gap-2"
                                                        >
                                                            {isRemoving === member.id ? (
                                                                <Loader2 size={14} className="animate-spin" />
                                                            ) : (
                                                                <Trash2 size={14} />
                                                            )}
                                                            {t('team.remove', 'Eliminar')}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
            
            {/* Pending Invites Section */}
            {pendingInvites.length > 0 && (
                <PendingInvites 
                    invites={pendingInvites}
                    onCancel={cancelInvite}
                    onResend={resendInvite}
                    isLoading={invitesLoading}
                />
            )}
            
            {/* Invite Modal */}
            <InviteMemberModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
            />
            
            {/* Click outside to close dropdown */}
            {selectedMember && (
                <div 
                    className="fixed inset-0 z-0"
                    onClick={() => setSelectedMember(null)}
                />
            )}
        </div>
    );
};

export default TeamSettings;






