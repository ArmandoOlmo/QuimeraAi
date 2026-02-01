/**
 * StoreUserDetailDrawer
 * Drawer de detalle de usuario de tienda
 * Muestra perfil, historial, actividad y acciones
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    X,
    User,
    Mail,
    Phone,
    Calendar,
    ShoppingBag,
    DollarSign,
    Tag,
    Shield,
    Crown,
    UserCheck,
    UserX,
    UserMinus,
    Clock,
    Activity,
    Edit2,
    Key,
    Trash2,
    Check,
    AlertTriangle,
    Loader2,
} from 'lucide-react';
import {
    StoreUser,
    StoreUserRole,
    StoreUserStatus,
    UserSegment,
    UserActivity,
    DEFAULT_ROLE_CONFIGS,
} from '../../../../types/storeUsers';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../../firebase';

interface StoreUserDetailDrawerProps {
    user: StoreUser | null;
    isOpen: boolean;
    onClose: () => void;
    storeId: string;
    segments: UserSegment[];
    onUpdate: (userId: string, updates: Partial<StoreUser>) => Promise<void>;
    onChangeRole: (userId: string, role: StoreUserRole) => Promise<void>;
    onChangeStatus: (userId: string, status: StoreUserStatus) => Promise<void>;
    onResetPassword: (userId: string) => Promise<void>;
    onUpdateSegments: (userId: string, segmentIds: string[]) => Promise<void>;
    primaryColor?: string;
}

const StoreUserDetailDrawer: React.FC<StoreUserDetailDrawerProps> = ({
    user,
    isOpen,
    onClose,
    storeId,
    segments,
    onUpdate,
    onChangeRole,
    onChangeStatus,
    onResetPassword,
    onUpdateSegments,
    primaryColor = '#6366f1',
}) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'profile' | 'activity' | 'segments'>('profile');
    const [activities, setActivities] = useState<UserActivity[]>([]);
    const [isLoadingActivities, setIsLoadingActivities] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [showConfirmBan, setShowConfirmBan] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);

    // Load activities when tab changes
    useEffect(() => {
        if (activeTab === 'activity' && user && isOpen) {
            loadActivities();
        }
    }, [activeTab, user, isOpen]);

    const loadActivities = async () => {
        if (!user) return;

        setIsLoadingActivities(true);
        try {
            const activitiesRef = collection(db, `storeUsers/${storeId}/activities`);
            const q = query(
                activitiesRef,
                where('userId', '==', user.id),
                orderBy('createdAt', 'desc'),
                limit(50)
            );

            const snapshot = await getDocs(q);
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as UserActivity[];

            setActivities(data);
        } catch (err) {
            console.error('Error loading activities:', err);
        } finally {
            setIsLoadingActivities(false);
        }
    };

    const formatDate = (timestamp?: { seconds: number }) => {
        if (!timestamp) return '-';
        return new Date(timestamp.seconds * 1000).toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    };

    const formatDateTime = (timestamp?: { seconds: number }) => {
        if (!timestamp) return '-';
        return new Date(timestamp.seconds * 1000).toLocaleString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleRoleChange = async (role: StoreUserRole) => {
        if (!user) return;
        setIsUpdating(true);
        try {
            await onChangeRole(user.id, role);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleStatusChange = async (status: StoreUserStatus) => {
        if (!user) return;

        if (status === 'banned') {
            setShowConfirmBan(true);
            return;
        }

        setIsUpdating(true);
        try {
            await onChangeStatus(user.id, status);
        } finally {
            setIsUpdating(false);
        }
    };

    const confirmBan = async () => {
        if (!user) return;
        setIsUpdating(true);
        try {
            await onChangeStatus(user.id, 'banned');
            setShowConfirmBan(false);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleResetPassword = async () => {
        if (!user) return;
        setIsUpdating(true);
        try {
            await onResetPassword(user.id);
            alert(t('storeUsers.passwordResetSent', 'Email de recuperación enviado'));
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSegmentToggle = async (segmentId: string) => {
        if (!user) return;

        const currentSegments = user.segments || [];
        const newSegments = currentSegments.includes(segmentId)
            ? currentSegments.filter((s) => s !== segmentId)
            : [...currentSegments, segmentId];

        setIsUpdating(true);
        try {
            await onUpdateSegments(user.id, newSegments);
        } finally {
            setIsUpdating(false);
        }
    };

    const activityIcons: Record<string, React.ElementType> = {
        login: UserCheck,
        logout: UserMinus,
        register: User,
        password_reset: Key,
        profile_update: Edit2,
        order_placed: ShoppingBag,
        order_cancelled: X,
        review_submitted: Activity,
    };

    if (!isOpen || !user) return null;

    const roleConfig = DEFAULT_ROLE_CONFIGS[user.role];

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />

            {/* Drawer */}
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-background border-l border-border shadow-2xl z-50 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground">
                        {t('storeUsers.userDetails', 'Detalles del Usuario')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* User Header */}
                <div className="p-4 border-b border-border">
                    <div className="flex items-center gap-4">
                        {user.photoURL ? (
                            <img
                                src={user.photoURL}
                                alt={user.displayName}
                                className="w-16 h-16 rounded-full object-cover"
                            />
                        ) : (
                            <div
                                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {user.displayName?.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-foreground">{user.displayName}</h3>
                            <p className="text-muted-foreground">{user.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                                    style={{ backgroundColor: roleConfig.color }}
                                >
                                    {user.role === 'vip' && <Crown size={10} />}
                                    {user.role === 'wholesale' && <Shield size={10} />}
                                    {roleConfig.name}
                                </span>
                                <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white ${
                                        user.status === 'active'
                                            ? 'bg-green-500'
                                            : user.status === 'inactive'
                                            ? 'bg-gray-500'
                                            : 'bg-red-500'
                                    }`}
                                >
                                    {user.status === 'active' && <UserCheck size={10} />}
                                    {user.status === 'inactive' && <UserMinus size={10} />}
                                    {user.status === 'banned' && <UserX size={10} />}
                                    {user.status}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="text-center p-3 bg-muted rounded-lg">
                            <p className="text-2xl font-bold text-foreground">{user.totalOrders}</p>
                            <p className="text-xs text-muted-foreground">{t('storeUsers.orders', 'Pedidos')}</p>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                            <p className="text-2xl font-bold text-foreground">${user.totalSpent.toFixed(0)}</p>
                            <p className="text-xs text-muted-foreground">{t('storeUsers.spent', 'Gastado')}</p>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                            <p className="text-2xl font-bold text-foreground">${user.averageOrderValue.toFixed(0)}</p>
                            <p className="text-xs text-muted-foreground">{t('storeUsers.avgOrder', 'Promedio')}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border">
                    {(['profile', 'activity', 'segments'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                                activeTab === tab
                                    ? 'text-foreground border-b-2'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            style={activeTab === tab ? { borderColor: primaryColor } : {}}
                        >
                            {tab === 'profile' && t('storeUsers.profile', 'Perfil')}
                            {tab === 'activity' && t('storeUsers.activity', 'Actividad')}
                            {tab === 'segments' && t('storeUsers.segments', 'Segmentos')}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <div className="space-y-6">
                            {/* Contact Info */}
                            <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                                    {t('storeUsers.contactInfo', 'Información de Contacto')}
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                        <Mail size={18} className="text-muted-foreground" />
                                        <span className="text-foreground">{user.email}</span>
                                    </div>
                                    {user.phone && (
                                        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                            <Phone size={18} className="text-muted-foreground" />
                                            <span className="text-foreground">{user.phone}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                        <Calendar size={18} className="text-muted-foreground" />
                                        <span className="text-foreground">
                                            {t('storeUsers.memberSince', 'Miembro desde')}: {formatDate(user.createdAt)}
                                        </span>
                                    </div>
                                    {user.lastLoginAt && (
                                        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                            <Clock size={18} className="text-muted-foreground" />
                                            <span className="text-foreground">
                                                {t('storeUsers.lastLogin', 'Último acceso')}: {formatDateTime(user.lastLoginAt)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Role Management */}
                            <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                                    {t('storeUsers.changeRole', 'Cambiar Rol')}
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {(['customer', 'vip', 'wholesale'] as StoreUserRole[]).map((role) => {
                                        const config = DEFAULT_ROLE_CONFIGS[role];
                                        const isSelected = user.role === role;
                                        return (
                                            <button
                                                key={role}
                                                onClick={() => handleRoleChange(role)}
                                                disabled={isUpdating || isSelected}
                                                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                    isSelected
                                                        ? 'text-white'
                                                        : 'bg-muted text-foreground hover:bg-muted/80'
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

                            {/* Status Management */}
                            <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                                    {t('storeUsers.changeStatus', 'Cambiar Estado')}
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {(['active', 'inactive', 'banned'] as StoreUserStatus[]).map((status) => {
                                        const isSelected = user.status === status;
                                        const labels = {
                                            active: t('storeUsers.statusActive', 'Activo'),
                                            inactive: t('storeUsers.statusInactive', 'Inactivo'),
                                            banned: t('storeUsers.statusBanned', 'Bloqueado'),
                                        };
                                        const colors = {
                                            active: '#22c55e',
                                            inactive: '#6b7280',
                                            banned: '#ef4444',
                                        };
                                        return (
                                            <button
                                                key={status}
                                                onClick={() => handleStatusChange(status)}
                                                disabled={isUpdating || isSelected}
                                                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                    isSelected
                                                        ? 'text-white'
                                                        : 'bg-muted text-foreground hover:bg-muted/80'
                                                }`}
                                                style={isSelected ? { backgroundColor: colors[status] } : {}}
                                            >
                                                {isSelected && <Check size={14} />}
                                                {labels[status]}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Actions */}
                            <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                                    {t('storeUsers.actions', 'Acciones')}
                                </h4>
                                <div className="space-y-2">
                                    <button
                                        onClick={handleResetPassword}
                                        disabled={isUpdating}
                                        className="w-full flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                                    >
                                        <Key size={18} />
                                        {t('storeUsers.resetPassword', 'Enviar Reset de Contraseña')}
                                    </button>
                                </div>
                            </div>

                            {/* Internal Notes */}
                            {user.internalNotes && (
                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground mb-3">
                                        {t('storeUsers.internalNotes', 'Notas Internas')}
                                    </h4>
                                    <p className="p-3 bg-muted rounded-lg text-foreground text-sm">
                                        {user.internalNotes}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Activity Tab */}
                    {activeTab === 'activity' && (
                        <div>
                            {isLoadingActivities ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="animate-spin" style={{ color: primaryColor }} size={24} />
                                </div>
                            ) : activities.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Activity size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>{t('storeUsers.noActivity', 'No hay actividad registrada')}</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {activities.map((activity) => {
                                        const Icon = activityIcons[activity.type] || Activity;
                                        return (
                                            <div
                                                key={activity.id}
                                                className="flex items-start gap-3 p-3 bg-muted rounded-lg"
                                            >
                                                <div className="p-2 bg-background rounded-lg">
                                                    <Icon size={16} className="text-muted-foreground" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm text-foreground">{activity.description}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {formatDateTime(activity.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Segments Tab */}
                    {activeTab === 'segments' && (
                        <div>
                            {segments.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Tag size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>{t('storeUsers.noSegments', 'No hay segmentos creados')}</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {segments.map((segment) => {
                                        const isAssigned = user.segments?.includes(segment.id);
                                        return (
                                            <button
                                                key={segment.id}
                                                onClick={() => handleSegmentToggle(segment.id)}
                                                disabled={isUpdating}
                                                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                                    isAssigned
                                                        ? 'border-primary bg-primary/10'
                                                        : 'border-border bg-muted hover:bg-muted/80'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: segment.color }}
                                                    />
                                                    <div className="text-left">
                                                        <p className="font-medium text-foreground">{segment.name}</p>
                                                        {segment.description && (
                                                            <p className="text-sm text-muted-foreground">
                                                                {segment.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                {isAssigned && <Check size={18} style={{ color: primaryColor }} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Confirm Ban Modal */}
            {showConfirmBan && (
                <>
                    <div className="fixed inset-0 bg-black/80 z-[60]" onClick={() => setShowConfirmBan(false)} />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background rounded-xl border border-border shadow-2xl z-[60] p-6">
                        <div className="flex items-center gap-3 mb-4 text-red-500">
                            <AlertTriangle size={24} />
                            <h3 className="text-lg font-semibold">
                                {t('storeUsers.confirmBan', 'Confirmar Bloqueo')}
                            </h3>
                        </div>
                        <p className="text-muted-foreground mb-6">
                            {t('storeUsers.banWarning', '¿Estás seguro de que deseas bloquear a este usuario? No podrá acceder a su cuenta.')}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowConfirmBan(false)}
                                className="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-lg hover:bg-muted/80"
                            >
                                {t('common.cancel', 'Cancelar')}
                            </button>
                            <button
                                onClick={confirmBan}
                                disabled={isUpdating}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 flex items-center gap-2"
                            >
                                {isUpdating && <Loader2 className="animate-spin" size={16} />}
                                {t('storeUsers.banUser', 'Bloquear Usuario')}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default StoreUserDetailDrawer;











