import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAI } from '../../../contexts/ai';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useProject } from '../../../contexts/project';
import { useToast } from '../../../contexts/ToastContext';
import { useFiles } from '../../../contexts/files';
import { db, collection, addDoc, storage, ref, uploadBytes, getDownloadURL } from '../../../firebase';
import { PageData, PageSection } from '../../../types';
import {
    Sparkles, Loader2, X, ChevronRight, ChevronLeft, Check,
    AlertTriangle, ImageIcon, RotateCcw, Zap, Wand2
} from 'lucide-react';
import ProgressBar3D from '../../ui/ProgressBar3D';
import { TEMPLATE_PRESETS, TemplatePreset } from './templatePresets';

interface AITemplateGeneratorProps {
    onClose: () => void;
    onTemplateCreated?: (templateId: string) => void;
}

type GenerationStep = 'select' | 'customize' | 'generating' | 'complete';

interface GenerationLog {
    key: string;
    status: 'pending' | 'generating' | 'success' | 'error';
    message?: string;
}

const AITemplateGenerator: React.FC<AITemplateGeneratorProps> = ({ onClose, onTemplateCreated }) => {
    const { t } = useTranslation();
    const { generateImage } = useAI();
    const { user } = useAuth();
    const { refreshProjects } = useProject();
    const { success: showSuccess, error: showError } = useToast();
    const { uploadAdminAsset, fetchAdminAssets } = useFiles();

    // State
    const [step, setStep] = useState<GenerationStep>('select');
    const [selectedPreset, setSelectedPreset] = useState<TemplatePreset | null>(null);
    const [customName, setCustomName] = useState('');
    const [progress, setProgress] = useState(0);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [generationLogs, setGenerationLogs] = useState<GenerationLog[]>([]);
    const [generatedTemplateId, setGeneratedTemplateId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});

    // Select preset
    const handleSelectPreset = (preset: TemplatePreset) => {
        setSelectedPreset(preset);
        setCustomName(preset.name);
        setStep('customize');
    };

    // Start generation
    const handleGenerate = useCallback(async () => {
        if (!selectedPreset || !user) return;

        setStep('generating');
        setIsGenerating(true);
        setProgress(0);

        const images: Record<string, string> = {};
        const totalImages = selectedPreset.images.length;
        const logs: GenerationLog[] = selectedPreset.images.map(img => ({
            key: img.key,
            status: 'pending' as const,
        }));
        setGenerationLogs(logs);

        // Generate each image sequentially
        for (let i = 0; i < totalImages; i++) {
            const imgDef = selectedPreset.images[i];
            setCurrentImageIndex(i);

            // Update log to "generating"
            setGenerationLogs(prev => prev.map((log, idx) =>
                idx === i ? { ...log, status: 'generating' } : log
            ));

            try {
                const dataUrl = await generateImage(imgDef.prompt, {
                    aspectRatio: imgDef.aspectRatio,
                    style: imgDef.style,
                    resolution: '2K',
                    model: 'gemini-3.1-flash-image-preview',
                    thinkingLevel: 'high',
                    personGeneration: 'allow_adult',
                    temperature: 1.0,
                    negativePrompt: 'cartoon, anime, low quality, blurry, watermark, text overlay',
                    lighting: imgDef.lighting,
                    cameraAngle: imgDef.cameraAngle,
                    colorGrading: imgDef.colorGrading,
                    depthOfField: imgDef.depthOfField,
                });

                // Upload to Firebase Storage AND register in Admin Assets library
                let finalUrl = dataUrl;
                try {
                    // Convert data URL to Blob → File for uploadAdminAsset
                    // Use manual base64 decode (more reliable than fetch for large data URLs)
                    const base64Match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
                    if (!base64Match) throw new Error('Invalid data URL format');
                    
                    const mimeType = base64Match[1];
                    const base64Data = base64Match[2];
                    const binaryString = atob(base64Data);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let j = 0; j < binaryString.length; j++) {
                        bytes[j] = binaryString.charCodeAt(j);
                    }
                    const blob = new Blob([bytes], { type: mimeType });
                    
                    const timestamp = Date.now();
                    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
                    const fileName = `${selectedPreset.id}_${imgDef.key}_${timestamp}.${ext}`;
                    const file = new File([blob], fileName, { type: mimeType });

                    // Determine admin asset category from image key
                    const categoryMap: Record<string, 'hero' | 'team' | 'background' | 'template' | 'product' | 'other'> = {
                        hero: 'hero', hero_1: 'hero', hero_2: 'hero', hero_3: 'hero',
                        ny_hero_1: 'hero', ny_hero_2: 'hero', ny_hero_3: 'hero',
                        chef: 'team', sommelier: 'team', pastry_chef: 'team', manager: 'team',
                        coach: 'team', coach_2: 'team', coach_3: 'team', coach_4: 'team',
                        team_1: 'team', team_2: 'team', team_3: 'team', team_4: 'team',
                        team_creative: 'team', team_growth: 'team', team_seo: 'team', team_brand: 'team',
                        partner_1: 'team', partner_2: 'team', partner_3: 'team', partner_4: 'team',
                        ny_pizzaiolo: 'team', ny_manager: 'team', ny_cook_2: 'team', ny_delivery: 'team',
                        menu_1: 'product', menu_2: 'product', menu_3: 'product',
                        menu_4: 'product', menu_5: 'product', menu_6: 'product',
                        ny_pizza_1: 'product', ny_pizza_2: 'product', ny_pizza_3: 'product',
                        ny_pizza_4: 'product', ny_pizza_5: 'product', ny_pizza_6: 'product',
                        banner_bg: 'background', bg_pattern: 'background',
                        interior_1: 'background', interior_2: 'background',
                        ny_interior_1: 'background', ny_interior_2: 'background',
                        facility: 'background', office: 'background', lobby: 'background',
                        waiting: 'background', courtroom: 'background',
                    };
                    const assetCategory = categoryMap[imgDef.key] || 'template';

                    // Upload to Storage + register in adminAssets collection
                    finalUrl = await uploadAdminAsset(file, assetCategory, {
                        description: `AI-generated for template: ${selectedPreset.name} — ${imgDef.key}`,
                        tags: ['ai-generated', selectedPreset.id, imgDef.key, selectedPreset.category],
                        isAiGenerated: true,
                        aiPrompt: imgDef.prompt,
                    });
                    console.log(`✅ [AdminAsset] Uploaded ${imgDef.key} → ${assetCategory} (${(file.size / 1024).toFixed(0)}KB)`);
                } catch (uploadError) {
                    console.error(`❌ [AdminAsset] Upload FAILED for ${imgDef.key}:`, uploadError);
                    // Keep the data URL as fallback — it will still work in the browser
                    // But log clearly so we can debug
                }

                images[imgDef.key] = finalUrl;

                // Update log to "success"
                setGenerationLogs(prev => prev.map((log, idx) =>
                    idx === i ? { ...log, status: 'success', message: finalUrl.startsWith('data:') ? '⚠️ Generated (local only)' : '✅ Generated & saved' } : log
                ));
            } catch (error) {
                console.error(`Failed to generate image "${imgDef.key}":`, error);
                images[imgDef.key] = ''; // Empty fallback

                // Update log to "error"
                setGenerationLogs(prev => prev.map((log, idx) =>
                    idx === i ? { ...log, status: 'error', message: error instanceof Error ? error.message : 'Failed' } : log
                ));
            }

            // Update progress
            setProgress(((i + 1) / totalImages) * 80);

            // Small delay between requests to respect rate limits
            if (i < totalImages - 1) {
                await new Promise(r => setTimeout(r, 1500));
            }
        }

        setGeneratedImages(images);

        // Build the template data
        setProgress(85);
        const templateData = selectedPreset.buildTemplate(images);

        // Save to Firestore templates collection
        setProgress(90);
        try {
            const now = new Date().toISOString();
            // Find best thumbnail — prioritize hero images
            const thumbnailUrl = images.hero || images.hero_1 || images.ny_hero_1 || images.feature_1 || '';
            const templateDoc = {
                name: customName || templateData.name,
                data: templateData.data,
                theme: templateData.theme,
                componentOrder: templateData.componentOrder,
                sectionVisibility: templateData.sectionVisibility,
                status: 'Template',
                category: templateData.category,
                industries: templateData.industries,
                tags: templateData.tags,
                thumbnailUrl,
                createdAt: now,
                lastUpdated: now,
                generatedWith: 'Quimera Nano Banana 2',
            };

            const templatesCol = collection(db, 'templates');
            const docRef = await addDoc(templatesCol, templateDoc);

            setGeneratedTemplateId(docRef.id);
            setProgress(100);
            setStep('complete');

            // Refresh projects to show the new template
            await refreshProjects();

            // Refresh admin assets so the library is up to date
            try {
                await fetchAdminAssets();
            } catch (_) { /* non-critical */ }

            showSuccess('🎉 Template generado exitosamente con Nano Banana 2');

            if (onTemplateCreated) {
                onTemplateCreated(docRef.id);
            }
        } catch (error) {
            console.error('Failed to save template:', error);
            showError('Error al guardar el template en Firestore');
        }

        setIsGenerating(false);
    }, [selectedPreset, user, customName, generateImage, refreshProjects, showSuccess, showError, onTemplateCreated, uploadAdminAsset, fetchAdminAssets]);

    // ─── RENDER ──────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-editor-bg border border-editor-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-editor-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-yellow-400/20 to-amber-600/20 rounded-xl">
                            <Sparkles size={22} className="text-yellow-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-editor-text-primary">
                                AI Template Generator
                            </h2>
                            <p className="text-xs text-editor-text-secondary">
                                Powered by Quimera Nano Banana 2
                            </p>
                        </div>
                    </div>
                    {step !== 'generating' && (
                        <button onClick={onClose} className="p-2 rounded-lg hover:bg-editor-border text-editor-text-secondary hover:text-editor-text-primary transition-colors">
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Step 1: Select Preset */}
                    {step === 'select' && (
                        <div className="space-y-4">
                            <p className="text-sm text-editor-text-secondary">
                                Selecciona un tipo de template. La IA generará todas las imágenes y configurará los componentes automáticamente.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {TEMPLATE_PRESETS.map(preset => (
                                    <button
                                        key={preset.id}
                                        onClick={() => handleSelectPreset(preset)}
                                        className="group relative p-5 rounded-xl border border-editor-border hover:border-editor-accent bg-editor-panel-bg hover:bg-editor-accent/5 transition-all duration-300 text-left"
                                    >
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${preset.color} flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform`}>
                                            {preset.icon}
                                        </div>
                                        <h3 className="font-bold text-editor-text-primary mb-1">{preset.name}</h3>
                                        <p className="text-xs text-editor-text-secondary leading-relaxed">{preset.description}</p>
                                        <div className="mt-3 flex items-center gap-2">
                                            <span className="text-[10px] px-2 py-0.5 bg-editor-accent/10 text-editor-accent rounded-full font-medium">
                                                {preset.images.length} imágenes IA
                                            </span>
                                            <span className="text-[10px] px-2 py-0.5 bg-editor-border/50 text-editor-text-secondary rounded-full">
                                                {preset.category}
                                            </span>
                                        </div>
                                    </button>
                                ))}

                                {/* More coming soon hint */}
                                <div className="p-4 rounded-xl border border-dashed border-editor-border/30 bg-editor-panel-bg/20 flex items-center justify-center min-h-[140px]">
                                    <div className="text-center">
                                        <Wand2 size={20} className="text-editor-text-secondary/30 mx-auto mb-2" />
                                        <span className="text-xs text-editor-text-secondary/40 block">Más industrias pronto</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Customize */}
                    {step === 'customize' && selectedPreset && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 p-4 bg-editor-panel-bg rounded-xl border border-editor-border">
                                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${selectedPreset.color} flex items-center justify-center text-white flex-shrink-0`}>
                                    {selectedPreset.icon}
                                </div>
                                <div>
                                    <h3 className="font-bold text-editor-text-primary text-sm">{selectedPreset.name}</h3>
                                    <p className="text-xs text-editor-text-secondary">{selectedPreset.images.length} imágenes serán generadas con Nano Banana 2</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Nombre del Template</label>
                                <input
                                    type="text"
                                    value={customName}
                                    onChange={(e) => setCustomName(e.target.value)}
                                    className="w-full bg-editor-panel-bg border border-editor-border rounded-xl px-4 py-3 text-editor-text-primary placeholder:text-editor-text-secondary/40 focus:border-editor-accent focus:ring-1 focus:ring-editor-accent outline-none transition-all"
                                    placeholder="Ej: Ristorante Toscano Premium"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Imágenes a Generar</label>
                                <div className="space-y-2">
                                    {selectedPreset.images.map((img, idx) => (
                                        <div key={img.key} className="flex items-center gap-3 p-3 bg-editor-panel-bg/50 rounded-lg border border-editor-border/50">
                                            <div className="w-8 h-8 rounded-lg bg-editor-accent/10 flex items-center justify-center text-editor-accent font-bold text-sm flex-shrink-0">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-medium text-editor-text-primary capitalize">{img.key.replace(/_/g, ' ')}</span>
                                                <p className="text-xs text-editor-text-secondary truncate">{img.prompt.substring(0, 80)}...</p>
                                            </div>
                                            <span className="text-[10px] text-editor-text-secondary/60 flex-shrink-0">{img.aspectRatio}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-start gap-2">
                                <AlertTriangle size={16} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-yellow-200/80">
                                    La generación tomará aproximadamente {selectedPreset.images.length * 15} segundos. Se consume 1 crédito por imagen.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Generating */}
                    {step === 'generating' && (
                        <div className="space-y-6">
                            <div className="text-center space-y-3">
                                <div className="relative mx-auto w-16 h-16">
                                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-amber-600/20 rounded-full animate-ping" />
                                    <div className="relative w-full h-full bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center">
                                        <Zap size={28} className="text-white" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-editor-text-primary">Generando Template</h3>
                                <p className="text-sm text-editor-text-secondary">
                                    Nano Banana 2 está creando las imágenes...
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-editor-text-secondary font-medium">
                                        Imagen {currentImageIndex + 1} de {selectedPreset?.images.length || 0}
                                    </span>
                                    <span className="text-editor-accent font-bold">{Math.round(progress)}%</span>
                                </div>
                                <ProgressBar3D percentage={progress} size="lg" />
                            </div>

                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                {generationLogs.map((log, idx) => (
                                    <div key={log.key} className={`flex items-center gap-2 p-2 rounded-lg text-sm transition-all ${
                                        log.status === 'generating' ? 'bg-editor-accent/10 text-editor-accent' :
                                        log.status === 'success' ? 'bg-green-500/10 text-green-400' :
                                        log.status === 'error' ? 'bg-red-500/10 text-red-400' :
                                        'text-editor-text-secondary/50'
                                    }`}>
                                        {log.status === 'generating' && <Loader2 size={14} className="animate-spin flex-shrink-0" />}
                                        {log.status === 'success' && <Check size={14} className="flex-shrink-0" />}
                                        {log.status === 'error' && <X size={14} className="flex-shrink-0" />}
                                        {log.status === 'pending' && <div className="w-3.5 h-3.5 rounded-full border border-editor-border flex-shrink-0" />}
                                        <span className="capitalize font-medium">{log.key.replace(/_/g, ' ')}</span>
                                        {log.message && <span className="text-xs ml-auto opacity-70">{log.message}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 4: Complete */}
                    {step === 'complete' && (
                        <div className="space-y-6 text-center">
                            <div className="relative mx-auto w-20 h-20">
                                <div className="absolute inset-0 bg-green-500/20 rounded-full animate-pulse" />
                                <div className="relative w-full h-full bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center">
                                    <Check size={36} className="text-white" />
                                </div>
                            </div>

                            <div>
                                <h3 className="text-2xl font-bold text-editor-text-primary mb-2">¡Template Creado!</h3>
                                <p className="text-sm text-editor-text-secondary">
                                    Tu template "{customName}" ha sido generado exitosamente con todas las imágenes de IA.
                                </p>
                            </div>

                            {/* Image Preview Grid */}
                            {Object.keys(generatedImages).length > 0 && (
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.entries(generatedImages).filter(([_, v]) => v).slice(0, 6).map(([key, dataUrl]) => (
                                        <div key={key} className="relative aspect-video rounded-lg overflow-hidden border border-editor-border">
                                            <img src={dataUrl} alt={key} className="w-full h-full object-cover" />
                                            <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-0.5">
                                                <span className="text-[9px] text-white/80 font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-center gap-2 pt-2">
                                <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-400 rounded-full">
                                    {Object.values(generatedImages).filter(v => v).length} imágenes generadas
                                </span>
                                <span className="text-xs px-2 py-0.5 bg-editor-accent/10 text-editor-accent rounded-full">
                                    Guardado en Firestore
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-editor-border flex justify-between items-center">
                    {step === 'select' && (
                        <>
                            <div />
                            <button onClick={onClose} className="px-4 py-2 text-sm text-editor-text-secondary hover:text-editor-text-primary transition-colors">
                                Cancelar
                            </button>
                        </>
                    )}

                    {step === 'customize' && (
                        <>
                            <button onClick={() => { setStep('select'); setSelectedPreset(null); }} className="flex items-center gap-1.5 px-4 py-2 text-sm text-editor-text-secondary hover:text-editor-text-primary transition-colors">
                                <ChevronLeft size={16} /> Atrás
                            </button>
                            <button
                                onClick={handleGenerate}
                                disabled={!customName.trim()}
                                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-600/20"
                            >
                                <Sparkles size={16} />
                                Generar Template
                                <ChevronRight size={16} />
                            </button>
                        </>
                    )}

                    {step === 'generating' && (
                        <div className="text-center w-full">
                            <p className="text-xs text-editor-text-secondary/60 animate-pulse">
                                No cierres esta ventana...
                            </p>
                        </div>
                    )}

                    {step === 'complete' && (
                        <>
                            <button
                                onClick={() => {
                                    setStep('select');
                                    setSelectedPreset(null);
                                    setGeneratedImages({});
                                    setGenerationLogs([]);
                                    setProgress(0);
                                }}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                            >
                                <RotateCcw size={14} /> Crear Otro
                            </button>
                            <button
                                onClick={onClose}
                                className="flex items-center gap-2 px-6 py-2.5 bg-editor-accent hover:bg-editor-accent/80 text-white rounded-xl font-bold text-sm transition-all"
                            >
                                <Check size={16} /> Listo
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AITemplateGenerator;
