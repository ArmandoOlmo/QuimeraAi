/**
 * Privacy Policy Page
 * Public page displaying the privacy policy for Quimera AI
 * Content is managed from Super Admin Content Management
 * Uses LegalPageLayout for consistent branding with the landing page
 */

import React, { useEffect, useState } from 'react';
import { sanitizeHtml } from '../../utils/sanitize';
import { Shield, Lock, Eye, Database, Users, Mail, Globe, FileText, Settings, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { useSafeAppContent } from '../../contexts/appContent';
import { LegalPage, getDefaultLegalPage } from '../../types/appContent';
import { useTranslation } from 'react-i18next';
import LegalPageLayout from './LegalPageLayout';
import i18n from '../../i18n';

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
};

const PrivacyPolicyPage: React.FC = () => {
    const { t } = useTranslation();
    const appContent = useSafeAppContent();
    const [pageData, setPageData] = useState<LegalPage | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const defaultPage = getDefaultLegalPage('privacy-policy', i18n.language);
        if (appContent) {
            const page = appContent.getLegalPageByType('privacy-policy', i18n.language as 'es' | 'en');
            setPageData(page || defaultPage);
        } else {
            setPageData(defaultPage);
        }
        setIsLoading(false);
    }, [appContent, i18n.language]);

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
                            <li key={i} className="text-gray-400" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')) }} />
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
                    <h4 key={index} className="font-semibold text-yellow-400/90 mb-2 mt-4">
                        {trimmed.replace(/\*\*/g, '')}
                    </h4>
                );
            } else if (trimmed) {
                flushList();
                elements.push(
                    <p key={index} className="mb-3 text-gray-400" dangerouslySetInnerHTML={{ 
                        __html: sanitizeHtml(trimmed.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>'))
                    }} />
                );
            }
        });

        flushList();
        return elements;
    };

    if (isLoading) {
        return (
            <LegalPageLayout>
                <div className="flex items-center justify-center py-32">
                    <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
                </div>
            </LegalPageLayout>
        );
    }

    if (!pageData) {
        return (
            <LegalPageLayout>
                <div className="flex items-center justify-center py-32">
                    <div className="text-center">
                        <FileText className="w-16 h-16 mx-auto text-gray-700 mb-4" />
                        <h1 className="text-2xl font-bold text-white mb-2">{t('legal.pageNotFound')}</h1>
                        <p className="text-gray-500">{t('legal.notConfigured')}</p>
                    </div>
                </div>
            </LegalPageLayout>
        );
    }

    return (
        <LegalPageLayout>
            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
                {/* Title Section */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-400/10 border border-yellow-400/20 rounded-2xl mb-6">
                        <Lock className="text-yellow-400" size={32} />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 bg-gradient-to-r from-white via-yellow-100 to-yellow-200 bg-clip-text text-transparent">
                        {pageData.title}
                    </h1>
                    {pageData.subtitle && (
                        <p className="text-gray-400 mb-2 text-lg">{pageData.subtitle}</p>
                    )}
                    <p className="text-gray-600 text-sm">
                        {t('legal.lastUpdated', 'Última actualización')}: {new Date(pageData.lastUpdated).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>

                {/* Content Sections */}
                <div className="space-y-6">
                    {pageData.sections.map((section) => {
                        const IconComponent = ICON_MAP[section.icon || 'FileText'] || FileText;
                        
                        return (
                            <section 
                                key={section.id} 
                                id={section.id}
                                className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 sm:p-8 hover:border-yellow-400/20 transition-colors"
                            >
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                                    <span className="flex items-center justify-center w-8 h-8 bg-yellow-400/10 rounded-lg">
                                        <IconComponent className="text-yellow-400" size={18} />
                                    </span>
                                    {section.title}
                                </h2>
                                <div className="leading-relaxed">
                                    {parseContent(section.content)}
                                </div>
                            </section>
                        );
                    })}

                    {/* Contact Section */}
                    {pageData.contactEmail && (
                        <section className="bg-yellow-400/5 border border-yellow-400/20 rounded-2xl p-6 sm:p-8">
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 bg-yellow-400/10 rounded-lg">
                                    <Mail className="text-yellow-400" size={18} />
                                </span>
                                {t('legal.contact')}
                            </h2>
                            <div className="text-gray-400">
                                <p className="mb-4">
                                    {t('legal.privacyContactText')}
                                </p>
                                <div className="space-y-2">
                                    <p><strong className="text-white">Email:</strong> <a href={`mailto:${pageData.contactEmail}`} className="text-yellow-400 hover:underline">{pageData.contactEmail}</a></p>
                                    <p><strong className="text-white">{t('legal.website')}:</strong> <a href="https://quimera.ai" className="text-yellow-400 hover:underline">https://quimera.ai</a></p>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Updates Notice */}
                    <section className="text-center text-gray-500 text-sm py-4">
                        <p>
                            {t('legal.privacyUpdateNotice')}
                        </p>
                    </section>
                </div>
            </main>
        </LegalPageLayout>
    );
};

export default PrivacyPolicyPage;
