import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ReactDOM from 'react-dom';
import { MessageSquare, X } from 'lucide-react';
import { useSafeEditor } from '../contexts/EditorContext';
import { useSafeProject } from '../contexts/project/ProjectContext';
import { Lead, AiAssistantConfig } from '../types';
import { getDefaultAppearanceConfig, getSizeClasses, getButtonSizeClasses, getShadowClasses, getButtonStyleClasses } from '../utils/chatThemes';
import ChatCore from './chat/ChatCore';

interface ChatbotWidgetProps {
    isPreview?: boolean;
    // Props for standalone mode (outside EditorProvider)
    standaloneConfig?: AiAssistantConfig;
}

const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({
    isPreview = false,
    standaloneConfig
}) => {
    // Use safe editor context - may be null in public preview
    const editorContext = useSafeEditor();
    const projectContext = useSafeProject();
    const { t } = useTranslation();

    // Use standalone config or editor context values
    const aiAssistantConfig = standaloneConfig || editorContext?.aiAssistantConfig || { isActive: false } as AiAssistantConfig;
    const addLead = editorContext?.addLead;
    // Try to get activeProject from EditorContext first, then ProjectContext
    const activeProject = editorContext?.activeProject || projectContext?.activeProject || null;
    const data = editorContext?.data || projectContext?.data;
    const componentOrder = editorContext?.componentOrder || projectContext?.componentOrder || [];
    const sectionVisibility = editorContext?.sectionVisibility || projectContext?.sectionVisibility || {};
    const view = editorContext?.view || 'preview';

    // Get appearance config with defaults
    const baseAppearance = aiAssistantConfig.appearance || getDefaultAppearanceConfig();
    
    // Merge colors from Web Editor (data.chatbot.colors) with appearance colors
    // Web Editor colors take priority over AI Assistant Dashboard colors
    const chatbotColors = (data?.chatbot?.colors || {}) as Partial<{
        primaryColor: string;
        secondaryColor: string;
        accentColor: string;
        userBubbleColor: string;
        userTextColor: string;
        botBubbleColor: string;
        botTextColor: string;
        backgroundColor: string;
        inputBackground: string;
        inputBorder: string;
        inputText: string;
        headerBackground: string;
        headerText: string;
    }>;
    const appearance = {
        ...baseAppearance,
        colors: {
            ...baseAppearance.colors,
            // Override with Web Editor colors if available
            primaryColor: chatbotColors.primaryColor || baseAppearance.colors.primaryColor,
            secondaryColor: chatbotColors.secondaryColor || baseAppearance.colors.secondaryColor,
            accentColor: chatbotColors.accentColor || baseAppearance.colors.accentColor,
            userBubbleColor: chatbotColors.userBubbleColor || baseAppearance.colors.userBubbleColor,
            userTextColor: chatbotColors.userTextColor || baseAppearance.colors.userTextColor,
            botBubbleColor: chatbotColors.botBubbleColor || baseAppearance.colors.botBubbleColor,
            botTextColor: chatbotColors.botTextColor || baseAppearance.colors.botTextColor,
            backgroundColor: chatbotColors.backgroundColor || baseAppearance.colors.backgroundColor,
            inputBackground: chatbotColors.inputBackground || baseAppearance.colors.inputBackground,
            inputBorder: chatbotColors.inputBorder || baseAppearance.colors.inputBorder,
            inputText: chatbotColors.inputText || baseAppearance.colors.inputText,
            headerBackground: chatbotColors.headerBackground || baseAppearance.colors.headerBackground,
            headerText: chatbotColors.headerText || baseAppearance.colors.headerText,
        }
    };

    // Widget State
    const [isOpen, setIsOpen] = useState(false);
    const [exitIntentShown, setExitIntentShown] = useState(false);
    const [leadCaptured, setLeadCaptured] = useState(false);
    const messagesRef = useRef<any[]>([]);
    const [currentSection, setCurrentSection] = useState<string>('hero');

    // Detect if we're in the editor (editor view showing the preview)
    // In editor mode, we disable pointer events to allow clicking through to other components
    const isInEditor = view === 'editor';

    // Don't render if not active and not in preview
    if (!aiAssistantConfig.isActive && !isPreview) return null;

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
    const handleLeadCapture = async (leadData: Partial<Lead>) => {
        await addLead({
            ...leadData,
            source: 'chatbot-widget',
            status: 'new',
            tags: ['chatbot-widget', ...(leadData.tags || [])]
        });
        setLeadCaptured(true);
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

    // Widget content
    const widgetContent = (
        <div
            className={`fixed z-[9999] flex flex-col items-end font-body ${isInEditor ? 'pointer-events-none' : ''}`}
            style={getPositionStyle()}
        >
            {/* Chat Window */}
            <div
                className={`
                    mb-4 ${sizeClasses.width} rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 origin-bottom-right border pointer-events-auto
                    ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-10 pointer-events-none h-0'}
                `}
                style={{
                    maxHeight: sizeClasses.height,
                    height: sizeClasses.height,
                    backgroundColor: appearance.colors.backgroundColor,
                    borderColor: appearance.colors.inputBorder
                }}
            >
                {isOpen && activeProject && (
                    <ChatCore
                        config={aiAssistantConfig}
                        project={activeProject}
                        appearance={appearance}
                        onLeadCapture={handleLeadCapture}
                        onClose={handleChatClose}
                        className="w-full h-full flex flex-col"
                        showHeader={true}
                        autoOpen={isOpen}
                        currentPageContext={{
                            section: currentSection,
                            pageData: data,
                            visibleSections: componentOrder?.filter(sec => sectionVisibility?.[sec] !== false) || []
                        }}
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
                    hover:scale-110 transition-all duration-300 flex items-center justify-center group relative
                    ${isInEditor ? 'pointer-events-auto cursor-default' : ''}
                `}
                style={{
                    backgroundColor: appearance.colors.primaryColor,
                    color: appearance.colors.headerText
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

    // Render the widget using a portal to ensure it's always on top
    return typeof document !== 'undefined'
        ? ReactDOM.createPortal(widgetContent, document.body)
        : null;
};

export default ChatbotWidget;
