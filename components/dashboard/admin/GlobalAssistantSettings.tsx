
import React, { useState, useEffect } from 'react';
import { useEditor } from '../../../contexts/EditorContext';
import DashboardSidebar from '../DashboardSidebar';
import { ArrowLeft, MessageSquare, Mic, Radio, Save, CheckCircle, Sliders, Shield, Languages } from 'lucide-react';
import { GlobalAssistantConfig, ScopePermission } from '../../../types';

interface GlobalAssistantSettingsProps {
    onBack: () => void;
}

const voices: { name: GlobalAssistantConfig['voiceName']; description: string; gender: string }[] = [
    { name: 'Zephyr', description: 'Calm, balanced, professional.', gender: 'Female' },
    { name: 'Puck', description: 'Energetic, friendly, youthful.', gender: 'Male' },
    { name: 'Charon', description: 'Deep, authoritative, trustworthy.', gender: 'Male' },
    { name: 'Kore', description: 'Warm, nurturing, soft.', gender: 'Female' },
    { name: 'Fenrir', description: 'Strong, clear, direct.', gender: 'Male' },
];

const ALL_SCOPES = [
    { id: 'dashboard', name: 'Dashboard View', type: 'view' },
    { id: 'websites', name: 'Websites List', type: 'view' },
    { id: 'editor', name: 'Editor View', type: 'view' },
    { id: 'cms', name: 'CMS Dashboard', type: 'view' },
    { id: 'assets', name: 'Asset Library', type: 'view' },
    { id: 'navigation', name: 'Navigation Manager', type: 'view' },
    { id: 'superadmin', name: 'Super Admin Panel', type: 'view' },
    { id: 'hero', name: 'Hero Section', type: 'component' },
    { id: 'features', name: 'Features Section', type: 'component' },
    { id: 'testimonials', name: 'Testimonials', type: 'component' },
    { id: 'pricing', name: 'Pricing', type: 'component' },
    { id: 'faq', name: 'FAQ', type: 'component' },
    { id: 'cta', name: 'Call to Action', type: 'component' },
    { id: 'services', name: 'Services', type: 'component' },
    { id: 'team', name: 'Team', type: 'component' },
    { id: 'video', name: 'Video', type: 'component' },
    { id: 'slideshow', name: 'Slideshow', type: 'component' },
    { id: 'portfolio', name: 'Portfolio', type: 'component' },
    { id: 'leads', name: 'Leads Form', type: 'component' },
    { id: 'newsletter', name: 'Newsletter', type: 'component' },
    { id: 'howItWorks', name: 'How It Works', type: 'component' },
    { id: 'footer', name: 'Footer', type: 'component' },
];

const GlobalAssistantSettings: React.FC<GlobalAssistantSettingsProps> = ({ onBack }) => {
    const { globalAssistantConfig, saveGlobalAssistantConfig } = useEditor();
    const [formData, setFormData] = useState<GlobalAssistantConfig>(globalAssistantConfig);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        // Ensure defaults for new fields if missing from DB
        setFormData({
            ...globalAssistantConfig,
            permissions: globalAssistantConfig.permissions || {},
            temperature: globalAssistantConfig.temperature ?? 0.7,
            maxTokens: globalAssistantConfig.maxTokens ?? 500,
            autoDetectLanguage: globalAssistantConfig.autoDetectLanguage ?? true,
            supportedLanguages: globalAssistantConfig.supportedLanguages || 'English, Spanish, French'
        });
    }, [globalAssistantConfig]);

    const updateForm = (key: keyof GlobalAssistantConfig, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
        setShowSuccess(false);
    };

    const handlePermissionChange = (scopeId: string, type: 'chat' | 'voice', value: boolean) => {
        setFormData(prev => {
            const currentPerms = prev.permissions || {};
            const scopePerm = currentPerms[scopeId] || { chat: true, voice: true };
            
            return {
                ...prev,
                permissions: {
                    ...currentPerms,
                    [scopeId]: { ...scopePerm, [type]: value }
                }
            };
        });
    };

    const toggleAll = (type: 'chat' | 'voice', value: boolean) => {
        setFormData(prev => {
            const newPerms = { ...prev.permissions };
            ALL_SCOPES.forEach(scope => {
                const existing = newPerms[scope.id] || { chat: true, voice: true };
                newPerms[scope.id] = { ...existing, [type]: value };
            });
            return { ...prev, permissions: newPerms };
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        await saveGlobalAssistantConfig(formData);
        setIsSaving(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    return (
        <div className="flex h-screen bg-editor-bg text-editor-text-primary">
            <DashboardSidebar isMobileOpen={false} onClose={() => {}} />
            
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-[65px] bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                    <div className="flex items-center">
                         <button onClick={onBack} className="p-2 text-editor-text-secondary hover:text-editor-text-primary md:hidden mr-2">
                            <ArrowLeft />
                        </button>
                        <div className="flex items-center space-x-2">
                             <MessageSquare className="text-editor-accent" />
                             <h1 className="text-xl font-bold text-editor-text-primary">Global Assistant Settings</h1>
                        </div>
                    </div>
                     <div className="flex items-center space-x-3">
                         {showSuccess && (
                             <span className="text-sm text-green-400 flex items-center animate-fade-in-up">
                                 <CheckCircle size={16} className="mr-1.5" /> Saved
                             </span>
                         )}
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center text-sm font-semibold py-2 px-4 rounded-lg bg-editor-accent text-editor-bg hover:bg-editor-accent-hover transition-colors disabled:opacity-50"
                        >
                            <Save size={16} className="mr-1.5" />
                            {isSaving ? 'Saving...' : 'Save Config'}
                        </button>
                        <button 
                            onClick={onBack}
                            className="hidden sm:flex items-center text-sm font-semibold py-2 px-4 rounded-lg bg-editor-border text-editor-text-secondary hover:bg-editor-accent hover:text-editor-bg transition-colors"
                        >
                            <ArrowLeft size={16} className="mr-1.5" />
                            Back
                        </button>
                     </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
                    <div className="max-w-5xl mx-auto space-y-8">
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Left Column: General & Scope */}
                            <div className="space-y-8">
                                {/* Status Section */}
                                <div className="bg-editor-panel-bg border border-editor-border p-6 rounded-xl">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-bold text-lg mb-1">Assistant Status</h3>
                                            <p className="text-sm text-editor-text-secondary">Enable/disable the global chat widget.</p>
                                        </div>
                                        <button 
                                            onClick={() => updateForm('isEnabled', !formData.isEnabled)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.isEnabled ? 'bg-editor-accent' : 'bg-editor-border'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                </div>

                                {/* Language Settings (NEW) */}
                                <div className="bg-editor-panel-bg border border-editor-border p-6 rounded-xl space-y-6">
                                    <h3 className="font-bold text-lg border-b border-editor-border pb-2 flex items-center">
                                        <Languages className="mr-2 text-editor-accent" size={20}/> Language & Intelligence
                                    </h3>
                                    
                                    <div className="flex items-center justify-between">
                                         <div>
                                             <h4 className="text-sm font-bold text-editor-text-primary">Auto-Detect Language</h4>
                                             <p className="text-xs text-editor-text-secondary">Automatically reply in the user's language.</p>
                                         </div>
                                         <button 
                                            onClick={() => updateForm('autoDetectLanguage', !formData.autoDetectLanguage)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.autoDetectLanguage ? 'bg-green-500' : 'bg-editor-border'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.autoDetectLanguage ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    {!formData.autoDetectLanguage && (
                                        <div>
                                            <label className="block text-sm font-bold text-editor-text-primary mb-2">Primary / Fallback Language</label>
                                            <input 
                                                type="text" 
                                                value={formData.supportedLanguages}
                                                onChange={(e) => updateForm('supportedLanguages', e.target.value)}
                                                className="w-full bg-editor-bg border border-editor-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-editor-accent outline-none"
                                                placeholder="e.g. English"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Voice Settings */}
                                <div className="bg-editor-panel-bg border border-editor-border p-6 rounded-xl space-y-6">
                                     <div className="flex items-center justify-between border-b border-editor-border pb-6">
                                         <div>
                                             <h3 className="font-bold text-lg mb-1 flex items-center"><Mic className="mr-2 text-editor-accent" /> Live Voice</h3>
                                             <p className="text-sm text-editor-text-secondary">Enable real-time voice interactions.</p>
                                         </div>
                                         <button 
                                            onClick={() => updateForm('enableLiveVoice', !formData.enableLiveVoice)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.enableLiveVoice ? 'bg-green-500' : 'bg-editor-border'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.enableLiveVoice ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                     </div>

                                     <div>
                                         <label className="block text-sm font-bold text-editor-text-primary mb-4 flex items-center"><Radio className="mr-2 text-editor-accent"/> Voice Personality</label>
                                         <div className="grid grid-cols-1 gap-3">
                                            {voices.map(v => (
                                                <button
                                                    key={v.name}
                                                    onClick={() => updateForm('voiceName', v.name)}
                                                    className={`p-3 rounded-xl border text-left transition-all hover:shadow-md flex items-center ${formData.voiceName === v.name ? 'border-editor-accent bg-editor-accent/10 ring-1 ring-editor-accent' : 'border-editor-border bg-editor-bg hover:border-editor-accent/50'}`}
                                                >
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 shrink-0 ${formData.voiceName === v.name ? 'bg-editor-accent text-editor-bg' : 'bg-editor-border text-editor-text-secondary'}`}>
                                                        {v.gender === 'Male' ? 'M' : 'F'}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-editor-text-primary text-sm">{v.name}</h4>
                                                        <p className="text-xs text-editor-text-secondary line-clamp-1">{v.description}</p>
                                                    </div>
                                                </button>
                                            ))}
                                         </div>
                                     </div>
                                </div>

                                 {/* Advanced Parameters */}
                                <div className="bg-editor-panel-bg border border-editor-border p-6 rounded-xl space-y-6">
                                    <h3 className="font-bold text-lg border-b border-editor-border pb-2 flex items-center">
                                        <Sliders className="mr-2 text-editor-accent" size={20}/> Model Parameters
                                    </h3>
                                    
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-sm font-bold text-editor-text-primary">Temperature (Creativity)</label>
                                            <span className="text-xs font-mono bg-editor-bg px-2 py-0.5 rounded border border-editor-border">{formData.temperature}</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="0" max="2" step="0.1"
                                            value={formData.temperature}
                                            onChange={(e) => updateForm('temperature', parseFloat(e.target.value))}
                                            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer"
                                        />
                                        <div className="flex justify-between text-xs text-editor-text-secondary mt-1">
                                            <span>Precise</span>
                                            <span>Balanced</span>
                                            <span>Creative</span>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-sm font-bold text-editor-text-primary">Max Output Tokens</label>
                                            <span className="text-xs font-mono bg-editor-bg px-2 py-0.5 rounded border border-editor-border">{formData.maxTokens}</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="100" max="2000" step="100"
                                            value={formData.maxTokens}
                                            onChange={(e) => updateForm('maxTokens', parseInt(e.target.value))}
                                            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Scope & Permissions */}
                            <div className="space-y-8">
                                <div className="bg-editor-panel-bg border border-editor-border p-6 rounded-xl flex flex-col">
                                    <div className="flex items-center justify-between border-b border-editor-border pb-4 mb-4">
                                        <div>
                                            <h3 className="font-bold text-lg flex items-center">
                                                <Shield className="mr-2 text-editor-accent" /> AI Scope Control
                                            </h3>
                                            <p className="text-sm text-editor-text-secondary">Define what the assistant can see and control.</p>
                                        </div>
                                    </div>

                                    <div className="flex justify-end space-x-4 mb-2 text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                                        <div className="flex items-center space-x-2">
                                            <span>Chat</span>
                                            <button onClick={() => toggleAll('chat', true)} className="text-green-400 hover:underline">All</button>
                                            <span>/</span>
                                            <button onClick={() => toggleAll('chat', false)} className="text-red-400 hover:underline">None</button>
                                        </div>
                                        <div className="w-px h-4 bg-editor-border mx-2"></div>
                                        <div className="flex items-center space-x-2">
                                            <span>Voice</span>
                                            <button onClick={() => toggleAll('voice', true)} className="text-green-400 hover:underline">All</button>
                                            <span>/</span>
                                            <button onClick={() => toggleAll('voice', false)} className="text-red-400 hover:underline">None</button>
                                        </div>
                                    </div>

                                    <div className="mt-2">
                                        <table className="w-full">
                                            <thead className="bg-editor-panel-bg z-10">
                                                <tr className="text-left text-xs font-bold text-editor-text-secondary uppercase tracking-wider border-b border-editor-border">
                                                    <th className="pb-3 pl-2">Area / Component</th>
                                                    <th className="pb-3 text-center w-20">Chat</th>
                                                    <th className="pb-3 text-center w-20">Voice</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-editor-border">
                                                {ALL_SCOPES.map((scope) => {
                                                    const perm = formData.permissions?.[scope.id] || { chat: true, voice: true };
                                                    return (
                                                        <tr key={scope.id} className="hover:bg-editor-bg/50 transition-colors">
                                                            <td className="py-3 pl-2">
                                                                <span className={`text-sm font-medium ${scope.type === 'view' ? 'text-editor-accent' : 'text-editor-text-primary'}`}>
                                                                    {scope.name}
                                                                </span>
                                                                <span className="ml-2 text-[10px] text-editor-text-secondary border border-editor-border rounded px-1">
                                                                    {scope.type}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 text-center">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={perm.chat}
                                                                    onChange={(e) => handlePermissionChange(scope.id, 'chat', e.target.checked)}
                                                                    className="w-4 h-4 rounded border-editor-border text-editor-accent focus:ring-editor-accent bg-editor-bg cursor-pointer"
                                                                />
                                                            </td>
                                                            <td className="py-3 text-center">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={perm.voice}
                                                                    onChange={(e) => handlePermissionChange(scope.id, 'voice', e.target.checked)}
                                                                    className="w-4 h-4 rounded border-editor-border text-editor-accent focus:ring-editor-accent bg-editor-bg cursor-pointer"
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Instructions & Personality */}
                        <div className="bg-editor-panel-bg border border-editor-border p-6 rounded-xl space-y-6">
                            <h3 className="font-bold text-lg border-b border-editor-border pb-2">Personality & Logic</h3>
                            
                            <div>
                                <label className="block text-sm font-bold text-editor-text-primary mb-2">Initial Greeting</label>
                                <input 
                                    type="text" 
                                    value={formData.greeting}
                                    onChange={(e) => updateForm('greeting', e.target.value)}
                                    className="w-full bg-editor-bg border border-editor-border rounded-lg p-3 focus:ring-2 focus:ring-editor-accent outline-none text-editor-text-primary"
                                    placeholder="Hi! I'm your Quimera Assistant..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-editor-text-primary mb-2">System Instruction (Prompt)</label>
                                <p className="text-xs text-editor-text-secondary mb-3">Define the AI's behavior, tone, and strict rules. The language detection logic and scope permissions are appended automatically.</p>
                                <textarea 
                                    className="w-full bg-editor-bg border border-editor-border rounded-lg p-4 min-h-[200px] focus:outline-none focus:ring-2 focus:ring-editor-accent resize-y font-mono text-xs text-editor-text-primary leading-relaxed"
                                    value={formData.systemInstruction}
                                    onChange={(e) => updateForm('systemInstruction', e.target.value)}
                                />
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
};

export default GlobalAssistantSettings;
