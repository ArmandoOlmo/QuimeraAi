/**
 * LegalPageEditor
 * Editor for legal pages (Privacy Policy, Data Deletion, Terms, etc.)
 * Manages sections with markdown content
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContent } from '../../../contexts/appContent';
import { useToast } from '../../../contexts/ToastContext';
import {
    ArrowLeft,
    Save,
    Plus,
    Trash2,
    GripVertical,
    Loader2,
    Eye,
    FileText,
    Shield,
    Lock,
    Globe,
    Database,
    Users,
    Settings,
    Clock,
    AlertTriangle,
    X,
    ChevronUp,
    ChevronDown
} from 'lucide-react';
import { LegalPage, LegalPageSection, LegalPageType, LEGAL_PAGE_LABELS } from '../../../types/appContent';

interface LegalPageEditorProps {
    pageType: LegalPageType;
    onClose: () => void;
}

const AVAILABLE_ICONS = [
    { id: 'Globe', icon: Globe, label: 'Globe' },
    { id: 'Database', icon: Database, label: 'Database' },
    { id: 'Eye', icon: Eye, label: 'Eye' },
    { id: 'Users', icon: Users, label: 'Users' },
    { id: 'Shield', icon: Shield, label: 'Shield' },
    { id: 'Lock', icon: Lock, label: 'Lock' },
    { id: 'FileText', icon: FileText, label: 'FileText' },
    { id: 'Settings', icon: Settings, label: 'Settings' },
    { id: 'Clock', icon: Clock, label: 'Clock' },
    { id: 'AlertTriangle', icon: AlertTriangle, label: 'AlertTriangle' },
];

const getIconComponent = (iconName?: string) => {
    const found = AVAILABLE_ICONS.find(i => i.id === iconName);
    return found ? found.icon : FileText;
};

const LegalPageEditor: React.FC<LegalPageEditorProps> = ({ pageType, onClose }) => {
    const { t } = useTranslation();
    const { getLegalPageByType, saveLegalPage } = useAppContent();
    const { showToast } = useToast();

    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    
    // Form state
    const [formData, setFormData] = useState<LegalPage>({
        id: pageType,
        type: pageType,
        title: LEGAL_PAGE_LABELS[pageType],
        subtitle: '',
        lastUpdated: new Date().toISOString(),
        contactEmail: 'privacy@quimera.ai',
        status: 'draft',
        sections: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });

    // Load existing page data
    useEffect(() => {
        const existingPage = getLegalPageByType(pageType);
        if (existingPage) {
            setFormData(existingPage);
        }
    }, [pageType, getLegalPageByType]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await saveLegalPage({
                ...formData,
                updatedAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
            });
            setHasChanges(false);
            showToast('Página legal guardada correctamente', 'success');
        } catch (error) {
            console.error('Error saving legal page:', error);
            showToast('Error al guardar la página', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const updateForm = <K extends keyof LegalPage>(field: K, value: LegalPage[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
    };

    // Section management
    const addSection = () => {
        const newSection: LegalPageSection = {
            id: `section_${Date.now()}`,
            title: 'Nueva Sección',
            icon: 'FileText',
            content: '',
        };
        updateForm('sections', [...formData.sections, newSection]);
        setExpandedSection(newSection.id);
    };

    const updateSection = (id: string, updates: Partial<LegalPageSection>) => {
        updateForm('sections', formData.sections.map(s =>
            s.id === id ? { ...s, ...updates } : s
        ));
    };

    const deleteSection = (id: string) => {
        if (window.confirm('¿Estás seguro de eliminar esta sección?')) {
            updateForm('sections', formData.sections.filter(s => s.id !== id));
        }
    };

    const moveSection = (index: number, direction: 'up' | 'down') => {
        const newSections = [...formData.sections];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= newSections.length) return;
        
        [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
        updateForm('sections', newSections);
    };

    return (
        <div className="flex flex-col h-screen bg-background">
            {/* Header */}
            <header className="h-14 bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                    >
                        <ArrowLeft size={18} />
                        Volver
                    </button>
                    <div className="flex items-center gap-2">
                        <Shield className="text-editor-accent" size={20} />
                        <h1 className="text-lg font-semibold text-editor-text-primary">
                            {LEGAL_PAGE_LABELS[pageType]}
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {hasChanges && (
                        <span className="text-xs text-orange-500 font-medium">Cambios sin guardar</span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !hasChanges}
                        className="flex items-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Guardar
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto p-6 bg-[#f6f6f7] dark:bg-background">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Basic Info */}
                    <div className="bg-card border border-border rounded-xl p-6">
                        <h2 className="font-semibold mb-4">Información General</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-2">
                                    Título
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => updateForm('title', e.target.value)}
                                    className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-lg outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-2">
                                    Email de Contacto
                                </label>
                                <input
                                    type="email"
                                    value={formData.contactEmail || ''}
                                    onChange={(e) => updateForm('contactEmail', e.target.value)}
                                    className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-lg outline-none focus:border-primary"
                                    placeholder="privacy@example.com"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-muted-foreground mb-2">
                                    Subtítulo / Descripción
                                </label>
                                <input
                                    type="text"
                                    value={formData.subtitle || ''}
                                    onChange={(e) => updateForm('subtitle', e.target.value)}
                                    className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-lg outline-none focus:border-primary"
                                    placeholder="Breve descripción de la página"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-2">
                                    Estado
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => updateForm('status', e.target.value as 'published' | 'draft')}
                                    className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-lg outline-none focus:border-primary"
                                >
                                    <option value="draft">Borrador</option>
                                    <option value="published">Publicado</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Sections */}
                    <div className="bg-card border border-border rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold">Secciones del Documento</h2>
                            <button
                                onClick={addSection}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            >
                                <Plus size={14} />
                                Añadir Sección
                            </button>
                        </div>

                        {formData.sections.length === 0 ? (
                            <div className="text-center py-12 bg-secondary/20 rounded-lg">
                                <FileText className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-3" />
                                <p className="text-muted-foreground mb-2">No hay secciones</p>
                                <p className="text-sm text-muted-foreground">
                                    Añade secciones para estructurar el contenido de esta página legal.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {formData.sections.map((section, index) => {
                                    const IconComponent = getIconComponent(section.icon);
                                    const isExpanded = expandedSection === section.id;
                                    
                                    return (
                                        <div
                                            key={section.id}
                                            className="bg-secondary/20 rounded-lg overflow-hidden"
                                        >
                                            {/* Section Header */}
                                            <div
                                                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                                                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                                            >
                                                <GripVertical size={16} className="text-muted-foreground" />
                                                <div className="p-2 bg-primary/10 rounded-lg">
                                                    <IconComponent size={16} className="text-primary" />
                                                </div>
                                                <span className="flex-1 font-medium">{section.title}</span>
                                                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => moveSection(index, 'up')}
                                                        disabled={index === 0}
                                                        className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                                                    >
                                                        <ChevronUp size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => moveSection(index, 'down')}
                                                        disabled={index === formData.sections.length - 1}
                                                        className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                                                    >
                                                        <ChevronDown size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteSection(section.id)}
                                                        className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </div>

                                            {/* Section Content */}
                                            {isExpanded && (
                                                <div className="p-4 pt-0 space-y-4 border-t border-border/50">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-muted-foreground mb-2">
                                                                Título de la Sección
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={section.title}
                                                                onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                                                className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-muted-foreground mb-2">
                                                                Icono
                                                            </label>
                                                            <select
                                                                value={section.icon || 'FileText'}
                                                                onChange={(e) => updateSection(section.id, { icon: e.target.value })}
                                                                className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary"
                                                            >
                                                                {AVAILABLE_ICONS.map(icon => (
                                                                    <option key={icon.id} value={icon.id}>{icon.label}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                                                            Contenido (Markdown soportado)
                                                        </label>
                                                        <textarea
                                                            value={section.content}
                                                            onChange={(e) => updateSection(section.id, { content: e.target.value })}
                                                            rows={8}
                                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary font-mono text-sm resize-y"
                                                            placeholder="Escribe el contenido de esta sección. Puedes usar markdown para formatear."
                                                        />
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            Usa **texto** para negrita, - para listas, \n para saltos de línea
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Preview Link */}
                    <div className="bg-card border border-border rounded-xl p-6">
                        <h2 className="font-semibold mb-4">Vista Previa</h2>
                        <div className="flex items-center gap-4">
                            <a
                                href={`/${pageType}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-secondary/30 hover:bg-secondary/50 rounded-lg transition-colors"
                            >
                                <Eye size={16} />
                                Ver página pública
                            </a>
                            <span className="text-sm text-muted-foreground">
                                URL: /{pageType}
                            </span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LegalPageEditor;







