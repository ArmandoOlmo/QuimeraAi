/**
 * New Order Admin Email Template
 * Email de notificacion de nueva orden para el administrador
 */

import { getBaseTemplate, getButtonComponent, getDividerComponent } from './base';

export interface NewOrderAdminParams {
    storeName: string;
    logoUrl?: string;
    primaryColor?: string;
    orderNumber: string;
    orderDate: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    items: Array<{
        name: string;
        variantName?: string;
        quantity: number;
        unitPrice: string;
        totalPrice: string;
        sku?: string;
    }>;
    subtotal: string;
    shipping: string;
    discount?: string;
    tax: string;
    total: string;
    currencySymbol: string;
    paymentMethod: string;
    shippingAddress: {
        firstName: string;
        lastName: string;
        address1: string;
        address2?: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
        phone?: string;
    };
    customerNotes?: string;
    dashboardUrl: string;
}

export const getNewOrderAdminTemplate = (params: NewOrderAdminParams): string => {
    const {
        storeName,
        logoUrl,
        primaryColor = '#4f46e5',
        orderNumber,
        orderDate,
        customerName,
        customerEmail,
        customerPhone,
        items,
        subtotal,
        shipping,
        discount,
        tax,
        total,
        currencySymbol,
        paymentMethod,
        shippingAddress,
        customerNotes,
        dashboardUrl,
    } = params;

    // Generate items HTML
    const itemsHtml = items.map(item => `
        <tr style="border-bottom: 1px solid #e4e4e7;">
            <td style="padding: 12px 0;">
                <p style="color: #18181b; margin: 0 0 2px 0; font-size: 14px; font-weight: 500;">
                    ${item.name}
                </p>
                ${item.variantName ? `
                <p style="color: #71717a; margin: 0; font-size: 12px;">${item.variantName}</p>
                ` : ''}
                ${item.sku ? `
                <p style="color: #a1a1aa; margin: 0; font-size: 11px;">SKU: ${item.sku}</p>
                ` : ''}
            </td>
            <td align="center" style="padding: 12px 0; width: 60px;">
                <p style="color: #52525b; margin: 0; font-size: 14px;">${item.quantity}</p>
            </td>
            <td align="right" style="padding: 12px 0; width: 80px;">
                <p style="color: #18181b; margin: 0; font-size: 14px; font-weight: 500;">${currencySymbol}${item.totalPrice}</p>
            </td>
        </tr>
    `).join('');

    const content = `
        <!-- Alert Banner -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #dcfce7; border-radius: 8px; margin-bottom: 24px;">
            <tr>
                <td style="padding: 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td style="width: 40px; vertical-align: top;">
                                <span style="font-size: 24px;">&#128176;</span>
                            </td>
                            <td>
                                <p style="color: #166534; margin: 0 0 4px 0; font-size: 16px; font-weight: 600;">
                                    Nueva Orden Recibida
                                </p>
                                <p style="color: #166534; margin: 0; font-size: 14px;">
                                    Pedido #${orderNumber} - ${currencySymbol}${total}
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        
        <!-- Order Details Grid -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
            <tr>
                <td style="width: 50%; padding-right: 12px; vertical-align: top;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5; border-radius: 8px;">
                        <tr>
                            <td style="padding: 16px;">
                                <p style="color: #71717a; margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                                    Numero de Orden
                                </p>
                                <p style="color: #18181b; margin: 0; font-size: 16px; font-weight: 700;">
                                    #${orderNumber}
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
                <td style="width: 50%; padding-left: 12px; vertical-align: top;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5; border-radius: 8px;">
                        <tr>
                            <td style="padding: 16px;">
                                <p style="color: #71717a; margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                                    Fecha
                                </p>
                                <p style="color: #18181b; margin: 0; font-size: 16px;">
                                    ${orderDate}
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        
        ${getDividerComponent()}
        
        <!-- Customer Info -->
        <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">
            Informacion del Cliente
        </h2>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
            <tr>
                <td style="padding: 16px;">
                    <p style="color: #18181b; margin: 0 0 8px 0; font-size: 15px; font-weight: 500;">
                        ${customerName}
                    </p>
                    <p style="color: #71717a; margin: 0 0 4px 0; font-size: 14px;">
                        <a href="mailto:${customerEmail}" style="color: ${primaryColor};">${customerEmail}</a>
                    </p>
                    ${customerPhone ? `
                    <p style="color: #71717a; margin: 0; font-size: 14px;">
                        Tel: ${customerPhone}
                    </p>
                    ` : ''}
                </td>
            </tr>
        </table>
        
        ${getDividerComponent()}
        
        <!-- Products Table -->
        <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">
            Productos (${items.length})
        </h2>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px;">
            <tr style="border-bottom: 2px solid #e4e4e7;">
                <td style="padding: 8px 0;">
                    <p style="color: #71717a; margin: 0; font-size: 12px; text-transform: uppercase;">Producto</p>
                </td>
                <td align="center" style="padding: 8px 0; width: 60px;">
                    <p style="color: #71717a; margin: 0; font-size: 12px; text-transform: uppercase;">Cant.</p>
                </td>
                <td align="right" style="padding: 8px 0; width: 80px;">
                    <p style="color: #71717a; margin: 0; font-size: 12px; text-transform: uppercase;">Total</p>
                </td>
            </tr>
            ${itemsHtml}
        </table>
        
        <!-- Totals -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
            <tr>
                <td style="padding: 6px 0;">
                    <p style="color: #71717a; margin: 0; font-size: 14px;">Subtotal</p>
                </td>
                <td align="right" style="padding: 6px 0;">
                    <p style="color: #18181b; margin: 0; font-size: 14px;">${currencySymbol}${subtotal}</p>
                </td>
            </tr>
            ${discount ? `
            <tr>
                <td style="padding: 6px 0;">
                    <p style="color: #22c55e; margin: 0; font-size: 14px;">Descuento</p>
                </td>
                <td align="right" style="padding: 6px 0;">
                    <p style="color: #22c55e; margin: 0; font-size: 14px;">-${currencySymbol}${discount}</p>
                </td>
            </tr>
            ` : ''}
            <tr>
                <td style="padding: 6px 0;">
                    <p style="color: #71717a; margin: 0; font-size: 14px;">Envio</p>
                </td>
                <td align="right" style="padding: 6px 0;">
                    <p style="color: #18181b; margin: 0; font-size: 14px;">${currencySymbol}${shipping}</p>
                </td>
            </tr>
            <tr>
                <td style="padding: 6px 0;">
                    <p style="color: #71717a; margin: 0; font-size: 14px;">Impuestos</p>
                </td>
                <td align="right" style="padding: 6px 0;">
                    <p style="color: #18181b; margin: 0; font-size: 14px;">${currencySymbol}${tax}</p>
                </td>
            </tr>
            <tr>
                <td style="padding: 12px 0; border-top: 2px solid #18181b;">
                    <p style="color: #18181b; margin: 0; font-size: 16px; font-weight: 700;">TOTAL</p>
                </td>
                <td align="right" style="padding: 12px 0; border-top: 2px solid #18181b;">
                    <p style="color: #18181b; margin: 0; font-size: 18px; font-weight: 700;">${currencySymbol}${total}</p>
                </td>
            </tr>
        </table>
        
        <!-- Payment & Shipping Info -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
            <tr>
                <td style="width: 50%; padding-right: 12px; vertical-align: top;">
                    <p style="color: #71717a; margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                        Metodo de Pago
                    </p>
                    <p style="color: #18181b; margin: 0; font-size: 14px;">
                        ${paymentMethod}
                    </p>
                </td>
                <td style="width: 50%; padding-left: 12px; vertical-align: top;">
                    <p style="color: #71717a; margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                        Direccion de Envio
                    </p>
                    <p style="color: #18181b; margin: 0; font-size: 14px; line-height: 1.5;">
                        ${shippingAddress.firstName} ${shippingAddress.lastName}<br>
                        ${shippingAddress.address1}<br>
                        ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}
                    </p>
                </td>
            </tr>
        </table>
        
        ${customerNotes ? `
        ${getDividerComponent()}
        
        <!-- Customer Notes -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fef3c7; border-radius: 8px; margin-bottom: 24px;">
            <tr>
                <td style="padding: 16px;">
                    <p style="color: #92400e; margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                        Notas del Cliente
                    </p>
                    <p style="color: #78350f; margin: 0; font-size: 14px; line-height: 1.5;">
                        ${customerNotes}
                    </p>
                </td>
            </tr>
        </table>
        ` : ''}
        
        <!-- CTA -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center">
                    ${getButtonComponent('Ver Orden en Dashboard', dashboardUrl, primaryColor)}
                </td>
            </tr>
        </table>
    `;

    return getBaseTemplate({
        title: `Nueva Orden #${orderNumber} - ${currencySymbol}${total}`,
        previewText: `Nueva orden de ${customerName} por ${currencySymbol}${total}`,
        primaryColor,
        logoUrl,
        storeName,
        content,
        footerText: 'Este es un email automatico para el administrador de la tienda.',
    });
};











