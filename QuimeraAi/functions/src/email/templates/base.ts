/**
 * Base Email Template
 * Layout base HTML responsive para todos los emails
 */

export interface BaseTemplateParams {
    title: string;
    previewText?: string;
    primaryColor?: string;
    logoUrl?: string;
    storeName?: string;
    content: string;
    footerText?: string;
    socialLinks?: {
        facebook?: string;
        instagram?: string;
        twitter?: string;
        linkedin?: string;
    };
    unsubscribeUrl?: string;
}

/**
 * Get the base HTML template
 */
export const getBaseTemplate = (params: BaseTemplateParams): string => {
    const {
        title,
        previewText = '',
        primaryColor = '#4f46e5',
        logoUrl,
        storeName = 'Quimera',
        content,
        footerText = '',
        socialLinks,
        unsubscribeUrl,
    } = params;

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <title>${title}</title>
    
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    
    <style>
        /* Reset styles */
        body, table, td, p, a, li, blockquote {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        table, td {
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }
        img {
            -ms-interpolation-mode: bicubic;
            border: 0;
            height: auto;
            line-height: 100%;
            outline: none;
            text-decoration: none;
        }
        
        /* Base styles */
        body {
            margin: 0 !important;
            padding: 0 !important;
            background-color: #f4f4f5;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        
        /* Links */
        a {
            color: ${primaryColor};
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        
        /* Responsive */
        @media only screen and (max-width: 600px) {
            .container {
                width: 100% !important;
                padding: 0 16px !important;
            }
            .content-cell {
                padding: 24px 16px !important;
            }
            .header-cell {
                padding: 20px 16px !important;
            }
            .footer-cell {
                padding: 20px 16px !important;
            }
            .responsive-image {
                width: 100% !important;
                max-width: 100% !important;
                height: auto !important;
            }
            .mobile-center {
                text-align: center !important;
            }
            .mobile-full-width {
                width: 100% !important;
                display: block !important;
            }
            .mobile-padding {
                padding-left: 16px !important;
                padding-right: 16px !important;
            }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5;">
    ${previewText ? `
    <!-- Preview text -->
    <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
        ${previewText}
    </div>
    <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
        &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
    </div>
    ` : ''}
    
    <!-- Main wrapper -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                
                <!-- Email container -->
                <table role="presentation" class="container" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                    
                    <!-- Header -->
                    <tr>
                        <td class="header-cell" align="center" style="background-color: ${primaryColor}; padding: 30px 40px;">
                            ${logoUrl ? `
                            <img src="${logoUrl}" alt="${storeName}" style="max-height: 50px; max-width: 200px; margin-bottom: 8px;">
                            ` : `
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                                ${storeName}
                            </h1>
                            `}
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td class="content-cell" style="padding: 40px;">
                            ${content}
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td class="footer-cell" style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e4e4e7;">
                            
                            ${socialLinks && (socialLinks.facebook || socialLinks.instagram || socialLinks.twitter || socialLinks.linkedin) ? `
                            <!-- Social Links -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                                <tr>
                                    <td align="center">
                                        ${socialLinks.facebook ? `
                                        <a href="${socialLinks.facebook}" style="display: inline-block; margin: 0 8px;">
                                            <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/facebook.svg" alt="Facebook" width="24" height="24" style="opacity: 0.6;">
                                        </a>
                                        ` : ''}
                                        ${socialLinks.instagram ? `
                                        <a href="${socialLinks.instagram}" style="display: inline-block; margin: 0 8px;">
                                            <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/instagram.svg" alt="Instagram" width="24" height="24" style="opacity: 0.6;">
                                        </a>
                                        ` : ''}
                                        ${socialLinks.twitter ? `
                                        <a href="${socialLinks.twitter}" style="display: inline-block; margin: 0 8px;">
                                            <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/twitter.svg" alt="Twitter" width="24" height="24" style="opacity: 0.6;">
                                        </a>
                                        ` : ''}
                                        ${socialLinks.linkedin ? `
                                        <a href="${socialLinks.linkedin}" style="display: inline-block; margin: 0 8px;">
                                            <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/linkedin.svg" alt="LinkedIn" width="24" height="24" style="opacity: 0.6;">
                                        </a>
                                        ` : ''}
                                    </td>
                                </tr>
                            </table>
                            ` : ''}
                            
                            <!-- Footer text -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center">
                                        ${footerText ? `
                                        <p style="color: #71717a; margin: 0 0 12px 0; font-size: 14px; line-height: 1.6;">
                                            ${footerText}
                                        </p>
                                        ` : ''}
                                        <p style="color: #a1a1aa; margin: 0; font-size: 12px; line-height: 1.6;">
                                            Si tienes preguntas, responde a este email.
                                        </p>
                                        ${unsubscribeUrl ? `
                                        <p style="color: #a1a1aa; margin: 12px 0 0 0; font-size: 12px;">
                                            <a href="${unsubscribeUrl}" style="color: #a1a1aa; text-decoration: underline;">
                                                Cancelar suscripcion
                                            </a>
                                        </p>
                                        ` : ''}
                                    </td>
                                </tr>
                            </table>
                            
                        </td>
                    </tr>
                    
                </table>
                
                <!-- Bottom text -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="600" class="container">
                    <tr>
                        <td align="center" style="padding: 20px;">
                            <p style="color: #a1a1aa; margin: 0; font-size: 11px;">
                                Powered by <a href="https://quimera.ai" style="color: #a1a1aa;">Quimera</a>
                            </p>
                        </td>
                    </tr>
                </table>
                
            </td>
        </tr>
    </table>
    
</body>
</html>
`.trim();
};

// =============================================================================
// REUSABLE COMPONENTS
// =============================================================================

/**
 * Primary button component
 */
export const getButtonComponent = (
    text: string,
    url: string,
    color: string = '#4f46e5'
): string => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
    <tr>
        <td align="center" style="background-color: ${color}; border-radius: 8px;">
            <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none;">
                ${text}
            </a>
        </td>
    </tr>
</table>
`;

/**
 * Info box component
 */
export const getInfoBoxComponent = (
    title: string,
    value: string,
    backgroundColor: string = '#f4f4f5'
): string => `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${backgroundColor}; border-radius: 8px; margin: 16px 0;">
    <tr>
        <td style="padding: 16px 20px;">
            <p style="color: #71717a; margin: 0 0 4px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">
                ${title}
            </p>
            <p style="color: #18181b; margin: 0; font-size: 18px; font-weight: 600;">
                ${value}
            </p>
        </td>
    </tr>
</table>
`;

/**
 * Divider component
 */
export const getDividerComponent = (color: string = '#e4e4e7'): string => `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
    <tr>
        <td style="border-top: 1px solid ${color};"></td>
    </tr>
</table>
`;

/**
 * Heading component
 */
export const getHeadingComponent = (
    text: string,
    level: 1 | 2 | 3 = 2
): string => {
    const sizes = {
        1: { fontSize: '28px', marginBottom: '16px' },
        2: { fontSize: '20px', marginBottom: '12px' },
        3: { fontSize: '16px', marginBottom: '8px' },
    };
    const style = sizes[level];
    
    return `
<h${level} style="color: #18181b; margin: 0 0 ${style.marginBottom} 0; font-size: ${style.fontSize}; font-weight: 700; line-height: 1.3;">
    ${text}
</h${level}>
`;
};

/**
 * Paragraph component
 */
export const getParagraphComponent = (
    text: string,
    color: string = '#52525b'
): string => `
<p style="color: ${color}; margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;">
    ${text}
</p>
`;

/**
 * Alert/Notice component
 */
export const getAlertComponent = (
    text: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
): string => {
    const colors = {
        info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
        success: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
        warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
        error: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
    };
    const style = colors[type];
    
    return `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${style.bg}; border-left: 4px solid ${style.border}; border-radius: 4px; margin: 16px 0;">
    <tr>
        <td style="padding: 16px;">
            <p style="color: ${style.text}; margin: 0; font-size: 14px; line-height: 1.5;">
                ${text}
            </p>
        </td>
    </tr>
</table>
`;
};











