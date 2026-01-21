import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor } from '../../../contexts/EditorContext';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useAdmin } from '../../../contexts/admin/AdminContext';
import { Tenant, TenantStatus, TenantType, UserDocument } from '../../../types';
import DashboardSidebar from '../DashboardSidebar';
import {
    ArrowLeft, Users, Trash2, Building2, User, Search, Filter,
    Plus, ChevronDown, ChevronRight, MoreVertical, Edit2, UserPlus,
    Folder, HardDrive, Zap, DollarSign, CheckCircle, AlertCircle,
    Clock, XCircle, X
} from 'lucide-react';

interface TenantManagementProps {
    onBack: () => void;
}

const TenantManagement: React.FC<TenantManagementProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const { canPerform } = useAuth();
    const { tenants, fetchTenants, deleteTenant, updateTenantStatus, allUsers, createTenant } = useAdmin();
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

    const handleDeleteTenant = async (tenantId: string) => {
        if (!canPerform('canDeleteTenants')) {
            alert(t('superadmin.tenant.alerts.noPermission', 'No tienes permiso para eliminar tenants.'));
            return;
        }
        if (window.confirm(t('superadmin.tenant.alerts.deleteConfirm', '¿Estás seguro de eliminar este tenant? Esta acción no se puede deshacer.'))) {
            await deleteTenant(tenantId);
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
        return tenants.reduce((sum, t) => sum + (t.billingInfo?.mrr || 0), 0);
    };

    // Componente de métrica
    const MetricCard: React.FC<{
        title: string;
        value: number | string;
        subtitle?: string;
        trend?: string;
        icon: React.ReactNode;
    }> = ({ title, value, subtitle, trend, icon }) => (
        <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-editor-text-secondary">{title}</span>
                <div className="text-editor-accent">{icon}</div>
            </div>
            <div className="text-2xl font-bold text-editor-text-primary mb-1">{value}</div>
            {subtitle && <div className="text-xs text-editor-text-secondary">{subtitle}</div>}
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
            <div className="bg-editor-panel-bg border border-editor-border rounded-lg overflow-hidden mb-3">
                {/* Fila principal */}
                <div className="flex items-center justify-between p-4 hover:bg-editor-bg/50 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                        {/* Botón expandir para agencias */}
                        {tenant.type === 'agency' && (
                            <button
                                onClick={() => toggleExpanded(tenant.id)}
                                className="text-editor-text-secondary hover:text-editor-text-primary"
                            >
                                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                            </button>
                        )}

                        {/* Icono de tipo */}
                        <div className={`p-3 rounded-lg ${tenant.type === 'agency' ? 'bg-blue-500/20' : 'bg-purple-500/20'}`}>
                            {tenant.type === 'agency' ?
                                <Building2 size={24} className="text-blue-400" /> :
                                <User size={24} className="text-purple-400" />
                            }
                        </div>

                        {/* Info principal */}
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-editor-text-primary">{tenant.name}</h3>
                                <span className={`px-2 py-0.5 text-xs rounded-full border ${getStatusColor(tenant.status)}`}>
                                    {tenant.status}
                                </span>
                            </div>
                            <p className="text-sm text-editor-text-secondary">{tenant.email}</p>
                            {tenant.companyName && (
                                <p className="text-xs text-editor-text-secondary mt-1">{tenant.companyName}</p>
                            )}
                        </div>
                    </div>

                    {/* Métricas */}
                    <div className="flex items-center gap-6 mr-6">
                        <div className="text-center">
                            <div className="flex items-center gap-1 text-editor-text-secondary">
                                <Folder size={14} />
                                <span className="text-sm">{tenant.usage.projectCount} / {tenant.limits.maxProjects}</span>
                            </div>
                        </div>
                        <span className="text-xs text-editor-text-secondary">{t('superadmin.tenant.metrics.projects', 'Proyectos')}</span>
                    </div>

                    {tenant.type === 'agency' && (
                        <div className="text-center">
                            <div className="flex items-center gap-1 text-editor-text-secondary">
                                <Users size={14} />
                                <span className="text-sm">{tenant.usage.userCount} / {tenant.limits.maxUsers}</span>
                            </div>
                            <span className="text-xs text-editor-text-secondary">{t('superadmin.tenant.metrics.users', 'Usuarios')}</span>
                        </div>
                    )}

                    <div className="text-center">
                        <div className="flex items-center gap-1 text-editor-text-secondary">
                            <HardDrive size={14} />
                            <span className="text-sm">{tenant.usage.storageUsedGB.toFixed(1)} GB</span>
                        </div>
                        <span className="text-xs text-editor-text-secondary">{t('superadmin.tenant.metrics.storage', 'Almacenamiento')}</span>
                    </div>

                    <div className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-md text-sm font-medium">
                        {tenant.subscriptionPlan}
                    </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSelectedTenant(tenant)}
                        className="p-2 text-editor-text-secondary hover:text-editor-accent hover:bg-editor-bg rounded-lg transition-colors"
                        title="Ver detalles"
                    >
                        <Edit2 size={18} />
                    </button>
                    {canPerform('canDeleteTenants') && (
                        <button
                            onClick={() => handleDeleteTenant(tenant.id)}
                            className="p-2 text-editor-text-secondary hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Eliminar"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
                {/* Vista expandida para agencias */}
                {
                    isExpanded && tenant.type === 'agency' && (
                        <div className="border-t border-editor-border p-4 bg-editor-bg/50">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-editor-text-primary flex items-center gap-2">
                                    <Users size={16} />
                                    {t('superadmin.tenant.agency.members', 'Miembros del equipo')} ({tenantMembers.length})
                                </h4>
                                <button className="flex items-center gap-1 text-sm text-editor-accent hover:text-editor-accent/80 transition-colors">
                                    <UserPlus size={14} />
                                    {t('superadmin.tenant.agency.invite', 'Invitar usuario')}
                                </button>
                            </div>

                            <div className="space-y-2">
                                {tenantMembers.length > 0 ? (
                                    tenantMembers.map(member => (
                                        <div key={member.id} className="flex items-center justify-between p-3 bg-editor-panel-bg rounded-lg border border-editor-border">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={member.photoURL || `https://ui-avatars.com/api/?name=${member.name}&background=3f3f46&color=e4e4e7`}
                                                    alt={member.name}
                                                    className="w-10 h-10 rounded-full object-cover"
                                                />
                                                <div>
                                                    <p className="text-sm font-medium text-editor-text-primary">{member.name}</p>
                                                    <p className="text-xs text-editor-text-secondary">{member.email}</p>
                                                </div>
                                            </div>
                                            <span className="px-2 py-1 text-xs bg-editor-border text-editor-text-secondary rounded-md">
                                                {member.tenantRole || 'member'}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-editor-text-secondary text-center py-4">
                                        {t('superadmin.tenant.agency.noMembers', 'No hay miembros en este equipo')}
                                    </p>
                                )}
                            </div>
                        </div>
                    )
                }
            </div >
        );
    };

    const activeCount = tenants.filter(t => t.status === 'active').length;
    const agencyCount = tenants.filter(t => t.type === 'agency').length;
    const individualCount = tenants.filter(t => t.type === 'individual').length;

    return (
        <div className="flex h-screen bg-editor-bg text-editor-text-primary">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-14 bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                    <div className="flex items-center">
                        <button
                            onClick={onBack}
                            className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary md:hidden mr-2 transition-colors"
                            title="Volver"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Users className="text-editor-accent w-5 h-5" />
                            <h1 className="text-lg font-semibold text-editor-text-primary">{t('superadmin.tenant.title', 'Gestión de Tenants')}</h1>
                        </div>
                    </div>
                    <button
                        onClick={onBack}
                        className="hidden md:flex items-center gap-1.5 h-9 px-3 text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t('superadmin.tenant.back', 'Volver')}
                    </button>
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
                            subtitle={`${((activeCount / tenants.length) * 100).toFixed(0)}% del total`}
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
                    <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-4 mb-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            {/* Tabs */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setActiveTab('all')}
                                    className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'all'
                                        ? 'text-editor-accent'
                                        : 'text-editor-text-secondary hover:text-editor-text-primary'
                                        }`}
                                >
                                    {t('superadmin.tenant.allTenants', 'Todos')} ({tenants.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('individual')}
                                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'individual'
                                        ? 'text-editor-accent'
                                        : 'text-editor-text-secondary hover:text-editor-text-primary'
                                        }`}
                                >
                                    <User size={16} />
                                    {t('superadmin.tenant.individual', 'Individuales')} ({individualCount})
                                </button>
                                <button
                                    onClick={() => setActiveTab('agency')}
                                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'agency'
                                        ? 'text-editor-accent'
                                        : 'text-editor-text-secondary hover:text-editor-text-primary'
                                        }`}
                                >
                                    <Building2 size={16} />
                                    {t('superadmin.tenant.agencies', 'Agencias')} ({agencyCount})
                                </button>
                            </div>

                            {/* Búsqueda y filtros */}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 bg-editor-border/40 rounded-lg px-3 py-2 min-w-[200px]">
                                    <Search size={16} className="text-editor-text-secondary flex-shrink-0" />
                                    <input
                                        type="text"
                                        placeholder="Buscar tenants..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="flex-1 bg-transparent outline-none text-sm min-w-0"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>

                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as TenantStatus | 'all')}
                                    className="px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                >
                                    <option value="all">Todos los estados</option>
                                    <option value="active">Activos</option>
                                    <option value="trial">En prueba</option>
                                    <option value="suspended">Suspendidos</option>
                                    <option value="expired">Expirados</option>
                                </select>

                                {canPerform('canEditTenants') && (
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="flex items-center gap-2 px-3 py-2 text-editor-accent text-sm font-semibold hover:text-editor-accent/80 transition-colors"
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
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-editor-accent mx-auto mb-4"></div>
                            <p className="text-editor-text-secondary">Cargando tenants...</p>
                        </div>
                    ) : filteredTenants.length > 0 ? (
                        <div className="space-y-3">
                            {filteredTenants.map(tenant => (
                                <TenantRow key={tenant.id} tenant={tenant} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-editor-panel-bg border border-editor-border rounded-lg">
                            <Users size={48} className="mx-auto text-editor-text-secondary mb-4" />
                            <p className="text-lg font-semibold text-editor-text-primary mb-2">
                                No se encontraron tenants
                            </p>
                            <p className="text-editor-text-secondary mb-4">
                                Intenta ajustar tus filtros o crea un nuevo tenant
                            </p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="inline-flex items-center gap-2 px-3 py-2 text-editor-accent text-sm font-semibold hover:text-editor-accent/80 transition-colors"
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
                    <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-6 max-w-md w-full">
                        <h2 className="text-xl font-bold text-editor-text-primary mb-4">Crear Nuevo Tenant</h2>
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
                                    <label className="block text-sm font-medium text-editor-text-secondary mb-1">Nombre</label>
                                    <input
                                        name="name"
                                        required
                                        className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                        placeholder="Nombre del tenant"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-editor-text-secondary mb-1">Email</label>
                                    <input
                                        name="email"
                                        type="email"
                                        required
                                        className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                        placeholder="admin@ejemplo.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-editor-text-secondary mb-1">Tipo</label>
                                    <select
                                        name="type"
                                        className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                    >
                                        <option value="individual">Individual</option>
                                        <option value="agency">Agencia</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-editor-text-secondary mb-1">Plan</label>
                                    <select
                                        name="plan"
                                        className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                    >
                                        <option value="free">Gratuito</option>
                                        <option value="pro">Pro</option>
                                        <option value="enterprise">Enterprise</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-editor-text-secondary mb-1">Empresa (Opcional)</label>
                                    <input
                                        name="companyName"
                                        className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                        placeholder="Nombre de la empresa"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-editor-accent text-white rounded-lg hover:bg-editor-accent/90 transition-colors disabled:opacity-50"
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
                />
            )}
        </div>
    );
};

// Sub-componente para el modal de detalles para manejar mejor el estado y la lógica de pestañas
const TenantDetailsModal: React.FC<{
    tenant: Tenant;
    allTenants: Tenant[];
    onClose: () => void;
    onSelectTenant: (tenant: Tenant) => void;
}> = ({ tenant, allTenants, onClose, onSelectTenant }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'general' | 'clients'>('general');

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

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto flex flex-col">
                <div className="flex items-center justify-between mb-6 flex-shrink-0">
                    <h2 className="text-xl font-bold text-editor-text-primary">
                        {tenant.type === 'agency' ? 'Detalles de Agencia' : 'Detalles del Tenant'}
                    </h2>
                    <button onClick={onClose} className="text-editor-text-secondary hover:text-editor-text-primary">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs para agencias */}
                {tenant.type === 'agency' && (
                    <div className="flex border-b border-editor-border mb-6 flex-shrink-0">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general'
                                ? 'border-editor-accent text-editor-accent'
                                : 'border-transparent text-editor-text-secondary hover:text-editor-text-primary'
                                }`}
                        >
                            General
                        </button>
                        <button
                            onClick={() => setActiveTab('clients')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'clients'
                                ? 'border-editor-accent text-editor-accent'
                                : 'border-transparent text-editor-text-secondary hover:text-editor-text-primary'
                                }`}
                        >
                            Clientes ({agencyClients.length})
                        </button>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto min-h-0">
                    {activeTab === 'general' ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-editor-text-secondary block mb-1">Nombre</label>
                                    <p className="text-editor-text-primary font-semibold">{tenant.name}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-editor-text-secondary block mb-1">Empresa</label>
                                    <p className="text-editor-text-primary">{tenant.companyName || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-editor-text-secondary block mb-1">Email</label>
                                    <p className="text-editor-text-primary">{tenant.email}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-editor-text-secondary block mb-1">Tipo</label>
                                    <div className="flex items-center gap-2">
                                        {tenant.type === 'agency' ? <Building2 size={16} className="text-blue-400" /> : <User size={16} className="text-purple-400" />}
                                        <p className="text-editor-text-primary capitalize">{tenant.type}</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm text-editor-text-secondary block mb-1">Estado</label>
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(tenant.status)}
                                        <span className="capitalize text-editor-text-primary">{tenant.status}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm text-editor-text-secondary block mb-1">Plan</label>
                                    <span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded text-sm border border-purple-500/20">
                                        {tenant.subscriptionPlan}
                                    </span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-editor-border mt-4">
                                <h3 className="font-semibold text-editor-text-primary mb-3">Métricas de Uso</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-editor-bg p-3 rounded-lg border border-editor-border">
                                        <div className="text-xs text-editor-text-secondary mb-1">Proyectos</div>
                                        <div className="font-semibold text-editor-text-primary">
                                            {tenant.usage.projectCount} <span className="text-editor-text-secondary font-normal">/ {tenant.limits.maxProjects}</span>
                                        </div>
                                    </div>
                                    <div className="bg-editor-bg p-3 rounded-lg border border-editor-border">
                                        <div className="text-xs text-editor-text-secondary mb-1">Usuarios</div>
                                        <div className="font-semibold text-editor-text-primary">
                                            {tenant.usage.userCount} <span className="text-editor-text-secondary font-normal">/ {tenant.limits.maxUsers}</span>
                                        </div>
                                    </div>
                                    <div className="bg-editor-bg p-3 rounded-lg border border-editor-border">
                                        <div className="text-xs text-editor-text-secondary mb-1">Almacenamiento</div>
                                        <div className="font-semibold text-editor-text-primary">
                                            {tenant.usage.storageUsedGB.toFixed(1)} GB <span className="text-editor-text-secondary font-normal">/ {tenant.limits.maxStorageGB} GB</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {agencyClients.length > 0 ? (
                                agencyClients.map(client => (
                                    <div
                                        key={client.id}
                                        onClick={() => onSelectTenant(client)}
                                        className="flex items-center justify-between p-3 bg-editor-bg border border-editor-border rounded-lg hover:border-editor-accent/50 cursor-pointer transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-editor-panel-bg rounded text-purple-400">
                                                <User size={18} />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-editor-text-primary group-hover:text-editor-accent transition-colors">
                                                    {client.name}
                                                </h4>
                                                <p className="text-xs text-editor-text-secondary">{client.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="text-xs text-editor-text-secondary">Plan</div>
                                                <div className="text-sm font-medium text-editor-text-primary capitalize">{client.subscriptionPlan}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-editor-text-secondary">Estado</div>
                                                <div className="flex items-center justify-end gap-1">
                                                    {getStatusIcon(client.status)}
                                                    <span className="text-sm text-editor-text-primary capitalize">{client.status}</span>
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className="text-editor-text-secondary" />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 bg-editor-bg border border-editor-border rounded-lg border-dashed">
                                    <Users size={32} className="mx-auto text-editor-text-secondary mb-2 opacity-50" />
                                    <p className="text-editor-text-secondary">Esta agencia no tiene clientes registrados aún.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end pt-4 border-t border-editor-border flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-editor-bg border border-editor-border text-editor-text-primary rounded-lg hover:bg-editor-border transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TenantManagement;
