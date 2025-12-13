
import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useCRM } from '../../../contexts/crm';
import { useAI } from '../../../contexts/ai';
import { useProject } from '../../../contexts/project';
import DashboardSidebar from '../DashboardSidebar';
import { getSourceConfig, getLeadScoreLabel } from '../../../utils/leadScoring';
import {
    Menu, Plus, Search, Filter, MoreVertical,
    Mail, Phone, MessageSquare, Bot, LayoutGrid,
    DollarSign, CheckCircle2, XCircle, Clock,
    ArrowUpRight, Calendar, Trash2, MoveRight,
    Building2, Palette, Sparkles, Loader2, ThumbsUp,
    Smile, Table, List, Columns, Download, Edit, MapPin,
    Globe, Briefcase, Linkedin, BookOpen, X
} from 'lucide-react';
import { Lead, LeadStatus } from '../../../types';
import Modal from '../../ui/Modal';
import { generateContentViaProxy, extractTextFromResponse } from '../../../utils/geminiProxyClient';
import LeadsTimeline from './LeadsTimeline';
import LeadTasksList from './LeadTasksList';
import LeadsFilters, { LeadsFiltersState } from './LeadsFilters';
import LeadsTableView from './LeadsTableView';
import LeadsListView from './LeadsListView';
import CustomFieldsManager, { CustomFieldDefinition } from './CustomFieldsManager';
import LeadsLibrary from './LeadsLibrary';
import AddLeadModal from './AddLeadModal';
import { logApiCall } from '../../../services/apiLoggingService';

import { useTranslation } from 'react-i18next';

// Helper to clean JSON from markdown code blocks and fix common issues
const cleanJsonResponse = (text: string): string => {
    if (!text) return '{}';
    
    // Remove markdown code blocks
    let cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '');
    // Trim whitespace
    cleaned = cleaned.trim();
    
    // Find JSON array or object
    const jsonMatch = cleaned.match(/[\[{][\s\S]*[\]}]/);
    if (jsonMatch) {
        cleaned = jsonMatch[0];
    }
    
    // Fix common JSON issues from LLM
    // Remove trailing commas before } or ]
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
    // Fix bad escape sequences - replace \n, \t etc with spaces
    cleaned = cleaned.replace(/\\([^"\\\/bfnrtu])/g, '$1');
    // Remove literal newlines inside strings (replace with space)
    cleaned = cleaned.replace(/"([^"]*)\n([^"]*)"/g, '"$1 $2"');
    // Remove any control characters except tab, newline, carriage return
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');
    
    return cleaned;
};

// Moved inside component or memoized hook
const getLeadStages = (t: any) => [
    { id: 'new', label: t('leads.stages.new'), color: 'bg-blue-500' },
    { id: 'contacted', label: t('leads.stages.contacted'), color: 'bg-yellow-500' },
    { id: 'qualified', label: t('leads.stages.qualified'), color: 'bg-purple-500' },
    { id: 'negotiation', label: t('leads.stages.negotiation'), color: 'bg-orange-500' },
    { id: 'won', label: t('leads.stages.won'), color: 'bg-green-500' },
    { id: 'lost', label: t('leads.stages.lost'), color: 'bg-red-500' },
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
    const { t } = useTranslation();
    const { updateLead } = useCRM();
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
            className={`${currentTheme.bg} ${currentTheme.border} group relative p-3 sm:p-4 rounded-lg sm:rounded-xl border hover:shadow-lg transition-all cursor-grab active:cursor-grabbing mb-2 sm:mb-3`}
        >
            {/* Color Picker Popover */}
            {showPalette && (
                <div
                    className="absolute top-2 right-8 z-20 bg-popover border border-border rounded-lg shadow-xl p-1.5 sm:p-2 flex gap-1 sm:gap-1.5 animate-fade-in-up"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    {CARD_COLORS.map(c => (
                        <button
                            key={c.id}
                            onClick={(e) => handleColorUpdate(e, c.id)}
                            className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full ${c.indicator} hover:scale-110 transition-transform ring-1 ring-offset-1 ring-offset-popover ${c.id === lead.color ? 'ring-primary' : 'ring-transparent'}`}
                            title={c.id}
                        />
                    ))}
                </div>
            )}

            {/* Emoji Picker Popover - Mobile optimized */}
            {showEmojiPicker && (
                <div
                    className="absolute top-8 right-0 sm:right-[-1rem] z-30 bg-popover border border-border rounded-lg shadow-xl p-2 sm:p-3 grid grid-cols-6 gap-1.5 sm:gap-2 animate-fade-in-up w-56 sm:w-72 max-h-48 sm:max-h-60 overflow-y-auto custom-scrollbar"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    {EMOJI_MARKERS.slice(0, 24).map(e => (
                        <button
                            key={e}
                            onClick={(evt) => handleEmojiUpdate(evt, e)}
                            className="text-base sm:text-xl hover:scale-125 transition-transform p-0.5 sm:p-1 hover:bg-secondary rounded-md flex justify-center items-center"
                            title="Set Marker"
                        >
                            {e}
                        </button>
                    ))}
                    <button
                        onClick={(evt) => handleEmojiUpdate(evt, undefined)}
                        className="text-[10px] sm:text-xs text-muted-foreground hover:text-red-500 col-span-6 border-t border-border pt-1.5 sm:pt-2 mt-1 font-medium"
                        title="Clear"
                    >
                        {t('leads.dashboard.clearMarker')}
                    </button>
                </div>
            )}

            {/* Emoji Marker Badge */}
            {lead.emojiMarker && (
                <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 z-20">
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); setShowPalette(false); }}
                        className="h-6 w-6 sm:h-8 sm:w-8 flex items-center justify-center text-base sm:text-xl bg-card rounded-full shadow-sm border border-border hover:scale-110 transition-transform"
                    >
                        {lead.emojiMarker}
                    </button>
                </div>
            )}

            <div className="flex justify-between items-start mb-1.5 sm:mb-2 flex-wrap gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    {/* Source Badge */}
                    {(() => {
                        const sourceConfig = getSourceConfig(lead.source);
                        return (
                            <span
                                className={`${sourceConfig.color} text-white text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-semibold flex items-center gap-0.5 sm:gap-1`}
                                title={sourceConfig.label}
                            >
                                <span>{sourceConfig.icon}</span>
                                <span className="hidden sm:inline">{sourceConfig.label}</span>
                            </span>
                        );
                    })()}

                    {/* Lead Score Badge */}
                    {(lead.leadScore !== undefined || lead.aiScore !== undefined) && (() => {
                        const score = lead.leadScore || lead.aiScore || 0;
                        const scoreInfo = getLeadScoreLabel(score);
                        return (
                            <div
                                className={`${scoreInfo.color} text-white text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5 sm:gap-1`}
                                title={`${scoreInfo.label}: ${score}/100`}
                            >
                                <span>{scoreInfo.emoji}</span>
                                <span>{score}</span>
                            </div>
                        );
                    })()}
                </div>
                {lead.value && lead.value > 0 && (
                    <span className="text-[10px] sm:text-xs font-bold text-green-500 bg-green-500/10 px-1.5 sm:px-2 py-0.5 rounded-full">
                        ${lead.value.toLocaleString()}
                    </span>
                )}
            </div>

            <h4 className="font-bold text-foreground text-xs sm:text-sm mb-0.5 line-clamp-1">{lead.name}</h4>
            {lead.company && <p className="text-[10px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-2 line-clamp-1">{lead.company}</p>}

            <div className="flex items-center justify-between mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border/50">
                <span className="text-[8px] sm:text-[10px] text-muted-foreground flex items-center">
                    <Clock size={8} className="sm:hidden mr-0.5" />
                    <Clock size={10} className="hidden sm:block mr-1" />
                    {lead.createdAt && lead.createdAt.seconds
                        ? new Date(lead.createdAt.seconds * 1000).toLocaleDateString()
                        : 'Just now'}
                </span>
                {/* Mobile: Always show actions, Desktop: show on hover */}
                <div className="flex gap-0.5 sm:gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                        className="p-1 sm:p-1.5 hover:bg-background rounded-md text-muted-foreground hover:text-yellow-500 transition-colors"
                        title={t('leads.dashboard.addEmoji')}
                        onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); setShowPalette(false); }}
                    >
                        <Smile size={10} className="sm:hidden" />
                        <Smile size={12} className="hidden sm:block" />
                    </button>
                    <button
                        className="p-1 sm:p-1.5 hover:bg-background rounded-md text-muted-foreground hover:text-primary transition-colors"
                        title={t('leads.dashboard.changeColor')}
                        onClick={(e) => { e.stopPropagation(); setShowPalette(!showPalette); setShowEmojiPicker(false); }}
                    >
                        <Palette size={10} className="sm:hidden" />
                        <Palette size={12} className="hidden sm:block" />
                    </button>
                    <button className="p-1 sm:p-1.5 hover:bg-background rounded-md text-muted-foreground hover:text-foreground transition-colors" title="Email">
                        <Mail size={10} className="sm:hidden" />
                        <Mail size={12} className="hidden sm:block" />
                    </button>
                </div>
            </div>
        </div>
    );
};


const LeadsDashboard: React.FC = () => {
    const { t } = useTranslation();
    const LEAD_STAGES = React.useMemo(() => getLeadStages(t), [t]);
    const { user } = useAuth();
    const { leads, updateLeadStatus, deleteLead, addLead, updateLead, addLeadActivity, getLeadActivities, addLeadTask, updateLeadTask, deleteLeadTask, getLeadTasks } = useCRM();
    const { hasApiKey, promptForKeySelection, handleApiError } = useAI();
    const { activeProject } = useProject();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'pipeline' | 'library'>('pipeline');

    // View Mode
    const [viewMode, setViewMode] = useState<'kanban' | 'table' | 'list'>('kanban');

    // Bulk Actions
    const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

    // Advanced Filters
    const [filters, setFilters] = useState<LeadsFiltersState>({
        search: '',
        statuses: [],
        sources: [],
        valueRange: { min: 0, max: 1000000 },
        scoreRange: { min: 0, max: 100 },
        tags: [],
        dateRange: { start: '', end: '' }
    });

    // Custom Fields Configuration
    const [customFieldsConfig, setCustomFieldsConfig] = useState<CustomFieldDefinition[]>([]);

    // Edit Mode States
    const [isEditMode, setIsEditMode] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Lead>>({});

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

    // --- Get all available tags ---
    const availableTags = useMemo(() => {
        const tagsSet = new Set<string>();
        leads.forEach(lead => {
            lead.tags?.forEach(tag => tagsSet.add(tag));
        });
        return Array.from(tagsSet).sort();
    }, [leads]);

    // --- Filtered Data ---
    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            // Text search
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = !searchQuery ||
                lead.name.toLowerCase().includes(searchLower) ||
                lead.email.toLowerCase().includes(searchLower) ||
                lead.company?.toLowerCase().includes(searchLower);

            // Status filter
            const matchesStatus = filters.statuses.length === 0 || filters.statuses.includes(lead.status);

            // Source filter
            const matchesSource = filters.sources.length === 0 || filters.sources.includes(lead.source);

            // Value range filter
            const leadValue = lead.value || 0;
            const matchesValue = leadValue >= filters.valueRange.min && leadValue <= filters.valueRange.max;

            // AI Score filter
            const leadScore = lead.aiScore || 0;
            const matchesScore = leadScore >= filters.scoreRange.min && leadScore <= filters.scoreRange.max;

            // Tags filter
            const matchesTags = filters.tags.length === 0 ||
                (lead.tags && filters.tags.some(tag => lead.tags?.includes(tag)));

            // Date range filter
            let matchesDate = true;
            if (filters.dateRange.start || filters.dateRange.end) {
                const leadDate = new Date(lead.createdAt.seconds * 1000);
                if (filters.dateRange.start) {
                    const startDate = new Date(filters.dateRange.start);
                    matchesDate = matchesDate && leadDate >= startDate;
                }
                if (filters.dateRange.end) {
                    const endDate = new Date(filters.dateRange.end);
                    endDate.setHours(23, 59, 59, 999);
                    matchesDate = matchesDate && leadDate <= endDate;
                }
            }

            return matchesSearch && matchesStatus && matchesSource && matchesValue &&
                matchesScore && matchesTags && matchesDate;
        });
    }, [leads, searchQuery, filters]);

    const handleAddSubmit = async (leadData: Partial<Lead>) => {
        await addLead({
            name: leadData.name || '',
            email: leadData.email || '',
            phone: leadData.phone,
            company: leadData.company,
            jobTitle: leadData.jobTitle,
            industry: leadData.industry,
            value: Number(leadData.value) || 0,
            source: 'manual',
            status: 'new',
            notes: '',
        } as any);

        setIsAddModalOpen(false);
    };

    const handleDelete = async () => {
        if (selectedLead && window.confirm('Are you sure you want to delete this lead?')) {
            await deleteLead(selectedLead.id);
            setSelectedLead(null);
        }
    };

    const handleEnterEditMode = () => {
        if (selectedLead) {
            setEditForm({
                name: selectedLead.name,
                email: selectedLead.email,
                phone: selectedLead.phone,
                company: selectedLead.company,
                jobTitle: selectedLead.jobTitle,
                industry: selectedLead.industry,
                website: selectedLead.website,
                linkedIn: selectedLead.linkedIn,
                address: selectedLead.address || {},
                value: selectedLead.value,
                probability: selectedLead.probability,
                notes: selectedLead.notes,
                tags: selectedLead.tags || [],
                customFields: selectedLead.customFields || [],
            });
            setIsEditMode(true);
        }
    };

    const handleCancelEdit = () => {
        setIsEditMode(false);
        setEditForm({});
    };

    const handleSaveEdit = async () => {
        if (!selectedLead) return;
        await updateLead(selectedLead.id, editForm);
        setSelectedLead({ ...selectedLead, ...editForm });
        setIsEditMode(false);
        setEditForm({});
    };

    // Bulk Actions Handlers
    const handleToggleSelect = (leadId: string) => {
        setSelectedLeadIds(prev =>
            prev.includes(leadId)
                ? prev.filter(id => id !== leadId)
                : [...prev, leadId]
        );
    };

    const handleToggleSelectAll = () => {
        if (selectedLeadIds.length === filteredLeads.length) {
            setSelectedLeadIds([]);
        } else {
            setSelectedLeadIds(filteredLeads.map(l => l.id));
        }
    };

    // Export to CSV
    const handleExportCSV = () => {
        const leadsToExport = selectedLeadIds.length > 0
            ? leads.filter(l => selectedLeadIds.includes(l.id))
            : filteredLeads;

        if (leadsToExport.length === 0) {
            alert('No leads to export');
            return;
        }

        // CSV Headers
        const headers = [
            'Name', 'Email', 'Phone', 'Company', 'Status', 'Source',
            'Value', 'AI Score', 'AI Analysis', 'Recommended Action',
            'Notes', 'Tags', 'Created At'
        ];

        // CSV Rows
        const rows = leadsToExport.map(lead => [
            lead.name,
            lead.email,
            lead.phone || '',
            lead.company || '',
            lead.status,
            lead.source,
            lead.value || 0,
            lead.aiScore || '',
            lead.aiAnalysis || '',
            lead.recommendedAction || '',
            lead.notes || '',
            lead.tags?.join('; ') || '',
            lead.createdAt.seconds ? new Date(lead.createdAt.seconds * 1000).toLocaleDateString() : ''
        ]);

        // Create CSV content
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clear selection after export
        if (selectedLeadIds.length > 0) {
            setSelectedLeadIds([]);
        }
    };

    // --- AI Logic ---
    const handleAnalyzeLead = async () => {
        if (!selectedLead) return;
        if (hasApiKey === false) { await promptForKeySelection(); return; }

        setIsAnalyzing(true);
        try {
            const prompt = `
                Analyze this sales lead based on professional criteria.
                Lead Name: ${selectedLead.name}
                Company: ${selectedLead.company || 'Unknown'}
                Value: $${selectedLead.value}
                Notes: ${selectedLead.notes}
                
                Output ONLY valid JSON format:
                {
                    "score": number (0-100),
                    "analysis": "1 sentence summary of potential",
                    "action": "Recommended next step (Email, Call, Meeting, or Discard)"
                }
            `;

            const projectId = activeProject?.id || 'leads-analysis';
            const response = await generateContentViaProxy(projectId, prompt, 'gemini-2.5-flash', {}, user?.uid);
            const responseText = extractTextFromResponse(response);

            // Log API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    model: 'gemini-2.5-flash',
                    feature: 'leads-ai-analysis',
                    success: true
                });
            }

            // Clean markdown code blocks from response before parsing
            const cleanedText = cleanJsonResponse(responseText);
            const data = JSON.parse(cleanedText);

            await updateLead(selectedLead.id, {
                aiScore: data.score,
                aiAnalysis: data.analysis,
                recommendedAction: data.action
            });

            // Update local state to reflect immediately
            setSelectedLead(prev => prev ? ({ ...prev, aiScore: data.score, aiAnalysis: data.analysis, recommendedAction: data.action }) : null);

        } catch (e: any) {
            // Log failed API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    model: 'gemini-2.5-flash',
                    feature: 'leads-ai-analysis',
                    success: false,
                    errorMessage: e.message || 'Unknown error'
                });
            }
            handleApiError(e);
            console.error("Analysis failed", e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDraftEmail = async () => {
        if (!selectedLead) return;
        if (hasApiKey === false) { await promptForKeySelection(); return; }

        setIsDrafting(true);
        try {
            const prompt = `
                Write a short, professional intro email to this lead.
                Name: ${selectedLead.name}
                Company: ${selectedLead.company}
                Context: ${selectedLead.notes}
                My Goal: Move them to the next stage of the pipeline.
            `;

            const projectId = activeProject?.id || 'leads-email-draft';
            const response = await generateContentViaProxy(projectId, prompt, 'gemini-2.5-flash', {}, user?.uid);
            const responseText = extractTextFromResponse(response);

            // Log API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    model: 'gemini-2.5-flash',
                    feature: 'leads-draft-email',
                    success: true
                });
            }

            setEmailDraft(responseText);
        } catch (e: any) {
            // Log failed API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    model: 'gemini-2.5-flash',
                    feature: 'leads-draft-email',
                    success: false,
                    errorMessage: e.message || 'Unknown error'
                });
            }
            handleApiError(e);
            console.error("Drafting failed", e);
        } finally {
            setIsDrafting(false);
        }
    };


    return (
        <div className="flex h-screen bg-background text-foreground">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden relative bg-background">
                {/* Header - Mobile optimized */}
                <header className="h-auto min-h-[56px] px-3 sm:px-6 py-2 sm:py-0 border-b border-border bg-background z-20 shrink-0">
                    {/* Main header row */}
                    <div className="flex items-center justify-between h-[52px] sm:h-14">
                        <div className="flex items-center gap-2 sm:gap-4">
                            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden h-11 w-11 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 active:bg-secondary rounded-xl transition-colors touch-manipulation">
                                <Menu className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-2 sm:gap-4">
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                    <LayoutGrid className="text-primary w-4 h-4 sm:w-5 sm:h-5" />
                                    <h1 className="text-sm sm:text-lg font-semibold text-foreground">{t('leads.dashboard.title')}</h1>
                                </div>
                                <div className="flex items-center bg-muted/50 p-0.5 sm:p-1 rounded-lg border border-border/50">
                                    <button
                                        onClick={() => setActiveTab('pipeline')}
                                        className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-medium rounded-md transition-all ${activeTab === 'pipeline' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        {t('leads.dashboard.pipeline')}
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('library')}
                                        className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-medium rounded-md transition-all ${activeTab === 'library' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        {t('leads.dashboard.library')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-2">
                            {activeTab === 'pipeline' && (
                                <>
                                    {/* Stats Row (Hidden on mobile) */}
                                    <div className="hidden lg:flex items-center gap-6 mr-4">
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t('leads.dashboard.pipelineValue')}</p>
                                            <p className="text-lg font-bold text-foreground">${stats.totalValue.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t('leads.dashboard.conversionRate')}</p>
                                            <div className="flex items-center text-green-500">
                                                <p className="text-lg font-bold mr-1">{stats.conversionRate}%</p>
                                                <ArrowUpRight size={14} />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t('leads.dashboard.activeLeads')}</p>
                                            <p className="text-lg font-bold text-foreground">{stats.activeLeads}</p>
                                        </div>
                                    </div>

                                    {/* View Mode Selector - Compact on mobile */}
                                    <div className="hidden sm:flex items-center gap-0.5 sm:gap-1">
                                        <button
                                            onClick={() => setViewMode('kanban')}
                                            className={`h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-md transition-colors ${viewMode === 'kanban' ? 'text-editor-accent bg-editor-accent/10' : 'text-muted-foreground hover:text-foreground hover:bg-border/40'}`}
                                            title={t('leads.dashboard.kanbanView')}
                                        >
                                            <Columns className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setViewMode('table')}
                                            className={`h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-md transition-colors ${viewMode === 'table' ? 'text-editor-accent bg-editor-accent/10' : 'text-muted-foreground hover:text-foreground hover:bg-border/40'}`}
                                            title={t('leads.dashboard.tableView')}
                                        >
                                            <Table className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setViewMode('list')}
                                            className={`h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-md transition-colors ${viewMode === 'list' ? 'text-editor-accent bg-editor-accent/10' : 'text-muted-foreground hover:text-foreground hover:bg-border/40'}`}
                                            title={t('leads.dashboard.listView')}
                                        >
                                            <List className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Search - Desktop only */}
                                    <div className="hidden md:flex items-center gap-2 bg-editor-border/40 rounded-lg px-3 py-2 min-w-[200px]">
                                        <Search className="w-4 h-4 text-editor-text-secondary flex-shrink-0" />
                                        <input
                                            type="text"
                                            placeholder={t('leads.dashboard.search')}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="flex-1 bg-transparent outline-none text-sm min-w-0"
                                        />
                                        {searchQuery && (
                                            <button onClick={() => setSearchQuery('')} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Mobile Search Button */}
                                    <button
                                        onClick={() => setSearchQuery(searchQuery || ' ')}
                                        className="md:hidden h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-border/40 transition-colors"
                                    >
                                        <Search className="w-4 h-4" />
                                    </button>

                                    <div className="hidden sm:block">
                                        <CustomFieldsManager
                                            customFieldsConfig={customFieldsConfig}
                                            onSaveConfig={setCustomFieldsConfig}
                                        />
                                    </div>
                                    <button
                                        onClick={handleExportCSV}
                                        className="hidden sm:flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-md transition-all text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40"
                                        title={t('leads.dashboard.exportCsv')}
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setIsAddModalOpen(true)}
                                        className="flex items-center gap-1 h-8 sm:h-9 px-2 sm:px-3 rounded-md text-xs sm:text-sm font-medium transition-all bg-primary text-primary-foreground hover:opacity-90 whitespace-nowrap"
                                    >
                                        <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        <span className="hidden sm:inline">{t('leads.dashboard.addLead')}</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Mobile stats bar - shows only on mobile when on pipeline tab */}
                    {activeTab === 'pipeline' && (
                        <div className="lg:hidden flex items-center gap-4 py-2 overflow-x-auto scrollbar-hide -mx-3 px-3">
                            <div className="flex items-center gap-1.5 shrink-0">
                                <DollarSign className="w-3.5 h-3.5 text-green-500" />
                                <span className="text-xs font-bold text-foreground">${stats.totalValue.toLocaleString()}</span>
                            </div>
                            <div className="w-px h-4 bg-border shrink-0" />
                            <div className="flex items-center gap-1.5 shrink-0">
                                <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />
                                <span className="text-xs font-bold text-green-500">{stats.conversionRate}%</span>
                            </div>
                            <div className="w-px h-4 bg-border shrink-0" />
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-xs text-muted-foreground">Active:</span>
                                <span className="text-xs font-bold text-foreground">{stats.activeLeads}</span>
                            </div>

                            {/* Mobile view mode selector */}
                            <div className="sm:hidden flex items-center gap-0.5 ml-auto shrink-0">
                                <button
                                    onClick={() => setViewMode('kanban')}
                                    className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors ${viewMode === 'kanban' ? 'text-editor-accent bg-editor-accent/10' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <Columns className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors ${viewMode === 'table' ? 'text-editor-accent bg-editor-accent/10' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <Table className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors ${viewMode === 'list' ? 'text-editor-accent bg-editor-accent/10' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <List className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </header>

                {activeTab === 'library' ? (
                    <LeadsLibrary />
                ) : (
                    <>
                        {/* Bulk Actions Bar - Mobile optimized */}
                        {selectedLeadIds.length > 0 && (
                            <div className="sticky top-0 z-10 bg-primary text-primary-foreground px-3 sm:px-6 py-2 sm:py-3 border-b border-primary-foreground/20 animate-slide-down">
                                {/* Mobile layout */}
                                <div className="sm:hidden">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-xs">
                                            {selectedLeadIds.length} {t('leads.dashboard.selected')}
                                        </span>
                                        <button
                                            onClick={() => setSelectedLeadIds([])}
                                            className="text-[10px] hover:underline opacity-90"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            onChange={async (e) => {
                                                if (e.target.value) {
                                                    await Promise.all(
                                                        selectedLeadIds.map(id => updateLeadStatus(id, e.target.value as LeadStatus))
                                                    );
                                                    setSelectedLeadIds([]);
                                                    e.target.value = '';
                                                }
                                            }}
                                            className="flex-1 bg-primary-foreground text-foreground px-2 py-1.5 rounded text-xs font-medium outline-none"
                                        >
                                            <option value="">Move to...</option>
                                            {LEAD_STAGES.map(stage => (
                                                <option key={stage.id} value={stage.id}>{stage.label}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={handleExportCSV}
                                            className="bg-primary-foreground text-foreground p-1.5 rounded hover:bg-secondary transition-colors"
                                        >
                                            <Download size={14} />
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (window.confirm(`Delete ${selectedLeadIds.length} lead(s)?`)) {
                                                    await Promise.all(selectedLeadIds.map(id => deleteLead(id)));
                                                    setSelectedLeadIds([]);
                                                }
                                            }}
                                            className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Desktop layout */}
                                <div className="hidden sm:flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <span className="font-bold text-sm">
                                            {selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? 's' : ''} selected
                                        </span>
                                        <button
                                            onClick={() => setSelectedLeadIds([])}
                                            className="text-xs hover:underline opacity-90"
                                        >
                                            Clear Selection
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleExportCSV}
                                            className="bg-primary-foreground text-foreground px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2 hover:bg-secondary transition-colors"
                                        >
                                            <Download size={14} />
                                            Export Selected
                                        </button>
                                        <select
                                            onChange={async (e) => {
                                                if (e.target.value) {
                                                    await Promise.all(
                                                        selectedLeadIds.map(id => updateLeadStatus(id, e.target.value as LeadStatus))
                                                    );
                                                    setSelectedLeadIds([]);
                                                    e.target.value = '';
                                                }
                                            }}
                                            className="bg-primary-foreground text-foreground px-3 py-1.5 rounded text-sm font-medium outline-none"
                                        >
                                            <option value="">Change Status...</option>
                                            {LEAD_STAGES.map(stage => (
                                                <option key={stage.id} value={stage.id}>{stage.label}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={async () => {
                                                if (window.confirm(`Are you sure you want to delete ${selectedLeadIds.length} lead(s)?`)) {
                                                    await Promise.all(selectedLeadIds.map(id => deleteLead(id)));
                                                    setSelectedLeadIds([]);
                                                }
                                            }}
                                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                            Delete Selected
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Filters Section - Mobile optimized */}
                        <div className="px-3 sm:px-6 pt-3 sm:pt-4">
                            {/* Mobile search bar */}
                            <div className="sm:hidden mb-3">
                                <div className="flex items-center gap-2 bg-editor-border/40 rounded-lg px-3 py-2">
                                    <Search className="w-4 h-4 text-editor-text-secondary flex-shrink-0" />
                                    <input
                                        type="text"
                                        placeholder="Search leads..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="flex-1 bg-transparent outline-none text-sm min-w-0"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <LeadsFilters
                                filters={filters}
                                onFiltersChange={setFilters}
                                availableTags={availableTags}
                            />
                        </div>

                        {/* Main Content Area */}
                        <main className="flex-1 overflow-x-auto overflow-y-hidden p-3 sm:p-6 pt-3 sm:pt-4">
                            {viewMode === 'kanban' && (
                                <>
                                    {/* Mobile Kanban - Horizontal scroll with snap */}
                                    <div className="sm:hidden flex h-full gap-3 overflow-x-auto snap-x snap-mandatory pb-4 -mx-3 px-3 scrollbar-hide">
                                        {LEAD_STAGES.map(stage => {
                                            const stageLeads = filteredLeads.filter(l => l.status === stage.id);
                                            return (
                                                <div
                                                    key={stage.id}
                                                    className="w-[85vw] min-w-[85vw] flex flex-col h-full rounded-xl bg-secondary/20 border border-border/50 snap-center"
                                                    onDragOver={handleDragOver}
                                                    onDrop={(e) => handleDrop(e, stage.id)}
                                                >
                                                    {/* Column Header */}
                                                    <div className="p-3 flex items-center justify-between shrink-0 border-b border-border/30">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                                                            <h3 className="font-bold text-xs text-foreground">{stage.label}</h3>
                                                            <span className="bg-background px-1.5 py-0.5 rounded-full text-[10px] text-muted-foreground border border-border font-mono">
                                                                {stageLeads.length}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Cards Container */}
                                                    <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                                                        {stageLeads.map(lead => (
                                                            <LeadCard
                                                                key={lead.id}
                                                                lead={lead}
                                                                onDragStart={handleDragStart}
                                                                onClick={() => { setEmailDraft(''); setSelectedLead(lead); }}
                                                            />
                                                        ))}
                                                        {stageLeads.length === 0 && (
                                                            <div className="h-20 border-2 border-dashed border-border/50 rounded-lg flex items-center justify-center text-muted-foreground/50 text-[10px] font-medium italic">
                                                                Drop items here
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Desktop Kanban */}
                                    <div className="hidden sm:flex h-full gap-4 lg:gap-6 min-w-max">
                                        {LEAD_STAGES.map(stage => {
                                            const stageLeads = filteredLeads.filter(l => l.status === stage.id);
                                            return (
                                                <div
                                                    key={stage.id}
                                                    className="w-[280px] lg:w-[320px] flex flex-col h-full rounded-2xl bg-secondary/20 border border-border/50"
                                                    onDragOver={handleDragOver}
                                                    onDrop={(e) => handleDrop(e, stage.id)}
                                                >
                                                    {/* Column Header */}
                                                    <div className="p-3 lg:p-4 flex items-center justify-between shrink-0">
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
                                                    <div className="flex-1 overflow-y-auto px-3 lg:px-4 pt-3 lg:pt-4 pb-4 custom-scrollbar">
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
                                </>
                            )}

                            {viewMode === 'table' && (
                                <LeadsTableView
                                    leads={filteredLeads}
                                    onLeadClick={(lead) => { setEmailDraft(''); setSelectedLead(lead); }}
                                    onDelete={deleteLead}
                                    selectedLeadIds={selectedLeadIds}
                                    onToggleSelect={handleToggleSelect}
                                    onToggleSelectAll={handleToggleSelectAll}
                                />
                            )}

                            {viewMode === 'list' && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                                    <LeadsListView
                                        leads={filteredLeads}
                                        selectedLeadId={selectedLead?.id || null}
                                        onLeadClick={(lead) => { setEmailDraft(''); setSelectedLead(lead); }}
                                        selectedLeadIds={selectedLeadIds}
                                        onToggleSelect={handleToggleSelect}
                                    />
                                    {selectedLead && (
                                        <div className="bg-card border border-border rounded-xl p-6 overflow-y-auto custom-scrollbar">
                                            <h3 className="text-lg font-bold mb-4">Quick Preview</h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-xs font-bold text-muted-foreground uppercase">Name</label>
                                                    <p className="text-sm text-foreground">{selectedLead.name}</p>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-muted-foreground uppercase">Email</label>
                                                    <p className="text-sm text-foreground">{selectedLead.email}</p>
                                                </div>
                                                {selectedLead.company && (
                                                    <div>
                                                        <label className="text-xs font-bold text-muted-foreground uppercase">Company</label>
                                                        <p className="text-sm text-foreground">{selectedLead.company}</p>
                                                    </div>
                                                )}
                                                {selectedLead.value && (
                                                    <div>
                                                        <label className="text-xs font-bold text-muted-foreground uppercase">Value</label>
                                                        <p className="text-sm font-bold text-green-500">${selectedLead.value.toLocaleString()}</p>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => setSelectedLead(selectedLead)}
                                                    className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-bold hover:opacity-90"
                                                >
                                                    View Full Details
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </main>
                    </>
                )}

                {/* Modals */}
                {/* ... existing modals ... */}
                {/* I need to make sure I don't cut off the modals if they are outside the main content */}
                {/* The original code had modals at the end. I should check where they are. */}
                {/* Wait, I can't see the end of the file in the previous view_file. */}
                {/* I will assume the modals are after the main content. */}
                {/* Let's close the fragment before the modals if they are there, or just close it at the end of the main content area. */}
                {/* The view_file showed up to line 800. I need to be careful. */}
                {/* I will use a safer approach: wrap the content I KNOW is there. */}

                {/* Actually, I'll just wrap the Bulk Actions, Filters, and Main Content. */}
                {/* The modals are likely at the bottom of the component. */}
                {/* I'll check the end of the file first to be safe. */}

                {/* Lead Detail Modal - Mobile optimized */}
                <Modal
                    isOpen={!!selectedLead}
                    onClose={() => setSelectedLead(null)}
                    maxWidth="max-w-3xl"
                    className="bg-card !p-0"
                >
                    {selectedLead && (
                        <>
                            <div className="p-4 sm:p-6 border-b border-border bg-secondary/10">
                                {/* Mobile drag indicator */}
                                <div className="sm:hidden w-10 h-1 bg-border rounded-full mx-auto mb-3" />

                                <div className="flex justify-between items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start sm:items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                                            {isEditMode ? (
                                                <input
                                                    type="text"
                                                    value={editForm.name || ''}
                                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                    className="text-lg sm:text-2xl font-bold text-foreground bg-secondary/20 border border-border rounded-lg px-2 sm:px-3 py-1 outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-auto"
                                                />
                                            ) : (
                                                <h2 className="text-lg sm:text-2xl font-bold text-foreground truncate">{selectedLead.name}</h2>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold text-white uppercase tracking-wide shrink-0 ${LEAD_STAGES.find(s => s.id === selectedLead.status)?.color}`}>
                                                    {LEAD_STAGES.find(s => s.id === selectedLead.status)?.label}
                                                </span>
                                                {selectedLead.emojiMarker && <span className="text-lg sm:text-2xl">{selectedLead.emojiMarker}</span>}
                                            </div>
                                        </div>
                                        <p className="text-muted-foreground flex items-center gap-2 text-xs sm:text-sm flex-wrap">
                                            {isEditMode ? (
                                                <input
                                                    type="text"
                                                    placeholder="Company name"
                                                    value={editForm.company || ''}
                                                    onChange={e => setEditForm({ ...editForm, company: e.target.value })}
                                                    className="bg-secondary/20 border border-border rounded px-2 py-1 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                                />
                                            ) : (
                                                selectedLead.company && <span className="flex items-center"><Building2 size={12} className="sm:hidden mr-1" /><Building2 size={14} className="hidden sm:block mr-1" /> {selectedLead.company}</span>
                                            )}
                                            <span className="w-1 h-1 bg-muted-foreground rounded-full" />
                                            <span>Added {selectedLead.createdAt && selectedLead.createdAt.seconds ? new Date(selectedLead.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                                        {!isEditMode && (
                                            <button onClick={handleEnterEditMode} className="p-1.5 sm:p-2 hover:bg-border rounded-full text-primary transition-colors" title="Edit Lead">
                                                <Edit size={16} className="sm:hidden" />
                                                <Edit size={20} className="hidden sm:block" />
                                            </button>
                                        )}
                                        <button onClick={() => { setSelectedLead(null); setIsEditMode(false); }} className="p-1.5 sm:p-2 hover:bg-border rounded-full text-muted-foreground transition-colors">
                                            <XCircle size={20} className="sm:hidden" />
                                            <XCircle size={24} className="hidden sm:block" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 overflow-y-auto max-h-[60vh] sm:max-h-[70vh]">
                                {/* AI INSIGHTS SECTION - Mobile optimized */}
                                <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg sm:rounded-xl p-3 sm:p-5">
                                    <div className="flex justify-between items-center mb-3 sm:mb-4">
                                        <h3 className="text-xs sm:text-sm font-bold text-purple-500 flex items-center uppercase tracking-wider">
                                            <Sparkles size={12} className="sm:hidden mr-1.5" />
                                            <Sparkles size={14} className="hidden sm:block mr-2" />
                                            AI Intelligence
                                        </h3>
                                        <button
                                            onClick={handleAnalyzeLead}
                                            disabled={isAnalyzing}
                                            className="text-[10px] sm:text-xs font-bold bg-purple-500 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg hover:bg-purple-600 transition-colors flex items-center disabled:opacity-50"
                                        >
                                            {isAnalyzing ? <Loader2 size={10} className="animate-spin mr-1" /> : <Sparkles size={10} className="mr-1" />}
                                            Analyze
                                        </button>
                                    </div>

                                    {selectedLead.aiScore !== undefined ? (
                                        <div className="space-y-3 sm:space-y-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                                <div className="flex-1">
                                                    <div className="flex justify-between text-[10px] sm:text-xs mb-1 font-bold text-foreground">
                                                        <span>Win Probability</span>
                                                        <span>{selectedLead.aiScore}%</span>
                                                    </div>
                                                    <div className="h-1.5 sm:h-2 bg-secondary rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all duration-1000 ${selectedLead.aiScore > 75 ? 'bg-green-500' : selectedLead.aiScore > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                            style={{ width: `${selectedLead.aiScore}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="sm:text-right">
                                                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Action: </span>
                                                    <span className="text-xs sm:text-sm font-bold text-foreground">{selectedLead.recommendedAction || "Review"}</span>
                                                </div>
                                            </div>
                                            <p className="text-xs sm:text-sm text-muted-foreground bg-card p-2 sm:p-3 rounded-lg border border-border">
                                                <span className="font-bold text-purple-500 mr-1 sm:mr-2">Insight:</span>
                                                {selectedLead.aiAnalysis}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-xs sm:text-sm text-muted-foreground italic">Run analysis to get score and insights.</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                    <div className="space-y-3 sm:space-y-4">
                                        <div>
                                            <label className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Contact Info</label>
                                            {isEditMode ? (
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <Mail size={14} className="text-primary shrink-0" />
                                                        <input
                                                            type="email"
                                                            value={editForm.email || ''}
                                                            onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                                            className="flex-1 bg-secondary/20 border border-border rounded px-2 py-1.5 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Phone size={14} className="text-primary shrink-0" />
                                                        <input
                                                            type="tel"
                                                            placeholder="Phone number"
                                                            value={editForm.phone || ''}
                                                            onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                                            className="flex-1 bg-secondary/20 border border-border rounded px-2 py-1.5 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Mail size={14} className="text-primary shrink-0" />
                                                        <a href={`mailto:${selectedLead.email}`} className="text-xs sm:text-sm text-foreground hover:underline truncate">{selectedLead.email}</a>
                                                    </div>
                                                    {selectedLead.phone && (
                                                        <div className="flex items-center gap-2">
                                                            <Phone size={14} className="text-primary shrink-0" />
                                                            <a href={`tel:${selectedLead.phone}`} className="text-xs sm:text-sm text-foreground hover:underline">{selectedLead.phone}</a>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-3 sm:space-y-4">
                                        <div className="flex sm:block items-center justify-between sm:justify-start gap-4">
                                            <div>
                                                <label className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Deal Value</label>
                                                {isEditMode ? (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-lg sm:text-xl font-bold text-green-500">$</span>
                                                        <input
                                                            type="number"
                                                            value={editForm.value || 0}
                                                            onChange={e => setEditForm({ ...editForm, value: Number(e.target.value) })}
                                                            className="w-24 sm:flex-1 bg-secondary/20 border border-border rounded px-2 py-1 text-lg sm:text-xl font-bold text-green-500 outline-none focus:ring-2 focus:ring-primary/50"
                                                        />
                                                    </div>
                                                ) : (
                                                    <p className="text-lg sm:text-xl font-bold text-green-500">${(selectedLead.value || 0).toLocaleString()}</p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Source</label>
                                                <p className="text-xs sm:text-sm text-foreground capitalize flex items-center gap-1.5">
                                                    {selectedLead.source === 'chatbot' ? <Bot size={14} /> : <LayoutGrid size={14} />}
                                                    {selectedLead.source}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Professional Info & Links - Mobile optimized */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 border-t border-border pt-4 sm:pt-6">
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block flex items-center gap-1">
                                                <Briefcase size={10} className="sm:hidden" />
                                                <Briefcase size={12} className="hidden sm:block" />
                                                Job Title
                                            </label>
                                            {isEditMode ? (
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Marketing Director"
                                                    value={editForm.jobTitle || ''}
                                                    onChange={e => setEditForm({ ...editForm, jobTitle: e.target.value })}
                                                    className="w-full bg-secondary/20 border border-border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                                />
                                            ) : (
                                                <p className="text-xs sm:text-sm text-foreground">{selectedLead.jobTitle || '-'}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block flex items-center gap-1">
                                                <Building2 size={10} className="sm:hidden" />
                                                <Building2 size={12} className="hidden sm:block" />
                                                Industry
                                            </label>
                                            {isEditMode ? (
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Technology, Healthcare"
                                                    value={editForm.industry || ''}
                                                    onChange={e => setEditForm({ ...editForm, industry: e.target.value })}
                                                    className="w-full bg-secondary/20 border border-border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                                />
                                            ) : (
                                                <p className="text-xs sm:text-sm text-foreground">{selectedLead.industry || '-'}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block flex items-center gap-1">
                                                <Globe size={10} className="sm:hidden" />
                                                <Globe size={12} className="hidden sm:block" />
                                                Website
                                            </label>
                                            {isEditMode ? (
                                                <input
                                                    type="url"
                                                    placeholder="https://example.com"
                                                    value={editForm.website || ''}
                                                    onChange={e => setEditForm({ ...editForm, website: e.target.value })}
                                                    className="w-full bg-secondary/20 border border-border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                                />
                                            ) : (
                                                selectedLead.website ? (
                                                    <a href={selectedLead.website} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm text-primary hover:underline flex items-center gap-1 truncate">
                                                        {selectedLead.website.replace(/^https?:\/\//, '')}
                                                    </a>
                                                ) : (
                                                    <p className="text-xs sm:text-sm text-muted-foreground">-</p>
                                                )
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block flex items-center gap-1">
                                                <Linkedin size={10} className="sm:hidden" />
                                                <Linkedin size={12} className="hidden sm:block" />
                                                LinkedIn
                                            </label>
                                            {isEditMode ? (
                                                <input
                                                    type="url"
                                                    placeholder="https://linkedin.com/in/..."
                                                    value={editForm.linkedIn || ''}
                                                    onChange={e => setEditForm({ ...editForm, linkedIn: e.target.value })}
                                                    className="w-full bg-secondary/20 border border-border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                                />
                                            ) : (
                                                selectedLead.linkedIn ? (
                                                    <a href={selectedLead.linkedIn} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm text-primary hover:underline flex items-center gap-1">
                                                        View Profile
                                                    </a>
                                                ) : (
                                                    <p className="text-xs sm:text-sm text-muted-foreground">-</p>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Address Section */}
                                <div className="border-t border-border pt-6">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 block flex items-center gap-1">
                                        <MapPin size={12} />
                                        Address
                                    </label>
                                    {isEditMode ? (
                                        <div className="space-y-3">
                                            <input
                                                type="text"
                                                placeholder="Street Address"
                                                value={editForm.address?.street || ''}
                                                onChange={e => setEditForm({
                                                    ...editForm,
                                                    address: { ...(editForm.address || {}), street: e.target.value }
                                                })}
                                                className="w-full bg-secondary/20 border border-border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                            <div className="grid grid-cols-2 gap-3">
                                                <input
                                                    type="text"
                                                    placeholder="City"
                                                    value={editForm.address?.city || ''}
                                                    onChange={e => setEditForm({
                                                        ...editForm,
                                                        address: { ...(editForm.address || {}), city: e.target.value }
                                                    })}
                                                    className="bg-secondary/20 border border-border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="State/Province"
                                                    value={editForm.address?.state || ''}
                                                    onChange={e => setEditForm({
                                                        ...editForm,
                                                        address: { ...(editForm.address || {}), state: e.target.value }
                                                    })}
                                                    className="bg-secondary/20 border border-border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <input
                                                    type="text"
                                                    placeholder="Zip/Postal Code"
                                                    value={editForm.address?.zipCode || ''}
                                                    onChange={e => setEditForm({
                                                        ...editForm,
                                                        address: { ...(editForm.address || {}), zipCode: e.target.value }
                                                    })}
                                                    className="bg-secondary/20 border border-border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Country"
                                                    value={editForm.address?.country || ''}
                                                    onChange={e => setEditForm({
                                                        ...editForm,
                                                        address: { ...(editForm.address || {}), country: e.target.value }
                                                    })}
                                                    className="bg-secondary/20 border border-border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        selectedLead.address && (selectedLead.address.street || selectedLead.address.city) ? (
                                            <div className="text-sm text-foreground bg-secondary/20 p-3 rounded-lg">
                                                {selectedLead.address.street && <p>{selectedLead.address.street}</p>}
                                                <p>
                                                    {selectedLead.address.city && `${selectedLead.address.city}`}
                                                    {selectedLead.address.state && `, ${selectedLead.address.state}`}
                                                    {selectedLead.address.zipCode && ` ${selectedLead.address.zipCode}`}
                                                </p>
                                                {selectedLead.address.country && <p className="text-muted-foreground mt-1">{selectedLead.address.country}</p>}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic">No address added</p>
                                        )
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Notes</label>
                                    {isEditMode ? (
                                        <textarea
                                            value={editForm.notes || ''}
                                            onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                            className="w-full bg-secondary/20 border border-border rounded-xl p-4 min-h-[100px] text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                                            placeholder="Add notes about this lead..."
                                        />
                                    ) : (
                                        <div className="bg-secondary/20 p-4 rounded-xl border border-border min-h-[100px] text-sm text-foreground leading-relaxed">
                                            {selectedLead.notes || "No notes added yet."}
                                        </div>
                                    )}
                                </div>

                                {/* Custom Fields */}
                                {customFieldsConfig.length > 0 && (
                                    <div className="border-t border-border pt-6">
                                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Custom Fields</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            {customFieldsConfig.map(fieldDef => {
                                                const currentValue = selectedLead.customFields?.find(f => f.id === fieldDef.id);

                                                return (
                                                    <div key={fieldDef.id}>
                                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                                                            {fieldDef.name}
                                                        </label>
                                                        {isEditMode ? (
                                                            <>
                                                                {fieldDef.type === 'text' && (
                                                                    <input
                                                                        type="text"
                                                                        value={(currentValue?.value as string) || ''}
                                                                        onChange={e => {
                                                                            const updatedFields = [...(editForm.customFields || [])];
                                                                            const fieldIndex = updatedFields.findIndex(f => f.id === fieldDef.id);
                                                                            if (fieldIndex >= 0) {
                                                                                updatedFields[fieldIndex].value = e.target.value;
                                                                            } else {
                                                                                updatedFields.push({ ...fieldDef, value: e.target.value });
                                                                            }
                                                                            setEditForm({ ...editForm, customFields: updatedFields });
                                                                        }}
                                                                        className="w-full bg-secondary/20 border border-border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                                                    />
                                                                )}
                                                                {fieldDef.type === 'number' && (
                                                                    <input
                                                                        type="number"
                                                                        value={(currentValue?.value as number) || 0}
                                                                        onChange={e => {
                                                                            const updatedFields = [...(editForm.customFields || [])];
                                                                            const fieldIndex = updatedFields.findIndex(f => f.id === fieldDef.id);
                                                                            if (fieldIndex >= 0) {
                                                                                updatedFields[fieldIndex].value = Number(e.target.value);
                                                                            } else {
                                                                                updatedFields.push({ ...fieldDef, value: Number(e.target.value) });
                                                                            }
                                                                            setEditForm({ ...editForm, customFields: updatedFields });
                                                                        }}
                                                                        className="w-full bg-secondary/20 border border-border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                                                    />
                                                                )}
                                                                {fieldDef.type === 'select' && fieldDef.options && (
                                                                    <select
                                                                        value={(currentValue?.value as string) || ''}
                                                                        onChange={e => {
                                                                            const updatedFields = [...(editForm.customFields || [])];
                                                                            const fieldIndex = updatedFields.findIndex(f => f.id === fieldDef.id);
                                                                            if (fieldIndex >= 0) {
                                                                                updatedFields[fieldIndex].value = e.target.value;
                                                                            } else {
                                                                                updatedFields.push({ ...fieldDef, value: e.target.value });
                                                                            }
                                                                            setEditForm({ ...editForm, customFields: updatedFields });
                                                                        }}
                                                                        className="w-full bg-secondary/20 border border-border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                                                    >
                                                                        <option value="">Select...</option>
                                                                        {fieldDef.options.map(opt => (
                                                                            <option key={opt} value={opt}>{opt}</option>
                                                                        ))}
                                                                    </select>
                                                                )}
                                                                {fieldDef.type === 'checkbox' && (
                                                                    <label className="flex items-center gap-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={(currentValue?.value as boolean) || false}
                                                                            onChange={e => {
                                                                                const updatedFields = [...(editForm.customFields || [])];
                                                                                const fieldIndex = updatedFields.findIndex(f => f.id === fieldDef.id);
                                                                                if (fieldIndex >= 0) {
                                                                                    updatedFields[fieldIndex].value = e.target.checked;
                                                                                } else {
                                                                                    updatedFields.push({ ...fieldDef, value: e.target.checked });
                                                                                }
                                                                                setEditForm({ ...editForm, customFields: updatedFields });
                                                                            }}
                                                                            className="rounded border-border"
                                                                        />
                                                                        <span className="text-sm">Yes</span>
                                                                    </label>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <p className="text-sm text-foreground">
                                                                {currentValue ? String(currentValue.value) : '-'}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Activity Timeline */}
                                {!isEditMode && (
                                    <div className="border-t border-border pt-6">
                                        <LeadsTimeline
                                            activities={getLeadActivities(selectedLead.id)}
                                            onAddActivity={async (activity) => {
                                                await addLeadActivity(selectedLead.id, activity);
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Tasks & Reminders */}
                                {!isEditMode && (
                                    <div className="border-t border-border pt-6">
                                        <LeadTasksList
                                            tasks={getLeadTasks(selectedLead.id)}
                                            onAddTask={async (task) => {
                                                await addLeadTask(selectedLead.id, {
                                                    ...task,
                                                    dueDate: { seconds: task.dueDate.getTime() / 1000, nanoseconds: 0 },
                                                    completed: false
                                                });
                                            }}
                                            onUpdateTask={async (taskId, data) => {
                                                await updateLeadTask(taskId, data);
                                            }}
                                            onDeleteTask={async (taskId) => {
                                                await deleteLeadTask(taskId);
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Email Draft Section */}
                                <div className="border-t border-border pt-6">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Quick Email Draft</label>
                                        <button
                                            onClick={handleDraftEmail}
                                            disabled={isDrafting}
                                            className="text-xs text-primary hover:underline font-bold flex items-center disabled:opacity-50"
                                        >
                                            {isDrafting ? <Loader2 size={12} className="animate-spin mr-1" /> : <Sparkles size={12} className="mr-1" />}
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
                                                <button className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded font-bold shadow-sm" onClick={() => { navigator.clipboard.writeText(emailDraft); alert("Copied!") }}>Copy</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-xs text-muted-foreground italic bg-secondary/10 p-3 rounded border border-dashed border-border/50">
                                            Click "Draft with AI" to generate a personalized outreach email.
                                        </div>
                                    )}
                                </div>

                                {/* Quick Actions - Mobile optimized */}
                                <div className="pt-4 sm:pt-6 border-t border-border">
                                    {isEditMode ? (
                                        <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-0">
                                            <button
                                                onClick={handleCancelEdit}
                                                className="flex items-center justify-center px-3 sm:px-4 py-2 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs sm:text-sm font-bold transition-colors"
                                            >
                                                <XCircle size={14} className="mr-1.5 sm:mr-2" /> Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveEdit}
                                                className="flex items-center justify-center px-3 sm:px-4 py-2 rounded-lg bg-green-500 text-white text-xs sm:text-sm font-bold hover:bg-green-600 transition-colors shadow-md"
                                            >
                                                <CheckCircle2 size={14} className="mr-1.5 sm:mr-2" /> Save Changes
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-0">
                                            {/* Mobile: Stack buttons vertically */}
                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <button
                                                    onClick={() => window.location.href = `mailto:${selectedLead.email}`}
                                                    className="flex items-center justify-center px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-bold hover:opacity-90 transition-colors shadow-md"
                                                >
                                                    <Mail size={14} className="mr-1.5 sm:mr-2" /> Send Email
                                                </button>
                                                <button className="flex items-center justify-center px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs sm:text-sm font-bold transition-colors">
                                                    <Calendar size={14} className="mr-1.5 sm:mr-2" /> Schedule Meeting
                                                </button>
                                            </div>
                                            <button
                                                onClick={handleDelete}
                                                className="flex items-center justify-center sm:justify-start px-3 sm:px-4 py-2 rounded-lg text-red-500 hover:bg-red-500/10 text-xs sm:text-sm font-bold transition-colors"
                                            >
                                                <Trash2 size={14} className="mr-1.5 sm:mr-2" /> Delete Lead
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </Modal>

                {/* Add Lead Modal */}
                <AddLeadModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onSubmit={handleAddSubmit}
                />
            </div>
        </div>
    );
};

export default LeadsDashboard;
