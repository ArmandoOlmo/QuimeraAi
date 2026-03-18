import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import './editor-styles.css';
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

import { useEditor as useEditorContext } from '../../../contexts/EditorContext';
import { useCMS } from '../../../contexts/cms';
import { CMSPost, CMSCategory } from '../../../types';
import {
    ArrowLeft, Save, Globe, Type, Loader2, Sparkles,
    MoreVertical, Calendar, Check, X as XIcon, Link as LinkIcon,
    Monitor, Tablet, Smartphone, Eye, EyeOff, Layout, Menu, RefreshCw, Settings, User,
    Upload, ExternalLink, Tag
} from 'lucide-react';

import EditorMenuBar from './EditorMenuBar';
import EditorBubbleMenu from './EditorBubbleMenu';
import SlashCommands from './SlashCommands';
import ImagePicker from '../../ui/ImagePicker';
import {
    generateContentViaProxy,
    generateMultimodalContentViaProxy,
    extractTextFromResponse,
    fileToMediaInput,
    type MediaInput
} from '../../../utils/geminiProxyClient';
import DashboardSidebar from '../../dashboard/DashboardSidebar';
import { useRouter } from '../../../hooks/useRouter';
import { ROUTES } from '../../../routes/config';
import { logApiCall } from '../../../services/apiLoggingService';
import { useViewportType } from '../../../hooks/use-mobile';
import MobileBottomSheet from '../../ui/MobileBottomSheet';
import TabletSlidePanel from '../../ui/TabletSlidePanel';

type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

interface ModernCMSEditorProps {
    post: CMSPost | null;
    onClose: () => void;
}

// Settings sidebar content - shared across Desktop/Tablet/Mobile variants
interface SettingsSidebarContentProps {
    t: (key: string) => string;
    slug: string;
    setSlug: (value: string) => void;
    featuredImage: string;
    setFeaturedImage: (value: string) => void;
    excerpt: string;
    setExcerpt: (value: string) => void;
    author: string;
    setAuthor: (value: string) => void;
    showAuthor: boolean;
    setShowAuthor: (value: boolean) => void;
    showDate: boolean;
    setShowDate: (value: boolean) => void;
    publishedAt: string;
    setPublishedAt: (value: string) => void;
    seoTitle: string;
    setSeoTitle: (value: string) => void;
    seoDescription: string;
    setSeoDescription: (value: string) => void;
    generateSEO: () => void;
    isAiWorking: boolean;
    categoryId: string;
    setCategoryId: (value: string) => void;
    categories: CMSCategory[];
}

const SettingsSidebarContent: React.FC<SettingsSidebarContentProps> = ({
    t, slug, setSlug, featuredImage, setFeaturedImage, excerpt, setExcerpt,
    author, setAuthor, showAuthor, setShowAuthor, showDate, setShowDate, publishedAt, setPublishedAt,
    seoTitle, setSeoTitle, seoDescription, setSeoDescription, generateSEO, isAiWorking,
    categoryId, setCategoryId, categories
}) => (
    <>
        <div className="mb-6">
            <h3 className="font-bold text-lg mb-1 flex items-center"><Type className="mr-2 text-primary" /> {t('cms_editor.postSettings')}</h3>
            <p className="text-xs text-muted-foreground">{t('cms_editor.metaDescription')}</p>
        </div>

        <div className="space-y-6">
            <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">{t('cms_editor.urlSlug')}</label>
                <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground" />
            </div>

            <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">{t('cms_editor.featuredImage')}</label>
                <ImagePicker label="" value={featuredImage} onChange={setFeaturedImage} hideUrlInput={true} />
            </div>

            <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">{t('cms_editor.excerpt')}</label>
                <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={4} className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none resize-none text-foreground" placeholder={t('cms_editor.excerptPlaceholder')} />
            </div>

            {/* Category Selector */}
            {categories.length > 0 && (
                <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                        <Tag size={12} />
                        {t('cms_editor.category', 'Categoría')}
                    </label>
                    <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground cursor-pointer"
                    >
                        <option value="">{t('cms_editor.noCategory', 'Sin categoría')}</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Author & Date Controls */}
            <div className="pt-6 border-t border-border">
                <h4 className="font-bold text-sm flex items-center mb-4"><User size={16} className="mr-2" /> Autor & Fecha</h4>
                <div className="space-y-4">
                    {/* Author Name */}
                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Autor</label>
                        <input value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground" placeholder="Nombre del autor..." />
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
                </div>
            </div>

            <div className="pt-6 border-t border-border">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-sm flex items-center"><Globe size={16} className="mr-2" /> {t('cms_editor.seoSettings')}</h4>
                    <button onClick={generateSEO} disabled={isAiWorking} className="text-xs font-bold text-yellow-400 hover:text-yellow-300 flex items-center"><Sparkles size={12} className="mr-1" /> {t('cms_editor.autoGen')}</button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">{t('cms_editor.seoTitle')}</label>
                        <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground" placeholder={t('cms_editor.seoTitlePlaceholder')} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">{t('cms_editor.seoDescription')}</label>
                        <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={4} className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none resize-none text-foreground" placeholder={t('cms_editor.seoDescPlaceholder')} />
                    </div>
                </div>
            </div>
        </div>
    </>
);

const ModernCMSEditor: React.FC<ModernCMSEditorProps> = ({ post, onClose }) => {
    const { t } = useTranslation();
    const { navigate } = useRouter();
    // Use CMSContext for posts (scoped to active project)
    const { saveCMSPost, categories } = useCMS();
    // Use EditorContext for other utilities
    const { handleApiError, hasApiKey, promptForKeySelection, uploadImageAndGetURL, getPrompt, activeProject, user } = useEditorContext();
    // Responsive viewport detection for Three-Tier strategy
    const viewportType = useViewportType();

    // Form State
    const [title, setTitle] = useState(post?.title || '');
    const [slug, setSlug] = useState(post?.slug || '');
    const [status, setStatus] = useState<'draft' | 'published'>(post?.status || 'draft');
    const [excerpt, setExcerpt] = useState(post?.excerpt || '');
    const [featuredImage, setFeaturedImage] = useState(post?.featuredImage || '');
    const [seoTitle, setSeoTitle] = useState(post?.seoTitle || '');
    const [seoDescription, setSeoDescription] = useState(post?.seoDescription || '');
    const [author, setAuthor] = useState(post?.author || '');
    const [showAuthor, setShowAuthor] = useState(post?.showAuthor !== false);
    const [showDate, setShowDate] = useState(post?.showDate !== false);
    const [publishedAt, setPublishedAt] = useState(post?.publishedAt || '');
    const [categoryId, setCategoryId] = useState(post?.categoryId || '');

    // Editor State
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Right sidebar (settings)
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false); // Mobile general sidebar
    const [isSaving, setIsSaving] = useState(false);
    const [isAiWorking, setIsAiWorking] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
    const [isPreviewVisible, setIsPreviewVisible] = useState(true);
    // Refresh preview key (mostly for force re-renders if needed)
    const [previewKey, setPreviewKey] = useState(0);

    // Link Modal
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');

    // Content Image Picker Modal
    const [showContentImagePicker, setShowContentImagePicker] = useState(false);
    const [contentImageUrl, setContentImageUrl] = useState('');

    // Error display (replaces native alert)
    const [saveError, setSaveError] = useState<string | null>(null);

    const contentFileInputRef = useRef<HTMLInputElement>(null);
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

    // AI Vision State
    const [showVisionModal, setShowVisionModal] = useState(false);
    const [visionMedia, setVisionMedia] = useState<MediaInput | null>(null);
    const [visionMediaPreview, setVisionMediaPreview] = useState<string | null>(null);
    const [visionInstruction, setVisionInstruction] = useState('');
    const visionFileRef = useRef<HTMLInputElement>(null);

    // TipTap Editor
    // Get preview iframe/container width based on device
    const previewWidth = React.useMemo(() => {
        switch (previewDevice) {
            case 'tablet': return 'max-w-[768px]';
            case 'mobile': return 'max-w-[375px]';
            default: return 'max-w-full';
        }
    }, [previewDevice]);

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
                placeholder: 'Start writing something amazing... Type "/" for commands',
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
        content: post?.content || '<p></p>',
        editorProps: {
            attributes: {
                class: 'prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[600px] px-8 py-6',
            },
        },
        onUpdate: ({ editor }) => {
            // Trigger auto-save on content change
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
            autoSaveTimerRef.current = setTimeout(() => {
                handleAutoSave();
            }, 3000); // Auto-save after 3 seconds of inactivity
        }
    });

    // Slug Auto-generation
    useEffect(() => {
        if (!post?.slug && title && !slug) {
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
                const url = await uploadImageAndGetURL(file, 'cms_content');
                editor.chain().focus().setImage({ src: url }).run();
            } catch (error) {
                console.error("Image upload failed", error);
                alert("Failed to upload image.");
            }
        }
    };

    const triggerImageUpload = () => {
        // Open the ImagePicker modal instead of the file input
        setShowContentImagePicker(true);
    };

    // Handle image selection from ImagePicker for content
    const handleContentImageSelect = (url: string) => {
        if (url && editor) {
            editor.chain().focus().setImage({ src: url }).run();
        }
        setShowContentImagePicker(false);
        setContentImageUrl('');
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
        if (!title || status !== 'draft') return; // Only auto-save drafts
        await performSave(true);
    };

    const handleSave = async () => {
        await performSave(false);
    };

    const performSave = async (isAutoSave: boolean = false) => {
        if (!title) {
            if (!isAutoSave) alert("Title is required");
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

            const postData: CMSPost = {
                id: post?.id || '',
                title,
                slug: finalSlug,
                content: currentContent,
                excerpt,
                featuredImage,
                status,
                seoTitle,
                seoDescription,
                authorId: post?.authorId || '',
                author,
                showAuthor,
                showDate,
                ...(publishedAt ? { publishedAt } : {}),
                ...(categoryId ? { categoryId } : {}),
                createdAt: post?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            await saveCMSPost(postData);
            setLastSaved(new Date());

            if (!isAutoSave) {
                // Show success message or close
                setTimeout(() => onClose(), 500);
            }
        } catch (error) {
            console.error('Error saving CMS post:', error);
            if (!isAutoSave) {
                setSaveError(t('cms_editor.saveFailed', 'Error al guardar. Intente de nuevo.'));
                setTimeout(() => setSaveError(null), 5000);
            }
        } finally {
            setIsSaving(false);
        }
    };

    // --- AI Logic ---
    const handleAICommand = async (command: string) => {
        if (hasApiKey === false) {
            await promptForKeySelection();
            return;
        }

        const selectedText = editor?.state.doc.textBetween(
            editor.state.selection.from,
            editor.state.selection.to,
            ' '
        );

        if (!selectedText && command !== 'continue' && command !== 'vision') {
            alert("Please select some text first.");
            return;
        }

        // Vision command opens pick-media modal instead of direct generation
        if (command === 'vision') {
            setShowVisionModal(true);
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
                } else {
                    populatedPrompt = `You are a professional content writer working inside a CMS rich text editor. Continue writing based on the following context. Write naturally flowing paragraphs that continue the existing content seamlessly.

Context: ${context}

IMPORTANT: Return ONLY properly formatted HTML using <p>, <h2>, <h3>, <strong>, <em> tags. Write in well-structured paragraphs, NOT bullet points. Do NOT return markdown or code blocks.`;
                }
            } else if (command === 'fix') {
                promptConfig = getPrompt('cms-fix-grammar');
                if (promptConfig) {
                    populatedPrompt = promptConfig.template.replace('{{text}}', selectedText || '');
                } else {
                    populatedPrompt = `Fix grammar, spelling, and punctuation in the following text. Keep the same structure, tone, and HTML formatting. Return ONLY the corrected text without any explanation, markdown, or code blocks.

Text to fix: "${selectedText}"`;
                }
            } else if (command === 'improve') {
                promptConfig = getPrompt('cms-improve-text');
                if (promptConfig) {
                    populatedPrompt = promptConfig.template.replace('{{text}}', selectedText || '');
                } else {
                    populatedPrompt = `Improve the following text, making it more clear, engaging, and professional. Keep the same general meaning and HTML structure. Return ONLY the improved HTML text without any explanation, markdown, or code blocks.

Text to improve: "${selectedText}"`;
                }
            }

            modelName = promptConfig?.model || 'gemini-2.5-flash';

            const projectId = activeProject?.id || 'modern-cms-editor';
            const response = await generateContentViaProxy(projectId, populatedPrompt, modelName, {}, user?.uid);

            // Log successful API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: activeProject?.id,
                    model: modelName,
                    feature: `modern-cms-${command}`,
                    success: true
                });
            }

            const result = extractTextFromResponse(response).trim();

            if (command === 'continue') {
                editor?.chain().focus().insertContent(result).run();
            } else {
                // Replace selected text
                editor?.chain().focus().deleteSelection().insertContent(result).run();
            }

        } catch (error) {
            // Log failed API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: activeProject?.id,
                    model: modelName,
                    feature: `modern-cms-${command}`,
                    success: false,
                    errorMessage: error instanceof Error ? error.message : 'Unknown error'
                });
            }
            handleApiError(error);
            console.error(error);
        } finally {
            setIsAiWorking(false);
        }
    };

    // --- AI Vision (Image/Video Analysis) ---
    const handleVisionFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const mediaInput = await fileToMediaInput(file);
            setVisionMedia(mediaInput);
            setVisionMediaPreview(URL.createObjectURL(file));
        } catch (err) {
            console.error('Vision file read error:', err);
        }
        if (visionFileRef.current) visionFileRef.current.value = '';
    };

    const handleVisionGenerate = async () => {
        if (!visionMedia || !editor) return;
        setIsAiWorking(true);
        setShowVisionModal(false);

        let usedModel = 'gemini-2.5-flash';
        try {
            const instruction = visionInstruction.trim() || 'Describe what you see and write a detailed, engaging content about it.';
            const promptText = `You are a professional content writer working inside a CMS rich text editor. Based on the uploaded image/video, ${instruction}

IMPORTANT FORMATTING RULES:
- Return ONLY properly formatted HTML content
- Use <h2> for main headings, <h3> for subheadings
- Use <p> for paragraphs — write in flowing, well-structured paragraphs
- Use <strong> and <em> for emphasis
- Only use <ul>/<li> when listing specific items, NOT as the default format
- Do NOT wrap in code blocks, markdown, or JSON
- Do NOT use bullet points as the primary content structure — use descriptive paragraphs`;

            const promptConfig = getPrompt('cms-vision-write');
            const finalPrompt = promptConfig
                ? promptConfig.template.replace('{{instruction}}', instruction)
                : promptText;
            usedModel = promptConfig?.model || 'gemini-2.5-flash';

            const projectId = activeProject?.id || 'modern-cms-editor';
            const response = await generateMultimodalContentViaProxy(
                projectId, finalPrompt, [visionMedia], usedModel, {}, user?.uid
            );

            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: activeProject?.id,
                    model: usedModel,
                    feature: 'modern-cms-vision-write',
                    success: true
                });
            }

            let result = extractTextFromResponse(response).trim();
            result = result.replace(/^```html\n?/i, '').replace(/\n?```$/i, '');
            result = result.replace(/^```\n?/, '').replace(/\n?```$/, '');
            editor.chain().focus().insertContent(result).run();

            // Reset vision state
            setVisionMedia(null);
            setVisionMediaPreview(null);
            setVisionInstruction('');
        } catch (error: any) {
            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: activeProject?.id,
                    model: usedModel,
                    feature: 'modern-cms-vision-write',
                    success: false,
                    errorMessage: error?.message || 'Unknown error'
                });
            }
            handleApiError(error);
            console.error(error);
        } finally {
            setIsAiWorking(false);
        }
    };

    const generateSEO = async () => {
        if (hasApiKey === false) { await promptForKeySelection(); return; }
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

            const projectId = activeProject?.id || 'modern-cms-seo';
            const response = await generateContentViaProxy(projectId, populatedPrompt, modelName, {}, user?.uid);
            const responseText = extractTextFromResponse(response);

            // Log successful API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: activeProject?.id,
                    model: modelName,
                    feature: 'modern-cms-generate-seo',
                    success: true
                });
            }

            const data = JSON.parse(responseText);
            setSeoTitle(data.seoTitle);
            setSeoDescription(data.seoDescription);
        } catch (error) {
            // Log failed API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: activeProject?.id,
                    model: modelName,
                    feature: 'modern-cms-generate-seo',
                    success: false,
                    errorMessage: error instanceof Error ? error.message : 'Unknown error'
                });
            }
            handleApiError(error);
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
                {/* Header - Replicated from LandingPageEditor */}
                <header className="h-12 px-3 lg:px-4 border-b border-border flex items-center bg-background z-20 sticky top-0">
                    {/* Left Section - Menu + Icon */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsMobileSidebarOpen(true)}
                            className="lg:hidden h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <Layout className="text-primary w-5 h-5" />
                    </div>

                    {/* Center - Status Toggle */}
                    <div className="flex items-center gap-2 mx-auto">
                        {lastSaved && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1 mr-2">
                                <Check size={12} className="text-green-500" />
                                {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                        <div className="flex items-center gap-1 text-xs font-medium">
                            <button onClick={() => setStatus('draft')} className={`px-2 py-1 rounded-md transition-all ${status === 'draft' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{t('cms_editor.draft')}</button>
                            <button onClick={() => setStatus('published')} className={`px-2 py-1 rounded-md transition-all ${status === 'published' ? 'text-green-400' : 'text-muted-foreground hover:text-foreground'}`}>{t('cms_editor.published')}</button>
                        </div>
                    </div>

                    {/* Right Section - Icon-only buttons */}
                    <div className="flex items-center gap-1">
                        {/* Save */}
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="h-9 w-9 flex items-center justify-center rounded-lg transition-all text-primary hover:text-primary/80 disabled:opacity-50"
                            title={t('common.save', 'Guardar')}
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={18} />}
                        </button>

                        {/* Web Editor */}
                        {activeProject?.id && (
                            <button
                                onClick={() => navigate(ROUTES.EDITOR.replace(':projectId', activeProject.id))}
                                className="h-9 w-9 flex items-center justify-center transition-all text-muted-foreground hover:text-foreground"
                                title={t('cms_editor.goToWebEditor', 'Ir al Web Editor')}
                            >
                                <Monitor className="w-4 h-4" />
                            </button>
                        )}

                        {/* Back */}
                        <button
                            onClick={onClose}
                            className="h-9 w-9 flex items-center justify-center transition-all text-muted-foreground hover:text-foreground"
                            title={t('common.back', 'Volver')}
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>

                        {/* Sidebar Toggle */}
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className={`h-9 w-9 flex items-center justify-center transition-colors ${isSidebarOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                            title={t('cms_editor.postSettings')}
                        >
                            <MoreVertical size={18} />
                        </button>
                    </div>
                </header>

                {/* Save Error Banner */}
                {saveError && (
                    <div className="px-4 py-2 bg-red-500/20 border-b border-red-500/30 text-red-400 text-sm text-center font-medium animate-in fade-in">
                        {saveError}
                    </div>
                )}

                <input
                    type="file"
                    ref={contentFileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                    accept="image/*"
                />

                {/* AI Vision Modal */}
                {showVisionModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <Sparkles size={18} className="text-primary" />
                                    {t('cms_editor.visionTitle', { defaultValue: 'Write from Image/Video' })}
                                </h3>
                                <button
                                    onClick={() => { setShowVisionModal(false); setVisionMedia(null); setVisionMediaPreview(null); setVisionInstruction(''); }}
                                    className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <XIcon size={18} />
                                </button>
                            </div>

                            <input
                                ref={visionFileRef}
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
                                onChange={handleVisionFileChange}
                                className="hidden"
                            />

                            {!visionMediaPreview ? (
                                <button
                                    onClick={() => visionFileRef.current?.click()}
                                    className="w-full border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 hover:bg-secondary/20 transition-all"
                                >
                                    <Upload size={28} />
                                    <span className="text-sm font-medium">{t('cms_editor.visionUpload', { defaultValue: 'Upload image or video' })}</span>
                                    <span className="text-xs text-muted-foreground/60">JPG, PNG, GIF, WebP, MP4, WebM</span>
                                </button>
                            ) : (
                                <div className="relative mb-4">
                                    {visionMedia?.mimeType.startsWith('video/') ? (
                                        <video src={visionMediaPreview} className="w-full h-40 object-cover rounded-xl" controls muted />
                                    ) : (
                                        <img src={visionMediaPreview} alt="Preview" className="w-full h-40 object-cover rounded-xl" />
                                    )}
                                    <button
                                        onClick={() => { setVisionMedia(null); setVisionMediaPreview(null); }}
                                        className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80"
                                    >
                                        <XIcon size={14} />
                                    </button>
                                </div>
                            )}

                            <div className="mt-3">
                                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                    {t('cms_editor.visionInstructionLabel', { defaultValue: 'Instruction (optional)' })}
                                </label>
                                <input
                                    type="text"
                                    value={visionInstruction}
                                    onChange={(e) => setVisionInstruction(e.target.value)}
                                    placeholder={t('cms_editor.visionPlaceholder', { defaultValue: 'e.g. Describe this product photo...' })}
                                    className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground"
                                    onKeyDown={(e) => e.key === 'Enter' && visionMedia && handleVisionGenerate()}
                                />
                            </div>

                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => { setShowVisionModal(false); setVisionMedia(null); setVisionMediaPreview(null); setVisionInstruction(''); }}
                                    className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80"
                                >
                                    {t('common.cancel', { defaultValue: 'Cancel' })}
                                </button>
                                <button
                                    onClick={handleVisionGenerate}
                                    disabled={!visionMedia || isAiWorking}
                                    className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                                >
                                    {isAiWorking ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                    {t('cms_editor.visionGenerate', { defaultValue: 'Generate' })}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Link Modal */}
                {showLinkModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-96">
                            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">{t('cms_editor.editLink')}</h3>
                            <input
                                type="url"
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                placeholder={t('cms_editor.linkPlaceholder')}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 mb-4 focus:ring-2 focus:ring-primary outline-none text-gray-900 dark:text-gray-100"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && applyLink()}
                            />
                            <div className="flex justify-between">
                                <button
                                    onClick={removeLink}
                                    className="text-sm text-red-500 hover:text-red-600 font-medium"
                                >
                                    {t('cms_editor.removeLink')}
                                </button>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowLinkModal(false)}
                                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-gray-900 dark:text-gray-100"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        onClick={applyLink}
                                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                                    >
                                        {t('common.apply')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content Image Picker Modal */}
                {showContentImagePicker && (
                    <ImagePicker
                        value={contentImageUrl}
                        onChange={handleContentImageSelect}
                        onClose={() => setShowContentImagePicker(false)}
                        label={t('cms_editor.insertImage')}
                        defaultOpen={true}
                    />
                )}



                <div className="flex flex-1 min-h-0">
                    {/* Main Editor */}
                    <div className={`flex-1 flex flex-col min-w-0 bg-muted/30 transition-all duration-300`}>
                        <EditorMenuBar
                            editor={editor}
                            onImageUpload={triggerImageUpload}
                            onAICommand={handleAICommand}
                            isAiWorking={isAiWorking}
                        />

                        <div className="flex-1 overflow-y-auto bg-background relative z-0">
                            {/* Content container - full width, no border */}
                            <div className="w-full">
                                {/* Post Title Input */}
                                <div className="px-8 pt-8 pb-2">
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder={t('cms_editor.titlePlaceholder', 'Escribe el título del artículo...')}
                                        className="w-full text-3xl sm:text-4xl font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 leading-tight"
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
                                    onImageUpload={triggerImageUpload}
                                    onAICommand={handleAICommand}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Settings Sidebar - Desktop Only (Fixed) */}
                    {viewportType === 'desktop' && isSidebarOpen && (
                        <aside className="w-80 bg-card border-l border-border overflow-y-auto p-6 shrink-0 shadow-xl">
                            <SettingsSidebarContent
                                t={t}
                                slug={slug}
                                setSlug={setSlug}
                                featuredImage={featuredImage}
                                setFeaturedImage={setFeaturedImage}
                                excerpt={excerpt}
                                setExcerpt={setExcerpt}
                                author={author}
                                setAuthor={setAuthor}
                                showAuthor={showAuthor}
                                setShowAuthor={setShowAuthor}
                                showDate={showDate}
                                setShowDate={setShowDate}
                                publishedAt={publishedAt}
                                setPublishedAt={setPublishedAt}
                                seoTitle={seoTitle}
                                setSeoTitle={setSeoTitle}
                                seoDescription={seoDescription}
                                setSeoDescription={setSeoDescription}
                                generateSEO={generateSEO}
                                isAiWorking={isAiWorking}
                                categoryId={categoryId}
                                setCategoryId={setCategoryId}
                                categories={categories}
                            />
                        </aside>
                    )}
                </div>
            </div>

            {/* Tablet: Slide Panel from Right */}
            {viewportType === 'tablet' && (
                <TabletSlidePanel
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    title={t('cms_editor.postSettings')}
                    position="right"
                >
                    <div className="p-4">
                        <SettingsSidebarContent
                            t={t}
                            slug={slug}
                            setSlug={setSlug}
                            featuredImage={featuredImage}
                            setFeaturedImage={setFeaturedImage}
                            excerpt={excerpt}
                            setExcerpt={setExcerpt}
                            author={author}
                            setAuthor={setAuthor}
                            showAuthor={showAuthor}
                            setShowAuthor={setShowAuthor}
                            showDate={showDate}
                            setShowDate={setShowDate}
                            publishedAt={publishedAt}
                            setPublishedAt={setPublishedAt}
                            seoTitle={seoTitle}
                            setSeoTitle={setSeoTitle}
                            seoDescription={seoDescription}
                            setSeoDescription={setSeoDescription}
                            generateSEO={generateSEO}
                            isAiWorking={isAiWorking}
                            categoryId={categoryId}
                            setCategoryId={setCategoryId}
                            categories={categories}
                        />
                    </div>
                </TabletSlidePanel>
            )}

            {/* Mobile: Bottom Sheet */}
            {viewportType === 'mobile' && (
                <MobileBottomSheet
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    title={t('cms_editor.postSettings')}
                    subtitle={t('cms_editor.metaDescription')}
                >
                    <div className="p-4">
                        <SettingsSidebarContent
                            t={t}
                            slug={slug}
                            setSlug={setSlug}
                            featuredImage={featuredImage}
                            setFeaturedImage={setFeaturedImage}
                            excerpt={excerpt}
                            setExcerpt={setExcerpt}
                            author={author}
                            setAuthor={setAuthor}
                            showAuthor={showAuthor}
                            setShowAuthor={setShowAuthor}
                            showDate={showDate}
                            setShowDate={setShowDate}
                            publishedAt={publishedAt}
                            setPublishedAt={setPublishedAt}
                            seoTitle={seoTitle}
                            setSeoTitle={setSeoTitle}
                            seoDescription={seoDescription}
                            setSeoDescription={setSeoDescription}
                            generateSEO={generateSEO}
                            isAiWorking={isAiWorking}
                            categoryId={categoryId}
                            setCategoryId={setCategoryId}
                            categories={categories}
                        />
                    </div>
                </MobileBottomSheet>
            )}
        </div>
    );
};

export default ModernCMSEditor;
