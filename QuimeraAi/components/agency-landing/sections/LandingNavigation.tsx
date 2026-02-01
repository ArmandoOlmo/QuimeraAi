/**
 * LandingNavigation
 * Navigation bar for agency landing page
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { NavigationConfig, LandingBranding } from '../../../types/agencyLanding';

interface LandingNavigationProps {
    config?: NavigationConfig;
    branding?: LandingBranding;
    scrolled: boolean;
}

export function LandingNavigation({ config, branding, scrolled }: LandingNavigationProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const primaryColor = branding?.primaryColor || '#4f46e5';

    const items = config?.items || [];
    const isTransparent = config?.transparent && !scrolled && !mobileMenuOpen;

    return (
        <>
            <motion.header
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                    config?.sticky || scrolled ? '' : 'absolute'
                } ${
                    isTransparent
                        ? 'bg-transparent'
                        : 'bg-white/95 backdrop-blur-md shadow-sm'
                }`}
            >
                <div className="max-w-7xl mx-auto px-6 md:px-12">
                    <div className="flex items-center justify-between h-20">
                        {/* Logo */}
                        <a href="#" className="flex items-center">
                            {branding?.logo ? (
                                <img
                                    src={isTransparent && branding.logoDark ? branding.logoDark : branding.logo}
                                    alt="Logo"
                                    className="h-10 w-auto"
                                />
                            ) : (
                                <span
                                    className={`text-2xl font-bold transition-colors ${
                                        isTransparent ? 'text-white' : 'text-gray-900'
                                    }`}
                                >
                                    Logo
                                </span>
                            )}
                        </a>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center gap-8">
                            {items.map((item) => (
                                <a
                                    key={item.id}
                                    href={item.link}
                                    target={item.isExternal ? '_blank' : undefined}
                                    rel={item.isExternal ? 'noopener noreferrer' : undefined}
                                    className={`text-sm font-medium transition-colors hover:opacity-70 ${
                                        isTransparent ? 'text-white' : 'text-gray-700'
                                    }`}
                                >
                                    {item.label}
                                </a>
                            ))}

                            {config?.showCta && (
                                <a
                                    href={config.ctaLink}
                                    className="px-6 py-2.5 rounded-lg text-white text-sm font-semibold transition-all hover:opacity-90 shadow-lg"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {config.ctaText}
                                </a>
                            )}
                        </nav>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className={`md:hidden p-2 rounded-lg transition-colors ${
                                isTransparent ? 'text-white' : 'text-gray-700'
                            }`}
                        >
                            {mobileMenuOpen ? (
                                <X className="w-6 h-6" />
                            ) : (
                                <Menu className="w-6 h-6" />
                            )}
                        </button>
                    </div>
                </div>
            </motion.header>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="fixed top-20 left-0 right-0 z-40 bg-white shadow-lg md:hidden"
                    >
                        <nav className="px-6 py-4">
                            {items.map((item) => (
                                <a
                                    key={item.id}
                                    href={item.link}
                                    target={item.isExternal ? '_blank' : undefined}
                                    rel={item.isExternal ? 'noopener noreferrer' : undefined}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="block py-3 text-gray-700 font-medium border-b border-gray-100"
                                >
                                    {item.label}
                                </a>
                            ))}

                            {config?.showCta && (
                                <a
                                    href={config.ctaLink}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="block mt-4 px-6 py-3 rounded-lg text-white text-center font-semibold"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {config.ctaText}
                                </a>
                            )}
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export default LandingNavigation;
