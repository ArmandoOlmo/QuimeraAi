/**
 * ImagePickerModal
 * Modal to select images from the Super Admin global image library
 * Used for selecting logos, backgrounds, and other images in the landing page editor
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Search, Image, Check, Star, Upload, Loader2 } from 'lucide-react';
import { useFiles } from '../../contexts/files';
import { BRAND_ASSETS } from '../../constants/brandAssets';
import { FileRecord } from '../../types';

interface ImagePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (imageUrl: string) => void;
    title?: string;
}

const ImagePickerModal: React.FC<ImagePickerModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    title = 'Seleccionar Imagen'
}) => {
    const { t } = useTranslation();
    const { globalFiles, isGlobalFilesLoading, fetchGlobalFiles, uploadGlobalFile } = useFiles();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch global files when modal opens and reset state when closed
    useEffect(() => {
        if (isOpen) {
            // Only fetch if we don't already have global files loaded
            if (globalFiles.length === 0) {
                fetchGlobalFiles();
            }
        } else {
            // Reset state when modal closes
            setSelectedUrl(null);
            setSearchQuery('');
            setUploadError(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            await uploadGlobalFile(file);
            // Refresh the files list to show the new upload
            await fetchGlobalFiles();
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

    // Combine brand assets with global files
    const allImages = useMemo(() => {
        // Convert brand assets to FileRecord-like format
        const brandAssetImages = BRAND_ASSETS.map(asset => ({
            id: asset.id,
            name: asset.name,
            downloadURL: asset.downloadURL,
            type: asset.type,
            isSystemAsset: true,
        }));

        // Filter only images from global files
        const userImages = globalFiles
            .filter(file => file.type?.startsWith('image/'))
            .map(file => ({
                id: file.id,
                name: file.name,
                downloadURL: file.downloadURL,
                type: file.type,
                isSystemAsset: false,
            }));

        return [...brandAssetImages, ...userImages];
    }, [globalFiles]);

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
            <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col m-4">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Image size={20} className="text-primary" />
                        <h2 className="font-semibold">{title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Search and Upload */}
                <div className="p-4 border-b border-border space-y-3">
                    {/* Search */}
                    <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
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
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-primary/50 text-primary hover:bg-primary/5 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
                        isGlobalFilesLoading ? (
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
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                            {filteredImages.map((img) => (
                                <button
                                    key={img.id}
                                    onClick={() => setSelectedUrl(img.downloadURL)}
                                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${selectedUrl === img.downloadURL
                                            ? 'border-primary ring-2 ring-primary/30'
                                            : 'border-transparent hover:border-muted-foreground/30'
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
                            {isGlobalFilesLoading && (
                                <div className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                                    <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                        {filteredImages.length} {t('landingEditor.imagesAvailable', 'imágenes disponibles')}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                        >
                            {t('common.cancel', 'Cancelar')}
                        </button>
                        <button
                            onClick={handleSelect}
                            disabled={!selectedUrl}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
