import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../../contexts/core/AuthContext';
import { useUI } from '../../contexts/core/UIContext';
import { useSafeTenant } from '../../contexts/tenant/TenantContext';
import { useSafeUpgrade } from '../../contexts/UpgradeContext';
import { usePlans } from '../../contexts/PlansContext';
import { useCreditsUsage } from '../../hooks/useCreditsUsage';
import { usePersistedBoolean } from '../../hooks/usePersistedState';
import { useAppLogo } from '../../hooks/useAppLogo';
import { useRouter } from '../../hooks/useRouter';
import { ROUTES } from '../../routes/config';
import {
    buildDashboardAssistantEntryMetadata,
    createGlobalAssistantEntryPayload,
    dispatchGlobalAssistantEntryRequest,
    getDashboardAssistantQuickActions,
    type DashboardAssistantQuickAction,
    routeDashboardAssistantEntry,
} from '../../services/globalAssistant/globalAssistantEntryBridge';
import { SUBSCRIPTION_PLANS } from '../../types/subscription';
import DashboardStatusCards from './DashboardStatusCards';
import { dashboardContainerVariants, dashboardItemVariants } from './dashboardMotion';
import { ArrowUp, Crown, ChevronUp, ChevronDown, AlertTriangle, Mic, Plus, Sparkles, Globe2, Image, Mail, ShoppingBag, Users, ShieldAlert } from 'lucide-react';
import { AppButton } from '../ui/system';

interface DashboardWelcomeProps {
    allUserProjectsCount: number;
}

/**
 * DashboardWelcome
 *
 * Hero/Welcome section with greeting, CTA buttons (new project + upgrade),
 * subtitle, and status cards. Extracted from Dashboard.tsx lines 449-559.
 */
const DashboardWelcome: React.FC<DashboardWelcomeProps> = ({ allUserProjectsCount }) => {
    const { t } = useTranslation();
    const { userDocument, canAccessSuperAdmin } = useAuth();
    const { setIsOnboardingOpen, setOnboardingMode } = useUI();
    const tenantContext = useSafeTenant();
    const upgradeContext = useSafeUpgrade();
    const { plansArray, getPlan } = usePlans();
    const { usage } = useCreditsUsage();
    const { logoUrl: appLogoUrl } = useAppLogo();
    const { navigate } = useRouter();
    const shouldReduceMotion = useReducedMotion();

    const [upgradeMinimized, setUpgradeMinimized] = usePersistedBoolean('quimera_upgrade_minimized', false);
    const [aiPrompt, setAiPrompt] = useState('');

    const toggleUpgradeMinimized = () => setUpgradeMinimized((prev) => !prev);
    const userRole = String(userDocument?.role || '').toLowerCase();
    const tenantRole = String(tenantContext?.currentMembership?.role || '').toLowerCase();
    const canUseAdminQuickActions = canAccessSuperAdmin
        || userRole === 'owner'
        || userRole === 'superadmin'
        || userRole === 'super_admin'
        || tenantRole === 'agency_owner';

    // Determine next plan for upgrade button
    const currentPlanId = usage?.planId || 'free';
    const currentPlan = getPlan(currentPlanId) || SUBSCRIPTION_PLANS[currentPlanId] || SUBSCRIPTION_PLANS.free;
    const nextPlan = useMemo(() => {
        const currentIndex = plansArray.findIndex((p) => p.id === currentPlanId);
        if (currentIndex !== -1 && currentIndex < plansArray.length - 1) {
            return plansArray[currentIndex + 1];
        } else if (currentIndex === -1) {
            return plansArray.find((p) => p.price.monthly > currentPlan.price.monthly) || null;
        }
        return null;
    }, [plansArray, currentPlanId, currentPlan]);
    const quickActions = useMemo(() => getDashboardAssistantQuickActions({
        hasProjects: allUserProjectsCount > 0,
        canUseAdminMode: canUseAdminQuickActions,
    }), [allUserProjectsCount, canUseAdminQuickActions]);

    const handleUpgradeClick = () => {
        if (upgradeContext) {
            upgradeContext.openUpgradeModal('generic');
        }
    };

    const handleOpenAIStudio = (initialPrompt?: string, startVoice = false) => {
        const prompt = initialPrompt?.trim();
        if (prompt) {
            localStorage.setItem('aiStudioInitialPrompt', prompt);
        }
        if (startVoice) {
            localStorage.setItem('aiStudioStartVoice', 'true');
        }
        setOnboardingMode('ai-studio');
        localStorage.setItem('onboardingMode', 'ai-studio');
        setIsOnboardingOpen(true);
    };

    const handlePromptSubmit = (event?: React.FormEvent) => {
        event?.preventDefault();
        const request = aiPrompt.trim();
        const route = routeDashboardAssistantEntry(request);

        if (route.destination === 'none') {
            setAiPrompt('');
            return;
        }

        if (route.destination === 'ai_studio') {
            handleOpenAIStudio(route.forwardPromptToAiStudio ? request : undefined);
        } else {
            dispatchGlobalAssistantEntryRequest(createGlobalAssistantEntryPayload(request, {
                source: 'dashboard_welcome',
                surface: 'dashboard',
                metadata: buildDashboardAssistantEntryMetadata({
                    entryPoint: 'dashboard_input',
                    projectCount: allUserProjectsCount,
                    routingReason: route.reason,
                }),
            }));
        }

        setAiPrompt('');
    };

    const quickActionIcon = (action: DashboardAssistantQuickAction) => {
        if (action.id === 'create_website') return <Globe2 size={13} className="text-q-accent" aria-hidden="true" />;
        if (action.id === 'generate_hero_image') return <Image size={13} className="text-q-accent" aria-hidden="true" />;
        if (action.id === 'review_leads') return <Users size={13} className="text-q-accent" aria-hidden="true" />;
        if (action.id === 'create_email') return <Mail size={13} className="text-q-accent" aria-hidden="true" />;
        if (action.id === 'open_ecommerce') return <ShoppingBag size={13} className="text-q-accent" aria-hidden="true" />;
        if (action.id === 'review_platform_errors') return <ShieldAlert size={13} className="text-q-accent" aria-hidden="true" />;
        return <Sparkles size={13} className="text-q-accent" aria-hidden="true" />;
    };

    const handleQuickAction = (action: DashboardAssistantQuickAction) => {
        const request = t(action.promptKey, action.promptFallback);
        dispatchGlobalAssistantEntryRequest(createGlobalAssistantEntryPayload(request, {
            source: 'dashboard_quick_action',
            surface: action.module === 'admin' ? 'admin' : 'dashboard',
            metadata: buildDashboardAssistantEntryMetadata({
                entryPoint: 'dashboard_quick_action',
                projectCount: allUserProjectsCount,
                routingReason: 'dashboard_quick_action_routes_to_global_operating_layer',
                quickAction: action,
            }),
        }));
    };

    const showUpgradeButton = !canAccessSuperAdmin && nextPlan && currentPlanId !== 'enterprise';
    const planNeedsAttention = !canAccessSuperAdmin && (
        usage?.requiresPayment ||
        ['expired', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'cancelled', 'canceled'].includes(usage?.status || '')
    );

    const handlePlanAttentionClick = () => {
        navigate(ROUTES.SETTINGS_SUBSCRIPTION);
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('dashboard.goodMorning');
        if (hour < 18) return t('dashboard.goodAfternoon');
        return t('dashboard.goodEvening');
    };

    return (
        <motion.section
            className="w-full"
            initial={shouldReduceMotion ? false : 'hidden'}
            animate="show"
            variants={dashboardContainerVariants}
        >
            <div className="flex flex-col justify-center py-3 lg:py-6">
                {/* Greeting Header with CTA */}
                <motion.div
                    className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 lg:gap-6 mb-3 lg:mb-4 overflow-visible"
                    variants={dashboardItemVariants}
                >
                    <h1 className="text-2xl sm:text-4xl md:text-6xl font-extrabold tracking-tight text-q-text flex items-center flex-wrap">
                        {/* Logo - conditional: tenant logo > App logo */}
                        {tenantContext?.currentTenant?.branding?.logoUrl ? (
                            <img
                                src={tenantContext.currentTenant.branding.logoUrl}
                                alt={tenantContext.currentTenant.branding.companyName || 'Logo'}
                                className="w-9 h-9 sm:w-12 sm:h-12 md:w-16 md:h-16 object-contain mr-2 sm:mr-4 drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]"
                                width={64}
                                height={64}
                                loading="eager"
                                decoding="async"
                            />
                        ) : (
                            <img
                                src={appLogoUrl}
                                alt="App Logo"
                                className="w-9 h-9 sm:w-12 sm:h-12 md:w-16 md:h-16 object-contain mr-2 sm:mr-4 drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]"
                                width={64}
                                height={64}
                                loading="eager"
                                decoding="async"
                            />
                        )}
                        <span>
                            {getGreeting()},{' '}
                            <span className="quimera-user-name-highlight">
                                {userDocument?.name?.split(' ')[0] || 'Creator'}
                            </span>
                            .
                        </span>
                    </h1>

                    {/* Right-side account CTAs */}
                    {(planNeedsAttention || showUpgradeButton) && (
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:gap-3 flex-shrink-0 py-1 pb-3 overflow-visible">
                        {planNeedsAttention && (
                            <AppButton
                                variant="danger"
                                onClick={handlePlanAttentionClick}
                                className="group relative flex !h-auto items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-q-error text-white font-bold rounded-[var(--radius-card)] border border-q-error/35 !shadow-sm hover:!opacity-90 transition-all duration-200 lg:hover:scale-[1.01] flex-1 sm:flex-initial"
                                aria-label={t('dashboard.planExpiredTitle', 'Tu plan está expirado')}
                            >
                                <AlertTriangle className="icon-lg flex-shrink-0" aria-hidden="true" />
                                <div className="flex flex-col items-start text-left min-w-0">
                                    <span className="text-sm sm:text-lg leading-tight">
                                        {t('dashboard.planExpiredTitle', 'Tu plan está expirado')}
                                    </span>
                                    <span className="text-[10px] sm:text-xs opacity-85 font-medium text-left truncate">
                                        {t('dashboard.planExpiredDesc', 'Actualiza tu plan para seguir usando Quimera')} →
                                    </span>
                                </div>
                            </AppButton>
                        )}

                        {/* Upgrade Plan CTA - Minimizable */}
                        {showUpgradeButton &&
                            (upgradeMinimized ? (
                                /* Minimized pill */
                                <AppButton
                                    variant="premium"
                                    onClick={toggleUpgradeMinimized}
                                    className="quimera-dashboard-upgrade-cta group relative flex !h-auto items-center justify-center gap-2 px-6 py-3 font-semibold rounded-[var(--radius-card)] border border-q-accent/35 !shadow-sm transition-all duration-200 hover:scale-[1.01]"
                                    aria-label={t('dashboard.upgradeNow')}
                                >
                                    <Crown className="icon-sm" aria-hidden="true" />
                                    <span className="text-sm">{t('dashboard.upgradeNow')}</span>
                                    <ChevronDown className="icon-xs opacity-60" aria-hidden="true" />
                                </AppButton>
                            ) : (
                                /* Expanded upgrade button */
                                <div className="relative">
                                    <AppButton
                                        variant="premium"
                                        onClick={handleUpgradeClick}
                                        className="quimera-dashboard-upgrade-cta group relative flex !h-auto items-center gap-3 px-6 py-4 w-full font-bold rounded-[var(--radius-card)] border border-q-accent/35 !shadow-sm transition-all duration-200 hover:scale-[1.01]"
                                        aria-label={t('dashboard.upgradeNow')}
                                    >
                                        <Crown className="icon-lg flex-shrink-0" aria-hidden="true" />
                                        <div className="flex flex-col items-start text-left">
                                            <span className="text-lg leading-tight">{nextPlan.name}</span>
                                            <span className="text-xs opacity-80 font-medium text-left">
                                                ${nextPlan.price.monthly}/{t('dashboard.perMonth')} ·{' '}
                                                {t('dashboard.upgradeNow')}
                                            </span>
                                        </div>
                                    </AppButton>
                                    {/* Minimize toggle */}
                                    <AppButton
                                        variant="icon"
                                        size="icon-sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleUpgradeMinimized();
                                        }}
                                        className="absolute -top-1.5 -right-1.5 !h-6 !w-6 flex items-center justify-center bg-q-surface-overlay/90 border border-border-subtle rounded-full text-q-text-muted hover:text-q-text hover:bg-q-surface-overlay transition-colors shadow-[var(--shadow-card)] z-10"
                                        aria-label="Minimize"
                                    >
                                    <ChevronUp className="size-3.5" />
                                    </AppButton>
                                </div>
                            ))}
                    </div>
                    )}
                </motion.div>

                <motion.p
                    className="text-sm sm:text-lg text-q-text-muted max-w-3xl mb-4 lg:mb-8 leading-relaxed"
                    variants={dashboardItemVariants}
                >
                    {t('dashboard.heroSubtitlePart1')}{' '}
                    <span className="text-q-text font-semibold">
                        {allUserProjectsCount} {t('dashboard.heroSubtitlePart2')}
                    </span>{' '}
                    {t('dashboard.heroSubtitlePart3')}
                </motion.p>

                <form
                    onSubmit={handlePromptSubmit}
                    className="quimera-ai-launcher quimera-ai-launcher-enter mx-auto mt-2 mb-6 w-full max-w-3xl lg:mt-4 lg:mb-10"
                >
                    <label className="sr-only" htmlFor="dashboard-ai-prompt">
                        {t('dashboard.createWithAI')}
                    </label>
                    <div className="flex items-start gap-2">
                        <AppButton
                            variant="icon"
                            size="icon-md"
                            type="button"
                            onClick={() => handleOpenAIStudio()}
                            className="mt-0.5 h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-lg text-q-text-secondary hover:text-q-text hover:bg-q-surface-overlay/60 transition-colors"
                            title={t('dashboard.createWithAI')}
                        >
                            <Plus className="size-[17px]" />
                        </AppButton>
                        <textarea
                            id="dashboard-ai-prompt"
                            value={aiPrompt}
                            onChange={(event) => setAiPrompt(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' && !event.shiftKey) {
                                    event.preventDefault();
                                    handlePromptSubmit();
                                }
                            }}
                            rows={2}
                            placeholder={t(
                                'dashboard.aiPromptPlaceholder',
                                'Ask Quimera to create, edit, open, analyze, or run anything...',
                            )}
                            className="min-h-[64px] flex-1 resize-none bg-transparent px-1 py-2 text-sm sm:text-base text-q-text placeholder:text-q-text-secondary/65 focus:outline-none"
                        />
                    </div>
                    <div className="flex items-center justify-between gap-3 pt-2">
                        <AppButton
                            variant="outline"
                            type="button"
                            onClick={() => handleOpenAIStudio()}
                            className="inline-flex min-w-0 !h-auto items-center gap-2 rounded-full border border-border-subtle bg-q-surface-overlay/60 px-3 py-1.5 text-xs font-medium !text-q-text-secondary transition-colors hover:border-q-accent/40 hover:bg-q-accent/10 hover:!text-q-text"
                        >
                            <Sparkles size={13} className="text-q-accent" />
                            <span className="truncate">{t('dashboard.webDesignStudio', 'Web Design Studio')}</span>
                        </AppButton>
                        <div className="flex flex-shrink-0 items-center gap-2">
                            <AppButton
                                variant="icon"
                                size="icon-md"
                                type="button"
                                onClick={() => handleOpenAIStudio(undefined, true)}
                                className="no-min-touch !size-9 !h-9 !w-9 !min-w-9 flex shrink-0 items-center justify-center !rounded-full !p-0 text-q-text-secondary hover:text-q-text hover:bg-q-surface-overlay/60 transition-colors touch-manipulation"
                                title={t('aiWebsiteStudio.chat.startVoice', 'Iniciar voz')}
                            >
                                <Mic className="size-4" />
                            </AppButton>
                            <AppButton
                                variant="primary"
                                size="icon-md"
                                type="submit"
                                className="no-min-touch !size-9 !h-9 !w-9 !min-w-9 flex shrink-0 items-center justify-center !rounded-full !p-0 bg-q-accent text-q-text-on-accent shadow-lg shadow-q-accent/20 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-q-accent/40 touch-manipulation"
                                title={t('dashboard.createWithAI')}
                            >
                                <ArrowUp className="size-[17px]" />
                            </AppButton>
                        </div>
                    </div>
                    {quickActions.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-3">
                            {quickActions.map(action => (
                                <AppButton
                                    key={action.id}
                                    variant="outline"
                                    type="button"
                                    onClick={() => handleQuickAction(action)}
                                    className="inline-flex min-w-0 !h-auto items-center gap-2 rounded-full border border-border-subtle bg-q-surface-overlay/50 px-3 py-1.5 text-xs font-medium !text-q-text-secondary transition-colors hover:border-q-accent/40 hover:bg-q-accent/10 hover:!text-q-text"
                                    title={t(action.promptKey, action.promptFallback)}
                                >
                                    {quickActionIcon(action)}
                                    <span className="truncate">{t(action.labelKey, action.labelFallback)}</span>
                                </AppButton>
                            ))}
                        </div>
                    )}
                </form>

                {/* Status Cards */}
                <motion.div variants={dashboardItemVariants}>
                    <DashboardStatusCards />
                </motion.div>
            </div>
        </motion.section>
    );
};

export default DashboardWelcome;
