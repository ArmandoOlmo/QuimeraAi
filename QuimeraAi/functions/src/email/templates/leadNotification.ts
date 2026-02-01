/**
 * Lead Notification Email Template
 * Email de notificacion de nuevo lead para el administrador
 */

import { getBaseTemplate, getButtonComponent, getDividerComponent } from './base';

export interface LeadNotificationParams {
    siteName: string;
    logoUrl?: string;
    primaryColor?: string;
    leadName: string;
    leadEmail: string;
    leadPhone?: string;
    leadCompany?: string;
    leadMessage?: string;
    leadSource: string;
    leadScore?: number;
    leadTags?: string[];
    submittedAt: string;
    dashboardUrl: string;
}

export const getLeadNotificationTemplate = (params: LeadNotificationParams): string => {
    const {
        siteName,
        logoUrl,
        primaryColor = '#4f46e5',
        leadName,
        leadEmail,
        leadPhone,
        leadCompany,
        leadMessage,
        leadSource,
        leadScore,
        leadTags,
        submittedAt,
        dashboardUrl,
    } = params;

    // Determine lead quality indicator
    const getScoreColor = (score: number) => {
        if (score >= 70) return { bg: '#dcfce7', text: '#166534', label: 'Alta Calidad' };
        if (score >= 40) return { bg: '#fef9c3', text: '#854d0e', label: 'Media' };
        return { bg: '#f4f4f5', text: '#52525b', label: 'Baja' };
    };
    
    const scoreInfo = leadScore !== undefined ? getScoreColor(leadScore) : null;

    const content = `
        <!-- Alert Banner -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #eff6ff; border-radius: 8px; margin-bottom: 24px;">
            <tr>
                <td style="padding: 20px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td style="width: 48px; vertical-align: top;">
                                <span style="font-size: 32px;">&#128100;</span>
                            </td>
                            <td>
                                <p style="color: #1e40af; margin: 0 0 4px 0; font-size: 18px; font-weight: 700;">
                                    Nuevo Lead Recibido
                                </p>
                                <p style="color: #3b82f6; margin: 0; font-size: 14px;">
                                    ${leadName} quiere contactarte desde ${siteName}
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        
        <!-- Lead Score Badge (if available) -->
        ${scoreInfo ? `
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
            <tr>
                <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="background-color: ${scoreInfo.bg}; border-radius: 20px;">
                        <tr>
                            <td style="padding: 8px 16px;">
                                <p style="color: ${scoreInfo.text}; margin: 0; font-size: 13px; font-weight: 600;">
                                    ${scoreInfo.label} - Score: ${leadScore}/100
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        ` : ''}
        
        <!-- Contact Info Card -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border-radius: 12px; margin-bottom: 24px;">
            <tr>
                <td style="padding: 24px;">
                    <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">
                        Informacion de Contacto
                    </h2>
                    
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                        <!-- Name -->
                        <tr>
                            <td style="padding: 8px 0; width: 100px; vertical-align: top;">
                                <p style="color: #71717a; margin: 0; font-size: 13px;">Nombre</p>
                            </td>
                            <td style="padding: 8px 0;">
                                <p style="color: #18181b; margin: 0; font-size: 15px; font-weight: 500;">${leadName}</p>
                            </td>
                        </tr>
                        
                        <!-- Email -->
                        <tr>
                            <td style="padding: 8px 0; vertical-align: top;">
                                <p style="color: #71717a; margin: 0; font-size: 13px;">Email</p>
                            </td>
                            <td style="padding: 8px 0;">
                                <p style="margin: 0; font-size: 15px;">
                                    <a href="mailto:${leadEmail}" style="color: ${primaryColor}; font-weight: 500;">${leadEmail}</a>
                                </p>
                            </td>
                        </tr>
                        
                        ${leadPhone ? `
                        <!-- Phone -->
                        <tr>
                            <td style="padding: 8px 0; vertical-align: top;">
                                <p style="color: #71717a; margin: 0; font-size: 13px;">Telefono</p>
                            </td>
                            <td style="padding: 8px 0;">
                                <p style="margin: 0; font-size: 15px;">
                                    <a href="tel:${leadPhone}" style="color: ${primaryColor}; font-weight: 500;">${leadPhone}</a>
                                </p>
                            </td>
                        </tr>
                        ` : ''}
                        
                        ${leadCompany ? `
                        <!-- Company -->
                        <tr>
                            <td style="padding: 8px 0; vertical-align: top;">
                                <p style="color: #71717a; margin: 0; font-size: 13px;">Empresa</p>
                            </td>
                            <td style="padding: 8px 0;">
                                <p style="color: #18181b; margin: 0; font-size: 15px;">${leadCompany}</p>
                            </td>
                        </tr>
                        ` : ''}
                        
                        <!-- Source -->
                        <tr>
                            <td style="padding: 8px 0; vertical-align: top;">
                                <p style="color: #71717a; margin: 0; font-size: 13px;">Fuente</p>
                            </td>
                            <td style="padding: 8px 0;">
                                <p style="color: #18181b; margin: 0; font-size: 15px;">${leadSource}</p>
                            </td>
                        </tr>
                        
                        <!-- Time -->
                        <tr>
                            <td style="padding: 8px 0; vertical-align: top;">
                                <p style="color: #71717a; margin: 0; font-size: 13px;">Recibido</p>
                            </td>
                            <td style="padding: 8px 0;">
                                <p style="color: #18181b; margin: 0; font-size: 15px;">${submittedAt}</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        
        ${leadMessage ? `
        ${getDividerComponent()}
        
        <!-- Message -->
        <h2 style="color: #18181b; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">
            Mensaje
        </h2>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 8px; margin-bottom: 24px;">
            <tr>
                <td style="padding: 16px;">
                    <p style="color: #52525b; margin: 0; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">
                        ${leadMessage}
                    </p>
                </td>
            </tr>
        </table>
        ` : ''}
        
        ${leadTags && leadTags.length > 0 ? `
        <!-- Tags -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
            <tr>
                <td>
                    <p style="color: #71717a; margin: 0 0 8px 0; font-size: 13px;">Etiquetas:</p>
                    ${leadTags.map(tag => `
                        <span style="display: inline-block; background-color: #f4f4f5; color: #52525b; padding: 4px 10px; border-radius: 12px; font-size: 12px; margin-right: 6px; margin-bottom: 6px;">
                            ${tag}
                        </span>
                    `).join('')}
                </td>
            </tr>
        </table>
        ` : ''}
        
        ${getDividerComponent()}
        
        <!-- Quick Actions -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center" style="padding-bottom: 16px;">
                    ${getButtonComponent('Ver Lead en Dashboard', dashboardUrl, primaryColor)}
                </td>
            </tr>
            <tr>
                <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="padding: 0 8px;">
                                <a href="mailto:${leadEmail}" style="display: inline-block; padding: 10px 20px; background-color: #f4f4f5; color: #18181b; font-size: 14px; font-weight: 500; text-decoration: none; border-radius: 6px;">
                                    Responder por Email
                                </a>
                            </td>
                            ${leadPhone ? `
                            <td style="padding: 0 8px;">
                                <a href="tel:${leadPhone}" style="display: inline-block; padding: 10px 20px; background-color: #f4f4f5; color: #18181b; font-size: 14px; font-weight: 500; text-decoration: none; border-radius: 6px;">
                                    Llamar
                                </a>
                            </td>
                            ` : ''}
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    `;

    return getBaseTemplate({
        title: `Nuevo Lead: ${leadName}`,
        previewText: `${leadName} (${leadEmail}) quiere contactarte desde ${siteName}${leadMessage ? `: "${leadMessage.substring(0, 50)}..."` : ''}`,
        primaryColor,
        logoUrl,
        storeName: siteName,
        content,
        footerText: 'Este es un email automatico de notificacion de leads.',
    });
};











