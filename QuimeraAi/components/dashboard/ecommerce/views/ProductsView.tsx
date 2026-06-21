/**
 * ProductsView
 * Vista de gestión de productos
 * Usa clases de Tailwind del tema (bg-primary, text-primary, etc.)
 */

import React, { useState, useMemo } from 'react';
import ConfirmationModal from '../../../ui/ConfirmationModal';
import { useTranslation } from 'react-i18next';
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Package,
    Image as ImageIcon,
    Loader2,
    X,
    Filter,
    CheckCircle2,
    AlertTriangle,
    ImageOff,
    LayoutGrid,
    List,
    Eye,
    EyeOff,
} from 'lucide-react';
import { useAuth } from '../../../../contexts/core/AuthContext';
import { useProducts } from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';
import { Product, ProductStatus } from '../../../../types/ecommerce';
import ProductForm from '../components/ProductForm';
import ProductCard from '../components/ProductCard';
import { useEcommerceContext } from '../EcommerceContext';
import { FilterChipRow, SortViewControls } from '../../filters';
import type { FilterChipOption } from '../../filters';
import AppSelect from '../../../ui/AppSelect';
import { MotionCard } from '../../../ui/primitives/Card';

type ViewMode = 'grid' | 'list';

const ProductsView: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { storeId } = useEcommerceContext();
    const { products, isLoading, refreshProducts, addProduct, deleteProduct, updateProduct, deleteImage } = useProducts(user?.id || '', storeId);
    const { categories } = useCategories(user?.id || '', storeId);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<ProductStatus | 'all'>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const categoryById = useMemo(() => {
        return new Map(categories.map((category) => [category.id, category.name]));
    }, [categories]);

    // Filter products
    const filteredProducts = useMemo(() => {
        const normalizedSearchTerm = searchTerm.trim().toLowerCase();

        return products.filter((product) => {
            const searchableValues = [
                product.name,
                product.sku,
                product.shortDescription,
                product.description,
                categoryById.get(product.categoryId || ''),
                ...(product.tags || []),
            ];

            const matchesSearch = !normalizedSearchTerm || searchableValues.some((value) =>
                value?.toLowerCase().includes(normalizedSearchTerm)
            );

            const matchesCategory = !selectedCategory || product.categoryId === selectedCategory;
            const matchesStatus = selectedStatus === 'all' || product.status === selectedStatus;

            return matchesSearch && matchesCategory && matchesStatus;
        });
    }, [products, searchTerm, selectedCategory, selectedStatus, categoryById]);

    const statusCounts = useMemo(() => ({
        all: products.length,
        active: products.filter((p) => p.status === 'active').length,
        draft: products.filter((p) => p.status === 'draft').length,
        archived: products.filter((p) => p.status === 'archived').length,
    }), [products]);

    const statusFilterOptions = useMemo<FilterChipOption<ProductStatus | 'all'>[]>(() => [
        { id: 'all', label: t('ecommerce.allProductStatuses', 'Todos'), count: statusCounts.all },
        { id: 'active', label: t('ecommerce.activeProductsShort', 'Activos'), count: statusCounts.active, color: 'green' },
        { id: 'draft', label: t('ecommerce.draftProductsShort', 'Borradores'), count: statusCounts.draft, color: 'gray' },
        { id: 'archived', label: t('ecommerce.archivedProductsShort', 'Archivados'), count: statusCounts.archived, color: 'gray' },
    ], [t, statusCounts]);

    // Get low stock count
    const lowStockCount = useMemo(() => {
        return products.filter(
            (p) => p.trackInventory && p.quantity <= (p.lowStockThreshold ?? 5)
        ).length;
    }, [products]);

    const productsWithoutImagesCount = useMemo(() => {
        return products.filter((product) => !product.images || product.images.length === 0).length;
    }, [products]);

    const outOfStockCount = useMemo(() => {
        return products.filter((product) => product.trackInventory && product.quantity <= 0).length;
    }, [products]);

    const uncategorizedCount = useMemo(() => {
        return products.filter((product) => !product.categoryId).length;
    }, [products]);

    const hasActiveFilters = Boolean(searchTerm.trim()) || Boolean(selectedCategory) || selectedStatus !== 'all';
    const visibleProductsLabel = `${filteredProducts.length} de ${products.length} producto${products.length !== 1 ? 's' : ''}`;

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedCategory('');
        setSelectedStatus('all');
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setShowForm(true);
    };

    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const handleDelete = (productId: string) => {
        setDeleteConfirmId(productId);
    };

    const confirmDeleteProduct = async () => {
        if (deleteConfirmId) {
            await deleteProduct(deleteConfirmId);
            setDeleteConfirmId(null);
        }
    };

    const handleToggleStatus = async (product: Product) => {
        const newStatus: ProductStatus = product.status === 'active' ? 'draft' : 'active';
        await updateProduct(product.id, { status: newStatus });
    };

    const handleFormClose = () => {
        setShowForm(false);
        setEditingProduct(null);
    };

    const handleFormSuccess = async () => {
        await refreshProducts();
        handleFormClose();
    };

    const getCategoryName = (categoryId?: string) => {
        if (!categoryId) return '-';
        return categoryById.get(categoryId) || '-';
    };

    const formatPrice = (product: Product, amount = product.price) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: product.currency || 'USD',
        }).format(amount || 0);
    };

    const getStatusLabel = (status: ProductStatus) => {
        const labels: Record<ProductStatus, string> = {
            active: t('ecommerce.active', 'Activo'),
            draft: t('ecommerce.draft', 'Borrador'),
            archived: t('ecommerce.archived', 'Archivado'),
        };

        return labels[status];
    };

    const StatusBadge: React.FC<{ status: ProductStatus }> = ({ status }) => {
        const styles: Record<ProductStatus, string> = {
            active: 'bg-q-success/15 text-q-success border-q-success/20',
            draft: 'bg-primary/10 text-primary border-primary/20',
            archived: 'bg-muted text-q-text-muted border-q-border',
        };

        return (
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status]}`}>
                {getStatusLabel(status)}
            </span>
        );
    };

    const StockBadge: React.FC<{ product: Product }> = ({ product }) => {
        if (!product.trackInventory) {
            return (
                <span className="inline-flex items-center rounded-full border border-q-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-q-text-muted">
                    {t('ecommerce.notTracked', 'Sin control')}
                </span>
            );
        }

        const threshold = product.lowStockThreshold ?? 5;
        const isOut = product.quantity <= 0;
        const isLow = !isOut && product.quantity <= threshold;

        return (
            <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
                    isOut
                        ? 'border-q-error/20 bg-q-error/10 text-q-error'
                        : isLow
                            ? 'border-q-warning/20 bg-q-warning/10 text-q-warning'
                            : 'border-q-success/20 bg-q-success/10 text-q-success'
                }`}
            >
                {(isOut || isLow) && <AlertTriangle size={12} />}
                {isOut
                    ? t('ecommerce.outOfStock', 'Sin stock')
                    : `${product.quantity} ${t('ecommerce.unitsShort', 'uds')}`}
            </span>
        );
    };

    const productStats = [
        {
            label: t('ecommerce.productsTotalLabel', 'Total'),
            value: products.length,
            helper: t('ecommerce.productsVisibleCount', `${filteredProducts.length} visibles`),
            icon: Package,
            iconClassName: 'quimera-dashboard-header-icon',
        },
        {
            label: t('ecommerce.activeProducts', 'Activos'),
            value: statusCounts.active,
            helper: `${statusCounts.draft} ${t('ecommerce.drafts', 'borradores')} • ${statusCounts.archived} ${t('ecommerce.archivedPlural', 'archivados')}`,
            icon: CheckCircle2,
            iconClassName: 'text-q-success',
        },
        {
            label: t('ecommerce.inventoryRisk', 'Riesgo stock'),
            value: lowStockCount,
            helper: `${outOfStockCount} ${t('ecommerce.outOfStockLower', 'sin stock')}`,
            icon: AlertTriangle,
            iconClassName: lowStockCount > 0 ? 'text-q-warning' : 'text-q-success',
        },
        {
            label: t('ecommerce.missingImages', 'Sin imagen'),
            value: productsWithoutImagesCount,
            helper: `${uncategorizedCount} ${t('ecommerce.uncategorizedLower', 'sin categoría')}`,
            icon: ImageOff,
            iconClassName: productsWithoutImagesCount > 0 ? 'text-q-warning' : 'text-q-success',
        },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-28 md:pb-0">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-q-border bg-q-surface/50 px-3 py-1 text-xs font-medium text-q-text-muted">
                        <Package size={14} />
                        {t('ecommerce.catalogManager', 'Gestor de catálogo')}
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">
                        {t('ecommerce.products', 'Productos')}
                    </h2>
                    <p className="max-w-2xl text-q-text-muted">
                        {t('ecommerce.manageProductsPro', 'Gestiona inventario, precios, imágenes y visibilidad de los productos de la tienda.')}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
                >
                    <Plus size={20} />
                    {t('ecommerce.addProduct', 'Agregar Producto')}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {productStats.map((stat, index) => {
                    const Icon = stat.icon;

                    return (
                        <MotionCard key={stat.label} staggerIndex={index} hoverMotion className="rounded-xl border border-q-border bg-q-surface/50 p-4">
                            <div className="flex items-center gap-3">
                                <Icon className={`h-5 w-5 flex-shrink-0 ${stat.iconClassName}`} strokeWidth={2} />
                                <div className="min-w-0">
                                    <p className="truncate text-sm text-q-text-muted">{stat.label}</p>
                                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                                    <p className="truncate text-xs text-q-text-muted">{stat.helper}</p>
                                </div>
                            </div>
                        </MotionCard>
                    );
                })}
            </div>

            {/* Search and filters */}
            <div className="rounded-xl border border-q-border bg-q-surface/50 p-3 sm:p-4">
                <div className="grid gap-4 xl:grid-cols-[minmax(18rem,1fr)_auto] xl:items-end">
                    <label className="block min-w-0">
                        <span className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold uppercase text-q-text-secondary">
                            <span>{t('ecommerce.searchProductsLabel', 'Buscar productos')}</span>
                            <span className="shrink-0 normal-case text-q-text-muted">{visibleProductsLabel}</span>
                        </span>
                        <div className="flex h-12 items-center gap-3 rounded-lg border border-q-border/70 bg-q-bg/60 px-3 shadow-sm transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
                            <Search className="h-4 w-4 flex-shrink-0 text-q-text-secondary" />
                            <input
                                type="text"
                                placeholder={t('ecommerce.searchProducts', 'Nombre, SKU, etiqueta o categoría')}
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

                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)] xl:min-w-[42rem]">
                        <div className="min-w-0">
                            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-q-text-secondary">
                                <Filter className="h-3.5 w-3.5" />
                                <span>{t('ecommerce.productStatusFilter', 'Estado')}</span>
                            </div>
                            <FilterChipRow
                                options={statusFilterOptions}
                                value={selectedStatus}
                                onChange={(value) => setSelectedStatus(value as ProductStatus | 'all')}
                                className="min-w-0"
                            />
                        </div>

                        <label className="block min-w-0">
                            <span className="mb-2 block text-xs font-semibold uppercase text-q-text-secondary">
                                {t('ecommerce.category', 'Categoría')}
                            </span>
                            <AppSelect
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                aria-label={t('ecommerce.category', 'Categoría')}
                                className="h-10 w-full"
                            >
                                <option value="">{t('ecommerce.allCategories', 'Todas las categorías')}</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </AppSelect>
                        </label>
                    </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 border-t border-q-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-q-text-muted">
                        {hasActiveFilters
                            ? t('ecommerce.activeProductFilters', 'Mostrando productos filtrados')
                            : t('ecommerce.productFiltersHint', 'Filtra por estado, categoría o búsqueda para revisar el catálogo.')}
                    </p>
                    <div className="flex items-center justify-end gap-2">
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-q-border px-3 py-2 text-sm font-medium text-q-text-muted transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                            >
                                <X size={15} />
                                {t('ecommerce.clearFilters', 'Limpiar filtros')}
                            </button>
                        )}
                        <SortViewControls
                            viewMode={viewMode}
                            onViewModeChange={setViewMode}
                            sortVariant="none"
                        />
                        <button
                            type="button"
                            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                            className="grid h-10 w-10 place-items-center rounded-lg bg-secondary/50 text-q-text-muted transition-colors hover:text-foreground sm:hidden"
                            aria-label={t('dashboard.toggleViewMode', 'Cambiar vista')}
                            title={t('dashboard.toggleViewMode', 'Cambiar vista')}
                        >
                            {viewMode === 'grid' ? <List size={16} /> : <LayoutGrid size={16} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Products Grid/List */}
            {filteredProducts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-q-border bg-q-surface/40 px-6 py-12 text-center">
                    <Package className="mx-auto mb-4 text-q-text-muted" size={48} />
                    <h3 className="mb-2 text-lg font-semibold text-foreground">
                        {t('ecommerce.noProducts', 'No hay productos')}
                    </h3>
                    <p className="mx-auto mb-5 max-w-md text-q-text-muted">
                        {hasActiveFilters
                            ? t('ecommerce.noProductsFilter', 'No se encontraron productos con los filtros aplicados')
                            : t('ecommerce.noProductsYet', 'Aún no has agregado ningún producto')}
                    </p>
                    {hasActiveFilters ? (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="inline-flex items-center gap-2 rounded-lg border border-q-border px-4 py-2 font-medium text-q-text-muted transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                        >
                            <X size={18} />
                            {t('ecommerce.clearFilters', 'Limpiar filtros')}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setShowForm(true)}
                            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                            <Plus size={20} />
                            {t('ecommerce.addFirstProduct', 'Agregar tu primer producto')}
                        </button>
                    )}
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredProducts.map((product) => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            categoryName={getCategoryName(product.categoryId)}
                            onEdit={() => handleEdit(product)}
                            onDelete={() => handleDelete(product.id)}
                            onToggleStatus={() => handleToggleStatus(product)}
                        />
                    ))}
                </div>
            ) : (
                <>
                    <div className="space-y-3 sm:hidden">
                        {filteredProducts.map((product) => (
                            <div key={product.id} className="rounded-xl border border-q-border bg-q-surface/50 p-3">
                                <div className="flex gap-3">
                                    {product.images?.[0] ? (
                                        <img
                                            src={product.images[0].url}
                                            alt={product.name}
                                            className="h-20 w-20 flex-shrink-0 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                                            <ImageIcon className="text-q-text-muted" size={24} />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="truncate font-semibold text-foreground">{product.name}</p>
                                                <p className="truncate text-xs text-q-text-muted">
                                                    {getCategoryName(product.categoryId)}
                                                    {product.sku ? ` • SKU: ${product.sku}` : ''}
                                                </p>
                                            </div>
                                            <p className="flex-shrink-0 font-semibold text-foreground">{formatPrice(product)}</p>
                                        </div>
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <StatusBadge status={product.status} />
                                            <StockBadge product={product} />
                                        </div>
                                        <div className="mt-3 flex items-center justify-end gap-1">
                                            <button
                                                type="button"
                                                onClick={() => handleEdit(product)}
                                                title={t('ecommerce.editProduct', 'Editar producto')}
                                                className="grid h-9 w-9 place-items-center rounded-lg text-q-text-muted transition-colors hover:bg-muted hover:text-foreground"
                                            >
                                                <Edit size={17} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleToggleStatus(product)}
                                                title={product.status === 'active' ? t('ecommerce.moveToDraft', 'Mover a borrador') : t('ecommerce.publishProduct', 'Publicar producto')}
                                                className="grid h-9 w-9 place-items-center rounded-lg text-q-text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                                            >
                                                {product.status === 'active' ? <EyeOff size={17} /> : <Eye size={17} />}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(product.id)}
                                                title={t('ecommerce.deleteProduct', 'Eliminar Producto')}
                                                className="grid h-9 w-9 place-items-center rounded-lg text-q-text-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
                                            >
                                                <Trash2 size={17} />
                                            </button>
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
                                            {t('ecommerce.product', 'Producto')}
                                        </th>
                                        <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase text-q-text-muted md:table-cell">
                                            {t('ecommerce.category', 'Categoría')}
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-q-text-muted">
                                            {t('ecommerce.price', 'Precio')}
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-q-text-muted">
                                            {t('ecommerce.stock', 'Stock')}
                                        </th>
                                        <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase text-q-text-muted lg:table-cell">
                                            {t('ecommerce.status', 'Estado')}
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-q-text-muted">
                                            {t('ecommerce.actions', 'Acciones')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredProducts.map((product) => (
                                        <tr key={product.id} className="transition-colors hover:bg-muted/20">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    {product.images?.[0] ? (
                                                        <img
                                                            src={product.images[0].url}
                                                            alt={product.name}
                                                            className="h-12 w-12 rounded-lg object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                                                            <ImageIcon className="text-q-text-muted" size={20} />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="truncate font-semibold text-foreground">{product.name}</p>
                                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-q-text-muted">
                                                            {product.sku && <span>SKU: {product.sku}</span>}
                                                            {(!product.images || product.images.length === 0) && (
                                                                <span className="text-q-warning">{t('ecommerce.missingImage', 'Sin imagen')}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="hidden px-4 py-3 md:table-cell">
                                                <span className="inline-flex max-w-[12rem] items-center truncate rounded-full border border-q-border bg-muted/30 px-2.5 py-1 text-xs font-medium text-q-text-muted">
                                                    {getCategoryName(product.categoryId)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-semibold text-foreground">{formatPrice(product)}</p>
                                                {product.compareAtPrice && product.compareAtPrice > product.price && (
                                                    <p className="text-sm text-q-text-muted line-through">
                                                        {formatPrice(product, product.compareAtPrice)}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <StockBadge product={product} />
                                            </td>
                                            <td className="hidden px-4 py-3 lg:table-cell">
                                                <StatusBadge status={product.status} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEdit(product)}
                                                        title={t('ecommerce.editProduct', 'Editar producto')}
                                                        className="grid h-9 w-9 place-items-center rounded-lg text-q-text-muted transition-colors hover:bg-muted hover:text-foreground"
                                                    >
                                                        <Edit size={17} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleStatus(product)}
                                                        title={product.status === 'active' ? t('ecommerce.moveToDraft', 'Mover a borrador') : t('ecommerce.publishProduct', 'Publicar producto')}
                                                        className="grid h-9 w-9 place-items-center rounded-lg text-q-text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                                                    >
                                                        {product.status === 'active' ? <EyeOff size={17} /> : <Eye size={17} />}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(product.id)}
                                                        title={t('ecommerce.deleteProduct', 'Eliminar Producto')}
                                                        className="grid h-9 w-9 place-items-center rounded-lg text-q-text-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
                                                    >
                                                        <Trash2 size={17} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Product Form Modal */}
            {showForm && (
                <ProductForm
                    product={editingProduct}
                    categories={categories}
                    addProduct={addProduct}
                    updateProduct={updateProduct}
                    deleteImage={deleteImage}
                    onClose={handleFormClose}
                    onSuccess={handleFormSuccess}
                />
            )}
            {/* Delete Product Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!deleteConfirmId}
                onConfirm={confirmDeleteProduct}
                onCancel={() => setDeleteConfirmId(null)}
                title={t('ecommerce.deleteProduct', 'Eliminar Producto')}
                message={t('ecommerce.confirmDeleteProduct', '¿Estás seguro de eliminar este producto?')}
                variant="danger"
            />
        </div>
    );
};

export default ProductsView;
