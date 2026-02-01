/**
 * AppArticleEditor
 * Editor de artículos para la App Quimera (blog, noticias, tutoriales)
 * Estos artículos se muestran en la landing page pública de Quimera
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContent } from '../../../contexts/appContent';
import { useToast } from '../../../contexts/ToastContext';
import { AppArticle, AppArticleCategory } from '../../../types/appContent';
import { 
    ArrowLeft, 
    Save, 
    Eye, 
    Globe, 
    FileText, 
    Image as ImageIcon,
    Star,
    Clock,
    Tag,
    Loader2,
    X,
    Upload,
    Link as LinkIcon,
    Bold,
    Italic,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    Quote,
    Code
} from 'lucide-react';

interface AppArticleEditorProps {
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
];

const AppArticleEditor: React.FC<AppArticleEditorProps> = ({ article, onClose }) => {
    const { t } = useTranslation();
    const { saveArticle } = useAppContent();
    const { showToast } = useToast();
    
    const [isSaving, setIsSaving] = useState(false);
    const [isPreview, setIsPreview] = useState(false);
    
    // Form state
    const [title, setTitle] = useState(article?.title || '');
    const [slug, setSlug] = useState(article?.slug || '');
    const [excerpt, setExcerpt] = useState(article?.excerpt || '');
    const [content, setContent] = useState(article?.content || '');
    const [featuredImage, setFeaturedImage] = useState(article?.featuredImage || '');
    const [category, setCategory] = useState<AppArticleCategory>(article?.category || 'blog');
    const [status, setStatus] = useState<'published' | 'draft'>(article?.status || 'draft');
    const [featured, setFeatured] = useState(article?.featured || false);
    const [tags, setTags] = useState<string[]>(article?.tags || []);
    const [tagInput, setTagInput] = useState('');
    const [author, setAuthor] = useState(article?.author || 'Quimera Team');
    
    // SEO
    const [metaTitle, setMetaTitle] = useState(article?.seo?.metaTitle || '');
    const [metaDescription, setMetaDescription] = useState(article?.seo?.metaDescription || '');

    // Auto-generate slug from title
    useEffect(() => {
        if (!article && title) {
            const generatedSlug = title
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim();
            setSlug(generatedSlug);
        }
    }, [title, article]);

    const handleAddTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleSave = async (publishStatus?: 'published' | 'draft') => {
        if (!title.trim()) {
            showToast('Please enter a title', 'error');
            return;
        }
        if (!slug.trim()) {
            showToast('Please enter a URL slug', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const articleData: AppArticle = {
                id: article?.id || '',
                title: title.trim(),
                slug: slug.trim(),
                excerpt: excerpt.trim(),
                content,
                featuredImage,
                category,
                status: publishStatus || status,
                featured,
                tags,
                author,
                authorImage: article?.authorImage,
                views: article?.views || 0,
                createdAt: article?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                publishedAt: article?.publishedAt,
                seo: {
                    metaTitle: metaTitle || title,
                    metaDescription: metaDescription || excerpt,
                    metaKeywords: tags,
                }
            };

            await saveArticle(articleData);
            showToast(
                publishStatus === 'published' 
                    ? 'Article published successfully!' 
                    : 'Article saved successfully!', 
                'success'
            );
            onClose();
        } catch (error) {
            console.error('Error saving article:', error);
            showToast('Error saving article. Please try again.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const insertFormatting = (tag: string, wrap?: string) => {
        const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);
        
        let newText: string;
        if (wrap) {
            newText = `<${tag}>${selectedText || 'text'}</${tag}>`;
        } else {
            newText = `<${tag}>${selectedText || 'text'}</${tag}>`;
        }
        
        const newContent = content.substring(0, start) + newText + content.substring(end);
        setContent(newContent);
    };

    return (
        <div className="flex h-screen bg-background text-foreground">
            {/* Main Editor */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-14 bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft size={16} />
                            Back
                        </button>
                        <div className="h-6 w-px bg-border" />
                        <h1 className="text-lg font-semibold">
                            {article ? 'Edit Article' : 'New Article'}
                        </h1>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsPreview(!isPreview)}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                isPreview ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Eye size={14} />
                            Preview
                        </button>
                        
                        <button
                            onClick={() => handleSave('draft')}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-secondary hover:bg-secondary/80 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            Save Draft
                        </button>
                        
                        <button
                            onClick={() => handleSave('published')}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
                            Publish
                        </button>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {isPreview ? (
                        /* Preview Mode */
                        <div className="max-w-4xl mx-auto p-8">
                            {featuredImage && (
                                <img 
                                    src={featuredImage} 
                                    alt={title} 
                                    className="w-full h-64 object-cover rounded-xl mb-8"
                                />
                            )}
                            <div className="flex items-center gap-3 mb-4">
                                <span className="px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                                    {category}
                                </span>
                                {featured && (
                                    <span className="px-3 py-1 text-xs font-medium bg-yellow-500/10 text-yellow-600 rounded-full flex items-center gap-1">
                                        <Star size={12} /> Featured
                                    </span>
                                )}
                            </div>
                            <h1 className="text-4xl font-bold mb-4">{title || 'Untitled Article'}</h1>
                            <p className="text-lg text-muted-foreground mb-6">{excerpt}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
                                <span>By {author}</span>
                                <span>•</span>
                                <span>{new Date().toLocaleDateString()}</span>
                            </div>
                            <div 
                                className="prose prose-lg dark:prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: content }}
                            />
                        </div>
                    ) : (
                        /* Editor Mode */
                        <div className="max-w-5xl mx-auto p-6 space-y-6">
                            {/* Title */}
                            <div>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Article title..."
                                    className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
                                />
                            </div>

                            {/* Slug */}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <LinkIcon size={14} />
                                <span>/blog/</span>
                                <input
                                    type="text"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                    className="flex-1 bg-secondary/30 px-2 py-1 rounded border border-border outline-none focus:border-primary"
                                />
                            </div>

                            {/* Featured Image */}
                            <div className="border border-dashed border-border rounded-xl p-6">
                                {featuredImage ? (
                                    <div className="relative">
                                        <img 
                                            src={featuredImage} 
                                            alt="Featured" 
                                            className="w-full h-48 object-cover rounded-lg"
                                        />
                                        <button
                                            onClick={() => setFeaturedImage('')}
                                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-8">
                                        <ImageIcon size={40} className="text-muted-foreground/30 mb-3" />
                                        <p className="text-sm text-muted-foreground mb-3">Add a featured image</p>
                                        <input
                                            type="text"
                                            value={featuredImage}
                                            onChange={(e) => setFeaturedImage(e.target.value)}
                                            placeholder="Paste image URL..."
                                            className="w-full max-w-md px-3 py-2 text-sm bg-secondary/30 border border-border rounded-lg outline-none focus:border-primary"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Excerpt */}
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-2">
                                    Excerpt / Summary
                                </label>
                                <textarea
                                    value={excerpt}
                                    onChange={(e) => setExcerpt(e.target.value)}
                                    placeholder="Brief summary of the article..."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-lg outline-none focus:border-primary resize-none"
                                />
                            </div>

                            {/* Content Editor */}
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-2">
                                    Content (HTML)
                                </label>
                                
                                {/* Toolbar */}
                                <div className="flex items-center gap-1 p-2 bg-secondary/20 border border-border border-b-0 rounded-t-lg">
                                    <button
                                        onClick={() => insertFormatting('strong')}
                                        className="p-2 hover:bg-secondary rounded transition-colors"
                                        title="Bold"
                                    >
                                        <Bold size={14} />
                                    </button>
                                    <button
                                        onClick={() => insertFormatting('em')}
                                        className="p-2 hover:bg-secondary rounded transition-colors"
                                        title="Italic"
                                    >
                                        <Italic size={14} />
                                    </button>
                                    <div className="w-px h-6 bg-border mx-1" />
                                    <button
                                        onClick={() => insertFormatting('h2')}
                                        className="p-2 hover:bg-secondary rounded transition-colors"
                                        title="Heading 2"
                                    >
                                        <Heading1 size={14} />
                                    </button>
                                    <button
                                        onClick={() => insertFormatting('h3')}
                                        className="p-2 hover:bg-secondary rounded transition-colors"
                                        title="Heading 3"
                                    >
                                        <Heading2 size={14} />
                                    </button>
                                    <div className="w-px h-6 bg-border mx-1" />
                                    <button
                                        onClick={() => insertFormatting('ul')}
                                        className="p-2 hover:bg-secondary rounded transition-colors"
                                        title="Unordered List"
                                    >
                                        <List size={14} />
                                    </button>
                                    <button
                                        onClick={() => insertFormatting('ol')}
                                        className="p-2 hover:bg-secondary rounded transition-colors"
                                        title="Ordered List"
                                    >
                                        <ListOrdered size={14} />
                                    </button>
                                    <div className="w-px h-6 bg-border mx-1" />
                                    <button
                                        onClick={() => insertFormatting('blockquote')}
                                        className="p-2 hover:bg-secondary rounded transition-colors"
                                        title="Quote"
                                    >
                                        <Quote size={14} />
                                    </button>
                                    <button
                                        onClick={() => insertFormatting('code')}
                                        className="p-2 hover:bg-secondary rounded transition-colors"
                                        title="Code"
                                    >
                                        <Code size={14} />
                                    </button>
                                </div>
                                
                                <textarea
                                    id="content-editor"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Write your article content here (HTML supported)..."
                                    rows={15}
                                    className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-b-lg outline-none focus:border-primary resize-none font-mono text-sm"
                                />
                            </div>

                            {/* Meta Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-secondary/10 rounded-xl border border-border">
                                {/* Category */}
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                                        Category
                                    </label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value as AppArticleCategory)}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary"
                                    >
                                        {CATEGORIES.map(cat => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Author */}
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                                        Author
                                    </label>
                                    <input
                                        type="text"
                                        value={author}
                                        onChange={(e) => setAuthor(e.target.value)}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary"
                                    />
                                </div>

                                {/* Tags */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                                        Tags
                                    </label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {tags.map(tag => (
                                            <span
                                                key={tag}
                                                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-secondary rounded-full"
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
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                            placeholder="Add a tag..."
                                            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary"
                                        />
                                        <button
                                            onClick={handleAddTag}
                                            className="px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>

                                {/* Featured Toggle */}
                                <div className="md:col-span-2 flex items-center justify-between p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Star className="text-yellow-500" size={20} />
                                        <div>
                                            <p className="font-medium">Featured Article</p>
                                            <p className="text-sm text-muted-foreground">Show this article prominently on the homepage</p>
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
                            </div>

                            {/* SEO Section */}
                            <div className="p-6 bg-secondary/10 rounded-xl border border-border">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <Globe size={16} />
                                    SEO Settings
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                                            Meta Title
                                        </label>
                                        <input
                                            type="text"
                                            value={metaTitle}
                                            onChange={(e) => setMetaTitle(e.target.value)}
                                            placeholder={title || 'SEO title...'}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                                            Meta Description
                                        </label>
                                        <textarea
                                            value={metaDescription}
                                            onChange={(e) => setMetaDescription(e.target.value)}
                                            placeholder={excerpt || 'SEO description...'}
                                            rows={2}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary resize-none"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {metaDescription.length}/160 characters
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AppArticleEditor;






