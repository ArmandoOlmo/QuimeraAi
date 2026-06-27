
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
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
import { dashboardCardVariants, dashboardContainerVariants } from './dashboardMotion';

// ─── Card definition ─────────────────────────────────────────────────────────
interface StatusCardDef {
    id: string;
    icon: React.ElementType;
    titleKey: string;
    subtitleKey: string;
    route: string;
    serviceId?: PlatformServiceId;
    requiredFeature?: keyof PlanFeatures;
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
    },
    {
        id: 'ecommerce',
        icon: ShoppingBag,
        titleKey: 'dashboard.statusCards.ecommerce',
        subtitleKey: 'dashboard.statusCards.ecommerceDesc',
        route: ROUTES.ECOMMERCE,
        serviceId: 'ecommerce',
        requiredFeature: 'ecommerceEnabled',
    },
    {
        id: 'cms',
        icon: PenTool,
        titleKey: 'dashboard.statusCards.cms',
        subtitleKey: 'dashboard.statusCards.cmsDesc',
        route: ROUTES.CMS,
        serviceId: 'cms',
        requiredFeature: 'cmsEnabled',
    },
    {
        id: 'leads',
        icon: Users,
        titleKey: 'dashboard.statusCards.leads',
        subtitleKey: 'dashboard.statusCards.leadsDesc',
        route: ROUTES.LEADS,
        serviceId: 'crm',
        requiredFeature: 'crmEnabled',
    },
    {
        id: 'images',
        icon: ImageIcon,
        titleKey: 'dashboard.statusCards.images',
        subtitleKey: 'dashboard.statusCards.imagesDesc',
        route: ROUTES.ASSETS,
        serviceId: 'aiFeatures',
    },
    {
        id: 'domains',
        icon: Link2,
        titleKey: 'dashboard.statusCards.domains',
        subtitleKey: 'dashboard.statusCards.domainsDesc',
        route: ROUTES.DOMAINS,
        serviceId: 'domains',
        requiredFeature: 'customDomains',
    },
    {
        id: 'appointments',
        icon: Calendar,
        titleKey: 'dashboard.statusCards.appointments',
        subtitleKey: 'dashboard.statusCards.appointmentsDesc',
        route: ROUTES.APPOINTMENTS,
        serviceId: 'appointments',
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
    const { isServicePublic, isLoading: isLoadingService } = useServiceAvailability();
    const { hasAccess, isLoading: isLoadingPlan } = usePlanAccess();
    const { navigate } = useRouter();
    const shouldReduceMotion = useReducedMotion();

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
        if (card.serviceId && isLoadingService) return false;
        if (card.requiredFeature && isLoadingPlan) return true;
        // Service availability
        if (card.serviceId && !isServicePublic(card.serviceId)) return false;
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
                           text-q-text-muted hover:text-foreground transition-colors duration-200"
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

            {/* Collapsible grid — padding + overflow-visible when open so hover shadows are not clipped */}
            <div
                className={`transition-all duration-400 ease-in-out ${isCollapsed ? 'overflow-hidden' : 'overflow-visible'}`}
                style={{
                    maxHeight: isCollapsed ? '0px' : '640px',
                    opacity: isCollapsed ? 0 : 1,
                }}
            >
                <motion.div
                    className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 py-1 pb-4"
                    initial={shouldReduceMotion ? false : 'hidden'}
                    animate={isCollapsed ? 'hidden' : 'show'}
                    variants={dashboardContainerVariants}
                >
                    {visibleCards.map((card) => {
                        const Icon = card.icon;
                        const metric = getMetric(card.id);

                        return (
                            <motion.div key={card.id} className="h-full" variants={dashboardCardVariants}>
                                <button
                                    onClick={() => navigate(card.route)}
                                    className="quimera-status-card-surface group relative h-full w-full overflow-hidden rounded-[var(--radius-card)] border border-border-subtle
                                       bg-q-surface dark:bg-q-surface/40
                                       p-3 sm:p-5 text-left min-h-[100px] sm:min-h-[140px]
                                       shadow-[var(--shadow-card)] hover:-translate-y-0.5 hover:border-q-border hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 ease-out
                                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q-accent/35"
                                    aria-label={t(card.titleKey)}
                                >
                                    {/* ── Gradient blob decoration ─────────────────────────────── */}
                                    <div
                                        className="quimera-status-card-accent-bg quimera-status-card-blob absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl
                                            group-hover:scale-110 transition-all duration-500"
                                        aria-hidden="true"
                                    />


                                    {/* ── Big number + label (right side, bottom-aligned) ──────── */}
                                    <div className="absolute right-2 sm:right-4 bottom-1 sm:bottom-3 flex items-end gap-1 sm:gap-1.5 select-none pointer-events-none">
                                        <span className="text-[9px] sm:text-xs font-semibold text-q-text-muted/80 dark:text-q-text-muted/50 mb-0.5 sm:mb-1 hidden sm:inline">
                                            {metric.label}
                                        </span>
                                        <span
                                            className="quimera-status-card-watermark leading-[0.85]"
                                            style={{ fontFamily: "'Fira Sans Extra Condensed', sans-serif", fontWeight: 100, fontSize: 'clamp(3rem, 8vw, 9rem)' }}
                                        >
                                            {metric.value}
                                        </span>
                                    </div>

                                    {/* ── Left content ─────────────────────────────────────────── */}
                                    <div className="relative z-10 flex flex-col h-full">
                                        {/* Header */}
                                        <div className="mb-1 sm:mb-3 min-w-0">
                                            <div className="mb-1 md:mb-2">
                                                <Icon className="icon-lg quimera-dashboard-header-icon" strokeWidth={2} />
                                            </div>
                                            <span className="text-xs sm:text-sm font-bold text-foreground truncate block">{t(card.titleKey, FB[card.id]?.title ?? card.id)}</span>
                                            <span className="text-[9px] sm:text-[11px] text-q-text-muted truncate block">{t(card.subtitleKey, FB[card.id]?.desc ?? '')}</span>
                                        </div>



                                        {/* Action link */}
                                        <div className="flex items-center gap-1 mt-auto pt-1 sm:pt-3">
                                            <span className="quimera-status-card-link text-[10px] sm:text-xs font-semibold group-hover:underline">
                                                {t('dashboard.statusCards.viewDetails', 'Ver detalles')}
                                            </span>
                                            <ArrowRight className="quimera-status-card-link w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </button>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>
        </div>
    );
};

export default DashboardStatusCards;
