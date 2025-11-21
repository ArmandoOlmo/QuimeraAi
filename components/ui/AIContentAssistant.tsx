
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { GoogleGenAI } from '@google/genai';
import { Sparkles, X, KeyRound, Wand2, Languages, AlignLeft, Type } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';

const TextArea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
        {...props}
        className="w-full bg-editor-panel-bg text-editor-text-primary p-4 rounded-lg border-2 border-editor-border focus:ring-2 focus:ring-editor-accent focus:outline-none transition-all resize-none text-sm leading-relaxed"
    />
);

const Label = (props: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props} className="block text-xs font-bold uppercase tracking-wider text-editor-text-secondary mb-2" />;

interface AIContentAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (text: string) => void;
  initialText: string;
  contextPrompt: string; // E.g., "the main headline for the hero section"
}

type MagicAction = 'fix' | 'shorten' | 'expand' | 'tone' | 'translate';

const AIContentAssistant: React.FC<AIContentAssistantProps> = ({
  isOpen, onClose, onApply, initialText, contextPrompt,
}) => {
  const { getPrompt, hasApiKey, promptForKeySelection, handleApiError, brandIdentity } = useEditor();
  const [customInstruction, setCustomInstruction] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'compose' | 'actions'>('compose');

  useEffect(() => {
    if (isOpen) {
      setGeneratedText(initialText);
      setCustomInstruction('');
    }
  }, [isOpen, initialText]);

  const executeAiRequest = async (instruction: string) => {
    if (hasApiKey === false) {
        await promptForKeySelection();
        return;
    }

    // Try to find the specific brand-aware prompt first, fallback to generic
    const promptTemplate = getPrompt('cms-brand-rewrite') || getPrompt('content-assist-rewrite');
    
    if (!promptTemplate) {
        setGeneratedText('Error: AI Prompts not configured. Please check Admin settings.');
        return;
    }

    setIsLoading(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      
      // Prepare replacement variables including Brand Identity
      let populatedPrompt = promptTemplate.template
        .replace('{{context}}', contextPrompt)
        .replace('{{instruction}}', instruction)
        .replace('{{currentText}}', generatedText || initialText); // Use current state if refining

      // Inject Brand Identity variables if using the advanced prompt
      if (promptTemplate.name === 'cms-brand-rewrite') {
          populatedPrompt = populatedPrompt
            .replace('{{brandName}}', brandIdentity.name)
            .replace('{{industry}}', brandIdentity.industry)
            .replace('{{targetAudience}}', brandIdentity.targetAudience)
            .replace('{{toneOfVoice}}', brandIdentity.toneOfVoice)
            .replace('{{coreValues}}', brandIdentity.coreValues)
            .replace('{{language}}', brandIdentity.language);
      }

      const response = await ai.models.generateContent({
          model: promptTemplate.model,
          contents: populatedPrompt,
      });

      setGeneratedText(response.text.trim());
    } catch (error) {
      handleApiError(error);
      console.error('Error generating content:', error);
      setGeneratedText('Sorry, there was an error generating the text. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateClick = () => {
      if (!customInstruction) return;
      executeAiRequest(customInstruction);
  };

  const handleMagicAction = (action: MagicAction) => {
      let instruction = "";
      switch (action) {
          case 'fix': instruction = "Fix grammar, spelling, and punctuation errors. Keep the tone consistent."; break;
          case 'shorten': instruction = "Make the text more concise and punchy. Cut unnecessary words."; break;
          case 'expand': instruction = "Expand on this idea with more descriptive and persuasive language."; break;
          case 'tone': instruction = `Rewrite this to perfectly match our brand tone: ${brandIdentity.toneOfVoice}.`; break;
          case 'translate': instruction = `Translate this text to ${brandIdentity.language} if it isn't already, or refine the localization.`; break;
      }
      executeAiRequest(instruction);
  };

  const handleApply = () => {
    onApply(generatedText);
    onClose();
  };

  const ApiKeySelectorUI = () => (
    <div className="text-center p-8 flex flex-col items-center justify-center h-full min-h-[300px]">
        <KeyRound size={48} className="text-editor-accent mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">API Key Required</h3>
        <p className="text-editor-text-secondary mb-6 max-w-md">
            To unlock the AI Brain, please select a Google AI Studio API key.
        </p>
        <button
            onClick={promptForKeySelection}
            className="bg-editor-accent text-editor-bg font-bold py-2 px-5 rounded-lg shadow-md hover:bg-editor-accent-hover transition-colors"
        >
            Select API Key
        </button>
    </div>
);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-editor-bg w-full max-w-2xl flex flex-col h-[85vh] sm:h-auto sm:max-h-[85vh] rounded-xl overflow-hidden shadow-2xl border border-editor-border">
        {/* Header */}
        <div className="p-5 border-b border-editor-border flex justify-between items-center bg-editor-panel-bg">
            <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-editor-accent to-orange-500 p-2 rounded-lg shadow-lg shadow-editor-accent/20">
                    <Sparkles className="text-white w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white leading-none">AI Copilot</h2>
                    <p className="text-xs text-editor-text-secondary mt-1">Powered by Gemini 3 & Your Brand Brain</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-editor-bg text-editor-text-secondary transition-colors"><X size={20} /></button>
        </div>
        
        {hasApiKey === false ? <ApiKeySelectorUI /> : (
            <div className="flex flex-col flex-grow overflow-hidden">
                
                {/* Content Area */}
                <div className="flex-grow p-6 overflow-y-auto space-y-6">
                    
                    {/* Input/Output Section */}
                    <div className="space-y-2">
                         <div className="flex justify-between items-end">
                            <Label>Content</Label>
                            <span className="text-xs text-editor-text-secondary bg-editor-panel-bg px-2 py-1 rounded border border-editor-border">
                                {generatedText.length} chars
                            </span>
                         </div>
                        <div className="relative group">
                            <TextArea 
                                value={generatedText} 
                                onChange={(e) => setGeneratedText(e.target.value)} 
                                rows={6} 
                                placeholder="AI generated content will appear here..."
                                className="font-serif text-lg bg-editor-panel-bg/50 focus:bg-editor-panel-bg transition-colors"
                            />
                            {isLoading && (
                                <div className="absolute inset-0 bg-editor-panel-bg/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg border-2 border-editor-accent/30 z-10">
                                    <div className="w-10 h-10 border-4 border-editor-accent border-t-transparent rounded-full animate-spin mb-3"></div>
                                    <p className="text-editor-accent font-medium animate-pulse">Generating Magic...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tools Section */}
                    <div className="bg-editor-panel-bg p-1 rounded-lg border border-editor-border flex p-1">
                         <button 
                            onClick={() => setActiveTab('compose')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'compose' ? 'bg-editor-bg text-editor-text-primary shadow-sm' : 'text-editor-text-secondary hover:text-editor-text-primary'}`}
                         >
                             Compose
                         </button>
                         <button 
                            onClick={() => setActiveTab('actions')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'actions' ? 'bg-editor-bg text-editor-text-primary shadow-sm' : 'text-editor-text-secondary hover:text-editor-text-primary'}`}
                         >
                             Magic Actions
                         </button>
                    </div>

                    {activeTab === 'compose' ? (
                        <div className="space-y-3 animate-fade-in-up">
                            <Label htmlFor="ai-prompt">Custom Instruction</Label>
                            <div className="flex gap-2">
                                <input
                                    id="ai-prompt"
                                    value={customInstruction}
                                    onChange={(e) => setCustomInstruction(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateClick()}
                                    placeholder="e.g., Make it punchier, focus on speed..."
                                    className="flex-grow bg-editor-bg text-editor-text-primary px-4 py-3 rounded-lg border border-editor-border focus:ring-2 focus:ring-editor-accent focus:outline-none transition-all"
                                />
                                <button
                                    onClick={handleGenerateClick}
                                    disabled={isLoading || !customInstruction}
                                    className="bg-editor-accent text-editor-bg font-bold px-6 rounded-lg shadow-md hover:bg-editor-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    Go
                                </button>
                            </div>
                            <p className="text-xs text-editor-text-secondary">
                                <span className="font-bold text-editor-accent">Tip:</span> The AI automatically considers your brand tone ({brandIdentity.toneOfVoice}) and audience.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 animate-fade-in-up">
                            <button onClick={() => handleMagicAction('fix')} disabled={isLoading} className="p-3 bg-editor-bg border border-editor-border rounded-lg text-left hover:border-editor-accent hover:bg-editor-accent/5 transition-all group">
                                <div className="flex items-center mb-1 text-editor-text-primary group-hover:text-editor-accent"><Wand2 size={16} className="mr-2" /> Fix Grammar</div>
                                <p className="text-xs text-editor-text-secondary">Polish spelling & punctuation.</p>
                            </button>
                            <button onClick={() => handleMagicAction('shorten')} disabled={isLoading} className="p-3 bg-editor-bg border border-editor-border rounded-lg text-left hover:border-editor-accent hover:bg-editor-accent/5 transition-all group">
                                <div className="flex items-center mb-1 text-editor-text-primary group-hover:text-editor-accent"><AlignLeft size={16} className="mr-2" /> Shorten</div>
                                <p className="text-xs text-editor-text-secondary">Make it concise and punchy.</p>
                            </button>
                             <button onClick={() => handleMagicAction('expand')} disabled={isLoading} className="p-3 bg-editor-bg border border-editor-border rounded-lg text-left hover:border-editor-accent hover:bg-editor-accent/5 transition-all group">
                                <div className="flex items-center mb-1 text-editor-text-primary group-hover:text-editor-accent"><Type size={16} className="mr-2" /> Expand</div>
                                <p className="text-xs text-editor-text-secondary">Add more detail and flair.</p>
                            </button>
                             <button onClick={() => handleMagicAction('tone')} disabled={isLoading} className="p-3 bg-editor-bg border border-editor-border rounded-lg text-left hover:border-editor-accent hover:bg-editor-accent/5 transition-all group">
                                <div className="flex items-center mb-1 text-editor-text-primary group-hover:text-editor-accent"><Sparkles size={16} className="mr-2" /> Brand Tone</div>
                                <p className="text-xs text-editor-text-secondary">Align with {brandIdentity.toneOfVoice} voice.</p>
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-5 border-t border-editor-border bg-editor-panel-bg flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 font-semibold text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                    >
                        Discard
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={isLoading || !generatedText}
                        className="bg-white text-editor-bg font-bold px-6 py-2.5 rounded-lg shadow-lg hover:bg-gray-100 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                    >
                        Use Content
                    </button>
                </div>
            </div>
        )}
      </div>
    </Modal>
  );
};

export default AIContentAssistant;
