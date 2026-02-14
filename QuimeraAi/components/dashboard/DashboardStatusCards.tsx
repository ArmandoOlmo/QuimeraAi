
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ShoppingBag, PenTool, Users, ImageIcon, Link2, Calendar, ArrowRight, ChevronDown } from 'lucide-react';
import { useProject } from '../../contexts/project';
import { useDomains } from '../../contexts/domains/DomainsContext';
import { useCMS } from '../../contexts/cms';
import { useCRM } from '../../contexts/crm/CRMContext';
import { useAppointments } from '../dashboard/appointments';
import { useFiles } from '../../contexts/files';
import { useServiceAvailability } from '../../hooks/useServiceAvailability';
import { usePlanAccess } from '../../hooks/usePlanFeatures';
import { useRouter } from '../../hooks/useRouter';
import { ROUTES } from '../../routes/config';
import { PlatformServiceId } from '../../types/serviceAvailability';
import { PlanFeatures } from '../../types/subscription';

// ─── Card definition ─────────────────────────────────────────────────────────
interface StatusCardDef {
    id: string;
    icon: React.ElementType;
    titleKey: string;
    subtitleKey: string;
    route: string;
    serviceId?: PlatformServiceId;
    requiredFeature?: keyof PlanFeatures;
    /** Gradient accent colours (from / to) for the decorative blob */
    gradientFrom: string;
    gradientTo: string;
}

// ─── Fallback translations (used when i18n keys haven't been loaded) ─────────
const FB: Record<string, { title: string; desc: string }> = {
    websites: { title: 'Sitios Web', desc: 'Tus proyectos de sitios web' },
    ecommerce: { title: 'E-commerce', desc: 'Tu tienda online' },
    cms: { title: 'CMS', desc: 'Blog y contenido' },
    leads: { title: 'Leads / CRM', desc: 'Gestión de contactos' },
    images: { title: 'Imágenes', desc: 'Biblioteca de imágenes' },
    domains: { title: 'Dominios', desc: 'Dominios personalizados' },
    appointments: { title: 'Citas', desc: 'Agenda de reservas' },
};

const CARD_DEFS: StatusCardDef[] = [
    {
        id: 'websites',
        icon: Globe,
        titleKey: 'dashboard.statusCards.websites',
        subtitleKey: 'dashboard.statusCards.websitesDesc',
        route: ROUTES.WEBSITES,
        gradientFrom: 'from-orange-500',
        gradientTo: 'to-amber-400',
    },
    {
        id: 'ecommerce',
        icon: ShoppingBag,
        titleKey: 'dashboard.statusCards.ecommerce',
        subtitleKey: 'dashboard.statusCards.ecommerceDesc',
        route: ROUTES.ECOMMERCE,
        serviceId: 'ecommerce',
        requiredFeature: 'ecommerceEnabled',
        gradientFrom: 'from-violet-500',
        gradientTo: 'to-fuchsia-400',
    },
    {
        id: 'cms',
        icon: PenTool,
        titleKey: 'dashboard.statusCards.cms',
        subtitleKey: 'dashboard.statusCards.cmsDesc',
        route: ROUTES.CMS,
        serviceId: 'cms',
        requiredFeature: 'cmsEnabled',
        gradientFrom: 'from-sky-500',
        gradientTo: 'to-cyan-400',
    },
    {
        id: 'leads',
        icon: Users,
        titleKey: 'dashboard.statusCards.leads',
        subtitleKey: 'dashboard.statusCards.leadsDesc',
        route: ROUTES.LEADS,
        serviceId: 'crm',
        requiredFeature: 'crmEnabled',
        gradientFrom: 'from-emerald-500',
        gradientTo: 'to-green-400',
    },
    {
        id: 'images',
        icon: ImageIcon,
        titleKey: 'dashboard.statusCards.images',
        subtitleKey: 'dashboard.statusCards.imagesDesc',
        route: ROUTES.ASSETS,
        gradientFrom: 'from-violet-500',
        gradientTo: 'to-purple-400',
    },
    {
        id: 'domains',
        icon: Link2,
        titleKey: 'dashboard.statusCards.domains',
        subtitleKey: 'dashboard.statusCards.domainsDesc',
        route: ROUTES.DOMAINS,
        serviceId: 'domains',
        requiredFeature: 'customDomains',
        gradientFrom: 'from-rose-500',
        gradientTo: 'to-pink-400',
    },
    {
        id: 'appointments',
        icon: Calendar,
        titleKey: 'dashboard.statusCards.appointments',
        subtitleKey: 'dashboard.statusCards.appointmentsDesc',
        route: ROUTES.APPOINTMENTS,
        serviceId: 'appointments',
        gradientFrom: 'from-indigo-500',
        gradientTo: 'to-blue-400',
    },
];

// ─── Component ───────────────────────────────────────────────────────────────
const DashboardStatusCards: React.FC = () => {
    const { t } = useTranslation();
    const { projects } = useProject();
    const { domains } = useDomains();
    const { cmsPosts } = useCMS();
    const { leads } = useCRM();
    const { files } = useFiles();
    const { appointments } = useAppointments();
    const { canAccessService, isLoading: isLoadingService } = useServiceAvailability();
    const { hasAccess, isLoading: isLoadingPlan } = usePlanAccess();
    const { navigate } = useRouter();

    // ── Metric helpers ───────────────────────────────────────────────────────
    const userProjects = projects.filter(p => p.status !== 'Template');
    const publishedCount = userProjects.filter(p => p.status === 'Published' || (p as any).published).length;
    const activeDomains = domains.filter(d => d.status === 'active' || d.status === 'deployed').length;

    const getMetric = (id: string): { value: string; label: string } => {
        switch (id) {
            case 'websites':
                return { value: String(userProjects.length), label: `${publishedCount} ${t('dashboard.published', 'Publicados')}` };
            case 'cms':
                return { value: String(cmsPosts.length), label: t('dashboard.statusCards.posts', 'Posts') };
            case 'leads':
                return { value: String(leads.length), label: t('dashboard.statusCards.contacts', 'Contactos') };
            case 'images': {
                const imageFiles = files.filter(f => f.type?.startsWith('image/'));
                return { value: String(imageFiles.length), label: t('dashboard.statusCards.uploaded', 'Subidas') };
            }
            case 'domains':
                return { value: String(activeDomains), label: t('dashboard.statusCards.active', 'Activos') };
            case 'ecommerce':
                return { value: '→', label: t('dashboard.statusCards.manage', 'Gestionar') };
            case 'appointments':
                return { value: String(appointments.length), label: t('dashboard.statusCards.scheduled', 'Programadas') };
            default:
                return { value: '—', label: '' };
        }
    };

    // ── Filter cards by service & plan access ─────────────────────────────
    const visibleCards = CARD_DEFS.filter(card => {
        // Websites always visible
        if (!card.serviceId && !card.requiredFeature) return true;
        // While loading, optimistically show
        if (isLoadingService || isLoadingPlan) return true;
        // Service availability
        if (card.serviceId && !canAccessService(card.serviceId)) return false;
        // Plan feature
        if (card.requiredFeature && !hasAccess(card.requiredFeature)) return false;
        return true;
    });


    // ── Collapse state (persisted) ────────────────────────────────────────
    const [isCollapsed, setIsCollapsed] = useState(() => {
        try { return localStorage.getItem('dashboard-cards-collapsed') === 'true'; } catch { return false; }
    });
    const toggleCollapsed = () => {
        setIsCollapsed(prev => {
            const next = !prev;
            try { localStorage.setItem('dashboard-cards-collapsed', String(next)); } catch { }
            return next;
        });
    };

    return (
        <div>
            {/* Toggle header */}
            <button
                onClick={toggleCollapsed}
                className="flex items-center gap-2 mb-3 group/toggle cursor-pointer
                           text-muted-foreground hover:text-foreground transition-colors duration-200"
                aria-expanded={!isCollapsed}
                aria-label={isCollapsed ? t('dashboard.statusCards.expand', 'Expandir') : t('dashboard.statusCards.collapse', 'Minimizar')}
            >
                <ChevronDown
                    className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
                />
                <span className="text-xs font-medium uppercase tracking-wider">
                    {t('dashboard.statusCards.sectionTitle', 'Resumen')}
                </span>
            </button>

            {/* Collapsible grid */}
            <div
                className="transition-all duration-400 ease-in-out overflow-hidden"
                style={{
                    maxHeight: isCollapsed ? '0px' : '600px',
                    opacity: isCollapsed ? 0 : 1,
                }}
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visibleCards.map((card, idx) => {
                        const Icon = card.icon;
                        const metric = getMetric(card.id);

                        return (
                            <button
                                key={card.id}
                                onClick={() => navigate(card.route)}
                                className="group relative overflow-hidden rounded-2xl border border-white/[0.08] dark:border-white/[0.06]
                                   bg-card/60 dark:bg-card/40 backdrop-blur-xl
                                   p-5 text-left min-h-[140px]
                                   shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]
                                   hover:scale-[1.03] hover:shadow-xl hover:shadow-primary/10
                                   transition-all duration-300 ease-out
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                                style={{ animationDelay: `${idx * 60}ms` }}
                                aria-label={t(card.titleKey)}
                            >
                                {/* ── Gradient blob decoration ─────────────────────────────── */}
                                <div
                                    className={`absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-30 dark:opacity-20 blur-2xl
                                        bg-gradient-to-br ${card.gradientFrom} ${card.gradientTo}
                                        group-hover:opacity-50 dark:group-hover:opacity-35
                                        group-hover:scale-110 transition-all duration-500`}
                                    aria-hidden="true"
                                />


                                {/* ── Big number + label (right side, bottom-aligned) ──────── */}
                                <div className="absolute right-4 bottom-3 flex items-end gap-1.5 select-none pointer-events-none">
                                    <span className="text-xs font-semibold text-muted-foreground/60 dark:text-muted-foreground/50 mb-1">
                                        {metric.label}
                                    </span>
                                    <span
                                        className="leading-[0.85]
                                           text-foreground/[0.08] dark:text-white/[0.10]
                                           group-hover:text-foreground/[0.14] dark:group-hover:text-white/[0.16]
                                           transition-colors duration-500"
                                        style={{ fontFamily: "'Fira Sans Extra Condensed', sans-serif", fontWeight: 100, fontSize: 'clamp(5rem, 8vw, 9rem)' }}
                                    >
                                        {metric.value}
                                    </span>
                                </div>

                                {/* ── Left content ─────────────────────────────────────────── */}
                                <div className="relative z-10 flex flex-col h-full">
                                    {/* Header */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`flex items-center justify-center w-10 h-10 rounded-xl
                                                bg-gradient-to-br ${card.gradientFrom} ${card.gradientTo}
                                                shadow-lg shadow-black/10`}>
                                            <Icon className="w-5 h-5 text-white" strokeWidth={2} />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-bold text-foreground truncate">{t(card.titleKey, FB[card.id]?.title ?? card.id)}</span>
                                            <span className="text-[11px] text-muted-foreground truncate">{t(card.subtitleKey, FB[card.id]?.desc ?? '')}</span>
                                        </div>
                                    </div>



                                    {/* Action link */}
                                    <div className="flex items-center gap-1 mt-auto pt-3">
                                        <span className="text-xs font-semibold text-primary group-hover:underline">
                                            {t('dashboard.statusCards.viewDetails', 'Ver detalles')}
                                        </span>
                                        <ArrowRight className="w-3.5 h-3.5 text-primary group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default DashboardStatusCards;
