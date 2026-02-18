/**
 * DiscountsView
 * Vista de gestión de códigos de descuento
 */

import React, { useState, useMemo } from 'react';
import ConfirmationModal from '../../../ui/ConfirmationModal';
import { useTranslation } from 'react-i18next';
import {
    Plus,
    Tag,
    Percent,
    DollarSign,
    Truck,
    Edit,
    Trash2,
    Copy,
    CheckCircle,
    XCircle,
    Clock,
    Loader2,
} from 'lucide-react';
import { useAuth } from '../../../../contexts/core/AuthContext';
import { useDiscounts } from '../hooks/useDiscounts';
import { Discount, DiscountType } from '../../../../types/ecommerce';
import { useEcommerceTheme, withOpacity } from '../hooks/useEcommerceTheme';
import { useEcommerceContext } from '../EcommerceDashboard';

const DiscountsView: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { storeId } = useEcommerceContext();
    const theme = useEcommerceTheme();
    const {
        discounts,
        isLoading,
        addDiscount,
        updateDiscount,
        deleteDiscount,
        toggleDiscountStatus,
        generateCode,
        getActiveDiscounts,
        getExpiredDiscounts,
    } = useDiscounts(user?.uid || '', storeId);

    const [showForm, setShowForm] = useState(false);
    const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        code: '',
        type: 'percentage' as DiscountType,
        value: 0,
        minimumPurchase: 0,
        maxUses: 0,
        startsAt: new Date().toISOString().split('T')[0],
        endsAt: '',
    });

    const activeDiscounts = getActiveDiscounts();
    const expiredDiscounts = getExpiredDiscounts();

    const filteredDiscounts = useMemo(() => {
        switch (filter) {
            case 'active':
                return activeDiscounts;
            case 'expired':
                return expiredDiscounts;
            default:
                return discounts;
        }
    }, [discounts, filter, activeDiscounts, expiredDiscounts]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingDiscount) {
                await updateDiscount(editingDiscount.id, {
                    code: formData.code,
                    type: formData.type,
                    value: formData.value,
                    minimumPurchase: formData.minimumPurchase || undefined,
                    maxUses: formData.maxUses || undefined,
                });
            } else {
                await addDiscount({
                    code: formData.code || undefined,
                    type: formData.type,
                    value: formData.value,
                    minimumPurchase: formData.minimumPurchase || undefined,
                    maxUses: formData.maxUses || undefined,
                    startsAt: new Date(formData.startsAt),
                    endsAt: formData.endsAt ? new Date(formData.endsAt) : undefined,
                });
            }

            handleCloseForm();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleEdit = (discount: Discount) => {
        setEditingDiscount(discount);
        setFormData({
            code: discount.code,
            type: discount.type,
            value: discount.value,
            minimumPurchase: discount.minimumPurchase || 0,
            maxUses: discount.maxUses || 0,
            startsAt: new Date(discount.startsAt.seconds * 1000).toISOString().split('T')[0],
            endsAt: discount.endsAt
                ? new Date(discount.endsAt.seconds * 1000).toISOString().split('T')[0]
                : '',
        });
        setShowForm(true);
    };

    const handleDelete = (discountId: string) => {
        setDeleteConfirmId(discountId);
    };

    const confirmDeleteDiscount = async () => {
        if (deleteConfirmId) {
            await deleteDiscount(deleteConfirmId);
            setDeleteConfirmId(null);
        }
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setEditingDiscount(null);
        setFormData({
            code: '',
            type: 'percentage',
            value: 0,
            minimumPurchase: 0,
            maxUses: 0,
            startsAt: new Date().toISOString().split('T')[0],
            endsAt: '',
        });
    };

    const handleGenerateCode = () => {
        setFormData({ ...formData, code: generateCode() });
    };

    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const getTypeIcon = (type: DiscountType) => {
        switch (type) {
            case 'percentage':
                return <Percent size={18} />;
            case 'fixed_amount':
                return <DollarSign size={18} />;
            case 'free_shipping':
                return <Truck size={18} />;
        }
    };

    const getTypeLabel = (type: DiscountType) => {
        switch (type) {
            case 'percentage':
                return t('ecommerce.percentage', 'Porcentaje');
            case 'fixed_amount':
                return t('ecommerce.fixedAmount', 'Monto Fijo');
            case 'free_shipping':
                return t('ecommerce.freeShipping', 'Envío Gratis');
        }
    };

    const formatDiscountValue = (discount: Discount) => {
        switch (discount.type) {
            case 'percentage':
                return `${discount.value}%`;
            case 'fixed_amount':
                return `$${discount.value}`;
            case 'free_shipping':
                return t('ecommerce.freeShipping', 'Envío Gratis');
        }
    };

    const isExpired = (discount: Discount) => {
        if (!discount.endsAt) return false;
        return discount.endsAt.seconds * 1000 < Date.now();
    };

    const isMaxUsesReached = (discount: Discount) => {
        return discount.maxUses !== undefined && discount.usedCount >= discount.maxUses;
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">
                        {t('ecommerce.discounts', 'Descuentos')}
                    </h2>
                    <p className="text-muted-foreground">
                        {activeDiscounts.length} {t('ecommerce.activeDiscounts', 'descuentos activos')}
                    </p>
                </div>

                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg transition-colors hover:bg-primary/90"
                >
                    <Plus size={20} />
                    {t('ecommerce.addDiscount', 'Crear Descuento')}
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg transition-colors ${filter === 'all'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-card/50 text-muted-foreground hover:text-foreground'
                        }`}
                >
                    {t('ecommerce.all', 'Todos')} ({discounts.length})
                </button>
                <button
                    onClick={() => setFilter('active')}
                    className={`px-4 py-2 rounded-lg transition-colors ${filter === 'active'
                            ? 'bg-green-600 text-white'
                            : 'bg-card/50 text-muted-foreground hover:text-foreground'
                        }`}
                >
                    {t('ecommerce.active', 'Activos')} ({activeDiscounts.length})
                </button>
                <button
                    onClick={() => setFilter('expired')}
                    className={`px-4 py-2 rounded-lg transition-colors ${filter === 'expired'
                            ? 'bg-muted text-foreground'
                            : 'bg-card/50 text-muted-foreground hover:text-foreground'
                        }`}
                >
                    {t('ecommerce.expired', 'Expirados')} ({expiredDiscounts.length})
                </button>
            </div>

            {/* Discounts List */}
            {filteredDiscounts.length === 0 ? (
                <div className="text-center py-12 bg-card/50 rounded-xl border border-border">
                    <Tag className="mx-auto text-muted-foreground mb-4" size={48} />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        {t('ecommerce.noDiscounts', 'No hay descuentos')}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                        {t('ecommerce.noDiscountsYet', 'Crea códigos de descuento para tus clientes')}
                    </p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg transition-colors hover:bg-primary/90"
                    >
                        <Plus size={20} />
                        {t('ecommerce.createFirstDiscount', 'Crear primer descuento')}
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredDiscounts.map((discount) => (
                        <div
                            key={discount.id}
                            className={`bg-card/50 rounded-xl border p-4 ${isExpired(discount) || isMaxUsesReached(discount) || !discount.isActive
                                    ? 'border-border opacity-60'
                                    : 'border-border'
                                }`}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                {/* Code */}
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/20 text-primary">
                                        {getTypeIcon(discount.type)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <code className="text-lg font-mono font-bold text-foreground bg-muted/50 px-2 py-0.5 rounded">
                                                {discount.code}
                                            </code>
                                            <button
                                                onClick={() => handleCopyCode(discount.code)}
                                                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {copiedCode === discount.code ? (
                                                    <CheckCircle size={16} className="text-green-400" />
                                                ) : (
                                                    <Copy size={16} />
                                                )}
                                            </button>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{getTypeLabel(discount.type)}</p>
                                    </div>
                                </div>

                                {/* Value */}
                                <div className="flex-1">
                                    <p className="text-2xl font-bold text-green-400">
                                        {formatDiscountValue(discount)}
                                    </p>
                                    {discount.minimumPurchase && discount.minimumPurchase > 0 && (
                                        <p className="text-sm text-muted-foreground">
                                            {t('ecommerce.minPurchase', 'Mínimo')}: ${discount.minimumPurchase}
                                        </p>
                                    )}
                                </div>

                                {/* Usage */}
                                <div className="text-center">
                                    <p className="text-foreground font-medium">
                                        {discount.usedCount}
                                        {discount.maxUses ? ` / ${discount.maxUses}` : ''}
                                    </p>
                                    <p className="text-sm text-muted-foreground">{t('ecommerce.uses', 'Usos')}</p>
                                </div>

                                {/* Status */}
                                <div className="flex items-center gap-2">
                                    {isExpired(discount) ? (
                                        <span className="flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs">
                                            <Clock size={12} />
                                            {t('ecommerce.expired', 'Expirado')}
                                        </span>
                                    ) : isMaxUsesReached(discount) ? (
                                        <span className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs">
                                            <XCircle size={12} />
                                            {t('ecommerce.limitReached', 'Límite alcanzado')}
                                        </span>
                                    ) : discount.isActive ? (
                                        <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                                            <CheckCircle size={12} />
                                            {t('ecommerce.active', 'Activo')}
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs">
                                            <XCircle size={12} />
                                            {t('ecommerce.inactive', 'Inactivo')}
                                        </span>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => toggleDiscountStatus(discount.id)}
                                        className={`p-2 rounded-lg transition-colors ${discount.isActive
                                                ? 'text-green-400 hover:bg-green-500/20'
                                                : 'text-muted-foreground hover:bg-muted'
                                            }`}
                                    >
                                        {discount.isActive ? <CheckCircle size={18} /> : <XCircle size={18} />}
                                    </button>
                                    <button
                                        onClick={() => handleEdit(discount)}
                                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(discount.id)}
                                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-muted rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Discount Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-xl border border-border w-full max-w-md">
                        <div className="p-6 border-b border-border">
                            <h3 className="text-lg font-bold text-foreground">
                                {editingDiscount
                                    ? t('ecommerce.editDiscount', 'Editar Descuento')
                                    : t('ecommerce.addDiscount', 'Crear Descuento')}
                            </h3>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Code */}
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    {t('ecommerce.code', 'Código')}
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) =>
                                            setFormData({ ...formData, code: e.target.value.toUpperCase() })
                                        }
                                        placeholder="DESCUENTO20"
                                        className="flex-1 px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground uppercase focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleGenerateCode}
                                        className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
                                    >
                                        {t('ecommerce.generate', 'Generar')}
                                    </button>
                                </div>
                            </div>

                            {/* Type */}
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    {t('ecommerce.discountType', 'Tipo de Descuento')} *
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) =>
                                        setFormData({ ...formData, type: e.target.value as DiscountType })
                                    }
                                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <option value="percentage">{t('ecommerce.percentage', 'Porcentaje')}</option>
                                    <option value="fixed_amount">{t('ecommerce.fixedAmount', 'Monto Fijo')}</option>
                                    <option value="free_shipping">{t('ecommerce.freeShipping', 'Envío Gratis')}</option>
                                </select>
                            </div>

                            {/* Value */}
                            {formData.type !== 'free_shipping' && (
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                                        {formData.type === 'percentage'
                                            ? t('ecommerce.percentageValue', 'Porcentaje (%)')
                                            : t('ecommerce.amount', 'Monto ($)')} *
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.value}
                                        onChange={(e) =>
                                            setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })
                                        }
                                        min="0"
                                        max={formData.type === 'percentage' ? 100 : undefined}
                                        required
                                        className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                            )}

                            {/* Minimum Purchase */}
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    {t('ecommerce.minimumPurchase', 'Compra Mínima ($)')}
                                </label>
                                <input
                                    type="number"
                                    value={formData.minimumPurchase}
                                    onChange={(e) =>
                                        setFormData({ ...formData, minimumPurchase: parseFloat(e.target.value) || 0 })
                                    }
                                    min="0"
                                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            {/* Max Uses */}
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    {t('ecommerce.maxUses', 'Usos Máximos')}
                                </label>
                                <input
                                    type="number"
                                    value={formData.maxUses}
                                    onChange={(e) =>
                                        setFormData({ ...formData, maxUses: parseInt(e.target.value) || 0 })
                                    }
                                    min="0"
                                    placeholder="Sin límite"
                                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            {/* Dates */}
                            {!editingDiscount && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                                            {t('ecommerce.startsAt', 'Inicia')} *
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.startsAt}
                                            onChange={(e) =>
                                                setFormData({ ...formData, startsAt: e.target.value })
                                            }
                                            required
                                            className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                                            {t('ecommerce.endsAt', 'Termina')}
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.endsAt}
                                            onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                                            className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseForm}
                                    className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
                                >
                                    {t('common.cancel', 'Cancelar')}
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg transition-colors hover:bg-primary/90"
                                >
                                    {editingDiscount ? t('common.save', 'Guardar') : t('common.create', 'Crear')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Discount Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!deleteConfirmId}
                onConfirm={confirmDeleteDiscount}
                onCancel={() => setDeleteConfirmId(null)}
                title={t('ecommerce.deleteDiscount', 'Eliminar Descuento')}
                message={t('ecommerce.confirmDeleteDiscount', '¿Estás seguro de eliminar este descuento?')}
                variant="danger"
            />
        </div>
    );
};

export default DiscountsView;
