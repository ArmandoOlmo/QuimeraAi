/**
 * ReportsView
 * Vista para generar y descargar reportes
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    FileDown,
    FileSpreadsheet,
    Calendar,
    Package,
    ShoppingCart,
    Users,
    DollarSign,
    Loader2,
    Check,
    AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../../../contexts/core/AuthContext';
import { useEditor } from '../../../../contexts/EditorContext';
import { useOrders } from '../hooks/useOrders';
import { useProducts } from '../hooks/useProducts';
import { useCustomers } from '../hooks/useCustomers';
import { exportOrdersToCSV, exportOrdersSummary, exportSingleOrder } from '../utils/exportOrders';
import { OrderStatus } from '../../../../types/ecommerce';
import { useEcommerceContext } from '../EcommerceDashboard';

type ReportType = 'orders' | 'orders_summary' | 'products' | 'customers' | 'inventory';

interface ReportOption {
    id: ReportType;
    title: string;
    description: string;
    icon: React.ElementType;
}

const ReportsView: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { storeId } = useEcommerceContext();
    const { orders } = useOrders(user?.uid || '', storeId);
    const { products } = useProducts(user?.uid || '', storeId);
    const { customers } = useCustomers(user?.uid || '', storeId);

    const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
    });
    const [selectedStatuses, setSelectedStatuses] = useState<OrderStatus[]>([]);
    const [includeItems, setIncludeItems] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [success, setSuccess] = useState(false);

    const reportOptions: ReportOption[] = [
        {
            id: 'orders',
            title: 'Reporte de Pedidos',
            description: 'Exporta todos los pedidos con detalle',
            icon: ShoppingCart,
        },
        {
            id: 'orders_summary',
            title: 'Resumen de Ventas',
            description: 'Estadísticas generales de ventas',
            icon: DollarSign,
        },
        {
            id: 'products',
            title: 'Catálogo de Productos',
            description: 'Lista completa de productos',
            icon: Package,
        },
        {
            id: 'customers',
            title: 'Lista de Clientes',
            description: 'Información de todos los clientes',
            icon: Users,
        },
        {
            id: 'inventory',
            title: 'Inventario',
            description: 'Stock actual de productos',
            icon: FileSpreadsheet,
        },
    ];

    const statusOptions: { value: OrderStatus; label: string }[] = [
        { value: 'pending', label: 'Pendiente' },
        { value: 'paid', label: 'Pagado' },
        { value: 'processing', label: 'En preparación' },
        { value: 'shipped', label: 'Enviado' },
        { value: 'delivered', label: 'Entregado' },
        { value: 'cancelled', label: 'Cancelado' },
        { value: 'refunded', label: 'Reembolsado' },
    ];

    const toggleStatus = (status: OrderStatus) => {
        setSelectedStatuses((prev) =>
            prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
        );
    };

    const generateReport = async () => {
        if (!selectedReport) return;

        setIsGenerating(true);
        setSuccess(false);

        try {
            const startDate = new Date(dateRange.start);
            const endDate = new Date(dateRange.end);
            endDate.setHours(23, 59, 59, 999);

            switch (selectedReport) {
                case 'orders':
                    exportOrdersToCSV(orders, {
                        dateRange: { start: startDate, end: endDate },
                        statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
                        includeItems,
                    });
                    break;

                case 'orders_summary':
                    const filteredOrders = orders.filter((order) => {
                        const orderDate = new Date(order.createdAt.seconds * 1000);
                        return orderDate >= startDate && orderDate <= endDate;
                    });
                    exportOrdersSummary(filteredOrders);
                    break;

                case 'products':
                    exportProductsToCSV(products);
                    break;

                case 'customers':
                    exportCustomersToCSV(customers);
                    break;

                case 'inventory':
                    exportInventoryToCSV(products);
                    break;
            }

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error('Error generating report:', err);
        } finally {
            setIsGenerating(false);
        }
    };

    // Export products to CSV
    const exportProductsToCSV = (products: any[]) => {
        const data = products.map((p) => ({
            'ID': p.id,
            'Nombre': p.name,
            'SKU': p.sku || '',
            'Precio': p.price.toFixed(2),
            'Precio Comparar': p.compareAtPrice?.toFixed(2) || '',
            'Categoría': p.categoryId || '',
            'Estado': p.status,
            'En Stock': p.quantity,
            'Descripción': p.shortDescription || '',
        }));

        downloadCSV(data, `productos_${new Date().toISOString().split('T')[0]}.csv`);
    };

    // Export customers to CSV
    const exportCustomersToCSV = (customers: any[]) => {
        const data = customers.map((c) => ({
            'ID': c.id,
            'Nombre': `${c.firstName} ${c.lastName}`,
            'Email': c.email,
            'Teléfono': c.phone || '',
            'Total Pedidos': c.totalOrders,
            'Total Gastado': c.totalSpent.toFixed(2),
            'Acepta Marketing': c.acceptsMarketing ? 'Sí' : 'No',
            'Fecha Registro': c.createdAt ? new Date(c.createdAt.seconds * 1000).toLocaleDateString() : '',
        }));

        downloadCSV(data, `clientes_${new Date().toISOString().split('T')[0]}.csv`);
    };

    // Export inventory to CSV
    const exportInventoryToCSV = (products: any[]) => {
        const data = products
            .filter((p) => p.trackInventory)
            .map((p) => ({
                'SKU': p.sku || p.id,
                'Producto': p.name,
                'Stock Actual': p.quantity,
                'Umbral Bajo Stock': p.lowStockThreshold || 5,
                'Estado': p.quantity === 0 ? 'Agotado' : p.quantity <= (p.lowStockThreshold || 5) ? 'Bajo' : 'OK',
                'Costo': p.costPrice?.toFixed(2) || '',
                'Precio': p.price.toFixed(2),
            }));

        downloadCSV(data, `inventario_${new Date().toISOString().split('T')[0]}.csv`);
    };

    // Generic CSV download
    const downloadCSV = (data: Record<string, any>[], fileName: string) => {
        if (data.length === 0) return;

        const headers = Object.keys(data[0]);
        const csvRows = [
            headers.join(','),
            ...data.map((row) =>
                headers
                    .map((header) => {
                        const value = String(row[header] ?? '');
                        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value;
                    })
                    .join(',')
            ),
        ];

        const blob = new Blob(['\ufeff' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-foreground">
                    {t('ecommerce.reports', 'Reportes')}
                </h2>
                <p className="text-muted-foreground">
                    {t('ecommerce.reportsDesc', 'Genera y descarga reportes de tu tienda')}
                </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Report Selection */}
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="font-medium text-foreground">Selecciona un reporte</h3>
                    <div className="space-y-2">
                        {reportOptions.map((report) => {
                            const Icon = report.icon;
                            const isSelected = selectedReport === report.id;
                            return (
                                <button
                                    key={report.id}
                                    onClick={() => setSelectedReport(report.id)}
                                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                                        isSelected
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-primary/50 bg-card/50'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`p-2 rounded-lg ${
                                                isSelected ? 'bg-primary/20' : 'bg-muted'
                                            }`}
                                        >
                                            <Icon
                                                size={20}
                                                className={isSelected ? 'text-primary' : 'text-muted-foreground'}
                                            />
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground">{report.title}</p>
                                            <p className="text-sm text-muted-foreground">{report.description}</p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Report Options */}
                <div className="lg:col-span-2">
                    {selectedReport ? (
                        <div className="bg-card/50 rounded-xl border border-border p-6 space-y-6">
                            <h3 className="font-semibold text-foreground">
                                Configurar reporte
                            </h3>

                            {/* Date Range */}
                            {['orders', 'orders_summary'].includes(selectedReport) && (
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                                        <Calendar className="inline mr-2" size={16} />
                                        Rango de fechas
                                    </label>
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-xs text-muted-foreground mb-1">Desde</label>
                                            <input
                                                type="date"
                                                value={dateRange.start}
                                                onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                                                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs text-muted-foreground mb-1">Hasta</label>
                                            <input
                                                type="date"
                                                value={dateRange.end}
                                                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                                                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Status Filter */}
                            {selectedReport === 'orders' && (
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                                        Filtrar por estado (opcional)
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {statusOptions.map((status) => (
                                            <button
                                                key={status.value}
                                                onClick={() => toggleStatus(status.value)}
                                                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                                                    selectedStatuses.includes(status.value)
                                                        ? 'border-primary bg-primary/10 text-primary'
                                                        : 'border-border text-muted-foreground hover:border-primary/50'
                                                }`}
                                            >
                                                {status.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Include Items */}
                            {selectedReport === 'orders' && (
                                <div>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={includeItems}
                                            onChange={(e) => setIncludeItems(e.target.checked)}
                                            className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                                        />
                                        <div>
                                            <p className="font-medium text-foreground">Incluir detalle de productos</p>
                                            <p className="text-sm text-muted-foreground">
                                                Agrega columnas con los productos de cada pedido
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            )}

                            {/* Generate Button */}
                            <div className="pt-4 border-t border-border">
                                <button
                                    onClick={generateReport}
                                    disabled={isGenerating}
                                    className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
                                        success
                                            ? 'bg-green-500 text-white'
                                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                    } disabled:opacity-50`}
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="animate-spin" size={20} />
                                            Generando...
                                        </>
                                    ) : success ? (
                                        <>
                                            <Check size={20} />
                                            ¡Descargado!
                                        </>
                                    ) : (
                                        <>
                                            <FileDown size={20} />
                                            Descargar CSV
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-card/50 rounded-xl border border-border p-12 text-center">
                            <FileSpreadsheet className="mx-auto text-muted-foreground mb-4" size={48} />
                            <h3 className="text-lg font-medium text-foreground mb-2">
                                Selecciona un tipo de reporte
                            </h3>
                            <p className="text-muted-foreground">
                                Elige el reporte que deseas generar del panel izquierdo
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportsView;
