/**
 * SmartTransactionTable
 * Advanced accounting transaction table with filters and AI-Verified toggle.
 * Supports inline add/edit and real-time AI auto-categorization.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Plus, Search, Filter, CheckCircle2, Clock, ArrowUpDown,
    Trash2, Edit2, X, Loader2, Sparkles, TrendingUp, TrendingDown,
    DollarSign, Save,
} from 'lucide-react';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useProject } from '../../../contexts/project';
import { generateContentViaProxy, extractTextFromResponse } from '../../../utils/geminiProxyClient';
import { logApiCall } from '../../../services/apiLoggingService';
import { Skeleton } from '../../ui/skeleton';
import ConfirmationModal from '../../ui/ConfirmationModal';
import type { Transaction, TransactionType } from '../../../types/finance';

interface SmartTransactionTableProps {
    transactions: Transaction[];
    isLoading: boolean;
    onAdd: (data: Omit<Transaction, 'id' | 'createdAt'>) => Promise<string>;
    onUpdate: (id: string, data: Partial<Transaction>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

const DEFAULT_TX: Omit<Transaction, 'id' | 'createdAt'> = {
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: 0,
    type: 'income',
    account: '',
    category: '',
    currency: 'USD',
    aiVerified: false,
    status: 'pending',
};

const SmartTransactionTable: React.FC<SmartTransactionTableProps> = ({
    transactions,
    isLoading,
    onAdd,
    onUpdate,
    onDelete,
}) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { activeProject } = useProject();

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterAccount, setFilterAccount] = useState('all');
    const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
    const [showAiVerifiedOnly, setShowAiVerifiedOnly] = useState(false);
    const [sortField, setSortField] = useState<'date' | 'amount'>('date');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    // Form state
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState(DEFAULT_TX);
    const [isSaving, setIsSaving] = useState(false);
    const [isCategorizing, setIsCategorizing] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Derived data for filter dropdowns
    const categories = useMemo(
        () => [...new Set(transactions.map((tx) => tx.category).filter(Boolean))],
        [transactions],
    );
    const accounts = useMemo(
        () => [...new Set(transactions.map((tx) => tx.account).filter(Boolean))],
        [transactions],
    );

    // Filtered & sorted transactions
    const filtered = useMemo(() => {
        let result = transactions;

        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            result = result.filter(
                (tx) =>
                    tx.description.toLowerCase().includes(q) ||
                    tx.counterpartyName?.toLowerCase().includes(q) ||
                    tx.category.toLowerCase().includes(q),
            );
        }
        if (filterCategory !== 'all') result = result.filter((tx) => tx.category === filterCategory);
        if (filterAccount !== 'all') result = result.filter((tx) => tx.account === filterAccount);
        if (filterType !== 'all') result = result.filter((tx) => tx.type === filterType);
        if (showAiVerifiedOnly) result = result.filter((tx) => tx.aiVerified);

        result.sort((a, b) => {
            const cmp = sortField === 'date' ? a.date.localeCompare(b.date) : a.amount - b.amount;
            return sortDir === 'asc' ? cmp : -cmp;
        });

        return result;
    }, [transactions, searchTerm, filterCategory, filterAccount, filterType, showAiVerifiedOnly, sortField, sortDir]);

    // AI auto-categorization
    const aiCategorize = useCallback(
        async (txData: typeof formData): Promise<{ category: string; account: string }> => {
            if (!user) throw new Error('Not authenticated');
            setIsCategorizing(true);
            try {
                const prompt = `You are an accounting AI. Given this transaction, respond with ONLY a JSON object with "category" and "account" fields.

Transaction:
- Description: ${txData.description}
- Amount: $${txData.amount}
- Type: ${txData.type}
- Counterparty: ${txData.counterpartyName || 'N/A'}

Rules:
- category should be one of: Sales, Services, Consulting, Rent, Utilities, Office Supplies, Marketing, Payroll, Travel, Insurance, Taxes, Other Income, Other Expense
- account should be a standard chart of accounts name like: Cash, Accounts Receivable, Accounts Payable, Sales Revenue, Service Revenue, Rent Expense, etc.

Respond ONLY with the JSON object, no markdown, no explanation.`;

                const response = await generateContentViaProxy(
                    activeProject?.id || 'accounting',
                    prompt,
                    'gemini-2.5-flash',
                    { temperature: 0.2 },
                    user.uid,
                );

                const text = extractTextFromResponse(response);
                // Parse JSON from response — handle possible markdown wrapping
                const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const parsed = JSON.parse(cleaned);

                logApiCall({
                    userId: user.uid,
                    projectId: activeProject?.id,
                    model: 'gemini-2.5-flash',
                    feature: 'accounting-ai-categorize',
                    success: true,
                });

                return { category: parsed.category || '', account: parsed.account || '' };
            } catch (err: any) {
                logApiCall({
                    userId: user.uid,
                    projectId: activeProject?.id,
                    model: 'gemini-2.5-flash',
                    feature: 'accounting-ai-categorize',
                    success: false,
                    errorMessage: err.message,
                });
                return { category: txData.category || 'Other', account: txData.account || 'Cash' };
            } finally {
                setIsCategorizing(false);
            }
        },
        [user, activeProject],
    );

    // Save transaction (add or update)
    const handleSave = useCallback(async () => {
        if (!formData.description || formData.amount <= 0) return;
        setIsSaving(true);
        try {
            // Auto-categorize if category or account is empty
            let finalData = { ...formData };
            if (!finalData.category || !finalData.account) {
                const aiResult = await aiCategorize(finalData);
                finalData = { ...finalData, ...aiResult, aiVerified: true, aiConfidence: 0.85 };
            }

            if (editingId) {
                await onUpdate(editingId, finalData);
                setEditingId(null);
            } else {
                await onAdd(finalData);
            }
            setFormData(DEFAULT_TX);
            setShowAddForm(false);
        } catch (err) {
            console.error('[SmartTransactionTable] save error:', err);
        } finally {
            setIsSaving(false);
        }
    }, [formData, editingId, onAdd, onUpdate, aiCategorize]);

    const startEdit = (tx: Transaction) => {
        setEditingId(tx.id);
        setFormData({ ...tx });
        setShowAddForm(true);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        await onDelete(deleteId);
        setDeleteId(null);
    };

    const toggleSort = (field: 'date' | 'amount') => {
        if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        else { setSortField(field); setSortDir('desc'); }
    };

    // Loading skeleton
    if (isLoading) {
        return (
            <div className="space-y-4 p-1">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                </div>
                {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 w-full sm:w-auto">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={t('accounting.searchTransactions', 'Search transactions...')}
                        className="w-full h-10 pl-9 pr-4 rounded-xl border border-border/60 bg-secondary/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    />
                </div>

                {/* Filters row */}
                <div className="flex items-center gap-2 flex-wrap">
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
                        className="h-10 px-3 rounded-xl border border-border/60 bg-secondary/30 text-sm text-foreground focus:ring-2 focus:ring-primary/40 transition-all"
                    >
                        <option value="all">{t('accounting.allTypes', 'All Types')}</option>
                        <option value="income">{t('accounting.income', 'Income')}</option>
                        <option value="expense">{t('accounting.expense', 'Expense')}</option>
                    </select>

                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="h-10 px-3 rounded-xl border border-border/60 bg-secondary/30 text-sm text-foreground focus:ring-2 focus:ring-primary/40 transition-all"
                    >
                        <option value="all">{t('accounting.allCategories', 'All Categories')}</option>
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    <select
                        value={filterAccount}
                        onChange={(e) => setFilterAccount(e.target.value)}
                        className="h-10 px-3 rounded-xl border border-border/60 bg-secondary/30 text-sm text-foreground focus:ring-2 focus:ring-primary/40 transition-all"
                    >
                        <option value="all">{t('accounting.allAccounts', 'All Accounts')}</option>
                        {accounts.map((acc) => (
                            <option key={acc} value={acc}>{acc}</option>
                        ))}
                    </select>

                    {/* AI Verified Toggle */}
                    <button
                        onClick={() => setShowAiVerifiedOnly((v) => !v)}
                        className={`h-10 px-3 rounded-xl border text-sm font-medium flex items-center gap-1.5 transition-all ${showAiVerifiedOnly
                                ? 'bg-primary/20 border-primary/40 text-primary'
                                : 'border-border/60 bg-secondary/30 text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <Sparkles size={14} />
                        {t('accounting.aiVerified', 'AI Verified')}
                    </button>
                </div>

                {/* Add button */}
                <button
                    onClick={() => { setShowAddForm(true); setEditingId(null); setFormData(DEFAULT_TX); }}
                    className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white text-sm font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105 transition-all flex items-center gap-2"
                >
                    <Plus size={16} />
                    {t('accounting.addTransaction', 'Add Transaction')}
                </button>
            </div>

            {/* Add/Edit Form (collapsible) */}
            {showAddForm && (
                <div className="rounded-2xl border border-primary/20 bg-card/90 backdrop-blur-xl p-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-foreground flex items-center gap-2">
                            {editingId ? (
                                <><Edit2 size={16} /> {t('accounting.editTransaction', 'Edit Transaction')}</>
                            ) : (
                                <><Plus size={16} /> {t('accounting.newTransaction', 'New Transaction')}</>
                            )}
                        </h3>
                        <button onClick={() => { setShowAddForm(false); setEditingId(null); }} className="text-muted-foreground hover:text-foreground">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <input type="date" value={formData.date} onChange={(e) => setFormData((f) => ({ ...f, date: e.target.value }))}
                            className="h-10 px-3 rounded-xl border border-border/60 bg-secondary/30 text-sm text-foreground focus:ring-2 focus:ring-primary/40" />
                        <input type="text" value={formData.description} onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                            placeholder={t('accounting.description', 'Description')}
                            className="h-10 px-3 rounded-xl border border-border/60 bg-secondary/30 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40" />
                        <input type="number" value={formData.amount || ''} onChange={(e) => setFormData((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                            placeholder={t('accounting.amount', 'Amount')} min={0} step="0.01"
                            className="h-10 px-3 rounded-xl border border-border/60 bg-secondary/30 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40" />
                        <select value={formData.type} onChange={(e) => setFormData((f) => ({ ...f, type: e.target.value as TransactionType }))}
                            className="h-10 px-3 rounded-xl border border-border/60 bg-secondary/30 text-sm text-foreground focus:ring-2 focus:ring-primary/40">
                            <option value="income">{t('accounting.income', 'Income')}</option>
                            <option value="expense">{t('accounting.expense', 'Expense')}</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input type="text" value={formData.counterpartyName || ''} onChange={(e) => setFormData((f) => ({ ...f, counterpartyName: e.target.value }))}
                            placeholder={t('accounting.counterparty', 'Client / Vendor')}
                            className="h-10 px-3 rounded-xl border border-border/60 bg-secondary/30 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40" />
                        <input type="text" value={formData.category} onChange={(e) => setFormData((f) => ({ ...f, category: e.target.value }))}
                            placeholder={t('accounting.categoryOptional', 'Category (AI will auto-fill)')}
                            className="h-10 px-3 rounded-xl border border-border/60 bg-secondary/30 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40" />
                        <input type="text" value={formData.account} onChange={(e) => setFormData((f) => ({ ...f, account: e.target.value }))}
                            placeholder={t('accounting.accountOptional', 'Account (AI will auto-fill)')}
                            className="h-10 px-3 rounded-xl border border-border/60 bg-secondary/30 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40" />
                    </div>

                    <div className="flex items-center gap-3 justify-end">
                        {isCategorizing && (
                            <span className="text-xs text-primary flex items-center gap-1.5">
                                <Sparkles size={14} className="animate-pulse" />
                                {t('accounting.aiCategorizing', 'AI categorizing...')}
                            </span>
                        )}
                        <button onClick={handleSave} disabled={isSaving || !formData.description || formData.amount <= 0}
                            className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2 hover:bg-primary/90 transition-colors">
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {editingId ? t('accounting.saveChanges', 'Save Changes') : t('accounting.addTransaction', 'Add Transaction')}
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                <th className="text-left p-4 cursor-pointer hover:text-foreground transition-colors" onClick={() => toggleSort('date')}>
                                    <span className="flex items-center gap-1">{t('accounting.date', 'Date')} <ArrowUpDown size={12} /></span>
                                </th>
                                <th className="text-left p-4">{t('accounting.description', 'Description')}</th>
                                <th className="text-left p-4">{t('accounting.counterparty', 'Counterparty')}</th>
                                <th className="text-left p-4">{t('accounting.category', 'Category')}</th>
                                <th className="text-left p-4">{t('accounting.account', 'Account')}</th>
                                <th className="text-right p-4 cursor-pointer hover:text-foreground transition-colors" onClick={() => toggleSort('amount')}>
                                    <span className="flex items-center gap-1 justify-end">{t('accounting.amount', 'Amount')} <ArrowUpDown size={12} /></span>
                                </th>
                                <th className="text-center p-4">{t('accounting.status', 'Status')}</th>
                                <th className="text-center p-4 w-20">{t('accounting.actions', 'Actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-12 text-center text-muted-foreground">
                                        <DollarSign size={40} className="mx-auto mb-3 opacity-40" />
                                        <p className="font-medium">{t('accounting.noTransactions', 'No transactions found')}</p>
                                        <p className="text-xs mt-1">{t('accounting.addFirstTransaction', 'Add your first transaction to get started')}</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((tx) => (
                                    <tr
                                        key={tx.id}
                                        className="border-b border-border/30 hover:bg-secondary/20 transition-colors cursor-pointer group"
                                        onClick={() => startEdit(tx)}
                                    >
                                        <td className="p-4 text-sm text-foreground font-medium whitespace-nowrap">{tx.date}</td>
                                        <td className="p-4 text-sm text-foreground max-w-[200px] truncate">{tx.description}</td>
                                        <td className="p-4 text-sm text-muted-foreground">{tx.counterpartyName || '—'}</td>
                                        <td className="p-4">
                                            <span className="text-xs px-2 py-1 rounded-full bg-secondary/50 text-foreground font-medium">{tx.category || '—'}</span>
                                        </td>
                                        <td className="p-4 text-sm text-muted-foreground">{tx.account || '—'}</td>
                                        <td className={`p-4 text-sm font-bold text-right whitespace-nowrap ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                                            {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-4 text-center">
                                            {tx.aiVerified ? (
                                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                                                    <Sparkles size={10} /> AI
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
                                                    <Clock size={10} /> {t('accounting.pending', 'Pending')}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => setDeleteId(tx.id)}
                                                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                                                aria-label={t('accounting.delete', 'Delete')}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer summary */}
                {filtered.length > 0 && (
                    <div className="px-4 py-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{t('accounting.showingCount', '{{count}} transactions', { count: filtered.length })}</span>
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1.5">
                                <TrendingUp size={12} className="text-green-400" />
                                +${filtered.filter((tx) => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <TrendingDown size={12} className="text-red-400" />
                                -${filtered.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation */}
            <ConfirmationModal
                isOpen={!!deleteId}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteId(null)}
                title={t('accounting.deleteTransaction', 'Delete Transaction?')}
                message={t('accounting.deleteTransactionConfirm', 'This action cannot be undone.')}
                variant="danger"
            />
        </div>
    );
};

export default SmartTransactionTable;
