
import React, { useState } from 'react';
import { HeroLeadData, PaddingSize, BorderRadiusSize, FontSize, CornerGradientConfig } from '../types';
import { useSafeEditor } from '../contexts/EditorContext';
import { CheckCircle2, Loader2, User, Mail, Building2, Phone, MessageSquare } from 'lucide-react';
import { useDesignTokens } from '../hooks/useDesignTokens';
import { useTranslation } from 'react-i18next';
import CornerGradient from './ui/CornerGradient';
import { hexToRgba } from '../utils/colorUtils';

// ── Utility maps ──────────────────────────────────────────────────────────────

const paddingYMap: Record<PaddingSize, string> = {
  none: '0', sm: '2.5rem', md: '4rem', lg: '6rem', xl: '8rem',
};
const paddingXMap: Record<PaddingSize, string> = {
  none: '0', sm: '1rem', md: '2rem', lg: '4rem', xl: '6rem',
};

const titleSizeMap: Record<FontSize, string> = {
  sm: 'clamp(1.5rem, 3vw, 2rem)',
  md: 'clamp(2rem, 4vw, 2.75rem)',
  lg: 'clamp(2.5rem, 5vw, 3.5rem)',
  xl: 'clamp(3rem, 6vw, 4.5rem)',
};

const descSizeMap: Record<FontSize, string> = {
  sm: '0.875rem', md: '1.05rem', lg: '1.175rem', xl: '1.35rem',
};

const borderRadiusMap: Record<BorderRadiusSize, string> = {
  none: '0', sm: '0.25rem', md: '0.5rem', lg: '0.75rem',
  xl: '1rem', '2xl': '1.5rem', full: '9999px',
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface HeroLeadProps extends HeroLeadData {
  cardBorderRadius?: BorderRadiusSize;
  inputBorderRadius?: BorderRadiusSize;
  buttonBorderRadius?: BorderRadiusSize;
  cornerGradient?: CornerGradientConfig;
}

// ── Component ─────────────────────────────────────────────────────────────────

const HeroLead: React.FC<HeroLeadProps> = ({
  // Layout
  formPosition = 'right',
  // Hero content
  headline,
  subheadline,
  badgeText,
  imageUrl,
  imagePosition = 'center',
  overlayOpacity = 50,
  heroHeight = 85,
  // Form content
  formTitle,
  formDescription,
  namePlaceholder = 'Name',
  emailPlaceholder = 'Email',
  companyPlaceholder = 'Company',
  phonePlaceholder = 'Phone',
  messagePlaceholder = 'Message',
  buttonText = 'Submit',
  successMessage,
  // Field visibility
  showCompanyField = false,
  showPhoneField = false,
  showMessageField = true,
  // Styling
  glassEffect,
  paddingY = 'md',
  paddingX = 'md',
  cardBorderRadius = 'xl',
  inputBorderRadius = 'md',
  buttonBorderRadius = 'md',
  formCardOpacity = 100,
  // Font sizes
  headlineFontSize = 'lg',
  subheadlineFontSize = 'md',
  formTitleFontSize = 'sm',
  formDescriptionFontSize = 'sm',
  // Colors
  colors,
  // Corner gradient
  cornerGradient,
}) => {
  const { t } = useTranslation();
  const editorContext = useSafeEditor();
  const addLead = editorContext?.addLead;

  const { getColor } = useDesignTokens();
  const primaryColor = getColor('primary.main', '#4f46e5');

  // ── Resolved colors ───────────────────────────────────────────────────────
  const c = {
    background: colors?.background || '#0f172a',
    infoBackground: colors?.infoBackground || 'transparent',
    formBackground: colors?.formBackground || '#1e293b',
    heading: colors?.heading || '#f8fafc',
    text: colors?.text || '#94a3b8',
    accent: colors?.accent || primaryColor,
    buttonBackground: colors?.buttonBackground || primaryColor,
    buttonText: colors?.buttonText || '#ffffff',
    inputBackground: colors?.inputBackground || '#0f172a',
    inputText: colors?.inputText || '#f8fafc',
    inputBorder: colors?.inputBorder || '#334155',
    inputPlaceholder: colors?.inputPlaceholder || '#6b7280',
    badgeBackground: colors?.badgeBackground || primaryColor,
    badgeText: colors?.badgeText || '#ffffff',
    formHeading: colors?.formHeading || '#f8fafc',
    formText: colors?.formText || '#94a3b8',
    borderColor: colors?.borderColor || '#334155',
  };

  // ── Form state ────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    name: '', email: '', company: '', phone: '', message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Lead scoring — same logic as Leads.tsx
      let leadScore = 40;
      if (formData.company) leadScore += 10;
      if (formData.phone) leadScore += 10;
      if (formData.message && formData.message.length > 50) leadScore += 20;
      if (formData.message && formData.message.length > 150) leadScore += 10;

      const highIntentKeywords = [
        'precio', 'costo', 'cotización', 'comprar', 'contratar', 'disponibilidad',
        'price', 'buy', 'quote', 'purchase', 'interested', 'interesado',
      ];
      const hasHighIntent = highIntentKeywords.some(kw =>
        formData.message.toLowerCase().includes(kw),
      );
      if (hasHighIntent) leadScore += 20;

      await addLead?.({
        name: formData.name,
        email: formData.email,
        company: formData.company,
        phone: formData.phone,
        message: formData.message,
        source: 'hero-lead-form',
        status: 'new',
        value: 0,
        leadScore: Math.min(leadScore, 100),
        tags: [
          'hero-lead-form',
          'website',
          hasHighIntent ? 'high-intent' : 'inquiry',
          formData.company ? 'has-company' : 'individual',
        ],
        notes: t('leads.leadCapturedNote', {
          defaultValue: `Lead capturado desde Hero Lead Form.\n\nMensaje:\n{{message}}`,
          message: formData.message,
        }),
      });

      setSubmitStatus('success');
      setFormData({ name: '', email: '', company: '', phone: '', message: '' });
      setTimeout(() => setSubmitStatus('idle'), 5000);
    } catch (error) {
      console.error('Error submitting hero-lead:', error);
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const cardRadius = borderRadiusMap[cardBorderRadius] || '1rem';
  const inputRadius = borderRadiusMap[inputBorderRadius] || '0.5rem';
  const btnRadius = borderRadiusMap[buttonBorderRadius] || '0.5rem';
  const py = paddingYMap[paddingY] || '4rem';
  const px = paddingXMap[paddingX] || '2rem';

  const formBgWithOpacity =
    formCardOpacity < 100
      ? hexToRgba(c.formBackground, formCardOpacity / 100)
      : c.formBackground;

  // ── Info panel ────────────────────────────────────────────────────────────
  const infoPanel = (
    <div
      className="relative flex flex-col justify-center"
      style={{
        padding: `${py} ${px}`,
        minHeight: '100%',
      }}
    >
      {/* Background image for info side */}
      {imageUrl && (
        <>
          <div
            className="absolute inset-0 bg-cover"
            style={{ backgroundImage: `url(${imageUrl})`, backgroundPosition: imagePosition || 'center' }}
          />
          <div
            className={`absolute inset-0 ${glassEffect ? 'backdrop-blur-md' : ''}`}
            style={{ backgroundColor: hexToRgba(c.infoBackground || c.background, overlayOpacity / 100) }}
          />
        </>
      )}

      <div className="relative z-10 max-w-xl" style={{ margin: formPosition === 'right' ? '0 auto 0 0' : '0 0 0 auto' }}>
        {/* Badge */}
        {badgeText && (
          <span
            className="inline-block px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-full mb-6"
            style={{
              backgroundColor: hexToRgba(c.badgeBackground, 0.2),
              color: c.badgeText,
              border: `1px solid ${hexToRgba(c.badgeBackground, 0.4)}`,
            }}
          >
            {badgeText}
          </span>
        )}

        {/* Headline */}
        <h1
          className="font-extrabold font-header leading-[1.1] mb-5"
          style={{
            color: c.heading,
            fontSize: titleSizeMap[headlineFontSize],
            textTransform: 'var(--headings-transform, none)' as any,
            letterSpacing: 'var(--headings-spacing, normal)',
          }}
        >
          {headline}
        </h1>

        {/* Subheadline */}
        <p
          className="font-body leading-relaxed"
          style={{
            color: c.text,
            fontSize: descSizeMap[subheadlineFontSize],
            maxWidth: '40ch',
          }}
        >
          {subheadline}
        </p>
      </div>
    </div>
  );

  // ── Form panel ────────────────────────────────────────────────────────────
  const formPanel = (
    <div
      className="flex items-center justify-center"
      style={{ padding: `${py} ${px}` }}
    >
      <div
        className="relative w-full max-w-md overflow-hidden"
        style={{
          backgroundColor: formBgWithOpacity,
          borderRadius: cardRadius,
          border: `1px solid ${c.borderColor}`,
          ...(glassEffect
            ? {
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              }
            : {
                boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
              }),
        }}
      >
        {/* Success overlay */}
        {submitStatus === 'success' && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center z-20"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.95)',
              borderRadius: cardRadius,
              animation: 'fadeIn 0.3s ease-out',
            }}
          >
            <CheckCircle2 className="w-16 h-16 text-white mb-4" style={{ animation: 'bounceIn 0.5s ease-out' }} />
            <h3 className="text-xl font-bold text-white mb-2">{t('leads.successTitle', '¡Enviado!')}</h3>
            <p className="text-white/90 text-center px-6 text-sm">
              {successMessage || t('leads.successMessage', 'Nos pondremos en contacto pronto.')}
            </p>
          </div>
        )}

        {/* Form content */}
        <div className="p-8 md:p-10">
          {formTitle && (
            <h3
              className="font-bold font-header mb-2"
              style={{
                color: c.formHeading,
                fontSize: titleSizeMap[formTitleFontSize] || titleSizeMap.sm,
                textTransform: 'var(--headings-transform, none)' as any,
                letterSpacing: 'var(--headings-spacing, normal)',
              }}
            >
              {formTitle}
            </h3>
          )}
          {formDescription && (
            <p className="mb-6 font-body" style={{ color: c.formText, fontSize: descSizeMap[formDescriptionFontSize] || descSizeMap.sm }}>
              {formDescription}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: c.inputPlaceholder }} />
              <input
                name="name"
                type="text"
                required
                placeholder={namePlaceholder}
                value={formData.name}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 text-sm font-body transition-all outline-none focus:ring-2"
                style={{
                  backgroundColor: c.inputBackground,
                  color: c.inputText,
                  border: `1px solid ${c.inputBorder}`,
                  borderRadius: inputRadius,
                  // ring color uses accent
                  '--tw-ring-color': c.accent,
                } as React.CSSProperties}
              />
            </div>

            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: c.inputPlaceholder }} />
              <input
                name="email"
                type="email"
                required
                placeholder={emailPlaceholder}
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 text-sm font-body transition-all outline-none focus:ring-2"
                style={{
                  backgroundColor: c.inputBackground,
                  color: c.inputText,
                  border: `1px solid ${c.inputBorder}`,
                  borderRadius: inputRadius,
                  '--tw-ring-color': c.accent,
                } as React.CSSProperties}
              />
            </div>

            {/* Company (optional) */}
            {showCompanyField && (
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: c.inputPlaceholder }} />
                <input
                  name="company"
                  type="text"
                  placeholder={companyPlaceholder}
                  value={formData.company}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 text-sm font-body transition-all outline-none focus:ring-2"
                  style={{
                    backgroundColor: c.inputBackground,
                    color: c.inputText,
                    border: `1px solid ${c.inputBorder}`,
                    borderRadius: inputRadius,
                    '--tw-ring-color': c.accent,
                  } as React.CSSProperties}
                />
              </div>
            )}

            {/* Phone (optional) */}
            {showPhoneField && (
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: c.inputPlaceholder }} />
                <input
                  name="phone"
                  type="tel"
                  placeholder={phonePlaceholder}
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 text-sm font-body transition-all outline-none focus:ring-2"
                  style={{
                    backgroundColor: c.inputBackground,
                    color: c.inputText,
                    border: `1px solid ${c.inputBorder}`,
                    borderRadius: inputRadius,
                    '--tw-ring-color': c.accent,
                  } as React.CSSProperties}
                />
              </div>
            )}

            {/* Message (optional) */}
            {showMessageField && (
              <div className="relative">
                <MessageSquare className="absolute left-3.5 top-3.5 w-4 h-4" style={{ color: c.inputPlaceholder }} />
                <textarea
                  name="message"
                  rows={3}
                  placeholder={messagePlaceholder}
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 text-sm font-body transition-all outline-none focus:ring-2 resize-none"
                  style={{
                    backgroundColor: c.inputBackground,
                    color: c.inputText,
                    border: `1px solid ${c.inputBorder}`,
                    borderRadius: inputRadius,
                    '--tw-ring-color': c.accent,
                  } as React.CSSProperties}
                />
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 font-semibold text-sm font-button transition-all duration-200 hover:opacity-90 hover:shadow-lg active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                backgroundColor: c.buttonBackground,
                color: c.buttonText,
                borderRadius: btnRadius,
                textTransform: 'var(--buttons-transform, none)' as any,
                letterSpacing: 'var(--buttons-spacing, normal)',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('leads.sending', 'Enviando...')}
                </>
              ) : (
                buttonText
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  // ── Main render ───────────────────────────────────────────────────────────
  const isFormLeft = formPosition === 'left';

  return (
    <section
      id="heroLead"
      className={`w-full relative overflow-hidden ${
        glassEffect
          ? 'backdrop-blur-xl border-y border-white/10 z-20 shadow-[0_4px_30px_rgba(0,0,0,0.1)]'
          : ''
      }`}
      style={{
        backgroundColor: glassEffect ? hexToRgba(c.background, 0.4) : c.background,
        minHeight: `${Math.min(heroHeight, 100)}vh`,
      }}
    >
      <CornerGradient config={cornerGradient} />

      {/* Placeholder CSS for input placeholders */}
      <style dangerouslySetInnerHTML={{
        __html: `
          #heroLead input::placeholder,
          #heroLead textarea::placeholder {
            color: ${c.inputPlaceholder};
            opacity: 1;
          }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes bounceIn { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.05); } 70% { transform: scale(0.9); } 100% { transform: scale(1); opacity: 1; } }
        `,
      }} />

      {/* Split grid layout */}
      <div
        className="w-full h-full grid grid-cols-1 md:grid-cols-2"
        style={{ minHeight: `${Math.min(heroHeight, 100)}vh` }}
      >
        {isFormLeft ? (
          <>
            {formPanel}
            {infoPanel}
          </>
        ) : (
          <>
            {infoPanel}
            {formPanel}
          </>
        )}
      </div>
    </section>
  );
};

export default HeroLead;
