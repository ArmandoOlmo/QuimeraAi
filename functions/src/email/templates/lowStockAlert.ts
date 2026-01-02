/**
 * Low Stock Alert Email Template
 * Email de alerta de stock bajo para el administrador
 */

import { getBaseTemplate, getButtonComponent, getDividerComponent } from './base';

export interface LowStockAlertParams {
    storeName: string;
    logoUrl?: string;
    primaryColor?: string;
    products: Array<{
        name: string;
        sku?: string;
        currentStock: number;
        threshold: number;
        imageUrl?: string;
        productUrl?: string;
    }>;
    dashboardUrl: string;
}

export const getLowStockAlertTemplate = (params: LowStockAlertParams): string => {
    const {
        storeName,
        logoUrl,
        primaryColor = '#4f46e5',
        products,
        dashboardUrl,
    } = params;

    const criticalProducts = products.filter(p => p.currentStock === 0);
    const lowProducts = products.filter(p => p.currentStock > 0);

    const generateProductRow = (product: LowStockAlertParams['products'][0], isCritical: boolean) => `
        <tr style="border-bottom: 1px solid #e4e4e7;">
            <td style="padding: 16px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        ${product.imageUrl ? `
                        <td style="width: 56px; vertical-align: top;">
                            <img src="${product.imageUrl}" alt="${product.name}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 6px;">
                        </td>
                        ` : ''}
                        <td style="padding-left: ${product.imageUrl ? '12px' : '0'}; vertical-align: middle;">
                            <p style="color: #18181b; margin: 0 0 4px 0; font-size: 14px; font-weight: 500;">
                                ${product.name}
                            </p>
                            ${product.sku ? `
                            <p style="color: #a1a1aa; margin: 0; font-size: 12px;">
                                SKU: ${product.sku}
                            </p>
                            ` : ''}
                        </td>
                        <td align="right" style="vertical-align: middle; width: 100px;">
                            <p style="color: ${isCritical ? '#dc2626' : '#f59e0b'}; margin: 0 0 2px 0; font-size: 18px; font-weight: 700;">
                                ${product.currentStock}
                            </p>
                            <p style="color: #71717a; margin: 0; font-size: 11px;">
                                de ${product.threshold} min.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    `;

    const content = `
        <!-- Alert Banner -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fef2f2; border-radius: 8px; margin-bottom: 24px;">
            <tr>
                <td style="padding: 20px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td style="width: 48px; vertical-align: top;">
                                <span style="font-size: 32px;">&#9888;</span>
                            </td>
                            <td>
                                <p style="color: #991b1b; margin: 0 0 4px 0; font-size: 18px; font-weight: 700;">
                                    Alerta de Stock Bajo
                                </p>
                                <p style="color: #b91c1c; margin: 0; font-size: 14px; line-height: 1.5;">
                                    ${products.length} producto${products.length > 1 ? 's' : ''} ${products.length > 1 ? 'tienen' : 'tiene'} stock bajo o agotado.
                                    ${criticalProducts.length > 0 ? `<strong>${criticalProducts.length} sin stock.</strong>` : ''}
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        
        ${criticalProducts.length > 0 ? `
        <!-- Critical: Out of Stock -->
        <h2 style="color: #dc2626; margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">
            &#128308; Sin Stock (${criticalProducts.length})
        </h2>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fef2f2; border-radius: 8px; margin-bottom: 24px;">
            <tr>
                <td style="padding: 0 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                        ${criticalProducts.map(p => generateProductRow(p, true)).join('')}
                    </table>
                </td>
            </tr>
        </table>
        ` : ''}
        
        ${lowProducts.length > 0 ? `
        <!-- Warning: Low Stock -->
        <h2 style="color: #f59e0b; margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">
            &#128993; Stock Bajo (${lowProducts.length})
        </h2>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fffbeb; border-radius: 8px; margin-bottom: 24px;">
            <tr>
                <td style="padding: 0 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                        ${lowProducts.map(p => generateProductRow(p, false)).join('')}
                    </table>
                </td>
            </tr>
        </table>
        ` : ''}
        
        ${getDividerComponent()}
        
        <!-- Recommendations -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
            <tr>
                <td>
                    <h3 style="color: #18181b; margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">
                        Acciones Recomendadas:
                    </h3>
                    <ul style="color: #52525b; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
                        ${criticalProducts.length > 0 ? `
                        <li>Reabastecer productos sin stock inmediatamente</li>
                        <li>Considerar desactivar productos agotados temporalmente</li>
                        ` : ''}
                        <li>Revisar ordenes pendientes que incluyan estos productos</li>
                        <li>Contactar proveedores para reabastecimiento</li>
                        <li>Actualizar tiempos de entrega si es necesario</li>
                    </ul>
                </td>
            </tr>
        </table>
        
        <!-- CTA -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center">
                    ${getButtonComponent('Gestionar Inventario', dashboardUrl, primaryColor)}
                </td>
            </tr>
        </table>
    `;

    return getBaseTemplate({
        title: `Alerta de Stock - ${products.length} producto${products.length > 1 ? 's' : ''} con stock bajo`,
        previewText: `${criticalProducts.length > 0 ? `URGENTE: ${criticalProducts.length} productos agotados. ` : ''}${lowProducts.length} productos con stock bajo.`,
        primaryColor,
        logoUrl,
        storeName,
        content,
        footerText: 'Este es un email automatico de alerta de inventario.',
    });
};











