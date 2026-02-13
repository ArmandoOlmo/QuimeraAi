/**
 * EcommerceImagePicker
 * Selector de imágenes para el ecommerce que usa la misma biblioteca del proyecto
 * Permite seleccionar de: biblioteca del proyecto, biblioteca global, o subir nuevas
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    X,
    Upload,
    Image as ImageIcon,
    Search,
    Globe,
    Check,
    Loader2,
    FolderOpen,
    Plus,
} from 'lucide-react';
import { useFiles } from '../../../../contexts/files';
import { useProject } from '../../../../contexts/project';
import { useToast } from '../../../../contexts/ToastContext';
import { FileRecord } from '../../../../types';

interface EcommerceImagePickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (url: string) => void;
    onUpload?: (file: File) => void;
    currentImages?: string[];
    multiple?: boolean;
}

const EcommerceImagePicker: React.FC<EcommerceImagePickerProps> = ({
    isOpen,
    onClose,
    onSelect,
    onUpload,
    currentImages = [],
    multiple = true,
}) => {
    const { t } = useTranslation();
    const { files, globalFiles, fetchGlobalFiles, uploadFile } = useFiles();
    const { projects, activeProjectId } = useProject();
    const { success, error: showError } = useToast();

    const [librarySource, setLibrarySource] = useState<'project' | 'global'>('project');
    const [searchQuery, setSearchQuery] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    // Trigger file upload by creating a temporary input element
    // This is the most reliable cross-browser approach for modals
    const triggerFileUpload = () => {
        if (isUploading) return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        if (multiple) input.multiple = true;
        input.onchange = (e) => handleFileUpload(e as unknown as React.ChangeEvent<HTMLInputElement>);
        input.click();
    };

    // Fetch global files when switching to global library
    useEffect(() => {
        if (librarySource === 'global') {
            fetchGlobalFiles();
        }
    }, [librarySource, fetchGlobalFiles]);

    // Filter image files only
    const sourceFiles = librarySource === 'project' ? files : globalFiles;
    const imageFiles = useMemo(() => {
        let result = sourceFiles.filter(f => f.type?.startsWith('image/'));

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(f =>
                f.name.toLowerCase().includes(query) ||
                f.notes?.toLowerCase().includes(query)
            );
        }

        return result;
    }, [sourceFiles, searchQuery]);

    // Group images by project (only for project files)
    const imagesByProject = useMemo(() => {
        if (librarySource === 'global') {
            return { 'global': imageFiles };
        }

        const grouped: { [key: string]: FileRecord[] } = {};

        // Put active project first
        if (activeProjectId) {
            grouped[activeProjectId] = [];
        }
        grouped['no-project'] = [];

        imageFiles.forEach(file => {
            const projectKey = file.projectId || 'no-project';
            if (!grouped[projectKey]) {
                grouped[projectKey] = [];
            }
            grouped[projectKey].push(file);
        });

        return grouped;
    }, [imageFiles, librarySource, activeProjectId]);

    // Get project names for display
    const projectNames = useMemo(() => {
        const names: { [key: string]: string } = {
            'no-project': t('ecommerce.unassignedImages', 'Sin asignar'),
            'global': t('ecommerce.globalLibrary', 'Biblioteca Global')
        };

        projects.forEach(project => {
            names[project.id] = project.name;
        });

        return names;
    }, [projects, t]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFiles = e.target.files;
        if (!uploadedFiles) return;

        setIsUploading(true);
        try {
            let uploadedCount = 0;
            for (const file of Array.from(uploadedFiles)) {
                if (onUpload) {
                    onUpload(file);
                    uploadedCount++;
                } else {
                    // Upload to project library and select
                    const url = await uploadFile(file);
                    if (url) {
                        onSelect(url);
                        uploadedCount++;
                    } else {
                        showError(t('ecommerce.uploadError', 'Error al subir la imagen. Verifica que tengas un proyecto activo.'));
                    }
                }
            }
            if (uploadedCount > 0) {
                success(t('ecommerce.imageUploaded', 'Imagen subida correctamente'));
            }
        } catch (err) {
            console.error('Error uploading image:', err);
            showError(t('ecommerce.uploadError', 'Error al subir la imagen'));
        } finally {
            setIsUploading(false);
        }
    };

    const handleSelectImage = (url: string) => {
        onSelect(url);
        if (!multiple) {
            onClose();
        }
        success(t('ecommerce.imageSelected', 'Imagen seleccionada'));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-xl border border-border w-full max-w-4xl max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-bold text-foreground">
                            {t('ecommerce.selectImage', 'Seleccionar Imagen')}
                        </h2>

                        {/* Library Tabs */}
                        <div className="flex bg-muted/50 p-1 rounded-lg">
                            <button
                                onClick={() => setLibrarySource('project')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${librarySource === 'project'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <FolderOpen size={14} />
                                {t('ecommerce.myImages', 'Mis Imágenes')}
                            </button>
                            <button
                                onClick={() => setLibrarySource('global')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${librarySource === 'global'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <Globe size={14} />
                                {t('ecommerce.globalLibrary', 'Biblioteca Global')}
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search and Upload */}
                <div className="p-4 border-b border-border flex gap-3">
                    <div className="flex items-center gap-2 flex-1 bg-editor-border/40 rounded-lg px-3 py-2">
                        <Search size={16} className="text-editor-text-secondary flex-shrink-0" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('ecommerce.searchImages', 'Buscar imágenes...')}
                            className="flex-1 bg-transparent outline-none text-sm min-w-0"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <button
                        onClick={triggerFileUpload}
                        disabled={isUploading}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg cursor-pointer hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isUploading ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Upload size={16} />
                        )}
                        <span className="text-sm font-medium">{t('ecommerce.upload', 'Subir')}</span>
                    </button>
                </div>

                {/* Image Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    {Object.keys(imagesByProject).length > 0 && Object.values(imagesByProject).some(arr => arr.length > 0) ? (
                        <div className="space-y-6">
                            {Object.entries(imagesByProject).map(([projectId, projectImages]) => {
                                if (projectImages.length === 0) return null;

                                return (
                                    <div key={projectId} className="space-y-3">
                                        {/* Project Header (only show for project library) */}
                                        {librarySource === 'project' && (
                                            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                                <h3 className="text-sm font-semibold text-foreground">
                                                    {projectNames[projectId] || t('ecommerce.unknownProject', 'Proyecto desconocido')}
                                                </h3>
                                                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                                                    {projectImages.length} {projectImages.length === 1
                                                        ? t('ecommerce.image', 'imagen')
                                                        : t('ecommerce.images', 'imágenes')}
                                                </span>
                                                {projectId === activeProjectId && (
                                                    <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                                                        {t('ecommerce.currentProject', 'Proyecto actual')}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Images Grid */}
                                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                                            {projectImages.map(file => {
                                                const isSelected = currentImages.includes(file.downloadURL);

                                                return (
                                                    <div
                                                        key={file.id}
                                                        onClick={() => handleSelectImage(file.downloadURL)}
                                                        className={`aspect-square rounded-lg overflow-hidden border-2 cursor-pointer group relative transition-all ${isSelected
                                                            ? 'border-primary ring-2 ring-primary/50'
                                                            : 'border-transparent hover:border-muted-foreground'
                                                            }`}
                                                    >
                                                        <img
                                                            src={file.downloadURL}
                                                            alt={file.name}
                                                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                                        />
                                                        {isSelected ? (
                                                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                                                <div className="bg-primary text-primary-foreground rounded-full p-1.5">
                                                                    <Check size={16} />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <span className="text-white text-xs font-medium">
                                                                    {t('ecommerce.select', 'Seleccionar')}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : searchQuery ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-12">
                            <Search size={48} className="mb-4 opacity-50" />
                            <p className="font-medium mb-2">{t('ecommerce.noImagesFound', 'No se encontraron imágenes')}</p>
                            <p className="text-sm mb-4">{t('ecommerce.tryAdjustingSearch', 'Intenta ajustar tu búsqueda')}</p>
                            <button
                                onClick={() => setSearchQuery('')}
                                className="text-primary hover:underline text-sm"
                            >
                                {t('ecommerce.clearSearch', 'Limpiar búsqueda')}
                            </button>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl py-12">
                            <ImageIcon size={48} className="mb-4 opacity-50" />
                            <p className="mb-2">
                                {librarySource === 'project'
                                    ? t('ecommerce.noProjectImages', 'No hay imágenes en tus proyectos')
                                    : t('ecommerce.noGlobalImages', 'No hay imágenes en la biblioteca global')}
                            </p>
                            <button
                                onClick={triggerFileUpload}
                                className="mt-4 cursor-pointer text-primary hover:underline flex items-center gap-2"
                            >
                                <Plus size={16} />
                                {t('ecommerce.uploadFirst', 'Subir tu primera imagen')}
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-sm font-medium transition-colors"
                    >
                        {t('common.close', 'Cerrar')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EcommerceImagePicker;
