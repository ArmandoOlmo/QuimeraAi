import React, { useState, useEffect } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { AiAssistantConfig, Project, ChatAppearanceConfig } from '../../types';
import { getDefaultAppearanceConfig, getSizeClasses, getButtonSizeClasses, getShadowClasses, getButtonStyleClasses } from '../../utils/chatThemes';
import ChatCore from './ChatCore';

interface EmbedWidgetProps {
    projectId: string;
    apiUrl?: string;
}

const EmbedWidget: React.FC<EmbedWidgetProps> = ({ 
    projectId,
    apiUrl = 'https://quimera.ai/api/widget'
}) => {
    const [config, setConfig] = useState<AiAssistantConfig | null>(null);
    const [project, setProject] = useState<Project | null>(null);
    const [appearance, setAppearance] = useState<ChatAppearanceConfig>(getDefaultAppearanceConfig());
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load configuration from API
    useEffect(() => {
        const loadConfig = async () => {
            try {
                const response = await fetch(`${apiUrl}/${projectId}`);
                
                if (!response.ok) {
                    throw new Error('Failed to load widget configuration');
                }
                
                const data = await response.json();
                
                setConfig(data.config);
                setProject(data.project);
                setAppearance(data.config.appearance || getDefaultAppearanceConfig());
                setIsLoading(false);
            } catch (err) {
                console.error('Error loading widget config:', err);
                setError('Failed to load chat widget');
                setIsLoading(false);
            }
        };

        loadConfig();
    }, [projectId, apiUrl]);

    // Handle lead capture for embedded widget
    const handleLeadCapture = async (leadData: any) => {
        try {
            await fetch(`${apiUrl}/${projectId}/leads`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...leadData,
                    source: 'embedded-widget',
                    status: 'new',
                    tags: ['embedded-widget', ...(leadData.tags || [])]
                })
            });
        } catch (err) {
            console.error('Error capturing lead:', err);
        }
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

    // Don't render if loading or error
    if (isLoading) return null;
    if (error || !config || !project) {
        console.error('Widget error:', error);
        return null;
    }

    // Don't render if not active
    if (!config.isActive) return null;

    const sizeClasses = getSizeClasses(appearance.behavior.width);

    return (
        <div className={`fixed z-50 flex flex-col items-end font-sans`} style={getPositionStyle()}>
            {/* Chat Window */}
            <div 
                className={`
                    mb-4 ${sizeClasses.width} rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 origin-bottom-right border
                    ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-10 pointer-events-none h-0'}
                `}
                style={{ 
                    maxHeight: sizeClasses.height,
                    backgroundColor: appearance.colors?.backgroundColor,
                    borderColor: appearance.colors?.inputBorder
                }}
            >
                {isOpen && (
                    <ChatCore
                        config={config}
                        project={project}
                        appearance={appearance}
                        onLeadCapture={handleLeadCapture}
                        onClose={() => setIsOpen(false)}
                        className="w-full h-full flex flex-col"
                        showHeader={true}
                        autoOpen={isOpen}
                        isEmbedded={true}
                    />
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
                `}
                style={{ 
                    backgroundColor: appearance.colors?.primaryColor,
                    color: appearance.colors?.headerText
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
};

export default EmbedWidget;































