/**
 * CategoriesView
 * Vista de gestión de categorías
 * Usa clases de Tailwind del tema (bg-primary, text-primary, etc.)
 */

import React, { useCallback, useMemo, useState } from 'react';
import ConfirmationModal from '../../../ui/ConfirmationModal';
import { useTranslation } from 'react-i18next';
import {
    DndContext,
    closestCenter,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
    Package,
    Layers3,
} from 'lucide-react';
import { useAuth } from '../../../../contexts/core/AuthContext';
import { useCategories } from '../hooks/useCategories';
import { useProducts } from '../hooks/useProducts';
import { Category } from '../../../../types/ecommerce';
import { useEcommerceContext } from '../EcommerceContext';
import EcommerceImagePicker from '../components/EcommerceImagePicker';
import MediaGeneratorModal from '../../../media-generator/MediaGeneratorModal';
import AppSelect from '../../../ui/AppSelect';
import { MotionCard } from '../../../ui/primitives/Card';

const CategoriesView: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { storeId } = useEcommerceContext();
    const { categories, isLoading, addCategory, updateCategory, deleteCategory, reorderCategories } = useCategories(user?.id || '', storeId);
    const { products } = useProducts(user?.id || '', storeId);

    const [showForm, setShowForm] = useState(false);
    const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
    const [isImageGeneratorOpen, setIsImageGeneratorOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isReordering, setIsReordering] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        imageUrl: '',
        parentId: '',
    });

    const productCountByCategory = useMemo(() => {
        const countMap = new Map<string, number>();
        products.forEach((product) => {
            if (!product.categoryId) return;
            countMap.set(product.categoryId, (countMap.get(product.categoryId) || 0) + 1);
        });
        return countMap;
    }, [products]);

    const getProductCount = useCallback((categoryId: string) => {
        return productCountByCategory.get(categoryId) || 0;
    }, [productCountByCategory]);

    const rootCategories = useMemo(() => categories.filter((c) => !c.parentId), [categories]);
    const getSubcategories = useCallback((parentId: string) => categories.filter((c) => c.parentId === parentId), [categories]);

    const categoryStats = useMemo(() => {
        const subcategoryCount = categories.length - rootCategories.length;
        const assignedProducts = products.filter((product) => Boolean(product.categoryId)).length;
        const emptyCategories = categories.filter((category) => getProductCount(category.id) === 0).length;

        return [
            {
                label: t('ecommerce.categoriesTotalLabel', 'Total'),
                value: categories.length,
                helper: `${rootCategories.length} ${t('ecommerce.rootCategoriesLower', 'raíz')}`,
                icon: FolderTree,
                iconClassName: 'quimera-dashboard-header-icon',
            },
            {
                label: t('ecommerce.rootCategories', 'Raíz'),
                value: rootCategories.length,
                helper: `${subcategoryCount} ${t('ecommerce.subcategoriesLower', 'subcategorías')}`,
                icon: Layers3,
                iconClassName: 'text-primary',
            },
            {
                label: t('ecommerce.assignedProducts', 'Productos asignados'),
                value: assignedProducts,
                helper: `${Math.max(products.length - assignedProducts, 0)} ${t('ecommerce.uncategorizedLower', 'sin categoría')}`,
                icon: Package,
                iconClassName: 'text-q-success',
            },
            {
                label: t('ecommerce.emptyCategories', 'Vacías'),
                value: emptyCategories,
                helper: t('ecommerce.emptyCategoriesHint', 'Sin productos asociados'),
                icon: FolderOpen,
                iconClassName: emptyCategories > 0 ? 'text-q-warning' : 'text-q-success',
            },
        ];
    }, [categories, getProductCount, products, rootCategories, t]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setIsSubmitting(true);

        try {
            const trimmedName = formData.name.trim();
            const payload = {
                name: trimmedName,
                description: formData.description,
                imageUrl: formData.imageUrl.trim(),
            };

            if (editingCategory) {
                await updateCategory(editingCategory.id, {
                    ...payload,
                    parentId: formData.parentId || null,
                });
            } else {
                await addCategory({
                    ...payload,
                    parentId: formData.parentId || undefined,
                });
            }

            handleCloseForm();
        } catch (error) {
            console.error('Error saving category:', error);
            const message = error instanceof Error
                ? error.message
                : t('ecommerce.categorySaveError', 'No se pudo guardar la categoría.');
            setFormError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (category: Category) => {
        setFormError(null);
        setEditingCategory(category);
        setFormData({
            name: category.name,
            description: category.description || '',
            imageUrl: category.imageUrl || '',
            parentId: category.parentId || '',
        });
        setShowForm(true);
    };

    const handleCategoryDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) return;

        const activeId = String(active.id);
        const overId = String(over.id);
        const activeCategory = categories.find((category) => category.id === activeId);
        const overCategory = categories.find((category) => category.id === overId);

        if (!activeCategory || !overCategory) return;

        const activeParentId = activeCategory.parentId || '';
        const overParentId = overCategory.parentId || '';
        if (activeParentId !== overParentId) return;

        const siblings = categories.filter((category) => (category.parentId || '') === activeParentId);
        const oldIndex = siblings.findIndex((category) => category.id === activeId);
        const newIndex = siblings.findIndex((category) => category.id === overId);

        if (oldIndex === -1 || newIndex === -1) return;

        const reorderedIds = arrayMove(
            siblings.map((category) => category.id),
            oldIndex,
            newIndex
        );

        setIsReordering(true);
        try {
            await reorderCategories(reorderedIds);
        } catch (error) {
            console.error('Error reordering categories:', error);
            alert(
                error instanceof Error
                    ? error.message
                    : t('ecommerce.categoryReorderError', 'No se pudo actualizar el orden de las categorías.')
            );
        } finally {
            setIsReordering(false);
        }
    }, [categories, reorderCategories, t]);

    const handleCategoryImageSelect = (url: string) => {
        setFormData((prev) => ({ ...prev, imageUrl: url }));
        setIsImagePickerOpen(false);
        setIsImageGeneratorOpen(false);
    };

    const handleRemoveCategoryImage = () => {
        setFormData((prev) => ({ ...prev, imageUrl: '' }));
    };

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
        setFormError(null);
        setEditingCategory(null);
        setFormData({ name: '', description: '', imageUrl: '', parentId: '' });
    };

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
                        <FolderTree size={14} />
                        {t('ecommerce.categoryManager', 'Arquitectura de catálogo')}
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">
                        {t('ecommerce.categories', 'Categorías')}
                    </h2>
                    <p className="max-w-2xl text-q-text-muted">
                        {t('ecommerce.manageCategoriesPro', 'Organiza colecciones, subcategorías e imágenes para que la tienda sea fácil de explorar.')}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
                >
                    <Plus size={20} />
                    {t('ecommerce.addCategory', 'Agregar Categoría')}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {categoryStats.map((stat, index) => {
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

            {/* Categories List */}
            {categories.length === 0 ? (
                <div className="rounded-xl border border-dashed border-q-border bg-q-surface/40 px-6 py-12 text-center">
                    <FolderTree className="mx-auto mb-4 text-q-text-muted" size={48} />
                    <h3 className="mb-2 text-lg font-semibold text-foreground">
                        {t('ecommerce.noCategories', 'No hay categorías')}
                    </h3>
                    <p className="mx-auto mb-5 max-w-md text-q-text-muted">
                        {t('ecommerce.noCategoriesYet', 'Crea categorías para organizar tus productos')}
                    </p>
                    <button
                        type="button"
                        onClick={() => setShowForm(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                        <Plus size={20} />
                        {t('ecommerce.addFirstCategory', 'Crear primera categoría')}
                    </button>
                </div>
            ) : (
                <div className={`overflow-hidden rounded-xl border border-q-border bg-q-surface/50 transition-opacity ${isReordering ? 'opacity-80' : ''}`}>
                    <div className="flex flex-col gap-2 border-b border-q-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-foreground">
                                {t('ecommerce.categoryTree', 'Árbol de categorías')}
                            </h3>
                            <p className="text-sm text-q-text-muted">
                                {t('ecommerce.dragCategoriesHint', 'Arrastra categorías dentro de su mismo nivel para reordenarlas.')}
                            </p>
                        </div>
                        {isReordering && (
                            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                                <Loader2 className="animate-spin" size={14} />
                                {t('ecommerce.savingOrder', 'Guardando orden')}
                            </span>
                        )}
                    </div>
                    <DndContext
                        collisionDetection={closestCenter}
                        onDragEnd={handleCategoryDragEnd}
                    >
                        <SortableContext items={rootCategories.map((category) => category.id)} strategy={verticalListSortingStrategy}>
                            <div className="divide-y divide-border">
                                {rootCategories.map((category) => (
                                    <SortableCategoryGroup
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
                        </SortableContext>
                    </DndContext>
                </div>
            )}

            {/* Category Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-q-text/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
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
                                <AppSelect
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
                                </AppSelect>
                            </div>

                            {formError && (
                                <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                    {formError}
                                </p>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseForm}
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
                                >
                                    {t('common.cancel', 'Cancelar')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !formData.name.trim()}
                                    className="flex flex-1 items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSubmitting && <Loader2 className="animate-spin" size={16} />}
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

type SortableAttributes = ReturnType<typeof useSortable>['attributes'];
type SortableListeners = ReturnType<typeof useSortable>['listeners'];

interface SortableCategoryGroupProps {
    category: Category;
    subcategories: Category[];
    productCount: number;
    onEdit: (category: Category) => void;
    onDelete: (categoryId: string) => void;
    getProductCount: (categoryId: string) => number;
}

const SortableCategoryGroup: React.FC<SortableCategoryGroupProps> = ({
    category,
    subcategories,
    productCount,
    onEdit,
    onDelete,
    getProductCount,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: category.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 30 : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={isDragging ? 'relative bg-q-surface shadow-lg' : undefined}
        >
            <CategoryItemRow
                category={category}
                productCount={productCount}
                onEdit={onEdit}
                onDelete={onDelete}
                dragAttributes={attributes}
                dragListeners={listeners}
                isDragging={isDragging}
            />

            {subcategories.length > 0 && (
                <SortableContext items={subcategories.map((sub) => sub.id)} strategy={verticalListSortingStrategy}>
                    {subcategories.map((sub) => (
                        <SortableSubcategoryRow
                            key={sub.id}
                            category={sub}
                            productCount={getProductCount(sub.id)}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </SortableContext>
            )}
        </div>
    );
};

interface SortableSubcategoryRowProps {
    category: Category;
    productCount: number;
    onEdit: (category: Category) => void;
    onDelete: (categoryId: string) => void;
}

const SortableSubcategoryRow: React.FC<SortableSubcategoryRowProps> = ({
    category,
    productCount,
    onEdit,
    onDelete,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: category.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 30 : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={isDragging ? 'relative bg-q-surface shadow-lg' : undefined}
        >
            <CategoryItemRow
                category={category}
                productCount={productCount}
                onEdit={onEdit}
                onDelete={onDelete}
                dragAttributes={attributes}
                dragListeners={listeners}
                isDragging={isDragging}
                isSubcategory
            />
        </div>
    );
};

interface CategoryItemRowProps {
    category: Category;
    productCount: number;
    onEdit: (category: Category) => void;
    onDelete: (categoryId: string) => void;
    dragAttributes: SortableAttributes;
    dragListeners: SortableListeners;
    isDragging: boolean;
    isSubcategory?: boolean;
}

const CategoryItemRow: React.FC<CategoryItemRowProps> = ({
    category,
    productCount,
    onEdit,
    onDelete,
    dragAttributes,
    dragListeners,
    isDragging,
    isSubcategory = false,
}) => {
    const { t } = useTranslation();
    const reorderLabel = t('ecommerce.reorderCategory', 'Reordenar categoría');
    const imageClassName = isSubcategory
        ? 'w-10 h-10 rounded-lg object-cover flex-shrink-0'
        : 'w-12 h-12 rounded-lg object-cover flex-shrink-0';
    const placeholderClassName = isSubcategory
        ? 'w-10 h-10 rounded-lg bg-muted flex flex-shrink-0 items-center justify-center'
        : 'w-12 h-12 rounded-lg bg-muted flex flex-shrink-0 items-center justify-center';
    const productsLabel = `${productCount} ${t('ecommerce.products', 'productos')}`;

    return (
        <div
            className={[
                isSubcategory
                    ? 'ml-3 flex items-start gap-3 border-l-2 border-q-border p-4 pl-4 sm:ml-6 sm:items-center sm:gap-4 sm:pl-12'
                    : 'flex items-start gap-3 p-4 sm:items-center sm:gap-4',
                isDragging ? 'bg-muted/30 shadow-lg' : 'transition-colors hover:bg-muted/20',
            ].join(' ')}
        >
            <button
                type="button"
                {...dragAttributes}
                {...(dragListeners ?? {})}
                aria-label={reorderLabel}
                title={reorderLabel}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-q-text-muted transition-colors hover:bg-muted hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
            >
                <GripVertical size={20} />
            </button>

            {category.imageUrl ? (
                <img
                    src={category.imageUrl}
                    alt={category.name}
                    className={imageClassName}
                />
            ) : (
                <div className={placeholderClassName}>
                    <FolderTree className="text-q-text-muted" size={isSubcategory ? 20 : 24} />
                </div>
            )}

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate font-semibold text-foreground">{category.name}</h4>
                    <span className="rounded-full border border-q-border bg-muted/30 px-2 py-0.5 text-xs font-medium text-q-text-muted">
                        {isSubcategory ? t('ecommerce.subcategory', 'Subcategoría') : t('ecommerce.rootCategory', 'Raíz')}
                    </span>
                </div>
                {category.description && !isSubcategory && (
                    <p className="mt-1 line-clamp-1 text-sm text-q-text-muted">{category.description}</p>
                )}
                <p className="mt-1 text-xs text-q-text-muted sm:hidden">
                    {productsLabel}
                </p>
            </div>

            <div className="hidden sm:block">
                <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                    productCount > 0
                        ? 'border-q-success/20 bg-q-success/10 text-q-success'
                        : 'border-q-border bg-muted/40 text-q-text-muted'
                }`}>
                    {productsLabel}
                </span>
            </div>

            <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
                <button
                    type="button"
                    onClick={() => onEdit(category)}
                    title={t('ecommerce.editCategory', 'Editar Categoría')}
                    aria-label={t('ecommerce.editCategory', 'Editar Categoría')}
                    className="grid h-9 w-9 place-items-center rounded-lg text-q-text-muted transition-colors hover:bg-muted hover:text-foreground"
                >
                    <Edit size={18} />
                </button>
                <button
                    type="button"
                    onClick={() => onDelete(category.id)}
                    title={t('ecommerce.deleteCategory', 'Eliminar Categoría')}
                    aria-label={t('ecommerce.deleteCategory', 'Eliminar Categoría')}
                    className="grid h-9 w-9 place-items-center rounded-lg text-q-text-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
};

export default CategoriesView;
