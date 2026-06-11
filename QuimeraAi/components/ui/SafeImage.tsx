/**
 * SafeImage Component
 * 
 * Drop-in replacement for <img> that gracefully handles broken legacy storage URLs.
 * Shows an elegant placeholder when images fail to load (e.g., Supabase 402 errors).
 */

import React, { useState, useCallback, ImgHTMLAttributes } from 'react';
import { isLegacyStorageUrl, getPlaceholderImage } from '../../utils/imageUrlHelper';

interface SafeImageProps extends ImgHTMLAttributes<HTMLImageElement> {
    /** Fallback label shown on placeholder */
    fallbackLabel?: string;
    /** Custom fallback URL */
    fallbackSrc?: string;
    /** Whether to preemptively block known-broken Supabase URLs */
    blockSupabase?: boolean;
}

const SafeImage: React.FC<SafeImageProps> = ({
    src,
    alt,
    fallbackLabel,
    fallbackSrc,
    blockSupabase = true,
    style,
    className,
    onError,
    ...rest
}) => {
    const [hasError, setHasError] = useState(false);

    // Preemptively detect broken Supabase URLs
    const isKnownBroken = blockSupabase && isLegacyStorageUrl(src);

    const handleError = useCallback(
        (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
            setHasError(true);
            if (onError) onError(e);
        },
        [onError]
    );

    const placeholder = fallbackSrc || getPlaceholderImage(
        typeof rest.width === 'number' ? rest.width : 400,
        typeof rest.height === 'number' ? rest.height : 300,
        fallbackLabel || alt || 'Imagen no disponible'
    );

    const effectiveSrc = (isKnownBroken || hasError) ? placeholder : src;

    return (
        <img
            {...rest}
            src={effectiveSrc || placeholder}
            alt={alt || ''}
            className={`${className || ''} ${(isKnownBroken || hasError) ? 'safe-image-placeholder' : ''}`.trim()}
            style={{
                ...style,
                ...(isKnownBroken || hasError ? { objectFit: 'contain' as const } : {}),
            }}
            onError={handleError}
        />
    );
};

export default SafeImage;
