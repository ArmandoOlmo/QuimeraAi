import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useAdmin } from '../../../contexts/admin';
import { UserRole, UserDocument } from '../../../types';
import { ROLE_LABELS, ROLE_COLORS, ROLE_DESCRIPTIONS, isOwner } from '../../../constants/roles';
import AdminProfileView from './AdminProfileView';
import {
    ArrowLeft, Users, Plus, Crown, Shield, UserCog,
    Eye, Trash2, AlertCircle
} from 'lucide-react';
import DashboardSidebar from '../DashboardSidebar';

interface AdminManagementProps {
    onBack: () => void;
}

const AdminManagement: React.FC<AdminManagementProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const { userPermissions, isUserOwner, userDocument } = useAuth();
    const { allUsers, fetchAllUsers, updateUserRole, deleteUserRecord, createAdmin } = useAdmin();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [newAdminName, setNewAdminName] = useState('');
    const [newAdminRole, setNewAdminRole] = useState<UserRole>('admin');
    const [errorMessage, setErrorMessage] = useState('');
    const [selectedUser, setSelectedUser] = useState<UserDocument | null>(null);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                await fetchAllUsers();
            } catch (error: any) {
                console.error("Error fetching users:", error);
                setErrorMessage(t('superadmin.admins.errorLoading', 'Error al cargar usuarios: ') + (error.message || t('common.unknownError', 'Error desconocido')));
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Filtrar solo administradores (no usuarios comunes)
    const admins = allUsers.filter(u =>
        ['owner', 'superadmin', 'admin', 'manager'].includes(u.role || 'user') || isOwner(u.email)
    );

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'owner': return <Crown size={20} className="text-yellow-500" />;
            case 'superadmin': return <Shield size={20} className="text-purple-400" />;
            case 'admin': return <UserCog size={20} className="text-blue-400" />;
            case 'manager': return <Eye size={20} className="text-green-400" />;
            default: return <Users size={20} />;
        }
    };

    if (selectedUser) {
        return (
            <AdminProfileView
                user={selectedUser}
                onBack={() => {
                    setSelectedUser(null);
                    // Refresh data when returning
                    fetchAllUsers();
                }}
            />
        );
    }

    const handleCreateAdmin = async () => {
        setErrorMessage('');

        if (!newAdminEmail || !newAdminName) {
            setErrorMessage(t('superadmin.admins.fillAllFields', 'Por favor completa todos los campos'));
            return;
        }

        try {
            await createAdmin(newAdminEmail, newAdminName, newAdminRole);
            setShowCreateModal(false);
            setNewAdminEmail('');
            setNewAdminName('');
            setNewAdminRole('admin');
        } catch (error: any) {
            setErrorMessage(error.message || t('superadmin.admins.createError', 'Error al crear administrador'));
        }
    };

    const handleRoleChange = async (userId: string, newRole: UserRole) => {
        try {
            await updateUserRole(userId, newRole);
        } catch (error: any) {
            alert(error.message || t('superadmin.admins.roleChangeError', 'Error al cambiar rol'));
        }
    };

    const handleDelete = async (userId: string) => {
        if (window.confirm(t('superadmin.admins.deleteConfirm', '¿Estás seguro de eliminar este administrador?'))) {
            try {
                await deleteUserRecord(userId);
            } catch (error: any) {
                alert(error.message || t('superadmin.admins.deleteError', 'Error al eliminar'));
            }
        }
    };

    return (
        <div className="flex h-screen bg-editor-bg text-editor-text-primary">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-14 bg-editor-bg border-b border-editor-border flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                    <div className="flex items-center">
                        <button
                            onClick={onBack}
                            className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary md:hidden mr-2 transition-colors"
                            title="Volver"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Shield className="text-editor-accent w-5 h-5" />
                            <h1 className="text-lg font-semibold">{t('superadmin.admins.title', 'Gestión de Administradores')}</h1>
                        </div>
                    </div>
                    <button
                        onClick={onBack}
                        className="hidden md:flex items-center gap-1.5 h-9 px-3 text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t('superadmin.admins.back', 'Volver')}
                    </button>
                </header>

                <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
                    {/* Alerta de jerarquía */}
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="text-blue-400 flex-shrink-0 mt-0.5" size={20} />
                            <div className="flex-1">
                                <h3 className="font-semibold text-blue-400 mb-2">{t('superadmin.admins.hierarchy.title', 'Sistema de Jerarquía')}</h3>
                                <div className="text-sm text-editor-text-secondary space-y-1">
                                    <p><strong className="text-yellow-400">{t('superadmin.admins.hierarchy.owner', 'Owner')}:</strong> {userDocument?.email === 'armandoolmomiranda@gmail.com' ? t('superadmin.admins.hierarchy.ownerYou', 'Tú') : 'armandoolmomiranda@gmail.com'} {t('superadmin.admins.hierarchy.ownerDesc', ' - Único que puede crear Super Admins')}</p>
                                    <p><strong className="text-purple-400">{t('superadmin.admins.hierarchy.superadmin', 'Super Admin')}</strong>{t('superadmin.admins.hierarchy.superadminDesc', ': Acceso total excepto crear otros Super Admins')}</p>
                                    <p><strong className="text-blue-400">{t('superadmin.admins.hierarchy.admin', 'Admin')}</strong>{t('superadmin.admins.hierarchy.adminDesc', ': Gestión de usuarios y tenants, sin acceso a configuraciones críticas')}</p>
                                    <p><strong className="text-green-400">{t('superadmin.admins.hierarchy.manager', 'Manager')}</strong>{t('superadmin.admins.hierarchy.managerDesc', ': Solo visualización y gestión básica de contenido')}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Estadísticas */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-editor-text-secondary">{t('superadmin.admins.totalAdmins', 'Total Admins')}</span>
                                <Users size={20} className="text-editor-accent" />
                            </div>
                            <p className="text-2xl font-bold text-editor-text-primary mt-2">{admins.length}</p>
                        </div>
                        <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-editor-text-secondary">Super Admins</span>
                                <Shield size={20} className="text-purple-400" />
                            </div>
                            <p className="text-2xl font-bold text-editor-text-primary mt-2">
                                {admins.filter(a => a.role === 'superadmin').length}
                            </p>
                        </div>
                        <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-editor-text-secondary">Admins</span>
                                <UserCog size={20} className="text-blue-400" />
                            </div>
                            <p className="text-2xl font-bold text-editor-text-primary mt-2">
                                {admins.filter(a => a.role === 'admin').length}
                            </p>
                        </div>
                        <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-editor-text-secondary">Managers</span>
                                <Eye size={20} className="text-green-400" />
                            </div>
                            <p className="text-2xl font-bold text-editor-text-primary mt-2">
                                {admins.filter(a => a.role === 'manager').length}
                            </p>
                        </div>
                    </div>

                    {/* Botón crear admin */}
                    {userPermissions.canManageRoles && (
                        <div className="mb-6">
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="flex items-center gap-2 px-3 py-2 text-editor-accent font-semibold hover:text-editor-accent/80 transition-colors"
                            >
                                <Plus size={16} />
                                {t('superadmin.admins.create', 'Crear Nuevo Administrador')}
                            </button>
                        </div>
                    )}

                    {/* Lista de admins */}
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-editor-accent mx-auto mb-4"></div>
                            <p className="text-editor-text-secondary">{t('superadmin.admins.loading', 'Cargando administradores...')}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {admins.map(admin => {
                                const isAdminOwner = isOwner(admin.email);
                                const canEdit = userPermissions.canManageRoles &&
                                    !isAdminOwner &&
                                    (isUserOwner || admin.role !== 'superadmin');

                                return (
                                    <div
                                        key={admin.id}
                                        onClick={() => setSelectedUser(admin)}
                                        className="bg-editor-panel-bg border border-editor-border rounded-lg p-4 border-b hover:bg-editor-border/30 transition-colors cursor-pointer group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="p-2 bg-editor-bg rounded-lg">
                                                    {getRoleIcon(admin.role || 'user')}
                                                </div>
                                                <img
                                                    src={admin.photoURL || `https://ui-avatars.com/api/?name=${admin.name}`}
                                                    alt={admin.name}
                                                    className="w-12 h-12 rounded-full"
                                                />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-editor-text-primary">{admin.name}</h3>
                                                        {isAdminOwner && <Crown size={16} className="text-yellow-500" />}
                                                    </div>
                                                    <p className="text-sm text-editor-text-secondary">{admin.email}</p>
                                                    <p className="text-xs text-editor-text-secondary mt-1">
                                                        {t(`superadmin.roleDescriptions.${admin.role || 'user'}`, ROLE_DESCRIPTIONS[admin.role || 'user'])}
                                                    </p>
                                                </div>
                                            </div >

                                            <div className="flex items-center gap-4">
                                                {/* Selector de rol */}
                                                {canEdit ? (
                                                    <select
                                                        value={admin.role || 'user'}
                                                        onChange={(e) => handleRoleChange(admin.id, e.target.value as UserRole)}
                                                        className="px-3 py-2 bg-editor-bg border border-editor-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                                    >
                                                        {isUserOwner && <option value="superadmin">Super Admin</option>}
                                                        <option value="admin">Admin</option>
                                                        <option value="manager">Manager</option>
                                                        <option value="user">Usuario</option>
                                                    </select>
                                                ) : (
                                                    <span className={`px-3 py-1 rounded-md text-sm border ${ROLE_COLORS[admin.role || 'user']}`}>
                                                        {t(`superadmin.roles.${admin.role || 'user'}`, ROLE_LABELS[admin.role || 'user'])}
                                                    </span>
                                                )}

                                                {/* Botón eliminar */}
                                                {userPermissions.canDeleteUsers && !isAdminOwner && (
                                                    <button
                                                        onClick={() => handleDelete(admin.id)}
                                                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </div >
                                    </div >
                                );
                            })}

                            {
                                admins.length === 0 && (
                                    <div className="text-center py-12 bg-editor-panel-bg border border-editor-border rounded-lg">
                                        <Shield size={48} className="mx-auto text-editor-text-secondary mb-4" />
                                        <p className="text-lg font-semibold text-editor-text-primary mb-2">
                                            {t('superadmin.admins.noAdmins', 'No hay administradores')}
                                        </p>
                                        <p className="text-editor-text-secondary">
                                            {t('superadmin.admins.createFirst', 'Crea el primer administrador del sistema')}
                                        </p>
                                    </div>
                                )
                            }
                        </div >
                    )}
                </main >
            </div >

            {/* Modal crear admin */}
            {
                showCreateModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-6 max-w-md w-full">
                            <h2 className="text-xl font-bold text-editor-text-primary mb-4">{t('superadmin.admins.createModal.title', 'Crear Nuevo Administrador')}</h2>

                            {errorMessage && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                                    <p className="text-sm text-red-400">{errorMessage}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-editor-text-secondary mb-1">{t('superadmin.admins.createModal.name', 'Nombre')}</label>
                                    <input
                                        type="text"
                                        value={newAdminName}
                                        onChange={(e) => setNewAdminName(e.target.value)}
                                        placeholder={t('superadmin.admins.createModal.namePlaceholder', 'Juan Pérez')}
                                        className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-editor-text-secondary mb-1">{t('superadmin.admins.createModal.email', 'Email')}</label>
                                    <input
                                        type="email"
                                        value={newAdminEmail}
                                        onChange={(e) => setNewAdminEmail(e.target.value)}
                                        placeholder={t('superadmin.admins.createModal.emailPlaceholder', 'juan@ejemplo.com')}
                                        className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-editor-text-secondary mb-1">{t('superadmin.admins.createModal.role', 'Rol')}</label>
                                    <select
                                        value={newAdminRole}
                                        onChange={(e) => setNewAdminRole(e.target.value as UserRole)}
                                        className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                    >
                                        {isUserOwner && <option value="superadmin">Super Admin</option>}
                                        <option value="admin">Admin</option>
                                        <option value="manager">Manager</option>
                                    </select>
                                    <p className="text-xs text-editor-text-secondary mt-2">
                                        {t(`superadmin.roleDescriptions.${newAdminRole}`, ROLE_DESCRIPTIONS[newAdminRole])}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setErrorMessage('');
                                    }}
                                    className="flex-1 px-4 py-2 bg-editor-border text-editor-text-primary rounded-lg hover:bg-editor-border/80 transition-colors"
                                >
                                    {t('superadmin.admins.createModal.cancel', 'Cancelar')}
                                </button>
                                <button
                                    onClick={handleCreateAdmin}
                                    className="flex-1 px-4 py-2 text-editor-accent font-semibold hover:text-editor-accent/80 transition-colors"
                                >
                                    {t('superadmin.admins.createModal.create', 'Crear')}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default AdminManagement;

