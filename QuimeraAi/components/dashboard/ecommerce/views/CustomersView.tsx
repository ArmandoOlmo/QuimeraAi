/**
 * CustomersView
 * Vista de gestión de clientes
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Search,
    Users,
    Mail,
    Phone,
    MapPin,
    ShoppingBag,
    DollarSign,
    Loader2,
    Eye,
    X,
    Crown,
    UserCheck,
} from 'lucide-react';
import { useAuth } from '../../../../contexts/core/AuthContext';
import { useCustomers } from '../hooks/useCustomers';
import { Customer } from '../../../../types/ecommerce';
import type { StoredTimestamp } from '../../../../types/ecommerce';
import { timestampToDate } from '../../../../utils/timestampUtils';
import { useEcommerceTheme } from '../hooks/useEcommerceTheme';
import { useEcommerceContext } from '../EcommerceContext';
import AddToAudienceModal from '../../email/AddToAudienceModal';
import { useProject } from '../../../../contexts/project';
import { MotionCard } from '../../../ui/primitives/Card';

const CustomersView: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { storeId } = useEcommerceContext();
    const { activeProject } = useProject();
    const theme = useEcommerceTheme();
    const { customers, isLoading, getTopCustomers } = useCustomers(user?.id || '', storeId);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [showAddToAudienceModal, setShowAddToAudienceModal] = useState(false);

    // Filter customers
    const filteredCustomers = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return customers;

        return customers.filter(
            (customer) =>
                customer.email.toLowerCase().includes(term) ||
                customer.firstName.toLowerCase().includes(term) ||
                customer.lastName.toLowerCase().includes(term) ||
                customer.phone?.toLowerCase().includes(term)
        );
    }, [customers, searchTerm]);

    // Stats
    const stats = useMemo(() => {
        const totalSpent = customers.reduce((sum, c) => sum + c.totalSpent, 0);
        const totalOrders = customers.reduce((sum, c) => sum + c.totalOrders, 0);
        const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
        const marketingSubscribed = customers.filter((c) => c.acceptsMarketing).length;

        return { totalSpent, totalOrders, avgOrderValue, marketingSubscribed };
    }, [customers]);

    const topCustomers = getTopCustomers(5);
    const visibleCustomersLabel = `${filteredCustomers.length} de ${customers.length} cliente${customers.length !== 1 ? 's' : ''}`;
    const hasActiveFilters = Boolean(searchTerm.trim());

    const clearFilters = () => {
        setSearchTerm('');
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: amount >= 1000 ? 0 : 2,
        }).format(amount || 0);
    };

    const customerStats = [
        {
            icon: Users,
            value: customers.length,
            label: t('ecommerce.totalCustomers', 'Total Clientes'),
            helper: `${filteredCustomers.length} ${t('ecommerce.visibleLower', 'visibles')}`,
            iconClassName: 'quimera-dashboard-header-icon',
        },
        {
            icon: DollarSign,
            value: formatCurrency(stats.totalSpent),
            label: t('ecommerce.totalSpent', 'Total Gastado'),
            helper: `${formatCurrency(stats.avgOrderValue)} ${t('ecommerce.avgOrderValueShort', 'promedio')}`,
            iconClassName: 'text-q-success',
        },
        {
            icon: ShoppingBag,
            value: stats.totalOrders,
            label: t('ecommerce.totalOrders', 'Total Pedidos'),
            helper: t('ecommerce.customerOrderHistory', 'Historial de compras'),
            iconClassName: 'text-primary',
        },
        {
            icon: Mail,
            value: stats.marketingSubscribed,
            label: t('ecommerce.subscribers', 'Suscritos'),
            helper: `${customers.length > 0 ? Math.round((stats.marketingSubscribed / customers.length) * 100) : 0}% ${t('ecommerce.optInRate', 'opt-in')}`,
            iconClassName: 'text-q-warning',
        },
    ];

    const formatDate = (timestamp?: StoredTimestamp) => {
        if (!timestamp) return '-';
        return timestampToDate(timestamp).toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const handleViewCustomer = (customer: Customer) => {
        setSelectedCustomer(customer);
        setShowDetail(true);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin" style={{ color: theme.primary }} size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-28 md:pb-0">
            {/* Header */}
            <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-q-border bg-q-surface/50 px-3 py-1 text-xs font-medium text-q-text-muted">
                    <Users size={14} />
                    {t('ecommerce.customerIntelligence', 'Inteligencia de clientes')}
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                    {t('ecommerce.customers', 'Clientes')}
                </h2>
                <p className="max-w-2xl text-q-text-muted">
                    {t('ecommerce.manageCustomersPro', 'Consulta compradores, valor acumulado, permisos de marketing y segmentos de relación.')}
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {customerStats.map((card, index) => {
                    const Icon = card.icon;

                    return (
                        <MotionCard key={card.label} staggerIndex={index} hoverMotion className="rounded-xl border border-q-border bg-q-surface/50 p-4">
                            <div className="flex items-center gap-3">
                                <Icon className={`h-5 w-5 flex-shrink-0 ${card.iconClassName}`} strokeWidth={2} />
                                <div className="min-w-0">
                                    <p className="truncate text-sm text-q-text-muted">{card.label}</p>
                                    <p className="truncate text-2xl font-bold text-foreground">{card.value}</p>
                                    <p className="truncate text-xs text-q-text-muted">{card.helper}</p>
                                </div>
                            </div>
                        </MotionCard>
                    );
                })}
            </div>

            {/* Top Customers */}
            {topCustomers.length > 0 && (
                <div className="rounded-xl border border-q-border bg-q-surface/50 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-q-text-secondary">
                            <Crown className="h-4 w-4 text-q-warning" strokeWidth={2} />
                            {t('ecommerce.topCustomers', 'Mejores Clientes')}
                        </h3>
                        <span className="text-xs text-q-text-muted">
                            {t('ecommerce.byLifetimeValue', 'Por valor acumulado')}
                        </span>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                        {topCustomers.map((customer, index) => (
                            <button
                                type="button"
                                key={customer.id}
                                onClick={() => handleViewCustomer(customer)}
                                className="w-52 flex-shrink-0 rounded-lg border border-q-border bg-muted/20 p-4 text-left transition-colors hover:border-primary/30 hover:bg-muted/40"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary text-primary-foreground font-bold">
                                        {customer.firstName[0]}{customer.lastName[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-foreground font-medium truncate">
                                            {customer.firstName} {customer.lastName}
                                        </p>
                                        <p className="text-q-text-muted text-xs">#{index + 1}</p>
                                    </div>
                                </div>
                                <p className="text-q-success font-semibold">{formatCurrency(customer.totalSpent)}</p>
                                <p className="text-q-text-muted text-sm">{customer.totalOrders} pedidos</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="rounded-xl border border-q-border bg-q-surface/50 p-3 sm:p-4">
                <label className="block min-w-0">
                    <span className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold uppercase text-q-text-secondary">
                        <span>{t('ecommerce.searchCustomersLabel', 'Buscar clientes')}</span>
                        <span className="shrink-0 normal-case text-q-text-muted">{visibleCustomersLabel}</span>
                    </span>
                    <div className="flex h-12 items-center gap-3 rounded-lg border border-q-border/70 bg-q-bg/60 px-3 shadow-sm transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
                        <Search className="h-4 w-4 flex-shrink-0 text-q-text-secondary" />
                        <input
                            type="text"
                            placeholder={t('ecommerce.searchCustomers', 'Nombre, email o teléfono')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-q-text-muted"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                aria-label={t('common.clearSearch', 'Limpiar búsqueda')}
                                title={t('common.clearSearch', 'Limpiar búsqueda')}
                                className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-md text-q-text-secondary transition-colors hover:bg-muted hover:text-foreground"
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>
                </label>
                {hasActiveFilters && (
                    <div className="mt-4 flex flex-col gap-3 border-t border-q-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-q-text-muted">
                            {t('ecommerce.activeCustomerFilters', 'Mostrando clientes filtrados')}
                        </p>
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-q-border px-3 py-2 text-sm font-medium text-q-text-muted transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary sm:w-auto"
                        >
                            <X size={15} />
                            {t('ecommerce.clearFilters', 'Limpiar filtros')}
                        </button>
                    </div>
                )}
            </div>

            {/* Customers List */}
            {filteredCustomers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-q-border bg-q-surface/40 px-6 py-12 text-center">
                    <Users className="mx-auto mb-4 text-q-text-muted" size={48} />
                    <h3 className="mb-2 text-lg font-semibold text-foreground">
                        {t('ecommerce.noCustomers', 'No hay clientes')}
                    </h3>
                    <p className="mx-auto max-w-md text-q-text-muted">
                        {searchTerm
                            ? t('ecommerce.noCustomersFilter', 'No se encontraron clientes con ese criterio')
                            : t('ecommerce.noCustomersYet', 'Los clientes aparecerán aquí cuando realicen compras')}
                    </p>
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-q-border px-4 py-2 font-medium text-q-text-muted transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                        >
                            <X size={18} />
                            {t('ecommerce.clearFilters', 'Limpiar filtros')}
                        </button>
                    )}
                </div>
            ) : (
                <>
                <div className="space-y-3 sm:hidden">
                    {filteredCustomers.map((customer) => (
                        <div key={customer.id} className="rounded-xl border border-q-border bg-q-surface/50 p-3">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted font-medium text-foreground">
                                    {customer.firstName[0]}{customer.lastName[0]}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                        <p className="truncate font-medium text-foreground">
                                            {customer.firstName} {customer.lastName}
                                        </p>
                                        <p className="truncate text-xs text-q-text-muted">{customer.email}</p>
                                    </div>
                                        <p className="flex-shrink-0 font-semibold text-foreground">{formatCurrency(customer.totalSpent)}</p>
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <span className="rounded-full border border-q-border bg-muted/30 px-2.5 py-1 text-xs font-medium text-q-text-muted">
                                            {customer.totalOrders} {t('ecommerce.orders', 'Pedidos')}
                                        </span>
                                        {customer.acceptsMarketing && (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-q-success/20 bg-q-success/10 px-2.5 py-1 text-xs font-medium text-q-success">
                                                <UserCheck size={12} />
                                                {t('ecommerce.marketing', 'Marketing')}
                                            </span>
                                        )}
                                        <div className="ml-auto">
                                        <button
                                            type="button"
                                            onClick={() => handleViewCustomer(customer)}
                                            title={t('ecommerce.viewCustomer', 'Ver cliente')}
                                            aria-label={t('ecommerce.viewCustomer', 'Ver cliente')}
                                            className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg text-q-text-muted transition-colors hover:bg-muted hover:text-foreground"
                                        >
                                            <Eye size={18} />
                                        </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="hidden overflow-hidden rounded-xl border border-q-border bg-q-surface/50 sm:block">
                    <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px]">
                        <thead className="bg-muted/30">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-q-text-muted">
                                    {t('ecommerce.customer', 'Cliente')}
                                </th>
                                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase text-q-text-muted md:table-cell">
                                    {t('ecommerce.contact', 'Contacto')}
                                </th>
                                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase text-q-text-muted sm:table-cell">
                                    {t('ecommerce.orders', 'Pedidos')}
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-q-text-muted">
                                    {t('ecommerce.spent', 'Gastado')}
                                </th>
                                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase text-q-text-muted lg:table-cell">
                                    {t('ecommerce.lastOrder', 'Último Pedido')}
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-q-text-muted">
                                    {t('ecommerce.actions', 'Acciones')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredCustomers.map((customer) => (
                                <tr key={customer.id} className="transition-colors hover:bg-muted/20">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-muted flex flex-shrink-0 items-center justify-center text-foreground font-medium">
                                                {customer.firstName[0]}{customer.lastName[0]}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-foreground font-medium">
                                                    {customer.firstName} {customer.lastName}
                                                </p>
                                                {customer.tags && customer.tags.length > 0 && (
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                        {customer.tags.slice(0, 2).map((tag) => (
                                                            <span
                                                                key={tag}
                                                                className="px-1.5 py-0.5 bg-muted text-q-text-muted rounded text-xs"
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="hidden px-4 py-3 md:table-cell">
                                        <p className="text-q-text-muted text-sm">{customer.email}</p>
                                        {customer.phone && (
                                            <p className="text-q-text-muted text-sm">{customer.phone}</p>
                                        )}
                                    </td>
                                    <td className="hidden px-4 py-3 sm:table-cell">
                                        <span className="rounded-full border border-q-border bg-muted/30 px-2.5 py-1 text-xs font-medium text-q-text-muted">
                                            {customer.totalOrders}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-foreground font-medium">{formatCurrency(customer.totalSpent)}</p>
                                        {customer.acceptsMarketing && (
                                            <p className="mt-1 text-xs text-q-success">{t('ecommerce.acceptsMarketing', 'Acepta marketing')}</p>
                                        )}
                                    </td>
                                    <td className="hidden px-4 py-3 text-q-text-muted lg:table-cell">
                                        {formatDate(customer.lastOrderAt)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            type="button"
                                            onClick={() => handleViewCustomer(customer)}
                                            title={t('ecommerce.viewCustomer', 'Ver cliente')}
                                            aria-label={t('ecommerce.viewCustomer', 'Ver cliente')}
                                            className="grid h-9 w-9 place-items-center rounded-lg text-q-text-muted transition-colors hover:bg-muted hover:text-foreground"
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
                </>
            )}

            {/* Customer Detail Modal */}
            {showDetail && selectedCustomer && (
                <CustomerDetailModal
                    customer={selectedCustomer}
                    onClose={() => {
                        setShowDetail(false);
                        setSelectedCustomer(null);
                    }}
                    onAddToAudience={() => setShowAddToAudienceModal(true)}
                />
            )}

            {/* Add to Audience Modal */}
            {user && activeProject && selectedCustomer && (
                <AddToAudienceModal
                    isOpen={showAddToAudienceModal}
                    onClose={() => setShowAddToAudienceModal(false)}
                    userId={user.id}
                    projectId={activeProject.id}
                    customerIds={[selectedCustomer.id]}
                    contactCount={1}
                    contactType="customers"
                />
            )}
        </div>
    );
};

// Customer Detail Modal
interface CustomerDetailModalProps {
    customer: Customer;
    onClose: () => void;
    onAddToAudience: () => void;
}

const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({ customer, onClose, onAddToAudience }) => {
    const { t } = useTranslation();

    return (
        <div className="fixed inset-0 bg-q-text/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-q-surface rounded-xl border border-q-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b border-q-border sm:p-6">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-12 h-12 rounded-full flex flex-shrink-0 items-center justify-center bg-primary text-primary-foreground text-lg font-bold sm:h-16 sm:w-16 sm:text-xl">
                            {customer.firstName[0]}{customer.lastName[0]}
                        </div>
                        <div className="min-w-0">
                            <h3 className="truncate text-lg font-bold text-foreground sm:text-xl">
                                {customer.firstName} {customer.lastName}
                            </h3>
                            <p className="truncate text-sm text-q-text-muted sm:text-base">{customer.email}</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 space-y-6 sm:p-6">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-muted/30 rounded-lg p-4">
                            <p className="text-q-text-muted text-sm">{t('ecommerce.totalOrders', 'Total Pedidos')}</p>
                            <p className="text-2xl font-bold text-foreground">{customer.totalOrders}</p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-4">
                            <p className="text-q-text-muted text-sm">{t('ecommerce.totalSpent', 'Total Gastado')}</p>
                            <p className="text-2xl font-bold text-q-success">${customer.totalSpent.toFixed(2)}</p>
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h4 className="text-sm font-medium text-q-text-muted mb-3">{t('ecommerce.contactInfo', 'Información de Contacto')}</h4>
                        <div className="space-y-2">
                            <div className="flex min-w-0 items-center gap-3 text-q-text-muted">
                                <Mail size={18} className="text-q-text-muted" />
                                <span className="min-w-0 truncate">{customer.email}</span>
                            </div>
                            {customer.phone && (
                                <div className="flex items-center gap-3 text-q-text-muted">
                                    <Phone size={18} className="text-q-text-muted" />
                                    {customer.phone}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Default Address */}
                    {customer.defaultShippingAddress && (
                        <div>
                            <h4 className="text-sm font-medium text-q-text-muted mb-3">{t('ecommerce.defaultAddress', 'Dirección Principal')}</h4>
                            <div className="flex items-start gap-3 text-q-text-muted">
                                <MapPin size={18} className="text-q-text-muted mt-0.5" />
                                <div>
                                    <p>{customer.defaultShippingAddress.address1}</p>
                                    {customer.defaultShippingAddress.address2 && (
                                        <p>{customer.defaultShippingAddress.address2}</p>
                                    )}
                                    <p>
                                        {customer.defaultShippingAddress.city}, {customer.defaultShippingAddress.state} {customer.defaultShippingAddress.zipCode}
                                    </p>
                                    <p>{customer.defaultShippingAddress.country}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tags */}
                    {customer.tags && customer.tags.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-q-text-muted mb-3">{t('ecommerce.tags', 'Etiquetas')}</h4>
                            <div className="flex flex-wrap gap-2">
                                {customer.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="px-2 py-1 rounded-full text-sm bg-primary/20 text-primary"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {customer.notes && (
                        <div>
                            <h4 className="text-sm font-medium text-q-text-muted mb-3">{t('ecommerce.notes', 'Notas')}</h4>
                            <p className="text-q-text-muted">{customer.notes}</p>
                        </div>
                    )}

                    {/* Marketing */}
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${customer.acceptsMarketing ? 'bg-q-success' : 'bg-muted-foreground'}`} />
                        <span className="text-q-text-muted">
                            {customer.acceptsMarketing
                                ? t('ecommerce.acceptsMarketing', 'Acepta marketing')
                                : t('ecommerce.noMarketing', 'No acepta marketing')}
                        </span>
                    </div>
                </div>

                <div className="p-4 border-t border-q-border flex flex-col gap-3 sm:flex-row sm:p-6">
                    <button
                        onClick={onAddToAudience}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors font-medium"
                    >
                        <Users size={18} />
                        {t('email.addToAudience', 'Añadir a Audiencia')}
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
                    >
                        {t('common.close', 'Cerrar')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomersView;
