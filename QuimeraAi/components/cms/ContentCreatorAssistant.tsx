import React, { useState, useMemo } from 'react';
import { X, Sparkles, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { generateContentViaProxy, extractTextFromResponse } from '../../utils/geminiProxyClient';
import { CMSPost } from '../../types';
import { useAuth } from '../../contexts/core/AuthContext';
import { useCMS } from '../../contexts/cms';
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
    const { saveCMSPost } = useCMS();
    const { activeProject } = useProject();
    const { getPrompt } = useAdmin();
    const [step, setStep] = useState<Step>('topic');
    const [topic, setTopic] = useState('');
    const [audience, setAudience] = useState('');
    const [tone, setTone] = useState('professional');
    const [generatedPost, setGeneratedPost] = useState<Partial<CMSPost> | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Tones configuration
    const tones = [
        { id: 'professional', label: t('cms_assistant.tones.professional') },
        { id: 'friendly', label: t('cms_assistant.tones.friendly') },
        { id: 'persuasive', label: t('cms_assistant.tones.persuasive') },
        { id: 'informative', label: t('cms_assistant.tones.informative') },
        { id: 'funny', label: t('cms_assistant.tones.funny') },
        { id: 'minimalist', label: t('cms_assistant.tones.minimalist') }
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

    const handleGenerate = async () => {
        if (!topic) return;

        setIsGenerating(true);
        setStep('generating');

        let modelToUse = 'gemini-2.5-flash'; // Default fallback - declared outside try for error logging

        try {
            // Get dynamic prompt
            const promptTemplate = getPrompt('content-creator-assistant');

            let promptText = '';

            if (promptTemplate) {
                promptText = promptTemplate.template
                    .replace('{{topic}}', topic)
                    .replace('{{audience}}', audience || 'General audience')
                    .replace('{{tone}}', tone);
                modelToUse = promptTemplate.model;
            } else {
                // Fallback if prompt is missing (shouldn't happen with sync)
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

            const projectId = activeProject?.id || 'content-creator-assistant';
            const response = await generateContentViaProxy(projectId, promptText, modelToUse, {
                temperature: 0.9,
                maxOutputTokens: 8192  // Ensure enough tokens for complete JSON response
            }, user?.uid);

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
            const responseText = extractTextFromResponse(response);
            console.log("📝 Response text from AI:", responseText);

            // Limpiar la respuesta de posibles markdown code blocks
            let cleanedText = responseText.trim();
            if (cleanedText.startsWith('```json')) {
                cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
            } else if (cleanedText.startsWith('```')) {
                cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '');
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

    const handleConfirm = async () => {
        console.log("🚀 Opening editor with post:", generatedPost);

        if (!generatedPost || !user) {
            console.error("❌ Cannot confirm: missing data", { generatedPost, user });
            return;
        }

        try {
            // Crear el post asegurándose de que no haya campos undefined
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

            console.log("💾 Saving post:", newPost);

            // Guardamos el post - Firebase generará el ID automáticamente
            await saveCMSPost(newPost);

            console.log("✅ Post saved successfully");

            // Pequeño delay para asegurar que el post se guardó y se cargó en la lista
            await new Promise(resolve => setTimeout(resolve, 500));

            // Notificamos al padre para que abra el editor
            // Usamos el post con los datos actuales, el padre debería recargarlo
            onPostCreated(newPost);
        } catch (error) {
            console.error("❌ Error in handleConfirm:", error);
            alert(t('cms_editor.errors.failedToSave'));
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

