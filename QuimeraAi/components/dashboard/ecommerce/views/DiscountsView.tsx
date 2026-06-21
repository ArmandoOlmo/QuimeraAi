import { getTimestampSeconds, timestampToDate } from '../../../../utils/timestampUtils';
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
    Filter,
    TicketPercent,
    AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../../../contexts/core/AuthContext';
import { useDiscounts } from '../hooks/useDiscounts';
import { Discount, DiscountType } from '../../../../types/ecommerce';
import { useEcommerceTheme } from '../hooks/useEcommerceTheme';
import { useEcommerceContext } from '../EcommerceContext';
import { FilterChipRow } from '../../filters';
import type { FilterChipOption } from '../../filters';
import AppSelect from '../../../ui/AppSelect';
import { MotionCard } from '../../../ui/primitives/Card';

type DiscountFilter = 'all' | 'active' | 'expired';

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
    } = useDiscounts(user?.id || '', storeId);

    const [showForm, setShowForm] = useState(false);
    const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [filter, setFilter] = useState<DiscountFilter>('all');
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
            startsAt: timestampToDate(discount.startsAt).toISOString().split('T')[0],
            endsAt: discount.endsAt
                ? timestampToDate(discount.endsAt).toISOString().split('T')[0]
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
                return <Percent size={18} className="quimera-dashboard-header-icon" strokeWidth={2} />;
            case 'fixed_amount':
                return <DollarSign size={18} className="quimera-dashboard-header-icon" strokeWidth={2} />;
            case 'free_shipping':
                return <Truck size={18} className="quimera-dashboard-header-icon" strokeWidth={2} />;
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
                return formatCurrency(discount.value);
            case 'free_shipping':
                return t('ecommerce.freeShipping', 'Envío Gratis');
        }
    };

    const isExpired = (discount: Discount) => {
        if (!discount.endsAt) return false;
        return getTimestampSeconds(discount.endsAt) * 1000 < Date.now();
    };

    const isMaxUsesReached = (discount: Discount) => {
        return discount.maxUses !== undefined && discount.usedCount >= discount.maxUses;
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: amount >= 1000 ? 0 : 2,
        }).format(amount || 0);
    };

    const totalUses = discounts.reduce((sum, discount) => sum + discount.usedCount, 0);
    const exhaustedDiscounts = discounts.filter(isMaxUsesReached).length;
    const inactiveDiscounts = discounts.filter((discount) => !discount.isActive && !isExpired(discount)).length;
    const visibleDiscountsLabel = `${filteredDiscounts.length} de ${discounts.length} descuento${discounts.length !== 1 ? 's' : ''}`;

    const filterOptions = useMemo<FilterChipOption<DiscountFilter>[]>(() => [
        { id: 'all', label: t('ecommerce.all', 'Todos'), count: discounts.length },
        { id: 'active', label: t('ecommerce.active', 'Activos'), count: activeDiscounts.length, color: 'green' },
        { id: 'expired', label: t('ecommerce.expired', 'Expirados'), count: expiredDiscounts.length, color: 'gray' },
    ], [activeDiscounts.length, discounts.length, expiredDiscounts.length, t]);

    const discountStats = [
        {
            label: t('ecommerce.discountsTotalLabel', 'Total'),
            value: discounts.length,
            helper: `${filteredDiscounts.length} ${t('ecommerce.visibleLower', 'visibles')}`,
            icon: TicketPercent,
            iconClassName: 'quimera-dashboard-header-icon',
        },
        {
            label: t('ecommerce.activeDiscountsShort', 'Activos'),
            value: activeDiscounts.length,
            helper: `${inactiveDiscounts} ${t('ecommerce.inactiveLower', 'inactivos')}`,
            icon: CheckCircle,
            iconClassName: 'text-q-success',
        },
        {
            label: t('ecommerce.usage', 'Uso'),
            value: totalUses,
            helper: `${exhaustedDiscounts} ${t('ecommerce.limitReachedLower', 'en límite')}`,
            icon: Copy,
            iconClassName: 'text-primary',
        },
        {
            label: t('ecommerce.expired', 'Expirados'),
            value: expiredDiscounts.length,
            helper: t('ecommerce.reviewExpiredDiscounts', 'Revisa campañas vencidas'),
            icon: AlertTriangle,
            iconClassName: expiredDiscounts.length > 0 ? 'text-q-warning' : 'text-q-success',
        },
    ];

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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-q-border bg-q-surface/50 px-3 py-1 text-xs font-medium text-q-text-muted">
                        <Tag size={14} />
                        {t('ecommerce.promotionManager', 'Gestor promocional')}
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">
                        {t('ecommerce.discounts', 'Descuentos')}
                    </h2>
                    <p className="max-w-2xl text-q-text-muted">
                        {t('ecommerce.manageDiscountsPro', 'Crea códigos, controla límites de uso y revisa campañas activas o vencidas.')}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
                >
                    <Plus size={20} />
                    {t('ecommerce.addDiscount', 'Crear Descuento')}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {discountStats.map((stat, index) => {
                    const Icon = stat.icon;

                    return (
                        <MotionCard key={stat.label} staggerIndex={index} hoverMotion className="rounded-xl border border-q-border bg-q-surface/50 p-4">
                            <div className="flex items-center gap-3">
                                <Icon className={`h-5 w-5 flex-shrink-0 ${stat.iconClassName}`} strokeWidth={2} />
                                <div className="min-w-0">
                                    <p className="truncate text-sm text-q-text-muted">{stat.label}</p>
                                    <p className="truncate text-2xl font-bold text-foreground">{stat.value}</p>
                                    <p className="truncate text-xs text-q-text-muted">{stat.helper}</p>
                                </div>
                            </div>
                        </MotionCard>
                    );
                })}
            </div>

            <div className="rounded-xl border border-q-border bg-q-surface/50 p-3 sm:p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-q-text-secondary">
                            <Filter className="h-3.5 w-3.5" />
                            <span>{t('ecommerce.discountStatusFilter', 'Estado')}</span>
                        </div>
                        <p className="text-sm text-q-text-muted">{visibleDiscountsLabel}</p>
                    </div>
                    <FilterChipRow
                        value={filter}
                        onChange={(value) => setFilter(value as DiscountFilter)}
                        options={filterOptions}
                        className="min-w-0"
                    />
                </div>
            </div>

            {/* Discounts List */}
            {filteredDiscounts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-q-border bg-q-surface/40 px-6 py-12 text-center">
                    <Tag className="mx-auto mb-4 text-q-text-muted" size={48} />
                    <h3 className="mb-2 text-lg font-semibold text-foreground">
                        {t('ecommerce.noDiscounts', 'No hay descuentos')}
                    </h3>
                    <p className="mx-auto mb-5 max-w-md text-q-text-muted">
                        {t('ecommerce.noDiscountsYet', 'Crea códigos de descuento para tus clientes')}
                    </p>
                    <button
                        type="button"
                        onClick={() => setShowForm(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
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
                            className={`rounded-xl border bg-q-surface/50 p-4 transition-opacity ${isExpired(discount) || isMaxUsesReached(discount) || !discount.isActive
                                    ? 'border-q-border opacity-60'
                                    : 'border-q-border'
                                }`}
                        >
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                {/* Code */}
                                <div className="flex min-w-0 items-center gap-3">
                                    {getTypeIcon(discount.type)}
                                    <div className="min-w-0">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <code className="max-w-[11rem] truncate text-lg font-mono font-bold text-foreground bg-muted/50 px-2 py-0.5 rounded sm:max-w-none">
                                                {discount.code}
                                            </code>
                                            <button
                                                type="button"
                                                onClick={() => handleCopyCode(discount.code)}
                                                title={t('ecommerce.copyDiscountCode', 'Copiar código')}
                                                aria-label={t('ecommerce.copyDiscountCode', 'Copiar código')}
                                                className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-q-text-muted transition-colors hover:bg-muted hover:text-foreground"
                                            >
                                                {copiedCode === discount.code ? (
                                                    <CheckCircle size={16} className="text-q-success" />
                                                ) : (
                                                    <Copy size={16} />
                                                )}
                                            </button>
                                        </div>
                                        <p className="text-sm text-q-text-muted">{getTypeLabel(discount.type)}</p>
                                    </div>
                                </div>

                                {/* Value */}
                                <div className="min-w-0 flex-1">
                                    <p className="text-2xl font-bold text-q-success">
                                        {formatDiscountValue(discount)}
                                    </p>
                                    {discount.minimumPurchase && discount.minimumPurchase > 0 && (
                                        <p className="text-sm text-q-text-muted">
                                            {t('ecommerce.minPurchase', 'Mínimo')}: {formatCurrency(discount.minimumPurchase)}
                                        </p>
                                    )}
                                </div>

                                {/* Usage */}
                                <div className="text-left sm:text-center">
                                    <p className="text-foreground font-medium">
                                        {discount.usedCount}
                                        {discount.maxUses ? ` / ${discount.maxUses}` : ''}
                                    </p>
                                    <p className="text-sm text-q-text-muted">{t('ecommerce.uses', 'Usos')}</p>
                                </div>

                                {/* Status */}
                                <div className="flex flex-wrap items-center gap-2">
                                    {isExpired(discount) ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-q-text-muted">
                                            <Clock size={12} />
                                            {t('ecommerce.expired', 'Expirado')}
                                        </span>
                                    ) : isMaxUsesReached(discount) ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-q-warning/20 px-2 py-1 text-xs text-q-warning">
                                            <XCircle size={12} />
                                            {t('ecommerce.limitReached', 'Límite alcanzado')}
                                        </span>
                                    ) : discount.isActive ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-q-success/20 px-2 py-1 text-xs text-q-success">
                                            <CheckCircle size={12} />
                                            {t('ecommerce.active', 'Activo')}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-q-text-muted">
                                            <XCircle size={12} />
                                            {t('ecommerce.inactive', 'Inactivo')}
                                        </span>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 sm:ml-auto">
                                    <button
                                        type="button"
                                        onClick={() => toggleDiscountStatus(discount.id)}
                                        title={discount.isActive ? t('ecommerce.deactivateDiscount', 'Desactivar descuento') : t('ecommerce.activateDiscount', 'Activar descuento')}
                                        aria-label={discount.isActive ? t('ecommerce.deactivateDiscount', 'Desactivar descuento') : t('ecommerce.activateDiscount', 'Activar descuento')}
                                        className={`grid h-9 w-9 place-items-center rounded-lg transition-colors ${discount.isActive
                                                ? 'text-q-success hover:bg-q-success/20'
                                                : 'text-q-text-muted hover:bg-muted'
                                            }`}
                                    >
                                        {discount.isActive ? <CheckCircle size={18} /> : <XCircle size={18} />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleEdit(discount)}
                                        title={t('ecommerce.editDiscount', 'Editar Descuento')}
                                        aria-label={t('ecommerce.editDiscount', 'Editar Descuento')}
                                        className="grid h-9 w-9 place-items-center rounded-lg text-q-text-muted transition-colors hover:bg-muted hover:text-foreground"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(discount.id)}
                                        title={t('ecommerce.deleteDiscount', 'Eliminar Descuento')}
                                        aria-label={t('ecommerce.deleteDiscount', 'Eliminar Descuento')}
                                        className="grid h-9 w-9 place-items-center rounded-lg text-q-text-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
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
                <div className="fixed inset-0 bg-q-text/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-q-surface rounded-xl border border-q-border w-full max-w-md max-h-[92vh] overflow-y-auto">
                        <div className="p-4 border-b border-q-border sm:p-6">
                            <h3 className="text-lg font-bold text-foreground">
                                {editingDiscount
                                    ? t('ecommerce.editDiscount', 'Editar Descuento')
                                    : t('ecommerce.addDiscount', 'Crear Descuento')}
                            </h3>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 space-y-4 sm:p-6">
                            {/* Code */}
                            <div>
                                <label className="block text-sm font-medium text-q-text-muted mb-1">
                                    {t('ecommerce.code', 'Código')}
                                </label>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) =>
                                            setFormData({ ...formData, code: e.target.value.toUpperCase() })
                                        }
                                        placeholder="DESCUENTO20"
                                        className="min-w-0 flex-1 px-4 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground uppercase focus:outline-none focus:ring-2 focus:ring-ring"
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
                                <label className="block text-sm font-medium text-q-text-muted mb-1">
                                    {t('ecommerce.discountType', 'Tipo de Descuento')} *
                                </label>
                                <AppSelect
                                    value={formData.type}
                                    onChange={(e) =>
                                        setFormData({ ...formData, type: e.target.value as DiscountType })
                                    }
                                    className="w-full px-4 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <option value="percentage">{t('ecommerce.percentage', 'Porcentaje')}</option>
                                    <option value="fixed_amount">{t('ecommerce.fixedAmount', 'Monto Fijo')}</option>
                                    <option value="free_shipping">{t('ecommerce.freeShipping', 'Envío Gratis')}</option>
                                </AppSelect>
                            </div>

                            {/* Value */}
                            {formData.type !== 'free_shipping' && (
                                <div>
                                    <label className="block text-sm font-medium text-q-text-muted mb-1">
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
                                        className="w-full px-4 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                            )}

                            {/* Minimum Purchase */}
                            <div>
                                <label className="block text-sm font-medium text-q-text-muted mb-1">
                                    {t('ecommerce.minimumPurchase', 'Compra Mínima ($)')}
                                </label>
                                <input
                                    type="number"
                                    value={formData.minimumPurchase}
                                    onChange={(e) =>
                                        setFormData({ ...formData, minimumPurchase: parseFloat(e.target.value) || 0 })
                                    }
                                    min="0"
                                    className="w-full px-4 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            {/* Max Uses */}
                            <div>
                                <label className="block text-sm font-medium text-q-text-muted mb-1">
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
                                    className="w-full px-4 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            {/* Dates */}
                            {!editingDiscount && (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-sm font-medium text-q-text-muted mb-1">
                                            {t('ecommerce.startsAt', 'Inicia')} *
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.startsAt}
                                            onChange={(e) =>
                                                setFormData({ ...formData, startsAt: e.target.value })
                                            }
                                            required
                                            className="w-full px-4 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-q-text-muted mb-1">
                                            {t('ecommerce.endsAt', 'Termina')}
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.endsAt}
                                            onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                                            className="w-full px-4 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
