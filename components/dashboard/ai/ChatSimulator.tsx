import React from 'react';
import { AiAssistantConfig, Project } from '../../../types';
import { useCRM } from '../../../contexts/crm';
import { getDefaultAppearanceConfig } from '../../../utils/chatThemes';
import ChatCore from '../../chat/ChatCore';

interface ChatSimulatorProps {
    config: AiAssistantConfig;
    project: Project;
}

const ChatSimulator: React.FC<ChatSimulatorProps> = ({ config, project }) => {
    const { addLead } = useCRM();
    
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
            <div 
                className="w-full rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-500 h-[500px]"
                style={{ 
                    backgroundColor: appearance.colors.backgroundColor,
                    borderColor: appearance.colors.inputBorder,
                    borderWidth: '1px',
                    borderStyle: 'solid'
                }}
            >
                <ChatCore
                    config={config}
                    project={project}
                    appearance={appearance}
                    onLeadCapture={handleLeadCapture}
                    className="h-full"
                    showHeader={true}
                />
            </div>
        </div>
    );
};

export default ChatSimulator;
