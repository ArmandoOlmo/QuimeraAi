/**
 * ImagePickerModal
 * Modal to select images from the Super Admin global image library
 * Used for selecting logos, backgrounds, and other images in the landing page editor
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Search, Image, Check, Star } from 'lucide-react';
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
    const { globalFiles, isGlobalFilesLoading } = useFiles();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

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

                {/* Search */}
                <div className="p-4 border-b border-border">
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
                </div>

                {/* Image Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    {isGlobalFilesLoading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
                        </div>
                    ) : filteredImages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                            <Image size={40} className="mb-2 opacity-50" />
                            <p className="text-sm">{t('landingEditor.noImagesFound', 'No se encontraron imágenes')}</p>
                        </div>
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
