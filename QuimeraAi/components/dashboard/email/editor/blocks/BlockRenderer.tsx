/**
 * BlockRenderer
 * Utility to render email blocks in the preview
 */

import React from 'react';
import {
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
    EmailProductsContent,
    EmailColumnsContent,
    EmailPaddingSize,
} from '../../../../../types/email';

// =============================================================================
// PADDING MAP
// =============================================================================

const PADDING_MAP: Record<EmailPaddingSize, string> = {
    none: '0',
    xs: '8px',
    sm: '16px',
    md: '24px',
    lg: '32px',
    xl: '48px',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const getPadding = (size?: EmailPaddingSize): string => {
    return PADDING_MAP[size || 'md'];
};

// =============================================================================
// BLOCK RENDERERS
// =============================================================================

const renderHeroBlock = (block: EmailBlock, globalStyles: EmailGlobalStyles): React.ReactNode => {
    const content = block.content as EmailHeroContent;
    const styles = block.styles;
    
    return (
        <div
            style={{
                backgroundColor: styles.backgroundColor || globalStyles.primaryColor,
                padding: getPadding(styles.padding),
                textAlign: styles.alignment || 'center',
            }}
        >
            {content.imageUrl && (
                <img
                    src={content.imageUrl}
                    alt={content.imageAlt || ''}
                    style={{
                        maxWidth: '100%',
                        height: 'auto',
                        marginBottom: '16px',
                    }}
                />
            )}
            <h1
                style={{
                    color: styles.headingColor || '#ffffff',
                    fontSize: '28px',
                    fontWeight: 'bold',
                    margin: '0 0 12px 0',
                    lineHeight: '1.3',
                }}
            >
                {content.headline}
            </h1>
            {content.subheadline && (
                <p
                    style={{
                        color: styles.textColor || '#ffffff',
                        fontSize: '16px',
                        margin: '0 0 20px 0',
                        opacity: 0.9,
                    }}
                >
                    {content.subheadline}
                </p>
            )}
            {content.showButton && content.buttonText && (
                <a
                    href={content.buttonUrl || '#'}
                    style={{
                        display: 'inline-block',
                        backgroundColor: styles.buttonColor || '#ffffff',
                        color: styles.buttonTextColor || globalStyles.primaryColor,
                        padding: '12px 28px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontWeight: '600',
                        fontSize: '14px',
                    }}
                >
                    {content.buttonText}
                </a>
            )}
        </div>
    );
};

const renderTextBlock = (block: EmailBlock, globalStyles: EmailGlobalStyles): React.ReactNode => {
    const content = block.content as EmailTextContent;
    const styles = block.styles;
    
    const fontSizeMap = {
        xs: '12px',
        sm: '14px',
        md: '16px',
        lg: '18px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '30px',
    };
    
    return (
        <div
            style={{
                backgroundColor: styles.backgroundColor || 'transparent',
                padding: getPadding(styles.padding),
                textAlign: styles.alignment || 'left',
            }}
        >
            {content.isHtml ? (
                <div
                    dangerouslySetInnerHTML={{ __html: content.text }}
                    style={{
                        color: styles.textColor || globalStyles.textColor,
                        fontSize: fontSizeMap[styles.fontSize || 'md'],
                        lineHeight: '1.6',
                    }}
                />
            ) : (
                <p
                    style={{
                        color: styles.textColor || globalStyles.textColor,
                        fontSize: fontSizeMap[styles.fontSize || 'md'],
                        lineHeight: '1.6',
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                    }}
                >
                    {content.text}
                </p>
            )}
        </div>
    );
};

const renderImageBlock = (block: EmailBlock, globalStyles: EmailGlobalStyles): React.ReactNode => {
    const content = block.content as EmailImageContent;
    const styles = block.styles;
    
    const borderRadiusMap = {
        none: '0',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        full: '9999px',
    };
    
    const imageElement = (
        <img
            src={content.src || 'https://via.placeholder.com/600x300?text=Add+Image'}
            alt={content.alt || ''}
            style={{
                display: 'block',
                width: `${content.width || 100}%`,
                height: 'auto',
                borderRadius: borderRadiusMap[styles.borderRadius || 'none'],
                margin: styles.alignment === 'center' ? '0 auto' : styles.alignment === 'right' ? '0 0 0 auto' : '0',
            }}
        />
    );
    
    return (
        <div
            style={{
                padding: getPadding(styles.padding),
                textAlign: styles.alignment || 'center',
            }}
        >
            {content.link ? (
                <a href={content.link} style={{ display: 'block' }}>
                    {imageElement}
                </a>
            ) : (
                imageElement
            )}
        </div>
    );
};

const renderButtonBlock = (block: EmailBlock, globalStyles: EmailGlobalStyles): React.ReactNode => {
    const content = block.content as EmailButtonContent;
    const styles = block.styles;
    
    const borderRadiusMap = {
        none: '0',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        full: '9999px',
    };
    
    return (
        <div
            style={{
                padding: getPadding(styles.padding),
                textAlign: styles.alignment || 'center',
            }}
        >
            <a
                href={content.url || '#'}
                style={{
                    display: content.fullWidth ? 'block' : 'inline-block',
                    backgroundColor: styles.buttonColor || globalStyles.primaryColor,
                    color: styles.buttonTextColor || '#ffffff',
                    padding: '14px 32px',
                    borderRadius: borderRadiusMap[styles.borderRadius || 'md'],
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '16px',
                    textAlign: 'center',
                }}
            >
                {content.text}
            </a>
        </div>
    );
};

const renderDividerBlock = (block: EmailBlock, globalStyles: EmailGlobalStyles): React.ReactNode => {
    const content = block.content as EmailDividerContent;
    const styles = block.styles;
    
    return (
        <div
            style={{
                padding: getPadding(styles.padding),
                textAlign: 'center',
            }}
        >
            <hr
                style={{
                    border: 'none',
                    borderTop: `${content.thickness}px ${content.style} ${styles.borderColor || '#e4e4e7'}`,
                    width: `${content.width}%`,
                    margin: '0 auto',
                }}
            />
        </div>
    );
};

const renderSpacerBlock = (block: EmailBlock): React.ReactNode => {
    const content = block.content as EmailSpacerContent;
    
    return (
        <div
            style={{
                height: `${content.height}px`,
            }}
        />
    );
};

const renderSocialBlock = (block: EmailBlock, globalStyles: EmailGlobalStyles): React.ReactNode => {
    const content = block.content as EmailSocialContent;
    const styles = block.styles;
    
    const socialIcons: Record<string, string> = {
        facebook: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/facebook.svg',
        instagram: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/instagram.svg',
        twitter: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/twitter.svg',
        linkedin: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/linkedin.svg',
        youtube: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/youtube.svg',
    };
    
    const iconSizeMap = {
        sm: '20px',
        md: '24px',
        lg: '32px',
    };
    
    const links = Object.entries(content.links || {}).filter(([_, url]) => url);
    
    if (links.length === 0) {
        return (
            <div
                style={{
                    padding: getPadding(styles.padding),
                    textAlign: styles.alignment || 'center',
                    color: '#999',
                    fontSize: '14px',
                }}
            >
                Add social links in the properties panel
            </div>
        );
    }
    
    return (
        <div
            style={{
                padding: getPadding(styles.padding),
                textAlign: styles.alignment || 'center',
            }}
        >
            {links.map(([platform, url]) => (
                <a
                    key={platform}
                    href={url}
                    style={{
                        display: 'inline-block',
                        margin: '0 8px',
                    }}
                >
                    <img
                        src={socialIcons[platform]}
                        alt={platform}
                        style={{
                            width: iconSizeMap[content.iconSize || 'md'],
                            height: iconSizeMap[content.iconSize || 'md'],
                            opacity: content.iconStyle === 'mono' ? 0.6 : 1,
                        }}
                    />
                </a>
            ))}
        </div>
    );
};

const renderFooterBlock = (block: EmailBlock, globalStyles: EmailGlobalStyles): React.ReactNode => {
    const content = block.content as EmailFooterContent;
    const styles = block.styles;
    
    const fontSizeMap = {
        xs: '10px',
        sm: '12px',
        md: '14px',
        lg: '16px',
        xl: '18px',
        '2xl': '20px',
        '3xl': '24px',
    };
    
    return (
        <div
            style={{
                backgroundColor: styles.backgroundColor || '#f4f4f5',
                padding: getPadding(styles.padding),
                textAlign: styles.alignment || 'center',
            }}
        >
            {content.companyName && (
                <p
                    style={{
                        color: styles.textColor || '#71717a',
                        fontSize: fontSizeMap[styles.fontSize || 'sm'],
                        margin: '0 0 8px 0',
                        fontWeight: '600',
                    }}
                >
                    {content.companyName}
                </p>
            )}
            {content.address && (
                <p
                    style={{
                        color: styles.textColor || '#a1a1aa',
                        fontSize: fontSizeMap[styles.fontSize || 'sm'],
                        margin: '0 0 12px 0',
                    }}
                >
                    {content.address}
                </p>
            )}
            {content.copyrightText && (
                <p
                    style={{
                        color: styles.textColor || '#a1a1aa',
                        fontSize: '11px',
                        margin: '0 0 8px 0',
                    }}
                >
                    {content.copyrightText}
                </p>
            )}
            {content.showUnsubscribe && (
                <a
                    href="#unsubscribe"
                    style={{
                        color: styles.textColor || '#a1a1aa',
                        fontSize: '11px',
                        textDecoration: 'underline',
                    }}
                >
                    {content.unsubscribeText || 'Unsubscribe'}
                </a>
            )}
        </div>
    );
};

const renderProductsBlock = (block: EmailBlock, globalStyles: EmailGlobalStyles): React.ReactNode => {
    const content = block.content as EmailProductsContent;
    const styles = block.styles;
    
    const productIds = content.productIds || [];
    const columns = content.columns || 2;
    
    if (productIds.length === 0) {
        return (
            <div
                style={{
                    padding: getPadding(styles.padding),
                    textAlign: 'center',
                    color: '#999',
                    backgroundColor: styles.backgroundColor || 'transparent',
                }}
            >
                <div style={{ padding: '24px', border: '2px dashed #ddd', borderRadius: '8px' }}>
                    <p style={{ margin: 0, fontSize: '14px' }}>
                        Add product IDs in the properties panel
                    </p>
                </div>
            </div>
        );
    }
    
    const columnWidth = `${100 / columns}%`;
    
    return (
        <div
            style={{
                padding: getPadding(styles.padding),
                backgroundColor: styles.backgroundColor || 'transparent',
            }}
        >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                {productIds.map((productId, index) => (
                    <div
                        key={index}
                        style={{
                            width: `calc(${columnWidth} - 16px)`,
                            padding: '16px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            textAlign: 'center',
                        }}
                    >
                        <div
                            style={{
                                width: '100%',
                                height: '120px',
                                backgroundColor: '#f4f4f5',
                                borderRadius: '4px',
                                marginBottom: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#999',
                                fontSize: '12px',
                            }}
                        >
                            Product Image
                        </div>
                        <p style={{ margin: '0 0 8px', fontWeight: '600', color: globalStyles.textColor }}>
                            Product: {productId || 'No ID'}
                        </p>
                        {content.showPrices && (
                            <p style={{ margin: '0 0 12px', color: globalStyles.primaryColor, fontWeight: 'bold' }}>
                                $XX.XX
                            </p>
                        )}
                        {content.showButtons && (
                            <a
                                href="#"
                                style={{
                                    display: 'inline-block',
                                    backgroundColor: styles.buttonColor || globalStyles.primaryColor,
                                    color: styles.buttonTextColor || '#ffffff',
                                    padding: '8px 16px',
                                    borderRadius: '4px',
                                    textDecoration: 'none',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                }}
                            >
                                {content.buttonText || 'View Product'}
                            </a>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const renderColumnsBlock = (block: EmailBlock, globalStyles: EmailGlobalStyles): React.ReactNode => {
    const content = block.content as EmailColumnsContent;
    const styles = block.styles;
    
    const columnCount = content.columnCount || 2;
    const columnWidth = `${100 / columnCount}%`;
    
    const gapMap = {
        none: '0',
        sm: '8px',
        md: '16px',
        lg: '24px',
    };
    const gap = gapMap[content.gap || 'md'];
    
    return (
        <div
            style={{
                padding: getPadding(styles.padding),
                backgroundColor: styles.backgroundColor || 'transparent',
            }}
        >
            <div style={{ display: 'flex', gap }}>
                {Array.from({ length: columnCount }).map((_, index) => (
                    <div
                        key={index}
                        style={{
                            flex: 1,
                            minHeight: '100px',
                            border: '2px dashed #ddd',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#999',
                            fontSize: '12px',
                        }}
                    >
                        Column {index + 1}
                    </div>
                ))}
            </div>
        </div>
    );
};

// =============================================================================
// MAIN RENDERER
// =============================================================================

export const renderEmailBlock = (block: EmailBlock, globalStyles: EmailGlobalStyles): React.ReactNode => {
    switch (block.type) {
        case 'hero':
            return renderHeroBlock(block, globalStyles);
        case 'text':
            return renderTextBlock(block, globalStyles);
        case 'image':
            return renderImageBlock(block, globalStyles);
        case 'button':
            return renderButtonBlock(block, globalStyles);
        case 'divider':
            return renderDividerBlock(block, globalStyles);
        case 'spacer':
            return renderSpacerBlock(block);
        case 'social':
            return renderSocialBlock(block, globalStyles);
        case 'footer':
            return renderFooterBlock(block, globalStyles);
        case 'products':
            return renderProductsBlock(block, globalStyles);
        case 'columns':
            return renderColumnsBlock(block, globalStyles);
        default:
            return (
                <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
                    Unknown block type: {block.type}
                </div>
            );
    }
};

export default renderEmailBlock;






