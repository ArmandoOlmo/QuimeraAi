/**
 * InvoiceHistory
 * Display payment history and invoices
 */

import React, { useState, useEffect } from 'react';
import { useTenant } from '../../../contexts/tenant/TenantContext';
import { db } from '../../../firebase';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import {
    FileText,
    Download,
    CheckCircle,
    XCircle,
    Clock,
    DollarSign,
    TrendingUp,
    Calendar,
    Filter,
} from 'lucide-react';

interface Payment {
    id: string;
    clientTenantId: string;
    clientName?: string;
    amount: number;
    currency: string;
    status: 'succeeded' | 'failed' | 'refunded' | 'pending';
    createdAt: Date;
    stripePaymentIntentId?: string;
    stripeInvoiceId?: string;
}

interface Invoice {
    id: string;
    clientTenantId: string;
    clientName: string;
    month: number;
    year: number;
    baseCharge: number;
    overageCharges?: any[];
    totalOverage: number;
    totalAmount: number;
    status: 'draft' | 'sent' | 'paid' | 'overdue';
    createdAt: Date;
}

export function InvoiceHistory() {
    const { currentTenant } = useTenant();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState<'payments' | 'invoices'>('payments');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

    useEffect(() => {
        loadData();
    }, [currentTenant, dateRange]);

    const loadData = async () => {
        if (!currentTenant) return;

        setLoading(true);

        try {
            await Promise.all([loadPayments(), loadInvoices()]);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadPayments = async () => {
        if (!currentTenant) return;

        const startDate = getStartDate();

        let q = query(
            collection(db, 'payments'),
            where('agencyTenantId', '==', currentTenant.id),
            orderBy('createdAt', 'desc'),
            limit(100)
        );

        const snapshot = await getDocs(q);
        const paymentsData: Payment[] = [];

        snapshot.forEach((doc) => {
            const data = doc.data();
            paymentsData.push({
                id: doc.id,
                clientTenantId: data.clientTenantId,
                clientName: data.clientName,
                amount: data.amount,
                currency: data.currency || 'usd',
                status: data.status,
                createdAt: data.createdAt?.toDate() || new Date(),
                stripePaymentIntentId: data.stripePaymentIntentId,
                stripeInvoiceId: data.stripeInvoiceId,
            });
        });

        // Filter by date range
        const filteredPayments = paymentsData.filter((p) => p.createdAt >= startDate);

        setPayments(filteredPayments);
    };

    const loadInvoices = async () => {
        if (!currentTenant) return;

        const q = query(
            collection(db, 'invoices'),
            where('agencyTenantId', '==', currentTenant.id),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const snapshot = await getDocs(q);
        const invoicesData: Invoice[] = [];

        snapshot.forEach((doc) => {
            const data = doc.data();
            invoicesData.push({
                id: doc.id,
                clientTenantId: data.clientTenantId,
                clientName: data.clientName,
                month: data.month,
                year: data.year,
                baseCharge: data.baseCharge,
                overageCharges: data.overageCharges || [],
                totalOverage: data.totalOverage || 0,
                totalAmount: data.totalAmount,
                status: data.status,
                createdAt: data.createdAt?.toDate() || new Date(),
            });
        });

        setInvoices(invoicesData);
    };

    const getStartDate = () => {
        const now = new Date();
        switch (dateRange) {
            case '7d':
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            case '30d':
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            case '90d':
                return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            default:
                return new Date(0);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<
            string,
            { bg: string; text: string; label: string; icon: React.ReactNode }
        > = {
            succeeded: {
                bg: 'bg-green-100 dark:bg-green-900/20',
                text: 'text-green-800 dark:text-green-400',
                label: 'Exitoso',
                icon: <CheckCircle className="h-3.5 w-3.5" />,
            },
            paid: {
                bg: 'bg-green-100 dark:bg-green-900/20',
                text: 'text-green-800 dark:text-green-400',
                label: 'Pagado',
                icon: <CheckCircle className="h-3.5 w-3.5" />,
            },
            failed: {
                bg: 'bg-red-100 dark:bg-red-900/20',
                text: 'text-red-800 dark:text-red-400',
                label: 'Fallido',
                icon: <XCircle className="h-3.5 w-3.5" />,
            },
            refunded: {
                bg: 'bg-yellow-100 dark:bg-yellow-900/20',
                text: 'text-yellow-800 dark:text-yellow-400',
                label: 'Reembolsado',
                icon: <DollarSign className="h-3.5 w-3.5" />,
            },
            pending: {
                bg: 'bg-blue-100 dark:bg-blue-900/20',
                text: 'text-blue-800 dark:text-blue-400',
                label: 'Pendiente',
                icon: <Clock className="h-3.5 w-3.5" />,
            },
            draft: {
                bg: 'bg-gray-100 dark:bg-gray-900/20',
                text: 'text-gray-800 dark:text-gray-400',
                label: 'Borrador',
                icon: <FileText className="h-3.5 w-3.5" />,
            },
        };

        const style = styles[status] || styles.pending;

        return (
            <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
            >
                {style.icon}
                {style.label}
            </span>
        );
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('es-MX', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const calculateTotalRevenue = () => {
        return payments
            .filter((p) => p.status === 'succeeded')
            .reduce((sum, p) => sum + p.amount, 0);
    };

    const calculateAveragePayment = () => {
        const successfulPayments = payments.filter((p) => p.status === 'succeeded');
        if (successfulPayments.length === 0) return 0;
        return successfulPayments.reduce((sum, p) => sum + p.amount, 0) / successfulPayments.length;
    };

    const filteredPayments =
        filterStatus === 'all'
            ? payments
            : payments.filter((p) => p.status === filterStatus);

    const filteredInvoices =
        filterStatus === 'all'
            ? invoices
            : invoices.filter((i) => i.status === filterStatus);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-muted-foreground">
                            Ingresos Totales
                        </span>
                    </div>
                    <p className="text-3xl font-bold text-foreground">
                        {formatCurrency(calculateTotalRevenue())}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                        {dateRange === 'all'
                            ? 'Todo el tiempo'
                            : `Últimos ${dateRange === '7d' ? '7' : dateRange === '30d' ? '30' : '90'} días`}
                    </p>
                </div>

                <div className="bg-card rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-medium text-muted-foreground">
                            Pago Promedio
                        </span>
                    </div>
                    <p className="text-3xl font-bold text-foreground">
                        {formatCurrency(calculateAveragePayment())}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Por transacción</p>
                </div>

                <div className="bg-card rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <CheckCircle className="h-5 w-5 text-purple-600" />
                        <span className="text-sm font-medium text-muted-foreground">
                            Transacciones
                        </span>
                    </div>
                    <p className="text-3xl font-bold text-foreground">
                        {payments.filter((p) => p.status === 'succeeded').length}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Exitosas de {payments.length} totales
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {/* View Tabs */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveView('payments')}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeView === 'payments'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                        >
                            Pagos
                        </button>
                        <button
                            onClick={() => setActiveView('invoices')}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeView === 'invoices'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                        >
                            Invoices
                        </button>
                    </div>

                    {/* Status Filter */}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-card text-foreground text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="succeeded">Exitoso</option>
                        <option value="failed">Fallido</option>
                        <option value="pending">Pendiente</option>
                        {activeView === 'invoices' && <option value="paid">Pagado</option>}
                    </select>
                </div>

                {/* Date Range */}
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value as any)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-card text-foreground text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="7d">Últimos 7 días</option>
                        <option value="30d">Últimos 30 días</option>
                        <option value="90d">Últimos 90 días</option>
                        <option value="all">Todo</option>
                    </select>
                </div>
            </div>

            {/* Content */}
            {activeView === 'payments' ? (
                <div className="bg-card rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        Fecha
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        Cliente
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        Monto
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        Estado
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        ID Transacción
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredPayments.map((payment) => (
                                    <tr
                                        key={payment.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                            {formatDate(payment.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                                            {payment.clientName || 'Cliente'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground">
                                            {formatCurrency(payment.amount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(payment.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground font-mono">
                                            {payment.stripePaymentIntentId?.substring(0, 20)}...
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredPayments.length === 0 && (
                        <div className="text-center py-12">
                            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-muted-foreground">
                                No hay pagos para mostrar
                            </p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-card rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        Período
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        Cliente
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        Base
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        Overages
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        Total
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        Estado
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredInvoices.map((invoice) => (
                                    <tr
                                        key={invoice.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                            {new Date(invoice.year, invoice.month - 1).toLocaleDateString(
                                                'es-MX',
                                                { month: 'long', year: 'numeric' }
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                                            {invoice.clientName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                            {formatCurrency(invoice.baseCharge)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                            {formatCurrency(invoice.totalOverage)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground">
                                            {formatCurrency(invoice.totalAmount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(invoice.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <button
                                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                                title="Descargar invoice"
                                            >
                                                <Download className="h-4 w-4" />
                                                PDF
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredInvoices.length === 0 && (
                        <div className="text-center py-12">
                            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-muted-foreground">
                                No hay invoices para mostrar
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
