/**
 * Welcome User Email Template
 * Email de bienvenida para nuevos usuarios de Quimera AI
 * Se envia cuando un usuario crea su cuenta
 */

import { getBaseTemplate, getButtonComponent, getDividerComponent } from './base';

export interface WelcomeUserParams {
    userName: string;
    userEmail: string;
    planName?: string;
    aiCredits?: number;
    dashboardUrl?: string;
    supportEmail?: string;
}

const QUIMERA_LOGO = "https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032";
const PRIMARY_COLOR = '#FACC15'; // Yellow-400
const SECONDARY_COLOR = '#4F46E5'; // Indigo

export const getWelcomeUserTemplate = (params: WelcomeUserParams): string => {
    const {
        userName,
        userEmail,
        planName = 'Free',
        aiCredits = 30,
        dashboardUrl = 'https://quimera.ai/dashboard',
        supportEmail = 'soporte@quimera.ai',
    } = params;

    const displayName = userName || userEmail.split('@')[0];

    const content = `
        <!-- Hero with Logo -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center" style="padding-bottom: 24px;">
                    <img src="${QUIMERA_LOGO}" alt="Quimera AI" style="width: 80px; height: 80px; filter: drop-shadow(0 0 20px rgba(250, 204, 21, 0.5));">
                </td>
            </tr>
            <tr>
                <td align="center">
                    <h1 style="color: #18181b; margin: 0 0 8px 0; font-size: 32px; font-weight: 800;">
                        ¡Bienvenido a <span style="color: ${PRIMARY_COLOR};">Quimera.ai</span>!
                    </h1>
                    <p style="color: #71717a; margin: 0 0 32px 0; font-size: 18px; line-height: 1.6;">
                        Hola <strong>${displayName}</strong>, gracias por unirte a la plataforma que está 
                        revolucionando la creación de sitios web con IA.
                    </p>
                </td>
            </tr>
        </table>
        
        <!-- Welcome Box -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, rgba(250, 204, 21, 0.1) 0%, rgba(79, 70, 229, 0.1) 100%); border-radius: 16px; border: 1px solid rgba(250, 204, 21, 0.3); margin-bottom: 32px;">
            <tr>
                <td style="padding: 32px; text-align: center;">
                    <p style="color: ${PRIMARY_COLOR}; margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">
                        Tu plan actual
                    </p>
                    <p style="color: #18181b; margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">
                        ${planName}
                    </p>
                    <p style="color: #71717a; margin: 0; font-size: 16px;">
                        <span style="color: ${SECONDARY_COLOR}; font-weight: 600;">${aiCredits}</span> AI Credits incluidos
                    </p>
                </td>
            </tr>
        </table>
        
        <!-- Quick Start Guide -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 32px;">
            <tr>
                <td>
                    <h2 style="color: #18181b; margin: 0 0 24px 0; font-size: 22px; font-weight: 700; text-align: center;">
                        🚀 Guía Rápida de Inicio
                    </h2>
                    
                    <!-- Step 1 -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px;">
                        <tr>
                            <td style="background-color: #fafafa; border-radius: 12px; padding: 20px;">
                                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td style="width: 48px; vertical-align: top;">
                                            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, ${PRIMARY_COLOR} 0%, #eab308 100%); border-radius: 10px; text-align: center; line-height: 40px; color: #000; font-weight: bold; font-size: 18px;">
                                                1
                                            </div>
                                        </td>
                                        <td style="padding-left: 16px;">
                                            <p style="color: #18181b; margin: 0 0 4px 0; font-size: 16px; font-weight: 600;">
                                                Describe tu negocio
                                            </p>
                                            <p style="color: #71717a; margin: 0; font-size: 14px; line-height: 1.5;">
                                                Responde unas preguntas simples sobre tu negocio. Nuestra IA se encargará del resto.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Step 2 -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px;">
                        <tr>
                            <td style="background-color: #fafafa; border-radius: 12px; padding: 20px;">
                                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td style="width: 48px; vertical-align: top;">
                                            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, ${SECONDARY_COLOR} 0%, #6366f1 100%); border-radius: 10px; text-align: center; line-height: 40px; color: #fff; font-weight: bold; font-size: 18px;">
                                                2
                                            </div>
                                        </td>
                                        <td style="padding-left: 16px;">
                                            <p style="color: #18181b; margin: 0 0 4px 0; font-size: 16px; font-weight: 600;">
                                                Deja que la IA cree tu sitio
                                            </p>
                                            <p style="color: #71717a; margin: 0; font-size: 14px; line-height: 1.5;">
                                                En segundos tendrás un sitio web profesional con textos, imágenes y diseño único.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Step 3 -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px;">
                        <tr>
                            <td style="background-color: #fafafa; border-radius: 12px; padding: 20px;">
                                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td style="width: 48px; vertical-align: top;">
                                            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 10px; text-align: center; line-height: 40px; color: #fff; font-weight: bold; font-size: 18px;">
                                                3
                                            </div>
                                        </td>
                                        <td style="padding-left: 16px;">
                                            <p style="color: #18181b; margin: 0 0 4px 0; font-size: 16px; font-weight: 600;">
                                                Personaliza y publica
                                            </p>
                                            <p style="color: #71717a; margin: 0; font-size: 14px; line-height: 1.5;">
                                                Ajusta colores, textos y secciones. Publica tu sitio con un clic.
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
        
        ${getDividerComponent()}
        
        <!-- Features Highlight -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 32px;">
            <tr>
                <td>
                    <h2 style="color: #18181b; margin: 0 0 20px 0; font-size: 20px; font-weight: 600; text-align: center;">
                        ✨ Lo que puedes hacer con Quimera AI
                    </h2>
                    
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td style="padding: 8px 0;">
                                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td style="width: 24px; vertical-align: top; color: ${PRIMARY_COLOR}; font-size: 16px;">✓</td>
                                        <td style="color: #52525b; font-size: 15px; padding-left: 8px;">
                                            Crear sitios web profesionales en minutos
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;">
                                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td style="width: 24px; vertical-align: top; color: ${PRIMARY_COLOR}; font-size: 16px;">✓</td>
                                        <td style="color: #52525b; font-size: 15px; padding-left: 8px;">
                                            Generar imágenes únicas con IA
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;">
                                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td style="width: 24px; vertical-align: top; color: ${PRIMARY_COLOR}; font-size: 16px;">✓</td>
                                        <td style="color: #52525b; font-size: 15px; padding-left: 8px;">
                                            Escribir textos persuasivos automáticamente
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;">
                                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td style="width: 24px; vertical-align: top; color: ${PRIMARY_COLOR}; font-size: 16px;">✓</td>
                                        <td style="color: #52525b; font-size: 15px; padding-left: 8px;">
                                            Gestionar leads y contactos
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;">
                                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td style="width: 24px; vertical-align: top; color: ${PRIMARY_COLOR}; font-size: 16px;">✓</td>
                                        <td style="color: #52525b; font-size: 15px; padding-left: 8px;">
                                            Chatbot inteligente para tu sitio
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        
        ${getDividerComponent()}
        
        <!-- CTA -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center" style="padding-top: 16px;">
                    <p style="color: #71717a; margin: 0 0 20px 0; font-size: 16px;">
                        ¿Listo para crear tu primer sitio web?
                    </p>
                    ${getButtonComponent('Ir a mi Dashboard', dashboardUrl, PRIMARY_COLOR)}
                    <p style="color: #a1a1aa; margin: 24px 0 0 0; font-size: 13px;">
                        ¿Necesitas ayuda? Escríbenos a <a href="mailto:${supportEmail}" style="color: ${SECONDARY_COLOR};">${supportEmail}</a>
                    </p>
                </td>
            </tr>
        </table>
    `;

    return getBaseTemplate({
        title: '¡Bienvenido a Quimera AI!',
        previewText: `Hola ${displayName}, tu cuenta está lista. Comienza a crear sitios web increíbles con IA.`,
        primaryColor: PRIMARY_COLOR,
        logoUrl: QUIMERA_LOGO,
        storeName: 'Quimera AI',
        content,
        footerText: '© 2024 Quimera AI. Todos los derechos reservados.',
        socialLinks: {
            twitter: 'https://twitter.com/quimeraai',
            instagram: 'https://instagram.com/quimeraai',
            linkedin: 'https://linkedin.com/company/quimeraai',
        },
    });
};
