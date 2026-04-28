import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmationModal from '../../ui/ConfirmationModal';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useAdmin } from '../../../contexts/admin/AdminContext';
import { Tenant, TenantStatus, TenantType, UserDocument } from '../../../types';
import DashboardSidebar from '../DashboardSidebar';
import {
    Users, Trash2, Building2, User, Search, Filter,
    Plus, ChevronDown, ChevronRight, MoreVertical, Edit2, UserPlus,
    Folder, HardDrive, Zap, DollarSign, CheckCircle, AlertCircle,
    Clock, XCircle, X, CreditCard, History, Gift
} from 'lucide-react';
import QuimeraLoader from '@/components/ui/QuimeraLoader';
import HeaderBackButton from '../../ui/HeaderBackButton';
import { db, collection, getDocs, query, where, orderBy, limit } from '../../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { AiCreditsUsage, AiCreditTransaction, getUsageColor } from '../../../types/subscription';
import { addCredits } from '../../../services/aiCreditsService';

interface TenantManagementProps {
    onBack: () => void;
}

const TenantManagement: React.FC<TenantManagementProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const { canPerform } = useAuth();
    const { tenants, fetchTenants, deleteTenant, updateTenantStatus, updateTenant, updateTenantLimits, allUsers, createTenant } = useAdmin();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'individual' | 'agency'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<TenantStatus | 'all'>('all');
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [expandedTenants, setExpandedTenants] = useState<Set<string>>(new Set());

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await fetchTenants();
            setLoading(false);
        };
        loadData();
    }, []);

    // Filtrar tenants
    const filteredTenants = tenants.filter(tenant => {
        const matchesTab = activeTab === 'all' || tenant.type === activeTab;
        const matchesSearch = tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tenant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (tenant.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
        const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
        return matchesTab && matchesSearch && matchesStatus;
    });

    const toggleExpanded = (tenantId: string) => {
        const newExpanded = new Set(expandedTenants);
        if (newExpanded.has(tenantId)) {
            newExpanded.delete(tenantId);
        } else {
            newExpanded.add(tenantId);
        }
        setExpandedTenants(newExpanded);
    };

    const [pendingDeleteTenantId, setPendingDeleteTenantId] = useState<string | null>(null);

    const handleDeleteTenant = async (tenantId: string) => {
        if (!canPerform('canDeleteTenants')) {
            alert(t('superadmin.tenant.alerts.noPermission', 'No tienes permiso para eliminar tenants.'));
            return;
        }
        setPendingDeleteTenantId(tenantId);
    };

    const confirmDeleteTenant = async () => {
        if (pendingDeleteTenantId) {
            await deleteTenant(pendingDeleteTenantId);
            setPendingDeleteTenantId(null);
        }
    };

    const getStatusIcon = (status: TenantStatus) => {
        switch (status) {
            case 'active': return <CheckCircle size={16} className="text-green-500" />;
            case 'trial': return <Clock size={16} className="text-blue-500" />;
            case 'suspended': return <AlertCircle size={16} className="text-yellow-500" />;
            case 'expired': return <XCircle size={16} className="text-red-500" />;
        }
    };

    const getStatusColor = (status: TenantStatus) => {
        switch (status) {
            case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'trial': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'suspended': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'expired': return 'bg-red-500/20 text-red-400 border-red-500/30';
        }
    };

    const calculateTotalMRR = () => {
        return tenants.reduce((sum, t) => sum + (t.billing?.mrr || t.billingInfo?.mrr || 0), 0);
    };

    // Componente de métrica
    const MetricCard: React.FC<{
        title: string;
        value: number | string;
        subtitle?: string;
        trend?: string;
        icon: React.ReactNode;
    }> = ({ title, value, subtitle, trend, icon }) => (
        <div className="bg-q-surface border border-q-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-q-text-secondary">{title}</span>
                <div className="text-q-accent">{icon}</div>
            </div>
            <div className="text-2xl font-bold text-q-text mb-1">{value}</div>
            {subtitle && <div className="text-xs text-q-text-secondary">{subtitle}</div>}
            {trend && <div className="text-xs text-green-500 mt-1">{trend}</div>}
        </div>
    );

    // Componente de fila de tenant
    const TenantRow: React.FC<{ tenant: Tenant }> = ({ tenant }) => {
        const isExpanded = expandedTenants.has(tenant.id);
        const tenantMembers = tenant.type === 'agency'
            ? allUsers.filter(u => tenant.memberUserIds.includes(u.id))
            : [];

        return (
            <div className="bg-q-surface border border-q-border rounded-lg overflow-hidden mb-3">
                {/* Fila principal */}
                <div className="flex items-center justify-between p-4 hover:bg-q-bg/50 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                        {/* Botón expandir para agencias */}
                        {tenant.type === 'agency' && (
                            <button
                                onClick={() => toggleExpanded(tenant.id)}
                                className="text-q-text-secondary hover:text-q-text"
                            >
                                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                            </button>
                        )}

                        {/* Icono de tipo */}
                        <div className={`p - 3 rounded - lg ${tenant.type === 'agency' ? 'bg-blue-500/20' : 'bg-purple-500/20'} `}>
                            {tenant.type === 'agency' ?
                                <Building2 size={24} className="text-blue-400" /> :
                                <User size={24} className="text-purple-400" />
                            }
                        </div>

                        {/* Info principal */}
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-q-text">{tenant.name}</h3>
                                <span className={`px - 2 py - 0.5 text - xs rounded - full border ${getStatusColor(tenant.status)} `}>
                                    {tenant.status}
                                </span>
                            </div>
                            <p className="text-sm text-q-text-secondary">{tenant.email}</p>
                            {tenant.companyName && (
                                <p className="text-xs text-q-text-secondary mt-1">{tenant.companyName}</p>
                            )}
                        </div>
                    </div>

                    {/* Métricas */}
                    <div className="flex items-center gap-6 mr-6">
                        <div className="text-center">
                            <div className="flex items-center gap-1 text-q-text-secondary">
                                <Folder size={14} />
                                <span className="text-sm">{tenant.usage.projectCount} / {tenant.limits.maxProjects}</span>
                            </div>
                        </div>
                        <span className="text-xs text-q-text-secondary">{t('superadmin.tenant.metrics.projects', 'Proyectos')}</span>
                    </div>

                    {tenant.type === 'agency' && (
                        <div className="text-center">
                            <div className="flex items-center gap-1 text-q-text-secondary">
                                <Users size={14} />
                                <span className="text-sm">{tenant.usage.userCount} / {tenant.limits.maxUsers}</span>
                            </div>
                            <span className="text-xs text-q-text-secondary">{t('superadmin.tenant.metrics.users', 'Usuarios')}</span>
                        </div>
                    )}

                    <div className="text-center">
                        <div className="flex items-center gap-1 text-q-text-secondary">
                            <HardDrive size={14} />
                            <span className="text-sm">{(tenant.usage.storageUsedGB ?? 0).toFixed(1)} GB</span>
                        </div>
                        <span className="text-xs text-q-text-secondary">{t('superadmin.tenant.metrics.storage', 'Almacenamiento')}</span>
                    </div>

                    <div className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-md text-sm font-medium">
                        {tenant.subscriptionPlan}
                    </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSelectedTenant(tenant)}
                        className="p-2 text-q-text-secondary hover:text-q-accent hover:bg-q-bg rounded-lg transition-colors"
                        title={t('superadmin.viewDetails')}
                    >
                        <Edit2 size={18} />
                    </button>
                    {canPerform('canDeleteTenants') && (
                        <button
                            onClick={() => handleDeleteTenant(tenant.id)}
                            className="p-2 text-q-text-secondary hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title={t('superadmin.delete')}
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
                {/* Vista expandida para agencias */}
                {
                    isExpanded && tenant.type === 'agency' && (
                        <div className="border-t border-q-border p-4 bg-q-bg/50">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-q-text flex items-center gap-2">
                                    <Users size={16} />
                                    {t('superadmin.tenant.agency.members', 'Miembros del equipo')} ({tenantMembers.length})
                                </h4>
                                <button className="flex items-center gap-1 text-sm text-q-accent hover:text-q-accent/80 transition-colors">
                                    <UserPlus size={14} />
                                    {t('superadmin.tenant.agency.invite', 'Invitar usuario')}
                                </button>
                            </div>

                            <div className="space-y-2">
                                {tenantMembers.length > 0 ? (
                                    tenantMembers.map(member => (
                                        <div key={member.id} className="flex items-center justify-between p-3 bg-q-surface rounded-lg border border-q-border">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={member.photoURL || `https://ui-avatars.com/api/?name=${member.name}&background=3f3f46&color=e4e4e7`}
                                                    alt={member.name}
                                                    className="w-10 h-10 rounded-full object-cover"
                                                />
                                                <div>
                                                    <p className="text-sm font-medium text-q-text">{member.name}</p>
                                                    <p className="text-xs text-q-text-secondary">{member.email}</p>
                                                </div>
                                            </div >
                                            <span className="px-2 py-1 text-xs bg-q-surface-overlay text-q-text-secondary rounded-md">
                                                {member.tenantRole || 'member'}
                                            </span>
                                        </div >
                                    ))
                                ) : (
                                    <p className="text-sm text-q-text-secondary text-center py-4">
                                        {t('superadmin.tenant.agency.noMembers', 'No hay miembros en este equipo')}
                                    </p>
                                )}
                            </div >
                        </div >
                    )
                }
            </div >
        );
    };

    const activeCount = tenants.filter(t => t.status === 'active').length;
    const agencyCount = tenants.filter(t => t.type === 'agency').length;
    const individualCount = tenants.filter(t => t.type === 'individual').length;

    return (
        <div className="flex h-screen bg-q-bg text-q-text">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-14 bg-q-bg border-b border-q-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                    <div className="flex items-center">
                        <div className="flex items-center gap-2">
                            <Users className="text-q-accent w-5 h-5" />
                            <h1 className="text-lg font-semibold text-q-text">{t('superadmin.tenant.title', 'Gestión de Tenants')}</h1>
                        </div>
                    </div>
                    <HeaderBackButton onClick={onBack} label={t('superadmin.tenant.back', 'Volver')} className="border-q-border/60 bg-q-surface/60 text-q-text-secondary hover:bg-q-surface-overlay/40 hover:text-q-text focus:ring-q-accent/25" />
                </header>

                <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
                    {/* Métricas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <MetricCard
                            title={t('superadmin.tenant.totalTenants', 'Total Tenants')}
                            value={tenants.length}
                            subtitle={`${individualCount} ${t('superadmin.tenant.individual', 'individual')}, ${agencyCount} ${t('superadmin.tenant.agencyLabel', 'agencia')}`}
                            icon={<Users size={20} />}
                        />
                        <MetricCard
                            title={t('superadmin.tenant.activeTenants', 'Tenants Activos')}
                            value={activeCount}
                            subtitle={`${tenants.length > 0 ? ((activeCount / tenants.length) * 100).toFixed(0) : 0}% del total`}
                            icon={<CheckCircle size={20} />}
                        />
                        <MetricCard
                            title={t('superadmin.tenant.totalMrr', 'MRR Total')}
                            value={`$${calculateTotalMRR().toLocaleString()}`}
                            trend={t('superadmin.tenant.metrics.trend', '+8% este mes')}
                            icon={<DollarSign size={20} />}
                        />
                        <MetricCard
                            title={t('superadmin.tenant.totalProjects', 'Proyectos Totales')}
                            value={tenants.reduce((sum, t) => sum + t.usage.projectCount, 0)}
                            subtitle={t('superadmin.tenant.metrics.allTenantsSubtitle', 'En todos los tenants')}
                            icon={<Folder size={20} />}
                        />
                    </div>

                    {/* Tabs y controles */}
                    <div className="bg-q-surface border border-q-border rounded-lg p-4 mb-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            {/* Tabs */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setActiveTab('all')}
                                    className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'all'
                                        ? 'text-q-accent'
                                        : 'text-q-text-secondary hover:text-q-text'
                                        }`}
                                >
                                    {t('superadmin.tenant.allTenants', 'Todos')} ({tenants.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('individual')}
                                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'individual'
                                        ? 'text-q-accent'
                                        : 'text-q-text-secondary hover:text-q-text'
                                        }`}
                                >
                                    <User size={16} />
                                    {t('superadmin.tenant.individual', 'Individuales')} ({individualCount})
                                </button>
                                <button
                                    onClick={() => setActiveTab('agency')}
                                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'agency'
                                        ? 'text-q-accent'
                                        : 'text-q-text-secondary hover:text-q-text'
                                        }`}
                                >
                                    <Building2 size={16} />
                                    {t('superadmin.tenant.agencies', 'Agencias')} ({agencyCount})
                                </button>
                            </div>

                            {/* Búsqueda y filtros */}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 bg-q-surface-overlay/40 rounded-lg px-3 py-2 min-w-[200px]">
                                    <Search size={16} className="text-q-text-secondary flex-shrink-0" />
                                    <input
                                        type="text"
                                        placeholder="Buscar tenants..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="flex-1 bg-transparent outline-none text-sm min-w-0"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} className="text-q-text-secondary hover:text-q-text flex-shrink-0">
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>

                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as TenantStatus | 'all')}
                                    className="px-3 py-2 bg-q-bg border border-q-border rounded-lg text-sm text-q-text focus:outline-none focus:ring-2 focus:ring-q-accent"
                                >
                                    <option value="all">{t('superadmin.allStatuses')}</option>
                                    <option value="active">{t('superadmin.active')}</option>
                                    <option value="trial">{t('superadmin.onTrial')}</option>
                                    <option value="suspended">{t('superadmin.suspended')}</option>
                                    <option value="expired">{t('superadmin.expired')}</option>
                                </select>

                                {canPerform('canEditTenants') && (
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="flex items-center gap-2 px-3 py-2 text-q-accent text-sm font-semibold hover:text-q-accent/80 transition-colors"
                                    >
                                        <Plus size={16} />
                                        Nuevo Tenant
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Lista de tenants */}
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <QuimeraLoader size="md" />
                        </div>
                    ) : filteredTenants.length > 0 ? (
                        <div className="space-y-3">
                            {filteredTenants.map(tenant => (
                                <TenantRow key={tenant.id} tenant={tenant} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-q-surface border border-q-border rounded-lg">
                            <Users size={48} className="mx-auto text-q-text-secondary mb-4" />
                            <p className="text-lg font-semibold text-q-text mb-2">
                                No se encontraron tenants
                            </p>
                            <p className="text-q-text-secondary mb-4">
                                Intenta ajustar tus filtros o crea un nuevo tenant
                            </p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="inline-flex items-center gap-2 px-3 py-2 text-q-accent text-sm font-semibold hover:text-q-accent/80 transition-colors"
                            >
                                <Plus size={16} />
                                Crear Primer Tenant
                            </button>
                        </div>
                    )}
                </main>
            </div>

            {/* Modal de creación */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-q-surface border border-q-border rounded-lg p-6 max-w-md w-full">
                        <h2 className="text-xl font-bold text-q-text mb-4">Crear Nuevo Tenant</h2>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const data = {
                                name: formData.get('name') as string,
                                email: formData.get('email') as string,
                                type: formData.get('type') as 'individual' | 'agency',
                                plan: formData.get('plan') as string,
                                companyName: formData.get('companyName') as string
                            };

                            try {
                                setLoading(true);
                                await createTenant(data);
                                setShowCreateModal(false);
                                // Refresh tenants list
                                await fetchTenants();
                            } catch (error: any) {
                                console.error('Error creating tenant:', error);
                                alert(`Error al crear el tenant: ${error.message}`);
                            } finally {
                                setLoading(false);
                            }
                        }}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-q-text-secondary mb-1">Nombre</label>
                                    <input
                                        name="name"
                                        required
                                        className="w-full px-3 py-2 bg-q-bg border border-q-border rounded-lg text-q-text focus:outline-none focus:ring-2 focus:ring-q-accent"
                                        placeholder={t('superadmin.tenantName')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-q-text-secondary mb-1">Email</label>
                                    <input
                                        name="email"
                                        type="email"
                                        required
                                        className="w-full px-3 py-2 bg-q-bg border border-q-border rounded-lg text-q-text focus:outline-none focus:ring-2 focus:ring-q-accent"
                                        placeholder="admin@ejemplo.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-q-text-secondary mb-1">Tipo</label>
                                    <select
                                        name="type"
                                        className="w-full px-3 py-2 bg-q-bg border border-q-border rounded-lg text-q-text focus:outline-none focus:ring-2 focus:ring-q-accent"
                                    >
                                        <option value="individual">{t('superadmin.individual')}</option>
                                        <option value="agency">{t('superadmin.agency')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-q-text-secondary mb-1">Plan</label>
                                    <select
                                        name="plan"
                                        className="w-full px-3 py-2 bg-q-bg border border-q-border rounded-lg text-q-text focus:outline-none focus:ring-2 focus:ring-q-accent"
                                    >
                                        <option value="free">{t('superadmin.free')}</option>
                                        <option value="pro">Pro</option>
                                        <option value="enterprise">{t('superadmin.enterprise')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-q-text-secondary mb-1">Empresa (Opcional)</label>
                                    <input
                                        name="companyName"
                                        className="w-full px-3 py-2 bg-q-bg border border-q-border rounded-lg text-q-text focus:outline-none focus:ring-2 focus:ring-q-accent"
                                        placeholder={t('superadmin.companyName')}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 text-q-text-secondary hover:text-q-text transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-q-accent text-white rounded-lg hover:bg-q-accent/90 transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Creando...' : 'Crear Tenant'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de detalles */}
            {selectedTenant && (
                <TenantDetailsModal
                    tenant={selectedTenant}
                    allTenants={tenants}
                    onClose={() => setSelectedTenant(null)}
                    onSelectTenant={setSelectedTenant}
                    updateTenant={updateTenant}
                    fetchTenants={fetchTenants}
                />
            )}

            <ConfirmationModal
                isOpen={!!pendingDeleteTenantId}
                onConfirm={confirmDeleteTenant}
                onCancel={() => setPendingDeleteTenantId(null)}
                title={t('superadmin.tenant.alerts.deleteConfirm', '¿Estás seguro de eliminar este tenant?')}
                message={t('superadmin.tenant.alerts.deleteWarning', 'Esta acción no se puede deshacer.')}
                variant="danger"
            />
        </div>
    );
};

// Sub-componente para el modal de detalles — EDITABLE con información completa
const TenantDetailsModal: React.FC<{
    tenant: Tenant;
    allTenants: Tenant[];
    onClose: () => void;
    onSelectTenant: (tenant: Tenant) => void;
    updateTenant: (tenantId: string, data: Partial<Tenant>) => Promise<void>;
    fetchTenants: () => Promise<void>;
}> = ({ tenant, allTenants, onClose, onSelectTenant, updateTenant, fetchTenants }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'general' | 'clients' | 'subscription' | 'credits'>('general');

    // Edit mode state
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editData, setEditData] = useState({
        name: tenant.name || '',
        email: tenant.email || '',
        companyName: tenant.companyName || '',
        status: tenant.status,
        subscriptionPlan: tenant.subscriptionPlan,
        type: tenant.type,
    });
    const [editLimits, setEditLimits] = useState({
        maxProjects: tenant.limits?.maxProjects ?? 1,
        maxUsers: tenant.limits?.maxUsers ?? 1,
        maxStorageGB: tenant.limits?.maxStorageGB ?? 1,
        maxAiCredits: tenant.limits?.maxAiCredits ?? 100,
    });

    // Reset edit state when tenant changes
    useEffect(() => {
        setEditData({
            name: tenant.name || '',
            email: tenant.email || '',
            companyName: tenant.companyName || '',
            status: tenant.status,
            subscriptionPlan: tenant.subscriptionPlan,
            type: tenant.type,
        });
        setEditLimits({
            maxProjects: tenant.limits?.maxProjects ?? 1,
            maxUsers: tenant.limits?.maxUsers ?? 1,
            maxStorageGB: tenant.limits?.maxStorageGB ?? 1,
            maxAiCredits: tenant.limits?.maxAiCredits ?? 100,
        });
        setIsEditing(false);
    }, [tenant.id]);

    const [creditUsage, setCreditUsage] = useState<AiCreditsUsage | null>(null);
    const [creditTransactions, setCreditTransactions] = useState<AiCreditTransaction[]>([]);
    const [isLoadingCredits, setIsLoadingCredits] = useState(false);
    const [isAddingCredits, setIsAddingCredits] = useState(false);
    const [addCreditAmount, setAddCreditAmount] = useState(100);
    const [addCreditReason, setAddCreditReason] = useState('');

    useEffect(() => {
        if (activeTab === 'credits' || activeTab === 'subscription') {
            loadCreditData();
        }
    }, [activeTab, tenant.id]);

    const loadCreditData = async () => {
        if (!tenant.id) return;
        setIsLoadingCredits(true);
        try {
            const usageRef = doc(db, 'aiCreditsUsage', tenant.id);
            const usageSnap = await getDoc(usageRef);
            if (usageSnap.exists()) {
                setCreditUsage(usageSnap.data() as AiCreditsUsage);
            } else {
                setCreditUsage(null);
            }

            const txnsSnap = await getDocs(query(
                collection(db, 'aiCreditsTransactions'),
                where('tenantId', '==', tenant.id),
                orderBy('timestamp', 'desc'),
                limit(10)
            ));
            setCreditTransactions(txnsSnap.docs.map(d => ({ id: d.id, ...d.data() } as AiCreditTransaction)));
        } catch (error) {
            console.error('Error loading credit data:', error);
        } finally {
            setIsLoadingCredits(false);
        }
    };

    const handleAddCredits = async () => {
        if (addCreditAmount <= 0) return;
        setIsAddingCredits(true);
        try {
            const success = await addCredits(tenant.id, addCreditAmount, 'manual', { reason: addCreditReason });
            if (success) {
                await loadCreditData();
                setAddCreditAmount(100);
                setAddCreditReason('');
                alert(t('superadmin.tenant.detailsModal.addCreditsSuccess', t('superadmin.creditsAddedSuccess')));
            } else {
                alert('Error al añadir créditos.');
            }
        } catch (error) {
            console.error('Error adding credits:', error);
        } finally {
            setIsAddingCredits(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateTenant(tenant.id, {
                name: editData.name,
                email: editData.email,
                companyName: editData.companyName,
                status: editData.status as TenantStatus,
                subscriptionPlan: editData.subscriptionPlan as Tenant['subscriptionPlan'],
                type: editData.type as TenantType,
                limits: {
                    ...tenant.limits,
                    ...editLimits,
                },
            } as Partial<Tenant>);
            await fetchTenants();
            setIsEditing(false);
            alert(t('superadmin.tenant.detailsModal.saveSuccess', 'Cambios guardados exitosamente'));
        } catch (error) {
            console.error('Error saving tenant:', error);
            alert(t('superadmin.tenant.detailsModal.saveError', 'Error al guardar los cambios'));
        } finally {
            setIsSaving(false);
        }
    };

    // Filtrar sub-clientes si es una agencia
    const agencyClients = allTenants.filter(t => t.ownerTenantId === tenant.id);

    const getStatusIcon = (status: TenantStatus) => {
        switch (status) {
            case 'active': return <CheckCircle size={16} className="text-green-500" />;
            case 'trial': return <Clock size={16} className="text-blue-500" />;
            case 'suspended': return <AlertCircle size={16} className="text-yellow-500" />;
            case 'expired': return <XCircle size={16} className="text-red-500" />;
        }
    };

    const formatDate = (dateVal: any) => {
        if (!dateVal) return '—';
        if (dateVal.seconds) return new Date(dateVal.seconds * 1000).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        if (typeof dateVal === 'string') return new Date(dateVal).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        return '—';
    };

    const inputClass = "w-full px-3 py-2 bg-q-bg border border-q-border rounded-lg text-q-text focus:outline-none focus:ring-2 focus:ring-q-accent/50 focus:border-q-accent transition-colors";
    const selectClass = "w-full px-3 py-2 bg-q-bg border border-q-border rounded-lg text-q-text focus:outline-none focus:ring-2 focus:ring-q-accent/50 focus:border-q-accent transition-colors";
    const labelClass = "text-sm text-q-text-secondary block mb-1.5 font-medium";
    const readOnlyValueClass = "text-q-text font-medium";

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-q-surface border border-q-border rounded-xl p-6 max-w-4xl w-full max-h-[85vh] overflow-y-auto flex flex-col shadow-2xl">
                <div className="flex items-center justify-between mb-6 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg ${tenant.type === 'agency' ? 'bg-blue-500/20' : 'bg-purple-500/20'}`}>
                            {tenant.type === 'agency' ?
                                <Building2 size={22} className="text-blue-400" /> :
                                <User size={22} className="text-purple-400" />
                            }
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-q-text">
                                {isEditing ? editData.name : tenant.name}
                            </h2>
                            <p className="text-sm text-q-text-secondary">{tenant.email || 'Sin email'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {activeTab === 'general' && (
                            <button
                                onClick={() => {
                                    if (isEditing) {
                                        // Cancel editing
                                        setEditData({
                                            name: tenant.name || '',
                                            email: tenant.email || '',
                                            companyName: tenant.companyName || '',
                                            status: tenant.status,
                                            subscriptionPlan: tenant.subscriptionPlan,
                                            type: tenant.type,
                                        });
                                        setEditLimits({
                                            maxProjects: tenant.limits?.maxProjects ?? 1,
                                            maxUsers: tenant.limits?.maxUsers ?? 1,
                                            maxStorageGB: tenant.limits?.maxStorageGB ?? 1,
                                            maxAiCredits: tenant.limits?.maxAiCredits ?? 100,
                                        });
                                        setIsEditing(false);
                                    } else {
                                        setIsEditing(true);
                                    }
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${isEditing
                                    ? 'text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 border border-yellow-500/30'
                                    : 'text-q-accent hover:text-q-accent/80 bg-q-accent/10 border border-q-accent/30'
                                    }`}
                            >
                                <Edit2 size={14} />
                                {isEditing ? 'Cancelar' : 'Editar'}
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 text-q-text-secondary hover:text-q-text rounded-lg hover:bg-q-bg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex border-b border-q-border mb-6 flex-shrink-0 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'general'
                            ? 'border-q-accent text-q-accent'
                            : 'border-transparent text-q-text-secondary hover:text-q-text'
                            }`}
                    >
                        {t('superadmin.tenant.detailsModal.tabs.general', 'Información General')}
                    </button>
                    <button
                        onClick={() => setActiveTab('subscription')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'subscription'
                            ? 'border-q-accent text-q-accent'
                            : 'border-transparent text-q-text-secondary hover:text-q-text'
                            }`}
                    >
                        {t('superadmin.tenant.detailsModal.tabs.subscription', 'Suscripción y Pagos')}
                    </button>
                    <button
                        onClick={() => setActiveTab('credits')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'credits'
                            ? 'border-q-accent text-q-accent'
                            : 'border-transparent text-q-text-secondary hover:text-q-text'
                            }`}
                    >
                        {t('superadmin.tenant.detailsModal.tabs.credits', 'Créditos IA')}
                    </button>
                    {tenant.type === 'agency' && (
                        <button
                            onClick={() => setActiveTab('clients')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'clients'
                                ? 'border-q-accent text-q-accent'
                                : 'border-transparent text-q-text-secondary hover:text-q-text'
                                }`}
                        >
                            {t('superadmin.tenant.detailsModal.tabs.clients', 'Clientes')} ({agencyClients.length})
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pr-2">
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            {/* Información Principal */}
                            <div>
                                <h3 className="font-semibold text-q-text mb-4 flex items-center gap-2 text-base">
                                    <User className="w-4 h-4 text-q-accent" />
                                    Información del Cliente
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-q-bg/50 p-4 rounded-lg border border-q-border/50">
                                    <div>
                                        <label className={labelClass}>Nombre</label>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={editData.name}
                                                onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                                                className={inputClass}
                                            />
                                        ) : (
                                            <p className={readOnlyValueClass}>{tenant.name || '—'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className={labelClass}>Email</label>
                                        {isEditing ? (
                                            <input
                                                type="email"
                                                value={editData.email}
                                                onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                                                className={inputClass}
                                            />
                                        ) : (
                                            <p className={readOnlyValueClass}>{tenant.email || '—'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className={labelClass}>Empresa</label>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={editData.companyName}
                                                onChange={(e) => setEditData(prev => ({ ...prev, companyName: e.target.value }))}
                                                className={inputClass}
                                                placeholder="Nombre de la empresa"
                                            />
                                        ) : (
                                            <p className={readOnlyValueClass}>{tenant.companyName || '—'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className={labelClass}>Tipo</label>
                                        {isEditing ? (
                                            <select
                                                value={editData.type}
                                                onChange={(e) => setEditData(prev => ({ ...prev, type: e.target.value as TenantType }))}
                                                className={selectClass}
                                            >
                                                <option value="individual">Individual</option>
                                                <option value="agency_client">Cliente de Agencia</option>
                                            </select>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                {tenant.type === 'agency' ? <Building2 size={16} className="text-blue-400" /> : <User size={16} className="text-purple-400" />}
                                                <p className="text-q-text capitalize font-medium">{tenant.type === 'agency_client' ? 'Cliente de Agencia' : tenant.type}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className={labelClass}>Estado</label>
                                        {isEditing ? (
                                            <select
                                                value={editData.status}
                                                onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value as TenantStatus }))}
                                                className={selectClass}
                                            >
                                                <option value="active">Activo</option>
                                                <option value="trial">Prueba</option>
                                                <option value="suspended">Suspendido</option>
                                                <option value="expired">Expirado</option>
                                            </select>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(tenant.status)}
                                                <span className="capitalize text-q-text font-medium">{tenant.status}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className={labelClass}>Plan Actual</label>
                                        {isEditing ? (
                                            <select
                                                value={editData.subscriptionPlan}
                                                onChange={(e) => setEditData(prev => ({ ...prev, subscriptionPlan: e.target.value as Tenant['subscriptionPlan'] }))}
                                                className={selectClass}
                                            >
                                                <option value="free">Free</option>
                                                <option value="hobby">Hobby</option>
                                                <option value="starter">Starter</option>
                                                <option value="individual">Individual</option>
                                                <option value="pro">Pro</option>
                                                <option value="agency">Agency</option>
                                                <option value="agency_plus">Agency Plus</option>
                                                <option value="agency_starter">Agency Starter</option>
                                                <option value="agency_pro">Agency Pro</option>
                                                <option value="agency_scale">Agency Scale</option>
                                                <option value="enterprise">Enterprise</option>
                                            </select>
                                        ) : (
                                            <span className="px-2.5 py-1 bg-purple-500/10 text-purple-400 rounded-md text-sm border border-purple-500/20 font-semibold capitalize inline-block">
                                                {tenant.subscriptionPlan}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Identificadores y Metadata */}
                            <div>
                                <h3 className="font-semibold text-q-text mb-4 flex items-center gap-2 text-base">
                                    <HardDrive className="w-4 h-4 text-q-accent" />
                                    Identificadores y Metadata
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-q-bg/50 p-4 rounded-lg border border-q-border/50">
                                    <div>
                                        <label className={labelClass}>Tenant ID</label>
                                        <p className="text-q-text font-mono text-xs bg-q-bg px-2 py-1.5 rounded border border-q-border select-all">{tenant.id}</p>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Owner User ID</label>
                                        <p className="text-q-text font-mono text-xs bg-q-bg px-2 py-1.5 rounded border border-q-border select-all">{tenant.ownerUserId || '—'}</p>
                                    </div>
                                    {tenant.ownerTenantId && (
                                        <div>
                                            <label className={labelClass}>Owner Tenant ID (Agencia)</label>
                                            <p className="text-q-text font-mono text-xs bg-q-bg px-2 py-1.5 rounded border border-q-border select-all">{tenant.ownerTenantId}</p>
                                        </div>
                                    )}
                                    <div>
                                        <label className={labelClass}>Slug</label>
                                        <p className={readOnlyValueClass}>{tenant.slug || '—'}</p>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Fecha de Creación</label>
                                        <p className={readOnlyValueClass}>{formatDate(tenant.createdAt)}</p>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Última Actualización</label>
                                        <p className={readOnlyValueClass}>{formatDate(tenant.updatedAt)}</p>
                                    </div>
                                    {tenant.lastActiveAt && (
                                        <div>
                                            <label className={labelClass}>Última Actividad</label>
                                            <p className={readOnlyValueClass}>{formatDate(tenant.lastActiveAt)}</p>
                                        </div>
                                    )}
                                    {tenant.trialEndsAt && (
                                        <div>
                                            <label className={labelClass}>Trial Expira</label>
                                            <p className="text-yellow-400 font-medium">{formatDate(tenant.trialEndsAt)}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Métricas de Uso */}
                            <div>
                                <h3 className="font-semibold text-q-text mb-4 flex items-center gap-2 text-base">
                                    <Zap className="w-4 h-4 text-q-accent" />
                                    Métricas de Uso
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-q-bg p-3 rounded-lg border border-q-border">
                                        <div className="flex items-center gap-1.5 mb-1 text-q-text-secondary">
                                            <Folder size={14} />
                                            <span className="text-xs font-medium">Proyectos</span>
                                        </div>
                                        <div className="font-bold text-q-text text-lg">
                                            {tenant.usage?.projectCount ?? 0} <span className="text-q-text-secondary font-normal text-sm">/ {tenant.limits?.maxProjects === -1 ? '∞' : tenant.limits?.maxProjects ?? '?'}</span>
                                        </div>
                                    </div>
                                    <div className="bg-q-bg p-3 rounded-lg border border-q-border">
                                        <div className="flex items-center gap-1.5 mb-1 text-q-text-secondary">
                                            <Users size={14} />
                                            <span className="text-xs font-medium">Usuarios</span>
                                        </div>
                                        <div className="font-bold text-q-text text-lg">
                                            {tenant.usage?.userCount ?? 0} <span className="text-q-text-secondary font-normal text-sm">/ {tenant.limits?.maxUsers === -1 ? '∞' : tenant.limits?.maxUsers ?? '?'}</span>
                                        </div>
                                    </div>
                                    <div className="bg-q-bg p-3 rounded-lg border border-q-border">
                                        <div className="flex items-center gap-1.5 mb-1 text-q-text-secondary">
                                            <HardDrive size={14} />
                                            <span className="text-xs font-medium">Almacenamiento</span>
                                        </div>
                                        <div className="font-bold text-q-text text-lg">
                                            {(tenant.usage?.storageUsedGB ?? 0).toFixed(1)} <span className="text-q-text-secondary font-normal text-sm">/ {tenant.limits?.maxStorageGB ?? '?'} GB</span>
                                        </div>
                                    </div>
                                    <div className="bg-q-bg p-3 rounded-lg border border-q-border">
                                        <div className="flex items-center gap-1.5 mb-1 text-q-text-secondary">
                                            <Zap size={14} />
                                            <span className="text-xs font-medium">Créditos IA</span>
                                        </div>
                                        <div className="font-bold text-q-text text-lg">
                                            {tenant.usage?.aiCreditsUsed ?? 0} <span className="text-q-text-secondary font-normal text-sm">/ {tenant.limits?.maxAiCredits ?? '?'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Límites del Plan (editable) */}
                            {isEditing && (
                                <div>
                                    <h3 className="font-semibold text-q-text mb-4 flex items-center gap-2 text-base">
                                        <Zap className="w-4 h-4 text-q-accent" />
                                        Límites del Plan
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-q-bg/50 p-4 rounded-lg border border-q-border/50">
                                        <div>
                                            <label className={labelClass}>Máx. Proyectos</label>
                                            <input
                                                type="number"
                                                value={editLimits.maxProjects}
                                                onChange={(e) => setEditLimits(prev => ({ ...prev, maxProjects: parseInt(e.target.value) || 0 }))}
                                                className={inputClass}
                                            />
                                            <p className="text-xs text-q-text-secondary mt-1">-1 = ilimitado</p>
                                        </div>
                                        <div>
                                            <label className={labelClass}>Máx. Usuarios</label>
                                            <input
                                                type="number"
                                                value={editLimits.maxUsers}
                                                onChange={(e) => setEditLimits(prev => ({ ...prev, maxUsers: parseInt(e.target.value) || 0 }))}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Máx. Almacenamiento (GB)</label>
                                            <input
                                                type="number"
                                                value={editLimits.maxStorageGB}
                                                onChange={(e) => setEditLimits(prev => ({ ...prev, maxStorageGB: parseInt(e.target.value) || 0 }))}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Máx. Créditos IA</label>
                                            <input
                                                type="number"
                                                value={editLimits.maxAiCredits}
                                                onChange={(e) => setEditLimits(prev => ({ ...prev, maxAiCredits: parseInt(e.target.value) || 0 }))}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Branding Info */}
                            {tenant.branding && (tenant.branding.customDomain || tenant.branding.quimeraSubdomain || tenant.branding.primaryColor) && (
                                <div>
                                    <h3 className="font-semibold text-q-text mb-4 flex items-center gap-2 text-base">
                                        <Building2 className="w-4 h-4 text-q-accent" />
                                        Branding
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-q-bg/50 p-4 rounded-lg border border-q-border/50">
                                        {tenant.branding.customDomain && (
                                            <div>
                                                <label className={labelClass}>Dominio Personalizado</label>
                                                <p className={readOnlyValueClass}>{tenant.branding.customDomain}{tenant.branding.customDomainVerified ? ' ✅' : ' ⏳'}</p>
                                            </div>
                                        )}
                                        {tenant.branding.quimeraSubdomain && (
                                            <div>
                                                <label className={labelClass}>Subdominio Quimera</label>
                                                <p className={readOnlyValueClass}>{tenant.branding.quimeraSubdomain}.quimera.ai</p>
                                            </div>
                                        )}
                                        {tenant.branding.primaryColor && (
                                            <div>
                                                <label className={labelClass}>Color Primario</label>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded border border-q-border" style={{ backgroundColor: tenant.branding.primaryColor }} />
                                                    <p className={readOnlyValueClass}>{tenant.branding.primaryColor}</p>
                                                </div>
                                            </div>
                                        )}
                                        {tenant.branding.supportEmail && (
                                            <div>
                                                <label className={labelClass}>Email de Soporte</label>
                                                <p className={readOnlyValueClass}>{tenant.branding.supportEmail}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'subscription' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-q-text mb-4 flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-q-accent" />
                                    {t('superadmin.tenant.detailsModal.subscriptionInfo', 'Información del Plan')}
                                </h3>
                                <div className="bg-q-surface border border-q-border rounded-lg p-5 grid grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-sm text-q-text-secondary mb-1">Plan Actual</p>
                                        <span className="px-3 py-1 bg-purple-500/10 text-purple-400 rounded-md text-sm border border-purple-500/20 font-medium capitalize inline-block mt-1">
                                            {tenant.subscriptionPlan}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-q-text-secondary mb-1">Estado</p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            {getStatusIcon(tenant.status)}
                                            <span className="capitalize font-medium text-q-text">{tenant.status}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-q-text-secondary mb-1">{t('superadmin.tenant.detailsModal.mrr', 'Ingreso Recurrente (MRR)')}</p>
                                        <p className="text-q-text font-bold text-2xl mt-1">${tenant.billing?.mrr || tenant.billingInfo?.mrr || 0} <span className="text-sm font-normal text-q-text-secondary">/mes</span></p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-q-text-secondary mb-2">{t('superadmin.tenant.detailsModal.limits', 'Límites del Plan')}</p>
                                        <ul className="text-sm text-q-text space-y-1">
                                            <li className="flex justify-between border-b border-q-border/50 pb-1">
                                                <span className="text-q-text-secondary">Proyectos:</span>
                                                <span className="font-medium">{tenant.limits?.maxProjects === -1 ? '∞' : tenant.limits?.maxProjects ?? '?'}</span>
                                            </li>
                                            <li className="flex justify-between border-b border-q-border/50 pb-1 pt-1">
                                                <span className="text-q-text-secondary">Usuarios:</span>
                                                <span className="font-medium">{tenant.limits?.maxUsers === -1 ? '∞' : tenant.limits?.maxUsers ?? '?'}</span>
                                            </li>
                                            <li className="flex justify-between border-b border-q-border/50 pb-1 pt-1">
                                                <span className="text-q-text-secondary">Almacenamiento:</span>
                                                <span className="font-medium">{tenant.limits?.maxStorageGB ?? '?'} GB</span>
                                            </li>
                                            <li className="flex justify-between pt-1">
                                                <span className="text-q-text-secondary">Créditos IA:</span>
                                                <span className="font-medium">{tenant.limits?.maxAiCredits ?? '?'}</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Billing details */}
                            {(tenant.billing || tenant.billingInfo) && (
                                <div>
                                    <h3 className="text-lg font-semibold text-q-text mb-4 flex items-center gap-2">
                                        <DollarSign className="w-5 h-5 text-q-accent" />
                                        Detalles de Facturación
                                    </h3>
                                    <div className="bg-q-surface border border-q-border rounded-lg p-5 grid grid-cols-2 gap-4">
                                        {tenant.billing?.stripeCustomerId && (
                                            <div>
                                                <p className="text-sm text-q-text-secondary mb-1">Stripe Customer ID</p>
                                                <p className="text-q-text font-mono text-xs">{tenant.billing.stripeCustomerId}</p>
                                            </div>
                                        )}
                                        {tenant.billing?.stripeSubscriptionId && (
                                            <div>
                                                <p className="text-sm text-q-text-secondary mb-1">Stripe Subscription ID</p>
                                                <p className="text-q-text font-mono text-xs">{tenant.billing.stripeSubscriptionId}</p>
                                            </div>
                                        )}
                                        {(tenant.billing?.nextBillingDate || tenant.billingInfo?.nextBillingDate) && (
                                            <div>
                                                <p className="text-sm text-q-text-secondary mb-1">Próx. Fecha de Cobro</p>
                                                <p className={readOnlyValueClass}>{tenant.billing?.nextBillingDate || tenant.billingInfo?.nextBillingDate}</p>
                                            </div>
                                        )}
                                        {(tenant.billing?.paymentMethod || tenant.billingInfo?.paymentMethod) && (
                                            <div>
                                                <p className="text-sm text-q-text-secondary mb-1">Método de Pago</p>
                                                <p className={readOnlyValueClass}>{tenant.billing?.paymentMethod || tenant.billingInfo?.paymentMethod}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'credits' && (
                        <div className="space-y-6">
                            {isLoadingCredits ? (
                                <div className="flex justify-center py-8">
                                    <QuimeraLoader size="md" />
                                </div>
                            ) : (
                                <>
                                    {/* Usage Bar */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-q-text mb-4 flex items-center gap-2">
                                            <Zap className="w-5 h-5 text-q-accent" />
                                            {t('superadmin.tenant.detailsModal.aiCreditsUsage', 'Uso de Créditos IA')}
                                        </h3>

                                        <div className="bg-q-surface border border-q-border rounded-lg p-6">
                                            <div className="flex justify-between items-end mb-2">
                                                <div>
                                                    <p className="text-3xl font-bold text-q-text tracking-tight">
                                                        {(creditUsage?.creditsRemaining || 0).toLocaleString()}
                                                    </p>
                                                    <p className="text-sm text-q-text-secondary font-medium">
                                                        {t('superadmin.tenant.detailsModal.creditsRemaining', 'Créditos Restantes')}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-q-text font-medium">
                                                        {((creditUsage?.creditsUsed || 0)).toLocaleString()} / {(creditUsage?.creditsIncluded || 0).toLocaleString()} usados
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="h-3 bg-q-bg rounded-full overflow-hidden mb-6 border border-q-border/50">
                                                <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{
                                                        width: `${Math.min(((creditUsage?.creditsUsed || 0) / (creditUsage?.creditsIncluded || 1)) * 100, 100)}%`,
                                                        backgroundColor: getUsageColor(((creditUsage?.creditsUsed || 0) / (creditUsage?.creditsIncluded || 1)) * 100)
                                                    }}
                                                />
                                            </div>

                                            {/* Add Credits Inline Form */}
                                            <div className="mt-6 pt-6 border-t border-q-border">
                                                <h4 className="text-sm font-semibold text-q-text mb-4 flex items-center gap-2">
                                                    <Gift className="w-4 h-4 text-q-accent" />
                                                    {t('superadmin.tenant.detailsModal.addCredits', 'Añadir Créditos')}
                                                </h4>
                                                <div className="flex gap-3">
                                                    <input
                                                        type="number"
                                                        value={addCreditAmount}
                                                        onChange={(e) => setAddCreditAmount(parseInt(e.target.value) || 0)}
                                                        className="w-32 px-3 py-2 bg-q-bg border border-q-border rounded-lg text-q-text focus:outline-none focus:border-q-accent"
                                                        placeholder="Cant."
                                                    />
                                                    <input
                                                        type="text"
                                                        value={addCreditReason}
                                                        onChange={(e) => setAddCreditReason(e.target.value)}
                                                        className="flex-1 px-3 py-2 bg-q-bg border border-q-border rounded-lg text-q-text focus:outline-none focus:border-q-accent"
                                                        placeholder={t('superadmin.rechargeReason')}
                                                    />
                                                    <button
                                                        onClick={handleAddCredits}
                                                        disabled={isAddingCredits || addCreditAmount <= 0}
                                                        className="px-4 py-2 bg-q-accent text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
                                                    >
                                                        {isAddingCredits ? '...' : t('common.add', 'Añadir')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Transaction History */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-q-text mb-4 flex items-center gap-2">
                                            <History className="w-5 h-5 text-q-accent" />
                                            {t('superadmin.tenant.detailsModal.transactionHistory', 'Historial de Transacciones')}
                                        </h3>

                                        {creditTransactions.length > 0 ? (
                                            <div className="space-y-2">
                                                {creditTransactions.map(tx => (
                                                    <div key={tx.id} className="flex items-center justify-between p-3 bg-q-surface border border-q-border rounded-lg hover:border-q-accent/30 transition-colors">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`p-2 rounded-lg ${tx.type === 'deposit' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                                {tx.type === 'deposit' ? <Plus size={16} /> : <Zap size={16} />}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-q-text">
                                                                    {tx.description}
                                                                </p>
                                                                <p className="text-xs text-q-text-secondary mt-0.5">
                                                                    {new Date(tx.timestamp.seconds * 1000).toLocaleString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className={`font-semibold ${tx.type === 'deposit' ? 'text-green-500' : 'text-q-text'}`}>
                                                            {tx.type === 'deposit' ? '+' : ''}{tx.amount.toLocaleString()}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 bg-q-surface border border-q-border rounded-lg border-dashed">
                                                <History size={24} className="mx-auto text-q-text-secondary mb-2 opacity-50" />
                                                <p className="text-q-text-secondary text-sm">
                                                    {t('superadmin.tenant.detailsModal.noTransactions', 'No hay transacciones recientes')}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'clients' && tenant.type === 'agency' && (
                        <div className="space-y-3">
                            {agencyClients.length > 0 ? (
                                agencyClients.map(client => (
                                    <div
                                        key={client.id}
                                        onClick={() => onSelectTenant(client)}
                                        className="flex items-center justify-between p-3 bg-q-surface border border-q-border rounded-lg hover:border-q-accent/50 cursor-pointer transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-q-bg rounded text-purple-400">
                                                <User size={18} />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-q-text group-hover:text-q-accent transition-colors">
                                                    {client.name}
                                                </h4>
                                                <p className="text-xs text-q-text-secondary">{client.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="text-xs text-q-text-secondary">Plan</div>
                                                <div className="text-sm font-medium text-q-text capitalize">{client.subscriptionPlan}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-q-text-secondary">Estado</div>
                                                <div className="flex items-center justify-end gap-1">
                                                    {getStatusIcon(client.status)}
                                                    <span className="text-sm text-q-text capitalize">{client.status}</span>
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className="text-q-text-secondary" />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 bg-q-surface border border-q-border rounded-lg border-dashed">
                                    <Users size={32} className="mx-auto text-q-text-secondary mb-2 opacity-50" />
                                    <p className="text-q-text-secondary">Esta agencia no tiene clientes registrados aún.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-between items-center pt-4 border-t border-q-border flex-shrink-0">
                    <div>
                        {isEditing && (
                            <p className="text-xs text-yellow-400 flex items-center gap-1">
                                <Edit2 size={12} />
                                Modo edición activo
                            </p>
                        )}
                    </div>
                    <div className="flex gap-3">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 bg-q-bg border border-q-border text-q-text rounded-lg hover:bg-q-surface-overlay transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-5 py-2 bg-q-accent text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Guardando...
                                        </>
                                    ) : (
                                        'Guardar Cambios'
                                    )}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-q-bg border border-q-border text-q-text rounded-lg hover:bg-q-surface-overlay transition-colors"
                            >
                                Cerrar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TenantManagement;
