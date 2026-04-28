/**
 * NewsEditor
 * Editor de Noticias y Novedades para Super Admin
 * Usa TipTap como editor de texto enriquecido con la misma funcionalidad del CMS:
 *   - EditorMenuBar con AI commands (improve, fix, continue, format, vision)
 *   - EditorBubbleMenu contextual
 *   - SlashCommands (escribir "/" para insertar bloques)
 *   - Tablas (Table, TableRow, TableCell, TableHeader)
 *   - Auto-save para borradores
 * Layout: Sidebar derecha para Configuración + Audiencia + Preview (igual que el CMS)
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

import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useNews } from '../../../contexts/news';
import { useAdmin } from '../../../contexts/admin';
import { useToast } from '../../../contexts/ToastContext';
import { useFiles } from '../../../contexts/files';
import {
    NewsItem,
    NewsStatus,
    NewsCategory,
    NewsTargetType,
    NEWS_CATEGORY_LABELS,
    NEWS_STATUS_LABELS,
} from '../../../types/news';
import {
    Save,
    Loader2,
    Image as ImageIcon,
    Video as VideoIcon,
    Link as LinkIcon,
    Star,
    Tag,
    Calendar,
    Users,
    Target,
    Eye,
    Send,
    Sparkles,
    X,
    Trash2,
    Globe,
    ExternalLink,
    AlertCircle,
    Check,
    MoreVertical,
    ChevronDown,
    ChevronUp,
    Menu,
    Type,
    Languages,
} from 'lucide-react';

import DashboardSidebar from '../DashboardSidebar';
import HeaderBackButton from '../../ui/HeaderBackButton';
import EditorMenuBar from '../../cms/modern/EditorMenuBar';
import EditorBubbleMenu from '../../cms/modern/EditorBubbleMenu';
import SlashCommands from '../../cms/modern/SlashCommands';
import ImagePicker from '../../ui/ImagePicker';
import { generateContentViaProxy, extractTextFromResponse } from '../../../utils/geminiProxyClient';
import { logApiCall } from '../../../services/apiLoggingService';
import { storage } from '../../../firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import {
    translateNewsContent,
    buildTranslatedNews,
    generateNewsTranslationGroupId,
    getNewsTargetLanguage,
    getNewsLanguageName,
} from '../../../utils/newsTranslation';
import ConfirmationModal from '../../ui/ConfirmationModal';

interface NewsEditorProps {
    news: NewsItem | null;
    onClose: () => void;
    onTranslationCreated?: (translatedNews: NewsItem) => void;
}

const NewsEditor: React.FC<NewsEditorProps> = ({ news, onClose, onTranslationCreated }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { createNews, updateNews, fetchNews, getNewsTranslations } = useNews();
    const { getPrompt } = useAdmin();
    const { showToast } = useToast();
    const { uploadAdminAsset } = useFiles();

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
    const [isAiWorking, setIsAiWorking] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Language & Translation State
    const [language, setLanguage] = useState<'es' | 'en'>(news?.language || 'es');
    const [isTranslating, setIsTranslating] = useState(false);
    const [translationConfirmOpen, setTranslationConfirmOpen] = useState(false);

    // Video upload state — mirrors CMS
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Collapsible sidebar sections
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        config: true,
        targeting: false,
        translation: false,
        preview: true,
    });

    const contentImageInputRef = useRef<HTMLInputElement>(null);
    const videoFileInputRef = useRef<HTMLInputElement>(null);
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Toggle sidebar section
    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // TipTap Editor — with ALL CMS extensions
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
                placeholder: t('superadmin.news.editorPlaceholder', 'Escribe el contenido de la noticia... Usa "/" para comandos'),
            }),
            Table.configure({
                resizable: true,
                HTMLAttributes: {
                    class: 'border-collapse table-auto w-full my-4',
                },
            }),
            TableRow,
            TableHeader.configure({
                HTMLAttributes: {
                    class: 'border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 p-2 font-bold',
                },
            }),
            TableCell.configure({
                HTMLAttributes: {
                    class: 'border border-gray-300 dark:border-gray-600 p-2',
                },
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Underline,
        ],
        content: news?.body || '<p></p>',
        editorProps: {
            attributes: {
                class: 'prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[600px] px-8 py-6',
            },
        },
        onUpdate: () => {
            // Auto-save for drafts
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
            autoSaveTimerRef.current = setTimeout(() => {
                handleAutoSave();
            }, 3000);
        },
    });

    // Cleanup auto-save
    useEffect(() => {
        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, []);

    // --- Tag handlers ---
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

    // --- Image upload (content only — featured image uses ImagePicker) ---
    const handleContentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editor) return;

        try {
            const url = await uploadAdminAsset(file, 'article', {
                description: `News content image: ${title}`,
            });
            editor.chain().focus().setImage({ src: url }).run();
            showToast(t('superadmin.news.imageUploaded', 'Imagen subida correctamente'), 'success');
        } catch (err: any) {
            showToast(err.message || t('superadmin.news.imageUploadError', 'Error al subir imagen'), 'error');
        }
    };

    // Trigger content image upload
    const triggerContentImageUpload = () => {
        contentImageInputRef.current?.click();
    };

    // --- Video Upload (CMS pattern) ---
    const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingVideo(true);
        setUploadProgress(0);
        try {
            const timestamp = Date.now();
            const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `admin_news_video/${user?.uid || 'unknown'}/${timestamp}_${safeFileName}`;
            const fileRef = storageRef(storage, storagePath);

            const uploadTask = uploadBytesResumable(fileRef, file);

            const url = await new Promise<string>((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                        setUploadProgress(progress);
                    },
                    (error) => reject(error),
                    async () => {
                        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve(downloadUrl);
                    }
                );
            });

            setVideoUrl(url);
            showToast('Video subido correctamente', 'success');
        } catch (error: any) {
            showToast(`Error al subir el video: ${error?.message || 'Error desconocido'}`, 'error');
        } finally {
            setIsUploadingVideo(false);
            setUploadProgress(0);
            if (e.target) e.target.value = '';
        }
    };

    // --- Video Drag & Drop ---
    const handleVideoFileDrop = async (files: FileList) => {
        const file = files[0];
        if (!file || !file.type.startsWith('video/')) {
            showToast('Por favor arrastra un archivo de video válido.', 'warning');
            return;
        }

        setIsUploadingVideo(true);
        setUploadProgress(0);
        try {
            const timestamp = Date.now();
            const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `admin_news_video/${user?.uid || 'unknown'}/${timestamp}_${safeFileName}`;
            const fileRef = storageRef(storage, storagePath);

            const uploadTask = uploadBytesResumable(fileRef, file);

            const url = await new Promise<string>((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                        setUploadProgress(progress);
                    },
                    (error) => reject(error),
                    async () => {
                        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve(downloadUrl);
                    }
                );
            });

            setVideoUrl(url);
            showToast('Video subido correctamente', 'success');
        } catch (error: any) {
            showToast(`Error al subir el video: ${error?.message || 'Error desconocido'}`, 'error');
        } finally {
            setIsUploadingVideo(false);
            setUploadProgress(0);
        }
    };

    // --- Link handlers ---
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

    // --- AI Command handler (same as ModernAppArticleEditor) ---
    const handleAICommand = async (command: string) => {
        const selectedText = editor?.state.doc.textBetween(
            editor.state.selection.from,
            editor.state.selection.to,
            ' '
        );

        if (!selectedText && command !== 'continue' && command !== 'format') {
            showToast(t('superadmin.news.selectTextFirst', 'Por favor selecciona texto primero'), 'warning');
            return;
        }

        setIsAiWorking(true);
        let modelName = 'gemini-2.5-flash';

        try {
            let promptConfig;
            let populatedPrompt = '';

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

            if (!populatedPrompt) {
                setIsAiWorking(false);
                return;
            }

            const response = await generateContentViaProxy('admin-news-editor', populatedPrompt, modelName, {}, user?.uid);

            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: 'admin-news',
                    model: modelName,
                    feature: `news-article-${command}`,
                    success: true,
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

            showToast(t('superadmin.news.aiSuccess', 'IA aplicada correctamente'), 'success');
        } catch (error) {
            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: 'admin-news',
                    model: modelName,
                    feature: `news-article-${command}`,
                    success: false,
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                });
            }
            showToast(t('superadmin.news.aiError', 'Error al procesar con IA'), 'error');
            console.error(error);
        } finally {
            setIsAiWorking(false);
        }
    };

    // --- Auto-save ---
    const handleAutoSave = async () => {
        if (!title || status !== 'draft') return;
        await performSave(true);
    };

    // --- Save ---
    const handleSave = async () => {
        await performSave(false);
    };

    const performSave = async (isAutoSave: boolean = false) => {
        if (!title.trim()) {
            if (!isAutoSave) showToast(t('superadmin.news.titleRequired', 'El título es requerido'), 'error');
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
                language,
                // Preserve translation metadata
                ...(news?.translationGroup ? { translationGroup: news.translationGroup } : {}),
                ...(news?.translatedFrom ? { translatedFrom: news.translatedFrom } : {}),
                ...(news?.translationStatus ? { translationStatus: news.translationStatus } : {}),
            };

            // Determine if this is a real Firestore document (not a synthetic ID from AI/translation creation)
            const isRealFirestoreDoc = isEditing && news && !news.id.startsWith('news_');

            if (isRealFirestoreDoc && news) {
                await updateNews(news.id, newsData);
            } else {
                await createNews(newsData);
            }

            setLastSaved(new Date());

            if (!isAutoSave) {
                showToast(
                    status === 'published'
                        ? t('superadmin.news.published', 'Noticia publicada')
                        : t('superadmin.news.saved', 'Noticia guardada'),
                    'success'
                );
                setTimeout(() => onClose(), 500);
            }
        } catch (err: any) {
            if (!isAutoSave) showToast(err.message || t('superadmin.news.saveError', 'Error al guardar'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // --- Publish ---
    const handlePublish = async () => {
        setStatus('published');
        setTimeout(() => performSave(false), 100);
    };

    // --- Translation Logic ---
    const targetLang = getNewsTargetLanguage(language);
    const existingTranslations = news?.translationGroup
        ? getNewsTranslations(news.translationGroup).filter(n => n.id !== news.id)
        : [];
    const hasTranslation = existingTranslations.some(n => n.language === targetLang);

    const handleTranslateNews = async () => {
        setTranslationConfirmOpen(false);
        if (!title || !editor) {
            showToast('Guarda la noticia primero antes de traducir', 'warning');
            return;
        }

        setIsTranslating(true);
        try {
            const currentBody = editor.getHTML() || '';

            // Build the current news data to save first
            const currentNewsData: Omit<NewsItem, 'id' | 'createdAt' | 'updatedAt' | 'views' | 'clicks'> = {
                title: title.trim(),
                excerpt: excerpt.trim(),
                body: currentBody,
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
                language,
                translationGroup: news?.translationGroup || generateNewsTranslationGroupId(),
                translationStatus: news?.translationStatus || 'original',
            };

            // Save the original first
            let savedId: string;
            const isOriginalInFirestore = isEditing && news && !news.id.startsWith('news_');
            if (isOriginalInFirestore && news) {
                await updateNews(news.id, currentNewsData);
                savedId = news.id;
            } else {
                savedId = await createNews(currentNewsData);
            }

            // Build a full NewsItem for translation
            const savedOriginal: NewsItem = {
                ...currentNewsData,
                id: savedId,
                createdAt: news?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                views: news?.views || 0,
                clicks: news?.clicks || 0,
            } as NewsItem;

            // Translate via AI
            const translatedFields = await translateNewsContent(
                savedOriginal,
                targetLang,
                user?.uid
            );

            const translatedNews = buildTranslatedNews(
                savedOriginal,
                translatedFields,
                targetLang
            );

            // Save the translated news
            const translatedId = await createNews({
                ...translatedNews,
            } as Omit<NewsItem, 'id' | 'createdAt' | 'updatedAt' | 'views' | 'clicks'>);

            await fetchNews();

            showToast(
                t('superadmin.news.aiSuccess') + ` - ${getNewsLanguageName(targetLang)}`,
                'success'
            );

            // Open the translated news in the editor
            if (onTranslationCreated) {
                onTranslationCreated({
                    ...translatedNews,
                    id: translatedId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    views: 0,
                    clicks: 0,
                });
            }
        } catch (error: any) {
            console.error('[NewsTranslation] Error:', error);
            showToast(
                t('superadmin.news.aiError') + `: ${error?.message || 'Error'}`,
                'error'
            );
        } finally {
            setIsTranslating(false);
        }
    };

    // Available roles and plans
    const ROLES = ['user', 'admin', 'superadmin', 'manager'];
    const PLANS = ['free', 'starter', 'pro', 'enterprise'];

    // --- Sidebar Section component (uses stable external component) ---
    const renderSidebarSection = (
        id: string, sectionTitle: string, icon: React.ReactNode,
        children: React.ReactNode, accentColor?: string
    ) => {
        const isExpanded = expandedSections[id] !== false;
        return (
            <div className="border-b border-q-border last:border-b-0">
                <button
                    onClick={() => toggleSection(id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-q-bg/50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <span className={accentColor || 'text-q-accent'}>{icon}</span>
                        <span className="text-sm font-bold text-q-text">{sectionTitle}</span>
                    </div>
                    {isExpanded ? (
                        <ChevronUp size={14} className="text-q-text-secondary" />
                    ) : (
                        <ChevronDown size={14} className="text-q-text-secondary" />
                    )}
                </button>
                {isExpanded && <div className="px-4 pb-4 space-y-4">{children}</div>}
            </div>
        );
    };

    return (
        <>
        <div className="flex h-screen bg-q-bg text-q-text">
            <DashboardSidebar
                isMobileOpen={isMobileSidebarOpen}
                onClose={() => setIsMobileSidebarOpen(false)}
                defaultCollapsed={true}
            />

            <div className="flex flex-col flex-1 min-w-0">
                {/* ── CMS-style Header (merged, no sub-header) ── */}
                <header className="h-12 px-3 lg:px-4 border-b border-q-border flex items-center bg-q-bg z-20 sticky top-0">
                    {/* Left Section - Back + Icon */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsMobileSidebarOpen(true)}
                            className="lg:hidden h-9 w-9 flex items-center justify-center text-q-text-muted hover:text-foreground transition-colors"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <HeaderBackButton onClick={onClose} label={t('common.back', 'Volver')} />
                        <Sparkles className="text-primary w-5 h-5 hidden md:block" />
                        <span className="text-sm font-bold text-foreground hidden md:inline">
                            {isEditing
                                ? t('superadmin.news.editTitle', 'Editar Noticia')
                                : t('superadmin.news.createTitle', 'Nueva Noticia')}
                        </span>
                    </div>

                    {/* Center - Status Toggle */}
                    <div className="flex items-center gap-2 mx-auto">
                        {lastSaved && (
                            <span className="text-xs text-q-text-muted flex items-center gap-1 mr-2">
                                <Check size={12} className="text-green-500" />
                                {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                        <div className="flex items-center gap-1 text-xs font-medium">
                            <button onClick={() => setStatus('draft')} className={`px-2 py-1 rounded-md transition-all ${status === 'draft' ? 'text-foreground' : 'text-q-text-muted hover:text-foreground'}`}>
                                {t('superadmin.news.status.draft', 'Borrador')}
                            </button>
                            <button onClick={() => setStatus('published')} className={`px-2 py-1 rounded-md transition-all ${status === 'published' ? 'text-green-400' : 'text-q-text-muted hover:text-foreground'}`}>
                                {t('superadmin.news.status.published', 'Publicado')}
                            </button>
                            <button onClick={() => setStatus('scheduled')} className={`px-2 py-1 rounded-md transition-all ${status === 'scheduled' ? 'text-blue-400' : 'text-q-text-muted hover:text-foreground'}`}>
                                {t('superadmin.news.status.scheduled', 'Programado')}
                            </button>
                        </div>
                    </div>

                    {/* Right Section - Action buttons */}
                    <div className="flex items-center gap-2">
                        {status !== 'published' && (
                            <button
                                onClick={handlePublish}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
                            >
                                <Send size={16} />
                                <span className="hidden sm:inline">{t('superadmin.news.publish', 'Publicar')}</span>
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                            <span className="hidden sm:inline">{t('common.save', 'Guardar')}</span>
                        </button>
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${isSidebarOpen ? 'bg-primary/10 text-primary' : 'text-q-text-muted hover:text-foreground hover:bg-secondary/50'}`}
                            title={t('superadmin.news.toggleSidebar', 'Panel lateral')}
                        >
                            <MoreVertical size={16} />
                        </button>
                    </div>
                </header>

                {/* Hidden file inputs */}
                <input
                    ref={contentImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleContentImageUpload}
                    className="hidden"
                />
                <input
                    ref={videoFileInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/*"
                    onChange={handleVideoFileUpload}
                    className="hidden"
                />

                {/* Link Modal */}
                {showLinkModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-q-surface border border-q-border rounded-xl max-w-md w-full p-6">
                            <h3 className="text-lg font-semibold mb-4">
                                {t('superadmin.news.editLink', 'Editar Enlace')}
                            </h3>
                            <input
                                type="url"
                                value={linkUrl}
                                onChange={e => setLinkUrl(e.target.value)}
                                placeholder="https://..."
                                className="w-full bg-secondary/50 border border-q-border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary mb-4"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && applyLink()}
                            />
                            <div className="flex justify-between">
                                <button
                                    onClick={removeLink}
                                    className="text-sm text-red-500 hover:text-red-600 font-medium"
                                >
                                    {t('superadmin.news.removeLink', 'Eliminar Enlace')}
                                </button>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setShowLinkModal(false); setLinkUrl(''); }}
                                        className="px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg"
                                    >
                                        {t('common.cancel', 'Cancelar')}
                                    </button>
                                    <button
                                        onClick={applyLink}
                                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                                    >
                                        {t('superadmin.news.applyLink', 'Aplicar')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Main Content ── */}
                <div className="flex flex-1 min-h-0">
                    {/* ── Editor Panel (Main) ── */}
                    <div className="flex-1 flex flex-col min-w-0 bg-muted/30 transition-all duration-300">
                        {/* Toolbar — CMS-identical */}
                        <EditorMenuBar
                            editor={editor}
                            onImageUpload={triggerContentImageUpload}
                            onAICommand={handleAICommand}
                            isAiWorking={isAiWorking}
                        />

                        <div className="flex-1 overflow-y-auto bg-q-bg relative z-0">
                            {/* Content container - full width, no border */}
                            <div className="w-full">
                                {/* Post Title Input — inside editor area like CMS */}
                                <div className="px-8 pt-8 pb-2">
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder={t('superadmin.news.titlePlaceholder', 'Título de la noticia...')}
                                        className="w-full text-3xl sm:text-4xl font-bold bg-transparent border-none outline-none text-foreground placeholder:text-q-text-muted/50 leading-tight"
                                    />
                                    <div className="mt-3 h-px bg-border/50" />
                                </div>
                                <EditorContent editor={editor} />
                                <EditorBubbleMenu
                                    editor={editor}
                                    onAICommand={handleAICommand}
                                    onLinkClick={openLinkModal}
                                />
                                <SlashCommands
                                    editor={editor}
                                    onImageUpload={triggerContentImageUpload}
                                    onAICommand={handleAICommand}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── Right Sidebar — CMS-style ── */}
                    {isSidebarOpen && (
                        <aside className="w-80 bg-q-surface border-l border-q-border overflow-y-auto shrink-0">
                            {/* ── Configuration Section ── */}
                            {renderSidebarSection('config', t('superadmin.news.tabSettings', 'Configuración'), <Type size={16} />, <>
                                {/* Featured Image — uses ImagePicker like CMS */}
                                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                                    <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
                                        <ImageIcon size={14} />
                                        {t('superadmin.news.featuredImage', 'Imagen Destacada')}
                                    </label>
                                    <ImagePicker label="" value={imageUrl} onChange={setImageUrl} hideUrlInput={true} destination="admin" adminCategory="article" />
                                </div>

                                {/* Excerpt */}
                                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                                    <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
                                        <Type size={14} />
                                        {t('superadmin.news.excerpt', 'Extracto')}
                                    </label>
                                    <textarea
                                        value={excerpt}
                                        onChange={e => setExcerpt(e.target.value.slice(0, 200))}
                                        rows={3}
                                        className="w-full bg-q-bg border border-q-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-q-accent outline-none resize-none text-q-text"
                                        placeholder={t('superadmin.news.excerptPlaceholder', 'Resumen corto para listados...')}
                                    />
                                    <p className="text-xs text-q-text-secondary mt-1">
                                        {excerpt.length}/200
                                    </p>
                                </div>

                                {/* Video del Artículo — CMS-style dropzone + URL */}
                                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                                    <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
                                        <VideoIcon size={14} />
                                        Video del Artículo
                                    </label>
                                    {videoUrl ? (
                                        <div className="space-y-3">
                                            {(() => {
                                                const ytMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
                                                if (ytMatch) {
                                                    return (
                                                        <div className="relative rounded-lg overflow-hidden border border-q-border" style={{ paddingBottom: '56.25%', height: 0 }}>
                                                            <iframe src={`https://www.youtube.com/embed/${ytMatch[1]}`} className="absolute top-0 left-0 w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <video controls className="w-full rounded-lg border border-q-border" style={{ maxHeight: '200px' }}>
                                                        <source src={videoUrl} />
                                                    </video>
                                                );
                                            })()}
                                            <div className="flex gap-2 relative z-10">
                                                <button
                                                    type="button"
                                                    onClick={() => setVideoUrl('')}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={12} /> Eliminar
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div
                                                onClick={() => videoFileInputRef.current?.click()}
                                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('border-q-accent', 'bg-q-accent/10'); }}
                                                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('border-q-accent', 'bg-q-accent/10'); }}
                                                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('border-q-accent', 'bg-q-accent/10'); }}
                                                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('border-q-accent', 'bg-q-accent/10'); if (e.dataTransfer.files?.length) handleVideoFileDrop(e.dataTransfer.files); }}
                                                className={`w-full border-2 border-dashed border-q-border rounded-xl p-5 flex flex-col items-center gap-2 text-q-text-secondary hover:border-q-accent/50 hover:bg-q-bg transition-all cursor-pointer ${isUploadingVideo ? 'opacity-50 cursor-wait' : ''}`}
                                            >
                                                {isUploadingVideo ? (
                                                    <>
                                                        <Loader2 size={24} className="animate-spin text-q-accent" />
                                                        <span className="text-xs font-medium">Subiendo video... {uploadProgress > 0 ? `${uploadProgress}%` : ''}</span>
                                                        {uploadProgress > 0 && (
                                                            <div className="w-full bg-q-surface-overlay rounded-full h-2 mt-1">
                                                                <div className="bg-q-accent h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <VideoIcon size={24} />
                                                        <span className="text-xs font-medium">Subir o arrastrar video</span>
                                                        <span className="text-[10px] text-q-text-secondary/60">MP4, MOV, WEBM, AVI</span>
                                                    </>
                                                )}
                                            </div>
                                            <input
                                                type="url"
                                                value={videoUrl}
                                                onChange={(e) => setVideoUrl(e.target.value)}
                                                placeholder="O pega una URL de video..."
                                                className="w-full bg-q-bg border border-q-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-q-accent outline-none text-q-text placeholder:text-q-text-secondary/50"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Category */}
                                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                                    <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
                                        {t('superadmin.news.category', 'Categoría')}
                                    </label>
                                    <select
                                        value={category}
                                        onChange={e => setCategory(e.target.value as NewsCategory)}
                                        className="w-full bg-q-bg border border-q-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-q-accent outline-none text-q-text cursor-pointer"
                                    >
                                        {(Object.keys(NEWS_CATEGORY_LABELS) as NewsCategory[]).map(c => (
                                            <option key={c} value={c}>
                                                {t(`superadmin.news.category.${c}`, NEWS_CATEGORY_LABELS[c])}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Tags */}
                                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                                    <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
                                        <Tag size={14} />
                                        {t('superadmin.news.tags', 'Etiquetas')}
                                    </label>
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {tags.map(tag => (
                                            <span
                                                key={tag}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-q-accent/10 text-q-accent rounded-full"
                                            >
                                                {tag}
                                                <button
                                                    onClick={() => handleRemoveTag(tag)}
                                                    className="hover:text-red-500 transition-colors"
                                                >
                                                    <X size={12} />
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
                                            placeholder={t('superadmin.news.addTag', 'Añadir etiqueta...')}
                                            className="flex-1 bg-q-bg border border-q-border rounded-lg p-2 text-sm focus:ring-1 focus:ring-q-accent outline-none text-q-text"
                                        />
                                        <button
                                            onClick={handleAddTag}
                                            className="px-3 py-2 bg-q-bg hover:bg-q-surface-overlay/80 border border-q-border rounded-lg transition-colors text-sm"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                {/* Featured Toggle */}
                                <div className="flex items-center justify-between p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Star size={14} className="text-yellow-500" />
                                        <div>
                                            <p className="text-sm font-medium text-q-text">
                                                {t('superadmin.news.featured', 'Destacada')}
                                            </p>
                                            <p className="text-xs text-q-text-secondary">
                                                {t('superadmin.news.featuredDesc', 'Mostrar en sección destacada')}
                                            </p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={featured}
                                            onChange={(e) => setFeatured(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-q-surface-overlay peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                                    </label>
                                </div>

                                {/* Priority */}
                                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                                    <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3">
                                        {t('superadmin.news.priority', 'Prioridad (orden)')}
                                    </label>
                                    <input
                                        type="number"
                                        value={priority}
                                        onChange={e => setPriority(parseInt(e.target.value) || 0)}
                                        min={0}
                                        max={100}
                                        className="w-full bg-q-bg border border-q-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-q-accent outline-none text-q-text"
                                    />
                                    <p className="text-xs text-q-text-secondary mt-1">
                                        {t('superadmin.news.priorityHelp', 'Mayor número = aparece primero')}
                                    </p>
                                </div>

                                {/* CTA */}
                                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
                                    <label className="block text-xs font-bold text-q-text-secondary uppercase mb-1 flex items-center gap-2">
                                        <LinkIcon size={14} />
                                        {t('superadmin.news.cta', 'CTA')}
                                    </label>
                                    <input
                                        type="text"
                                        value={ctaLabel}
                                        onChange={e => setCtaLabel(e.target.value)}
                                        placeholder={t('superadmin.news.ctaLabel', 'Texto del botón')}
                                        className="w-full bg-q-bg border border-q-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-q-accent outline-none text-q-text"
                                    />
                                    <input
                                        type="url"
                                        value={ctaUrl}
                                        onChange={e => setCtaUrl(e.target.value)}
                                        placeholder={t('superadmin.news.ctaUrl', 'URL del enlace')}
                                        className="w-full bg-q-bg border border-q-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-q-accent outline-none text-q-text"
                                    />
                                    <label className="flex items-center gap-2 text-xs text-q-text-secondary">
                                        <input
                                            type="checkbox"
                                            checked={ctaExternal}
                                            onChange={e => setCtaExternal(e.target.checked)}
                                            className="rounded"
                                        />
                                        <ExternalLink size={12} />
                                        {t('superadmin.news.ctaExternal', 'Abrir en nueva pestaña')}
                                    </label>
                                </div>

                                {/* Scheduling */}
                                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
                                    <label className="block text-xs font-bold text-q-text-secondary uppercase mb-1 flex items-center gap-2">
                                        <Calendar size={14} />
                                        {t('superadmin.news.scheduling', 'Programación')}
                                    </label>
                                    <div className="grid grid-cols-1 gap-2">
                                        <div>
                                            <label className="block text-xs text-q-text-secondary mb-1">
                                                {t('superadmin.news.publishAt', 'Publicar en')}
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={publishAt}
                                                onChange={e => setPublishAt(e.target.value)}
                                                className="w-full bg-q-bg border border-q-border rounded-lg p-2 text-sm focus:ring-1 focus:ring-q-accent outline-none text-q-text"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-q-text-secondary mb-1">
                                                {t('superadmin.news.expireAt', 'Expira en')}
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={expireAt}
                                                onChange={e => setExpireAt(e.target.value)}
                                                className="w-full bg-q-bg border border-q-border rounded-lg p-2 text-sm focus:ring-1 focus:ring-q-accent outline-none text-q-text"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>)}

                            {/* ── Targeting Section ── */}
                            {renderSidebarSection('targeting', t('superadmin.news.tabTargeting', 'Audiencia'), <Target size={16} />, <>
                                {/* Target Type */}
                                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                                    <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
                                        {t('superadmin.news.targetType', 'Mostrar a')}
                                    </label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {(['all', 'roles', 'plans', 'tenants'] as NewsTargetType[]).map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setTargetType(type)}
                                                className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
                                                    targetType === type
                                                        ? 'bg-q-accent text-q-bg border-q-accent'
                                                        : 'bg-q-bg border-q-border hover:border-q-accent text-q-text-secondary hover:text-q-text'
                                                }`}
                                            >
                                                {type === 'all' && t('superadmin.news.targetAll', 'Todos')}
                                                {type === 'roles' && t('superadmin.news.targetRoles', 'Por Rol')}
                                                {type === 'plans' && t('superadmin.news.targetPlans', 'Por Plan')}
                                                {type === 'tenants' && t('superadmin.news.targetTenants', 'Por Tenant')}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Roles Selection */}
                                {targetType === 'roles' && (
                                    <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-1.5">
                                        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-1 flex items-center gap-2">
                                            <Users size={14} />
                                            {t('superadmin.news.selectRoles', 'Seleccionar roles')}
                                        </label>
                                        {ROLES.map(role => (
                                            <label key={role} className="flex items-center gap-2 p-2 rounded-lg hover:bg-q-bg/50 transition-colors cursor-pointer">
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
                                                    className="rounded border-q-border"
                                                />
                                                <span className="capitalize text-sm text-q-text">{role}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {/* Plans Selection */}
                                {targetType === 'plans' && (
                                    <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-1.5">
                                        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-1 flex items-center gap-2">
                                            <Globe size={14} />
                                            {t('superadmin.news.selectPlans', 'Seleccionar planes')}
                                        </label>
                                        {PLANS.map(plan => (
                                            <label key={plan} className="flex items-center gap-2 p-2 rounded-lg hover:bg-q-bg/50 transition-colors cursor-pointer">
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
                                                    className="rounded border-q-border"
                                                />
                                                <span className="capitalize text-sm text-q-text">{plan}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {/* Info Box */}
                                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-start gap-2">
                                    <AlertCircle className="text-blue-500 flex-shrink-0 mt-0.5" size={14} />
                                    <p className="text-xs text-q-text-secondary">
                                        {t(
                                            'superadmin.news.targetingInfoDesc',
                                            'La noticia solo se mostrará a los usuarios que cumplan con los criterios seleccionados.'
                                        )}
                                    </p>
                                </div>
                            </>, 'text-violet-400')}

                            {/* ── Translation Section ── */}
                            {renderSidebarSection('translation', t('superadmin.news.translateNews'), <Languages size={16} />, <>
                                {/* Language Selector */}
                                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                                    <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
                                        <Globe size={14} />
                                        {t('superadmin.news.contentLanguage')}
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setLanguage('es')}
                                            className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                                                language === 'es'
                                                    ? 'bg-q-accent text-q-bg'
                                                    : 'bg-q-bg border border-q-border text-q-text-secondary hover:text-q-text'
                                            }`}
                                        >
                                            🇪🇸 Español
                                        </button>
                                        <button
                                            onClick={() => setLanguage('en')}
                                            className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                                                language === 'en'
                                                    ? 'bg-q-accent text-q-bg'
                                                    : 'bg-q-bg border border-q-border text-q-text-secondary hover:text-q-text'
                                            }`}
                                        >
                                            🇺🇸 English
                                        </button>
                                    </div>
                                </div>

                                {/* Translation Status Badge */}
                                {news?.translationStatus && (
                                    <div className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${
                                        news.translationStatus === 'original' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                        news.translationStatus === 'reviewed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    }`}>
                                        {news.translationStatus === 'original' && '📝'}
                                        {news.translationStatus === 'auto-translated' && '⚡'}
                                        {news.translationStatus === 'reviewed' && '✅'}
                                        {news.translationStatus === 'original'
                                            ? t('superadmin.news.originalContent')
                                            : news.translationStatus === 'auto-translated'
                                            ? t('superadmin.news.autoTranslatedReview')
                                            : t('superadmin.news.reviewedTranslation')}
                                    </div>
                                )}

                                {/* Mark as Reviewed button */}
                                {news?.translationStatus === 'auto-translated' && (
                                    <button
                                        onClick={() => {
                                            if (news) {
                                                news.translationStatus = 'reviewed';
                                                showToast(
                                                    t('superadmin.news.markedAsReviewedMsg'),
                                                    'success'
                                                );
                                            }
                                        }}
                                        className="w-full px-3 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-xs font-medium hover:bg-green-500/20 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Check size={14} />
                                        {t('superadmin.news.markAsReviewed')}
                                    </button>
                                )}

                                {/* Existing translations */}
                                {existingTranslations.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs text-q-text-secondary font-medium">
                                            {t('superadmin.news.linkedTranslations')}
                                        </p>
                                        {existingTranslations.map(tr => (
                                            <div key={tr.id} className="flex items-center justify-between p-2.5 bg-q-bg border border-q-border rounded-lg">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-base">{tr.language === 'es' ? '🇪🇸' : '🇺🇸'}</span>
                                                    <span className="text-xs font-medium truncate text-q-text">{tr.title}</span>
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <span className={`w-2 h-2 rounded-full ${
                                                        tr.translationStatus === 'reviewed' ? 'bg-green-400' :
                                                        tr.translationStatus === 'auto-translated' ? 'bg-amber-400' : 'bg-blue-400'
                                                    }`} />
                                                    <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                                                        tr.status === 'published' ? 'bg-green-500/10 text-green-400' : 'bg-q-bg text-q-text-secondary'
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
                                            if (!news?.id && !title) {
                                                showToast(t('superadmin.news.writeContentFirst'), 'warning');
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
                                                {t('superadmin.news.translating')}
                                            </>
                                        ) : (
                                            <>
                                                <Languages size={16} />
                                                {t('superadmin.news.translateTo', { lang: getNewsLanguageName(targetLang) })}
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <p className="text-xs text-center text-q-text-secondary">
                                        {t('superadmin.news.translationExists', { lang: getNewsLanguageName(targetLang) })}
                                    </p>
                                )}
                            </>, 'text-blue-400')}

                            {/* ── Preview Section ── */}
                            {renderSidebarSection('preview', t('superadmin.news.preview', 'Vista previa'), <Eye size={16} />, <>
                                <div className="bg-q-bg border border-q-border rounded-lg overflow-hidden">
                                    {imageUrl ? (
                                        <img
                                            src={imageUrl}
                                            alt="Preview"
                                            className="w-full h-32 object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-32 bg-q-surface-overlay/30 flex items-center justify-center">
                                            <ImageIcon size={32} className="text-q-text-secondary/50" />
                                        </div>
                                    )}
                                    <div className="p-3">
                                        {featured && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 text-yellow-500 rounded-full text-xs mb-2">
                                                <Star size={10} className="fill-yellow-500" />
                                                {t('superadmin.news.featuredBadge', 'Destacado')}
                                            </span>
                                        )}
                                        <h4 className="font-semibold text-sm mb-1 line-clamp-2 text-q-text">
                                            {title || t('superadmin.news.untitled', 'Sin título')}
                                        </h4>
                                        <p className="text-xs text-q-text-secondary line-clamp-3 mb-3">
                                            {excerpt || t('superadmin.news.noExcerpt', 'Sin resumen')}
                                        </p>
                                        {ctaLabel && ctaUrl && (
                                            <button className="w-full px-3 py-2 bg-q-accent text-q-bg rounded-lg text-xs font-medium">
                                                {ctaLabel}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </>, 'text-emerald-400')}
                        </aside>
                    )}
                </div>
            </div>
        </div>

            {/* Translation Confirmation Modal */}
            <ConfirmationModal
                isOpen={translationConfirmOpen}
                onConfirm={handleTranslateNews}
                onCancel={() => setTranslationConfirmOpen(false)}
                title={t('superadmin.news.translateNews')}
                message={t('superadmin.news.translateConfirmDesc', { lang: getNewsLanguageName(targetLang) })}
                confirmText={t('common.translate', 'Translate')}
                cancelText={t('common.cancel', 'Cancel')}
                variant="info"
                icon={<Languages size={24} />}
            />
        </>
    );
};

export default NewsEditor;
