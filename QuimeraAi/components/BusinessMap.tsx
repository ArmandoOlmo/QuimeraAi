import React, { useMemo, useCallback } from 'react';
import { GoogleMap, Marker, useJsApiLoader, Libraries } from '@react-google-maps/api';
import { MapData, BorderRadiusSize, CornerGradientConfig } from '../types';
import { MapPin, Navigation, Phone, Mail, Clock } from 'lucide-react';
import { useDesignTokens } from '../hooks/useDesignTokens';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
    // Get design tokens with primary color
    const { getColor } = useDesignTokens();
    const primaryColor = getColor('primary.main', '#4f46e5');
    
    // Use component colors - fallback to primary color only if not set
    const mapColors = {
        ...colors,
        heading: colors?.heading || primaryColor,
        cardBackground: colors?.cardBackground || primaryColor,
        buttonBackground: colors?.buttonBackground || colors?.accent || primaryColor,
        buttonText: colors?.buttonText || '#ffffff',
    };

    // Translated strings
    const directionsText = buttonText || t('components.map.getDirections', 'Get Directions');
    const loadingText = t('components.map.loading', 'Loading Map...');
    const locationLabel = t('components.map.locationLabel', 'Location');
    const navigateText = t('components.map.navigate', 'Navigate');
    const hoursLabel = t('components.map.hours', 'Hours');
    
    // Only load Google Maps if we have a valid API key (not a placeholder)
    const hasValidApiKey = apiKey && apiKey.trim().length > 20 && !apiKey.includes('your_') && !apiKey.includes('placeholder') && !apiKey.includes('api_key');
    
    const finalHeight = height || (mapVariant === 'modern' ? 500 : 400);

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: hasValidApiKey ? apiKey : '',
        libraries: libraries,
    } as any);
    
    // Log load error for debugging
    if (loadError) {
        console.error('Google Maps load error:', loadError);
    }

    const center = useMemo(() => ({ lat: lat || 40.7128, lng: lng || -74.0060 }), [lat, lng]);

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

    const mapLat = lat || 40.7128;
    const mapLng = lng || -74.0060;
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapLat},${mapLng}`;

    // Reusable OSM iframe for fallback rendering
    const renderOsmIframe = (iframeHeight?: string) => (
        <iframe
            title={title || 'Location Map'}
            width="100%"
            height={iframeHeight || '100%'}
            style={{ border: 0 }}
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapLng - 0.02},${mapLat - 0.015},${mapLng + 0.02},${mapLat + 0.015}&layer=mapnik&marker=${mapLat},${mapLng}`}
        />
    );

    // Reusable Google Map render
    const renderGoogleMap = () => (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={zoom}
            options={options}
        >
            <Marker position={center} />
        </GoogleMap>
    );

    // Reusable contact info items for info cards
    const renderContactInfo = (textColor: string, accentColor: string, small = false) => {
        const iconSize = small ? 'w-4 h-4' : 'w-5 h-5';
        const textSize = small ? 'text-xs' : 'text-sm';
        return (
            <div className={`space-y-${small ? '2' : '3'}`}>
                {/* Address */}
                <div className="flex items-start gap-3">
                    <MapPin className={`${iconSize} mt-0.5 shrink-0`} style={{ color: accentColor }} />
                    <span className={textSize} style={{ color: textColor }}>{address}</span>
                </div>
                {/* Phone */}
                {phone && (
                    <a href={`tel:${phone}`} className="flex items-center gap-3 group">
                        <Phone className={`${iconSize} shrink-0`} style={{ color: accentColor }} />
                        <span className={`${textSize} group-hover:underline`} style={{ color: textColor }}>{phone}</span>
                    </a>
                )}
                {/* Email */}
                {email && (
                    <a href={`mailto:${email}`} className="flex items-center gap-3 group">
                        <Mail className={`${iconSize} shrink-0`} style={{ color: accentColor }} />
                        <span className={`${textSize} group-hover:underline`} style={{ color: textColor }}>{email}</span>
                    </a>
                )}
                {/* Business Hours */}
                {businessHours && (
                    <div className="flex items-center gap-3">
                        <Clock className={`${iconSize} shrink-0`} style={{ color: accentColor }} />
                        <span className={textSize} style={{ color: textColor }}>{businessHours}</span>
                    </div>
                )}
            </div>
        );
    };

    // Shared map renderer (Google or OSM fallback)
    const renderMapEmbed = () => {
        if (!hasValidApiKey || loadError) return renderOsmIframe();
        if (!isLoaded) {
            return (
                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-500">{loadingText}</p>
                    </div>
                </div>
            );
        }
        return renderGoogleMap();
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
                                {title}
                            </h3>
                            <p className="text-sm leading-relaxed opacity-80" style={{ color: colors?.text }}>
                                {description}
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
                                <p className="text-sm font-bold mb-1 truncate" style={{ color: mapColors.heading }}>{title}</p>
                                <p className="text-xs mb-2 @md:mb-3" style={{ color: colors?.text }}>{address}</p>
                                {phone && (
                                    <p className="text-xs flex items-center gap-1.5 mb-1" style={{ color: colors?.text }}>
                                        <Phone className="w-3 h-3" style={{ color: accentColor }} />
                                        {phone}
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
                        <h3 className="text-lg font-bold mb-2 font-header" style={{ color: mapColors.heading }}>{title}</h3>
                        <p className="text-sm mb-4 @md:mb-5 leading-relaxed" style={{ color: colors?.text }}>{description}</p>

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
                            <h3 className="text-xl font-bold mb-1 font-header" style={{ color: mapColors.heading }}>{title}</h3>
                            <p className="text-sm mb-2 @md:mb-1" style={{ color: colors?.text }}>{address}</p>
                            {phone && (
                                <p className="text-sm flex items-center gap-2" style={{ color: colors?.text }}>
                                    <Phone className="w-3.5 h-3.5" style={{ color: accentColor }} />
                                    {phone}
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
                            {title}
                        </h2>
                        <p 
                            className={getFontSize(descriptionFontSize || 'md', 'desc')}
                            style={{ color: colors?.text }}
                        >
                            {description}
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
