/**
 * Order Delivered Email Template
 * Email de confirmacion de entrega para el cliente
 */

import { getBaseTemplate, getButtonComponent, getDividerComponent } from './base';

export interface OrderDeliveredParams {
    storeName: string;
    logoUrl?: string;
    primaryColor?: string;
    customerName: string;
    orderNumber: string;
    deliveryDate: string;
    reviewUrl?: string;
    shopUrl?: string;
    items: Array<{
        name: string;
        quantity: number;
        imageUrl?: string;
    }>;
    footerText?: string;
    socialLinks?: {
        facebook?: string;
        instagram?: string;
        twitter?: string;
        linkedin?: string;
    };
}

export const getOrderDeliveredTemplate = (params: OrderDeliveredParams): string => {
    const {
        storeName,
        logoUrl,
        primaryColor = '#4f46e5',
        customerName,
        orderNumber,
        deliveryDate,
        reviewUrl,
        shopUrl,
        items,
        footerText,
        socialLinks,
    } = params;

    const itemsHtml = items.slice(0, 4).map(item => `
        <td style="padding: 8px; text-align: center; width: 25%;">
            ${item.imageUrl ? `
            <img src="${item.imageUrl}" alt="${item.name}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;">
            ` : `
            <div style="width: 70px; height: 70px; background-color: #f4f4f5; border-radius: 8px; margin: 0 auto 8px;"></div>
            `}
            <p style="color: #52525b; margin: 0; font-size: 13px; line-height: 1.3;">${item.name}</p>
        </td>
    `).join('');

    const content = `
        <!-- Hero -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center" style="padding-bottom: 24px;">
                    <div style="width: 72px; height: 72px; background-color: #dcfce7; border-radius: 50%; display: inline-block; line-height: 72px; text-align: center;">
                        <span style="font-size: 32px;">&#127881;</span>
                    </div>
                </td>
            </tr>
            <tr>
                <td align="center">
                    <h1 style="color: #18181b; margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">
                        ¡Tu pedido ha llegado!
                    </h1>
                    <p style="color: #71717a; margin: 0 0 8px 0; font-size: 16px; line-height: 1.5;">
                        Hola ${customerName}, tu pedido #${orderNumber} fue entregado el ${deliveryDate}.
                    </p>
                    <p style="color: #22c55e; margin: 0 0 32px 0; font-size: 14px; font-weight: 500;">
                        &#10003; Entregado con exito
                    </p>
                </td>
            </tr>
        </table>
        
        <!-- Products -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border-radius: 12px; margin-bottom: 32px;">
            <tr>
                <td style="padding: 20px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            ${itemsHtml}
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        
        ${reviewUrl ? `
        ${getDividerComponent()}
        
        <!-- Review Request -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center">
                    <h2 style="color: #18181b; margin: 0 0 8px 0; font-size: 20px; font-weight: 600;">
                        ¿Que te parecio tu compra?
                    </h2>
                    <p style="color: #71717a; margin: 0 0 20px 0; font-size: 15px; line-height: 1.5;">
                        Tu opinion nos ayuda a mejorar y ayuda a otros clientes a tomar mejores decisiones.
                    </p>
                    
                    <!-- Star Rating Preview -->
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                        <tr>
                            <td>
                                <span style="font-size: 28px; color: #fbbf24;">&#9733;</span>
                                <span style="font-size: 28px; color: #fbbf24;">&#9733;</span>
                                <span style="font-size: 28px; color: #fbbf24;">&#9733;</span>
                                <span style="font-size: 28px; color: #fbbf24;">&#9733;</span>
                                <span style="font-size: 28px; color: #fbbf24;">&#9733;</span>
                            </td>
                        </tr>
                    </table>
                    
                    ${getButtonComponent('Dejar una Resena', reviewUrl, primaryColor)}
                </td>
            </tr>
        </table>
        ` : ''}
        
        ${shopUrl ? `
        ${getDividerComponent()}
        
        <!-- Continue Shopping -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center">
                    <p style="color: #71717a; margin: 0 0 16px 0; font-size: 15px;">
                        ¿Listo para tu proxima compra?
                    </p>
                    ${getButtonComponent('Seguir Comprando', shopUrl, '#18181b')}
                </td>
            </tr>
        </table>
        ` : ''}
    `;

    return getBaseTemplate({
        title: `Tu pedido #${orderNumber} ha sido entregado`,
        previewText: `¡Tu pedido #${orderNumber} ha llegado! Esperamos que disfrutes tu compra.`,
        primaryColor,
        logoUrl,
        storeName,
        content,
        footerText,
        socialLinks,
    });
};











