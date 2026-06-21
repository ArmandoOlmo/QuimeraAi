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
} from 'lucide-react';
import { useAuth } from '../../../../contexts/core/AuthContext';
import { useProducts } from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';
import { Product, ProductStatus } from '../../../../types/ecommerce';
import ProductForm from '../components/ProductForm';
import ProductCard from '../components/ProductCard';
import { useEcommerceContext } from '../EcommerceContext';
import { CatalogFilterBar, FilterChipRow, SortViewControls, CatalogToolbarFooter } from '../../filters';
import type { FilterChipOption } from '../../filters';
import AppSelect from '../../../ui/AppSelect';

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

    // Filter products
    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            const matchesSearch =
                !searchTerm ||
                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.sku?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesCategory = !selectedCategory || product.categoryId === selectedCategory;
            const matchesStatus = selectedStatus === 'all' || product.status === selectedStatus;

            return matchesSearch && matchesCategory && matchesStatus;
        });
    }, [products, searchTerm, selectedCategory, selectedStatus]);

    const statusCounts = useMemo(() => ({
        all: products.length,
        active: products.filter((p) => p.status === 'active').length,
        draft: products.filter((p) => p.status === 'draft').length,
        archived: products.filter((p) => p.status === 'archived').length,
    }), [products]);

    const statusFilterOptions = useMemo<FilterChipOption<ProductStatus | 'all'>[]>(() => [
        { id: 'all', label: t('ecommerce.allStatuses', 'Todos los estados'), count: statusCounts.all },
        { id: 'active', label: t('ecommerce.active', 'Activo'), count: statusCounts.active, color: 'green' },
        { id: 'draft', label: t('ecommerce.draft', 'Borrador'), count: statusCounts.draft, color: 'gray' },
        { id: 'archived', label: t('ecommerce.archived', 'Archivado'), count: statusCounts.archived, color: 'gray' },
    ], [t, statusCounts]);

    // Get low stock count
    const lowStockCount = useMemo(() => {
        return products.filter(
            (p) => p.trackInventory && p.quantity <= (p.lowStockThreshold || 5)
        ).length;
    }, [products]);

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
        const category = categories.find((c) => c.id === categoryId);
        return category?.name || '-';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">
                        {t('ecommerce.products', 'Productos')}
                    </h2>
                    <p className="text-q-text-muted">
                        {products.length} {t('ecommerce.productsTotal', 'productos en total')}
                        {lowStockCount > 0 && (
                            <span className="ml-2 text-orange-400">
                                • {lowStockCount} {t('ecommerce.lowStock', 'con bajo stock')}
                            </span>
                        )}
                    </p>
                </div>

                <button
                    onClick={() => setShowForm(true)}
                    className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg transition-colors hover:bg-primary/90 sm:w-auto"
                >
                    <Plus size={20} />
                    {t('ecommerce.addProduct', 'Agregar Producto')}
                </button>
            </div>

            {/* Search + category */}
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex items-center gap-2 flex-1 bg-q-surface-overlay/40 rounded-lg px-3 py-2">
                    <Search className="w-4 h-4 text-q-text-secondary flex-shrink-0" />
                    <input
                        type="text"
                        placeholder={t('ecommerce.searchProducts', 'Buscar productos...')}
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
                <AppSelect
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring lg:w-auto"
                >
                    <option value="">{t('ecommerce.allCategories', 'Todas las categorías')}</option>
                    {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                            {cat.name}
                        </option>
                    ))}
                </AppSelect>
            </div>

            <CatalogFilterBar
                filters={
                    <FilterChipRow
                        options={statusFilterOptions}
                        value={selectedStatus}
                        onChange={(value) => setSelectedStatus(value as ProductStatus | 'all')}
                    />
                }
                trailing={
                    <SortViewControls
                        viewMode={viewMode}
                        onViewModeChange={setViewMode}
                        sortVariant="none"
                    />
                }
                footer={
                    <CatalogToolbarFooter
                        count={filteredProducts.length}
                        total={products.length}
                        countLabelDefault={`${filteredProducts.length} de ${products.length}`}
                        viewMode={viewMode}
                        onViewModeChange={setViewMode}
                    />
                }
            />

            {/* Products Grid/List */}
            {filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                    <Package className="mx-auto text-q-text-muted mb-4" size={48} />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        {t('ecommerce.noProducts', 'No hay productos')}
                    </h3>
                    <p className="text-q-text-muted mb-4">
                        {searchTerm || selectedCategory || selectedStatus !== 'all'
                            ? t('ecommerce.noProductsFilter', 'No se encontraron productos con los filtros aplicados')
                            : t('ecommerce.noProductsYet', 'Aún no has agregado ningún producto')}
                    </p>
                    {!searchTerm && !selectedCategory && selectedStatus === 'all' && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg transition-colors hover:bg-primary/90"
                        >
                            <Plus size={20} />
                            {t('ecommerce.addFirstProduct', 'Agregar tu primer producto')}
                        </button>
                    )}
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                                        className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                                    />
                                ) : (
                                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                                        <ImageIcon className="text-q-text-muted" size={22} />
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-foreground">{product.name}</p>
                                            <p className="truncate text-xs text-q-text-muted">{getCategoryName(product.categoryId)}</p>
                                        </div>
                                        <p className="flex-shrink-0 font-semibold text-foreground">${product.price.toFixed(2)}</p>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between gap-3">
                                        <div className="min-w-0 text-xs text-q-text-muted">
                                            {product.sku && <span className="mr-2">SKU: {product.sku}</span>}
                                            {product.trackInventory && (
                                                <span className={product.quantity <= (product.lowStockThreshold || 5) ? 'text-orange-400' : ''}>
                                                    {product.quantity} uds
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-shrink-0 items-center gap-1">
                                            <button
                                                onClick={() => handleEdit(product)}
                                                className="p-2 text-q-text-muted hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="p-2 text-q-text-muted hover:text-destructive hover:bg-muted rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="hidden overflow-x-auto rounded-xl border border-q-border bg-q-surface/50 sm:block">
                    <table className="w-full min-w-[640px]">
                        <thead className="bg-muted/30">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-q-text-muted">
                                    {t('ecommerce.product', 'Producto')}
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-q-text-muted hidden md:table-cell">
                                    {t('ecommerce.category', 'Categoría')}
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-q-text-muted">
                                    {t('ecommerce.price', 'Precio')}
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-q-text-muted hidden sm:table-cell">
                                    {t('ecommerce.stock', 'Stock')}
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-q-text-muted hidden lg:table-cell">
                                    {t('ecommerce.status', 'Estado')}
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-q-text-muted">
                                    {t('ecommerce.actions', 'Acciones')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredProducts.map((product) => (
                                <tr key={product.id} className="hover:bg-muted/20">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {product.images?.[0] ? (
                                                <img
                                                    src={product.images[0].url}
                                                    alt={product.name}
                                                    className="w-10 h-10 rounded-lg object-cover"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                                    <ImageIcon className="text-q-text-muted" size={20} />
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-foreground font-medium">{product.name}</p>
                                                {product.sku && (
                                                    <p className="text-q-text-muted text-sm">SKU: {product.sku}</p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-q-text-muted hidden md:table-cell">
                                        {getCategoryName(product.categoryId)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-foreground font-medium">
                                            ${product.price.toFixed(2)}
                                        </p>
                                        {product.compareAtPrice && (
                                            <p className="text-q-text-muted text-sm line-through">
                                                ${product.compareAtPrice.toFixed(2)}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 hidden sm:table-cell">
                                        {product.trackInventory ? (
                                            <span
                                                className={`${product.quantity <= (product.lowStockThreshold || 5)
                                                        ? 'text-orange-400'
                                                        : 'text-q-text-muted'
                                                    }`}
                                            >
                                                {product.quantity}
                                            </span>
                                        ) : (
                                            <span className="text-q-text-muted">∞</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 hidden lg:table-cell">
                                        <span
                                            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${product.status === 'active'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : product.status === 'draft'
                                                        ? 'bg-yellow-500/20 text-yellow-400'
                                                        : 'bg-muted text-q-text-muted'
                                                }`}
                                        >
                                            {product.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(product)}
                                                className="p-2 text-q-text-muted hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="p-2 text-q-text-muted hover:text-destructive hover:bg-muted rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
