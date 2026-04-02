/**
 * Data Deletion Page
 * Public page explaining how users can request deletion of their data
 * Required by Meta for Facebook/Instagram app integration
 * Content is managed from Super Admin Content Management
 * Uses LegalPageLayout for consistent branding with the landing page
 */

import React, { useEffect, useState } from 'react';
import { sanitizeHtml } from '../../utils/sanitize';
import { Trash2, Shield, Mail, CheckCircle, AlertTriangle, Clock, FileText, Settings, Loader2, Globe, Database, Eye, Users, Lock } from 'lucide-react';
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
    CheckCircle,
    Trash2,
};

const DataDeletionPage: React.FC = () => {
    const { t } = useTranslation();
    const appContent = useSafeAppContent();
    const [pageData, setPageData] = useState<LegalPage | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Form state
    const [email, setEmail] = useState('');
    const [reason, setReason] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const defaultPage = getDefaultLegalPage('data-deletion', i18n.language);
        if (appContent) {
            const page = appContent.getLegalPageByType('data-deletion', i18n.language as 'es' | 'en');
            setPageData(page || defaultPage);
        } else {
            setPageData(defaultPage);
        }
        setIsLoading(false);
    }, [appContent, i18n.language]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        // Simulate submission - in production this would call an API
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setSubmitted(true);
        setIsSubmitting(false);
    };

    // Parse markdown-like content
    const parseContent = (content: string) => {
        const lines = content.split('\n');
        const elements: React.ReactNode[] = [];
        let listItems: string[] = [];

        const flushList = () => {
            if (listItems.length > 0) {
                elements.push(
                    <ul key={`list-${elements.length}`} className="space-y-2 ml-4 mb-4">
                        {listItems.map((item, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <CheckCircle className="text-yellow-400 mt-0.5 flex-shrink-0" size={18} />
                                <span className="text-gray-400" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')) }} />
                            </li>
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
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl mb-6">
                        <Trash2 className="text-red-400" size={32} />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 bg-gradient-to-r from-white via-yellow-100 to-yellow-200 bg-clip-text text-transparent">
                        {pageData.title}
                    </h1>
                    {pageData.subtitle && (
                        <p className="text-gray-400 max-w-2xl mx-auto text-lg">{pageData.subtitle}</p>
                    )}
                </div>

                {/* Info Cards */}
                <div className="grid md:grid-cols-3 gap-4 mb-12">
                    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 text-center hover:border-yellow-400/20 transition-colors">
                        <Clock className="mx-auto mb-3 text-yellow-400" size={24} />
                        <h3 className="font-semibold text-white mb-1">{t('legal.processTime')}</h3>
                        <p className="text-sm text-gray-500">{t('legal.upTo30Days')}</p>
                    </div>
                    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 text-center hover:border-yellow-400/20 transition-colors">
                        <Shield className="mx-auto mb-3 text-green-400" size={24} />
                        <h3 className="font-semibold text-white mb-1">{t('legal.completeDeletion')}</h3>
                        <p className="text-sm text-gray-500">{t('legal.allDataDeleted')}</p>
                    </div>
                    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 text-center hover:border-yellow-400/20 transition-colors">
                        <Mail className="mx-auto mb-3 text-yellow-400" size={24} />
                        <h3 className="font-semibold text-white mb-1">{t('legal.confirmation')}</h3>
                        <p className="text-sm text-gray-500">{t('legal.emailConfirmation')}</p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Dynamic Sections */}
                    <div className="space-y-6">
                        {pageData.sections.map((section) => {
                            const IconComponent = ICON_MAP[section.icon || 'FileText'] || FileText;
                            const isWarning = section.icon === 'AlertTriangle';
                            
                            return (
                                <section 
                                    key={section.id} 
                                    className={`rounded-2xl p-6 ${
                                        isWarning 
                                            ? 'bg-yellow-400/5 border border-yellow-400/20' 
                                            : 'bg-white/[0.03] border border-white/[0.08] hover:border-yellow-400/20 transition-colors'
                                    }`}
                                >
                                    <h2 className={`text-lg font-bold mb-3 flex items-center gap-3 ${isWarning ? 'text-yellow-400' : 'text-white'}`}>
                                        <span className="flex items-center justify-center w-8 h-8 bg-yellow-400/10 rounded-lg">
                                            <IconComponent className="text-yellow-400" size={18} />
                                        </span>
                                        {section.title}
                                    </h2>
                                    <div className="text-sm leading-relaxed">
                                        {parseContent(section.content)}
                                    </div>
                                </section>
                            );
                        })}
                    </div>

                    {/* Request Form */}
                    <div>
                        {!submitted ? (
                            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 sticky top-24">
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                    <span className="flex items-center justify-center w-8 h-8 bg-yellow-400/10 rounded-lg">
                                        <Mail className="text-yellow-400" size={18} />
                                    </span>
                                    {t('legal.requestDeletionButton')}
                                </h2>
                                
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            {t('legal.accountEmail')}
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            placeholder={t('legal.emailPlaceholder')}
                                            className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                                        />
                                        <p className="text-xs text-gray-600 mt-1">
                                            {t('legal.enterAccountEmail')}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            {t('legal.reasonOptional')}
                                        </label>
                                        <textarea
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            rows={4}
                                            placeholder={t('legal.reasonPlaceholder')}
                                            className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all resize-none"
                                        />
                                    </div>

                                    <div className="flex items-start gap-3 p-4 bg-white/[0.03] rounded-xl border border-white/[0.05]">
                                        <input
                                            type="checkbox"
                                            id="confirm"
                                            required
                                            className="mt-1 rounded border-gray-600 text-yellow-400 focus:ring-yellow-400"
                                        />
                                        <label htmlFor="confirm" className="text-sm text-gray-400">
                                            {t('legal.confirmPermanent')}
                                        </label>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                {t('legal.sending')}
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 size={18} />
                                                {t('legal.requestDeletionButton')}
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center sticky top-24">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-6">
                                    <CheckCircle className="text-green-400" size={32} />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-4">{t('legal.requestReceived')}</h2>
                                <p className="text-gray-400 mb-6">
                                    {t('legal.requestReceivedConfirmation')} <strong className="text-white">{email}</strong> {t('legal.requestReceivedNextSteps')}
                                </p>
                                <div className="bg-white/[0.03] rounded-xl p-4 text-left">
                                    <h3 className="font-semibold text-white mb-2">{t('legal.nextSteps')}</h3>
                                    <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
                                        <li>{t('legal.step1')}</li>
                                        <li>{t('legal.step2')}</li>
                                        <li>{t('legal.step3')}</li>
                                    </ol>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Contact Section */}
                {pageData.contactEmail && (
                    <section className="mt-12 bg-yellow-400/5 border border-yellow-400/20 rounded-2xl p-6 text-center">
                        <h2 className="text-xl font-bold text-white mb-3">{t('legal.needHelp')}</h2>
                        <p className="text-gray-400 mb-4">
                            {t('legal.deletionContactText')}
                        </p>
                        <a 
                            href={`mailto:${pageData.contactEmail}`}
                            className="inline-flex items-center gap-2 text-yellow-400 hover:text-yellow-300 font-medium"
                        >
                            <Mail size={18} />
                            {pageData.contactEmail}
                        </a>
                    </section>
                )}
            </main>
        </LegalPageLayout>
    );
};

export default DataDeletionPage;
