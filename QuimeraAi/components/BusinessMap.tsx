import React, { useMemo } from 'react';
import { GoogleMap, Marker, useJsApiLoader, Libraries } from '@react-google-maps/api';
import { MapData, BorderRadiusSize, CornerGradientConfig } from '../types';
import { MapPin, Navigation, Phone, Mail, Clock } from 'lucide-react';
import { useDesignTokens } from '../hooks/useDesignTokens';
import { useTranslation } from 'react-i18next';
import { resolveI18nField } from '../utils/i18nContent';
import CornerGradient from './ui/CornerGradient';

// Define libraries outside component to prevent re-renders
const libraries: Libraries = ['places', 'geocoding'];

interface BusinessMapProps extends MapData {
    borderRadius?: BorderRadiusSize;
    cornerGradient?: CornerGradientConfig;
}

const containerStyle = {
    width: '100%',
    height: '100%',
};

const isValidGoogleMapsApiKey = (value?: string) => {
    const key = value?.trim();
    if (!key) return false;
    return key.length > 20 && !/your_|placeholder|api_key|google_maps_api_key/i.test(key);
};

const resolveMapText = (value: unknown, language: string): string => {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && !Array.isArray(value)) {
        return resolveI18nField(value as Record<string, string>, language);
    }
    return String(value);
};

interface GoogleMapEmbedProps {
    apiKey: string;
    center: { lat: number; lng: number };
    zoom?: number;
    options: google.maps.MapOptions;
    loadingText: string;
    renderFallback: () => React.ReactNode;
}

const GoogleMapEmbed: React.FC<GoogleMapEmbedProps> = ({
    apiKey,
    center,
    zoom,
    options,
    loadingText,
    renderFallback,
}) => {
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: apiKey,
        libraries,
    } as any);

    if (loadError) {
        console.error('Google Maps load error:', loadError);
        return <>{renderFallback()}</>;
    }

    if (!isLoaded) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-500" />
                    <p className="text-gray-500">{loadingText}</p>
                </div>
            </div>
        );
    }

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={zoom}
            options={options}
        >
            <Marker position={center} />
        </GoogleMap>
    );
};

// Estilos de mapa profesionales
const silverMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
];

const darkMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#212121' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
    { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
];

const retroMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#ebe3cd' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#523735' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f1e6' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#f5f1e6' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#d4dfa7' }] },
];

const nightMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
];

const BusinessMap: React.FC<BusinessMapProps> = ({
    title,
    description,
    address,
    lat,
    lng,
    zoom,
    mapVariant,
    apiKey,
    paddingY,
    paddingX,
    colors,
    titleFontSize = 'md',
    descriptionFontSize = 'md',
    height,
    borderRadius = 'none',
    cornerGradient,
    phone,
    email,
    businessHours,
    buttonText,
}) => {
    const { t, i18n } = useTranslation();
    // Get design tokens with primary color
    const { getColor } = useDesignTokens();
    const primaryColor = getColor('primary.main', '#4f46e5');
    const activeLanguage = i18n.language?.startsWith('en')
        ? 'en'
        : i18n.language?.startsWith('es')
            ? 'es'
            : i18n.language || 'es';

    const titleText = resolveMapText(title, activeLanguage);
    const descriptionText = resolveMapText(description, activeLanguage);
    const addressText = resolveMapText(address, activeLanguage);
    const phoneText = resolveMapText(phone, activeLanguage).trim();
    const emailText = resolveMapText(email, activeLanguage).trim();
    const businessHoursText = resolveMapText(businessHours, activeLanguage);
    const buttonTextValue = resolveMapText(buttonText, activeLanguage);
    
    // Use component colors - fallback to primary color only if not set
    const mapColors = {
        ...colors,
        heading: colors?.heading || primaryColor,
        cardBackground: colors?.cardBackground || primaryColor,
        buttonBackground: colors?.buttonBackground || colors?.accent || primaryColor,
        buttonText: colors?.buttonText || '#ffffff',
    };

    // Translated strings
    const directionsText = buttonTextValue || t('components.map.getDirections', 'Get Directions');
    const loadingText = t('components.map.loading', 'Loading Map...');
    const locationLabel = t('components.map.locationLabel', 'Location');
    const navigateText = t('components.map.navigate', 'Navigate');
    const hoursLabel = t('components.map.hours', 'Hours');
    const openInMapsText = t('components.map.openInMaps', 'Open in Google Maps');
    const mapFallbackText = t(
        'components.map.fallbackNotice',
        'Interactive map unavailable. Open the address in Google Maps for directions.'
    );
    
    // Only load Google Maps if we have a valid API key (not a placeholder)
    const hasValidApiKey = isValidGoogleMapsApiKey(apiKey);
    
    const finalHeight = height || (mapVariant === 'modern' ? 500 : 400);

    const hasCoordinates = typeof lat === 'number' && typeof lng === 'number' && (lat !== 0 || lng !== 0);
    const center = useMemo(() => ({
        lat: hasCoordinates ? lat! : 40.7128,
        lng: hasCoordinates ? lng! : -74.0060,
    }), [hasCoordinates, lat, lng]);

    const getPadding = (size: string) => {
        switch (size) {
            case 'sm': return 'py-8 px-4';
            case 'md': return 'py-16 px-8';
            case 'lg': return 'py-24 px-12';
            default: return 'py-16 px-8';
        }
    };

    const getFontSize = (size: string, type: 'title' | 'desc') => {
        const baseTitle = 'font-bold mb-4 font-header';
        const baseDesc = 'mb-8 max-w-2xl mx-auto';
        
        switch (size) {
            case 'sm': return type === 'title' ? `${baseTitle} text-2xl` : `${baseDesc} text-sm`;
            case 'md': return type === 'title' ? `${baseTitle} text-3xl` : `${baseDesc} text-base`;
            case 'lg': return type === 'title' ? `${baseTitle} text-4xl` : `${baseDesc} text-lg`;
            case 'xl': return type === 'title' ? `${baseTitle} text-5xl` : `${baseDesc} text-xl`;
            default: return type === 'title' ? `${baseTitle} text-3xl` : `${baseDesc} text-base`;
        }
    };

    const getRadius = (size?: BorderRadiusSize) => {
        switch (size) {
            case 'md': return 'rounded-lg';
            case 'xl': return 'rounded-2xl';
            case 'full': return 'rounded-3xl';
            case 'none': return 'rounded-none';
            default: return 'rounded-none';
        }
    };

    const getMapStyle = () => {
        switch (mapVariant) {
            case 'minimal': return silverMapStyle;
            case 'dark-tech': return darkMapStyle;
            case 'retro': return retroMapStyle;
            case 'night': return nightMapStyle;
            default: return undefined;
        }
    };

    const options = useMemo(() => ({
        disableDefaultUI: false,
        styles: getMapStyle(),
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
    }), [mapVariant]);

    const mapQuery = addressText.trim() || (hasCoordinates ? `${lat},${lng}` : titleText || locationLabel);
    const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

    // Reusable contact info items for info cards
    const renderContactInfo = (textColor: string, accentColor: string, small = false) => {
        const iconSize = small ? 'w-4 h-4' : 'w-5 h-5';
        const textSize = small ? 'text-xs' : 'text-sm';
        return (
            <div className={`space-y-${small ? '2' : '3'}`}>
                {/* Address */}
                {addressText && (
                    <div className="flex items-start gap-3">
                        <MapPin className={`${iconSize} mt-0.5 shrink-0`} style={{ color: accentColor }} />
                        <span className={textSize} style={{ color: textColor }}>{addressText}</span>
                    </div>
                )}
                {/* Phone */}
                {phoneText && (
                    <a href={`tel:${phoneText}`} className="flex items-center gap-3 group">
                        <Phone className={`${iconSize} shrink-0`} style={{ color: accentColor }} />
                        <span className={`${textSize} group-hover:underline`} style={{ color: textColor }}>{phoneText}</span>
                    </a>
                )}
                {/* Email */}
                {emailText && (
                    <a href={`mailto:${emailText}`} className="flex items-center gap-3 group">
                        <Mail className={`${iconSize} shrink-0`} style={{ color: accentColor }} />
                        <span className={`${textSize} group-hover:underline`} style={{ color: textColor }}>{emailText}</span>
                    </a>
                )}
                {/* Business Hours */}
                {businessHoursText && (
                    <div className="flex items-center gap-3">
                        <Clock className={`${iconSize} shrink-0`} style={{ color: accentColor }} />
                        <span className={textSize} style={{ color: textColor }}>{businessHoursText}</span>
                    </div>
                )}
            </div>
        );
    };

    const renderStaticMapFallback = () => {
        const accentColor = colors?.accent || primaryColor;
        const fallbackBackground = colors?.cardBackground || colors?.background || '#f8fafc';
        const fallbackText = colors?.text || '#334155';
        const fallbackHeading = mapColors.heading || fallbackText;

        return (
            <div
                className="relative flex h-full min-h-[320px] w-full items-center justify-center overflow-hidden p-4 sm:p-6"
                style={{ backgroundColor: fallbackBackground }}
            >
                <div
                    className="absolute inset-0 opacity-45"
                    style={{
                        backgroundImage: `
                            linear-gradient(90deg, ${accentColor}22 1px, transparent 1px),
                            linear-gradient(0deg, ${accentColor}18 1px, transparent 1px)
                        `,
                        backgroundSize: '34px 34px',
                    }}
                />
                <div
                    className="absolute left-[12%] top-[22%] h-px w-[76%] rotate-[-14deg]"
                    style={{ backgroundColor: `${accentColor}33` }}
                />
                <div
                    className="absolute bottom-[24%] left-[8%] h-px w-[86%] rotate-[10deg]"
                    style={{ backgroundColor: `${accentColor}29` }}
                />
                <div
                    className="relative flex w-full max-w-sm flex-col items-center rounded-2xl border p-5 text-center shadow-xl backdrop-blur"
                    style={{
                        backgroundColor: `${fallbackBackground}F2`,
                        borderColor: `${accentColor}33`,
                        color: fallbackText,
                    }}
                >
                    <div
                        className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                        style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
                    >
                        <MapPin className="h-7 w-7" />
                    </div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
                        {locationLabel}
                    </p>
                    <h3 className="mb-2 text-lg font-bold leading-tight font-header" style={{ color: fallbackHeading }}>
                        {titleText || locationLabel}
                    </h3>
                    {addressText && (
                        <p className="mb-4 text-sm leading-relaxed opacity-80">
                            {addressText}
                        </p>
                    )}
                    <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all hover:scale-[1.02] sm:w-auto"
                        style={{ backgroundColor: mapColors.buttonBackground, color: mapColors.buttonText }}
                        aria-label={`${openInMapsText}: ${mapQuery}`}
                    >
                        <Navigation className="h-4 w-4" />
                        {openInMapsText}
                    </a>
                    <p className="mt-3 text-xs leading-relaxed opacity-60">
                        {mapFallbackText}
                    </p>
                </div>
            </div>
        );
    };

    // Shared map renderer. The Google script is never mounted without a valid key.
    const renderMapEmbed = () => {
        if (!hasValidApiKey) return renderStaticMapFallback();
        return (
            <GoogleMapEmbed
                apiKey={apiKey!.trim()}
                center={center}
                zoom={zoom}
                options={options}
                loadingText={loadingText}
                renderFallback={renderStaticMapFallback}
            />
        );
    };

    const renderContent = () => {
        const accentColor = colors?.accent || primaryColor;

        // ═══════════════════════════════════════════
        // ESTILO 1: MODERN — Split layout (info + map)
        // ═══════════════════════════════════════════
        if (mapVariant === 'modern') {
            return (
                <div 
                    className="flex flex-col @lg:grid @lg:grid-cols-5 gap-0" 
                    style={{ '--map-height': `${finalHeight}px` } as React.CSSProperties}
                >
                    {/* Info Card - Left Side (2/5) */}
                    <div
                        className="@lg:col-span-2 p-6 @lg:p-10 flex flex-col justify-center order-2 @lg:order-1"
                        style={{ backgroundColor: mapColors.cardBackground }}
                    >
                        <div className="mb-6 @lg:mb-8">
                            <div
                                className="w-12 h-12 @lg:w-14 @lg:h-14 rounded-2xl flex items-center justify-center mb-4 @lg:mb-5"
                                style={{ backgroundColor: accentColor + '15' }}
                            >
                                <MapPin className="w-6 h-6 @lg:w-7 @lg:h-7" style={{ color: accentColor }} />
                            </div>
                            <h3
                                className="text-2xl @lg:text-3xl font-bold mb-3 font-header"
                                style={{ color: mapColors.heading }}
                            >
                                {titleText}
                            </h3>
                            <p className="text-sm leading-relaxed opacity-80" style={{ color: colors?.text }}>
                                {descriptionText}
                            </p>
                        </div>

                        {/* Contact details */}
                        <div className="mb-6 @lg:mb-8">
                            {renderContactInfo(colors?.text || '#94a3b8', accentColor)}
                        </div>

                        {/* CTA Button */}
                        <a
                            href={directionsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg w-full @sm:w-auto"
                            style={{ backgroundColor: mapColors.buttonBackground, color: mapColors.buttonText }}
                        >
                            <Navigation className="w-4 h-4" />
                            {directionsText}
                        </a>
                    </div>

                    {/* Map - Right Side (3/5) */}
                    <div className="@lg:col-span-3 relative h-[var(--map-height)] @lg:h-auto min-h-[var(--map-height)] order-1 @lg:order-2">
                        <div className="absolute inset-0">
                            {renderMapEmbed()}
                        </div>
                    </div>
                </div>
            );
        }

        // ═══════════════════════════════════════════
        // ESTILO 2: MINIMAL — Clean map with floating badge
        // ═══════════════════════════════════════════
        if (mapVariant === 'minimal') {
            return (
                <div 
                    className="flex flex-col @md:block relative w-full"
                    style={{ '--map-height': `${finalHeight}px` } as React.CSSProperties}
                >
                    <div className="w-full h-[var(--map-height)] shrink-0">
                        {renderMapEmbed()}
                    </div>
                    {/* Floating Badge - bottom left on desktop, stacked below on mobile */}
                    <div 
                        className="@md:absolute @md:bottom-6 @md:left-6 backdrop-blur-md p-5 @md:rounded-2xl @md:max-w-sm border-t @md:border border-gray-100/20 shadow-xl z-10"
                        style={{ backgroundColor: mapColors.cardBackground ? `${mapColors.cardBackground}F2` : 'rgba(255, 255, 255, 0.95)' }}
                    >
                        <div className="flex items-start gap-3 @md:gap-4">
                            <div
                                className="w-10 h-10 @md:w-12 @md:h-12 rounded-xl flex items-center justify-center shrink-0"
                                style={{ backgroundColor: accentColor + '15' }}
                            >
                                <MapPin className="w-5 h-5" style={{ color: accentColor }} />
                            </div>
                            <div className="min-w-0 w-full">
                                <p className="text-sm font-bold mb-1 truncate" style={{ color: mapColors.heading }}>{titleText}</p>
                                {addressText && (
                                    <p className="text-xs mb-2 @md:mb-3" style={{ color: colors?.text }}>{addressText}</p>
                                )}
                                {phoneText && (
                                    <p className="text-xs flex items-center gap-1.5 mb-1" style={{ color: colors?.text }}>
                                        <Phone className="w-3 h-3" style={{ color: accentColor }} />
                                        {phoneText}
                                    </p>
                                )}
                                <a
                                    href={directionsUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold mt-2 @md:mt-1 transition-colors hover:opacity-80"
                                    style={{ color: accentColor }}
                                >
                                    <Navigation className="w-3.5 h-3.5" />
                                    {directionsText} →
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // ═══════════════════════════════════════════
        // ESTILO 3: DARK-TECH — Tech overlay card
        // ═══════════════════════════════════════════
        if (mapVariant === 'dark-tech') {
            return (
                <div 
                    className="flex flex-col @md:block relative w-full"
                    style={{ '--map-height': `${finalHeight}px` } as React.CSSProperties}
                >
                    <div className="w-full h-[var(--map-height)] shrink-0">
                        {renderMapEmbed()}
                    </div>
                    {/* Tech Overlay Card - top left on desktop, stacked below on mobile */}
                    <div 
                        className="@md:absolute @md:top-6 @md:left-6 backdrop-blur-xl p-6 @md:rounded-2xl @md:max-w-sm border-t @md:border border-white/10 shadow-2xl z-10"
                        style={{ background: mapColors.cardBackground ? `linear-gradient(to bottom right, ${mapColors.cardBackground}f2, ${mapColors.cardBackground}e6)` : 'linear-gradient(to bottom right, rgba(17, 24, 39, 0.95), rgba(3, 7, 18, 0.95))' }}
                    >
                        <div className="flex items-center gap-3 mb-4 @md:mb-5">
                            <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
                            <span className="text-xs font-mono uppercase tracking-widest" style={{ color: colors?.text }}>
                                {locationLabel}
                            </span>
                        </div>
                        <h3 className="text-lg font-bold mb-2 font-header" style={{ color: mapColors.heading }}>{titleText}</h3>
                        <p className="text-sm mb-4 @md:mb-5 leading-relaxed" style={{ color: colors?.text }}>{descriptionText}</p>

                        {/* Contact info */}
                        <div className="mb-5 @sm:mb-0">
                            {renderContactInfo(colors?.text || '#cbd5e1', accentColor, true)}
                        </div>

                        {/* Navigate button */}
                        <a
                            href={directionsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 @sm:mt-5 flex @sm:inline-flex items-center justify-center gap-2 text-xs font-semibold px-5 py-3 @md:py-2.5 rounded-xl transition-all duration-300 hover:translate-x-1 hover:shadow-lg w-full @sm:w-auto"
                            style={{ backgroundColor: mapColors.buttonBackground, color: mapColors.buttonText }}
                        >
                            <Navigation className="w-4 h-4" />
                            {navigateText}
                        </a>
                    </div>
                </div>
            );
        }

        // ═══════════════════════════════════════════
        // ESTILO 4: NIGHT (default) — Full map with bottom gradient bar
        // ═══════════════════════════════════════════
        return (
            <div 
                className="flex flex-col @md:block relative w-full"
                style={{ '--map-height': `${finalHeight}px` } as React.CSSProperties}
            >
                <div className="w-full h-[var(--map-height)] shrink-0">
                    {renderMapEmbed()}
                </div>
                {/* Bottom Info Bar - bottom gradient on desktop, solid stacked below on mobile */}
                <div 
                    className="@md:absolute @md:bottom-0 @md:left-0 @md:right-0 pt-6 pb-6 px-6 @md:pt-16 @md:pointer-events-none"
                    style={{ backgroundColor: mapColors.cardBackground || '#111827' }}
                >
                    {/* Desktop gradient overlay */}
                    <div 
                        className="hidden @md:block absolute inset-0 pointer-events-none" 
                        style={{ background: mapColors.cardBackground ? `linear-gradient(to top, ${mapColors.cardBackground}f2, ${mapColors.cardBackground}cc, transparent)` : 'linear-gradient(to top, rgba(17, 24, 39, 0.95), rgba(17, 24, 39, 0.8), transparent)' }}
                    />
                    <div className="max-w-7xl mx-auto flex flex-col @md:flex-row @md:items-end @md:justify-between gap-4 @md:pointer-events-auto relative z-10">
                        <div className="flex-1">
                            <h3 className="text-xl font-bold mb-1 font-header" style={{ color: mapColors.heading }}>{titleText}</h3>
                            {addressText && (
                                <p className="text-sm mb-2 @md:mb-1" style={{ color: colors?.text }}>{addressText}</p>
                            )}
                            {phoneText && (
                                <p className="text-sm flex items-center gap-2" style={{ color: colors?.text }}>
                                    <Phone className="w-3.5 h-3.5" style={{ color: accentColor }} />
                                    {phoneText}
                                </p>
                            )}
                        </div>
                        <a
                            href={directionsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105 hover:shadow-lg shrink-0 w-full @md:w-auto"
                            style={{ backgroundColor: mapColors.buttonBackground, color: mapColors.buttonText }}
                        >
                            <Navigation className="w-5 h-5" />
                            {directionsText}
                        </a>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <section 
            className={`w-full ${getPadding(paddingY)} relative overflow-hidden @container`}
            style={{ backgroundColor: colors?.background }}
        >
            <CornerGradient config={cornerGradient} />
            <div className={`max-w-7xl mx-auto ${paddingX === 'lg' ? 'px-0' : 'px-4'} relative z-10`}>
                {/* Header solo para estilos que no tienen título incorporado */}
                {!['modern', 'dark-tech'].includes(mapVariant) && (
                    <div className="text-center mb-12">
                        <h2 
                            className={getFontSize(titleFontSize || 'md', 'title')}
                            style={{ color: mapColors.heading }}
                        >
                            {titleText}
                        </h2>
                        <p 
                            className={getFontSize(descriptionFontSize || 'md', 'desc')}
                            style={{ color: colors?.text }}
                        >
                            {descriptionText}
                        </p>
                    </div>
                )}

                {/* Map Container */}
                <div className={`${getRadius(borderRadius)} overflow-hidden`}>
                   {renderContent()}
                </div>
            </div>
        </section>
    );
};

export default BusinessMap;
