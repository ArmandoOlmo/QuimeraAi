/**
 * TrustBadges Component
 * Displays trust indicators like shipping, security, returns, etc.
 * 
 * Uses unified storefront colors system
 */

import React from 'react';
import {
    Truck, Shield, CreditCard, RefreshCw, Clock, Award,
    Lock, Headphones, Package, CheckCircle, Star, Heart
} from 'lucide-react';
import { TrustBadgesData, TrustBadgeIcon, TrustBadgeItem } from '../../../types/components';
import { useSafeEditor } from '../../../contexts/EditorContext';
import { useUnifiedStorefrontColors } from '../hooks/useUnifiedStorefrontColors';

interface TrustBadgesProps {
    data: TrustBadgesData;
    storeId?: string;
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

const TrustBadges: React.FC<TrustBadgesProps> = ({ data, storeId }) => {
    const editorContext = useSafeEditor();
    const effectiveStoreId = storeId || editorContext?.activeProjectId || '';
    
    // Unified colors system
    const colors = useUnifiedStorefrontColors(effectiveStoreId, data.colors);
    // Default badges if none provided
    const badges: TrustBadgeItem[] = data.badges?.length > 0 ? data.badges : [
        { icon: 'truck', title: 'Envío Gratis', description: 'En pedidos mayores a $50' },
        { icon: 'shield', title: 'Pago Seguro', description: 'Transacciones 100% seguras' },
        { icon: 'refresh-cw', title: 'Devoluciones', description: '30 días para devoluciones' },
        { icon: 'headphones', title: 'Soporte 24/7', description: 'Atención al cliente' },
    ];

    // Style helpers
    const getPaddingY = () => {
        const map = { sm: 'py-4', md: 'py-6', lg: 'py-8' };
        return map[data.paddingY] || 'py-6';
    };

    const getPaddingX = () => {
        const map = { sm: 'px-4', md: 'px-6', lg: 'px-8' };
        return map[data.paddingX] || 'px-6';
    };

    const getIconSize = () => {
        const map = { sm: 20, md: 28, lg: 36 };
        return map[data.iconSize] || 28;
    };

    const getBorderRadius = () => {
        const map = { none: 'rounded-none', md: 'rounded-lg', xl: 'rounded-xl', full: 'rounded-full' };
        return map[data.borderRadius || 'xl'] || 'rounded-xl';
    };

    // Badge Component
    const Badge = ({ badge }: { badge: TrustBadgeItem }) => {
        const IconComponent = iconMap[badge.icon] || CheckCircle;

        return (
            <div className="flex items-center gap-3">
                <div
                    className={`flex-shrink-0 p-3 ${getBorderRadius()}`}
                    style={{ backgroundColor: `${colors?.accent}15` }}
                >
                    <IconComponent size={getIconSize()} style={{ color: colors?.accent }} />
                </div>
                {data.showLabels && (
                    <div>
                        <h4
                            className="font-semibold text-sm"
                            style={{ color: colors?.heading || colors?.text }}
                        >
                            {badge.title}
                        </h4>
                        {badge.description && (
                            <p className="text-xs" style={{ color: colors?.text }}>
                                {badge.description}
                            </p>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Horizontal variant
    const renderHorizontal = () => (
        <div className="flex flex-wrap justify-center lg:justify-between items-center gap-6 lg:gap-4">
            {badges.map((badge, index) => (
                <Badge key={index} badge={badge} />
            ))}
        </div>
    );

    // Grid variant
    const renderGrid = () => (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {badges.map((badge, index) => {
                const IconComponent = iconMap[badge.icon] || CheckCircle;
                return (
                    <div
                        key={index}
                        className={`text-center p-6 ${getBorderRadius()}`}
                        style={{
                            backgroundColor: colors?.border ? `${colors?.border}10` : 'transparent',
                            border: colors?.border ? `1px solid ${colors?.border}30` : 'none',
                        }}
                    >
                        <div
                            className={`inline-flex p-4 ${getBorderRadius()} mb-3`}
                            style={{ backgroundColor: `${colors?.accent}15` }}
                        >
                            <IconComponent size={getIconSize()} style={{ color: colors?.accent }} />
                        </div>
                        {data.showLabels && (
                            <>
                                <h4
                                    className="font-semibold mb-1"
                                    style={{ color: colors?.heading || colors?.text }}
                                >
                                    {badge.title}
                                </h4>
                                {badge.description && (
                                    <p className="text-sm" style={{ color: colors?.text }}>
                                        {badge.description}
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
        <div className="flex flex-wrap justify-center items-center gap-8">
            {badges.map((badge, index) => {
                const IconComponent = iconMap[badge.icon] || CheckCircle;
                return (
                    <div key={index} className="flex items-center gap-2">
                        <IconComponent size={getIconSize()} style={{ color: colors?.accent }} />
                        {data.showLabels && (
                            <span className="font-medium text-sm" style={{ color: colors?.text }}>
                                {badge.title}
                            </span>
                        )}
                    </div>
                );
            })}
        </div>
    );

    // Detailed variant
    const renderDetailed = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {badges.map((badge, index) => {
                const IconComponent = iconMap[badge.icon] || CheckCircle;
                return (
                    <div
                        key={index}
                        className={`p-6 ${getBorderRadius()} transition-all hover:scale-105`}
                        style={{
                            backgroundColor: colors?.border ? `${colors?.border}10` : 'transparent',
                            border: colors?.border ? `1px solid ${colors?.border}30` : 'none',
                        }}
                    >
                        <div
                            className={`inline-flex p-3 ${getBorderRadius()} mb-4`}
                            style={{ backgroundColor: `${colors?.accent}15` }}
                        >
                            <IconComponent size={getIconSize()} style={{ color: colors?.accent }} />
                        </div>
                        <h4
                            className="font-bold text-lg mb-2"
                            style={{ color: colors?.heading || colors?.text }}
                        >
                            {badge.title}
                        </h4>
                        {badge.description && (
                            <p className="text-sm leading-relaxed" style={{ color: colors?.text }}>
                                {badge.description}
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
                backgroundColor: colors?.background,
                borderTop: colors?.border ? `1px solid ${colors?.border}30` : 'none',
                borderBottom: colors?.border ? `1px solid ${colors?.border}30` : 'none',
            }}
        >
            <div className="max-w-7xl mx-auto">
                {/* Optional Title */}
                {data.title && (
                    <h3
                        className="text-center font-semibold mb-6"
                        style={{ color: colors?.heading }}
                    >
                        {data.title}
                    </h3>
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
