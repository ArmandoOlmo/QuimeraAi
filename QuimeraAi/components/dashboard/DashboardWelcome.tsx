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
import { SUBSCRIPTION_PLANS } from '../../types/subscription';
import DashboardStatusCards from './DashboardStatusCards';
import { dashboardContainerVariants, dashboardItemVariants } from './dashboardMotion';
import { ArrowUp, Crown, ChevronUp, ChevronDown, AlertTriangle, Mic, Plus, Sparkles } from 'lucide-react';

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
        handleOpenAIStudio(aiPrompt);
        setAiPrompt('');
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
                            <span className="quimera-user-name-highlight text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                                {userDocument?.name?.split(' ')[0] || 'Creator'}
                            </span>
                            .
                        </span>
                    </h1>

                    {/* Right-side account CTAs */}
                    {(planNeedsAttention || showUpgradeButton) && (
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:gap-3 flex-shrink-0 py-1 pb-3 overflow-visible">
                        {planNeedsAttention && (
                            <button
                                onClick={handlePlanAttentionClick}
                                className="group relative flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-red-600 via-orange-600 to-red-600 bg-[length:200%_100%] text-white font-bold rounded-xl sm:rounded-2xl border border-red-300/20 shadow-md shadow-red-500/20 hover:shadow-md hover:shadow-red-500/30 transition-all duration-500 lg:hover:scale-[1.02] hover:bg-right flex-1 sm:flex-initial"
                                aria-label={t('dashboard.planExpiredTitle', 'Tu plan está expirado')}
                            >
                                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-white/25 rounded-lg sm:rounded-xl backdrop-blur-sm group-hover:bg-white/35 transition-colors flex-shrink-0">
                                    <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
                                </div>
                                <div className="flex flex-col items-start text-left min-w-0">
                                    <span className="text-sm sm:text-lg leading-tight">
                                        {t('dashboard.planExpiredTitle', 'Tu plan está expirado')}
                                    </span>
                                    <span className="text-[10px] sm:text-xs opacity-85 font-medium text-left truncate">
                                        {t('dashboard.planExpiredDesc', 'Actualiza tu plan para seguir usando Quimera')} →
                                    </span>
                                </div>
                            </button>
                        )}

                        {/* Upgrade Plan CTA - Minimizable */}
                        {showUpgradeButton &&
                            (upgradeMinimized ? (
                                /* Minimized pill */
                                <button
                                    onClick={toggleUpgradeMinimized}
                                    className="group relative flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600/80 via-q-accent/60 to-purple-600/80 bg-[length:200%_100%] text-white/90 font-semibold rounded-2xl border border-purple-400/20 hover:border-purple-400/40 shadow-md shadow-purple-500/15 hover:shadow-purple-500/30 transition-all duration-500 hover:scale-105 hover:bg-right"
                                    aria-label={t('dashboard.upgradeNow')}
                                >
                                    <Crown className="w-4 h-4" aria-hidden="true" />
                                    <span className="text-sm">{t('dashboard.upgradeNow')}</span>
                                    <ChevronDown className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />
                                </button>
                            ) : (
                                /* Expanded upgrade button */
                                <div className="relative">
                                    <button
                                        onClick={handleUpgradeClick}
                                        className="group relative flex items-center gap-3 px-6 py-4 w-full bg-gradient-to-r from-purple-600 via-q-accent to-purple-600 bg-[length:200%_100%] text-white font-bold rounded-2xl shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-500 hover:scale-105 hover:bg-right"
                                        aria-label={t('dashboard.upgradeNow')}
                                    >
                                        <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-xl backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                                            <Crown className="w-6 h-6" aria-hidden="true" />
                                        </div>
                                        <div className="flex flex-col items-start text-left">
                                            <span className="text-lg leading-tight">{nextPlan.name}</span>
                                            <span className="text-xs opacity-80 font-medium text-left">
                                                ${nextPlan.price.monthly}/{t('dashboard.perMonth')} ·{' '}
                                                {t('dashboard.upgradeNow')}
                                            </span>
                                        </div>
                                    </button>
                                    {/* Minimize toggle */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleUpgradeMinimized();
                                        }}
                                        className="absolute -top-1.5 -right-1.5 w-6 h-6 flex items-center justify-center bg-q-surface-overlay/90 border border-q-border rounded-full text-q-text-muted hover:text-q-text hover:bg-q-surface-overlay transition-colors shadow-sm z-10"
                                        aria-label="Minimize"
                                    >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                    </button>
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
                        <button
                            type="button"
                            onClick={() => handleOpenAIStudio()}
                            className="mt-0.5 h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-lg text-q-text-secondary hover:text-q-text hover:bg-q-surface-overlay/60 transition-colors"
                            title={t('dashboard.createWithAI')}
                        >
                            <Plus size={17} />
                        </button>
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
                                'Describe el website que quieres crear...',
                            )}
                            className="min-h-[64px] flex-1 resize-none bg-transparent px-1 py-2 text-sm sm:text-base text-q-text placeholder:text-q-text-secondary/65 focus:outline-none"
                        />
                    </div>
                    <div className="flex items-center justify-between gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => handleOpenAIStudio()}
                            className="inline-flex min-w-0 items-center gap-2 rounded-full border border-q-border/70 bg-q-surface-overlay/35 px-3 py-1.5 text-xs font-medium text-q-text-secondary transition-colors hover:border-q-accent/50 hover:bg-q-accent/10 hover:text-q-text"
                        >
                            <Sparkles size={13} className="text-q-accent" />
                            <span className="truncate">Web Design Studio</span>
                        </button>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => handleOpenAIStudio(undefined, true)}
                                className="h-9 w-9 flex items-center justify-center rounded-full text-q-text-secondary hover:text-q-text hover:bg-q-surface-overlay/60 transition-colors"
                                title={t('aiWebsiteStudio.chat.startVoice', 'Iniciar voz')}
                            >
                                <Mic size={16} />
                            </button>
                            <button
                                type="submit"
                                className="h-9 w-9 flex items-center justify-center rounded-full bg-q-accent text-q-text-on-accent shadow-lg shadow-q-accent/20 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-q-accent/40"
                                title={t('dashboard.createWithAI')}
                            >
                                <ArrowUp size={17} />
                            </button>
                        </div>
                    </div>
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
