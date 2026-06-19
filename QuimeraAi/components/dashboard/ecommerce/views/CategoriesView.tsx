/**
 * CategoriesView
 * Vista de gestión de categorías
 * Usa clases de Tailwind del tema (bg-primary, text-primary, etc.)
 */

import React, { useState } from 'react';
import ConfirmationModal from '../../../ui/ConfirmationModal';
import { useTranslation } from 'react-i18next';
import {
    Plus,
    Edit,
    Trash2,
    FolderTree,
    GripVertical,
    Loader2,
    Image as ImageIcon,
    FolderOpen,
    Sparkles,
    Link,
} from 'lucide-react';
import { useAuth } from '../../../../contexts/core/AuthContext';
import { useCategories } from '../hooks/useCategories';
import { useProducts } from '../hooks/useProducts';
import { Category } from '../../../../types/ecommerce';
import { useEcommerceContext } from '../EcommerceDashboard';
import EcommerceImagePicker from '../components/EcommerceImagePicker';
import MediaGeneratorModal from '../../../media-generator/MediaGeneratorModal';

const CategoriesView: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { storeId } = useEcommerceContext();
    const { categories, isLoading, addCategory, updateCategory, deleteCategory } = useCategories(user?.id || '', storeId);
    const { products } = useProducts(user?.id || '', storeId);

    const [showForm, setShowForm] = useState(false);
    const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
    const [isImageGeneratorOpen, setIsImageGeneratorOpen] = useState(false);
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

    const handleCategoryImageSelect = (url: string) => {
        setFormData((prev) => ({ ...prev, imageUrl: url }));
        setIsImagePickerOpen(false);
        setIsImageGeneratorOpen(false);
    };

    const handleRemoveCategoryImage = () => {
        setFormData((prev) => ({ ...prev, imageUrl: '' }));
    };

    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const handleDelete = (categoryId: string) => {
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
        setDeleteConfirmId(categoryId);
    };

    const confirmDeleteCategory = async () => {
        if (deleteConfirmId) {
            await deleteCategory(deleteConfirmId);
            setDeleteConfirmId(null);
        }
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setIsImagePickerOpen(false);
        setIsImageGeneratorOpen(false);
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
                    <p className="text-q-text-muted">
                        {categories.length} {t('ecommerce.categoriesTotal', 'categorías en total')}
                    </p>
                </div>

                <button
                    onClick={() => setShowForm(true)}
                    className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg transition-colors hover:bg-primary/90 sm:w-auto"
                >
                    <Plus size={20} />
                    {t('ecommerce.addCategory', 'Agregar Categoría')}
                </button>
            </div>

            {/* Categories List */}
            {categories.length === 0 ? (
                <div className="text-center py-12 bg-q-surface/50 rounded-xl border border-q-border">
                    <FolderTree className="mx-auto text-q-text-muted mb-4" size={48} />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        {t('ecommerce.noCategories', 'No hay categorías')}
                    </h3>
                    <p className="text-q-text-muted mb-4">
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
                <div className="bg-q-surface/50 rounded-xl border border-q-border overflow-hidden">
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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-q-surface rounded-xl border border-q-border w-full max-w-md max-h-[92vh] overflow-y-auto">
                        <div className="p-4 border-b border-q-border sm:p-6">
                            <h3 className="text-lg font-bold text-foreground">
                                {editingCategory
                                    ? t('ecommerce.editCategory', 'Editar Categoría')
                                    : t('ecommerce.addCategory', 'Agregar Categoría')}
                            </h3>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 space-y-4 sm:p-6">
                            <div>
                                <label className="block text-sm font-medium text-q-text-muted mb-1">
                                    {t('ecommerce.categoryName', 'Nombre')} *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-q-text-muted mb-1">
                                    {t('ecommerce.description', 'Descripción')}
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-q-text-muted mb-1">
                                    {t('ecommerce.categoryImage', 'Imagen de categoría')}
                                </label>
                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <div className="h-28 w-full overflow-hidden rounded-lg border border-q-border bg-muted/40 sm:h-24 sm:w-28 sm:flex-shrink-0">
                                        {formData.imageUrl ? (
                                            <img
                                                src={formData.imageUrl}
                                                alt={formData.name || t('ecommerce.categoryImage', 'Imagen de categoría')}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center">
                                                <ImageIcon className="text-q-text-muted" size={28} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1 space-y-2">
                                        <div className="relative">
                                            <Link className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-q-text-muted" size={16} />
                                            <input
                                                type="url"
                                                value={formData.imageUrl}
                                                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                                placeholder={t('ecommerce.pasteImageUrl', 'Pegar URL de imagen')}
                                                className="w-full min-w-0 rounded-lg border border-q-border bg-muted/50 py-2 pl-9 pr-4 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                            <button
                                                type="button"
                                                onClick={() => setIsImagePickerOpen(true)}
                                                className="inline-flex min-w-0 items-center justify-center gap-2 rounded-lg border border-q-border bg-muted/40 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                                            >
                                                <FolderOpen size={16} />
                                                <span className="truncate">{t('ecommerce.library', 'Librería')}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIsImageGeneratorOpen(true)}
                                                className="inline-flex min-w-0 items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
                                            >
                                                <Sparkles size={16} />
                                                <span className="truncate">{t('ecommerce.generate', 'Generar')}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleRemoveCategoryImage}
                                                disabled={!formData.imageUrl}
                                                className="inline-flex min-w-0 items-center justify-center gap-2 rounded-lg border border-q-border bg-muted/20 px-3 py-2 text-sm font-medium text-q-text-muted transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <Trash2 size={16} />
                                                <span className="truncate">{t('common.remove', 'Quitar')}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-q-text-muted mb-1">
                                    {t('ecommerce.parentCategory', 'Categoría Padre')}
                                </label>
                                <select
                                    value={formData.parentId}
                                    onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                                    className="w-full px-4 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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

            <EcommerceImagePicker
                isOpen={isImagePickerOpen}
                onClose={() => setIsImagePickerOpen(false)}
                onSelect={handleCategoryImageSelect}
                currentImages={formData.imageUrl ? [formData.imageUrl] : []}
                multiple={false}
            />

            <MediaGeneratorModal
                isOpen={isImageGeneratorOpen}
                onClose={() => setIsImageGeneratorOpen(false)}
                destination="user"
                projectId={storeId}
                allowedModes={['image']}
                defaultMode="image"
                generationContext="general"
                onUseImage={handleCategoryImageSelect}
            />

            {/* Delete Category Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!deleteConfirmId}
                onConfirm={confirmDeleteCategory}
                onCancel={() => setDeleteConfirmId(null)}
                title={t('ecommerce.deleteCategory', 'Eliminar Categoría')}
                message={t('ecommerce.confirmDeleteCategory', '¿Estás seguro de eliminar esta categoría?')}
                variant="danger"
            />
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
            <div className="flex items-start gap-3 p-4 hover:bg-muted/20 sm:items-center sm:gap-4">
                <div className="hidden text-q-text-muted cursor-grab sm:block">
                    <GripVertical size={20} />
                </div>

                {category.imageUrl ? (
                    <img
                        src={category.imageUrl}
                        alt={category.name}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex flex-shrink-0 items-center justify-center">
                        <FolderTree className="text-q-text-muted" size={24} />
                    </div>
                )}

                <div className="min-w-0 flex-1">
                    <h4 className="truncate text-foreground font-medium">{category.name}</h4>
                    {category.description && (
                        <p className="text-q-text-muted text-sm line-clamp-1">{category.description}</p>
                    )}
                    <p className="text-xs text-q-text-muted sm:hidden">
                        {productCount} {t('ecommerce.products', 'productos')}
                    </p>
                </div>

                <div className="hidden text-q-text-muted text-sm sm:block">
                    {productCount} {t('ecommerce.products', 'productos')}
                </div>

                <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
                    <button
                        onClick={() => onEdit(category)}
                        className="p-2 text-q-text-muted hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                        <Edit size={18} />
                    </button>
                    <button
                        onClick={() => onDelete(category.id)}
                        className="p-2 text-q-text-muted hover:text-destructive hover:bg-muted rounded-lg transition-colors"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            {/* Subcategories */}
            {subcategories.map((sub) => (
                <div key={sub.id} className="ml-3 flex items-start gap-3 border-l-2 border-q-border p-4 pl-4 hover:bg-muted/20 sm:ml-6 sm:items-center sm:gap-4 sm:pl-12">
                    <div className="hidden text-q-text-muted cursor-grab sm:block">
                        <GripVertical size={20} />
                    </div>

                    {sub.imageUrl ? (
                        <img
                            src={sub.imageUrl}
                            alt={sub.name}
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex flex-shrink-0 items-center justify-center">
                            <FolderTree className="text-q-text-muted" size={20} />
                        </div>
                    )}

                    <div className="min-w-0 flex-1">
                        <h4 className="truncate text-foreground font-medium">{sub.name}</h4>
                        <p className="text-xs text-q-text-muted sm:hidden">
                            {getProductCount(sub.id)} {t('ecommerce.products', 'productos')}
                        </p>
                    </div>

                    <div className="hidden text-q-text-muted text-sm sm:block">
                        {getProductCount(sub.id)} {t('ecommerce.products', 'productos')}
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
                        <button
                            onClick={() => onEdit(sub)}
                            className="p-2 text-q-text-muted hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                            <Edit size={18} />
                        </button>
                        <button
                            onClick={() => onDelete(sub.id)}
                            className="p-2 text-q-text-muted hover:text-destructive hover:bg-muted rounded-lg transition-colors"
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
