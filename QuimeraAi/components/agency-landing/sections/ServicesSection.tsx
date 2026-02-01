/**
 * ServicesSection
 * Services section for agency landing page
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
    Briefcase,
    Code,
    Palette,
    BarChart3,
    Megaphone,
    Camera,
    Globe,
    Smartphone,
    ShieldCheck,
    Zap,
} from 'lucide-react';
import { ServicesSection as ServicesData, LandingBranding } from '../../../types/agencyLanding';

interface ServicesSectionProps {
    data: ServicesData;
    branding?: LandingBranding;
}

// Icon mapping
const ICONS: Record<string, React.ElementType> = {
    briefcase: Briefcase,
    code: Code,
    palette: Palette,
    chart: BarChart3,
    megaphone: Megaphone,
    camera: Camera,
    globe: Globe,
    smartphone: Smartphone,
    shield: ShieldCheck,
    zap: Zap,
    default: Briefcase,
};

export function ServicesSection({ data, branding }: ServicesSectionProps) {
    const primaryColor = branding?.primaryColor || '#4f46e5';

    const getIcon = (iconName: string) => {
        return ICONS[iconName] || ICONS.default;
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    const columns = data.columns || 3;
    const gridClass = columns === 2 
        ? 'md:grid-cols-2' 
        : columns === 4 
            ? 'md:grid-cols-2 lg:grid-cols-4' 
            : 'md:grid-cols-2 lg:grid-cols-3';

    return (
        <section id="services" className="py-20 md:py-32 bg-white">
            <div className="max-w-7xl mx-auto px-6 md:px-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                        {data.title}
                    </h2>
                    {data.subtitle && (
                        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                            {data.subtitle}
                        </p>
                    )}
                </motion.div>

                {/* Services Grid */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className={`grid grid-cols-1 ${gridClass} gap-8`}
                >
                    {data.services.map((service, index) => {
                        const Icon = getIcon(service.icon);

                        return (
                            <motion.div
                                key={service.id}
                                variants={itemVariants}
                                className={`p-8 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-all duration-300 group ${
                                    data.layout === 'cards' ? 'shadow-lg hover:shadow-xl' : ''
                                }`}
                            >
                                {/* Icon */}
                                <div
                                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110"
                                    style={{ backgroundColor: `${primaryColor}15` }}
                                >
                                    <Icon
                                        className="w-7 h-7"
                                        style={{ color: primaryColor }}
                                    />
                                </div>

                                {/* Title */}
                                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                    {service.title}
                                </h3>

                                {/* Description */}
                                <p className="text-gray-600 mb-4">
                                    {service.description}
                                </p>

                                {/* Features */}
                                {service.features && service.features.length > 0 && (
                                    <ul className="space-y-2">
                                        {service.features.map((feature, idx) => (
                                            <li
                                                key={idx}
                                                className="flex items-center gap-2 text-sm text-gray-600"
                                            >
                                                <span
                                                    className="w-1.5 h-1.5 rounded-full"
                                                    style={{ backgroundColor: primaryColor }}
                                                />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {/* Price */}
                                {service.price && (
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                        <span className="text-2xl font-bold" style={{ color: primaryColor }}>
                                            {service.price}
                                        </span>
                                    </div>
                                )}

                                {/* Link */}
                                {service.link && (
                                    <a
                                        href={service.link}
                                        className="inline-flex items-center mt-4 text-sm font-medium transition-colors hover:underline"
                                        style={{ color: primaryColor }}
                                    >
                                        Más información →
                                    </a>
                                )}
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>
        </section>
    );
}

export default ServicesSection;
