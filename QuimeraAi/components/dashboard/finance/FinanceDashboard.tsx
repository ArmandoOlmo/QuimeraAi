import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    LayoutGrid, Upload, DollarSign, Calendar, Trash2, CheckCircle2,
    Loader2, TrendingUp, Download, Receipt, Sparkles, AlertTriangle,
    FileText, BarChart3, PieChart as PieChartIcon, Menu, TrendingDown,
    Brain, Zap, Target, Eye, Plus, Search, Building2, List, X
} from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    Area, AreaChart
} from 'recharts';
import {
    startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear,
    isWithinInterval, parseISO, subDays, startOfDay, endOfDay
} from 'date-fns';
import DashboardSidebar from '../DashboardSidebar';
import DashboardWaveRibbons from '../DashboardWaveRibbons';
import { extractExpenseFromReceipt } from '../../../utils/expenseExtractor';
import { ExpenseRecord } from '../../../types/finance';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useAI } from '../../../contexts/ai';
import { useProject } from '../../../contexts/project';
import { generateContentViaProxy, extractTextFromResponse } from '../../../utils/geminiProxyClient';
import { db, collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from '../../../firebase';
import { logApiCall } from '../../../services/apiLoggingService';
import { Skeleton } from '../../ui/skeleton';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "../../ui/sheet";
import { cn } from '../../../utils/cn';
import ConfirmationModal from '../../ui/ConfirmationModal';

const COLORS = ['#4f46e5', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

const CATEGORY_COLORS: Record<string, string> = {
    'Oficina': '#4f46e5',
    'Marketing': '#ec4899',
    'Inventario': '#06b6d4',
    'Comidas': '#f59e0b',
    'Transporte': '#8b5cf6',
    'Servicios': '#10b981',
    'Nómina': '#3b82f6',
    'Otros': '#6b7280'
};

// Local Helper Components
const StatCard = ({ title, value, icon: Icon, trend, trendColor = "text-primary" }: any) => (
    <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-3">
            <div className="p-2 bg-secondary/30 rounded-lg">
                <Icon size={20} className="text-muted-foreground" />
            </div>
            {trend && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-secondary/30 ${trendColor}`}>
                    {trend}
                </span>
            )}
        </div>
        <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
            <h3 className="text-2xl font-bold text-foreground">{value}</h3>
        </div>
    </div>
);

const FinanceDashboard: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { hasApiKey, handleApiError } = useAI();
    const { activeProject } = useProject();

    // AI text generation helper - uses secure proxy with usage tracking
    const generateText = async (prompt: string, _options?: { systemPrompt?: string; temperature?: number; model?: string }, feature: string = 'finance-ai') => {
        const projectId = activeProject?.id || 'finance-dashboard';
        const model = _options?.model || 'gemini-2.5-flash';
        try {
            const response = await generateContentViaProxy(projectId, prompt, model, {
                temperature: _options?.temperature || 0.7
            }, user?.uid);

            // Log successful API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: activeProject?.id,
                    model,
                    feature,
                    success: true
                });
            }

            return extractTextFromResponse(response);
        } catch (error) {
            // Log failed API call
            if (user) {
                logApiCall({
                    userId: user.uid,
                    projectId: activeProject?.id,
                    model,
                    feature,
                    success: false,
                    errorMessage: error instanceof Error ? error.message : 'Unknown error'
                });
            }
            throw error;
        }
    };

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [selectedExpense, setSelectedExpense] = useState<ExpenseRecord | null>(null);
    const [activeView, setActiveView] = useState<'overview' | 'list' | 'analytics'>('overview');

    // AI Features states
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [aiReport, setAiReport] = useState<string | null>(null);
    const [isAnalyzingTrends, setIsAnalyzingTrends] = useState(false);
    const [isRecategorizing, setIsRecategorizing] = useState(false);
    const [trendAnalysis, setTrendAnalysis] = useState<string | null>(null);
    const [showAnomalies, setShowAnomalies] = useState(false);
    const [dateRange, setDateRange] = useState({
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date())
    });
    const [dateFilterPreset, setDateFilterPreset] = useState('thisMonth');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);

    // Estadísticas y métricas
    const totalExpenses = expenses.reduce((acc, curr) => acc + (curr.total || 0), 0);
    const monthlyAverage = expenses.length > 0 ? totalExpenses / Math.max(1, new Set(expenses.map(e => e.date.substring(0, 7))).size) : 0;

    // Agrupar gastos por categoría
    const expensesByCategory = useMemo(() => {
        const grouped = expenses.reduce((acc, expense) => {
            const category = expense.category || 'Otros';
            acc[category] = (acc[category] || 0) + expense.total;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(grouped).map(([name, value]) => ({
            name,
            value,
            percentage: (value / totalExpenses * 100).toFixed(1)
        }));
    }, [expenses, totalExpenses]);

    // Gastos por mes
    const expensesByMonth = useMemo(() => {
        const grouped = expenses.reduce((acc, expense) => {
            const month = expense.date.substring(0, 7); // YYYY-MM
            acc[month] = (acc[month] || 0) + expense.total;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, total]) => ({
                month: new Date(month + '-01').toLocaleDateString('es', { month: 'short', year: 'numeric' }),
                total,
                average: monthlyAverage
            }));
    }, [expenses, monthlyAverage]);

    // Filtrado de gastos
    const filteredExpenses = useMemo(() => {
        return expenses.filter(expense => {
            const matchesSearch = expense.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
                expense.category.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = filterCategory === 'all' || expense.category === filterCategory;

            let matchesDate = true;
            if (dateFilterPreset !== 'all') {
                try {
                    const expenseDate = parseISO(expense.date);
                    // Set end date to end of day to include all transactions on that day
                    const end = endOfDay(dateRange.end);
                    const start = startOfDay(dateRange.start);
                    matchesDate = isWithinInterval(expenseDate, { start, end });
                } catch (e) {
                    console.error('Error parsing date:', e);
                }
            }

            return matchesSearch && matchesCategory && matchesDate;
        });
    }, [expenses, searchTerm, filterCategory, dateRange, dateFilterPreset]);

    const handleDatePresetChange = (preset: string) => {
        setDateFilterPreset(preset);
        const now = new Date();

        switch (preset) {
            case 'thisMonth':
                setDateRange({ start: startOfMonth(now), end: endOfMonth(now) });
                break;
            case 'lastMonth':
                const lastMonth = subMonths(now, 1);
                setDateRange({ start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) });
                break;
            case 'last90Days':
                setDateRange({ start: subDays(now, 90), end: endOfDay(now) });
                break;
            case 'thisYear':
                setDateRange({ start: startOfYear(now), end: endOfYear(now) });
                break;
            case 'all':
                // No specific range needed, logic handles 'all'
                break;
            case 'custom':
                // Keep current range, let user edit
                break;
        }
    };

    const anomalies = useMemo(() => {
        if (expenses.length < 3) return [];

        const avgExpense = totalExpenses / expenses.length;
        const threshold = avgExpense * 2; // Gastos 2x mayores al promedio

        return expenses.filter(e => e.total > threshold).map(e => ({
            ...e,
            reason: `Gasto ${((e.total / avgExpense) * 100).toFixed(0)}% superior al promedio`
        }));
    }, [expenses, totalExpenses]);

    // Realtime persistence per project
    useEffect(() => {
        const userId = user?.uid;
        const projectId = activeProject?.id;
        if (!userId || !projectId) {
            setExpenses([]);
            return;
        }

        const expensesRef = collection(db, 'users', userId, 'projects', projectId, 'finance_expenses');
        const q = query(expensesRef, orderBy('date', 'desc'));
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ExpenseRecord));
                setExpenses(data);
                // Keep selectedExpense in sync if it still exists
                if (selectedExpense?.id) {
                    const updated = data.find(e => e.id === selectedExpense.id) || null;
                    if (updated) setSelectedExpense(updated);
                }
            },
            (err) => {
                console.error('Error fetching expenses:', err);
            }
        );
        return () => unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.uid, activeProject?.id]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        setUploadError(null);

        const userId = user?.uid;
        const projectId = activeProject?.id;

        if (!userId || !projectId) {
            setUploadError(t('financeDashboard.selectProject'));
            setIsUploading(false);
            return;
        }

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
                    console.warn(`File type not supported: ${file.name}`);
                    continue;
                }

                try {
                    const extractedData = await extractExpenseFromReceipt(file, projectId, userId);

                    const newExpense: Omit<ExpenseRecord, 'id'> = {
                        date: extractedData.date || new Date().toISOString().split('T')[0],
                        supplier: extractedData.supplier || 'Desconocido',
                        category: extractedData.category || 'Otros',
                        subtotal: extractedData.subtotal || 0,
                        tax: extractedData.tax || 0,
                        total: extractedData.total || 0,
                        currency: extractedData.currency || 'MXN',
                        items: extractedData.items || [],
                        confidence: extractedData.confidence || 0,
                        status: 'pending',
                        createdAt: serverTimestamp()
                    };

                    const expensesRef = collection(db, 'users', userId, 'projects', projectId, 'finance_expenses');
                    const docRef = await addDoc(expensesRef, { ...newExpense, updatedAt: serverTimestamp() });

                    // Solo seleccionamos el último si se subieron varios
                    if (files.length === 1 || i === files.length - 1) {
                        setSelectedExpense({ id: docRef.id, ...newExpense } as ExpenseRecord);
                    }
                } catch (err: any) {
                    console.error(`Error processing file ${file.name}:`, err);
                    // No cortamos el bucle, seguimos con el siguiente pero guardamos el error
                    setUploadError(`Error procesando ${file.name}: ${err.message}`);
                }
            }

        } catch (error: any) {
            console.error('Error in batch upload:', error);
            setUploadError(error.message || 'Error al procesar los archivos.');
        } finally {
            setIsUploading(false);
            event.target.value = '';
        }
    };

    const handleDeleteExpense = useCallback((id: string) => {
        setDeleteExpenseId(id);
    }, []);

    const handleConfirmDeleteExpense = useCallback(async () => {
        if (!deleteExpenseId) return;
        const userId = user?.uid;
        const projectId = activeProject?.id;
        if (!userId || !projectId) return;
        await deleteDoc(doc(db, 'users', userId, 'projects', projectId, 'finance_expenses', deleteExpenseId));
        if (selectedExpense?.id === deleteExpenseId) setSelectedExpense(null);
        setDeleteExpenseId(null);
    }, [deleteExpenseId, user?.uid, activeProject?.id, selectedExpense?.id]);

    const handleUpdateExpense = useCallback(async (id: string, updates: Partial<ExpenseRecord>) => {
        const userId = user?.uid;
        const projectId = activeProject?.id;
        if (!userId || !projectId) return;
        await updateDoc(doc(db, 'users', userId, 'projects', projectId, 'finance_expenses', id), {
            ...updates,
            updatedAt: serverTimestamp(),
        } as any);
        if (selectedExpense?.id === id) {
            setSelectedExpense(prev => prev ? { ...prev, ...updates } : null);
        }
    }, [user?.uid, activeProject?.id, selectedExpense?.id]);

    const handleUpdateItem = useCallback((idx: number, field: string, value: any) => {
        if (!selectedExpense) return;
        const newItems = [...(selectedExpense.items || [])];

        // Normalize object if it's a string
        if (typeof newItems[idx] === 'string') {
            newItems[idx] = { description: newItems[idx], quantity: 1, total: 0 };
        }

        newItems[idx] = { ...newItems[idx], [field]: value };
        handleUpdateExpense(selectedExpense.id, { items: newItems });
    }, [selectedExpense, handleUpdateExpense]);

    // AI: Generar reporte financiero
    const generateFinancialReport = async () => {
        if (!hasApiKey) {
            handleApiError(new Error('API key required'));
            return;
        }

        setIsGeneratingReport(true);
        try {
            const expensesSummary = JSON.stringify({
                total: totalExpenses,
                count: expenses.length,
                byCategory: expensesByCategory,
                byMonth: expensesByMonth,
                anomalies: anomalies.length
            });

            const prompt = `Genera un reporte financiero ejecutivo profesional basado en estos datos de gastos:

${expensesSummary}

El reporte debe incluir:
1. Resumen ejecutivo (3-4 líneas)
2. Análisis de gastos por categoría con insights
3. Tendencias temporales y patrones
4. Recomendaciones de optimización (3-5 puntos)
5. Alertas sobre gastos anómalos si existen

Formato: Texto limpio, profesional, con bullets y secciones claras.`;

            const report = await generateText(prompt, {
                systemPrompt: 'Eres un analista financiero experto. Genera reportes claros, accionables y profesionales.',
                temperature: 0.7,
                model: 'gemini-1.5-pro' // Better for structured analysis
            }, 'finance-ai-report');

            setAiReport(report);
        } catch (error) {
            handleApiError(error);
        } finally {
            setIsGeneratingReport(false);
        }
    };

    // AI: Análisis predictivo de tendencias
    const analyzeTrends = async () => {
        if (!hasApiKey) {
            handleApiError(new Error('API key required'));
            return;
        }

        setIsAnalyzingTrends(true);
        try {
            const monthlyData = JSON.stringify(expensesByMonth);
            const categoryData = JSON.stringify(expensesByCategory);

            const prompt = `Analiza estas tendencias de gastos y genera predicciones para los próximos 3 meses:

Datos mensuales: ${monthlyData}
Datos por categoría: ${categoryData}

Proporciona:
1. Proyección de gastos para los próximos 3 meses (con rangos min-max)
2. Categorías con mayor crecimiento
3. Alertas de posibles sobrecostos
4. Recomendaciones de presupuesto
5. Oportunidades de ahorro específicas

Sé específico con números y porcentajes.`;

            const analysis = await generateText(prompt, {
                systemPrompt: 'Eres un analista predictivo financiero. Usa análisis de tendencias para generar proyecciones realistas.',
                temperature: 0.6,
                model: 'gemini-2.0-flash-thinking-exp' // Best for reasoning and complex predictions
            }, 'finance-ai-trend-analysis');

            setTrendAnalysis(analysis);
        } catch (error) {
            handleApiError(error);
        } finally {
            setIsAnalyzingTrends(false);
        }
    };

    // AI: Sugerencias de categorización
    const recategorizarExpenseWithAI = async (expenseId: string) => {
        if (!hasApiKey) {
            handleApiError(new Error('API key required'));
            return;
        }

        const expense = expenses.find(e => e.id === expenseId);
        if (!expense) return;

        setIsRecategorizing(true);
        try {
            const prompt = `Analiza este gasto y sugiere la categoría más apropiada:

Proveedor: ${expense.supplier}
Items: ${expense.items?.map((i: any) => typeof i === 'string' ? i : i.description).join(', ') || 'N/A'}
Monto: $${expense.total}
Categoría actual: ${expense.category}

Categorías disponibles: Oficina, Marketing, Inventario, Comidas, Transporte, Servicios, Nómina, Otros

Responde SOLO con el nombre de la categoría sugerida, sin explicación ni puntuación extra.`;

            const suggestedCategory = await generateText(prompt, {
                systemPrompt: 'Eres un experto en categorización de gastos empresariales.',
                temperature: 0.3
            }, 'finance-ai-categorization');

            let category = suggestedCategory.trim().replace(/\.$/, ''); // Remove trailing dot

            // Fuzzy match approach
            const targetCategory = Object.keys(CATEGORY_COLORS).find(c =>
                c.toLowerCase() === category.toLowerCase()
            );

            if (targetCategory) {
                handleUpdateExpense(expenseId, { category: targetCategory });
            } else {
                console.warn(`AI returned unknown category: ${category}`);
                // Fallback: try to find if the response *contains* a valid category
                const fallbackCategory = Object.keys(CATEGORY_COLORS).find(c =>
                    category.toLowerCase().includes(c.toLowerCase())
                );
                if (fallbackCategory) {
                    handleUpdateExpense(expenseId, { category: fallbackCategory });
                }
            }
        } catch (error) {
            handleApiError(error);
        } finally {
            setIsRecategorizing(false);
        }
    };

    // Exportar datos
    const exportToCSV = () => {
        const headers = ['Fecha', 'Proveedor', 'Categoría', 'Subtotal', 'Impuesto', 'Total', 'Estado'];
        const rows = expenses.map(e => [
            e.date,
            e.supplier,
            e.category,
            e.subtotal,
            e.tax,
            e.total,
            e.status
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gastos_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    return (
        <div className="flex h-screen bg-background text-foreground">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden relative bg-background">
                <DashboardWaveRibbons />
                {/* Header */}
                <header className="h-14 px-2 sm:px-6 border-b border-border flex items-center justify-between bg-background z-20 shrink-0">
                    <div className="flex items-center gap-1 sm:gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-lg">
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-1 sm:gap-2">
                            <DollarSign className="text-primary w-5 h-5" />
                            <h1 className="text-lg font-semibold text-foreground hidden sm:block">{t('financeDashboard.title')}</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-3">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            <span className="text-sm font-bold text-foreground">${totalExpenses.toLocaleString()}</span>
                        </div>
                        <button
                            onClick={exportToCSV}
                            disabled={expenses.length === 0}
                            className="px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                    </div>
                </header>

                {/* View Tabs */}
                <div className="flex border-b border-border px-3 sm:px-6 bg-card/50">
                    {[
                        { id: 'overview', label: t('financeDashboard.overview'), icon: BarChart3 },
                        { id: 'list', label: t('financeDashboard.movements'), icon: Receipt },
                        { id: 'analytics', label: t('financeDashboard.aiAnalytics'), icon: Brain }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveView(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeView === tab.id
                                ? 'border-primary text-foreground font-semibold'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                <main className="flex-1 overflow-y-auto p-6">
                    {/* OVERVIEW VIEW */}
                    {activeView === 'overview' && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            {/* Top row: Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard
                                    title={t('financeDashboard.total')}
                                    value={`$${totalExpenses.toLocaleString()}`}
                                    icon={DollarSign}
                                    trend={expenses.length > 0 ? `${expenses.length} tickets` : null}
                                />
                                <StatCard
                                    title={t('financeDashboard.monthlyAverage')}
                                    value={`$${Math.round(monthlyAverage).toLocaleString()}`}
                                    icon={Calendar}
                                />
                                <StatCard
                                    title={t('financeDashboard.activeCategories')}
                                    value={expensesByCategory.length}
                                    icon={LayoutGrid}
                                />
                                <StatCard
                                    title={t('financeDashboard.anomalies')}
                                    value={anomalies.length}
                                    icon={AlertTriangle}
                                    trendColor={anomalies.length > 0 ? "text-red-500" : "text-green-500"}
                                />
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                {/* Left / Main column */}
                                <div className="xl:col-span-2 space-y-6">
                                    {/* Upload Area - Fresha style: Clean and direct */}
                                    <div className="bg-card border border-border rounded-xl p-8 text-center hover:shadow-lg transition-all border-dashed border-2 hover:border-primary/50 group">
                                        <input
                                            type="file"
                                            id="receipt-upload"
                                            className="hidden"
                                            accept="image/*,application/pdf"
                                            onChange={handleFileUpload}
                                            disabled={isUploading}
                                            multiple
                                        />
                                        <label htmlFor="receipt-upload" className="cursor-pointer flex flex-col items-center gap-4">
                                            {isUploading ? (
                                                <div className="relative">
                                                    <Loader2 className="w-16 h-16 text-primary animate-spin" />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Sparkles className="w-6 h-6 text-primary/40" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                                                    <Upload className="w-10 h-10" />
                                                </div>
                                            )}
                                            <div className="space-y-2">
                                                <h3 className="text-xl font-bold text-foreground">
                                                    {isUploading ? t('financeDashboard.upload.processing') : t('financeDashboard.upload.title')}
                                                </h3>
                                                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                                    {t('financeDashboard.upload.description')}
                                                </p>
                                            </div>
                                            {!isUploading && (
                                                <span className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:scale-105 transition-transform active:scale-95">
                                                    <Plus size={18} />
                                                    {t('financeDashboard.selectFile')}
                                                </span>
                                            )}
                                        </label>
                                        {uploadError && (
                                            <div className="mt-6 flex items-center gap-2 justify-center text-red-500 text-sm font-medium bg-red-500/5 p-3 rounded-lg border border-red-500/20">
                                                <AlertTriangle size={16} />
                                                <span>{uploadError}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Charts Section */}
                                    {expenses.length > 0 ? (
                                        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                                            <div className="flex justify-between items-center mb-6">
                                                <h3 className="font-bold text-lg flex items-center gap-2">
                                                    <TrendingUp className="w-5 h-5 text-primary" />
                                                    {t('financeDashboard.monthlyTrend')}
                                                </h3>
                                                <div className="flex gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full bg-primary" />
                                                        <span className="text-xs text-muted-foreground font-medium">{t('financeDashboard.charts.expenses')}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full bg-orange-500 border border-orange-500 border-dashed" />
                                                        <span className="text-xs text-muted-foreground font-medium">{t('financeDashboard.charts.average')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="h-[300px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={expensesByMonth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                        <defs>
                                                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                                                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                                        <XAxis
                                                            dataKey="month"
                                                            stroke="#94a3b8"
                                                            axisLine={false}
                                                            tickLine={false}
                                                            tick={{ fontSize: 11 }}
                                                        />
                                                        <YAxis
                                                            stroke="#94a3b8"
                                                            axisLine={false}
                                                            tickLine={false}
                                                            tick={{ fontSize: 11 }}
                                                            tickFormatter={(value) => `$${value.toLocaleString()}`}
                                                        />
                                                        <Tooltip
                                                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                                            itemStyle={{ color: '#f1f5f9', fontWeight: 'bold' }}
                                                            labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                                                        />
                                                        <Area
                                                            type="monotone"
                                                            dataKey="total"
                                                            stroke="#4f46e5"
                                                            strokeWidth={3}
                                                            fillOpacity={1}
                                                            fill="url(#colorTotal)"
                                                            name="Total"
                                                            animationDuration={1500}
                                                        />
                                                        <Line
                                                            type="monotone"
                                                            dataKey="average"
                                                            stroke="#f59e0b"
                                                            strokeWidth={2}
                                                            strokeDasharray="5 5"
                                                            name="Promedio"
                                                            dot={false}
                                                        />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-6">
                                            <div className="bg-card border border-border rounded-xl p-6 h-[380px] flex flex-col">
                                                <Skeleton className="h-6 w-48 mb-6" />
                                                <div className="flex-1 flex items-center justify-center">
                                                    <div className="text-center space-y-4">
                                                        <div className="w-16 h-16 bg-secondary/30 rounded-full mx-auto animate-pulse flex items-center justify-center">
                                                            <BarChart3 className="w-8 h-8 text-muted-foreground/30" />
                                                        </div>
                                                        <p className="text-muted-foreground italic text-sm">{t('financeDashboard.charts.waitingForData')}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Bottom Grid: Categories */}
                                    {expenses.length > 0 && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                                                <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                                                    <PieChartIcon className="w-5 h-5 text-primary" />
                                                    {t('financeDashboard.byCategory')}
                                                </h3>
                                                <div className="h-[250px]">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie
                                                                data={expensesByCategory}
                                                                cx="50%"
                                                                cy="50%"
                                                                innerRadius={60}
                                                                outerRadius={80}
                                                                paddingAngle={5}
                                                                dataKey="value"
                                                            >
                                                                {expensesByCategory.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip
                                                                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                                                itemStyle={{ color: '#fff' }}
                                                            />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>

                                            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                                                <h3 className="font-bold text-lg mb-6">{t('financeDashboard.topCategories')}</h3>
                                                <div className="space-y-4">
                                                    {expensesByCategory.slice(0, 5).map((cat, idx) => (
                                                        <div key={cat.name} className="flex flex-col gap-1.5">
                                                            <div className="flex items-center justify-between text-sm">
                                                                <span className="font-semibold flex items-center gap-2">
                                                                    <div
                                                                        className="w-2 h-2 rounded-full"
                                                                        style={{ backgroundColor: CATEGORY_COLORS[cat.name] || '#6b7280' }}
                                                                    />
                                                                    {cat.name}
                                                                </span>
                                                                <span className="text-muted-foreground font-bold">${cat.value.toLocaleString()}</span>
                                                            </div>
                                                            <div className="w-full h-1.5 bg-secondary/30 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full transition-all duration-1000"
                                                                    style={{
                                                                        width: `${cat.percentage}%`,
                                                                        backgroundColor: CATEGORY_COLORS[cat.name] || '#6b7280'
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right Column - Siderbar Context */}
                                <div className="space-y-6">
                                    {/* Recent Activity Mini-Card */}
                                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                                        <h3 className="font-bold mb-4">{t('financeDashboard.recentActivity')}</h3>
                                        <div className="space-y-4">
                                            {expenses.slice(0, 4).map(expense => (
                                                <div key={expense.id} className="flex items-center gap-3">
                                                    <div
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                                                        style={{ backgroundColor: `${CATEGORY_COLORS[expense.category]}20`, color: CATEGORY_COLORS[expense.category] }}
                                                    >
                                                        {expense.supplier.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-bold truncate">{expense.supplier}</p>
                                                        <p className="text-[10px] text-muted-foreground">{expense.date}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold">${expense.total.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {expenses.length === 0 && (
                                                <p className="text-xs text-muted-foreground italic text-center py-4">{t('financeDashboard.noRecentActivity')}</p>
                                            )}
                                            <button
                                                onClick={() => setActiveView('list')}
                                                className="w-full text-xs font-bold text-primary hover:underline pt-2 border-t border-border/50 text-center"
                                            >
                                                {t('financeDashboard.viewAllMovements')}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Anomalies Preview */}
                                    {anomalies.length > 0 && (
                                        <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-6">
                                            <div className="flex items-center gap-2 mb-4 text-orange-500">
                                                <AlertTriangle size={18} />
                                                <h3 className="font-bold">{t('financeDashboard.aiAlerts')} ({anomalies.length})</h3>
                                            </div>
                                            <div className="space-y-3">
                                                {anomalies.slice(0, 2).map(anomaly => (
                                                    <div key={anomaly.id} className="text-xs p-3 bg-card border border-orange-500/10 rounded-lg">
                                                        <p className="font-bold mb-1">{anomaly.supplier}</p>
                                                        <p className="text-muted-foreground line-clamp-2">{anomaly.reason}</p>
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={() => setActiveView('analytics')}
                                                    className="w-full text-xs font-bold text-orange-500 hover:underline text-center pt-2"
                                                >
                                                    {t('financeDashboard.goToAnalysis')}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Anomalies Alert */}
                            {showAnomalies && anomalies.length > 0 && (
                                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                                    <div className="flex items-start gap-2 mb-3">
                                        <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                                        <div>
                                            <h4 className="font-bold text-yellow-600 dark:text-yellow-400">{t('financeDashboard.anomaliesDetected')}</h4>
                                            <p className="text-xs text-muted-foreground mt-1">{anomalies.length} {t('financeDashboard.unusualExpenses')}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {anomalies.slice(0, 3).map(anomaly => (
                                            <div key={anomaly.id} className="bg-background/50 rounded-lg p-3 text-sm">
                                                <div className="flex justify-between mb-1">
                                                    <span className="font-semibold">{anomaly.supplier}</span>
                                                    <span className="text-red-500 font-bold">${anomaly.total}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">{anomaly.reason}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => setShowAnomalies(!showAnomalies)}
                                className="w-full py-2 px-4 rounded-lg border border-border hover:bg-secondary transition-colors text-sm font-medium"
                            >
                                <Eye className="w-4 h-4 inline mr-2" />
                                {showAnomalies ? t('financeDashboard.hideAnomalies') : t('financeDashboard.showAnomalies')} {t('financeDashboard.anomalies')} ({anomalies.length})
                            </button>
                        </div>
                    )}

                    {/* LIST VIEW */}
                    {activeView === 'list' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 justify-between items-center bg-card">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                            <Receipt size={18} />
                                        </div>
                                        <h3 className="font-bold text-foreground shrink-0">{t('financeDashboard.recentMovements')}</h3>
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{filteredExpenses.length}</span>
                                    </div>
                                    <div className="flex gap-2 w-full max-w-md">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="text"
                                                placeholder={t('financeDashboard.supplier') + '...'}
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <select
                                                value={dateFilterPreset}
                                                onChange={(e) => handleDatePresetChange(e.target.value)}
                                                className="bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer h-10"
                                            >
                                                <option value="thisMonth">{t('financeDashboard.filters.time.thisMonth')}</option>
                                                <option value="lastMonth">{t('financeDashboard.filters.time.lastMonth')}</option>
                                                <option value="last90Days">{t('financeDashboard.filters.time.last90Days')}</option>
                                                <option value="thisYear">{t('financeDashboard.filters.time.thisYear')}</option>
                                                <option value="all">{t('financeDashboard.filters.time.all')}</option>
                                                <option value="custom">{t('financeDashboard.filters.time.custom')}</option>
                                            </select>

                                            {dateFilterPreset === 'custom' && (
                                                <div className="flex gap-2 items-center bg-background border border-border rounded-lg px-2 h-10">
                                                    <input
                                                        type="date"
                                                        value={dateRange.start.toISOString().split('T')[0]}
                                                        onChange={(e) => setDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))}
                                                        className="bg-transparent text-sm outline-none w-32"
                                                    />
                                                    <span className="text-muted-foreground">-</span>
                                                    <input
                                                        type="date"
                                                        value={dateRange.end.toISOString().split('T')[0]}
                                                        onChange={(e) => setDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))}
                                                        className="bg-transparent text-sm outline-none w-32"
                                                    />
                                                </div>
                                            )}

                                            <select
                                                value={filterCategory}
                                                onChange={(e) => setFilterCategory(e.target.value)}
                                                className="bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer h-10"
                                            >
                                                <option value="all">{t('financeDashboard.filters.allCategories')}</option>
                                                {Object.keys(CATEGORY_COLORS).map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-secondary/20 text-muted-foreground font-bold uppercase text-xs">
                                            <tr>
                                                <th className="px-4 py-3">{t('financeDashboard.date')}</th>
                                                <th className="px-4 py-3">{t('financeDashboard.supplier')}</th>
                                                <th className="px-4 py-3">{t('financeDashboard.category')}</th>
                                                <th className="px-4 py-3 text-right">{t('financeDashboard.total')}</th>
                                                <th className="px-4 py-3 text-center">{t('financeDashboard.status')}</th>
                                                <th className="px-4 py-3 text-right">{t('financeDashboard.actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {filteredExpenses.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground italic">
                                                        {expenses.length === 0 ? t('financeDashboard.noExpenses') : t('financeDashboard.noExpenses')}
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredExpenses.map(expense => (
                                                    <tr
                                                        key={expense.id}
                                                        className={`hover:bg-secondary/10 transition-colors cursor-pointer ${selectedExpense?.id === expense.id ? 'bg-primary/5 border-l-2 border-primary' : ''}`}
                                                        onClick={() => setSelectedExpense(expense)}
                                                    >
                                                        <td className="px-4 py-3 font-medium">{expense.date}</td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
                                                                    {expense.supplier.charAt(0).toUpperCase()}
                                                                </div>
                                                                {expense.supplier}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span
                                                                className="px-2 py-1 rounded-full text-xs font-medium"
                                                                style={{
                                                                    backgroundColor: `${CATEGORY_COLORS[expense.category]}20`,
                                                                    color: CATEGORY_COLORS[expense.category]
                                                                }}
                                                            >
                                                                {expense.category}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold">
                                                            ${expense.total.toLocaleString()}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {expense.status === 'approved' ? (
                                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-600 text-xs font-bold border border-green-500/20">
                                                                    <CheckCircle2 size={12} />
                                                                    <span>{t('financeDashboard.approved')}</span>
                                                                </div>
                                                            ) : (
                                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 text-xs font-bold border border-yellow-500/20">
                                                                    <Loader2 size={12} className="animate-spin" />
                                                                    <span>{t('financeDashboard.pending')}</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteExpense(expense.id); }}
                                                                className="text-muted-foreground hover:text-red-500 transition-colors"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Detail Panel */}
                            <div className="lg:col-span-1">
                                {selectedExpense ? (
                                    <div className="bg-card border border-border rounded-xl flex flex-col h-[calc(100vh-200px)] sticky top-6 shadow-xl shadow-black/5">
                                        <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                    <FileText size={16} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-sm">{t('financeDashboard.expenseDetail')}</h3>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">ID: {selectedExpense.id.slice(0, 8)}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setSelectedExpense(null)}
                                                className="p-1 hover:bg-muted rounded-md transition-colors"
                                            >
                                                <X size={16} className="text-muted-foreground" />
                                            </button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-5 space-y-6">
                                            {/* Header Amount */}
                                            <div className="text-center py-4 border-b border-border border-dashed">
                                                <p className="text-xs font-medium text-muted-foreground mb-1">{t('financeDashboard.details.totalAmount')}</p>
                                                <div className="flex items-center justify-center gap-1">
                                                    <span className="text-3xl font-bold tracking-tight">${selectedExpense.total.toLocaleString()}</span>
                                                </div>
                                                <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${selectedExpense.status === 'approved' ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'}`}>
                                                    {selectedExpense.status === 'approved' ? <CheckCircle2 size={12} /> : <Loader2 size={12} className="animate-spin" />}
                                                    {selectedExpense.status === 'approved' ? t('financeDashboard.details.verifiedApproved') : t('financeDashboard.details.pendingReview')}
                                                </div>
                                            </div>

                                            {/* Form Fields */}
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">{t('financeDashboard.date')}</label>
                                                        <div className="relative">
                                                            <Calendar className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                                                            <input
                                                                type="date"
                                                                value={selectedExpense.date}
                                                                onChange={(e) => handleUpdateExpense(selectedExpense.id, { date: e.target.value })}
                                                                className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">{t('financeDashboard.category')}</label>
                                                        <select
                                                            value={selectedExpense.category}
                                                            onChange={(e) => handleUpdateExpense(selectedExpense.id, { category: e.target.value })}
                                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none"
                                                            style={{ color: CATEGORY_COLORS[selectedExpense.category] }}
                                                        >
                                                            {Object.keys(CATEGORY_COLORS).map(cat => (
                                                                <option key={cat} value={cat}>{cat}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">{t('financeDashboard.supplier')}</label>
                                                    <div className="relative">
                                                        <Building2 className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                                                        <input
                                                            type="text"
                                                            value={selectedExpense.supplier}
                                                            onChange={(e) => handleUpdateExpense(selectedExpense.id, { supplier: e.target.value })}
                                                            className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Line Items */}
                                                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                                                            <List size={12} />
                                                            {t('financeDashboard.items.detected')}
                                                        </h4>
                                                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">{t('financeDashboard.items.scanTag')}</span>
                                                    </div>

                                                    {selectedExpense.items && selectedExpense.items.length > 0 ? (
                                                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                                                            {selectedExpense.items.map((item: any, idx: number) => {
                                                                const itemData = typeof item === 'string' ? { description: item } : item;
                                                                return (
                                                                    <div key={idx} className="flex flex-col gap-2 p-3 bg-background rounded border border-border/50 group focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                                                                        <div className="flex gap-2">
                                                                            <input
                                                                                type="text"
                                                                                value={itemData.description || ''}
                                                                                onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                                                                                placeholder={t('financeDashboard.items.description')}
                                                                                className="flex-1 bg-transparent border-none p-0 text-xs font-medium focus:ring-0 placeholder:text-muted-foreground/50 w-full"
                                                                            />
                                                                            <input
                                                                                type="number"
                                                                                value={itemData.total || 0}
                                                                                onChange={(e) => handleUpdateItem(idx, 'total', parseFloat(e.target.value))}
                                                                                className="w-16 bg-transparent border-none p-0 text-xs font-bold text-right focus:ring-0"
                                                                                placeholder="$0.00"
                                                                            />
                                                                        </div>
                                                                        <div className="flex items-center gap-2 border-t border-border/30 pt-2">
                                                                            <div className="flex items-center gap-1">
                                                                                <span className="text-[10px] text-muted-foreground">{t('financeDashboard.items.quantity')}</span>
                                                                                <input
                                                                                    type="number"
                                                                                    value={itemData.quantity || 1}
                                                                                    onChange={(e) => handleUpdateItem(idx, 'quantity', parseFloat(e.target.value))}
                                                                                    className="w-10 bg-secondary/30 rounded px-1 py-0.5 text-[10px] text-center border-none focus:ring-0 focus:bg-secondary/50"
                                                                                />
                                                                            </div>
                                                                            <div className="flex-1" />
                                                                            <select
                                                                                value={itemData.category || ''}
                                                                                onChange={(e) => handleUpdateItem(idx, 'category', e.target.value)}
                                                                                className="bg-transparent text-[10px] border-none focus:ring-0 text-muted-foreground p-0 cursor-pointer hover:text-foreground text-right"
                                                                            >
                                                                                <option value="">{t('financeDashboard.items.uncategorized')}</option>
                                                                                {Object.keys(CATEGORY_COLORS).map(cat => (
                                                                                    <option key={cat} value={cat}>{cat}</option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-4 text-muted-foreground text-xs italic">
                                                            {t('financeDashboard.items.noItems')}
                                                        </div>
                                                    )}

                                                    <div className="mt-4 pt-3 border-t border-border/50 space-y-1">
                                                        <div className="flex justify-between text-xs text-muted-foreground">
                                                            <span>{t('financeDashboard.subtotal')}</span>
                                                            <span>${selectedExpense.subtotal.toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex justify-between text-xs text-muted-foreground">
                                                            <span>{t('financeDashboard.taxes')}</span>
                                                            <span>${selectedExpense.tax.toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex justify-between text-sm font-bold pt-1 text-foreground">
                                                            <span>{t('financeDashboard.total')}</span>
                                                            <span>${selectedExpense.total.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer Actions */}
                                        <div className="p-4 border-t border-border bg-muted/10 grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => recategorizarExpenseWithAI(selectedExpense.id)}
                                                disabled={isRecategorizing}
                                                className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border bg-background hover:bg-secondary text-xs font-bold transition-colors disabled:opacity-50"
                                            >
                                                {isRecategorizing ? (
                                                    <Loader2 size={14} className="animate-spin text-purple-500" />
                                                ) : (
                                                    <Sparkles size={14} className="text-purple-500" />
                                                )}
                                                {isRecategorizing ? t('financeDashboard.recategorizing') : t('financeDashboard.recategorizeAI')}
                                            </button>
                                            <button
                                                onClick={() => handleUpdateExpense(selectedExpense.id, { status: 'approved' })}
                                                disabled={selectedExpense.status === 'approved'}
                                                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${selectedExpense.status === 'approved'
                                                    ? 'bg-green-500 text-white opacity-90 cursor-default'
                                                    : 'bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/20'
                                                    }`}
                                            >
                                                {selectedExpense.status === 'approved' ? (
                                                    <>
                                                        <CheckCircle2 size={14} />
                                                        {t('financeDashboard.approved')}
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle2 size={14} />
                                                        {t('financeDashboard.approveExpense')}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 bg-secondary/5 rounded-xl border border-dashed border-border/50 min-h-[400px]">
                                        <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mb-4">
                                            <Receipt className="w-8 h-8 opacity-40" />
                                        </div>
                                        <h3 className="font-bold text-foreground mb-1">{t('financeDashboard.details.selectMovement')}</h3>
                                        <p className="text-sm text-center max-w-[200px]">{t('financeDashboard.details.selectMovementDesc')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* AI ANALYTICS VIEW */}
                    {activeView === 'analytics' && (
                        <div className="max-w-5xl mx-auto space-y-6">
                            {/* AI Actions */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 rounded-xl p-6">
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className="p-3 bg-primary/20 rounded-lg">
                                            <FileText className="w-6 h-6 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-lg mb-1">{t('financeDashboard.aiFinancialReport')}</h3>
                                            <p className="text-sm text-muted-foreground">{t('financeDashboard.generateReport')}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={generateFinancialReport}
                                        disabled={isGeneratingReport || expenses.length === 0}
                                        className="w-full py-3 px-4 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isGeneratingReport ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                {t('financeDashboard.generating')}
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4" />
                                                {t('financeDashboard.generateReportBtn')}
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/30 rounded-xl p-6">
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className="p-3 bg-purple-500/20 rounded-lg">
                                            <TrendingUp className="w-6 h-6 text-purple-500" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-lg mb-1">{t('financeDashboard.trendAnalysis')}</h3>
                                            <p className="text-sm text-muted-foreground">{t('financeDashboard.analyzeDesc')}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={analyzeTrends}
                                        disabled={isAnalyzingTrends || expenses.length === 0}
                                        className="w-full py-3 px-4 rounded-lg bg-purple-500 text-white font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isAnalyzingTrends ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                {t('financeDashboard.generating')}
                                            </>
                                        ) : (
                                            <>
                                                <Brain className="w-4 h-4" />
                                                {t('financeDashboard.analyzeTrends')}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* AI Report Output */}
                            {aiReport && (
                                <div className="bg-card border border-border rounded-xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <Zap className="w-5 h-5 text-primary" />
                                            {t('financeDashboard.analysis.generatedReport')}
                                        </h3>
                                        <button
                                            onClick={() => setAiReport(null)}
                                            className="text-muted-foreground hover:text-foreground"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap bg-secondary/20 rounded-lg p-4 border border-border">
                                        {aiReport}
                                    </div>
                                </div>
                            )}

                            {/* Trend Analysis Output */}
                            {trendAnalysis && (
                                <div className="bg-card border border-purple-500/30 rounded-xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <TrendingDown className="w-5 h-5 text-purple-500" />
                                            {t('financeDashboard.analysis.predictiveAnalysis')}
                                        </h3>
                                        <button
                                            onClick={() => setTrendAnalysis(null)}
                                            className="text-muted-foreground hover:text-foreground"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap bg-purple-500/5 rounded-lg p-4 border border-purple-500/20">
                                        {trendAnalysis}
                                    </div>
                                </div>
                            )}

                            {expenses.length === 0 && (
                                <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center col-span-1 md:col-span-2">
                                    <Brain className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
                                    <h3 className="text-lg font-bold mb-2">{t('financeDashboard.analysis.noDataTitle')}</h3>
                                    <p className="text-sm text-muted-foreground">{t('financeDashboard.analysis.noDataDesc')}</p>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div >

            {/* Delete Expense Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!deleteExpenseId}
                onConfirm={handleConfirmDeleteExpense}
                onCancel={() => setDeleteExpenseId(null)}
                title={t('financeDashboard.deleteExpenseTitle', '¿Eliminar gasto?')}
                message={t('financeDashboard.deleteConfirm', 'Esta acción eliminará el gasto permanentemente.')}
                variant="danger"
            />
        </div >
    );
};

export default FinanceDashboard;
