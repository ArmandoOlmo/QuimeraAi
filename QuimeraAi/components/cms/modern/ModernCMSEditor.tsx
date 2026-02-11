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
import { CMSPost } from '../../../types';
import {
    ArrowLeft, Save, Globe, Type, Loader2, Sparkles,
    MoreVertical, Calendar, Check, X as XIcon, Link as LinkIcon,
    Monitor, Tablet, Smartphone, Eye, EyeOff, Layout, Menu, RefreshCw, Settings
} from 'lucide-react';

import EditorMenuBar from './EditorMenuBar';
import EditorBubbleMenu from './EditorBubbleMenu';
import SlashCommands from './SlashCommands';
import ImagePicker from '../../ui/ImagePicker';
import { generateContentViaProxy, extractTextFromResponse } from '../../../utils/geminiProxyClient';
import DashboardSidebar from '../../dashboard/DashboardSidebar';
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
    seoTitle: string;
    setSeoTitle: (value: string) => void;
    seoDescription: string;
    setSeoDescription: (value: string) => void;
    generateSEO: () => void;
    isAiWorking: boolean;
}

const SettingsSidebarContent: React.FC<SettingsSidebarContentProps> = ({
    t, slug, setSlug, featuredImage, setFeaturedImage, excerpt, setExcerpt,
    seoTitle, setSeoTitle, seoDescription, setSeoDescription, generateSEO, isAiWorking
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
    // Use CMSContext for posts (scoped to active project)
    const { saveCMSPost } = useCMS();
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

    const contentFileInputRef = useRef<HTMLInputElement>(null);
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

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
            console.error(error);
            if (!isAutoSave) alert("Failed to save");
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

        if (!selectedText && command !== 'continue') {
            alert("Please select some text first.");
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
                    populatedPrompt = `Continue writing based on this context: ${context}`;
                }
            } else if (command === 'fix') {
                promptConfig = getPrompt('cms-fix-grammar');
                if (promptConfig) {
                    populatedPrompt = promptConfig.template.replace('{{text}}', selectedText || '');
                } else {
                    populatedPrompt = `Fix grammar and spelling in this text: "${selectedText}"`;
                }
            } else if (command === 'improve') {
                promptConfig = getPrompt('cms-improve-text');
                if (promptConfig) {
                    populatedPrompt = promptConfig.template.replace('{{text}}', selectedText || '');
                } else {
                    populatedPrompt = `Improve this text making it more clear and engaging: "${selectedText}"`;
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
                <header className="h-14 px-4 lg:px-6 border-b border-border flex items-center bg-background z-20 sticky top-0">
                    {/* Left Section - Logo + Title + Badge */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMobileSidebarOpen(true)}
                            className="lg:hidden h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 rounded-xl transition-colors"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Layout className="text-primary w-5 h-5" />
                            <span className="text-sm sm:text-base font-semibold text-foreground">
                                {t('cms_editor.title', 'Editor Landing Page')}
                            </span>
                        </div>

                        {/* Unsaved changes indicator - "Cambios sin guardar" */}
                        <span className="hidden sm:inline-flex px-2.5 py-1 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-full">
                            {t('editor.unsavedChanges', 'Cambios sin guardar')}
                        </span>
                    </div>



                    {/* Right Section - Icons + Guardar + Volver */}
                    <div className="flex items-center gap-2 ml-auto">

                        {/* Save button - Yellow/Primary style */}
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 h-8 px-4 rounded-md text-sm font-medium transition-all bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save size={14} />
                            )}
                            <span className="hidden sm:inline">
                                {t('common.save', 'Guardar')}
                            </span>
                        </button>

                        {/* Volver button - Outlined style on the right */}
                        <button
                            onClick={onClose}
                            className="flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium transition-all border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('common.back', 'Volver')}</span>
                        </button>

                        {/* Sidebar Toggle */}
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className={`h-9 w-9 flex items-center justify-center rounded-md transition-colors ${isSidebarOpen ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-secondary'}`}
                        >
                            <MoreVertical size={18} />
                        </button>
                    </div>
                </header>

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

                {/* CMS Editor Toolbar - Simplified, Remove Save Button */}
                <div className="h-14 border-b border-border bg-card flex items-center justify-between px-6 shrink-0 shadow-sm">
                    <div className="flex items-center gap-4 flex-1">
                        {/* Title input moved to header, keeping this bar for secondary controls or removing entirely? 
                           The user request wants strict replication. The Admin Editor has 'Controls' on the right.
                           But this is the CMS editor, so we might need this bar for different things. 
                           I will keep the status toggles here but remove the Big Title Input and Save button since they are up top now.
                       */}
                        <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                            <Type size={16} />
                            <span>{t('cms_editor.contentEditor')}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {lastSaved && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Check size={12} className="text-green-500" />
                                {t('cms_editor.saved', { time: lastSaved.toLocaleTimeString() })}
                            </span>
                        )}
                        <div className="flex items-center bg-secondary rounded-lg p-1 text-xs font-medium">
                            <button onClick={() => setStatus('draft')} className={`px-3 py-1.5 rounded-md transition-all ${status === 'draft' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{t('cms_editor.draft')}</button>
                            <button onClick={() => setStatus('published')} className={`px-3 py-1.5 rounded-md transition-all ${status === 'published' ? 'bg-green-500/20 text-green-400' : 'text-muted-foreground hover:text-foreground'}`}>{t('cms_editor.published')}</button>
                        </div>
                        {/* Save Button Removed from here */}
                    </div>
                </div>

                <div className="flex flex-1 min-h-0">
                    {/* Main Editor */}
                    <div className={`flex-1 flex flex-col min-w-0 bg-muted/30 transition-all duration-300`}>
                        <EditorMenuBar
                            editor={editor}
                            onImageUpload={triggerImageUpload}
                            onAICommand={handleAICommand}
                            isAiWorking={isAiWorking}
                        />

                        <div className="flex-1 overflow-y-auto bg-background">
                            {/* Content container - full width, no border */}
                            <div className="w-full">
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
                                seoTitle={seoTitle}
                                setSeoTitle={setSeoTitle}
                                seoDescription={seoDescription}
                                setSeoDescription={setSeoDescription}
                                generateSEO={generateSEO}
                                isAiWorking={isAiWorking}
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
                            seoTitle={seoTitle}
                            setSeoTitle={setSeoTitle}
                            seoDescription={seoDescription}
                            setSeoDescription={setSeoDescription}
                            generateSEO={generateSEO}
                            isAiWorking={isAiWorking}
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
                            seoTitle={seoTitle}
                            setSeoTitle={setSeoTitle}
                            seoDescription={seoDescription}
                            setSeoDescription={setSeoDescription}
                            generateSEO={generateSEO}
                            isAiWorking={isAiWorking}
                        />
                    </div>
                </MobileBottomSheet>
            )}
        </div>
    );
};

export default ModernCMSEditor;
