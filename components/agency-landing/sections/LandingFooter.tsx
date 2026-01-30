/**
 * LandingFooter
 * Footer for agency landing page
 */

import React from 'react';
import { FooterConfig, LandingBranding, SEOConfig } from '../../../types/agencyLanding';

interface LandingFooterProps {
    config?: FooterConfig;
    branding?: LandingBranding;
    seo?: SEOConfig;
}

export function LandingFooter({ config, branding, seo }: LandingFooterProps) {
    const primaryColor = branding?.primaryColor || '#4f46e5';
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-gray-900 text-white">
            {/* Main Footer */}
            <div className="max-w-7xl mx-auto px-6 md:px-12 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    {/* Brand Column */}
                    <div className="lg:col-span-1">
                        {branding?.logoDark || branding?.logo ? (
                            <img
                                src={branding.logoDark || branding.logo}
                                alt="Logo"
                                className="h-10 w-auto mb-6"
                            />
                        ) : (
                            <h3 className="text-2xl font-bold mb-6">
                                {seo?.title || 'Logo'}
                            </h3>
                        )}
                        <p className="text-gray-400 mb-6">
                            {seo?.description || 'Tu socio digital de confianza.'}
                        </p>

                        {/* Social Links */}
                        {config?.showSocial && config.socialLinks && (
                            <div className="flex gap-4">
                                {config.socialLinks.facebook && (
                                    <a
                                        href={config.socialLinks.facebook}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                                    >
                                        FB
                                    </a>
                                )}
                                {config.socialLinks.instagram && (
                                    <a
                                        href={config.socialLinks.instagram}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gradient-to-br from-purple-500 to-pink-500 transition-all"
                                    >
                                        IG
                                    </a>
                                )}
                                {config.socialLinks.linkedin && (
                                    <a
                                        href={config.socialLinks.linkedin}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-blue-600 transition-colors"
                                    >
                                        LI
                                    </a>
                                )}
                                {config.socialLinks.twitter && (
                                    <a
                                        href={config.socialLinks.twitter}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-sky-500 transition-colors"
                                    >
                                        TW
                                    </a>
                                )}
                                {config.socialLinks.youtube && (
                                    <a
                                        href={config.socialLinks.youtube}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-600 transition-colors"
                                    >
                                        YT
                                    </a>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Link Columns */}
                    {config?.columns?.map((column, idx) => (
                        <div key={idx}>
                            <h4 className="text-lg font-semibold mb-6">{column.title}</h4>
                            <ul className="space-y-3">
                                {column.links.map((link, linkIdx) => (
                                    <li key={linkIdx}>
                                        <a
                                            href={link.url}
                                            target={link.isExternal ? '_blank' : undefined}
                                            rel={link.isExternal ? 'noopener noreferrer' : undefined}
                                            className="text-gray-400 hover:text-white transition-colors"
                                        >
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}

                    {/* Newsletter */}
                    {config?.showNewsletter && (
                        <div>
                            <h4 className="text-lg font-semibold mb-6">
                                {config.newsletterTitle || 'Suscríbete'}
                            </h4>
                            <form className="flex flex-col gap-3">
                                <input
                                    type="email"
                                    placeholder={config.newsletterPlaceholder || 'Tu email'}
                                    className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
                                />
                                <button
                                    type="submit"
                                    className="px-4 py-3 rounded-lg text-white font-semibold transition-opacity hover:opacity-90"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    Suscribirse
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-gray-800">
                <div className="max-w-7xl mx-auto px-6 md:px-12 py-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-gray-400 text-sm">
                            {config?.copyright || `© ${currentYear} ${seo?.title || 'Tu Empresa'}. Todos los derechos reservados.`}
                        </p>
                        <div className="flex gap-6 text-sm text-gray-400">
                            <a href="#" className="hover:text-white transition-colors">
                                Política de Privacidad
                            </a>
                            <a href="#" className="hover:text-white transition-colors">
                                Términos de Servicio
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default LandingFooter;
