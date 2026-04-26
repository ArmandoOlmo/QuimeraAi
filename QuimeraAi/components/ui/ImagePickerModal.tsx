/**
 * ImagePickerModal
 * Modal to select images from the administration image library
 * Used for selecting logos, backgrounds, and other images in the landing page editor
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Search, Image, Check, Star, Upload, Loader2, FolderOpen } from 'lucide-react';
import { useFiles } from '../../contexts/files';
import { BRAND_ASSETS } from '../../constants/brandAssets';
import { FileRecord } from '../../types';

interface ImagePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (imageUrl: string) => void;
    title?: string;
    useProjectLibrary?: boolean;
}

const ImagePickerModal: React.FC<ImagePickerModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    title = 'Seleccionar Imagen',
    useProjectLibrary = false
}) => {
    const { t } = useTranslation();
    const { 
        adminAssets, isAdminAssetsLoading, fetchAdminAssets, uploadAdminAsset,
        files, isFilesLoading, uploadFile 
    } = useFiles();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch assets when modal opens and reset state when closed
    useEffect(() => {
        if (isOpen) {
            if (!useProjectLibrary && adminAssets.length === 0) {
                fetchAdminAssets();
            }
        } else {
            // Reset state when modal closes
            setSelectedUrl(null);
            setSearchQuery('');
            setUploadError(null);
        }
    }, [isOpen]);

    // Handle file upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setUploadError(t('landingEditor.invalidImageType', 'Solo se permiten archivos de imagen'));
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setUploadError(t('landingEditor.imageTooLarge', 'La imagen no puede superar 5MB'));
            return;
        }

        setIsUploading(true);
        setUploadError(null);

        try {
            if (useProjectLibrary) {
                await uploadFile(file);
                // `files` auto-updates via onSnapshot in context, no fetch needed.
            } else {
                await uploadAdminAsset(file, 'other', {
                    description: 'Uploaded from image picker',
                });
                await fetchAdminAssets();
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            setUploadError(t('landingEditor.uploadError', 'Error al subir la imagen'));
        } finally {
            setIsUploading(false);
            // Reset the input so the same file can be selected again
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Combine brand assets with admin files
    const allImages = useMemo(() => {
        const brandAssetImages = BRAND_ASSETS.map(asset => ({
            id: asset.id,
            name: asset.name,
            downloadURL: asset.downloadURL,
            type: asset.type,
            isSystemAsset: true,
        }));

        const sourceList = useProjectLibrary ? files : adminAssets;
        
        const userImages = sourceList
            .filter(file => file.type?.startsWith('image/'))
            .map(file => ({
                id: file.id,
                name: file.name,
                downloadURL: file.downloadURL,
                type: file.type,
                isSystemAsset: false,
            }));

        return [...brandAssetImages, ...userImages];
    }, [adminAssets, files, useProjectLibrary]);

    // Filter by search
    const filteredImages = useMemo(() => {
        if (!searchQuery.trim()) return allImages;
        const query = searchQuery.toLowerCase();
        return allImages.filter(img =>
            img.name.toLowerCase().includes(query)
        );
    }, [allImages, searchQuery]);

    const handleSelect = () => {
        if (selectedUrl) {
            onSelect(selectedUrl);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-card border border-border rounded-lg shadow-2xl w-full max-w-3xl max-h-[84vh] flex flex-col m-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between h-14 px-4 border-b border-border bg-card/95">
                    <div className="flex items-center gap-2 min-w-0">
                        <Image size={20} className="text-primary" />
                        <h2 className="text-lg font-semibold text-foreground truncate">{title}</h2>
                        <span className="hidden sm:inline-flex items-center gap-1 h-6 px-2 rounded-md border border-border bg-muted/50 text-xs text-muted-foreground">
                            <FolderOpen size={12} />
                            {useProjectLibrary ? t('restaurants.projectLibrary', 'Project') : 'Administración'}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors"
                        title={t('common.close', 'Cerrar')}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Search and Upload */}
                <div className="p-4 border-b border-border space-y-3 bg-muted/20">
                    {/* Search */}
                    <div className="flex items-center gap-2 bg-background border border-border rounded-md px-3 py-2">
                        <Search size={16} className="text-muted-foreground" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('common.search', 'Buscar imágenes...')}
                            className="flex-1 bg-transparent outline-none text-sm"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Upload Button */}
                    <div className="flex items-center gap-3">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="flex items-center gap-2 h-9 px-3 rounded-md border border-dashed border-primary/50 text-primary hover:bg-primary/5 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    {t('common.uploading', 'Subiendo...')}
                                </>
                            ) : (
                                <>
                                    <Upload size={16} />
                                    {t('landingEditor.uploadImage', 'Subir imagen')}
                                </>
                            )}
                        </button>
                        <span className="text-xs text-muted-foreground">
                            {t('landingEditor.maxFileSize', 'Máx. 5MB • PNG, JPG, SVG')}
                        </span>
                    </div>

                    {/* Upload Error */}
                    {uploadError && (
                        <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                            {uploadError}
                        </div>
                    )}
                </div>

                {/* Image Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    {filteredImages.length === 0 ? (
                        (useProjectLibrary ? isFilesLoading : isAdminAssetsLoading) ? (
                            <div className="flex items-center justify-center h-40">
                                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                                <Image size={40} className="mb-2 opacity-50" />
                                <p className="text-sm">{t('landingEditor.noImagesFound', 'No se encontraron imágenes')}</p>
                            </div>
                        )
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                            {filteredImages.map((img) => (
                                <button
                                    key={img.id}
                                    onClick={() => setSelectedUrl(img.downloadURL)}
                                    className={`relative aspect-square rounded-md overflow-hidden border transition-all ${selectedUrl === img.downloadURL
                                            ? 'border-primary ring-2 ring-primary/30'
                                            : 'border-border/50 hover:border-primary/40'
                                        }`}
                                >
                                    <img
                                        src={img.downloadURL}
                                        alt={img.name}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                    {/* System asset badge */}
                                    {img.isSystemAsset && (
                                        <div className="absolute top-1 right-1">
                                            <Star size={12} className="text-yellow-500 fill-yellow-500" />
                                        </div>
                                    )}
                                    {/* Selected indicator */}
                                    {selectedUrl === img.downloadURL && (
                                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                                                <Check size={16} className="text-primary-foreground" />
                                            </div>
                                        </div>
                                    )}
                                    {/* Name tooltip on hover */}
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 hover:opacity-100 transition-opacity">
                                        <p className="text-xs text-white truncate">{img.name}</p>
                                    </div>
                                </button>
                            ))}
                            {/* Loading indicator for more images */}
                            {isAdminAssetsLoading && (
                                <div className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                                    <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-border bg-card/95">
                    <p className="text-xs text-muted-foreground">
                        {filteredImages.length} {t('landingEditor.imagesAvailable', 'imágenes disponibles')}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="h-9 px-4 rounded-md text-sm font-medium hover:bg-muted transition-colors"
                        >
                            {t('common.cancel', 'Cancelar')}
                        </button>
                        <button
                            onClick={handleSelect}
                            disabled={!selectedUrl}
                            className="h-9 px-4 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {t('common.select', 'Seleccionar')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImagePickerModal;
