import React, { useMemo, useCallback } from 'react';
import { GoogleMap, Marker, useJsApiLoader, Libraries } from '@react-google-maps/api';
import { MapData, BorderRadiusSize, CornerGradientConfig } from '../types';
import { MapPin, Navigation, Phone, Mail, Clock } from 'lucide-react';
import { useDesignTokens } from '../hooks/useDesignTokens';
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
    height = 400,
    borderRadius = 'none',
    cornerGradient,
}) => {
    // Get design tokens with primary color
    const { getColor } = useDesignTokens();
    const primaryColor = getColor('primary.main', '#4f46e5');
    
    // Use component colors - fallback to primary color only if not set
    const mapColors = {
        ...colors,
        heading: colors?.heading || primaryColor,
        cardBackground: colors?.cardBackground || primaryColor,
    };
    
    // Only load Google Maps if we have a valid API key
    const hasValidApiKey = apiKey && apiKey.trim().length > 0;
    
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
        const baseTitle = 'font-bold mb-4';
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

    const renderContent = () => {
        // Show placeholder if no API key is provided
        if (!hasValidApiKey) {
            return (
                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center" style={{ minHeight: `${height}px` }}>
                    <div className="text-center p-8">
                        <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">{title || 'Location'}</h3>
                        <p className="text-sm text-gray-500 mb-4">{address}</p>
                        <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all hover:scale-105"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <Navigation className="w-4 h-4" />
                            View on Google Maps
                        </a>
                    </div>
                </div>
            );
        }
        
        if (!isLoaded) {
            return (
                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading Map...</p>
                    </div>
                </div>
            );
        }

        // ESTILO 1: MODERN - Tarjeta lateral con información completa
        if (mapVariant === 'modern') {
            return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0" style={{ height: `${height}px` }}>
                    {/* Info Card - Left Side */}
                    <div className="lg:col-span-1 p-8 flex flex-col justify-center" style={{ backgroundColor: mapColors.cardBackground }}>
                        <div className="mb-6">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: colors?.accent + '20' }}>
                                <MapPin className="w-6 h-6" style={{ color: colors?.accent }} />
                            </div>
                            <h3 className="text-2xl font-bold mb-2" style={{ color: mapColors.heading }}>{title}</h3>
                            <p className="text-sm mb-6" style={{ color: colors?.text }}>{description}</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 mt-0.5 shrink-0" style={{ color: colors?.accent }} />
                                <span className="text-sm" style={{ color: colors?.text }}>{address}</span>
                            </div>
                            <a 
                                href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center gap-3 group"
                            >
                                <Navigation className="w-5 h-5 shrink-0" style={{ color: colors?.accent }} />
                                <span className="text-sm font-medium group-hover:underline" style={{ color: colors?.accent }}>Get Directions →</span>
                            </a>
                        </div>
                    </div>

                    {/* Map - Right Side */}
                    <div className="lg:col-span-2 relative">
                        <GoogleMap
                            mapContainerStyle={containerStyle}
                            center={center}
                            zoom={zoom}
                            options={options}
                        >
                            <Marker position={center} />
                        </GoogleMap>
                    </div>
                </div>
            );
        }

        // ESTILO 2: MINIMAL - Mapa limpio con badge flotante
        if (mapVariant === 'minimal') {
            return (
                <div className="relative" style={{ height: `${height}px` }}>
                    <GoogleMap
                        mapContainerStyle={containerStyle}
                        center={center}
                        zoom={zoom}
                        options={options}
                    >
                        <Marker position={center} />
                    </GoogleMap>
                    
                    {/* Floating Badge */}
                    <div className="absolute bottom-6 left-6 bg-white rounded-2xl p-4 max-w-xs backdrop-blur-sm border border-gray-200">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: colors?.accent + '20' }}>
                                <MapPin className="w-5 h-5" style={{ color: colors?.accent }} />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-900 mb-1">{title}</p>
                                <p className="text-xs text-gray-600">{address}</p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // ESTILO 3: DARK-TECH - Estilo tecnológico con overlay
        if (mapVariant === 'dark-tech') {
            return (
                <div className="relative" style={{ height: `${height}px` }}>
                    <GoogleMap
                        mapContainerStyle={containerStyle}
                        center={center}
                        zoom={zoom}
                        options={options}
                    >
                        <Marker position={center} />
                    </GoogleMap>
                    
                    {/* Tech Overlay Card */}
                    <div className="absolute top-6 right-6 bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-md rounded-xl p-6 max-w-sm border border-gray-700">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: colors?.accent }}></div>
                            <span className="text-xs font-mono uppercase tracking-wider text-gray-400">Location</span>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                        <p className="text-sm text-gray-400 mb-4">{description}</p>
                        
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                                <span className="text-xs text-gray-300">{address}</span>
                            </div>
                            <a 
                                href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-lg transition-all hover:translate-x-1"
                                style={{ backgroundColor: colors?.accent, color: '#ffffff' }}
                            >
                                <Navigation className="w-4 h-4" />
                                Navigate
                            </a>
                        </div>
                    </div>
                </div>
            );
        }

        // ESTILO 4: RETRO/NIGHT - Mapa completo con barra inferior
        return (
            <div className="relative" style={{ height: `${height}px` }}>
                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={center}
                    zoom={zoom}
                    options={options}
                >
                    <Marker position={center} />
                </GoogleMap>
                
                {/* Bottom Info Bar */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-md p-6 border-t border-gray-700">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
                            <p className="text-sm text-gray-300">{address}</p>
                        </div>
                        <a 
                            href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all hover:scale-105 shrink-0"
                            style={{ backgroundColor: colors?.accent, color: '#ffffff' }}
                        >
                            <Navigation className="w-5 h-5" />
                            Get Directions
                        </a>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <section 
            className={`w-full ${getPadding(paddingY)} relative overflow-hidden`}
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
