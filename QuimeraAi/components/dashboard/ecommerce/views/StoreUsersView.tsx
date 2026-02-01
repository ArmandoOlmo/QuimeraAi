/**
 * StoreUsersView
 * Vista de gestión de usuarios registrados de tienda
 * Incluye: Lista, filtros, estadísticas, acciones masivas
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Search,
    Users,
    UserCheck,
    UserX,
    UserMinus,
    Shield,
    Crown,
    ShoppingBag,
    DollarSign,
    Loader2,
    Eye,
    MoreVertical,
    Download,
    Filter,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Calendar,
    Tag,
    Mail,
    ChevronDown,
    Check,
    X,
    AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../../../contexts/core/AuthContext';
import { useStoreUsers } from '../hooks/useStoreUsers';
import { StoreUser, StoreUserRole, StoreUserStatus, DEFAULT_ROLE_CONFIGS } from '../../../../types/storeUsers';
import { useEcommerceTheme } from '../hooks/useEcommerceTheme';
import { useEcommerceContext } from '../EcommerceDashboard';
import StoreUserDetailDrawer from '../components/StoreUserDetailDrawer';

const StoreUsersView: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { storeId } = useEcommerceContext();
    const theme = useEcommerceTheme();

    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRoles, setSelectedRoles] = useState<StoreUserRole[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<StoreUserStatus[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedUser, setSelectedUser] = useState<StoreUser | null>(null);
    const [showDetailDrawer, setShowDetailDrawer] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [showRoleDropdown, setShowRoleDropdown] = useState<string | null>(null);
    const [showStatusDropdown, setShowStatusDropdown] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    // Hook
    const {
        users,
        segments,
        stats,
        isLoading,
        error,
        updateUserRole,
        updateUserStatus,
        resetUserPassword,
        deleteUser,
        updateUserProfile,
        updateUserSegments,
        exportUsers,
    } = useStoreUsers(storeId, {
        searchTerm,
        roles: selectedRoles.length > 0 ? selectedRoles : undefined,
        statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
    });

    // Filtered users (already filtered by hook, but can add more)
    const filteredUsers = users;

    // Format helpers
    const formatDate = (timestamp?: { seconds: number }) => {
        if (!timestamp) return '-';
        return new Date(timestamp.seconds * 1000).toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const formatDateTime = (timestamp?: { seconds: number }) => {
        if (!timestamp) return '-';
        return new Date(timestamp.seconds * 1000).toLocaleString('es-MX', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Handlers
    const handleViewUser = (user: StoreUser) => {
        setSelectedUser(user);
        setShowDetailDrawer(true);
    };

    const handleRoleChange = async (userId: string, role: StoreUserRole) => {
        try {
            await updateUserRole(userId, role);
            setShowRoleDropdown(null);
        } catch (err) {
            console.error('Error updating role:', err);
        }
    };

    const handleStatusChange = async (userId: string, status: StoreUserStatus) => {
        try {
            await updateUserStatus(userId, status);
            setShowStatusDropdown(null);
        } catch (err) {
            console.error('Error updating status:', err);
        }
    };

    const handleExport = async (format: 'csv' | 'json') => {
        setIsExporting(true);
        try {
            const data = await exportUsers({
                format,
                fields: ['id', 'email', 'displayName', 'role', 'status', 'totalOrders', 'totalSpent', 'createdAt'],
            });

            const blob = new Blob([data], { type: format === 'csv' ? 'text/csv' : 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `usuarios-tienda-${new Date().toISOString().split('T')[0]}.${format}`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error exporting:', err);
        } finally {
            setIsExporting(false);
        }
    };

    const toggleUserSelection = (userId: string) => {
        const newSelected = new Set(selectedUsers);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUsers(newSelected);
    };

    const toggleAllSelection = () => {
        if (selectedUsers.size === filteredUsers.length) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
        }
    };

    // Role badge component
    const RoleBadge: React.FC<{ role: StoreUserRole }> = ({ role }) => {
        const config = DEFAULT_ROLE_CONFIGS[role];
        return (
            <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: config.color }}
            >
                {role === 'vip' && <Crown size={10} />}
                {role === 'wholesale' && <Shield size={10} />}
                {config.name}
            </span>
        );
    };

    // Status badge component
    const StatusBadge: React.FC<{ status: StoreUserStatus }> = ({ status }) => {
        const statusConfig = {
            active: { label: t('storeUsers.statusActive', 'Activo'), color: 'bg-green-500', icon: UserCheck },
            inactive: { label: t('storeUsers.statusInactive', 'Inactivo'), color: 'bg-gray-500', icon: UserMinus },
            banned: { label: t('storeUsers.statusBanned', 'Bloqueado'), color: 'bg-red-500', icon: UserX },
        };
        const config = statusConfig[status];
        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white ${config.color}`}>
                <Icon size={10} />
                {config.label}
            </span>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin" style={{ color: theme.primary }} size={32} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-red-500">
                <AlertTriangle size={48} className="mb-4" />
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <UserCheck style={{ color: theme.primary }} />
                        {t('storeUsers.title', 'Usuarios Registrados')}
                    </h2>
                    <p className="text-muted-foreground">
                        {stats.totalUsers} {t('storeUsers.totalUsers', 'usuarios en tu tienda')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleExport('csv')}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                        {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                        {t('storeUsers.export', 'Exportar')}
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-card/50 rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${theme.primary}20` }}>
                            <Users style={{ color: theme.primary }} size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
                            <p className="text-sm text-muted-foreground">{t('storeUsers.total', 'Total')}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card/50 rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                            <UserCheck className="text-green-400" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stats.activeUsers}</p>
                            <p className="text-sm text-muted-foreground">{t('storeUsers.active', 'Activos')}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card/50 rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-500/20 rounded-lg">
                            <Crown className="text-yellow-400" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stats.usersByRole.vip}</p>
                            <p className="text-sm text-muted-foreground">VIP</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card/50 rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                            <Shield className="text-purple-400" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stats.usersByRole.wholesale}</p>
                            <p className="text-sm text-muted-foreground">{t('storeUsers.wholesale', 'Mayoristas')}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card/50 rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            {stats.newUsersThisMonth >= stats.newUsersLastMonth ? (
                                <TrendingUp className="text-blue-400" size={20} />
                            ) : (
                                <TrendingDown className="text-blue-400" size={20} />
                            )}
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stats.newUsersThisMonth}</p>
                            <p className="text-sm text-muted-foreground">{t('storeUsers.newThisMonth', 'Nuevos este mes')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-2 flex-1 bg-editor-border/40 rounded-lg px-3 py-2">
                    <Search className="w-4 h-4 text-editor-text-secondary flex-shrink-0" />
                    <input
                        type="text"
                        placeholder={t('storeUsers.searchPlaceholder', 'Buscar por nombre, email o teléfono...')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-sm min-w-0"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                            <X size={16} />
                        </button>
                    )}
                </div>

                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                        showFilters || selectedRoles.length > 0 || selectedStatuses.length > 0
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-card text-foreground hover:bg-muted'
                    }`}
                >
                    <Filter size={18} />
                    {t('storeUsers.filters', 'Filtros')}
                    {(selectedRoles.length > 0 || selectedStatuses.length > 0) && (
                        <span className="px-1.5 py-0.5 text-xs rounded-full bg-primary text-white">
                            {selectedRoles.length + selectedStatuses.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-card rounded-xl border border-border p-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                        {/* Role Filter */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                {t('storeUsers.filterByRole', 'Filtrar por rol')}
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {(['customer', 'vip', 'wholesale'] as StoreUserRole[]).map((role) => {
                                    const config = DEFAULT_ROLE_CONFIGS[role];
                                    const isSelected = selectedRoles.includes(role);
                                    return (
                                        <button
                                            key={role}
                                            onClick={() => {
                                                if (isSelected) {
                                                    setSelectedRoles(selectedRoles.filter((r) => r !== role));
                                                } else {
                                                    setSelectedRoles([...selectedRoles, role]);
                                                }
                                            }}
                                            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                                isSelected ? 'text-white' : 'bg-muted text-foreground hover:bg-muted/80'
                                            }`}
                                            style={isSelected ? { backgroundColor: config.color } : {}}
                                        >
                                            {isSelected && <Check size={14} />}
                                            {config.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                {t('storeUsers.filterByStatus', 'Filtrar por estado')}
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {(['active', 'inactive', 'banned'] as StoreUserStatus[]).map((status) => {
                                    const isSelected = selectedStatuses.includes(status);
                                    const statusLabels = {
                                        active: t('storeUsers.statusActive', 'Activo'),
                                        inactive: t('storeUsers.statusInactive', 'Inactivo'),
                                        banned: t('storeUsers.statusBanned', 'Bloqueado'),
                                    };
                                    const statusColors = {
                                        active: '#22c55e',
                                        inactive: '#6b7280',
                                        banned: '#ef4444',
                                    };
                                    return (
                                        <button
                                            key={status}
                                            onClick={() => {
                                                if (isSelected) {
                                                    setSelectedStatuses(selectedStatuses.filter((s) => s !== status));
                                                } else {
                                                    setSelectedStatuses([...selectedStatuses, status]);
                                                }
                                            }}
                                            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                                isSelected ? 'text-white' : 'bg-muted text-foreground hover:bg-muted/80'
                                            }`}
                                            style={isSelected ? { backgroundColor: statusColors[status] } : {}}
                                        >
                                            {isSelected && <Check size={14} />}
                                            {statusLabels[status]}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {(selectedRoles.length > 0 || selectedStatuses.length > 0) && (
                        <div className="mt-4 pt-4 border-t border-border">
                            <button
                                onClick={() => {
                                    setSelectedRoles([]);
                                    setSelectedStatuses([]);
                                }}
                                className="text-sm text-muted-foreground hover:text-foreground"
                            >
                                {t('storeUsers.clearFilters', 'Limpiar filtros')}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Users Table */}
            {filteredUsers.length === 0 ? (
                <div className="text-center py-16 bg-card rounded-xl border border-border">
                    <Users className="mx-auto text-muted-foreground/50 mb-4" size={64} />
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                        {searchTerm || selectedRoles.length > 0 || selectedStatuses.length > 0
                            ? t('storeUsers.noUsersFound', 'No se encontraron usuarios')
                            : t('storeUsers.noUsers', 'No hay usuarios registrados')}
                    </h3>
                    <p className="text-muted-foreground">
                        {searchTerm || selectedRoles.length > 0 || selectedStatuses.length > 0
                            ? t('storeUsers.tryDifferentFilters', 'Intenta con otros filtros')
                            : t('storeUsers.usersWillAppear', 'Los usuarios que se registren aparecerán aquí')}
                    </p>
                </div>
            ) : (
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="px-4 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                                            onChange={toggleAllSelection}
                                            className="rounded border-border"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                        {t('storeUsers.user', 'Usuario')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                        {t('storeUsers.role', 'Rol')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                        {t('storeUsers.status', 'Estado')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                        {t('storeUsers.orders', 'Pedidos')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                        {t('storeUsers.spent', 'Gastado')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                        {t('storeUsers.lastLogin', 'Último acceso')}
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                                        {t('storeUsers.actions', 'Acciones')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredUsers.map((storeUser) => (
                                    <tr key={storeUser.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedUsers.has(storeUser.id)}
                                                onChange={() => toggleUserSelection(storeUser.id)}
                                                className="rounded border-border"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {storeUser.photoURL ? (
                                                    <img
                                                        src={storeUser.photoURL}
                                                        alt={storeUser.displayName}
                                                        className="w-10 h-10 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div
                                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                                                        style={{ backgroundColor: theme.primary }}
                                                    >
                                                        {storeUser.displayName?.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium text-foreground">{storeUser.displayName}</p>
                                                    <p className="text-sm text-muted-foreground">{storeUser.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="relative">
                                                <button
                                                    onClick={() => setShowRoleDropdown(showRoleDropdown === storeUser.id ? null : storeUser.id)}
                                                    className="flex items-center gap-1"
                                                >
                                                    <RoleBadge role={storeUser.role} />
                                                    <ChevronDown size={14} className="text-muted-foreground" />
                                                </button>
                                                {showRoleDropdown === storeUser.id && (
                                                    <div className="absolute z-10 mt-1 w-40 bg-popover border border-border rounded-lg shadow-lg py-1">
                                                        {(['customer', 'vip', 'wholesale'] as StoreUserRole[]).map((role) => (
                                                            <button
                                                                key={role}
                                                                onClick={() => handleRoleChange(storeUser.id, role)}
                                                                className={`w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between ${
                                                                    storeUser.role === role ? 'bg-muted' : ''
                                                                }`}
                                                            >
                                                                {DEFAULT_ROLE_CONFIGS[role].name}
                                                                {storeUser.role === role && <Check size={14} />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="relative">
                                                <button
                                                    onClick={() => setShowStatusDropdown(showStatusDropdown === storeUser.id ? null : storeUser.id)}
                                                    className="flex items-center gap-1"
                                                >
                                                    <StatusBadge status={storeUser.status} />
                                                    <ChevronDown size={14} className="text-muted-foreground" />
                                                </button>
                                                {showStatusDropdown === storeUser.id && (
                                                    <div className="absolute z-10 mt-1 w-40 bg-popover border border-border rounded-lg shadow-lg py-1">
                                                        {(['active', 'inactive', 'banned'] as StoreUserStatus[]).map((status) => {
                                                            const labels = {
                                                                active: t('storeUsers.statusActive', 'Activo'),
                                                                inactive: t('storeUsers.statusInactive', 'Inactivo'),
                                                                banned: t('storeUsers.statusBanned', 'Bloqueado'),
                                                            };
                                                            return (
                                                                <button
                                                                    key={status}
                                                                    onClick={() => handleStatusChange(storeUser.id, status)}
                                                                    className={`w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between ${
                                                                        storeUser.status === status ? 'bg-muted' : ''
                                                                    }`}
                                                                >
                                                                    {labels[status]}
                                                                    {storeUser.status === status && <Check size={14} />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-foreground font-medium">{storeUser.totalOrders}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-foreground font-medium">${storeUser.totalSpent.toFixed(2)}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-muted-foreground text-sm">
                                                {formatDateTime(storeUser.lastLoginAt)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => handleViewUser(storeUser)}
                                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* User Detail Drawer */}
            <StoreUserDetailDrawer
                user={selectedUser}
                isOpen={showDetailDrawer}
                onClose={() => {
                    setShowDetailDrawer(false);
                    setSelectedUser(null);
                }}
                storeId={storeId}
                segments={segments}
                onUpdate={async (userId, updates) => {
                    await updateUserProfile(userId, updates);
                }}
                onChangeRole={async (userId, role) => {
                    await updateUserRole(userId, role);
                }}
                onChangeStatus={async (userId, status) => {
                    await updateUserStatus(userId, status);
                }}
                onResetPassword={async (userId) => {
                    await resetUserPassword(userId);
                }}
                onUpdateSegments={async (userId, segmentIds) => {
                    await updateUserSegments(userId, segmentIds);
                }}
                primaryColor={theme.primary}
            />
        </div>
    );
};

export default StoreUsersView;
