/**
 * EditMemberModal
 * Modal for editing an existing team member's role and details
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    X,
    User,
    Crown,
    Shield,
    Users,
    Save,
    AlertCircle,
    Loader2,
    Briefcase,
    Building,
    Trash2
} from 'lucide-react';
import { useTenant } from '../../../contexts/tenant';
import {
    AgencyRole,
    AGENCY_ROLE_LABELS,
    AGENCY_ROLE_DESCRIPTIONS,
    TenantMembership,
    getMembershipId
} from '../../../types/multiTenant';
import { db, doc, updateDoc, deleteDoc, serverTimestamp } from '../../../firebase';

interface EditMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    member: TenantMembership | null;
    onSuccess?: () => void;
}

const EditMemberModal: React.FC<EditMemberModalProps> = ({
    isOpen,
    onClose,
    member,
    onSuccess,
}) => {
    const { t } = useTranslation();
    const { currentTenant, currentRole } = useTenant();

    const [selectedRole, setSelectedRole] = useState<AgencyRole>('agency_member');
    const [title, setTitle] = useState('');
    const [department, setDepartment] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);

    useEffect(() => {
        if (member) {
            setSelectedRole(member.role);
            setTitle(member.title || '');
            setDepartment(member.department || '');
            setIsDeleteConfirm(false);
            setError(null);
        }
    }, [member]);

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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!member || !currentTenant) return;

        setIsLoading(true);
        setError(null);

        try {
            const membershipRef = doc(db, 'tenants', currentTenant.id, 'members', member.userId);

            await updateDoc(membershipRef, {
                role: selectedRole,
                title: title,
                department: department,
                updatedAt: serverTimestamp(),
                updatedBy: currentTenant.ownerUserId // simplified for now
            });

            onSuccess?.();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(t('team.errors.updateFailed', 'Error al actualizar miembro'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveMember = async () => {
        if (!member || !currentTenant) return;

        setIsLoading(true);
        setError(null);

        try {
            const membershipRef = doc(db, 'tenants', currentTenant.id, 'members', member.userId);
            await deleteDoc(membershipRef);

            // Note: Ideally we should also remove from user's tenant list, but that requires Cloud Functions
            // or client-side batch updates. For now, we just remove membership record.

            onSuccess?.();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(t('team.errors.removeFailed', 'Error al eliminar miembro'));
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen || !member) return null;

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
                            {member.userPhotoURL ? (
                                <img src={member.userPhotoURL} alt={member.userName} className="w-10 h-10 rounded-full object-cover border border-border" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border border-border">
                                    <User size={20} className="text-muted-foreground" />
                                </div>
                            )}
                            <div>
                                <h2 className="text-lg font-bold text-foreground">
                                    {member.userName || member.userEmail}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {member.userEmail}
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
                    <form onSubmit={handleSave} className="p-6 space-y-6">

                        {/* Title & Department */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    {t('team.jobTitle', 'Cargo')}
                                </label>
                                <div className="relative">
                                    <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="e.g. Designer"
                                        className="w-full pl-9 pr-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    {t('team.department', 'Departamento')}
                                </label>
                                <div className="relative">
                                    <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={department}
                                        onChange={e => setDepartment(e.target.value)}
                                        placeholder="e.g. Marketing"
                                        className="w-full pl-9 pr-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Role Selection */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                {t('team.role', 'Rol')}
                            </label>
                            <div className="space-y-2">
                                {availableRoles.map((role) => (
                                    <button
                                        key={role}
                                        type="button"
                                        onClick={() => setSelectedRole(role)}
                                        className={`
                                            w-full flex items-start gap-3 p-4 rounded-xl border transition-all text-left
                                            ${selectedRole === role
                                                ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                                                : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                                            }
                                        `}
                                        disabled={isLoading}
                                    >
                                        <div className="mt-0.5">{getRoleIcon(role)}</div>
                                        <div>
                                            <p className="font-medium text-foreground text-sm">
                                                {AGENCY_ROLE_LABELS[role]}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {AGENCY_ROLE_DESCRIPTIONS[role]}
                                            </p>
                                        </div>
                                        <div
                                            className={`
                                                w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ml-auto
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

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                                <AlertCircle size={18} className="text-destructive flex-shrink-0" />
                                <p className="text-sm text-destructive">{error}</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-border mt-6">
                            {!isDeleteConfirm ? (
                                <button
                                    type="button"
                                    onClick={() => setIsDeleteConfirm(true)}
                                    className="text-sm text-destructive hover:text-destructive/80 font-medium px-2 py-2 rounded hover:bg-destructive/10 transition-colors"
                                >
                                    {t('team.removeMember', 'Eliminar Miembro')}
                                </button>
                            ) : (
                                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                    <span className="text-xs text-muted-foreground">¿Seguro?</span>
                                    <button
                                        type="button"
                                        onClick={handleRemoveMember}
                                        disabled={isLoading}
                                        className="text-xs bg-destructive text-destructive-foreground px-3 py-1.5 rounded-lg hover:bg-destructive/90 transition-colors font-medium"
                                    >
                                        Si, eliminar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsDeleteConfirm(false)}
                                        className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
                                    disabled={isLoading}
                                >
                                    {t('common.cancel', 'Cancelar')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            {t('common.saving', 'Guardando...')}
                                        </>
                                    ) : (
                                        <>
                                            <Save size={16} />
                                            {t('common.saveChanges', 'Guardar Cambios')}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditMemberModal;
