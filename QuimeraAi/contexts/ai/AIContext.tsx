/**
 * AIContext
 * Maneja configuración de AI, generación de imágenes y contenido
 */

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { AiAssistantConfig, Project } from '../../types';
import { useAuth } from '../core/AuthContext';
import { getGoogleGenAI, syncApiKeyFromAiStudio, setCachedApiKey, fetchGoogleApiKey, getCachedApiKey } from '../../utils/genAiClient';
import { generateImageViaProxy, generateContentViaProxy, extractTextFromResponse, shouldUseProxy } from '../../utils/geminiProxyClient';
import { logApiCall } from '../../services/apiLoggingService';
import { Modality } from '@google/genai';
import { supabase } from '../../supabase';

interface EnhancePromptOptions {
    usage?: 'section-background' | 'component-image' | 'admin-asset' | 'project-library' | 'template-thumbnail';
    generationContext?: 'background' | 'general';
    destination?: 'user' | 'global' | 'admin';
    adminCategory?: string;
    aspectRatio?: string;
    style?: string;
    lighting?: string;
    cameraAngle?: string;
    colorGrading?: string;
    depthOfField?: string;
}

interface AIContextType {
    // API Key Management
    hasApiKey: boolean | null;
    promptForKeySelection: () => Promise<void>;
    handleApiError: (error: any) => void;

    // AI Assistant Config (Project Level)
    aiAssistantConfig: AiAssistantConfig;
    setAiAssistantConfig: React.Dispatch<React.SetStateAction<AiAssistantConfig>>;
    saveAiAssistantConfig: (config: AiAssistantConfig, projectId?: string) => Promise<void>;

    // Image Generation
    generateImage: (prompt: string, options?: {
        aspectRatio?: string;
        style?: string;
        destination?: 'user' | 'global' | 'admin';
        adminCategory?: string;
        adminTags?: string[];
        adminDescription?: string;
        resolution?: '1K' | '2K' | '4K';
        lighting?: string;
        cameraAngle?: string;
        colorGrading?: string;
        themeColors?: string;
        depthOfField?: string;
        referenceImage?: string;
        referenceImages?: string[];
        model?: string;
        thinkingLevel?: string;
        personGeneration?: string;
        temperature?: number;
        negativePrompt?: string;
        projectId?: string;
        tenantId?: string | null;
        generationContext?: 'background' | 'general';
    }) => Promise<string>;

    // Batch Image Generation
    generateProjectImagesWithProgress: (
        project: Project,
        imagePrompts: Record<string, string>,
        onProgress: (current: number, total: number, section: string, imageUrl?: string) => void
    ) => Promise<{ success: boolean; generatedImages: Record<string, string>; failedPaths: string[] }>;

    // Prompt Enhancement
    enhancePrompt: (draftPrompt: string, referenceImages?: string[], options?: EnhancePromptOptions) => Promise<string>;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

const defaultAiAssistantConfig: AiAssistantConfig = {
    agentName: 'Quimera Bot',
    tone: 'Professional',
    languages: 'English, Spanish',
    businessProfile: '',
    productsServices: '',
    policiesContact: '',
    specialInstructions: '',
    faqs: [],
    knowledgeDocuments: [],
    knowledgeLinks: [],
    widgetColor: '#4f46e5',
    isActive: true,
    leadCaptureEnabled: true,
    enableLiveVoice: false,
    voiceName: 'Zephyr'
};

export const AIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();

    // API Key State
    const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

    // AI Assistant Config
    const [aiAssistantConfig, setAiAssistantConfig] = useState<AiAssistantConfig>(defaultAiAssistantConfig);

    // Check API key on mount
    useEffect(() => {
        const checkApiKey = async () => {
            try {
                if (shouldUseProxy()) {
                    console.log('✅ [checkApiKey] Using secure proxy');
                    setHasApiKey(true);
                    return;
                }

                const cachedKey = getCachedApiKey();
                if (cachedKey) {
                    setHasApiKey(true);
                    return;
                }

                try {
                    const apiKey = await fetchGoogleApiKey();
                    if (apiKey) {
                        setCachedApiKey(apiKey);
                        setHasApiKey(true);
                        return;
                    }
                } catch (error) {
                    console.debug('No API key found via fetchGoogleApiKey');
                }

                const aiStudio = typeof window !== 'undefined' ? (window as any).aistudio : undefined;
                if (aiStudio && typeof aiStudio.hasSelectedApiKey === 'function') {
                    try {
                        const keyStatus = await aiStudio.hasSelectedApiKey();
                        setHasApiKey(keyStatus);
                        if (keyStatus) {
                            const syncedKey = await syncApiKeyFromAiStudio();
                            if (syncedKey) {
                                setCachedApiKey(syncedKey);
                            }
                        }
                    } catch (error) {
                        setHasApiKey(false);
                    }
                } else {
                    setHasApiKey(false);
                }
            } catch (error) {
                console.warn('Error checking API key', error);
                const cachedKey = getCachedApiKey();
                setHasApiKey(!!cachedKey);
            }
        };

        checkApiKey();
    }, []);

    // Prompt for key selection
    const promptForKeySelection = async () => {
        const aiStudio = typeof window !== 'undefined' ? (window as any).aistudio : undefined;
        if (aiStudio && typeof aiStudio.promptApiKeySelection === 'function') {
            try {
                await aiStudio.promptApiKeySelection();
                const syncedKey = await syncApiKeyFromAiStudio();
                if (syncedKey) {
                    setCachedApiKey(syncedKey);
                    setHasApiKey(true);
                }
            } catch (error) {
                console.error('Error selecting API key:', error);
            }
        }
    };

    // Handle API errors
    const handleApiError = (error: any) => {
        if (error?.message?.includes('API_KEY') || error?.code === 'UNAUTHENTICATED') {
            setHasApiKey(false);
        }
        console.error('AI API Error:', error);
    };

    // Save AI assistant config (persists to Supabase if projectId is provided)
    const saveAiAssistantConfig = async (config: AiAssistantConfig, projectId?: string) => {
        setAiAssistantConfig(config);

        if (projectId && user) {
            try {
                const { error } = await supabase.from('projects')
                    .update({ ai_assistant_config: config, last_updated: new Date().toISOString() })
                    .eq('id', projectId);
                
                if (error) throw error;
                console.log('✅ AI Assistant config saved to Supabase');
            } catch (error) {
                console.error('❌ Error saving AI Assistant config:', error);
                throw error;
            }
        }
    };

    const resolveProjectTenantId = async (projectId?: string, tenantId?: string | null): Promise<string | null> => {
        if (tenantId) return tenantId;

        if (projectId) {
            const { data, error } = await supabase
                .from('projects')
                .select('tenant_id')
                .eq('id', projectId)
                .maybeSingle();

            if (!error && data?.tenant_id) {
                return data.tenant_id;
            }

            if (error) {
                console.warn('[AIContext] Could not resolve project tenant for generated image:', error);
            }
        }

        // Fallback: use the current user's primary tenant from tenant_members
        if (user?.id) {
            const { data: memberData, error: memberError } = await supabase
                .from('tenant_members')
                .select('tenant_id')
                .eq('user_id', user.id)
                .limit(1)
                .maybeSingle();

            if (!memberError && memberData?.tenant_id) {
                // Update the project record so future lookups succeed
                if (projectId) {
                    await supabase
                        .from('projects')
                        .update({ tenant_id: memberData.tenant_id })
                        .eq('id', projectId)
                        .is('tenant_id', null);
                }
                return memberData.tenant_id;
            }
        }

        return null;
    };

    const notifyLibraryUpdated = (
        destination: 'user' | 'admin' | 'global',
        projectId?: string,
    ) => {
        if (typeof window === 'undefined') return;
        try {
            window.dispatchEvent(new CustomEvent('quimera:library-updated', {
                detail: { destination, projectId },
            }));
            if (destination === 'admin' || destination === 'global') {
                window.dispatchEvent(new CustomEvent('quimera:media-updated', {
                    detail: { destination, projectId },
                }));
            }
        } catch (err) {
            console.warn('[AIContext] Could not dispatch library update event:', err);
        }
    };

    const saveGeneratedImageToLibrary = async (
        publicUrl: string,
        storagePath: string,
        fileName: string,
        mimeType: string,
        size: number,
        prompt: string,
        options?: {
            destination?: 'user' | 'global' | 'admin';
            adminCategory?: string;
            adminTags?: string[];
            adminDescription?: string;
            projectId?: string;
            tenantId?: string | null;
        }
    ) => {
        if (!user) return;

        const destination = options?.destination || 'user';
        const now = new Date().toISOString();

        try {
            if (destination === 'admin') {
                const category = options?.adminCategory || 'ai_generated';
                const tagList = options?.adminTags && options.adminTags.length > 0 ? options.adminTags : ['ai-generated'];
                const description = options?.adminDescription || 'Generated by AI';
                const assetId = crypto.randomUUID();

                const { error } = await supabase.from('admin_assets').insert([{
                    id: assetId,
                    name: fileName,
                    url: publicUrl,
                    size,
                    type: mimeType,
                    category,
                    metadata: {
                        storagePath,
                        uploadedBy: user.id,
                        description,
                        tags: tagList,
                        isAiGenerated: true,
                        aiPrompt: prompt,
                        usedIn: [],
                    },
                    created_at: now,
                }]);

                if (error) throw error;

                const { error: mediaErr } = await supabase.from('media_assets').insert([{
                    id: assetId,
                    name: fileName,
                    url: publicUrl,
                    size: size ?? 0,
                    type: mimeType || 'image/png',
                    category,
                    folder_path: storagePath || `media/${category}/${fileName}`,
                    tags: tagList,
                    description,
                    is_ai_generated: true,
                    ai_prompt: prompt,
                    is_system_asset: false,
                    used_in: [],
                    usage_count: 0,
                    metadata: {
                        storagePath,
                        uploadedBy: user.id,
                        syncedFrom: 'admin_assets',
                    },
                    created_by: user.id,
                    created_at: now,
                }]);
                if (mediaErr) {
                    console.warn('[AIContext] admin_assets saved but media_assets sync failed:', mediaErr);
                }

                notifyLibraryUpdated('admin');
                return;
            }

            if (destination === 'global') {
                const assetId = crypto.randomUUID();

                const { error } = await supabase.from('global_files').insert([{
                    id: assetId,
                    name: fileName,
                    url: publicUrl,
                    size,
                    type: mimeType,
                    metadata: {
                        storagePath,
                        uploadedBy: user.id,
                        isAiGenerated: true,
                        aiPrompt: prompt,
                    },
                    created_at: now,
                }]);

                if (error) throw error;

                const { error: mediaErr } = await supabase.from('media_assets').insert([{
                    id: assetId,
                    name: fileName,
                    url: publicUrl,
                    size: size ?? 0,
                    type: mimeType || 'image/png',
                    category: 'other',
                    folder_path: storagePath?.replace(/^global\/files\//, 'media/') || `media/other/${fileName}`,
                    tags: [] as string[],
                    description: options?.adminDescription || 'Generated by AI',
                    is_ai_generated: true,
                    ai_prompt: prompt,
                    is_system_asset: false,
                    used_in: [],
                    usage_count: 0,
                    metadata: {
                        storagePath,
                        uploadedBy: user.id,
                        syncedFrom: 'global_files',
                    },
                    created_by: user.id,
                    created_at: now,
                }]);
                if (mediaErr) {
                    console.warn('[AIContext] global_files saved but media_assets sync failed:', mediaErr);
                }

                notifyLibraryUpdated('global');
                return;
            }

            const tenantId = await resolveProjectTenantId(options?.projectId, options?.tenantId);
            if (!options?.projectId || !tenantId) {
                console.warn('[AIContext] Generated image was not saved to project library: missing projectId or tenantId.', {
                    projectId: options?.projectId,
                    tenantId,
                });
                return;
            }

            const { error } = await supabase.from('files').insert([{
                tenant_id: tenantId,
                project_id: options.projectId,
                name: fileName,
                url: publicUrl,
                size,
                type: mimeType,
                metadata: {
                    storagePath,
                    uploadedBy: user.id,
                    isAiGenerated: true,
                    aiPrompt: prompt,
                },
                created_at: now,
            }]);
            if (error) {
                console.error('[AIContext] Failed to save generated image to files table:', error);
                throw error;
            }
            console.log('✅ [AIContext] Generated image saved to project library:', fileName);
            notifyLibraryUpdated('user', options.projectId);
        } catch (error) {
            console.warn('[AIContext] Generated image saved to storage but not linked to library:', error);
        }
    };

    const uploadGeneratedImageBlob = async (
        blob: Blob,
        fileName: string,
        mimeType: string,
        prompt: string,
        options?: {
            destination?: 'user' | 'global' | 'admin';
            adminCategory?: string;
            adminTags?: string[];
            adminDescription?: string;
            projectId?: string;
            tenantId?: string | null;
        }
    ): Promise<string> => {
        const destination = options?.destination || 'user';
        const category = options?.adminCategory || 'ai_generated';
        const filePath = destination === 'admin'
            ? `admin/assets/${category}/${fileName}`
            : destination === 'global'
                ? `global/files/${fileName}`
                : `users/${user?.id || 'anonymous'}/projects/${options?.projectId || 'unassigned'}/files/${fileName}`;

        const { error } = await supabase.storage
            .from('platform-assets')
            .upload(filePath, blob, {
                contentType: mimeType,
                cacheControl: '31536000',
                upsert: false
            });

        if (error) throw error;

        const { data: publicUrlData } = supabase.storage
            .from('platform-assets')
            .getPublicUrl(filePath);

        await saveGeneratedImageToLibrary(
            publicUrlData.publicUrl,
            filePath,
            fileName,
            mimeType,
            blob.size,
            prompt,
            options
        );

        return publicUrlData.publicUrl;
    };

    const generateImage = async (prompt: string, options?: {
        aspectRatio?: string;
        style?: string;
        destination?: 'user' | 'global' | 'admin';
        adminCategory?: string;
        adminTags?: string[];
        adminDescription?: string;
        resolution?: '1K' | '2K' | '4K';
        lighting?: string;
        cameraAngle?: string;
        colorGrading?: string;
        themeColors?: string;
        depthOfField?: string;
        referenceImage?: string;
        referenceImages?: string[];
        // Quimera AI specific options
        model?: string;
        thinkingLevel?: string;
        personGeneration?: string;
        temperature?: number;
        negativePrompt?: string;
        projectId?: string;
        tenantId?: string | null;
        generationContext?: 'background' | 'general';
        // Visual Identity Kit options
        visualReferences?: Array<{
            category: string;
            label: string;
            aiPromptHint?: string;
            position?: string;
            description?: string;
        }>;
        aiPromptHints?: string[];
    }): Promise<string> => {
        const startTime = Date.now();

        try {
            // Build enhanced prompt
            let enhancedPrompt = prompt;
            const hasRefs = (options?.referenceImages?.length ?? 0) > 0;
            const hasKitHints = Boolean(options?.aiPromptHints && options.aiPromptHints.length > 0);

            // Visual Identity Kit: prepend structured instructions when kit hints are present
            if (hasKitHints) {
                const parts: string[] = ['CRITICAL VISUAL REFERENCES — You MUST incorporate these elements into the generated image:'];

                // Group hints by category using visualReferences
                if (options.visualReferences && options.visualReferences.length > 0) {
                    const grouped = new Map<string, typeof options.visualReferences>();
                    for (const ref of options.visualReferences) {
                        const list = grouped.get(ref.category) || [];
                        list.push(ref);
                        grouped.set(ref.category, list);
                    }

                    const categoryLabels: Record<string, string> = {
                        character: 'CHARACTER (must appear exactly as described):',
                        background: 'BACKGROUND/ENVIRONMENT:',
                        product: 'PRODUCT (must match exactly):',
                        element: 'BRAND ELEMENTS (icons, patterns, graphics):',
                        style: 'STYLE REFERENCE:',
                        environment: 'SETTING/ENVIRONMENT:',
                        prop: 'PROPS/OBJECTS:',
                        lighting: 'LIGHTING STYLE:',
                    };

                    for (const [category, refs] of grouped) {
                        const label = categoryLabels[category] || `${category.toUpperCase()}:`;
                        parts.push(`\n${label}`);
                        for (const ref of refs) {
                            const hint = ref.aiPromptHint || ref.description || ref.label;
                            let line = `- ${hint}`;
                            if (ref.position) line += ` (Position: ${ref.position})`;
                            parts.push(line);
                        }
                    }
                } else {
                    // Fallback: just list the hints
                    for (const hint of options.aiPromptHints!) {
                        parts.push(`- ${hint}`);
                    }
                }

                parts.push(`\nThe reference images provided alongside this prompt show exactly what these elements look like. Replicate them faithfully.`);
                parts.push(`\nUSER PROMPT: ${prompt}`);
                enhancedPrompt = parts.join('\n');
            } else if (hasRefs) {
                // References without kit hints: models often follow text literally unless instructed.
                enhancedPrompt = [
                    'REFERENCE IMAGE(S) ATTACHED — The image(s) sent with this request define the visual identity. Follow them strictly:',
                    '',
                    '• Match art style (cartoon, flat, painterly, photorealistic, etc.) from the reference(s).',
                    '• Match character/subject design: silhouette, proportions, colors, and recognizable features.',
                    '• Do NOT substitute a generic style (e.g. unrelated realistic 3D) unless the reference itself looks that way.',
                    '',
                    'Scene to create while preserving the reference look:',
                    prompt,
                ].join('\n');
            }

            // Background context: prepend background-specific instructions (skip when references need identity fidelity)
            if (options?.generationContext === 'background' && !hasKitHints && !hasRefs) {
                enhancedPrompt = `Create a wide, seamless background image suitable for a website section. The image should have no central focal subject, work well as a backdrop behind text and UI elements, and have smooth edges with no hard borders. ${enhancedPrompt}`;
            }

            if (options?.style && options.style !== 'None') {
                enhancedPrompt = `${options.style} style: ${enhancedPrompt}`;
            }
            if (options?.lighting) {
                enhancedPrompt += `, ${options.lighting} lighting`;
            }
            if (options?.cameraAngle) {
                enhancedPrompt += `, ${options.cameraAngle} angle`;
            }
            if (options?.aspectRatio) {
                enhancedPrompt += `, aspect ratio ${options.aspectRatio}`;
            }
            if (options?.resolution) {
                enhancedPrompt += `, ${options.resolution} resolution`;
            }

            // Try proxy first
            if (shouldUseProxy()) {
                const result = await generateImageViaProxy(
                    user?.id || 'anonymous',
                    enhancedPrompt,
                    {
                        aspectRatio: options?.aspectRatio,
                        style: options?.style,
                        resolution: options?.resolution,
                        referenceImages: options?.referenceImages,
                        // Quimera AI specific options
                        model: options?.model,
                        thinkingLevel: options?.thinkingLevel,
                        personGeneration: options?.personGeneration,
                        temperature: options?.temperature,
                        negativePrompt: options?.negativePrompt,
                        // Visual controls
                        lighting: options?.lighting,
                        cameraAngle: options?.cameraAngle,
                        colorGrading: options?.colorGrading,
                        themeColors: options?.themeColors,
                        depthOfField: options?.depthOfField,
                        // Visual Identity Kit
                        aiPromptHints: options?.aiPromptHints,
                    },
                    options?.projectId
                );

                await logApiCall({
                    endpoint: 'imagen/generate',
                    model: options?.model || 'imagen-4.0-nano-banana-002',
                    promptTokens: enhancedPrompt.length,
                    completionTokens: 0,
                    totalTokens: enhancedPrompt.length,
                    latencyMs: Date.now() - startTime,
                    success: true,
                    userId: user?.id,
                });

                // Instead of returning a massive base64 string which exceeds Firestore limits (1MB),
                // upload it to Supabase storage and return the public URL.
                try {
                    const byteCharacters = atob(result.image);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: result.mimeType || 'image/jpeg' });

                    const ext = result.mimeType?.split('/')[1] || 'jpeg';
                    const filename = `ai-gen-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
                    return await uploadGeneratedImageBlob(
                        blob,
                        filename,
                        result.mimeType || 'image/jpeg',
                        enhancedPrompt,
                        options
                    );
                } catch (uploadError) {
                    console.error('[AIContext] Failed to upload generated image to Supabase, falling back to base64:', uploadError);
                    // Fallback to data URL only if upload fails (might still cause save errors if too many fallback)
                    return `data:${result.mimeType};base64,${result.image}`;
                }
            }

            // Fallback to direct API
            const genAI = await getGoogleGenAI();
            if (!genAI) {
                throw new Error('AI not available');
            }

            const response = await genAI.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: enhancedPrompt,
                config: {
                    responseModalities: [Modality.TEXT, Modality.IMAGE],
                },
            });

            await logApiCall({
                endpoint: 'gemini/generateContent',
                model: 'gemini-2.5-flash',
                promptTokens: enhancedPrompt.length,
                completionTokens: 0,
                totalTokens: enhancedPrompt.length,
                latencyMs: Date.now() - startTime,
                success: true,
                userId: user?.id,
            });

            // Extract image from response
            if (response.candidates?.[0]?.content?.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData?.data) {
                        const mimeType = part.inlineData.mimeType || 'image/jpeg';
                        try {
                            const byteCharacters = atob(part.inlineData.data);
                            const byteNumbers = new Array(byteCharacters.length);
                            for (let i = 0; i < byteCharacters.length; i++) {
                                byteNumbers[i] = byteCharacters.charCodeAt(i);
                            }
                            const blob = new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
                            const ext = mimeType.split('/')[1] || 'jpeg';
                            const filename = `ai-gen-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
                            return await uploadGeneratedImageBlob(blob, filename, mimeType, enhancedPrompt, options);
                        } catch (uploadError) {
                            console.error('[AIContext] Failed to upload generated image to Supabase, falling back to base64:', uploadError);
                            return `data:${mimeType};base64,${part.inlineData.data}`;
                        }
                    }
                }
            }

            throw new Error('No image generated');
        } catch (error) {
            await logApiCall({
                endpoint: 'imagen/generate',
                model: 'imagen-4.0-nano-banana-002',
                promptTokens: prompt.length,
                completionTokens: 0,
                totalTokens: prompt.length,
                latencyMs: Date.now() - startTime,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: user?.id,
            });

            handleApiError(error);
            throw error;
        }
    };

    // Generate project images with progress
    const generateProjectImagesWithProgress = async (
        project: Project,
        imagePrompts: Record<string, string>,
        onProgress: (current: number, total: number, section: string, imageUrl?: string) => void
    ): Promise<{ success: boolean; generatedImages: Record<string, string>; failedPaths: string[] }> => {
        const paths = Object.keys(imagePrompts);
        const total = paths.length;
        const generatedImages: Record<string, string> = {};
        const failedPaths: string[] = [];

        for (let i = 0; i < paths.length; i++) {
            const path = paths[i];
            const prompt = imagePrompts[path];

            onProgress(i + 1, total, path);

            try {
                const imageUrl = await generateImage(prompt, {
                    themeColors: `${project.theme.colorPrimary}, ${project.theme.colorSecondary}`,
                });
                generatedImages[path] = imageUrl;
                onProgress(i + 1, total, path, imageUrl);
            } catch (error) {
                console.error(`Failed to generate image for ${path}:`, error);
                failedPaths.push(path);
            }

            // Small delay to avoid rate limiting
            if (i < paths.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        return {
            success: failedPaths.length === 0,
            generatedImages,
            failedPaths,
        };
    };

    const buildPromptEnhancementInstructions = (
        draftPrompt: string,
        referenceImages?: string[],
        options?: EnhancePromptOptions
    ): string => {
        const usage = options?.usage || (options?.generationContext === 'background' ? 'section-background' : 'component-image');
        const category = options?.adminCategory || 'general';
        const visualSettings = [
            options?.aspectRatio ? `Aspect ratio: ${options.aspectRatio}` : null,
            options?.style && options.style !== 'None' ? `Style: ${options.style}` : null,
            options?.lighting && options.lighting !== 'None' ? `Lighting: ${options.lighting}` : null,
            options?.cameraAngle && options.cameraAngle !== 'None' ? `Camera angle: ${options.cameraAngle}` : null,
            options?.colorGrading && options.colorGrading !== 'None' ? `Color grading: ${options.colorGrading}` : null,
            options?.depthOfField && options.depthOfField !== 'None' ? `Depth of field: ${options.depthOfField}` : null,
            referenceImages?.length ? `Reference images provided: ${referenceImages.length}` : null,
        ].filter(Boolean).join('\n');

        const usageRules: Record<string, string> = {
            'section-background': `This prompt is for a website section background.
- Prioritize atmosphere, depth, texture, brand mood, and broad composition.
- Leave clean negative space for UI/text overlays.
- Do not add readable text, app screens, buttons, icons, logos, mockups, frames, cards, menus, people staring at camera, or product labels unless the original prompt explicitly asks for them.
- Avoid busy foreground subjects that would compete with page content.`,
            'component-image': `This prompt is for a visual inside a website component.
- Make the subject clear and relevant to the component area.
- Keep it usable in a UI container, with balanced margins and no clutter.
- Do not add readable text, fake UI, buttons, captions, watermarks, or brand labels unless explicitly requested.`,
            'admin-asset': `This prompt is for the Quimera.ai administration asset library, category: ${category}.
- Optimize for reusable production assets.
- Match the category exactly; do not invent extra objects or UI.
- Do not add readable text, watermarks, signatures, labels, app chrome, or decorative elements unrelated to the category.
- If the category is background, apply background rules with negative space.
- If the category is logo, describe symbol/mark direction only and avoid text unless the original prompt asks for lettering.`,
            'project-library': `This prompt is for a project media library image.
- Keep it directly useful for the user's site.
- Avoid unnecessary props, fake interfaces, text overlays, watermarks, and unrelated scenery.
- Preserve the user's original subject and intent.`,
            'template-thumbnail': `This prompt is for a website template thumbnail.
- Create a clean visual preview of the website/template mood, not a poster.
- It may show abstract website layout structure, but avoid readable text, fake brand names, watermarks, and excessive UI details.
- Keep the composition clear at small sizes with a strong focal hierarchy.`,
        };

        return `You are Quimera.ai's image prompt enhancer for website and asset generation.

Rewrite the user's draft into one production-ready image generation prompt.

Core rules:
- Preserve the user's original intent and subject.
- Add only useful visual details for the target area.
- Remove or avoid anything that should not visibly appear in the generated image.
- Do not add text, letters, words, captions, watermarks, signatures, fake UI controls, buttons, menus, or logos unless the user's draft explicitly requests them.
- Do not mention these instructions in the output.
- Return only the enhanced prompt as one concise paragraph, no markdown, no labels.

Target area:
${usageRules[usage] || usageRules['component-image']}

Current settings:
${visualSettings || 'No extra settings selected.'}

Original prompt:
${draftPrompt}

Enhanced prompt:`;
    };

    // Enhance prompt using AI
    const enhancePrompt = async (draftPrompt: string, referenceImages?: string[], options?: EnhancePromptOptions): Promise<string> => {
        const startTime = Date.now();

        try {
            const systemPrompt = buildPromptEnhancementInstructions(draftPrompt, referenceImages, options);

            if (shouldUseProxy()) {
                const result = await generateContentViaProxy(
                    'ai-prompt-enhancement',  // projectId
                    systemPrompt,              // prompt
                    'gemini-2.5-flash',        // model (using stable version)
                    {},                        // config
                    user?.id                  // userId
                );
                return extractTextFromResponse(result);
            }

            const genAI = await getGoogleGenAI();
            if (!genAI) {
                return draftPrompt;
            }

            const response = await genAI.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: systemPrompt,
            });

            await logApiCall({
                endpoint: 'gemini/generateContent',
                model: 'gemini-2.5-flash',
                promptTokens: systemPrompt.length,
                completionTokens: 100,
                totalTokens: systemPrompt.length + 100,
                latencyMs: Date.now() - startTime,
                success: true,
                userId: user?.id,
            });

            return response.text || draftPrompt;
        } catch (error) {
            console.error('Error enhancing prompt:', error);
            return draftPrompt;
        }
    };

    const value: AIContextType = {
        hasApiKey,
        promptForKeySelection,
        handleApiError,
        aiAssistantConfig,
        setAiAssistantConfig,
        saveAiAssistantConfig,
        generateImage,
        generateProjectImagesWithProgress,
        enhancePrompt,
    };

    return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
};

export const useAI = (): AIContextType => {
    const context = useContext(AIContext);
    if (!context) {
        throw new Error('useAI must be used within an AIProvider');
    }
    return context;
};

/**
 * Safe version of useAI that returns null if not inside AIProvider
 * Useful for components that can work both inside and outside the AI context (e.g., public preview)
 */
export const useSafeAI = (): AIContextType | null => {
    const context = useContext(AIContext);
    return context || null;
};
