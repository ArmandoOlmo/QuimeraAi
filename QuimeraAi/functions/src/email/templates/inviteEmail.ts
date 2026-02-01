/**
 * Invite Email Template
 * HTML template for tenant invitation emails
 */

export interface InviteEmailData {
    inviteUrl: string;
    inviterName: string;
    tenantName: string;
    tenantLogo?: string;
    role: string;
    message?: string;
    email: string;
    expiresAt?: Date;
    brandingColor?: string;
}

/**
 * Get role label in Spanish
 */
function getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
        agency_owner: 'Propietario',
        agency_admin: 'Administrador',
        agency_member: 'Miembro',
        client: 'Cliente',
        client_admin: 'Administrador de Cliente',
        client_user: 'Usuario',
    };
    return labels[role] || role;
}

/**
 * Generate HTML for invite email
 */
export function generateInviteEmailHtml(data: InviteEmailData): string {
    const primaryColor = data.brandingColor || '#4f46e5';
    const roleLabel = getRoleLabel(data.role);
    
    const expirationText = data.expiresAt 
        ? `Esta invitación expira el ${data.expiresAt.toLocaleDateString('es-ES', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          })}.`
        : 'Esta invitación expira en 7 días.';

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitación a ${escapeHtml(data.tenantName)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="min-height: 100vh;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, ${primaryColor} 0%, ${adjustColor(primaryColor, -20)} 100%); padding: 40px 40px 32px;">
                            ${data.tenantLogo ? `
                            <img src="${escapeHtml(data.tenantLogo)}" alt="${escapeHtml(data.tenantName)}" style="max-height: 48px; max-width: 200px; margin-bottom: 24px;">
                            ` : `
                            <div style="font-size: 28px; font-weight: 700; color: #ffffff; margin-bottom: 24px;">${escapeHtml(data.tenantName)}</div>
                            `}
                            <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #ffffff; line-height: 1.3;">
                                ¡Has sido invitado!
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #374151;">
                                Hola,
                            </p>
                            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #374151;">
                                <strong>${escapeHtml(data.inviterName)}</strong> te ha invitado a unirte a <strong>${escapeHtml(data.tenantName)}</strong> como <strong>${roleLabel}</strong>.
                            </p>
                            
                            ${data.message ? `
                            <div style="background-color: #f9fafb; border-left: 4px solid ${primaryColor}; padding: 16px 20px; margin: 0 0 24px; border-radius: 0 8px 8px 0;">
                                <p style="margin: 0; font-size: 14px; color: #6b7280; font-style: italic;">
                                    "${escapeHtml(data.message)}"
                                </p>
                                <p style="margin: 8px 0 0; font-size: 12px; color: #9ca3af;">
                                    — ${escapeHtml(data.inviterName)}
                                </p>
                            </div>
                            ` : ''}
                            
                            <p style="margin: 0 0 32px; font-size: 16px; line-height: 1.6; color: #374151;">
                                Haz clic en el botón de abajo para aceptar la invitación y comenzar:
                            </p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <a href="${escapeHtml(data.inviteUrl)}" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                                            Aceptar Invitación
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 32px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                                ${expirationText}
                            </p>
                            
                            <p style="margin: 16px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                                Si no esperabas esta invitación, puedes ignorar este email de forma segura.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Alternative Link -->
                    <tr>
                        <td style="padding: 0 40px 32px;">
                            <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px;">
                                <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280;">
                                    ¿El botón no funciona? Copia y pega este enlace en tu navegador:
                                </p>
                                <p style="margin: 0; font-size: 12px; word-break: break-all;">
                                    <a href="${escapeHtml(data.inviteUrl)}" style="color: ${primaryColor}; text-decoration: none;">
                                        ${escapeHtml(data.inviteUrl)}
                                    </a>
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 8px; font-size: 12px; color: #9ca3af; text-align: center;">
                                Este email fue enviado a ${escapeHtml(data.email)}
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                                © ${new Date().getFullYear()} ${escapeHtml(data.tenantName)}. Todos los derechos reservados.
                            </p>
                        </td>
                    </tr>
                    
                </table>
                
                <!-- Powered by -->
                <p style="margin: 24px 0 0; font-size: 11px; color: #9ca3af; text-align: center;">
                    Powered by <a href="https://quimera.ai" style="color: #6b7280; text-decoration: none;">Quimera.ai</a>
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

/**
 * Generate plain text version for email clients that don't support HTML
 */
export function generateInviteEmailText(data: InviteEmailData): string {
    const roleLabel = getRoleLabel(data.role);
    
    let text = `
¡Has sido invitado a ${data.tenantName}!

Hola,

${data.inviterName} te ha invitado a unirte a ${data.tenantName} como ${roleLabel}.
`;

    if (data.message) {
        text += `
Mensaje de ${data.inviterName}:
"${data.message}"
`;
    }

    text += `
Para aceptar la invitación, visita:
${data.inviteUrl}

Esta invitación expira en 7 días.

Si no esperabas esta invitación, puedes ignorar este email.

---
Este email fue enviado a ${data.email}
© ${new Date().getFullYear()} ${data.tenantName}
Powered by Quimera.ai
    `;

    return text.trim();
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Adjust color brightness
 */
function adjustColor(hex: string, percent: number): string {
    hex = hex.replace('#', '');
    
    const num = parseInt(hex, 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + percent));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
    
    return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export default {
    generateInviteEmailHtml,
    generateInviteEmailText,
};
