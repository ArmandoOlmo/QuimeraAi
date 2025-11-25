
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor } from '../../contexts/EditorContext';
import { CMSPost } from '../../types';
import { 
    ArrowLeft, Save, Globe, Image as ImageIcon, Type, 
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Bold, Italic, Underline, Strikethrough,
    List, ListOrdered,
    MoreVertical, Loader2, Sparkles, 
    Undo, Redo, Link as LinkIcon, Unlink, RemoveFormatting, Minus,
    ChevronDown, Table, Palette, 
    Heading1, Heading2, Heading3, Quote, Check, X as XIcon, Upload as UploadIcon, Hash
} from 'lucide-react';
import { getGoogleGenAI } from '../../utils/genAiClient';
import ImageGeneratorModal from '../ui/ImageGeneratorModal';
import ImagePicker from '../ui/ImagePicker';
import { logApiCall } from '../../services/apiLoggingService';

interface CMSEditorProps {
    post: CMSPost | null;
    onClose: () => void;
}

const ToolbarButton: React.FC<{ onClick: () => void; isActive?: boolean; title: string; children: React.ReactNode }> = ({ onClick, isActive, title, children }) => (
    <button
        onMouseDown={(e) => { e.preventDefault(); onClick(); }}
        className={`p-2 rounded-md transition-colors ${isActive ? 'bg-editor-accent/10 text-editor-accent' : 'text-gray-600 hover:bg-gray-100'}`}
        title={title}
    >
        {children}
    </button>
);

const ToolbarDivider = () => <div className="w-px h-6 bg-gray-300 mx-1 self-center" />;

const CMSEditor: React.FC<CMSEditorProps> = ({ post, onClose }) => {
    const { t } = useTranslation();
    const { saveCMSPost, handleApiError, hasApiKey, promptForKeySelection, uploadImageAndGetURL, getPrompt, user, activeProject } = useEditor();
    
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
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    
    // Toolbar Active States
    const [activeFormats, setActiveFormats] = useState<Record<string, any>>({});
    
    // Dropdown/Modal States
    const [showHeadings, setShowHeadings] = useState(false);
    const [showColors, setShowColors] = useState(false);
    const [colorMode, setColorMode] = useState<'text' | 'background'>('text');
    const [currentColor, setCurrentColor] = useState('#000000');
    
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');

    // Selection Persistence
    const [savedRange, setSavedRange] = useState<Range | null>(null);
    
    const editorRef = useRef<HTMLDivElement>(null);
    const contentFileInputRef = useRef<HTMLInputElement>(null);

    // --- Initialization ---
    useEffect(() => {
        if (editorRef.current && post?.content) {
            // Only set initial content if empty to avoid overwriting if react re-renders weirdly, 
            // but since we use key-based remounting or explicit open/close, straight assignment on mount is fine.
            // However, if we switch posts without unmounting, we need to handle it.
            // But typically CMSEditor is conditionally rendered.
            if (editorRef.current.innerHTML !== post.content) {
                editorRef.current.innerHTML = post.content;
            }
        }
    }, [post]); // Added post dependency just in case

    // Slug Normalization
    useEffect(() => {
        if (!post?.slug && title && !slug) {
             setSlug(title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
        }
    }, [title]); // Removed slug dependency to prevent loop if user edits slug manually

    // --- Selection Helpers ---
    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            setSavedRange(sel.getRangeAt(0));
        }
    };

    const restoreSelection = () => {
        const sel = window.getSelection();
        if (sel && savedRange) {
            sel.removeAllRanges();
            sel.addRange(savedRange);
        }
    };

    // --- Editor Command Logic ---
    const execCmd = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        checkActiveFormats();
        editorRef.current?.focus();
    };

    const checkActiveFormats = () => {
        if (!document.getSelection()?.rangeCount) return;
        
        const formats: any = {
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            underline: document.queryCommandState('underline'),
            strikethrough: document.queryCommandState('strikethrough'),
            justifyLeft: document.queryCommandState('justifyLeft'),
            justifyCenter: document.queryCommandState('justifyCenter'),
            justifyRight: document.queryCommandState('justifyRight'),
            insertUnorderedList: document.queryCommandState('insertUnorderedList'),
            insertOrderedList: document.queryCommandState('insertOrderedList'),
        };
        
        try {
            const blockValue = document.queryCommandValue('formatBlock');
            formats.blockType = blockValue;
        } catch (e) {
            formats.blockType = 'p';
        }

        setActiveFormats(formats);
    };

    // --- Link Logic ---
    const openLinkInput = () => {
        saveSelection();
        const sel = window.getSelection();
        if (sel && sel.anchorNode) {
            const parentLink = sel.anchorNode.parentElement?.closest('a');
            if (parentLink) {
                setLinkUrl(parentLink.getAttribute('href') || '');
            } else {
                setLinkUrl('');
            }
        }
        setShowLinkInput(true);
    };

    const applyLink = () => {
        restoreSelection();
        if (linkUrl) {
            execCmd('createLink', linkUrl);
        } else {
            execCmd('unlink');
        }
        setShowLinkInput(false);
        setLinkUrl('');
    };
    
    const removeLink = () => {
        restoreSelection();
        execCmd('unlink');
        setShowLinkInput(false);
        setLinkUrl('');
    };

    // --- Image Logic ---
    const handleContentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                restoreSelection();
                // Upload
                const url = await uploadImageAndGetURL(file, 'cms_content');
                // Insert
                execCmd('insertImage', url);
            } catch (error) {
                console.error("Image upload failed", error);
                alert("Failed to upload image.");
            }
        }
    };

    const triggerImageUpload = () => {
        saveSelection();
        contentFileInputRef.current?.click();
    }

    // --- Other Helpers ---
    const insertTable = () => {
        const html = `
            <table style="width:100%; border-collapse: collapse; margin: 1em 0;">
                <tbody>
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 8px;">Cell 1</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">Cell 2</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">Cell 3</td>
                    </tr>
                </tbody>
            </table>
            <p><br></p>
        `;
        execCmd('insertHTML', html);
    };

    const applyColor = (color: string) => {
        restoreSelection(); // Ensure we apply to the right place if focus drifted
        if (colorMode === 'text') {
            execCmd('foreColor', color);
        } else {
            execCmd('hiliteColor', color);
        }
        setCurrentColor(color);
    };

    const handleHeading = (tag: string) => {
        const currentTag = activeFormats.blockType;
        // Toggle logic: if already this tag, switch back to paragraph
        if (currentTag && currentTag.toLowerCase() === tag.toLowerCase()) {
            execCmd('formatBlock', 'p');
        } else {
            execCmd('formatBlock', tag);
        }
        setShowHeadings(false);
    };
    
    const getBlockLabel = () => {
        const tag = activeFormats.blockType || '';
        if (!tag) return 'Format';
        const t = String(tag).toLowerCase();
        if (t === 'p' || t === 'div') return 'Paragraph';
        if (t === 'h1') return 'Heading 1';
        if (t === 'h2') return 'Heading 2';
        if (t === 'h3') return 'Heading 3';
        if (t === 'blockquote') return 'Quote';
        return 'Format';
    };

    // --- Save Logic ---
    const handleSave = async () => {
        if (!title) return alert("Title is required");
        
        // Normalize slug on save (ensure safe URL string)
        let finalSlug = slug.trim();
        if (!finalSlug) {
            finalSlug = title;
        }
        finalSlug = finalSlug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        setIsSaving(true);
        try {
            const currentContent = editorRef.current?.innerHTML || '';
            
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
            onClose(); // Close editor after save, or maybe just show toast. Closing is safer for state sync.
        } catch (error) {
            console.error(error);
            alert("Failed to save");
        } finally {
            setIsSaving(false);
        }
    };

    // --- AI Logic ---
    const aiMagicWrite = async (instruction: string) => {
        if (hasApiKey === false) { await promptForKeySelection(); return; }
        
        const selection = window.getSelection();
        const selectedText = selection?.toString();
        
        if (!selectedText && instruction !== 'continue') {
            alert("Please select some text to edit.");
            return;
        }

        setIsAiWorking(true);
        try {
            const ai = await getGoogleGenAI();
            let promptConfig;
            let populatedPrompt = "";
            
            if (instruction === 'continue') {
                 const context = editorRef.current?.innerText.slice(-1000) || title;
                 promptConfig = getPrompt('cms-continue-writing');
                 if (promptConfig) {
                     populatedPrompt = promptConfig.template.replace('{{context}}', context);
                 } else {
                     // Fallback
                     populatedPrompt = `Continue writing based on: ${context}`;
                 }
            } else if (instruction === 'fix') {
                 promptConfig = getPrompt('cms-fix-grammar');
                 if (promptConfig) {
                     populatedPrompt = promptConfig.template.replace('{{text}}', selectedText || '');
                 } else {
                     populatedPrompt = `Fix grammar: "${selectedText}"`;
                 }
            }

            const modelName = promptConfig?.model || 'gemini-2.5-flash';

            const response = await ai.models.generateContent({
                model: modelName,
                contents: populatedPrompt,
            });
            
            // Log API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: activeProject?.id,
                    model: modelName,
                    feature: `cms-${instruction}`,
                    success: true
                });
            }
            
            const result = response.text.trim();
            execCmd('insertHTML', result);

        } catch (error: any) {
            // Log failed API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: activeProject?.id,
                    model: promptConfig?.model || 'gemini-2.5-flash',
                    feature: `cms-${instruction}`,
                    success: false,
                    errorMessage: error.message || 'Unknown error'
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
        try {
            const ai = await getGoogleGenAI();
            const contentPreview = editorRef.current?.innerText.substring(0, 2000) || '';
            
            const promptConfig = getPrompt('cms-generate-seo');
            let populatedPrompt = "";
            let modelName = 'gemini-2.5-flash';

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
            
            // Log API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: activeProject?.id,
                    model: modelName,
                    feature: 'cms-generate-seo',
                    success: true
                });
            }
            
            const data = JSON.parse(response.text);
            setSeoTitle(data.seoTitle);
            setSeoDescription(data.seoDescription);
        } catch (error: any) {
            // Log failed API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: activeProject?.id,
                    model: modelName,
                    feature: 'cms-generate-seo',
                    success: false,
                    errorMessage: error.message || 'Unknown error'
                });
            }
            handleApiError(error);
            console.error(error);
        } finally {
            setIsAiWorking(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background text-foreground absolute inset-0 z-50">
            <ImageGeneratorModal isOpen={isImageModalOpen} onClose={() => setIsImageModalOpen(false)} destination="user" />

            {/* --- Header --- */}
            <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0 z-30 shadow-sm">
                <div className="flex items-center gap-4 w-1/3">
                    <button onClick={onClose} className="p-2 -ml-2 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="h-6 w-px bg-border"></div>
                    <input 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter Post Title..."
                        className="bg-transparent text-xl font-bold placeholder:text-muted-foreground/50 focus:outline-none w-full text-foreground truncate"
                    />
                </div>
                <div className="flex items-center justify-end gap-3 w-1/3">
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

            <div className="flex flex-1 overflow-hidden relative">
                
                {/* --- Main Editor Area --- */}
                <div className="flex-1 flex flex-col min-w-0 bg-[#e5e7eb] relative"> 
                    
                    {/* --- Toolbar --- */}
                    <div className="bg-[#f9fafb] border-b border-gray-300 p-2 flex flex-wrap gap-1 shrink-0 shadow-sm z-20 relative items-center text-black">
                        
                        {/* History */}
                        <div className="flex bg-white border border-gray-300 rounded-md shadow-sm mr-2">
                            <ToolbarButton onClick={() => execCmd('undo')} title="Undo"><Undo size={16} /></ToolbarButton>
                            <ToolbarButton onClick={() => execCmd('redo')} title="Redo"><Redo size={16} /></ToolbarButton>
                        </div>

                        {/* Headings Dropdown */}
                        <div className="relative mr-2">
                            <button
                                onMouseDown={(e) => { e.preventDefault(); setShowHeadings(!showHeadings); }}
                                className="flex items-center justify-between w-32 px-2 py-1.5 bg-white border border-gray-300 rounded-md shadow-sm text-sm text-gray-700 hover:bg-gray-50"
                            >
                                <span className="truncate font-medium">{getBlockLabel()}</span>
                                <ChevronDown size={14} className="ml-1 opacity-50" />
                            </button>
                            {showHeadings && (
                                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1 text-black">
                                    <button onMouseDown={(e) => { e.preventDefault(); handleHeading('p'); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"><Type size={14} className="mr-2"/> Paragraph</button>
                                    <button onMouseDown={(e) => { e.preventDefault(); handleHeading('h1'); }} className="block w-full text-left px-4 py-2 text-lg font-bold text-gray-900 hover:bg-gray-100 flex items-center"><Heading1 size={18} className="mr-2"/> Heading 1</button>
                                    <button onMouseDown={(e) => { e.preventDefault(); handleHeading('h2'); }} className="block w-full text-left px-4 py-2 text-md font-bold text-gray-800 hover:bg-gray-100 flex items-center"><Heading2 size={16} className="mr-2"/> Heading 2</button>
                                    <button onMouseDown={(e) => { e.preventDefault(); handleHeading('h3'); }} className="block w-full text-left px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100 flex items-center"><Heading3 size={14} className="mr-2"/> Heading 3</button>
                                    <div className="border-t my-1"></div>
                                    <button onMouseDown={(e) => { e.preventDefault(); handleHeading('blockquote'); }} className="block w-full text-left px-4 py-2 text-sm italic text-gray-600 hover:bg-gray-100 flex items-center"><Quote size={14} className="mr-2"/> Quote</button>
                                </div>
                            )}
                        </div>

                        <ToolbarDivider />

                        {/* Typography */}
                        <div className="flex bg-white border border-gray-300 rounded-md shadow-sm mr-2">
                            <ToolbarButton onClick={() => execCmd('bold')} isActive={activeFormats.bold} title="Bold"><Bold size={16} /></ToolbarButton>
                            <ToolbarButton onClick={() => execCmd('italic')} isActive={activeFormats.italic} title="Italic"><Italic size={16} /></ToolbarButton>
                            <ToolbarButton onClick={() => execCmd('underline')} isActive={activeFormats.underline} title="Underline"><Underline size={16} /></ToolbarButton>
                            <ToolbarButton onClick={() => execCmd('strikeThrough')} isActive={activeFormats.strikethrough} title="Strikethrough"><Strikethrough size={16} /></ToolbarButton>
                        </div>

                         {/* Advanced Color Dropdown */}
                         <div className="relative mr-2">
                            <button
                                onMouseDown={(e) => { e.preventDefault(); setShowColors(!showColors); }}
                                className="p-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 flex items-center justify-center text-gray-700 relative group"
                                title="Text Colors"
                            >
                                <Palette size={16} />
                                <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-gray-300" style={{ backgroundColor: currentColor }}></div>
                            </button>
                            {showColors && (
                                <div className="absolute top-full left-0 mt-1 p-3 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 w-64 animate-fade-in-up text-black">
                                    <div className="flex mb-3 bg-gray-100 rounded-lg p-1">
                                        <button onClick={() => setColorMode('text')} className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-colors ${colorMode === 'text' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-700'}`}>Text</button>
                                        <button onClick={() => setColorMode('background')} className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-colors ${colorMode === 'background' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-700'}`}>Background</button>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center border border-gray-300 rounded-md px-2 bg-white">
                                            <Hash size={14} className="text-gray-400 mr-1"/>
                                            <input 
                                                type="text" 
                                                value={currentColor}
                                                onChange={(e) => applyColor(e.target.value)}
                                                className="flex-1 text-xs py-1.5 focus:outline-none font-mono uppercase text-black"
                                                placeholder="#000000"
                                            />
                                            <div className="w-4 h-4 rounded border border-gray-200" style={{ backgroundColor: currentColor }}></div>
                                        </div>
                                        <div className="relative w-full h-8 rounded-md overflow-hidden cursor-pointer border border-gray-300">
                                            <input 
                                                type="color" 
                                                value={currentColor}
                                                onChange={(e) => applyColor(e.target.value)}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500 bg-gray-50 hover:bg-gray-100">
                                                Open Color Wheel
                                            </div>
                                        </div>
                                        <div className="h-px bg-gray-200"></div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Presets</p>
                                            <div className="grid grid-cols-6 gap-1.5">
                                                {['#000000', '#4b5563', '#9ca3af', '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', 'transparent'].map(c => (
                                                    <button 
                                                        key={c} 
                                                        onMouseDown={(e) => { e.preventDefault(); applyColor(c); }} 
                                                        className="w-6 h-6 rounded-full border border-gray-200 hover:scale-110 transition-transform relative" 
                                                        style={{ backgroundColor: c === 'transparent' ? 'white' : c }}
                                                        title={c}
                                                    >
                                                        {c === 'transparent' && <div className="absolute inset-0 flex items-center justify-center text-red-500"><XIcon size={12}/></div>}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <ToolbarDivider />

                        {/* Alignment */}
                        <div className="flex bg-white border border-gray-300 rounded-md shadow-sm mr-2">
                            <ToolbarButton onClick={() => execCmd('justifyLeft')} isActive={activeFormats.justifyLeft} title="Align Left"><AlignLeft size={16} /></ToolbarButton>
                            <ToolbarButton onClick={() => execCmd('justifyCenter')} isActive={activeFormats.justifyCenter} title="Center"><AlignCenter size={16} /></ToolbarButton>
                            <ToolbarButton onClick={() => execCmd('justifyRight')} isActive={activeFormats.justifyRight} title="Align Right"><AlignRight size={16} /></ToolbarButton>
                        </div>

                        {/* Lists */}
                        <div className="flex bg-white border border-gray-300 rounded-md shadow-sm mr-2">
                            <ToolbarButton onClick={() => execCmd('insertUnorderedList')} isActive={activeFormats.insertUnorderedList} title="Bullet List"><List size={16} /></ToolbarButton>
                            <ToolbarButton onClick={() => execCmd('insertOrderedList')} isActive={activeFormats.insertOrderedList} title="Numbered List"><ListOrdered size={16} /></ToolbarButton>
                        </div>

                        <ToolbarDivider />

                        {/* Inserts */}
                        <div className="flex bg-white border border-gray-300 rounded-md shadow-sm relative">
                             {/* Link Popover Trigger */}
                            <ToolbarButton onClick={openLinkInput} title="Link" isActive={showLinkInput}><LinkIcon size={16} /></ToolbarButton>
                            
                            {/* Link Popover */}
                            {showLinkInput && (
                                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-xl z-50 p-3 text-black">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Edit Link</label>
                                    <div className="flex gap-2 mb-2">
                                        <input 
                                            type="text" 
                                            value={linkUrl}
                                            onChange={(e) => setLinkUrl(e.target.value)}
                                            placeholder="https://example.com"
                                            className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                            onKeyDown={(e) => e.key === 'Enter' && applyLink()}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <button onMouseDown={(e) => {e.preventDefault(); removeLink();}} className="text-xs text-red-500 hover:underline flex items-center"><Unlink size={10} className="mr-1"/> Remove</button>
                                        <div className="flex gap-2">
                                            <button onMouseDown={(e) => {e.preventDefault(); setShowLinkInput(false); restoreSelection();}} className="p-1 hover:bg-gray-100 rounded"><XIcon size={14}/></button>
                                            <button onMouseDown={(e) => {e.preventDefault(); applyLink();}} className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"><Check size={14}/></button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="relative">
                                <input 
                                    type="file" 
                                    ref={contentFileInputRef}
                                    onChange={handleContentImageUpload}
                                    className="hidden"
                                    accept="image/*"
                                />
                                <ToolbarButton onClick={triggerImageUpload} title="Upload Image"><UploadIcon size={16} /></ToolbarButton>
                            </div>

                            <ToolbarButton onClick={insertTable} title="Insert Table"><Table size={16} /></ToolbarButton>
                            <ToolbarButton onClick={() => execCmd('insertHorizontalRule')} title="Horizontal Line"><Minus size={16} /></ToolbarButton>
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                             <ToolbarButton onClick={() => execCmd('removeFormat')} title="Clear Formatting"><RemoveFormatting size={16} /></ToolbarButton>
                             <div className="bg-purple-50 border border-purple-200 rounded-md flex items-center p-0.5">
                                <span className="px-2 text-xs font-bold text-purple-700 flex items-center"><Sparkles size={10} className="mr-1"/> AI</span>
                                <button onMouseDown={(e) => { e.preventDefault(); aiMagicWrite('fix'); }} className="px-2 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 rounded disabled:opacity-50" disabled={isAiWorking}>{t('postEditor.fixGrammar')}</button>
                                <button onMouseDown={(e) => { e.preventDefault(); aiMagicWrite('continue'); }} className="px-2 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 rounded disabled:opacity-50" disabled={isAiWorking}>{t('postEditor.continue')}</button>
                             </div>
                        </div>
                    </div>

                    {/* --- WYSIWYG Canvas --- */}
                    <div 
                        className="flex-1 overflow-y-auto p-8 flex justify-center cursor-text" 
                        onClick={() => editorRef.current?.focus()}
                        onMouseUp={checkActiveFormats}
                        onKeyUp={checkActiveFormats}
                    >
                        <div 
                            ref={editorRef}
                            contentEditable
                            className="w-full max-w-[816px] min-h-[1056px] bg-white text-black shadow-2xl p-[96px] outline-none prose prose-lg prose-slate max-w-none selection:bg-blue-200 selection:text-black [&_img]:inline-block [&_img]:mx-1 [&_img]:my-2 [&_img]:max-w-full"
                            style={{ 
                                boxShadow: '0 20px 50px -12px rgba(0,0,0,0.25)',
                                border: '1px solid #e5e7eb'
                            }}
                        />
                    </div>
                </div>

                {/* --- Settings Sidebar --- */}
                {isSidebarOpen && (
                    <aside className="w-80 bg-card border-l border-border overflow-y-auto p-6 shrink-0 z-20 shadow-xl custom-scrollbar">
                         <div className="mb-6">
                            <h3 className="font-bold text-lg mb-1 flex items-center"><Type className="mr-2 text-primary" /> {t('postEditor.postSettings')}</h3>
                            <p className="text-xs text-muted-foreground">{t('postEditor.configureMetadata')}</p>
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">{t('postEditor.urlSlug')}</label>
                                <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">{t('postEditor.featuredImage')}</label>
                                <ImagePicker label="" value={featuredImage} onChange={setFeaturedImage} />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">{t('postEditor.excerpt')}</label>
                                <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={4} className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none resize-none text-foreground" placeholder="Short summary for listings..." />
                            </div>

                            <div className="pt-6 border-t border-border">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-sm flex items-center"><Globe size={16} className="mr-2" /> {t('postEditor.seoSettings')}</h4>
                                    <button onClick={generateSEO} disabled={isAiWorking} className="text-xs font-bold text-yellow-400 hover:text-yellow-300 flex items-center"><Sparkles size={12} className="mr-1" /> {t('postEditor.autoGenerate')}</button>
                                </div>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">{t('postEditor.seoTitle')}</label>
                                        <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground" placeholder="Max 60 characters" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">{t('postEditor.seoDescription')}</label>
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

export default CMSEditor;