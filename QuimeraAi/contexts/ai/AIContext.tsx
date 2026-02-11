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
import { db, doc, updateDoc } from '../../firebase';

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
        destination?: 'user' | 'global';
        resolution?: '1K' | '2K' | '4K';
        lighting?: string;
        cameraAngle?: string;
        colorGrading?: string;
        themeColors?: string;
        depthOfField?: string;
        referenceImage?: string;
        referenceImages?: string[];
    }) => Promise<string>;

    // Batch Image Generation
    generateProjectImagesWithProgress: (
        project: Project,
        imagePrompts: Record<string, string>,
        onProgress: (current: number, total: number, section: string, imageUrl?: string) => void
    ) => Promise<{ success: boolean; generatedImages: Record<string, string>; failedPaths: string[] }>;

    // Prompt Enhancement
    enhancePrompt: (draftPrompt: string, referenceImages?: string[]) => Promise<string>;
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

    // Save AI assistant config (persists to Firestore if projectId is provided)
    const saveAiAssistantConfig = async (config: AiAssistantConfig, projectId?: string) => {
        setAiAssistantConfig(config);

        // Persist to Firestore if we have projectId and user
        if (projectId && user) {
            try {
                const projectDocRef = doc(db, 'users', user.uid, 'projects', projectId);
                await updateDoc(projectDocRef, { aiAssistantConfig: config });
                console.log('✅ AI Assistant config saved to Firestore');
            } catch (error) {
                console.error('❌ Error saving AI Assistant config:', error);
                throw error;
            }
        }
    };

    // Generate image
    const generateImage = async (prompt: string, options?: {
        aspectRatio?: string;
        style?: string;
        destination?: 'user' | 'global';
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
    }): Promise<string> => {
        const startTime = Date.now();

        try {
            // Build enhanced prompt
            let enhancedPrompt = prompt;
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

            // Try proxy first
            if (shouldUseProxy()) {
                const result = await generateImageViaProxy(
                    user?.uid || 'anonymous',
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
                    }
                );

                await logApiCall({
                    endpoint: 'imagen/generate',
                    model: options?.model || 'gemini-3-pro-image-preview',
                    promptTokens: enhancedPrompt.length,
                    completionTokens: 0,
                    totalTokens: enhancedPrompt.length,
                    latencyMs: Date.now() - startTime,
                    success: true,
                    userId: user?.uid,
                });

                // Return the image as a data URL
                return `data:${result.mimeType};base64,${result.image}`;
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
                userId: user?.uid,
            });

            // Extract image from response
            if (response.candidates?.[0]?.content?.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData?.data) {
                        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    }
                }
            }

            throw new Error('No image generated');
        } catch (error) {
            await logApiCall({
                endpoint: 'imagen/generate',
                model: 'gemini-3-pro-image-preview',
                promptTokens: prompt.length,
                completionTokens: 0,
                totalTokens: prompt.length,
                latencyMs: Date.now() - startTime,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: user?.uid,
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

    // Enhance prompt using AI
    const enhancePrompt = async (draftPrompt: string, referenceImages?: string[]): Promise<string> => {
        const startTime = Date.now();

        try {
            const systemPrompt = `You are a professional prompt engineer. Enhance the following image generation prompt to be more detailed and specific, while maintaining the original intent. Add details about lighting, composition, style, and mood. Keep it concise but descriptive.

Original prompt: ${draftPrompt}

Enhanced prompt:`;

            if (shouldUseProxy()) {
                const result = await generateContentViaProxy(
                    'ai-prompt-enhancement',  // projectId
                    systemPrompt,              // prompt
                    'gemini-2.5-flash',        // model (using stable version)
                    {},                        // config
                    user?.uid                  // userId
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
                userId: user?.uid,
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





