/**
 * InvoiceHistory
 * Display payment history and invoices
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTenant } from '../../../contexts/tenant/TenantContext';
import { db } from '@/utils/compatData';
import { collection, query, where, orderBy, getDocs, limit } from '@/utils/compatData';
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
import QuimeraLoader from '@/components/ui/QuimeraLoader';
import { CatalogFilterBar, FilterChipRow } from '../filters';
import AppSelect from '../../ui/AppSelect';
import { AgencyPanel, AgencyStatCard } from './AgencyDesignSystem';

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
                bg: 'bg-q-success/10 dark:bg-q-success/12',
                text: 'text-q-success dark:text-q-success',
                label: 'Exitoso',
                icon: <CheckCircle className="h-3.5 w-3.5" />,
            },
            paid: {
                bg: 'bg-q-success/10 dark:bg-q-success/12',
                text: 'text-q-success dark:text-q-success',
                label: 'Pagado',
                icon: <CheckCircle className="h-3.5 w-3.5" />,
            },
            failed: {
                bg: 'bg-q-error/10 dark:bg-q-error/12',
                text: 'text-q-error dark:text-q-error',
                label: 'Fallido',
                icon: <XCircle className="h-3.5 w-3.5" />,
            },
            refunded: {
                bg: 'bg-q-accent/10 dark:bg-q-accent/12',
                text: 'text-q-accent dark:text-q-accent',
                label: 'Reembolsado',
                icon: <DollarSign className="h-3.5 w-3.5" />,
            },
            pending: {
                bg: 'bg-q-accent/10 dark:bg-q-accent/12',
                text: 'text-q-accent dark:text-q-accent',
                label: 'Pendiente',
                icon: <Clock className="h-3.5 w-3.5" />,
            },
            draft: {
                bg: 'bg-q-surface-overlay dark:bg-gray-900/20',
                text: 'text-q-text dark:text-gray-400',
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

    const paymentStatusOptions = useMemo(() => [
        { id: 'all', label: 'Todos los estados', count: payments.length },
        { id: 'succeeded', label: 'Exitoso', count: payments.filter((p) => p.status === 'succeeded').length, color: 'green' as const },
        { id: 'failed', label: 'Fallido', count: payments.filter((p) => p.status === 'failed').length, color: 'gray' as const },
        { id: 'pending', label: 'Pendiente', count: payments.filter((p) => p.status === 'pending').length },
    ], [payments]);

    const invoiceStatusOptions = useMemo(() => [
        { id: 'all', label: 'Todos los estados', count: invoices.length },
        { id: 'draft', label: 'Borrador', count: invoices.filter((i) => i.status === 'draft').length, color: 'gray' as const },
        { id: 'sent', label: 'Enviado', count: invoices.filter((i) => i.status === 'sent').length },
        { id: 'paid', label: 'Pagado', count: invoices.filter((i) => i.status === 'paid').length, color: 'green' as const },
        { id: 'overdue', label: 'Vencido', count: invoices.filter((i) => i.status === 'overdue').length, color: 'gray' as const },
    ], [invoices]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <QuimeraLoader size="md" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <AgencyStatCard
                    icon={DollarSign}
                    label="Ingresos Totales"
                    value={formatCurrency(calculateTotalRevenue())}
                    tone="success"
                    hint={dateRange === 'all'
                        ? 'Todo el tiempo'
                        : `Últimos ${dateRange === '7d' ? '7' : dateRange === '30d' ? '30' : '90'} días`}
                />
                <AgencyStatCard
                    icon={TrendingUp}
                    label="Pago Promedio"
                    value={formatCurrency(calculateAveragePayment())}
                    tone="accent"
                    hint="Por transacción"
                />
                <AgencyStatCard
                    icon={CheckCircle}
                    label="Transacciones"
                    value={payments.filter((p) => p.status === 'succeeded').length}
                    hint={`Exitosas de ${payments.length} totales`}
                />
            </div>

            <CatalogFilterBar
                filters={
                    <>
                        <FilterChipRow
                            options={[
                                { id: 'payments', label: 'Pagos', count: payments.length },
                                { id: 'invoices', label: 'Invoices', count: invoices.length },
                            ]}
                            value={activeView}
                            onChange={(value) => {
                                setActiveView(value as 'payments' | 'invoices');
                                setFilterStatus('all');
                            }}
                        />
                        <FilterChipRow
                            options={activeView === 'payments' ? paymentStatusOptions : invoiceStatusOptions}
                            value={filterStatus}
                            onChange={setFilterStatus}
                        />
                    </>
                }
                trailing={
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-q-text-muted" />
                        <AppSelect
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value as any)}
                            className="px-3 py-2 border border-q-border dark:border-gray-600 rounded-lg bg-q-surface text-foreground text-sm focus:ring-2 focus:ring-q-accent/35"
                        >
                            <option value="7d">Últimos 7 días</option>
                            <option value="30d">Últimos 30 días</option>
                            <option value="90d">Últimos 90 días</option>
                            <option value="all">Todo</option>
                        </AppSelect>
                    </div>
                }
            />

            {/* Content */}
            {activeView === 'payments' ? (
                <AgencyPanel contentClassName="!p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-q-text-muted uppercase">
                                        Fecha
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-q-text-muted uppercase">
                                        Cliente
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-q-text-muted uppercase">
                                        Monto
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-q-text-muted uppercase">
                                        Estado
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-q-text-muted uppercase">
                                        ID Transacción
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredPayments.map((payment) => (
                                    <tr
                                        key={payment.id}
                                        className="hover:bg-q-surface-overlay dark:hover:bg-gray-700/50"
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
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-q-text-muted font-mono">
                                            {payment.stripePaymentIntentId?.substring(0, 20)}...
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredPayments.length === 0 && (
                        <div className="text-center py-12">
                            <DollarSign className="h-12 w-12 text-q-text-muted mx-auto mb-4" />
                            <p className="text-q-text-muted">
                                No hay pagos para mostrar
                            </p>
                        </div>
                    )}
                </AgencyPanel>
            ) : (
                <AgencyPanel contentClassName="!p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-q-text-muted uppercase">
                                        Período
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-q-text-muted uppercase">
                                        Cliente
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-q-text-muted uppercase">
                                        Base
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-q-text-muted uppercase">
                                        Overages
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-q-text-muted uppercase">
                                        Total
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-q-text-muted uppercase">
                                        Estado
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-q-text-muted uppercase">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredInvoices.map((invoice) => (
                                    <tr
                                        key={invoice.id}
                                        className="hover:bg-q-surface-overlay dark:hover:bg-gray-700/50"
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
                                                className="inline-flex items-center gap-1 text-sm text-q-accent hover:text-q-accent dark:text-q-accent dark:hover:text-q-accent"
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
                            <FileText className="h-12 w-12 text-q-text-muted mx-auto mb-4" />
                            <p className="text-q-text-muted">
                                No hay invoices para mostrar
                            </p>
                        </div>
                    )}
                </AgencyPanel>
            )}
        </div>
    );
}
