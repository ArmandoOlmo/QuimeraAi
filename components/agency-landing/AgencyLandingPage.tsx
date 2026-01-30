/**
 * AgencyLandingPage
 * Public-facing landing page for agencies
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    AgencyLandingConfig,
    getEnabledSections,
} from '../../types/agencyLanding';
import { HeroSection } from './sections/HeroSection';
import { ServicesSection } from './sections/ServicesSection';
import { PortfolioSection } from './sections/PortfolioSection';
import { TestimonialsSection } from './sections/TestimonialsSection';
import { ContactSection } from './sections/ContactSection';
import { LandingNavigation } from './sections/LandingNavigation';
import { LandingFooter } from './sections/LandingFooter';

interface AgencyLandingPageProps {
    config: AgencyLandingConfig;
}

export function AgencyLandingPage({ config }: AgencyLandingPageProps) {
    const [scrolled, setScrolled] = useState(false);
    const enabledSections = getEnabledSections(config);

    // Track scroll for sticky nav
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Apply custom font
    useEffect(() => {
        if (config.branding?.fontFamily) {
            const fontUrl = `https://fonts.googleapis.com/css2?family=${config.branding.fontFamily.replace(' ', '+')}:wght@300;400;500;600;700&display=swap`;
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = fontUrl;
            document.head.appendChild(link);
        }
    }, [config.branding?.fontFamily]);

    // Set document title
    useEffect(() => {
        if (config.seo?.title) {
            document.title = config.seo.title;
        }
    }, [config.seo?.title]);

    const renderSection = (section: { id: string; type: string }) => {
        const sectionProps = {
            branding: config.branding,
        };

        switch (section.type) {
            case 'hero':
                return config.hero && (
                    <HeroSection
                        key={section.id}
                        data={config.hero}
                        {...sectionProps}
                    />
                );
            case 'services':
                return config.services && (
                    <ServicesSection
                        key={section.id}
                        data={config.services}
                        {...sectionProps}
                    />
                );
            case 'portfolio':
                return config.portfolio && (
                    <PortfolioSection
                        key={section.id}
                        data={config.portfolio}
                        {...sectionProps}
                    />
                );
            case 'testimonials':
                return config.testimonials && (
                    <TestimonialsSection
                        key={section.id}
                        data={config.testimonials}
                        {...sectionProps}
                    />
                );
            case 'contact':
                return config.contact && (
                    <ContactSection
                        key={section.id}
                        data={config.contact}
                        {...sectionProps}
                    />
                );
            default:
                return null;
        }
    };

    const cssVariables = {
        '--primary-color': config.branding?.primaryColor || '#4f46e5',
        '--secondary-color': config.branding?.secondaryColor || '#10b981',
        '--accent-color': config.branding?.accentColor || config.branding?.primaryColor || '#4f46e5',
        '--font-family': config.branding?.fontFamily || 'Inter',
    } as React.CSSProperties;

    return (
        <div
            className="min-h-screen"
            style={{
                ...cssVariables,
                fontFamily: `var(--font-family), system-ui, sans-serif`,
            }}
        >
            {/* Navigation */}
            <LandingNavigation
                config={config.navigation}
                branding={config.branding}
                scrolled={scrolled}
            />

            {/* Main Content */}
            <main>
                {enabledSections.map((section) => renderSection(section))}
            </main>

            {/* Footer */}
            <LandingFooter
                config={config.footer}
                branding={config.branding}
                seo={config.seo}
            />
        </div>
    );
}

export default AgencyLandingPage;
