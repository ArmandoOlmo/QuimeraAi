
import React, { useState, useEffect } from 'react';
import { useEditor } from '../../../contexts/EditorContext';
import DashboardSidebar from '../DashboardSidebar';
import { 
    Menu, Bot, MessageSquare, Settings, Sliders, FileText, 
    Save, Sparkles, User, Building2, Globe, Book, Activity, LayoutGrid, ChevronRight, Clock,
    Mic, Radio, BookOpen
} from 'lucide-react';
import ChatSimulator from './ChatSimulator';
import InfoBubble from '../../ui/InfoBubble';
import { INFO_BUBBLE_CONTENT } from '../../../data/infoBubbleContent';
import { AiAssistantConfig } from '../../../types';
import FAQManager from './FAQManager';
import KnowledgeDocumentUploader from './KnowledgeDocumentUploader';
import LeadCaptureSettings from './LeadCaptureSettings';
import ChatCustomizationSettings from './ChatCustomizationSettings';

type Tab = 'overview' | 'knowledge' | 'personality' | 'voice' | 'leadCapture' | 'customization' | 'settings';

const voices: { name: AiAssistantConfig['voiceName']; description: string; gender: string }[] = [
    { name: 'Zephyr', description: 'Calm, balanced, professional.', gender: 'Female' },
    { name: 'Puck', description: 'Energetic, friendly, youthful.', gender: 'Male' },
    { name: 'Charon', description: 'Deep, authoritative, trustworthy.', gender: 'Male' },
    { name: 'Kore', description: 'Warm, nurturing, soft.', gender: 'Female' },
    { name: 'Fenrir', description: 'Strong, clear, direct.', gender: 'Male' },
];

const AiAssistantDashboard: React.FC = () => {
    const { activeProject, aiAssistantConfig, saveAiAssistantConfig, projects, loadProject } = useEditor();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [formData, setFormData] = useState<AiAssistantConfig>(aiAssistantConfig);
    const [isSaving, setIsSaving] = useState(false);

    // Sync form data if config updates
    useEffect(() => {
        if (aiAssistantConfig) {
            setFormData(aiAssistantConfig);
        }
    }, [aiAssistantConfig]);

    const handleSave = async () => {
        setIsSaving(true);
        await saveAiAssistantConfig(formData);
        setIsSaving(false);
    };

    const updateForm = (key: keyof AiAssistantConfig, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSelectProject = (projectId: string) => {
        loadProject(projectId, false, false);
    };

    const userProjects = projects.filter(p => p.status !== 'Template');

    if (!activeProject) {
        return (
            <div className="flex h-screen bg-background text-foreground">
                <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <header className="h-14 px-6 border-b border-border flex items-center justify-between bg-background z-20 shrink-0">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-border/40 rounded-full transition-colors">
                                <Menu className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-2">
                                <Bot className="text-primary w-5 h-5" />
                                <h1 className="text-lg font-semibold text-foreground">Quimera Chat</h1>
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto p-8 bg-secondary/10">
                        <div className="max-w-5xl mx-auto">
                            <div className="text-center mb-12">
                                <h2 className="text-3xl font-bold mb-4">Select a Project</h2>
                                <p className="text-muted-foreground max-w-lg mx-auto text-lg">
                                    Choose a website project to configure its AI Assistant.
                                </p>
                            </div>

                            {userProjects.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {userProjects.map(project => (
                                        <button 
                                            key={project.id}
                                            onClick={() => handleSelectProject(project.id)}
                                            className="group relative bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/50 hover:shadow-xl transition-all duration-300 flex flex-col text-left h-64"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 z-10 pointer-events-none" />
                                            <img 
                                                src={project.thumbnailUrl || 'https://placehold.co/600x400/1e293b/ffffff?text=Project'} 
                                                alt={project.name} 
                                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                            />
                                            <div className="absolute bottom-0 left-0 w-full p-6 z-20">
                                                <h3 className="font-bold text-2xl text-white mb-1">{project.name}</h3>
                                                <div className="flex items-center text-white/70 text-xs">
                                                    <Clock size={12} className="mr-1.5" />
                                                    <span>Updated {new Date(project.lastUpdated).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
                                    <LayoutGrid className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
                                    <h3 className="text-lg font-bold mb-2">No Projects Found</h3>
                                    <p className="text-sm text-muted-foreground mb-6">Create a new website project to start using Quimera Chat.</p>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
                            <h3 className="font-bold text-lg mb-4">Performance Overview</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 bg-secondary/20 rounded-lg text-center">
                                    <span className="block text-2xl font-bold text-primary">142</span>
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Chats</span>
                                </div>
                                <div className="p-4 bg-secondary/20 rounded-lg text-center">
                                    <span className="block text-2xl font-bold text-green-500">28</span>
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Leads</span>
                                </div>
                                <div className="p-4 bg-secondary/20 rounded-lg text-center">
                                    <span className="block text-2xl font-bold text-blue-500">1.2s</span>
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Latency</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-card border border-border rounded-xl p-6">
                            <h3 className="font-bold text-lg mb-4">Configuration Status</h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg border border-border/50">
                                    <div className="flex items-center"><span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span> <span className="text-sm font-medium">Business Profile</span></div>
                                    <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded">Active</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg border border-border/50">
                                    <div className="flex items-center"><span className={`w-2 h-2 rounded-full mr-3 ${formData.enableLiveVoice ? 'bg-green-500' : 'bg-red-500'}`}></span> <span className="text-sm font-medium">Live Voice</span></div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${formData.enableLiveVoice ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}>
                                        {formData.enableLiveVoice ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'knowledge':
                return (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-foreground uppercase tracking-wider">Business Profile</label>
                            <textarea 
                                className="w-full bg-card border border-border rounded-xl p-4 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y text-sm leading-relaxed"
                                placeholder="Describe your business mission, history, and value proposition..."
                                value={formData.businessProfile}
                                onChange={(e) => updateForm('businessProfile', e.target.value)}
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-foreground uppercase tracking-wider">Products & Services</label>
                            <textarea 
                                className="w-full bg-card border border-border rounded-xl p-4 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y text-sm leading-relaxed"
                                placeholder="List your key products, prices, and features..."
                                value={formData.productsServices}
                                onChange={(e) => updateForm('productsServices', e.target.value)}
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-foreground uppercase tracking-wider">Policies & Contact</label>
                            <textarea 
                                className="w-full bg-card border border-border rounded-xl p-4 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y text-sm leading-relaxed"
                                placeholder="Return policy, opening hours, address, phone..."
                                value={formData.policiesContact}
                                onChange={(e) => updateForm('policiesContact', e.target.value)}
                            />
                        </div>

                        {/* FAQs Section */}
                        <div className="pt-6 border-t border-border">
                            <div className="flex items-center gap-2 mb-4">
                                <BookOpen size={20} className="text-primary" />
                                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                                    Frequently Asked Questions
                                </h3>
                            </div>
                            <FAQManager 
                                faqs={formData.faqs} 
                                onFAQsChange={(faqs) => updateForm('faqs', faqs)} 
                            />
                        </div>

                        {/* Knowledge Documents Section */}
                        <div className="pt-6 border-t border-border">
                            <div className="flex items-center gap-2 mb-4">
                                <FileText size={20} className="text-primary" />
                                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                                    Knowledge Documents
                                </h3>
                            </div>
                            <KnowledgeDocumentUploader
                                documents={formData.knowledgeDocuments || []}
                                onDocumentsChange={(docs) => updateForm('knowledgeDocuments', docs)}
                            />
                        </div>
                    </div>
                );
            
            case 'personality':
                 return (
                    <div className="space-y-8 animate-fade-in-up">
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-foreground mb-2">Assistant Name</label>
                                <input 
                                    type="text" 
                                    value={formData.agentName}
                                    onChange={(e) => updateForm('agentName', e.target.value)}
                                    className="w-full bg-card border border-border rounded-xl p-3 focus:ring-2 focus:ring-primary/50 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-foreground mb-2">Languages</label>
                                <div className="flex items-center bg-card border border-border rounded-xl px-3">
                                    <Globe size={18} className="text-muted-foreground mr-2" />
                                    <input 
                                        type="text" 
                                        value={formData.languages}
                                        onChange={(e) => updateForm('languages', e.target.value)}
                                        className="w-full bg-transparent py-3 focus:outline-none"
                                        placeholder="e.g. English, Spanish (Auto-detection enabled)"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">The AI will automatically detect the user's language and reply in the same language.</p>
                            </div>
                        </div>

                        <div>
                             <label className="block text-sm font-bold text-foreground mb-4">Tone of Voice</label>
                             <div className="grid grid-cols-2 gap-3">
                                 {['Professional', 'Playful', 'Urgent', 'Luxury', 'Friendly', 'Minimalist'].map(tone => (
                                     <button
                                        key={tone}
                                        onClick={() => updateForm('tone', tone)}
                                        className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${formData.tone === tone ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-card border-border hover:border-primary/50'}`}
                                     >
                                         {tone}
                                     </button>
                                 ))}
                             </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-foreground mb-2">System Prompt (Instructions)</label>
                            <textarea 
                                className="w-full bg-card border border-border rounded-xl p-4 min-h-[150px] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y font-mono text-xs"
                                value={formData.specialInstructions}
                                onChange={(e) => updateForm('specialInstructions', e.target.value)}
                            />
                        </div>
                    </div>
                 );
            
            case 'voice':
                return (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="bg-card border border-border p-6 rounded-xl flex items-center justify-between">
                             <div>
                                 <h3 className="font-bold text-lg flex items-center"><Mic className="mr-2 text-primary" /> Enable Live Voice</h3>
                                 <p className="text-sm text-muted-foreground">Allow users to speak with your assistant in real-time.</p>
                             </div>
                             <button 
                                onClick={() => updateForm('enableLiveVoice', !formData.enableLiveVoice)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.enableLiveVoice ? 'bg-primary' : 'bg-secondary'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.enableLiveVoice ? 'translate-x-6' : 'translate-x-1'}`} />
                             </button>
                         </div>

                         <div className="bg-card border border-border p-6 rounded-xl">
                             <label className="block text-sm font-bold text-foreground mb-4 flex items-center"><Radio className="mr-2 text-primary"/> Select Voice Personality</label>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {voices.map(v => (
                                    <button
                                        key={v.name}
                                        onClick={() => updateForm('voiceName', v.name)}
                                        className={`p-4 rounded-xl border text-left transition-all hover:shadow-md flex items-center ${formData.voiceName === v.name ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-secondary/10 hover:border-primary/50'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${formData.voiceName === v.name ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'}`}>
                                            {v.gender === 'Male' ? 'M' : 'F'}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground">{v.name}</h4>
                                            <p className="text-xs text-muted-foreground">{v.description}</p>
                                        </div>
                                    </button>
                                ))}
                             </div>
                         </div>
                    </div>
                );

            case 'leadCapture':
                return (
                    <div className="animate-fade-in-up">
                        <LeadCaptureSettings />
                    </div>
                );

            case 'customization':
                return (
                    <div className="animate-fade-in-up">
                        <ChatCustomizationSettings />
                    </div>
                );

            case 'settings':
                return (
                     <div className="space-y-6 animate-fade-in-up">
                         <div className="bg-card border border-border p-6 rounded-xl flex items-center justify-between">
                             <div>
                                 <h3 className="font-bold text-lg">Activate Assistant</h3>
                                 <p className="text-sm text-muted-foreground">Enable the chat widget on your live site.</p>
                             </div>
                             <button 
                                onClick={() => updateForm('isActive', !formData.isActive)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.isActive ? 'bg-primary' : 'bg-secondary'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                             </button>
                         </div>

                         <div className="bg-card border border-border p-6 rounded-xl">
                             <label className="block text-sm font-bold text-foreground mb-4">Widget Color</label>
                             <div className="flex gap-4">
                                 {['#4f46e5', '#ef4444', '#f59e0b', '#10b981', '#ec4899', '#000000'].map(color => (
                                     <button 
                                        key={color}
                                        onClick={() => updateForm('widgetColor', color)}
                                        className={`w-12 h-12 rounded-full shadow-sm transition-transform hover:scale-110 ${formData.widgetColor === color ? 'ring-4 ring-primary ring-offset-2 ring-offset-card' : ''}`}
                                        style={{ backgroundColor: color }}
                                     />
                                 ))}
                                 <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-border">
                                     <input 
                                        type="color" 
                                        value={formData.widgetColor}
                                        onChange={(e) => updateForm('widgetColor', e.target.value)}
                                        className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer p-0 border-0"
                                     />
                                 </div>
                             </div>
                         </div>
                     </div>
                );

            default: return null;
        }
    };

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
            
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-14 px-8 border-b border-border flex items-center justify-between bg-card z-20 shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden h-9 w-9 flex items-center justify-center -ml-2 text-muted-foreground hover:text-foreground hover:bg-border/40 rounded-full transition-colors">
                            <Menu className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-semibold text-foreground">Quimera Chat</h1>
                            <span className="text-xs text-muted-foreground flex items-center"><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span> {activeProject.name}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <InfoBubble bubbleId="chatSimulator" content={INFO_BUBBLE_CONTENT.chatSimulator} inline defaultExpanded={false} />
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 disabled:text-green-500 disabled:hover:bg-transparent"
                        >
                            {isSaving ? (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>Save</span>
                                </>
                            )}
                        </button>
                    </div>
                </header>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
                    
                    {/* LEFT: Configuration Area (Scrollable) */}
                    <div className="lg:col-span-7 xl:col-span-5 flex flex-col border-r border-border bg-background overflow-hidden relative z-10 shadow-[5px_0_30px_-10px_rgba(0,0,0,0.1)]">
                        {/* Tabs Header */}
                        <div className="px-8 pt-8 pb-4">
                            <div className="flex space-x-1 bg-secondary/30 p-1 rounded-xl overflow-x-auto">
                                {[
                                    { id: 'overview', label: 'Overview' },
                                    { id: 'knowledge', label: 'Knowledge' },
                                    { id: 'personality', label: 'Personality' },
                                    { id: 'voice', label: 'Voice & Live' },
                                    { id: 'leadCapture', label: 'Lead Capture' },
                                    { id: 'customization', label: 'Customization' },
                                    { id: 'settings', label: 'Settings' },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as Tab)}
                                        className={`flex-1 py-2.5 px-3 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto px-8 pb-10 custom-scrollbar">
                            {renderTabContent()}
                        </div>
                    </div>

                    {/* RIGHT: Widget Preview Area (Fixed/Sticky Feel) */}
                    <div className="hidden lg:flex lg:col-span-5 xl:col-span-7 flex-col bg-[#f4f4f5] dark:bg-[#09090b] relative items-center justify-center p-10">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-40 mix-blend-overlay pointer-events-none"></div>
                        
                        <div className="relative z-10 flex flex-col items-center">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-8">Live Simulator</h3>
                            
                            {/* Phone Mockup */}
                            <div className="w-[360px] h-[700px] bg-white dark:bg-black rounded-[40px] border-[12px] border-gray-800 shadow-2xl relative overflow-hidden flex flex-col">
                                {/* Notch */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-gray-800 rounded-b-2xl z-30"></div>
                                
                                {/* Simulated Website Header */}
                                <div className="h-20 bg-white dark:bg-black border-b border-gray-100 dark:border-gray-800 flex items-end justify-center pb-3 z-10 relative">
                                    <span className="font-bold text-sm">{activeProject.name}</span>
                                </div>

                                {/* Simulated Content Skeleton */}
                                <div className="flex-1 p-5 space-y-6 overflow-hidden bg-gray-50 dark:bg-gray-950">
                                    <div className="h-48 bg-gray-200 dark:bg-gray-900 rounded-2xl w-full animate-pulse"></div>
                                    <div className="space-y-3">
                                        <div className="h-4 bg-gray-200 dark:bg-gray-900 rounded w-3/4 animate-pulse delay-75"></div>
                                        <div className="h-4 bg-gray-200 dark:bg-gray-900 rounded w-1/2 animate-pulse delay-100"></div>
                                    </div>
                                    <div className="h-24 bg-gray-200 dark:bg-gray-900 rounded-2xl w-full animate-pulse delay-150"></div>
                                </div>

                                {/* The Real Component Being Tested */}
                                <ChatSimulator config={formData} project={activeProject} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AiAssistantDashboard;
