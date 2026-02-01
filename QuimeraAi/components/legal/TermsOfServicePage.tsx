/**
 * Terms of Service Page
 * Public page displaying the terms of service for Quimera AI
 * Content is managed from Super Admin Content Management
 */

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Shield, Lock, Eye, Database, Users, Mail, Globe, FileText, Settings, Clock, AlertTriangle, Loader2, ScrollText } from 'lucide-react';
import { useSafeAppContent } from '../../contexts/appContent';
import { LegalPage, DEFAULT_TERMS_OF_SERVICE } from '../../types/appContent';

// Icon mapping
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
    Globe,
    Database,
    Eye,
    Users,
    Shield,
    Lock,
    FileText,
    Settings,
    Clock,
    AlertTriangle,
    Mail,
    ScrollText,
};

const TermsOfServicePage: React.FC = () => {
    const appContent = useSafeAppContent();
    const [pageData, setPageData] = useState<LegalPage | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Try to get data from context, otherwise use defaults
        if (appContent) {
            const page = appContent.getLegalPageByType('terms-of-service');
            setPageData(page || DEFAULT_TERMS_OF_SERVICE);
        } else {
            setPageData(DEFAULT_TERMS_OF_SERVICE);
        }
        setIsLoading(false);
    }, [appContent]);

    const handleBack = () => {
        window.history.back();
    };

    // Parse markdown-like content
    const parseContent = (content: string) => {
        const lines = content.split('\n');
        const elements: React.ReactNode[] = [];
        let listItems: string[] = [];

        const flushList = () => {
            if (listItems.length > 0) {
                elements.push(
                    <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 ml-4 mb-4">
                        {listItems.map((item, i) => (
                            <li key={i} dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                        ))}
                    </ul>
                );
                listItems = [];
            }
        };

        lines.forEach((line, index) => {
            const trimmed = line.trim();
            
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                listItems.push(trimmed.slice(2));
            } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                flushList();
                elements.push(
                    <h4 key={index} className="font-semibold text-white mb-2 mt-4">
                        {trimmed.replace(/\*\*/g, '')}
                    </h4>
                );
            } else if (trimmed) {
                flushList();
                elements.push(
                    <p key={index} className="mb-3" dangerouslySetInnerHTML={{ 
                        __html: trimmed.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                    }} />
                );
            }
        });

        flushList();
        return elements;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!pageData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <FileText className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
                    <p className="text-slate-400">This page has not been configured yet.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span>Volver</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <Shield className="text-indigo-500" size={24} />
                        <span className="font-bold text-white">Quimera AI</span>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-6 py-12">
                {/* Title Section */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 rounded-2xl mb-6">
                        <ScrollText className="text-emerald-400" size={32} />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-4">{pageData.title}</h1>
                    {pageData.subtitle && (
                        <p className="text-slate-400 mb-2">{pageData.subtitle}</p>
                    )}
                    <p className="text-slate-500 text-sm">
                        Última actualización: {new Date(pageData.lastUpdated).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>

                {/* Table of Contents */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-8">
                    <h2 className="text-lg font-bold text-white mb-4">Contenido</h2>
                    <nav className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {pageData.sections.map((section, index) => (
                            <a
                                key={section.id}
                                href={`#${section.id}`}
                                className="text-sm text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-2"
                            >
                                <span className="text-indigo-500">{index + 1}.</span>
                                {section.title}
                            </a>
                        ))}
                    </nav>
                </div>

                {/* Content Sections */}
                <div className="space-y-8">
                    {pageData.sections.map((section, index) => {
                        const IconComponent = ICON_MAP[section.icon || 'FileText'] || FileText;
                        
                        return (
                            <section 
                                key={section.id} 
                                id={section.id}
                                className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 scroll-mt-20"
                            >
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <IconComponent className="text-emerald-400" size={20} />
                                    <span className="text-emerald-400 mr-2">{index + 1}.</span>
                                    {section.title}
                                </h2>
                                <div className="text-slate-300 leading-relaxed">
                                    {parseContent(section.content)}
                                </div>
                            </section>
                        );
                    })}

                    {/* Contact Section */}
                    {pageData.contactEmail && (
                        <section className="bg-emerald-500/20 border border-emerald-500/30 rounded-2xl p-6">
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <Mail className="text-emerald-400" size={20} />
                                Contacto Legal
                            </h2>
                            <div className="text-slate-300">
                                <p className="mb-4">
                                    Si tiene preguntas sobre estos Términos de Servicio, puede contactarnos:
                                </p>
                                <div className="space-y-2">
                                    <p><strong>Email:</strong> {pageData.contactEmail}</p>
                                    <p><strong>Sitio web:</strong> https://quimera.ai</p>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Updates Notice */}
                    <section className="text-center text-slate-400 text-sm">
                        <p>
                            Al utilizar nuestros servicios, usted acepta estos términos. 
                            Le recomendamos revisarlos periódicamente para estar informado de cualquier cambio.
                        </p>
                    </section>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-700/50 py-8 mt-12">
                <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-sm">
                    <p>© {new Date().getFullYear()} Quimera AI. Todos los derechos reservados.</p>
                    <div className="flex gap-4">
                        <a href="/privacy-policy" className="hover:text-white transition-colors">
                            Política de Privacidad
                        </a>
                        <a href="/data-deletion" className="hover:text-white transition-colors">
                            Eliminación de Datos
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default TermsOfServicePage;







