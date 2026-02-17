import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAI } from '../../../contexts/ai';
import { useProject } from '../../../contexts/project';
import { Shield, Save, Sparkles, Power, FileText, LogOut, Users, Lock, Sliders, MessageSquare, Gift, Clock, Tag } from 'lucide-react';
import { LeadCaptureConfig } from '../../../types';

const LeadCaptureSettings: React.FC = () => {
    const { aiAssistantConfig, saveAiAssistantConfig } = useAI();
    const { activeProject } = useProject();

    const defaultConfig: LeadCaptureConfig = {
        enabled: true,
        conversationalMode: true,
        preChatForm: false,
        triggerAfterMessages: 3,
        requireEmailForAdvancedInfo: true,
        exitIntentEnabled: true,
        exitIntentOffer: '🎁 ¡Espera! Déjame tu email y te envío información exclusiva + 20% de descuento',
        intentKeywords: [],
        progressiveProfilingEnabled: true,
        businessHoursStart: 9,
        businessHoursEnd: 18,
        businessDays: [1, 2, 3, 4, 5, 6]
    };

    const [config, setConfig] = useState<LeadCaptureConfig>(
        aiAssistantConfig.leadCaptureConfig || defaultConfig
    );

    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const handleSave = async () => {
        if (!activeProject?.id) return;
        setIsSaving(true);
        try {
            await saveAiAssistantConfig({
                ...aiAssistantConfig,
                leadCaptureEnabled: config.enabled,
                leadCaptureConfig: config
            }, activeProject.id);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error('Error saving lead capture config:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Sparkles className="text-primary" />
                        Lead Capture Settings
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Configure how your chatbot captures leads
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 sm:px-6 sm:py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm sm:text-base font-semibold transition-colors disabled:opacity-50"
                >
                    {isSaving ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
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
                        <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
                            <Power size={20} className="text-primary" />
                            Enable Lead Capture
                        </h3>
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
                        <div className="w-14 h-7 bg-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                </div>
            </div>

            {/* Capture Methods */}
            <div className="grid md:grid-cols-2 gap-4">
                {/* Pre-Chat Form */}
                <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-foreground flex items-center gap-2">
                            <FileText size={16} className="text-primary" />
                            Pre-Chat Form
                        </h4>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.preChatForm}
                                onChange={(e) => setConfig({ ...config, preChatForm: e.target.checked })}
                                disabled={!config.enabled}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                        </label>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        Show a form before the chat starts to capture contact info upfront
                    </p>
                </div>

                {/* Conversational Mode */}
                <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-foreground flex items-center gap-2">
                            <MessageSquare size={16} className="text-primary" />
                            Conversational Mode
                        </h4>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.conversationalMode}
                                onChange={(e) => setConfig({ ...config, conversationalMode: e.target.checked })}
                                disabled={!config.enabled}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                        </label>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        AI extracts contact info naturally during conversation instead of showing a popup form
                    </p>
                </div>

                {/* Exit Intent */}
                <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-foreground flex items-center gap-2">
                            <LogOut size={16} className="text-primary" />
                            Exit Intent
                        </h4>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.exitIntentEnabled}
                                onChange={(e) => setConfig({ ...config, exitIntentEnabled: e.target.checked })}
                                disabled={!config.enabled}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                        </label>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        Show a special offer when user tries to close the chat
                    </p>
                </div>

                {/* Progressive Profiling */}
                <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-foreground flex items-center gap-2">
                            <Users size={16} className="text-primary" />
                            Progressive Profiling
                        </h4>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.progressiveProfilingEnabled}
                                onChange={(e) => setConfig({ ...config, progressiveProfilingEnabled: e.target.checked })}
                                disabled={!config.enabled}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                        </label>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        Gather information gradually across multiple interactions
                    </p>
                </div>

                {/* Require Email for Advanced Info */}
                <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-foreground flex items-center gap-2">
                            <Lock size={16} className="text-primary" />
                            Gate Advanced Info
                        </h4>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.requireEmailForAdvancedInfo}
                                onChange={(e) => setConfig({ ...config, requireEmailForAdvancedInfo: e.target.checked })}
                                disabled={!config.enabled}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                        </label>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        Require email before providing pricing or detailed information
                    </p>
                </div>
            </div>

            {/* Trigger Settings */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
                    <Sliders size={20} className="text-primary" />
                    Trigger Settings
                </h3>

                {/* Messages Threshold */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                        <MessageSquare size={16} className="text-primary" />
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
                            className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50"
                        />
                        <span className="text-2xl font-bold text-primary min-w-[3rem] text-center">
                            {config.triggerAfterMessages}
                        </span>
                    </div>
                </div>

                {/* Exit Intent Offer */}
                {config.exitIntentEnabled && (
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                            <Gift size={16} className="text-primary" />
                            Exit Intent Offer Message
                        </label>
                        <textarea
                            value={config.exitIntentOffer}
                            onChange={(e) => setConfig({ ...config, exitIntentOffer: e.target.value })}
                            disabled={!config.enabled}
                            rows={3}
                            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground disabled:opacity-50"
                            placeholder="🎁 Special offer message..."
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                            This message will be shown when users try to close the chat
                        </p>
                    </div>
                )}
            </div>

            {/* Intent Keywords */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary/20 rounded-lg">
                        <Tag size={20} className="text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">Intent Keywords</h3>
                        <p className="text-xs text-muted-foreground">Custom keywords that trigger lead capture when detected in conversation</p>
                    </div>
                </div>
                <div>
                    <textarea
                        value={(config.intentKeywords || []).join(', ')}
                        onChange={(e) => setConfig({
                            ...config,
                            intentKeywords: e.target.value
                                .split(',')
                                .map(k => k.trim())
                                .filter(k => k.length > 0)
                        })}
                        disabled={!config.enabled}
                        rows={3}
                        className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground disabled:opacity-50"
                        placeholder="precio, comprar, cotización, buy, pricing, schedule..."
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                        Comma-separated keywords. Leave empty to use built-in defaults (precio, buy, quote, schedule, etc.)
                    </p>
                </div>
            </div>

            {/* Business Hours */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary/20 rounded-lg">
                        <Clock size={20} className="text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">Business Hours</h3>
                        <p className="text-xs text-muted-foreground">Set your business hours for appointment scheduling suggestions</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">Opening Time</label>
                        <select
                            value={config.businessHoursStart ?? 9}
                            onChange={(e) => setConfig({ ...config, businessHoursStart: parseInt(e.target.value) })}
                            disabled={!config.enabled}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground disabled:opacity-50"
                        >
                            {Array.from({ length: 24 }, (_, i) => (
                                <option key={i} value={i}>
                                    {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">Closing Time</label>
                        <select
                            value={config.businessHoursEnd ?? 18}
                            onChange={(e) => setConfig({ ...config, businessHoursEnd: parseInt(e.target.value) })}
                            disabled={!config.enabled}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground disabled:opacity-50"
                        >
                            {Array.from({ length: 24 }, (_, i) => (
                                <option key={i} value={i}>
                                    {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Business Days</label>
                    <div className="flex flex-wrap gap-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
                            const activeDays = config.businessDays ?? [1, 2, 3, 4, 5, 6];
                            const isActive = activeDays.includes(index);
                            return (
                                <button
                                    key={day}
                                    type="button"
                                    disabled={!config.enabled}
                                    onClick={() => {
                                        const updated = isActive
                                            ? activeDays.filter(d => d !== index)
                                            : [...activeDays, index].sort();
                                        setConfig({ ...config, businessDays: updated });
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${isActive
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                                        }`}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Info Box */}
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-5">
                <h4 className="font-bold text-primary mb-2 flex items-center gap-2">
                    <Sparkles size={18} />
                    How Lead Capture Works
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span><strong>Conversational Mode (Recommended):</strong> AI naturally asks for name, email, and phone during the chat — no popups</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span><strong>Pre-Chat Form:</strong> Captures info before chat starts (name, email, phone)</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span><strong>Intent Detection:</strong> Automatically asks for email when detecting purchase keywords</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span><strong>Message Trigger:</strong> Requests email after N messages if not captured (disabled in conversational mode)</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span><strong>Exit Intent:</strong> Last chance offer when user tries to close</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span><strong>Auto Scoring:</strong> All leads get scored 0-100 automatically</span>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default LeadCaptureSettings;

