import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Filter, Search, Download, Plus, Mail, MessageSquare, Phone, TrendingUp, UserPlus, CheckCircle2 } from 'lucide-react';

interface LeadsManagerQuimeraProps {
    title?: string;
    subtitle?: string;
    features?: Array<{
        title: string;
        description: string;
        icon: string;
    }>;
    colors?: {
        background?: string;
        text?: string;
        accent?: string;
        cardBackground?: string;
        cardBorder?: string;
        cardText?: string;
        secondaryText?: string;
    };
    textDropShadow?: boolean;
    isPreviewMode?: boolean;
    imagePosition?: 'left' | 'right';
}

const iconMap: Record<string, React.FC<{ className?: string }>> = {
    Users, TrendingUp, UserPlus, Mail, MessageSquare, CheckCircle2
};

const LeadsManagerQuimera: React.FC<LeadsManagerQuimeraProps> = ({
    title,
    subtitle,
    features,
    colors = {},
    textDropShadow = false,
    isPreviewMode = false,
    imagePosition = 'right',
}) => {
    const { t } = useTranslation();
    const [activeFeature, setActiveFeature] = useState(0);
    const [mockLeads, setMockLeads] = useState<any[]>([
        { id: 1, name: "María Gómez", email: "maria@empresa.com", source: "Website Form", status: "new" },
        { id: 2, name: "Carlos Ruiz", email: "carlos.r@correo.com", source: "AI Chatbot", status: "contacted" },
        { id: 3, name: "Laura Sánchez", email: "lsanchez@gmail.com", source: "Facebook Ad", status: "qualified" }
    ]);

    const bgColor = colors.background || '#050505';
    const textColor = colors.text || '#ffffff';
    const accentColor = colors.accent || '#10B981'; // Emerald Green for Leads/Sales
    const cardBg = colors.cardBackground || 'rgba(255,255,255,0.02)';
    const cardBorder = colors.cardBorder || 'rgba(255,255,255,0.05)';
    const secondaryColor = colors.secondaryText || '#9ca3af';

    const displayTitle = title || t('quimera.leadsmanager.title', 'Convierte Visitas en Clientes');
    const displaySubtitle = subtitle || t('quimera.leadsmanager.subtitle', 'Centraliza todos tus contactos en un CRM nativo. Captura leads desde tu web, chatbot o enlaces externos y haz seguimiento sin perder ninguna oportunidad.');

    const getDefaultFeatures = (t: any) => [
        {
            title: t('quimera.leadsmanager.feat1.title', 'Bandeja Centralizada'),
            description: t('quimera.leadsmanager.feat1.desc', 'Todos los contactos generados por formularios y chatbots se guardan automáticamente en tu panel principal.'),
            icon: 'Users'
        },
        {
            title: t('quimera.leadsmanager.feat2.title', 'Enriquecimiento Automático'),
            description: t('quimera.leadsmanager.feat2.desc', 'La IA perfila a los prospectos y añade etiquetas según sus respuestas e intereses detectados.'),
            icon: 'TrendingUp'
        },
        {
            title: t('quimera.leadsmanager.feat3.title', 'Seguimiento Eficaz'),
            description: t('quimera.leadsmanager.feat3.desc', 'Añade notas, marca estados de negociación y no dejes que ningún contacto se enfríe.'),
            icon: 'CheckCircle2'
        }
    ];

    const displayFeatures = features && features.length > 0 ? features : getDefaultFeatures(t);

    // Simulate new lead coming in
    useEffect(() => {
        if (isPreviewMode) return;
        
        const interval = setInterval(() => {
            setMockLeads(prev => {
                const hasNew = prev.find(l => l.id === 4);
                if (hasNew) {
                    return prev.filter(l => l.id !== 4);
                } else {
                    return [{ id: 4, name: "Nuevo Prospecto", email: "nuevo@ejemplo.com", source: "AI Chatbot", status: "new", isNew: true }, ...prev];
                }
            });
            setActiveFeature((prev) => (prev + 1) % displayFeatures.length);
        }, 4000);

        return () => clearInterval(interval);
    }, [displayFeatures.length, isPreviewMode]);

    return (
        <section className="py-12 md:py-24 px-4 sm:px-6 relative overflow-hidden flex items-center" style={{ backgroundColor: bgColor, color: textColor, minHeight: '80vh' }}>
            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 right-0 w-[400px] h-[400px] rounded-full filter blur-[120px] opacity-20" style={{ backgroundColor: accentColor }}></div>
                <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full filter blur-[100px]"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto w-full">
                <div className={`flex flex-col ${imagePosition === 'left' ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 lg:gap-20 items-center`}>
                    
                    {/* Text & Tabs */}
                    <div className="w-full lg:w-1/2">
                        <div className="mb-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6 border" style={{ backgroundColor: `${accentColor}15`, color: accentColor, borderColor: `${accentColor}30` }}>
                                <Users className="w-4 h-4" />
                                {t('quimera.leadsmanager.badge', 'CRM & Leads')}
                            </div>
                            <h2 className={`text-4xl md:text-5xl lg:text-[3.5rem] font-black mb-6 tracking-tight leading-tight font-header ${textDropShadow ? 'drop-shadow-xl' : ''}`}
                                style={{ textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>
                                {displayTitle}
                            </h2>
                            <p className={`text-lg md:text-xl font-light font-body ${textDropShadow ? 'drop-shadow-md' : ''}`} style={{ color: secondaryColor }}>
                                {displaySubtitle}
                            </p>
                        </div>

                        {/* Interactive Tabs */}
                        <div className="space-y-3">
                            {displayFeatures.map((feature, idx) => {
                                const IconComp = iconMap[feature.icon] || UserPlus;
                                const isActive = activeFeature === idx;

                                return (
                                    <div 
                                        key={idx}
                                        onClick={() => setActiveFeature(idx)}
                                        className={`p-5 rounded-2xl cursor-pointer transition-all duration-300 border ${isActive ? 'translate-x-2' : 'hover:translate-x-1'}`}
                                        style={{
                                            backgroundColor: isActive ? `${accentColor}10` : cardBg,
                                            borderColor: isActive ? `${accentColor}50` : cardBorder,
                                        }}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 flex-shrink-0">
                                                <IconComp className="w-6 h-6" style={{ color: isActive ? accentColor : secondaryColor }} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold font-header heading-caps mb-1" style={{ color: isActive ? textColor : secondaryColor }}>
                                                    {feature.title}
                                                </h3>
                                                {isActive && (
                                                    <p className="text-sm font-light font-body animate-in fade-in duration-500" style={{ color: secondaryColor }}>
                                                        {feature.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Dynamic Mockup */}
                    <div className="w-full lg:w-1/2 relative mt-8 lg:mt-0">
                        {/* CRM Dashboard Mockup */}
                        <div 
                            className="relative rounded-2xl overflow-hidden shadow-2xl border h-[500px] flex flex-col"
                            style={{ 
                                backgroundColor: '#0A0A0A', 
                                borderColor: cardBorder,
                                boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px ${accentColor}15`
                            }}
                        >
                            {/* Toolbar */}
                            <div className="h-14 border-b flex items-center justify-between px-6" style={{ backgroundColor: '#111111', borderColor: cardBorder }}>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-bold text-gray-200">{t('quimera.leadsmanager.pipeline', 'Leads Pipeline')}</h3>
                                    <span className="bg-gray-800 text-gray-400 text-[10px] px-2 py-0.5 rounded-full">{mockLeads.length} {t('quimera.leadsmanager.total', 'Total')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-md bg-[#222] flex items-center justify-center border border-[#333]">
                                        <Search className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <div className="w-8 h-8 rounded-md bg-[#222] flex items-center justify-center border border-[#333]">
                                        <Filter className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <div className="px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 text-white" style={{ backgroundColor: accentColor }}>
                                        <Plus className="w-3 h-3" /> {t('quimera.leadsmanager.addLead', 'Add Lead')}
                                    </div>
                                </div>
                            </div>

                            {/* Column Headers */}
                            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b text-[10px] uppercase font-bold text-gray-500 tracking-wider" style={{ backgroundColor: '#0F0F0F', borderColor: cardBorder }}>
                                <div className="col-span-4">{t('quimera.leadsmanager.col.contact', 'Contact')}</div>
                                <div className="col-span-3">{t('quimera.leadsmanager.col.source', 'Source')}</div>
                                <div className="col-span-3">{t('quimera.leadsmanager.col.status', 'Status')}</div>
                                <div className="col-span-2 text-right">{t('quimera.leadsmanager.col.actions', 'Actions')}</div>
                            </div>

                            {/* Lead Rows */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {mockLeads.map((lead) => (
                                    <div key={lead.id} 
                                        className={`grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-xl border bg-[#141414] transition-all duration-500
                                        ${lead.isNew ? 'animate-in fade-in slide-in-from-top-4' : ''}`}
                                        style={{ 
                                            borderColor: lead.isNew ? accentColor : '#222',
                                            boxShadow: lead.isNew ? `0 0 15px ${accentColor}20` : 'none'
                                        }}
                                    >
                                        <div className="col-span-4 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-xs font-bold text-white border border-gray-600">
                                                {lead.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-200">{lead.name}</p>
                                                <p className="text-xs text-gray-500">{lead.email}</p>
                                            </div>
                                        </div>
                                        <div className="col-span-3">
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium bg-[#222] text-gray-300 border border-[#333]">
                                                {lead.source.includes('Chatbot') ? <MessageSquare className="w-3 h-3 text-blue-400" /> : <Mail className="w-3 h-3 text-yellow-400" />}
                                                {lead.source}
                                            </span>
                                        </div>
                                        <div className="col-span-3">
                                            {lead.status === 'new' && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">{t('quimera.leadsmanager.status.new', 'NEW')}</span>}
                                            {lead.status === 'contacted' && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">{t('quimera.leadsmanager.status.contacted', 'CONTACTED')}</span>}
                                            {lead.status === 'qualified' && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">{t('quimera.leadsmanager.status.qualified', 'QUALIFIED')}</span>}
                                        </div>
                                        <div className="col-span-2 flex justify-end gap-2">
                                            <button className="p-1.5 rounded-md hover:bg-[#222] text-gray-400 hover:text-white transition-colors">
                                                <Mail className="w-4 h-4" />
                                            </button>
                                            <button className="p-1.5 rounded-md hover:bg-[#222] text-gray-400 hover:text-white transition-colors">
                                                <Phone className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Mock Overlay Alert */}
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-[#222] border shadow-2xl rounded-lg px-4 py-3 flex items-center gap-3 animate-bounce"
                                 style={{ borderColor: `${accentColor}50` }}>
                                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accentColor }}></div>
                                <p className="text-xs font-semibold text-white">{t('quimera.leadsmanager.alert', 'AI Assistant just captured a new lead!')}</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default LeadsManagerQuimera;
