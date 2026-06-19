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
    Tag,
    Loader2,
    Eye,
    MoreVertical,
    Star,
    X,
} from 'lucide-react';
import { useAuth } from '../../../../contexts/core/AuthContext';
import { useCustomers } from '../hooks/useCustomers';
import { Customer } from '../../../../types/ecommerce';
import type { StoredTimestamp } from '../../../../types/ecommerce';
import { timestampToDate } from '../../../../utils/timestampUtils';
import { useEcommerceTheme, withOpacity } from '../hooks/useEcommerceTheme';
import { useEcommerceContext } from '../EcommerceDashboard';
import AddToAudienceModal from '../../email/AddToAudienceModal';
import { useProject } from '../../../../contexts/project';

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
        if (!searchTerm) return customers;

        const term = searchTerm.toLowerCase();
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
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-foreground">
                    {t('ecommerce.customers', 'Clientes')}
                </h2>
                <p className="text-q-text-muted">
                    {customers.length} {t('ecommerce.customersTotal', 'clientes registrados')}
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { icon: Users, value: customers.length, label: t('ecommerce.totalCustomers', 'Total Clientes') },
                    { icon: DollarSign, value: `$${stats.totalSpent.toFixed(0)}`, label: t('ecommerce.totalSpent', 'Total Gastado') },
                    { icon: ShoppingBag, value: stats.totalOrders, label: t('ecommerce.totalOrders', 'Total Pedidos') },
                    { icon: Mail, value: stats.marketingSubscribed, label: t('ecommerce.subscribers', 'Suscritos') },
                ].map((card) => {
                    const Icon = card.icon;

                    return (
                        <div
                            key={card.label}
                            className="group relative overflow-hidden rounded-xl border border-q-border/60
                                bg-q-surface/80 backdrop-blur-xl p-4 hover:border-q-border transition-all duration-300"
                        >
                            <div
                                className="quimera-status-card-accent-bg quimera-status-card-blob absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl
                                    group-hover:scale-110 transition-all duration-500"
                                aria-hidden="true"
                            />
                            <div className="relative z-10">
                                <div className="mb-1 md:mb-2">
                                    <Icon className="w-5 h-5 quimera-dashboard-header-icon flex-shrink-0" strokeWidth={2} />
                                </div>
                                <div className="text-xl md:text-3xl font-extrabold text-foreground">{card.value}</div>
                                <p className="text-[10px] md:text-xs font-semibold text-q-text-muted uppercase tracking-wider mt-0.5 md:mt-1 leading-tight">{card.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Top Customers */}
            {topCustomers.length > 0 && (
                <div className="quimera-dashboard-panel-card group p-4">
                    <h3 className="text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Star className="w-4 h-4 quimera-dashboard-header-icon flex-shrink-0" strokeWidth={2} />
                        {t('ecommerce.topCustomers', 'Mejores Clientes')}
                    </h3>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                        {topCustomers.map((customer, index) => (
                            <div
                                key={customer.id}
                                onClick={() => handleViewCustomer(customer)}
                                className="flex-shrink-0 w-48 p-4 bg-muted/30 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
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
                                <p className="text-green-400 font-semibold">${customer.totalSpent.toFixed(2)}</p>
                                <p className="text-q-text-muted text-sm">{customer.totalOrders} pedidos</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="flex items-center gap-2 bg-q-surface-overlay/40 rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-q-text-secondary flex-shrink-0" />
                <input
                    type="text"
                    placeholder={t('ecommerce.searchCustomers', 'Buscar por nombre, email o teléfono...')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm min-w-0"
                />
                {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="text-q-text-secondary hover:text-q-text flex-shrink-0">
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Customers List */}
            {filteredCustomers.length === 0 ? (
                <div className="text-center py-12 bg-q-surface/50 rounded-xl border border-q-border">
                    <Users className="mx-auto text-q-text-muted mb-4" size={48} />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        {t('ecommerce.noCustomers', 'No hay clientes')}
                    </h3>
                    <p className="text-q-text-muted">
                        {searchTerm
                            ? t('ecommerce.noCustomersFilter', 'No se encontraron clientes con ese criterio')
                            : t('ecommerce.noCustomersYet', 'Los clientes aparecerán aquí cuando realicen compras')}
                    </p>
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
                                        <p className="flex-shrink-0 font-semibold text-foreground">${customer.totalSpent.toFixed(2)}</p>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between gap-3">
                                        <p className="text-xs text-q-text-muted">
                                            {customer.totalOrders} {t('ecommerce.orders', 'Pedidos')}
                                        </p>
                                        <button
                                            onClick={() => handleViewCustomer(customer)}
                                            className="flex-shrink-0 p-2 text-q-text-muted hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="hidden overflow-x-auto rounded-xl border border-q-border bg-q-surface/50 sm:block">
                    <table className="w-full min-w-[700px]">
                        <thead className="bg-muted/30">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-q-text-muted">
                                    {t('ecommerce.customer', 'Cliente')}
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-q-text-muted hidden md:table-cell">
                                    {t('ecommerce.contact', 'Contacto')}
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-q-text-muted hidden sm:table-cell">
                                    {t('ecommerce.orders', 'Pedidos')}
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-q-text-muted">
                                    {t('ecommerce.spent', 'Gastado')}
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-q-text-muted hidden lg:table-cell">
                                    {t('ecommerce.lastOrder', 'Último Pedido')}
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-q-text-muted">
                                    {t('ecommerce.actions', 'Acciones')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredCustomers.map((customer) => (
                                <tr key={customer.id} className="hover:bg-muted/20">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground font-medium">
                                                {customer.firstName[0]}{customer.lastName[0]}
                                            </div>
                                            <div>
                                                <p className="text-foreground font-medium">
                                                    {customer.firstName} {customer.lastName}
                                                </p>
                                                {customer.tags && customer.tags.length > 0 && (
                                                    <div className="flex gap-1 mt-1">
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
                                    <td className="px-4 py-3 hidden md:table-cell">
                                        <p className="text-q-text-muted text-sm">{customer.email}</p>
                                        {customer.phone && (
                                            <p className="text-q-text-muted text-sm">{customer.phone}</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-q-text-muted hidden sm:table-cell">
                                        {customer.totalOrders}
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-foreground font-medium">${customer.totalSpent.toFixed(2)}</p>
                                    </td>
                                    <td className="px-4 py-3 text-q-text-muted hidden lg:table-cell">
                                        {formatDate(customer.lastOrderAt)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => handleViewCustomer(customer)}
                                            className="p-2 text-q-text-muted hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
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
                            <p className="text-2xl font-bold text-green-400">${customer.totalSpent.toFixed(2)}</p>
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
                        <div className={`w-3 h-3 rounded-full ${customer.acceptsMarketing ? 'bg-green-500' : 'bg-muted-foreground'}`} />
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
