import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Sparkles, Palette, Rocket, ArrowRight, CheckCircle2, Circle, Globe, FileText } from 'lucide-react';

interface DashboardHelpGuideProps {
    onClose: () => void;
    hasProjects: boolean;
    hasPublished: boolean;
    hasDomain?: boolean;
    hasCMSContent?: boolean;
    onCreateProject: () => void;
}

const DashboardHelpGuide: React.FC<DashboardHelpGuideProps> = ({
    onClose,
    hasProjects,
    hasPublished,
    hasDomain = false,
    hasCMSContent = false,
    onCreateProject
}) => {
    const { t } = useTranslation();

    // Define steps with completion logic
    const steps = [
        {
            id: 'create',
            isCompleted: hasProjects,
            icon: Sparkles,
            title: t('dashboard.helpGuide.step1Title', 'Crea tu primer proyecto'),
            description: t('dashboard.helpGuide.step1Desc', 'Usa nuestra IA para generar tu sitio web.'),
            action: onCreateProject,
            actionLabel: t('dashboard.helpGuide.createAction', 'Crear Proyecto')
        },
        {
            id: 'customize',
            isCompleted: hasProjects,
            icon: Palette,
            title: t('dashboard.helpGuide.step2Title', 'Personaliza tu diseño'),
            description: t('dashboard.helpGuide.step2Desc', 'Ajusta colores, fuentes y contenido.'),
            action: null,
            actionLabel: null
        },
        {
            id: 'cms',
            isCompleted: hasCMSContent,
            icon: FileText,
            title: t('dashboard.helpGuide.step4Title', 'Añade contenido al CMS'),
            description: t('dashboard.helpGuide.step4Desc', 'Crea tu primer artículo o página de blog.'),
            action: null,
            actionLabel: null
        },
        {
            id: 'publish',
            isCompleted: hasPublished,
            icon: Rocket,
            title: t('dashboard.helpGuide.step3Title', 'Publica tu sitio'),
            description: t('dashboard.helpGuide.step3Desc', 'Lanza tu idea al mundo.'),
            action: null,
            actionLabel: null
        },
        {
            id: 'domain',
            isCompleted: hasDomain,
            icon: Globe,
            title: t('dashboard.helpGuide.step5Title', 'Conecta tu dominio'),
            description: t('dashboard.helpGuide.step5Desc', 'Añade un dominio personalizado.'),
            action: null,
            actionLabel: null
        }
    ];

    const completedSteps = steps.filter(s => s.isCompleted).length;
    const progressPercentage = Math.round((completedSteps / steps.length) * 100);

    return (
        <section className="w-full animate-fade-in">
            <div className="relative flex flex-col lg:flex-row items-stretch gap-6 lg:gap-0 max-h-[400px]">
                {/* Floating Image - Outside the box */}
                <div className="hidden lg:flex relative z-10 flex-shrink-0 -mr-6 items-end">
                    <img
                        src="https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2FALeTxAC97FPhl7ymtEhAn.jpg?alt=media&token=e1ed6666-f72c-41bc-ad51-165161f361c2"
                        alt="Quimera AI Guide"
                        className="w-auto h-full max-h-[400px] object-contain drop-shadow-2xl"
                        loading="lazy"
                        decoding="async"
                    />
                </div>

                {/* Content Box */}
                <div className="relative flex-1 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl overflow-hidden lg:pl-10 max-h-[400px]">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors z-20"
                        aria-label={t('common.close')}
                    >
                        <X size={16} />
                    </button>

                    <div className="relative z-10 p-4 lg:p-6 overflow-y-auto max-h-[380px]">
                        {/* Header with Progress */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/20 text-xs font-semibold text-primary mb-2">
                                    <span>{t('dashboard.helpGuide.badge', 'Configuración')}</span>
                                    <span className="w-1 h-1 rounded-full bg-primary" />
                                    <span>{progressPercentage}% {t('dashboard.helpGuide.completed', 'Completado')}</span>
                                </div>
                                <h2 className="text-2xl font-bold text-foreground">
                                    {t('dashboard.helpGuide.title', 'Configura tu cuenta')}
                                </h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {t('dashboard.helpGuide.subtitle', 'Completa estos pasos para lanzar tu negocio online.')}
                                </p>
                            </div>
                        </div>

                        {/* Steps List */}
                        <div className="space-y-3">
                            {steps.map((step, index) => {
                                const isNext = !step.isCompleted && (index === 0 || steps[index - 1].isCompleted);
                                const StepIcon = step.icon;

                                return (
                                    <div
                                        key={step.id}
                                        className={`
                                            relative overflow-hidden rounded-xl border transition-all duration-300
                                            ${step.isCompleted
                                                ? 'bg-primary/5 border-primary/20'
                                                : isNext
                                                    ? 'bg-card border-primary shadow-sm ring-1 ring-primary/20'
                                                    : 'bg-card/40 border-border/50 opacity-60'
                                            }
                                        `}
                                    >
                                        <div className="p-4 flex items-center gap-4">
                                            {/* Checkbox Status */}
                                            <div className="flex-shrink-0">
                                                {step.isCompleted ? (
                                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                                                        <CheckCircle2 size={18} />
                                                    </div>
                                                ) : (
                                                    <div className={`
                                                        w-8 h-8 rounded-full border-2 flex items-center justify-center
                                                        ${isNext ? 'border-primary border-dashed' : 'border-muted-foreground/30'}
                                                    `}>
                                                        <Circle size={10} className={isNext ? 'text-primary' : 'text-transparent'} fill="currentColor" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Icon */}
                                            <div className={`
                                                w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                                                ${step.isCompleted ? 'bg-primary/10 text-primary' : isNext ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}
                                            `}>
                                                <StepIcon size={20} />
                                            </div>

                                            {/* Text Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className={`font-semibold text-sm ${step.isCompleted ? 'text-foreground/80 line-through decoration-primary/50' : 'text-foreground'}`}>
                                                        {step.title}
                                                    </h3>
                                                    {isNext && (
                                                        <span className="hidden md:inline-flex text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                                                            {t('dashboard.helpGuide.nextStep', 'Siguiente')}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {step.description}
                                                </p>
                                            </div>

                                            {/* Action Button */}
                                            {isNext && step.action && (
                                                <button
                                                    onClick={step.action}
                                                    className="shrink-0 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:shadow-lg hover:shadow-primary/25 transition-all active:scale-95 flex items-center gap-2"
                                                >
                                                    {step.actionLabel}
                                                    <ArrowRight size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                                {t('dashboard.helpGuide.proTip', 'Tip: Sigue esta guía para completar tu configuración.')}
                            </p>
                            <button
                                onClick={onClose}
                                className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                            >
                                {t('dashboard.gotIt', 'Entendido')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default DashboardHelpGuide;
