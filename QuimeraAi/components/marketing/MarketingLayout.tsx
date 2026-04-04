/**
 * MarketingLayout — Shared layout for public marketing pages (Pricing, About, Contact, Features)
 * Replicates the landing page's header & footer with dynamic navigation from AppContent.
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Menu,
  X,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  Github,
  MessageCircle,
} from 'lucide-react';
import LanguageSelector from '../ui/LanguageSelector';
import { useSafeAppContent } from '../../contexts/appContent';
import { AppNavItem, DEFAULT_APP_NAVIGATION } from '../../types/appContent';
import { QUIMERA_DEFAULT_LOGO } from '../../hooks/useAppLogo';
import { savePlatformLead } from '../../services/platformLeadService';

// Social icons mapping
const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  twitter: <Twitter size={18} />,
  linkedin: <Linkedin size={18} />,
  instagram: <Instagram size={18} />,
  youtube: <Youtube size={18} />,
  github: <Github size={18} />,
  discord: <MessageCircle size={18} />,
};

interface MarketingLayoutProps {
  children: React.ReactNode;
  onNavigateToHome?: () => void;
  onNavigateToLogin?: () => void;
  onNavigateToRegister?: () => void;
}

const MarketingLayout: React.FC<MarketingLayoutProps> = ({
  children,
  onNavigateToHome,
  onNavigateToLogin,
  onNavigateToRegister,
}) => {
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Get dynamic content from AppContent context
  const appContent = useSafeAppContent();
  const navigation = appContent?.navigation || DEFAULT_APP_NAVIGATION;

  // Helper to translate navigation labels dynamically
  const getTranslatedLabel = (label: string) => {
    const normalized = label.trim().toLowerCase();
    switch (normalized) {
      case 'features': return t('landing.navFeatures', 'Características');
      case 'pricing': return t('landing.navPricing', 'Precios');
      case 'blog': return t('landing.navBlog', 'Blog');
      case 'help': return t('landing.navHelp', 'Ayuda');
      case 'templates': return t('landing.navTemplates', 'Plantillas');
      case 'documentation': return t('landing.navDocumentation', 'Documentación');
      case 'help center': return t('landing.navHelpCenter', 'Centro de Ayuda');
      case 'about': return t('landing.navAbout', 'Nosotros');
      case 'contact': return t('landing.navContact', 'Contacto');
      case 'product': return t('landing.navProduct', 'Producto');
      case 'resources': return t('landing.navResources', 'Recursos');
      case 'company': return t('landing.navCompany', 'Empresa');
      case 'legal': return t('landing.navLegal', 'Legal');
      default: return label;
    }
  };

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

  // Handle navigation item click
  const handleNavItemClick = (item: AppNavItem) => {
    if (item.type === 'anchor') {
      // On marketing pages anchors should navigate to landing page
      window.history.pushState(null, '', '/' + item.href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else if (item.href === '/blog') {
      window.history.pushState(null, '', '/blog');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else if (item.href.startsWith('/')) {
      window.history.pushState(null, '', item.href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else if (item.href.startsWith('http')) {
      window.open(item.href, item.target || '_blank');
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: '#0A0A0A',
        color: '#ffffff',
      }}
    >
      {/* === HEADER === */}
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
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigateToHome?.();
              }}
              className="flex items-center gap-2 sm:gap-3"
            >
              <img
                src={navigation.header.logo?.imageUrl || QUIMERA_DEFAULT_LOGO}
                alt={navigation.header.logo?.text || 'Quimera.ai'}
                className="w-8 h-8 sm:w-10 sm:h-10"
              />
              <span className="text-lg sm:text-xl font-bold text-white">
                {(navigation.header.logo?.text || 'Quimera.ai').split('.')[0] || 'Quimera'}
                <span className="text-yellow-400">.ai</span>
              </span>
            </a>

            {/* Navigation - Desktop */}
            <nav className="hidden md:flex items-center gap-8">
              {navigation.header.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavItemClick(item)}
                  className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  {getTranslatedLabel(item.label)}
                  {item.isNew && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-yellow-400 text-black rounded-full font-bold">
                      NEW
                    </span>
                  )}
                </button>
              ))}
            </nav>

            {/* CTA Buttons - Desktop */}
            <div className="hidden md:flex items-center gap-4">
              <LanguageSelector variant="minimal" />
              <button
                onClick={onNavigateToLogin}
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
                {navigation.header.cta?.loginText || t('landing.login')}
              </button>
              <button
                onClick={onNavigateToRegister}
                className="px-5 py-2.5 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 transition-colors"
              >
                {navigation.header.cta?.registerText || t('landing.register')}
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-3 md:hidden">
              <LanguageSelector variant="minimal" />
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-gray-300 hover:text-white transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-white/10 pt-4 animate-in slide-in-from-top duration-200">
              <nav className="flex flex-col gap-4 mb-6">
                {navigation.header.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavItemClick(item)}
                    className="text-gray-300 hover:text-white transition-colors py-2 text-left flex items-center gap-2"
                  >
                    {getTranslatedLabel(item.label)}
                    {item.isNew && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-yellow-400 text-black rounded-full font-bold">
                        NEW
                      </span>
                    )}
                  </button>
                ))}
              </nav>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onNavigateToLogin?.();
                  }}
                  className="w-full py-3 text-center text-gray-300 hover:text-white border border-white/10 rounded-xl transition-colors"
                >
                  {navigation.header.cta?.loginText || t('landing.login')}
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onNavigateToRegister?.();
                  }}
                  className="w-full py-3 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 transition-colors"
                >
                  {navigation.header.cta?.registerText || t('landing.register')}
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* === CONTENT (with top padding for fixed header) === */}
      <main className="pt-16 sm:pt-20">
        {children}
      </main>

      {/* === FOOTER === */}
      <footer
        id="section-footer"
        className="py-12 sm:py-16"
        style={{
          backgroundColor: '#0A0A0A',
          color: '#ffffff',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div className="container mx-auto px-4 sm:px-6">
          {/* Footer Columns */}
          {navigation.footer.columns.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
              {/* Logo Column */}
              <div className="col-span-2 md:col-span-1">
                <div className="flex items-center gap-2 mb-4">
                  <img src={QUIMERA_DEFAULT_LOGO} alt="Quimera.ai" className="w-8 h-8" />
                  <span className="font-bold text-white">
                    Quimera
                    <span className="text-yellow-400">.ai</span>
                  </span>
                </div>
                <p className="text-sm mb-4 text-gray-500">
                  {t('landing.footerTagline', 'Build amazing websites with AI')}
                </p>

                {/* Social Links */}
                {navigation.footer.socialLinks && navigation.footer.socialLinks.length > 0 && (
                  <div className="flex items-center gap-3">
                    {navigation.footer.socialLinks.map((social) => (
                      <a
                        key={social.id}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-9 h-9 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                      >
                        {SOCIAL_ICONS[social.platform]}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Dynamic Columns */}
              {navigation.footer.columns.map((column) => (
                <div key={column.id}>
                  <h4 className="font-semibold text-white mb-4">{getTranslatedLabel(column.title)}</h4>
                  <ul className="space-y-2">
                    {column.items.map((item) => (
                      <li key={item.id}>
                        <button
                          onClick={() => handleNavItemClick(item)}
                          className="text-sm text-gray-500 hover:text-white transition-colors"
                        >
                          {getTranslatedLabel(item.label)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* Newsletter */}
          {navigation.footer.showNewsletter && (
            <div className="border-t border-white/10 pt-8 mb-8">
              <div className="max-w-md mx-auto text-center md:text-left md:max-w-none md:flex md:items-center md:justify-between">
                <div className="mb-4 md:mb-0">
                  <h4 className="font-semibold text-white mb-1">
                    {navigation.footer.newsletterTitle || 'Stay updated'}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {navigation.footer.newsletterDescription || 'Get the latest news and updates'}
                  </p>
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const emailInput = form.querySelector('input[type="email"]') as HTMLInputElement;
                    const email = emailInput?.value?.trim();
                    if (!email) return;
                    const btn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
                    const originalText = btn.textContent;
                    try {
                      btn.disabled = true;
                      btn.textContent = '...';
                      await savePlatformLead({
                        name: email.split('@')[0],
                        email,
                        source: 'newsletter',
                        status: 'new',
                        score: 30,
                        tags: ['newsletter', 'marketing-page'],
                      });
                      emailInput.value = '';
                      btn.textContent = '✓';
                      setTimeout(() => { btn.textContent = originalText; btn.disabled = false; }, 2000);
                    } catch (err) {
                      console.error('[Newsletter] Error saving lead:', err);
                      btn.textContent = 'Error';
                      setTimeout(() => { btn.textContent = originalText; btn.disabled = false; }, 2000);
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="email"
                    required
                    placeholder="Enter your email"
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-400/50"
                  />
                  <button type="submit" className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-300 transition-colors text-sm">
                    Subscribe
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Bottom Bar */}
          <div className="flex flex-col items-center gap-4 pt-8 border-t border-white/10 md:flex-row md:justify-between">
            <div className="text-xs sm:text-sm text-gray-500">
              {navigation.footer.bottomText || `© ${new Date().getFullYear()} Quimera.ai. All rights reserved.`}
            </div>

            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-500">
              {[
                { href: '/changelog', label: t('landing.footerChangelog', 'Changelog') },
                { href: '/help-center', label: t('landing.footerHelpCenter', 'Centro de Ayuda') },
                { href: '/privacy-policy', label: t('landing.footerPrivacy', 'Política de Privacidad') },
                { href: '/terms-of-service', label: t('landing.footerTerms', 'Términos de Servicio') },
                { href: '/cookie-policy', label: t('landing.footerCookies', 'Política de Cookies') },
                { href: '/data-deletion', label: t('landing.footerDataDeletion', 'Eliminación de Datos') },
              ].map((link) => (
                <button
                  key={link.href}
                  onClick={() => {
                    window.history.pushState(null, '', link.href);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="hover:text-white transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MarketingLayout;
