import React, { useState } from 'react';
import { useEditor } from '../../../contexts/EditorContext';
import { Shield, Save, Sparkles } from 'lucide-react';
import { LeadCaptureConfig } from '../../../types';

const LeadCaptureSettings: React.FC = () => {
    const { aiAssistantConfig, saveAiAssistantConfig } = useEditor();
    
    const defaultConfig: LeadCaptureConfig = {
        enabled: true,
        preChatForm: false,
        triggerAfterMessages: 3,
        requireEmailForAdvancedInfo: true,
        exitIntentEnabled: true,
        exitIntentOffer: '🎁 ¡Espera! Déjame tu email y te envío información exclusiva + 20% de descuento',
        intentKeywords: [],
        progressiveProfilingEnabled: true
    };

    const [config, setConfig] = useState<LeadCaptureConfig>(
        aiAssistantConfig.leadCaptureConfig || defaultConfig
    );
    
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await saveAiAssistantConfig({
                ...aiAssistantConfig,
                leadCaptureEnabled: config.enabled,
                leadCaptureConfig: config
            });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error('Error saving lead capture config:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Sparkles className="text-purple-500" />
                        Lead Capture Settings
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Configure how your chatbot captures leads
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                    {isSaving ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Saving...
                        </>
                    ) : saveSuccess ? (
                        <>
                            <Shield size={18} />
                            Saved!
                        </>
                    ) : (
                        <>
                            <Save size={18} />
                            Save Changes
                        </>
                    )}
                </button>
            </div>

            {/* Main Enable/Disable */}
            <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-foreground text-lg">Enable Lead Capture</h3>
                        <p className="text-muted-foreground text-sm mt-1">
                            Turn on/off the entire lead capture system
                        </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={config.enabled}
                            onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                </div>
            </div>

            {/* Capture Methods */}
            <div className="grid md:grid-cols-2 gap-4">
                {/* Pre-Chat Form */}
                <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-foreground">Pre-Chat Form</h4>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.preChatForm}
                                onChange={(e) => setConfig({ ...config, preChatForm: e.target.checked })}
                                disabled={!config.enabled}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 peer-disabled:opacity-50"></div>
                        </label>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        Show a form before the chat starts to capture contact info upfront
                    </p>
                </div>

                {/* Exit Intent */}
                <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-foreground">Exit Intent</h4>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.exitIntentEnabled}
                                onChange={(e) => setConfig({ ...config, exitIntentEnabled: e.target.checked })}
                                disabled={!config.enabled}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 peer-disabled:opacity-50"></div>
                        </label>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        Show a special offer when user tries to close the chat
                    </p>
                </div>

                {/* Progressive Profiling */}
                <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-foreground">Progressive Profiling</h4>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.progressiveProfilingEnabled}
                                onChange={(e) => setConfig({ ...config, progressiveProfilingEnabled: e.target.checked })}
                                disabled={!config.enabled}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 peer-disabled:opacity-50"></div>
                        </label>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        Gather information gradually across multiple interactions
                    </p>
                </div>

                {/* Require Email for Advanced Info */}
                <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-foreground">Gate Advanced Info</h4>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.requireEmailForAdvancedInfo}
                                onChange={(e) => setConfig({ ...config, requireEmailForAdvancedInfo: e.target.checked })}
                                disabled={!config.enabled}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 peer-disabled:opacity-50"></div>
                        </label>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        Require email before providing pricing or detailed information
                    </p>
                </div>
            </div>

            {/* Trigger Settings */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <h3 className="font-bold text-foreground text-lg">Trigger Settings</h3>
                
                {/* Messages Threshold */}
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Trigger After Messages
                    </label>
                    <p className="text-xs text-muted-foreground mb-3">
                        Ask for email after this many user messages (if not captured yet)
                    </p>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={config.triggerAfterMessages}
                            onChange={(e) => setConfig({ ...config, triggerAfterMessages: parseInt(e.target.value) })}
                            disabled={!config.enabled}
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600 disabled:opacity-50"
                        />
                        <span className="text-2xl font-bold text-purple-600 min-w-[3rem] text-center">
                            {config.triggerAfterMessages}
                        </span>
                    </div>
                </div>

                {/* Exit Intent Offer */}
                {config.exitIntentEnabled && (
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Exit Intent Offer Message
                        </label>
                        <textarea
                            value={config.exitIntentOffer}
                            onChange={(e) => setConfig({ ...config, exitIntentOffer: e.target.value })}
                            disabled={!config.enabled}
                            rows={3}
                            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-foreground disabled:opacity-50"
                            placeholder="🎁 Special offer message..."
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                            This message will be shown when users try to close the chat
                        </p>
                    </div>
                )}
            </div>

            {/* Info Box */}
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-5">
                <h4 className="font-bold text-purple-600 mb-2 flex items-center gap-2">
                    <Sparkles size={18} />
                    How Lead Capture Works
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                        <span className="text-purple-500 mt-0.5">•</span>
                        <span><strong>Pre-Chat Form:</strong> Captures info before chat starts (name, email, phone)</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-purple-500 mt-0.5">•</span>
                        <span><strong>Intent Detection:</strong> Automatically asks for email when detecting purchase keywords</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-purple-500 mt-0.5">•</span>
                        <span><strong>Message Trigger:</strong> Requests email after N messages if not captured</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-purple-500 mt-0.5">•</span>
                        <span><strong>Exit Intent:</strong> Last chance offer when user tries to close</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-purple-500 mt-0.5">•</span>
                        <span><strong>Auto Scoring:</strong> All leads get scored 0-100 automatically</span>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default LeadCaptureSettings;

