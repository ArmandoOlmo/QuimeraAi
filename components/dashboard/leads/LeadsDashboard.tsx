
import React, { useState, useMemo } from 'react';
import { useEditor } from '../../../contexts/EditorContext';
import DashboardSidebar from '../DashboardSidebar';
import { 
    Menu, Plus, Search, Filter, MoreVertical, 
    Mail, Phone, MessageSquare, Bot, LayoutGrid, 
    DollarSign, CheckCircle2, XCircle, Clock,
    ArrowUpRight, Calendar, Trash2, MoveRight,
    Building2, Palette, Sparkles, Loader2, ThumbsUp,
    Smile
} from 'lucide-react';
import { Lead, LeadStatus } from '../../../types';
import Modal from '../../ui/Modal';
import { GoogleGenAI } from '@google/genai';

const LEAD_STAGES: { id: LeadStatus; label: string; color: string }[] = [
    { id: 'new', label: 'New Lead', color: 'bg-blue-500' },
    { id: 'contacted', label: 'Contacted', color: 'bg-yellow-500' },
    { id: 'qualified', label: 'Qualified', color: 'bg-purple-500' },
    { id: 'negotiation', label: 'Negotiation', color: 'bg-orange-500' },
    { id: 'won', label: 'Won', color: 'bg-green-500' },
    { id: 'lost', label: 'Lost', color: 'bg-red-500' },
];

const CARD_COLORS = [
    { id: 'default', bg: 'bg-card', border: 'border-border', indicator: 'bg-slate-500' },
    { id: 'blue', bg: 'bg-blue-500/5', border: 'border-blue-500/30', indicator: 'bg-blue-500' },
    { id: 'green', bg: 'bg-emerald-500/5', border: 'border-emerald-500/30', indicator: 'bg-emerald-500' },
    { id: 'purple', bg: 'bg-purple-500/5', border: 'border-purple-500/30', indicator: 'bg-purple-500' },
    { id: 'orange', bg: 'bg-orange-500/5', border: 'border-orange-500/30', indicator: 'bg-orange-500' },
    { id: 'pink', bg: 'bg-pink-500/5', border: 'border-pink-500/30', indicator: 'bg-pink-500' },
    { id: 'red', bg: 'bg-red-500/5', border: 'border-red-500/30', indicator: 'bg-red-500' },
];

const EMOJI_MARKERS = [
    // Status & Priority
    '🔥', '⭐', '💎', '⚠️', '📞', '❓', '🚫', '✅', '💰', '🤝', '📅', '⚡', 
    '🚩', '🟢', '🟡', '🔴', '✨', '💡', '🚀', '🛒', '🔔', '❤️', '👍', '👎',
    // Office & Work
    '🏆', '🎁', '🎉', '📝', '📁', '📊', '📈', '📉', '📌', '📍', '📎', '🔒',
    '🔓', '🔑', '🔨', '⚙️', '✉️', '📧', '📫', '📦', '🚚', '🎯', '🧩', '🎲',
    // Tech & Media
    '🎮', '🎨', '🎭', '🎤', '🎧', '📸', '📹', '🎥', '📺', '📻', '🔋', '🔌',
    '💻', '📱', '⌚', '⌨️', '🖱️', '🖨️', '💾', '💿', '📀', '🎥', '🎞️', '📞',
    // People & Faces
    '😀', '😎', '🤔', '😐', '😥', '😡', '🥳', '👋', '👏', '🙌', '👀', '🧠',
    '👨‍💼', '👩‍💼', '🧑‍💻', '👷', '👮', '🕵️', '💂', '🥷', '🦸', '🦹', '🧙', '🧚',
    // Nature & Animals
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮',
    '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺',
    // Food & Drink
    '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑',
    '🍍', '🥭', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽',
    '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🥙', '🧆', '🥚', '🍳', '🥘'
];

// --- Lead Card Component ---
interface LeadCardProps {
    lead: Lead;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onClick: (lead: Lead) => void;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, onDragStart, onClick }) => {
    const { updateLead } = useEditor();
    const [showPalette, setShowPalette] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const handleColorUpdate = (e: React.MouseEvent, colorId: string) => {
        e.stopPropagation();
        updateLead(lead.id, { color: colorId });
        setShowPalette(false);
    };

    const handleEmojiUpdate = (e: React.MouseEvent, emoji: string | undefined) => {
        e.stopPropagation();
        updateLead(lead.id, { emojiMarker: emoji });
        setShowEmojiPicker(false);
    };

    const currentTheme = CARD_COLORS.find(c => c.id === lead.color) || CARD_COLORS[0];
    const scoreColor = (lead.aiScore || 0) > 75 ? 'bg-green-500' : (lead.aiScore || 0) > 40 ? 'bg-yellow-500' : 'bg-red-500';

    return (
        <div 
            draggable
            onDragStart={(e) => onDragStart(e, lead.id)}
            onClick={() => onClick(lead)}
            className={`${currentTheme.bg} ${currentTheme.border} group relative p-4 rounded-xl border hover:shadow-lg transition-all cursor-grab active:cursor-grabbing mb-3`}
        >
            {/* Color Picker Popover */}
            {showPalette && (
                <div 
                    className="absolute top-2 right-8 z-20 bg-popover border border-border rounded-lg shadow-xl p-2 flex gap-1.5 animate-fade-in-up"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    {CARD_COLORS.map(c => (
                        <button
                            key={c.id}
                            onClick={(e) => handleColorUpdate(e, c.id)}
                            className={`w-5 h-5 rounded-full ${c.indicator} hover:scale-110 transition-transform ring-1 ring-offset-1 ring-offset-popover ${c.id === lead.color ? 'ring-primary' : 'ring-transparent'}`}
                            title={c.id}
                        />
                    ))}
                </div>
            )}

            {/* Emoji Picker Popover */}
            {showEmojiPicker && (
                <div 
                    className="absolute top-8 right-[-1rem] z-30 bg-popover border border-border rounded-lg shadow-xl p-3 grid grid-cols-6 gap-2 animate-fade-in-up w-72 max-h-60 overflow-y-auto custom-scrollbar"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    {EMOJI_MARKERS.map(e => (
                        <button
                            key={e}
                            onClick={(evt) => handleEmojiUpdate(evt, e)}
                            className="text-xl hover:scale-125 transition-transform p-1 hover:bg-secondary rounded-md flex justify-center items-center"
                            title="Set Marker"
                        >
                            {e}
                        </button>
                    ))}
                     <button
                        onClick={(evt) => handleEmojiUpdate(evt, undefined)}
                        className="text-xs text-muted-foreground hover:text-red-500 col-span-6 border-t border-border pt-2 mt-1 font-medium"
                        title="Clear"
                    >
                        Clear Marker
                    </button>
                </div>
            )}

            {/* Emoji Marker Badge */}
            {lead.emojiMarker && (
                 <div className="absolute -top-3 -right-3 z-20">
                     <button 
                        onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); setShowPalette(false); }}
                        className="h-8 w-8 flex items-center justify-center text-xl bg-card rounded-full shadow-sm border border-border hover:scale-110 transition-transform"
                     >
                         {lead.emojiMarker}
                     </button>
                 </div>
            )}

            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    {lead.source === 'chatbot' ? (
                        <div className="p-1.5 rounded-full bg-purple-500/10 text-purple-500" title="AI Chatbot Lead">
                            <Bot size={14} />
                        </div>
                    ) : (
                        <div className="p-1.5 rounded-full bg-blue-500/10 text-blue-500" title="Web Form Lead">
                            <LayoutGrid size={14} />
                        </div>
                    )}
                    {lead.aiScore !== undefined && (
                         <div className="flex items-center gap-1 bg-secondary px-1.5 py-0.5 rounded text-[10px] font-bold">
                             <div className={`w-1.5 h-1.5 rounded-full ${scoreColor}`}></div>
                             {lead.aiScore}
                         </div>
                    )}
                </div>
                {lead.value && lead.value > 0 && (
                    <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                        ${lead.value.toLocaleString()}
                    </span>
                )}
            </div>

            <h4 className="font-bold text-foreground text-sm mb-0.5">{lead.name}</h4>
            {lead.company && <p className="text-xs text-muted-foreground mb-2">{lead.company}</p>}

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                <span className="text-[10px] text-muted-foreground flex items-center">
                    <Clock size={10} className="mr-1" />
                    {lead.createdAt && lead.createdAt.seconds 
                        ? new Date(lead.createdAt.seconds * 1000).toLocaleDateString() 
                        : 'Just now'}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button 
                        className="p-1.5 hover:bg-background rounded-md text-muted-foreground hover:text-yellow-500 transition-colors" 
                        title="Add Emoji Marker"
                        onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); setShowPalette(false); }}
                    >
                        <Smile size={12} />
                    </button>
                    <button 
                        className="p-1.5 hover:bg-background rounded-md text-muted-foreground hover:text-primary transition-colors" 
                        title="Change Color"
                        onClick={(e) => { e.stopPropagation(); setShowPalette(!showPalette); setShowEmojiPicker(false); }}
                    >
                        <Palette size={12} />
                    </button>
                    <button className="p-1.5 hover:bg-background rounded-md text-muted-foreground hover:text-foreground transition-colors" title="Email">
                        <Mail size={12} />
                    </button>
                </div>
            </div>
        </div>
    );
};


const LeadsDashboard: React.FC = () => {
    const { leads, updateLeadStatus, deleteLead, addLead, updateLead, hasApiKey, promptForKeySelection } = useEditor();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    
    // AI States
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isDrafting, setIsDrafting] = useState(false);
    const [emailDraft, setEmailDraft] = useState('');

    // --- Analytics Calculations ---
    const stats = useMemo(() => {
        const totalValue = leads.reduce((acc, lead) => acc + (lead.value || 0), 0);
        const wonLeads = leads.filter(l => l.status === 'won');
        const conversionRate = leads.length > 0 ? (wonLeads.length / leads.length) * 100 : 0;
        
        return {
            totalValue,
            conversionRate: conversionRate.toFixed(1),
            activeLeads: leads.filter(l => l.status !== 'won' && l.status !== 'lost').length
        };
    }, [leads]);

    // --- Drag & Drop Handlers ---
    const handleDragStart = (e: React.DragEvent, leadId: string) => {
        setDraggedLeadId(leadId);
        e.dataTransfer.setData('text/plain', leadId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary for drop to work
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, stageId: LeadStatus) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('text/plain');
        if (leadId) {
            await updateLeadStatus(leadId, stageId);
        }
        setDraggedLeadId(null);
    };

    // --- Filtered Data ---
    const filteredLeads = useMemo(() => {
        return leads.filter(lead => 
            lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.company?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [leads, searchQuery]);

    // --- Add Lead Form State ---
    const [newLeadForm, setNewLeadForm] = useState<Partial<Lead>>({
        name: '',
        email: '',
        phone: '',
        company: '',
        value: 0,
        source: 'manual',
        status: 'new'
    });

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLeadForm.name || !newLeadForm.email) return;
        
        await addLead({
            name: newLeadForm.name,
            email: newLeadForm.email,
            phone: newLeadForm.phone,
            company: newLeadForm.company,
            value: Number(newLeadForm.value),
            source: 'manual',
            status: 'new',
            notes: '',
        } as any);
        
        setIsAddModalOpen(false);
        setNewLeadForm({ name: '', email: '', phone: '', company: '', value: 0 });
    };

    const handleDelete = async () => {
        if(selectedLead && window.confirm('Are you sure you want to delete this lead?')) {
            await deleteLead(selectedLead.id);
            setSelectedLead(null);
        }
    }
    
    // --- AI Logic ---
    const handleAnalyzeLead = async () => {
        if (!selectedLead || !process.env.API_KEY) return;
        if (hasApiKey === false) { await promptForKeySelection(); return; }
        
        setIsAnalyzing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `
                Analyze this sales lead based on professional criteria.
                Lead Name: ${selectedLead.name}
                Company: ${selectedLead.company || 'Unknown'}
                Value: $${selectedLead.value}
                Notes: ${selectedLead.notes}
                
                Output JSON format:
                {
                    "score": number (0-100),
                    "analysis": "1 sentence summary of potential",
                    "action": "Recommended next step (Email, Call, Meeting, or Discard)"
                }
            `;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });
            
            const data = JSON.parse(response.text);
            
            await updateLead(selectedLead.id, {
                aiScore: data.score,
                aiAnalysis: data.analysis,
                recommendedAction: data.action
            });
            
            // Update local state to reflect immediately
            setSelectedLead(prev => prev ? ({ ...prev, aiScore: data.score, aiAnalysis: data.analysis, recommendedAction: data.action }) : null);
            
        } catch (e) {
            console.error("Analysis failed", e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDraftEmail = async () => {
        if (!selectedLead || !process.env.API_KEY) return;
        if (hasApiKey === false) { await promptForKeySelection(); return; }

        setIsDrafting(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `
                Write a short, professional intro email to this lead.
                Name: ${selectedLead.name}
                Company: ${selectedLead.company}
                Context: ${selectedLead.notes}
                My Goal: Move them to the next stage of the pipeline.
            `;
             const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            setEmailDraft(response.text);
        } catch (e) {
            console.error("Drafting failed", e);
        } finally {
            setIsDrafting(false);
        }
    };


    return (
        <div className="flex h-screen bg-background text-foreground">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
            
            <div className="flex-1 flex flex-col overflow-hidden relative bg-background">
                {/* Header */}
                <header className="h-[72px] px-6 border-b border-border flex items-center justify-between bg-background z-20 shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors">
                            <Menu />
                        </button>
                        <div className="flex items-center gap-2">
                            <LayoutGrid className="text-primary" size={24} />
                            <h1 className="text-xl font-bold text-foreground">Leads CRM</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                         {/* Stats Row (Hidden on small mobile) */}
                        <div className="hidden md:flex items-center gap-6 mr-6 border-r border-border pr-6">
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Pipeline Value</p>
                                <p className="text-lg font-bold text-foreground">${stats.totalValue.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Conversion Rate</p>
                                <div className="flex items-center text-green-500">
                                    <p className="text-lg font-bold mr-1">{stats.conversionRate}%</p>
                                    <ArrowUpRight size={14} />
                                </div>
                            </div>
                             <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Active Leads</p>
                                <p className="text-lg font-bold text-foreground">{stats.activeLeads}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative hidden sm:block">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Search pipeline..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-secondary/20 border-transparent focus:bg-card focus:border-primary/50 rounded-lg py-2 pl-9 pr-4 text-sm outline-none w-64 transition-all placeholder:text-muted-foreground/70"
                                />
                            </div>
                            <button 
                                onClick={() => setIsAddModalOpen(true)}
                                className="bg-primary text-primary-foreground font-bold py-2 px-4 rounded-lg shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center text-sm whitespace-nowrap"
                            >
                                <Plus size={16} className="mr-2" /> Add Lead
                            </button>
                        </div>
                    </div>
                </header>

                {/* Kanban Board Area */}
                <main className="flex-1 overflow-x-auto overflow-y-hidden p-6">
                    <div className="flex h-full gap-6 min-w-max">
                        {LEAD_STAGES.map(stage => {
                            const stageLeads = filteredLeads.filter(l => l.status === stage.id);
                            return (
                                <div 
                                    key={stage.id}
                                    className="w-[320px] flex flex-col h-full rounded-2xl bg-secondary/20 border border-border/50"
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, stage.id)}
                                >
                                    {/* Column Header */}
                                    <div className="p-4 flex items-center justify-between shrink-0">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                                            <h3 className="font-bold text-sm text-foreground">{stage.label}</h3>
                                            <span className="bg-background px-2 py-0.5 rounded-full text-xs text-muted-foreground border border-border font-mono">
                                                {stageLeads.length}
                                            </span>
                                        </div>
                                        <button className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-background transition-colors">
                                            <MoreVertical size={14} />
                                        </button>
                                    </div>

                                    {/* Cards Container */}
                                    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 custom-scrollbar">
                                        {stageLeads.map(lead => (
                                            <LeadCard 
                                                key={lead.id} 
                                                lead={lead} 
                                                onDragStart={handleDragStart}
                                                onClick={() => { setEmailDraft(''); setSelectedLead(lead); }}
                                            />
                                        ))}
                                        {stageLeads.length === 0 && (
                                            <div className="h-24 border-2 border-dashed border-border/50 rounded-xl flex items-center justify-center text-muted-foreground/50 text-xs font-medium italic">
                                                Drop items here
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </main>

                {/* Lead Detail Modal */}
                <Modal 
                    isOpen={!!selectedLead} 
                    onClose={() => setSelectedLead(null)}
                    maxWidth="max-w-3xl"
                    className="bg-card"
                >
                    {selectedLead && (
                        <>
                            <div className="p-6 border-b border-border bg-secondary/10 flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-2xl font-bold text-foreground">{selectedLead.name}</h2>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white uppercase tracking-wide ${LEAD_STAGES.find(s => s.id === selectedLead.status)?.color}`}>
                                            {LEAD_STAGES.find(s => s.id === selectedLead.status)?.label}
                                        </span>
                                        {selectedLead.emojiMarker && <span className="text-2xl">{selectedLead.emojiMarker}</span>}
                                    </div>
                                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                                        {selectedLead.company && <span className="flex items-center"><Building2 size={14} className="mr-1"/> {selectedLead.company}</span>}
                                        <span className="w-1 h-1 bg-muted-foreground rounded-full"/>
                                        <span>Added {selectedLead.createdAt && selectedLead.createdAt.seconds ? new Date(selectedLead.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}</span>
                                    </p>
                                </div>
                                <button onClick={() => setSelectedLead(null)} className="p-2 hover:bg-border rounded-full text-muted-foreground transition-colors">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <div className="p-6 space-y-8 overflow-y-auto max-h-[70vh]">
                                {/* AI INSIGHTS SECTION */}
                                <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-5">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-sm font-bold text-purple-500 flex items-center uppercase tracking-wider">
                                            <Sparkles size={14} className="mr-2"/> AI CRM Intelligence
                                        </h3>
                                        <button 
                                            onClick={handleAnalyzeLead}
                                            disabled={isAnalyzing}
                                            className="text-xs font-bold bg-purple-500 text-white px-3 py-1.5 rounded-lg hover:bg-purple-600 transition-colors flex items-center disabled:opacity-50"
                                        >
                                            {isAnalyzing ? <Loader2 size={12} className="animate-spin mr-1"/> : <Sparkles size={12} className="mr-1"/>}
                                            Analyze Lead
                                        </button>
                                    </div>
                                    
                                    {selectedLead.aiScore !== undefined ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1">
                                                    <div className="flex justify-between text-xs mb-1 font-bold text-foreground">
                                                        <span>Win Probability</span>
                                                        <span>{selectedLead.aiScore}%</span>
                                                    </div>
                                                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full transition-all duration-1000 ${selectedLead.aiScore > 75 ? 'bg-green-500' : selectedLead.aiScore > 40 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                                            style={{ width: `${selectedLead.aiScore}%` }} 
                                                        />
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-[10px] text-muted-foreground uppercase font-bold">Suggested Action</span>
                                                    <span className="text-sm font-bold text-foreground">{selectedLead.recommendedAction || "Review"}</span>
                                                </div>
                                            </div>
                                            <p className="text-sm text-muted-foreground bg-card p-3 rounded-lg border border-border">
                                                <span className="font-bold text-purple-500 mr-2">Insight:</span>
                                                {selectedLead.aiAnalysis}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">Run analysis to get score and insights.</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Contact Info</label>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Mail size={16} className="text-primary" />
                                                <a href={`mailto:${selectedLead.email}`} className="text-foreground hover:underline">{selectedLead.email}</a>
                                            </div>
                                            {selectedLead.phone && (
                                                <div className="flex items-center gap-2">
                                                    <Phone size={16} className="text-primary" />
                                                    <a href={`tel:${selectedLead.phone}`} className="text-foreground hover:underline">{selectedLead.phone}</a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Deal Value</label>
                                            <p className="text-xl font-bold text-green-500">${(selectedLead.value || 0).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Source</label>
                                            <p className="text-sm text-foreground capitalize flex items-center gap-2">
                                                {selectedLead.source === 'chatbot' ? <Bot size={16}/> : <LayoutGrid size={16}/>}
                                                {selectedLead.source}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Notes</label>
                                    <div className="bg-secondary/20 p-4 rounded-xl border border-border min-h-[100px] text-sm text-foreground leading-relaxed">
                                        {selectedLead.notes || "No notes added yet."}
                                    </div>
                                </div>

                                {/* Email Draft Section */}
                                <div className="border-t border-border pt-6">
                                     <div className="flex justify-between items-center mb-3">
                                         <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Quick Email Draft</label>
                                         <button 
                                            onClick={handleDraftEmail}
                                            disabled={isDrafting}
                                            className="text-xs text-primary hover:underline font-bold flex items-center disabled:opacity-50"
                                        >
                                            {isDrafting ? <Loader2 size={12} className="animate-spin mr-1"/> : <Sparkles size={12} className="mr-1"/>}
                                            Draft with AI
                                        </button>
                                     </div>
                                     {emailDraft ? (
                                         <div className="bg-card border border-border rounded-lg p-3 relative group">
                                             <textarea 
                                                className="w-full bg-transparent text-sm text-foreground outline-none resize-y min-h-[150px]" 
                                                value={emailDraft} 
                                                onChange={(e) => setEmailDraft(e.target.value)}
                                             />
                                              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded font-bold shadow-sm" onClick={() => {navigator.clipboard.writeText(emailDraft); alert("Copied!")}}>Copy</button>
                                              </div>
                                         </div>
                                     ) : (
                                         <div className="text-xs text-muted-foreground italic bg-secondary/10 p-3 rounded border border-dashed border-border/50">
                                             Click "Draft with AI" to generate a personalized outreach email.
                                         </div>
                                     )}
                                </div>
                                
                                {/* Quick Actions */}
                                <div className="pt-6 border-t border-border flex justify-between items-center">
                                    <div className="flex gap-2">
                                        <button onClick={() => window.location.href=`mailto:${selectedLead.email}`} className="flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-colors shadow-md">
                                            <Mail size={16} className="mr-2" /> Send Email
                                        </button>
                                        <button className="flex items-center px-4 py-2 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-sm font-bold transition-colors">
                                            <Calendar size={16} className="mr-2" /> Schedule Meeting
                                        </button>
                                    </div>
                                    <button 
                                        onClick={handleDelete}
                                        className="flex items-center px-4 py-2 rounded-lg text-red-500 hover:bg-red-500/10 text-sm font-bold transition-colors"
                                    >
                                        <Trash2 size={16} className="mr-2" /> Delete Lead
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </Modal>

                {/* Add Lead Modal */}
                <Modal 
                    isOpen={isAddModalOpen} 
                    onClose={() => setIsAddModalOpen(false)}
                    maxWidth="max-w-md"
                    className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
                >
                     <div className="p-5 border-b border-border bg-secondary/10 flex justify-between items-center">
                        <h3 className="font-bold text-lg text-foreground">Add New Lead</h3>
                        <button onClick={() => setIsAddModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors"><XCircle size={24} /></button>
                     </div>
                     <form onSubmit={handleAddSubmit} className="p-6 space-y-5">
                         <div>
                             <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Full Name</label>
                             <input 
                                required 
                                value={newLeadForm.name} 
                                onChange={e => setNewLeadForm({...newLeadForm, name: e.target.value})}
                                className="w-full bg-secondary/20 border border-border/50 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                                placeholder="e.g. John Doe"
                             />
                         </div>
                         <div>
                             <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Email</label>
                             <input 
                                required 
                                type="email"
                                value={newLeadForm.email} 
                                onChange={e => setNewLeadForm({...newLeadForm, email: e.target.value})}
                                className="w-full bg-secondary/20 border border-border/50 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                                placeholder="e.g. john@example.com"
                             />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                 <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Company</label>
                                 <input 
                                    value={newLeadForm.company} 
                                    onChange={e => setNewLeadForm({...newLeadForm, company: e.target.value})}
                                    className="w-full bg-secondary/20 border border-border/50 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                                    placeholder="Optional"
                                 />
                            </div>
                            <div>
                                 <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Value ($)</label>
                                 <input 
                                    type="number"
                                    value={newLeadForm.value} 
                                    onChange={e => setNewLeadForm({...newLeadForm, value: Number(e.target.value)})}
                                    className="w-full bg-secondary/20 border border-border/50 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                                    placeholder="0"
                                 />
                            </div>
                         </div>
                         <div className="pt-4">
                             <button type="submit" className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/25 active:scale-[0.98]">
                                 Create Lead
                             </button>
                         </div>
                     </form>
                </Modal>
            </div>
        </div>
    );
};

export default LeadsDashboard;
