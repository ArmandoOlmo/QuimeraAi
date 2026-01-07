
import React, { useState } from 'react';
import { LeadsData, PaddingSize, BorderRadiusSize, FontSize, LeadsVariant, CornerGradientConfig } from '../types';
import { useSafeEditor } from '../contexts/EditorContext';
import { CheckCircle2, Mail, Phone, User, Loader2 } from 'lucide-react';
import { useDesignTokens } from '../hooks/useDesignTokens';
import { useTranslation } from 'react-i18next';
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

interface LeadsProps extends LeadsData {
  leadsVariant?: LeadsVariant;
  cardBorderRadius?: BorderRadiusSize;
  buttonBorderRadius?: BorderRadiusSize;
  inputBorderRadius?: BorderRadiusSize;
  cornerGradient?: CornerGradientConfig;
}

const Leads: React.FC<LeadsProps> = ({
  title,
  description,
  namePlaceholder,
  emailPlaceholder,
  companyPlaceholder,
  messagePlaceholder,
  buttonText,
  paddingY,
  paddingX,
  colors,
  leadsVariant = 'classic',
  cardBorderRadius = 'xl',
  buttonBorderRadius = 'md',
  inputBorderRadius = 'md',
  titleFontSize = 'md',
  descriptionFontSize = 'md',
  cornerGradient
}) => {
  const { t } = useTranslation();
  // Use safe versions for public preview compatibility
  const editorContext = useSafeEditor();
  const addLead = editorContext?.addLead;
  const activeProject = editorContext?.activeProject;

  // Get design tokens with primary color
  const { getColor } = useDesignTokens();
  const primaryColor = getColor('primary.main', '#4f46e5');

  // Use component colors directly - respect user's choices
  const leadsColors = {
    ...colors,
    background: colors?.background || '#0f172a',
    cardBackground: colors?.cardBackground || primaryColor,
    heading: colors?.heading || '#F9FAFB',
    text: colors?.text || '#94a3b8',
    description: colors?.description || colors?.text || '#94a3b8',
    accent: colors?.accent || '#4f46e5',
    borderColor: colors?.borderColor || '#334155',
    inputBackground: colors?.inputBackground || '#0f172a',
    inputText: colors?.inputText || '#F9FAFB',
    inputBorder: colors?.inputBorder || '#334155',
    inputPlaceholder: colors?.inputPlaceholder || '#6b7280',
    buttonBackground: colors?.buttonBackground || colors?.accent || '#4f46e5',
    buttonText: colors?.buttonText || '#ffffff',
    gradientStart: colors?.gradientStart || colors?.accent || '#4f46e5',
    gradientEnd: colors?.gradientEnd || '#10b981',
  };

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Calculate lead score based on form completion
      let leadScore = 40; // Base score for contact form
      if (formData.company) leadScore += 10;
      if (formData.message && formData.message.length > 50) leadScore += 20;
      if (formData.message && formData.message.length > 150) leadScore += 10;

      // Detect high intent keywords in message
      const highIntentKeywords = [
        'precio', 'costo', 'cotización', 'comprar', 'contratar', 'disponibilidad',
        'price', 'buy', 'quote', 'purchase', 'interested', 'interesado'
      ];
      const hasHighIntent = highIntentKeywords.some(keyword =>
        formData.message.toLowerCase().includes(keyword)
      );

      if (hasHighIntent) leadScore += 20;

      await addLead({
        name: formData.name,
        email: formData.email,
        company: formData.company,
        message: formData.message,
        source: 'contact-form',
        status: 'new',
        value: 0,
        leadScore: Math.min(leadScore, 100),
        tags: [
          'contact-form',
          'website',
          hasHighIntent ? 'high-intent' : 'inquiry',
          formData.company ? 'has-company' : 'individual'
        ],
        notes: t('leads.leadCapturedNote', {
          defaultValue: `Lead capturado desde formulario de contacto.\n\nMensaje:\n{{message}}`,
          message: formData.message
        })
      });

      setSubmitStatus('success');
      setFormData({ name: '', email: '', company: '', message: '' });

      // Reset success message after 5 seconds
      setTimeout(() => setSubmitStatus('idle'), 5000);

    } catch (error) {
      console.error('Error submitting lead:', error);
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBaseClasses = `border px-4 py-3 focus:ring-2 focus:outline-none w-full font-body transition-all`;

  // Render Classic Variant
  const renderClassic = () => (
    <section id="leads" className="w-full relative overflow-hidden" style={{ backgroundColor: leadsColors.background }}>
      <CornerGradient config={cornerGradient} />
      <style dangerouslySetInnerHTML={{
        __html: `
        #leads input::placeholder, #leads textarea::placeholder {
          color: ${leadsColors.inputPlaceholder};
          opacity: 1;
        }
      `}} />
      <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]} relative z-10`}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 md:gap-16 items-center">
          <div className="text-center md:text-left mb-12 md:mb-0">
            <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold text-site-heading mb-4 font-header`} style={{ color: leadsColors.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>{title}</h2>
            <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body`} style={{ color: leadsColors.description }}>
              {description}
            </p>
          </div>
          <div className={`p-8 md:p-12 border relative ${borderRadiusClasses[cardBorderRadius]}`}
            style={{ backgroundColor: leadsColors.cardBackground, borderColor: leadsColors.borderColor }}>
            {/* Success Overlay */}
            {submitStatus === 'success' && (
              <div className={`absolute inset-0 bg-green-500/95 backdrop-blur-sm flex flex-col items-center justify-center z-10 animate-fade-in ${borderRadiusClasses[cardBorderRadius]}`}>
                <CheckCircle2 className="w-16 h-16 text-white mb-4 animate-bounce" />
                <h3 className="text-2xl font-bold text-white mb-2">{t('leads.successTitle')}</h3>
                <p className="text-white text-center px-6">
                  {t('leads.successMessage')}
                </p>
              </div>
            )}

            {/* Error Message */}
            {submitStatus === 'error' && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500 rounded-lg">
                <p className="text-red-500 text-sm">
                  {t('leads.errorMessage')}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <input
                  type="text"
                  name="name"
                  placeholder={namePlaceholder}
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  className={`${inputBaseClasses} ${borderRadiusClasses[inputBorderRadius]} disabled:opacity-50`}
                  style={{
                    backgroundColor: leadsColors.inputBackground,
                    borderColor: leadsColors.inputBorder,
                    color: leadsColors.inputText,
                    '--tw-ring-color': leadsColors.accent
                  } as React.CSSProperties}
                />
                <input
                  type="email"
                  name="email"
                  placeholder={emailPlaceholder}
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  className={`${inputBaseClasses} ${borderRadiusClasses[inputBorderRadius]} disabled:opacity-50`}
                  style={{
                    backgroundColor: leadsColors.inputBackground,
                    borderColor: leadsColors.inputBorder,
                    color: leadsColors.inputText,
                    '--tw-ring-color': leadsColors.accent
                  } as React.CSSProperties}
                />
              </div>
              <input
                type="text"
                name="company"
                placeholder={companyPlaceholder}
                value={formData.company}
                onChange={handleChange}
                disabled={isSubmitting}
                className={`${inputBaseClasses} ${borderRadiusClasses[cardBorderRadius]} disabled:opacity-50`}
                style={{
                  backgroundColor: leadsColors.inputBackground,
                  borderColor: leadsColors.inputBorder,
                  color: leadsColors.inputText,
                  '--tw-ring-color': leadsColors.accent
                } as React.CSSProperties}
              />
              <textarea
                name="message"
                placeholder={messagePlaceholder}
                rows={5}
                value={formData.message}
                onChange={handleChange}
                disabled={isSubmitting}
                className={`${inputBaseClasses} ${borderRadiusClasses[cardBorderRadius]} disabled:opacity-50`}
                style={{
                  backgroundColor: leadsColors.inputBackground,
                  borderColor: leadsColors.inputBorder,
                  color: leadsColors.inputText,
                  '--tw-ring-color': leadsColors.accent
                } as React.CSSProperties}
              ></textarea>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full text-white font-bold py-4 px-8 shadow-lg hover:opacity-90 transition-all duration-300 transform hover:scale-105 font-button disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${borderRadiusClasses[buttonBorderRadius]}`}
                style={{ backgroundColor: leadsColors.buttonBackground, color: leadsColors.buttonText, textTransform: 'var(--buttons-transform, none)' as any, letterSpacing: 'var(--buttons-spacing, normal)' }}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                    {t('leads.sending')}
                  </span>
                ) : (
                  buttonText
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );

  // Render Split Gradient Variant
  const renderSplitGradient = () => (
    <section id="leads" className="w-full relative overflow-hidden"
      style={{ backgroundColor: leadsColors.background }}>
      <CornerGradient config={cornerGradient} />
      <style dangerouslySetInnerHTML={{
        __html: `
        #leads input::placeholder, #leads textarea::placeholder {
          color: ${leadsColors.inputPlaceholder};
          opacity: 1;
        }
      `}} />
      <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]} relative z-10`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-0 items-stretch">
            {/* Left Side - Gradient Info */}
            <div className="relative p-12 md:p-16 flex flex-col justify-center text-white"
              style={{
                background: `linear-gradient(135deg, ${leadsColors.gradientStart} 0%, ${leadsColors.gradientEnd} 100%)`
              }}>
              <div className="relative z-10">
                <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-6">
                  <span className="text-sm font-semibold">{t('leads.contactUs')}</span>
                </div>
                <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold mb-6 font-header`}>
                  {title}
                </h2>
                <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body mb-8 opacity-90`}>
                  {description}
                </p>

                {/* Feature Icons */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{t('leads.fastResponse')}</p>
                      <p className="text-sm opacity-80">{t('leads.responseIn24h')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{t('leads.directSupport')}</p>
                      <p className="text-sm opacity-80">{t('leads.personalizedAttention')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
            </div>

            {/* Right Side - Form */}
            <div className="p-8 md:p-12 lg:p-16 relative"
              style={{ backgroundColor: leadsColors.cardBackground }}>
              {/* Success Overlay */}
              {submitStatus === 'success' && (
                <div className="absolute inset-0 bg-green-500/95 backdrop-blur-sm flex flex-col items-center justify-center z-10 animate-fade-in">
                  <CheckCircle2 className="w-16 h-16 text-white mb-4 animate-bounce" />
                  <h3 className="text-2xl font-bold text-white mb-2">{t('leads.successTitle')}</h3>
                  <p className="text-white text-center px-6">
                    {t('leads.successMessage')}
                  </p>
                </div>
              )}

              {/* Error Message */}
              {submitStatus === 'error' && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500 rounded-lg">
                  <p className="text-red-500 text-sm">
                    {t('leads.errorMessage')}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: leadsColors.heading }}>
                      {t('leads.nameLabel')}
                    </label>
                    <input
                      type="text"
                      name="name"
                      placeholder={namePlaceholder}
                      value={formData.name}
                      onChange={handleChange}
                      required
                      disabled={isSubmitting}
                      className={`${inputBaseClasses} ${borderRadiusClasses[inputBorderRadius]} disabled:opacity-50`}
                      style={{
                        backgroundColor: leadsColors.inputBackground,
                        borderColor: leadsColors.inputBorder,
                        color: leadsColors.inputText,
                        '--tw-ring-color': leadsColors.accent
                      } as React.CSSProperties}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: leadsColors.heading }}>
                      {t('leads.emailLabel')}
                    </label>
                    <input
                      type="email"
                      name="email"
                      placeholder={emailPlaceholder}
                      value={formData.email}
                      onChange={handleChange}
                      required
                      disabled={isSubmitting}
                      className={`${inputBaseClasses} ${borderRadiusClasses[inputBorderRadius]} disabled:opacity-50`}
                      style={{
                        backgroundColor: leadsColors.inputBackground,
                        borderColor: leadsColors.inputBorder,
                        color: leadsColors.inputText,
                        '--tw-ring-color': leadsColors.accent
                      } as React.CSSProperties}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: leadsColors.heading }}>
                      {t('leads.companyLabel')}
                    </label>
                    <input
                      type="text"
                      name="company"
                      placeholder={companyPlaceholder}
                      value={formData.company}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className={`${inputBaseClasses} ${borderRadiusClasses[inputBorderRadius]} disabled:opacity-50`}
                      style={{
                        backgroundColor: leadsColors.inputBackground,
                        borderColor: leadsColors.inputBorder,
                        color: leadsColors.inputText,
                        '--tw-ring-color': leadsColors.accent
                      } as React.CSSProperties}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: leadsColors.heading }}>
                      {t('leads.messageLabel')}
                    </label>
                    <textarea
                      name="message"
                      placeholder={messagePlaceholder}
                      rows={5}
                      value={formData.message}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className={`${inputBaseClasses} ${borderRadiusClasses[inputBorderRadius]} disabled:opacity-50`}
                      style={{
                        backgroundColor: leadsColors.inputBackground,
                        borderColor: leadsColors.inputBorder,
                        color: leadsColors.inputText,
                        '--tw-ring-color': leadsColors.accent
                      } as React.CSSProperties}
                    ></textarea>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full font-bold py-4 px-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-button disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${borderRadiusClasses[buttonBorderRadius]}`}
                  style={{
                    background: `linear-gradient(135deg, ${leadsColors.gradientStart} 0%, ${leadsColors.gradientEnd} 100%)`,
                    color: leadsColors.buttonText,
                    textTransform: 'var(--buttons-transform, none)' as any,
                    letterSpacing: 'var(--buttons-spacing, normal)'
                  }}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                      {t('leads.sending')}
                    </span>
                  ) : (
                    buttonText
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  // Render Floating Glass Variant
  const renderFloatingGlass = () => (
    <section id="leads" className="w-full relative overflow-hidden"
      style={{ backgroundColor: leadsColors.background }}>
      <CornerGradient config={cornerGradient} />
      <style dangerouslySetInnerHTML={{
        __html: `
        #leads input::placeholder, #leads textarea::placeholder {
          color: ${leadsColors.inputPlaceholder};
          opacity: 1;
        }
      `}} />
      <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]} relative z-10`}>
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-20 blur-3xl"
            style={{ backgroundColor: leadsColors.gradientStart }}></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-20 blur-3xl"
            style={{ backgroundColor: leadsColors.gradientEnd }}></div>
        </div>

        <div className="max-w-4xl mx-auto relative">
          {/* Title Section */}
          <div className="text-center mb-12">
            <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold mb-4 font-header`} style={{ color: leadsColors.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>
              {title}
            </h2>
            <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body max-w-2xl mx-auto`} style={{ color: leadsColors.description }}>
              {description}
            </p>
          </div>

          {/* Floating Glass Form */}
          <div className={`backdrop-blur-xl border p-8 md:p-12 shadow-2xl relative ${borderRadiusClasses[cardBorderRadius]}`}
            style={{ backgroundColor: leadsColors.cardBackground, borderColor: leadsColors.borderColor }}>
            {/* Success Overlay */}
            {submitStatus === 'success' && (
              <div className={`absolute inset-0 bg-green-500/95 backdrop-blur-sm flex flex-col items-center justify-center z-10 animate-fade-in ${borderRadiusClasses[cardBorderRadius]}`}>
                <CheckCircle2 className="w-16 h-16 text-white mb-4 animate-bounce" />
                <h3 className="text-2xl font-bold text-white mb-2">{t('leads.successTitle')}</h3>
                <p className="text-white text-center px-6">
                  {t('leads.successMessage')}
                </p>
              </div>
            )}

            {/* Error Message */}
            {submitStatus === 'error' && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 backdrop-blur-sm rounded-lg">
                <p className="text-red-400 text-sm">
                  {t('leads.errorMessage')}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50" style={{ color: leadsColors.inputPlaceholder }} />
                  <input
                    type="text"
                    name="name"
                    placeholder={namePlaceholder}
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                    className={`${inputBaseClasses} pl-12 backdrop-blur-sm disabled:opacity-50 ${borderRadiusClasses[inputBorderRadius]}`}
                    style={{
                      backgroundColor: leadsColors.inputBackground,
                      borderColor: leadsColors.inputBorder,
                      color: leadsColors.inputText,
                      '--tw-ring-color': leadsColors.accent
                    } as React.CSSProperties}
                  />
                </div>

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50" style={{ color: leadsColors.inputPlaceholder }} />
                  <input
                    type="email"
                    name="email"
                    placeholder={emailPlaceholder}
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                    className={`${inputBaseClasses} pl-12 backdrop-blur-sm disabled:opacity-50 ${borderRadiusClasses[inputBorderRadius]}`}
                    style={{
                      backgroundColor: leadsColors.inputBackground,
                      borderColor: leadsColors.inputBorder,
                      color: leadsColors.inputText,
                      '--tw-ring-color': leadsColors.accent
                    } as React.CSSProperties}
                  />
                </div>
              </div>

              <input
                type="text"
                name="company"
                placeholder={companyPlaceholder}
                value={formData.company}
                onChange={handleChange}
                disabled={isSubmitting}
                className={`${inputBaseClasses} backdrop-blur-sm disabled:opacity-50 ${borderRadiusClasses[inputBorderRadius]}`}
                style={{
                  backgroundColor: leadsColors.inputBackground,
                  borderColor: leadsColors.inputBorder,
                  color: leadsColors.inputText,
                  '--tw-ring-color': leadsColors.accent
                } as React.CSSProperties}
              />

              <textarea
                name="message"
                placeholder={messagePlaceholder}
                rows={5}
                value={formData.message}
                onChange={handleChange}
                disabled={isSubmitting}
                className={`${inputBaseClasses} backdrop-blur-sm disabled:opacity-50 ${borderRadiusClasses[inputBorderRadius]}`}
                style={{
                  backgroundColor: leadsColors.inputBackground,
                  borderColor: leadsColors.inputBorder,
                  color: leadsColors.inputText,
                  '--tw-ring-color': leadsColors.accent
                } as React.CSSProperties}
              ></textarea>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full font-bold py-4 px-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-button disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${borderRadiusClasses[buttonBorderRadius]}`}
                style={{
                  background: `linear-gradient(135deg, ${leadsColors.gradientStart} 0%, ${leadsColors.gradientEnd} 100%)`,
                  color: leadsColors.buttonText,
                  textTransform: 'var(--buttons-transform, none)' as any,
                  letterSpacing: 'var(--buttons-spacing, normal)'
                }}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                    {t('leads.sending')}
                  </span>
                ) : (
                  buttonText
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );

  // Render Minimal Border Variant
  const renderMinimalBorder = () => (
    <section id="leads" className="w-full relative overflow-hidden"
      style={{ backgroundColor: leadsColors.background }}>
      <CornerGradient config={cornerGradient} />
      <style dangerouslySetInnerHTML={{
        __html: `
        #leads input::placeholder, #leads textarea::placeholder {
          color: ${leadsColors.inputPlaceholder};
          opacity: 1;
        }
      `}} />
      <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]} relative z-10`}>
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold mb-4 font-header`} style={{ color: leadsColors.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>
              {title}
            </h2>
            <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body`} style={{ color: leadsColors.description }}>
              {description}
            </p>
          </div>

          {/* Form Container */}
          <div className="relative">
            {/* Decorative Border Elements */}
            <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 opacity-50"
              style={{ borderColor: leadsColors.accent }}></div>
            <div className="absolute top-0 right-0 w-20 h-20 border-t-2 border-r-2 opacity-50"
              style={{ borderColor: leadsColors.accent }}></div>
            <div className="absolute bottom-0 left-0 w-20 h-20 border-b-2 border-l-2 opacity-50"
              style={{ borderColor: leadsColors.accent }}></div>
            <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 opacity-50"
              style={{ borderColor: leadsColors.accent }}></div>

            {/* Form */}
            <div className="p-8 md:p-16 relative" style={{ backgroundColor: leadsColors.cardBackground }}>
              {/* Success Overlay */}
              {submitStatus === 'success' && (
                <div className="absolute inset-0 bg-green-500/95 backdrop-blur-sm flex flex-col items-center justify-center z-10 animate-fade-in">
                  <CheckCircle2 className="w-16 h-16 text-white mb-4 animate-bounce" />
                  <h3 className="text-2xl font-bold text-white mb-2">{t('leads.successTitle')}</h3>
                  <p className="text-white text-center px-6">
                    {t('leads.successMessage')}
                  </p>
                </div>
              )}

              {/* Error Message */}
              {submitStatus === 'error' && (
                <div className="mb-6 p-4 border border-red-500/50 rounded-lg">
                  <p className="text-red-500 text-sm">
                    {t('leads.errorMessage')}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-sm font-medium uppercase tracking-wide" style={{ color: leadsColors.text }}>
                      {t('leads.nameLabel')}
                    </label>
                    <input
                      type="text"
                      name="name"
                      placeholder={namePlaceholder}
                      value={formData.name}
                      onChange={handleChange}
                      required
                      disabled={isSubmitting}
                      className={`${inputBaseClasses} bg-transparent border-b-2 border-t-0 border-x-0 rounded-none px-0 focus:border-b-2 disabled:opacity-50`}
                      style={{
                        borderColor: leadsColors.inputBorder,
                        color: leadsColors.inputText,
                        '--tw-ring-color': 'transparent'
                      } as React.CSSProperties}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium uppercase tracking-wide" style={{ color: leadsColors.text }}>
                      {t('leads.emailLabel')}
                    </label>
                    <input
                      type="email"
                      name="email"
                      placeholder={emailPlaceholder}
                      value={formData.email}
                      onChange={handleChange}
                      required
                      disabled={isSubmitting}
                      className={`${inputBaseClasses} bg-transparent border-b-2 border-t-0 border-x-0 rounded-none px-0 focus:border-b-2 disabled:opacity-50`}
                      style={{
                        borderColor: leadsColors.inputBorder,
                        color: leadsColors.inputText,
                        '--tw-ring-color': 'transparent'
                      } as React.CSSProperties}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium uppercase tracking-wide" style={{ color: leadsColors.text }}>
                    {t('leads.companyLabel')}
                  </label>
                  <input
                    type="text"
                    name="company"
                    placeholder={companyPlaceholder}
                    value={formData.company}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className={`${inputBaseClasses} bg-transparent border-b-2 border-t-0 border-x-0 rounded-none px-0 focus:border-b-2 disabled:opacity-50`}
                    style={{
                      borderColor: leadsColors.inputBorder,
                      color: leadsColors.inputText,
                      '--tw-ring-color': 'transparent'
                    } as React.CSSProperties}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium uppercase tracking-wide" style={{ color: leadsColors.text }}>
                    {t('leads.messageLabel')}
                  </label>
                  <textarea
                    name="message"
                    placeholder={messagePlaceholder}
                    rows={5}
                    value={formData.message}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className={`${inputBaseClasses} bg-transparent border-b-2 border-t-0 border-x-0 rounded-none px-0 focus:border-b-2 disabled:opacity-50`}
                    style={{
                      borderColor: leadsColors.inputBorder,
                      color: leadsColors.inputText,
                      '--tw-ring-color': 'transparent'
                    } as React.CSSProperties}
                  ></textarea>
                </div>

                <div className="flex justify-center md:justify-start pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`group relative font-bold py-4 px-12 overflow-hidden transition-all duration-300 font-button disabled:opacity-50 disabled:cursor-not-allowed border-2 ${borderRadiusClasses[buttonBorderRadius]}`}
                    style={{
                      borderColor: leadsColors.accent,
                      color: leadsColors.accent,
                      backgroundColor: 'transparent',
                      textTransform: 'var(--buttons-transform, none)' as any,
                      letterSpacing: 'var(--buttons-spacing, normal)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = leadsColors.accent;
                      e.currentTarget.style.color = leadsColors.buttonText;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = leadsColors.accent;
                    }}
                  >
                    <span className="relative z-10">
                      {isSubmitting ? (
                        <span className="flex items-center justify-center">
                          <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                          Enviando...
                        </span>
                      ) : (
                        buttonText
                      )}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  // Render based on variant
  switch (leadsVariant) {
    case 'split-gradient':
      return renderSplitGradient();
    case 'floating-glass':
      return renderFloatingGlass();
    case 'minimal-border':
      return renderMinimalBorder();
    case 'classic':
    default:
      return renderClassic();
  }
};

export default Leads;
