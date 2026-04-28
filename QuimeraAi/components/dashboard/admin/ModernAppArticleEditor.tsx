/**
 * ModernAppArticleEditor
 * Editor moderno de artículos para la App Quimera (Super Admin)
 * Idéntico al ModernCMSEditor del usuario pero para AppArticle
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useUI } from '../../../contexts/core/UIContext';
import { AppArticle, AppArticleCategory, HelpCenterCategory, HELP_CENTER_CATEGORIES } from '../../../types/appContent';
import { PreviewDevice } from '../../../types';
import {
    Save, Globe, Type, Loader2, Sparkles,
    MoreVertical, Calendar, Check, X as XIcon, Link as LinkIcon,
    Star, Tag, User, Shield, LayoutDashboard, Monitor, Smartphone,
    Languages, ExternalLink, Image as ImageIcon, Upload, Search, Grid, Trash2, Replace, Zap
} from 'lucide-react';
import HeaderBackButton from '../../ui/HeaderBackButton';
import { BRAND_ASSETS } from '../../../constants/brandAssets';

import EditorMenuBar from '../../cms/modern/EditorMenuBar';
import EditorBubbleMenu from '../../cms/modern/EditorBubbleMenu';
import SlashCommands from '../../cms/modern/SlashCommands';
import ImagePicker from '../../ui/ImagePicker';
import ImageGeneratorModal from '../../ui/ImageGeneratorModal';
import { generateContentViaProxy, extractTextFromResponse } from '../../../utils/geminiProxyClient';
import { useRouter } from '../../../hooks/useRouter';
import { ROUTES } from '../../../routes/config';
import DashboardSidebar from '../DashboardSidebar';
import { logApiCall } from '../../../services/apiLoggingService';
import {
    translateArticleContent,
    buildTranslatedArticle,
    getTargetLanguage,
    getLanguageName,
    generateTranslationGroupId,
} from '../../../utils/articleTranslation';
import ConfirmationModal from '../../ui/ConfirmationModal';

interface ModernAppArticleEditorProps {
    article: AppArticle | null;
    onClose: () => void;
    onTranslationCreated?: (article: AppArticle) => void;
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

const ModernAppArticleEditor: React.FC<ModernAppArticleEditorProps> = ({ article, onClose, onTranslationCreated }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { saveArticle, loadArticles, getArticleTranslations } = useAppContent();
    const { getPrompt } = useAdmin();
    const { showToast } = useToast();
    const { uploadGlobalFile, globalFiles, fetchGlobalFiles, isGlobalFilesLoading } = useFiles();
    const { navigate } = useRouter();
    const { previewDevice, setPreviewDevice } = useUI();

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
    const [authorImage, setAuthorImage] = useState<string | null>(article?.authorImage || null);
    const [showAuthorImagePicker, setShowAuthorImagePicker] = useState(false);
    const [language, setLanguage] = useState<'es' | 'en'>(article?.language || 'es');
    const [helpCenterCategory, setHelpCenterCategory] = useState<HelpCenterCategory | undefined>(article?.helpCenterCategory || undefined);

    // SEO
    const [metaTitle, setMetaTitle] = useState(article?.seo?.metaTitle || '');
    const [metaDescription, setMetaDescription] = useState(article?.seo?.metaDescription || '');

    // Editor State
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isAiWorking, setIsAiWorking] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Translation State
    const [isTranslating, setIsTranslating] = useState(false);
    const [translationConfirmOpen, setTranslationConfirmOpen] = useState(false);

    // Link Modal
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');

    const contentFileInputRef = useRef<HTMLInputElement>(null);
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Content Image Picker State
    const [showContentImagePicker, setShowContentImagePicker] = useState(false);
    const [contentImageSearch, setContentImageSearch] = useState('');
    const [isUploadingContentImage, setIsUploadingContentImage] = useState(false);
    const [contentImagePickerMode, setContentImagePickerMode] = useState<'insert' | 'replace'>('insert');
    const [showContentImageGenerator, setShowContentImageGenerator] = useState(false);

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
                placeholder: t('contentManagement.editor.placeholder', 'Empieza a escribir algo increíble... Escribe "/" para comandos'),
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
            setIsUploadingContentImage(true);
            try {
                const url = await uploadGlobalFile(file);
                if (contentImagePickerMode === 'replace') {
                    // Replace the currently selected image
                    editor.chain().focus().setImage({ src: url }).run();
                } else {
                    editor.chain().focus().setImage({ src: url }).run();
                }
                setShowContentImagePicker(false);
                showToast('Imagen insertada', 'success');
            } catch (error) {
                console.error("Image upload failed", error);
                showToast("Error al subir la imagen", 'error');
            } finally {
                setIsUploadingContentImage(false);
                // Reset the file input
                if (contentFileInputRef.current) contentFileInputRef.current.value = '';
            }
        }
    };

    const handleContentImageUploadDirect = async (file: File) => {
        if (!editor) return;
        setIsUploadingContentImage(true);
        try {
            const url = await uploadGlobalFile(file);
            if (contentImagePickerMode === 'replace') {
                editor.chain().focus().setImage({ src: url }).run();
            } else {
                editor.chain().focus().setImage({ src: url }).run();
            }
            setShowContentImagePicker(false);
            showToast('Imagen insertada', 'success');
        } catch (error) {
            console.error("Image upload failed", error);
            showToast("Error al subir la imagen", 'error');
        } finally {
            setIsUploadingContentImage(false);
        }
    };

    const handleSelectAdminAsset = (url: string) => {
        if (!editor) return;
        if (contentImagePickerMode === 'replace') {
            editor.chain().focus().setImage({ src: url }).run();
        } else {
            editor.chain().focus().setImage({ src: url }).run();
        }
        setShowContentImagePicker(false);
        showToast('Imagen de librería insertada', 'success');
    };

    const triggerImageUpload = () => {
        setContentImagePickerMode('insert');
        setShowContentImagePicker(true);
        // Fetch global files (Super Admin Library) on open
        fetchGlobalFiles();
    };

    const handleDeleteSelectedImage = () => {
        if (!editor) return;
        if (editor.isActive('image')) {
            editor.chain().focus().deleteSelection().run();
            showToast('Imagen eliminada', 'success');
        }
    };

    const handleReplaceSelectedImage = () => {
        if (!editor) return;
        if (editor.isActive('image')) {
            setContentImagePickerMode('replace');
            setShowContentImagePicker(true);
            fetchGlobalFiles();
        }
    };

    // Combine globalFiles + BRAND_ASSETS to match Super Admin Image Library
    const allLibraryImages = useMemo(() => {
        const brandAssetFiles = BRAND_ASSETS.filter(a => a.type.startsWith('image/')).map(asset => ({
            id: asset.id,
            name: asset.name,
            downloadURL: asset.downloadURL,
            type: asset.type,
            folder: asset.folder,
        }));

        const userGlobalFiles = globalFiles.filter(f => f.type.startsWith('image/')).map(f => ({
            id: f.id,
            name: f.name,
            downloadURL: f.downloadURL,
            type: f.type,
            folder: (f as any).folder || 'uploads',
        }));

        return [...brandAssetFiles, ...userGlobalFiles];
    }, [globalFiles]);

    // Filter for the content image picker search
    const filteredLibraryImages = useMemo(() => {
        if (!contentImageSearch) return allLibraryImages;
        const q = contentImageSearch.toLowerCase();
        return allLibraryImages.filter(a => 
            a.name?.toLowerCase().includes(q) || a.folder?.toLowerCase().includes(q)
        );
    }, [allLibraryImages, contentImageSearch]);

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
                helpCenterCategory: ['help', 'guide', 'tutorial'].includes(category) ? (helpCenterCategory || undefined) : undefined,
                tags,
                author,
                showAuthor,
                showDate,
                authorImage: authorImage || null,
                readTime,
                views: article?.views || 0,
                createdAt: article?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                publishedAt: publishedAt || (status === 'published' && !article?.publishedAt ? new Date().toISOString() : (article?.publishedAt || null)),
                language,
                seo: {
                    metaTitle: metaTitle || title,
                    metaDescription: metaDescription || excerpt,
                    metaKeywords: tags,
                },
                // Preserve translation metadata if already present
                ...(article?.translationGroup ? { translationGroup: article.translationGroup } : {}),
                ...(article?.translatedFrom ? { translatedFrom: article.translatedFrom } : {}),
                ...(article?.translationStatus ? { translationStatus: article.translationStatus } : {}),
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

        if (!selectedText && command !== 'continue' && command !== 'format') {
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
            } else if (command === 'format') {
                const fullText = editor?.getText() || '';
                if (!fullText.trim()) {
                    setIsAiWorking(false);
                    return;
                }
                promptConfig = getPrompt('cms-format-only');
                if (promptConfig) {
                    populatedPrompt = promptConfig.template.replace('{{text}}', fullText);
                    modelName = promptConfig.model;
                } else {
                    populatedPrompt = `You are a professional HTML formatter working inside a CMS rich text editor. Your task is to take the following plain text and apply rich HTML formatting to give it proper structure.

CRITICAL RULES:
- Do NOT change, add, remove, rewrite, or paraphrase ANY word. The text must remain EXACTLY the same, word for word.
- ONLY add HTML structure: use <h2> and <h3> for section headings, <p> for paragraphs, <strong> for important terms or key phrases, <em> for emphasis, <ul>/<li> for items that are clearly lists.
- Detect natural sections in the text and apply appropriate heading levels.
- Break long blocks into proper paragraphs using <p> tags.
- Do NOT wrap output in code blocks, markdown, or JSON.
- Return ONLY the formatted HTML.

Text to format:
"""${fullText}"""`;
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
            } else if (command === 'format') {
                editor?.commands.setContent(result);
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

    // --- Translation Logic ---
    const targetLang = getTargetLanguage(language);
    const existingTranslations = article?.translationGroup
        ? getArticleTranslations(article.translationGroup).filter(a => a.id !== article.id)
        : [];
    const hasTranslation = existingTranslations.some(a => a.language === targetLang);

    const handleTranslateArticle = async () => {
        setTranslationConfirmOpen(false);
        if (!title || !editor) {
            showToast('Guarda el artículo primero antes de traducir', 'warning');
            return;
        }

        setIsTranslating(true);
        try {
            const currentContent = editor.getHTML() || '';

            // Build the current article to save first
            let finalSlug = slug.trim();
            if (!finalSlug) finalSlug = title;
            finalSlug = finalSlug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

            const currentArticleData: AppArticle = {
                id: article?.id || '',
                title,
                slug: finalSlug,
                content: currentContent,
                excerpt,
                featuredImage,
                status,
                featured,
                category,
                helpCenterCategory: ['help', 'guide', 'tutorial'].includes(category) ? (helpCenterCategory || undefined) : undefined,
                tags,
                author,
                showAuthor,
                showDate,
                authorImage: authorImage || null,
                readTime: article?.readTime || 1,
                views: article?.views || 0,
                createdAt: article?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                publishedAt: publishedAt || article?.publishedAt || undefined,
                language,
                seo: {
                    metaTitle: metaTitle || title,
                    metaDescription: metaDescription || excerpt,
                    metaKeywords: tags,
                },
                // Ensure translationGroup exists on the original
                translationGroup: article?.translationGroup || generateTranslationGroupId(),
                translationStatus: article?.translationStatus || 'original',
            };

            // Save the original article first (to persist the translationGroup and get actual ID)
            const savedOriginalArticle = await saveArticle(currentArticleData);

            // Now translate via AI
            const translatedFields = await translateArticleContent(
                savedOriginalArticle,
                targetLang,
                user?.uid
            );

            const translatedArticle = buildTranslatedArticle(
                savedOriginalArticle,
                translatedFields,
                targetLang
            );

            console.log('[Translation] Translated article built:', {
                id: translatedArticle.id,
                title: translatedArticle.title,
                language: translatedArticle.language,
                contentLength: translatedArticle.content?.length,
                translationStatus: translatedArticle.translationStatus,
                translationGroup: translatedArticle.translationGroup,
            });

            // Save the translated article
            const savedTranslatedArticle = await saveArticle(translatedArticle);
            await loadArticles();

            showToast(
                language === 'es'
                    ? `¡Artículo traducido al ${getLanguageName(targetLang)}! Se abrirá en el editor.`
                    : `Article translated to ${getLanguageName(targetLang)}! Opening in editor.`,
                'success'
            );

            // Open the translated article in the editor
            if (onTranslationCreated) {
                onTranslationCreated(savedTranslatedArticle);
            }
        } catch (error: any) {
            console.error('[Translation] Error:', error);
            showToast(
                language === 'es'
                    ? `Error al traducir el artículo: ${error?.message || 'Error desconocido'}`
                    : `Error translating article: ${error?.message || 'Unknown error'}`,
                'error'
            );
        } finally {
            setIsTranslating(false);
        }
    };

    return (
        <>
        <div className="flex h-screen bg-q-bg text-foreground">
            {/* General App Sidebar - Collapsed by default */}
            <DashboardSidebar
                isMobileOpen={isMobileSidebarOpen}
                onClose={() => setIsMobileSidebarOpen(false)}
                defaultCollapsed={true}
            />

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 min-w-0">
                {/* Admin-specific header - NO project name, shows "Contenido App" */}
                <header className="h-14 px-3 md:px-6 border-b border-q-border bg-q-bg flex items-center justify-between z-20 sticky top-0 relative" role="banner">
                    <div className="flex items-center gap-2 md:gap-4 min-w-0">
                        <button
                            onClick={() => navigate(ROUTES.DASHBOARD)}
                            className="h-10 w-10 md:h-9 md:w-9 flex items-center justify-center text-q-text-muted hover:text-foreground transition-colors touch-manipulation"
                            title={t('editor.goToDashboard')}
                        >
                            <LayoutDashboard className="w-5 h-5 md:w-4 md:h-4" />
                        </button>
                        <div className="hidden md:flex items-center gap-2">
                            <Shield className="text-primary" size={20} />
                            <span className="text-lg font-bold text-foreground">{t('contentManagement.appContent', 'Contenido App')}</span>
                        </div>
                    </div>

                    {/* CENTER - Device Preview Controls */}
                    <div className="hidden md:flex items-center gap-2 bg-secondary/50 rounded-lg p-1 absolute left-1/2 -translate-x-1/2">
                        {([
                            { name: 'desktop' as PreviewDevice, icon: <Monitor className="w-4 h-4" />, label: t('editor.desktop') },
                            { name: 'mobile' as PreviewDevice, icon: <Smartphone className="w-4 h-4" />, label: t('editor.mobile') },
                        ]).map(({ name, icon, label }) => (
                            <button
                                key={name}
                                title={t(`editor.previewOn${name.charAt(0).toUpperCase() + name.slice(1)}`)}
                                onClick={() => setPreviewDevice(name)}
                                className={`
                                    flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all
                                    ${previewDevice === name
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-q-text-muted hover:text-foreground hover:bg-q-bg/50'
                                    }
                                `}
                            >
                                {icon}
                                <span className="capitalize">{label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        <HeaderBackButton onClick={onClose} label={t('common.back')} />
                    </div>
                </header>

                <input
                    type="file"
                    ref={contentFileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                    accept="image/*"
                />

                {/* Content Image Picker Modal */}
                {showContentImagePicker && (
                    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowContentImagePicker(false)}>
                        <div className="bg-q-surface w-full max-w-3xl max-h-[80vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-q-border" onClick={(e) => e.stopPropagation()}>
                            {/* Header */}
                            <div className="p-4 border-b border-q-border flex justify-between items-center bg-muted/50">
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary/10 p-2 rounded-lg">
                                        <ImageIcon className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-foreground">
                                            {contentImagePickerMode === 'replace' ? 'Reemplazar Imagen' : 'Insertar Imagen'}
                                        </h3>
                                        <p className="text-xs text-q-text-muted">Sube una nueva imagen o selecciona de la librería</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowContentImagePicker(false)} className="p-2 rounded-lg hover:bg-secondary text-q-text-muted hover:text-foreground transition-colors">
                                    <XIcon size={18} />
                                </button>
                            </div>

                            {/* Upload Zone + AI Generate */}
                            <div className="p-4 border-b border-q-border">
                                <div className="flex gap-3">
                                    {/* Upload Area */}
                                    <div
                                        className="flex-1 border-2 border-dashed border-q-border rounded-xl p-5 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                                        onClick={() => contentFileInputRef.current?.click()}
                                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const file = e.dataTransfer.files[0];
                                            if (file && file.type.startsWith('image/')) handleContentImageUploadDirect(file);
                                        }}
                                    >
                                        {isUploadingContentImage ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                                <span className="text-sm text-q-text-muted">Subiendo imagen...</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                <Upload className="w-7 h-7 text-q-text-muted/50" />
                                                <p className="text-sm font-medium text-foreground">Arrastra o haz clic para subir</p>
                                                <p className="text-xs text-q-text-muted">PNG, JPG, GIF, WebP</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* AI Generate Button */}
                                    <button
                                        onClick={() => {
                                            setShowContentImagePicker(false);
                                            setShowContentImageGenerator(true);
                                        }}
                                        className="w-44 flex-shrink-0 border-2 border-dashed border-purple-500/30 rounded-xl p-5 text-center hover:border-purple-500/60 hover:bg-purple-500/5 transition-all cursor-pointer group"
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Zap className="w-5 h-5 text-white" />
                                            </div>
                                            <p className="text-sm font-bold text-purple-400">Generar con IA</p>
                                            <p className="text-[10px] text-q-text-muted">Crea imágenes únicas</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Super Admin Image Library */}
                            <div className="flex-1 overflow-hidden flex flex-col">
                                <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <Grid size={14} className="text-primary" />
                                        Librería Super Admin
                                        <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                                            {filteredLibraryImages.length}
                                        </span>
                                    </h4>
                                    <div className="flex items-center gap-1.5 bg-secondary rounded-lg px-2.5 py-1.5 w-48">
                                        <Search size={12} className="text-q-text-muted flex-shrink-0" />
                                        <input
                                            type="text"
                                            value={contentImageSearch}
                                            onChange={(e) => setContentImageSearch(e.target.value)}
                                            placeholder="Buscar imágenes..."
                                            className="flex-1 bg-transparent outline-none text-xs text-foreground min-w-0"
                                        />
                                        {contentImageSearch && (
                                            <button onClick={() => setContentImageSearch('')} className="text-q-text-muted hover:text-foreground flex-shrink-0">
                                                <XIcon size={10} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto px-4 pb-4">
                                    {isGlobalFilesLoading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                        </div>
                                    ) : filteredLibraryImages.length > 0 ? (
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                            {filteredLibraryImages.map(asset => (
                                                <button
                                                    key={asset.id}
                                                    onClick={() => handleSelectAdminAsset(asset.downloadURL)}
                                                    className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-primary cursor-pointer group relative transition-all bg-muted"
                                                    title={asset.name || 'Imagen'}
                                                >
                                                    <img src={asset.downloadURL} alt={asset.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1">
                                                        <span className="text-white text-[10px] font-bold text-center line-clamp-2">{asset.name}</span>
                                                        {asset.folder && asset.folder !== 'uploads' && (
                                                            <span className="text-white/70 text-[9px] mt-0.5 capitalize">{asset.folder}</span>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-12 text-q-text-muted">
                                            <ImageIcon size={40} className="mb-3 opacity-30" />
                                            <p className="text-sm font-medium">
                                                {contentImageSearch ? 'No se encontraron imágenes' : 'No hay imágenes en la librería'}
                                            </p>
                                            <p className="text-xs mt-1">Sube una imagen arriba o añade activos desde la Librería Super Admin</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* AI Image Generator Modal */}
                <ImageGeneratorModal
                    isOpen={showContentImageGenerator}
                    onClose={() => setShowContentImageGenerator(false)}
                    destination="admin"
                    adminCategory="article"
                    onImageGenerated={(imageUrl: string) => {
                        if (editor) {
                            if (contentImagePickerMode === 'replace') {
                                editor.chain().focus().setImage({ src: imageUrl }).run();
                            } else {
                                editor.chain().focus().setImage({ src: imageUrl }).run();
                            }
                            showToast('Imagen generada e insertada', 'success');
                        }
                        setShowContentImageGenerator(false);
                    }}
                    onUseImage={(imageUrl: string) => {
                        if (editor) {
                            editor.chain().focus().setImage({ src: imageUrl }).run();
                            showToast('Imagen insertada', 'success');
                        }
                        setShowContentImageGenerator(false);
                    }}
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
                <div className="h-14 border-b border-q-border bg-q-surface flex items-center justify-between px-6 shrink-0 shadow-sm">
                    <div className="flex items-center gap-4 flex-1">
                        <HeaderBackButton onClick={onClose} label={t('common.back')} />
                        <div className="h-6 w-px bg-border"></div>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Título del artículo..."
                            className="bg-transparent text-xl font-bold placeholder:text-q-text-muted/50 focus:outline-none flex-1 text-foreground"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        {lastSaved && (
                            <span className="text-xs text-q-text-muted flex items-center gap-1">
                                <Check size={12} className="text-green-500" />
                                Guardado {lastSaved.toLocaleTimeString()}
                            </span>
                        )}
                        <div className="flex items-center bg-secondary rounded-lg p-1 text-xs font-medium">
                            <button onClick={() => setStatus('draft')} className={`px-3 py-1.5 rounded-md transition-all ${status === 'draft' ? 'bg-q-bg shadow text-foreground' : 'text-q-text-muted hover:text-foreground'}`}>{t('contentManagement.status.draft', 'Borrador')}</button>
                            <button onClick={() => setStatus('published')} className={`px-3 py-1.5 rounded-md transition-all ${status === 'published' ? 'bg-green-500/20 text-green-400' : 'text-q-text-muted hover:text-foreground'}`}>{t('contentManagement.status.published', 'Publicado')}</button>
                        </div>
                        <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-md">
                            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} {t('common.save', 'Guardar')}
                        </button>
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-2 rounded-lg transition-colors ${isSidebarOpen ? 'bg-accent text-accent-foreground' : 'text-q-text-muted hover:bg-secondary'}`}>
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

                        <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-q-bg">
                            <div className="w-full max-w-[900px] min-h-[800px] relative">
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

                                {/* Image Action Toolbar — appears when an image node is selected */}
                                {editor && editor.isActive('image') && (
                                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-q-surface border border-q-border rounded-xl px-4 py-2.5 shadow-2xl animate-fade-in-up">
                                        <span className="text-xs text-q-text-muted font-medium mr-2">Imagen seleccionada</span>
                                        <button
                                            onClick={handleReplaceSelectedImage}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-bold"
                                        >
                                            <Replace size={14} />
                                            Reemplazar
                                        </button>
                                        <button
                                            onClick={handleDeleteSelectedImage}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors text-xs font-bold"
                                        >
                                            <Trash2 size={14} />
                                            Eliminar
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Settings Sidebar (Right) */}
                    {isSidebarOpen && (
                        <aside className="w-80 bg-q-surface border-l border-q-border overflow-y-auto p-6 shrink-0 shadow-xl">
                            <div className="mb-6">
                                <h3 className="font-bold text-lg mb-1 flex items-center"><Type className="mr-2 text-primary" /> {t('common.configuration', 'Configuración')}</h3>
                                <p className="text-xs text-q-text-muted">{t('contentManagement.editor.configDescription', 'Configura metadata y apariencia del artículo.')}</p>
                            </div>

                            <div className="space-y-6">
                                {/* Language */}
                                <div>
                                    <label className="block text-xs font-bold text-q-text-muted uppercase mb-2">{t('contentManagement.filters.language', 'Idioma')}</label>
                                    <div className="flex items-center bg-secondary rounded-lg p-1 text-xs font-medium">
                                        <button 
                                            onClick={() => setLanguage('es')} 
                                            className={`flex-1 py-1.5 rounded-md transition-all ${language === 'es' ? 'bg-q-bg shadow text-foreground' : 'text-q-text-muted hover:text-foreground'}`}
                                        >
                                            Español
                                        </button>
                                        <button 
                                            onClick={() => setLanguage('en')} 
                                            className={`flex-1 py-1.5 rounded-md transition-all ${language === 'en' ? 'bg-q-bg shadow text-foreground' : 'text-q-text-muted hover:text-foreground'}`}
                                        >
                                            English
                                        </button>
                                    </div>
                                </div>
                                {/* URL Slug */}
                                <div>
                                    <label className="block text-xs font-bold text-q-text-muted uppercase mb-2">{t('contentManagement.editor.urlSlug', 'URL Slug')}</label>
                                    <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full bg-secondary/50 border border-q-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground" />
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="block text-xs font-bold text-q-text-muted uppercase mb-2">{t('contentManagement.editor.category', 'Categoría')}</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value as AppArticleCategory)}
                                        className="w-full bg-secondary/50 border border-q-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground"
                                    >
                                        {CATEGORIES.map(cat => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Help Center Category — only visible for help/guide/tutorial */}
                                {['help', 'guide', 'tutorial'].includes(category) && (
                                    <div>
                                        <label className="block text-xs font-bold text-q-text-muted uppercase mb-2">
                                            Sección del Help Center
                                        </label>
                                        <select
                                            value={helpCenterCategory || ''}
                                            onChange={(e) => setHelpCenterCategory((e.target.value as HelpCenterCategory) || undefined)}
                                            className="w-full bg-secondary/50 border border-q-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground"
                                        >
                                            <option value="">— Sin asignar —</option>
                                            {HELP_CENTER_CATEGORIES.map(hc => (
                                                <option key={hc.value} value={hc.value}>{hc.label}</option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-q-text-muted mt-1">
                                            Define en qué sección aparece este artículo en /help-center
                                        </p>
                                    </div>
                                )}

                                {/* Featured Image */}
                                <div>
                                    <label className="block text-xs font-bold text-q-text-muted uppercase mb-2">{t('contentManagement.editor.featuredImage', 'Imagen Destacada')}</label>
                                    <ImagePicker label="" value={featuredImage} onChange={setFeaturedImage} destination="admin" adminCategory="article" onRemove={() => setFeaturedImage('')} />
                                </div>

                                {/* Excerpt */}
                                <div>
                                    <label className="block text-xs font-bold text-q-text-muted uppercase mb-2">{t('contentManagement.editor.excerpt', 'Extracto')}</label>
                                    <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={4} className="w-full bg-secondary/50 border border-q-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none resize-none text-foreground" placeholder={t('contentManagement.editor.excerptPlaceholder', 'Resumen corto para listados...')} />
                                </div>

                                {/* Author */}
                                <div>
                                    <label className="block text-xs font-bold text-q-text-muted uppercase mb-2">{t('contentManagement.editor.author', 'Autor')}</label>
                                    {/* Author avatar circle — opens admin image library */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <button
                                            type="button"
                                            title="Haz clic para seleccionar foto del autor"
                                            onClick={() => setShowAuthorImagePicker(true)}
                                            className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 group"
                                        >
                                            {authorImage ? (
                                                <img
                                                    src={authorImage}
                                                    alt={author}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                                                    <span className="text-white text-sm font-bold select-none">
                                                        {author ? author.charAt(0).toUpperCase() : 'A'}
                                                    </span>
                                                </div>
                                            )}
                                            {/* Hover overlay */}
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                                                <ImageIcon className="w-4 h-4 text-white" />
                                            </div>
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <input
                                                value={author}
                                                onChange={(e) => setAuthor(e.target.value)}
                                                className="w-full bg-secondary/50 border border-q-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground"
                                            />
                                            {authorImage && (
                                                <button
                                                    type="button"
                                                    onClick={() => setAuthorImage(null)}
                                                    className="mt-1 text-[10px] text-red-400 hover:text-red-300 transition-colors"
                                                >
                                                    Eliminar foto
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {/* ImagePicker modal for author image */}
                                    {showAuthorImagePicker && (
                                        <ImagePicker
                                            label="Foto del Autor"
                                            value={authorImage || ''}
                                            onChange={(url) => {
                                                setAuthorImage(url);
                                                setShowAuthorImagePicker(false);
                                            }}
                                            destination="admin"
                                            adminCategory="article"
                                            defaultOpen={true}
                                            onClose={() => setShowAuthorImagePicker(false)}
                                            onRemove={() => {
                                                setAuthorImage(null);
                                                setShowAuthorImagePicker(false);
                                            }}
                                        />
                                    )}
                                </div>

                                {/* Publication Date */}
                                <div>
                                    <label className="block text-xs font-bold text-q-text-muted uppercase mb-2">{t('contentManagement.editor.publicationDate', 'Fecha de Publicación')}</label>
                                    <input
                                        type="datetime-local"
                                        value={publishedAt ? new Date(publishedAt).toISOString().slice(0, 16) : ''}
                                        onChange={(e) => setPublishedAt(e.target.value ? new Date(e.target.value).toISOString() : '')}
                                        className="w-full bg-secondary/50 border border-q-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground"
                                    />
                                </div>

                                {/* Show Author Toggle */}
                                <div className="flex items-center justify-between p-3 bg-secondary/30 border border-q-border rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <User size={14} className="text-q-text-muted" />
                                        <span className="text-sm font-medium">{t('contentManagement.editor.showAuthor', 'Mostrar Autor')}</span>
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
                                <div className="flex items-center justify-between p-3 bg-secondary/30 border border-q-border rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-q-text-muted" />
                                        <span className="text-sm font-medium">{t('contentManagement.editor.showDate', 'Mostrar Fecha')}</span>
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
                                    <label className="block text-xs font-bold text-q-text-muted uppercase mb-2">{t('contentManagement.editor.tags', 'Etiquetas')}</label>
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
                                            className="flex-1 bg-secondary/50 border border-q-border rounded-lg p-2 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground"
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
                                            <p className="text-sm font-medium">{t('contentManagement.editor.featuredArticle', 'Artículo Destacado')}</p>
                                            <p className="text-xs text-q-text-muted">{t('contentManagement.editor.featuredArticleDescription', 'Mostrar en homepage')}</p>
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
                                <div className="pt-6 border-t border-q-border">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-bold text-sm flex items-center"><Globe size={16} className="mr-2" /> SEO</h4>
                                        <button onClick={generateSEO} disabled={isAiWorking} className="text-xs font-bold text-yellow-400 hover:text-yellow-300 flex items-center"><Sparkles size={12} className="mr-1" /> {t('contentManagement.editor.autoGen', 'Auto-Gen')}</button>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-q-text-muted mb-1">Meta Title</label>
                                            <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className="w-full bg-secondary/50 border border-q-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground" placeholder="Máx 60 caracteres" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-q-text-muted mb-1">Meta Description</label>
                                            <textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} rows={4} className="w-full bg-secondary/50 border border-q-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none resize-none text-foreground" placeholder="Máx 160 caracteres" />
                                            <p className="text-xs text-q-text-muted mt-1">
                                                {metaDescription.length}/160 caracteres
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Translation Section */}
                                <div className="pt-6 border-t border-q-border">
                                    <h4 className="font-bold text-sm flex items-center mb-4">
                                        <Languages size={16} className="mr-2 text-blue-400" />
                                        {language === 'es' ? 'Traducción' : 'Translation'}
                                    </h4>

                                    {/* Translation Status Badge */}
                                    {article?.translationStatus && (
                                        <div className={`mb-3 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${
                                            article.translationStatus === 'original' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                            article.translationStatus === 'reviewed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                        }`}>
                                            {article.translationStatus === 'original' && '📝'}
                                            {article.translationStatus === 'auto-translated' && '⚡'}
                                            {article.translationStatus === 'reviewed' && '✅'}
                                            {article.translationStatus === 'original' ? (language === 'es' ? 'Contenido original' : 'Original content') :
                                             article.translationStatus === 'auto-translated' ? (language === 'es' ? 'Auto-traducido (revisar)' : 'Auto-translated (review)') :
                                             (language === 'es' ? 'Traducción revisada' : 'Reviewed translation')}
                                        </div>
                                    )}

                                    {/* Mark as Reviewed button for auto-translated articles */}
                                    {article?.translationStatus === 'auto-translated' && (
                                        <button
                                            onClick={() => {
                                                // Will be persisted on next save
                                                if (article) {
                                                    article.translationStatus = 'reviewed';
                                                    showToast(
                                                        language === 'es' ? 'Marcado como revisado. Guarda para persistir.' : 'Marked as reviewed. Save to persist.',
                                                        'success'
                                                    );
                                                }
                                            }}
                                            className="w-full mb-3 px-3 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-xs font-medium hover:bg-green-500/20 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Check size={14} />
                                            {language === 'es' ? 'Marcar como revisado' : 'Mark as reviewed'}
                                        </button>
                                    )}

                                    {/* Existing translations */}
                                    {existingTranslations.length > 0 && (
                                        <div className="mb-3 space-y-2">
                                            <p className="text-xs text-q-text-muted font-medium">
                                                {language === 'es' ? 'Traducciones vinculadas:' : 'Linked translations:'}
                                            </p>
                                            {existingTranslations.map(tr => (
                                                <div key={tr.id} className="flex items-center justify-between p-2.5 bg-secondary/30 border border-q-border rounded-lg">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="text-base">{tr.language === 'es' ? '🇪🇸' : '🇺🇸'}</span>
                                                        <span className="text-xs font-medium truncate">{tr.title}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        <span className={`w-2 h-2 rounded-full ${
                                                            tr.translationStatus === 'reviewed' ? 'bg-green-400' :
                                                            tr.translationStatus === 'auto-translated' ? 'bg-amber-400' : 'bg-blue-400'
                                                        }`} />
                                                        <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                                                            tr.status === 'published' ? 'bg-green-500/10 text-green-400' : 'bg-secondary text-q-text-muted'
                                                        }`}>{tr.status === 'published' ? '●' : '○'}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Translate Button */}
                                    {!hasTranslation ? (
                                        <button
                                            onClick={() => {
                                                if (!article?.id && !title) {
                                                    showToast(language === 'es' ? 'Escribe contenido primero' : 'Write content first', 'warning');
                                                    return;
                                                }
                                                setTranslationConfirmOpen(true);
                                            }}
                                            disabled={isTranslating || !title}
                                            className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/20 transition-all disabled:opacity-40 disabled:hover:shadow-none"
                                        >
                                            {isTranslating ? (
                                                <>
                                                    <Loader2 className="animate-spin" size={16} />
                                                    {language === 'es' ? 'Traduciendo...' : 'Translating...'}
                                                </>
                                            ) : (
                                                <>
                                                    <Languages size={16} />
                                                    {language === 'es'
                                                        ? `Traducir a ${getLanguageName(targetLang)}`
                                                        : `Translate to ${getLanguageName(targetLang)}`}
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <p className="text-xs text-center text-q-text-muted">
                                            {language === 'es'
                                                ? `✅ Ya existe traducción en ${getLanguageName(targetLang)}`
                                                : `✅ Translation in ${getLanguageName(targetLang)} already exists`}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </aside>
                    )}
                </div>
            </div>
        </div>

            {/* Translation Confirmation Modal */}
            <ConfirmationModal
                isOpen={translationConfirmOpen}
                onConfirm={handleTranslateArticle}
                onCancel={() => setTranslationConfirmOpen(false)}
                title={language === 'es' ? 'Traducir artículo' : 'Translate article'}
                message={language === 'es'
                    ? `Se guardará el artículo actual y se creará una traducción automática al ${getLanguageName(targetLang)} usando IA. La traducción se abrirá como borrador para que puedas revisarla.`
                    : `The current article will be saved and an automatic translation to ${getLanguageName(targetLang)} will be created using AI. The translation will open as a draft for your review.`
                }
                confirmText={language === 'es' ? 'Traducir' : 'Translate'}
                cancelText={language === 'es' ? 'Cancelar' : 'Cancel'}
                variant="info"
                icon={<Languages size={24} />}
            />
        </>
    );
};

export default ModernAppArticleEditor;
