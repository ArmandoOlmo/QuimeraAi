import React, { useState } from 'react';
import { X, Sparkles, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { getGoogleGenAI } from '../../utils/genAiClient';
import { CMSPost } from '../../types';
import { useEditor } from '../../contexts/EditorContext';

interface ContentCreatorAssistantProps {
    onClose: () => void;
    onPostCreated: (post: CMSPost) => void;
}

type Step = 'topic' | 'details' | 'generating' | 'preview';

const ContentCreatorAssistant: React.FC<ContentCreatorAssistantProps> = ({ onClose, onPostCreated }) => {
    const { user, saveCMSPost } = useEditor();
    const [step, setStep] = useState<Step>('topic');
    const [topic, setTopic] = useState('');
    const [audience, setAudience] = useState('');
    const [tone, setTone] = useState('Profesional');
    const [generatedPost, setGeneratedPost] = useState<Partial<CMSPost> | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        if (!topic) return;
        
        setIsGenerating(true);
        setStep('generating');

        try {
            const ai = await getGoogleGenAI();
            const prompt = `
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
                Output purely valid JSON without any markdown formatting or code blocks.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash-exp',
                contents: prompt,
                config: { 
                    responseMimeType: "application/json",
                    temperature: 0.9,
                }
            });

            console.log("📝 Raw response:", response);
            const responseText = response.text;
            console.log("📝 Response text from AI:", responseText);
            
            // Limpiar la respuesta de posibles markdown code blocks
            let cleanedText = responseText.trim();
            if (cleanedText.startsWith('```json')) {
                cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
            } else if (cleanedText.startsWith('```')) {
                cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '');
            }
            
            let parsedData = JSON.parse(cleanedText);
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
            console.error("❌ Error generating content:", error);
            console.error("Error details:", error);
            alert("Hubo un error generando el contenido. Por favor intenta de nuevo.");
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
            alert("Error al crear el post. Por favor intenta de nuevo.");
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
                            <h2 className="text-xl font-bold">Asistente de Contenido AI</h2>
                            <p className="text-xs text-muted-foreground">Creación guiada paso a paso</p>
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
                                <h3 className="text-2xl font-bold">¿Sobre qué quieres escribir hoy?</h3>
                                <p className="text-muted-foreground">Dime el tema principal, una idea o incluso un título provisional.</p>
                            </div>
                            <textarea
                                autoFocus
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="Ej: Los beneficios del yoga para programadores..."
                                className="w-full h-32 bg-secondary/30 border border-border rounded-xl p-4 text-lg focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                            />
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setStep('details')}
                                    disabled={!topic.trim()}
                                    className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Siguiente <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'details' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="space-y-4">
                                <label className="block font-medium">¿A quién va dirigido? (Audiencia)</label>
                                <input
                                    type="text"
                                    value={audience}
                                    onChange={(e) => setAudience(e.target.value)}
                                    placeholder="Ej: Principiantes, Expertos, Clientes potenciales..."
                                    className="w-full bg-secondary/30 border border-border rounded-lg p-3 outline-none focus:border-primary transition-colors"
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="block font-medium">¿Cuál es el tono deseado?</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['Profesional', 'Amigable', 'Persuasivo', 'Informativo', 'Divertido', 'Minimalista'].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setTone(t)}
                                            className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                                                tone === t 
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
                                    Atrás
                                </button>
                                <button
                                    onClick={handleGenerate}
                                    className="bg-gradient-to-r from-primary to-purple-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:scale-105 transition-all"
                                >
                                    <Sparkles size={18} /> Generar Borrador
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
                                <h3 className="text-xl font-bold mb-2">La IA está escribiendo...</h3>
                                <p className="text-muted-foreground max-w-xs mx-auto">Estamos estructurando tu artículo, creando títulos atractivos y redactando el contenido.</p>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && generatedPost && (
                        <div className="space-y-6 animate-fade-in-up h-full flex flex-col">
                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start gap-3">
                                <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={20} />
                                <div>
                                    <p className="font-bold text-green-600">¡Contenido generado con éxito!</p>
                                    <p className="text-xs text-green-600/80">Revisa el resumen antes de llevarlo al editor.</p>
                                </div>
                            </div>

                            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                <div>
                                    <span className="text-xs font-bold text-muted-foreground uppercase">Título</span>
                                    <h3 className="text-xl font-bold">{generatedPost.title || 'Sin título'}</h3>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-muted-foreground uppercase">Resumen</span>
                                    <p className="text-muted-foreground">{generatedPost.excerpt || 'Sin resumen'}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-muted-foreground uppercase">Vista previa del contenido</span>
                                    <div className="prose prose-sm dark:prose-invert max-w-none line-clamp-6 bg-secondary/20 p-4 rounded-lg border border-border/50 overflow-hidden">
                                        {generatedPost.content ? (
                                            <div dangerouslySetInnerHTML={{ __html: generatedPost.content }} />
                                        ) : (
                                            <p className="text-muted-foreground italic">Sin contenido generado</p>
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
                                    Reintentar
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-900/20"
                                >
                                    Abrir en Editor <ArrowRight size={18} />
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

