/**
 * AgencyContentCreatorAssistant
 * Asistente de IA para crear artículos del blog de la Agencia
 * Similar a ContentCreatorAssistant pero adaptado para AgencyArticle
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Sparkles, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { generateContentViaProxy, extractTextFromResponse } from '../../../utils/geminiProxyClient';
import { AgencyArticle, AgencyArticleCategory } from '../../../types/agencyContent';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useAgencyContent } from '../../../contexts/agency/AgencyContentContext';
import { useAdmin } from '../../../contexts/admin';
import { sanitizeHtml } from '../../../utils/sanitize';
import { logApiCall } from '../../../services/apiLoggingService';

interface AgencyContentCreatorAssistantProps {
    onClose: () => void;
    onArticleCreated: (article: AgencyArticle) => void;
}

type Step = 'topic' | 'details' | 'generating' | 'preview';

const CATEGORY_OPTIONS: { value: AgencyArticleCategory; label: string }[] = [
    { value: 'blog', label: 'Blog' },
    { value: 'news', label: 'Noticias' },
    { value: 'tutorial', label: 'Tutorial' },
    { value: 'case-study', label: 'Caso de Éxito' },
    { value: 'announcement', label: 'Anuncio' },
    { value: 'guide', label: 'Guía' },
    { value: 'update', label: 'Actualización' },
];

const AgencyContentCreatorAssistant: React.FC<AgencyContentCreatorAssistantProps> = ({ onClose, onArticleCreated }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { saveArticle } = useAgencyContent();
    const { getPrompt } = useAdmin();

    const [step, setStep] = useState<Step>('topic');
    const [topic, setTopic] = useState('');
    const [audience, setAudience] = useState('');
    const [tone, setTone] = useState('Profesional');
    const [category, setCategory] = useState<AgencyArticleCategory>('blog');
    const [generatedArticle, setGeneratedArticle] = useState<Partial<AgencyArticle> | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        if (!topic) return;

        setIsGenerating(true);
        setStep('generating');

        let modelToUse = 'gemini-2.5-flash';

        try {
            // Get dynamic prompt
            const promptTemplate = getPrompt('app-content-creator-assistant');

            let promptText = '';

            if (promptTemplate) {
                promptText = promptTemplate.template
                    .replace('{{topic}}', topic)
                    .replace('{{audience}}', audience || 'General audience')
                    .replace('{{tone}}', tone)
                    .replace('{{category}}', category);
                modelToUse = promptTemplate.model;
            } else {
                // Fallback prompt for app content
                promptText = `
                Act as a professional content writer for Quimera.ai, a platform for creating AI-powered websites and chatbots.
                Create a blog article structure based on the following inputs:
                
                - Topic: ${topic}
                - Target Audience: ${audience || 'General audience interested in AI and web development'}
                - Tone: ${tone}
                - Category: ${category}

                Return a JSON object with the following fields:
                - title: A catchy, SEO-friendly title for the article (in Spanish if the topic is in Spanish, otherwise in English)
                - slug: A SEO-friendly slug (kebab-case, lowercase)
                - excerpt: A compelling summary for meta description and card preview (150-160 characters)
                - content: The HTML content of the article. It should be well-structured with <h2>, <h3>, <p>, <ul>/<li>, and <blockquote> tags. The content should be comprehensive, detailed, and valuable (at least 1000 words). Include practical examples and actionable tips where appropriate.
                - tags: An array of 3-5 relevant tags/keywords for the article
                - readTime: Estimated read time in minutes (integer)
                - seo: An object containing:
                  - metaTitle: SEO optimized title (55-60 characters max)
                  - metaDescription: SEO optimized description (150-155 characters max)
                  - metaKeywords: Array of SEO keywords

                The article should:
                - Be engaging and provide real value to readers
                - Include relevant examples related to AI, web development, or digital marketing
                - Have a clear structure with introduction, main points, and conclusion
                - Be optimized for search engines
                
                Output ONLY valid JSON without any markdown formatting or code blocks.
                `;
            }

            const response = await generateContentViaProxy('content-agency-creator', promptText, modelToUse, {
                temperature: 0.85
            }, user?.uid);

            // Log successful API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: 'content-agency-admin',
                    model: modelToUse,
                    feature: 'agency-content-creator-assistant',
                    success: true
                });
            }

            console.log("📝 Raw response:", response);
            const responseText = extractTextFromResponse(response);
            console.log("📝 Response text from AI:", responseText);

            // Clean response from possible markdown code blocks
            let cleanedText = responseText.trim();
            if (cleanedText.startsWith('```json')) {
                cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
            } else if (cleanedText.startsWith('```')) {
                cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '');
            }

            let parsedData = JSON.parse(cleanedText);
            console.log("✅ Parsed data:", parsedData);

            // If response is an array, take the first element
            if (Array.isArray(parsedData)) {
                console.log("⚠️ Response is an array, taking first element");
                parsedData = parsedData[0];
            }

            if (!parsedData || typeof parsedData !== 'object') {
                throw new Error('Invalid response format from AI');
            }

            console.log("📦 Final data to use:", parsedData);
            setGeneratedArticle({
                ...parsedData,
                category // Use the selected category
            });
            setStep('preview');
        } catch (error) {
            // Log failed API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: 'content-agency-admin',
                    model: modelToUse,
                    feature: 'agency-content-creator-assistant',
                    success: false,
                    errorMessage: error instanceof Error ? error.message : 'Unknown error'
                });
            }
            console.error("❌ Error generating content:", error);
            alert("Hubo un error generando el contenido. Por favor intenta de nuevo.");
            setStep('details');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleConfirm = async () => {
        console.log("🚀 Creating article:", generatedArticle);

        if (!generatedArticle || !user) {
            console.error("❌ Cannot confirm: missing data", { generatedArticle, user });
            return;
        }

        try {
            // Generate the ID upfront so we can pass it to the editor
            // This prevents duplication: without this, the editor receives id: ''
            // and its auto-save creates a second Firestore document
            const generatedId = `article_${Date.now()}`;

            // Generate a unique slug with timestamp to avoid conflicts
            const uniqueSlug = generatedArticle.slug || `article-${Date.now()}`;

            // Create the article ensuring no undefined fields
            const newArticle: AgencyArticle = {
                id: generatedId,
                title: generatedArticle.title || 'Untitled Article',
                slug: uniqueSlug,
                content: generatedArticle.content || '<p>Contenido generado por IA</p>',
                excerpt: generatedArticle.excerpt || '',
                featuredImage: '',
                status: 'draft',
                featured: false,
                category: generatedArticle.category || category,
                tags: generatedArticle.tags || [],
                author: 'Quimera Team',
                readTime: generatedArticle.readTime,
                views: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                seo: generatedArticle.seo || {
                    metaTitle: generatedArticle.title || '',
                    metaDescription: generatedArticle.excerpt || '',
                    metaKeywords: generatedArticle.tags || []
                }
            };

            console.log("💾 Saving article:", newArticle);

            // Save the article
            await saveArticle(newArticle);

            console.log("✅ Article saved successfully");

            // Notify parent to open the editor (article already has correct ID)
            onArticleCreated(newArticle);
        } catch (error) {
            console.error("❌ Error in handleConfirm:", error);
            alert("Error al crear el artículo. Por favor intenta de nuevo.");
        }
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
                            <h2 className="text-xl font-bold">{t('contentManagement.aiAssistant', 'Asistente de Contenido AI')}</h2>
                            <p className="text-xs text-muted-foreground">{t('contentManagement.aiAssistantDesc', 'Crea artículos para el blog de tu agencia')}</p>
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
                                <h3 className="text-2xl font-bold">{t('contentManagement.whatToWrite', '¿Sobre qué quieres escribir?')}</h3>
                                <p className="text-muted-foreground">Describe el tema, idea o título provisional para el artículo.</p>
                            </div>
                            <textarea
                                autoFocus
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="Ej: Cómo la IA está revolucionando la creación de sitios web en 2025..."
                                className="w-full h-32 bg-secondary/30 border border-border rounded-xl p-4 text-lg focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                            />
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setStep('details')}
                                    disabled={!topic.trim()}
                                    className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {t('common.next', 'Siguiente')} <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'details' && (
                        <div className="space-y-6 animate-fade-in-up">
                            {/* Category Selection */}
                            <div className="space-y-4">
                                <label className="block font-medium">{t('contentManagement.category', 'Categoría del artículo')}</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {CATEGORY_OPTIONS.map((cat) => (
                                        <button
                                            key={cat.value}
                                            onClick={() => setCategory(cat.value)}
                                            className={`p-3 rounded-lg border text-sm font-medium transition-all ${category === cat.value
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-card border-border hover:border-primary/50'
                                                }`}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Audience */}
                            <div className="space-y-4">
                                <label className="block font-medium">{t('contentManagement.audience', '¿A quién va dirigido? (Audiencia)')}</label>
                                <input
                                    type="text"
                                    value={audience}
                                    onChange={(e) => setAudience(e.target.value)}
                                    placeholder="Ej: Emprendedores, Desarrolladores, Marketers..."
                                    className="w-full bg-secondary/30 border border-border rounded-lg p-3 outline-none focus:border-primary transition-colors"
                                />
                            </div>

                            {/* Tone */}
                            <div className="space-y-4">
                                <label className="block font-medium">{t('contentManagement.tone', '¿Cuál es el tono deseado?')}</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['Profesional', 'Amigable', 'Persuasivo', 'Informativo', 'Inspirador', 'Técnico'].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setTone(t)}
                                            className={`p-3 rounded-lg border text-sm font-medium transition-all ${tone === t
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-card border-border hover:border-primary/50'
                                                }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-between pt-4">
                                <button onClick={() => setStep('topic')} className="text-muted-foreground hover:text-foreground font-medium px-4 transition-colors">
                                    {t('common.back', 'Atrás')}
                                </button>
                                <button
                                    onClick={handleGenerate}
                                    className="bg-gradient-to-r from-primary to-purple-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:scale-105 transition-all"
                                >
                                    <Sparkles size={18} /> {t('contentManagement.generateDraft', 'Generar Borrador')}
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
                                <h3 className="text-xl font-bold mb-2">{t('contentManagement.aiWriting', 'La IA está escribiendo...')}</h3>
                                <p className="text-muted-foreground max-w-xs mx-auto">
                                    Estamos estructurando tu artículo, creando títulos atractivos y redactando contenido de calidad.
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && generatedArticle && (
                        <div className="space-y-6 animate-fade-in-up h-full flex flex-col">
                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start gap-3">
                                <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={20} />
                                <div>
                                    <p className="font-bold text-green-600">{t('contentManagement.contentGenerated', '¡Contenido generado con éxito!')}</p>
                                    <p className="text-xs text-green-600/80">Revisa el resumen antes de llevarlo al editor.</p>
                                </div>
                            </div>

                            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                <div>
                                    <span className="text-xs font-bold text-muted-foreground uppercase">{t('contentManagement.title', 'Título')}</span>
                                    <h3 className="text-xl font-bold">{generatedArticle.title || 'Sin título'}</h3>
                                </div>

                                <div className="flex gap-2 flex-wrap">
                                    <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                                        {generatedArticle.category || category}
                                    </span>
                                    {generatedArticle.readTime && (
                                        <span className="px-2 py-1 text-xs font-medium bg-secondary text-muted-foreground rounded-full">
                                            {generatedArticle.readTime} min read
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <span className="text-xs font-bold text-muted-foreground uppercase">{t('contentManagement.excerpt', 'Resumen')}</span>
                                    <p className="text-muted-foreground">{generatedArticle.excerpt || 'Sin resumen'}</p>
                                </div>

                                {generatedArticle.tags && generatedArticle.tags.length > 0 && (
                                    <div>
                                        <span className="text-xs font-bold text-muted-foreground uppercase">Tags</span>
                                        <div className="flex gap-2 flex-wrap mt-1">
                                            {generatedArticle.tags.map((tag, i) => (
                                                <span key={i} className="px-2 py-0.5 text-xs bg-secondary rounded-full">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <span className="text-xs font-bold text-muted-foreground uppercase">{t('contentManagement.contentPreview', 'Vista previa del contenido')}</span>
                                    <div className="prose prose-sm dark:prose-invert max-w-none line-clamp-6 bg-secondary/20 p-4 rounded-lg border border-border/50 overflow-hidden">
                                        {generatedArticle.content ? (
                                            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(generatedArticle.content) }} />
                                        ) : (
                                            <p className="text-muted-foreground italic">Sin contenido generado</p>
                                        )}
                                    </div>
                                </div>

                                {/* Debug info */}
                                <details className="text-xs text-muted-foreground">
                                    <summary className="cursor-pointer">Debug Info (click para ver)</summary>
                                    <pre className="mt-2 p-2 bg-secondary/30 rounded overflow-auto max-h-40">
                                        {JSON.stringify(generatedArticle, null, 2)}
                                    </pre>
                                </details>
                            </div>

                            <div className="flex justify-between pt-4 border-t border-border mt-auto">
                                <button onClick={() => setStep('details')} className="text-muted-foreground hover:text-foreground font-medium px-4 transition-colors">
                                    {t('common.retry', 'Reintentar')}
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-900/20"
                                >
                                    {t('contentManagement.openInEditor', 'Abrir en Editor')} <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AgencyContentCreatorAssistant;




