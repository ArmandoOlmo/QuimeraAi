/**
 * Order Shipped Email Template
 * Email de notificacion de envio para el cliente
 */

import { getBaseTemplate, getButtonComponent, getDividerComponent } from './base';

export interface OrderShippedParams {
    storeName: string;
    logoUrl?: string;
    primaryColor?: string;
    customerName: string;
    orderNumber: string;
    shippingCarrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    estimatedDelivery?: string;
    items: Array<{
        name: string;
        quantity: number;
        imageUrl?: string;
    }>;
    shippingAddress: {
        firstName: string;
        lastName: string;
        address1: string;
        address2?: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    footerText?: string;
    socialLinks?: {
        facebook?: string;
        instagram?: string;
        twitter?: string;
        linkedin?: string;
    };
}

export const getOrderShippedTemplate = (params: OrderShippedParams): string => {
    const {
        storeName,
        logoUrl,
        primaryColor = '#4f46e5',
        customerName,
        orderNumber,
        shippingCarrier,
        trackingNumber,
        trackingUrl,
        estimatedDelivery,
        items,
        shippingAddress,
        footerText,
        socialLinks,
    } = params;

    const itemsHtml = items.slice(0, 3).map(item => `
        <td style="padding: 8px; text-align: center;">
            ${item.imageUrl ? `
            <img src="${item.imageUrl}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;">
            ` : `
            <div style="width: 60px; height: 60px; background-color: #f4f4f5; border-radius: 8px; margin: 0 auto 8px;"></div>
            `}
            <p style="color: #71717a; margin: 0; font-size: 12px;">${item.name}</p>
            <p style="color: #a1a1aa; margin: 0; font-size: 11px;">x${item.quantity}</p>
        </td>
    `).join('');

    const content = `
        <!-- Hero -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center" style="padding-bottom: 24px;">
                    <div style="width: 64px; height: 64px; background-color: #dbeafe; border-radius: 50%; display: inline-block; line-height: 64px; text-align: center;">
                        <span style="font-size: 28px;">&#128666;</span>
                    </div>
                </td>
            </tr>
            <tr>
                <td align="center">
                    <h1 style="color: #18181b; margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">
                        ¡Tu pedido va en camino!
                    </h1>
                    <p style="color: #71717a; margin: 0 0 24px 0; font-size: 16px; line-height: 1.5;">
                        Hola ${customerName}, tu pedido #${orderNumber} ha sido enviado.
                    </p>
                </td>
            </tr>
        </table>
        
        ${trackingNumber || trackingUrl ? `
        <!-- Tracking Info Box -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #eff6ff; border-radius: 12px; margin-bottom: 32px;">
            <tr>
                <td style="padding: 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                        ${shippingCarrier ? `
                        <tr>
                            <td style="padding-bottom: 12px;">
                                <p style="color: #3b82f6; margin: 0 0 4px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">
                                    Transportista
                                </p>
                                <p style="color: #1e40af; margin: 0; font-size: 16px; font-weight: 500;">
                                    ${shippingCarrier}
                                </p>
                            </td>
                        </tr>
                        ` : ''}
                        ${trackingNumber ? `
                        <tr>
                            <td style="padding-bottom: 12px;">
                                <p style="color: #3b82f6; margin: 0 0 4px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">
                                    Numero de Seguimiento
                                </p>
                                <p style="color: #1e40af; margin: 0; font-size: 18px; font-weight: 700; font-family: monospace;">
                                    ${trackingNumber}
                                </p>
                            </td>
                        </tr>
                        ` : ''}
                        ${estimatedDelivery ? `
                        <tr>
                            <td>
                                <p style="color: #3b82f6; margin: 0 0 4px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">
                                    Entrega Estimada
                                </p>
                                <p style="color: #1e40af; margin: 0; font-size: 16px; font-weight: 500;">
                                    ${estimatedDelivery}
                                </p>
                            </td>
                        </tr>
                        ` : ''}
                    </table>
                </td>
            </tr>
        </table>
        
        ${trackingUrl ? `
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center" style="padding-bottom: 32px;">
                    ${getButtonComponent('Rastrear Pedido', trackingUrl, primaryColor)}
                </td>
            </tr>
        </table>
        ` : ''}
        ` : ''}
        
        ${getDividerComponent()}
        
        <!-- Products Preview -->
        <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">
            Lo que viene en camino
        </h2>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 32px;">
            <tr>
                ${itemsHtml}
                ${items.length > 3 ? `
                <td style="padding: 8px; text-align: center;">
                    <div style="width: 60px; height: 60px; background-color: #f4f4f5; border-radius: 8px; margin: 0 auto 8px; line-height: 60px;">
                        <span style="color: #71717a; font-size: 14px; font-weight: 500;">+${items.length - 3}</span>
                    </div>
                    <p style="color: #71717a; margin: 0; font-size: 12px;">mas</p>
                </td>
                ` : ''}
            </tr>
        </table>
        
        ${getDividerComponent()}
        
        <!-- Shipping Address -->
        <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">
            Direccion de Entrega
        </h2>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border-radius: 8px;">
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
                    </p>
                </td>
            </tr>
        </table>
    `;

    return getBaseTemplate({
        title: `Tu pedido #${orderNumber} ha sido enviado`,
        previewText: `¡Buenas noticias! Tu pedido #${orderNumber} va en camino.`,
        primaryColor,
        logoUrl,
        storeName,
        content,
        footerText,
        socialLinks,
    });
};











