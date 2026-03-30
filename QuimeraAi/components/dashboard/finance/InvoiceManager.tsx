/**
 * InvoiceManager
 * Invoice CRUD with AI-powered optimization ("IA Optimize" button).
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Plus, Search, FileText, Send, CheckCircle2, AlertTriangle,
    X, Loader2, Sparkles, Edit2, Trash2, Calendar, Ban, Save,
} from 'lucide-react';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useProject } from '../../../contexts/project';
import { generateContentViaProxy, extractTextFromResponse } from '../../../utils/geminiProxyClient';
import { logApiCall } from '../../../services/apiLoggingService';
import { Skeleton } from '../../ui/skeleton';
import ConfirmationModal from '../../ui/ConfirmationModal';
import type { Invoice, InvoiceItem, InvoiceStatus } from '../../../types/finance';

interface InvoiceManagerProps {
    invoices: Invoice[];
    isLoading: boolean;
    onCreate: (data: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt'>) => Promise<string>;
    onUpdate: (id: string, data: Partial<Invoice>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onMarkAsSent: (id: string) => Promise<void>;
    onMarkAsPaid: (id: string) => Promise<void>;
    onCancel: (id: string) => Promise<void>;
}

const STATUS_STYLES: Record<InvoiceStatus, { bg: string; text: string; icon: any }> = {
    draft: { bg: 'bg-secondary/50', text: 'text-muted-foreground', icon: Edit2 },
    sent: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Send },
    paid: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle2 },
    overdue: { bg: 'bg-red-500/20', text: 'text-red-400', icon: AlertTriangle },
    cancelled: { bg: 'bg-secondary/30', text: 'text-muted-foreground', icon: Ban },
};

const EMPTY_ITEM: InvoiceItem = { id: '', description: '', quantity: 1, unitPrice: 0, taxRate: 0, total: 0 };

const InvoiceManager: React.FC<InvoiceManagerProps> = ({
    invoices, isLoading, onCreate, onUpdate, onDelete, onMarkAsSent, onMarkAsPaid, onCancel,
}) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { activeProject } = useProject();

    const [view, setView] = useState<'list' | 'form'>('list');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'all'>('all');
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const today = new Date().toISOString().split('T')[0];
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [issueDate, setIssueDate] = useState(today);
    const [dueDate, setDueDate] = useState('');
    const [paymentTerms, setPaymentTerms] = useState('Net 30');
    const [reminderNote, setReminderNote] = useState('');
    const [notes, setNotes] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [items, setItems] = useState<InvoiceItem[]>([{ ...EMPTY_ITEM, id: crypto.randomUUID() }]);
    const [isSaving, setIsSaving] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);

    const subtotal = useMemo(() => items.reduce((s, i) => s + i.quantity * i.unitPrice, 0), [items]);
    const taxTotal = useMemo(() => items.reduce((s, i) => s + i.quantity * i.unitPrice * (i.taxRate / 100), 0), [items]);
    const total = subtotal + taxTotal;

    const filtered = useMemo(() => {
        let r = invoices;
        if (searchTerm) { const q = searchTerm.toLowerCase(); r = r.filter(inv => inv.clientName.toLowerCase().includes(q) || inv.invoiceNumber.toLowerCase().includes(q)); }
        if (filterStatus !== 'all') r = r.filter(inv => inv.status === filterStatus);
        return r;
    }, [invoices, searchTerm, filterStatus]);

    const resetForm = () => { setClientName(''); setClientEmail(''); setIssueDate(today); setDueDate(''); setPaymentTerms('Net 30'); setReminderNote(''); setNotes(''); setCurrency('USD'); setItems([{ ...EMPTY_ITEM, id: crypto.randomUUID() }]); setEditingId(null); };

    const openEdit = (inv: Invoice) => { setEditingId(inv.id); setClientName(inv.clientName); setClientEmail(inv.clientEmail); setIssueDate(inv.issueDate); setDueDate(inv.dueDate); setPaymentTerms(inv.paymentTerms); setReminderNote(inv.reminderNote || ''); setNotes(inv.notes || ''); setCurrency(inv.currency); setItems(inv.items.length > 0 ? inv.items : [{ ...EMPTY_ITEM, id: crypto.randomUUID() }]); setView('form'); };

    const addItem = () => setItems(p => [...p, { ...EMPTY_ITEM, id: crypto.randomUUID() }]);
    const removeItem = (idx: number) => setItems(p => p.filter((_, i) => i !== idx));
    const updateItem = (idx: number, field: keyof InvoiceItem, value: any) => {
        setItems(p => { const u = [...p]; u[idx] = { ...u[idx], [field]: value }; u[idx].total = u[idx].quantity * u[idx].unitPrice * (1 + u[idx].taxRate / 100); return u; });
    };

    const handleSave = async (asDraft = true) => {
        if (!clientName) return;
        setIsSaving(true);
        try {
            const data: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt'> = {
                clientName, clientEmail, issueDate, dueDate: dueDate || issueDate, paymentTerms, reminderNote, notes, currency,
                items: items.map(i => ({ ...i, total: i.quantity * i.unitPrice * (1 + i.taxRate / 100) })),
                subtotal, taxTotal, total, status: asDraft ? 'draft' : 'sent', aiOptimized: false,
            };
            if (editingId) await onUpdate(editingId, data); else await onCreate(data);
            resetForm(); setView('list');
        } catch (err) { console.error('[InvoiceManager] save error:', err); } finally { setIsSaving(false); }
    };

    const handleAiOptimize = useCallback(async () => {
        if (!user) return;
        setIsOptimizing(true);
        try {
            const prompt = `You are a billing AI. Suggest optimal payment terms and a professional payment reminder.\nClient: ${clientName}\nTotal: $${total.toFixed(2)} ${currency}\nCurrent Terms: ${paymentTerms}\nRespond as JSON: { "paymentTerms": "...", "reminderNote": "..." }\nNo markdown. Language: ${t('accounting.insightsPromptLang', 'English')}.`;
            const resp = await generateContentViaProxy(activeProject?.id || 'accounting', prompt, 'gemini-2.5-flash', { temperature: 0.5 }, user.uid);
            const text = extractTextFromResponse(resp).replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(text);
            if (parsed.paymentTerms) setPaymentTerms(parsed.paymentTerms);
            if (parsed.reminderNote) setReminderNote(parsed.reminderNote);
            logApiCall({ userId: user.uid, projectId: activeProject?.id, model: 'gemini-2.5-flash', feature: 'accounting-smart-invoicing', success: true });
        } catch (err: any) {
            logApiCall({ userId: user.uid, projectId: activeProject?.id, model: 'gemini-2.5-flash', feature: 'accounting-smart-invoicing', success: false, errorMessage: err.message });
        } finally { setIsOptimizing(false); }
    }, [user, activeProject, clientName, total, currency, paymentTerms, t]);

    if (isLoading) return <div className="space-y-4 p-1"><Skeleton className="h-10 w-full" />{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>;

    if (view === 'form') return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2"><FileText size={20} className="text-primary" />{editingId ? t('accounting.editInvoice', 'Edit Invoice') : t('accounting.newInvoice', 'New Invoice')}</h3>
                <button onClick={() => { resetForm(); setView('list'); }} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl p-5 space-y-4">
                <h4 className="font-semibold text-foreground text-sm uppercase tracking-wider">{t('accounting.clientInfo', 'Client Information')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder={t('accounting.clientName', 'Client Name')} className="h-10 px-3 rounded-xl border border-border/60 bg-secondary/30 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40" />
                    <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder={t('accounting.clientEmail', 'Client Email')} className="h-10 px-3 rounded-xl border border-border/60 bg-secondary/30 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40" />
                </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground text-sm uppercase tracking-wider">{t('accounting.termsAndDates', 'Terms & Dates')}</h4>
                    <button onClick={handleAiOptimize} disabled={isOptimizing} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-primary to-purple-500 text-white shadow-md hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50">
                        {isOptimizing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}{t('accounting.aiOptimize', 'IA Optimize')}
                    </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><label className="text-xs text-muted-foreground font-medium mb-1 block">{t('accounting.issueDate', 'Issue Date')}</label><input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="h-10 w-full px-3 rounded-xl border border-border/60 bg-secondary/30 text-sm text-foreground focus:ring-2 focus:ring-primary/40" /></div>
                    <div><label className="text-xs text-muted-foreground font-medium mb-1 block">{t('accounting.dueDate', 'Due Date')}</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-10 w-full px-3 rounded-xl border border-border/60 bg-secondary/30 text-sm text-foreground focus:ring-2 focus:ring-primary/40" /></div>
                    <div><label className="text-xs text-muted-foreground font-medium mb-1 block">{t('accounting.paymentTerms', 'Payment Terms')}</label><input type="text" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} className="h-10 w-full px-3 rounded-xl border border-border/60 bg-secondary/30 text-sm text-foreground focus:ring-2 focus:ring-primary/40" /></div>
                </div>
                <div><label className="text-xs text-muted-foreground font-medium mb-1 block">{t('accounting.reminderNote', 'Payment Reminder')}</label><textarea value={reminderNote} onChange={e => setReminderNote(e.target.value)} rows={2} placeholder={t('accounting.reminderPlaceholder', 'Friendly payment reminder...')} className="w-full px-3 py-2 rounded-xl border border-border/60 bg-secondary/30 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40 resize-none" /></div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl p-5 space-y-4">
                <h4 className="font-semibold text-foreground text-sm uppercase tracking-wider">{t('accounting.lineItems', 'Line Items')}</h4>
                <div className="space-y-3">
                    {items.map((item, idx) => (
                        <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                            <input type="text" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder={t('accounting.itemDescription', 'Description')} className="col-span-5 h-9 px-3 rounded-lg border border-border/60 bg-secondary/30 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40" />
                            <input type="number" value={item.quantity || ''} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} min={0} className="col-span-2 h-9 px-2 rounded-lg border border-border/60 bg-secondary/30 text-sm text-foreground text-center focus:ring-2 focus:ring-primary/40" />
                            <input type="number" value={item.unitPrice || ''} onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} min={0} step="0.01" className="col-span-2 h-9 px-2 rounded-lg border border-border/60 bg-secondary/30 text-sm text-foreground text-center focus:ring-2 focus:ring-primary/40" />
                            <div className="col-span-2 text-sm font-semibold text-foreground text-right">${(item.quantity * item.unitPrice).toFixed(2)}</div>
                            <button onClick={() => removeItem(idx)} className="col-span-1 justify-self-center text-muted-foreground hover:text-destructive" disabled={items.length === 1}><X size={14} /></button>
                        </div>
                    ))}
                </div>
                <button onClick={addItem} className="text-sm text-primary font-semibold flex items-center gap-1 hover:text-primary/80"><Plus size={14} />{t('accounting.addLineItem', 'Add Line Item')}</button>
                <div className="border-t border-border/40 pt-4 space-y-2 max-w-xs ml-auto">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t('accounting.subtotal', 'Subtotal')}</span><span className="text-foreground font-medium">${subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t('accounting.tax', 'Tax')}</span><span className="text-foreground font-medium">${taxTotal.toFixed(2)}</span></div>
                    <div className="flex justify-between text-base font-bold border-t border-border/40 pt-2"><span>{t('accounting.total', 'Total')}</span><span className="text-primary">${total.toFixed(2)}</span></div>
                </div>
            </div>
            <div className="flex items-center gap-3 justify-end">
                <button onClick={() => handleSave(true)} disabled={isSaving || !clientName} className="px-5 py-2.5 rounded-xl border border-border/60 bg-secondary/50 text-foreground text-sm font-semibold hover:bg-secondary disabled:opacity-50 flex items-center gap-2">{isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{t('accounting.saveDraft', 'Save Draft')}</button>
                <button onClick={() => handleSave(false)} disabled={isSaving || !clientName} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white text-sm font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2">{isSaving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}{t('accounting.saveAndSend', 'Save & Send')}</button>
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative flex-1 w-full"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={t('accounting.searchInvoices', 'Search invoices...')} className="w-full h-10 pl-9 pr-4 rounded-xl border border-border/60 bg-secondary/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" /></div>
                <div className="flex items-center gap-2">
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="h-10 px-3 rounded-xl border border-border/60 bg-secondary/30 text-sm text-foreground focus:ring-2 focus:ring-primary/40">
                        <option value="all">{t('accounting.allStatuses', 'All')}</option><option value="draft">{t('accounting.draft', 'Draft')}</option><option value="sent">{t('accounting.sent', 'Sent')}</option><option value="paid">{t('accounting.paid', 'Paid')}</option><option value="overdue">{t('accounting.overdue', 'Overdue')}</option>
                    </select>
                    <button onClick={() => { resetForm(); setView('form'); }} className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white text-sm font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105 transition-all flex items-center gap-2"><Plus size={16} />{t('accounting.newInvoice', 'New Invoice')}</button>
                </div>
            </div>
            {filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center"><FileText size={40} className="mx-auto text-muted-foreground/40 mb-3" /><p className="font-medium text-foreground">{t('accounting.noInvoices', 'No invoices yet')}</p><p className="text-xs text-muted-foreground mt-1">{t('accounting.createFirstInvoice', 'Create your first invoice')}</p></div>
            ) : (
                <div className="space-y-3">{filtered.map(inv => {
                    const s = STATUS_STYLES[inv.status]; const I = s.icon; return (
                        <div key={inv.id} className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl p-4 hover:shadow-lg transition-all group cursor-pointer" onClick={() => openEdit(inv)}>
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className={`p-2 rounded-xl ${s.bg}`}><I size={18} className={s.text} /></div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2"><span className="font-bold text-foreground">{inv.invoiceNumber}</span><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.bg} ${s.text}`}>{t(`accounting.${inv.status}`, inv.status)}</span>{inv.aiOptimized && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium flex items-center gap-1"><Sparkles size={10} /> AI</span>}</div>
                                        <p className="text-sm text-muted-foreground truncate">{inv.clientName}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 flex-shrink-0">
                                    <div className="text-right"><p className="text-lg font-bold text-foreground">${inv.total.toFixed(2)}</p><p className="text-xs text-muted-foreground flex items-center gap-1 justify-end"><Calendar size={10} />{inv.dueDate}</p></div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                        {inv.status === 'draft' && <button onClick={() => onMarkAsSent(inv.id)} className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10"><Send size={14} /></button>}
                                        {(inv.status === 'sent' || inv.status === 'overdue') && <button onClick={() => onMarkAsPaid(inv.id)} className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/10"><CheckCircle2 size={14} /></button>}
                                        <button onClick={() => setDeleteId(inv.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            </div>
                        </div>);
                })}</div>
            )}
            <ConfirmationModal isOpen={!!deleteId} onConfirm={async () => { if (deleteId) await onDelete(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} title={t('accounting.deleteInvoice', 'Delete Invoice?')} message={t('accounting.deleteInvoiceConfirm', 'This cannot be undone.')} variant="danger" />
        </div>
    );
};

export default InvoiceManager;
