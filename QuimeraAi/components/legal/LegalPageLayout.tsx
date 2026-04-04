/**
 * LegalPageLayout
 * Shared layout for all legal pages (Privacy, Terms, Cookies, Data Deletion)
 * Uses the same design system as PublicLandingPage:
 * - Background: #0A0A0A
 * - Accent: yellow-400 (#facc15) 
 * - Header with logo + nav + Login/Register
 * - Footer with legal links + copyright
 */

import React, { useEffect } from 'react';
import { ArrowLeft, Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../ui/LanguageSelector';
import { QUIMERA_DEFAULT_LOGO, QUIMERA_FULL_LOGO } from '../../hooks/useAppLogo';

interface LegalPageLayoutProps {
    children: React.ReactNode;
}

const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({ children }) => {
    const { t } = useTranslation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    // Override overflow:hidden from index.html to allow native page scrolling
    useEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        const root = document.getElementById('root');

        html.style.overflow = 'auto';
        html.style.height = 'auto';
        body.style.overflow = 'auto';
        body.style.height = 'auto';
        if (root) {
            root.style.overflow = 'visible';
            root.style.height = 'auto';
        }

        return () => {
            html.style.overflow = '';
            html.style.height = '';
            body.style.overflow = '';
            body.style.height = '';
            if (root) {
                root.style.overflow = '';
                root.style.height = '';
            }
        };
    }, []);

    const navigate = (path: string) => {
        window.history.pushState(null, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#0A0A0A', color: '#ffffff' }}>
            {/* === HEADER — matches Landing Page === */}
            <header
                className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm"
                style={{
                    backgroundColor: '#0A0A0Af2',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
            >
                <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <a href="/" className="flex items-center">
                            <img
                                src={QUIMERA_FULL_LOGO}
                                alt="Quimera.ai"
                                className="h-8 sm:h-10 w-auto"
                            />
                        </a>

                        {/* Navigation — Desktop */}
                        <nav className="hidden md:flex items-center gap-8">
                            <button
                                onClick={() => navigate('/')}
                                className="text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                {t('landing.home', 'Inicio')}
                            </button>
                            <button
                                onClick={() => navigate('/pricing')}
                                className="text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                {t('landing.navPricing', 'Precios')}
                            </button>
                            <button
                                onClick={() => navigate('/blog')}
                                className="text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                {t('landing.footerBlog', 'Blog')}
                            </button>
                            <button
                                onClick={() => navigate('/help-center')}
                                className="text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                {t('landing.footerHelpCenter', 'Ayuda')}
                            </button>
                        </nav>

                        {/* CTA Buttons — Desktop */}
                        <div className="hidden md:flex items-center gap-4">
                            <LanguageSelector variant="minimal" />
                            <button
                                onClick={() => navigate('/login')}
                                className="text-sm text-gray-300 hover:text-white transition-colors"
                            >
                                {t('landing.login', 'Iniciar sesión')}
                            </button>
                            <button
                                onClick={() => navigate('/register')}
                                className="px-5 py-2.5 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 transition-colors"
                            >
                                {t('landing.register', 'Empezar gratis')}
                            </button>
                        </div>

                        {/* Mobile Menu Toggle */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden text-gray-400 hover:text-white transition-colors"
                        >
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>

                    {/* Mobile Menu */}
                    {isMobileMenuOpen && (
                        <div className="md:hidden mt-4 pb-4 border-t border-white/10 pt-4">
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => { setIsMobileMenuOpen(false); navigate('/'); }}
                                    className="text-sm text-gray-400 hover:text-white transition-colors text-left"
                                >
                                    {t('landing.home', 'Inicio')}
                                </button>
                                <button
                                    onClick={() => { setIsMobileMenuOpen(false); navigate('/pricing'); }}
                                    className="text-sm text-gray-400 hover:text-white transition-colors text-left"
                                >
                                    {t('landing.navPricing', 'Precios')}
                                </button>
                                <button
                                    onClick={() => { setIsMobileMenuOpen(false); navigate('/blog'); }}
                                    className="text-sm text-gray-400 hover:text-white transition-colors text-left"
                                >
                                    {t('landing.footerBlog', 'Blog')}
                                </button>
                                <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                                    <LanguageSelector variant="minimal" />
                                    <button
                                        onClick={() => { setIsMobileMenuOpen(false); navigate('/login'); }}
                                        className="text-sm text-gray-300 hover:text-white transition-colors"
                                    >
                                        {t('landing.login', 'Iniciar sesión')}
                                    </button>
                                    <button
                                        onClick={() => { setIsMobileMenuOpen(false); navigate('/register'); }}
                                        className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 transition-colors text-sm"
                                    >
                                        {t('landing.register', 'Empezar gratis')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* === CONTENT with top padding for fixed header === */}
            <div className="pt-20">
                {/* Back button */}
                <div className="container mx-auto px-4 sm:px-6 pt-6">
                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center gap-2 text-gray-500 hover:text-yellow-400 transition-colors text-sm group"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        <span>{t('legal.back', 'Volver')}</span>
                    </button>
                </div>

                {children}
            </div>

            {/* === FOOTER — matches Landing Page === */}
            <footer
                className="py-12 sm:py-16 mt-16"
                style={{
                    backgroundColor: '#0A0A0A',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                }}
            >
                <div className="container mx-auto px-4 sm:px-6">
                    {/* Brand + Links */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                        {/* Logo Column */}
                        <div className="col-span-2 md:col-span-1">
                            <div className="flex items-center mb-4">
                                <img src={QUIMERA_FULL_LOGO} alt="Quimera.ai" className="h-8 w-auto" />
                            </div>
                            <p className="text-sm text-gray-500 mb-4">
                                {t('landing.footerTagline', 'Build amazing websites with AI')}
                            </p>
                        </div>

                        {/* Product Column */}
                        <div>
                            <h4 className="font-semibold text-white mb-4">{t('landing.footerProduct', 'Producto')}</h4>
                            <ul className="space-y-2">
                                <li><a href="/#features" className="text-sm text-gray-500 hover:text-white transition-colors">{t('landing.footerFeatures', 'Características')}</a></li>
                                <li><a href="/pricing" className="text-sm text-gray-500 hover:text-white transition-colors">{t('landing.footerPricing', 'Precios')}</a></li>
                                <li><a href="/blog" className="text-sm text-gray-500 hover:text-white transition-colors">{t('landing.footerBlog', 'Blog')}</a></li>
                                <li><a href="/changelog" className="text-sm text-gray-500 hover:text-white transition-colors">Changelog</a></li>
                            </ul>
                        </div>

                        {/* Company Column */}
                        <div>
                            <h4 className="font-semibold text-white mb-4">{t('landing.footerCompany', 'Empresa')}</h4>
                            <ul className="space-y-2">
                                <li><a href="/#about" className="text-sm text-gray-500 hover:text-white transition-colors">{t('landing.footerAbout', 'Nosotros')}</a></li>
                                <li><a href="/contact" className="text-sm text-gray-500 hover:text-white transition-colors">{t('landing.footerContact', 'Contacto')}</a></li>
                                <li><a href="/help-center" className="text-sm text-gray-500 hover:text-white transition-colors">{t('landing.footerHelpCenter', 'Centro de Ayuda')}</a></li>
                            </ul>
                        </div>

                        {/* Legal Column */}
                        <div>
                            <h4 className="font-semibold text-white mb-4">{t('landing.footerLegal', 'Legal')}</h4>
                            <ul className="space-y-2">
                                <li><a href="/privacy-policy" className="text-sm text-gray-500 hover:text-white transition-colors">{t('landing.footerPrivacy', 'Política de Privacidad')}</a></li>
                                <li><a href="/terms-of-service" className="text-sm text-gray-500 hover:text-white transition-colors">{t('landing.footerTerms', 'Términos de Servicio')}</a></li>
                                <li><a href="/cookie-policy" className="text-sm text-gray-500 hover:text-white transition-colors">{t('landing.footerCookies', 'Política de Cookies')}</a></li>
                                <li><a href="/data-deletion" className="text-sm text-gray-500 hover:text-white transition-colors">{t('landing.footerDataDeletion', 'Eliminación de Datos')}</a></li>
                            </ul>
                        </div>
                    </div>

                    {/* Bottom Bar */}
                    <div className="flex flex-col items-center gap-4 pt-8 border-t border-white/10 md:flex-row md:justify-between">
                        <div className="text-xs sm:text-sm text-gray-500">
                            © {new Date().getFullYear()} Quimera.ai. {t('landing.footerRights', 'All rights reserved.')}
                        </div>
                        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-500">
                            <a href="/privacy-policy" className="hover:text-white transition-colors">{t('landing.footerPrivacy', 'Política de Privacidad')}</a>
                            <a href="/terms-of-service" className="hover:text-white transition-colors">{t('landing.footerTerms', 'Términos de Servicio')}</a>
                            <a href="/cookie-policy" className="hover:text-white transition-colors">{t('landing.footerCookies', 'Política de Cookies')}</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LegalPageLayout;
