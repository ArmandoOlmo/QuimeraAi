/**
 * ProductForm
 * Formulario para crear/editar productos
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    X,
    Upload,
    Trash2,
    Plus,
    Loader2,
    Image as ImageIcon,
    GripVertical,
    Sparkles,
    FolderOpen,
} from 'lucide-react';
import { useAuth } from '../../../../contexts/core/AuthContext';
import { useProducts } from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';
import { useProductAI } from '../hooks/useProductAI';
import { Product, ProductStatus, ProductImage } from '../../../../types/ecommerce';
import { useEcommerceTheme, withOpacity } from '../hooks/useEcommerceTheme';
import { useEcommerceContext } from '../EcommerceDashboard';
import AIAssistButton from '../../../onboarding/components/AIAssistButton';
import EcommerceImagePicker from './EcommerceImagePicker';

interface ProductFormProps {
    product?: Product | null;
    onClose: () => void;
    onSuccess: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ product, onClose, onSuccess }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { storeId } = useEcommerceContext();
    const theme = useEcommerceTheme();
    const { addProduct, updateProduct, uploadImage, deleteImage, isLoading } = useProducts(user?.uid || '', storeId);
    const { categories } = useCategories(user?.uid || '', storeId);
    
    // AI Generation Hook
    const {
        generateDescription,
        generateSEO,
        generateTags,
        generateAll,
        isGeneratingDescription,
        isGeneratingSEO,
        isGeneratingTags,
        isGeneratingAll,
        error: aiError,
    } = useProductAI(user?.uid, storeId);

    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: 0,
        compareAtPrice: 0,
        cost: 0,
        sku: '',
        barcode: '',
        categoryId: '',
        status: 'draft' as ProductStatus,
        trackInventory: true,
        quantity: 0,
        lowStockThreshold: 5,
        weight: 0,
        tags: [] as string[],
        metaTitle: '',
        metaDescription: '',
    });
    const [images, setImages] = useState<ProductImage[]>([]);
    const [newImages, setNewImages] = useState<File[]>([]);
    const [libraryImages, setLibraryImages] = useState<string[]>([]); // URLs de imágenes seleccionadas de la biblioteca
    const [tagInput, setTagInput] = useState('');
    const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name,
                description: product.description || '',
                price: product.price,
                compareAtPrice: product.compareAtPrice || 0,
                cost: product.cost || 0,
                sku: product.sku || '',
                barcode: product.barcode || '',
                categoryId: product.categoryId || '',
                status: product.status,
                trackInventory: product.trackInventory,
                quantity: product.quantity,
                lowStockThreshold: product.lowStockThreshold || 5,
                weight: product.weight || 0,
                tags: product.tags || [],
                metaTitle: product.metaTitle || '',
                metaDescription: product.metaDescription || '',
            });
            setImages(product.images || []);
        }
    }, [product]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            // Incluir URLs de imágenes de la biblioteca en el formData
            const formDataWithLibraryImages = {
                ...formData,
                libraryImageUrls: libraryImages, // URLs de imágenes seleccionadas de la biblioteca
            };
            
            if (product) {
                await updateProduct(product.id, formDataWithLibraryImages, newImages);
            } else {
                await addProduct(formDataWithLibraryImages, newImages);
            }
            onSuccess();
        } catch (error) {
            console.error('Error saving product:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            setNewImages((prev) => [...prev, ...Array.from(files)]);
        }
    };

    const handleRemoveNewImage = (index: number) => {
        setNewImages((prev) => prev.filter((_, i) => i !== index));
    };

    const handleRemoveLibraryImage = (url: string) => {
        setLibraryImages((prev) => prev.filter((u) => u !== url));
    };

    const handleSelectFromLibrary = (url: string) => {
        // Evitar duplicados
        if (!libraryImages.includes(url)) {
            setLibraryImages((prev) => [...prev, url]);
        }
    };

    const handleRemoveExistingImage = async (imageId: string) => {
        if (product) {
            await deleteImage(product.id, imageId);
            setImages((prev) => prev.filter((img) => img.id !== imageId));
        }
    };

    const handleAddTag = () => {
        if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
            setFormData({
                ...formData,
                tags: [...formData.tags, tagInput.trim()],
            });
            setTagInput('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        setFormData({
            ...formData,
            tags: formData.tags.filter((t) => t !== tag),
        });
    };

    // AI Generation Handlers
    const getCategoryName = useCallback(() => {
        const category = categories.find(c => c.id === formData.categoryId);
        return category?.name || '';
    }, [categories, formData.categoryId]);

    const handleGenerateDescription = useCallback(async () => {
        if (!formData.name.trim()) return;
        
        try {
            const result = await generateDescription({
                name: formData.name,
                category: getCategoryName(),
            });
            setFormData(prev => ({
                ...prev,
                description: result.description,
            }));
        } catch (err) {
            console.error('Failed to generate description:', err);
        }
    }, [formData.name, getCategoryName, generateDescription]);

    const handleGenerateSEO = useCallback(async () => {
        if (!formData.name.trim()) return;
        
        try {
            const result = await generateSEO(formData.name, formData.description);
            setFormData(prev => ({
                ...prev,
                metaTitle: result.metaTitle,
                metaDescription: result.metaDescription,
            }));
        } catch (err) {
            console.error('Failed to generate SEO:', err);
        }
    }, [formData.name, formData.description, generateSEO]);

    const handleGenerateTags = useCallback(async () => {
        if (!formData.name.trim()) return;
        
        try {
            const result = await generateTags(formData.name, formData.description, getCategoryName());
            setFormData(prev => ({
                ...prev,
                tags: [...new Set([...prev.tags, ...result])],
            }));
        } catch (err) {
            console.error('Failed to generate tags:', err);
        }
    }, [formData.name, formData.description, getCategoryName, generateTags]);

    const handleGenerateAll = useCallback(async () => {
        if (!formData.name.trim()) return;
        
        try {
            const result = await generateAll({
                name: formData.name,
                category: getCategoryName(),
            });
            setFormData(prev => ({
                ...prev,
                description: result.description,
                metaTitle: result.metaTitle,
                metaDescription: result.metaDescription,
                tags: [...new Set([...prev.tags, ...result.tags])],
            }));
        } catch (err) {
            console.error('Failed to generate all content:', err);
        }
    }, [formData.name, getCategoryName, generateAll]);

    const isAnyGenerating = isGeneratingDescription || isGeneratingSEO || isGeneratingTags || isGeneratingAll;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4">
            <div className="bg-card rounded-xl border border-border w-full max-w-3xl my-8">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-foreground">
                            {product
                                ? t('ecommerce.editProduct', 'Editar Producto')
                                : t('ecommerce.addProduct', 'Agregar Producto')}
                        </h2>
                        {formData.name.trim() && (
                            <AIAssistButton
                                onClick={handleGenerateAll}
                                isLoading={isGeneratingAll}
                                disabled={isAnyGenerating}
                                label={t('ecommerce.generateAll', 'Generar Todo con AI')}
                                size="sm"
                                variant="primary"
                            />
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-foreground">
                                {t('ecommerce.basicInfo', 'Información Básica')}
                            </h3>

                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    {t('ecommerce.productName', 'Nombre del Producto')} *
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
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-sm font-medium text-muted-foreground">
                                        {t('ecommerce.description', 'Descripción')}
                                    </label>
                                    {formData.name.trim() && (
                                        <AIAssistButton
                                            onClick={handleGenerateDescription}
                                            isLoading={isGeneratingDescription}
                                            disabled={isAnyGenerating}
                                            label={t('ecommerce.generateWithAI', 'Generar')}
                                            size="sm"
                                            variant="ghost"
                                        />
                                    )}
                                </div>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={4}
                                    placeholder={t('ecommerce.descriptionPlaceholder', 'Escribe una descripción o genera con AI...')}
                                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    {t('ecommerce.category', 'Categoría')}
                                </label>
                                <select
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <option value="">{t('ecommerce.selectCategory', 'Seleccionar categoría')}</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Images */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium text-foreground">
                                    {t('ecommerce.images', 'Imágenes')}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setIsImagePickerOpen(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                                >
                                    <FolderOpen size={16} />
                                    {t('ecommerce.selectFromLibrary', 'Seleccionar de Biblioteca')}
                                </button>
                            </div>

                            <div className="grid grid-cols-4 gap-4">
                                {/* Existing Images */}
                                {images.map((image) => (
                                    <div key={image.id} className="relative aspect-square group">
                                        <img
                                            src={image.url}
                                            alt=""
                                            className="w-full h-full object-cover rounded-lg"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveExistingImage(image.id)}
                                            className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}

                                {/* Library Images (selected from project library) */}
                                {libraryImages.map((url, index) => (
                                    <div key={`library-${index}`} className="relative aspect-square group">
                                        <img
                                            src={url}
                                            alt=""
                                            className="w-full h-full object-cover rounded-lg ring-2 ring-primary/50"
                                        />
                                        <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded">
                                            {t('ecommerce.fromLibrary', 'Biblioteca')}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveLibraryImage(url)}
                                            className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}

                                {/* New Images Preview */}
                                {newImages.map((file, index) => (
                                    <div key={index} className="relative aspect-square group">
                                        <img
                                            src={URL.createObjectURL(file)}
                                            alt=""
                                            className="w-full h-full object-cover rounded-lg"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveNewImage(index)}
                                            className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}

                                {/* Upload Button */}
                                <label className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors hover:border-primary">
                                    <Upload className="text-muted-foreground mb-2" size={24} />
                                    <span className="text-muted-foreground text-sm">{t('ecommerce.upload', 'Subir')}</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleImageUpload}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Image Picker Modal */}
                        <EcommerceImagePicker
                            isOpen={isImagePickerOpen}
                            onClose={() => setIsImagePickerOpen(false)}
                            onSelect={handleSelectFromLibrary}
                            currentImages={[...images.map(img => img.url), ...libraryImages]}
                            multiple={true}
                        />

                        {/* Pricing */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-foreground">
                                {t('ecommerce.pricing', 'Precios')}
                            </h3>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                                        {t('ecommerce.price', 'Precio')} *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                        <input
                                            type="number"
                                            value={formData.price}
                                            onChange={(e) =>
                                                setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                                            }
                                            min="0"
                                            step="0.01"
                                            required
                                            className="w-full pl-8 pr-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                                        {t('ecommerce.compareAtPrice', 'Precio Anterior')}
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                        <input
                                            type="number"
                                            value={formData.compareAtPrice}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    compareAtPrice: parseFloat(e.target.value) || 0,
                                                })
                                            }
                                            min="0"
                                            step="0.01"
                                            className="w-full pl-8 pr-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                                        {t('ecommerce.cost', 'Costo')}
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                        <input
                                            type="number"
                                            value={formData.cost}
                                            onChange={(e) =>
                                                setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })
                                            }
                                            min="0"
                                            step="0.01"
                                            className="w-full pl-8 pr-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Inventory */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-foreground">
                                {t('ecommerce.inventory', 'Inventario')}
                            </h3>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.trackInventory}
                                    onChange={(e) =>
                                        setFormData({ ...formData, trackInventory: e.target.checked })
                                    }
                                    className="w-4 h-4 rounded border-border bg-muted text-primary focus:ring-ring"
                                />
                                <span className="text-muted-foreground">
                                    {t('ecommerce.trackInventory', 'Controlar inventario')}
                                </span>
                            </label>

                            {formData.trackInventory && (
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                                            {t('ecommerce.quantity', 'Cantidad')}
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.quantity}
                                            onChange={(e) =>
                                                setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })
                                            }
                                            min="0"
                                            className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                                            {t('ecommerce.lowStockThreshold', 'Alerta Stock Bajo')}
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.lowStockThreshold}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    lowStockThreshold: parseInt(e.target.value) || 5,
                                                })
                                            }
                                            min="0"
                                            className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                                            SKU
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.sku}
                                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                            className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Status */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-foreground">
                                {t('ecommerce.status', 'Estado')}
                            </h3>

                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="status"
                                        checked={formData.status === 'active'}
                                        onChange={() => setFormData({ ...formData, status: 'active' })}
                                        className="w-4 h-4 text-primary bg-muted border-border focus:ring-ring"
                                    />
                                    <span className="text-muted-foreground">{t('ecommerce.active', 'Activo')}</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="status"
                                        checked={formData.status === 'draft'}
                                        onChange={() => setFormData({ ...formData, status: 'draft' })}
                                        className="w-4 h-4 text-primary bg-muted border-border focus:ring-ring"
                                    />
                                    <span className="text-muted-foreground">{t('ecommerce.draft', 'Borrador')}</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="status"
                                        checked={formData.status === 'archived'}
                                        onChange={() => setFormData({ ...formData, status: 'archived' })}
                                        className="w-4 h-4 text-primary bg-muted border-border focus:ring-ring"
                                    />
                                    <span className="text-muted-foreground">{t('ecommerce.archived', 'Archivado')}</span>
                                </label>
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium text-foreground">
                                    {t('ecommerce.tags', 'Etiquetas')}
                                </h3>
                                {formData.name.trim() && (
                                    <AIAssistButton
                                        onClick={handleGenerateTags}
                                        isLoading={isGeneratingTags}
                                        disabled={isAnyGenerating}
                                        label={t('ecommerce.generateWithAI', 'Generar')}
                                        size="sm"
                                        variant="ghost"
                                    />
                                )}
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                    placeholder={t('ecommerce.addTag', 'Agregar etiqueta...')}
                                    className="flex-1 px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddTag}
                                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>

                            {formData.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {formData.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm bg-primary/20 text-primary"
                                        >
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveTag(tag)}
                                                className="hover:text-foreground"
                                            >
                                                <X size={14} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* SEO */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium text-foreground">
                                    {t('ecommerce.seo', 'SEO')}
                                </h3>
                                {formData.name.trim() && (
                                    <AIAssistButton
                                        onClick={handleGenerateSEO}
                                        isLoading={isGeneratingSEO}
                                        disabled={isAnyGenerating}
                                        label={t('ecommerce.generateWithAI', 'Generar Todo')}
                                        size="sm"
                                        variant="ghost"
                                    />
                                )}
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-sm font-medium text-muted-foreground">
                                        {t('ecommerce.seoTitle', 'Título SEO')}
                                        <span className="text-xs text-muted-foreground/70 ml-2">
                                            ({formData.metaTitle.length}/60)
                                        </span>
                                    </label>
                                    {formData.name.trim() && (
                                        <AIAssistButton
                                            onClick={handleGenerateSEO}
                                            isLoading={isGeneratingSEO}
                                            disabled={isAnyGenerating}
                                            label={t('ecommerce.generateWithAI', 'Generar')}
                                            size="sm"
                                            variant="ghost"
                                        />
                                    )}
                                </div>
                                <input
                                    type="text"
                                    value={formData.metaTitle}
                                    onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value.substring(0, 60) })}
                                    maxLength={60}
                                    placeholder={t('ecommerce.seoTitlePlaceholder', 'Título optimizado para buscadores...')}
                                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-sm font-medium text-muted-foreground">
                                        {t('ecommerce.seoDescription', 'Descripción SEO')}
                                        <span className="text-xs text-muted-foreground/70 ml-2">
                                            ({formData.metaDescription.length}/155)
                                        </span>
                                    </label>
                                    {formData.name.trim() && (
                                        <AIAssistButton
                                            onClick={handleGenerateSEO}
                                            isLoading={isGeneratingSEO}
                                            disabled={isAnyGenerating}
                                            label={t('ecommerce.generateWithAI', 'Generar')}
                                            size="sm"
                                            variant="ghost"
                                        />
                                    )}
                                </div>
                                <textarea
                                    value={formData.metaDescription}
                                    onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value.substring(0, 155) })}
                                    maxLength={155}
                                    rows={2}
                                    placeholder={t('ecommerce.seoDescriptionPlaceholder', 'Descripción que aparecerá en resultados de búsqueda...')}
                                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>
                        </div>

                        {/* AI Error Message */}
                        {aiError && (
                            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                                {aiError}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex gap-4 p-6 border-t border-border">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
                        >
                            {t('common.cancel', 'Cancelar')}
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 disabled:opacity-50 bg-primary text-primary-foreground rounded-lg transition-colors hover:bg-primary/90"
                        >
                            {isSaving && <Loader2 size={20} className="animate-spin" />}
                            {product ? t('common.save', 'Guardar') : t('common.create', 'Crear')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProductForm;
