import React from 'react';
import { AiAssistantConfig, Project } from '../../../types';
import { useEditor } from '../../../contexts/EditorContext';
import { getDefaultAppearanceConfig } from '../../../utils/chatThemes';
import ChatCore from '../../chat/ChatCore';
import InfoBubble from '../../ui/InfoBubble';
import { INFO_BUBBLE_CONTENT } from '../../../data/infoBubbleContent';

interface ChatSimulatorProps {
    config: AiAssistantConfig;
    project: Project;
}

const ChatSimulator: React.FC<ChatSimulatorProps> = ({ config, project }) => {
    const { addLead } = useEditor();
    
    // Get appearance config with defaults
    const appearance = config.appearance || getDefaultAppearanceConfig();
    
    // Handle lead capture
    const handleLeadCapture = async (leadData: Partial<any>) => {
        await addLead({
            ...leadData,
            source: 'quimera-chat',
            status: 'new',
            tags: ['quimera-chat', ...(leadData.tags || [])]
        });
    };
    
    return (
        <div className="absolute bottom-0 right-0 w-full h-full z-30 flex flex-col justify-end p-4 pointer-events-auto font-sans">
            <ChatCore
                config={config}
                project={project}
                appearance={appearance}
                onLeadCapture={handleLeadCapture}
                className="w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800 transition-all duration-500 h-[500px]"
                showHeader={true}
            />
            
            {/* Info Bubble */}
            <InfoBubble bubbleId="chatSimulator" content={INFO_BUBBLE_CONTENT.chatSimulator} position="bottom-left" />
        </div>
    );
};

export default ChatSimulator;
