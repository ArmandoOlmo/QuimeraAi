import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LeadCustomField } from '../../../types';
import { Plus, X, Settings, Save, Sparkles } from 'lucide-react';
import Modal from '../../ui/Modal';
import { LEAD_FIELD_TEMPLATES } from '../../../data/leadFieldTemplates';

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

    const handleUpdateFieldOptions = (fieldId: string, options: string[]) => {
        setFields(fields.map(f => f.id === fieldId ? { ...f, options } : f));
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
                className="p-2 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                title="Configure Custom Fields"
            >
                <Settings size={16} />
            </button>

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} maxWidth="max-w-2xl">
                <div className="p-6 border-b border-border bg-secondary/10 flex justify-between items-center">
                    <h3 className="font-bold text-lg">{t('leads.customFields.title')}</h3>
                    <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Industry Templates */}
                    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="text-purple-500" size={16} />
                            <h4 className="text-sm font-bold text-purple-500 uppercase">{t('leads.customFields.industryTemplates')}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">
                            {t('leads.customFields.industryTemplatesDesc')}
                        </p>
                        <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                            {LEAD_FIELD_TEMPLATES.map(template => (
                                <button
                                    key={template.id}
                                    onClick={() => handleApplyTemplate(template.id)}
                                    className="p-3 border border-border rounded-lg hover:bg-secondary/50 transition-colors text-left group"
                                >
                                    <div className="text-2xl mb-1">{template.icon}</div>
                                    <h5 className="font-bold text-xs mb-0.5 group-hover:text-primary transition-colors">{template.name}</h5>
                                    <p className="text-[10px] text-muted-foreground">{template.fields.length} {t('leads.customFields.fields')}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Existing Fields */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-muted-foreground uppercase">{t('leads.customFields.existingFields')}</h4>
                        {fields.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">{t('leads.customFields.noFields')}</p>
                        ) : (
                            fields.map(field => (
                                <div key={field.id} className="flex items-center gap-3 bg-secondary/20 p-3 rounded-lg border border-border">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-sm">{field.name}</span>
                                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                                {field.type}
                                            </span>
                                        </div>
                                        {field.type === 'select' && field.options && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {field.options.map((opt, idx) => (
                                                    <span key={idx} className="text-xs bg-secondary px-2 py-0.5 rounded">
                                                        {opt}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleRemoveField(field.id)}
                                        className="p-2 hover:bg-red-500/10 rounded text-red-500 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Add New Field */}
                    <div className="border-t border-border pt-6">
                        <h4 className="text-sm font-bold text-muted-foreground uppercase mb-3">{t('leads.customFields.addNew')}</h4>
                        <div className="grid grid-cols-12 gap-3">
                            <input
                                type="text"
                                value={newFieldName}
                                onChange={e => setNewFieldName(e.target.value)}
                                placeholder={t('leads.customFields.fieldNamePlaceholder')}
                                className="col-span-6 bg-secondary/20 border border-border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                            />
                            <select
                                value={newFieldType}
                                onChange={e => setNewFieldType(e.target.value as any)}
                                className="col-span-4 bg-secondary/20 border border-border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
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
                                className="col-span-2 bg-primary text-primary-foreground rounded px-3 py-2 text-sm font-bold hover:opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                                <Plus size={14} />
                                {t('leads.customFields.add')}
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            {t('leads.customFields.customFieldsHelpText')}
                        </p>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end gap-2 pt-4 border-t border-border">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="px-4 py-2 border border-border rounded hover:bg-secondary transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded font-bold hover:opacity-90 transition-colors flex items-center gap-2"
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

