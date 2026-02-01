/**
 * Data Deletion Page
 * Public page explaining how users can request deletion of their data
 * Required by Meta for Facebook/Instagram app integration
 * Content is managed from Super Admin Content Management
 */

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Trash2, Shield, Mail, CheckCircle, AlertTriangle, Clock, FileText, Settings, Loader2, Globe, Database, Eye, Users, Lock } from 'lucide-react';
import { useSafeAppContent } from '../../contexts/appContent';
import { LegalPage, DEFAULT_DATA_DELETION } from '../../types/appContent';

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
    const appContent = useSafeAppContent();
    const [pageData, setPageData] = useState<LegalPage | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Form state
    const [email, setEmail] = useState('');
    const [reason, setReason] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        // Try to get data from context, otherwise use defaults
        if (appContent) {
            const page = appContent.getLegalPageByType('data-deletion');
            setPageData(page || DEFAULT_DATA_DELETION);
        } else {
            setPageData(DEFAULT_DATA_DELETION);
        }
        setIsLoading(false);
    }, [appContent]);

    const handleBack = () => {
        window.history.back();
    };

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
                                <CheckCircle className="text-green-400 mt-0.5 flex-shrink-0" size={18} />
                                <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
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
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-2xl mb-6">
                        <Trash2 className="text-red-400" size={32} />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-4">{pageData.title}</h1>
                    {pageData.subtitle && (
                        <p className="text-slate-400 max-w-2xl mx-auto">{pageData.subtitle}</p>
                    )}
                </div>

                {/* Info Cards */}
                <div className="grid md:grid-cols-3 gap-4 mb-12">
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 text-center">
                        <Clock className="mx-auto mb-3 text-indigo-400" size={24} />
                        <h3 className="font-semibold text-white mb-1">Tiempo de Proceso</h3>
                        <p className="text-sm text-slate-400">Hasta 30 días hábiles</p>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 text-center">
                        <Shield className="mx-auto mb-3 text-green-400" size={24} />
                        <h3 className="font-semibold text-white mb-1">Eliminación Completa</h3>
                        <p className="text-sm text-slate-400">Todos sus datos serán eliminados</p>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 text-center">
                        <Mail className="mx-auto mb-3 text-blue-400" size={24} />
                        <h3 className="font-semibold text-white mb-1">Confirmación</h3>
                        <p className="text-sm text-slate-400">Recibirá email de confirmación</p>
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
                                            ? 'bg-amber-500/10 border border-amber-500/30' 
                                            : 'bg-slate-800/50 border border-slate-700/50'
                                    }`}
                                >
                                    <h2 className={`text-lg font-bold mb-3 flex items-center gap-2 ${isWarning ? 'text-amber-400' : 'text-white'}`}>
                                        <IconComponent size={20} />
                                        {section.title}
                                    </h2>
                                    <div className={`text-sm leading-relaxed ${isWarning ? 'text-slate-300' : 'text-slate-300'}`}>
                                        {parseContent(section.content)}
                                    </div>
                                </section>
                            );
                        })}
                    </div>

                    {/* Request Form */}
                    <div>
                        {!submitted ? (
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 sticky top-24">
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <Mail className="text-indigo-400" size={20} />
                                    Solicitar Eliminación
                                </h2>
                                
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Email de la cuenta *
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            placeholder="tu@email.com"
                                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">
                                            Ingrese el email asociado a su cuenta de Quimera AI
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Motivo de la solicitud (opcional)
                                        </label>
                                        <textarea
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            rows={4}
                                            placeholder="Cuéntenos por qué desea eliminar sus datos..."
                                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                                        />
                                    </div>

                                    <div className="flex items-start gap-3 p-4 bg-slate-700/30 rounded-xl">
                                        <input
                                            type="checkbox"
                                            id="confirm"
                                            required
                                            className="mt-1 rounded border-slate-500 text-indigo-500 focus:ring-indigo-500"
                                        />
                                        <label htmlFor="confirm" className="text-sm text-slate-300">
                                            Entiendo que esta acción es <strong>permanente e irreversible</strong> y 
                                            que todos mis datos serán eliminados.
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
                                                Enviando...
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 size={18} />
                                                Solicitar Eliminación
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
                                <h2 className="text-2xl font-bold text-white mb-4">Solicitud Recibida</h2>
                                <p className="text-slate-300 mb-6">
                                    Hemos recibido su solicitud de eliminación de datos. 
                                    Recibirá un email de confirmación en <strong>{email}</strong> 
                                    con los próximos pasos.
                                </p>
                                <div className="bg-slate-800/50 rounded-xl p-4 text-left">
                                    <h3 className="font-semibold text-white mb-2">Próximos pasos:</h3>
                                    <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
                                        <li>Verifique su email y confirme la solicitud</li>
                                        <li>Procesaremos su solicitud en hasta 30 días</li>
                                        <li>Recibirá confirmación cuando se complete</li>
                                    </ol>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Contact Section */}
                {pageData.contactEmail && (
                    <section className="mt-12 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl p-6 text-center">
                        <h2 className="text-xl font-bold text-white mb-3">¿Necesita ayuda?</h2>
                        <p className="text-slate-300 mb-4">
                            Si tiene preguntas sobre la eliminación de datos o necesita asistencia, contáctenos:
                        </p>
                        <a 
                            href={`mailto:${pageData.contactEmail}`}
                            className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                            <Mail size={18} />
                            {pageData.contactEmail}
                        </a>
                    </section>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-700/50 py-8 mt-12">
                <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-sm">
                    <p>© {new Date().getFullYear()} Quimera AI. Todos los derechos reservados.</p>
                    <a href="/privacy-policy" className="hover:text-white transition-colors">
                        Política de Privacidad
                    </a>
                </div>
            </footer>
        </div>
    );
};

export default DataDeletionPage;
