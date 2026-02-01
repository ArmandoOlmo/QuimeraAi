/**
 * NewsEditor
 * Editor de Noticias y Novedades para Super Admin
 * Usa TipTap como editor de texto enriquecido
 * Soporta generación de imágenes con IA y upload de media
 */

import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import '../../cms/modern/editor-styles.css';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Placeholder } from '@tiptap/extension-placeholder';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { Highlight } from '@tiptap/extension-highlight';

import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useNews } from '../../../contexts/news';
import { useToast } from '../../../contexts/ToastContext';
import { useFiles } from '../../../contexts/files';
import { useAI } from '../../../contexts/ai';
import {
    NewsItem,
    NewsStatus,
    NewsCategory,
    NewsTargetType,
    NEWS_CATEGORY_LABELS,
    NEWS_STATUS_LABELS,
    DEFAULT_NEWS_ITEM,
    DEFAULT_NEWS_TARGETING,
} from '../../../types/news';
import {
    ArrowLeft,
    Save,
    Loader2,
    Image as ImageIcon,
    Video,
    Link as LinkIcon,
    Star,
    Tag,
    Calendar,
    Users,
    Target,
    Eye,
    Send,
    Sparkles,
    Upload,
    X,
    Plus,
    Trash2,
    Globe,
    ChevronDown,
    ExternalLink,
    Clock,
    AlertCircle,
} from 'lucide-react';

import DashboardSidebar from '../DashboardSidebar';
import EditorMenuBar from '../../cms/modern/EditorMenuBar';
import EditorBubbleMenu from '../../cms/modern/EditorBubbleMenu';
import ImageGeneratorModal from '../../ui/ImageGeneratorModal';

interface NewsEditorProps {
    news: NewsItem | null;
    onClose: () => void;
}

const NewsEditor: React.FC<NewsEditorProps> = ({ news, onClose }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { createNews, updateNews } = useNews();
    const { showToast } = useToast();
    const { uploadAdminAsset } = useFiles();
    const { generateImage } = useAI();

    const isEditing = !!news;

    // Form State
    const [title, setTitle] = useState(news?.title || '');
    const [excerpt, setExcerpt] = useState(news?.excerpt || '');
    const [imageUrl, setImageUrl] = useState(news?.imageUrl || '');
    const [videoUrl, setVideoUrl] = useState(news?.videoUrl || '');
    const [category, setCategory] = useState<NewsCategory>(news?.category || 'update');
    const [tags, setTags] = useState<string[]>(news?.tags || []);
    const [tagInput, setTagInput] = useState('');
    const [status, setStatus] = useState<NewsStatus>(news?.status || 'draft');
    const [featured, setFeatured] = useState(news?.featured || false);
    const [priority, setPriority] = useState(news?.priority || 0);

    // CTA State
    const [ctaLabel, setCtaLabel] = useState(news?.cta?.label || '');
    const [ctaUrl, setCtaUrl] = useState(news?.cta?.url || '');
    const [ctaExternal, setCtaExternal] = useState(news?.cta?.isExternal || false);

    // Scheduling State
    const [publishAt, setPublishAt] = useState(news?.publishAt || '');
    const [expireAt, setExpireAt] = useState(news?.expireAt || '');

    // Targeting State
    const [targetType, setTargetType] = useState<NewsTargetType>(news?.targeting?.type || 'all');
    const [targetRoles, setTargetRoles] = useState<string[]>(news?.targeting?.roles || []);
    const [targetPlans, setTargetPlans] = useState<string[]>(news?.targeting?.plans || []);

    // UI State
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showImageGenerator, setShowImageGenerator] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [activeTab, setActiveTab] = useState<'content' | 'settings' | 'targeting'>('content');

    const imageInputRef = useRef<HTMLInputElement>(null);
    const contentImageInputRef = useRef<HTMLInputElement>(null);

    // TipTap Editor
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
            }),
            Image.configure({
                HTMLAttributes: {
                    class: 'rounded-lg max-w-full my-4 shadow-md',
                },
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-500 underline hover:text-blue-600 cursor-pointer',
                },
            }),
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            Placeholder.configure({
                placeholder: t('admin.news.editorPlaceholder', 'Escribe el contenido de la noticia... Usa "/" para comandos'),
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Underline,
        ],
        content: news?.body || '<p></p>',
        editorProps: {
            attributes: {
                class: 'prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[400px] px-6 py-4',
            },
        },
    });

    // Tag handlers
    const handleAddTag = () => {
        const tag = tagInput.trim();
        if (tag && !tags.includes(tag)) {
            setTags([...tags, tag]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    const handleTagKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    // Image upload handler
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isContent = false) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const url = await uploadAdminAsset(file, 'article', {
                description: `News image: ${title}`,
            });

            if (isContent && editor) {
                editor.chain().focus().setImage({ src: url }).run();
            } else {
                setImageUrl(url);
            }
            showToast(t('admin.news.imageUploaded', 'Imagen subida correctamente'), 'success');
        } catch (err: any) {
            showToast(err.message || t('admin.news.imageUploadError', 'Error al subir imagen'), 'error');
        }
    };

    // AI Image handler
    const handleAIImageGenerated = (url: string) => {
        setImageUrl(url);
        setShowImageGenerator(false);
    };

    // Link handler
    const handleSetLink = () => {
        if (linkUrl && editor) {
            editor.chain().focus().setLink({ href: linkUrl }).run();
        }
        setShowLinkModal(false);
        setLinkUrl('');
    };

    // AI Command handler
    const handleAICommand = async (command: string) => {
        // Placeholder for AI text improvements
        showToast(t('admin.news.aiFeatureComingSoon', 'Función IA próximamente'), 'info');
    };

    // Save handler
    const handleSave = async () => {
        if (!title.trim()) {
            showToast(t('admin.news.titleRequired', 'El título es requerido'), 'error');
            return;
        }

        setIsSaving(true);

        try {
            const newsData: Omit<NewsItem, 'id' | 'createdAt' | 'updatedAt' | 'views' | 'clicks'> = {
                title: title.trim(),
                excerpt: excerpt.trim(),
                body: editor?.getHTML() || '',
                imageUrl: imageUrl || undefined,
                videoUrl: videoUrl || undefined,
                category,
                tags,
                status,
                featured,
                priority,
                cta: ctaLabel && ctaUrl ? { label: ctaLabel, url: ctaUrl, isExternal: ctaExternal } : undefined,
                publishAt: publishAt || undefined,
                expireAt: expireAt || undefined,
                targeting: {
                    type: targetType,
                    roles: targetType === 'roles' ? targetRoles : undefined,
                    plans: targetType === 'plans' ? targetPlans : undefined,
                },
                createdBy: news?.createdBy || user?.uid || '',
            };

            if (isEditing && news) {
                await updateNews(news.id, newsData);
                showToast(t('admin.news.updated', 'Noticia actualizada'), 'success');
            } else {
                await createNews(newsData);
                showToast(t('admin.news.created', 'Noticia creada'), 'success');
            }

            onClose();
        } catch (err: any) {
            showToast(err.message || t('admin.news.saveError', 'Error al guardar'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Publish handler
    const handlePublish = async () => {
        setStatus('published');
        setTimeout(() => handleSave(), 100);
    };

    // Available roles and plans
    const ROLES = ['user', 'admin', 'superadmin', 'manager'];
    const PLANS = ['free', 'starter', 'pro', 'enterprise'];

    return (
        <div className="flex h-screen bg-editor-bg text-editor-text-primary">
            <DashboardSidebar
                isMobileOpen={isMobileSidebarOpen}
                onClose={() => setIsMobileSidebarOpen(false)}
            />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-14 bg-editor-bg border-b border-editor-border flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                            aria-label={t('common.back', 'Volver')}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-lg font-semibold">
                                {isEditing
                                    ? t('admin.news.editTitle', 'Editar Noticia')
                                    : t('admin.news.createTitle', 'Nueva Noticia')}
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {status !== 'published' && (
                            <button
                                onClick={handlePublish}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                            >
                                <Send size={16} />
                                <span className="hidden sm:inline">
                                    {t('admin.news.publish', 'Publicar')}
                                </span>
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-editor-accent text-editor-bg rounded-lg font-medium hover:bg-editor-accent/90 transition-colors disabled:opacity-50"
                        >
                            {isSaving ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Save size={16} />
                            )}
                            <span className="hidden sm:inline">
                                {t('common.save', 'Guardar')}
                            </span>
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Editor Panel */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Tabs */}
                        <div className="flex border-b border-editor-border bg-editor-panel-bg/50">
                            <button
                                onClick={() => setActiveTab('content')}
                                className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                                    activeTab === 'content'
                                        ? 'border-editor-accent text-editor-accent'
                                        : 'border-transparent text-editor-text-secondary hover:text-editor-text-primary'
                                }`}
                            >
                                {t('admin.news.tabContent', 'Contenido')}
                            </button>
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                                    activeTab === 'settings'
                                        ? 'border-editor-accent text-editor-accent'
                                        : 'border-transparent text-editor-text-secondary hover:text-editor-text-primary'
                                }`}
                            >
                                {t('admin.news.tabSettings', 'Configuración')}
                            </button>
                            <button
                                onClick={() => setActiveTab('targeting')}
                                className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                                    activeTab === 'targeting'
                                        ? 'border-editor-accent text-editor-accent'
                                        : 'border-transparent text-editor-text-secondary hover:text-editor-text-primary'
                                }`}
                            >
                                {t('admin.news.tabTargeting', 'Audiencia')}
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Content Tab */}
                            {activeTab === 'content' && (
                                <div className="max-w-4xl mx-auto space-y-6">
                                    {/* Title */}
                                    <div>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            placeholder={t('admin.news.titlePlaceholder', 'Título de la noticia')}
                                            className="w-full text-3xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-editor-text-secondary/50"
                                        />
                                    </div>

                                    {/* Excerpt */}
                                    <div>
                                        <textarea
                                            value={excerpt}
                                            onChange={e => setExcerpt(e.target.value.slice(0, 200))}
                                            placeholder={t('admin.news.excerptPlaceholder', 'Breve resumen (máx. 200 caracteres)')}
                                            rows={2}
                                            className="w-full bg-transparent border border-editor-border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-editor-accent resize-none"
                                        />
                                        <p className="text-xs text-editor-text-secondary mt-1 text-right">
                                            {excerpt.length}/200
                                        </p>
                                    </div>

                                    {/* Featured Image */}
                                    <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-4">
                                        <label className="flex items-center gap-2 text-sm font-medium mb-3">
                                            <ImageIcon size={16} />
                                            {t('admin.news.featuredImage', 'Imagen destacada')}
                                        </label>

                                        {imageUrl ? (
                                            <div className="relative group">
                                                <img
                                                    src={imageUrl}
                                                    alt="Featured"
                                                    className="w-full h-48 object-cover rounded-lg"
                                                />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                                                    <button
                                                        onClick={() => imageInputRef.current?.click()}
                                                        className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                                                    >
                                                        <Upload size={20} className="text-white" />
                                                    </button>
                                                    <button
                                                        onClick={() => setShowImageGenerator(true)}
                                                        className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                                                    >
                                                        <Sparkles size={20} className="text-white" />
                                                    </button>
                                                    <button
                                                        onClick={() => setImageUrl('')}
                                                        className="p-2 bg-red-500/50 rounded-lg hover:bg-red-500/70 transition-colors"
                                                    >
                                                        <Trash2 size={20} className="text-white" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => imageInputRef.current?.click()}
                                                    className="flex-1 flex items-center justify-center gap-2 h-32 border-2 border-dashed border-editor-border rounded-lg hover:border-editor-accent transition-colors"
                                                >
                                                    <Upload size={20} />
                                                    <span>{t('admin.news.uploadImage', 'Subir imagen')}</span>
                                                </button>
                                                <button
                                                    onClick={() => setShowImageGenerator(true)}
                                                    className="flex-1 flex items-center justify-center gap-2 h-32 border-2 border-dashed border-editor-accent/50 rounded-lg hover:border-editor-accent bg-editor-accent/5 transition-colors"
                                                >
                                                    <Sparkles size={20} className="text-editor-accent" />
                                                    <span className="text-editor-accent">
                                                        {t('admin.news.generateWithAI', 'Generar con IA')}
                                                    </span>
                                                </button>
                                            </div>
                                        )}
                                        <input
                                            ref={imageInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={e => handleImageUpload(e, false)}
                                            className="hidden"
                                        />
                                    </div>

                                    {/* Video URL */}
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-medium mb-2">
                                            <Video size={16} />
                                            {t('admin.news.videoUrl', 'Video (URL)')}
                                        </label>
                                        <input
                                            type="url"
                                            value={videoUrl}
                                            onChange={e => setVideoUrl(e.target.value)}
                                            placeholder="https://youtube.com/watch?v=... o https://vimeo.com/..."
                                            className="w-full bg-editor-bg border border-editor-border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                        />
                                    </div>

                                    {/* Rich Text Editor */}
                                    <div className="bg-editor-panel-bg border border-editor-border rounded-lg overflow-hidden">
                                        <EditorMenuBar
                                            editor={editor}
                                            onImageUpload={() => contentImageInputRef.current?.click()}
                                            onLinkClick={() => setShowLinkModal(true)}
                                        />
                                        <EditorBubbleMenu
                                            editor={editor}
                                            onAICommand={handleAICommand}
                                            onLinkClick={() => setShowLinkModal(true)}
                                        />
                                        <EditorContent editor={editor} />
                                        <input
                                            ref={contentImageInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={e => handleImageUpload(e, true)}
                                            className="hidden"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Settings Tab */}
                            {activeTab === 'settings' && (
                                <div className="max-w-2xl mx-auto space-y-6">
                                    {/* Status */}
                                    <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-4">
                                        <label className="block text-sm font-medium mb-3">
                                            {t('admin.news.status', 'Estado')}
                                        </label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {(Object.keys(NEWS_STATUS_LABELS) as NewsStatus[]).map(s => (
                                                <button
                                                    key={s}
                                                    onClick={() => setStatus(s)}
                                                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                                                        status === s
                                                            ? 'bg-editor-accent text-editor-bg border-editor-accent'
                                                            : 'bg-editor-bg border-editor-border hover:border-editor-accent'
                                                    }`}
                                                >
                                                    {t(`admin.news.status.${s}`, NEWS_STATUS_LABELS[s])}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Category */}
                                    <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-4">
                                        <label className="block text-sm font-medium mb-3">
                                            {t('admin.news.category', 'Categoría')}
                                        </label>
                                        <select
                                            value={category}
                                            onChange={e => setCategory(e.target.value as NewsCategory)}
                                            className="w-full bg-editor-bg border border-editor-border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                        >
                                            {(Object.keys(NEWS_CATEGORY_LABELS) as NewsCategory[]).map(c => (
                                                <option key={c} value={c}>
                                                    {t(`admin.news.category.${c}`, NEWS_CATEGORY_LABELS[c])}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Tags */}
                                    <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-4">
                                        <label className="flex items-center gap-2 text-sm font-medium mb-3">
                                            <Tag size={16} />
                                            {t('admin.news.tags', 'Etiquetas')}
                                        </label>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {tags.map(tag => (
                                                <span
                                                    key={tag}
                                                    className="flex items-center gap-1 px-2 py-1 bg-editor-accent/10 text-editor-accent rounded-full text-sm"
                                                >
                                                    {tag}
                                                    <button
                                                        onClick={() => handleRemoveTag(tag)}
                                                        className="hover:text-red-500 transition-colors"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={tagInput}
                                                onChange={e => setTagInput(e.target.value)}
                                                onKeyDown={handleTagKeyDown}
                                                placeholder={t('admin.news.addTag', 'Añadir etiqueta...')}
                                                className="flex-1 bg-editor-bg border border-editor-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                            />
                                            <button
                                                onClick={handleAddTag}
                                                className="px-4 py-2 bg-editor-accent text-editor-bg rounded-lg hover:bg-editor-accent/90 transition-colors"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Featured & Priority */}
                                    <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <label className="flex items-center gap-2 text-sm font-medium">
                                                <Star size={16} />
                                                {t('admin.news.featured', 'Destacada')}
                                            </label>
                                            <button
                                                onClick={() => setFeatured(!featured)}
                                                className={`relative w-12 h-6 rounded-full transition-colors ${
                                                    featured ? 'bg-editor-accent' : 'bg-editor-border'
                                                }`}
                                            >
                                                <div
                                                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                                        featured ? 'left-7' : 'left-1'
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">
                                                {t('admin.news.priority', 'Prioridad (orden)')}
                                            </label>
                                            <input
                                                type="number"
                                                value={priority}
                                                onChange={e => setPriority(parseInt(e.target.value) || 0)}
                                                min={0}
                                                max={100}
                                                className="w-32 bg-editor-bg border border-editor-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                            />
                                            <p className="text-xs text-editor-text-secondary mt-1">
                                                {t('admin.news.priorityHelp', 'Mayor número = aparece primero')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* CTA */}
                                    <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-4">
                                        <label className="flex items-center gap-2 text-sm font-medium mb-3">
                                            <LinkIcon size={16} />
                                            {t('admin.news.cta', 'Llamada a la acción (CTA)')}
                                        </label>
                                        <div className="space-y-3">
                                            <input
                                                type="text"
                                                value={ctaLabel}
                                                onChange={e => setCtaLabel(e.target.value)}
                                                placeholder={t('admin.news.ctaLabel', 'Texto del botón')}
                                                className="w-full bg-editor-bg border border-editor-border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                            />
                                            <input
                                                type="url"
                                                value={ctaUrl}
                                                onChange={e => setCtaUrl(e.target.value)}
                                                placeholder={t('admin.news.ctaUrl', 'URL del enlace')}
                                                className="w-full bg-editor-bg border border-editor-border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                            />
                                            <label className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={ctaExternal}
                                                    onChange={e => setCtaExternal(e.target.checked)}
                                                    className="rounded"
                                                />
                                                <ExternalLink size={14} />
                                                {t('admin.news.ctaExternal', 'Abrir en nueva pestaña')}
                                            </label>
                                        </div>
                                    </div>

                                    {/* Scheduling */}
                                    <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-4">
                                        <label className="flex items-center gap-2 text-sm font-medium mb-3">
                                            <Calendar size={16} />
                                            {t('admin.news.scheduling', 'Programación')}
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs text-editor-text-secondary mb-1">
                                                    {t('admin.news.publishAt', 'Publicar en')}
                                                </label>
                                                <input
                                                    type="datetime-local"
                                                    value={publishAt}
                                                    onChange={e => setPublishAt(e.target.value)}
                                                    className="w-full bg-editor-bg border border-editor-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-editor-text-secondary mb-1">
                                                    {t('admin.news.expireAt', 'Expira en')}
                                                </label>
                                                <input
                                                    type="datetime-local"
                                                    value={expireAt}
                                                    onChange={e => setExpireAt(e.target.value)}
                                                    className="w-full bg-editor-bg border border-editor-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Targeting Tab */}
                            {activeTab === 'targeting' && (
                                <div className="max-w-2xl mx-auto space-y-6">
                                    {/* Target Type */}
                                    <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-4">
                                        <label className="flex items-center gap-2 text-sm font-medium mb-3">
                                            <Target size={16} />
                                            {t('admin.news.targetType', 'Mostrar a')}
                                        </label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {(['all', 'roles', 'plans', 'tenants'] as NewsTargetType[]).map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => setTargetType(type)}
                                                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                                                        targetType === type
                                                            ? 'bg-editor-accent text-editor-bg border-editor-accent'
                                                            : 'bg-editor-bg border-editor-border hover:border-editor-accent'
                                                    }`}
                                                >
                                                    {type === 'all' && t('admin.news.targetAll', 'Todos')}
                                                    {type === 'roles' && t('admin.news.targetRoles', 'Por Rol')}
                                                    {type === 'plans' && t('admin.news.targetPlans', 'Por Plan')}
                                                    {type === 'tenants' && t('admin.news.targetTenants', 'Por Tenant')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Roles Selection */}
                                    {targetType === 'roles' && (
                                        <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-4">
                                            <label className="flex items-center gap-2 text-sm font-medium mb-3">
                                                <Users size={16} />
                                                {t('admin.news.selectRoles', 'Seleccionar roles')}
                                            </label>
                                            <div className="space-y-2">
                                                {ROLES.map(role => (
                                                    <label key={role} className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={targetRoles.includes(role)}
                                                            onChange={e => {
                                                                if (e.target.checked) {
                                                                    setTargetRoles([...targetRoles, role]);
                                                                } else {
                                                                    setTargetRoles(targetRoles.filter(r => r !== role));
                                                                }
                                                            }}
                                                            className="rounded"
                                                        />
                                                        <span className="capitalize">{role}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Plans Selection */}
                                    {targetType === 'plans' && (
                                        <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-4">
                                            <label className="flex items-center gap-2 text-sm font-medium mb-3">
                                                <Globe size={16} />
                                                {t('admin.news.selectPlans', 'Seleccionar planes')}
                                            </label>
                                            <div className="space-y-2">
                                                {PLANS.map(plan => (
                                                    <label key={plan} className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={targetPlans.includes(plan)}
                                                            onChange={e => {
                                                                if (e.target.checked) {
                                                                    setTargetPlans([...targetPlans, plan]);
                                                                } else {
                                                                    setTargetPlans(targetPlans.filter(p => p !== plan));
                                                                }
                                                            }}
                                                            className="rounded"
                                                        />
                                                        <span className="capitalize">{plan}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Info Box */}
                                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
                                        <AlertCircle className="text-blue-500 flex-shrink-0 mt-0.5" size={18} />
                                        <div>
                                            <p className="text-sm text-blue-500 font-medium mb-1">
                                                {t('admin.news.targetingInfo', 'Sobre la audiencia')}
                                            </p>
                                            <p className="text-xs text-editor-text-secondary">
                                                {t(
                                                    'admin.news.targetingInfoDesc',
                                                    'La noticia solo se mostrará a los usuarios que cumplan con los criterios seleccionados. Si seleccionas "Todos", la noticia será visible para todos los usuarios.'
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Preview Panel (Desktop) */}
                    <div className="hidden lg:block w-80 border-l border-editor-border bg-editor-panel-bg/50 overflow-y-auto">
                        <div className="p-4">
                            <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                                <Eye size={16} />
                                {t('admin.news.preview', 'Vista previa')}
                            </h3>

                            {/* Preview Card */}
                            <div className="bg-editor-bg border border-editor-border rounded-lg overflow-hidden">
                                {imageUrl ? (
                                    <img
                                        src={imageUrl}
                                        alt="Preview"
                                        className="w-full h-32 object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-32 bg-editor-border flex items-center justify-center">
                                        <ImageIcon size={32} className="text-editor-text-secondary" />
                                    </div>
                                )}
                                <div className="p-4">
                                    {featured && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 text-yellow-500 rounded-full text-xs mb-2">
                                            <Star size={12} className="fill-yellow-500" />
                                            {t('admin.news.featuredBadge', 'Destacado')}
                                        </span>
                                    )}
                                    <h4 className="font-semibold text-sm mb-1 line-clamp-2">
                                        {title || t('admin.news.untitled', 'Sin título')}
                                    </h4>
                                    <p className="text-xs text-editor-text-secondary line-clamp-3 mb-3">
                                        {excerpt || t('admin.news.noExcerpt', 'Sin resumen')}
                                    </p>
                                    {ctaLabel && ctaUrl && (
                                        <button className="w-full px-3 py-2 bg-editor-accent text-editor-bg rounded-lg text-xs font-medium">
                                            {ctaLabel}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Link Modal */}
            {showLinkModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-editor-panel-bg border border-editor-border rounded-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold mb-4">
                            {t('admin.news.addLink', 'Añadir enlace')}
                        </h3>
                        <input
                            type="url"
                            value={linkUrl}
                            onChange={e => setLinkUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-editor-bg border border-editor-border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-editor-accent mb-4"
                            autoFocus
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowLinkModal(false);
                                    setLinkUrl('');
                                }}
                                className="px-4 py-2 border border-editor-border rounded-lg hover:bg-editor-border transition-colors"
                            >
                                {t('common.cancel', 'Cancelar')}
                            </button>
                            <button
                                onClick={handleSetLink}
                                className="px-4 py-2 bg-editor-accent text-editor-bg rounded-lg hover:bg-editor-accent/90 transition-colors"
                            >
                                {t('admin.news.insertLink', 'Insertar')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Image Generator Modal */}
            {showImageGenerator && (
                <ImageGeneratorModal
                    isOpen={showImageGenerator}
                    onClose={() => setShowImageGenerator(false)}
                    onSelectImage={handleAIImageGenerated}
                    destination="global"
                />
            )}
        </div>
    );
};

export default NewsEditor;
