/**
 * ProductCard
 * Tarjeta de producto para mostrar en la grilla
 * Usa clases de Tailwind del tema (bg-primary, text-primary, etc.)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Edit,
    Trash2,
    Eye,
    EyeOff,
    AlertTriangle,
    Image as ImageIcon,
} from 'lucide-react';
import { Product } from '../../../../types/ecommerce';
import { MotionCard } from '../../../ui/primitives/Card';

interface ProductCardProps {
    product: Product;
    categoryName: string;
    onEdit: () => void;
    onDelete: () => void;
    onToggleStatus: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
    product,
    categoryName,
    onEdit,
    onDelete,
    onToggleStatus,
}) => {
    const { t } = useTranslation();

    const threshold = product.lowStockThreshold ?? 5;
    const isOutOfStock = product.trackInventory && product.quantity <= 0;
    const isLowStock = product.trackInventory && !isOutOfStock && product.quantity <= threshold;
    const hasDiscount = typeof product.compareAtPrice === 'number' && product.compareAtPrice > product.price;
    const discountPercentage = hasDiscount
        ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)
        : 0;
    const primaryImage = product.images?.[0];
    const imageCount = product.images?.length || 0;
    const resolvedCategoryName = categoryName && categoryName !== '-'
        ? categoryName
        : t('ecommerce.noCategory', 'Sin categoría');
    const description = product.shortDescription || product.description;

    const formatPrice = (value: number) => new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: product.currency || 'USD',
    }).format(value || 0);

    const statusLabels: Record<Product['status'], string> = {
        active: t('ecommerce.active', 'Activo'),
        draft: t('ecommerce.draft', 'Borrador'),
        archived: t('ecommerce.archived', 'Archivado'),
    };

    const statusStyles: Record<Product['status'], string> = {
        active: 'border-q-success/20 bg-q-success/15 text-q-success',
        draft: 'border-primary/20 bg-primary/10 text-primary',
        archived: 'border-q-border bg-muted text-q-text-muted',
    };

    const stockLabel = !product.trackInventory
        ? t('ecommerce.notTracked', 'Sin control')
        : isOutOfStock
            ? t('ecommerce.outOfStock', 'Sin stock')
            : `${product.quantity} ${t('ecommerce.unitsShort', 'uds')}`;

    const stockClassName = !product.trackInventory
        ? 'border-q-border bg-muted/40 text-q-text-muted'
        : isOutOfStock
            ? 'border-q-error/20 bg-q-error/10 text-q-error'
            : isLowStock
                ? 'border-q-warning/20 bg-q-warning/10 text-q-warning'
                : 'border-q-success/20 bg-q-success/10 text-q-success';

    return (
        <MotionCard hoverMotion className="group flex h-full flex-col overflow-hidden rounded-xl border border-q-border bg-q-surface/50 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
            {/* Image */}
            <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                {primaryImage ? (
                    <img
                        src={primaryImage.url}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                        <ImageIcon className="text-q-text-muted" size={48} />
                    </div>
                )}

                {/* Status Badge */}
                <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur ${statusStyles[product.status]}`}>
                        {statusLabels[product.status]}
                    </span>
                    {hasDiscount && (
                        <span className="rounded-full bg-destructive px-2.5 py-1 text-xs font-bold text-destructive-foreground shadow-sm">
                            -{discountPercentage}%
                        </span>
                    )}
                </div>

                {/* Low Stock Warning */}
                {(isLowStock || isOutOfStock) && (
                    <div className="absolute bottom-3 left-3">
                        <span className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur ${stockClassName}`}>
                            <AlertTriangle size={12} />
                            {stockLabel}
                        </span>
                    </div>
                )}

                {imageCount > 1 && (
                    <div className="absolute bottom-3 right-3 rounded-full bg-q-text/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
                        +{imageCount - 1}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col p-4">
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h3 className="truncate font-semibold text-foreground" title={product.name}>
                                {product.name}
                            </h3>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="max-w-full truncate rounded-full border border-q-border bg-muted/30 px-2.5 py-1 text-xs font-medium text-q-text-muted">
                                    {resolvedCategoryName}
                                </span>
                                {product.sku && (
                                    <span className="rounded-full border border-q-border bg-q-bg/50 px-2.5 py-1 text-xs font-medium text-q-text-muted">
                                        SKU: {product.sku}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                            <p className="font-bold text-primary">{formatPrice(product.price)}</p>
                            {hasDiscount && (
                                <p className="text-xs text-q-text-muted line-through">
                                    {formatPrice(product.compareAtPrice!)}
                                </p>
                            )}
                        </div>
                    </div>

                    {description && (
                        <p className="mt-3 truncate text-sm text-q-text-muted" title={description}>
                            {description}
                        </p>
                    )}

                    <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-q-border/60 bg-q-bg/40 px-3 py-2">
                        <span className="text-xs font-medium text-q-text-muted">
                            {t('ecommerce.inventory', 'Inventario')}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${stockClassName}`}>
                            {(isLowStock || isOutOfStock) && <AlertTriangle size={12} />}
                            {stockLabel}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-q-border pt-3">
                    <button
                        type="button"
                        onClick={onEdit}
                        title={t('ecommerce.editProduct', 'Editar producto')}
                        aria-label={t('ecommerce.editProduct', 'Editar producto')}
                        className="grid h-10 place-items-center rounded-lg text-q-text-muted transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <Edit size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={onToggleStatus}
                        title={product.status === 'active' ? t('ecommerce.moveToDraft', 'Mover a borrador') : t('ecommerce.publishProduct', 'Publicar producto')}
                        aria-label={product.status === 'active' ? t('ecommerce.moveToDraft', 'Mover a borrador') : t('ecommerce.publishProduct', 'Publicar producto')}
                        className="grid h-10 place-items-center rounded-lg text-q-text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                        {product.status === 'active' ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    <button
                        type="button"
                        onClick={onDelete}
                        title={t('ecommerce.deleteProduct', 'Eliminar Producto')}
                        aria-label={t('ecommerce.deleteProduct', 'Eliminar Producto')}
                        className="grid h-10 place-items-center rounded-lg text-q-text-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
        </MotionCard>
    );
};

export default ProductCard;
