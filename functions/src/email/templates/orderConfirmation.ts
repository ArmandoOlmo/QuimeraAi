/**
 * Order Confirmation Email Template
 * Email de confirmacion de pedido para el cliente
 */

import { getBaseTemplate, getButtonComponent, getDividerComponent } from './base';

export interface OrderConfirmationParams {
    storeName: string;
    logoUrl?: string;
    primaryColor?: string;
    customerName: string;
    orderNumber: string;
    orderDate: string;
    items: Array<{
        name: string;
        variantName?: string;
        quantity: number;
        unitPrice: string;
        totalPrice: string;
        imageUrl?: string;
    }>;
    subtotal: string;
    shipping: string;
    discount?: string;
    tax: string;
    total: string;
    currencySymbol: string;
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
    orderTrackingUrl?: string;
    footerText?: string;
    socialLinks?: {
        facebook?: string;
        instagram?: string;
        twitter?: string;
        linkedin?: string;
    };
}

export const getOrderConfirmationTemplate = (params: OrderConfirmationParams): string => {
    const {
        storeName,
        logoUrl,
        primaryColor = '#4f46e5',
        customerName,
        orderNumber,
        orderDate,
        items,
        subtotal,
        shipping,
        discount,
        tax,
        total,
        currencySymbol,
        shippingAddress,
        orderTrackingUrl,
        footerText,
        socialLinks,
    } = params;

    // Generate items HTML
    const itemsHtml = items.map(item => `
        <tr style="border-bottom: 1px solid #e4e4e7;">
            <td style="padding: 16px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                        ${item.imageUrl ? `
                        <td style="width: 64px; vertical-align: top;">
                            <img src="${item.imageUrl}" alt="${item.name}" style="width: 56px; height: 56px; object-fit: cover; border-radius: 8px;">
                        </td>
                        ` : ''}
                        <td style="padding-left: ${item.imageUrl ? '16px' : '0'}; vertical-align: top;">
                            <p style="color: #18181b; margin: 0 0 4px 0; font-size: 15px; font-weight: 500;">
                                ${item.name}
                            </p>
                            ${item.variantName ? `
                            <p style="color: #71717a; margin: 0 0 4px 0; font-size: 13px;">
                                ${item.variantName}
                            </p>
                            ` : ''}
                            <p style="color: #71717a; margin: 0; font-size: 13px;">
                                Cantidad: ${item.quantity} x ${currencySymbol}${item.unitPrice}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
            <td align="right" style="padding: 16px 0; vertical-align: top;">
                <p style="color: #18181b; margin: 0; font-size: 15px; font-weight: 500;">
                    ${currencySymbol}${item.totalPrice}
                </p>
            </td>
        </tr>
    `).join('');

    const content = `
        <!-- Hero -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center" style="padding-bottom: 24px;">
                    <div style="width: 64px; height: 64px; background-color: #dcfce7; border-radius: 50%; display: inline-block; line-height: 64px; text-align: center;">
                        <span style="font-size: 28px;">&#10003;</span>
                    </div>
                </td>
            </tr>
            <tr>
                <td align="center">
                    <h1 style="color: #18181b; margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">
                        ¡Gracias por tu pedido!
                    </h1>
                    <p style="color: #71717a; margin: 0 0 24px 0; font-size: 16px; line-height: 1.5;">
                        Hola ${customerName}, hemos recibido tu pedido y lo estamos preparando.
                    </p>
                </td>
            </tr>
        </table>
        
        <!-- Order Info Box -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5; border-radius: 12px; margin-bottom: 32px;">
            <tr>
                <td style="padding: 20px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td>
                                <p style="color: #71717a; margin: 0 0 4px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">
                                    Numero de Pedido
                                </p>
                                <p style="color: #18181b; margin: 0; font-size: 20px; font-weight: 700;">
                                    #${orderNumber}
                                </p>
                            </td>
                            <td align="right">
                                <p style="color: #71717a; margin: 0 0 4px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">
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
        
        <!-- Products -->
        <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">
            Productos
        </h2>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
            ${itemsHtml}
        </table>
        
        <!-- Totals -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 32px;">
            <tr>
                <td style="padding: 8px 0;">
                    <p style="color: #71717a; margin: 0; font-size: 14px;">Subtotal</p>
                </td>
                <td align="right" style="padding: 8px 0;">
                    <p style="color: #18181b; margin: 0; font-size: 14px;">${currencySymbol}${subtotal}</p>
                </td>
            </tr>
            ${discount ? `
            <tr>
                <td style="padding: 8px 0;">
                    <p style="color: #22c55e; margin: 0; font-size: 14px;">Descuento</p>
                </td>
                <td align="right" style="padding: 8px 0;">
                    <p style="color: #22c55e; margin: 0; font-size: 14px;">-${currencySymbol}${discount}</p>
                </td>
            </tr>
            ` : ''}
            <tr>
                <td style="padding: 8px 0;">
                    <p style="color: #71717a; margin: 0; font-size: 14px;">Envio</p>
                </td>
                <td align="right" style="padding: 8px 0;">
                    <p style="color: #18181b; margin: 0; font-size: 14px;">${shipping === '0.00' || shipping === '0' ? 'Gratis' : `${currencySymbol}${shipping}`}</p>
                </td>
            </tr>
            <tr>
                <td style="padding: 8px 0;">
                    <p style="color: #71717a; margin: 0; font-size: 14px;">Impuestos</p>
                </td>
                <td align="right" style="padding: 8px 0;">
                    <p style="color: #18181b; margin: 0; font-size: 14px;">${currencySymbol}${tax}</p>
                </td>
            </tr>
            <tr>
                <td style="padding: 16px 0; border-top: 2px solid #e4e4e7;">
                    <p style="color: #18181b; margin: 0; font-size: 18px; font-weight: 700;">Total</p>
                </td>
                <td align="right" style="padding: 16px 0; border-top: 2px solid #e4e4e7;">
                    <p style="color: ${primaryColor}; margin: 0; font-size: 18px; font-weight: 700;">${currencySymbol}${total}</p>
                </td>
            </tr>
        </table>
        
        ${getDividerComponent()}
        
        <!-- Shipping Address -->
        <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">
            Direccion de Envio
        </h2>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 32px;">
            <tr>
                <td style="padding: 16px;">
                    <p style="color: #18181b; margin: 0 0 4px 0; font-size: 15px; font-weight: 500;">
                        ${shippingAddress.firstName} ${shippingAddress.lastName}
                    </p>
                    <p style="color: #71717a; margin: 0; font-size: 14px; line-height: 1.6;">
                        ${shippingAddress.address1}<br>
                        ${shippingAddress.address2 ? `${shippingAddress.address2}<br>` : ''}
                        ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}<br>
                        ${shippingAddress.country}
                        ${shippingAddress.phone ? `<br>Tel: ${shippingAddress.phone}` : ''}
                    </p>
                </td>
            </tr>
        </table>
        
        ${orderTrackingUrl ? `
        <!-- CTA -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center">
                    ${getButtonComponent('Ver Estado del Pedido', orderTrackingUrl, primaryColor)}
                </td>
            </tr>
        </table>
        ` : ''}
    `;

    return getBaseTemplate({
        title: `Confirmacion de Pedido #${orderNumber}`,
        previewText: `Gracias por tu pedido #${orderNumber}. Lo estamos preparando.`,
        primaryColor,
        logoUrl,
        storeName,
        content,
        footerText,
        socialLinks,
    });
};











