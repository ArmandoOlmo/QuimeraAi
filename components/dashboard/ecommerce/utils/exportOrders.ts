/**
 * Export Orders Utilities
 * Funciones para exportar pedidos a CSV/Excel
 */

import { Order, OrderStatus } from '../../../../types/ecommerce';

// Type for export format
export type ExportFormat = 'csv' | 'xlsx';

// Export options
export interface ExportOrdersOptions {
    format: ExportFormat;
    dateRange?: {
        start: Date;
        end: Date;
    };
    statuses?: OrderStatus[];
    includeItems?: boolean;
    fileName?: string;
}

// Format order data for export
const formatOrderForExport = (order: Order, includeItems: boolean) => {
    const baseData = {
        'Número de Pedido': order.orderNumber,
        'Fecha': new Date(order.createdAt.seconds * 1000).toLocaleDateString('es-MX'),
        'Hora': new Date(order.createdAt.seconds * 1000).toLocaleTimeString('es-MX'),
        'Estado': getStatusLabel(order.status),
        'Estado de Pago': getPaymentStatusLabel(order.paymentStatus),
        'Cliente': order.customerName,
        'Email': order.customerEmail,
        'Teléfono': order.customerPhone || '',
        'Dirección': formatAddress(order.shippingAddress),
        'Método de Pago': order.paymentMethod,
        'Subtotal': order.subtotal.toFixed(2),
        'Descuento': order.discount.toFixed(2),
        'Código Descuento': order.discountCode || '',
        'Envío': order.shippingCost.toFixed(2),
        'Impuestos': order.taxAmount.toFixed(2),
        'Total': order.total.toFixed(2),
        'Moneda': order.currency,
        'Número de Productos': order.items.length,
        'Notas del Cliente': order.customerNotes || '',
        'Número de Rastreo': order.trackingNumber || '',
    };

    if (includeItems) {
        const itemsData = order.items.map((item, index) => ({
            [`Producto ${index + 1}`]: item.name,
            [`SKU ${index + 1}`]: item.sku || '',
            [`Cantidad ${index + 1}`]: item.quantity,
            [`Precio Unitario ${index + 1}`]: item.unitPrice.toFixed(2),
            [`Total ${index + 1}`]: item.totalPrice.toFixed(2),
        }));

        // Merge items into base data
        return itemsData.reduce((acc, item) => ({ ...acc, ...item }), baseData);
    }

    return baseData;
};

// Get status label
const getStatusLabel = (status: OrderStatus): string => {
    const labels: Record<OrderStatus, string> = {
        pending: 'Pendiente',
        paid: 'Pagado',
        processing: 'En preparación',
        shipped: 'Enviado',
        delivered: 'Entregado',
        cancelled: 'Cancelado',
        refunded: 'Reembolsado',
    };
    return labels[status] || status;
};

// Get payment status label
const getPaymentStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
        pending: 'Pendiente',
        paid: 'Pagado',
        failed: 'Fallido',
        refunded: 'Reembolsado',
        partially_refunded: 'Parcialmente reembolsado',
    };
    return labels[status] || status;
};

// Format address
const formatAddress = (address: Order['shippingAddress']): string => {
    if (!address) return '';
    return `${address.address1}, ${address.city}, ${address.state} ${address.zipCode}, ${address.country}`;
};

// Convert to CSV
const convertToCSV = (data: Record<string, any>[]): string => {
    if (data.length === 0) return '';

    // Get all unique headers
    const headers = [...new Set(data.flatMap(Object.keys))];

    // Create CSV content
    const csvRows = [
        headers.join(','),
        ...data.map((row) =>
            headers
                .map((header) => {
                    const value = row[header] ?? '';
                    // Escape quotes and wrap in quotes if contains comma or newline
                    const stringValue = String(value);
                    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                        return `"${stringValue.replace(/"/g, '""')}"`;
                    }
                    return stringValue;
                })
                .join(',')
        ),
    ];

    return csvRows.join('\n');
};

// Download file
const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob(['\ufeff' + content], { type: mimeType }); // BOM for UTF-8
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Export orders to CSV
 */
export const exportOrdersToCSV = (
    orders: Order[],
    options: Omit<ExportOrdersOptions, 'format'> = {}
): void => {
    const { includeItems = false, fileName } = options;

    // Filter orders if needed
    let filteredOrders = [...orders];

    if (options.dateRange) {
        const { start, end } = options.dateRange;
        filteredOrders = filteredOrders.filter((order) => {
            const orderDate = new Date(order.createdAt.seconds * 1000);
            return orderDate >= start && orderDate <= end;
        });
    }

    if (options.statuses && options.statuses.length > 0) {
        filteredOrders = filteredOrders.filter((order) =>
            options.statuses!.includes(order.status)
        );
    }

    // Format data
    const data = filteredOrders.map((order) => formatOrderForExport(order, includeItems));

    // Convert to CSV
    const csv = convertToCSV(data);

    // Generate filename
    const date = new Date().toISOString().split('T')[0];
    const defaultFileName = `pedidos_${date}.csv`;

    // Download
    downloadFile(csv, fileName || defaultFileName, 'text/csv;charset=utf-8');
};

/**
 * Export orders summary
 */
export const exportOrdersSummary = (orders: Order[]): void => {
    // Calculate summary stats
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const statusCounts = orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const paymentMethodCounts = orders.reduce((acc, order) => {
        acc[order.paymentMethod] = (acc[order.paymentMethod] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Create summary data
    const summaryData = [
        { 'Métrica': 'Total de Pedidos', 'Valor': totalOrders },
        { 'Métrica': 'Ingresos Totales', 'Valor': `$${totalRevenue.toFixed(2)}` },
        { 'Métrica': 'Valor Promedio de Pedido', 'Valor': `$${avgOrderValue.toFixed(2)}` },
        { 'Métrica': '', 'Valor': '' },
        { 'Métrica': '--- Por Estado ---', 'Valor': '' },
        ...Object.entries(statusCounts).map(([status, count]) => ({
            'Métrica': getStatusLabel(status as OrderStatus),
            'Valor': count,
        })),
        { 'Métrica': '', 'Valor': '' },
        { 'Métrica': '--- Por Método de Pago ---', 'Valor': '' },
        ...Object.entries(paymentMethodCounts).map(([method, count]) => ({
            'Métrica': method,
            'Valor': count,
        })),
    ];

    // Convert to CSV
    const csv = convertToCSV(summaryData);

    // Download
    const date = new Date().toISOString().split('T')[0];
    downloadFile(csv, `resumen_pedidos_${date}.csv`, 'text/csv;charset=utf-8');
};

/**
 * Export single order
 */
export const exportSingleOrder = (order: Order): void => {
    // Order details
    const orderDetails = [
        { 'Campo': 'Número de Pedido', 'Valor': order.orderNumber },
        { 'Campo': 'Fecha', 'Valor': new Date(order.createdAt.seconds * 1000).toLocaleString('es-MX') },
        { 'Campo': 'Estado', 'Valor': getStatusLabel(order.status) },
        { 'Campo': 'Estado de Pago', 'Valor': getPaymentStatusLabel(order.paymentStatus) },
        { 'Campo': '', 'Valor': '' },
        { 'Campo': '--- Cliente ---', 'Valor': '' },
        { 'Campo': 'Nombre', 'Valor': order.customerName },
        { 'Campo': 'Email', 'Valor': order.customerEmail },
        { 'Campo': 'Teléfono', 'Valor': order.customerPhone || '-' },
        { 'Campo': '', 'Valor': '' },
        { 'Campo': '--- Dirección de Envío ---', 'Valor': '' },
        { 'Campo': 'Dirección', 'Valor': order.shippingAddress.address1 },
        { 'Campo': 'Ciudad', 'Valor': order.shippingAddress.city },
        { 'Campo': 'Estado', 'Valor': order.shippingAddress.state },
        { 'Campo': 'Código Postal', 'Valor': order.shippingAddress.zipCode },
        { 'Campo': 'País', 'Valor': order.shippingAddress.country },
        { 'Campo': '', 'Valor': '' },
        { 'Campo': '--- Productos ---', 'Valor': '' },
        ...order.items.map((item, index) => ({
            'Campo': `Producto ${index + 1}`,
            'Valor': `${item.name} x${item.quantity} - $${item.totalPrice.toFixed(2)}`,
        })),
        { 'Campo': '', 'Valor': '' },
        { 'Campo': '--- Totales ---', 'Valor': '' },
        { 'Campo': 'Subtotal', 'Valor': `$${order.subtotal.toFixed(2)}` },
        { 'Campo': 'Descuento', 'Valor': `-$${order.discount.toFixed(2)}` },
        { 'Campo': 'Envío', 'Valor': `$${order.shippingCost.toFixed(2)}` },
        { 'Campo': 'Impuestos', 'Valor': `$${order.taxAmount.toFixed(2)}` },
        { 'Campo': 'Total', 'Valor': `$${order.total.toFixed(2)}` },
    ];

    // Convert to CSV
    const csv = convertToCSV(orderDetails);

    // Download
    downloadFile(csv, `pedido_${order.orderNumber}.csv`, 'text/csv;charset=utf-8');
};

export default {
    exportOrdersToCSV,
    exportOrdersSummary,
    exportSingleOrder,
};











