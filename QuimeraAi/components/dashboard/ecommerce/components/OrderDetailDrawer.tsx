/**
 * OrderDetailDrawer
 * Panel lateral para ver, editar y gestionar detalles de un pedido
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    X,
    Package,
    Truck,
    DollarSign,
    User,
    Mail,
    Phone,
    MapPin,
    CreditCard,
    FileText,
    Loader2,
    Copy,
    ExternalLink,
    Edit3,
    Save,
    Plus,
    Trash2,
    Image as ImageIcon,
    FolderOpen,
    Search,
} from 'lucide-react';
import {
    Address,
    FulfillmentStatus,
    Order,
    OrderItem,
    OrderStatus,
    PaymentStatus,
    Product,
    ProductVariant,
    StoredTimestamp,
} from '../../../../types/ecommerce';
import { timestampToDate } from '../../../../utils/timestampUtils';
import AppSelect from '../../../ui/AppSelect';
import EcommerceImagePicker from './EcommerceImagePicker';

interface OrderDetailDrawerProps {
    order: Order;
    products: Product[];
    onClose: () => void;
    onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<void>;
    onAddTracking: (orderId: string, carrier: string, trackingNumber: string, trackingUrl?: string) => Promise<void>;
    onUpdateInternalNotes: (orderId: string, notes: string) => Promise<void>;
    onUpdateOrder: (orderId: string, updates: Partial<Order>) => Promise<void>;
    onRefundOrder: (orderId: string, amount?: number, reason?: string) => Promise<void>;
}

type OrderStatusConfig = { color: string; bg: string; label: string };
type AddressField = keyof Address;
type ProductPickerTarget = 'new' | number | null;

const ORDER_STATUS_CONFIGS: Record<OrderStatus, OrderStatusConfig> = {
    pending: { color: 'text-q-accent', bg: 'bg-q-accent/20', label: 'Pendiente' },
    paid: { color: 'text-q-success', bg: 'bg-q-success/20', label: 'Pagado' },
    processing: { color: 'text-q-accent', bg: 'bg-q-accent/20', label: 'Procesando' },
    shipped: { color: 'text-q-accent', bg: 'bg-q-accent/20', label: 'Enviado' },
    delivered: { color: 'text-q-success', bg: 'bg-q-success/20', label: 'Entregado' },
    cancelled: { color: 'text-q-error', bg: 'bg-q-error/20', label: 'Cancelado' },
    refunded: { color: 'text-q-warning', bg: 'bg-q-warning/20', label: 'Reembolsado' },
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
    pending: 'Pendiente',
    paid: 'Pagado',
    failed: 'Fallido',
    refunded: 'Reembolsado',
    partially_refunded: 'Parcialmente reembolsado',
};

const FULFILLMENT_STATUS_LABELS: Record<FulfillmentStatus, string> = {
    unfulfilled: 'Sin preparar',
    partial: 'Parcial',
    fulfilled: 'Completado',
};

const getStatusConfig = (status: unknown): OrderStatusConfig => {
    if (typeof status === 'string' && Object.prototype.hasOwnProperty.call(ORDER_STATUS_CONFIGS, status)) {
        return ORDER_STATUS_CONFIGS[status as OrderStatus];
    }
    return ORDER_STATUS_CONFIGS.pending;
};

const toFiniteNumber = (value: unknown, fallback = 0): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
};

const formatMoney = (value: unknown): string => `$${toFiniteNumber(value).toFixed(2)}`;

const emptyAddress = (): Address => ({
    firstName: '',
    lastName: '',
    company: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    phone: '',
});

const normalizeAddress = (address?: Partial<Address> | null): Address => ({
    ...emptyAddress(),
    ...(address || {}),
});

const hasAddressContent = (address?: Partial<Address> | null): boolean => {
    if (!address) return false;
    return Object.values(address).some((value) => typeof value === 'string' && value.trim() !== '');
};

const normalizeItem = (item: Partial<OrderItem>, index: number): OrderItem => {
    const quantity = Math.max(0, toFiniteNumber(item.quantity, 1));
    const unitPrice = toFiniteNumber(item.unitPrice ?? item.price);
    const totalPrice = toFiniteNumber(item.totalPrice, unitPrice * quantity);
    const name = item.productName || item.name || 'Producto';

    return {
        id: item.id || `item-${index}`,
        productId: item.productId || 'manual',
        variantId: item.variantId || '',
        name,
        productName: name,
        variantName: item.variantName || '',
        sku: item.sku || '',
        imageUrl: item.imageUrl || item.image || '',
        image: item.image || item.imageUrl || '',
        price: unitPrice,
        quantity,
        unitPrice,
        totalPrice,
    };
};

const getProductImageUrl = (product: Product, variant?: ProductVariant): string => {
    const variantImage = variant?.imageId
        ? product.images?.find((image) => image.id === variant.imageId)?.url
        : '';
    return variantImage || product.images?.[0]?.url || '';
};

const buildOrderItemFromProduct = (
    product: Product,
    index: number,
    variant?: ProductVariant,
    quantity = 1
): OrderItem => {
    const unitPrice = toFiniteNumber(variant?.price ?? product.price);
    const imageUrl = getProductImageUrl(product, variant);
    const itemName = product.name;

    return {
        id: `item-${product.id}-${variant?.id || 'default'}-${Date.now()}-${index}`,
        productId: product.id,
        variantId: variant?.id || '',
        name: itemName,
        productName: itemName,
        variantName: variant?.name || '',
        sku: variant?.sku || product.sku || '',
        imageUrl,
        image: imageUrl,
        price: unitPrice,
        quantity,
        unitPrice,
        totalPrice: unitPrice * quantity,
    };
};

const prepareDraftOrder = (source: Order): Order => {
    const subtotal = source.pricing?.subtotal ?? source.subtotal;
    const discountAmount = source.discountAmount ?? source.pricing?.discountTotal ?? source.discount;
    const shippingCost = source.pricing?.shippingTotal ?? source.shippingCost;
    const taxAmount = source.pricing?.taxTotal ?? source.taxAmount;
    const total = source.pricing?.total ?? source.total;

    return {
        ...source,
        orderNumber: source.orderNumber || '',
        customerName: source.customerName || '',
        customerEmail: source.customerEmail || '',
        customerPhone: source.customerPhone || '',
        items: Array.isArray(source.items) ? source.items.map(normalizeItem) : [],
        subtotal: toFiniteNumber(subtotal),
        discount: toFiniteNumber(discountAmount),
        discountAmount: toFiniteNumber(discountAmount),
        shippingCost: toFiniteNumber(shippingCost),
        taxAmount: toFiniteNumber(taxAmount),
        total: toFiniteNumber(total),
        currency: source.currency || 'USD',
        pricing: {
            subtotal: toFiniteNumber(subtotal),
            discountTotal: toFiniteNumber(discountAmount),
            shippingTotal: toFiniteNumber(shippingCost),
            taxTotal: toFiniteNumber(taxAmount),
            platformFeeTotal: toFiniteNumber(source.pricing?.platformFeeTotal),
            total: toFiniteNumber(total),
        },
        shippingAddress: normalizeAddress(source.shippingAddress),
        billingAddress: normalizeAddress(source.billingAddress),
        paymentMethod: source.paymentMethod || '',
        shippingMethod: source.shippingMethod || '',
        carrier: source.carrier || '',
        trackingNumber: source.trackingNumber || '',
        trackingUrl: source.trackingUrl || '',
        notes: source.notes || '',
        customerNotes: source.customerNotes || '',
        internalNotes: source.internalNotes || '',
    };
};

const inputClass =
    'w-full px-3 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring';
const labelClass = 'block text-xs font-medium text-q-text-muted mb-1.5';

const OrderDetailDrawer: React.FC<OrderDetailDrawerProps> = ({
    order,
    products,
    onClose,
    onUpdateStatus,
    onAddTracking,
    onUpdateInternalNotes,
    onUpdateOrder,
    onRefundOrder,
}) => {
    const { t } = useTranslation();
    const [isUpdating, setIsUpdating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [draftOrder, setDraftOrder] = useState<Order>(() => prepareDraftOrder(order));
    const [imagePickerItemIndex, setImagePickerItemIndex] = useState<number | null>(null);
    const [productPickerTarget, setProductPickerTarget] = useState<ProductPickerTarget>(null);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [showTrackingForm, setShowTrackingForm] = useState(false);
    const [trackingData, setTrackingData] = useState({
        carrier: '',
        trackingNumber: '',
        trackingUrl: '',
    });
    const [internalNotes, setInternalNotes] = useState(order.internalNotes || '');
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [notesError, setNotesError] = useState<string | null>(null);
    const [showRefundForm, setShowRefundForm] = useState(false);
    const [refundAmount, setRefundAmount] = useState('');
    const [refundReason, setRefundReason] = useState('requested_by_customer');
    const [isRefunding, setIsRefunding] = useState(false);
    const [refundError, setRefundError] = useState<string | null>(null);

    useEffect(() => {
        setDraftOrder(prepareDraftOrder(order));
        setInternalNotes(order.internalNotes || '');
        setIsEditing(false);
        setSaveError(null);
        setImagePickerItemIndex(null);
        setProductPickerTarget(null);
        setProductSearchTerm('');
        setShowRefundForm(false);
        setRefundAmount('');
        setRefundReason('requested_by_customer');
        setRefundError(null);
    }, [order]);

    const handleStatusChange = async (newStatus: OrderStatus) => {
        setIsUpdating(true);
        try {
            await onUpdateStatus(order.id, newStatus);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleHeaderStatusChange = async (newStatus: OrderStatus) => {
        if (isEditing) {
            updateDraftField('status', newStatus);
            return;
        }

        await handleStatusChange(newStatus);
    };

    const handleAddTracking = async () => {
        if (!trackingData.carrier || !trackingData.trackingNumber) return;

        setIsUpdating(true);
        try {
            await onAddTracking(
                order.id,
                trackingData.carrier,
                trackingData.trackingNumber,
                trackingData.trackingUrl || undefined
            );
            setShowTrackingForm(false);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSaveInternalNotes = async () => {
        setIsSavingNotes(true);
        setNotesError(null);
        try {
            await onUpdateInternalNotes(order.id, internalNotes);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No se pudieron guardar las notas';
            setNotesError(message);
        } finally {
            setIsSavingNotes(false);
        }
    };

    const handleStartRefund = () => {
        setRefundAmount(refundableAmount.toFixed(2));
        setRefundError(null);
        setShowRefundForm(true);
    };

    const handleRefundOrder = async () => {
        const parsedAmount = refundAmount.trim() ? toFiniteNumber(refundAmount) : undefined;
        if (parsedAmount !== undefined && parsedAmount <= 0) {
            setRefundError('El monto debe ser mayor que cero');
            return;
        }
        if (parsedAmount !== undefined && parsedAmount - refundableAmount > 0.005) {
            setRefundError('El monto excede el balance reembolsable');
            return;
        }

        setIsRefunding(true);
        setRefundError(null);
        try {
            await onRefundOrder(order.id, parsedAmount, refundReason);
            setShowRefundForm(false);
            setRefundAmount('');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No se pudo crear el reembolso';
            setRefundError(message);
        } finally {
            setIsRefunding(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const formatDate = (timestamp: StoredTimestamp) => {
        return timestampToDate(timestamp).toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const updateDraftField = <K extends keyof Order>(field: K, value: Order[K]) => {
        setDraftOrder((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const updateDraftAddress = (
        type: 'shippingAddress' | 'billingAddress',
        field: AddressField,
        value: string
    ) => {
        setDraftOrder((current) => ({
            ...current,
            [type]: {
                ...normalizeAddress(current[type]),
                [field]: value,
            },
        }));
    };

    const updateDraftItem = (index: number, field: keyof OrderItem, value: string | number) => {
        setDraftOrder((current) => {
            const nextItems = [...current.items];
            const nextItem = { ...normalizeItem(nextItems[index], index) };

            if (field === 'quantity') {
                nextItem.quantity = Math.max(0, toFiniteNumber(value));
            } else if (field === 'unitPrice' || field === 'price') {
                const price = Math.max(0, toFiniteNumber(value));
                nextItem.unitPrice = price;
                nextItem.price = price;
            } else if (field === 'imageUrl' || field === 'image') {
                nextItem.imageUrl = String(value);
                nextItem.image = String(value);
            } else {
                (nextItem as Record<string, unknown>)[field] = value;
            }

            if (field === 'name' || field === 'productName') {
                nextItem.name = String(value);
                nextItem.productName = String(value);
            }

            nextItem.totalPrice = nextItem.unitPrice * nextItem.quantity;
            nextItems[index] = nextItem;

            return {
                ...current,
                items: nextItems,
            };
        });
    };

    const handleSelectCatalogProduct = (product: Product, variant?: ProductVariant) => {
        setDraftOrder((current) => {
            if (productPickerTarget === null) return current;

            if (productPickerTarget === 'new') {
                return {
                    ...current,
                    items: [
                        ...current.items,
                        buildOrderItemFromProduct(product, current.items.length, variant),
                    ],
                };
            }

            const currentItem = normalizeItem(current.items[productPickerTarget], productPickerTarget);
            const nextItems = [...current.items];
            nextItems[productPickerTarget] = buildOrderItemFromProduct(
                product,
                productPickerTarget,
                variant,
                Math.max(1, toFiniteNumber(currentItem.quantity, 1))
            );

            return {
                ...current,
                items: nextItems,
            };
        });
        setProductPickerTarget(null);
        setProductSearchTerm('');
    };

    const removeDraftItem = (index: number) => {
        setDraftOrder((current) => ({
            ...current,
            items: current.items.filter((_, itemIndex) => itemIndex !== index),
        }));
    };

    const handleItemImageSelect = (url: string) => {
        if (imagePickerItemIndex === null) return;

        updateDraftItem(imagePickerItemIndex, 'imageUrl', url);
        setImagePickerItemIndex(null);
    };

    const recalculateSummaryFromItems = () => {
        setDraftOrder((current) => {
            const subtotal = current.items.reduce((sum, item) => sum + toFiniteNumber(item.totalPrice), 0);
            const discountAmount = toFiniteNumber(current.discountAmount ?? current.discount);
            const shippingCost = toFiniteNumber(current.shippingCost);
            const taxAmount = toFiniteNumber(current.taxAmount);
            const total = Math.max(0, subtotal - discountAmount + shippingCost + taxAmount);

            return {
                ...current,
                subtotal,
                total,
                pricing: {
                    ...(current.pricing || {
                        subtotal: 0,
                        discountTotal: 0,
                        shippingTotal: 0,
                        taxTotal: 0,
                        platformFeeTotal: 0,
                        total: 0,
                    }),
                    subtotal,
                    discountTotal: discountAmount,
                    shippingTotal: shippingCost,
                    taxTotal: taxAmount,
                    total,
                },
            };
        });
    };

    const handleCancelEdit = () => {
        setDraftOrder(prepareDraftOrder(order));
        setIsEditing(false);
        setSaveError(null);
    };

    const handleSaveOrderDetails = async () => {
        const orderNumber = draftOrder.orderNumber.trim();
        const customerName = draftOrder.customerName.trim();
        const customerEmail = draftOrder.customerEmail.trim();

        if (!orderNumber || !customerName || !customerEmail) {
            setSaveError('Número de pedido, cliente y email son requeridos.');
            return;
        }

        const subtotal = toFiniteNumber(draftOrder.subtotal);
        const discountAmount = toFiniteNumber(draftOrder.discountAmount ?? draftOrder.discount);
        const shippingCost = toFiniteNumber(draftOrder.shippingCost);
        const taxAmount = toFiniteNumber(draftOrder.taxAmount);
        const total = toFiniteNumber(draftOrder.total);
        const normalizedItems = draftOrder.items.map(normalizeItem);
        const pricing = {
            subtotal,
            discountTotal: discountAmount,
            shippingTotal: shippingCost,
            taxTotal: taxAmount,
            platformFeeTotal: toFiniteNumber(draftOrder.pricing?.platformFeeTotal),
            total,
        };

        setIsSavingOrder(true);
        setSaveError(null);
        try {
            await onUpdateOrder(order.id, {
                orderNumber,
                customerName,
                customerEmail,
                customerPhone: draftOrder.customerPhone?.trim() || '',
                items: normalizedItems,
                subtotal,
                discount: discountAmount,
                discountAmount,
                discountCode: draftOrder.discountCode?.trim() || '',
                shippingCost,
                taxAmount,
                total,
                currency: (draftOrder.currency || 'USD').trim().toUpperCase(),
                pricing,
                shippingAddress: normalizeAddress(draftOrder.shippingAddress),
                billingAddress: normalizeAddress(draftOrder.billingAddress),
                status: draftOrder.status,
                paymentStatus: draftOrder.paymentStatus,
                fulfillmentStatus: draftOrder.fulfillmentStatus,
                paymentMethod: draftOrder.paymentMethod?.trim() || 'manual',
                shippingMethod: draftOrder.shippingMethod?.trim() || '',
                carrier: draftOrder.carrier?.trim() || '',
                trackingNumber: draftOrder.trackingNumber?.trim() || '',
                trackingUrl: draftOrder.trackingUrl?.trim() || '',
                notes: draftOrder.notes || '',
                customerNotes: draftOrder.customerNotes || '',
                internalNotes: draftOrder.internalNotes || '',
            });
            setInternalNotes(draftOrder.internalNotes || '');
            setIsEditing(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No se pudieron guardar los cambios del pedido';
            setSaveError(message);
        } finally {
            setIsSavingOrder(false);
        }
    };

    const displayedOrder = isEditing ? draftOrder : order;
    const statusConfig = getStatusConfig(displayedOrder.status);
    const orderItems = Array.isArray(displayedOrder.items) ? displayedOrder.items : [];
    const shippingAddress = normalizeAddress(displayedOrder.shippingAddress);
    const billingAddress = normalizeAddress(displayedOrder.billingAddress);
    const subtotal = displayedOrder.pricing?.subtotal ?? displayedOrder.subtotal;
    const discountAmount = displayedOrder.discountAmount ?? displayedOrder.pricing?.discountTotal ?? displayedOrder.discount;
    const shippingCost = displayedOrder.pricing?.shippingTotal ?? displayedOrder.shippingCost;
    const taxAmount = displayedOrder.pricing?.taxTotal ?? displayedOrder.taxAmount;
    const total = displayedOrder.pricing?.total ?? displayedOrder.total;
    const refunds = Array.isArray(order.refunds) ? order.refunds : [];
    const refundedAmount = toFiniteNumber(order.refundedAmount);
    const refundableAmount = Math.max(0, toFiniteNumber(order.pricing?.total ?? order.total) - refundedAmount);
    const hasStripePaymentIntent = Boolean(order.paymentIntentId || order.stripe?.paymentIntentId);
    const canRefund =
        !isEditing &&
        order.paymentMethod?.toLowerCase() === 'stripe' &&
        ['paid', 'partially_refunded'].includes(order.paymentStatus) &&
        hasStripePaymentIntent &&
        refundableAmount > 0;
    const currentPickerItem =
        imagePickerItemIndex === null
            ? null
            : draftOrder.items[imagePickerItemIndex]
                ? normalizeItem(draftOrder.items[imagePickerItemIndex], imagePickerItemIndex)
                : null;
    const currentPickerImage = currentPickerItem?.image || currentPickerItem?.imageUrl || '';
    const normalizedProductSearch = productSearchTerm.trim().toLowerCase();
    const selectableProducts = products
        .filter((product) => product.status !== 'archived')
        .filter((product) => {
            if (!normalizedProductSearch) return true;
            return (
                product.name.toLowerCase().includes(normalizedProductSearch) ||
                product.sku?.toLowerCase().includes(normalizedProductSearch) ||
                product.tags?.some((tag) => tag.toLowerCase().includes(normalizedProductSearch)) ||
                product.variants?.some((variant) =>
                    variant.name.toLowerCase().includes(normalizedProductSearch) ||
                    variant.sku?.toLowerCase().includes(normalizedProductSearch)
                )
            );
        });

    return (
        <div className="fixed inset-0 bg-q-text/50 backdrop-blur-sm z-50 flex justify-end">
            <div className="w-full max-w-2xl bg-q-surface h-full overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-q-surface border-b border-q-border p-4 z-10">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold text-foreground truncate">
                                {t('ecommerce.order', 'Pedido')} #{displayedOrder.orderNumber}
                            </h2>
                            <p className="text-q-text-muted text-sm">{formatDate(order.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={handleCancelEdit}
                                        disabled={isSavingOrder}
                                        className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-sm disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSaveOrderDetails}
                                        disabled={isSavingOrder}
                                        className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50"
                                    >
                                        {isSavingOrder ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                        Guardar
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => {
                                        setDraftOrder(prepareDraftOrder(order));
                                        setIsEditing(true);
                                    }}
                                    className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
                                >
                                    <Edit3 size={14} />
                                    Editar
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 text-q-text-muted hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                            {statusConfig.label}
                        </span>

                        <AppSelect
                            value={displayedOrder.status}
                            onChange={(e) => handleHeaderStatusChange(e.target.value as OrderStatus)}
                            disabled={isUpdating || isSavingOrder}
                            className="px-3 py-1.5 bg-muted border border-q-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            <option value="pending">Pendiente</option>
                            <option value="paid">Pagado</option>
                            <option value="processing">Procesando</option>
                            <option value="shipped">Enviado</option>
                            <option value="delivered">Entregado</option>
                            <option value="cancelled">Cancelado</option>
                            <option value="refunded">Reembolsado</option>
                        </AppSelect>

                        {isUpdating && <Loader2 size={18} className="animate-spin text-primary" />}
                    </div>
                    {saveError && (
                        <p className="mt-3 rounded-lg border border-q-error/30 bg-q-error/10 px-3 py-2 text-sm text-q-error">
                            {saveError}
                        </p>
                    )}
                </div>

                <div className="p-4 space-y-6">
                    {/* Order Info */}
                    {isEditing && (
                        <div className="bg-muted/30 rounded-lg p-4">
                            <h3 className="text-sm font-medium text-q-text-muted mb-3 flex items-center gap-2">
                                <Package size={16} />
                                Información del pedido
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label>
                                    <span className={labelClass}>Número</span>
                                    <input
                                        type="text"
                                        value={draftOrder.orderNumber}
                                        onChange={(event) => updateDraftField('orderNumber', event.target.value)}
                                        className={inputClass}
                                    />
                                </label>
                                <label>
                                    <span className={labelClass}>Moneda</span>
                                    <input
                                        type="text"
                                        value={draftOrder.currency}
                                        onChange={(event) => updateDraftField('currency', event.target.value)}
                                        className={inputClass}
                                    />
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Customer Info */}
                    <div className="bg-muted/30 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-q-text-muted mb-3 flex items-center gap-2">
                            <User size={16} />
                            {t('ecommerce.customer', 'Cliente')}
                        </h3>
                        {isEditing ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label>
                                    <span className={labelClass}>Nombre</span>
                                    <input
                                        type="text"
                                        value={draftOrder.customerName}
                                        onChange={(event) => updateDraftField('customerName', event.target.value)}
                                        className={inputClass}
                                    />
                                </label>
                                <label>
                                    <span className={labelClass}>Email</span>
                                    <input
                                        type="email"
                                        value={draftOrder.customerEmail}
                                        onChange={(event) => updateDraftField('customerEmail', event.target.value)}
                                        className={inputClass}
                                    />
                                </label>
                                <label className="sm:col-span-2">
                                    <span className={labelClass}>Teléfono</span>
                                    <input
                                        type="tel"
                                        value={draftOrder.customerPhone || ''}
                                        onChange={(event) => updateDraftField('customerPhone', event.target.value)}
                                        className={inputClass}
                                    />
                                </label>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-foreground font-medium">{order.customerName}</p>
                                <div className="flex items-center gap-2 text-q-text-muted">
                                    <Mail size={14} className="text-q-text-muted" />
                                    <span className="min-w-0 truncate">{order.customerEmail}</span>
                                    <button
                                        onClick={() => copyToClipboard(order.customerEmail)}
                                        className="p-1 hover:bg-muted rounded"
                                    >
                                        <Copy size={12} className="text-q-text-muted" />
                                    </button>
                                </div>
                                {order.customerPhone && (
                                    <div className="flex items-center gap-2 text-q-text-muted">
                                        <Phone size={14} className="text-q-text-muted" />
                                        <span>{order.customerPhone}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Shipping Address */}
                    <div className="bg-muted/30 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-q-text-muted mb-3 flex items-center gap-2">
                            <MapPin size={16} />
                            {t('ecommerce.shippingAddress', 'Dirección de Envío')}
                        </h3>
                        {isEditing ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {([
                                    ['firstName', 'Nombre'],
                                    ['lastName', 'Apellido'],
                                    ['company', 'Compañía'],
                                    ['phone', 'Teléfono'],
                                    ['address1', 'Dirección 1'],
                                    ['address2', 'Dirección 2'],
                                    ['city', 'Ciudad'],
                                    ['state', 'Estado'],
                                    ['zipCode', 'Código postal'],
                                    ['country', 'País'],
                                ] as [AddressField, string][]).map(([field, label]) => (
                                    <label key={field} className={field === 'address1' || field === 'address2' ? 'sm:col-span-2' : ''}>
                                        <span className={labelClass}>{label}</span>
                                        <input
                                            type="text"
                                            value={shippingAddress[field] || ''}
                                            onChange={(event) => updateDraftAddress('shippingAddress', field, event.target.value)}
                                            className={inputClass}
                                        />
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <div className="text-q-text-muted space-y-1">
                                {(shippingAddress.firstName || shippingAddress.lastName) && (
                                    <p>{[shippingAddress.firstName, shippingAddress.lastName].filter(Boolean).join(' ')}</p>
                                )}
                                {shippingAddress.company && <p>{shippingAddress.company}</p>}
                                <p>{shippingAddress.address1 || '-'}</p>
                                {shippingAddress.address2 && <p>{shippingAddress.address2}</p>}
                                <p>
                                    {[shippingAddress.city, shippingAddress.state, shippingAddress.zipCode]
                                        .filter(Boolean)
                                        .join(', ') || '-'}
                                </p>
                                <p>{shippingAddress.country || '-'}</p>
                                {shippingAddress.phone && <p>{shippingAddress.phone}</p>}
                            </div>
                        )}
                    </div>

                    {(isEditing || hasAddressContent(order.billingAddress)) && (
                        <div className="bg-muted/30 rounded-lg p-4">
                            <h3 className="text-sm font-medium text-q-text-muted mb-3 flex items-center gap-2">
                                <CreditCard size={16} />
                                Dirección de facturación
                            </h3>
                            {isEditing ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {([
                                        ['firstName', 'Nombre'],
                                        ['lastName', 'Apellido'],
                                        ['company', 'Compañía'],
                                        ['phone', 'Teléfono'],
                                        ['address1', 'Dirección 1'],
                                        ['address2', 'Dirección 2'],
                                        ['city', 'Ciudad'],
                                        ['state', 'Estado'],
                                        ['zipCode', 'Código postal'],
                                        ['country', 'País'],
                                    ] as [AddressField, string][]).map(([field, label]) => (
                                        <label key={field} className={field === 'address1' || field === 'address2' ? 'sm:col-span-2' : ''}>
                                            <span className={labelClass}>{label}</span>
                                            <input
                                                type="text"
                                                value={billingAddress[field] || ''}
                                                onChange={(event) => updateDraftAddress('billingAddress', field, event.target.value)}
                                                className={inputClass}
                                            />
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-q-text-muted space-y-1">
                                    {(billingAddress.firstName || billingAddress.lastName) && (
                                        <p>{[billingAddress.firstName, billingAddress.lastName].filter(Boolean).join(' ')}</p>
                                    )}
                                    {billingAddress.company && <p>{billingAddress.company}</p>}
                                    <p>{billingAddress.address1 || '-'}</p>
                                    {billingAddress.address2 && <p>{billingAddress.address2}</p>}
                                    <p>
                                        {[billingAddress.city, billingAddress.state, billingAddress.zipCode]
                                            .filter(Boolean)
                                            .join(', ') || '-'}
                                    </p>
                                    <p>{billingAddress.country || '-'}</p>
                                    {billingAddress.phone && <p>{billingAddress.phone}</p>}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tracking Info */}
                    <div className="bg-muted/30 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-q-text-muted mb-3 flex items-center gap-2">
                            <Truck size={16} />
                            {t('ecommerce.tracking', 'Seguimiento')}
                        </h3>

                        {isEditing ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label>
                                    <span className={labelClass}>Carrier</span>
                                    <input
                                        type="text"
                                        value={draftOrder.carrier || ''}
                                        onChange={(event) => updateDraftField('carrier', event.target.value)}
                                        className={inputClass}
                                    />
                                </label>
                                <label>
                                    <span className={labelClass}>Número de rastreo</span>
                                    <input
                                        type="text"
                                        value={draftOrder.trackingNumber || ''}
                                        onChange={(event) => updateDraftField('trackingNumber', event.target.value)}
                                        className={inputClass}
                                    />
                                </label>
                                <label className="sm:col-span-2">
                                    <span className={labelClass}>URL de rastreo</span>
                                    <input
                                        type="url"
                                        value={draftOrder.trackingUrl || ''}
                                        onChange={(event) => updateDraftField('trackingUrl', event.target.value)}
                                        className={inputClass}
                                    />
                                </label>
                                <label className="sm:col-span-2">
                                    <span className={labelClass}>Método de envío</span>
                                    <input
                                        type="text"
                                        value={draftOrder.shippingMethod || ''}
                                        onChange={(event) => updateDraftField('shippingMethod', event.target.value)}
                                        className={inputClass}
                                    />
                                </label>
                            </div>
                        ) : order.trackingNumber ? (
                            <div className="space-y-2">
                                <p className="text-q-text-muted">
                                    <span className="text-q-text-muted">Carrier:</span> {order.carrier}
                                </p>
                                <div className="flex items-center gap-2">
                                    <span className="text-q-text-muted">Tracking:</span>
                                    <code className="text-foreground bg-muted px-2 py-0.5 rounded">
                                        {order.trackingNumber}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(order.trackingNumber!)}
                                        className="p-1 hover:bg-muted rounded"
                                    >
                                        <Copy size={12} className="text-q-text-muted" />
                                    </button>
                                </div>
                                {order.trackingUrl && (
                                    <a
                                        href={order.trackingUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-primary hover:opacity-80"
                                    >
                                        Ver seguimiento <ExternalLink size={14} />
                                    </a>
                                )}
                            </div>
                        ) : showTrackingForm ? (
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Carrier (DHL, FedEx, etc.)"
                                    value={trackingData.carrier}
                                    onChange={(e) =>
                                        setTrackingData({ ...trackingData, carrier: e.target.value })
                                    }
                                    className={inputClass}
                                />
                                <input
                                    type="text"
                                    placeholder="Número de rastreo"
                                    value={trackingData.trackingNumber}
                                    onChange={(e) =>
                                        setTrackingData({ ...trackingData, trackingNumber: e.target.value })
                                    }
                                    className={inputClass}
                                />
                                <input
                                    type="url"
                                    placeholder="URL de rastreo (opcional)"
                                    value={trackingData.trackingUrl}
                                    onChange={(e) =>
                                        setTrackingData({ ...trackingData, trackingUrl: e.target.value })
                                    }
                                    className={inputClass}
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowTrackingForm(false)}
                                        className="flex-1 px-3 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-sm"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleAddTracking}
                                        disabled={isUpdating}
                                        className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
                                    >
                                        Guardar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowTrackingForm(true)}
                                className="text-sm text-primary hover:opacity-80"
                            >
                                + Agregar información de rastreo
                            </button>
                        )}
                    </div>

                    {/* Order Items */}
                    <div className="bg-muted/30 rounded-lg p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <h3 className="text-sm font-medium text-q-text-muted flex items-center gap-2">
                                <Package size={16} />
                                {t('ecommerce.items', 'Productos')} ({orderItems.length})
                            </h3>
                            {isEditing && (
                                <button
                                    onClick={() => setProductPickerTarget('new')}
                                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:opacity-80"
                                >
                                    <Plus size={14} />
                                    Agregar producto
                                </button>
                            )}
                        </div>

                        <div className="space-y-3">
                            {orderItems.map((item, index) => {
                                const normalizedItem = normalizeItem(item, index);
                                const itemName = normalizedItem.productName || normalizedItem.name || 'Producto';
                                const itemImage = normalizedItem.image || normalizedItem.imageUrl;
                                const itemPrice = normalizedItem.price ?? normalizedItem.unitPrice;
                                const itemQuantity = toFiniteNumber(normalizedItem.quantity, 1);
                                const itemTotal = normalizedItem.totalPrice ?? toFiniteNumber(itemPrice) * itemQuantity;
                                const referencedProduct = products.find((product) => product.id === normalizedItem.productId);
                                const isCatalogLinked = Boolean(referencedProduct && normalizedItem.productId !== 'manual');

                                if (isEditing) {
                                    return (
                                        <div key={normalizedItem.id || index} className="rounded-lg border border-q-border bg-muted/20 p-3 space-y-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-sm font-medium text-foreground">Producto {index + 1}</p>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setProductPickerTarget(index)}
                                                        className="px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg"
                                                    >
                                                        {isCatalogLinked ? 'Cambiar producto' : 'Vincular producto'}
                                                    </button>
                                                    <button
                                                        onClick={() => removeDraftItem(index)}
                                                        className="p-1.5 text-q-text-muted hover:text-q-error hover:bg-q-error/10 rounded-lg"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className={`rounded-lg border px-3 py-2 text-xs ${
                                                isCatalogLinked
                                                    ? 'border-q-success/20 bg-q-success/10 text-q-success'
                                                    : 'border-q-accent/20 bg-q-accent/10 text-q-accent'
                                            }`}>
                                                {isCatalogLinked
                                                    ? `Vinculado al catálogo: ${referencedProduct?.name}`
                                                    : 'Sin producto vinculado. Selecciona un producto real de la tienda.'}
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <label className="sm:col-span-2">
                                                    <span className={labelClass}>Nombre</span>
                                                    <input
                                                        type="text"
                                                        value={normalizedItem.name}
                                                        onChange={(event) => updateDraftItem(index, 'name', event.target.value)}
                                                        className={inputClass}
                                                    />
                                                </label>
                                                <label>
                                                    <span className={labelClass}>Variante</span>
                                                    <input
                                                        type="text"
                                                        value={normalizedItem.variantName || ''}
                                                        onChange={(event) => updateDraftItem(index, 'variantName', event.target.value)}
                                                        className={inputClass}
                                                    />
                                                </label>
                                                <label>
                                                    <span className={labelClass}>SKU</span>
                                                    <input
                                                        type="text"
                                                        value={normalizedItem.sku || ''}
                                                        onChange={(event) => updateDraftItem(index, 'sku', event.target.value)}
                                                        className={inputClass}
                                                    />
                                                </label>
                                                <label>
                                                    <span className={labelClass}>Cantidad</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={normalizedItem.quantity}
                                                        onChange={(event) => updateDraftItem(index, 'quantity', event.target.value)}
                                                        className={inputClass}
                                                    />
                                                </label>
                                                <label>
                                                    <span className={labelClass}>Precio unitario</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={normalizedItem.unitPrice}
                                                        onChange={(event) => updateDraftItem(index, 'unitPrice', event.target.value)}
                                                        className={inputClass}
                                                    />
                                                </label>
                                                <div className="sm:col-span-2">
                                                    <span className={labelClass}>Imagen</span>
                                                    <div className="flex flex-col gap-3 rounded-lg border border-q-border bg-muted/20 p-3 sm:flex-row sm:items-center">
                                                        <div className="h-24 w-full overflow-hidden rounded-lg border border-q-border bg-muted/40 sm:w-24 sm:flex-shrink-0">
                                                            {itemImage ? (
                                                                <img
                                                                    src={itemImage}
                                                                    alt={itemName}
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="flex h-full w-full items-center justify-center">
                                                                    <ImageIcon className="text-q-text-muted" size={26} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
                                                            <button
                                                                type="button"
                                                                onClick={() => setImagePickerItemIndex(index)}
                                                                className="inline-flex min-w-0 items-center justify-center gap-2 rounded-lg border border-q-border bg-muted/40 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                                                            >
                                                                <FolderOpen size={16} />
                                                                <span className="truncate">
                                                                    {itemImage ? 'Cambiar imagen' : 'Seleccionar imagen'}
                                                                </span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => updateDraftItem(index, 'imageUrl', '')}
                                                                disabled={!itemImage}
                                                                className="inline-flex min-w-0 items-center justify-center gap-2 rounded-lg border border-q-border bg-muted/20 px-3 py-2 text-sm font-medium text-q-text-muted transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                <Trash2 size={16} />
                                                                <span className="truncate">Quitar</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right text-sm text-q-text-muted">
                                                Total línea: <span className="font-medium text-foreground">{formatMoney(normalizedItem.totalPrice)}</span>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={normalizedItem.id || index} className="flex items-center gap-3">
                                        {itemImage ? (
                                            <img
                                                src={itemImage}
                                                alt={itemName}
                                                className="w-12 h-12 rounded-lg object-cover"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                                                <Package className="text-q-text-muted" size={20} />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-foreground font-medium truncate">{itemName}</p>
                                            {normalizedItem.variantName && (
                                                <p className="text-q-text-muted text-sm">{normalizedItem.variantName}</p>
                                            )}
                                            <p className="text-q-text-muted text-sm">
                                                {formatMoney(itemPrice)} × {itemQuantity}
                                            </p>
                                        </div>
                                        <p className="text-foreground font-medium">
                                            {formatMoney(itemTotal)}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="bg-muted/30 rounded-lg p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <h3 className="text-sm font-medium text-q-text-muted flex items-center gap-2">
                                <DollarSign size={16} />
                                {t('ecommerce.summary', 'Resumen')}
                            </h3>
                            {isEditing && (
                                <button
                                    onClick={recalculateSummaryFromItems}
                                    className="text-sm text-primary hover:opacity-80"
                                >
                                    Recalcular
                                </button>
                            )}
                        </div>

                        {isEditing ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label>
                                    <span className={labelClass}>Subtotal</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={draftOrder.subtotal}
                                        onChange={(event) => updateDraftField('subtotal', toFiniteNumber(event.target.value))}
                                        className={inputClass}
                                    />
                                </label>
                                <label>
                                    <span className={labelClass}>Descuento</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={draftOrder.discountAmount ?? draftOrder.discount}
                                        onChange={(event) => {
                                            const value = toFiniteNumber(event.target.value);
                                            updateDraftField('discount', value);
                                            updateDraftField('discountAmount', value);
                                        }}
                                        className={inputClass}
                                    />
                                </label>
                                <label>
                                    <span className={labelClass}>Código descuento</span>
                                    <input
                                        type="text"
                                        value={draftOrder.discountCode || ''}
                                        onChange={(event) => updateDraftField('discountCode', event.target.value)}
                                        className={inputClass}
                                    />
                                </label>
                                <label>
                                    <span className={labelClass}>Envío</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={draftOrder.shippingCost}
                                        onChange={(event) => updateDraftField('shippingCost', toFiniteNumber(event.target.value))}
                                        className={inputClass}
                                    />
                                </label>
                                <label>
                                    <span className={labelClass}>Impuestos</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={draftOrder.taxAmount}
                                        onChange={(event) => updateDraftField('taxAmount', toFiniteNumber(event.target.value))}
                                        className={inputClass}
                                    />
                                </label>
                                <label>
                                    <span className={labelClass}>Total</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={draftOrder.total}
                                        onChange={(event) => updateDraftField('total', toFiniteNumber(event.target.value))}
                                        className={inputClass}
                                    />
                                </label>
                            </div>
                        ) : (
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-q-text-muted">
                                    <span>Subtotal</span>
                                    <span>{formatMoney(subtotal)}</span>
                                </div>
                                {toFiniteNumber(discountAmount) > 0 && (
                                    <div className="flex justify-between text-q-success">
                                        <span>
                                            Descuento
                                            {order.discountCode && ` (${order.discountCode})`}
                                        </span>
                                        <span>-{formatMoney(discountAmount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-q-text-muted">
                                    <span>Envío</span>
                                    <span>
                                        {toFiniteNumber(shippingCost) === 0 ? 'Gratis' : formatMoney(shippingCost)}
                                    </span>
                                </div>
                                {toFiniteNumber(taxAmount) > 0 && (
                                    <div className="flex justify-between text-q-text-muted">
                                        <span>Impuestos</span>
                                        <span>{formatMoney(taxAmount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-foreground font-bold pt-2 border-t border-q-border">
                                    <span>Total</span>
                                    <span>{formatMoney(total)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Payment Info */}
                    <div className="bg-muted/30 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-q-text-muted mb-3 flex items-center gap-2">
                            <CreditCard size={16} />
                            {t('ecommerce.payment', 'Pago')}
                        </h3>

                        {isEditing ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label>
                                    <span className={labelClass}>Método</span>
                                    <input
                                        type="text"
                                        value={draftOrder.paymentMethod}
                                        onChange={(event) => updateDraftField('paymentMethod', event.target.value)}
                                        className={inputClass}
                                    />
                                </label>
                                <label>
                                    <span className={labelClass}>Estado de pago</span>
                                    <AppSelect
                                        value={draftOrder.paymentStatus}
                                        onChange={(event) => updateDraftField('paymentStatus', event.target.value as PaymentStatus)}
                                        className={inputClass}
                                    >
                                        {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </AppSelect>
                                </label>
                                <label>
                                    <span className={labelClass}>Preparación</span>
                                    <AppSelect
                                        value={draftOrder.fulfillmentStatus}
                                        onChange={(event) => updateDraftField('fulfillmentStatus', event.target.value as FulfillmentStatus)}
                                        className={inputClass}
                                    >
                                        {Object.entries(FULFILLMENT_STATUS_LABELS).map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </AppSelect>
                                </label>
                                <label>
                                    <span className={labelClass}>Payment Intent</span>
                                    <input
                                        type="text"
                                        value={draftOrder.paymentIntentId || ''}
                                        onChange={(event) => updateDraftField('paymentIntentId', event.target.value)}
                                        className={inputClass}
                                    />
                                </label>
                            </div>
                        ) : (
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-q-text-muted">Método</span>
                                    <span className="text-foreground capitalize">{order.paymentMethod}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-q-text-muted">Estado</span>
                                    <span
                                        className={`${
                                            order.paymentStatus === 'paid'
                                                ? 'text-q-success'
                                                : order.paymentStatus === 'pending'
                                                ? 'text-q-accent'
                                                : order.paymentStatus === 'refunded' || order.paymentStatus === 'partially_refunded'
                                                ? 'text-q-warning'
                                                : 'text-q-error'
                                        }`}
                                    >
                                        {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-q-text-muted">Preparación</span>
                                    <span className="text-foreground">
                                        {FULFILLMENT_STATUS_LABELS[order.fulfillmentStatus] || order.fulfillmentStatus}
                                    </span>
                                </div>
                                {order.paymentIntentId && (
                                    <div className="flex items-center gap-2 text-q-text-muted">
                                        <span>Payment Intent:</span>
                                        <code className="text-xs bg-muted px-1 rounded">
                                            {order.paymentIntentId.slice(0, 20)}...
                                        </code>
                                    </div>
                                )}
                                {refundedAmount > 0 && (
                                    <div className="flex justify-between text-q-warning">
                                        <span>Reembolsado</span>
                                        <span>{formatMoney(refundedAmount)}</span>
                                    </div>
                                )}
                                {refunds.length > 0 && (
                                    <div className="mt-3 space-y-2 border-t border-q-border pt-3">
                                        {refunds.map((refund) => (
                                            <div key={refund.id} className="flex items-start justify-between gap-3 text-xs">
                                                <div className="min-w-0">
                                                    <p className="text-foreground">{formatMoney(refund.amount)}</p>
                                                    <p className="truncate text-q-text-muted">{refund.reason || refund.status}</p>
                                                </div>
                                                <span className="text-q-text-muted">{refund.status}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {canRefund && (
                                    <div className="mt-4 border-t border-q-border pt-4">
                                        {showRefundForm ? (
                                            <div className="space-y-3">
                                                <input
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    max={refundableAmount}
                                                    value={refundAmount}
                                                    onChange={(event) => setRefundAmount(event.target.value)}
                                                    className={inputClass}
                                                />
                                                <AppSelect
                                                    value={refundReason}
                                                    onChange={(event) => setRefundReason(event.target.value)}
                                                    className={inputClass}
                                                >
                                                    <option value="requested_by_customer">Solicitado por cliente</option>
                                                    <option value="duplicate">Duplicado</option>
                                                    <option value="fraudulent">Fraudulento</option>
                                                </AppSelect>
                                                {refundError && (
                                                    <p className="text-sm text-q-error">{refundError}</p>
                                                )}
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setShowRefundForm(false)}
                                                        disabled={isRefunding}
                                                        className="flex-1 px-3 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-sm disabled:opacity-50"
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        onClick={handleRefundOrder}
                                                        disabled={isRefunding}
                                                        className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-q-warning text-white rounded-lg text-sm hover:bg-q-warning disabled:opacity-50"
                                                    >
                                                        {isRefunding && <Loader2 size={14} className="animate-spin" />}
                                                        Reembolsar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={handleStartRefund}
                                                className="inline-flex items-center gap-2 text-sm text-q-warning hover:text-q-warning"
                                            >
                                                <DollarSign size={14} />
                                                Crear reembolso
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    {(isEditing || order.notes || order.customerNotes) && (
                        <div className="bg-muted/30 rounded-lg p-4">
                            <h3 className="text-sm font-medium text-q-text-muted mb-3 flex items-center gap-2">
                                <FileText size={16} />
                                {t('ecommerce.notes', 'Notas')}
                            </h3>
                            {isEditing ? (
                                <div className="space-y-3">
                                    <label>
                                        <span className={labelClass}>Notas del pedido</span>
                                        <textarea
                                            value={draftOrder.notes || ''}
                                            onChange={(event) => updateDraftField('notes', event.target.value)}
                                            rows={3}
                                            className={`${inputClass} resize-none`}
                                        />
                                    </label>
                                    <label>
                                        <span className={labelClass}>Notas del cliente</span>
                                        <textarea
                                            value={draftOrder.customerNotes || ''}
                                            onChange={(event) => updateDraftField('customerNotes', event.target.value)}
                                            rows={3}
                                            className={`${inputClass} resize-none`}
                                        />
                                    </label>
                                    <label>
                                        <span className={labelClass}>Notas internas</span>
                                        <textarea
                                            value={draftOrder.internalNotes || ''}
                                            onChange={(event) => updateDraftField('internalNotes', event.target.value)}
                                            rows={3}
                                            className={`${inputClass} resize-none`}
                                        />
                                    </label>
                                </div>
                            ) : (
                                <div className="space-y-3 text-q-text-muted">
                                    {order.notes && <p>{order.notes}</p>}
                                    {order.customerNotes && (
                                        <p>
                                            <span className="text-q-text-muted">Cliente:</span> {order.customerNotes}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Internal Notes */}
                    {!isEditing && (
                        <div className="bg-muted/30 rounded-lg p-4">
                            <h3 className="text-sm font-medium text-q-text-muted mb-3 flex items-center gap-2">
                                <FileText size={16} />
                                {t('ecommerce.internalNotes', 'Notas internas')}
                            </h3>
                            <textarea
                                value={internalNotes}
                                onChange={(event) => setInternalNotes(event.target.value)}
                                rows={4}
                                placeholder={t('ecommerce.internalNotesPlaceholder', 'Notas visibles solo para el equipo')}
                                className={`${inputClass} resize-none`}
                            />
                            {notesError && (
                                <p className="mt-2 text-sm text-q-error">{notesError}</p>
                            )}
                            <div className="mt-3 flex justify-end">
                                <button
                                    onClick={handleSaveInternalNotes}
                                    disabled={isSavingNotes || internalNotes === (order.internalNotes || '')}
                                    className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {isSavingNotes && <Loader2 size={14} className="animate-spin" />}
                                    {t('common.save', 'Guardar')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <EcommerceImagePicker
                isOpen={imagePickerItemIndex !== null}
                onClose={() => setImagePickerItemIndex(null)}
                onSelect={handleItemImageSelect}
                currentImages={currentPickerImage ? [currentPickerImage] : []}
                multiple={false}
            />
            {productPickerTarget !== null && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-q-text/60 p-3 backdrop-blur-sm sm:p-4">
                    <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-q-border bg-q-surface">
                        <div className="flex items-start justify-between gap-3 border-b border-q-border p-4">
                            <div className="min-w-0">
                                <h3 className="text-lg font-bold text-foreground">
                                    {productPickerTarget === 'new' ? 'Agregar producto' : 'Vincular producto'}
                                </h3>
                                <p className="text-sm text-q-text-muted">
                                    Selecciona un producto real de la tienda para mantener la referencia del catálogo.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setProductPickerTarget(null)}
                                className="flex-shrink-0 rounded-lg p-2 text-q-text-muted transition-colors hover:bg-muted hover:text-foreground"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="border-b border-q-border p-4">
                            <div className="flex items-center gap-2 rounded-lg bg-q-surface-overlay/40 px-3 py-2">
                                <Search size={16} className="flex-shrink-0 text-q-text-secondary" />
                                <input
                                    type="text"
                                    value={productSearchTerm}
                                    onChange={(event) => setProductSearchTerm(event.target.value)}
                                    placeholder="Buscar por nombre, SKU, etiqueta o variante..."
                                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                                />
                                {productSearchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => setProductSearchTerm('')}
                                        className="flex-shrink-0 text-q-text-secondary hover:text-q-text"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto p-4">
                            {selectableProducts.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-q-border p-8 text-center">
                                    <Package className="mx-auto mb-3 text-q-text-muted" size={36} />
                                    <p className="font-medium text-foreground">No hay productos disponibles</p>
                                    <p className="mt-1 text-sm text-q-text-muted">
                                        {productSearchTerm
                                            ? 'No encontramos productos con esa búsqueda.'
                                            : 'Crea productos en la tienda antes de agregarlos a una orden.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {selectableProducts.map((product) => {
                                        const productImage = getProductImageUrl(product);
                                        const productVariants = product.hasVariants && product.variants?.length
                                            ? product.variants
                                            : [];

                                        return (
                                            <div key={product.id} className="rounded-lg border border-q-border bg-muted/20 p-3">
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                                    <div className="h-20 w-full overflow-hidden rounded-lg border border-q-border bg-muted/40 sm:w-20 sm:flex-shrink-0">
                                                        {productImage ? (
                                                            <img
                                                                src={productImage}
                                                                alt={product.name}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center">
                                                                <ImageIcon className="text-q-text-muted" size={24} />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                                            <div className="min-w-0">
                                                                <p className="truncate font-medium text-foreground">{product.name}</p>
                                                                <p className="text-xs text-q-text-muted">
                                                                    {product.sku ? `SKU: ${product.sku}` : 'Sin SKU'} · Stock: {product.quantity}
                                                                </p>
                                                            </div>
                                                            <p className="font-semibold text-primary">
                                                                {formatMoney(product.price)}
                                                            </p>
                                                        </div>

                                                        {productVariants.length > 0 ? (
                                                            <div className="mt-3 flex flex-wrap gap-2">
                                                                {productVariants.map((variant) => (
                                                                    <button
                                                                        key={variant.id}
                                                                        type="button"
                                                                        onClick={() => handleSelectCatalogProduct(product, variant)}
                                                                        className="rounded-lg border border-q-border bg-q-surface px-3 py-2 text-left text-xs text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10"
                                                                    >
                                                                        <span className="block font-medium">{variant.name}</span>
                                                                        <span className="text-q-text-muted">
                                                                            {variant.sku ? `${variant.sku} · ` : ''}{formatMoney(variant.price)}
                                                                        </span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="mt-3 flex justify-end">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSelectCatalogProduct(product)}
                                                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                                                                >
                                                                    <Plus size={16} />
                                                                    Seleccionar
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderDetailDrawer;
