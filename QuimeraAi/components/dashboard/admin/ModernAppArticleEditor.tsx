/**
 * ModernAppArticleEditor
 * Editor moderno de artículos para la App Quimera (Super Admin)
 * Idéntico al ModernCMSEditor del usuario pero para AppArticle
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
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { Highlight } from '@tiptap/extension-highlight';

import { useAuth } from '../../../contexts/core/AuthContext';
import { useAppContent } from '../../../contexts/appContent';
import { useAdmin } from '../../../contexts/admin';
import { useToast } from '../../../contexts/ToastContext';
import { useFiles } from '../../../contexts/files';
import { AppArticle, AppArticleCategory } from '../../../types/appContent';
import {
    ArrowLeft, Save, Globe, Type, Loader2, Sparkles,
    MoreVertical, Calendar, Check, X as XIcon, Link as LinkIcon,
    Star, Tag, User
} from 'lucide-react';

import EditorMenuBar from '../../cms/modern/EditorMenuBar';
import EditorBubbleMenu from '../../cms/modern/EditorBubbleMenu';
import SlashCommands from '../../cms/modern/SlashCommands';
import ImagePicker from '../../ui/ImagePicker';
import { generateContentViaProxy, extractTextFromResponse } from '../../../utils/geminiProxyClient';
import SimpleEditorHeader from '../../SimpleEditorHeader';
import DashboardSidebar from '../DashboardSidebar';
import { logApiCall } from '../../../services/apiLoggingService';

interface ModernAppArticleEditorProps {
    article: AppArticle | null;
    onClose: () => void;
}

const CATEGORIES: { value: AppArticleCategory; label: string }[] = [
    { value: 'blog', label: 'Blog' },
    { value: 'news', label: 'News' },
    { value: 'tutorial', label: 'Tutorial' },
    { value: 'case-study', label: 'Case Study' },
    { value: 'announcement', label: 'Announcement' },
    { value: 'guide', label: 'Guide' },
    { value: 'update', label: 'Product Update' },
    { value: 'help', label: 'Help' },
];

const ModernAppArticleEditor: React.FC<ModernAppArticleEditorProps> = ({ article, onClose }) => {
    const { user } = useAuth();
    const { saveArticle, loadArticles } = useAppContent();
    const { getPrompt } = useAdmin();
    const { showToast } = useToast();
    const { uploadImageAndGetURL } = useFiles();

    // Form State
    const [title, setTitle] = useState(article?.title || '');
    const [slug, setSlug] = useState(article?.slug || '');
    const [status, setStatus] = useState<'draft' | 'published'>(article?.status || 'draft');
    const [excerpt, setExcerpt] = useState(article?.excerpt || '');
    const [featuredImage, setFeaturedImage] = useState(article?.featuredImage || '');
    const [category, setCategory] = useState<AppArticleCategory>(article?.category || 'blog');
    const [featured, setFeatured] = useState(article?.featured || false);
    const [tags, setTags] = useState<string[]>(article?.tags || []);
    const [tagInput, setTagInput] = useState('');
    const [author, setAuthor] = useState(article?.author || 'Quimera Team');
    const [showAuthor, setShowAuthor] = useState(article?.showAuthor !== false);
    const [showDate, setShowDate] = useState(article?.showDate !== false);
    const [publishedAt, setPublishedAt] = useState(article?.publishedAt || '');

    // SEO
    const [metaTitle, setMetaTitle] = useState(article?.seo?.metaTitle || '');
    const [metaDescription, setMetaDescription] = useState(article?.seo?.metaDescription || '');

    // Editor State
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isAiWorking, setIsAiWorking] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Link Modal
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');

    const contentFileInputRef = useRef<HTMLInputElement>(null);
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

    // TipTap Editor
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3]
                }
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
            Highlight.configure({
                multicolor: true
            }),
            Placeholder.configure({
                placeholder: 'Empieza a escribir algo increíble... Escribe "/" para comandos',
            }),
            Table.configure({
                resizable: true,
                HTMLAttributes: {
                    class: 'border-collapse table-auto w-full my-4'
                }
            }),
            TableRow,
            TableHeader.configure({
                HTMLAttributes: {
                    class: 'border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 p-2 font-bold'
                }
            }),
            TableCell.configure({
                HTMLAttributes: {
                    class: 'border border-gray-300 dark:border-gray-600 p-2'
                }
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Underline,
        ],
        content: article?.content || '<p></p>',
        editorProps: {
            attributes: {
                class: 'prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[600px] px-8 py-6',
            },
        },
        onUpdate: ({ editor }) => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
            autoSaveTimerRef.current = setTimeout(() => {
                handleAutoSave();
            }, 3000);
        }
    });

    // Slug Auto-generation
    useEffect(() => {
        if (!article?.slug && title && !slug) {
            setSlug(title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
        }
    }, [title]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, []);

    // --- Image Upload ---
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && editor) {
            try {
                const url = await uploadImageAndGetURL(file, 'app_content');
                editor.chain().focus().setImage({ src: url }).run();
            } catch (error) {
                console.error("Image upload failed", error);
                showToast("Error al subir la imagen", 'error');
            }
        }
    };

    const triggerImageUpload = () => {
        contentFileInputRef.current?.click();
    };

    // --- Tag Logic ---
    const handleAddTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    // --- Link Logic ---
    const openLinkModal = () => {
        const previousUrl = editor?.getAttributes('link').href || '';
        setLinkUrl(previousUrl);
        setShowLinkModal(true);
    };

    const applyLink = () => {
        if (linkUrl && editor) {
            editor.chain().focus().setLink({ href: linkUrl }).run();
        }
        setShowLinkModal(false);
        setLinkUrl('');
    };

    const removeLink = () => {
        editor?.chain().focus().unsetLink().run();
        setShowLinkModal(false);
        setLinkUrl('');
    };

    // --- Save Logic ---
    const handleAutoSave = async () => {
        if (!title || status !== 'draft') return;
        await performSave(true);
    };

    const handleSave = async () => {
        await performSave(false);
    };

    const performSave = async (isAutoSave: boolean = false) => {
        if (!title) {
            if (!isAutoSave) showToast("El título es requerido", 'error');
            return;
        }

        let finalSlug = slug.trim();
        if (!finalSlug) {
            finalSlug = title;
        }
        finalSlug = finalSlug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        setIsSaving(true);
        try {
            const currentContent = editor?.getHTML() || '';

            // Calculate read time (approx 200 words per minute)
            const wordCount = currentContent.replace(/<[^>]*>/g, '').split(/\s+/).length;
            const readTime = Math.max(1, Math.ceil(wordCount / 200));

            const articleData: AppArticle = {
                id: article?.id || '',
                title,
                slug: finalSlug,
                content: currentContent,
                excerpt,
                featuredImage,
                status,
                featured,
                category,
                tags,
                author,
                showAuthor,
                showDate,
                authorImage: article?.authorImage,
                readTime,
                views: article?.views || 0,
                createdAt: article?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                publishedAt: publishedAt || (status === 'published' && !article?.publishedAt ? new Date().toISOString() : article?.publishedAt),
                seo: {
                    metaTitle: metaTitle || title,
                    metaDescription: metaDescription || excerpt,
                    metaKeywords: tags,
                }
            };

            await saveArticle(articleData);
            setLastSaved(new Date());

            if (!isAutoSave) {
                showToast(status === 'published' ? '¡Artículo publicado!' : 'Artículo guardado', 'success');
                setTimeout(() => onClose(), 500);
            }
        } catch (error) {
            console.error(error);
            if (!isAutoSave) showToast("Error al guardar", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // --- AI Logic ---
    const handleAICommand = async (command: string) => {
        const selectedText = editor?.state.doc.textBetween(
            editor.state.selection.from,
            editor.state.selection.to,
            ' '
        );

        if (!selectedText && command !== 'continue') {
            showToast("Por favor selecciona texto primero", 'warning');
            return;
        }

        setIsAiWorking(true);
        let modelName = 'gemini-2.5-flash';

        try {
            let promptConfig;
            let populatedPrompt = "";

            if (command === 'continue') {
                const context = editor?.getText().slice(-1000) || title;
                promptConfig = getPrompt('cms-continue-writing');
                if (promptConfig) {
                    populatedPrompt = promptConfig.template.replace('{{context}}', context);
                    modelName = promptConfig.model;
                } else {
                    populatedPrompt = `Continue writing based on this context: ${context}`;
                }
            } else if (command === 'fix') {
                promptConfig = getPrompt('cms-fix-grammar');
                if (promptConfig) {
                    populatedPrompt = promptConfig.template.replace('{{text}}', selectedText || '');
                    modelName = promptConfig.model;
                } else {
                    populatedPrompt = `Fix grammar and spelling in this text: "${selectedText}"`;
                }
            } else if (command === 'improve') {
                promptConfig = getPrompt('cms-improve-text');
                if (promptConfig) {
                    populatedPrompt = promptConfig.template.replace('{{text}}', selectedText || '');
                    modelName = promptConfig.model;
                } else {
                    populatedPrompt = `Improve this text making it more clear and engaging: "${selectedText}"`;
                }
            }

            const response = await generateContentViaProxy('app-article-editor', populatedPrompt, modelName, {}, user?.uid);

            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: 'app-content-admin',
                    model: modelName,
                    feature: `app-article-${command}`,
                    success: true
                });
            }

            const result = extractTextFromResponse(response).trim();

            if (command === 'continue') {
                editor?.chain().focus().insertContent(result).run();
            } else {
                editor?.chain().focus().deleteSelection().insertContent(result).run();
            }

        } catch (error) {
            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: 'app-content-admin',
                    model: modelName,
                    feature: `app-article-${command}`,
                    success: false,
                    errorMessage: error instanceof Error ? error.message : 'Unknown error'
                });
            }
            showToast("Error al procesar con IA", 'error');
            console.error(error);
        } finally {
            setIsAiWorking(false);
        }
    };

    const generateSEO = async () => {
        setIsAiWorking(true);
        let modelName = 'gemini-2.5-flash';

        try {
            const contentPreview = editor?.getText().substring(0, 2000) || '';

            const promptConfig = getPrompt('cms-generate-seo');
            let populatedPrompt = "";

            if (promptConfig) {
                populatedPrompt = promptConfig.template
                    .replace('{{title}}', title)
                    .replace('{{content}}', contentPreview);
                modelName = promptConfig.model;
            } else {
                populatedPrompt = `Generate JSON { "seoTitle": "...", "seoDescription": "..." } for: ${title}. Content: ${contentPreview}. Return ONLY valid JSON.`;
            }

            const response = await generateContentViaProxy('app-article-seo', populatedPrompt, modelName, {}, user?.uid);
            let responseText = extractTextFromResponse(response);

            // Clean markdown code blocks if present
            if (responseText.startsWith('```json')) {
                responseText = responseText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
            } else if (responseText.startsWith('```')) {
                responseText = responseText.replace(/^```\n?/, '').replace(/\n?```$/, '');
            }

            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: 'app-content-admin',
                    model: modelName,
                    feature: 'app-article-generate-seo',
                    success: true
                });
            }

            const data = JSON.parse(responseText);
            setMetaTitle(data.seoTitle || data.metaTitle);
            setMetaDescription(data.seoDescription || data.metaDescription);
            showToast("SEO generado con éxito", 'success');
        } catch (error) {
            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: 'app-content-admin',
                    model: modelName,
                    feature: 'app-article-generate-seo',
                    success: false,
                    errorMessage: error instanceof Error ? error.message : 'Unknown error'
                });
            }
            showToast("Error al generar SEO", 'error');
            console.error(error);
        } finally {
            setIsAiWorking(false);
        }
    };

    return (
        <div className="flex h-screen bg-background text-foreground">
            {/* General App Sidebar - Collapsed by default */}
            <DashboardSidebar
                isMobileOpen={isMobileSidebarOpen}
                onClose={() => setIsMobileSidebarOpen(false)}
                defaultCollapsed={true}
            />

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 min-w-0">
                {/* Use the same SimpleEditorHeader as the rest of the app */}
                <SimpleEditorHeader showSaveButton={false} showPublishButton={false} />

                <input
                    type="file"
                    ref={contentFileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                    accept="image/*"
                />

                {/* Link Modal */}
                {showLinkModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-96">
                            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">Editar Enlace</h3>
                            <input
                                type="url"
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                placeholder="https://ejemplo.com"
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 mb-4 focus:ring-2 focus:ring-primary outline-none text-gray-900 dark:text-gray-100"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && applyLink()}
                            />
                            <div className="flex justify-between">
                                <button
                                    onClick={removeLink}
                                    className="text-sm text-red-500 hover:text-red-600 font-medium"
                                >
                                    Eliminar Enlace
                                </button>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowLinkModal(false)}
                                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-gray-900 dark:text-gray-100"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={applyLink}
                                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                                    >
                                        Aplicar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Editor Toolbar - Just below the main header */}
                <div className="h-14 border-b border-border bg-card flex items-center justify-between px-6 shrink-0 shadow-sm">
                    <div className="flex items-center gap-4 flex-1">
                        <button onClick={onClose} className="p-2 -ml-2 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div className="h-6 w-px bg-border"></div>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Título del artículo..."
                            className="bg-transparent text-xl font-bold placeholder:text-muted-foreground/50 focus:outline-none flex-1 text-foreground"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        {lastSaved && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Check size={12} className="text-green-500" />
                                Guardado {lastSaved.toLocaleTimeString()}
                            </span>
                        )}
                        <div className="flex items-center bg-secondary rounded-lg p-1 text-xs font-medium">
                            <button onClick={() => setStatus('draft')} className={`px-3 py-1.5 rounded-md transition-all ${status === 'draft' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Borrador</button>
                            <button onClick={() => setStatus('published')} className={`px-3 py-1.5 rounded-md transition-all ${status === 'published' ? 'bg-green-500/20 text-green-400' : 'text-muted-foreground hover:text-foreground'}`}>Publicado</button>
                        </div>
                        <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-md">
                            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Guardar
                        </button>
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-2 rounded-lg transition-colors ${isSidebarOpen ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-secondary'}`}>
                            <MoreVertical size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Main Editor */}
                    <div className="flex-1 flex flex-col min-w-0 bg-muted/30">
                        <EditorMenuBar
                            editor={editor}
                            onImageUpload={triggerImageUpload}
                            onAICommand={handleAICommand}
                            isAiWorking={isAiWorking}
                        />

                        <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-background">
                            <div className="w-full max-w-[900px] min-h-[800px]">
                                <EditorContent editor={editor} />
                                <EditorBubbleMenu
                                    editor={editor}
                                    onAICommand={handleAICommand}
                                    onLinkClick={openLinkModal}
                                />
                                <SlashCommands
                                    editor={editor}
                                    onImageUpload={triggerImageUpload}
                                    onAICommand={handleAICommand}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Settings Sidebar (Right) */}
                    {isSidebarOpen && (
                        <aside className="w-80 bg-card border-l border-border overflow-y-auto p-6 shrink-0 shadow-xl">
                            <div className="mb-6">
                                <h3 className="font-bold text-lg mb-1 flex items-center"><Type className="mr-2 text-primary" /> Configuración</h3>
                                <p className="text-xs text-muted-foreground">Configura metadata y apariencia del artículo.</p>
                            </div>

                            <div className="space-y-6">
                                {/* URL Slug */}
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">URL Slug</label>
                                    <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground" />
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Categoría</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value as AppArticleCategory)}
                                        className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground"
                                    >
                                        {CATEGORIES.map(cat => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Featured Image */}
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Imagen Destacada</label>
                                    <ImagePicker label="" value={featuredImage} onChange={setFeaturedImage} />
                                </div>

                                {/* Excerpt */}
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Extracto</label>
                                    <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={4} className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none resize-none text-foreground" placeholder="Resumen corto para listados..." />
                                </div>

                                {/* Author */}
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Autor</label>
                                    <input value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground" />
                                </div>

                                {/* Publication Date */}
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Fecha de Publicación</label>
                                    <input
                                        type="datetime-local"
                                        value={publishedAt ? new Date(publishedAt).toISOString().slice(0, 16) : ''}
                                        onChange={(e) => setPublishedAt(e.target.value ? new Date(e.target.value).toISOString() : '')}
                                        className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground"
                                    />
                                </div>

                                {/* Show Author Toggle */}
                                <div className="flex items-center justify-between p-3 bg-secondary/30 border border-border rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <User size={14} className="text-muted-foreground" />
                                        <span className="text-sm font-medium">Mostrar Autor</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showAuthor}
                                            onChange={(e) => setShowAuthor(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                    </label>
                                </div>

                                {/* Show Date Toggle */}
                                <div className="flex items-center justify-between p-3 bg-secondary/30 border border-border rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-muted-foreground" />
                                        <span className="text-sm font-medium">Mostrar Fecha</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showDate}
                                            onChange={(e) => setShowDate(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                    </label>
                                </div>

                                {/* Tags */}
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Tags</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {tags.map(tag => (
                                            <span
                                                key={tag}
                                                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-secondary rounded-full"
                                            >
                                                <Tag size={10} />
                                                {tag}
                                                <button
                                                    onClick={() => handleRemoveTag(tag)}
                                                    className="hover:text-red-500 transition-colors"
                                                >
                                                    <XIcon size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                            placeholder="Agregar tag..."
                                            className="flex-1 bg-secondary/50 border border-border rounded-lg p-2 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground"
                                        />
                                        <button
                                            onClick={handleAddTag}
                                            className="px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors text-sm"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                {/* Featured Toggle */}
                                <div className="flex items-center justify-between p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Star className="text-yellow-500" size={18} />
                                        <div>
                                            <p className="text-sm font-medium">Artículo Destacado</p>
                                            <p className="text-xs text-muted-foreground">Mostrar en homepage</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={featured}
                                            onChange={(e) => setFeatured(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-yellow-500"></div>
                                    </label>
                                </div>

                                {/* SEO Section */}
                                <div className="pt-6 border-t border-border">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-bold text-sm flex items-center"><Globe size={16} className="mr-2" /> SEO</h4>
                                        <button onClick={generateSEO} disabled={isAiWorking} className="text-xs font-bold text-yellow-400 hover:text-yellow-300 flex items-center"><Sparkles size={12} className="mr-1" /> Auto-Gen</button>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-muted-foreground mb-1">Meta Title</label>
                                            <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground" placeholder="Máx 60 caracteres" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-muted-foreground mb-1">Meta Description</label>
                                            <textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} rows={4} className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none resize-none text-foreground" placeholder="Máx 160 caracteres" />
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {metaDescription.length}/160 caracteres
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ModernAppArticleEditor;

