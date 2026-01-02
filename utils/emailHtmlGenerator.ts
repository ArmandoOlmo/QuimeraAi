/**
 * emailHtmlGenerator
 * Converts EmailDocument to HTML compatible with email clients
 * Uses table-based layouts and inline styles for maximum compatibility
 */

import {
    EmailDocument,
    EmailBlock,
    EmailGlobalStyles,
    EmailHeroContent,
    EmailTextContent,
    EmailImageContent,
    EmailButtonContent,
    EmailDividerContent,
    EmailSpacerContent,
    EmailSocialContent,
    EmailFooterContent,
    EmailPaddingSize,
} from '../types/email';

// =============================================================================
// PADDING VALUES (for inline styles)
// =============================================================================

const PADDING_MAP: Record<EmailPaddingSize, string> = {
    none: '0',
    xs: '8px',
    sm: '16px',
    md: '24px',
    lg: '32px',
    xl: '48px',
};

const FONT_SIZE_MAP = {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
};

const BORDER_RADIUS_MAP = {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const getPadding = (size?: EmailPaddingSize): string => PADDING_MAP[size || 'md'];
const getFontSize = (size?: string): string => FONT_SIZE_MAP[size as keyof typeof FONT_SIZE_MAP] || '16px';
const getBorderRadius = (size?: string): string => BORDER_RADIUS_MAP[size as keyof typeof BORDER_RADIUS_MAP] || '0';

const escapeHtml = (text: string): string => {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

// =============================================================================
// BLOCK TO HTML CONVERTERS
// =============================================================================

const generateHeroBlockHtml = (block: EmailBlock, globalStyles: EmailGlobalStyles): string => {
    const content = block.content as EmailHeroContent;
    const styles = block.styles;
    
    const bgColor = styles.backgroundColor || globalStyles.primaryColor;
    const headingColor = styles.headingColor || '#ffffff';
    const textColor = styles.textColor || '#ffffff';
    const buttonColor = styles.buttonColor || '#ffffff';
    const buttonTextColor = styles.buttonTextColor || globalStyles.primaryColor;
    const padding = getPadding(styles.padding);
    const alignment = styles.alignment || 'center';
    
    let buttonHtml = '';
    if (content.showButton && content.buttonText) {
        buttonHtml = `
            <tr>
                <td align="${alignment}" style="padding-top: 20px;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${content.buttonUrl || '#'}" style="height:44px;v-text-anchor:middle;width:160px;" arcsize="14%" stroke="f" fillcolor="${buttonColor}">
                    <w:anchorlock/>
                    <center>
                    <![endif]-->
                    <a href="${content.buttonUrl || '#'}" style="background-color: ${buttonColor}; color: ${buttonTextColor}; display: inline-block; padding: 12px 28px; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 6px; font-family: ${globalStyles.fontFamily};">
                        ${escapeHtml(content.buttonText)}
                    </a>
                    <!--[if mso]>
                    </center>
                    </v:roundrect>
                    <![endif]-->
                </td>
            </tr>
        `;
    }
    
    let imageHtml = '';
    if (content.imageUrl) {
        imageHtml = `
            <tr>
                <td align="${alignment}" style="padding-bottom: 16px;">
                    <img src="${content.imageUrl}" alt="${escapeHtml(content.imageAlt || '')}" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" />
                </td>
            </tr>
        `;
    }
    
    return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="background-color: ${bgColor}; padding: ${padding};">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        ${imageHtml}
                        <tr>
                            <td align="${alignment}">
                                <h1 style="color: ${headingColor}; font-size: 28px; font-weight: bold; margin: 0 0 12px 0; line-height: 1.3; font-family: ${globalStyles.fontFamily};">
                                    ${escapeHtml(content.headline)}
                                </h1>
                            </td>
                        </tr>
                        ${content.subheadline ? `
                            <tr>
                                <td align="${alignment}">
                                    <p style="color: ${textColor}; font-size: 16px; margin: 0 0 20px 0; opacity: 0.9; font-family: ${globalStyles.fontFamily};">
                                        ${escapeHtml(content.subheadline)}
                                    </p>
                                </td>
                            </tr>
                        ` : ''}
                        ${buttonHtml}
                    </table>
                </td>
            </tr>
        </table>
    `;
};

const generateTextBlockHtml = (block: EmailBlock, globalStyles: EmailGlobalStyles): string => {
    const content = block.content as EmailTextContent;
    const styles = block.styles;
    
    const bgColor = styles.backgroundColor || 'transparent';
    const textColor = styles.textColor || globalStyles.textColor;
    const padding = getPadding(styles.padding);
    const alignment = styles.alignment || 'left';
    const fontSize = getFontSize(styles.fontSize);
    
    const textContent = content.isHtml ? content.text : escapeHtml(content.text).replace(/\n/g, '<br>');
    
    return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="background-color: ${bgColor}; padding: ${padding};">
                    <p style="color: ${textColor}; font-size: ${fontSize}; line-height: 1.6; margin: 0; text-align: ${alignment}; font-family: ${globalStyles.fontFamily};">
                        ${textContent}
                    </p>
                </td>
            </tr>
        </table>
    `;
};

const generateImageBlockHtml = (block: EmailBlock, globalStyles: EmailGlobalStyles): string => {
    const content = block.content as EmailImageContent;
    const styles = block.styles;
    
    const padding = getPadding(styles.padding);
    const alignment = styles.alignment || 'center';
    const borderRadius = getBorderRadius(styles.borderRadius);
    const width = content.width || 100;
    
    const imgStyle = `display: block; max-width: ${width}%; height: auto; border-radius: ${borderRadius}; margin: ${alignment === 'center' ? '0 auto' : alignment === 'right' ? '0 0 0 auto' : '0'};`;
    
    const imgTag = `<img src="${content.src || ''}" alt="${escapeHtml(content.alt || '')}" style="${imgStyle}" />`;
    
    const imageContent = content.link 
        ? `<a href="${content.link}" style="display: block;">${imgTag}</a>`
        : imgTag;
    
    return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td align="${alignment}" style="padding: ${padding};">
                    ${imageContent}
                </td>
            </tr>
        </table>
    `;
};

const generateButtonBlockHtml = (block: EmailBlock, globalStyles: EmailGlobalStyles): string => {
    const content = block.content as EmailButtonContent;
    const styles = block.styles;
    
    const padding = getPadding(styles.padding);
    const alignment = styles.alignment || 'center';
    const buttonColor = styles.buttonColor || globalStyles.primaryColor;
    const buttonTextColor = styles.buttonTextColor || '#ffffff';
    const borderRadius = getBorderRadius(styles.borderRadius);
    const displayStyle = content.fullWidth ? 'display: block; width: 100%;' : 'display: inline-block;';
    
    return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td align="${alignment}" style="padding: ${padding};">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${content.url || '#'}" style="height:48px;v-text-anchor:middle;${content.fullWidth ? 'width:100%;' : 'width:180px;'}" arcsize="14%" stroke="f" fillcolor="${buttonColor}">
                    <w:anchorlock/>
                    <center>
                    <![endif]-->
                    <a href="${content.url || '#'}" style="background-color: ${buttonColor}; color: ${buttonTextColor}; ${displayStyle} padding: 14px 32px; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: ${borderRadius}; text-align: center; font-family: ${globalStyles.fontFamily};">
                        ${escapeHtml(content.text)}
                    </a>
                    <!--[if mso]>
                    </center>
                    </v:roundrect>
                    <![endif]-->
                </td>
            </tr>
        </table>
    `;
};

const generateDividerBlockHtml = (block: EmailBlock, globalStyles: EmailGlobalStyles): string => {
    const content = block.content as EmailDividerContent;
    const styles = block.styles;
    
    const padding = getPadding(styles.padding);
    const borderColor = styles.borderColor || '#e4e4e7';
    const lineStyle = content.style || 'solid';
    const thickness = content.thickness || 1;
    const width = content.width || 100;
    
    return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td align="center" style="padding: ${padding};">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="${width}%">
                        <tr>
                            <td style="border-top: ${thickness}px ${lineStyle} ${borderColor}; height: 1px; line-height: 1px; font-size: 1px;">&nbsp;</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    `;
};

const generateSpacerBlockHtml = (block: EmailBlock): string => {
    const content = block.content as EmailSpacerContent;
    const height = content.height || 32;
    
    return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="height: ${height}px; line-height: ${height}px; font-size: 1px;">&nbsp;</td>
            </tr>
        </table>
    `;
};

const generateSocialBlockHtml = (block: EmailBlock, globalStyles: EmailGlobalStyles): string => {
    const content = block.content as EmailSocialContent;
    const styles = block.styles;
    
    const padding = getPadding(styles.padding);
    const alignment = styles.alignment || 'center';
    
    // Social icon URLs (using simple icons CDN or data URIs would be more reliable)
    const socialIcons: Record<string, { url: string; color: string }> = {
        facebook: { url: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/facebook.svg', color: '#1877f2' },
        instagram: { url: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/instagram.svg', color: '#e4405f' },
        twitter: { url: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/x.svg', color: '#000000' },
        linkedin: { url: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/linkedin.svg', color: '#0a66c2' },
        youtube: { url: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/youtube.svg', color: '#ff0000' },
    };
    
    const iconSize = content.iconSize === 'sm' ? 20 : content.iconSize === 'lg' ? 32 : 24;
    
    const links = Object.entries(content.links || {}).filter(([_, url]) => url);
    
    if (links.length === 0) return '';
    
    const socialLinks = links.map(([platform, url]) => {
        const icon = socialIcons[platform];
        if (!icon) return '';
        return `
            <td style="padding: 0 8px;">
                <a href="${url}" style="display: inline-block;">
                    <img src="${icon.url}" alt="${platform}" width="${iconSize}" height="${iconSize}" style="display: block; ${content.iconStyle === 'mono' ? 'opacity: 0.6;' : ''}" />
                </a>
            </td>
        `;
    }).join('');
    
    return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td align="${alignment}" style="padding: ${padding};">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                            ${socialLinks}
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    `;
};

const generateFooterBlockHtml = (block: EmailBlock, globalStyles: EmailGlobalStyles): string => {
    const content = block.content as EmailFooterContent;
    const styles = block.styles;
    
    const bgColor = styles.backgroundColor || '#f4f4f5';
    const textColor = styles.textColor || '#71717a';
    const padding = getPadding(styles.padding);
    const alignment = styles.alignment || 'center';
    const fontSize = getFontSize(styles.fontSize);
    
    return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="background-color: ${bgColor}; padding: ${padding}; text-align: ${alignment};">
                    ${content.companyName ? `
                        <p style="color: ${textColor}; font-size: ${fontSize}; margin: 0 0 8px 0; font-weight: 600; font-family: ${globalStyles.fontFamily};">
                            ${escapeHtml(content.companyName)}
                        </p>
                    ` : ''}
                    ${content.address ? `
                        <p style="color: ${textColor}; font-size: ${fontSize}; margin: 0 0 12px 0; opacity: 0.8; font-family: ${globalStyles.fontFamily};">
                            ${escapeHtml(content.address)}
                        </p>
                    ` : ''}
                    ${content.copyrightText ? `
                        <p style="color: ${textColor}; font-size: 11px; margin: 0 0 8px 0; opacity: 0.7; font-family: ${globalStyles.fontFamily};">
                            ${escapeHtml(content.copyrightText)}
                        </p>
                    ` : ''}
                    ${content.showUnsubscribe ? `
                        <a href="{{unsubscribe_url}}" style="color: ${textColor}; font-size: 11px; text-decoration: underline; font-family: ${globalStyles.fontFamily};">
                            ${escapeHtml(content.unsubscribeText || 'Unsubscribe')}
                        </a>
                    ` : ''}
                </td>
            </tr>
        </table>
    `;
};

// =============================================================================
// MAIN GENERATOR
// =============================================================================

const generateBlockHtml = (block: EmailBlock, globalStyles: EmailGlobalStyles): string => {
    if (!block.visible) return '';
    
    switch (block.type) {
        case 'hero':
            return generateHeroBlockHtml(block, globalStyles);
        case 'text':
            return generateTextBlockHtml(block, globalStyles);
        case 'image':
            return generateImageBlockHtml(block, globalStyles);
        case 'button':
            return generateButtonBlockHtml(block, globalStyles);
        case 'divider':
            return generateDividerBlockHtml(block, globalStyles);
        case 'spacer':
            return generateSpacerBlockHtml(block);
        case 'social':
            return generateSocialBlockHtml(block, globalStyles);
        case 'footer':
            return generateFooterBlockHtml(block, globalStyles);
        default:
            return '';
    }
};

/**
 * Generate complete HTML email from EmailDocument
 */
export const generateEmailHtml = (document: EmailDocument): string => {
    const { globalStyles, blocks } = document;
    
    const blocksHtml = blocks
        .filter(block => block.visible)
        .map(block => generateBlockHtml(block, globalStyles))
        .join('\n');
    
    return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="format-detection" content="telephone=no, address=no, email=no, date=no">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${escapeHtml(document.subject || 'Email')}</title>
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
        * {
            box-sizing: border-box;
        }
        body {
            margin: 0;
            padding: 0;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        table {
            border-collapse: collapse;
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }
        img {
            border: 0;
            height: auto;
            line-height: 100%;
            outline: none;
            text-decoration: none;
            -ms-interpolation-mode: bicubic;
        }
        a {
            text-decoration: none;
        }
        @media only screen and (max-width: 620px) {
            .email-container {
                width: 100% !important;
                max-width: 100% !important;
            }
            .stack-column {
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
            }
            .stack-column-center {
                text-align: center !important;
            }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; word-spacing: normal; background-color: ${globalStyles.bodyBackgroundColor};">
    ${document.previewText ? `
    <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
        ${escapeHtml(document.previewText)}
        ${'&#847; &zwnj; &nbsp;'.repeat(20)}
    </div>
    ` : ''}
    
    <div role="article" aria-roledescription="email" lang="en" style="text-size-adjust: 100%; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: ${globalStyles.bodyBackgroundColor};">
        <table role="presentation" style="width: 100%; border: 0; border-spacing: 0; background-color: ${globalStyles.bodyBackgroundColor};">
            <tr>
                <td align="center" style="padding: 20px 10px;">
                    <!--[if mso]>
                    <table role="presentation" align="center" style="width: 600px;">
                    <tr>
                    <td>
                    <![endif]-->
                    <table role="presentation" class="email-container" style="width: 100%; max-width: 600px; border: 0; border-spacing: 0; background-color: ${globalStyles.backgroundColor}; font-family: ${globalStyles.fontFamily};">
                        <tr>
                            <td>
                                ${blocksHtml}
                            </td>
                        </tr>
                    </table>
                    <!--[if mso]>
                    </td>
                    </tr>
                    </table>
                    <![endif]-->
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
    `.trim();
};

/**
 * Generate plain text version of the email
 */
export const generateEmailPlainText = (document: EmailDocument): string => {
    const lines: string[] = [];
    
    document.blocks.filter(b => b.visible).forEach(block => {
        switch (block.type) {
            case 'hero': {
                const content = block.content as EmailHeroContent;
                lines.push(content.headline);
                if (content.subheadline) lines.push(content.subheadline);
                if (content.buttonText && content.buttonUrl) {
                    lines.push(`${content.buttonText}: ${content.buttonUrl}`);
                }
                lines.push('');
                break;
            }
            case 'text': {
                const content = block.content as EmailTextContent;
                lines.push(content.text.replace(/<[^>]*>/g, ''));
                lines.push('');
                break;
            }
            case 'button': {
                const content = block.content as EmailButtonContent;
                lines.push(`${content.text}: ${content.url}`);
                lines.push('');
                break;
            }
            case 'divider':
                lines.push('---');
                lines.push('');
                break;
            case 'footer': {
                const content = block.content as EmailFooterContent;
                if (content.companyName) lines.push(content.companyName);
                if (content.address) lines.push(content.address);
                if (content.copyrightText) lines.push(content.copyrightText);
                if (content.showUnsubscribe) {
                    lines.push(`${content.unsubscribeText || 'Unsubscribe'}: {{unsubscribe_url}}`);
                }
                break;
            }
        }
    });
    
    return lines.join('\n');
};

export default generateEmailHtml;






