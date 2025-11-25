import React, { useState, useMemo } from 'react';
import { 
    LayoutGrid, Upload, DollarSign, Calendar, Trash2, CheckCircle2, 
    Loader2, TrendingUp, Download, Receipt, Sparkles, AlertTriangle,
    FileText, BarChart3, PieChart as PieChartIcon, Menu, TrendingDown,
    Brain, Zap, Target, Eye
} from 'lucide-react';
import { 
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    Area, AreaChart
} from 'recharts';
import DashboardSidebar from '../DashboardSidebar';
import { extractExpenseFromReceipt } from '../../../utils/expenseExtractor';
import { ExpenseRecord } from '../../../types/finance';
import { useEditor } from '../../../contexts/EditorContext';

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

const FinanceDashboard: React.FC = () => {
    const { generateText, hasApiKey, handleApiError } = useEditor();
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
    const [trendAnalysis, setTrendAnalysis] = useState<string | null>(null);
    const [showAnomalies, setShowAnomalies] = useState(false);

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

    // Detección de anomalías
    const anomalies = useMemo(() => {
        if (expenses.length < 3) return [];
        
        const avgExpense = totalExpenses / expenses.length;
        const threshold = avgExpense * 2; // Gastos 2x mayores al promedio
        
        return expenses.filter(e => e.total > threshold).map(e => ({
            ...e,
            reason: `Gasto ${((e.total / avgExpense) * 100).toFixed(0)}% superior al promedio`
        }));
    }, [expenses, totalExpenses]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        setUploadError(null);

        try {
            const file = files[0];
            
            if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
                throw new Error('Formato no soportado. Sube una imagen o PDF.');
            }

            const extractedData = await extractExpenseFromReceipt(file);

            const newExpense: ExpenseRecord = {
                id: Date.now().toString(),
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
                createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 }
            };

            setExpenses(prev => [newExpense, ...prev]);
            setSelectedExpense(newExpense);

        } catch (error: any) {
            console.error('Error processing receipt:', error);
            setUploadError(error.message || 'Error al procesar el recibo.');
        } finally {
            setIsUploading(false);
            event.target.value = '';
        }
    };

    const handleDeleteExpense = (id: string) => {
        if (confirm('¿Estás seguro de eliminar este registro?')) {
            setExpenses(prev => prev.filter(e => e.id !== id));
            if (selectedExpense?.id === id) setSelectedExpense(null);
        }
    };

    const handleUpdateExpense = (id: string, updates: Partial<ExpenseRecord>) => {
        setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
        if (selectedExpense?.id === id) {
            setSelectedExpense(prev => prev ? { ...prev, ...updates } : null);
        }
    };

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
                temperature: 0.7
            });

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
                temperature: 0.6
            });

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

        try {
            const prompt = `Analiza este gasto y sugiere la categoría más apropiada:

Proveedor: ${expense.supplier}
Items: ${expense.items?.map(i => i.description).join(', ') || 'N/A'}
Monto: $${expense.total}
Categoría actual: ${expense.category}

Categorías disponibles: Oficina, Marketing, Inventario, Comidas, Transporte, Servicios, Nómina, Otros

Responde SOLO con el nombre de la categoría sugerida, sin explicación.`;

            const suggestedCategory = await generateText(prompt, {
                systemPrompt: 'Eres un experto en categorización de gastos empresariales.',
                temperature: 0.3
            });

            const category = suggestedCategory.trim();
            if (Object.keys(CATEGORY_COLORS).includes(category)) {
                handleUpdateExpense(expenseId, { category });
            }
        } catch (error) {
            handleApiError(error);
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
                {/* Header */}
                <header className="h-14 px-6 border-b border-border flex items-center justify-between bg-background z-20 shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden">
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <DollarSign className="text-primary w-5 h-5" />
                            <h1 className="text-lg font-semibold text-foreground">Finanzas & Gastos AI</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
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
                <div className="flex border-b border-border px-6 bg-card/50">
                    {[
                        { id: 'overview', label: 'Resumen', icon: BarChart3 },
                        { id: 'list', label: 'Movimientos', icon: Receipt },
                        { id: 'analytics', label: 'AI Analytics', icon: Brain }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveView(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                                activeView === tab.id
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
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            {/* Left / Main column */}
                            <div className="xl:col-span-2 space-y-6">
                                {/* Upload Area */}
                                <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                                    <input
                                        type="file"
                                        id="receipt-upload"
                                        className="hidden"
                                        accept="image/*,application/pdf"
                                        onChange={handleFileUpload}
                                        disabled={isUploading}
                                    />
                                    <label htmlFor="receipt-upload" className="cursor-pointer flex flex-col items-center gap-3">
                                        {isUploading ? (
                                            <Loader2 className="w-12 h-12 text-primary animate-spin" />
                                        ) : (
                                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
                                                <Upload className="w-8 h-8" />
                                            </div>
                                        )}
                                        <h3 className="text-lg font-bold text-foreground">
                                            {isUploading ? 'Analizando con IA...' : 'Sube tu Factura o Ticket'}
                                        </h3>
                                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                            IA extraerá automáticamente fecha, proveedor, montos y categorizará el gasto
                                        </p>
                                        {!isUploading && (
                                            <span className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold mt-2">
                                                Seleccionar Archivo
                                            </span>
                                        )}
                                    </label>
                                    {uploadError && (
                                        <p className="text-red-500 text-sm mt-4 font-medium bg-red-500/10 py-2 rounded">
                                            Error: {uploadError}
                                        </p>
                                    )}
                                </div>

                                {/* Charts */}
                                {expenses.length > 0 && (
                                    <>
                                        {/* Trend Line Chart */}
                                        <div className="bg-card border border-border rounded-xl p-6">
                                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                                <TrendingUp className="w-5 h-5 text-primary" />
                                                Tendencia de Gastos Mensuales
                                            </h3>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <AreaChart data={expensesByMonth}>
                                                    <defs>
                                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                                                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                                    <XAxis dataKey="month" stroke="#94a3b8" />
                                                    <YAxis stroke="#94a3b8" />
                                                    <Tooltip 
                                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                                        labelStyle={{ color: '#f1f5f9' }}
                                                    />
                                                    <Legend />
                                                    <Area type="monotone" dataKey="total" stroke="#4f46e5" fillOpacity={1} fill="url(#colorTotal)" name="Total Gastos" />
                                                    <Line type="monotone" dataKey="average" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Promedio" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>

                                        {/* Category Distribution */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-card border border-border rounded-xl p-6">
                                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                                    <PieChartIcon className="w-5 h-5 text-primary" />
                                                    Por Categoría
                                                </h3>
                                                <ResponsiveContainer width="100%" height={250}>
                                                    <PieChart>
                                                        <Pie
                                                            data={expensesByCategory}
                                                            cx="50%"
                                                            cy="50%"
                                                            labelLine={false}
                                                            label={entry => `${entry.percentage}%`}
                                                            outerRadius={80}
                                                            fill="#8884d8"
                                                            dataKey="value"
                                                        >
                                                            {expensesByCategory.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip 
                                                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>

                                            <div className="bg-card border border-border rounded-xl p-6">
                                                <h3 className="text-lg font-bold mb-4">Top Categorías</h3>
                                                <div className="space-y-3">
                                                    {expensesByCategory.slice(0, 5).map((cat) => (
                                                        <div key={cat.name} className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div 
                                                                    className="w-3 h-3 rounded-full" 
                                                                    style={{ backgroundColor: CATEGORY_COLORS[cat.name] || '#6b7280' }}
                                                                />
                                                                <span className="text-sm font-medium">{cat.name}</span>
                                                            </div>
                                                            <span className="text-sm font-bold">${cat.value.toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {expenses.length === 0 && (
                                    <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
                                        <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
                                        <h3 className="text-lg font-bold mb-2">Sin datos aún</h3>
                                        <p className="text-sm text-muted-foreground">Sube tu primer recibo para ver gráficas y análisis</p>
                                    </div>
                                )}
                            </div>

                            {/* Right Sidebar - Stats */}
                            <div className="space-y-6">
                                {/* Quick Stats */}
                                <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Target className="w-5 h-5 text-primary" />
                                        <h3 className="font-bold">Estadísticas</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Total Gastos</p>
                                            <p className="text-2xl font-bold text-primary">${totalExpenses.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Promedio Mensual</p>
                                            <p className="text-xl font-bold">${monthlyAverage.toFixed(0).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Total Movimientos</p>
                                            <p className="text-xl font-bold">{expenses.length}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Categorías Activas</p>
                                            <p className="text-xl font-bold">{expensesByCategory.length}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Anomalies Alert */}
                                {showAnomalies && anomalies.length > 0 && (
                                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                                        <div className="flex items-start gap-2 mb-3">
                                            <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                                            <div>
                                                <h4 className="font-bold text-yellow-600 dark:text-yellow-400">Gastos Anómalos Detectados</h4>
                                                <p className="text-xs text-muted-foreground mt-1">{anomalies.length} gastos inusuales encontrados</p>
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
                                    {showAnomalies ? 'Ocultar' : 'Ver'} Anomalías ({anomalies.length})
                                </button>
                            </div>
                        </div>
                    )}

                    {/* LIST VIEW */}
                    {activeView === 'list' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <div className="bg-card border border-border rounded-xl overflow-hidden">
                                    <div className="p-4 border-b border-border flex justify-between items-center">
                                        <h3 className="font-bold text-foreground">Movimientos Recientes</h3>
                                    </div>
                                    
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-secondary/20 text-muted-foreground font-bold uppercase text-xs">
                                                <tr>
                                                    <th className="px-4 py-3">Fecha</th>
                                                    <th className="px-4 py-3">Proveedor</th>
                                                    <th className="px-4 py-3">Categoría</th>
                                                    <th className="px-4 py-3 text-right">Total</th>
                                                    <th className="px-4 py-3 text-center">Estado</th>
                                                    <th className="px-4 py-3 text-right">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {expenses.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground italic">
                                                            No hay gastos registrados aún. Sube tu primer recibo.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    expenses.map(expense => (
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
                                                                {expense.status === 'approved' && <CheckCircle2 size={16} className="inline text-green-500"/>}
                                                                {expense.status === 'pending' && <Loader2 size={16} className="inline text-yellow-500"/>}
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
                            </div>

                            {/* Detail Panel */}
                            <div className="lg:col-span-1">
                                {selectedExpense ? (
                                    <div className="bg-card border border-border rounded-xl p-6 sticky top-6">
                                        <div className="flex justify-between items-start mb-6">
                                            <h3 className="text-lg font-bold flex items-center gap-2">
                                                <Receipt className="text-primary" size={20} />
                                                Detalle del Gasto
                                            </h3>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">Proveedor</label>
                                                <input 
                                                    type="text" 
                                                    value={selectedExpense.supplier}
                                                    onChange={(e) => handleUpdateExpense(selectedExpense.id, { supplier: e.target.value })}
                                                    className="w-full bg-secondary/20 border border-border rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-primary/50 outline-none"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">Fecha</label>
                                                    <input 
                                                        type="date" 
                                                        value={selectedExpense.date}
                                                        onChange={(e) => handleUpdateExpense(selectedExpense.id, { date: e.target.value })}
                                                        className="w-full bg-secondary/20 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">Total</label>
                                                    <input 
                                                        type="number" 
                                                        value={selectedExpense.total}
                                                        onChange={(e) => handleUpdateExpense(selectedExpense.id, { total: parseFloat(e.target.value) || 0 })}
                                                        className="w-full bg-secondary/20 border border-border rounded-lg px-3 py-2 text-sm font-bold text-green-600 focus:ring-2 focus:ring-primary/50 outline-none"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">Categoría</label>
                                                <select 
                                                    value={selectedExpense.category}
                                                    onChange={(e) => handleUpdateExpense(selectedExpense.id, { category: e.target.value })}
                                                    className="w-full bg-secondary/20 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                                >
                                                    {Object.keys(CATEGORY_COLORS).map(cat => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={() => recategorizarExpenseWithAI(selectedExpense.id)}
                                                    className="mt-2 w-full text-xs flex items-center justify-center gap-2 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                                >
                                                    <Sparkles className="w-3 h-3" />
                                                    Recategorizar con IA
                                                </button>
                                            </div>

                                            <div className="bg-secondary/10 rounded-lg p-4 border border-border">
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-muted-foreground">Subtotal:</span>
                                                    <span>${selectedExpense.subtotal.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-muted-foreground">Impuestos:</span>
                                                    <span>${selectedExpense.tax.toLocaleString()}</span>
                                                </div>
                                                <div className="border-t border-border mt-2 pt-2 flex justify-between font-bold text-lg">
                                                    <span>Total:</span>
                                                    <span>${selectedExpense.total.toLocaleString()}</span>
                                                </div>
                                            </div>

                                            {selectedExpense.confidence < 0.8 && (
                                                <div className="bg-yellow-500/10 text-yellow-600 text-xs p-3 rounded-lg border border-yellow-500/20 flex items-start gap-2">
                                                    <TrendingUp size={14} className="mt-0.5 shrink-0" />
                                                    <p>Revisa los datos. Confianza de IA: {Math.round(selectedExpense.confidence * 100)}%</p>
                                                </div>
                                            )}

                                            <div className="flex gap-3 pt-4">
                                                <button 
                                                    onClick={() => handleUpdateExpense(selectedExpense.id, { status: 'approved' })}
                                                    className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-colors ${selectedExpense.status === 'approved' ? 'bg-green-500 text-white cursor-default' : 'bg-primary text-primary-foreground hover:opacity-90'}`}
                                                    disabled={selectedExpense.status === 'approved'}
                                                >
                                                    {selectedExpense.status === 'approved' ? 'Aprobado' : 'Aprobar Gasto'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 bg-secondary/5 rounded-xl border border-dashed border-border/50">
                                        <Receipt className="w-12 h-12 mb-4 opacity-20" />
                                        <p className="text-sm text-center">Selecciona un gasto de la lista para ver detalles</p>
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
                                            <h3 className="font-bold text-lg mb-1">Reporte Financiero AI</h3>
                                            <p className="text-sm text-muted-foreground">Genera un análisis ejecutivo completo de tus gastos</p>
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
                                                Generando...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4" />
                                                Generar Reporte
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
                                            <h3 className="font-bold text-lg mb-1">Análisis Predictivo</h3>
                                            <p className="text-sm text-muted-foreground">Proyecciones y tendencias para los próximos meses</p>
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
                                                Analizando...
                                            </>
                                        ) : (
                                            <>
                                                <Brain className="w-4 h-4" />
                                                Analizar Tendencias
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
                                            Reporte Generado
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
                                            Análisis Predictivo
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
                                <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
                                    <Brain className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
                                    <h3 className="text-lg font-bold mb-2">Sin datos para analizar</h3>
                                    <p className="text-sm text-muted-foreground">Sube algunos recibos primero para desbloquear análisis AI</p>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default FinanceDashboard;
