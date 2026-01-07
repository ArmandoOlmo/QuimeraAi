import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, Building2, Sparkles, Loader2, Palette, Image as ImageIcon, Zap, Wand2, Upload, RefreshCw, ChevronDown, Info } from 'lucide-react';
import { Project, GlobalColors } from '../../../types';
import IndustrySelector from '../../ui/IndustrySelector';
import Modal from '../../ui/Modal';
import { useEditor } from '../../../contexts/EditorContext';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useAI } from '../../../contexts/ai/AIContext';
import { useFiles } from '../../../contexts/files/FilesContext';
import { useAdmin } from '../../../contexts/admin/AdminContext';
import { generateContent } from '../../../utils/genAiClient';
import { shouldUseProxy, generateContentViaProxy, extractTextFromResponse } from '../../../utils/geminiProxyClient';
import { INDUSTRIES, INDUSTRY_IDS } from '../../../data/industries';
import CoolorsImporter from '../../ui/CoolorsImporter';
import { generateComponentColorMappings } from '../../ui/GlobalStylesControl';
import { logApiCall } from '../../../services/apiLoggingService';

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
        if (gc.primary) { colors?.add(gc.primary); colorDetails.push(`Primary: ${gc.primary}`); }
        if (gc.secondary) { colors?.add(gc.secondary); colorDetails.push(`Secondary: ${gc.secondary}`); }
        if (gc.accent) { colors?.add(gc.accent); colorDetails.push(`Accent: ${gc.accent}`); }
        if (gc.background) { colors?.add(gc.background); colorDetails.push(`Background: ${gc.background}`); }
        if (gc.text) { colors?.add(gc.text); colorDetails.push(`Text: ${gc.text}`); }
    }

    // Hero colors
    const hc = template.data?.hero?.colors;
    if (hc) {
        if (hc.primary) { colors?.add(hc.primary); colorDetails.push(`Hero Primary: ${hc.primary}`); }
        if (hc.secondary) { colors?.add(hc.secondary); colorDetails.push(`Hero Secondary: ${hc.secondary}`); }
        if (hc.background) { colors?.add(hc.background); colorDetails.push(`Hero Background: ${hc.background}`); }
    }

    // Header colors
    const headerC = template.data?.header?.colors;
    if (headerC) {
        if (headerC.background) { colors?.add(headerC.background); colorDetails.push(`Header Background: ${headerC.background}`); }
        if (headerC.accent) { colors?.add(headerC.accent); colorDetails.push(`Header Accent: ${headerC.accent}`); }
    }

    // Features colors
    const featC = template.data?.features?.colors;
    if (featC) {
        if (featC.background) colors?.add(featC.background);
        if (featC.accent) colors?.add(featC.accent);
    }

    // CTA colors
    const ctaC = template.data?.cta?.colors;
    if (ctaC) {
        if (ctaC.gradientStart) colors?.add(ctaC.gradientStart);
        if (ctaC.gradientEnd) colors?.add(ctaC.gradientEnd);
    }

    return {
        colors: Array.from(colors).filter(c => c && c.startsWith('#')),
        colorInfo: colorDetails.join(', ')
    };
};

// Analyze color characteristics
const analyzeColorPalette = (colors: string[]): string => {
    if (colors?.length === 0) return 'No colors detected';

    const characteristics: string[] = [];

    // Check for dark mode
    const hasDarkBg = colors?.some(c => {
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
    colors?.forEach(c => {
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
    const { user } = useAuth();
    const { hasApiKey, promptForKeySelection, handleApiError, generateImage, enhancePrompt } = useAI();
    const { uploadFile, files } = useFiles();
    const { getPrompt } = useAdmin();
    const [isLoading, setIsLoading] = useState(false);
    const [isAiSuggesting, setIsAiSuggesting] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const [isGeneratingName, setIsGeneratingName] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        tags: [] as string[],
        industries: [] as string[],
        thumbnailUrl: '',
        heroImageUrl: '', // For setting hero background
        globalColors: null as GlobalColors | null,
        paletteColors: [] as string[],
    });

    const [tagInput, setTagInput] = useState('');
    const [showCoolorsImporter, setShowCoolorsImporter] = useState(false);

    // Thumbnail generation state
    const [showThumbnailGenerator, setShowThumbnailGenerator] = useState(false);
    const [thumbnailPrompt, setThumbnailPrompt] = useState('');
    const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
    const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
    const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null);
    const [thumbnailStyle, setThumbnailStyle] = useState('Minimalist');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const THUMBNAIL_STYLES = [
        { label: t('superadmin.templateEditor.styles.minimalist', 'Minimalist'), value: 'Minimalist' },
        { label: t('superadmin.templateEditor.styles.photorealistic', 'Photorealistic'), value: 'Photorealistic' },
        { label: t('superadmin.templateEditor.styles.digitalArt', 'Digital Art'), value: 'Digital Art' },
        { label: t('superadmin.templateEditor.styles.3dRender', '3D Render'), value: '3D Render' },
        { label: t('superadmin.templateEditor.styles.cyberpunk', 'Cyberpunk'), value: 'Cyberpunk' },
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
                heroImageUrl: template.data?.hero?.imageUrl || '',
                globalColors: template.theme?.globalColors || null,
                paletteColors: template.theme?.paletteColors || [],
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

        // In production, use proxy directly (no API key needed on client)
        const useProxy = shouldUseProxy();
        if (!useProxy && hasApiKey === false) {
            await promptForKeySelection();
            return;
        }

        setIsEnhancingPrompt(true);
        let modelToUse = 'gemini-2.5-flash'; // Declared outside try for error logging
        
        try {
            const { colors, colorInfo } = extractTemplateColors(template);
            const colorAnalysis = analyzeColorPalette(colors);

            // Get dynamic prompt
            const promptTemplate = getPrompt('template-thumbnail-suggestion');
            let promptText = '';

            if (promptTemplate) {
                promptText = promptTemplate.template
                    .replace('{{name}}', template.name)
                    .replace('{{category}}', template.category || template.brandIdentity?.industry || 'Not specified')
                    .replace('{{description}}', template.description || 'A professional website template')
                    .replace('{{colorInfo}}', colorInfo || 'Colors: ' + colors?.join(', '))
                    .replace('{{colorAnalysis}}', colorAnalysis);
                modelToUse = promptTemplate.model;
            } else {
                // Fallback
                promptText = `You are an expert in creating visual thumbnails for website templates.

Generate a detailed, creative prompt for an AI image generator to create a stunning thumbnail image for this website template.

**Template Information:**
- Name: ${template.name}
- Category: ${template.category || template.brandIdentity?.industry || 'Not specified'}
- Description: ${template.description || 'A professional website template'}

**Color Palette:**
${colorInfo || 'Colors: ' + colors?.join(', ')}

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
            }

            // Use secure proxy for production (prefix 'template-' for proxy to recognize it)
            const proxyProjectId = template.id.startsWith('template-') ? template.id : `template-${template.id}`;

            let responseText: string;
            if (useProxy) {
                // High maxOutputTokens for thinking models
                const proxyResponse = await generateContentViaProxy(proxyProjectId, promptText, modelToUse, { maxOutputTokens: 8192 }, user?.uid);
                responseText = extractTextFromResponse(proxyResponse);
            } else {
                responseText = await generateContent(promptText, proxyProjectId, modelToUse, {}, user?.uid);
            }

            // Log successful API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: proxyProjectId,
                    model: modelToUse,
                    feature: 'template-thumbnail-prompt',
                    success: true
                });
            }

            setThumbnailPrompt(responseText.trim());
        } catch (error) {
            // Log failed API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: template?.id,
                    model: modelToUse,
                    feature: 'template-thumbnail-prompt',
                    success: false,
                    errorMessage: error instanceof Error ? error.message : 'Unknown error'
                });
            }
            console.error('Error generating prompt suggestion:', error);
            handleApiError(error);
        } finally {
            setIsEnhancingPrompt(false);
        }
    };

    // Enhance existing prompt
    const handleEnhancePrompt = async () => {
        if (!thumbnailPrompt.trim()) return;

        // In production, use proxy directly (no API key needed on client)
        const useProxy = shouldUseProxy();
        if (!useProxy && hasApiKey === false) {
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

        // In production, use proxy directly (no API key needed on client)
        const useProxy = shouldUseProxy();
        if (!useProxy && hasApiKey === false) {
            await promptForKeySelection();
            return;
        }

        setIsGeneratingThumbnail(true);
        try {
            // Add explicit instruction to avoid text in the image
            const enhancedPrompt = `${thumbnailPrompt}, absolutely no text, no words, no letters, no typography, no watermarks, no logos with text`;

            const url = await generateImage(enhancedPrompt, {
                aspectRatio: '16:9',
                style: thumbnailStyle,
                destination: 'user',
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

    // Apply generated thumbnail - also stores it for hero
    const applyGeneratedThumbnail = () => {
        if (generatedThumbnail) {
            setFormData(prev => ({
                ...prev,
                thumbnailUrl: generatedThumbnail,
                heroImageUrl: generatedThumbnail // Also save for hero
            }));
            setShowThumbnailGenerator(false);
            setGeneratedThumbnail(null);
        }
    };

    // Handle file upload for thumbnail - also sets hero image
    const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            await uploadFile(file);
            // Get the most recently uploaded file
            const latestFile = files[0];
            if (latestFile) {
                setFormData(prev => ({
                    ...prev,
                    thumbnailUrl: latestFile.downloadURL,
                    heroImageUrl: latestFile.downloadURL // Also set for hero
                }));
            }
        } catch (error) {
            console.error('Error uploading thumbnail:', error);
        }
    };

    // AI suggestion function
    const suggestIndustriesWithAI = async () => {
        if (!template) return;

        // In production, use proxy directly (no API key needed on client)
        const useProxy = shouldUseProxy();
        if (!useProxy && hasApiKey === false) {
            await promptForKeySelection();
            return;
        }

        setIsAiSuggesting(true);
        setAiSuggestions([]);
        let modelToUse = 'gemini-2.5-flash'; // Declared outside try for error logging

        try {
            const { colors, colorInfo } = extractTemplateColors(template);
            const colorAnalysis = analyzeColorPalette(colors);

            // Build a comprehensive prompt
            const industryList = INDUSTRIES.map(i => i.id).join(', ');

            // Get dynamic prompt
            const promptTemplate = getPrompt('template-industry-suggestion');
            let promptText = '';

            if (promptTemplate) {
                promptText = promptTemplate.template
                    .replace('{{name}}', template.name)
                    .replace('{{category}}', template.category || template.brandIdentity?.industry || 'Not specified')
                    .replace('{{description}}', template.description || 'Not provided')
                    .replace('{{colorInfo}}', colorInfo || 'Colors: ' + colors?.join(', '))
                    .replace('{{colorAnalysis}}', colorAnalysis)
                    .replace('{{components}}', template.componentOrder?.join(', ') || 'Standard layout')
                    .replace('{{industryList}}', industryList);
                modelToUse = promptTemplate.model;
            } else {
                // Fallback
                promptText = `You are an expert in design psychology and color theory for business branding.

Analyze this website template and suggest the most appropriate industries it would work well for.

**Template Information:**
- Name: ${template.name}
- Category: ${template.category || template.brandIdentity?.industry || 'Not specified'}
- Description: ${template.description || 'Not provided'}

**Color Palette:**
${colorInfo || 'Colors: ' + colors?.join(', ')}

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
            }

            // Use secure proxy for production (prefix 'template-' for proxy to recognize it)
            const proxyProjectId = template.id.startsWith('template-') ? template.id : `template-${template.id}`;

            let responseText: string;
            if (useProxy) {
                // Pass high maxOutputTokens - gemini-2.5-flash uses tokens for "thinking" internally
                // so we need 8192+ to leave room for both thinking AND the actual response
                const proxyResponse = await generateContentViaProxy(
                    proxyProjectId,
                    promptText,
                    modelToUse,
                    { maxOutputTokens: 8192 }, // High limit to accommodate thinking + output
                    user?.uid
                );

                // Debug: Log the actual response structure
                console.log('🔍 Industry suggestion proxy response:', JSON.stringify(proxyResponse, null, 2).slice(0, 1000));

                // Check for API errors in the response (cast to any for error field)
                const proxyResponseAny = proxyResponse as any;
                if (proxyResponseAny?.error) {
                    throw new Error(proxyResponseAny.error.message || proxyResponseAny.error);
                }

                // Check if response was truncated due to MAX_TOKENS
                const finishReason = proxyResponse?.response?.candidates?.[0]?.finishReason;
                if (finishReason === 'MAX_TOKENS') {
                    console.warn('⚠️ Response was truncated due to MAX_TOKENS');
                }

                responseText = extractTextFromResponse(proxyResponse);

                if (!responseText) {
                    console.error('❌ Empty response text. Full response:', proxyResponse);
                    // More specific error message based on finishReason
                    if (finishReason === 'MAX_TOKENS') {
                        throw new Error(t('superadmin.templateEditor.errors.truncated', 'Response was truncated. Try again.'));
                    }
                    throw new Error(t('superadmin.templateEditor.errors.apiInvalid', 'The API did not return a valid response. Try with another template.'));
                }
            } else {
                responseText = await generateContent(promptText, proxyProjectId, modelToUse, {}, user?.uid);
            }

            // Log successful API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: proxyProjectId,
                    model: modelToUse,
                    feature: 'template-industry-suggestion',
                    success: true
                });
            }

            // Parse the response
            let suggestedIds: string[] = [];
            try {
                // Clean up the response - remove markdown code blocks if present
                let cleanedText = responseText.trim();
                cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

                // Try to find JSON array in the response
                const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    cleanedText = jsonMatch[0];
                }

                const parsedArray = JSON.parse(cleanedText);

                // Ensure it's an array
                if (Array.isArray(parsedArray)) {
                    suggestedIds = parsedArray;
                }

                // Validate that all IDs exist in our list
                const validIds = suggestedIds.filter(id => INDUSTRY_IDS.includes(id));
                const invalidIds = suggestedIds.filter(id => !INDUSTRY_IDS.includes(id));

                if (invalidIds.length > 0) {
                    console.warn('AI suggested invalid industry IDs:', invalidIds);
                }

                suggestedIds = validIds;
            } catch (parseError) {
                console.error('Failed to parse AI response:', responseText, parseError);
                // Try to extract IDs from text if JSON parsing failed
                const matches = responseText.match(/"([a-z0-9-]+)"/gi);
                if (matches) {
                    suggestedIds = matches
                        .map(m => m.replace(/"/g, '').toLowerCase())
                        .filter(id => INDUSTRY_IDS.includes(id));
                }
            }

            // Apply suggestions automatically
            if (suggestedIds.length > 0) {
                const merged = [...new Set([...formData.industries, ...suggestedIds])];
                setFormData(prev => ({ ...prev, industries: merged }));
                setAiSuggestions(suggestedIds);
            } else {
                // Show error if no valid industries found
                setError(t('superadmin.templateEditor.errors.suggest', 'Could not suggest industries. Try again.'));
                console.warn('No valid industries found in AI response:', responseText);
            }
        } catch (error) {
            // Log failed API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: template?.id,
                    model: modelToUse,
                    feature: 'template-industry-suggestion',
                    success: false,
                    errorMessage: error instanceof Error ? error.message : 'Unknown error'
                });
            }
            console.error('AI suggestion error:', error);
            setError(t('superadmin.templateEditor.errors.suggestError', 'Error suggesting industries. Check your connection.'));
            handleApiError(error);
        } finally {
            setIsAiSuggesting(false);
        }
    };

    // Apply AI suggestions (for manual apply if needed)
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
            // Auto-apply generated thumbnail if there's one pending
            const finalThumbnailUrl = generatedThumbnail || formData.thumbnailUrl;
            const finalHeroImageUrl = generatedThumbnail || formData.heroImageUrl;

            // Debug: Log what we're saving
            console.log('💾 Saving template with:', {
                templateId: template.id,
                generatedThumbnail: generatedThumbnail ? 'HAS_VALUE' : 'EMPTY',
                formDataThumbnailUrl: formData.thumbnailUrl ? 'HAS_VALUE' : 'EMPTY',
                finalThumbnailUrl: finalThumbnailUrl ? finalThumbnailUrl.substring(0, 50) + '...' : 'EMPTY',
                industries: formData.industries
            });

            // Build update object with current formData values
            const updates: Partial<Project> = {
                name: formData.name,
                description: formData.description,
                category: formData.category,
                tags: formData.tags || [],
                industries: formData.industries || [],
                thumbnailUrl: finalThumbnailUrl,
            };

            // Include globalColors if a palette was imported
            if (formData.globalColors) {
                updates.theme = {
                    ...template.theme,
                    globalColors: formData.globalColors,
                    paletteColors: formData.paletteColors || [],
                    pageBackground: formData.globalColors.background,
                };

                // Apply colors to all components
                const componentColorMappings = generateComponentColorMappings(formData.globalColors);
                const ecommerceComponents = [
                    'productDetailPage', 'storeSettings', 'featuredProducts', 'categoryGrid',
                    'productHero', 'trustBadges', 'saleCountdown', 'announcementBar',
                    'collectionBanner', 'recentlyViewed', 'productReviews', 'productBundle',
                    'products'
                ];

                updates.data = {
                    ...template.data,
                };

                for (const [componentId, componentColors] of Object.entries(componentColorMappings)) {
                    const key = componentId as keyof typeof updates.data;
                    if (updates.data[key] && typeof updates.data[key] === 'object') {
                        (updates.data[key] as any) = {
                            ...(updates.data[key] as any),
                            colors: {
                                ...((updates.data[key] as any).colors || {}),
                                ...componentColors
                            }
                        };
                    } else if (ecommerceComponents.includes(componentId)) {
                        (updates.data as any)[key] = {
                            colors: componentColors
                        };
                    }
                }
            }

            // Update hero image if a new one was generated
            if (finalHeroImageUrl) {
                updates.data = {
                    ...(updates.data || template.data),
                    hero: {
                        ...template.data?.hero,
                        ...(updates.data?.hero || {}),
                        imageUrl: finalHeroImageUrl,
                        backgroundImage: finalHeroImageUrl,
                    }
                };
            }

            console.log('📝 Full updates object:', updates);

            await onSave(template.id, updates);
            console.log('✅ Template saved successfully');
            onClose();
        } catch (err) {
            console.error('Failed to update template:', err);
            console.error('Failed to update template:', err);
            setError(t('superadmin.templateEditor.errors.update', 'Failed to update template.'));
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

    // Handle Coolors palette import
    const handleCoolorsPaletteGenerated = async (colors: GlobalColors, allColors: string[], paletteName?: string) => {
        // Use the AI-generated palette name directly, or keep current name
        const newName = paletteName || formData.name;

        setFormData(prev => ({
            ...prev,
            name: newName,
            globalColors: colors,
            paletteColors: allColors
        }));

        setShowCoolorsImporter(false);
    };

    // Generate template name with AI based on colors
    const handleGenerateNameWithAI = async () => {
        if (!template) return;

        // Get colors from formData (if palette was imported) or from template
        const colorsToAnalyze = (formData.paletteColors || []).length > 0
            ? formData.paletteColors
            : extractTemplateColors(template).colors;

        if (colorsToAnalyze.length === 0) {
            setError(t('superadmin.templateEditor.errors.noColors', 'No colors found. Import a color palette first.'));
            return;
        }

        setIsGeneratingName(true);
        setError('');
        let modelToUse = 'gemini-2.5-flash'; // Declared outside try for error logging

        try {
            // Get dynamic prompt
            const promptTemplate = getPrompt('template-name-generation');
            let promptText = '';

            if (promptTemplate) {
                promptText = promptTemplate.template
                    .replace('{{colors}}', colorsToAnalyze.join(', '));
                modelToUse = promptTemplate.model;
            } else {
                // Fallback
                promptText = `You are a creative naming expert. Analyze these colors and create a short, memorable, creative name for this website template.

Colors: ${colorsToAnalyze.join(', ')}

Requirements:
- Name must be in ENGLISH
- Maximum 2-3 words
- Be creative and evocative (e.g., "Arctic Dawn", "Coral Sunset", "Midnight Garden", "Golden Ember")
- The name should evoke the mood/feeling of the color palette
- Do NOT include generic words like "Template", "Theme", "Palette", "Design"
- Just respond with the name, nothing else

Name:`;
            }

            // Use secure proxy for production (prefix 'template-' for proxy to recognize it)
            const proxyProjectId = template.id.startsWith('template-') ? template.id : `template-${template.id}`;
            const useProxy = shouldUseProxy();

            let text: string;
            if (useProxy) {
                // High maxOutputTokens for thinking models
                const proxyResponse = await generateContentViaProxy(proxyProjectId, promptText, modelToUse, { maxOutputTokens: 8192 }, user?.uid);
                text = extractTextFromResponse(proxyResponse);
            } else {
                text = await generateContent(promptText, proxyProjectId, modelToUse, {}, user?.uid);
            }

            // Log successful API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: proxyProjectId,
                    model: modelToUse,
                    feature: 'template-name-generation',
                    success: true
                });
            }

            // Clean up the response
            const cleanName = text
                .trim()
                .split('\n')[0]
                .replace(/^["']|["']$/g, '')
                .replace(/\.$/g, '')
                .replace(/^Name:\s*/i, '')
                .trim();

            if (cleanName && cleanName.length > 1 && cleanName.length < 50) {
                // Replace name completely with AI-generated name
                setFormData(prev => ({ ...prev, name: cleanName }));
            } else {
                setError(t('superadmin.templateEditor.errors.nameInvalid', 'Could not generate a valid name. Try again.'));
            }
        } catch (err) {
            // Log failed API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: template?.id,
                    model: modelToUse,
                    feature: 'template-name-generation',
                    success: false,
                    errorMessage: err instanceof Error ? err.message : 'Unknown error'
                });
            }
            console.error('AI name generation failed:', err);
            setError(t('superadmin.templateEditor.errors.nameError', 'Failed to generate name. Please try again.'));
        } finally {
            setIsGeneratingName(false);
        }
    };

    // Extract colors for display
    const templateColors = template ? extractTemplateColors(template).colors : [];

    if (!template) return null;

    // Combine template colors with imported palette colors for display
    const paletteColors = formData.paletteColors || [];
    const displayColors = paletteColors.length > 0 ? paletteColors : templateColors;

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-4xl">
            {/* Compact Header */}
            <div className="px-5 py-4 border-b border-editor-border flex justify-between items-center bg-gradient-to-r from-editor-bg to-editor-surface">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-white">{t('superadmin.templateEditor.title', 'Template Editor')}</h2>
                        <p className="text-xs text-editor-text-secondary">{template?.name}</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-editor-border transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="p-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
                    {error && (
                        <p className="bg-red-500/10 text-red-400 text-sm p-2.5 rounded-lg mb-4">
                            {error}
                        </p>
                    )}

                    {/* Two Column Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                        {/* LEFT COLUMN - Basic Info & Colors */}
                        <div className="space-y-4">
                            {/* Name & Category Row */}
                            <div className="bg-editor-surface/50 rounded-xl p-4 border border-editor-border/50">
                                <div className="space-y-3">
                                    {/* Name with AI Button */}
                                    <div>
                                        <label className="text-xs font-medium text-editor-text-secondary mb-1.5 block">{t('superadmin.templateEditor.nameLabel', 'Name')}</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                placeholder={t('superadmin.templateEditor.namePlaceholder', 'Template name')}
                                                className="flex-1 bg-editor-bg text-white text-sm p-2 rounded-lg border border-editor-border focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleGenerateNameWithAI}
                                                disabled={isGeneratingName || displayColors.length === 0}
                                                className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-40"
                                                title={t('superadmin.templateEditor.generateNameTitle', 'Generate name with AI')}
                                            >
                                                {isGeneratingName ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Category */}
                                    <div>
                                        <label className="text-xs font-medium text-editor-text-secondary mb-1.5 block">{t('superadmin.templateEditor.categoryLabel', 'Category')}</label>
                                        <input
                                            type="text"
                                            name="category"
                                            value={formData.category}
                                            onChange={handleChange}
                                            placeholder={t('superadmin.templateEditor.categoryPlaceholder', 'e.g., Hospitality & Dining')}
                                            className="w-full bg-editor-bg text-white text-sm p-2 rounded-lg border border-editor-border focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Colors Section - Compact */}
                            <div className="bg-editor-surface/50 rounded-xl p-4 border border-editor-border/50">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Palette className="w-4 h-4 text-purple-400" />
                                        <span className="text-xs font-medium text-editor-text-secondary">{t('superadmin.templateEditor.colorsLabel', 'Colors')}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowCoolorsImporter(!showCoolorsImporter)}
                                        className="text-[10px] px-2 py-1 bg-purple-600/20 text-purple-300 rounded-md hover:bg-purple-600/30 transition-colors flex items-center gap-1"
                                    >
                                        <Sparkles size={10} />
                                        {showCoolorsImporter ? t('superadmin.templateEditor.close', 'Close') : t('superadmin.templateEditor.importCoolors', 'Import Coolors')}
                                    </button>
                                </div>

                                {/* Color Swatches */}
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {displayColors.slice(0, 10).map((color, idx) => (
                                        <div
                                            key={idx}
                                            className="w-7 h-7 rounded-lg border border-white/10 shadow-sm cursor-pointer hover:scale-110 transition-transform"
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    ))}
                                    {displayColors.length === 0 && (
                                        <p className="text-xs text-editor-text-secondary/50">{t('superadmin.templateEditor.noColors', 'No colors')}</p>
                                    )}
                                </div>

                                {/* Info about color application */}
                                {formData.globalColors && (
                                    <div className="flex items-start gap-2 p-2 bg-green-900/20 rounded-lg border border-green-500/30">
                                        <Info size={12} className="text-green-400 mt-0.5 shrink-0" />
                                        <p className="text-[10px] text-green-300 leading-relaxed">
                                            {t('superadmin.templateEditor.colorsWillApply', 'Colors will be applied to all components when you save. New components you add will also receive these colors?.')}
                                        </p>
                                    </div>
                                )}

                                {/* Coolors Importer - Inline */}
                                {showCoolorsImporter && (
                                    <div className="pt-3 border-t border-editor-border/50">
                                        <CoolorsImporter
                                            onPaletteGenerated={handleCoolorsPaletteGenerated}
                                            projectId={template?.id || 'template-editor'}
                                            generatePaletteName={true}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Industries Section */}
                            <div className="bg-editor-surface/50 rounded-xl p-4 border border-editor-border/50">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-editor-accent" />
                                        <span className="text-xs font-medium text-editor-text-secondary">{t('industries.title')}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={suggestIndustriesWithAI}
                                        disabled={isAiSuggesting}
                                        className="text-[10px] px-2 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-md hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 flex items-center gap-1"
                                    >
                                        {isAiSuggesting ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                                        {isAiSuggesting ? t('superadmin.templateEditor.analyzing', 'Analyzing...') : t('superadmin.templateEditor.suggestAI', 'Suggest AI')}
                                    </button>
                                </div>

                                {/* AI Suggestions - Compact */}
                                {aiSuggestions.length > 0 && (
                                    <div className="mb-2 p-2 bg-purple-900/20 rounded-lg border border-purple-500/20">
                                        <div className="flex flex-wrap gap-1">
                                            {aiSuggestions.map(id => (
                                                <button
                                                    key={id}
                                                    type="button"
                                                    onClick={() => applySingleSuggestion(id)}
                                                    className="text-[10px] px-2 py-0.5 bg-purple-600/50 text-purple-200 rounded-full hover:bg-purple-600 transition-colors"
                                                >
                                                    + {getIndustryLabel(id)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <IndustrySelector
                                    selectedIndustries={formData.industries}
                                    onChange={(industries) => setFormData(prev => ({ ...prev, industries }))}
                                    maxHeight="180px"
                                />
                            </div>
                        </div>

                        {/* RIGHT COLUMN - Thumbnail */}
                        <div className="space-y-4">
                            <div className="bg-editor-surface/50 rounded-xl p-4 border border-editor-border/50">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4 text-editor-accent" />
                                        <span className="text-xs font-medium text-editor-text-secondary">{t('superadmin.templateEditor.thumbnailLabel', 'Thumbnail')}</span>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <input type="file" ref={fileInputRef} accept="image/*" onChange={handleThumbnailUpload} className="hidden" />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="p-1.5 text-xs bg-editor-border text-editor-text-secondary hover:text-white rounded-lg transition-colors"
                                            title={t('superadmin.templateEditor.uploadImageTitle', 'Upload image')}
                                        >
                                            <Upload className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowThumbnailGenerator(!showThumbnailGenerator)}
                                            className={`p-1.5 text-xs rounded-lg transition-colors ${showThumbnailGenerator
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                                                }`}
                                            title={t('superadmin.templateEditor.generateIATitle', 'Generate with AI')}
                                        >
                                            <Zap className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Thumbnail Preview */}
                                <div className="relative aspect-video w-full bg-editor-bg rounded-lg overflow-hidden border border-editor-border/50">
                                    {formData.thumbnailUrl ? (
                                        <img src={formData.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-editor-text-secondary/50">
                                            <div className="text-center">
                                                <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-30" />
                                                <p className="text-xs">{t('superadmin.templateEditor.noThumbnail', 'No thumbnail')}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* AI Generator - Compact */}
                                {showThumbnailGenerator && (
                                    <div className="mt-3 p-3 bg-purple-900/10 rounded-lg border border-purple-500/20">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-medium text-purple-300">{t('superadmin.templateEditor.generatorTitle', 'AI Generator')}</span>
                                            <div className="flex gap-1">
                                                <button
                                                    type="button"
                                                    onClick={generateThumbnailPromptSuggestion}
                                                    disabled={isEnhancingPrompt}
                                                    className="text-[10px] px-1.5 py-0.5 text-purple-400 hover:text-purple-300 disabled:opacity-50"
                                                >
                                                    {isEnhancingPrompt ? <Loader2 size={10} className="animate-spin" /> : t('superadmin.templateEditor.suggest', 'Suggest')}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleEnhancePrompt}
                                                    disabled={isEnhancingPrompt || !thumbnailPrompt}
                                                    className="text-[10px] px-1.5 py-0.5 text-editor-accent hover:text-white disabled:opacity-50"
                                                >
                                                    {t('superadmin.templateEditor.enhance', 'Enhance')}
                                                </button>
                                            </div>
                                        </div>

                                        <textarea
                                            value={thumbnailPrompt}
                                            onChange={(e) => setThumbnailPrompt(e.target.value)}
                                            placeholder={t('superadmin.templateEditor.describePlaceholder', 'Describe the image...')}
                                            className="w-full bg-editor-bg border border-editor-border rounded-lg p-2 text-xs text-white focus:ring-1 focus:ring-purple-500 outline-none resize-none h-16"
                                        />

                                        {/* Style Pills - Horizontal Scroll */}
                                        <div className="flex gap-1 overflow-x-auto py-2 no-scrollbar">
                                            {THUMBNAIL_STYLES.map((s) => (
                                                <button
                                                    key={s.value}
                                                    type="button"
                                                    onClick={() => setThumbnailStyle(s.value)}
                                                    className={`px-2 py-0.5 text-[10px] rounded-full whitespace-nowrap transition-colors ${thumbnailStyle === s.value
                                                        ? 'bg-purple-600 text-white'
                                                        : 'bg-editor-border text-editor-text-secondary'
                                                        }`}
                                                >
                                                    {s.label}
                                                </button>
                                            ))}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleGenerateThumbnail}
                                            disabled={isGeneratingThumbnail || !thumbnailPrompt.trim()}
                                            className="w-full py-1.5 mt-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-medium rounded-lg disabled:opacity-40 flex items-center justify-center gap-1.5"
                                        >
                                            {isGeneratingThumbnail ? (
                                                <><Loader2 size={12} className="animate-spin" /> {t('superadmin.templateEditor.generating', 'Generating...')}</>
                                            ) : (
                                                <><Zap size={12} /> {t('superadmin.templateEditor.generate', 'Generate')}</>
                                            )}
                                        </button>

                                        {/* Generated Preview */}
                                        {generatedThumbnail && (
                                            <div className="mt-3">
                                                <div className="relative aspect-video w-full bg-editor-border rounded-lg overflow-hidden mb-2">
                                                    <img src={generatedThumbnail} alt="Generated" className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={handleGenerateThumbnail}
                                                        disabled={isGeneratingThumbnail}
                                                        className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                                                    >
                                                        <RefreshCw size={12} className={isGeneratingThumbnail ? 'animate-spin' : ''} />
                                                    </button>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={applyGeneratedThumbnail}
                                                    className="w-full py-1.5 bg-editor-accent text-editor-bg text-xs font-medium rounded-lg flex items-center justify-center gap-1"
                                                >
                                                    <Save size={12} /> {t('superadmin.templateEditor.useImage', 'Use this image')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Compact Footer */}
                <div className="px-5 py-3 border-t border-editor-border flex justify-end gap-2 bg-editor-surface/30">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 text-sm text-editor-text-secondary hover:text-white transition-colors"
                    >
                        {t('superadmin.templateEditor.cancel', 'Cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-editor-accent text-white text-sm font-medium rounded-lg hover:bg-editor-accent/90 transition-colors disabled:opacity-50"
                    >
                        <Save className="w-3.5 h-3.5" />
                        {isLoading ? t('superadmin.templateEditor.saving', 'Saving...') : t('superadmin.templateEditor.save', 'Save')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default TemplateEditorModal;
