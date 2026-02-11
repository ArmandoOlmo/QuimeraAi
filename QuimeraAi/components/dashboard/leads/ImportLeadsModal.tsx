/**
 * ImportLeadsModal
 * Modal wizard de 3 pasos para importar leads desde archivos CSV/Excel
 * con asignación opcional a audiencias de email marketing.
 * 
 * Paso 1: Subir archivo (drag & drop o selector)
 * Paso 2: Mapear columnas del archivo a campos de Lead
 * Paso 3: Preview de datos + seleccionar audiencia + confirmar importación
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
    X, Upload, FileSpreadsheet, ArrowRight, ArrowLeft, Check,
    Loader2, AlertTriangle, Users, ChevronDown, Search,
    FileText, CheckCircle, Download, Plus, Table, Eye,
    Zap, UploadCloud, Columns
} from 'lucide-react';
import Modal from '../../ui/Modal';
import { Lead } from '../../../types';
import { useCRM } from '../../../contexts/crm';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useProject } from '../../../contexts/project';
import { useEmailAudiences } from '../../../hooks/useEmailSettings';

// =============================================================================
// TYPES
// =============================================================================

interface ImportLeadsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ParsedRow {
    [key: string]: string;
}

type LeadField = 'name' | 'email' | 'phone' | 'company' | 'jobTitle' | 'industry' |
    'website' | 'linkedIn' | 'value' | 'notes' | 'tags' | 'skip';

interface ColumnMapping {
    fileColumn: string;
    leadField: LeadField;
    confidence: number; // 0-100 auto-detection confidence
}

type WizardStep = 'upload' | 'mapping' | 'preview';

// =============================================================================
// CONSTANTS
// =============================================================================

const LEAD_FIELDS: { id: LeadField; labelKey: string; icon: React.ElementType; required?: boolean }[] = [
    { id: 'name', labelKey: 'leads.import.fields.name', icon: Users, required: true },
    { id: 'email', labelKey: 'leads.import.fields.email', icon: FileText, required: true },
    { id: 'phone', labelKey: 'leads.import.fields.phone', icon: FileText },
    { id: 'company', labelKey: 'leads.import.fields.company', icon: FileText },
    { id: 'jobTitle', labelKey: 'leads.import.fields.jobTitle', icon: FileText },
    { id: 'industry', labelKey: 'leads.import.fields.industry', icon: FileText },
    { id: 'website', labelKey: 'leads.import.fields.website', icon: FileText },
    { id: 'linkedIn', labelKey: 'leads.import.fields.linkedIn', icon: FileText },
    { id: 'value', labelKey: 'leads.import.fields.value', icon: FileText },
    { id: 'notes', labelKey: 'leads.import.fields.notes', icon: FileText },
    { id: 'tags', labelKey: 'leads.import.fields.tags', icon: FileText },
    { id: 'skip', labelKey: 'leads.import.fields.skip', icon: X },
];

// Auto-detection patterns for column mapping
const FIELD_PATTERNS: Record<LeadField, RegExp[]> = {
    name: [/^nombre/i, /^name/i, /^full.?name/i, /^contact/i, /^contacto/i, /^nombre.?completo/i],
    email: [/^email/i, /^e-?mail/i, /^correo/i, /^mail/i, /^email.?address/i],
    phone: [/^phone/i, /^tel/i, /^celular/i, /^mobile/i, /^número/i, /^telefono/i],
    company: [/^company/i, /^empresa/i, /^org/i, /^business/i, /^compañ/i, /^razón/i],
    jobTitle: [/^title/i, /^cargo/i, /^puesto/i, /^position/i, /^job/i, /^rol/i],
    industry: [/^industry/i, /^industria/i, /^sector/i, /^ramo/i, /^giro/i],
    website: [/^web/i, /^sitio/i, /^url/i, /^homepage/i, /^página/i],
    linkedIn: [/^linkedin/i, /^linked/i],
    value: [/^value/i, /^valor/i, /^amount/i, /^monto/i, /^deal/i, /^revenue/i],
    notes: [/^note/i, /^nota/i, /^comment/i, /^comentario/i, /^description/i, /^mensaje/i, /^message/i],
    tags: [/^tag/i, /^etiqueta/i, /^label/i, /^categor/i],
    skip: [],
};

const STEPS: { id: WizardStep; labelKey: string; icon: React.ElementType }[] = [
    { id: 'upload', labelKey: 'leads.import.steps.upload', icon: UploadCloud },
    { id: 'mapping', labelKey: 'leads.import.steps.mapping', icon: Columns },
    { id: 'preview', labelKey: 'leads.import.steps.preview', icon: Eye },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function autoDetectMapping(columns: string[]): ColumnMapping[] {
    return columns.map(col => {
        let bestField: LeadField = 'skip';
        let bestConfidence = 0;

        for (const [field, patterns] of Object.entries(FIELD_PATTERNS) as [LeadField, RegExp[]][]) {
            if (field === 'skip') continue;
            for (const pattern of patterns) {
                if (pattern.test(col.trim())) {
                    const confidence = col.trim().toLowerCase() === field ? 100 : 80;
                    if (confidence > bestConfidence) {
                        bestConfidence = confidence;
                        bestField = field;
                    }
                }
            }
        }

        return { fileColumn: col, leadField: bestField, confidence: bestConfidence };
    });
}

function parseFileData(rows: ParsedRow[], mapping: ColumnMapping[]): Partial<Lead>[] {
    return rows
        .filter(row => {
            // Skip completely empty rows
            const values = Object.values(row).filter(v => v && v.trim());
            return values.length > 0;
        })
        .map(row => {
            const lead: Partial<Lead> = {};

            mapping.forEach(m => {
                if (m.leadField === 'skip') return;
                const rawValue = row[m.fileColumn]?.trim() || '';
                if (!rawValue) return;

                switch (m.leadField) {
                    case 'value':
                        lead.value = parseFloat(rawValue.replace(/[^0-9.-]/g, '')) || 0;
                        break;
                    case 'tags':
                        lead.tags = rawValue.split(/[,;|]/).map(t => t.trim()).filter(Boolean);
                        break;
                    default:
                        (lead as any)[m.leadField] = rawValue;
                }
            });

            return lead;
        })
        .filter(lead => lead.name || lead.email); // Must have at least name or email
}

// =============================================================================
// STEP COMPONENTS
// =============================================================================

// Step 1: Upload File
const UploadStep: React.FC<{
    onFileLoaded: (rows: ParsedRow[], columns: string[], fileType: 'csv' | 'excel', fileName: string) => void;
    t: any;
}> = ({ onFileLoaded, t }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const processFile = useCallback(async (file: File) => {
        setError(null);
        setIsProcessing(true);

        const extension = file.name.split('.').pop()?.toLowerCase();

        try {
            if (extension === 'csv' || extension === 'txt') {
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        if (results.errors.length > 0 && results.data.length === 0) {
                            setError(t('leads.import.errors.parseError'));
                            setIsProcessing(false);
                            return;
                        }
                        const columns = results.meta.fields || [];
                        onFileLoaded(results.data as ParsedRow[], columns, 'csv', file.name);
                        setIsProcessing(false);
                    },
                    error: () => {
                        setError(t('leads.import.errors.parseError'));
                        setIsProcessing(false);
                    }
                });
            } else if (['xlsx', 'xls'].includes(extension || '')) {
                const buffer = await file.arrayBuffer();
                const workbook = XLSX.read(buffer, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(sheet, { defval: '' });

                if (jsonData.length === 0) {
                    setError(t('leads.import.errors.emptyFile'));
                    setIsProcessing(false);
                    return;
                }

                const columns = Object.keys(jsonData[0]);
                onFileLoaded(jsonData, columns, 'excel', file.name);
                setIsProcessing(false);
            } else {
                setError(t('leads.import.errors.unsupportedFormat'));
                setIsProcessing(false);
            }
        } catch (err) {
            console.error('Error processing file:', err);
            setError(t('leads.import.errors.parseError'));
            setIsProcessing(false);
        }
    }, [onFileLoaded, t]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    }, [processFile]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    return (
        <div className="flex flex-col items-center gap-6 py-4">
            {/* Drop Zone */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center 
                    transition-all cursor-pointer group
                    ${isDragging
                        ? 'border-primary bg-primary/5 scale-[1.02]'
                        : 'border-border hover:border-primary/50 hover:bg-primary/5'}`}
            >
                {isProcessing ? (
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground">{t('leads.import.processing')}</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <Upload className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <p className="text-base font-semibold text-foreground mb-1">
                                {t('leads.import.dropzone.title')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {t('leads.import.dropzone.subtitle')}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-500/10 text-green-500 border border-green-500/20">CSV</span>
                            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">XLSX</span>
                            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20">XLS</span>
                        </div>
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls,.txt"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) processFile(file);
                    }}
                />
            </div>

            {error && (
                <div className="flex items-center gap-2 w-full px-4 py-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
                    <AlertTriangle size={16} className="shrink-0" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {/* Template Download */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Download size={14} />
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        // Generate and download a CSV template
                        const headers = 'Nombre,Email,Teléfono,Empresa,Cargo,Industria,Website,LinkedIn,Valor,Notas,Etiquetas';
                        const example = 'Juan Pérez,juan@ejemplo.com,+1234567890,Acme Corp,CEO,Tecnología,https://acme.com,linkedin.com/in/juan,5000,Lead de evento,ventas;premium';
                        const blob = new Blob([headers + '\n' + example], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'leads_template.csv';
                        a.click();
                        URL.revokeObjectURL(url);
                    }}
                    className="text-primary hover:underline cursor-pointer"
                >
                    {t('leads.import.downloadTemplate')}
                </button>
            </div>
        </div>
    );
};


// Step 2: Column Mapping
const MappingStep: React.FC<{
    columns: string[];
    mapping: ColumnMapping[];
    sampleRows: ParsedRow[];
    onMappingChange: (index: number, field: LeadField) => void;
    t: any;
}> = ({ columns, mapping, sampleRows, onMappingChange, t }) => {

    const getFieldLabel = (field: LeadField) => {
        const f = LEAD_FIELDS.find(lf => lf.id === field);
        return f ? t(f.labelKey) : field;
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                <Zap size={16} className="shrink-0" />
                <p className="text-sm">{t('leads.import.mappingHint')}</p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                                {t('leads.import.fileColumn')}
                            </th>
                            <th className="text-center py-2 px-3 text-muted-foreground font-medium text-xs">→</th>
                            <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                                {t('leads.import.leadField')}
                            </th>
                            <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs uppercase tracking-wider hidden sm:table-cell">
                                {t('leads.import.sampleData')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {mapping.map((m, idx) => (
                            <tr key={m.fileColumn} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                                <td className="py-2.5 px-3">
                                    <div className="flex items-center gap-2">
                                        <FileSpreadsheet size={14} className="text-muted-foreground shrink-0" />
                                        <span className="font-medium text-foreground truncate max-w-[150px]" title={m.fileColumn}>
                                            {m.fileColumn}
                                        </span>
                                    </div>
                                </td>
                                <td className="text-center py-2.5 px-3">
                                    <ArrowRight size={14} className={`mx-auto ${m.confidence > 60 ? 'text-green-500' : 'text-muted-foreground'}`} />
                                </td>
                                <td className="py-2.5 px-3">
                                    <select
                                        value={m.leadField}
                                        onChange={(e) => onMappingChange(idx, e.target.value as LeadField)}
                                        className={`w-full bg-background border rounded-lg px-2.5 py-1.5 text-sm outline-none
                                            transition-colors cursor-pointer
                                            ${m.leadField === 'skip'
                                                ? 'border-border text-muted-foreground'
                                                : m.confidence > 60
                                                    ? 'border-green-500/30 text-foreground bg-green-500/5'
                                                    : 'border-primary/30 text-foreground bg-primary/5'}`}
                                    >
                                        {LEAD_FIELDS.map(f => (
                                            <option key={f.id} value={f.id}>{getFieldLabel(f.id)}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="py-2.5 px-3 hidden sm:table-cell">
                                    <span className="text-xs text-muted-foreground italic truncate block max-w-[200px]" title={sampleRows[0]?.[m.fileColumn] || ''}>
                                        {sampleRows[0]?.[m.fileColumn] || '—'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


// Step 3: Preview + Audience Selection
const PreviewStep: React.FC<{
    parsedLeads: Partial<Lead>[];
    fileType: 'csv' | 'excel';
    fileName: string;
    selectedAudienceId: string;
    onAudienceChange: (id: string) => void;
    newAudienceName: string;
    onNewAudienceNameChange: (name: string) => void;
    createNewAudience: boolean;
    onToggleCreateAudience: () => void;
    audiences: any[];
    audiencesLoading: boolean;
    t: any;
}> = ({
    parsedLeads, fileType, fileName,
    selectedAudienceId, onAudienceChange,
    newAudienceName, onNewAudienceNameChange,
    createNewAudience, onToggleCreateAudience,
    audiences, audiencesLoading, t
}) => {
        const [audienceSearch, setAudienceSearch] = useState('');

        const filteredAudiences = audiences.filter(a =>
            a.name.toLowerCase().includes(audienceSearch.toLowerCase())
        );

        const validLeads = parsedLeads.filter(l => l.email || l.name);
        const invalidLeads = parsedLeads.length - validLeads.length;

        return (
            <div className="flex flex-col gap-5">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-green-500">{validLeads.length}</p>
                        <p className="text-xs text-green-500/80">{t('leads.import.validLeads')}</p>
                    </div>
                    {invalidLeads > 0 && (
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-orange-500">{invalidLeads}</p>
                            <p className="text-xs text-orange-500/80">{t('leads.import.skippedRows')}</p>
                        </div>
                    )}
                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-primary">{fileType.toUpperCase()}</p>
                        <p className="text-xs text-primary/80 truncate" title={fileName}>{fileName}</p>
                    </div>
                </div>

                {/* Preview Table */}
                <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Table size={14} />
                        {t('leads.import.previewTitle')} ({Math.min(validLeads.length, 5)} {t('leads.import.of')} {validLeads.length})
                    </h4>
                    <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-muted/50">
                                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">{t('leads.import.fields.name')}</th>
                                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">{t('leads.import.fields.email')}</th>
                                    <th className="text-left py-2 px-3 font-medium text-muted-foreground hidden sm:table-cell">{t('leads.import.fields.phone')}</th>
                                    <th className="text-left py-2 px-3 font-medium text-muted-foreground hidden sm:table-cell">{t('leads.import.fields.company')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {validLeads.slice(0, 5).map((lead, i) => (
                                    <tr key={i} className="border-t border-border/50">
                                        <td className="py-2 px-3 text-foreground">{lead.name || '—'}</td>
                                        <td className="py-2 px-3 text-foreground">{lead.email || '—'}</td>
                                        <td className="py-2 px-3 text-muted-foreground hidden sm:table-cell">{lead.phone || '—'}</td>
                                        <td className="py-2 px-3 text-muted-foreground hidden sm:table-cell">{lead.company || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Audience Assignment */}
                <div className="border border-border rounded-xl p-4 bg-muted/20">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Users size={14} className="text-primary" />
                            {t('leads.import.audienceSection')}
                        </h4>
                        <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted border border-border">
                            {t('leads.import.optional')}
                        </span>
                    </div>

                    <p className="text-xs text-muted-foreground mb-3">
                        {t('leads.import.audienceDescription')}
                    </p>

                    {/* Toggle between existing and new */}
                    <div className="flex items-center gap-2 mb-3">
                        <button
                            onClick={() => { if (createNewAudience) onToggleCreateAudience(); }}
                            className={`px-3 py-1.5 text-xs rounded-lg transition-all ${!createNewAudience
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                        >
                            {t('leads.import.existingAudience')}
                        </button>
                        <button
                            onClick={() => { if (!createNewAudience) onToggleCreateAudience(); }}
                            className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1 ${createNewAudience
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                        >
                            <Plus size={12} />
                            {t('leads.import.newAudience')}
                        </button>
                    </div>

                    {createNewAudience ? (
                        <input
                            type="text"
                            value={newAudienceName}
                            onChange={(e) => onNewAudienceNameChange(e.target.value)}
                            placeholder={t('leads.import.newAudiencePlaceholder')}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
                        />
                    ) : (
                        <div className="space-y-2">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={audienceSearch}
                                    onChange={(e) => setAudienceSearch(e.target.value)}
                                    placeholder={t('leads.import.searchAudience')}
                                    className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-primary transition-colors"
                                />
                            </div>

                            {audiencesLoading ? (
                                <div className="flex items-center justify-center py-4 text-muted-foreground">
                                    <Loader2 size={16} className="animate-spin mr-2" />
                                    <span className="text-xs">{t('leads.import.loadingAudiences')}</span>
                                </div>
                            ) : (
                                <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                                    {/* None option */}
                                    <button
                                        onClick={() => onAudienceChange('')}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${selectedAudienceId === ''
                                            ? 'bg-primary/10 text-primary border border-primary/20'
                                            : 'hover:bg-muted text-muted-foreground'}`}
                                    >
                                        {t('leads.import.noAudience')}
                                    </button>
                                    {filteredAudiences.map(aud => (
                                        <button
                                            key={aud.id}
                                            onClick={() => onAudienceChange(aud.id)}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${selectedAudienceId === aud.id
                                                ? 'bg-primary/10 text-primary border border-primary/20'
                                                : 'hover:bg-muted text-foreground'}`}
                                        >
                                            <span>{aud.name}</span>
                                            {selectedAudienceId === aud.id && <Check size={12} />}
                                        </button>
                                    ))}
                                    {filteredAudiences.length === 0 && !audiencesLoading && (
                                        <p className="text-xs text-muted-foreground text-center py-3">
                                            {t('leads.import.noAudiencesFound')}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };


// =============================================================================
// MAIN COMPONENT
// =============================================================================

const ImportLeadsModal: React.FC<ImportLeadsModalProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { activeProject } = useProject();
    const { addLeadsBulk } = useCRM();

    // Audience hook
    const userId = user?.uid || '';
    const projectId = activeProject?.id || '';
    const { audiences, isLoading: audiencesLoading, createAudience, updateAudience } = useEmailAudiences(userId, projectId);

    // Wizard state
    const [currentStep, setCurrentStep] = useState<WizardStep>('upload');

    // File data
    const [rawRows, setRawRows] = useState<ParsedRow[]>([]);
    const [columns, setColumns] = useState<string[]>([]);
    const [mapping, setMapping] = useState<ColumnMapping[]>([]);
    const [fileType, setFileType] = useState<'csv' | 'excel'>('csv');
    const [fileName, setFileName] = useState('');

    // Audience state
    const [selectedAudienceId, setSelectedAudienceId] = useState('');
    const [newAudienceName, setNewAudienceName] = useState('');
    const [createNewAudience, setCreateNewAudience] = useState(false);

    // Import state
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importResult, setImportResult] = useState<{ success: number; errors: number } | null>(null);

    // Parsed leads based on current mapping
    const parsedLeads = useMemo(() => {
        if (rawRows.length === 0 || mapping.length === 0) return [];
        return parseFileData(rawRows, mapping);
    }, [rawRows, mapping]);

    // Reset all state
    const resetState = useCallback(() => {
        setCurrentStep('upload');
        setRawRows([]);
        setColumns([]);
        setMapping([]);
        setFileType('csv');
        setFileName('');
        setSelectedAudienceId('');
        setNewAudienceName('');
        setCreateNewAudience(false);
        setIsImporting(false);
        setImportProgress(0);
        setImportResult(null);
    }, []);

    // Handle file loaded from step 1
    const handleFileLoaded = useCallback((rows: ParsedRow[], cols: string[], type: 'csv' | 'excel', name: string) => {
        setRawRows(rows);
        setColumns(cols);
        setFileType(type);
        setFileName(name);

        // Auto-detect mapping
        const autoMapping = autoDetectMapping(cols);
        setMapping(autoMapping);

        // Move to step 2
        setCurrentStep('mapping');
    }, []);

    // Handle mapping change
    const handleMappingChange = useCallback((index: number, field: LeadField) => {
        setMapping(prev => {
            const newMapping = [...prev];
            newMapping[index] = { ...newMapping[index], leadField: field, confidence: field === 'skip' ? 0 : 100 };
            return newMapping;
        });
    }, []);

    // Validate current step
    const canProceed = useMemo(() => {
        switch (currentStep) {
            case 'upload':
                return rawRows.length > 0;
            case 'mapping': {
                // Must have at least name or email mapped
                const hasName = mapping.some(m => m.leadField === 'name');
                const hasEmail = mapping.some(m => m.leadField === 'email');
                return hasName || hasEmail;
            }
            case 'preview':
                return parsedLeads.length > 0 && !isImporting;
            default:
                return false;
        }
    }, [currentStep, rawRows, mapping, parsedLeads, isImporting]);

    // Handle import
    const handleImport = useCallback(async () => {
        if (parsedLeads.length === 0) return;

        setIsImporting(true);
        setImportProgress(0);

        try {
            const source = fileType === 'csv' ? 'import-csv' : 'import-excel';

            // Prepare lead data
            const leadsToImport: Omit<Lead, 'id' | 'createdAt' | 'projectId'>[] = parsedLeads.map(lead => ({
                name: lead.name || '',
                email: lead.email || '',
                phone: lead.phone,
                company: lead.company,
                jobTitle: lead.jobTitle,
                industry: lead.industry,
                website: lead.website,
                linkedIn: lead.linkedIn,
                value: lead.value || 0,
                notes: lead.notes || '',
                tags: [...(lead.tags || []), `import-${new Date().toISOString().split('T')[0]}`],
                source: source as Lead['source'],
                status: 'new' as Lead['status'],
            }));

            // Bulk insert leads
            const createdIds = await addLeadsBulk(leadsToImport);
            setImportProgress(70);

            // Handle audience assignment
            if (createNewAudience && newAudienceName.trim()) {
                // Create new audience with imported leads
                await createAudience({
                    name: newAudienceName.trim(),
                    description: `${t('leads.import.audienceFromImport')} "${fileName}" (${createdIds.length} leads)`,
                    filters: [],
                    staticMembers: {
                        leadIds: createdIds,
                        customerIds: [],
                        emails: parsedLeads.filter(l => l.email).map(l => l.email!),
                    },
                    staticMemberCount: createdIds.length,
                    estimatedCount: createdIds.length,
                    isDefault: false,
                    source: ['import'],
                } as any);
                setImportProgress(90);
            } else if (selectedAudienceId) {
                // Add to existing audience
                const targetAudience = audiences.find(a => a.id === selectedAudienceId);
                if (targetAudience) {
                    const existingLeadIds = targetAudience.staticMembers?.leadIds || [];
                    const existingEmails = targetAudience.staticMembers?.emails || [];
                    const newEmails = parsedLeads.filter(l => l.email).map(l => l.email!);

                    await updateAudience(selectedAudienceId, {
                        staticMembers: {
                            ...targetAudience.staticMembers,
                            leadIds: [...new Set([...existingLeadIds, ...createdIds])],
                            emails: [...new Set([...existingEmails, ...newEmails])],
                        },
                        staticMemberCount: (targetAudience.staticMemberCount || 0) + createdIds.length,
                    });
                }
                setImportProgress(90);
            }

            setImportProgress(100);
            setImportResult({ success: createdIds.length, errors: parsedLeads.length - createdIds.length });
        } catch (error) {
            console.error('Import failed:', error);
            setImportResult({ success: 0, errors: parsedLeads.length });
        } finally {
            setIsImporting(false);
        }
    }, [
        parsedLeads, fileType, addLeadsBulk, createNewAudience, newAudienceName,
        selectedAudienceId, audiences, createAudience, updateAudience, t, fileName
    ]);

    // Navigation
    const goNext = () => {
        if (currentStep === 'upload') setCurrentStep('mapping');
        else if (currentStep === 'mapping') setCurrentStep('preview');
        else if (currentStep === 'preview') handleImport();
    };

    const goBack = () => {
        if (currentStep === 'mapping') setCurrentStep('upload');
        else if (currentStep === 'preview') setCurrentStep('mapping');
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const stepIndex = STEPS.findIndex(s => s.id === currentStep);

    return (
        <Modal isOpen={isOpen} onClose={handleClose} maxWidth="max-w-3xl">
            <div className="flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Upload className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-foreground">
                                {t('leads.import.title')}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                {t('leads.import.subtitle')}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                        <X size={18} />
                    </button>
                </div>

                {/* Step Indicator */}
                <div className="flex items-center justify-center gap-2 px-6 py-3 bg-muted/30 border-b border-border">
                    {STEPS.map((step, i) => {
                        const StepIcon = step.icon;
                        const isActive = step.id === currentStep;
                        const isCompleted = i < stepIndex;

                        return (
                            <React.Fragment key={step.id}>
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                                    ${isActive ? 'bg-primary text-primary-foreground' :
                                        isCompleted ? 'bg-green-500/10 text-green-500' : 'text-muted-foreground'}`}
                                >
                                    {isCompleted ? <CheckCircle size={14} /> : <StepIcon size={14} />}
                                    <span className="hidden sm:inline">{t(step.labelKey)}</span>
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div className={`w-6 h-px ${isCompleted ? 'bg-green-500' : 'bg-border'}`} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 custom-scrollbar">
                    {/* Success Result */}
                    {importResult ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-4">
                            {importResult.success > 0 ? (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                                        <CheckCircle className="w-8 h-8 text-green-500" />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-lg font-bold text-foreground mb-1">
                                            {t('leads.import.successTitle')}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {t('leads.import.successMessage', { count: importResult.success })}
                                        </p>
                                        {(createNewAudience && newAudienceName) && (
                                            <p className="text-xs text-primary mt-2">
                                                ✓ {t('leads.import.audienceCreated', { name: newAudienceName })}
                                            </p>
                                        )}
                                        {selectedAudienceId && (
                                            <p className="text-xs text-primary mt-2">
                                                ✓ {t('leads.import.audienceUpdated')}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleClose}
                                        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
                                    >
                                        {t('leads.import.done')}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                                        <AlertTriangle className="w-8 h-8 text-red-500" />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-lg font-bold text-foreground mb-1">
                                            {t('leads.import.errorTitle')}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {t('leads.import.errorMessage')}
                                        </p>
                                    </div>
                                    <button
                                        onClick={resetState}
                                        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
                                    >
                                        {t('leads.import.tryAgain')}
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        <>
                            {currentStep === 'upload' && (
                                <UploadStep onFileLoaded={handleFileLoaded} t={t} />
                            )}
                            {currentStep === 'mapping' && (
                                <MappingStep
                                    columns={columns}
                                    mapping={mapping}
                                    sampleRows={rawRows.slice(0, 3)}
                                    onMappingChange={handleMappingChange}
                                    t={t}
                                />
                            )}
                            {currentStep === 'preview' && (
                                <PreviewStep
                                    parsedLeads={parsedLeads}
                                    fileType={fileType}
                                    fileName={fileName}
                                    selectedAudienceId={selectedAudienceId}
                                    onAudienceChange={setSelectedAudienceId}
                                    newAudienceName={newAudienceName}
                                    onNewAudienceNameChange={setNewAudienceName}
                                    createNewAudience={createNewAudience}
                                    onToggleCreateAudience={() => setCreateNewAudience(!createNewAudience)}
                                    audiences={audiences}
                                    audiencesLoading={audiencesLoading}
                                    t={t}
                                />
                            )}
                        </>
                    )}
                </div>

                {/* Footer Actions */}
                {!importResult && (
                    <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-t border-border bg-muted/20">
                        <button
                            onClick={currentStep === 'upload' ? handleClose : goBack}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                            disabled={isImporting}
                        >
                            {currentStep === 'upload' ? (
                                t('leads.import.cancel')
                            ) : (
                                <>
                                    <ArrowLeft size={14} />
                                    {t('leads.import.back')}
                                </>
                            )}
                        </button>

                        {/* Import progress */}
                        {isImporting && (
                            <div className="flex-1 mx-4">
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-300 rounded-full"
                                        style={{ width: `${importProgress}%` }}
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground text-center mt-1">
                                    {t('leads.import.importing')} ({importProgress}%)
                                </p>
                            </div>
                        )}

                        <button
                            onClick={goNext}
                            disabled={!canProceed || isImporting}
                            className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all
                                ${canProceed && !isImporting
                                    ? 'bg-primary text-primary-foreground hover:opacity-90 shadow-sm'
                                    : 'bg-muted text-muted-foreground cursor-not-allowed'}`}
                        >
                            {isImporting ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    {t('leads.import.importing')}
                                </>
                            ) : currentStep === 'preview' ? (
                                <>
                                    <Check size={14} />
                                    {t('leads.import.importButton', { count: parsedLeads.length })}
                                </>
                            ) : (
                                <>
                                    {t('leads.import.next')}
                                    <ArrowRight size={14} />
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ImportLeadsModal;
