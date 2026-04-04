/**
 * FeaturesPage — Public marketing page showcasing Quimera.ai features
 * Uses MarketingLayout for consistent header/footer, Lucide icons, and full i18n.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bot,
  FileText,
  Target,
  Palette,
  Smartphone,
  ImageIcon,
  ShoppingBag,
  BarChart3,
  Mail,
  Globe,
  Zap,
  Link2,
  Sparkles,
  Shield,
  Clock,
  Users,
  Layers,
  MessageSquare,
  Search,
  Wand2,
  ChevronRight,
  ArrowRight,
  Star,
  Check,
} from 'lucide-react';
import MarketingLayout from './MarketingLayout';
import { useServiceAvailability } from '../../hooks/useServiceAvailability';
import type { PlatformServiceId } from '../../types/serviceAvailability';

// =============================================================================
// FEATURE DATA — organised by category with Lucide icons + i18n keys
// =============================================================================

interface Feature {
  icon: React.ReactNode;
  nameKey: string;
  nameFallback: string;
  descKey: string;
  descFallback: string;
  serviceId?: PlatformServiceId; // If set, feature is hidden when this service is disabled
}

interface FeatureGroup {
  titleKey: string;
  titleFallback: string;
  subtitleKey: string;
  subtitleFallback: string;
  serviceId?: PlatformServiceId; // If set, entire group is hidden when this service is disabled
  features: Feature[];
}

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    titleKey: 'features.group1Title',
    titleFallback: 'AI-Powered Creation',
    subtitleKey: 'features.group1Subtitle',
    subtitleFallback: 'Build smarter, faster, and with zero coding required',
    features: [
      {
        icon: <Bot size={28} />,
        nameKey: 'features.aiAssistant',
        nameFallback: 'AI Assistant',
        descKey: 'features.aiAssistantDesc',
        descFallback: 'Generate complete sections, text, and layouts with a simple prompt. Powered by Gemini.',
      },
      {
        icon: <FileText size={28} />,
        nameKey: 'features.smartCMS',
        nameFallback: 'Smart CMS',
        descKey: 'features.smartCMSDesc',
        descFallback: 'Create and manage blog articles with AI generation, automatic SEO, and instant publishing.',
      },
      {
        icon: <Target size={28} />,
        nameKey: 'features.aiSEO',
        nameFallback: 'AI-Powered SEO',
        descKey: 'features.aiSEODesc',
        descFallback: 'Automatic optimization of meta tags, alt texts, schema markup, and performance analysis.',
      },
    ],
  },
  {
    titleKey: 'features.group2Title',
    titleFallback: 'Editor & Design',
    subtitleKey: 'features.group2Subtitle',
    subtitleFallback: 'Professional tools that make design effortless',
    features: [
      {
        icon: <Palette size={28} />,
        nameKey: 'features.visualEditor',
        nameFallback: 'Visual Editor',
        descKey: 'features.visualEditorDesc',
        descFallback: 'Drag & drop with 30+ components, customizable themes, Google Fonts, and color palettes.',
      },
      {
        icon: <Smartphone size={28} />,
        nameKey: 'features.responsiveDesign',
        nameFallback: 'Responsive Design',
        descKey: 'features.responsiveDesignDesc',
        descFallback: 'All sites automatically adapt to mobile, tablet, and desktop with no extra configuration.',
      },
      {
        icon: <ImageIcon size={28} />,
        nameKey: 'features.assetManager',
        nameFallback: 'Asset Manager',
        descKey: 'features.assetManagerDesc',
        descFallback: 'Manage images, videos, and files with automatic optimization and global CDN.',
      },
    ],
  },
  {
    titleKey: 'features.group3Title',
    titleFallback: 'Ecommerce & Business',
    subtitleKey: 'features.group3Subtitle',
    subtitleFallback: 'Everything you need to sell and grow online',
    features: [
      {
        icon: <ShoppingBag size={28} />,
        nameKey: 'features.onlineStore',
        nameFallback: 'Online Store',
        descKey: 'features.onlineStoreDesc',
        descFallback: 'Product catalog, cart, Stripe checkout, order tracking, and inventory management.',
        serviceId: 'ecommerce',
      },
      {
        icon: <BarChart3 size={28} />,
        nameKey: 'features.analytics',
        nameFallback: 'Analytics',
        descKey: 'features.analyticsDesc',
        descFallback: 'Traffic metrics, conversions, user behavior tracking, and automated reporting.',
        serviceId: 'analytics',
      },
      {
        icon: <Mail size={28} />,
        nameKey: 'features.emailMarketing',
        nameFallback: 'Email Marketing',
        descKey: 'features.emailMarketingDesc',
        descFallback: 'Automated campaigns, segmentation, templates, and open/click rate analysis.',
        serviceId: 'emailMarketing',
      },
    ],
  },
  {
    titleKey: 'features.group4Title',
    titleFallback: 'Domains & Hosting',
    subtitleKey: 'features.group4Subtitle',
    subtitleFallback: 'Enterprise-grade infrastructure, zero configuration',
    features: [
      {
        icon: <Globe size={28} />,
        nameKey: 'features.customDomains',
        nameFallback: 'Custom Domains',
        descKey: 'features.customDomainsDesc',
        descFallback: 'Connect your own domain or buy a new one. Automatic DNS and SSL via Cloudflare.',
      },
      {
        icon: <Zap size={28} />,
        nameKey: 'features.ssrCDN',
        nameFallback: 'SSR & CDN',
        descKey: 'features.ssrCDNDesc',
        descFallback: 'Server-side rendering on Cloud Run with global CDN for ultra-fast load times.',
      },
      {
        icon: <Link2 size={28} />,
        nameKey: 'features.subdomains',
        nameFallback: 'Subdomains',
        descKey: 'features.subdomainsDesc',
        descFallback: 'Every user automatically gets username.quimera.ai. No configuration needed.',
      },
    ],
  },
];

// Highlight / stats data
const STATS = [
  { valueKey: 'features.stat1Value', valueFallback: '30+', labelKey: 'features.stat1Label', labelFallback: 'Components' },
  { valueKey: 'features.stat2Value', valueFallback: '<30s', labelKey: 'features.stat2Label', labelFallback: 'Build Time' },
  { valueKey: 'features.stat3Value', valueFallback: '99.9%', labelKey: 'features.stat3Label', labelFallback: 'Uptime' },
  { valueKey: 'features.stat4Value', valueFallback: '24/7', labelKey: 'features.stat4Label', labelFallback: 'Support' },
];

// Additional highlights
const HIGHLIGHTS = [
  { icon: <MessageSquare size={20} />, key: 'features.highlightChatbot', fallback: 'AI Chatbot with voice for every site', serviceId: 'chatbot' as PlatformServiceId },
  { icon: <Search size={20} />, key: 'features.highlightSEO', fallback: 'Automatic SEO & schema markup' },
  { icon: <Shield size={20} />, key: 'features.highlightSSL', fallback: 'Free SSL certificates on all plans' },
  { icon: <Layers size={20} />, key: 'features.highlightTemplates', fallback: 'Premium templates & presets', serviceId: 'templates' as PlatformServiceId },
  { icon: <Users size={20} />, key: 'features.highlightTeam', fallback: 'Team collaboration & roles' },
  { icon: <Wand2 size={20} />, key: 'features.highlightAIImages', fallback: 'AI-generated 4K images', serviceId: 'aiFeatures' as PlatformServiceId },
];

// =============================================================================
// COMPONENT
// =============================================================================

interface FeaturesPageProps {
  onNavigateToRegister?: () => void;
  onNavigateToLogin?: () => void;
  onNavigateToHome?: () => void;
}

const FeaturesPage: React.FC<FeaturesPageProps> = ({
  onNavigateToRegister,
  onNavigateToLogin,
  onNavigateToHome,
}) => {
  const { t } = useTranslation();
  const [activeGroup, setActiveGroup] = useState(0);
  const { isServicePublic, isLoading: isLoadingServices } = useServiceAvailability();

  // Filter feature groups and individual features by service availability
  const filteredGroups = React.useMemo(() => {
    if (isLoadingServices) return FEATURE_GROUPS;
    return FEATURE_GROUPS
      .filter(g => !g.serviceId || isServicePublic(g.serviceId))
      .map(g => ({
        ...g,
        features: g.features.filter(f => !f.serviceId || isServicePublic(f.serviceId)),
      }))
      .filter(g => g.features.length > 0); // Remove groups with no visible features
  }, [isLoadingServices, isServicePublic]);

  const filteredHighlights = React.useMemo(() => {
    if (isLoadingServices) return HIGHLIGHTS;
    return HIGHLIGHTS.filter(h => !h.serviceId || isServicePublic(h.serviceId));
  }, [isLoadingServices, isServicePublic]);

  // Clamp activeGroup if filtering reduced the list
  const safeActiveGroup = activeGroup >= filteredGroups.length ? 0 : activeGroup;

  return (
    <MarketingLayout
      onNavigateToHome={onNavigateToHome}
      onNavigateToLogin={onNavigateToLogin}
      onNavigateToRegister={onNavigateToRegister}
    >
      <div className="bg-[#0A0A0A] text-white selection:bg-yellow-400 selection:text-black">

        {/* ── HERO ── */}
        <section className="relative py-20 sm:py-28 px-4 sm:px-6 text-center overflow-hidden">
          {/* Background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-400/5 rounded-full blur-[180px] pointer-events-none" />

          <div className="relative z-10 max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-sm font-medium mb-8">
              <Sparkles size={16} />
              {t('features.badge', 'Everything you need to build with AI')}
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              {t('features.heroTitle', 'Powerful Features for')}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
                {t('features.heroTitleHighlight', 'Modern Websites')}
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              {t('features.heroSubtitle', 'A complete platform to create, manage, and scale your digital presence with artificial intelligence.')}
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={onNavigateToRegister}
                className="px-8 py-3.5 bg-yellow-400 hover:bg-yellow-300 text-black font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-yellow-400/20 hover:shadow-yellow-400/30 flex items-center justify-center gap-2"
              >
                {t('features.heroCta', 'Start Building Free')}
                <ArrowRight size={18} />
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById('features-grid');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-8 py-3.5 border border-white/10 hover:border-white/20 text-white rounded-xl transition-all duration-300 hover:bg-white/5"
              >
                {t('features.heroExplore', 'Explore Features')}
              </button>
            </div>
          </div>
        </section>

        {/* ── STATS BAR ── */}
        <section className="border-y border-white/5 py-8 sm:py-10 bg-white/[0.02]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
            {STATS.map((stat, i) => (
              <div key={i}>
                <div className="text-2xl sm:text-3xl font-bold text-yellow-400 mb-1">
                  {t(stat.valueKey, stat.valueFallback)}
                </div>
                <div className="text-sm text-gray-500">
                  {t(stat.labelKey, stat.labelFallback)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES GRID (tabbed by category) ── */}
        <section id="features-grid" className="py-20 sm:py-28 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">

            {/* Category Tabs */}
            <div className="flex flex-wrap justify-center gap-3 mb-16">
              {filteredGroups.map((group, i) => (
                <button
                  key={i}
                  onClick={() => setActiveGroup(i)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                    safeActiveGroup === i
                      ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                  }`}
                >
                  {t(group.titleKey, group.titleFallback)}
                </button>
              ))}
            </div>

            {/* Active Group Header */}
            {filteredGroups[safeActiveGroup] && (
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                {t(filteredGroups[safeActiveGroup].titleKey, filteredGroups[safeActiveGroup].titleFallback)}
              </h2>
              <p className="text-gray-400 text-lg max-w-xl mx-auto">
                {t(filteredGroups[safeActiveGroup].subtitleKey, filteredGroups[safeActiveGroup].subtitleFallback)}
              </p>
            </div>
            )}

            {/* Feature Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              {(filteredGroups[safeActiveGroup]?.features ?? []).map((feature, fi) => (
                <div
                  key={fi}
                  className="group p-8 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-yellow-400/20 transition-all duration-500 hover:bg-white/[0.06]"
                >
                  <div className="w-14 h-14 rounded-xl bg-yellow-400/10 flex items-center justify-center text-yellow-400 mb-6 group-hover:bg-yellow-400/20 transition-colors duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-yellow-400 transition-colors duration-300">
                    {t(feature.nameKey, feature.nameFallback)}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {t(feature.descKey, feature.descFallback)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── ALL FEATURES OVERVIEW ── */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white/[0.02] border-y border-white/5">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                {t('features.allFeaturesTitle', 'All Features')}{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
                  {t('features.allFeaturesTitleHighlight', 'at a Glance')}
                </span>
              </h2>
              <p className="text-gray-400">
                {t('features.allFeaturesSubtitle', 'A comprehensive toolkit for every aspect of your online presence')}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredGroups.flatMap((g) => g.features).map((feature, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-yellow-400/10 transition-all duration-300"
                >
                  <div className="w-8 h-8 rounded-lg bg-yellow-400/10 flex items-center justify-center text-yellow-400 flex-shrink-0 mt-0.5">
                    {React.cloneElement(feature.icon as React.ReactElement, { size: 16 })}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-white mb-1">
                      {t(feature.nameKey, feature.nameFallback)}
                    </h4>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {t(feature.descKey, feature.descFallback)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HIGHLIGHTS STRIP ── */}
        <section className="py-16 sm:py-20 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                {t('features.moreTitle', 'And')}{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
                  {t('features.moreTitleHighlight', 'Much More')}
                </span>
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredHighlights.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-yellow-400/10 transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-lg bg-yellow-400/10 flex items-center justify-center text-yellow-400 flex-shrink-0">
                    {h.icon}
                  </div>
                  <span className="text-sm font-medium text-gray-300">
                    {t(h.key, h.fallback)}
                  </span>
                  <Check size={16} className="text-yellow-400 ml-auto flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── COMPARISON / WHY QUIMERA ── */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white/[0.02] border-y border-white/5">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              {t('features.whyTitle', 'Why')}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
                {t('features.whyTitleHighlight', 'Quimera.ai?')}
              </span>
            </h2>
            <p className="text-gray-400 mb-12 max-w-xl mx-auto">
              {t('features.whySubtitle', 'See how we compare to traditional website builders')}
            </p>

            <div className="grid sm:grid-cols-3 gap-6">
              {[
                {
                  icon: <Clock size={28} />,
                  titleKey: 'features.why1Title',
                  titleFallback: '10x Faster',
                  descKey: 'features.why1Desc',
                  descFallback: 'Build a complete site in under 30 seconds, not days or weeks.',
                },
                {
                  icon: <Star size={28} />,
                  titleKey: 'features.why2Title',
                  titleFallback: 'AI Native',
                  descKey: 'features.why2Desc',
                  descFallback: 'AI is built into every layer — content, design, SEO, and support.',
                },
                {
                  icon: <Shield size={28} />,
                  titleKey: 'features.why3Title',
                  titleFallback: 'All-in-One',
                  descKey: 'features.why3Desc',
                  descFallback: 'Hosting, domains, e-commerce, CMS, analytics — one platform, one price.',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="p-8 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-yellow-400/20 transition-all duration-300"
                >
                  <div className="w-14 h-14 rounded-xl bg-yellow-400/10 flex items-center justify-center text-yellow-400 mx-auto mb-6">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{t(item.titleKey, item.titleFallback)}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{t(item.descKey, item.descFallback)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="py-20 sm:py-28 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="relative p-12 sm:p-16 rounded-3xl bg-gradient-to-b from-yellow-400/5 to-transparent border border-yellow-400/10 overflow-hidden">
              {/* Background glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-yellow-400/10 rounded-full blur-[120px] pointer-events-none" />

              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  {t('features.ctaTitle', 'Ready to build your website?')}
                </h2>
                <p className="text-gray-400 mb-8 max-w-lg mx-auto">
                  {t('features.ctaSubtitle', 'Start creating for free. No credit card required. AI-powered results in under 30 seconds.')}
                </p>
                <button
                  onClick={onNavigateToRegister}
                  className="px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-black font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-yellow-400/20 hover:shadow-yellow-400/30 inline-flex items-center gap-2 text-lg"
                >
                  {t('features.ctaButton', 'Get Started Free')}
                  <ChevronRight size={20} />
                </button>
                <p className="mt-4 text-sm text-gray-600">
                  {t('features.noCreditCard', 'No credit card required')}
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </MarketingLayout>
  );
};

export default FeaturesPage;
