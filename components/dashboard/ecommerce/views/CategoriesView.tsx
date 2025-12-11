/**
 * CategoriesView
 * Vista de gestión de categorías
 * Usa clases de Tailwind del tema (bg-primary, text-primary, etc.)
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Plus,
    Edit,
    Trash2,
    FolderTree,
    GripVertical,
    Loader2,
} from 'lucide-react';
import { useAuth } from '../../../../contexts/core/AuthContext';
import { useCategories } from '../hooks/useCategories';
import { useProducts } from '../hooks/useProducts';
import { Category } from '../../../../types/ecommerce';
import { useEcommerceContext } from '../EcommerceDashboard';

const CategoriesView: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { storeId } = useEcommerceContext();
    const { categories, isLoading, addCategory, updateCategory, deleteCategory } = useCategories(user?.uid || '', storeId);
    const { products } = useProducts(user?.uid || '', storeId);

    const [showForm, setShowForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        imageUrl: '',
        parentId: '',
    });

    const getProductCount = (categoryId: string) => {
        return products.filter((p) => p.categoryId === categoryId).length;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (editingCategory) {
            await updateCategory(editingCategory.id, {
                name: formData.name,
                description: formData.description,
                imageUrl: formData.imageUrl,
                parentId: formData.parentId || undefined,
            });
        } else {
            await addCategory({
                name: formData.name,
                description: formData.description,
                imageUrl: formData.imageUrl,
                parentId: formData.parentId || undefined,
            });
        }

        handleCloseForm();
    };

    const handleEdit = (category: Category) => {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            description: category.description || '',
            imageUrl: category.imageUrl || '',
            parentId: category.parentId || '',
        });
        setShowForm(true);
    };

    const handleDelete = async (categoryId: string) => {
        const productCount = getProductCount(categoryId);
        if (productCount > 0) {
            alert(
                t(
                    'ecommerce.categoryHasProducts',
                    `Esta categoría tiene ${productCount} productos. Mueve los productos a otra categoría antes de eliminar.`
                )
            );
            return;
        }

        if (confirm(t('ecommerce.confirmDeleteCategory', '¿Estás seguro de eliminar esta categoría?'))) {
            await deleteCategory(categoryId);
        }
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setEditingCategory(null);
        setFormData({ name: '', description: '', imageUrl: '', parentId: '' });
    };

    const rootCategories = categories.filter((c) => !c.parentId);
    const getSubcategories = (parentId: string) => categories.filter((c) => c.parentId === parentId);

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
                        {t('ecommerce.categories', 'Categorías')}
                    </h2>
                    <p className="text-muted-foreground">
                        {categories.length} {t('ecommerce.categoriesTotal', 'categorías en total')}
                    </p>
                </div>

                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg transition-colors hover:bg-primary/90"
                >
                    <Plus size={20} />
                    {t('ecommerce.addCategory', 'Agregar Categoría')}
                </button>
            </div>

            {/* Categories List */}
            {categories.length === 0 ? (
                <div className="text-center py-12 bg-card/50 rounded-xl border border-border">
                    <FolderTree className="mx-auto text-muted-foreground mb-4" size={48} />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        {t('ecommerce.noCategories', 'No hay categorías')}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                        {t('ecommerce.noCategoriesYet', 'Crea categorías para organizar tus productos')}
                    </p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg transition-colors hover:bg-primary/90"
                    >
                        <Plus size={20} />
                        {t('ecommerce.addFirstCategory', 'Crear primera categoría')}
                    </button>
                </div>
            ) : (
                <div className="bg-card/50 rounded-xl border border-border overflow-hidden">
                    <div className="divide-y divide-border">
                        {rootCategories.map((category) => (
                            <CategoryRow
                                key={category.id}
                                category={category}
                                subcategories={getSubcategories(category.id)}
                                productCount={getProductCount(category.id)}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                getProductCount={getProductCount}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Category Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-xl border border-border w-full max-w-md">
                        <div className="p-6 border-b border-border">
                            <h3 className="text-lg font-bold text-foreground">
                                {editingCategory
                                    ? t('ecommerce.editCategory', 'Editar Categoría')
                                    : t('ecommerce.addCategory', 'Agregar Categoría')}
                            </h3>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    {t('ecommerce.categoryName', 'Nombre')} *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    {t('ecommerce.description', 'Descripción')}
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    {t('ecommerce.imageUrl', 'URL de Imagen')}
                                </label>
                                <input
                                    type="url"
                                    value={formData.imageUrl}
                                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    {t('ecommerce.parentCategory', 'Categoría Padre')}
                                </label>
                                <select
                                    value={formData.parentId}
                                    onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <option value="">{t('ecommerce.noParent', 'Ninguna (categoría raíz)')}</option>
                                    {rootCategories
                                        .filter((c) => c.id !== editingCategory?.id)
                                        .map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                </select>
                            </div>

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
                                    {editingCategory ? t('common.save', 'Guardar') : t('common.create', 'Crear')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// Category Row Component
interface CategoryRowProps {
    category: Category;
    subcategories: Category[];
    productCount: number;
    onEdit: (category: Category) => void;
    onDelete: (categoryId: string) => void;
    getProductCount: (categoryId: string) => number;
}

const CategoryRow: React.FC<CategoryRowProps> = ({
    category,
    subcategories,
    productCount,
    onEdit,
    onDelete,
    getProductCount,
}) => {
    const { t } = useTranslation();

    return (
        <>
            <div className="flex items-center gap-4 p-4 hover:bg-muted/20">
                <div className="text-muted-foreground cursor-grab">
                    <GripVertical size={20} />
                </div>

                {category.imageUrl ? (
                    <img
                        src={category.imageUrl}
                        alt={category.name}
                        className="w-12 h-12 rounded-lg object-cover"
                    />
                ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        <FolderTree className="text-muted-foreground" size={24} />
                    </div>
                )}

                <div className="flex-1">
                    <h4 className="text-foreground font-medium">{category.name}</h4>
                    {category.description && (
                        <p className="text-muted-foreground text-sm line-clamp-1">{category.description}</p>
                    )}
                </div>

                <div className="text-muted-foreground text-sm">
                    {productCount} {t('ecommerce.products', 'productos')}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onEdit(category)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                        <Edit size={18} />
                    </button>
                    <button
                        onClick={() => onDelete(category.id)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-muted rounded-lg transition-colors"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            {/* Subcategories */}
            {subcategories.map((sub) => (
                <div key={sub.id} className="flex items-center gap-4 p-4 pl-12 hover:bg-muted/20 border-l-2 border-border ml-6">
                    <div className="text-muted-foreground cursor-grab">
                        <GripVertical size={20} />
                    </div>

                    {sub.imageUrl ? (
                        <img
                            src={sub.imageUrl}
                            alt={sub.name}
                            className="w-10 h-10 rounded-lg object-cover"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <FolderTree className="text-muted-foreground" size={20} />
                        </div>
                    )}

                    <div className="flex-1">
                        <h4 className="text-foreground font-medium">{sub.name}</h4>
                    </div>

                    <div className="text-muted-foreground text-sm">
                        {getProductCount(sub.id)} {t('ecommerce.products', 'productos')}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onEdit(sub)}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                            <Edit size={18} />
                        </button>
                        <button
                            onClick={() => onDelete(sub.id)}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-muted rounded-lg transition-colors"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            ))}
        </>
    );
};

export default CategoriesView;
