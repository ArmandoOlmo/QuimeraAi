/**
 * UnifiedMediaLibrary
 * Libreria unificada de medios — reemplaza AdminAssetLibrary + ImageLibraryManagement.
 * Sidebar con arbol de carpetas | Area central con gallery + filtros + generacion IA.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMedia } from '../../../contexts/media';
import { useToast } from '../../../contexts/ToastContext';
import { MEDIA_CATEGORIES, MEDIA_CATEGORY_MAP } from '../../../types/media';
import type { MediaCategory, MediaAssetRecord } from '../../../types/media';
import ConfirmationModal from '../../ui/ConfirmationModal';
import DragDropZone from '../../ui/DragDropZone';
import MediaGeneratorPanel from '../../media-generator/MediaGeneratorPanel';
import VisualIdentityKitManager from '../visual/VisualIdentityKitManager';
import HeaderBackButton from '../../ui/HeaderBackButton';
import { formatBytes, formatFileDate } from '../../../utils/fileHelpers';
import { ADMIN_VISUAL_KIT_PROJECT_ID } from '../../../constants/adminVisualKit';
import {
    Upload, Trash2, Download, Zap, Search, Filter, ArrowUpDown,
    CheckSquare, Square, ChevronLeft, ChevronRight, Sparkles, X,
    Copy, FolderOpen, Image as ImageIcon, Grid,
    Eye, HardDrive, Calendar, Loader2, Palette, Star, Menu,
    FileText, Layout, ShoppingBag, User, Wand2, Film,
} from 'lucide-react';
import { useAppContent } from '../../../contexts/appContent';
import AppSelect from '../../ui/AppSelect';

interface UnifiedMediaLibraryProps {
    onBack?: () => void;
}

const ITEMS_PER_PAGE = 30;

const UnifiedMediaLibrary: React.FC<UnifiedMediaLibraryProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const {
        mediaAssets, isMediaLoading, fetchMediaAssets, uploadMediaAsset,
        deleteMediaAsset,
    } = useMedia();
    const { success, error: showError } = useToast();
    const { articles } = useAppContent();

    useEffect(() => { fetchMediaAssets(); }, []);

    const [selectedFolder, setSelectedFolder] = useState<MediaCategory | 'all'>('all');
    const [previewAsset, setPreviewAsset] = useState<MediaAssetRecord | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [showGenerator, setShowGenerator] = useState(false);
    const [initialVideoStartFrame, setInitialVideoStartFrame] = useState<string | undefined>(undefined);
    const [showKitManager, setShowKitManager] = useState(false);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [uploadCategory, setUploadCategory] = useState<MediaCategory>('other');

    const processedAssets = useMemo(() => {
        let result = [...mediaAssets];
        if (selectedFolder !== 'all') result = result.filter(a => a.category === selectedFolder);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(a =>
                a.name.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q) || a.tags?.some(tag => tag.toLowerCase().includes(q))
            );
        }
        result.sort((a, b) => {
            let cmp = 0;
            switch (sortBy) {
                case 'date': cmp = new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime(); break;
                case 'name': cmp = a.name.localeCompare(b.name); break;
                case 'size': cmp = (b.size || 0) - (a.size || 0); break;
            }
            return sortOrder === 'asc' ? -cmp : cmp;
        });
        return result;
    }, [mediaAssets, selectedFolder, searchQuery, sortBy, sortOrder]);

    const totalPages = Math.ceil(processedAssets.length / ITEMS_PER_PAGE);
    const paginatedAssets = processedAssets.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    useEffect(() => { setCurrentPage(1); }, [selectedFolder, searchQuery]);

    const categoryStats = useMemo(() => {
        const stats: Record<string, number> = {};
        mediaAssets.forEach(a => { stats[a.category] = (stats[a.category] || 0) + 1; });
        return stats;
    }, [mediaAssets]);

    const folderLabels: Record<string, string> = {
        all: t('superadmin.media.folders.all', 'Todas'),
        brand: t('superadmin.media.folders.brand', 'Marca'),
        template: t('superadmin.media.folders.template', 'Templates'),
        article: t('superadmin.media.folders.article', 'Articulos'),
        hero: t('superadmin.media.folders.hero', 'Hero / Banner'),
        background: t('superadmin.media.folders.background', 'Fondos'),
        icon: t('superadmin.media.folders.icon', 'Iconos'),
        component: t('superadmin.media.folders.component', 'Componentes'),
        people: t('superadmin.media.folders.people', 'Personas'),
        product: t('superadmin.media.folders.product', 'Productos'),
        ai_generated: t('superadmin.media.folders.ai_generated', 'IA Generadas'),
        other: t('superadmin.media.folders.other', 'Otros'),
    };

    const handleUpload = async (file: File) => {
        try {
            await uploadMediaAsset(file, uploadCategory);
            success(t('superadmin.unifiedMedia.uploadedAsset', { name: file.name, category: folderLabels[uploadCategory] || uploadCategory }));
        } catch { showError(t('superadmin.unifiedMedia.errorUpload', 'Error al subir archivo')); }
    };

    const handleDelete = async (asset: MediaAssetRecord) => {
        if (asset.isSystemAsset) { showError(t('superadmin.media.systemAssetProtected', 'Los assets del sistema no se pueden eliminar')); return; }
        try {
            await deleteMediaAsset(asset.id, asset.storagePath || '');
            success(t('superadmin.unifiedMedia.deletedAsset', 'Asset eliminado'));
            setPreviewAsset(null);
        } catch { showError(t('superadmin.unifiedMedia.errorDelete', 'Error al eliminar')); }
    };

    const handleBulkDelete = async () => {
        setShowBulkDeleteModal(false);
        try {
            const toDelete = mediaAssets.filter(a => selectedIds.has(a.id) && !a.isSystemAsset);
            await Promise.all(toDelete.map(a => deleteMediaAsset(a.id, a.storagePath || '')));
            success(t('superadmin.unifiedMedia.bulkDeletedAssets', { count: toDelete.length }));
            setSelectedIds(new Set()); setIsSelectionMode(false);
        } catch { showError(t('superadmin.unifiedMedia.errorBulkDelete', 'Error al eliminar algunos assets')); }
    };

    const toggleSelect = (id: string) => setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
    const selectAll = () => setSelectedIds(new Set(paginatedAssets.map(a => a.id)));

    const handleCopyUrl = async (url: string) => { await navigator.clipboard.writeText(url); success(t('superadmin.unifiedMedia.copiedUrl', 'URL copiada')); };
    const handleUseAsReference = (url: string) => { window.dispatchEvent(new CustomEvent('assets:add-reference-image', { detail: url })); success(t('superadmin.unifiedMedia.referenceAdded', 'Agregado como referencia')); };
    const handleCreateVideo = (url: string) => {
        setInitialVideoStartFrame(url);
        setShowGenerator(true);
        window.setTimeout(() => {
            window.dispatchEvent(new CustomEvent('assets:create-video-from-image', {
                detail: { imageUrl: url, mode: 'start' },
            }));
        }, 0);
        success(t('mediaGeneration.createVideo', { defaultValue: 'Create video' }));
    };
    const getArticleName = (articleId: string) => { const article = articles.find(a => a.id === articleId); return article?.title || articleId; };

    const iconComponents: Record<string, React.ReactNode> = {
        Star: <Star size={16} />, Grid: <Grid size={16} />, FileText: <FileText size={16} />,
        ImageIcon: <ImageIcon size={16} />, Palette: <Palette size={16} />, Sparkles: <Sparkles size={16} />,
        Layout: <Layout size={16} />, User: <User size={16} />, ShoppingBag: <ShoppingBag size={16} />,
        Wand2: <Wand2 size={16} />, FolderOpen: <FolderOpen size={16} />,
    };

    return (
        <div className="flex min-h-0 flex-1 w-full bg-q-bg text-foreground">
            <aside className="w-56 flex-shrink-0 bg-q-surface border-r border-q-border hidden md:flex flex-col overflow-y-auto">
                <div className="p-4 border-b border-q-border">
                    <div className="flex items-center gap-2"><FolderOpen size={18} className="text-q-accent" /><h2 className="font-semibold text-sm">{t('superadmin.imageLibraryManagement.folders', 'Carpetas')}</h2></div>
                </div>
                <nav className="flex-1 p-2 space-y-1">
                    <button onClick={() => setSelectedFolder('all')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all ${selectedFolder === 'all' ? 'bg-q-accent text-q-bg font-semibold' : 'text-q-text-secondary hover:text-q-text hover:bg-q-surface-overlay/40'}`}>
                        <FolderOpen size={16} /><span className="truncate">{folderLabels.all} ({mediaAssets.length})</span>
                    </button>
                    {MEDIA_CATEGORIES.map(cat => {
                        const count = categoryStats[cat.id] || 0;
                        return (
                            <button key={cat.id} onClick={() => setSelectedFolder(cat.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all ${selectedFolder === cat.id ? 'bg-q-accent text-q-bg font-semibold' : 'text-q-text-secondary hover:text-q-text hover:bg-q-surface-overlay/40'}`}>
                                <span>{iconComponents[cat.icon] || <FolderOpen size={16} />}</span>
                                <span className="truncate">{folderLabels[cat.id] || cat.label}</span>
                                {count > 0 && <span className="ml-auto text-xs opacity-70">{count}</span>}
                            </button>
                        );
                    })}
                </nav>
                <div className="p-4 border-t border-q-border"><p className="text-xs text-q-text-secondary">{t('superadmin.unifiedMedia.fileCount', { count: mediaAssets.length })}</p></div>
            </aside>

            <div className="flex-1 flex min-h-0 flex-col overflow-hidden relative">
 <header className="quimera-dashboard-header-bar h-14 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
                    <div className="flex items-center gap-4">
                        <button onClick={() => {}} className="lg:hidden h-9 w-9 flex items-center justify-center text-q-text-muted hover:text-foreground hover:bg-muted rounded-lg transition-colors"><Menu className="w-5 h-5" /></button>
                        <div className="flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 quimera-dashboard-header-icon" strokeWidth={2} />
                            <h1 className="text-lg font-semibold">{t('superadmin.unifiedMedia.title', 'Libreria de Medios')}</h1>
                            <span className="text-xs text-q-text-muted bg-secondary px-2 py-1 rounded-md">{t('superadmin.unifiedMedia.assetsCount', { count: mediaAssets.length })}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowKitManager(!showKitManager)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${showKitManager ? 'bg-primary/10 text-primary border-primary/30' : 'bg-muted/50 text-muted-foreground border-border hover:text-foreground'}`}>
                            <Palette size={14} /><span>{t('superadmin.unifiedMedia.kitVisual', 'Kit Visual')}</span>
                        </button>
                        <HeaderBackButton onClick={onBack} />
                    </div>
                </header>

                <main className="relative z-[2] h-0 min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8">
                    <div className="mx-auto w-full max-w-7xl space-y-6">
                        {showKitManager ? (
                            <div className="overflow-hidden rounded-2xl border border-q-border bg-q-surface/80">
                                <VisualIdentityKitManager onBack={() => setShowKitManager(false)} projectId={ADMIN_VISUAL_KIT_PROJECT_ID} kitScope="admin" />
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-2xl border border-q-border bg-q-surface/80">
                                <div className="flex shrink-0 cursor-pointer items-center justify-between border-b border-q-border px-4 py-3 transition-colors hover:bg-muted/30" onClick={() => setShowGenerator(!showGenerator)}>
                                    <div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-primary/10 text-primary"><Sparkles size={18} /></div><span className="text-sm font-semibold">{t('editor.mediaGenerator', { defaultValue: 'Generador de Medios IA' })}</span></div>
                                    <span className={`text-q-text-muted transition-transform duration-200 ${showGenerator ? 'rotate-180' : ''}`}><ChevronRight size={18} className="rotate-90" /></span>
                                </div>
                                {showGenerator && <div className="shrink-0 border-b border-q-border"><MediaGeneratorPanel destination="admin" hideHeader projectId={ADMIN_VISUAL_KIT_PROJECT_ID} adminCategory={selectedFolder !== 'all' ? selectedFolder : 'ai_generated'} defaultMode={initialVideoStartFrame ? 'video' : 'image'} initialStartFrame={initialVideoStartFrame} /></div>}
                                <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-q-border p-4">
                                    <div className="flex items-center gap-2 flex-1 min-w-[150px] bg-secondary/40 rounded-lg px-3 py-1.5">
                                        <Search size={14} className="text-q-text-muted flex-shrink-0" />
                                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('superadmin.unifiedMedia.search', 'Buscar...')} className="flex-1 bg-transparent outline-none text-xs min-w-0" />
                                        {searchQuery && <button onClick={() => setSearchQuery('')} className="text-q-text-muted hover:text-foreground"><X size={14} /></button>}
                                    </div>
                                    <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${showFilters ? 'bg-primary/10 text-primary border-primary/30' : 'bg-muted/50 text-muted-foreground border-border hover:text-foreground'}`}><Filter size={14} /> {t('superadmin.media.filters', 'Filtros')}</button>
                                    <button onClick={() => { setIsSelectionMode(!isSelectionMode); if (isSelectionMode) setSelectedIds(new Set()); }} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${isSelectionMode ? 'bg-primary/10 text-primary border-primary/30' : 'bg-muted/50 text-muted-foreground border-border hover:text-foreground'}`}><CheckSquare size={14} />{isSelectionMode && selectedIds.size > 0 && ` (${selectedIds.size})`}</button>
                                    <AppSelect value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value as MediaCategory)} className="h-8 px-2 py-1 bg-q-surface border border-q-border rounded text-xs font-medium focus:outline-none focus:border-q-accent">{MEDIA_CATEGORIES.map(cat => (<option key={cat.id} value={cat.id}>{folderLabels[cat.id] || cat.label}</option>))}</AppSelect>
                                    <DragDropZone onFileSelect={handleUpload} accept="image/*" maxSizeMB={10} variant="compact"><button className="flex items-center gap-1.5 bg-q-accent text-q-bg px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 transition-colors whitespace-nowrap"><Upload size={14} /> {t('superadmin.unifiedMedia.upload', 'Subir')}</button></DragDropZone>
                                </div>
                                {showFilters && (
                                    <div className="grid shrink-0 animate-fade-in-up grid-cols-2 gap-4 border-b border-q-border bg-secondary/30 p-4 sm:grid-cols-3">
                                        <div><label className="block text-xs font-bold text-q-text-muted mb-2 uppercase">{t('superadmin.unifiedMedia.sortLabel', 'Ordenar por')}</label><AppSelect value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="w-full px-3 py-1.5 text-xs bg-q-bg border border-q-border rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"><option value="date">{t('superadmin.unifiedMedia.date', 'Fecha')}</option><option value="name">{t('superadmin.unifiedMedia.name', 'Nombre')}</option><option value="size">{t('superadmin.unifiedMedia.size', 'Tamano')}</option></AppSelect></div>
                                        <div><label className="block text-xs font-bold text-q-text-muted mb-2 uppercase">{t('superadmin.unifiedMedia.orderLabel', 'Orden')}</label><button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="w-full flex items-center justify-between px-3 py-1.5 text-xs bg-q-bg border border-q-border rounded-lg hover:bg-secondary transition-colors"><span>{sortOrder === 'asc' ? t('superadmin.unifiedMedia.ascending', 'Ascendente') : t('superadmin.unifiedMedia.descending', 'Descendente')}</span><ArrowUpDown size={14} /></button></div>
                                    </div>
                                )}
                                {isSelectionMode && selectedIds.size > 0 && (
                                    <div className="mx-4 mt-4 flex shrink-0 animate-fade-in-up items-center justify-between rounded-lg border border-primary/30 bg-primary/10 p-3">
                                        <span className="text-sm font-medium">{selectedIds.size} {t('superadmin.media.selected', 'seleccionados')}</span>
                                        <div className="flex gap-2"><button onClick={selectAll} className="px-3 py-1.5 text-xs font-bold bg-primary/20 hover:bg-primary/30 rounded-lg transition-colors">{t('superadmin.unifiedMedia.selectAll', 'Seleccionar todo')}</button><button onClick={() => setShowBulkDeleteModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors"><Trash2 size={14} /> {t('superadmin.unifiedMedia.delete', 'Eliminar')}</button></div>
                                    </div>
                                )}
                                <div className="p-4 md:p-6">
                                    {isMediaLoading ? (
                                        <div className="flex flex-col items-center justify-center py-12"><Loader2 className="w-8 h-8 text-q-accent animate-spin mb-3" /><span className="text-sm text-q-text-muted">{t('superadmin.unifiedMedia.loading', 'Cargando...')}</span></div>
                                    ) : processedAssets.length === 0 ? (
                                        <div className="text-center py-16 border-2 border-dashed border-q-border rounded-xl"><ImageIcon size={48} className="mx-auto mb-4 text-q-text-muted opacity-50" /><p className="text-sm font-medium text-foreground mb-1">{searchQuery ? t('superadmin.unifiedMedia.noResults', 'Sin resultados') : t('superadmin.unifiedMedia.noAssets', 'Sin assets')}</p><p className="text-xs text-q-text-muted">{searchQuery ? t('superadmin.unifiedMedia.adjustSearch', 'Ajusta tu busqueda') : t('superadmin.unifiedMedia.uploadOrGenerate', 'Sube o genera tu primera imagen')}</p></div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                            {paginatedAssets.map(asset => {
                                                const cfg = MEDIA_CATEGORY_MAP[asset.category];
                                                const isSelected = selectedIds.has(asset.id);
                                                const isVideoAsset = asset.type?.startsWith('video/');
                                                return (
                                                    <div key={asset.id} className={`rounded-xl transition-all duration-200 group relative overflow-hidden h-full ${isSelected ? 'ring-2 ring-q-accent' : ''} cursor-pointer`} onClick={() => { if (isSelectionMode) toggleSelect(asset.id); }} onDoubleClick={() => { if (!isSelectionMode) setPreviewAsset(asset); }}>
                                                        <div className="aspect-square w-full bg-secondary/30 relative overflow-hidden">
                                                            {isVideoAsset ? (
                                                                <video src={asset.downloadURL || asset.url} className="w-full h-full object-cover" muted playsInline />
                                                            ) : (
                                                                <img src={asset.downloadURL || asset.url} alt={asset.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                                                            )}
                                                            <div className="absolute top-2 left-2 z-10"><span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border backdrop-blur-sm ${cfg?.color || 'bg-gray-500/10 text-gray-500 border-gray-500/30'}`}>{cfg && iconComponents[cfg.icon]}</span></div>
                                                            {asset.isAiGenerated && <div className="absolute top-2 right-2 z-10"><span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-violet-500/80 text-white backdrop-blur-sm"><Sparkles size={10} /></span></div>}
                                                            {isSelectionMode && <div className="absolute top-2 right-2 z-10"><button onClick={(e) => { e.stopPropagation(); toggleSelect(asset.id); }} className="p-1.5 bg-white dark:bg-gray-800 rounded-md shadow-lg">{isSelected ? <CheckSquare size={18} className="text-q-accent" /> : <Square size={18} className="text-q-text-muted" />}</button></div>}
                                                            {!isSelectionMode && (
                                                                <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                                    {!isVideoAsset && (
                                                                        <button onClick={(e) => { e.stopPropagation(); handleUseAsReference(asset.downloadURL || asset.url); }} className="p-1.5 bg-violet-500 hover:bg-violet-600 text-white rounded-md shadow-lg transition-transform hover:scale-110" title={t('superadmin.unifiedMedia.useAsRef', 'Usar como referencia')}><Zap size={14} /></button>
                                                                    )}
                                                                    {!isVideoAsset && (
                                                                        <button onClick={(e) => { e.stopPropagation(); handleCreateVideo(asset.downloadURL || asset.url); }} className="p-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md shadow-lg transition-transform hover:scale-110" title={t('mediaGeneration.createVideo', { defaultValue: 'Create video' })}><Film size={14} /></button>
                                                                    )}
                                                                    <button onClick={(e) => { e.stopPropagation(); handleCopyUrl(asset.downloadURL); }} className="p-1.5 bg-primary hover:bg-primary/80 text-primary-foreground rounded-md shadow-lg transition-transform hover:scale-110" title={t('superadmin.unifiedMedia.copyUrl', 'Copiar URL')}><Copy size={14} /></button>
                                                                    <button onClick={(e) => { e.stopPropagation(); setPreviewAsset(asset); }} className="p-1.5 bg-white/90 text-gray-700 rounded-md shadow-lg transition-transform hover:scale-110" title={t('superadmin.unifiedMedia.viewDetails', 'Ver detalles')}><Eye size={14} /></button>
                                                                </div>
                                                            )}
                                                            {!isSelectionMode && <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity"><p className="text-white text-xs font-medium truncate">{asset.name}</p><p className="text-white/70 text-[10px] mt-0.5">{formatBytes(asset.size)}</p></div>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {totalPages > 1 && (
                                        <div className="mt-6 flex items-center justify-between border-t border-q-border pt-4">
                                            <span className="text-xs text-q-text-muted">{t('superadmin.unifiedMedia.pageOf', { current: currentPage, total: totalPages })} ({processedAssets.length} assets)</span>
                                            <div className="flex gap-2">
                                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-q-surface hover:bg-q-surface-overlay disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={14} /> {t('superadmin.unifiedMedia.previous', 'Anterior')}</button>
                                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-q-surface hover:bg-q-surface-overlay disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{t('superadmin.unifiedMedia.next', 'Siguiente')} <ChevronRight size={14} /></button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {previewAsset && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setPreviewAsset(null)}>
                    <div className="bg-q-bg border border-q-border rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-q-border flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${MEDIA_CATEGORY_MAP[previewAsset.category]?.color || ''}`}>{iconComponents[MEDIA_CATEGORY_MAP[previewAsset.category]?.icon || 'FolderOpen']}{folderLabels[previewAsset.category] || MEDIA_CATEGORY_MAP[previewAsset.category]?.label}</span>
                                <h3 className="font-bold text-lg truncate max-w-[300px]">{previewAsset.name}</h3>
                                {previewAsset.isAiGenerated && <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30"><Sparkles size={10} /> AI</span>}
                            </div>
                            <button onClick={() => setPreviewAsset(null)} className="p-2 rounded-full hover:bg-secondary text-q-text-muted hover:text-foreground transition-colors"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <div className="flex-1 bg-black/90 flex items-center justify-center relative min-h-[300px]">
                                {!previewAsset.type?.startsWith('video/') && (
                                    <div className="absolute inset-0 opacity-30 blur-3xl scale-110" style={{ backgroundImage: `url(${previewAsset.downloadURL})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                                )}
                                {previewAsset.type?.startsWith('video/') ? (
                                    <video src={previewAsset.downloadURL} controls className="relative z-10 max-h-[520px] max-w-full" />
                                ) : (
                                    <img src={previewAsset.downloadURL} alt={previewAsset.name} className="max-w-full max-h-[400px] object-contain shadow-2xl relative z-10" />
                                )}
                            </div>
                            <div className="p-4 border-t border-q-border">
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    <div className="bg-q-bg border border-q-border rounded-lg p-3"><div className="flex items-center gap-1.5 mb-1"><HardDrive size={12} className="text-q-text-muted" /><span className="text-[10px] text-q-text-muted uppercase">{t('superadmin.unifiedMedia.size', 'Tamano')}</span></div><p className="text-sm font-medium">{formatBytes(previewAsset.size)}</p></div>
                                    <div className="bg-q-bg border border-q-border rounded-lg p-3"><div className="flex items-center gap-1.5 mb-1"><Calendar size={12} className="text-q-text-muted" /><span className="text-[10px] text-q-text-muted uppercase">{t('superadmin.unifiedMedia.date', 'Fecha')}</span></div><p className="text-sm font-medium">{formatFileDate(previewAsset.createdAt)}</p></div>
                                    <div className="bg-q-bg border border-q-border rounded-lg p-3"><div className="flex items-center gap-1.5 mb-1"><Grid size={12} className="text-q-text-muted" /><span className="text-[10px] text-q-text-muted uppercase">{t('superadmin.unifiedMedia.type', 'Tipo')}</span></div><p className="text-sm font-medium">{previewAsset.type?.split('/')[1]?.toUpperCase() || 'Unknown'}</p></div>
                                </div>
                                {previewAsset.description && <div className="mb-3"><label className="block text-xs font-bold text-q-text-muted mb-1 uppercase">{t('superadmin.unifiedMedia.description', 'Descripcion')}</label><p className="text-sm text-foreground bg-q-bg p-3 rounded-lg border border-q-border">{previewAsset.description}</p></div>}
                                {previewAsset.tags && previewAsset.tags.length > 0 && <div className="mb-3"><label className="block text-xs font-bold text-q-text-muted mb-1 uppercase">{t('superadmin.unifiedMedia.tags', 'Etiquetas')}</label><div className="flex flex-wrap gap-1.5">{previewAsset.tags.map(tag => (<span key={tag} className="px-2 py-0.5 text-[10px] font-medium bg-secondary rounded-full">{tag}</span>))}</div></div>}
                                {previewAsset.aiPrompt && <div className="mb-3 bg-violet-500/10 p-3 rounded-lg border border-violet-500/30"><div className="flex items-center mb-2"><Sparkles size={14} className="text-violet-400 mr-2" /><span className="text-xs font-bold text-violet-400 uppercase">{t('superadmin.unifiedMedia.aiPrompt', 'Prompt IA')}</span></div><p className="text-sm text-foreground">{previewAsset.aiPrompt}</p></div>}
                                {previewAsset.usedIn && previewAsset.usedIn.length > 0 && <div className="mb-3 bg-blue-500/10 p-3 rounded-lg border border-blue-500/30"><div className="flex items-center mb-2"><FolderOpen size={14} className="text-blue-400 mr-2" /><span className="text-xs font-bold text-blue-400 uppercase">{t('superadmin.unifiedMedia.usedIn', 'Usado en')}</span></div><div className="flex flex-wrap gap-2">{previewAsset.usedIn.map(entry => (<span key={entry} className="px-2 py-1 text-xs bg-blue-500/10 text-blue-400 rounded-full">{getArticleName(entry)}</span>))}</div></div>}
                                <div className="flex gap-2 pt-3 border-t border-q-border">
                                    <a href={previewAsset.downloadURL} download={previewAsset.name} className="flex items-center gap-2 px-4 py-2 bg-q-accent text-q-bg rounded-lg text-sm font-bold hover:opacity-90 transition-colors"><Download size={16} /> {t('superadmin.unifiedMedia.download', 'Descargar')}</a>
                                    <button onClick={() => handleCopyUrl(previewAsset.downloadURL)} className="flex items-center gap-2 px-4 py-2 bg-q-bg border border-q-border rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"><Copy size={16} /> {t('superadmin.unifiedMedia.copyUrl', 'Copiar URL')}</button>
                                    {!previewAsset.isSystemAsset && <button onClick={() => handleDelete(previewAsset)} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-500 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors ml-auto"><Trash2 size={16} /> {t('superadmin.unifiedMedia.delete', 'Eliminar')}</button>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal isOpen={showBulkDeleteModal} onConfirm={handleBulkDelete} onCancel={() => setShowBulkDeleteModal(false)}
                title={t('superadmin.media.deleteBulkTitle', 'Eliminar assets?')}
                message={t('superadmin.media.deleteBulkConfirm', { count: selectedIds.size, defaultValue: `Eliminar ${selectedIds.size} asset(s)?` })}
                variant="danger" />
        </div>
    );
};

export default UnifiedMediaLibrary;
