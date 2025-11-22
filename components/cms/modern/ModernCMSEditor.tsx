import React, { useState, useEffect, useRef } from 'react';
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
import { CMSPost } from '../../../types';
import { 
    ArrowLeft, Save, Globe, Type, Loader2, Sparkles,
    MoreVertical, Calendar, Check, X as XIcon, Link as LinkIcon
} from 'lucide-react';

import EditorMenuBar from './EditorMenuBar';
import EditorBubbleMenu from './EditorBubbleMenu';
import SlashCommands from './SlashCommands';
import ImagePicker from '../../ui/ImagePicker';
import { getGoogleGenAI } from '../../../utils/genAiClient';

interface ModernCMSEditorProps {
    post: CMSPost | null;
    onClose: () => void;
}

const ModernCMSEditor: React.FC<ModernCMSEditorProps> = ({ post, onClose }) => {
    const { saveCMSPost, handleApiError, hasApiKey, promptForKeySelection, uploadImageAndGetURL, getPrompt } = useEditorContext();
    
    // Form State
    const [title, setTitle] = useState(post?.title || '');
    const [slug, setSlug] = useState(post?.slug || '');
    const [status, setStatus] = useState<'draft' | 'published'>(post?.status || 'draft');
    const [excerpt, setExcerpt] = useState(post?.excerpt || '');
    const [featuredImage, setFeaturedImage] = useState(post?.featuredImage || '');
    const [seoTitle, setSeoTitle] = useState(post?.seoTitle || '');
    const [seoDescription, setSeoDescription] = useState(post?.seoDescription || '');

    // Editor State
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
        contentFileInputRef.current?.click();
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
        try {
            const ai = await getGoogleGenAI();
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

            const modelName = promptConfig?.model || 'gemini-2.0-flash-exp';

            const response = await ai.models.generateContent({
                model: modelName,
                contents: populatedPrompt,
            });
            
            const result = response.text.trim();
            
            if (command === 'continue') {
                editor?.chain().focus().insertContent(result).run();
            } else {
                // Replace selected text
                editor?.chain().focus().deleteSelection().insertContent(result).run();
            }

        } catch (error) {
            handleApiError(error);
            console.error(error);
        } finally {
            setIsAiWorking(false);
        }
    };

    const generateSEO = async () => {
        if (hasApiKey === false) { await promptForKeySelection(); return; }
        setIsAiWorking(true);
        try {
            const ai = await getGoogleGenAI();
            const contentPreview = editor?.getText().substring(0, 2000) || '';
            
            const promptConfig = getPrompt('cms-generate-seo');
            let populatedPrompt = "";
            let modelName = 'gemini-2.0-flash-exp';

            if (promptConfig) {
                populatedPrompt = promptConfig.template
                    .replace('{{title}}', title)
                    .replace('{{content}}', contentPreview);
                modelName = promptConfig.model;
            } else {
                populatedPrompt = `Generate JSON { "seoTitle": "...", "seoDescription": "..." } for: ${title}. Content: ${contentPreview}`;
            }

            const response = await ai.models.generateContent({
                model: modelName,
                contents: populatedPrompt,
                config: { responseMimeType: "application/json" }
            });
            const data = JSON.parse(response.text);
            setSeoTitle(data.seoTitle);
            setSeoDescription(data.seoDescription);
        } catch (error) { 
            handleApiError(error); 
            console.error(error); 
        } finally { 
            setIsAiWorking(false); 
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background text-foreground">
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
                        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">Edit Link</h3>
                        <input
                            type="url"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            placeholder="https://example.com"
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 mb-4 focus:ring-2 focus:ring-primary outline-none text-gray-900 dark:text-gray-100"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && applyLink()}
                        />
                        <div className="flex justify-between">
                            <button
                                onClick={removeLink}
                                className="text-sm text-red-500 hover:text-red-600 font-medium"
                            >
                                Remove Link
                            </button>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowLinkModal(false)}
                                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-gray-900 dark:text-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={applyLink}
                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0 shadow-sm">
                <div className="flex items-center gap-4 flex-1">
                    <button onClick={onClose} className="p-2 -ml-2 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="h-6 w-px bg-border"></div>
                    <input 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter Post Title..."
                        className="bg-transparent text-xl font-bold placeholder:text-muted-foreground/50 focus:outline-none flex-1 text-foreground"
                    />
                </div>
                <div className="flex items-center gap-3">
                    {lastSaved && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Check size={12} className="text-green-500" />
                            Saved {lastSaved.toLocaleTimeString()}
                        </span>
                    )}
                    <div className="flex items-center bg-secondary rounded-lg p-1 text-xs font-medium">
                        <button onClick={() => setStatus('draft')} className={`px-3 py-1.5 rounded-md transition-all ${status === 'draft' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Draft</button>
                        <button onClick={() => setStatus('published')} className={`px-3 py-1.5 rounded-md transition-all ${status === 'published' ? 'bg-green-500/20 text-green-400' : 'text-muted-foreground hover:text-foreground'}`}>Published</button>
                    </div>
                    <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-md">
                        {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save
                    </button>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-2 rounded-lg transition-colors ${isSidebarOpen ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-secondary'}`}>
                        <MoreVertical size={20} />
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Main Editor */}
                <div className="flex-1 flex flex-col min-w-0 bg-gray-100 dark:bg-gray-900">
                    <EditorMenuBar 
                        editor={editor} 
                        onImageUpload={triggerImageUpload}
                        onAICommand={handleAICommand}
                        isAiWorking={isAiWorking}
                    />
                    
                    <div className="flex-1 overflow-y-auto p-8 flex justify-center">
                        <div className="w-full max-w-[900px] bg-white dark:bg-gray-800 rounded-xl shadow-2xl min-h-[800px]">
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

                {/* Settings Sidebar */}
                {isSidebarOpen && (
                    <aside className="w-80 bg-card border-l border-border overflow-y-auto p-6 shrink-0 shadow-xl">
                        <div className="mb-6">
                            <h3 className="font-bold text-lg mb-1 flex items-center"><Type className="mr-2 text-primary" /> Post Settings</h3>
                            <p className="text-xs text-muted-foreground">Configure metadata and appearance.</p>
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">URL Slug</label>
                                <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Featured Image</label>
                                <ImagePicker label="" value={featuredImage} onChange={setFeaturedImage} />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Excerpt</label>
                                <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={4} className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none resize-none text-foreground" placeholder="Short summary for listings..." />
                            </div>

                            <div className="pt-6 border-t border-border">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-sm flex items-center"><Globe size={16} className="mr-2" /> SEO Settings</h4>
                                    <button onClick={generateSEO} disabled={isAiWorking} className="text-xs font-bold text-yellow-400 hover:text-yellow-300 flex items-center"><Sparkles size={12} className="mr-1" /> Auto-Gen</button>
                                </div>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">SEO Title</label>
                                        <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground" placeholder="Max 60 characters" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Meta Description</label>
                                        <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={4} className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none resize-none text-foreground" placeholder="Max 160 characters" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
};

export default ModernCMSEditor;

