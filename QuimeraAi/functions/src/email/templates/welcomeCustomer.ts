/**
 * Welcome Customer Email Template
 * Email de bienvenida para nuevos clientes
 */

import { getBaseTemplate, getButtonComponent, getDividerComponent } from './base';

export interface WelcomeCustomerParams {
    storeName: string;
    logoUrl?: string;
    primaryColor?: string;
    customerName: string;
    discountCode?: string;
    discountPercent?: number;
    discountExpiry?: string;
    shopUrl: string;
    featuredProducts?: Array<{
        name: string;
        price: string;
        imageUrl?: string;
        productUrl: string;
    }>;
    footerText?: string;
    socialLinks?: {
        facebook?: string;
        instagram?: string;
        twitter?: string;
        linkedin?: string;
    };
}

export const getWelcomeCustomerTemplate = (params: WelcomeCustomerParams): string => {
    const {
        storeName,
        logoUrl,
        primaryColor = '#4f46e5',
        customerName,
        discountCode,
        discountPercent,
        discountExpiry,
        shopUrl,
        featuredProducts,
        footerText,
        socialLinks,
    } = params;

    const productsHtml = featuredProducts?.slice(0, 3).map(product => `
        <td style="width: 33.33%; padding: 8px; text-align: center; vertical-align: top;">
            <a href="${product.productUrl}" style="text-decoration: none;">
                ${product.imageUrl ? `
                <img src="${product.imageUrl}" alt="${product.name}" style="width: 100%; max-width: 150px; height: 150px; object-fit: cover; border-radius: 8px; margin-bottom: 12px;">
                ` : `
                <div style="width: 100%; max-width: 150px; height: 150px; background-color: #f4f4f5; border-radius: 8px; margin: 0 auto 12px;"></div>
                `}
                <p style="color: #18181b; margin: 0 0 4px 0; font-size: 14px; font-weight: 500;">
                    ${product.name}
                </p>
                <p style="color: ${primaryColor}; margin: 0; font-size: 14px; font-weight: 600;">
                    ${product.price}
                </p>
            </a>
        </td>
    `).join('');

    const content = `
        <!-- Hero -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center" style="padding-bottom: 24px;">
                    <span style="font-size: 48px;">&#127881;</span>
                </td>
            </tr>
            <tr>
                <td align="center">
                    <h1 style="color: #18181b; margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">
                        ¡Bienvenido a ${storeName}!
                    </h1>
                    <p style="color: #71717a; margin: 0 0 32px 0; font-size: 16px; line-height: 1.6;">
                        Hola ${customerName}, gracias por unirte a nuestra comunidad. 
                        Estamos emocionados de tenerte con nosotros.
                    </p>
                </td>
            </tr>
        </table>
        
        ${discountCode && discountPercent ? `
        <!-- Discount Code -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, ${primaryColor} 0%, #7c3aed 100%); border-radius: 12px; margin-bottom: 32px;">
            <tr>
                <td style="padding: 32px; text-align: center;">
                    <p style="color: rgba(255,255,255,0.9); margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                        Regalo de Bienvenida
                    </p>
                    <p style="color: #ffffff; margin: 0 0 16px 0; font-size: 36px; font-weight: 700;">
                        ${discountPercent}% OFF
                    </p>
                    <p style="color: rgba(255,255,255,0.9); margin: 0 0 16px 0; font-size: 14px;">
                        en tu primera compra
                    </p>
                    
                    <!-- Coupon Code Box -->
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                        <tr>
                            <td style="background-color: rgba(255,255,255,0.2); border: 2px dashed rgba(255,255,255,0.5); border-radius: 8px; padding: 12px 24px;">
                                <p style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; font-family: monospace; letter-spacing: 2px;">
                                    ${discountCode}
                                </p>
                            </td>
                        </tr>
                    </table>
                    
                    ${discountExpiry ? `
                    <p style="color: rgba(255,255,255,0.8); margin: 16px 0 0 0; font-size: 12px;">
                        Valido hasta ${discountExpiry}
                    </p>
                    ` : ''}
                </td>
            </tr>
        </table>
        ` : ''}
        
        <!-- What to Expect -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 32px;">
            <tr>
                <td>
                    <h2 style="color: #18181b; margin: 0 0 20px 0; font-size: 20px; font-weight: 600; text-align: center;">
                        Que puedes esperar
                    </h2>
                    
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td style="padding: 12px 0;">
                                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td style="width: 48px; vertical-align: top;">
                                            <div style="width: 40px; height: 40px; background-color: #dbeafe; border-radius: 20px; text-align: center; line-height: 40px;">
                                                <span style="font-size: 18px;">&#128230;</span>
                                            </div>
                                        </td>
                                        <td style="padding-left: 12px;">
                                            <p style="color: #18181b; margin: 0 0 4px 0; font-size: 15px; font-weight: 500;">
                                                Productos de Calidad
                                            </p>
                                            <p style="color: #71717a; margin: 0; font-size: 14px; line-height: 1.5;">
                                                Seleccion cuidadosa de los mejores productos para ti.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0;">
                                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td style="width: 48px; vertical-align: top;">
                                            <div style="width: 40px; height: 40px; background-color: #dcfce7; border-radius: 20px; text-align: center; line-height: 40px;">
                                                <span style="font-size: 18px;">&#128666;</span>
                                            </div>
                                        </td>
                                        <td style="padding-left: 12px;">
                                            <p style="color: #18181b; margin: 0 0 4px 0; font-size: 15px; font-weight: 500;">
                                                Envio Rapido
                                            </p>
                                            <p style="color: #71717a; margin: 0; font-size: 14px; line-height: 1.5;">
                                                Entregamos tus pedidos lo mas rapido posible.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0;">
                                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td style="width: 48px; vertical-align: top;">
                                            <div style="width: 40px; height: 40px; background-color: #fef3c7; border-radius: 20px; text-align: center; line-height: 40px;">
                                                <span style="font-size: 18px;">&#128172;</span>
                                            </div>
                                        </td>
                                        <td style="padding-left: 12px;">
                                            <p style="color: #18181b; margin: 0 0 4px 0; font-size: 15px; font-weight: 500;">
                                                Soporte Dedicado
                                            </p>
                                            <p style="color: #71717a; margin: 0; font-size: 14px; line-height: 1.5;">
                                                Estamos aqui para ayudarte con cualquier pregunta.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        
        ${featuredProducts && featuredProducts.length > 0 ? `
        ${getDividerComponent()}
        
        <!-- Featured Products -->
        <h2 style="color: #18181b; margin: 0 0 20px 0; font-size: 20px; font-weight: 600; text-align: center;">
            Productos Destacados
        </h2>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 32px;">
            <tr>
                ${productsHtml}
            </tr>
        </table>
        ` : ''}
        
        ${getDividerComponent()}
        
        <!-- CTA -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center">
                    <p style="color: #71717a; margin: 0 0 20px 0; font-size: 16px;">
                        ¿Listo para explorar?
                    </p>
                    ${getButtonComponent('Visitar Tienda', shopUrl, primaryColor)}
                </td>
            </tr>
        </table>
    `;

    return getBaseTemplate({
        title: `¡Bienvenido a ${storeName}!`,
        previewText: `Hola ${customerName}, gracias por unirte a ${storeName}.${discountCode ? ` Usa el codigo ${discountCode} para ${discountPercent}% de descuento.` : ''}`,
        primaryColor,
        logoUrl,
        storeName,
        content,
        footerText,
        socialLinks,
    });
};











