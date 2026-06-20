/**
 * TrustBadges Component
 * Displays trust indicators like shipping, security, returns, etc.
 * 
 * Uses unified storefront colors system
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Truck, Shield, CreditCard, RefreshCw, Clock, Award,
    Lock, Headphones, Package, CheckCircle, Star, Heart
} from 'lucide-react';
import { TrustBadgesData, TrustBadgeIcon, TrustBadgeItem } from '../../../types/components';
import { useSafeProject } from '../../../contexts/project';
import { StorefrontGlobalColors, useUnifiedStorefrontColors } from '../hooks/useUnifiedStorefrontColors';
import { resolveI18nField } from '../../../utils/i18nContent';
import {
    getStorefrontCardGapClass,
    getStorefrontColorWithOpacity,
    getStorefrontColumnsClass,
    getStorefrontContentPositionClass,
    getStorefrontPaddingXClass,
    getStorefrontPaddingYClass,
    getStorefrontRadiusClass,
    getStorefrontSectionBackgroundStyle,
    getStorefrontTextAlignmentClass,
} from './sectionVisualStyles';

interface TrustBadgesProps {
    data: TrustBadgesData;
    storeId?: string;
    globalColors?: StorefrontGlobalColors;
}

const iconMap: Record<TrustBadgeIcon, React.FC<{ size?: number; className?: string }>> = {
    'truck': Truck,
    'shield': Shield,
    'credit-card': CreditCard,
    'refresh-cw': RefreshCw,
    'clock': Clock,
    'award': Award,
    'lock': Lock,
    'headphones': Headphones,
    'package': Package,
    'check-circle': CheckCircle,
    'star': Star,
    'heart': Heart,
};

const TrustBadges: React.FC<TrustBadgesProps> = ({ data, storeId, globalColors }) => {
    const { i18n } = useTranslation();
    const projectContext = useSafeProject();
    const effectiveStoreId = storeId || projectContext?.activeProjectId || '';
    const text = React.useCallback((value: any) => resolveI18nField(value, i18n.language), [i18n.language]);
    const title = text(data.title as any);
    
    // Unified colors system
    const colors = useUnifiedStorefrontColors(effectiveStoreId, data.colors, globalColors);
    // Default badges if none provided
    const badges: TrustBadgeItem[] = data.badges?.length > 0 ? data.badges : [
        { icon: 'truck', title: 'Envío Gratis', description: 'En pedidos mayores a $50' },
        { icon: 'shield', title: 'Pago Seguro', description: 'Transacciones 100% seguras' },
        { icon: 'refresh-cw', title: 'Devoluciones', description: '30 días para devoluciones' },
        { icon: 'headphones', title: 'Soporte 24/7', description: 'Atención al cliente' },
    ];

    // Style helpers
    const getPaddingY = () => getStorefrontPaddingYClass(data.paddingY, 'md');
    const getPaddingX = () => getStorefrontPaddingXClass(data.paddingX, 'md');
    const getCardGap = () => getStorefrontCardGapClass(data.cardGap, 'md');
    const getGridCols = () => getStorefrontColumnsClass(data.columns, 4);

    const getIconSize = () => {
        const map = { sm: 20, md: 28, lg: 36 };
        return map[data.iconSize] || 28;
    };

    const getBorderRadius = () => getStorefrontRadiusClass(data.borderRadius, 'xl');
    const getTextAlignment = () => getStorefrontTextAlignmentClass(data.textAlignment, 'center');
    const getContentPosition = () => getStorefrontContentPositionClass(data.contentPosition, 'center');
    const getTitleSize = () => {
        const map = { sm: 'text-xl', md: 'text-2xl', lg: 'text-3xl', xl: 'text-4xl' };
        return map[data.titleFontSize || 'md'] || 'text-2xl';
    };
    const getCardSurfaceStyle = (elevated = false): React.CSSProperties => ({
        backgroundColor: getStorefrontColorWithOpacity(colors?.cardBackground, data.glassEffect ? 0.76 : 1, colors?.cardBackground || '#ffffff'),
        border: `1px solid ${getStorefrontColorWithOpacity(colors?.borderColor || colors?.border, 0.65, 'rgba(15,23,42,0.12)')}`,
        boxShadow: elevated ? '0 20px 55px rgba(15,23,42,0.14)' : '0 12px 34px rgba(15,23,42,0.08)',
    });

    // Badge Component
    const Badge = ({ badge, centered = false }: { badge: TrustBadgeItem; centered?: boolean }) => {
        const IconComponent = iconMap[badge.icon] || CheckCircle;
        const badgeTitle = text(badge.title as any);
        const badgeDescription = text(badge.description as any);

        return (
            <div
                className={`group flex h-full items-center gap-4 ${getBorderRadius()} p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    centered ? 'flex-col text-center' : ''
                }`}
                style={getCardSurfaceStyle()}
            >
                <div
                    className={`flex-shrink-0 p-3 ${getBorderRadius()} ring-1 ring-white/30 transition-transform duration-300 group-hover:scale-105`}
                    style={{ backgroundColor: getStorefrontColorWithOpacity(colors?.accent, 0.14, 'rgba(79,70,229,0.14)') }}
                >
                    <IconComponent size={getIconSize()} style={{ color: colors?.iconColor || colors?.accent }} />
                </div>
                {data.showLabels && (
                    <div className="min-w-0">
                        <h4
                            className="font-semibold text-sm"
                            style={{ color: colors?.heading || colors?.text }}
                        >
                            {badgeTitle}
                        </h4>
                        {badgeDescription && (
                            <p className="text-xs" style={{ color: colors?.text }}>
                                {badgeDescription}
                            </p>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Horizontal variant
    const renderHorizontal = () => (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 ${getCardGap()}`}>
            {badges.map((badge, index) => (
                <Badge key={index} badge={badge} />
            ))}
        </div>
    );

    // Grid variant
    const renderGrid = () => (
        <div className={`grid grid-cols-1 ${getGridCols()} ${getCardGap()}`}>
            {badges.map((badge, index) => {
                const IconComponent = iconMap[badge.icon] || CheckCircle;
                const badgeTitle = text(badge.title as any);
                const badgeDescription = text(badge.description as any);
                return (
                    <div
                        key={index}
                        className={`group text-center p-6 ${getBorderRadius()} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
                        style={getCardSurfaceStyle()}
                    >
                        <div
                            className={`inline-flex p-4 ${getBorderRadius()} mb-3 ring-1 ring-white/30 transition-transform duration-300 group-hover:scale-105`}
                            style={{ backgroundColor: getStorefrontColorWithOpacity(colors?.accent, 0.14, 'rgba(79,70,229,0.14)') }}
                        >
                            <IconComponent size={getIconSize()} style={{ color: colors?.iconColor || colors?.accent }} />
                        </div>
                        {data.showLabels && (
                            <>
                                <h4
                                    className="font-semibold mb-1"
                                    style={{ color: colors?.heading || colors?.text }}
                                >
                                    {badgeTitle}
                                </h4>
                                {badgeDescription && (
                                    <p className="text-sm" style={{ color: colors?.text }}>
                                        {badgeDescription}
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );

    // Minimal variant
    const renderMinimal = () => (
        <div className={`flex flex-wrap ${getContentPosition()} items-center ${getCardGap()}`}>
            {badges.map((badge, index) => {
                const IconComponent = iconMap[badge.icon] || CheckCircle;
                const badgeTitle = text(badge.title as any);
                return (
                    <div
                        key={index}
                        className={`flex items-center gap-2 ${getBorderRadius()} px-4 py-2`}
                        style={{
                            backgroundColor: getStorefrontColorWithOpacity(colors?.cardBackground, 0.72, 'rgba(255,255,255,0.72)'),
                            border: `1px solid ${getStorefrontColorWithOpacity(colors?.borderColor || colors?.border, 0.45, 'rgba(15,23,42,0.1)')}`,
                        }}
                    >
                        <IconComponent size={getIconSize()} style={{ color: colors?.iconColor || colors?.accent }} />
                        {data.showLabels && (
                            <span className="font-medium text-sm" style={{ color: colors?.text }}>
                                {badgeTitle}
                            </span>
                        )}
                    </div>
                );
            })}
        </div>
    );

    // Detailed variant
    const renderDetailed = () => (
        <div className={`grid grid-cols-1 ${getGridCols()} ${getCardGap()}`}>
            {badges.map((badge, index) => {
                const IconComponent = iconMap[badge.icon] || CheckCircle;
                const badgeTitle = text(badge.title as any);
                const badgeDescription = text(badge.description as any);
                return (
                    <div
                        key={index}
                        className={`p-6 ${getBorderRadius()} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
                        style={getCardSurfaceStyle(true)}
                    >
                        <div
                            className={`inline-flex p-3 ${getBorderRadius()} mb-4`}
                            style={{ backgroundColor: getStorefrontColorWithOpacity(colors?.accent, 0.14, 'rgba(79,70,229,0.14)') }}
                        >
                            <IconComponent size={getIconSize()} style={{ color: colors?.iconColor || colors?.accent }} />
                        </div>
                        <h4
                            className="font-bold text-lg mb-2"
                            style={{ color: colors?.heading || colors?.text }}
                        >
                            {badgeTitle}
                        </h4>
                        {badgeDescription && (
                            <p className="text-sm leading-relaxed" style={{ color: colors?.text }}>
                                {badgeDescription}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );

    return (
        <section
            className={`${getPaddingY()} ${getPaddingX()}`}
            style={{
                ...getStorefrontSectionBackgroundStyle(data, colors?.background),
                borderTop: colors?.border ? `1px solid ${colors?.border}30` : 'none',
                borderBottom: colors?.border ? `1px solid ${colors?.border}30` : 'none',
            }}
        >
            <div className="max-w-7xl mx-auto">
                {/* Optional Title */}
                {title && (
                    <div className={`mb-8 flex flex-col ${getTextAlignment()}`}>
                        <h3
                            className={`${getTitleSize()} font-bold`}
                            style={{ color: colors?.heading }}
                        >
                            {title}
                        </h3>
                    </div>
                )}

                {/* Variants */}
                {data.variant === 'horizontal' && renderHorizontal()}
                {data.variant === 'grid' && renderGrid()}
                {data.variant === 'minimal' && renderMinimal()}
                {data.variant === 'detailed' && renderDetailed()}
            </div>
        </section>
    );
};

export default TrustBadges;
