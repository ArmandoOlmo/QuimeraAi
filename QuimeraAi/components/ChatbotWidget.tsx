import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ReactDOM from 'react-dom';
import { MessageSquare, X } from 'lucide-react';
import { useSafeEditor } from '../contexts/EditorContext';
import { useSafeProject } from '../contexts/project/ProjectContext';
import { Lead, AiAssistantConfig } from '../types';
import { getDefaultAppearanceConfig, getSizeClasses, getButtonSizeClasses, getShadowClasses, getButtonStyleClasses } from '../utils/chatThemes';
import ChatCore, { ChatAppointmentData, AppointmentSlot } from './chat/ChatCore';
import { supabase } from '../supabase';
import { createAppointmentFromChat, getAppointmentsByProject } from '../services/appointments/appointmentEngineService';
import { useSafeAuth } from '../contexts/core/AuthContext';
import { useSafeTenant } from '../contexts/tenant';
import { useRouter } from '../hooks/useRouter';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WIDGET_API_BASE_URL = (import.meta.env.VITE_WIDGET_API_BASE_URL || 'https://quimera.ai/api/widget').replace(/\/$/, '');

function parseAppointmentDate(value: any, fallback?: Date): Date {
    if (value instanceof Date) return value;
    if (value?.seconds) return new Date(value.seconds * 1000);
    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return fallback || new Date();
}

async function getSupabaseAccessToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
}

interface ChatbotWidgetProps {
    isPreview?: boolean;
    // Props for standalone mode (outside EditorProvider)
    standaloneConfig?: AiAssistantConfig;
    // Full project data for standalone mode (PublicWebsitePreview)
    standaloneProject?: {
        id: string;
        name: string;
        data?: any;
        theme?: any;
        componentOrder?: string[];
        sectionVisibility?: Record<string, boolean>;
        [key: string]: any;
    };
    // Directly hide "Powered by Quimera" badge (for contexts without tenant context)
    hidePoweredBy?: boolean;
}

const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({
    isPreview = false,
    standaloneConfig,
    standaloneProject,
    hidePoweredBy: propHidePoweredBy = false
}) => {
    const editorContext = useSafeEditor();
    const projectContext = useSafeProject();
    const authContext = useSafeAuth();
    const user = authContext?.user || null;
    const tenantContext = useSafeTenant();
    const currentTenantId = tenantContext?.currentTenant?.id || null;
    const hasWhiteLabelBranding = !!(tenantContext?.currentTenant?.branding?.companyName || tenantContext?.currentTenant?.branding?.logoUrl);
    const { t, i18n } = useTranslation();

    const activeProject = editorContext?.activeProject || projectContext?.activeProject || standaloneProject || null;
    const data = editorContext?.data || projectContext?.data || standaloneProject?.data;
    const componentOrder = editorContext?.componentOrder || projectContext?.componentOrder || standaloneProject?.componentOrder || [];
    const sectionVisibility = editorContext?.sectionVisibility || projectContext?.sectionVisibility || standaloneProject?.sectionVisibility || {};
    const view = editorContext?.view || 'preview';
    const projectIdForApi = activeProject?.id || standaloneProject?.id || '';
    const ownerIdForApi = activeProject?.userId || standaloneProject?.userId;
    const widgetApiProjectId = ownerIdForApi && projectIdForApi ? `${ownerIdForApi}_${projectIdForApi}` : projectIdForApi;

    // Data source: standaloneConfig (public pages) or editorContext (editor)
    const rawConfig = standaloneConfig || editorContext?.aiAssistantConfig || projectContext?.activeProject?.aiAssistantConfig || data?.chatbot || { isActive: false } as AiAssistantConfig;

    const aiAssistantConfig: AiAssistantConfig = {
        ...rawConfig,
        enableLiveVoice: rawConfig.enableLiveVoice !== false
    };

    const addLead = editorContext?.addLead;
    const updateLead = editorContext?.updateLead;

    // Deep merge appearance with defaults to ensure all sub-objects exist
    const defaultAppearance = getDefaultAppearanceConfig();
    const storedAppearance = aiAssistantConfig.appearance;
    const baseAppearance = storedAppearance ? {
        ...defaultAppearance,
        ...storedAppearance,
        branding: { ...defaultAppearance.branding, ...storedAppearance.branding },
        colors: { ...defaultAppearance.colors, ...storedAppearance.colors },
        behavior: { ...defaultAppearance.behavior, ...storedAppearance.behavior },
        messages: { ...defaultAppearance.messages, ...storedAppearance.messages },
        button: { ...defaultAppearance.button, ...storedAppearance.button },
    } : defaultAppearance;

    // Check if the user has explicitly configured colors via AI Dashboard
    // (the appearance object exists on the aiAssistantConfig, meaning the user
    // went through onboarding or customized via ChatCustomizationSettings)
    const hasAiDashboardAppearance = !!aiAssistantConfig.appearance?.colors;

    // Get project theme colors as fallback (only used when AI Dashboard hasn't been configured)
    const projectTheme = standaloneProject?.theme || projectContext?.theme;
    const globalColors = projectTheme?.globalColors || {};
    const heroColors = data?.hero?.colors || {};
    const heroButtonColor = heroColors.buttonBackground || heroColors.primary;
    const themeColors = projectTheme?.colors || {};
    const themePrimaryColor = themeColors.primary || themeColors.brand;

    // Legacy chatbot colors from web editor (lowest priority fallback)
    const legacyChatbotColors = (data?.chatbot?.colors || {}) as Record<string, string | undefined>;

    // Default
    const defaultPrimaryColor = '#4F46E5';

    // Fallback primary color from theme/hero (used only when AI Dashboard has no colors)
    const themeFallbackPrimary = globalColors.primary || heroButtonColor || themePrimaryColor || defaultPrimaryColor;

    // Build the final appearance:
    // Priority: AI Dashboard colors (explicitly stored) → theme fallbacks → legacy → defaults
    const finalPrimaryColor = storedAppearance?.colors?.primaryColor || themeFallbackPrimary;
    
    const appearance = {
        ...baseAppearance,
        colors: {
            ...baseAppearance.colors,
            primaryColor: finalPrimaryColor,
            secondaryColor: storedAppearance?.colors?.secondaryColor || legacyChatbotColors.secondaryColor || globalColors.secondary || defaultPrimaryColor,
            accentColor: storedAppearance?.colors?.accentColor || legacyChatbotColors.accentColor || globalColors.accent || heroColors.primary || defaultPrimaryColor,
            userBubbleColor: storedAppearance?.colors?.userBubbleColor || legacyChatbotColors.userBubbleColor || finalPrimaryColor,
            userTextColor: storedAppearance?.colors?.userTextColor || legacyChatbotColors.userTextColor || '#ffffff',
            botBubbleColor: storedAppearance?.colors?.botBubbleColor || legacyChatbotColors.botBubbleColor || globalColors.surface || '#f3f4f6',
            botTextColor: storedAppearance?.colors?.botTextColor || legacyChatbotColors.botTextColor || globalColors.text || '#1f2937',
            backgroundColor: storedAppearance?.colors?.backgroundColor || legacyChatbotColors.backgroundColor || globalColors.background || heroColors.background || '#ffffff',
            inputBackground: storedAppearance?.colors?.inputBackground || legacyChatbotColors.inputBackground || globalColors.surface || '#ffffff',
            inputBorder: storedAppearance?.colors?.inputBorder || legacyChatbotColors.inputBorder || globalColors.border || '#e5e7eb',
            inputText: storedAppearance?.colors?.inputText || legacyChatbotColors.inputText || globalColors.text || '#1f2937',
            headerBackground: storedAppearance?.colors?.headerBackground || legacyChatbotColors.headerBackground || finalPrimaryColor,
            headerText: storedAppearance?.colors?.headerText || legacyChatbotColors.headerText || '#ffffff',
        }
    };

    // Debug log - always log in standalone mode for debugging
    if (standaloneProject || standaloneConfig) {
        console.log('[ChatbotWidget] Color resolution:', {
            hasAiDashboardAppearance,
            aiDashboardPrimary: baseAppearance.colors?.primaryColor,
            globalColorsPrimary: globalColors.primary,
            heroButtonColor,
            themePrimaryColor,
            themeFallbackPrimary,
            finalPrimaryColor: appearance.colors?.primaryColor,
            dataKeys: data ? Object.keys(data) : 'no data',
        });
    }

    // Widget State
    const [isOpen, setIsOpen] = useState(false);
    const [exitIntentShown, setExitIntentShown] = useState(false);
    const [leadCaptured, setLeadCaptured] = useState(false);
    const messagesRef = useRef<any[]>([]);
    const [currentSection, setCurrentSection] = useState<string>('hero');
    const [appointments, setAppointments] = useState<AppointmentSlot[]>([]);
    const [cmsArticles, setCmsArticles] = useState<{ id: string; title: string; content: string }[]>([]);
    const [activePropertyContext, setActivePropertyContext] = useState<any>(null);

    // Listen for global open chat event
    useEffect(() => {
        const handleOpenChat = (e: Event) => {
            const customEvent = e as CustomEvent<{ propertyContext?: any }>;
            if (customEvent.detail?.propertyContext) {
                setActivePropertyContext(customEvent.detail.propertyContext);
            }
            setIsOpen(true);
        };
        window.addEventListener('open-quimera-chat', handleOpenChat);
        return () => window.removeEventListener('open-quimera-chat', handleOpenChat);
    }, []);

    // Detect if we're in the editor (editor view showing the preview)
    // We use both the context view and the URL route to be robust
    const { isEditorRoute } = useRouter();
    const isInEditor = view === 'editor' || isEditorRoute;

    // We no longer return null here so that programmatic triggers (like open-quimera-chat) 
    // can always work. The floating button visibility is controlled below.

    // Load CMS articles for chatbot knowledge (from Supabase posts table)
    useEffect(() => {
        const loadCmsArticles = async () => {
            const articleIds = aiAssistantConfig.cmsArticleIds;
            if (!articleIds || articleIds.length === 0 || !activeProject?.id) {
                setCmsArticles([]);
                return;
            }
            try {
                const limitedArticleIds = articleIds.slice(0, 20);
                const uuidArticleIds = limitedArticleIds.filter(id => UUID_RE.test(id));
                const legacyArticleIds = limitedArticleIds.filter(id => !UUID_RE.test(id));

                const postRows: any[] = [];

                if (uuidArticleIds.length > 0) {
                    const { data: postsData, error } = await supabase
                        .from('posts')
                        .select('id, title, content, excerpt')
                        .in('id', uuidArticleIds);

                    if (error) {
                        console.warn('[ChatbotWidget] Failed to load CMS articles from Supabase:', error);
                    } else if (postsData) {
                        postRows.push(...postsData);
                    }
                }

                if (legacyArticleIds.length > 0) {
                    const legacyResults = await Promise.all(
                        legacyArticleIds.map(legacyId =>
                            supabase
                                .from('posts')
                                .select('id, title, content, excerpt')
                                .contains('tags', [`legacy:${legacyId}`])
                                .eq('status', 'published')
                                .limit(1)
                        )
                    );

                    for (const result of legacyResults) {
                        if (result.error) {
                            console.warn('[ChatbotWidget] Failed to resolve legacy CMS article:', result.error);
                        } else if (result.data) {
                            postRows.push(...result.data);
                        }
                    }
                }

                const uniquePosts = Array.from(new Map(postRows.map((p: any) => [p.id, p])).values());
                const articles = uniquePosts.map((p: any) => ({
                    id: p.id,
                    title: p.title || 'Untitled',
                    content: p.content || p.excerpt || ''
                }));

                setCmsArticles(articles);
                if (articles.length > 0) {
                    console.log(`[ChatbotWidget] ✅ Loaded ${articles.length} CMS articles for chatbot knowledge`);
                }
            } catch (error) {
                console.warn('[ChatbotWidget] Failed to load CMS articles:', error);
            }
        };
        loadCmsArticles();
    }, [aiAssistantConfig.cmsArticleIds, activeProject?.id]);

    // Load appointments when chat opens
    useEffect(() => {
        const loadAppointments = async () => {
            if (!activeProject?.id || !isOpen) return;

            try {
                if (!user) {
                    if (!widgetApiProjectId) return;
                    const response = await fetch(`${WIDGET_API_BASE_URL}/${encodeURIComponent(widgetApiProjectId)}/appointments`);
                    if (!response.ok) {
                        console.warn('[ChatbotWidget] Public appointment availability unavailable:', response.status);
                        return;
                    }

                    const payload = await response.json();
                    const now = new Date();
                    const appointmentSlots: AppointmentSlot[] = (payload.appointments || [])
                        .map((item: any) => {
                            const startDate = parseAppointmentDate(item.startDate);
                            const endDate = parseAppointmentDate(item.endDate, new Date(startDate.getTime() + 60 * 60000));

                            return {
                                id: item.id,
                                title: item.title || 'Reservado',
                                startDate,
                                endDate,
                                status: item.status || 'scheduled',
                            };
                        })
                        .filter((item: AppointmentSlot) =>
                            item.startDate >= now &&
                            !Number.isNaN(item.startDate.getTime()) &&
                            !Number.isNaN(item.endDate.getTime()) &&
                            item.status !== 'cancelled'
                        );

                    setAppointments(appointmentSlots);
                    console.log('[ChatbotWidget] 📅 Loaded public appointment availability:', appointmentSlots.length);
                    return;
                }

                const now = new Date();
                const rangeEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
                const appointmentSlots: AppointmentSlot[] = (await getAppointmentsByProject(supabase, activeProject.id, {
                    startDate: now,
                    endDate: rangeEnd,
                })).map((item) => ({
                    id: item.id,
                    title: item.title || 'Reservado',
                    startDate: parseAppointmentDate(item.startDate),
                    endDate: parseAppointmentDate(item.endDate),
                    status: item.status || 'scheduled',
                }));

                setAppointments(appointmentSlots);
                console.log('[ChatbotWidget] 📅 Loaded canonical appointments:', appointmentSlots.length);
            } catch (error) {
                console.error('[ChatbotWidget] Error loading appointments:', error);
            }
        };

        loadAppointments();
    }, [user, activeProject?.id, isOpen, widgetApiProjectId]);

    // Detect current section in viewport
    useEffect(() => {
        const observerOptions = {
            root: null,
            rootMargin: '-20% 0px -20% 0px',
            threshold: 0.1
        };

        const observerCallback = (entries: IntersectionObserverEntry[]) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const sectionId = entry.target.id;
                    if (sectionId) {
                        setCurrentSection(sectionId);
                    }
                }
            });
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);

        // Observe all sections
        const sections = document.querySelectorAll('section[id], div[id]');
        sections.forEach((section) => {
            if (section.id && !section.id.includes('headlessui')) {
                observer.observe(section);
            }
        });

        return () => {
            sections.forEach((section) => observer.unobserve(section));
        };
    }, []);

    // Get lead capture config with defaults
    const leadConfig = aiAssistantConfig.leadCaptureConfig || {
        enabled: aiAssistantConfig.leadCaptureEnabled !== false,
        preChatForm: false,
        triggerAfterMessages: 3,
        requireEmailForAdvancedInfo: true,
        exitIntentEnabled: true,
        exitIntentOffer: t('chatbotWidget.exitIntentOffer'),
        intentKeywords: [],
        progressiveProfilingEnabled: true
    };

    // Handle lead capture
    const handleLeadCapture = async (leadData: Partial<Lead>): Promise<string | undefined> => {
        const fullLeadData = {
            ...leadData,
            source: 'chatbot-widget' as const,
            status: 'new' as const,
            tags: ['chatbot-widget', ...(leadData.tags || [])]
        };

        // If addLead is available (editor context), use it
        if (addLead) {
            const leadId = await addLead(fullLeadData);
            setLeadCaptured(true);
            return leadId;
        }

        // Fallback: Save via API when in standalone mode (public site)
        // This matches EmbedWidget behavior and avoids Supabase permission issues
        const projectId = projectIdForApi;

        if (projectId) {
            try {
                console.log('[ChatbotWidget] 🌐 specific API lead capture (standalone mode)');

                let authHeaders: Record<string, string> = {
                    'Content-Type': 'application/json',
                };
                
                if (user) {
                    try {
                        const token = await getSupabaseAccessToken();
                        if (token) authHeaders['Authorization'] = `Bearer ${token}`;
                    } catch (e) {
                        console.warn('[ChatbotWidget] Failed to get id token for lead API', e);
                    }
                }

                const response = await fetch(`${WIDGET_API_BASE_URL}/${encodeURIComponent(widgetApiProjectId)}/leads`, {
                    method: 'POST',
                    headers: authHeaders,
                    body: JSON.stringify(fullLeadData)
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('[ChatbotWidget] ✅ Lead saved successfully via API:', data.leadId);
                    setLeadCaptured(true);
                    return data.leadId;
                } else {
                    console.error('[ChatbotWidget] ❌ API Error:', await response.text());
                }
            } catch (error) {
                console.error('[ChatbotWidget] ❌ Error saving lead to API:', error);
            }
        } else {
            console.warn('[ChatbotWidget] ⚠️ Cannot save lead: no addLead function and no projectId available');
        }

        return undefined;
    };

    // Handle updating lead transcript at conversation end
    const handleUpdateLeadTranscript = async (leadId: string, transcript: string) => {
        // If updateLead is available (editor context), use it
        if (updateLead) {
            await updateLead(leadId, { conversationTranscript: transcript });
            console.log('[ChatbotWidget] ✅ Transcript updated via context');
            return;
        }

        // Note: The Widget API currently does not support updating leads/transcripts.
        // The initial transcript is captured in handleLeadCapture.
        // Future improvement: Add update endpoint to Widget API.
        console.log('[ChatbotWidget] ℹ️ Transcript update skipped in standalone mode (API does not support updates yet)');
    };

    // Handle creating appointment from chat
    const handleCreateAppointment = async (appointmentData: ChatAppointmentData): Promise<string | undefined> => {
        const projectId = activeProject?.id || standaloneProject?.id;
        const ownerId = activeProject?.userId || standaloneProject?.userId;

        if (!projectId) {
            console.error('[ChatbotWidget] Cannot create appointment: no project ID');
            return undefined;
        }

        // If user is authenticated and matches ownerId (e.g. inside Editor)
        if (user && user.id === ownerId) {
            try {
                const result = await createAppointmentFromChat(supabase, {
                    projectId,
                    tenantId: currentTenantId,
                    title: appointmentData.title,
                    description: appointmentData.description,
                    type: appointmentData.type || 'consultation',
                    startDate: appointmentData.startDate,
                    endDate: appointmentData.endDate,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    organizerId: user.id,
                    organizerName: (user.user_metadata?.full_name || user.user_metadata?.name || user.email || '') as string,
                    organizerEmail: user.email || '',
                    participantName: appointmentData.participantName,
                    participantEmail: appointmentData.participantEmail,
                    participantPhone: appointmentData.participantPhone,
                    linkedLeadId: appointmentData.linkedLeadId,
                    conversationTranscript: appointmentData.conversationTranscript,
                    sourceConversationId: appointmentData.sourceConversationId,
                    idempotencyKey: `chatbot:${projectId}:${appointmentData.participantEmail || appointmentData.participantName || 'guest'}:${appointmentData.startDate.toISOString()}`,
                    createdBy: user.id,
                    createdBySystem: true,
                    generatedByAI: appointmentData.generatedByAI,
                    locale: i18n.language,
                    tags: ['chatbot', 'appointment-scheduled'],
                    metadata: {
                        ...(appointmentData.metadata || {}),
                        ownerId,
                        widgetMode: standaloneProject ? 'standalone' : 'editor',
                        locale: i18n.language,
                        bookingChannel: appointmentData.bookingChannel,
                    },
                });
                if (result.leadId) setLeadCaptured(true);
                console.log('[ChatbotWidget] ✅ Canonical appointment created:', result.appointmentId);
                return result.appointmentId;
            } catch (error) {
                console.error('[ChatbotWidget] ❌ Error creating canonical appointment:', error);
                return undefined;
            }
        }

        // Fallback: Save via API when in standalone mode (public site)
        try {
            console.log('[ChatbotWidget] 🌐 specific API appointment capture (standalone mode)');

            const appointmentPayload = {
                title: appointmentData.title,
                description: appointmentData.description,
                type: appointmentData.type,
                startDate: appointmentData.startDate.toISOString(),
                endDate: appointmentData.endDate.toISOString(),
                participantName: appointmentData.participantName,
                participantEmail: appointmentData.participantEmail,
                participantPhone: appointmentData.participantPhone,
                linkedLeadId: appointmentData.linkedLeadId,
                conversationTranscript: appointmentData.conversationTranscript,
                sourceConversationId: appointmentData.sourceConversationId,
                source: 'chatbot',
                sourceComponent: 'ChatCore',
                sourceModule: 'chatcore',
                locale: i18n.language,
                generatedByAI: appointmentData.generatedByAI,
                bookingChannel: appointmentData.bookingChannel,
                metadata: {
                    ...(appointmentData.metadata || {}),
                    bookingChannel: appointmentData.bookingChannel,
                    widgetMode: standaloneProject ? 'standalone' : 'editor',
                },
                idempotencyKey: `chatbot:${projectId}:${appointmentData.participantEmail || appointmentData.participantName || 'guest'}:${appointmentData.startDate.toISOString()}`
            };

            let authHeaders: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            
            if (user) {
                try {
                    const token = await getSupabaseAccessToken();
                    if (token) authHeaders['Authorization'] = `Bearer ${token}`;
                } catch (e) {
                    console.warn('[ChatbotWidget] Failed to get id token for appointments API', e);
                }
            }

            const response = await fetch(`${WIDGET_API_BASE_URL}/${encodeURIComponent(widgetApiProjectId)}/appointments`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify(appointmentPayload)
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[ChatbotWidget] ✅ Appointment saved successfully via API:', data.appointmentId);
                if (data.leadId || appointmentData.participantName || appointmentData.participantEmail) {
                    setLeadCaptured(true);
                }
                return data.appointmentId;
            } else {
                console.error('[ChatbotWidget] ❌ API Error for appointment:', await response.text());
                return undefined;
            }
        } catch (error) {
            console.error('[ChatbotWidget] ❌ Error saving appointment via API:', error);
            return undefined;
        }
    };

    // Handle close with exit intent
    const handleChatClose = () => {
        // Exit intent: offer one last chance to capture lead
        if (leadConfig.enabled && leadConfig.exitIntentEnabled && !leadCaptured && messagesRef.current.length > 2 && !exitIntentShown) {
            setExitIntentShown(true);
            // The ChatCore will handle showing the lead capture modal
            return;
        }

        setIsOpen(false);
    };

    // Apply custom position
    const getPositionStyle = () => {
        const { position, offsetX, offsetY } = appearance.behavior;
        // On mobile, ensure minimum padding from screen edge
        const effectiveOffsetX = isMobileViewport ? Math.max(offsetX, 20) : offsetX;
        const positionMap: Record<string, any> = {
            'bottom-right': { bottom: `${offsetY}px`, right: `${effectiveOffsetX}px` },
            'bottom-left': { bottom: `${offsetY}px`, left: `${effectiveOffsetX}px` },
            'top-right': { top: `${offsetY}px`, right: `${effectiveOffsetX}px` },
            'top-left': { top: `${offsetY}px`, left: `${effectiveOffsetX}px` }
        };
        return positionMap[position] || positionMap['bottom-right'];
    };

    const sizeClasses = getSizeClasses(appearance.behavior.width);

    // Extract numeric height values for proper max-height constraint (reduced by 30%)
    const heightMap: Record<string, number> = {
        sm: 440,
        md: 530,
        lg: 610,
        xl: 700
    };
    const configuredHeight = heightMap[appearance.behavior.height as keyof typeof heightMap] || 530;
    // Detect mobile viewport for fullscreen chat
    const [isWindowMobile, setIsWindowMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 640 : false);
    const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);

    useEffect(() => {
        const handleResize = () => {
            setIsWindowMobile(window.innerWidth < 640);
            setWindowHeight(window.innerHeight);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Active if browser is mobile OR if editor is simulating mobile view
    const isMobileViewport = isWindowMobile || editorContext?.previewDevice === 'mobile';

    // Cap at 70% of viewport height or configured height, whichever is smaller
    const maxHeightValue = Math.min(configuredHeight, windowHeight * 0.70);

    // Widget content - use absolute positioning in editor to stay within preview
    const widgetContent = (
        <div
            className={`${isInEditor ? 'absolute' : 'fixed'} z-[9999] flex flex-col items-end font-body pointer-events-none ${isMobileViewport && isOpen ? 'inset-0' : ''}`}
            style={isMobileViewport && isOpen ? {} : getPositionStyle()}
        >
            {/* Chat Window */}
            <div
                className={`
                    ${isMobileViewport ? 'w-full h-full rounded-none' : `mb-4 ${sizeClasses.width} rounded-2xl`} shadow-2xl overflow-hidden transition-all duration-300 origin-bottom-right border pointer-events-auto
                    ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-10 pointer-events-none h-0'}
                `}
                style={{
                    ...(isMobileViewport ? { height: '100%' } : {
                        maxHeight: `min(${maxHeightValue}px, calc(100vh - 150px))`,
                        height: `min(${maxHeightValue}px, calc(100vh - 150px))`,
                    }),
                    backgroundColor: appearance.colors?.backgroundColor,
                    borderColor: appearance.colors?.inputBorder,
                    ...(isMobileViewport ? {} : { })
                }}
            >
                {isOpen && activeProject && (
                    <ChatCore
                        config={aiAssistantConfig}
                        project={activeProject as any}
                        appearance={appearance}
                        onLeadCapture={handleLeadCapture}
                        onUpdateLeadTranscript={handleUpdateLeadTranscript}
                        onCreateAppointment={handleCreateAppointment}
                        existingAppointments={appointments}
                        onClose={handleChatClose}
                        className="w-full h-full flex flex-col"
                        showHeader={true}
                        autoOpen={isOpen}
                        currentPageContext={{
                            section: currentSection,
                            pageData: data,
                            visibleSections: (componentOrder as any)?.filter((sec: any) => sectionVisibility?.[sec] !== false) || []
                        }}
                        cmsArticles={cmsArticles}
                        activePropertyContext={activePropertyContext}
                        hidePoweredBy={hasWhiteLabelBranding || propHidePoweredBy}
                    />
                )}
                {isOpen && !activeProject && (
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                        <MessageSquare size={48} className="text-gray-400 mb-4" />
                        <p className="text-gray-600 text-sm">{t('chatbotWidget.noProjectSelected', 'Please select a project to use the chatbot')}</p>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm transition-colors"
                        >
                            {t('common.close', 'Close')}
                        </button>
                    </div>
                )}
            </div>

            {/* Chat Button - hidden on mobile when chat is fullscreen open */}
            {!(isMobileViewport && isOpen) && (aiAssistantConfig.isActive || isPreview) && (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`
                        ${isMobileViewport ? 'w-11 h-11 text-lg' : getButtonSizeClasses(appearance.button.buttonSize)}
                        ${getButtonStyleClasses(appearance.button.buttonStyle)}
                        ${getShadowClasses(appearance.button.shadowSize)}
                        ${appearance.button.pulseEffect && !isOpen ? 'animate-pulse' : ''}
                        hover:scale-110 transition-all duration-300 flex items-center justify-center group relative mb-[55px] pointer-events-auto
                        ${isInEditor ? 'pointer-events-auto cursor-default' : ''} shrink-0
                    `}
                    style={{
                        backgroundColor: appearance.colors?.primaryColor,
                        color: appearance.colors?.headerText
                    }}
                    title={appearance.button.showTooltip ? appearance.button.tooltipText : undefined}
                >
                    {/* Priority: 1) Branding logo image (same as chat header), 2) Branding emoji, 3) Custom button icon, 4) Default */}
                    {appearance.branding?.logoUrl ? (
                        <img
                            src={appearance.branding.logoUrl}
                            alt="Chat"
                            className={`${isMobileViewport ? 'w-5 h-5' : 'w-7 h-7'} object-cover rounded-full transition-transform duration-300 ${isOpen ? 'rotate-180 scale-0' : 'scale-100'}`}
                        />
                    ) : appearance.branding?.logoType === 'emoji' && appearance.branding?.logoEmoji ? (
                        <span className={isOpen ? 'rotate-180 scale-0 transition-transform duration-300' : 'scale-100 transition-transform duration-300'}>
                            {appearance.branding.logoEmoji}
                        </span>
                    ) : appearance.button?.customIconUrl ? (
                        <img
                            src={appearance.button.customIconUrl}
                            alt="Chat"
                            className={`${isMobileViewport ? 'w-5 h-5' : 'w-7 h-7'} object-contain transition-transform duration-300 ${isOpen ? 'rotate-180 scale-0' : 'scale-100'}`}
                        />
                    ) : appearance.button?.buttonIcon === 'custom-emoji' && appearance.button?.customEmoji ? (
                        <span className={isOpen ? 'rotate-180 scale-0 transition-transform duration-300' : 'scale-100 transition-transform duration-300'}>
                            {appearance.button.customEmoji}
                        </span>
                    ) : (
                        <MessageSquare size={isMobileViewport ? 20 : 28} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 scale-0' : 'scale-100'}`} />
                    )}
                    <X size={isMobileViewport ? 20 : 28} className={`absolute transition-transform duration-300 ${isOpen ? 'scale-100' : 'rotate-180 scale-0'}`} />

                    {/* Notification Badge */}
                    {!isOpen && (
                        <div className={`absolute -top-1 -right-1 ${isMobileViewport ? 'w-4 h-4' : 'w-5 h-5'} bg-red-500 rounded-full flex items-center justify-center`}>
                            <span className="text-white text-xs font-bold">1</span>
                        </div>
                    )}
                </button>
            )}
        </div>
    );

    // In editor mode, try to use the preview overlay portal to avoid scrolling
    // Outside editor, use global portal to ensure widget is always on top of the page
    if (isInEditor) {
        const previewOverlay = document.getElementById('browser-preview-overlay');
        if (previewOverlay) {
            return ReactDOM.createPortal(widgetContent, previewOverlay);
        }
        // Fallback if overlay not found (shouldn't happen)
        return widgetContent;
    }

    return typeof document !== 'undefined'
        ? ReactDOM.createPortal(widgetContent, document.body)
        : null;
};

export default ChatbotWidget;
