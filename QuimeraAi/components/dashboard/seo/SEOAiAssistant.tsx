/**
 * SEOAiAssistant
 * Asistente de IA para generar y optimizar la configuración SEO de un proyecto.
 * Sigue el mismo patrón de AppContentCreatorAssistant.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Sparkles, ArrowRight, Loader2, CheckCircle, Globe, Search, Share2, Bot } from 'lucide-react';
import { generateContentViaProxy, extractTextFromResponse } from '../../../utils/geminiProxyClient';
import { SEOConfig } from '../../../types';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useSafeAdmin } from '../../../contexts/admin';
import { logApiCall } from '../../../services/apiLoggingService';

interface SEOAiAssistantProps {
    onClose: () => void;
    onApply: (seoData: Partial<SEOConfig>) => void;
    currentConfig?: SEOConfig | null;
}

type Step = 'describe' | 'generating' | 'preview';

const SEOAiAssistant: React.FC<SEOAiAssistantProps> = ({ onClose, onApply, currentConfig }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const admin = useSafeAdmin();

    const [step, setStep] = useState<Step>('describe');
    const [businessDescription, setBusinessDescription] = useState('');
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [language, setLanguage] = useState(currentConfig?.language || 'es');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedSeo, setGeneratedSeo] = useState<Partial<SEOConfig> | null>(null);

    const handleGenerate = async () => {
        if (!businessDescription.trim()) return;

        setIsGenerating(true);
        setStep('generating');

        let modelToUse = 'gemini-2.5-flash';

        try {
            const promptTemplate = admin?.getPrompt('ai-seo-assistant');

            let promptText = '';

            if (promptTemplate) {
                promptText = promptTemplate.template
                    .replace('{{businessDescription}}', businessDescription)
                    .replace('{{websiteUrl}}', websiteUrl || 'No especificada')
                    .replace('{{language}}', language)
                    .replace('{{currentTitle}}', currentConfig?.title || '')
                    .replace('{{currentDescription}}', currentConfig?.description || '');
                modelToUse = promptTemplate.model;
            } else {
                promptText = `
Actúa como un experto en SEO y marketing digital. A partir de la siguiente descripción de un negocio/sitio web, genera una configuración SEO completa y optimizada.

Descripción del negocio: ${businessDescription}
URL del sitio: ${websiteUrl || 'No especificada'}
Idioma principal: ${language === 'es' ? 'Español' : language === 'en' ? 'English' : language}
Título actual: ${currentConfig?.title || 'Ninguno'}
Descripción actual: ${currentConfig?.description || 'Ninguna'}

Genera un JSON con los siguientes campos optimizados para SEO:
- title: Título SEO optimizado (máx 60 caracteres). Debe ser atractivo y contener la keyword principal.
- description: Meta description optimizada (máx 160 caracteres). Debe ser persuasiva e incluir call-to-action.
- keywords: Array de 5-8 keywords relevantes ordenadas por importancia.
- author: Nombre del autor o empresa (inferir de la descripción).
- ogType: Tipo de Open Graph apropiado ("website", "article", "product", "profile").
- ogTitle: Título para redes sociales (puede ser ligeramente diferente al title).
- ogDescription: Descripción para redes sociales (más informal/atractiva).
- ogSiteName: Nombre del sitio para Open Graph.
- twitterCard: Tipo de Twitter Card ("summary" o "summary_large_image").
- schemaType: Tipo de Schema.org más apropiado ("WebSite", "Organization", "LocalBusiness", "Article", "Product", "Service").
- aiDescription: Descripción optimizada para bots de IA (ChatGPT, Perplexity, etc.). Más detallada y descriptiva. (máx 300 caracteres)
- aiKeyTopics: Array de 3-5 temas clave para que los bots de IA entiendan el contenido del sitio.
- aiCrawlable: true (siempre recomendar activar)

Reglas importantes:
- Respetar los límites de caracteres.
- Las keywords deben ser relevantes y con potencial de búsqueda.
- El contenido debe estar en el idioma especificado (${language}).
- Optimizar para CTR (Click-Through Rate) en los resultados de búsqueda.

Output ONLY valid JSON without any markdown formatting or code blocks.
`;
            }

            const response = await generateContentViaProxy('ai-seo-assistant', promptText, modelToUse, {
                temperature: 0.7
            }, user?.uid);

            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: 'ai-seo-assistant',
                    model: modelToUse,
                    feature: 'ai-seo-assistant',
                    success: true
                });
            }

            const responseText = extractTextFromResponse(response);

            let cleanedText = responseText.trim();
            if (cleanedText.startsWith('```json')) {
                cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
            } else if (cleanedText.startsWith('```')) {
                cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '');
            }

            let parsedData = JSON.parse(cleanedText);

            if (Array.isArray(parsedData)) {
                parsedData = parsedData[0];
            }

            if (!parsedData || typeof parsedData !== 'object') {
                throw new Error('Invalid response format from AI');
            }

            setGeneratedSeo(parsedData);
            setStep('preview');
        } catch (error) {
            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: 'ai-seo-assistant',
                    model: modelToUse,
                    feature: 'ai-seo-assistant',
                    success: false,
                    errorMessage: error instanceof Error ? error.message : 'Unknown error'
                });
            }
            console.error('❌ Error generating SEO:', error);
            alert('Hubo un error generando la configuración SEO. Por favor intenta de nuevo.');
            setStep('describe');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleApply = () => {
        if (generatedSeo) {
            onApply(generatedSeo);
            onClose();
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
                            <h2 className="text-xl font-bold">{t('seo.aiAssistant', 'Asistente SEO con IA')}</h2>
                            <p className="text-xs text-muted-foreground">{t('seo.aiAssistantDesc', 'Genera configuración SEO optimizada automáticamente')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 overflow-y-auto flex-1">
                    {step === 'describe' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="text-center space-y-2 mb-8">
                                <h3 className="text-2xl font-bold">{t('seo.describeYourBusiness', 'Describe tu negocio')}</h3>
                                <p className="text-muted-foreground">
                                    {t('seo.aiWillOptimize', 'La IA analizará tu descripción y generará toda la configuración SEO optimizada.')}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        {t('seo.businessDescription', 'Descripción del negocio / sitio web')}
                                    </label>
                                    <textarea
                                        autoFocus
                                        value={businessDescription}
                                        onChange={(e) => setBusinessDescription(e.target.value)}
                                        placeholder={t('seo.businessDescPlaceholder', 'Ej: Somos una agencia de marketing digital especializada en startups y pymes. Ofrecemos servicios de SEO, publicidad en redes sociales y diseño web...')}
                                        className="w-full h-32 bg-secondary/30 border border-border rounded-xl p-4 text-base focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        {t('seo.websiteUrl', 'URL del sitio web (opcional)')}
                                    </label>
                                    <input
                                        type="url"
                                        value={websiteUrl}
                                        onChange={(e) => setWebsiteUrl(e.target.value)}
                                        placeholder="https://example.com"
                                        className="w-full bg-secondary/30 border border-border rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        {t('seo.contentLanguage', 'Idioma del contenido')}
                                    </label>
                                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                        {[
                                            { value: 'es', label: 'Español' },
                                            { value: 'en', label: 'English' },
                                            { value: 'fr', label: 'Français' },
                                            { value: 'de', label: 'Deutsch' },
                                            { value: 'pt', label: 'Português' },
                                        ].map((lang) => (
                                            <button
                                                key={lang.value}
                                                onClick={() => setLanguage(lang.value)}
                                                className={`p-2.5 rounded-lg border text-sm font-medium transition-all ${language === lang.value
                                                    ? 'bg-primary text-primary-foreground border-primary'
                                                    : 'bg-card border-border hover:border-primary/50'
                                                    }`}
                                            >
                                                {lang.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    onClick={handleGenerate}
                                    disabled={!businessDescription.trim()}
                                    className="bg-gradient-to-r from-primary to-purple-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    <Sparkles size={18} /> {t('seo.generateSEO', 'Generar SEO')}
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
                                <h3 className="text-xl font-bold mb-2">{t('seo.aiOptimizing', 'Optimizando tu SEO...')}</h3>
                                <p className="text-muted-foreground max-w-xs mx-auto">
                                    {t('seo.aiOptimizingDesc', 'Estamos generando títulos, descripciones, keywords y Open Graph optimizados para tu negocio.')}
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && generatedSeo && (
                        <div className="space-y-6 animate-fade-in-up h-full flex flex-col">
                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start gap-3">
                                <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={20} />
                                <div>
                                    <p className="font-bold text-green-600">{t('seo.seoGenerated', '¡Configuración SEO generada!')}</p>
                                    <p className="text-xs text-green-600/80">{t('seo.reviewBeforeApply', 'Revisa los resultados antes de aplicarlos a tu proyecto.')}</p>
                                </div>
                            </div>

                            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                {/* Basic SEO */}
                                <div className="bg-secondary/20 rounded-xl p-4 border border-border/50 space-y-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Globe className="w-4 h-4 text-primary" />
                                        <span className="text-sm font-bold text-primary uppercase">{t('seo.basicSEO', 'SEO Básico')}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-muted-foreground uppercase">{t('seo.pageTitle', 'Título')}</span>
                                        <p className="text-foreground font-semibold">{generatedSeo.title || '—'}</p>
                                        {generatedSeo.title && (
                                            <p className={`text-xs mt-0.5 ${generatedSeo.title.length > 60 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                                {generatedSeo.title.length} / 60
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-muted-foreground uppercase">{t('seo.metaDescription', 'Meta Description')}</span>
                                        <p className="text-muted-foreground text-sm">{generatedSeo.description || '—'}</p>
                                        {generatedSeo.description && (
                                            <p className={`text-xs mt-0.5 ${generatedSeo.description.length > 160 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                                {generatedSeo.description.length} / 160
                                            </p>
                                        )}
                                    </div>
                                    {generatedSeo.keywords && generatedSeo.keywords.length > 0 && (
                                        <div>
                                            <span className="text-xs font-bold text-muted-foreground uppercase">Keywords</span>
                                            <div className="flex gap-1.5 flex-wrap mt-1">
                                                {generatedSeo.keywords.map((kw, i) => (
                                                    <span key={i} className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full font-medium">
                                                        {kw}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Social / Open Graph */}
                                <div className="bg-secondary/20 rounded-xl p-4 border border-border/50 space-y-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Share2 className="w-4 h-4 text-blue-500" />
                                        <span className="text-sm font-bold text-blue-500 uppercase">{t('seo.socialMedia', 'Redes Sociales')}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <span className="text-xs font-bold text-muted-foreground uppercase">OG Type</span>
                                            <p className="text-sm text-foreground">{generatedSeo.ogType || '—'}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold text-muted-foreground uppercase">Schema Type</span>
                                            <p className="text-sm text-foreground">{generatedSeo.schemaType || '—'}</p>
                                        </div>
                                    </div>
                                    {generatedSeo.ogTitle && (
                                        <div>
                                            <span className="text-xs font-bold text-muted-foreground uppercase">OG Title</span>
                                            <p className="text-sm text-foreground">{generatedSeo.ogTitle}</p>
                                        </div>
                                    )}
                                    {generatedSeo.ogDescription && (
                                        <div>
                                            <span className="text-xs font-bold text-muted-foreground uppercase">OG Description</span>
                                            <p className="text-sm text-muted-foreground">{generatedSeo.ogDescription}</p>
                                        </div>
                                    )}
                                    {generatedSeo.ogSiteName && (
                                        <div>
                                            <span className="text-xs font-bold text-muted-foreground uppercase">Site Name</span>
                                            <p className="text-sm text-foreground">{generatedSeo.ogSiteName}</p>
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-xs font-bold text-muted-foreground uppercase">Twitter Card</span>
                                        <p className="text-sm text-foreground">{generatedSeo.twitterCard || 'summary_large_image'}</p>
                                    </div>
                                </div>

                                {/* AI Optimization */}
                                {(generatedSeo.aiDescription || (generatedSeo.aiKeyTopics && generatedSeo.aiKeyTopics.length > 0)) && (
                                    <div className="bg-secondary/20 rounded-xl p-4 border border-border/50 space-y-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Bot className="w-4 h-4 text-purple-500" />
                                            <span className="text-sm font-bold text-purple-500 uppercase">{t('seo.aiOptimization', 'Optimización IA')}</span>
                                        </div>
                                        {generatedSeo.aiDescription && (
                                            <div>
                                                <span className="text-xs font-bold text-muted-foreground uppercase">{t('seo.aiOptimizedDescription', 'Descripción para IA')}</span>
                                                <p className="text-sm text-muted-foreground">{generatedSeo.aiDescription}</p>
                                            </div>
                                        )}
                                        {generatedSeo.aiKeyTopics && generatedSeo.aiKeyTopics.length > 0 && (
                                            <div>
                                                <span className="text-xs font-bold text-muted-foreground uppercase">{t('seo.keyTopicsCommaSeparated', 'Temas Clave')}</span>
                                                <div className="flex gap-1.5 flex-wrap mt-1">
                                                    {generatedSeo.aiKeyTopics.map((topic, i) => (
                                                        <span key={i} className="px-2 py-0.5 text-xs bg-purple-500/10 text-purple-500 rounded-full font-medium">
                                                            {topic}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Google Preview */}
                                <div className="bg-white dark:bg-secondary/30 rounded-xl p-4 border border-border/50 space-y-1">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Search className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-xs font-bold text-muted-foreground uppercase">{t('seo.googlePreview', 'Vista previa en Google')}</span>
                                    </div>
                                    <p className="text-[#1a0dab] dark:text-blue-400 text-lg font-medium truncate leading-tight">
                                        {generatedSeo.title || 'Título de la página'}
                                    </p>
                                    <p className="text-[#006621] dark:text-green-400 text-sm truncate">
                                        {websiteUrl || 'https://tusitio.com'}
                                    </p>
                                    <p className="text-[#545454] dark:text-muted-foreground text-sm line-clamp-2">
                                        {generatedSeo.description || 'Descripción de la página...'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-between pt-4 border-t border-border mt-auto">
                                <button
                                    onClick={() => setStep('describe')}
                                    className="text-muted-foreground hover:text-foreground font-medium px-4 transition-colors"
                                >
                                    {t('common.retry', 'Reintentar')}
                                </button>
                                <button
                                    onClick={handleApply}
                                    className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-900/20"
                                >
                                    {t('seo.applySEO', 'Aplicar SEO')} <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SEOAiAssistant;
