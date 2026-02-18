import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ReactDOM from 'react-dom';
import { MessageSquare, X } from 'lucide-react';
import { useSafeEditor } from '../contexts/EditorContext';
import { useSafeProject } from '../contexts/project/ProjectContext';
import { Lead, AiAssistantConfig } from '../types';
import { getDefaultAppearanceConfig, getSizeClasses, getButtonSizeClasses, getShadowClasses, getButtonStyleClasses } from '../utils/chatThemes';
import ChatCore, { ChatAppointmentData, AppointmentSlot } from './chat/ChatCore';
import { db, collection, addDoc, getDocs, getDoc, doc, query, where, orderBy } from '../firebase';
import { useSafeAuth } from '../contexts/core/AuthContext';
import { useRouter } from '../hooks/useRouter';

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
}

const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({
    isPreview = false,
    standaloneConfig,
    standaloneProject
}) => {
    // Use safe editor context - may be null in public preview
    const editorContext = useSafeEditor();
    const projectContext = useSafeProject();
    const authContext = useSafeAuth();
    const user = authContext?.user ?? null;
    const { t } = useTranslation();

    // Use standalone config or editor context values
    const rawConfig = standaloneConfig || editorContext?.aiAssistantConfig || { isActive: false } as AiAssistantConfig;

    // Ensure enableLiveVoice defaults to true if not explicitly set to false
    const aiAssistantConfig: AiAssistantConfig = {
        ...rawConfig,
        enableLiveVoice: rawConfig.enableLiveVoice !== false
    };

    const addLead = editorContext?.addLead;
    const updateLead = editorContext?.updateLead;
    // Try to get activeProject from EditorContext first, then ProjectContext, then standalone
    const activeProject = editorContext?.activeProject || projectContext?.activeProject || standaloneProject || null;
    const data = editorContext?.data || projectContext?.data || standaloneProject?.data;
    const componentOrder = editorContext?.componentOrder || projectContext?.componentOrder || standaloneProject?.componentOrder || [];
    const sectionVisibility = editorContext?.sectionVisibility || projectContext?.sectionVisibility || standaloneProject?.sectionVisibility || {};
    const view = editorContext?.view || 'preview';

    // Get appearance config with defaults
    const defaultAppearance = getDefaultAppearanceConfig();
    const baseAppearance = aiAssistantConfig.appearance || defaultAppearance;

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
    // Priority: AI Dashboard colors → theme fallbacks (only for missing values) → legacy → defaults
    const appearance = hasAiDashboardAppearance
        ? {
            // AI Dashboard configured: use those colors as-is, theme fills gaps only
            ...baseAppearance,
            colors: {
                primaryColor: baseAppearance.colors?.primaryColor || themeFallbackPrimary,
                secondaryColor: baseAppearance.colors?.secondaryColor || globalColors.secondary || defaultPrimaryColor,
                accentColor: baseAppearance.colors?.accentColor || globalColors.accent || defaultPrimaryColor,
                userBubbleColor: baseAppearance.colors?.userBubbleColor || baseAppearance.colors?.primaryColor || themeFallbackPrimary,
                userTextColor: baseAppearance.colors?.userTextColor || '#ffffff',
                botBubbleColor: baseAppearance.colors?.botBubbleColor || '#f3f4f6',
                botTextColor: baseAppearance.colors?.botTextColor || '#1f2937',
                backgroundColor: baseAppearance.colors?.backgroundColor || '#ffffff',
                inputBackground: baseAppearance.colors?.inputBackground || '#ffffff',
                inputBorder: baseAppearance.colors?.inputBorder || '#e5e7eb',
                inputText: baseAppearance.colors?.inputText || '#1f2937',
                headerBackground: baseAppearance.colors?.headerBackground || baseAppearance.colors?.primaryColor || themeFallbackPrimary,
                headerText: baseAppearance.colors?.headerText || '#ffffff',
            }
        }
        : {
            // No AI Dashboard config: use theme/hero/legacy as primary sources
            ...baseAppearance,
            colors: {
                ...baseAppearance.colors,
                primaryColor: legacyChatbotColors.primaryColor || themeFallbackPrimary,
                secondaryColor: legacyChatbotColors.secondaryColor || globalColors.secondary || baseAppearance.colors?.secondaryColor,
                accentColor: legacyChatbotColors.accentColor || globalColors.accent || heroColors.primary || baseAppearance.colors?.accentColor,
                userBubbleColor: legacyChatbotColors.userBubbleColor || themeFallbackPrimary,
                userTextColor: legacyChatbotColors.userTextColor || baseAppearance.colors?.userTextColor,
                botBubbleColor: legacyChatbotColors.botBubbleColor || globalColors.surface || baseAppearance.colors?.botBubbleColor,
                botTextColor: legacyChatbotColors.botTextColor || globalColors.text || baseAppearance.colors?.botTextColor,
                backgroundColor: legacyChatbotColors.backgroundColor || globalColors.background || heroColors.background || baseAppearance.colors?.backgroundColor,
                inputBackground: legacyChatbotColors.inputBackground || globalColors.surface || baseAppearance.colors?.inputBackground,
                inputBorder: legacyChatbotColors.inputBorder || globalColors.border || baseAppearance.colors?.inputBorder,
                inputText: legacyChatbotColors.inputText || globalColors.text || baseAppearance.colors?.inputText,
                headerBackground: legacyChatbotColors.headerBackground || themeFallbackPrimary,
                headerText: legacyChatbotColors.headerText || baseAppearance.colors?.headerText,
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

    // Detect if we're in the editor (editor view showing the preview)
    // We use both the context view and the URL route to be robust
    const { isEditorRoute } = useRouter();
    const isInEditor = view === 'editor' || isEditorRoute;

    // Don't render if not active and not in preview
    if (!aiAssistantConfig.isActive && !isPreview) return null;

    // Load CMS articles for chatbot knowledge
    useEffect(() => {
        const loadCmsArticles = async () => {
            const articleIds = aiAssistantConfig.cmsArticleIds;
            if (!articleIds || articleIds.length === 0 || !activeProject?.id) {
                setCmsArticles([]);
                return;
            }
            try {
                const articles: { id: string; title: string; content: string }[] = [];
                // Fetch from publicStores (works for both owner and public visitors)
                for (const articleId of articleIds.slice(0, 20)) { // Cap at 20 articles
                    const postRef = doc(db, 'publicStores', activeProject.id, 'posts', articleId);
                    const postSnap = await getDoc(postRef);
                    if (postSnap.exists()) {
                        const postData = postSnap.data();
                        articles.push({
                            id: articleId,
                            title: postData.title || 'Untitled',
                            content: postData.content || postData.excerpt || ''
                        });
                    }
                }
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
            if (!user || !activeProject?.id || !isOpen) return;

            try {
                const appointmentsRef = collection(db, 'users', user.uid, 'projects', activeProject.id, 'appointments');
                const q = query(appointmentsRef, orderBy('startDate', 'asc'));
                const snapshot = await getDocs(q);

                const appointmentSlots: AppointmentSlot[] = [];
                const now = new Date();

                snapshot.forEach((doc) => {
                    const data = doc.data();
                    const startDate = data.startDate?.seconds
                        ? new Date(data.startDate.seconds * 1000)
                        : new Date();
                    const endDate = data.endDate?.seconds
                        ? new Date(data.endDate.seconds * 1000)
                        : new Date(startDate.getTime() + 60 * 60000);

                    // Only include future appointments
                    if (startDate >= now && data.status !== 'cancelled') {
                        appointmentSlots.push({
                            id: doc.id,
                            title: data.title || 'Cita',
                            startDate,
                            endDate,
                            status: data.status || 'scheduled'
                        });
                    }
                });

                setAppointments(appointmentSlots);
                console.log('[ChatbotWidget] 📅 Loaded appointments:', appointmentSlots.length);
            } catch (error) {
                console.error('[ChatbotWidget] Error loading appointments:', error);
            }
        };

        loadAppointments();
    }, [user, activeProject?.id, isOpen]);

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
        // This matches EmbedWidget behavior and avoids Firestore permission issues
        const projectId = activeProject?.id || standaloneProject?.id;

        if (projectId) {
            try {
                console.log('[ChatbotWidget] 🌐 specific API lead capture (standalone mode)');

                // Always use production API for reliability across domains
                const apiUrl = 'https://quimera.ai/api/widget';

                const response = await fetch(`${apiUrl}/${projectId}/leads`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
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
        if (!user || !activeProject?.id) {
            console.error('[ChatbotWidget] Cannot create appointment: no user or project');
            return undefined;
        }

        try {
            // Convert dates to Firestore timestamps
            const dateToTimestamp = (date: Date) => ({
                seconds: Math.floor(date.getTime() / 1000),
                nanoseconds: 0
            });

            const now = dateToTimestamp(new Date());

            // Build participant if we have contact info
            const participants = [];
            if (appointmentData.participantName || appointmentData.participantEmail) {
                participants.push({
                    id: `participant_${Date.now()}`,
                    name: appointmentData.participantName || 'Cliente',
                    email: appointmentData.participantEmail || '',
                    phone: appointmentData.participantPhone || '',
                    role: 'attendee',
                    status: 'pending',
                    isRequired: true,
                });
            }

            // Create the appointment document
            const appointmentDoc = {
                title: appointmentData.title,
                description: appointmentData.description || '',
                type: appointmentData.type || 'consultation',
                status: 'scheduled',
                priority: 'medium',
                startDate: dateToTimestamp(appointmentData.startDate),
                endDate: dateToTimestamp(appointmentData.endDate),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                organizerId: user.uid,
                organizerName: user.displayName || '',
                organizerEmail: user.email || '',
                participants,
                location: { type: 'virtual' },
                reminders: [
                    { id: `reminder_1_${Date.now()}`, type: 'email', minutes: 60, sent: false },
                    { id: `reminder_2_${Date.now()}`, type: 'email', minutes: 1440, sent: false }
                ],
                attachments: [],
                notes: [],
                followUpActions: [],
                aiPrepEnabled: true,
                linkedLeadIds: appointmentData.linkedLeadId ? [appointmentData.linkedLeadId] : [],
                tags: ['chatbot', 'auto-scheduled'],
                createdAt: now,
                createdBy: user.uid,
                projectId: activeProject.id,
            };

            // Save to Firestore: users/{userId}/projects/{projectId}/appointments
            const appointmentsRef = collection(db, 'users', user.uid, 'projects', activeProject.id, 'appointments');
            const docRef = await addDoc(appointmentsRef, appointmentDoc);

            console.log('[ChatbotWidget] ✅ Appointment created:', docRef.id);

            // Also create a lead if we have contact info and no lead was captured yet
            if (addLead && (appointmentData.participantEmail || appointmentData.participantName)) {
                const leadId = await addLead({
                    name: appointmentData.participantName || 'Cliente desde Chat',
                    email: appointmentData.participantEmail,
                    phone: appointmentData.participantPhone,
                    source: 'chatbot-widget',
                    status: 'new',
                    message: `Cita agendada: ${appointmentData.title}`,
                    tags: ['chatbot-widget', 'appointment-scheduled'],
                    notes: `Cita programada para ${appointmentData.startDate.toLocaleDateString()} a las ${appointmentData.startDate.toLocaleTimeString()}`
                });
                setLeadCaptured(true);
                console.log('[ChatbotWidget] ✅ Lead created from appointment:', leadId);
            }

            return docRef.id;
        } catch (error) {
            console.error('[ChatbotWidget] ❌ Error creating appointment:', error);
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
        const positionMap: Record<string, any> = {
            'bottom-right': { bottom: `${offsetY}px`, right: `${offsetX}px` },
            'bottom-left': { bottom: `${offsetY}px`, left: `${offsetX}px` },
            'top-right': { top: `${offsetY}px`, right: `${offsetX}px` },
            'top-left': { top: `${offsetY}px`, left: `${offsetX}px` }
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
    // Cap at 70% of viewport height or configured height, whichever is smaller
    const maxHeightValue = Math.min(configuredHeight, typeof window !== 'undefined' ? window.innerHeight * 0.70 : configuredHeight);

    // Widget content - use absolute positioning in editor to stay within preview
    const widgetContent = (
        <div
            className={`${isInEditor ? 'absolute' : 'fixed'} z-[9999] flex flex-col items-end font-body`}
            style={getPositionStyle()}
        >
            {/* Chat Window */}
            <div
                className={`
                    mb-4 ${sizeClasses.width} rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 origin-bottom-right border pointer-events-auto
                    ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-10 pointer-events-none h-0'}
                `}
                style={{
                    maxHeight: `min(${maxHeightValue}px, calc(100vh - 150px))`,
                    height: `min(${maxHeightValue}px, calc(100vh - 150px))`,
                    backgroundColor: appearance.colors?.backgroundColor,
                    borderColor: appearance.colors?.inputBorder,
                    outline: '3px solid white',
                    outlineOffset: '0px'
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

            {/* Chat Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    ${getButtonSizeClasses(appearance.button.buttonSize)}
                    ${getButtonStyleClasses(appearance.button.buttonStyle)}
                    ${getShadowClasses(appearance.button.shadowSize)}
                    ${appearance.button.pulseEffect && !isOpen ? 'animate-pulse' : ''}
                    hover:scale-110 transition-all duration-300 flex items-center justify-center group relative mb-[55px]
                    ${isInEditor ? 'pointer-events-auto cursor-default' : ''}
                `}
                style={{
                    backgroundColor: appearance.colors?.primaryColor,
                    color: appearance.colors?.headerText,
                    outline: '3px solid white',
                    outlineOffset: '0px'
                }}
                title={appearance.button.showTooltip ? appearance.button.tooltipText : undefined}
            >
                {appearance.button.buttonIcon === 'custom-emoji' && appearance.button.customEmoji ? (
                    <span className={isOpen ? 'rotate-180 scale-0 transition-transform duration-300' : 'scale-100 transition-transform duration-300'}>
                        {appearance.button.customEmoji}
                    </span>
                ) : (
                    <MessageSquare size={28} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 scale-0' : 'scale-100'}`} />
                )}
                <X size={28} className={`absolute transition-transform duration-300 ${isOpen ? 'scale-100' : 'rotate-180 scale-0'}`} />

                {/* Notification Badge */}
                {!isOpen && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">1</span>
                    </div>
                )}
            </button>
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
