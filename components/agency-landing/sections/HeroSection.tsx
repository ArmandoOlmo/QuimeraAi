/**
 * HeroSection
 * Hero section for agency landing page
 */

import React from 'react';
import { motion } from 'framer-motion';
import { HeroSection as HeroData, LandingBranding } from '../../../types/agencyLanding';

interface HeroSectionProps {
    data: HeroData;
    branding?: LandingBranding;
}

export function HeroSection({ data, branding }: HeroSectionProps) {
    const primaryColor = branding?.primaryColor || '#4f46e5';

    return (
        <section
            id="hero"
            className="relative min-h-screen flex items-center justify-center overflow-hidden"
            style={{
                backgroundImage: data.backgroundImage
                    ? `url(${data.backgroundImage})`
                    : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            {/* Video Background */}
            {data.backgroundVideo && (
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                >
                    <source src={data.backgroundVideo} type="video/mp4" />
                </video>
            )}

            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black"
                style={{ opacity: (data.overlayOpacity || 50) / 100 }}
            />

            {/* Animated Background Elements */}
            {data.showAnimation && (
                <>
                    <motion.div
                        className="absolute w-96 h-96 rounded-full blur-3xl opacity-20"
                        style={{ backgroundColor: primaryColor }}
                        animate={{
                            x: [0, 50, 0],
                            y: [0, -30, 0],
                            scale: [1, 1.1, 1],
                        }}
                        transition={{
                            duration: 8,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                    <motion.div
                        className="absolute right-0 bottom-0 w-80 h-80 rounded-full blur-3xl opacity-20"
                        style={{ backgroundColor: branding?.secondaryColor || '#10b981' }}
                        animate={{
                            x: [0, -30, 0],
                            y: [0, 50, 0],
                            scale: [1, 1.15, 1],
                        }}
                        transition={{
                            duration: 10,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: 1,
                        }}
                    />
                </>
            )}

            {/* Content */}
            <div
                className="relative z-10 px-6 md:px-12 max-w-5xl mx-auto"
                style={{
                    textAlign: data.alignment || 'center',
                }}
            >
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
                >
                    {data.title}
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-lg md:text-xl lg:text-2xl text-white/80 mb-10 max-w-3xl mx-auto"
                    style={{
                        marginLeft: data.alignment === 'left' ? 0 : 'auto',
                        marginRight: data.alignment === 'right' ? 0 : 'auto',
                    }}
                >
                    {data.subtitle}
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="flex flex-wrap gap-4"
                    style={{
                        justifyContent: data.alignment === 'center' ? 'center' : 
                                       data.alignment === 'right' ? 'flex-end' : 'flex-start',
                    }}
                >
                    <a
                        href={data.ctaLink}
                        className="inline-flex items-center px-8 py-4 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
                        style={{ backgroundColor: primaryColor }}
                    >
                        {data.ctaText}
                    </a>

                    {data.secondaryCtaText && (
                        <a
                            href={data.secondaryCtaLink}
                            className="inline-flex items-center px-8 py-4 bg-white/10 text-white font-semibold rounded-lg border border-white/30 hover:bg-white/20 transition-all"
                        >
                            {data.secondaryCtaText}
                        </a>
                    )}
                </motion.div>
            </div>

            {/* Scroll indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
            >
                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center"
                >
                    <motion.div
                        animate={{ y: [0, 12, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-1.5 h-3 bg-white/50 rounded-full mt-2"
                    />
                </motion.div>
            </motion.div>
        </section>
    );
}

export default HeroSection;
