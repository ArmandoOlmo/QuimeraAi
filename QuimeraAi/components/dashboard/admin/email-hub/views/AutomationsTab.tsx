/**
 * AutomationsTab — Full-featured automation view with visual workflow builder
 *
 * Features:
 *   - Stats cards (total, active, triggered, conversion)
 *   - Searchable/filterable automation list with category tabs
 *   - Visual node-based workflow builder (create & edit)
 *   - Automation detail side panel
 *   - Template gallery with 10 pre-built flows
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Zap, Play, Pause, Trash2, Copy, Edit2, Plus, Search, X, ChevronDown,
    ChevronRight, Mail, Clock, GitBranch, Tag, Loader2, ArrowRight,
    MoreVertical, Eye, Settings2, Users, Target, Activity,
    CheckCircle, AlertTriangle, AlertCircle, Sparkles, BarChart3, Filter,
} from 'lucide-react';

// Simple unique ID generator (no external dependency)
const genId = () => Math.random().toString(36).substring(2, 10);

import type { EmailAutomation, AutomationWorkflowStep, AutomationCategory } from '../../../../../types/email';
import type { AutomationTemplate, AutomationCategoryFilter, CrossTenantAudience, ConfirmModalState } from '../types';
import { AUTOMATION_TEMPLATES } from '../types';
import {
    formatDate, getStatusColor, getStatusIcon, formatDelay,
    getNodeColor, getNodeBorderColor, getNodeBgColor, getNodeTextColor,
    formatTriggerEvent, calculateWorkflowDuration,
    getCategoryLabel, getCategoryColor,
} from '../helpers';

// =============================================================================
// TYPES
// =============================================================================

interface AutomationsTabProps {
    automations: EmailAutomation[];
    audiences: CrossTenantAudience[];
    // Actions from useAdminEmailActions
    showCreateAutomation: boolean;
    setShowCreateAutomation: (v: boolean) => void;
    selectedTemplate: AutomationTemplate | null;
    setSelectedTemplate: (v: AutomationTemplate | null) => void;
    newAutomation: {
        name: string; subject: string; description: string; delayMinutes: number;
        status: any; steps: AutomationWorkflowStep[]; category: AutomationCategory;
        audienceId: string;
    };
    setNewAutomation: React.Dispatch<React.SetStateAction<{
        name: string; subject: string; description: string; delayMinutes: number;
        status: any; steps: AutomationWorkflowStep[]; category: AutomationCategory;
        audienceId: string;
    }>>;
    editingAutomationId: string | null;
    setEditingAutomationId: (v: string | null) => void;
    createAutomation: () => Promise<void>;
    updateAutomation: () => Promise<void>;
    duplicateAutomation: (automation: EmailAutomation) => Promise<void>;
    toggleAutomationStatus: (automation: EmailAutomation) => Promise<void>;
    deleteAutomation: (automationId: string) => Promise<void>;
    openEditAutomation: (automation: EmailAutomation) => void;
    confirmModal: ConfirmModalState;
    setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModalState>>;
    // Email ↔ Automation integration
    onDesignEmail?: (step: AutomationWorkflowStep, automationName: string) => void;
}

// =============================================================================
// NODE ICONS
// =============================================================================

const NodeIcon: React.FC<{ type: string; size?: number }> = ({ type, size = 16 }) => {
    switch (type) {
        case 'trigger': return <Zap size={size} />;
        case 'email': return <Mail size={size} />;
        case 'delay': return <Clock size={size} />;
        case 'condition': return <GitBranch size={size} />;
        case 'action': return <Tag size={size} />;
        default: return <Zap size={size} />;
    }
};

const getNodeTypeLabel = (type: string, t: any): string => {
    switch (type) {
        case 'trigger': return t('adminEmail.automations.nodeTrigger');
        case 'email': return t('adminEmail.automations.nodeEmail');
        case 'delay': return t('adminEmail.automations.nodeDelay');
        case 'condition': return t('adminEmail.automations.nodeCondition');
        case 'action': return t('adminEmail.automations.nodeAction');
        default: return type;
    }
};

// =============================================================================
// WORKFLOW NODE COMPONENT
// =============================================================================

const WorkflowNode: React.FC<{
    step: AutomationWorkflowStep;
    index: number;
    totalSteps: number;
    isExpanded: boolean;
    onToggle: () => void;
    onUpdate: (step: AutomationWorkflowStep) => void;
    onDelete: () => void;
    readOnly?: boolean;
    onDesignEmail?: (step: AutomationWorkflowStep) => void;
}> = ({ step, index, totalSteps, isExpanded, onToggle, onUpdate, onDelete, readOnly, onDesignEmail }) => {
    const { t } = useTranslation();
    const borderColor = getNodeBorderColor(step.type);
    const bgColor = getNodeBgColor(step.type);
    const textColor = getNodeTextColor(step.type);
    const gradientColor = getNodeColor(step.type);

    return (
        <div className="relative">
            {/* Connector line ABOVE this node (skip for first node) */}
            {index > 0 && (
                <div className="flex justify-center -mt-1 mb-1">
                    <div className="w-0.5 h-6 bg-gradient-to-b from-editor-border to-editor-border/50" />
                </div>
            )}

            {/* Node card */}
            <div
                className={`group relative border rounded-xl transition-all duration-200 cursor-pointer
                    ${borderColor} ${bgColor} hover:shadow-lg hover:shadow-black/10
                    ${isExpanded ? 'ring-1 ring-white/10' : ''}`}
                onClick={onToggle}
            >
                {/* Node Header */}
                <div className="flex items-center gap-3 px-4 py-3">
                    {/* Node type icon with gradient circle */}
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradientColor} flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
                        <NodeIcon type={step.type} size={18} />
                    </div>

                    {/* Label & subtitle */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${textColor}`}>
                                {getNodeTypeLabel(step.type, t)}
                            </span>
                            {step.type === 'delay' && step.delayConfig && (
                                <span className="text-[10px] text-editor-text-secondary bg-editor-bg/60 px-1.5 py-0.5 rounded-md">
                                    {formatDelay(step.delayConfig.delayMinutes)}
                                </span>
                            )}
                        </div>
                        <p className="text-sm font-medium text-editor-text-primary truncate mt-0.5">
                            {step.label}
                        </p>
                        {/* Subtitle info */}
                        {step.type === 'email' && step.emailConfig?.subject && (
                            <p className="text-xs text-editor-text-secondary truncate mt-0.5">
                                Asunto: {step.emailConfig.subject}
                            </p>
                        )}
                        {/* Email content status badge */}
                        {step.type === 'email' && (
                            <div className="flex items-center gap-1.5 mt-1">
                                {step.emailConfig?.emailDocumentId || step.emailConfig?.campaignId ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-400 bg-green-500/10 border border-green-500/20 rounded-md px-1.5 py-0.5">
                                        <CheckCircle size={10} /> Contenido diseñado
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-1.5 py-0.5">
                                        <AlertCircle size={10} /> Sin contenido
                                    </span>
                                )}
                            </div>
                        )}
                        {step.type === 'condition' && step.conditionConfig && (
                            <p className="text-xs text-editor-text-secondary truncate mt-0.5">
                                {step.conditionConfig.conditionType === 'email-opened' ? 'Si abrió el email' :
                                 step.conditionConfig.conditionType === 'email-clicked' ? 'Si hizo clic' :
                                 step.conditionConfig.conditionType === 'purchase-made' ? 'Si realizó compra' :
                                 step.conditionConfig.conditionType === 'has-tag' ? `Tiene tag: ${step.conditionConfig.tagName}` :
                                 'Condición personalizada'}
                            </p>
                        )}
                        {step.type === 'action' && step.actionConfig && (
                            <p className="text-xs text-editor-text-secondary truncate mt-0.5">
                                {step.actionConfig.actionType === 'add-tag' ? `Añadir tag: ${step.actionConfig.tagName}` :
                                 step.actionConfig.actionType === 'remove-tag' ? `Quitar tag: ${step.actionConfig.tagName}` :
                                 step.actionConfig.actionType === 'move-to-audience' ? 'Mover a audiencia' :
                                 step.actionConfig.actionType === 'send-notification' ? 'Enviar notificación' :
                                 'Actualizar campo'}
                            </p>
                        )}
                    </div>

                    {/* Expand/collapse + delete */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {!readOnly && step.type !== 'trigger' && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 size={13} className="text-red-400" />
                            </button>
                        )}
                        <ChevronDown
                            size={16}
                            className={`text-editor-text-secondary transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        />
                    </div>
                </div>

                {/* Expanded Config Panel */}
                {isExpanded && !readOnly && (
                    <div className="px-4 pb-4 pt-1 border-t border-editor-border/30 space-y-3" onClick={(e) => e.stopPropagation()}>
                        {/* Label edit for all types */}
                        <div>
                            <label className="text-[10px] font-bold text-editor-text-secondary uppercase tracking-wider mb-1 block">{t('adminEmail.automations.stepName')}</label>
                            <input
                                type="text"
                                value={step.label}
                                onChange={(e) => onUpdate({ ...step, label: e.target.value })}
                                className="w-full bg-editor-bg/60 border border-editor-border/50 rounded-lg px-3 py-1.5 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
                            />
                        </div>

                        {/* Type-specific config */}
                        {step.type === 'email' && (
                            <>
                                <div>
                                    <label className="text-[10px] font-bold text-editor-text-secondary uppercase tracking-wider mb-1 block">{t('adminEmail.automations.emailConfig.subject')}</label>
                                    <input
                                        type="text"
                                        value={step.emailConfig?.subject || ''}
                                        onChange={(e) => onUpdate({ ...step, emailConfig: { ...step.emailConfig!, subject: e.target.value } })}
                                        className="w-full bg-editor-bg/60 border border-editor-border/50 rounded-lg px-3 py-1.5 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
                                        placeholder={t('adminEmail.automations.emailConfig.subjectPlaceholder')}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-editor-text-secondary uppercase tracking-wider mb-1 block">{t('adminEmail.automations.emailConfig.previewText')}</label>
                                    <input
                                        type="text"
                                        value={step.emailConfig?.previewText || ''}
                                        onChange={(e) => onUpdate({ ...step, emailConfig: { ...step.emailConfig!, previewText: e.target.value } })}
                                        className="w-full bg-editor-bg/60 border border-editor-border/50 rounded-lg px-3 py-1.5 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
                                        placeholder={t('adminEmail.automations.emailConfig.previewTextPlaceholder')}
                                    />
                                </div>
                                {/* Design email button */}
                                {onDesignEmail && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDesignEmail(step); }}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                                            step.emailConfig?.emailDocumentId || step.emailConfig?.campaignId
                                                ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                                                : 'bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20'
                                        }`}
                                    >
                                        <Edit2 size={14} />
                                        {step.emailConfig?.emailDocumentId || step.emailConfig?.campaignId
                                            ? t('adminEmail.detailPanel.editVisual')
                                            : t('adminEmail.detailPanel.editVisualDesc').replace('Modifica el', 'Diseñar')}
                                    </button>
                                )}
                            </>
                        )}

                        {step.type === 'delay' && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-editor-text-secondary uppercase tracking-wider mb-1 block">{t('adminEmail.automations.delayConfig.waitTime')}</label>
                                    <input
                                        type="number"
                                        value={step.delayConfig?.delayMinutes || 60}
                                        onChange={(e) => onUpdate({ ...step, delayConfig: { ...step.delayConfig!, delayMinutes: parseInt(e.target.value) || 0 } })}
                                        className="w-full bg-editor-bg/60 border border-editor-border/50 rounded-lg px-3 py-1.5 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
                                        min={0}
                                    />
                                    <p className="text-[10px] text-editor-text-secondary mt-1">= {formatDelay(step.delayConfig?.delayMinutes || 0)}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-editor-text-secondary uppercase tracking-wider mb-1 block">{t('adminEmail.automations.delayConfig.type')}</label>
                                    <select
                                        value={step.delayConfig?.delayType || 'fixed'}
                                        onChange={(e) => onUpdate({ ...step, delayConfig: { ...step.delayConfig!, delayType: e.target.value as 'fixed' | 'until-time' } })}
                                        className="w-full bg-editor-bg/60 border border-editor-border/50 rounded-lg px-3 py-1.5 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
                                    >
                                        <option value="fixed">{t('adminEmail.automations.delayConfig.fixedTime')}</option>
                                        <option value="until-time">{t('adminEmail.automations.delayConfig.untilTimeOfDay')}</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {step.type === 'condition' && (
                            <div>
                                <label className="text-[10px] font-bold text-editor-text-secondary uppercase tracking-wider mb-1 block">{t('adminEmail.automations.conditionConfig.conditionType')}</label>
                                <select
                                    value={step.conditionConfig?.conditionType || 'email-opened'}
                                    onChange={(e) => onUpdate({ ...step, conditionConfig: { ...step.conditionConfig!, conditionType: e.target.value as any } })}
                                    className="w-full bg-editor-bg/60 border border-editor-border/50 rounded-lg px-3 py-1.5 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
                                >
                                    <option value="email-opened">{t('adminEmail.automations.conditionConfig.emailOpened')}</option>
                                    <option value="email-clicked">{t('adminEmail.automations.conditionConfig.emailClicked')}</option>
                                    <option value="purchase-made">{t('adminEmail.automations.conditionConfig.purchaseMade')}</option>
                                    <option value="has-tag">{t('adminEmail.automations.conditionConfig.hasTag')}</option>
                                    <option value="custom">{t('adminEmail.automations.conditionConfig.custom')}</option>
                                </select>
                                {step.conditionConfig?.conditionType === 'has-tag' && (
                                    <input
                                        type="text"
                                        value={step.conditionConfig?.tagName || ''}
                                        onChange={(e) => onUpdate({ ...step, conditionConfig: { ...step.conditionConfig!, tagName: e.target.value } })}
                                        className="w-full mt-2 bg-editor-bg/60 border border-editor-border/50 rounded-lg px-3 py-1.5 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
                                        placeholder={t('adminEmail.automations.conditionConfig.tagPlaceholder')}
                                    />
                                )}
                            </div>
                        )}

                        {step.type === 'action' && (
                            <>
                                <div>
                                    <label className="text-[10px] font-bold text-editor-text-secondary uppercase tracking-wider mb-1 block">{t('adminEmail.automations.actionConfig.actionType')}</label>
                                    <select
                                        value={step.actionConfig?.actionType || 'add-tag'}
                                        onChange={(e) => onUpdate({ ...step, actionConfig: { ...step.actionConfig!, actionType: e.target.value as any } })}
                                        className="w-full bg-editor-bg/60 border border-editor-border/50 rounded-lg px-3 py-1.5 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
                                    >
                                        <option value="add-tag">{t('adminEmail.automations.actionConfig.addTag')}</option>
                                        <option value="remove-tag">{t('adminEmail.automations.actionConfig.removeTag')}</option>
                                        <option value="move-to-audience">{t('adminEmail.automations.actionConfig.moveToAudience')}</option>
                                        <option value="update-field">{t('adminEmail.automations.actionConfig.updateField')}</option>
                                        <option value="send-notification">{t('adminEmail.automations.actionConfig.sendNotification')}</option>
                                    </select>
                                </div>
                                {(step.actionConfig?.actionType === 'add-tag' || step.actionConfig?.actionType === 'remove-tag') && (
                                    <div>
                                        <label className="text-[10px] font-bold text-editor-text-secondary uppercase tracking-wider mb-1 block">{t('adminEmail.automations.conditionConfig.tagName')}</label>
                                        <input
                                            type="text"
                                            value={step.actionConfig?.tagName || ''}
                                            onChange={(e) => onUpdate({ ...step, actionConfig: { ...step.actionConfig!, tagName: e.target.value } })}
                                            className="w-full bg-editor-bg/60 border border-editor-border/50 rounded-lg px-3 py-1.5 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
                                            placeholder={t('adminEmail.automations.conditionConfig.tagPlaceholder')}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Connector line BELOW this node */}
            {index < totalSteps - 1 && (
                <div className="flex justify-center mt-1 -mb-1">
                    <div className="w-0.5 h-4 bg-gradient-to-b from-editor-border/50 to-editor-border" />
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                        <ArrowRight size={10} className="text-editor-border rotate-90" />
                    </div>
                </div>
            )}
        </div>
    );
};

// =============================================================================
// ADD STEP DROPDOWN
// =============================================================================

const AddStepButton: React.FC<{
    onAdd: (type: AutomationWorkflowStep['type']) => void;
}> = ({ onAdd }) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    const options: { type: AutomationWorkflowStep['type']; label: string; icon: React.ReactNode; desc: string }[] = [
        { type: 'email', label: t('adminEmail.automations.nodeEmail'), icon: <Mail size={16} />, desc: t('adminEmail.automations.addStepEmailDesc') },
        { type: 'delay', label: t('adminEmail.automations.nodeDelay'), icon: <Clock size={16} />, desc: t('adminEmail.automations.addStepDelayDesc') },
        { type: 'condition', label: t('adminEmail.automations.nodeCondition'), icon: <GitBranch size={16} />, desc: t('adminEmail.automations.addStepConditionDesc') },
        { type: 'action', label: t('adminEmail.automations.nodeAction'), icon: <Tag size={16} />, desc: t('adminEmail.automations.addStepActionDesc') },
    ];

    return (
        <div className="relative flex justify-center my-2">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-editor-bg border border-dashed border-editor-border/60 rounded-lg
                    text-xs text-editor-text-secondary hover:text-editor-accent hover:border-editor-accent/40 transition-all group"
            >
                <Plus size={14} className="group-hover:rotate-90 transition-transform duration-200" />
                {t('adminEmail.automations.addStep')}
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
                    <div className="absolute top-full mt-1 z-40 bg-editor-bg border border-editor-border rounded-xl shadow-2xl shadow-black/30 overflow-hidden w-56">
                        {options.map(opt => (
                            <button
                                key={opt.type}
                                onClick={() => { onAdd(opt.type); setOpen(false); }}
                                className="flex items-center gap-3 w-full px-4 py-3 hover:bg-editor-panel-bg transition-colors text-left"
                            >
                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getNodeColor(opt.type)} flex items-center justify-center text-white flex-shrink-0`}>
                                    {opt.icon}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-editor-text-primary">{opt.label}</p>
                                    <p className="text-[10px] text-editor-text-secondary">{opt.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const AutomationsTab: React.FC<AutomationsTabProps> = ({
    automations,
    audiences,
    showCreateAutomation,
    setShowCreateAutomation,
    selectedTemplate,
    setSelectedTemplate,
    newAutomation,
    setNewAutomation,
    editingAutomationId,
    setEditingAutomationId,
    createAutomation,
    updateAutomation,
    duplicateAutomation,
    toggleAutomationStatus,
    deleteAutomation,
    openEditAutomation,
    confirmModal,
    setConfirmModal,
    onDesignEmail,
}) => {
    const { t } = useTranslation();
    // Local state
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<AutomationCategoryFilter>('all');
    const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
    const [detailAutomation, setDetailAutomation] = useState<EmailAutomation | null>(null);
    const [showTemplateGallery, setShowTemplateGallery] = useState(false);

    // Computed stats
    const stats = useMemo(() => {
        const active = automations.filter(a => a.status === 'active').length;
        const totalTriggered = automations.reduce((sum, a) => sum + (a.stats?.triggered || 0), 0);
        const totalSent = automations.reduce((sum, a) => sum + (a.stats?.sent || 0), 0);
        const totalConverted = automations.reduce((sum, a) => sum + (a.stats?.converted || 0), 0);
        const convRate = totalSent > 0 ? ((totalConverted / totalSent) * 100).toFixed(1) : '0.0';
        return { total: automations.length, active, totalTriggered, totalSent, convRate };
    }, [automations]);

    // Filtered automations
    const filteredAutomations = useMemo(() => {
        return automations.filter(a => {
            const matchSearch = searchTerm === '' ||
                a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.type?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchCategory = categoryFilter === 'all' || a.category === categoryFilter;
            return matchSearch && matchCategory;
        });
    }, [automations, searchTerm, categoryFilter]);

    // Categories for filter
    const categories: { id: AutomationCategoryFilter; label: string; count: number }[] = [
        { id: 'all', label: t('adminEmail.automations.allCategories'), count: automations.length },
        { id: 'lifecycle', label: t('adminEmail.automations.catLifecycle'), count: automations.filter(a => a.category === 'lifecycle').length },
        { id: 'conversion', label: t('adminEmail.automations.catConversion'), count: automations.filter(a => a.category === 'conversion').length },
        { id: 'engagement', label: t('adminEmail.automations.catEngagement'), count: automations.filter(a => a.category === 'engagement').length },
        { id: 'retention', label: t('adminEmail.automations.catRetention'), count: automations.filter(a => a.category === 'retention').length },
    ];

    // ==== Workflow Builder Helpers ====

    const handleAddStep = (type: AutomationWorkflowStep['type']) => {
        const id = genId();
        const order = newAutomation.steps.length;
        let newStep: AutomationWorkflowStep = { id, type, label: '', order };

        switch (type) {
            case 'email':
                newStep.label = 'Nuevo Email';
                newStep.emailConfig = { subject: '' };
                break;
            case 'delay':
                newStep.label = 'Esperar';
                newStep.delayConfig = { delayMinutes: 1440, delayType: 'fixed' };
                break;
            case 'condition':
                newStep.label = 'Condición';
                newStep.conditionConfig = { conditionType: 'email-opened' };
                break;
            case 'action':
                newStep.label = 'Acción';
                newStep.actionConfig = { actionType: 'add-tag', tagName: '' };
                break;
        }

        setNewAutomation(prev => ({
            ...prev,
            steps: [...prev.steps, newStep],
        }));
    };

    const handleUpdateStep = (updatedStep: AutomationWorkflowStep) => {
        setNewAutomation(prev => ({
            ...prev,
            steps: prev.steps.map(s => s.id === updatedStep.id ? updatedStep : s),
        }));
    };

    const handleDeleteStep = (stepId: string) => {
        setNewAutomation(prev => ({
            ...prev,
            steps: prev.steps.filter(s => s.id !== stepId).map((s, i) => ({ ...s, order: i })),
        }));
    };

    const handleSelectTemplateAndOpen = (template: AutomationTemplate) => {
        setSelectedTemplate(template);
        // Deep clone the steps with fresh IDs
        const freshSteps = template.defaultSteps.map((step, i) => ({
            ...JSON.parse(JSON.stringify(step)),
            id: genId(),
            order: i,
        }));
        setNewAutomation({
            name: template.name,
            subject: '',
            description: template.description,
            delayMinutes: template.defaultDelay,
            status: 'draft',
            steps: freshSteps,
            category: template.category,
            audienceId: '',
        });
        setEditingAutomationId(null);
        setShowTemplateGallery(false);
        setShowCreateAutomation(true);
    };

    const handleCloseBuilder = () => {
        setShowCreateAutomation(false);
        setSelectedTemplate(null);
        setEditingAutomationId(null);
        setNewAutomation({ name: '', subject: '', description: '', delayMinutes: 60, status: 'draft', steps: [], category: 'lifecycle', audienceId: '' });
        setExpandedNodeId(null);
    };

    // ===========================================================================
    // RENDER: Workflow Builder (full screen overlay)
    // ===========================================================================

    if (showCreateAutomation) {
        const isEditing = !!editingAutomationId;

        return (
            <div className="space-y-0">
                {/* Builder Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button onClick={handleCloseBuilder} className="p-2 hover:bg-editor-border/40 rounded-lg transition-colors">
                            <X size={20} className="text-editor-text-secondary" />
                        </button>
                        <div>
                            <h2 className="text-lg font-bold text-editor-text-primary">
                                {isEditing ? t('adminEmail.automations.editAutomation') : t('adminEmail.automations.newAutomation')}
                            </h2>
                            <p className="text-xs text-editor-text-secondary">
                                {isEditing ? t('adminEmail.automations.modifyFlow') : t('adminEmail.automations.setupFlow')}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleCloseBuilder}
                            className="px-4 py-2 text-sm text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                        >
                            {t('adminEmail.automations.cancel')}
                        </button>
                        <button
                            onClick={isEditing ? updateAutomation : createAutomation}
                            disabled={!newAutomation.name}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-bold rounded-xl
                                hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <CheckCircle size={16} />
                            {isEditing ? t('adminEmail.automations.saveChanges') : t('adminEmail.automations.createAutomation')}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Config Panel */}
                    <div className="space-y-4">
                        <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-5 space-y-4">
                            <h3 className="text-sm font-bold text-editor-text-secondary uppercase tracking-wider">{t('adminEmail.automations.config')}</h3>

                            <div>
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">{t('adminEmail.automations.name')}</label>
                                <input
                                    type="text"
                                    value={newAutomation.name}
                                    onChange={e => setNewAutomation(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full bg-editor-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    placeholder={t('adminEmail.automations.namePlaceholder')}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">{t('adminEmail.automations.description')}</label>
                                <textarea
                                    value={newAutomation.description}
                                    onChange={e => setNewAutomation(prev => ({ ...prev, description: e.target.value }))}
                                    rows={2}
                                    className="w-full bg-editor-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                                    placeholder={t('adminEmail.automations.descPlaceholder')}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">{t('adminEmail.automations.category')}</label>
                                <select
                                    value={newAutomation.category}
                                    onChange={e => setNewAutomation(prev => ({ ...prev, category: e.target.value as AutomationCategory }))}
                                    className="w-full bg-editor-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                >
                                    <option value="lifecycle">🔄 {t('adminEmail.automations.catLifecycle')}</option>
                                    <option value="conversion">💰 {t('adminEmail.automations.catConversion')}</option>
                                    <option value="engagement">💬 {t('adminEmail.automations.catEngagement')}</option>
                                    <option value="retention">🔒 {t('adminEmail.automations.catRetention')}</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">{t('adminEmail.automations.targetAudience')}</label>
                                <select
                                    value={newAutomation.audienceId}
                                    onChange={e => setNewAutomation(prev => ({ ...prev, audienceId: e.target.value }))}
                                    className="w-full bg-editor-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                >
                                    <option value="">{t('adminEmail.automations.allMatchingTrigger')}</option>
                                    {audiences.map(a => (
                                        <option key={a.id} value={a.id}>{a.name} ({a.estimatedCount || a.staticMemberCount || 0} contactos)</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">{t('adminEmail.automations.initialStatus')}</label>
                                <select
                                    value={newAutomation.status}
                                    onChange={e => setNewAutomation(prev => ({ ...prev, status: e.target.value as any }))}
                                    className="w-full bg-editor-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                >
                                    <option value="draft">{t('adminEmail.automations.draftStatus')}</option>
                                    <option value="active">{t('adminEmail.automations.activeStatus')}</option>
                                    <option value="paused">{t('adminEmail.automations.pausedStatus')}</option>
                                </select>
                            </div>
                        </div>

                        {/* Flow summary */}
                        <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-5">
                            <h3 className="text-sm font-bold text-editor-text-secondary uppercase tracking-wider mb-3">{t('adminEmail.automations.flowSummary')}</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-editor-text-secondary">
                                    <span>{t('adminEmail.automations.totalSteps')}</span>
                                    <span className="text-editor-text-primary font-medium">{newAutomation.steps.length}</span>
                                </div>
                                <div className="flex justify-between text-editor-text-secondary">
                                    <span>{t('adminEmail.automations.emails')}</span>
                                    <span className="text-editor-text-primary font-medium">{newAutomation.steps.filter(s => s.type === 'email').length}</span>
                                </div>
                                <div className="flex justify-between text-editor-text-secondary">
                                    <span>{t('adminEmail.automations.totalDuration')}</span>
                                    <span className="text-editor-text-primary font-medium">{calculateWorkflowDuration(newAutomation.steps)}</span>
                                </div>
                                <div className="flex justify-between text-editor-text-secondary">
                                    <span>{t('adminEmail.automations.conditions')}</span>
                                    <span className="text-editor-text-primary font-medium">{newAutomation.steps.filter(s => s.type === 'condition').length}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Center + Right: Visual Workflow Builder */}
                    <div className="lg:col-span-2">
                        <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-6 min-h-[500px]">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-editor-text-secondary uppercase tracking-wider flex items-center gap-2">
                                    <Zap size={14} className="text-editor-accent" />
                                    {t('adminEmail.automations.workflow')}
                                </h3>
                                <span className="text-[10px] text-editor-text-secondary bg-editor-bg px-2 py-0.5 rounded-md">
                                    {t('adminEmail.automations.steps', { count: newAutomation.steps.length })}
                                </span>
                            </div>

                            {/* Timeline indicator */}
                            {newAutomation.steps.length > 0 && (
                                <div className="flex items-center gap-2 mb-5 px-3 py-2 bg-editor-bg/50 rounded-lg border border-editor-border/30">
                                    <Clock size={12} className="text-editor-text-secondary flex-shrink-0" />
                                    <span className="text-[10px] text-editor-text-secondary">{t('adminEmail.automations.flowDuration')}</span>
                                    <span className="text-[10px] font-medium text-editor-text-primary">{calculateWorkflowDuration(newAutomation.steps)}</span>
                                    <span className="text-[10px] text-editor-text-secondary mx-1">•</span>
                                    <span className="text-[10px] text-editor-text-secondary">{newAutomation.steps.filter(s => s.type === 'email').length} {t('adminEmail.automations.emails').toLowerCase()}</span>
                                </div>
                            )}

                            {/* Nodes */}
                            <div className="relative max-w-md mx-auto space-y-0">
                                {newAutomation.steps.map((step, index) => (
                                    <React.Fragment key={step.id}>
                                        <WorkflowNode
                                            step={step}
                                            index={index}
                                            totalSteps={newAutomation.steps.length}
                                            isExpanded={expandedNodeId === step.id}
                                            onToggle={() => setExpandedNodeId(expandedNodeId === step.id ? null : step.id)}
                                            onUpdate={handleUpdateStep}
                                            onDelete={() => handleDeleteStep(step.id)}
                                            onDesignEmail={onDesignEmail ? (s) => onDesignEmail(s, newAutomation.name) : undefined}
                                        />
                                        {/* Add step button between nodes */}
                                        {index < newAutomation.steps.length - 1 && (
                                            <AddStepButton onAdd={(type) => {
                                                const id = genId();
                                                let newStep: AutomationWorkflowStep = { id, type, label: '', order: index + 1 };
                                                switch (type) {
                                                    case 'email': newStep.label = 'Nuevo Email'; newStep.emailConfig = { subject: '' }; break;
                                                    case 'delay': newStep.label = 'Esperar'; newStep.delayConfig = { delayMinutes: 1440, delayType: 'fixed' }; break;
                                                    case 'condition': newStep.label = 'Condición'; newStep.conditionConfig = { conditionType: 'email-opened' }; break;
                                                    case 'action': newStep.label = 'Acción'; newStep.actionConfig = { actionType: 'add-tag', tagName: '' }; break;
                                                }
                                                setNewAutomation(prev => {
                                                    const newSteps = [...prev.steps];
                                                    newSteps.splice(index + 1, 0, newStep);
                                                    return { ...prev, steps: newSteps.map((s, i) => ({ ...s, order: i })) };
                                                });
                                            }} />
                                        )}
                                    </React.Fragment>
                                ))}

                                {/* Final add step button */}
                                <AddStepButton onAdd={handleAddStep} />

                                {/* Empty state */}
                                {newAutomation.steps.length === 0 && (
                                    <div className="text-center py-12">
                                        <Zap size={40} className="mx-auto text-editor-text-secondary/30 mb-3" />
                                        <p className="text-sm text-editor-text-secondary mb-1">{t('adminEmail.automations.noStepsInFlow')}</p>
                                        <p className="text-xs text-editor-text-secondary/60">{t('adminEmail.automations.useAddStepToStart')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ===========================================================================
    // RENDER: Main Automations list view
    // ===========================================================================

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-editor-text-primary">{t('adminEmail.automations.title')}</h2>
                    <p className="text-sm text-editor-text-secondary">{t('adminEmail.automations.subtitle')}</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowTemplateGallery(!showTemplateGallery)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-editor-panel-bg border border-editor-border text-sm font-medium text-editor-text-primary rounded-xl hover:border-editor-accent/30 transition-all"
                    >
                        <Sparkles size={16} className="text-purple-400" />
                        {t('adminEmail.automations.templates')}
                    </button>
                    <button
                        onClick={() => {
                            setNewAutomation({ name: '', subject: '', description: '', delayMinutes: 60, status: 'draft', steps: [{ id: genId(), type: 'trigger', label: 'Trigger', order: 0 }], category: 'lifecycle', audienceId: '' });
                            setEditingAutomationId(null);
                            setSelectedTemplate(null);
                            setShowCreateAutomation(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-purple-500/20 transition-all"
                    >
                        <Plus size={16} />
                        {t('adminEmail.automations.newAutomation')}
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: t('adminEmail.automations.total'), value: stats.total, icon: <Zap size={18} />, gradient: 'from-purple-500/20 to-blue-500/20', border: 'border-purple-500/20', textColor: 'text-purple-400' },
                    { label: t('adminEmail.automations.active').replace('✅ ', ''), value: stats.active, icon: <Play size={18} />, gradient: 'from-green-500/20 to-emerald-500/20', border: 'border-green-500/20', textColor: 'text-green-400' },
                    { label: t('adminEmail.automations.activations'), value: stats.totalTriggered.toLocaleString(), icon: <Activity size={18} />, gradient: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/20', textColor: 'text-blue-400' },
                    { label: t('adminEmail.automations.convRate'), value: `${stats.convRate}%`, icon: <Target size={18} />, gradient: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/20', textColor: 'text-amber-400' },
                ].map((stat, i) => (
                    <div key={i} className={`bg-gradient-to-br ${stat.gradient} border ${stat.border} rounded-xl p-4`}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={stat.textColor}>{stat.icon}</span>
                            <span className="text-xs font-medium text-editor-text-secondary uppercase tracking-wider">{stat.label}</span>
                        </div>
                        <p className="text-2xl font-bold text-editor-text-primary">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Category Tabs + Search */}
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Category pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setCategoryFilter(cat.id)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                                    categoryFilter === cat.id
                                        ? 'bg-editor-accent/20 text-editor-accent border border-editor-accent/30'
                                        : 'bg-editor-bg/50 text-editor-text-secondary border border-transparent hover:text-editor-text-primary hover:bg-editor-bg'
                                }`}
                            >
                                {cat.label}
                                {cat.count > 0 && <span className="ml-1.5 opacity-60">({cat.count})</span>}
                            </button>
                        ))}
                    </div>
                    {/* Search */}
                    <div className="flex-1 flex items-center gap-2 bg-editor-bg/50 rounded-lg px-3 py-2 md:max-w-xs md:ml-auto">
                        <Search size={14} className="text-editor-text-secondary flex-shrink-0" />
                        <input
                            type="text"
                            placeholder={t('adminEmail.automations.searchAutomations')}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="flex-1 bg-transparent outline-none text-sm text-editor-text-primary placeholder:text-editor-text-secondary"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="text-editor-text-secondary hover:text-editor-text-primary">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Template Gallery (collapsible) */}
            {showTemplateGallery && (
                <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-6 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-editor-text-secondary uppercase tracking-wider flex items-center gap-2">
                            <Sparkles size={14} className="text-purple-400" />
                            {t('adminEmail.automations.templates')}
                        </h3>
                        <button onClick={() => setShowTemplateGallery(false)} className="p-1.5 hover:bg-editor-border/40 rounded-lg">
                            <X size={16} className="text-editor-text-secondary" />
                        </button>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                        {AUTOMATION_TEMPLATES.map(template => (
                            <button
                                key={template.id}
                                onClick={() => handleSelectTemplateAndOpen(template)}
                                className="flex flex-col items-start gap-2.5 p-4 bg-editor-bg border border-editor-border rounded-xl
                                    hover:border-editor-accent/30 hover:shadow-lg hover:shadow-black/10 transition-all text-left group"
                            >
                                <div className={`p-2.5 rounded-xl ${template.color} transition-transform group-hover:scale-110`}>
                                    {template.icon}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-editor-text-primary">{template.name}</p>
                                    <p className="text-[10px] text-editor-text-secondary mt-0.5 line-clamp-2">{template.description}</p>
                                </div>
                                <div className="flex items-center gap-2 w-full">
                                    <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${getCategoryColor(template.category)}`}>
                                        {getCategoryLabel(template.category)}
                                    </span>
                                    <span className="text-[9px] text-editor-text-secondary ml-auto">{t('adminEmail.automations.steps', { count: template.defaultSteps.length })}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Automations List */}
            {filteredAutomations.length > 0 ? (
                <div className="bg-editor-panel-bg border border-editor-border rounded-xl overflow-hidden">
                    <div className="divide-y divide-editor-border">
                        {filteredAutomations.map(auto => (
                            <div
                                key={auto.id}
                                className="flex items-center gap-4 px-5 py-4 hover:bg-editor-bg/50 transition-colors cursor-pointer group"
                                onClick={() => setDetailAutomation(auto)}
                            >
                                {/* Icon */}
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                    AUTOMATION_TEMPLATES.find(t => t.type === auto.type)?.color || 'text-gray-400 bg-gray-500/10'
                                }`}>
                                    {AUTOMATION_TEMPLATES.find(t => t.type === auto.type)?.icon || <Zap size={20} />}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-editor-text-primary truncate">{auto.name}</p>
                                        {auto.category && (
                                            <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${getCategoryColor(auto.category)}`}>
                                                {getCategoryLabel(auto.category)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-editor-text-secondary mt-0.5">
                                        <span className="flex items-center gap-1">
                                            <Zap size={10} />
                                            {formatTriggerEvent(auto.triggerConfig?.event || '')}
                                        </span>
                                        {auto.steps && auto.steps.length > 0 && (
                                            <span className="flex items-center gap-1">
                                                <Settings2 size={10} />
                                                {t('adminEmail.automations.steps', { count: auto.steps.length })}
                                            </span>
                                        )}
                                        {auto.steps && auto.steps.length > 0 && (
                                            <span className="flex items-center gap-1">
                                                <Clock size={10} />
                                                {calculateWorkflowDuration(auto.steps)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="hidden md:flex items-center gap-6 text-xs text-editor-text-secondary">
                                    <div className="text-center">
                                        <p className="font-medium text-editor-text-primary text-sm">{(auto.stats?.triggered || 0).toLocaleString()}</p>
                                        <p>{t('adminEmail.automations.activations')}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="font-medium text-editor-text-primary text-sm">{(auto.stats?.sent || 0).toLocaleString()}</p>
                                        <p>{t('adminEmail.analytics.sentCount').toLowerCase()}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="font-medium text-editor-text-primary text-sm">
                                            {auto.stats?.sent > 0 ? `${((auto.stats.opened / auto.stats.sent) * 100).toFixed(1)}%` : '—'}
                                        </p>
                                        <p>{t('adminEmail.analytics.openRateLabel').toLowerCase()}</p>
                                    </div>
                                </div>

                                {/* Status + Actions */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className={`px-2.5 py-1 text-xs rounded-full border font-medium ${getStatusColor(auto.status)}`}>
                                        {getStatusIcon(auto.status)}
                                        <span className="ml-1">{auto.status === 'active' ? t('adminEmail.automations.activeStatus').replace('✅ ', '') : auto.status === 'paused' ? t('adminEmail.automations.pausedStatus').replace('⏸️ ', '') : t('adminEmail.automations.draftStatus').replace('📝 ', '')}</span>
                                    </span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleAutomationStatus(auto); }}
                                        className="p-2 hover:bg-editor-border/40 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title={auto.status === 'active' ? 'Pausar' : 'Activar'}
                                    >
                                        {auto.status === 'active' ? <Pause size={14} className="text-amber-400" /> : <Play size={14} className="text-green-400" />}
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openEditAutomation(auto); }}
                                        className="p-2 hover:bg-editor-border/40 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="Editar"
                                    >
                                        <Edit2 size={14} className="text-editor-text-secondary" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); duplicateAutomation(auto); }}
                                        className="p-2 hover:bg-editor-border/40 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="Duplicar"
                                    >
                                        <Copy size={14} className="text-editor-text-secondary" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmModal({
                                                show: true,
                                                title: 'Eliminar Automatización',
                                                message: `¿Eliminar "${auto.name}"? Esta acción no se puede deshacer.`,
                                                onConfirm: async () => {
                                                    await deleteAutomation(auto.id);
                                                    setConfirmModal(prev => ({ ...prev, show: false }));
                                                },
                                            });
                                        }}
                                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="Eliminar"
                                    >
                                        <Trash2 size={14} className="text-red-400" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-16 bg-editor-panel-bg border border-editor-border rounded-xl">
                    <Zap size={48} className="mx-auto text-editor-text-secondary mb-4 opacity-30" />
                    <h3 className="text-lg font-medium text-editor-text-primary mb-2">
                        {searchTerm || categoryFilter !== 'all' ? 'No se encontraron automatizaciones' : 'No hay automatizaciones'}
                    </h3>
                    <p className="text-editor-text-secondary text-sm mb-6 max-w-md mx-auto">
                        {searchTerm || categoryFilter !== 'all'
                            ? 'Ajusta los filtros para ver más resultados'
                            : 'Crea flujos automáticos para enviar emails basados en el comportamiento de tus clientes'}
                    </p>
                    <div className="flex items-center justify-center gap-3">
                        <button
                            onClick={() => setShowTemplateGallery(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-editor-bg border border-editor-border text-sm font-medium text-editor-text-primary rounded-xl hover:border-editor-accent/30 transition-all"
                        >
                            <Sparkles size={16} className="text-purple-400" />
                            Usar Template
                        </button>
                        <button
                            onClick={() => {
                                setNewAutomation({ name: '', subject: '', description: '', delayMinutes: 60, status: 'draft', steps: [{ id: genId(), type: 'trigger', label: 'Trigger', order: 0 }], category: 'lifecycle', audienceId: '' });
                                setEditingAutomationId(null);
                                setShowCreateAutomation(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-bold rounded-xl"
                        >
                            <Plus size={16} />
                            Crear desde Cero
                        </button>
                    </div>
                </div>
            )}

            {/* ============ DETAIL SIDE PANEL ============ */}
            {detailAutomation && (
                <div className="fixed inset-0 z-[180] flex" onClick={() => setDetailAutomation(null)}>
                    <div className="flex-1 bg-black/40 backdrop-blur-sm" />
                    <div
                        className="w-full max-w-lg bg-editor-bg border-l border-editor-border shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Panel Header */}
                        <div className="sticky top-0 z-10 bg-editor-bg border-b border-editor-border p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                        AUTOMATION_TEMPLATES.find(t => t.type === detailAutomation.type)?.color || 'text-gray-400 bg-gray-500/10'
                                    }`}>
                                        {AUTOMATION_TEMPLATES.find(t => t.type === detailAutomation.type)?.icon || <Zap size={20} />}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-editor-text-primary truncate">{detailAutomation.name}</h3>
                                        <p className="text-xs text-editor-text-secondary">{formatTriggerEvent(detailAutomation.triggerConfig?.event || '')}</p>
                                    </div>
                                </div>
                                <button onClick={() => setDetailAutomation(null)} className="p-2 hover:bg-editor-border/40 rounded-lg transition-colors">
                                    <X size={18} className="text-editor-text-secondary" />
                                </button>
                            </div>
                        </div>

                        <div className="p-5 space-y-6">
                            {/* Status */}
                            <div>
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 block">{t('adminEmail.detailPanel.status')}</label>
                                <div className="flex items-center gap-3">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border font-medium ${getStatusColor(detailAutomation.status)}`}>
                                        {getStatusIcon(detailAutomation.status)}
                                        {detailAutomation.status === 'active' ? t('adminEmail.automations.activeStatus').replace('✅ ', '') : detailAutomation.status === 'paused' ? t('adminEmail.automations.pausedStatus').replace('⏸️ ', '') : t('adminEmail.automations.draftStatus').replace('📝 ', '')}
                                    </span>
                                    <button
                                        onClick={() => { toggleAutomationStatus(detailAutomation); setDetailAutomation({ ...detailAutomation, status: detailAutomation.status === 'active' ? 'paused' : 'active' }); }}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                            detailAutomation.status === 'active'
                                                ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                                                : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                                        }`}
                                    >
                                        {detailAutomation.status === 'active' ? 'Pausar' : 'Activar'}
                                    </button>
                                </div>
                            </div>

                            {/* Description */}
                            {detailAutomation.description && (
                                <div>
                                    <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 block">{t('adminEmail.automations.description')}</label>
                                    <p className="text-sm text-editor-text-primary bg-editor-panel-bg border border-editor-border rounded-xl px-4 py-3">
                                        {detailAutomation.description}
                                    </p>
                                </div>
                            )}

                            {/* Performance Stats */}
                            <div>
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 block flex items-center gap-1.5">
                                    <BarChart3 size={14} /> Rendimiento
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: 'Activaciones', value: (detailAutomation.stats?.triggered || 0).toLocaleString(), color: 'text-purple-400' },
                                        { label: 'Enviados', value: (detailAutomation.stats?.sent || 0).toLocaleString(), color: 'text-blue-400' },
                                        { label: 'Abiertos', value: (detailAutomation.stats?.opened || 0).toLocaleString(), color: 'text-green-400' },
                                        { label: 'Clics', value: (detailAutomation.stats?.clicked || 0).toLocaleString(), color: 'text-amber-400' },
                                        {
                                            label: 'Tasa apertura',
                                            value: detailAutomation.stats?.sent > 0
                                                ? `${((detailAutomation.stats.opened / detailAutomation.stats.sent) * 100).toFixed(1)}%`
                                                : '—',
                                            color: 'text-cyan-400',
                                        },
                                        {
                                            label: 'Conversiones',
                                            value: (detailAutomation.stats?.converted || 0).toLocaleString(),
                                            color: 'text-emerald-400',
                                        },
                                    ].map((s, i) => (
                                        <div key={i} className="bg-editor-panel-bg border border-editor-border rounded-xl p-3">
                                            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                                            <p className="text-[10px] text-editor-text-secondary uppercase tracking-wider mt-0.5">{s.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Workflow Steps Preview */}
                            {detailAutomation.steps && detailAutomation.steps.length > 0 && (
                                <div>
                                    <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 block flex items-center gap-1.5">
                                        <Zap size={14} /> {t('adminEmail.automations.workflow')} ({t('adminEmail.automations.steps', { count: detailAutomation.steps.length })})
                                    </label>
                                    <div className="relative max-w-sm space-y-0">
                                        {detailAutomation.steps
                                            .slice()
                                            .sort((a, b) => a.order - b.order)
                                            .map((step, index) => (
                                            <WorkflowNode
                                                key={step.id}
                                                step={step}
                                                index={index}
                                                totalSteps={detailAutomation.steps!.length}
                                                isExpanded={false}
                                                onToggle={() => {}}
                                                onUpdate={() => {}}
                                                onDelete={() => {}}
                                                readOnly
                                            />
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-editor-bg/50 rounded-lg border border-editor-border/30">
                                        <Clock size={12} className="text-editor-text-secondary" />
                                        <span className="text-[10px] text-editor-text-secondary">Duración total:</span>
                                        <span className="text-[10px] font-medium text-editor-text-primary">
                                            {calculateWorkflowDuration(detailAutomation.steps)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Details */}
                            <div>
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 block">{t('adminEmail.detailPanel.details')}</label>
                                <div className="bg-editor-panel-bg border border-editor-border rounded-xl divide-y divide-editor-border">
                                    <div className="flex justify-between items-center px-4 py-2.5 text-sm">
                                        <span className="text-editor-text-secondary">{t('adminEmail.detailPanel.type')}</span>
                                        <span className="text-editor-text-primary capitalize">{detailAutomation.type}</span>
                                    </div>
                                    {detailAutomation.category && (
                                        <div className="flex justify-between items-center px-4 py-2.5 text-sm">
                                            <span className="text-editor-text-secondary">{t('adminEmail.automations.category')}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-md border ${getCategoryColor(detailAutomation.category)}`}>
                                                {getCategoryLabel(detailAutomation.category)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center px-4 py-2.5 text-sm">
                                        <span className="text-editor-text-secondary">Trigger</span>
                                        <span className="text-editor-text-primary text-xs">{formatTriggerEvent(detailAutomation.triggerConfig?.event || '')}</span>
                                    </div>
                                    <div className="flex justify-between items-center px-4 py-2.5 text-sm">
                                        <span className="text-editor-text-secondary">{t('adminEmail.detailPanel.created')}</span>
                                        <span className="text-editor-text-primary">{formatDate(detailAutomation.createdAt)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 block">{t('adminEmail.detailPanel.actions')}</label>
                                <button
                                    onClick={() => { setDetailAutomation(null); openEditAutomation(detailAutomation); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 bg-editor-panel-bg border border-editor-border rounded-xl hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-left"
                                >
                                    <Edit2 size={18} className="text-purple-400" />
                                    <div>
                                        <p className="text-sm font-medium text-editor-text-primary">{t('adminEmail.automations.editAutomation')}</p>
                                        <p className="text-xs text-editor-text-secondary">{t('adminEmail.automations.editFlow')}</p>
                                    </div>
                                </button>
                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => { duplicateAutomation(detailAutomation); setDetailAutomation(null); }}
                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-editor-panel-bg border border-editor-border rounded-xl text-sm text-editor-text-secondary hover:text-editor-text-primary hover:border-editor-accent/30 transition-all"
                                    >
                                        <Copy size={14} /> {t('adminEmail.detailPanel.duplicate')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setConfirmModal({
                                                show: true,
                                                title: t('adminEmail.detailPanel.delete'),
                                                message: `${t('adminEmail.detailPanel.delete')} "${detailAutomation.name}"?`,
                                                onConfirm: async () => {
                                                    await deleteAutomation(detailAutomation.id);
                                                    setConfirmModal(prev => ({ ...prev, show: false }));
                                                    setDetailAutomation(null);
                                                },
                                            });
                                        }}
                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-red-500/5 border border-red-500/20 rounded-xl text-sm text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all"
                                    >
                                        <Trash2 size={14} /> {t('adminEmail.detailPanel.delete')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AutomationsTab;
