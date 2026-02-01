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
    const { customers, isLoading, getTopCustomers } = useCustomers(user?.uid || '', storeId);

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

    const formatDate = (timestamp?: { seconds: number }) => {
        if (!timestamp) return '-';
        return new Date(timestamp.seconds * 1000).toLocaleDateString('es-MX', {
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
                <p className="text-muted-foreground">
                    {customers.length} {t('ecommerce.customersTotal', 'clientes registrados')}
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card/50 rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/20">
                            <Users className="text-primary" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{customers.length}</p>
                            <p className="text-sm text-muted-foreground">{t('ecommerce.totalCustomers', 'Total Clientes')}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card/50 rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                            <DollarSign className="text-green-400" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">${stats.totalSpent.toFixed(0)}</p>
                            <p className="text-sm text-muted-foreground">{t('ecommerce.totalSpent', 'Total Gastado')}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card/50 rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                            <ShoppingBag className="text-purple-400" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
                            <p className="text-sm text-muted-foreground">{t('ecommerce.totalOrders', 'Total Pedidos')}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card/50 rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Mail className="text-blue-400" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stats.marketingSubscribed}</p>
                            <p className="text-sm text-muted-foreground">{t('ecommerce.subscribers', 'Suscritos')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Customers */}
            {topCustomers.length > 0 && (
                <div className="bg-card/50 rounded-xl p-4 border border-border">
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Star className="text-yellow-400" size={20} />
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
                                        <p className="text-muted-foreground text-xs">#{index + 1}</p>
                                    </div>
                                </div>
                                <p className="text-green-400 font-semibold">${customer.totalSpent.toFixed(2)}</p>
                                <p className="text-muted-foreground text-sm">{customer.totalOrders} pedidos</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="flex items-center gap-2 bg-editor-border/40 rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-editor-text-secondary flex-shrink-0" />
                <input
                    type="text"
                    placeholder={t('ecommerce.searchCustomers', 'Buscar por nombre, email o teléfono...')}
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

            {/* Customers List */}
            {filteredCustomers.length === 0 ? (
                <div className="text-center py-12 bg-card/50 rounded-xl border border-border">
                    <Users className="mx-auto text-muted-foreground mb-4" size={48} />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        {t('ecommerce.noCustomers', 'No hay clientes')}
                    </h3>
                    <p className="text-muted-foreground">
                        {searchTerm
                            ? t('ecommerce.noCustomersFilter', 'No se encontraron clientes con ese criterio')
                            : t('ecommerce.noCustomersYet', 'Los clientes aparecerán aquí cuando realicen compras')}
                    </p>
                </div>
            ) : (
                <div className="bg-card/50 rounded-xl border border-border overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-muted/30">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                    {t('ecommerce.customer', 'Cliente')}
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">
                                    {t('ecommerce.contact', 'Contacto')}
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden sm:table-cell">
                                    {t('ecommerce.orders', 'Pedidos')}
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                    {t('ecommerce.spent', 'Gastado')}
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden lg:table-cell">
                                    {t('ecommerce.lastOrder', 'Último Pedido')}
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
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
                                                                className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-xs"
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
                                        <p className="text-muted-foreground text-sm">{customer.email}</p>
                                        {customer.phone && (
                                            <p className="text-muted-foreground text-sm">{customer.phone}</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                                        {customer.totalOrders}
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-foreground font-medium">${customer.totalSpent.toFixed(2)}</p>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                                        {formatDate(customer.lastOrderAt)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => handleViewCustomer(customer)}
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
                    userId={user.uid}
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-border">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center bg-primary text-primary-foreground text-xl font-bold">
                            {customer.firstName[0]}{customer.lastName[0]}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-foreground">
                                {customer.firstName} {customer.lastName}
                            </h3>
                            <p className="text-muted-foreground">{customer.email}</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-muted/30 rounded-lg p-4">
                            <p className="text-muted-foreground text-sm">{t('ecommerce.totalOrders', 'Total Pedidos')}</p>
                            <p className="text-2xl font-bold text-foreground">{customer.totalOrders}</p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-4">
                            <p className="text-muted-foreground text-sm">{t('ecommerce.totalSpent', 'Total Gastado')}</p>
                            <p className="text-2xl font-bold text-green-400">${customer.totalSpent.toFixed(2)}</p>
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">{t('ecommerce.contactInfo', 'Información de Contacto')}</h4>
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 text-muted-foreground">
                                <Mail size={18} className="text-muted-foreground" />
                                {customer.email}
                            </div>
                            {customer.phone && (
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <Phone size={18} className="text-muted-foreground" />
                                    {customer.phone}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Default Address */}
                    {customer.defaultShippingAddress && (
                        <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-3">{t('ecommerce.defaultAddress', 'Dirección Principal')}</h4>
                            <div className="flex items-start gap-3 text-muted-foreground">
                                <MapPin size={18} className="text-muted-foreground mt-0.5" />
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
                            <h4 className="text-sm font-medium text-muted-foreground mb-3">{t('ecommerce.tags', 'Etiquetas')}</h4>
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
                            <h4 className="text-sm font-medium text-muted-foreground mb-3">{t('ecommerce.notes', 'Notas')}</h4>
                            <p className="text-muted-foreground">{customer.notes}</p>
                        </div>
                    )}

                    {/* Marketing */}
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${customer.acceptsMarketing ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                        <span className="text-muted-foreground">
                            {customer.acceptsMarketing
                                ? t('ecommerce.acceptsMarketing', 'Acepta marketing')
                                : t('ecommerce.noMarketing', 'No acepta marketing')}
                        </span>
                    </div>
                </div>

                <div className="p-6 border-t border-border flex gap-3">
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
