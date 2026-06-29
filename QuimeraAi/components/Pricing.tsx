import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Check, CheckCircle, CreditCard, Globe2, Link2, Mic2, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { PricingData, PaddingSize, BorderRadiusSize, FontSize, AnimationType, CornerGradientConfig } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';
import { hexToRgba } from '../utils/colorUtils';
import { getAnimationClass, getAnimationDelay } from '../utils/animations';
import { normalizePricingVariant } from '../data/pricingVariants';
import { getCardPaddingStyle } from '../utils/cardPadding';
import CornerGradient from './ui/CornerGradient';

const paddingYClasses: Record<PaddingSize, string> = {
  none: 'py-0',
  sm: 'py-10 md:py-16',
  md: 'py-16 md:py-24',
  lg: 'py-20 md:py-32',
  xl: 'py-24 md:py-40',
};

const paddingXClasses: Record<PaddingSize, string> = {
  none: 'px-0',
  sm: 'px-4',
  md: 'px-6',
  lg: 'px-8',
  xl: 'px-12',
};

const titleSizeClasses: Record<FontSize, string> = {
  sm: 'text-2xl md:text-3xl',
  md: 'text-3xl md:text-4xl',
  lg: 'text-4xl md:text-5xl',
  xl: 'text-5xl md:text-7xl',
};

const descriptionSizeClasses: Record<FontSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

const borderRadiusClasses: Record<BorderRadiusSize, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-3xl',
};

type RenderTier = {
  name: string;
  price: string;
  frequency: string;
  description: string;
  features: string[];
  buttonText: string;
  buttonLink: string;
  featured: boolean;
  badge?: string;
  eyebrow?: string;
  footerText?: string;
  imageUrl?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
};

interface PricingProps extends PricingData {
  cardBorderRadius: BorderRadiusSize;
  buttonBorderRadius: BorderRadiusSize;
  animationType?: AnimationType;
  enableCardAnimation?: boolean;
  cornerGradient?: CornerGradientConfig;
}

const featureIcons = [CheckCircle, Sparkles, Zap, Globe2, ShieldCheck, Link2, CreditCard, Mic2];
const accentCycle = ['#ff00c7', '#139df2', '#13bfa6', '#ff4b16'];

const getLinkProps = (href?: string) => ({
  href: href || '#',
  target: href?.startsWith('http') ? '_blank' : undefined,
  rel: href?.startsWith('http') ? 'noopener noreferrer' : undefined,
});

const Pricing: React.FC<PricingProps> = ({
  pricingVariant = 'featured-plan',
  title: rawTitle,
  description: rawDescription,
  tiers: rawTiers = [],
  paddingY = 'lg',
  paddingX = 'md',
  colors,
  cardBorderRadius = 'xl',
  buttonBorderRadius = 'xl',
  titleFontSize = 'lg',
  descriptionFontSize = 'md',
  animationType = 'fade-in-up',
  enableCardAnimation = true,
  cornerGradient,
  glassEffect = false,
  cardsAlignment = 'center',
  backgroundImageUrl,
  cardPadding,
  cardPaddingTop,
  cardPaddingRight,
  cardPaddingBottom,
  cardPaddingLeft,
}) => {
  const { i18n } = useTranslation();
  const { getColor, colors: tokenColors } = useDesignTokens();
  const colorConfig = (colors || {}) as Record<string, string | undefined>;

  const resolveText = (text: unknown): string => {
    if (!text) return '';
    if (typeof text === 'string') return text;
    if (typeof text === 'object' && text !== null) {
      const value = text as Record<string, unknown>;
      const preferred = i18n.language?.startsWith('es') ? 'es' : 'en';
      const resolved = value[preferred] || value.es || value.en || Object.values(value)[0];
      return resolved ? String(resolved) : '';
    }
    return String(text);
  };

  const tiers = useMemo<RenderTier[]>(() => (rawTiers || []).map((tier: any) => ({
    name: resolveText(tier.name) || 'Plan',
    price: resolveText(tier.price) || '$0',
    frequency: resolveText(tier.frequency) || resolveText(tier.period) || '/mo',
    description: resolveText(tier.description),
    features: Array.isArray(tier.features) ? tier.features.map(resolveText).filter(Boolean) : [],
    buttonText: resolveText(tier.buttonText) || 'Get Started',
    buttonLink: tier.buttonLink || '#',
    featured: Boolean(tier.featured || tier.isPopular),
    badge: resolveText(tier.badge) || (tier.featured || tier.isPopular ? 'Popular' : ''),
    eyebrow: resolveText(tier.eyebrow),
    footerText: resolveText(tier.footerText),
    imageUrl: tier.imageUrl || tier.image,
    secondaryButtonText: resolveText(tier.secondaryButtonText),
    secondaryButtonLink: tier.secondaryButtonLink,
  })), [rawTiers, i18n.language]);

  const primaryColor = tokenColors.primary;
  const actualColors = {
    background: colorConfig.background || primaryColor,
    accent: colorConfig.accent || getColor('primary.main', '#2563eb'),
    borderColor: colorConfig.borderColor || '#d8dce3',
    text: colorConfig.text || '#1f2937',
    mutedText: colorConfig.mutedText || colorConfig.description || colorConfig.text || '#6b7280',
    heading: colorConfig.heading || '#111827',
    description: colorConfig.description || colorConfig.text || '#6b7280',
    cardBackground: colorConfig.cardBackground || '#ffffff',
    cardHeading: colorConfig.cardHeading || colorConfig.heading || '#111827',
    cardText: colorConfig.cardText || colorConfig.text || '#4b5563',
    priceColor: colorConfig.priceColor || colorConfig.heading || '#111827',
    buttonBackground: colorConfig.buttonBackground || getColor('primary.main', '#111827'),
    buttonText: colorConfig.buttonText || '#ffffff',
    checkmarkColor: colorConfig.checkmarkColor || colorConfig.accent || '#111827',
    gradientStart: colorConfig.gradientStart || colorConfig.accent || '#2563eb',
    gradientEnd: colorConfig.gradientEnd || '#ec4899',
    panelBackground: colorConfig.panelBackground || '#111827',
    panelText: colorConfig.panelText || '#ffffff',
    surfaceAlt: colorConfig.surfaceAlt || '#f3f4f6',
    featuredBackground: colorConfig.featuredBackground || '#111827',
    featuredText: colorConfig.featuredText || '#ffffff',
    badgeBackground: colorConfig.badgeBackground || colorConfig.accent || '#2563eb',
    badgeText: colorConfig.badgeText || '#ffffff',
    dividerColor: colorConfig.dividerColor || colorConfig.borderColor || '#e5e7eb',
    imageOverlay: colorConfig.imageOverlay || '#000000',
  };

  const variant = normalizePricingVariant(pricingVariant);
  const title = resolveText(rawTitle) || 'Pricing';
  const description = resolveText(rawDescription);
  const cardRadius = borderRadiusClasses[cardBorderRadius] || borderRadiusClasses.xl;
  const buttonRadius = borderRadiusClasses[buttonBorderRadius] || borderRadiusClasses.xl;
  const sectionBaseClass = `${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]} relative overflow-hidden`;
  const cardPaddingStyle = getCardPaddingStyle({ cardPadding, cardPaddingTop, cardPaddingRight, cardPaddingBottom, cardPaddingLeft }, 32);
  const animated = (index: number) => ({
    className: getAnimationClass(animationType, enableCardAnimation),
    style: { animationDelay: getAnimationDelay(index) },
  });

  const Header = ({ align = 'center', dark = false, label }: { align?: 'left' | 'center'; dark?: boolean; label?: string }) => (
    <div className={clsx('relative z-10 mb-12', align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-4xl')}>
      {label && (
        <span className={clsx(
          'mb-4 inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]',
          dark ? 'bg-white/10 text-white/70' : 'bg-black/5 text-black/50',
        )}>
          {label}
        </span>
      )}
      <h2 className={`${titleSizeClasses[titleFontSize]} font-header font-bold leading-tight`} style={{ color: dark ? actualColors.featuredText : actualColors.heading }}>
        {title}
      </h2>
      {description && (
        <p className={`${descriptionSizeClasses[descriptionFontSize]} mt-4 font-body leading-7`} style={{ color: dark ? hexToRgba(actualColors.featuredText, 0.62) : actualColors.description }}>
          {description}
        </p>
      )}
    </div>
  );

  const PlanButton = ({ tier, featured = false, color, textColor }: { tier: RenderTier; featured?: boolean; color?: string; textColor?: string }) => (
    <a
      {...getLinkProps(tier.buttonLink)}
      className={clsx('block w-full px-6 py-3 text-center font-button text-sm font-bold transition hover:-translate-y-0.5', buttonRadius)}
      style={{
        backgroundColor: featured ? (color || actualColors.buttonBackground) : actualColors.buttonBackground,
        color: textColor || actualColors.buttonText,
        textTransform: 'var(--buttons-transform, none)' as any,
        letterSpacing: 'var(--buttons-spacing, normal)',
      }}
    >
      {tier.buttonText}
    </a>
  );

  const renderDarkSaasCards = () => {
    const planTiers = tiers.slice(0, 3);
    const enterprise = tiers[3];
    return (
      <section id="pricing" className={sectionBaseClass} style={{ backgroundColor: '#000000' }}>
        <CornerGradient config={cornerGradient} />
        <div className="container mx-auto relative z-10">
          <Header dark />
          <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2 lg:grid-cols-3">
            {planTiers.map((tier, index) => {
              const featured = tier.featured || index === 1;
              return (
                <div
                  key={`${tier.name}-${index}`}
                  className={clsx('flex min-h-[520px] flex-col border p-8 backdrop-blur', cardRadius, animated(index).className)}
                  style={{
                    ...animated(index).style,
                    ...cardPaddingStyle,
                    background: featured
                      ? `linear-gradient(180deg, ${hexToRgba(actualColors.gradientStart, 0.22)}, ${hexToRgba(actualColors.gradientStart, 0.46)} 72%, ${hexToRgba(actualColors.gradientEnd, 0.22)})`
                      : 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
                    borderColor: featured ? hexToRgba(actualColors.accent, 0.65) : 'rgba(255,255,255,0.15)',
                  }}
                >
                  <div className="mb-7 flex items-start justify-between gap-4 border-b border-white/10 pb-7">
                    <div>
                      <h3 className="font-header text-3xl font-bold text-white">{tier.name}</h3>
                      {tier.description && <p className="mt-2 text-sm text-white/55">{tier.description}</p>}
                    </div>
                    {tier.badge && <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white/60">{tier.badge}</span>}
                  </div>
                  <div className="mb-7 border-b border-white/10 pb-7">
                    <span className="font-header text-3xl font-bold text-white">{tier.price}</span>
                    <span className="ml-2 text-sm text-white/55">{tier.frequency}</span>
                  </div>
                  <ul className="flex-1 space-y-4">
                    {tier.features.map((feature, i) => {
                      const Icon = featureIcons[i % featureIcons.length];
                      return <li key={i} className="flex gap-3 text-sm text-white/65"><Icon size={17} className="mt-0.5 shrink-0 text-white" />{feature}</li>;
                    })}
                  </ul>
                  <PlanButton tier={tier} featured={featured} color={featured ? actualColors.accent : '#2b2b2d'} />
                </div>
              );
            })}
          </div>
          {enterprise && (
            <div className={clsx('mx-auto mt-5 flex max-w-7xl flex-col gap-5 border border-white/15 p-7 md:flex-row md:items-center md:justify-between', cardRadius)} style={{ ...cardPaddingStyle, backgroundColor: 'rgba(255,255,255,0.035)' }}>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <strong className="text-lg text-white">{enterprise.name}</strong>
                <span className="text-white/55">{enterprise.description || enterprise.price}</span>
              </div>
              <a {...getLinkProps(enterprise.buttonLink)} className={clsx('inline-flex justify-center px-5 py-3 text-sm font-bold text-white', buttonRadius)} style={{ backgroundColor: '#2b2b2d' }}>{enterprise.buttonText}</a>
            </div>
          )}
        </div>
      </section>
    );
  };

  const renderFeaturedPlan = () => {
    const planTiers = tiers.slice(0, 3);
    const enterprise = tiers[3];
    return (
      <section id="pricing" className={sectionBaseClass} style={{ backgroundColor: actualColors.background }}>
        <CornerGradient config={cornerGradient} />
        <div className="container mx-auto relative z-10">
          <Header label="Pricing" />
          <div className="mx-auto mb-12 flex w-fit rounded-lg bg-black/5 p-1 text-sm text-black/50">
            <span className="px-8 py-3">Monthly</span>
            <span className="rounded-md bg-white px-8 py-3 font-bold text-black shadow-sm">Yearly <span style={{ color: actualColors.accent }}>-20%</span></span>
          </div>
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
            {planTiers.map((tier, index) => {
              const featured = tier.featured || index === 1;
              return (
                <div
                  key={`${tier.name}-${index}`}
                  className={clsx('flex min-h-[620px] flex-col overflow-hidden border shadow-sm', cardRadius, animated(index).className)}
                  style={{
                    ...animated(index).style,
                    backgroundColor: featured ? actualColors.featuredBackground : actualColors.cardBackground,
                    borderColor: featured ? actualColors.featuredBackground : actualColors.borderColor,
                    color: featured ? actualColors.featuredText : actualColors.cardText,
                  }}
                >
                  <div className="p-8" style={{ ...cardPaddingStyle, backgroundColor: featured ? hexToRgba('#ffffff', 0.08) : actualColors.cardBackground }}>
                    <h3 className="font-header text-2xl font-bold" style={{ color: featured ? actualColors.featuredText : actualColors.cardHeading }}>{tier.name}</h3>
                    {tier.description && <p className="mt-3 text-sm leading-6 opacity-70">{tier.description}</p>}
                  </div>
                  <div className="flex flex-1 flex-col p-8" style={cardPaddingStyle}>
                    <div className="mb-7">
                      <span className="font-header text-5xl font-bold" style={{ color: featured ? actualColors.featuredText : actualColors.priceColor }}>{tier.price}</span>
                      <span className="ml-2 text-sm opacity-55">{tier.frequency}</span>
                    </div>
                    <PlanButton tier={tier} featured={featured} color={featured ? actualColors.accent : actualColors.buttonBackground} />
                    <div className="my-8 border-t border-dotted" style={{ borderColor: featured ? 'rgba(255,255,255,0.15)' : actualColors.dividerColor }} />
                    {tier.eyebrow && <p className="mb-5 text-xs font-bold uppercase tracking-[0.18em] opacity-55">{tier.eyebrow}</p>}
                    <ul className="space-y-4 text-sm">
                      {tier.features.map((feature, i) => {
                        const Icon = featureIcons[i % featureIcons.length];
                        return <li key={i} className="flex gap-3 leading-6 opacity-75"><Icon size={17} className="mt-1 shrink-0" />{feature}</li>;
                      })}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
          {enterprise && (
            <div className={clsx('mx-auto mt-8 grid max-w-6xl gap-6 border p-8 md:grid-cols-[1fr_auto]', cardRadius)} style={{ ...cardPaddingStyle, backgroundColor: actualColors.surfaceAlt, borderColor: actualColors.borderColor }}>
              <div>
                <h3 className="font-header text-2xl font-bold" style={{ color: actualColors.heading }}>{enterprise.name}</h3>
                <p className="mt-2" style={{ color: actualColors.description }}>{enterprise.description || enterprise.price}</p>
              </div>
              <a {...getLinkProps(enterprise.buttonLink)} className={clsx('self-center px-6 py-3 text-center text-sm font-bold', buttonRadius)} style={{ backgroundColor: actualColors.buttonBackground, color: actualColors.buttonText }}>{enterprise.buttonText}</a>
            </div>
          )}
        </div>
      </section>
    );
  };

  const renderVoiceCreditColumns = () => (
    <section id="pricing" className={sectionBaseClass} style={{ backgroundColor: actualColors.background }}>
      <CornerGradient config={cornerGradient} />
      <div className="container mx-auto relative z-10">
        <Header align="left" />
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex w-fit rounded-full border p-1" style={{ borderColor: actualColors.borderColor }}>
            {['Creative', 'Agents', 'API'].map((item, index) => <span key={item} className={clsx('rounded-full px-6 py-2 text-sm', index === 0 && 'bg-white shadow-sm')} style={{ color: actualColors.text }}>{item}</span>)}
          </div>
          <span className={clsx('w-fit border px-5 py-2 text-sm', buttonRadius)} style={{ borderColor: actualColors.borderColor, color: actualColors.heading }}>Monthly billing</span>
        </div>
        <div className="grid border-l md:grid-cols-2 lg:grid-cols-4" style={{ borderColor: actualColors.dividerColor }}>
          {tiers.slice(0, 4).map((tier, index) => {
            const featured = tier.featured || index === 2;
            return (
              <div key={`${tier.name}-${index}`} className={clsx('flex min-h-[700px] flex-col border-r px-6 py-5', animated(index).className)} style={{ ...animated(index).style, ...cardPaddingStyle, borderColor: actualColors.dividerColor }}>
                <div className={clsx('mb-6 min-h-[170px] p-7', cardRadius)} style={{
                  ...cardPaddingStyle,
                  background: featured
                    ? `radial-gradient(circle at 20% 15%, ${actualColors.gradientStart}, transparent 35%), radial-gradient(circle at 90% 70%, ${actualColors.gradientEnd}, transparent 45%), ${actualColors.cardBackground}`
                    : actualColors.surfaceAlt,
                  color: featured ? '#ffffff' : actualColors.cardHeading,
                }}>
                  <h3 className="font-header text-3xl">{tier.name}</h3>
                  {tier.badge && <span className="mt-3 inline-flex rounded-full border border-current px-3 py-1 text-xs">{tier.badge}</span>}
                  <div className="mt-auto pt-16">
                    <span className="font-header text-2xl">{tier.price}</span>
                    <span className="ml-1 text-sm opacity-70">{tier.frequency}</span>
                  </div>
                </div>
                <PlanButton tier={tier} featured={featured} color={featured ? actualColors.accent : actualColors.buttonBackground} />
                <div className="my-8 border-t border-dotted" style={{ borderColor: actualColors.dividerColor }} />
                {tier.eyebrow && <p className="mb-5 text-xs font-bold uppercase tracking-widest" style={{ color: actualColors.mutedText }}>{tier.eyebrow}</p>}
                <ul className="space-y-4 text-sm" style={{ color: actualColors.cardText }}>
                  {tier.features.map((feature, i) => <li key={i} className="border-b border-dotted pb-3" style={{ borderColor: actualColors.dividerColor }}><Check size={15} className="mr-3 inline" />{feature}</li>)}
                </ul>
                {tier.footerText && <p className="mt-auto pt-8 font-header text-2xl" style={{ color: actualColors.heading }}>{tier.footerText}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );

  const renderDarkPlanCards = () => (
    <section id="pricing" className={sectionBaseClass} style={{ backgroundColor: '#000000' }}>
      <CornerGradient config={cornerGradient} />
      <div className="container mx-auto relative z-10">
        <Header dark />
        <p className="mb-12 text-center text-sm text-white/45">Pay annually (save 20%)</p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tiers.slice(0, 3).map((tier, index) => {
            const featured = tier.featured || index === 1;
            return (
              <div key={`${tier.name}-${index}`} className={clsx('flex min-h-[610px] flex-col border p-8', cardRadius, animated(index).className)} style={{ ...animated(index).style, ...cardPaddingStyle, borderColor: featured ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.16)' }}>
                <div className="mb-7 flex items-start justify-between">
                  <h3 className="font-header text-2xl font-bold text-white">{tier.name}</h3>
                  {tier.badge && <span className="rounded bg-white px-2 py-1 text-xs font-bold text-black">{tier.badge}</span>}
                </div>
                <div className="mb-8">
                  <span className="font-header text-5xl text-white">{tier.price}</span>
                  <span className="ml-2 text-white/55">{tier.frequency}</span>
                </div>
                {tier.description && <p className="mb-6 text-white/55">{tier.description}</p>}
                <ul className="flex-1 space-y-5 text-white/80">
                  {tier.features.map((feature, i) => <li key={i} className="flex gap-3"><Check size={18} className="mt-1 shrink-0 text-white" />{feature}</li>)}
                </ul>
                <a {...getLinkProps(tier.buttonLink)} className="mt-10 block border px-6 py-4 text-center font-button font-bold text-white transition hover:bg-white hover:text-black" style={{ borderColor: featured ? '#ffffff' : 'rgba(255,255,255,0.35)', backgroundColor: featured ? '#f4f4f5' : 'transparent', color: featured ? '#111111' : '#ffffff' }}>{tier.buttonText}</a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );

  const renderFinanceComparison = () => (
    <section id="pricing" className={sectionBaseClass} style={{ backgroundColor: actualColors.accent }}>
      <CornerGradient config={cornerGradient} />
      <div className="container mx-auto relative z-10">
        <h2 className={`${titleSizeClasses[titleFontSize]} mb-12 max-w-4xl font-header font-light leading-tight text-white`}>{title}</h2>
        <div className="grid gap-8 md:grid-cols-2">
          {tiers.slice(0, 2).map((tier, index) => (
            <div key={`${tier.name}-${index}`} className={clsx('p-10 md:p-10 lg:p-14', cardRadius, animated(index).className)} style={{ ...animated(index).style, ...cardPaddingStyle, backgroundColor: index === 0 ? '#000000' : hexToRgba('#000000', 0.2), color: '#ffffff' }}>
              <h3 className="mb-12 font-header text-3xl lg:mb-16">{tier.name}</h3>
              <div className="mb-16 flex flex-wrap items-end gap-3">
                <span className="font-header text-7xl md:text-6xl lg:text-7xl xl:text-8xl">{tier.price}</span>
                <span className="pb-2 text-3xl lg:pb-3 lg:text-4xl">{tier.frequency}</span>
              </div>
              <div className="grid gap-6 text-sm md:grid-cols-2">
                <p>{tier.description}</p>
                <ul className="space-y-1">
                  {tier.features.map((feature, i) => <li key={i}>- {feature}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </div>
        {description && <p className="mt-12 max-w-5xl text-sm leading-6 text-white">{description}</p>}
      </div>
    </section>
  );

  const renderSubscriptionShop = () => (
    <section id="pricing" className={clsx(sectionBaseClass, 'min-h-[760px]')} style={{
      backgroundColor: actualColors.panelBackground,
      backgroundImage: backgroundImageUrl ? `linear-gradient(90deg, ${hexToRgba(actualColors.imageOverlay, 0.68)}, ${hexToRgba(actualColors.imageOverlay, 0.14)}), url(${backgroundImageUrl})` : `linear-gradient(120deg, ${actualColors.panelBackground}, ${actualColors.surfaceAlt})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}>
      <CornerGradient config={cornerGradient} />
      <div className="container mx-auto relative z-10">
        <Header align="left" dark />
        <div className="grid max-w-4xl gap-8 md:grid-cols-2">
          {tiers.slice(0, 2).map((tier, index) => (
            <div key={`${tier.name}-${index}`} className={clsx('p-8', cardRadius, animated(index).className)} style={{ ...animated(index).style, ...cardPaddingStyle, backgroundColor: actualColors.cardBackground, color: actualColors.cardText }}>
              <div className={clsx('mb-8 aspect-[4/3] overflow-hidden bg-black/5', cardRadius)}>
                {tier.imageUrl ? <img src={tier.imageUrl} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-[linear-gradient(135deg,#f4eadc,#c7b99f)]" />}
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <h3 className="font-header text-2xl font-bold" style={{ color: actualColors.cardHeading }}>{tier.name}</h3>
                <span className="text-sm tracking-widest" style={{ color: actualColors.mutedText }}>{tier.price}</span>
              </div>
              {tier.description && <p className="mt-5 line-clamp-3 text-sm leading-6">{tier.description}</p>}
              <a {...getLinkProps(tier.buttonLink)} className="mt-8 inline-flex min-h-11 items-center px-4 py-3 text-xs font-bold uppercase tracking-widest" style={{ backgroundColor: actualColors.buttonBackground, color: actualColors.buttonText }}>{tier.buttonText}</a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  const renderBiPanels = () => (
    <section id="pricing" className={sectionBaseClass} style={{ backgroundColor: actualColors.surfaceAlt }}>
      <CornerGradient config={cornerGradient} />
      <div className="container mx-auto relative z-10">
        <Header align="left" />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {tiers.slice(0, 3).map((tier, index) => {
            const featured = tier.featured || index === 1;
            return (
              <div key={`${tier.name}-${index}`} className={clsx('relative flex min-h-[690px] flex-col border p-8', animated(index).className)} style={{ ...animated(index).style, ...cardPaddingStyle, backgroundColor: featured ? actualColors.featuredBackground : actualColors.cardBackground, borderColor: actualColors.borderColor, color: featured ? actualColors.featuredText : actualColors.cardText }}>
                <div className="absolute right-0 top-0 h-12 w-12 bg-[linear-gradient(135deg,transparent_50%,#7c3aed_50%)] opacity-90" />
                <p className="mb-2 text-sm" style={{ color: featured ? actualColors.accent : actualColors.mutedText }}>{tier.eyebrow || tier.badge}</p>
                <h3 className="font-header text-3xl font-bold" style={{ color: featured ? actualColors.featuredText : actualColors.cardHeading }}>{tier.name}</h3>
                <div className="my-6">
                  <span className="font-header text-4xl font-bold">{tier.price}</span>
                  <span className="ml-1 text-sm opacity-70">{tier.frequency}</span>
                </div>
                {tier.description && <p className="mb-8 text-sm leading-6">{tier.description}</p>}
                <PlanButton tier={tier} featured={featured} color={featured ? '#ffffff' : actualColors.buttonBackground} textColor={featured ? actualColors.featuredBackground : actualColors.buttonText} />
                <div className="my-8 border-t border-dashed" style={{ borderColor: featured ? 'rgba(255,255,255,0.28)' : actualColors.dividerColor }} />
                <ul className="space-y-4 text-sm leading-6">
                  {tier.features.map((feature, i) => <li key={i} className="flex gap-3"><Check size={16} className="mt-1 shrink-0" style={{ color: featured ? actualColors.accent : actualColors.checkmarkColor }} />{feature}</li>)}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );

  const renderGroupedPlanGrid = () => {
    const individual = tiers.slice(0, 3);
    const team = tiers.slice(3, 5);
    const renderCard = (tier: RenderTier, index: number, wide = false) => (
      <div key={`${tier.name}-${index}`} className={clsx('relative flex min-h-[350px] flex-col border p-8', cardRadius, animated(index).className, wide && 'md:min-h-[300px]')} style={{ ...animated(index).style, ...cardPaddingStyle, backgroundColor: actualColors.cardBackground, borderColor: actualColors.borderColor, overflow: 'hidden' }}>
        {tier.featured && <div className="absolute inset-x-0 bottom-0 h-40 opacity-70" style={{ background: `radial-gradient(circle at 30% 100%, ${actualColors.gradientEnd}, transparent 42%), radial-gradient(circle at 80% 100%, ${actualColors.gradientStart}, transparent 48%)` }} />}
        <div className="relative z-10">
          <h3 className="font-header text-2xl" style={{ color: actualColors.cardHeading }}>{tier.name}</h3>
          <div className="my-6 border-t" style={{ borderColor: actualColors.dividerColor }} />
          <div className="mb-6">
            <span className="font-header text-5xl font-bold" style={{ color: actualColors.priceColor }}>{tier.price}</span>
            <span className="ml-1 text-sm" style={{ color: actualColors.mutedText }}>{tier.frequency}</span>
          </div>
          {tier.description && <p className="mb-5 text-sm" style={{ color: actualColors.description }}>{tier.description}</p>}
          <ul className="space-y-2 text-sm" style={{ color: actualColors.cardText }}>
            {tier.features.slice(0, wide ? 5 : 4).map((feature, i) => <li key={i}><Check size={15} className="mr-2 inline" />{feature}</li>)}
          </ul>
        </div>
        <a {...getLinkProps(tier.buttonLink)} className={clsx('relative z-10 mt-auto inline-flex w-fit px-5 py-3 text-sm font-bold', buttonRadius)} style={{ backgroundColor: actualColors.buttonBackground, color: actualColors.buttonText }}>{tier.buttonText}</a>
      </div>
    );
    return (
      <section id="pricing" className={sectionBaseClass} style={{ backgroundColor: actualColors.surfaceAlt }}>
        <CornerGradient config={cornerGradient} />
        <div className="container mx-auto relative z-10">
          <Header align="left" />
          <div className="mb-8 text-center text-xs font-bold uppercase tracking-widest" style={{ color: actualColors.mutedText }}>Monthly / Yearly</div>
          <h3 className="mb-6 font-header text-2xl font-bold" style={{ color: actualColors.heading }}>Individual Plans</h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{individual.map((tier, index) => renderCard(tier, index))}</div>
          {team.length > 0 && <>
            <h3 className="mb-6 mt-12 font-header text-2xl font-bold" style={{ color: actualColors.heading }}>Team Plans</h3>
            <div className="grid gap-6 md:grid-cols-2">{team.map((tier, index) => renderCard(tier, index + 3, true))}</div>
          </>}
        </div>
      </section>
    );
  };

  const renderWorkflowRows = () => (
    <section id="pricing" className={sectionBaseClass} style={{ backgroundColor: actualColors.background }}>
      <CornerGradient config={cornerGradient} />
      <div className="container mx-auto relative z-10">
        <Header />
        <div className={clsx('mx-auto max-w-5xl overflow-hidden border p-4', borderRadiusClasses['2xl'])} style={{ backgroundColor: actualColors.surfaceAlt, borderColor: actualColors.borderColor }}>
          {tiers.map((tier, index) => (
            <div key={`${tier.name}-${index}`} className={clsx('grid gap-8 border bg-white p-8 md:grid-cols-[0.75fr_1.25fr]', index > 0 && '-mt-px', cardRadius, animated(index).className)} style={{ ...animated(index).style, ...cardPaddingStyle, borderColor: actualColors.borderColor }}>
              <div className="flex flex-col">
                <h3 className="font-header text-3xl font-bold" style={{ color: actualColors.cardHeading }}>{tier.name}</h3>
                {tier.description && <p className="mt-3 text-sm leading-6" style={{ color: actualColors.description }}>{tier.description}</p>}
                <div className="mt-auto pt-16">
                  <span className="font-header text-5xl font-bold" style={{ color: actualColors.priceColor }}>{tier.price}</span>
                  <span className="ml-1 text-sm" style={{ color: actualColors.mutedText }}>{tier.frequency}</span>
                  <a {...getLinkProps(tier.buttonLink)} className={clsx('mt-8 block max-w-sm px-6 py-4 text-center font-bold shadow-xl', buttonRadius)} style={{ backgroundColor: actualColors.buttonBackground, color: actualColors.buttonText }}>{tier.buttonText}</a>
                </div>
              </div>
              <ul className="divide-y" style={{ borderColor: actualColors.dividerColor }}>
                {tier.features.map((feature, i) => <li key={i} className="flex gap-4 py-4 text-sm" style={{ color: actualColors.cardText }}><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: actualColors.accent }}><Check size={16} /></span>{feature}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  const renderAddonCards = () => (
    <section id="pricing" className={sectionBaseClass} style={{ backgroundColor: '#000000' }}>
      <CornerGradient config={cornerGradient} />
      <div className="container mx-auto relative z-10">
        <Header dark />
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2 lg:grid-cols-3">
          {tiers.slice(0, 3).map((tier, index) => {
            const accent = index === 0 ? actualColors.gradientEnd : index === 1 ? actualColors.gradientStart : actualColors.accent;
            return (
              <div key={`${tier.name}-${index}`} className={clsx('border-b p-8', animated(index).className)} style={{ ...animated(index).style, ...cardPaddingStyle, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: accent }}>
                <div className="mb-8 flex items-center gap-3">
                  <Sparkles size={26} style={{ color: '#ffffff' }} />
                  <h3 className="font-header text-2xl font-bold text-white">{tier.name}</h3>
                </div>
                <div className="mb-8 flex items-end gap-3">
                  <span className="font-header text-6xl text-white">{tier.price}</span>
                  <span className="pb-2 text-white/60">{tier.frequency}</span>
                </div>
                {tier.description && <p className="mb-10 min-h-20 text-lg leading-7 text-white/85">{tier.description}</p>}
                <a {...getLinkProps(tier.buttonLink)} className={clsx('block px-6 py-4 text-center text-lg font-bold text-white', buttonRadius)} style={{ backgroundColor: accent }}>{tier.buttonText}</a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );

  if (variant === 'dark-saas-cards') return renderDarkSaasCards();
  if (variant === 'voice-credit-columns') return renderVoiceCreditColumns();
  if (variant === 'dark-plan-cards') return renderDarkPlanCards();
  if (variant === 'finance-comparison') return renderFinanceComparison();
  if (variant === 'subscription-shop') return renderSubscriptionShop();
  if (variant === 'bi-panels') return renderBiPanels();
  if (variant === 'grouped-plan-grid') return renderGroupedPlanGrid();
  if (variant === 'workflow-rows') return renderWorkflowRows();
  if (variant === 'addon-cards') return renderAddonCards();

  return (
    <div className={glassEffect ? 'backdrop-blur-xl' : undefined}>
      {renderFeaturedPlan()}
    </div>
  );
};

export default Pricing;
