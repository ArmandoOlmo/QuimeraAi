/**
 * ProductsView
 * Vista de gestión de productos
 * Usa clases de Tailwind del tema (bg-primary, text-primary, etc.)
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Package,
    Grid,
    List,
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
import { useEcommerceContext } from '../EcommerceDashboard';

type ViewMode = 'grid' | 'list';

const ProductsView: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { storeId } = useEcommerceContext();
    const { products, isLoading, deleteProduct, updateProduct } = useProducts(user?.uid || '', storeId);
    const { categories } = useCategories(user?.uid || '', storeId);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<ProductStatus | ''>('');
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
            const matchesStatus = !selectedStatus || product.status === selectedStatus;

            return matchesSearch && matchesCategory && matchesStatus;
        });
    }, [products, searchTerm, selectedCategory, selectedStatus]);

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

    const handleDelete = async (productId: string) => {
        if (confirm(t('ecommerce.confirmDeleteProduct', '¿Estás seguro de eliminar este producto?'))) {
            await deleteProduct(productId);
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
                    <p className="text-muted-foreground">
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
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg transition-colors hover:bg-primary/90"
                >
                    <Plus size={20} />
                    {t('ecommerce.addProduct', 'Agregar Producto')}
                </button>
            </div>

            {/* Filters Bar */}
            <div className="bg-card/50 rounded-xl p-4 border border-border">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="flex items-center gap-2 flex-1 bg-editor-border/40 rounded-lg px-3 py-2">
                        <Search className="w-4 h-4 text-editor-text-secondary flex-shrink-0" />
                        <input
                            type="text"
                            placeholder={t('ecommerce.searchProducts', 'Buscar productos...')}
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

                    {/* Category Filter */}
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                        <option value="">{t('ecommerce.allCategories', 'Todas las categorías')}</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        ))}
                    </select>

                    {/* Status Filter */}
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value as ProductStatus | '')}
                        className="px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                        <option value="">{t('ecommerce.allStatuses', 'Todos los estados')}</option>
                        <option value="active">{t('ecommerce.active', 'Activo')}</option>
                        <option value="draft">{t('ecommerce.draft', 'Borrador')}</option>
                        <option value="archived">{t('ecommerce.archived', 'Archivado')}</option>
                    </select>

                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded transition-colors ${
                                viewMode === 'grid'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Grid size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded transition-colors ${
                                viewMode === 'list'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <List size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Products Grid/List */}
            {filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                    <Package className="mx-auto text-muted-foreground mb-4" size={48} />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        {t('ecommerce.noProducts', 'No hay productos')}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                        {searchTerm || selectedCategory || selectedStatus
                            ? t('ecommerce.noProductsFilter', 'No se encontraron productos con los filtros aplicados')
                            : t('ecommerce.noProductsYet', 'Aún no has agregado ningún producto')}
                    </p>
                    {!searchTerm && !selectedCategory && !selectedStatus && (
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
                <div className="bg-card/50 rounded-xl border border-border overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-muted/30">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                    {t('ecommerce.product', 'Producto')}
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">
                                    {t('ecommerce.category', 'Categoría')}
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                    {t('ecommerce.price', 'Precio')}
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden sm:table-cell">
                                    {t('ecommerce.stock', 'Stock')}
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden lg:table-cell">
                                    {t('ecommerce.status', 'Estado')}
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
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
                                                    <ImageIcon className="text-muted-foreground" size={20} />
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-foreground font-medium">{product.name}</p>
                                                {product.sku && (
                                                    <p className="text-muted-foreground text-sm">SKU: {product.sku}</p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                                        {getCategoryName(product.categoryId)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-foreground font-medium">
                                            ${product.price.toFixed(2)}
                                        </p>
                                        {product.compareAtPrice && (
                                            <p className="text-muted-foreground text-sm line-through">
                                                ${product.compareAtPrice.toFixed(2)}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 hidden sm:table-cell">
                                        {product.trackInventory ? (
                                            <span
                                                className={`${
                                                    product.quantity <= (product.lowStockThreshold || 5)
                                                        ? 'text-orange-400'
                                                        : 'text-muted-foreground'
                                                }`}
                                            >
                                                {product.quantity}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">∞</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 hidden lg:table-cell">
                                        <span
                                            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                                product.status === 'active'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : product.status === 'draft'
                                                    ? 'bg-yellow-500/20 text-yellow-400'
                                                    : 'bg-muted text-muted-foreground'
                                            }`}
                                        >
                                            {product.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(product)}
                                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="p-2 text-muted-foreground hover:text-destructive hover:bg-muted rounded-lg transition-colors"
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
            )}

            {/* Product Form Modal */}
            {showForm && (
                <ProductForm
                    product={editingProduct}
                    onClose={handleFormClose}
                    onSuccess={handleFormClose}
                />
            )}
        </div>
    );
};

export default ProductsView;
