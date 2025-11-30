import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, Building2, Sparkles, Loader2, Palette, Image as ImageIcon, Zap, Wand2, Upload, RefreshCw } from 'lucide-react';
import { Project } from '../../../types';
import IndustrySelector from '../../ui/IndustrySelector';
import Modal from '../../ui/Modal';
import { useEditor } from '../../../contexts/EditorContext';
import { getGoogleGenAI } from '../../../utils/genAiClient';
import { INDUSTRIES, INDUSTRY_IDS } from '../../../data/industries';

interface TemplateEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    template: Project | null;
    onSave: (templateId: string, updates: Partial<Project>) => Promise<void>;
}

// Helper to extract all colors from a template
const extractTemplateColors = (template: Project): { colors: string[], colorInfo: string } => {
    const colors: Set<string> = new Set();
    const colorDetails: string[] = [];

    // Global theme colors
    const gc = template.theme?.globalColors;
    if (gc) {
        if (gc.primary) { colors.add(gc.primary); colorDetails.push(`Primary: ${gc.primary}`); }
        if (gc.secondary) { colors.add(gc.secondary); colorDetails.push(`Secondary: ${gc.secondary}`); }
        if (gc.accent) { colors.add(gc.accent); colorDetails.push(`Accent: ${gc.accent}`); }
        if (gc.background) { colors.add(gc.background); colorDetails.push(`Background: ${gc.background}`); }
        if (gc.text) { colors.add(gc.text); colorDetails.push(`Text: ${gc.text}`); }
    }

    // Hero colors
    const hc = template.data?.hero?.colors;
    if (hc) {
        if (hc.primary) { colors.add(hc.primary); colorDetails.push(`Hero Primary: ${hc.primary}`); }
        if (hc.secondary) { colors.add(hc.secondary); colorDetails.push(`Hero Secondary: ${hc.secondary}`); }
        if (hc.background) { colors.add(hc.background); colorDetails.push(`Hero Background: ${hc.background}`); }
    }

    // Header colors
    const headerC = template.data?.header?.colors;
    if (headerC) {
        if (headerC.background) { colors.add(headerC.background); colorDetails.push(`Header Background: ${headerC.background}`); }
        if (headerC.accent) { colors.add(headerC.accent); colorDetails.push(`Header Accent: ${headerC.accent}`); }
    }

    // Features colors
    const featC = template.data?.features?.colors;
    if (featC) {
        if (featC.background) colors.add(featC.background);
        if (featC.accent) colors.add(featC.accent);
    }

    // CTA colors
    const ctaC = template.data?.cta?.colors;
    if (ctaC) {
        if (ctaC.gradientStart) colors.add(ctaC.gradientStart);
        if (ctaC.gradientEnd) colors.add(ctaC.gradientEnd);
    }

    return {
        colors: Array.from(colors).filter(c => c && c.startsWith('#')),
        colorInfo: colorDetails.join(', ')
    };
};

// Analyze color characteristics
const analyzeColorPalette = (colors: string[]): string => {
    if (colors.length === 0) return 'No colors detected';

    const characteristics: string[] = [];

    // Check for dark mode
    const hasDarkBg = colors.some(c => {
        const hex = c.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance < 0.3;
    });

    if (hasDarkBg) characteristics.push('Dark theme');
    else characteristics.push('Light theme');

    // Check for specific color families
    colors.forEach(c => {
        const hex = c.replace('#', '').toLowerCase();
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);

        // Detect dominant colors
        if (r > 180 && g < 100 && b < 100) characteristics.push('Contains red/warm tones');
        if (r < 100 && g > 180 && b < 100) characteristics.push('Contains green tones');
        if (r < 100 && g < 100 && b > 180) characteristics.push('Contains blue tones');
        if (r > 180 && g > 180 && b < 100) characteristics.push('Contains gold/yellow tones');
        if (r > 200 && g > 100 && b < 100) characteristics.push('Contains orange tones');
        if (r > 150 && g < 100 && b > 150) characteristics.push('Contains purple tones');
        if (r > 200 && g > 150 && b > 150) characteristics.push('Contains pink/rose tones');
        if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20) {
            if (r > 200) characteristics.push('Contains white/light neutral');
            else if (r < 50) characteristics.push('Contains black/dark');
            else characteristics.push('Contains gray tones');
        }
    });

    // Remove duplicates
    const unique = [...new Set(characteristics)];
    return unique.join(', ');
};

const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({
    isOpen,
    onClose,
    template,
    onSave
}) => {
    const { t } = useTranslation();
    const { hasApiKey, promptForKeySelection, handleApiError, generateImage, enhancePrompt, uploadFile, files } = useEditor();
    const [isLoading, setIsLoading] = useState(false);
    const [isAiSuggesting, setIsAiSuggesting] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const [error, setError] = useState('');
    
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        tags: [] as string[],
        industries: [] as string[],
        thumbnailUrl: '',
    });

    const [tagInput, setTagInput] = useState('');
    
    // Thumbnail generation state
    const [showThumbnailGenerator, setShowThumbnailGenerator] = useState(false);
    const [thumbnailPrompt, setThumbnailPrompt] = useState('');
    const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
    const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
    const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null);
    const [thumbnailStyle, setThumbnailStyle] = useState('Minimalist');
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const THUMBNAIL_STYLES = [
        { label: t('editor.minimalist', { defaultValue: 'Minimalist' }), value: 'Minimalist' },
        { label: t('editor.photorealistic', { defaultValue: 'Photorealistic' }), value: 'Photorealistic' },
        { label: t('editor.digitalArt', { defaultValue: 'Digital Art' }), value: 'Digital Art' },
        { label: t('editor.3dRender', { defaultValue: '3D Render' }), value: '3D Render' },
        { label: t('editor.cyberpunk', { defaultValue: 'Cyberpunk' }), value: 'Cyberpunk' },
    ];

    // Reset form when template changes
    useEffect(() => {
        if (template) {
            setFormData({
                name: template.name || '',
                description: template.description || '',
                category: template.category || template.brandIdentity?.industry || '',
                tags: template.tags || [],
                industries: template.industries || [],
                thumbnailUrl: template.thumbnailUrl || '',
            });
            setAiSuggestions([]);
            setGeneratedThumbnail(null);
            setThumbnailPrompt('');
            setShowThumbnailGenerator(false);
        }
        setError('');
    }, [template, isOpen]);
    
    // Generate AI prompt suggestion based on template
    const generateThumbnailPromptSuggestion = async () => {
        if (!template) return;

        if (hasApiKey === false) {
            await promptForKeySelection();
            return;
        }

        setIsEnhancingPrompt(true);
        try {
            const ai = await getGoogleGenAI();
            const { colors, colorInfo } = extractTemplateColors(template);
            const colorAnalysis = analyzeColorPalette(colors);
            
            const prompt = `You are an expert in creating visual thumbnails for website templates.

Generate a detailed, creative prompt for an AI image generator to create a stunning thumbnail image for this website template.

**Template Information:**
- Name: ${template.name}
- Category: ${template.category || template.brandIdentity?.industry || 'Not specified'}
- Description: ${template.description || 'A professional website template'}

**Color Palette:**
${colorInfo || 'Colors: ' + colors.join(', ')}

**Color Analysis:**
${colorAnalysis}

**Guidelines:**
- The thumbnail should visually represent what the website looks like or what it's for
- Include elements that match the industry/category
- Use the color palette mentioned above
- Make it eye-catching and professional
- Include abstract shapes, mockups, or relevant imagery
- DON'T include any text in the image

Return ONLY the prompt text, nothing else. Make it 1-2 sentences maximum.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt,
            });

            setThumbnailPrompt(response.text.trim());
        } catch (error) {
            console.error('Error generating prompt suggestion:', error);
            handleApiError(error);
        } finally {
            setIsEnhancingPrompt(false);
        }
    };

    // Enhance existing prompt
    const handleEnhancePrompt = async () => {
        if (!thumbnailPrompt.trim()) return;
        
        if (hasApiKey === false) {
            await promptForKeySelection();
            return;
        }

        setIsEnhancingPrompt(true);
        try {
            const enhanced = await enhancePrompt(thumbnailPrompt);
            setThumbnailPrompt(enhanced);
        } catch (error) {
            console.error('Error enhancing prompt:', error);
            handleApiError(error);
        } finally {
            setIsEnhancingPrompt(false);
        }
    };

    // Generate thumbnail with AI
    const handleGenerateThumbnail = async () => {
        if (!thumbnailPrompt.trim()) return;

        if (hasApiKey === false) {
            await promptForKeySelection();
            return;
        }

        setIsGeneratingThumbnail(true);
        try {
            const url = await generateImage(thumbnailPrompt, {
                aspectRatio: '16:9',
                style: thumbnailStyle,
                destination: 'global',
                resolution: '2K',
            });
            setGeneratedThumbnail(url);
        } catch (error) {
            console.error('Error generating thumbnail:', error);
            handleApiError(error);
        } finally {
            setIsGeneratingThumbnail(false);
        }
    };

    // Apply generated thumbnail
    const applyGeneratedThumbnail = () => {
        if (generatedThumbnail) {
            setFormData(prev => ({ ...prev, thumbnailUrl: generatedThumbnail }));
            setShowThumbnailGenerator(false);
            setGeneratedThumbnail(null);
        }
    };

    // Handle file upload for thumbnail
    const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            await uploadFile(file);
            // Get the most recently uploaded file
            const latestFile = files[0];
            if (latestFile) {
                setFormData(prev => ({ ...prev, thumbnailUrl: latestFile.downloadURL }));
            }
        } catch (error) {
            console.error('Error uploading thumbnail:', error);
        }
    };

    // AI suggestion function
    const suggestIndustriesWithAI = async () => {
        if (!template) return;

        if (hasApiKey === false) {
            await promptForKeySelection();
            return;
        }

        setIsAiSuggesting(true);
        setAiSuggestions([]);

        try {
            const ai = await getGoogleGenAI();
            const { colors, colorInfo } = extractTemplateColors(template);
            const colorAnalysis = analyzeColorPalette(colors);

            // Build a comprehensive prompt
            const industryList = INDUSTRIES.map(i => i.id).join(', ');
            
            const prompt = `You are an expert in design psychology and color theory for business branding.

Analyze this website template and suggest the most appropriate industries it would work well for.

**Template Information:**
- Name: ${template.name}
- Category: ${template.category || template.brandIdentity?.industry || 'Not specified'}
- Description: ${template.description || 'Not provided'}

**Color Palette:**
${colorInfo || 'Colors: ' + colors.join(', ')}

**Color Analysis:**
${colorAnalysis}

**Template Components:**
${template.componentOrder?.join(', ') || 'Standard layout'}

**Available Industry IDs (you MUST only use these exact IDs):**
${industryList}

**Color Psychology Guidelines:**
- Dark themes with neon accents → Technology, Gaming, Nightlife, Entertainment
- Gold/Warm browns → Luxury, Restaurant, Real Estate, Legal, Finance
- Green tones → Health, Wellness, Environment, Agriculture, Organic
- Blue tones → Technology, Finance, Healthcare, Corporate, Trust-building
- Red/Orange → Food, Restaurant, Energy, Sports, Urgency
- Purple → Creative, Luxury, Beauty, Spiritual
- Pink/Rose → Beauty, Fashion, Wedding, Feminine products
- Black & White minimal → Photography, Art, Portfolio, Fashion, Architecture
- Earth tones → Organic, Agriculture, Eco-friendly, Outdoor, Wellness
- Bright/Vibrant → Children, Entertainment, Creative, Playful brands
- Navy + Gold → Luxury, Legal, Finance, Real Estate

Based on the color palette and template structure, suggest 5-10 industries that would be the BEST fit.
Return ONLY a JSON array of industry IDs from the available list above.

Example response: ["restaurant", "hotel", "cafe-coffee", "catering", "event-planning"]

Return ONLY the JSON array, no other text.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt,
            });

            // Parse the response
            let suggestedIds: string[] = [];
            try {
                // Clean up the response - remove markdown code blocks if present
                let cleanedText = response.text.trim();
                cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
                suggestedIds = JSON.parse(cleanedText);
                
                // Validate that all IDs exist in our list
                suggestedIds = suggestedIds.filter(id => INDUSTRY_IDS.includes(id));
            } catch (parseError) {
                console.error('Failed to parse AI response:', response.text);
                // Try to extract IDs from text if JSON parsing failed
                const matches = response.text.match(/"([a-z-]+)"/g);
                if (matches) {
                    suggestedIds = matches
                        .map(m => m.replace(/"/g, ''))
                        .filter(id => INDUSTRY_IDS.includes(id));
                }
            }

            setAiSuggestions(suggestedIds);
        } catch (error) {
            console.error('AI suggestion error:', error);
            handleApiError(error);
        } finally {
            setIsAiSuggesting(false);
        }
    };

    // Apply AI suggestions
    const applyAiSuggestions = () => {
        // Merge AI suggestions with existing selections (no duplicates)
        const merged = [...new Set([...formData.industries, ...aiSuggestions])];
        setFormData(prev => ({ ...prev, industries: merged }));
        setAiSuggestions([]);
    };

    // Apply single suggestion
    const applySingleSuggestion = (industryId: string) => {
        if (!formData.industries.includes(industryId)) {
            setFormData(prev => ({ ...prev, industries: [...prev.industries, industryId] }));
        }
        setAiSuggestions(prev => prev.filter(id => id !== industryId));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!template) return;
        
        setIsLoading(true);
        setError('');
        
        try {
            await onSave(template.id, {
                name: formData.name,
                description: formData.description,
                category: formData.category,
                tags: formData.tags,
                industries: formData.industries,
                thumbnailUrl: formData.thumbnailUrl,
            });
            onClose();
        } catch (err) {
            console.error('Failed to update template:', err);
            setError(t('messages.updateError'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddTag = () => {
        const trimmed = tagInput.trim();
        if (trimmed && !formData.tags.includes(trimmed)) {
            setFormData(prev => ({ ...prev, tags: [...prev.tags, trimmed] }));
            setTagInput('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
    };

    const handleTagKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    // Get industry label
    const getIndustryLabel = (industryId: string): string => {
        const industry = INDUSTRIES.find(i => i.id === industryId);
        if (industry) {
            const key = industry.labelKey.replace('industries.', '');
            return t(`industries.${key}`, { defaultValue: industryId });
        }
        return industryId;
    };

    // Extract colors for display
    const templateColors = template ? extractTemplateColors(template).colors : [];

    if (!template) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="p-6 border-b border-editor-border flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold text-white">
                        {t('industries.title')} & Metadata
                    </h2>
                    <p className="text-sm text-editor-text-secondary mt-0.5">{template?.name}</p>
                </div>
                <button 
                    onClick={onClose} 
                    className="p-1 rounded-full hover:bg-editor-border transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
            
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-5" style={{ maxHeight: '70vh', overflowY: 'visible' }}>
                    {error && (
                        <p className="bg-red-500/10 text-red-400 text-sm p-3 rounded-md">
                            {error}
                        </p>
                    )}

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-editor-text-secondary mb-1">
                            {t('superadmin.sortByCategory')}
                        </label>
                        <input
                            type="text"
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            placeholder="e.g., Hospitality & Dining"
                            className="w-full bg-editor-bg text-white p-2.5 rounded-md border border-editor-border focus:ring-2 focus:ring-editor-accent focus:outline-none"
                        />
                    </div>

                    {/* Thumbnail Image Section */}
                    <div className="bg-editor-bg/50 rounded-lg p-4 border border-editor-border">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-editor-accent" />
                                <span className="text-sm font-medium text-editor-text-secondary">
                                    {t('superadmin.templateThumbnail', { defaultValue: 'Template Thumbnail' })}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/*"
                                    onChange={handleThumbnailUpload}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-editor-border text-editor-text-secondary hover:text-white rounded transition-colors"
                                >
                                    <Upload className="w-3 h-3" />
                                    {t('common.upload', { defaultValue: 'Upload' })}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowThumbnailGenerator(!showThumbnailGenerator)}
                                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                                        showThumbnailGenerator
                                            ? 'bg-editor-accent text-editor-bg'
                                            : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                                    }`}
                                >
                                    <Zap className="w-3 h-3" />
                                    {t('editor.generateWithAI', { defaultValue: 'Generate with AI' })}
                                </button>
                            </div>
                        </div>

                        {/* Current Thumbnail Preview */}
                        <div className="mb-3">
                            <div className="relative aspect-video w-full max-w-md bg-editor-border rounded-lg overflow-hidden">
                                {formData.thumbnailUrl ? (
                                    <img 
                                        src={formData.thumbnailUrl} 
                                        alt="Template thumbnail" 
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-editor-text-secondary">
                                        <div className="text-center">
                                            <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">{t('superadmin.noThumbnail', { defaultValue: 'No thumbnail set' })}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* AI Thumbnail Generator */}
                        {showThumbnailGenerator && (
                            <div className="mt-4 p-4 bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-lg border border-purple-500/30 animate-fade-in-up">
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles className="w-4 h-4 text-purple-400" />
                                    <span className="text-sm font-medium text-purple-300">
                                        {t('superadmin.aiThumbnailGenerator', { defaultValue: 'AI Thumbnail Generator' })}
                                    </span>
                                </div>

                                {/* Prompt Input */}
                                <div className="mb-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-xs text-editor-text-secondary">
                                            {t('editor.prompt', { defaultValue: 'Prompt' })}
                                        </label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={generateThumbnailPromptSuggestion}
                                                disabled={isEnhancingPrompt}
                                                className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 disabled:opacity-50"
                                                title={t('superadmin.autoGeneratePrompt', { defaultValue: 'Auto-generate prompt from template' })}
                                            >
                                                {isEnhancingPrompt ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Sparkles className="w-3 h-3" />
                                                )}
                                                {t('superadmin.suggest', { defaultValue: 'Suggest' })}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleEnhancePrompt}
                                                disabled={isEnhancingPrompt || !thumbnailPrompt}
                                                className="flex items-center gap-1 text-xs text-editor-accent hover:text-white disabled:opacity-50"
                                            >
                                                {isEnhancingPrompt ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Wand2 className="w-3 h-3" />
                                                )}
                                                {t('editor.enhance', { defaultValue: 'Enhance' })}
                                            </button>
                                        </div>
                                    </div>
                                    <textarea
                                        value={thumbnailPrompt}
                                        onChange={(e) => setThumbnailPrompt(e.target.value)}
                                        placeholder={t('superadmin.describeThumbnail', { defaultValue: 'Describe the thumbnail you want to generate...' })}
                                        className="w-full bg-editor-bg border border-editor-border rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none resize-none h-20"
                                    />
                                </div>

                                {/* Style Selector */}
                                <div className="mb-3">
                                    <label className="block text-xs text-editor-text-secondary mb-1">
                                        {t('editor.style', { defaultValue: 'Style' })}
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {THUMBNAIL_STYLES.map((s) => (
                                            <button
                                                key={s.value}
                                                type="button"
                                                onClick={() => setThumbnailStyle(s.value)}
                                                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                                                    thumbnailStyle === s.value
                                                        ? 'bg-purple-600 text-white'
                                                        : 'bg-editor-border text-editor-text-secondary hover:bg-editor-border/70'
                                                }`}
                                            >
                                                {s.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Generate Button */}
                                <button
                                    type="button"
                                    onClick={handleGenerateThumbnail}
                                    disabled={isGeneratingThumbnail || !thumbnailPrompt.trim()}
                                    className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                >
                                    {isGeneratingThumbnail ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            {t('editor.dreaming', { defaultValue: 'Generating...' })}
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-4 h-4" />
                                            {t('editor.generateImage', { defaultValue: 'Generate Thumbnail' })}
                                        </>
                                    )}
                                </button>

                                {/* Generated Thumbnail Preview */}
                                {generatedThumbnail && (
                                    <div className="mt-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs text-editor-text-secondary">
                                                {t('superadmin.generatedThumbnail', { defaultValue: 'Generated Thumbnail' })}
                                            </span>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleGenerateThumbnail}
                                                    disabled={isGeneratingThumbnail}
                                                    className="flex items-center gap-1 text-xs text-editor-text-secondary hover:text-white"
                                                    title={t('superadmin.regenerate', { defaultValue: 'Regenerate' })}
                                                >
                                                    <RefreshCw className={`w-3 h-3 ${isGeneratingThumbnail ? 'animate-spin' : ''}`} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="relative aspect-video w-full bg-editor-border rounded-lg overflow-hidden mb-3">
                                            <img 
                                                src={generatedThumbnail} 
                                                alt="Generated thumbnail" 
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={applyGeneratedThumbnail}
                                            className="w-full py-2 bg-editor-accent text-editor-bg font-medium rounded-lg hover:bg-editor-accent/90 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Save className="w-4 h-4" />
                                            {t('superadmin.useThumbnail', { defaultValue: 'Use This Thumbnail' })}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Template Colors Preview */}
                    {templateColors.length > 0 && (
                        <div className="bg-editor-bg/50 rounded-lg p-4 border border-editor-border">
                            <div className="flex items-center gap-2 mb-3">
                                <Palette className="w-4 h-4 text-editor-accent" />
                                <span className="text-sm font-medium text-editor-text-secondary">
                                    {t('industries.templateColors')}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {templateColors.map((color, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-2 px-2 py-1 bg-editor-border rounded"
                                    >
                                        <div
                                            className="w-5 h-5 rounded border border-white/20"
                                            style={{ backgroundColor: color }}
                                        />
                                        <span className="text-xs text-editor-text-secondary font-mono">
                                            {color}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Industries - Main feature with AI */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-sm font-medium text-editor-text-secondary">
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4" />
                                    {t('industries.title')}
                                </div>
                            </label>
                            
                            {/* AI Suggest Button */}
                            <button
                                type="button"
                                onClick={suggestIndustriesWithAI}
                                disabled={isAiSuggesting}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm rounded-md hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 shadow-lg"
                            >
                                {isAiSuggesting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {t('industries.analyzing')}
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        {t('industries.aiSuggest')}
                                    </>
                                )}
                            </button>
                        </div>
                        
                        <p className="text-xs text-editor-text-secondary/70 mb-2">
                            {t('industries.selectIndustries')} - AI analyzes colors to suggest matching industries
                        </p>

                        {/* AI Suggestions */}
                        {aiSuggestions.length > 0 && (
                            <div className="mb-3 p-3 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-lg border border-purple-500/30">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-purple-300 flex items-center gap-1.5">
                                        <Sparkles className="w-4 h-4" />
                                        {t('industries.aiSuggestionsTitle')}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={applyAiSuggestions}
                                        className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                                    >
                                        {t('industries.applyAll')}
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {aiSuggestions.map(id => (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => applySingleSuggestion(id)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-600/50 text-purple-200 text-sm rounded-full hover:bg-purple-600 transition-colors border border-purple-500/50"
                                        >
                                            <span>+</span>
                                            {getIndustryLabel(id)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <IndustrySelector
                            selectedIndustries={formData.industries}
                            onChange={(industries) => setFormData(prev => ({ ...prev, industries }))}
                            maxHeight="300px"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-editor-border flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-editor-accent text-white rounded-md hover:bg-editor-accent/90 transition-colors disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {isLoading ? t('common.loading') : t('common.save')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default TemplateEditorModal;
