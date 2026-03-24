import React, { useState, useMemo, useRef } from 'react';
import { X, Sparkles, ArrowRight, Loader2, CheckCircle, Upload, Image as ImageIcon, Film, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
    generateContentViaProxy,
    generateMultimodalContentViaProxy,
    extractTextFromResponse,
    fileToMediaInput,
    type MediaInput
} from '../../utils/geminiProxyClient';
import { CMSPost } from '../../types';
import { useAuth } from '../../contexts/core/AuthContext';
import { useProject } from '../../contexts/project';
import { useAdmin } from '../../contexts/admin';
import { sanitizeHtml } from '../../utils/sanitize';
import { logApiCall } from '../../services/apiLoggingService';

interface ContentCreatorAssistantProps {
    onClose: () => void;
    onPostCreated: (post: CMSPost) => void;
}

type Step = 'topic' | 'details' | 'generating' | 'preview';

const ContentCreatorAssistant: React.FC<ContentCreatorAssistantProps> = ({ onClose, onPostCreated }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { activeProject } = useProject();
    const { getPrompt } = useAdmin();
    const [step, setStep] = useState<Step>('topic');
    const [topic, setTopic] = useState('');
    const [sourceUrl, setSourceUrl] = useState('');
    const [audience, setAudience] = useState('');
    const [tone, setTone] = useState('professional');
    const [contentType, setContentType] = useState('blog');
    const [outputLanguage, setOutputLanguage] = useState('es');
    const [generatedPost, setGeneratedPost] = useState<Partial<CMSPost> | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Media upload state
    const [mediaFiles, setMediaFiles] = useState<MediaInput[]>([]);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const mediaInputRef = useRef<HTMLInputElement>(null);

    // Tones configuration
    const tones = [
        { id: 'professional', label: t('cms_assistant.tones.professional') },
        { id: 'friendly', label: t('cms_assistant.tones.friendly') },
        { id: 'persuasive', label: t('cms_assistant.tones.persuasive') },
        { id: 'informative', label: t('cms_assistant.tones.informative') },
        { id: 'funny', label: t('cms_assistant.tones.funny') },
        { id: 'minimalist', label: t('cms_assistant.tones.minimalist') }
    ];

    // Content types configuration
    const contentTypes = [
        { id: 'blog', label: 'Blog Estándar' },
        { id: 'gallery', label: 'Galería (Imágenes/Proyectos)' },
        { id: 'profile', label: 'Perfil (Bio/Directorio)' }
    ];

    // Output language options
    const languages = [
        { id: 'es', label: 'Español', flag: '🇪🇸' },
        { id: 'en', label: 'English', flag: '🇺🇸' },
        { id: 'fr', label: 'Français', flag: '🇫🇷' },
        { id: 'pt', label: 'Português', flag: '🇧🇷' },
        { id: 'de', label: 'Deutsch', flag: '🇩🇪' }
    ];

    // Helper function to attempt repairing truncated JSON
    const attemptRepairJSON = (text: string): object | null => {
        try {
            // First try direct parse
            return JSON.parse(text);
        } catch (e) {
            console.log('⚠️ Attempting to repair truncated JSON...');

            // Try to find and complete truncated JSON
            let repaired = text.trim();

            // Count open/close braces and brackets
            const openBraces = (repaired.match(/{/g) || []).length;
            const closeBraces = (repaired.match(/}/g) || []).length;
            const openBrackets = (repaired.match(/\[/g) || []).length;
            const closeBrackets = (repaired.match(/]/g) || []).length;

            // Check if we're in the middle of a string (unterminated string error)
            // Find the last quote and check if it's balanced
            const lastPropertyMatch = repaired.match(/"([^"]+)":\s*"[^"]*$/);
            if (lastPropertyMatch) {
                // We have an unterminated string, close it
                repaired = repaired + '"';
                console.log('🔧 Closed unterminated string');
            }

            // Add missing closing braces
            for (let i = 0; i < openBrackets - closeBrackets; i++) {
                repaired += ']';
            }
            for (let i = 0; i < openBraces - closeBraces; i++) {
                repaired += '}';
            }

            // Remove trailing commas before closing braces/brackets
            repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

            try {
                const result = JSON.parse(repaired);
                console.log('✅ JSON repaired successfully');
                return result;
            } catch (e2) {
                console.error('❌ Could not repair JSON:', e2);
                return null;
            }
        }
    };

    // Media upload handlers
    const handleMediaUpload = async (file: File) => {
        try {
            const isVideo = file.type.startsWith('video/');
            const isImage = file.type.startsWith('image/');
            if (!isImage && !isVideo) {
                alert(t('cms_assistant.invalidFileType'));
                return;
            }
            // Size limit: 20MB images, 50MB videos
            const maxSize = isVideo ? 50 * 1024 * 1024 : 20 * 1024 * 1024;
            if (file.size > maxSize) {
                alert(t('cms_assistant.fileTooLarge'));
                return;
            }
            const mediaInput = await fileToMediaInput(file);
            setMediaFiles([mediaInput]);
            setMediaType(isVideo ? 'video' : 'image');
            // Create preview URL
            const previewUrl = URL.createObjectURL(file);
            setMediaPreview(previewUrl);
        } catch (error) {
            console.error('Media upload error:', error);
        }
    };

    const handleMediaDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleMediaUpload(file);
    };

    const handleMediaInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleMediaUpload(file);
        // Reset input so the same file can be re-uploaded
        if (mediaInputRef.current) mediaInputRef.current.value = '';
    };

    const removeMedia = () => {
        setMediaFiles([]);
        setMediaPreview(null);
        setMediaType(null);
    };

    const handleGenerate = async () => {
        if (!topic) return;

        setIsGenerating(true);
        setStep('generating');

        let modelToUse = 'gemini-2.5-flash'; // Default fallback - declared outside try for error logging
        const hasMedia = mediaFiles.length > 0;

        try {
            // Get dynamic prompt
            const promptTemplate = getPrompt('content-creator-assistant');

            let promptText = '';

            // For non-blog content types, build a dedicated prompt from scratch
            if (contentType === 'profile') {
                modelToUse = promptTemplate?.model || 'gemini-2.5-flash';
                promptText = `Act as a professional content writer. Create a PROFILE/BIOGRAPHY entry based on the following inputs:
- Subject/Topic: ${topic}
- Target Audience: ${audience || 'General audience'}
- Tone: ${tone}

Return a JSON object with the following fields:
- title: The person's or entity's full name (NOT an article title)
- slug: A SEO-friendly slug based on the name (kebab-case)
- excerpt: Their professional title or headline (e.g. "CEO de Empresa X | Experto en Marketing Digital")
- content: A detailed professional biography in HTML using <h2>, <h3>, <p>, and <ul>/<li> tags. Include background, achievements, skills, and career highlights. Minimum 300 words.
- seoTitle: SEO optimized title with their name and role (60 characters max)
- seoDescription: SEO optimized description about them (155 characters max)

Output ONLY valid JSON without any markdown formatting or code blocks.
CRUCIAL: YOU MUST OUTPUT EXACTLY 1 VALID JSON OBJECT AND NOTHING ELSE.`;
            } else if (contentType === 'gallery') {
                modelToUse = promptTemplate?.model || 'gemini-2.5-flash';
                promptText = `Act as a professional content writer. Create a GALLERY/PORTFOLIO entry based on the following inputs:
- Subject/Topic: ${topic}
- Target Audience: ${audience || 'General audience'}
- Tone: ${tone}

Return a JSON object with the following fields:
- title: A short, visually descriptive title for the artwork, photo, or project (NOT an article title)
- slug: A SEO-friendly slug (kebab-case)
- excerpt: A brief image caption (under 100 characters, suitable for display under a photo)
- content: The full backstory, technique details, inspiration, or project description in HTML using <h2>, <h3>, <p>, and <ul>/<li> tags. Minimum 200 words.
- seoTitle: SEO optimized title (60 characters max)
- seoDescription: SEO optimized description (155 characters max)

Output ONLY valid JSON without any markdown formatting or code blocks.
CRUCIAL: YOU MUST OUTPUT EXACTLY 1 VALID JSON OBJECT AND NOTHING ELSE.`;
            } else {
                // Standard blog — use the dynamic prompt template
                if (promptTemplate) {
                    promptText = promptTemplate.template
                        .replace('{{topic}}', topic)
                        .replace('{{audience}}', audience || 'General audience')
                        .replace('{{tone}}', tone);
                    modelToUse = promptTemplate.model;
                } else {
                    console.warn('⚠️ Prompt "content-creator-assistant" not found, using fallback.');
                    promptText = `
                    Act as a professional content writer. Create a blog post structure based on the following inputs:
                    - Topic: ${topic}
                    - Target Audience: ${audience || 'General audience'}
                    - Tone: ${tone}

                    Return a JSON object with the following fields:
                    - title: A catchy title for the post (in Spanish if the topic is in Spanish, otherwise in English)
                    - slug: A SEO-friendly slug (kebab-case)
                    - excerpt: A short summary suitable for meta description (150-160 characters)
                    - content: The HTML content of the post. It should be structured with <h2>, <h3>, <p>, and <ul>/<li> tags. The content should be comprehensive and detailed (at least 800 words).
                    - seoTitle: SEO optimized title (60 characters max)
                    - seoDescription: SEO optimized description (155 characters max)

                    Make sure the content is engaging, well-structured, and valuable for the target audience.
                    Output ONLY valid JSON without any markdown formatting or code blocks.
                    IMPORTANT: Keep the content concise to avoid truncation. Aim for 400-600 words maximum.
                    `;
                }
                promptText += `\nCRUCIAL: YOU MUST OUTPUT EXACTLY 1 VALID JSON OBJECT AND NOTHING ELSE.`;
            }

            // If media is present, add multimodal context to the prompt
            if (hasMedia) {
                const mediaLabel = mediaType === 'video' ? 'video' : 'image';
                promptText += `\n\nIMPORTANT: I have uploaded a ${mediaLabel} as visual reference. Analyze it carefully and use what you see in it to create the content. Reference visual details, objects, scenes, or information from the ${mediaLabel} in your writing. Make the content directly relevant to what the ${mediaLabel} shows.`;
            }

            if (sourceUrl.trim()) {
                promptText += `\n\nIMPORTANT: Read the website at this URL: ${sourceUrl.trim()}\nExtract the information, recreate it, and write the post based on that content.`;
            }

            // Language override
            const selectedLang = languages.find(l => l.id === outputLanguage)?.label || 'Español';
            promptText += `\n\nLANGUAGE: ALL content (title, excerpt, content, seoTitle, seoDescription) MUST be written entirely in ${selectedLang}. Do not use any other language.`;

            const projectId = activeProject?.id || 'content-creator-assistant';
            const apiTools = sourceUrl.trim() ? [{ url_context: {} }] : undefined;

            // Use multimodal or text-only generation based on media presence
            let response;
            if (hasMedia) {
                console.log(`📸 Using multimodal generation with ${mediaFiles.length} ${mediaType}(s)`);
                response = await generateMultimodalContentViaProxy(projectId, promptText, mediaFiles, modelToUse, {
                    temperature: 0.9,
                    maxOutputTokens: 8192
                }, user?.uid, apiTools);
            } else {
                response = await generateContentViaProxy(projectId, promptText, modelToUse, {
                    temperature: 0.9,
                    maxOutputTokens: 8192
                }, user?.uid, apiTools);
            }

            // Log successful API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: activeProject?.id,
                    model: modelToUse,
                    feature: 'content-creator-assistant',
                    success: true
                });
            }

            console.log("📝 Raw response:", response);

            // Extract ALL text parts from response (url_context may produce multiple parts)
            let responseText = '';
            const candidates = response?.response?.candidates || response?.candidates || [];
            if (candidates.length > 0 && candidates[0]?.content?.parts) {
                for (const part of candidates[0].content.parts) {
                    if (part.text) responseText += part.text;
                }
            }
            if (!responseText) {
                responseText = extractTextFromResponse(response);
            }
            console.log("📝 Response text from AI:", responseText);

            // Limpiar la respuesta de posibles markdown code blocks
            let cleanedText = responseText.trim();
            if (cleanedText.startsWith('```json')) {
                cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
            } else if (cleanedText.startsWith('```')) {
                cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '');
            }

            // If the text doesn't start with '{', try to extract JSON from within it
            if (!cleanedText.startsWith('{') && !cleanedText.startsWith('[')) {
                const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    console.log('🔧 Extracted JSON from conversational response');
                    cleanedText = jsonMatch[0];
                }
            }

            // Use robust JSON parsing with repair attempt
            let parsedData = attemptRepairJSON(cleanedText);

            if (!parsedData) {
                throw new Error('Could not parse AI response as valid JSON');
            }
            console.log("✅ Parsed data:", parsedData);

            // Si la respuesta es un array, tomar el primer elemento
            if (Array.isArray(parsedData)) {
                console.log("⚠️ Response is an array, taking first element");
                parsedData = parsedData[0];
            }

            if (!parsedData || typeof parsedData !== 'object') {
                throw new Error('Invalid response format from AI');
            }

            console.log("📦 Final data to use:", parsedData);
            setGeneratedPost(parsedData);
            setStep('preview');
        } catch (error) {
            // Log failed API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: activeProject?.id,
                    model: modelToUse,
                    feature: 'content-creator-assistant',
                    success: false,
                    errorMessage: error instanceof Error ? error.message : 'Unknown error'
                });
            }
            console.error("❌ Error generating content:", error);
            console.error("Error details:", error);
            alert(t('cms_assistant.errorGenerating'));
            setStep('details');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleConfirm = () => {
        console.log("🚀 Passing AI-generated post to parent:", generatedPost);

        if (!generatedPost || !user) {
            console.error("❌ Cannot confirm: missing data", { generatedPost, user });
            return;
        }

        // Build the post object — DO NOT save here, the parent handles saving
        // to avoid creating duplicate articles (double-save bug).
        const newPost: CMSPost = {
            id: '', // ID vacío para que Firebase genere uno nuevo
            title: generatedPost.title || 'Untitled',
            slug: generatedPost.slug || `post-${Date.now()}`,
            content: generatedPost.content || '<p>Contenido generado por IA</p>',
            excerpt: generatedPost.excerpt || '',
            featuredImage: '',
            status: 'draft',
            authorId: user.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            seoTitle: generatedPost.seoTitle || '',
            seoDescription: generatedPost.seoDescription || ''
        };

        // Notify the parent — it will save and open the editor
        onPostCreated(newPost);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-up">
            <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/20 p-2 rounded-lg">
                            <Sparkles className="text-primary w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{t('cms_assistant.title')}</h2>
                            <p className="text-xs text-muted-foreground">{t('cms_assistant.subtitle')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 overflow-y-auto flex-1">
                    {step === 'topic' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="text-center space-y-2 mb-8">
                                <h3 className="text-2xl font-bold">{t('cms_assistant.stepTopic')}</h3>
                                <p className="text-muted-foreground">{t('cms_assistant.stepTopicDesc')}</p>
                            </div>
                            <textarea
                                autoFocus
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder={t('cms_assistant.topicPlaceholder')}
                                className="w-full h-32 bg-secondary/30 border border-border rounded-xl p-4 text-lg focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                            />

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-muted-foreground">URL de Referencia (Opcional)</label>
                                <input
                                    type="url"
                                    value={sourceUrl}
                                    onChange={(e) => setSourceUrl(e.target.value)}
                                    placeholder="https://ejemplo.com/noticia (La IA leerá esta página)"
                                    className="w-full bg-secondary/30 border border-border rounded-lg p-3 outline-none focus:border-primary transition-colors"
                                />
                            </div>

                            {/* Media Upload Zone */}
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                    <ImageIcon size={16} />
                                    {t('cms_assistant.mediaUploadLabel', { defaultValue: 'Visual reference (optional)' })}
                                </label>
                                <input
                                    ref={mediaInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
                                    onChange={handleMediaInputChange}
                                    className="hidden"
                                />
                                {!mediaPreview ? (
                                    <div
                                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={handleMediaDrop}
                                        onClick={() => mediaInputRef.current?.click()}
                                        className={`w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${isDragging
                                            ? 'border-primary bg-primary/10 scale-[1.02]'
                                            : 'border-border hover:border-primary/50 hover:bg-secondary/20'
                                            }`}
                                    >
                                        <Upload size={24} className="text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground text-center">
                                            {t('cms_assistant.mediaUploadHint', { defaultValue: 'Drop an image or video here, or click to upload' })}
                                        </p>
                                        <p className="text-xs text-muted-foreground/60">
                                            {t('cms_assistant.mediaUploadFormats', { defaultValue: 'JPG, PNG, GIF, WebP, MP4, WebM' })}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="relative group rounded-xl overflow-hidden border border-border">
                                        {mediaType === 'video' ? (
                                            <video
                                                src={mediaPreview}
                                                className="w-full max-h-48 object-cover rounded-xl"
                                                controls
                                                muted
                                            />
                                        ) : (
                                            <img
                                                src={mediaPreview}
                                                alt="Upload preview"
                                                className="w-full max-h-48 object-cover rounded-xl"
                                            />
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeMedia(); }}
                                                className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                                                title={t('cms_assistant.removeMedia', { defaultValue: 'Remove' })}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                            {mediaType === 'video' ? <Film size={12} /> : <ImageIcon size={12} />}
                                            {mediaType === 'video' ? 'Video' : 'Image'}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={() => setStep('details')}
                                    disabled={!topic.trim()}
                                    className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {t('cms_assistant.next')} <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'details' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="space-y-4">
                                <label className="block font-medium">{t('cms_assistant.audienceLabel')}</label>
                                <input
                                    type="text"
                                    value={audience}
                                    onChange={(e) => setAudience(e.target.value)}
                                    placeholder={t('cms_assistant.audiencePlaceholder')}
                                    className="w-full bg-secondary/30 border border-border rounded-lg p-3 outline-none focus:border-primary transition-colors"
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="block font-medium">{t('cms_assistant.toneLabel')}</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {tones.map((t) => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setTone(t.id)}
                                            className={`p-3 rounded-lg border text-sm font-medium transition-all ${tone === t.id
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-card border-border hover:border-primary/50'
                                                }`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block font-medium">Tipo de Contenido</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {contentTypes.map((c) => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => setContentType(c.id)}
                                            className={`p-3 rounded-lg border text-sm font-medium transition-all ${contentType === c.id
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-card border-border hover:border-primary/50'
                                                }`}
                                        >
                                            {c.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block font-medium">Idioma del Contenido</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {languages.map((l) => (
                                        <button
                                            key={l.id}
                                            type="button"
                                            onClick={() => setOutputLanguage(l.id)}
                                            className={`p-2 rounded-lg border text-xs font-medium transition-all flex flex-col items-center gap-1 ${outputLanguage === l.id
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-card border-border hover:border-primary/50'
                                                }`}
                                        >
                                            <span className="text-lg">{l.flag}</span>
                                            {l.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-between pt-4">
                                <button onClick={() => setStep('topic')} className="text-muted-foreground hover:text-foreground font-medium px-4 transition-colors">
                                    {t('cms_assistant.back')}
                                </button>
                                <button
                                    onClick={handleGenerate}
                                    className="bg-gradient-to-r from-primary to-purple-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:scale-105 transition-all"
                                >
                                    <Sparkles size={18} /> {t('cms_assistant.generateDraft')}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'generating' && (
                        <div className="flex flex-col items-center justify-center h-full text-center py-12 space-y-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary blur-xl opacity-20 rounded-full animate-pulse"></div>
                                <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-2">{t('cms_assistant.generating')}</h3>
                                <p className="text-muted-foreground max-w-xs mx-auto">{t('cms_assistant.generatingDesc')}</p>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && generatedPost && (
                        <div className="space-y-6 animate-fade-in-up h-full flex flex-col">
                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start gap-3">
                                <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={20} />
                                <div>
                                    <p className="font-bold text-green-600">{t('cms_assistant.success')}</p>
                                    <p className="text-xs text-green-600/80">{t('cms_assistant.successDesc')}</p>
                                </div>
                            </div>

                            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                <div>
                                    <span className="text-xs font-bold text-muted-foreground uppercase">{t('cms_assistant.previewTitle')}</span>
                                    <h3 className="text-xl font-bold">{generatedPost.title || 'Untitled'}</h3>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-muted-foreground uppercase">{t('cms_assistant.previewExcerpt')}</span>
                                    <p className="text-muted-foreground">{generatedPost.excerpt || 'Sin resumen'}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-muted-foreground uppercase">{t('cms_assistant.previewContent')}</span>
                                    <div
                                        className="max-w-none line-clamp-6 bg-background/50 p-4 rounded-lg border border-border overflow-hidden text-foreground"
                                        style={{
                                            // Ensure prose elements inherit proper colors
                                            '--tw-prose-body': 'var(--foreground)',
                                            '--tw-prose-headings': 'var(--foreground)',
                                            '--tw-prose-links': 'var(--primary)',
                                            '--tw-prose-bold': 'var(--foreground)',
                                            '--tw-prose-bullets': 'var(--muted-foreground)',
                                        } as React.CSSProperties}
                                    >
                                        {generatedPost.content ? (
                                            <div
                                                className="text-foreground prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-foreground [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-foreground [&_p]:text-foreground [&_p]:mb-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_li]:text-foreground [&_li]:mb-1"
                                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(generatedPost.content) }}
                                            />
                                        ) : (
                                            <p className="text-muted-foreground italic">{t('cms_assistant.noContent')}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Debug info - remove later */}
                                <details className="text-xs text-muted-foreground">
                                    <summary className="cursor-pointer">Debug Info (click para ver)</summary>
                                    <pre className="mt-2 p-2 bg-secondary/30 rounded overflow-auto max-h-40">
                                        {JSON.stringify(generatedPost, null, 2)}
                                    </pre>
                                </details>
                            </div>

                            <div className="flex justify-between pt-4 border-t border-border mt-auto">
                                <button onClick={() => setStep('details')} className="text-muted-foreground hover:text-foreground font-medium px-4 transition-colors">
                                    {t('cms_assistant.retry')}
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-900/20"
                                >
                                    {t('cms_assistant.openInEditor')} <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContentCreatorAssistant;

