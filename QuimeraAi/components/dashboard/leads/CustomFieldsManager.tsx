import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    BriefcaseBusiness,
    CalendarDays,
    Car,
    Database,
    Dumbbell,
    GraduationCap,
    Hammer,
    Hash,
    HeartPulse,
    Home,
    ListChecks,
    Plus,
    Save,
    Settings,
    ShieldCheck,
    Sparkles,
    SquareCheck,
    Trash2,
    Type,
    Utensils,
    WandSparkles,
    X,
    type LucideIcon
} from 'lucide-react';
import Modal from '../../ui/Modal';
import { LEAD_FIELD_TEMPLATES, type LeadFieldTemplateIcon } from '../../../data/leadFieldTemplates';

interface CustomFieldsManagerProps {
    customFieldsConfig: CustomFieldDefinition[];
    onSaveConfig: (config: CustomFieldDefinition[]) => void;
}

export interface CustomFieldDefinition {
    id: string;
    name: string;
    type: 'text' | 'number' | 'date' | 'select' | 'checkbox';
    options?: string[]; // for select type
    required?: boolean;
}

const TEMPLATE_ICON_MAP: Record<LeadFieldTemplateIcon, LucideIcon> = {
    home: Home,
    briefcase: BriefcaseBusiness,
    car: Car,
    shield: ShieldCheck,
    'graduation-cap': GraduationCap,
    'heart-pulse': HeartPulse,
    dumbbell: Dumbbell,
    utensils: Utensils,
    hammer: Hammer
};

const FIELD_TYPE_ICON_MAP: Record<CustomFieldDefinition['type'], LucideIcon> = {
    text: Type,
    number: Hash,
    date: CalendarDays,
    select: ListChecks,
    checkbox: SquareCheck
};

const CustomFieldsManager: React.FC<CustomFieldsManagerProps> = ({ customFieldsConfig, onSaveConfig }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [fields, setFields] = useState<CustomFieldDefinition[]>(customFieldsConfig);
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'date' | 'select' | 'checkbox'>('text');

    const handleAddField = () => {
        if (!newFieldName.trim()) return;

        const newField: CustomFieldDefinition = {
            id: `custom_${Date.now()}`,
            name: newFieldName,
            type: newFieldType,
            options: newFieldType === 'select' ? ['Option 1', 'Option 2'] : undefined,
            required: false
        };

        setFields([...fields, newField]);
        setNewFieldName('');
        setNewFieldType('text');
    };

    const handleRemoveField = (fieldId: string) => {
        setFields(fields.filter(f => f.id !== fieldId));
    };

    const handleSave = () => {
        onSaveConfig(fields);
        setIsOpen(false);
    };

    const handleApplyTemplate = (templateId: string) => {
        const template = LEAD_FIELD_TEMPLATES.find(t => t.id === templateId);
        if (!template) return;

        const newFields = template.fields.map((field, index) => ({
            ...field,
            id: `${templateId}_${Date.now()}_${index}`
        }));

        setFields([...fields, ...newFields]);
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="no-min-touch flex h-9 w-9 min-h-9 min-w-9 max-h-9 max-w-9 shrink-0 items-center justify-center rounded-lg border border-q-border/60 bg-q-surface/70 p-0 text-q-text-secondary transition-all hover:bg-secondary hover:text-q-text sm:h-8 sm:w-8 sm:min-h-8 sm:min-w-8 sm:max-h-8 sm:max-w-8"
                title="Configure Custom Fields"
            >
                <Settings size={14} />
            </button>

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} maxWidth="max-w-5xl">
                <div className="flex min-h-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-4 border-b border-q-border bg-q-surface px-4 py-4 sm:px-6">
                        <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                                <Settings size={18} />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-base font-semibold text-q-text sm:text-lg">
                                    {t('leads.customFields.title')}
                                </h3>
                                <p className="mt-1 max-w-2xl text-xs leading-5 text-q-text-muted sm:text-sm">
                                    {t('leads.customFields.customFieldsHelpText')}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="no-min-touch flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-q-border/70 bg-q-surface/80 text-q-text-muted transition-colors hover:bg-secondary hover:text-q-text"
                            aria-label={t('common.close', 'Close')}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
                            <section className="space-y-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <h4 className="text-sm font-semibold uppercase tracking-wide text-q-text-muted">
                                            {t('leads.customFields.existingFields')}
                                        </h4>
                                        <p className="mt-1 text-xs text-q-text-muted">
                                            {fields.length} {t('leads.customFields.fields')}
                                        </p>
                                    </div>
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-q-border/70 bg-secondary/30 text-q-text-muted">
                                        <Database size={16} />
                                    </div>
                                </div>

                                {fields.length === 0 ? (
                                    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-q-border bg-secondary/10 p-6 text-center">
                                        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-q-border/70 bg-q-surface text-q-text-muted">
                                            <Database size={18} />
                                        </div>
                                        <p className="text-sm font-medium text-q-text">{t('leads.customFields.noFields')}</p>
                                        <p className="mt-1 max-w-sm text-xs leading-5 text-q-text-muted">
                                            {t('leads.customFields.industryTemplatesDesc')}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {fields.map(field => {
                                            const FieldIcon = FIELD_TYPE_ICON_MAP[field.type];
                                            return (
                                                <div
                                                    key={field.id}
                                                    className="flex items-start gap-3 rounded-xl border border-q-border bg-secondary/10 p-3 transition-colors hover:bg-secondary/20"
                                                >
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-q-border/70 bg-q-surface text-primary">
                                                        <FieldIcon size={16} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="truncate text-sm font-semibold text-q-text">
                                                                {field.name}
                                                            </span>
                                                            <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                                                {t(`leads.customFields.types.${field.type}`)}
                                                            </span>
                                                        </div>
                                                        {field.type === 'select' && field.options && (
                                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                                {field.options.map((opt, idx) => (
                                                                    <span
                                                                        key={idx}
                                                                        className="rounded-md border border-q-border/70 bg-q-surface px-2 py-1 text-[11px] text-q-text-muted"
                                                                    >
                                                                        {opt}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveField(field.id)}
                                                        className="no-min-touch flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-q-text-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
                                                        aria-label={t('common.delete', 'Delete')}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>

                            <aside className="space-y-4">
                                <section className="rounded-xl border border-q-border bg-secondary/10 p-4">
                                    <div className="mb-3 flex items-start gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                                            <WandSparkles size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-semibold uppercase tracking-wide text-q-text-muted">
                                                {t('leads.customFields.industryTemplates')}
                                            </h4>
                                            <p className="mt-1 text-xs leading-5 text-q-text-muted">
                                                {t('leads.customFields.industryTemplatesDesc')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid max-h-[360px] gap-2 overflow-y-auto pr-1 custom-scrollbar sm:grid-cols-2 lg:grid-cols-1">
                                        {LEAD_FIELD_TEMPLATES.map(template => {
                                            const TemplateIcon = TEMPLATE_ICON_MAP[template.icon];
                                            return (
                                                <button
                                                    key={template.id}
                                                    onClick={() => handleApplyTemplate(template.id)}
                                                    className="group flex items-start gap-3 rounded-lg border border-q-border bg-q-surface/70 p-3 text-left transition-colors hover:border-primary/35 hover:bg-secondary/35"
                                                >
                                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-q-border/70 bg-secondary/30 text-primary transition-colors group-hover:border-primary/30 group-hover:bg-primary/10">
                                                        <TemplateIcon size={16} />
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-sm font-semibold text-q-text transition-colors group-hover:text-primary">
                                                            {template.name}
                                                        </span>
                                                        <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-q-text-muted">
                                                            {template.description}
                                                        </span>
                                                        <span className="mt-2 inline-flex items-center gap-1 rounded-md border border-q-border/70 bg-secondary/20 px-2 py-0.5 text-[11px] font-medium text-q-text-muted">
                                                            <Sparkles size={12} />
                                                            {template.fields.length} {t('leads.customFields.fields')}
                                                        </span>
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>

                                <section className="rounded-xl border border-q-border bg-q-surface p-4">
                                    <div className="mb-3 flex items-center gap-2">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                                            <Plus size={15} />
                                        </div>
                                        <h4 className="text-sm font-semibold uppercase tracking-wide text-q-text-muted">
                                            {t('leads.customFields.addNew')}
                                        </h4>
                                    </div>

                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={newFieldName}
                                            onChange={e => setNewFieldName(e.target.value)}
                                            placeholder={t('leads.customFields.fieldNamePlaceholder')}
                                            className="h-10 w-full rounded-lg border border-q-border bg-secondary/15 px-3 text-sm text-q-text outline-none transition-colors placeholder:text-q-text-muted focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                                        />
                                        <select
                                            value={newFieldType}
                                            onChange={e => setNewFieldType(e.target.value as CustomFieldDefinition['type'])}
                                            className="h-10 w-full rounded-lg border border-q-border bg-secondary/15 px-3 text-sm text-q-text outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                                        >
                                            <option value="text">{t('leads.customFields.types.text')}</option>
                                            <option value="number">{t('leads.customFields.types.number')}</option>
                                            <option value="date">{t('leads.customFields.types.date')}</option>
                                            <option value="select">{t('leads.customFields.types.select')}</option>
                                            <option value="checkbox">{t('leads.customFields.types.checkbox')}</option>
                                        </select>
                                        <button
                                            onClick={handleAddField}
                                            disabled={!newFieldName.trim()}
                                            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Plus size={15} />
                                            {t('leads.customFields.add')}
                                        </button>
                                    </div>
                                </section>
                            </aside>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse gap-2 border-t border-q-border bg-q-surface px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="flex h-10 items-center justify-center rounded-lg border border-q-border bg-q-surface px-4 text-sm font-semibold text-q-text transition-colors hover:bg-secondary"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90"
                        >
                            <Save size={16} />
                            {t('leads.customFields.saveConfig')}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default CustomFieldsManager;
