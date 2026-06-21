/**
 * AdminAssetLibrary
 * Biblioteca de imágenes para la administración de la App Quimera
 * Basado en el diseño de FileHistory pero con funcionalidad de Admin
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmationModal from '../../ui/ConfirmationModal';
import { FilterChipRow } from '../filters';
import type { FilterChipOption } from '../filters';
import { useFiles, AdminAssetCategory, AdminAssetRecord } from '../../../contexts/files';
import { useAI } from '../../../contexts/ai';
import { useAppContent } from '../../../contexts/appContent';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/core/AuthContext';
import { db, collection, getDocs, addDoc, query, orderBy, doc, updateDoc } from '@/utils/compatData';
import { supabase } from '../../../supabase';
import DashboardSidebar from '../DashboardSidebar';
import DragDropZone from '../../ui/DragDropZone';
import Modal from '../../ui/Modal';
import MobileSearchModal from '../../ui/MobileSearchModal';
import MediaGeneratorPanel from '../../media-generator/MediaGeneratorPanel';
import { formatBytes, formatFileDate } from '../../../utils/fileHelpers';
import {
    Upload,
    Trash2,
    Download,
    Zap,
    Search,
    Filter,
    ArrowUpDown,
    CheckSquare,
    Square,
    ChevronLeft,
    ChevronRight,
    Menu,
    Sparkles,
    X,
    Link as LinkIcon,
    FolderOpen,
    Tag,
    Copy,
    Check,
    FileText,
    Layout,
    Palette,
    User,
    ShoppingBag,
    Star,
    Grid,
    List,
    Edit3,
    Plus,
    ImageIcon,
    Loader2,
    Wand2,
    Calendar,
    HardDrive,
    AlertTriangle
} from 'lucide-react';
import HeaderBackButton from '../../ui/HeaderBackButton';
import VisualIdentityKitManager from '../visual/VisualIdentityKitManager';
import { useVisualIdentityKit } from '../../../hooks/useVisualIdentityKit';
import { IMAGE_REFERENCE_CATEGORY_COLORS } from '../../../types/visualIdentity';
import type { VisualReference } from '../../../types/visualIdentity';
import { ADMIN_VISUAL_KIT_PROJECT_ID } from '../../../constants/adminVisualKit';
import AppSelect from '../../ui/AppSelect';

interface AdminAssetLibraryProps {
    onBack?: () => void;
    noLayout?: boolean;
}

// Constants for AI Generator
const ASPECT_RATIOS = [
    { label: 'Square (1:1)', value: '1:1' },
    { label: 'Landscape (16:9)', value: '16:9' },
    { label: 'Portrait (9:16)', value: '9:16' },
    { label: 'Classic (4:3)', value: '4:3' },
    { label: 'Tall (3:4)', value: '3:4' },
    { label: 'Cinematic (21:9)', value: '21:9' },
];

const STYLES = [
    'None', 'Photorealistic', 'Cinematic', 'Anime', 'Digital Art',
    'Oil Painting', '3D Render', 'Minimalist', 'Cyberpunk', 'Watercolor'
];

const RESOLUTIONS = [
    { label: 'Standard', value: '1K' },
    { label: 'High Quality (2K)', value: '2K' },
    { label: 'Ultra HD (4K)', value: '4K' },
];

const LIGHTING_OPTIONS = [
    'None', 'Natural Lighting', 'Soft Lighting', 'Dramatic Lighting',
    'Golden Hour', 'Blue Hour', 'Studio Lighting', 'Neon Lighting',
    'Rim Lighting', 'Volumetric Lighting'
];

const CAMERA_ANGLES = [
    'None', 'Eye Level', 'Low Angle', 'High Angle', 'Bird\'s Eye View',
    'Worm\'s Eye View', 'Dutch Angle', 'Over the Shoulder', 'Close-up',
    'Wide Shot', 'Aerial View'
];

const COLOR_GRADING = [
    'None', 'Warm Tones', 'Cool Tones', 'Vibrant', 'Desaturated',
    'High Contrast', 'Low Contrast', 'Cinematic', 'Vintage',
    'Black and White', 'Sepia'
];

const DEPTH_OF_FIELD = [
    'None', 'Shallow (Bokeh Background)', 'Deep (All in Focus)',
    'Medium (Balanced)', 'Tilt-Shift Effect'
];

const CATEGORY_CONFIG: Record<AdminAssetCategory, { label: string; icon: React.ReactNode; color: string }> = {
    'article': { label: 'Artículos', icon: <FileText size={16} />, color: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
    'component': { label: 'Componentes', icon: <Layout size={16} />, color: 'bg-purple-500/10 text-purple-500 border-purple-500/30' },
    'template': { label: 'Templates', icon: <Grid size={16} />, color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
    'hero': { label: 'Hero/Banner', icon: <ImageIcon size={16} />, color: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
    'icon': { label: 'Iconos', icon: <Sparkles size={16} />, color: 'bg-pink-500/10 text-pink-500 border-pink-500/30' },
    'background': { label: 'Fondos', icon: <Palette size={16} />, color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30' },
    'logo': { label: 'Logos', icon: <Star size={16} />, color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' },
    'testimonial': { label: 'Testimonios', icon: <User size={16} />, color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30' },
    'team': { label: 'Equipo', icon: <User size={16} />, color: 'bg-teal-500/10 text-teal-500 border-teal-500/30' },
    'product': { label: 'Productos', icon: <ShoppingBag size={16} />, color: 'bg-rose-500/10 text-rose-500 border-rose-500/30' },
    'ai_generated': { label: 'Generadas con IA', icon: <Wand2 size={16} />, color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30' },
    'other': { label: 'Otros', icon: <FolderOpen size={16} />, color: 'bg-gray-500/10 text-gray-500 border-gray-500/30' },
};

// Preview Modal Component
const AssetPreviewModal: React.FC<{
    asset: AdminAssetRecord;
    onClose: () => void;
    onUpdate: (id: string, updates: Partial<AdminAssetRecord>) => Promise<void>;
    onDelete: (id: string, storagePath: string) => Promise<void>;
}> = ({ asset, onClose, onUpdate, onDelete }) => {
    const { t } = useTranslation();
    const { success, error: showError } = useToast();
    const { articles } = useAppContent();
    const [description, setDescription] = useState(asset.description || '');
    const [tags, setTags] = useState(asset.tags?.join(', ') || '');
    const [category, setCategory] = useState(asset.category);
    const descriptionTimeoutRef = useRef<number | null>(null);

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setDescription(e.target.value);
        if (descriptionTimeoutRef.current) {
            clearTimeout(descriptionTimeoutRef.current);
        }
        descriptionTimeoutRef.current = window.setTimeout(async () => {
            await onUpdate(asset.id, { description: e.target.value });
            success(t('adminAssets.descriptionSaved', 'Description saved'));
        }, 1000);
    };

    const handleSaveMetadata = async () => {
        try {
            await onUpdate(asset.id, {
                category,
                tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            });
            success(t('adminAssets.metadataSaved', 'Metadata saved'));
        } catch (err) {
            showError(t('adminAssets.saveError', 'Failed to save'));
        }
    };

    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const handleDelete = () => {
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        setShowDeleteModal(false);
        try {
            await onDelete(asset.id, asset.storagePath);
            success(t('adminAssets.deleted', 'Asset deleted'));
            onClose();
        } catch (err) {
            showError(t('adminAssets.deleteError', 'Failed to delete'));
        }
    };

    const getArticleName = (articleId: string) => {
        const article = articles.find(a => a.id === articleId);
        return article?.title || articleId;
    };

    const categoryConfig = CATEGORY_CONFIG[asset.category];

    return (
        <div className="flex flex-col h-full max-h-[85vh] bg-q-surface rounded-xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-q-border flex justify-between items-center bg-q-surface z-10">
                <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${categoryConfig.color}`}>
                        {categoryConfig.icon}
                        {categoryConfig.label}
                    </span>
                    <h3 className="font-bold text-lg text-foreground truncate max-w-[50%]">{asset.name}</h3>
                    {asset.isAiGenerated && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            <Sparkles size={10} /> AI
                        </span>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-secondary text-q-text-muted hover:text-foreground transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Image Preview */}
            <div className="flex-1 overflow-auto p-0 bg-black/90 flex items-center justify-center relative">
                <div
                    className="absolute inset-0 opacity-30 blur-3xl scale-110"
                    style={{ backgroundImage: `url(${asset.downloadURL})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                />
                <img
                    src={asset.downloadURL}
                    alt={asset.name}
                    className="max-w-full max-h-full object-contain shadow-2xl relative z-10"
                />
            </div>

            {/* Details Section */}
            <div className="border-t border-q-border bg-q-surface z-10">
                {/* Basic Info */}
                <div className="p-4 border-b border-q-border/50">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                            <p className="text-sm font-bold text-foreground mb-1">{t('adminAssets.details', 'Details')}</p>
                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-q-text-muted">
                                <span className="flex items-center">
                                    <HardDrive size={14} className="mr-2 text-primary" />
                                    {formatBytes(asset.size)}
                                </span>
                                <span className="flex items-center">
                                    <Calendar size={14} className="mr-2 text-primary" />
                                    {formatFileDate(asset.createdAt)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Category Selector */}
                    <div className="mb-3">
                        <label className="block text-xs font-bold text-q-text-muted mb-2 uppercase">{t('adminAssets.category', 'Category')}</label>
                        <AppSelect
                            value={category}
                            onChange={(e) => setCategory(e.target.value as AdminAssetCategory)}
                            className="w-full bg-q-bg text-sm text-foreground p-2 rounded-lg border border-q-border focus:ring-2 focus:ring-primary focus:outline-none"
                        >
                            {Object.entries(CATEGORY_CONFIG).map(([key, { label }]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </AppSelect>
                    </div>

                    {/* Category Selector */}
                    <div className="mb-3">
                        <label className="block text-xs font-bold text-q-text-muted mb-2 uppercase">Categoría</label>
                        <AppSelect
                            value={category}
                            onChange={(e) => setCategory(e.target.value as AdminAssetCategory)}
                            className="w-full bg-q-bg text-sm text-foreground p-2 rounded-lg border border-q-border focus:ring-2 focus:ring-primary focus:outline-none"
                        >
                            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                                <option key={key} value={key}>
                                    {config.label}
                                </option>
                            ))}
                        </AppSelect>
                    </div>

                    {/* Description */}
                    <div className="mb-3">
                        <label className="block text-xs font-bold text-q-text-muted mb-2 uppercase">{t('adminAssets.description', 'Description')}</label>
                        <textarea
                            value={description}
                            onChange={handleDescriptionChange}
                            rows={2}
                            placeholder={t('adminAssets.descriptionPlaceholder', 'Add a description...')}
                            className="w-full bg-q-bg text-sm text-foreground p-3 rounded-lg border border-q-border focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                        />
                    </div>

                    {/* Tags */}
                    <div className="mb-3">
                        <label className="block text-xs font-bold text-q-text-muted mb-2 uppercase">{t('adminAssets.tags', 'Tags')} (comma separated)</label>
                        <input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="tag1, tag2, tag3"
                            className="w-full bg-q-bg text-sm text-foreground p-2 rounded-lg border border-q-border focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                    </div>

                    {/* Used In Articles */}
                    {asset.usedIn && asset.usedIn.length > 0 && (
                        <div className="bg-secondary/30 p-3 rounded-lg border border-q-border/50">
                            <div className="flex items-center mb-2">
                                <LinkIcon size={14} className="text-primary mr-2" />
                                <span className="text-xs font-bold text-primary uppercase">{t('adminAssets.usedIn', 'Used in Articles')}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {asset.usedIn.map(articleId => (
                                    <span key={articleId} className="px-2 py-1 text-xs bg-blue-500/10 text-blue-400 rounded-full">
                                        {getArticleName(articleId)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* AI Prompt */}
                    {asset.aiPrompt && (
                        <div className="mt-3 bg-purple-500/10 p-3 rounded-lg border border-purple-500/30">
                            <div className="flex items-center mb-2">
                                <Sparkles size={14} className="text-purple-400 mr-2" />
                                <span className="text-xs font-bold text-purple-400 uppercase">{t('adminAssets.aiPrompt', 'AI Prompt Used')}</span>
                            </div>
                            <p className="text-sm text-foreground leading-relaxed">{asset.aiPrompt}</p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="p-4 flex justify-between items-center">
                    <div className="flex gap-2">
                        <button
                            onClick={handleSaveMetadata}
                            className="flex items-center text-xs font-bold py-2 px-4 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                            <Check size={14} className="mr-1.5" /> {t('common.save', 'Save')}
                        </button>
                        <button
                            onClick={handleDelete}
                            className="flex items-center text-xs font-bold py-2 px-4 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                        >
                            <Trash2 size={14} className="mr-1.5" /> {t('common.delete', 'Delete')}
                        </button>
                    </div>
                    <a
                        href={asset.downloadURL}
                        download={asset.name}
                        className="flex items-center bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-bold shadow-lg hover:bg-primary/90 transition-transform hover:scale-105 text-sm"
                    >
                        <Download size={16} className="mr-2" /> {t('common.download', 'Download')}
                    </a>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showDeleteModal}
                onConfirm={confirmDelete}
                onCancel={() => setShowDeleteModal(false)}
                title={t('adminAssets.deleteTitle', '¿Eliminar asset?')}
                message={t('adminAssets.deleteConfirm', 'Delete this asset?')}
                variant="danger"
            />
        </div>
    );
};

// Asset Item Component
const AssetItem: React.FC<{
    asset: AdminAssetRecord;
    onPreview: (asset: AdminAssetRecord) => void;
    isSelected?: boolean;
    onToggleSelect?: () => void;
    isSelectionMode?: boolean;
    onCopyUrl?: (url: string) => void;
    onUseAsReference?: (url: string) => void;
}> = ({ asset, onPreview, isSelected, onToggleSelect, isSelectionMode, onCopyUrl, onUseAsReference }) => {
    const { t } = useTranslation();
    const imgRef = useRef<HTMLImageElement>(null);
    const categoryConfig = CATEGORY_CONFIG[asset.category];

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('text/plain', asset.downloadURL);
        e.dataTransfer.setData('application/x-admin-asset', asset.downloadURL);
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <div
            className={`rounded-xl transition-all duration-200 group relative overflow-hidden h-full ${isSelected ? 'ring-2 ring-primary' : ''} cursor-grab active:cursor-grabbing`}
            draggable
            onDragStart={handleDragStart}
        >
            <div
                className="aspect-square w-full bg-secondary/30 relative cursor-pointer overflow-hidden"
                onClick={() => {
                    if (isSelectionMode && onToggleSelect) {
                        onToggleSelect();
                    }
                }}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (!isSelectionMode) {
                        onPreview(asset);
                    }
                }}
                title={isSelectionMode ? t('adminAssets.clickToSelect', 'Click to select') : t('adminAssets.doubleClickPreview', 'Double-click to preview')}
            >
                <img
                    ref={imgRef}
                    src={asset.downloadURL}
                    alt={asset.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    draggable={false}
                />

                {/* Category Badge & AI Badge (left) */}
                <div className="absolute top-2 left-2 z-10 flex gap-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border backdrop-blur-sm ${categoryConfig.color}`}>
                        {categoryConfig.icon}
                    </span>
                    {asset.isAiGenerated && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-purple-500/80 text-white backdrop-blur-sm">
                            <Sparkles size={10} />
                        </span>
                    )}
                </div>

                {/* Selection checkbox */}
                {isSelectionMode && (
                    <div className="absolute top-2 right-2 z-10">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleSelect?.();
                            }}
                            className="p-1.5 bg-white dark:bg-gray-800 rounded-md shadow-lg"
                        >
                            {isSelected ? (
                                <CheckSquare size={20} className="text-primary" />
                            ) : (
                                <Square size={20} className="text-q-text-muted" />
                            )}
                        </button>
                    </div>
                )}

                {/* Actions container - top right */}
                {!isSelectionMode && (
                    <div className="absolute top-2 right-2 flex flex-col gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onUseAsReference && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onUseAsReference(asset.downloadURL);
                                }}
                                className="p-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-md shadow-lg transition-transform hover:scale-110"
                                title={t('adminAssets.useAsReference', 'Use as Reference')}
                            >
                                <Zap size={14} />
                            </button>
                        )}
                        {onCopyUrl && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCopyUrl(asset.downloadURL);
                                }}
                                className="p-1.5 bg-primary hover:bg-primary/80 text-primary-foreground rounded-md shadow-lg transition-transform hover:scale-110"
                                title={t('adminAssets.copyUrl', 'Copy URL')}
                            >
                                <Copy size={14} />
                            </button>
                        )}
                    </div>
                )}

                {/* Filename overlay on hover */}
                {!isSelectionMode && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs font-medium truncate">{asset.name}</p>
                        <p className="text-white/70 text-[10px] mt-0.5">{formatBytes(asset.size)}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const AdminAssetLibrary: React.FC<AdminAssetLibraryProps> = ({ onBack, noLayout }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const {
        adminAssets,
        isAdminAssetsLoading,
        fetchAdminAssets,
        uploadAdminAsset,
        uploadAdminAssetFromURL,
        updateAdminAsset,
        deleteAdminAsset
    } = useFiles();
    const { generateImage, enhancePrompt } = useAI();
    const { success, error: showError } = useToast();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [previewAsset, setPreviewAsset] = useState<AdminAssetRecord | null>(null);
    const referenceFileInputRef = useRef<HTMLInputElement>(null);

    // AI Generator State
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [style, setStyle] = useState('None');
    const [resolution, setResolution] = useState<'1K' | '2K' | '4K'>('2K');
    const [lighting, setLighting] = useState('None');
    const [cameraAngle, setCameraAngle] = useState('None');
    const [colorGrading, setColorGrading] = useState('None');
    const [depthOfField, setDepthOfField] = useState('None');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [referenceImages, setReferenceImages] = useState<string[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<AdminAssetCategory>('article');

    const [showKitManager, setShowKitManager] = useState(false);
    const [kitEnabled, setKitEnabled] = useState(true);
    const hasPreloadedKitRefs = useRef(false);

    const {
        kit,
        defaultReferences,
        defaultReferenceUrls,
        getContextualReferenceUrls,
        reload: reloadVisualKit,
    } = useVisualIdentityKit(ADMIN_VISUAL_KIT_PROJECT_ID);

    // Library State
    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState<AdminAssetCategory | 'all'>('all');
    const [sortBy, setSortBy] = useState<'date' | 'name' | 'size' | 'category'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Pagination
    const itemsPerPage = 24;
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        fetchAdminAssets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!showKitManager) {
            void reloadVisualKit();
        }
    }, [showKitManager, reloadVisualKit]);

    useEffect(() => {
        if (!kitEnabled || !kit || defaultReferenceUrls.length === 0 || hasPreloadedKitRefs.current) return;
        hasPreloadedKitRefs.current = true;
        setReferenceImages(prev => {
            const newRefs = defaultReferenceUrls.filter(url => !prev.includes(url));
            if (newRefs.length === 0) return prev;
            return [...prev, ...newRefs].slice(0, 14);
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kitEnabled, kit]);

    useEffect(() => {
        if (!kitEnabled) {
            hasPreloadedKitRefs.current = false;
        }
    }, [kitEnabled]);

    // Filtered and sorted assets
    const filteredAssets = useMemo(() => {
        let filtered = [...adminAssets];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(asset =>
                asset.name.toLowerCase().includes(query) ||
                asset.description?.toLowerCase().includes(query) ||
                asset.tags?.some(tag => tag.toLowerCase().includes(query))
            );
        }

        if (categoryFilter !== 'all') {
            filtered = filtered.filter(asset => asset.category === categoryFilter);
        }

        filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'date':
                    comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    break;
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'size':
                    comparison = (b.size || 0) - (a.size || 0);
                    break;
                case 'category':
                    comparison = a.category.localeCompare(b.category);
                    break;
            }
            return sortOrder === 'asc' ? -comparison : comparison;
        });

        return filtered;
    }, [adminAssets, searchQuery, categoryFilter, sortBy, sortOrder]);

    // Group by category
    const assetsByCategory = useMemo(() => {
        const grouped: Record<string, AdminAssetRecord[]> = {};
        filteredAssets.forEach(asset => {
            if (!grouped[asset.category]) {
                grouped[asset.category] = [];
            }
            grouped[asset.category].push(asset);
        });
        return grouped;
    }, [filteredAssets]);

    // Stats by category
    const categoryStats = useMemo(() => {
        const stats: Record<AdminAssetCategory, number> = {
            article: 0, component: 0, template: 0, hero: 0, icon: 0,
            background: 0, logo: 0, testimonial: 0, team: 0, product: 0, ai_generated: 0, other: 0,
        };
        adminAssets.forEach(asset => {
            stats[asset.category]++;
        });
        return stats;
    }, [adminAssets]);

    const categoryFilterOptions = useMemo<FilterChipOption<AdminAssetCategory | 'all'>[]>(() => [
        { id: 'all', label: t('common.all', 'All'), count: adminAssets.length, icon: <FolderOpen size={12} /> },
        ...Object.entries(CATEGORY_CONFIG)
            .filter(([key]) => categoryStats[key as AdminAssetCategory] > 0)
            .map(([key, config]) => ({
                id: key as AdminAssetCategory,
                label: config.label,
                count: categoryStats[key as AdminAssetCategory],
                icon: config.icon,
            })),
    ], [adminAssets.length, categoryStats, t]);

    // Reference images handlers
    const processFiles = (files: FileList | File[]) => {
        const remainingSlots = 14 - referenceImages.length;
        if (remainingSlots <= 0) {
            showError(t('adminAssets.maxReferences', 'Maximum 14 reference images'));
            return;
        }

        const filesToProcess = Array.from(files).slice(0, remainingSlots);
        filesToProcess.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setReferenceImages(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            }
        });
    };

    const handleReferenceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            processFiles(e.target.files);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(e.dataTransfer.files);
        }
    };

    const handleRemoveReferenceImage = (index: number) => {
        setReferenceImages(prev => prev.filter((_, i) => i !== index));
        if (referenceFileInputRef.current) {
            referenceFileInputRef.current.value = '';
        }
    };

    const handleUseAsReference = async (url: string) => {
        if (referenceImages.length >= 14) {
            showError(t('adminAssets.maxReferences', 'Maximum 14 reference images'));
            return;
        }
        
        try {
            // Convert URL to base64 if needed since proxy expects base64 data URLs
            let finalUrl = url;
            if (url.startsWith('http')) {
                const response = await fetch(url);
                const blob = await response.blob();
                finalUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            }

            if (referenceImages.includes(finalUrl)) {
                showError(t('adminAssets.alreadyReference', 'Image is already in references'));
                return;
            }
            
            setReferenceImages(prev => [...prev, finalUrl]);
            window.dispatchEvent(new CustomEvent('assets:add-reference-image', { detail: finalUrl }));
            success(t('adminAssets.addedReference', 'Added to reference images'));
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            console.error('Error preparing reference image:', error);
            showError(t('adminAssets.referenceError', 'Failed to prepare reference image'));
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        try {
            const allReferenceUrls = new Set(referenceImages);
            if (kitEnabled && kit) {
                const contextualUrls = getContextualReferenceUrls(prompt);
                contextualUrls.forEach(url => allReferenceUrls.add(url));
            }

            const activeKitRefs: VisualReference[] = kitEnabled && kit
                ? kit.references.filter(r => allReferenceUrls.has(r.imageUrl) && r.aiPromptHint)
                : [];
            const aiPromptHints = activeKitRefs.map(r => r.aiPromptHint!).filter(Boolean);

            const options = {
                aspectRatio,
                style,
                destination: 'admin' as const,
                adminCategory: selectedCategory,
                adminTags: [style, aspectRatio].filter(s => s !== 'None'),
                adminDescription: prompt,
                resolution,
                lighting: lighting !== 'None' ? lighting : undefined,
                cameraAngle: cameraAngle !== 'None' ? cameraAngle : undefined,
                colorGrading: colorGrading !== 'None' ? colorGrading : undefined,
                depthOfField: depthOfField !== 'None' ? depthOfField : undefined,
                referenceImages: allReferenceUrls.size > 0 ? Array.from(allReferenceUrls) : undefined,
                visualReferences: activeKitRefs.length > 0 ? activeKitRefs : undefined,
                aiPromptHints: aiPromptHints.length > 0 ? aiPromptHints : undefined,
            };

            const result = await generateImage(prompt, options);

            if (result && typeof result === 'string') {
                if (result.startsWith('data:image/')) {
                    const optionsWithMetadata = {
                        description: prompt,
                        tags: [style, aspectRatio].filter(s => s !== 'None'),
                        isAiGenerated: true,
                        aiPrompt: prompt
                    };
                    const response = await fetch(result);
                    const blob = await response.blob();
                    const file = new File([blob], `AI_${Date.now()}.png`, { type: blob.type });
                    await uploadAdminAsset(file, selectedCategory, optionsWithMetadata);
                } else {
                    // generateImage already saved it to Supabase admin_assets table
                    // We just need to refresh the local state
                    await fetchAdminAssets();
                }
            }

            success(t('adminAssets.generated', 'Image generated and saved!'));
            setPrompt('');
            if (kitEnabled && defaultReferenceUrls.length > 0) {
                setReferenceImages(defaultReferenceUrls.slice(0, 14));
            } else {
                setReferenceImages([]);
            }
            hasPreloadedKitRefs.current = true;
        } catch (error) {
            console.error(error);
            showError(t('adminAssets.generateError', 'Failed to generate image'));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleEnhancePrompt = async () => {
        if (!prompt.trim()) return;
        setIsEnhancing(true);
        try {
            const enhanced = await enhancePrompt(
                prompt,
                referenceImages.length > 0 ? referenceImages : undefined,
                {
                    usage: 'admin-asset',
                    destination: 'admin',
                    adminCategory: selectedCategory,
                    generationContext: selectedCategory === 'background' ? 'background' : 'general',
                    aspectRatio,
                    style,
                    lighting,
                    cameraAngle,
                    colorGrading,
                    depthOfField,
                }
            );
            setPrompt(enhanced);
            success(t('adminAssets.enhanced', 'Prompt enhanced!'));
        } catch (error) {
            console.error(error);
            showError(t('adminAssets.enhanceError', 'Failed to enhance prompt'));
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleFileUpload = async (file: File) => {
        try {
            await uploadAdminAsset(file, selectedCategory);
            success(`${file.name} ${t('adminAssets.uploadSuccess', 'uploaded to')} ${CATEGORY_CONFIG[selectedCategory].label}`);
        } catch (err) {
            showError(t('adminAssets.uploadError', 'Failed to upload file'));
        }
    };

    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return;
        setShowBulkDeleteModal(true);
    };

    const confirmBulkDelete = async () => {
        setShowBulkDeleteModal(false);
        try {
            const assetsToDelete = adminAssets.filter(a => selectedIds.has(a.id));
            await Promise.all(assetsToDelete.map(a => deleteAdminAsset(a.id, a.storagePath)));
            success(t('adminAssets.bulkDeleted', { count: selectedIds.size }));
            setSelectedIds(new Set());
            setIsSelectionMode(false);
        } catch (err) {
            showError(t('adminAssets.bulkDeleteError', 'Failed to delete some assets'));
        }
    };

    const handleCopyUrl = (url: string) => {
        navigator.clipboard.writeText(url);
        success(t('adminAssets.urlCopied', 'URL copied!'));
    };

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const selectAll = () => {
        if (selectedIds.size === filteredAssets.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredAssets.map(a => a.id)));
        }
    };

    const content = (
        <>
        <div className="flex-1 flex flex-col overflow-hidden relative h-full">
                {/* Header */}
 <header className="quimera-dashboard-header-bar h-14 px-2 sm:px-6 flex items-center z-20 sticky top-0">
                    <div className="flex items-center gap-1 sm:gap-4 flex-shrink-0">
                        {!noLayout && (
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="lg:hidden h-9 w-9 flex items-center justify-center text-q-text-muted hover:text-foreground hover:bg-secondary/80 rounded-xl transition-colors"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                        )}
                        <div className="flex items-center gap-1 sm:gap-2">
                            <FolderOpen className="w-5 h-5 quimera-dashboard-header-icon" strokeWidth={2} />
                            <h1 className="text-lg sm:text-xl font-bold text-foreground hidden sm:block">
                                {t('adminAssets.title', 'Admin Asset Library')}
                            </h1>
                        </div>
                        <span className="text-xs text-q-text-muted bg-secondary px-2 py-1 rounded-md">
                            {adminAssets.length} {t('adminAssets.assets', 'assets')}
                        </span>
                    </div>

                    <div className="flex-1" />

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setShowKitManager(!showKitManager)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                showKitManager
                                    ? 'bg-primary/10 text-primary border-primary/30'
                                    : 'bg-muted/50 text-muted-foreground border-border hover:text-foreground'
                            }`}
                        >
                            <Palette size={14} />
                            <span>{t('adminAssets.kitVisual', { defaultValue: 'Kit visual' })}</span>
                        </button>
                        {!noLayout && <HeaderBackButton onClick={onBack} label={t('common.back', 'Back')} />}
                    </div>
                </header>

                {/* Asset Preview Modal */}
                <Modal isOpen={!!previewAsset} onClose={() => setPreviewAsset(null)}>
                    {previewAsset && (
                        <AssetPreviewModal
                            asset={previewAsset}
                            onClose={() => setPreviewAsset(null)}
                            onUpdate={updateAdminAsset}
                            onDelete={deleteAdminAsset}
                        />
                    )}
                </Modal>

                <main className="flex-1 overflow-y-auto p-6 lg:p-8 relative z-[2]">
                    <div className="max-w-7xl mx-auto space-y-8">
                        {showKitManager ? (
                            <div className="bg-q-surface/80 border border-q-border rounded-2xl overflow-hidden min-h-[calc(100vh-10rem)]">
                                <VisualIdentityKitManager
                                    onBack={() => setShowKitManager(false)}
                                    projectId={ADMIN_VISUAL_KIT_PROJECT_ID}
                                    kitScope="admin"
                                />
                            </div>
                        ) : (
                        <>
                        <div className="bg-q-surface/80 border border-q-border rounded-2xl overflow-hidden">

                            {/* AI MEDIA GENERATOR */}
                            <div className="border-b border-q-border">
                                <div className="flex flex-col gap-3 border-b border-q-border/70 bg-q-bg/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <h2 className="text-sm font-bold text-q-text">{t('adminAssets.generator.title', 'AI Image Generator')}</h2>
                                        <p className="text-xs text-q-text-secondary">{t('adminAssets.generator.subtitle', 'Create stunning images for your app content')}</p>
                                    </div>
                                    <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-q-text-secondary">
                                        <span>{t('adminAssets.generator.category', 'Save to Category')}</span>
                                        <AppSelect
                                            value={selectedCategory}
                                            onChange={(e) => setSelectedCategory(e.target.value as AdminAssetCategory)}
                                            className="h-9 rounded-lg border border-q-border bg-q-surface px-3 text-xs font-semibold text-q-text focus:border-q-accent focus:outline-none"
                                        >
                                            {Object.entries(CATEGORY_CONFIG).map(([key, { label }]) => (
                                                <option key={key} value={key}>{label}</option>
                                            ))}
                                        </AppSelect>
                                    </label>
                                </div>
                                <MediaGeneratorPanel
                                    destination="admin"
                                    adminCategory={selectedCategory}
                                    projectId={ADMIN_VISUAL_KIT_PROJECT_ID}
                                    className="h-[680px]"
                                />
                            </div>

                            {/* ASSET LIBRARY SECTION */}
                            <div className="p-6">
                                {/* Header */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-base font-bold text-q-text-muted uppercase tracking-wider">
                                            {t('adminAssets.library', 'Asset Library')}
                                        </h2>
                                        {filteredAssets.length < adminAssets.length && (
                                            <span className="text-xs text-q-text-muted bg-secondary px-2 py-1 rounded-md">
                                                {filteredAssets.length} of {adminAssets.length}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                        {/* Search Bar - Desktop */}
                                        <div className="hidden sm:flex items-center gap-2 flex-1 sm:flex-initial sm:w-48 bg-secondary/40 rounded-lg px-3 py-1.5">
                                            <Search size={14} className="text-q-text-muted flex-shrink-0" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder={t('adminAssets.search', 'Search...')}
                                                className="flex-1 bg-transparent outline-none text-xs min-w-0"
                                            />
                                            {searchQuery && (
                                                <button onClick={() => setSearchQuery('')} className="text-q-text-muted hover:text-foreground flex-shrink-0">
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Mobile Search Button */}
                                        <button
                                            onClick={() => setIsMobileSearchOpen(true)}
                                            className="sm:hidden flex items-center justify-center px-3 py-1.5 text-xs font-bold transition-colors text-q-text-muted hover:text-foreground"
                                        >
                                            <Search size={14} />
                                        </button>

                                        <MobileSearchModal
                                            isOpen={isMobileSearchOpen}
                                            searchQuery={searchQuery}
                                            onSearchChange={setSearchQuery}
                                            onClose={() => setIsMobileSearchOpen(false)}
                                            placeholder={t('adminAssets.search', 'Search...')}
                                        />

                                        {/* Filter Toggle */}
                                        <button
                                            onClick={() => setShowFilters(!showFilters)}
                                            className={`flex items-center justify-center px-3 py-1.5 text-xs font-bold transition-colors ${showFilters ? 'text-primary' : 'text-q-text-muted hover:text-foreground'}`}
                                        >
                                            <Filter size={14} />
                                        </button>


                                        <button
                                            onClick={() => setIsSelectionMode(!isSelectionMode)}
                                            className={`flex items-center gap-1.5 h-9 px-3 text-sm font-medium transition-all ${isSelectionMode ? 'text-primary' : 'text-q-text-muted hover:text-foreground'}`}
                                        >
                                            <CheckSquare className="w-4 h-4" />
                                            {isSelectionMode && selectedIds.size > 0 && (
                                                <span>({selectedIds.size})</span>
                                            )}
                                        </button>

                                        {/* Upload */}
                                        <DragDropZone
                                            onFileSelect={handleFileUpload}
                                            accept="image/*"
                                            maxSizeMB={10}
                                            variant="compact"
                                        >
                                            <button className="flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-all text-q-text-muted hover:text-foreground hover:bg-secondary">
                                                <Upload className="w-4 h-4" />
                                                {t('common.upload', 'Upload')}
                                            </button>
                                        </DragDropZone>
                                    </div>
                                </div>

                                {/* Category Filter Chips */}
                                <FilterChipRow
                                    options={categoryFilterOptions}
                                    value={categoryFilter}
                                    onChange={(value) => setCategoryFilter(value as typeof categoryFilter)}
                                    className="mb-4"
                                />

                                {/* Filters Panel */}
                                {showFilters && (
                                    <div className="mb-4 p-4 bg-secondary/50 rounded-lg border border-q-border animate-fade-in-up">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-q-text-muted mb-2 uppercase">{t('adminAssets.sortBy', 'Sort By')}</label>
                                                <AppSelect
                                                    value={sortBy}
                                                    onChange={(e) => setSortBy(e.target.value as any)}
                                                    className="w-full px-3 py-1.5 text-xs bg-q-bg border border-q-border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                                                >
                                                    <option value="date">{t('adminAssets.date', 'Date')}</option>
                                                    <option value="name">{t('adminAssets.name', 'Name')}</option>
                                                    <option value="size">{t('adminAssets.size', 'Size')}</option>
                                                    <option value="category">{t('adminAssets.categoryLabel', 'Category')}</option>
                                                </AppSelect>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-q-text-muted mb-2 uppercase">{t('adminAssets.order', 'Order')}</label>
                                                <button
                                                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                                    className="w-full flex items-center justify-between px-3 py-1.5 text-xs bg-q-bg border border-q-border rounded-lg hover:bg-secondary transition-colors"
                                                >
                                                    <span>{sortOrder === 'asc' ? t('adminAssets.ascending', 'Ascending') : t('adminAssets.descending', 'Descending')}</span>
                                                    <ArrowUpDown size={14} />
                                                </button>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-q-text-muted mb-2 uppercase">{t('adminAssets.uploadTo', 'Upload to')}</label>
                                                <AppSelect
                                                    value={selectedCategory}
                                                    onChange={(e) => setSelectedCategory(e.target.value as AdminAssetCategory)}
                                                    className="w-full px-3 py-1.5 text-xs bg-q-bg border border-q-border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
                                                >
                                                    {Object.entries(CATEGORY_CONFIG).map(([key, { label }]) => (
                                                        <option key={key} value={key}>{label}</option>
                                                    ))}
                                                </AppSelect>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Bulk Actions */}
                                {isSelectionMode && selectedIds.size > 0 && (
                                    <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/30 flex items-center justify-between animate-fade-in-up">
                                        <span className="text-sm font-medium">{selectedIds.size} {t('adminAssets.selected', 'selected')}</span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={selectAll}
                                                className="px-3 py-1.5 text-xs font-bold bg-primary/20 hover:bg-primary/30 rounded-lg transition-colors"
                                            >
                                                {t('adminAssets.selectAll', 'Select All')}
                                            </button>
                                            <button
                                                onClick={handleBulkDelete}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={14} /> {t('common.delete', 'Delete')}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Assets Grid - Grouped by Category */}
                                <div className="max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
                                    {isAdminAssetsLoading ? (
                                        <div className="flex flex-col items-center justify-center py-8 text-q-text-muted">
                                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                                            <span className="text-xs">{t('common.loading', 'Loading...')}</span>
                                        </div>
                                    ) : Object.keys(assetsByCategory).length > 0 ? (
                                        <div className="space-y-6">
                                            {Object.entries(assetsByCategory).map(([categoryKey, categoryAssets]) => {
                                                if (categoryAssets.length === 0) return null;
                                                const config = CATEGORY_CONFIG[categoryKey as AdminAssetCategory];

                                                return (
                                                    <div key={categoryKey} className="space-y-3">
                                                        {/* Category Header */}
                                                        <div className="flex items-center gap-2 pb-2 border-b border-q-border/50">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${config.color}`}>
                                                                {config.icon}
                                                                {config.label}
                                                            </span>
                                                            <span className="text-xs text-q-text-muted">
                                                                {categoryAssets.length} {categoryAssets.length === 1 ? 'asset' : 'assets'}
                                                            </span>
                                                        </div>

                                                        {/* Category Assets Grid */}
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                                            {categoryAssets.map(asset => (
                                                                <div key={asset.id} className="h-full">
                                                                    <AssetItem
                                                                        asset={asset}
                                                                        onPreview={setPreviewAsset}
                                                                        isSelected={selectedIds.has(asset.id)}
                                                                        onToggleSelect={() => toggleSelection(asset.id)}
                                                                        isSelectionMode={isSelectionMode}
                                                                        onCopyUrl={handleCopyUrl}
                                                                        onUseAsReference={handleUseAsReference}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 px-4 border-2 border-dashed border-q-border rounded-xl bg-secondary/20">
                                            <ImageIcon size={32} className="mx-auto mb-2 text-q-text-muted opacity-50" />
                                            <p className="text-sm font-medium text-foreground mb-1">
                                                {searchQuery || categoryFilter !== 'all'
                                                    ? t('adminAssets.noResults', 'No assets found')
                                                    : t('adminAssets.empty', 'No assets yet')}
                                            </p>
                                            <p className="text-xs text-q-text-muted">
                                                {searchQuery || categoryFilter !== 'all'
                                                    ? t('adminAssets.tryFilters', 'Try adjusting your filters')
                                                    : t('adminAssets.startUploading', 'Generate your first image above to get started')}
                                            </p>
                                            {(searchQuery || categoryFilter !== 'all') && (
                                                <button
                                                    onClick={() => { setSearchQuery(''); setCategoryFilter('all'); }}
                                                    className="mt-3 text-sm text-primary hover:underline"
                                                >
                                                    {t('adminAssets.clearFilters', 'Clear filters')}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        </>
                        )}
                    </div>
                </main>
            </div>

            <ConfirmationModal
                isOpen={showBulkDeleteModal}
                onConfirm={confirmBulkDelete}
                onCancel={() => setShowBulkDeleteModal(false)}
                title={t('adminAssets.bulkDeleteTitle', '¿Eliminar assets?')}
                message={t('adminAssets.bulkDeleteConfirm', { count: selectedIds.size })}
                variant="danger"
            />
        </>
    );

    if (noLayout) {
        return content;
    }

    return (
        <div className="flex h-screen bg-q-bg text-foreground">
            <DashboardSidebar isMobileMenuOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
            {content}
        </div>
    );
};

export default AdminAssetLibrary;
