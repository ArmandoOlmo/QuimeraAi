import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/core/AuthContext';
import { useUI } from '../../contexts/core/UIContext';
import { useSafeTenant } from '../../contexts/tenant/TenantContext';
import { useSafeUpgrade } from '../../contexts/UpgradeContext';
import { usePlans } from '../../contexts/PlansContext';
import { useCreditsUsage } from '../../hooks/useCreditsUsage';
import { usePersistedBoolean } from '../../hooks/usePersistedState';
import { SUBSCRIPTION_PLANS } from '../../types/subscription';
import DashboardStatusCards from './DashboardStatusCards';
import { Sparkles, Crown, ChevronUp, ChevronDown } from 'lucide-react';

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

    const [upgradeMinimized, setUpgradeMinimized] = usePersistedBoolean('quimera_upgrade_minimized', false);

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

    const handleOpenAIStudio = () => {
        setOnboardingMode('ai-studio');
        localStorage.setItem('onboardingMode', 'ai-studio');
        setIsOnboardingOpen(true);
    };

    const showUpgradeButton = !canAccessSuperAdmin && nextPlan && currentPlanId !== 'enterprise';

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('dashboard.goodMorning');
        if (hour < 18) return t('dashboard.goodAfternoon');
        return t('dashboard.goodEvening');
    };

    return (
        <section className="w-full">
            <div className="flex flex-col justify-center py-6">
                {/* Greeting Header with CTA */}
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-4">
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-q-text flex items-center flex-wrap">
                        {/* Logo - conditional: tenant logo > generic agency icon > Quimera logo */}
                        {tenantContext?.currentTenant?.branding?.logoUrl ? (
                            <img
                                src={tenantContext.currentTenant.branding.logoUrl}
                                alt={tenantContext.currentTenant.branding.companyName || 'Logo'}
                                className="w-12 h-12 md:w-16 md:h-16 object-contain mr-4 drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]"
                                width={64}
                                height={64}
                                loading="eager"
                                decoding="async"
                            />
                        ) : tenantContext?.currentTenant?.branding?.companyName ? (
                            <div
                                className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center rounded-2xl mr-4 drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]"
                                style={{
                                    backgroundColor:
                                        (tenantContext.currentTenant.branding as any)?.primaryColor ||
                                        'hsl(var(--primary))',
                                }}
                            >
                                <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-white" />
                            </div>
                        ) : (
                            <img
                                src="https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032"
                                alt="Quimera Logo"
                                className="w-12 h-12 md:w-16 md:h-16 object-contain mr-4 drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]"
                                width={64}
                                height={64}
                                loading="eager"
                                decoding="async"
                            />
                        )}
                        <span>
                            {getGreeting()},{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                                {userDocument?.name?.split(' ')[0] || 'Creator'}
                            </span>
                            .
                        </span>
                    </h1>

                    {/* Right-side CTA buttons */}
                    <div className="flex flex-col gap-3 flex-shrink-0">
                        {/* Create with AI CTA - Opens AI Website Studio */}
                        <button
                            onClick={handleOpenAIStudio}
                            className="group relative flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 bg-[length:200%_100%] text-white font-bold rounded-2xl shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 transition-all duration-500 hover:scale-105 hover:bg-right"
                            aria-label={t('dashboard.createWithAI')}
                        >
                            <div className="flex items-center justify-center w-10 h-10 bg-white/30 rounded-xl backdrop-blur-sm group-hover:bg-white/40 transition-colors">
                                <Sparkles className="w-6 h-6" aria-hidden="true" />
                            </div>
                            <div className="flex flex-col items-start text-left">
                                <span className="text-lg leading-tight">{t('dashboard.createWithAI')}</span>
                                <span className="text-xs opacity-80 font-medium text-left">
                                    {t('dashboard.createWithAIDesc')}
                                </span>
                            </div>
                        </button>

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
                </div>

                <p className="text-lg text-q-text-muted max-w-3xl mb-8 leading-relaxed">
                    {t('dashboard.heroSubtitlePart1')}{' '}
                    <span className="text-q-text font-semibold">
                        {allUserProjectsCount} {t('dashboard.heroSubtitlePart2')}
                    </span>{' '}
                    {t('dashboard.heroSubtitlePart3')}
                </p>

                {/* Status Cards */}
                <DashboardStatusCards />
            </div>
        </section>
    );
};

export default DashboardWelcome;
