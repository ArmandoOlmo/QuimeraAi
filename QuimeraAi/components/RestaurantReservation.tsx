import React, { useState } from 'react';
import { RestaurantReservationData, PaddingSize, BorderRadiusSize, FontSize, CornerGradientConfig } from '../types';
import { createPublicReservation } from '../services/restaurants/publicRestaurantService';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Clock, Users, User, Mail, Phone, MessageSquare, CheckCircle2, Loader2, UtensilsCrossed, Armchair } from 'lucide-react';
import { hexToRgba } from '../utils/colorUtils';
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

interface RestaurantReservationProps {
  data: RestaurantReservationData;
  borderRadius?: BorderRadiusSize;
  buttonBorderRadius?: BorderRadiusSize;
}

const RestaurantReservation: React.FC<RestaurantReservationProps> = ({
  data,
  borderRadius = 'xl',
  buttonBorderRadius = 'xl',
}) => {
  const { t } = useTranslation();

  const {
    title,
    subtitle,
    description,
    buttonText,
    successMessage,
    showPhone = true,
    showNotes = true,
    showTablePreference = false,
    maxPartySize = 20,
    minPartySize = 1,
    paddingY = 'md',
    paddingX = 'md',
    colors,
    titleFontSize = 'md',
    descriptionFontSize = 'md',
    restaurantId,
    cornerGradient,
  } = data;

  // Colors with proper fallbacks
  const sectionColors = {
    background: colors?.background || '#0f172a',
    heading: colors?.heading || '#ffffff',
    text: colors?.text || '#94a3b8',
    accent: colors?.accent || '#4f46e5',
    description: colors?.description || colors?.text || '#94a3b8',
    cardBackground: colors?.cardBackground || 'rgba(30, 41, 59, 0.6)',
    inputBackground: colors?.inputBackground || 'rgba(15, 23, 42, 0.8)',
    inputBorder: colors?.inputBorder || '#334155',
    inputText: colors?.inputText || '#ffffff',
    buttonBackground: colors?.buttonBackground || colors?.accent || '#4f46e5',
    buttonText: colors?.buttonText || '#ffffff',
  };

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    date: '',
    time: '',
    partySize: 2,
    tablePreference: '',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'partySize' ? Number(value) : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) {
      setErrorMessage(t('restaurant.reservation.noRestaurantLinked'));
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      await createPublicReservation(restaurantId, {
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        date: formData.date,
        time: formData.time,
        partySize: formData.partySize,
        tablePreference: formData.tablePreference,
        notes: formData.notes,
      });

      setSubmitStatus('success');
      setFormData({
        customerName: '', customerEmail: '', customerPhone: '',
        date: '', time: '', partySize: 2, tablePreference: '', notes: '',
      });
      setTimeout(() => setSubmitStatus('idle'), 6000);
    } catch (err: any) {
      console.error('[RestaurantReservation] Error:', err);
      setErrorMessage(err.message || t('restaurant.reservation.genericError'));
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Minimum date: today
  const today = new Date().toISOString().split('T')[0];

  const inputBaseClasses = `border px-4 py-3 focus:ring-2 focus:outline-none w-full font-body transition-all duration-200 ${borderRadiusClasses[borderRadius]}`;

  return (
    <section
      id="restaurant-reservation"
      className="w-full relative overflow-hidden"
      style={{ backgroundColor: sectionColors.background }}
    >
      <CornerGradient config={cornerGradient} />
      {/* Placeholder placeholder styling for inputs */}
      <style dangerouslySetInnerHTML={{
        __html: `
        #restaurant-reservation input::placeholder,
        #restaurant-reservation textarea::placeholder,
        #restaurant-reservation select { color: ${hexToRgba(sectionColors.inputText, 0.5)}; }
      `}} />

      <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]} relative z-10`}>
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Info */}
          <div className="text-center lg:text-left">
            {/* Icon */}
            <div className="flex justify-center lg:justify-start mb-6">
              <div
                className="p-4 rounded-2xl"
                style={{ backgroundColor: hexToRgba(sectionColors.accent, 0.125) }}
              >
                <UtensilsCrossed size={36} style={{ color: sectionColors.accent }} />
              </div>
            </div>

            {subtitle && (
              <p
                className="text-sm font-semibold uppercase tracking-wider mb-3 font-body"
                style={{ color: sectionColors.accent }}
              >
                {subtitle}
              </p>
            )}

            <h2
              className={`${titleSizeClasses[titleFontSize]} font-extrabold mb-4 font-header`}
              style={{ color: sectionColors.heading, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}
            >
              {title || t('restaurant.reservation.defaultTitle')}
            </h2>

            {description && (
              <p
                className={`${descriptionSizeClasses[descriptionFontSize]} font-body opacity-90`}
                style={{ color: sectionColors.description }}
              >
                {description}
              </p>
            )}

            {/* Feature points */}
            <div className="mt-8 space-y-4 hidden lg:block">
              {[
                { icon: <CalendarDays size={20} />, label: t('restaurant.reservation.featureFlexibleDates') },
                { icon: <Users size={20} />, label: t('restaurant.reservation.featureGroupBooking') },
                { icon: <CheckCircle2 size={20} />, label: t('restaurant.reservation.featureInstantConfirmation') },
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: hexToRgba(sectionColors.accent, 0.15), color: sectionColors.accent }}
                  >
                    {feat.icon}
                  </div>
                  <span className="font-body text-sm" style={{ color: sectionColors.text }}>
                    {feat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Form */}
          <div
            className={`p-8 md:p-10 border backdrop-blur-xl relative ${borderRadiusClasses[borderRadius]}`}
            style={{ backgroundColor: sectionColors.cardBackground, borderColor: sectionColors.inputBorder }}
          >
            {/* Success overlay */}
            {submitStatus === 'success' && (
              <div className={`absolute inset-0 bg-green-500/95 backdrop-blur-sm flex flex-col items-center justify-center z-10 animate-fade-in ${borderRadiusClasses[borderRadius]}`}>
                <CheckCircle2 className="w-16 h-16 text-white mb-4 animate-bounce" />
                <h3 className="text-2xl font-bold text-white mb-2 font-header">{t('restaurant.reservation.successTitle')}</h3>
                <p className="text-white text-center px-6 font-body">
                  {successMessage || t('restaurant.reservation.successMessage')}
                </p>
              </div>
            )}

            {/* Error message */}
            {submitStatus === 'error' && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                <p className="text-red-400 text-sm font-body">{errorMessage}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name & Email */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 font-body" style={{ color: sectionColors.heading }}>
                    {t('restaurant.reservation.nameLabel')}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" style={{ color: sectionColors.inputText }} />
                    <input
                      type="text" name="customerName"
                      placeholder={t('restaurant.reservation.namePlaceholder')}
                      value={formData.customerName} onChange={handleChange}
                      required disabled={isSubmitting}
                      className={`${inputBaseClasses} pl-10 disabled:opacity-50`}
                      style={{ backgroundColor: sectionColors.inputBackground, borderColor: sectionColors.inputBorder, color: sectionColors.inputText, '--tw-ring-color': sectionColors.accent } as React.CSSProperties}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 font-body" style={{ color: sectionColors.heading }}>
                    {t('restaurant.reservation.emailLabel')}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" style={{ color: sectionColors.inputText }} />
                    <input
                      type="email" name="customerEmail"
                      placeholder={t('restaurant.reservation.emailPlaceholder')}
                      value={formData.customerEmail} onChange={handleChange}
                      required disabled={isSubmitting}
                      className={`${inputBaseClasses} pl-10 disabled:opacity-50`}
                      style={{ backgroundColor: sectionColors.inputBackground, borderColor: sectionColors.inputBorder, color: sectionColors.inputText, '--tw-ring-color': sectionColors.accent } as React.CSSProperties}
                    />
                  </div>
                </div>
              </div>

              {/* Phone (conditional) */}
              {showPhone && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5 font-body" style={{ color: sectionColors.heading }}>
                    {t('restaurant.reservation.phoneLabel')}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" style={{ color: sectionColors.inputText }} />
                    <input
                      type="tel" name="customerPhone"
                      placeholder={t('restaurant.reservation.phonePlaceholder')}
                      value={formData.customerPhone} onChange={handleChange}
                      disabled={isSubmitting}
                      className={`${inputBaseClasses} pl-10 disabled:opacity-50`}
                      style={{ backgroundColor: sectionColors.inputBackground, borderColor: sectionColors.inputBorder, color: sectionColors.inputText, '--tw-ring-color': sectionColors.accent } as React.CSSProperties}
                    />
                  </div>
                </div>
              )}

              {/* Date, Time, Party Size */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 font-body" style={{ color: sectionColors.heading }}>
                    {t('restaurant.reservation.dateLabel')}
                  </label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" style={{ color: sectionColors.inputText }} />
                    <input
                      type="date" name="date" min={today}
                      value={formData.date} onChange={handleChange}
                      required disabled={isSubmitting}
                      className={`${inputBaseClasses} pl-10 disabled:opacity-50`}
                      style={{ backgroundColor: sectionColors.inputBackground, borderColor: sectionColors.inputBorder, color: sectionColors.inputText, '--tw-ring-color': sectionColors.accent, colorScheme: 'dark' } as React.CSSProperties}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 font-body" style={{ color: sectionColors.heading }}>
                    {t('restaurant.reservation.timeLabel')}
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" style={{ color: sectionColors.inputText }} />
                    <input
                      type="time" name="time"
                      value={formData.time} onChange={handleChange}
                      required disabled={isSubmitting}
                      className={`${inputBaseClasses} pl-10 disabled:opacity-50`}
                      style={{ backgroundColor: sectionColors.inputBackground, borderColor: sectionColors.inputBorder, color: sectionColors.inputText, '--tw-ring-color': sectionColors.accent, colorScheme: 'dark' } as React.CSSProperties}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 font-body" style={{ color: sectionColors.heading }}>
                    {t('restaurant.reservation.partySizeLabel')}
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" style={{ color: sectionColors.inputText }} />
                    <select
                      name="partySize"
                      value={formData.partySize} onChange={handleChange}
                      disabled={isSubmitting}
                      className={`${inputBaseClasses} pl-10 disabled:opacity-50 appearance-none cursor-pointer`}
                      style={{ backgroundColor: sectionColors.inputBackground, borderColor: sectionColors.inputBorder, color: sectionColors.inputText, '--tw-ring-color': sectionColors.accent } as React.CSSProperties}
                    >
                      {Array.from({ length: maxPartySize - minPartySize + 1 }, (_, i) => minPartySize + i).map(n => (
                        <option key={n} value={n}>{n} {n === 1 ? t('restaurant.reservation.guest') : t('restaurant.reservation.guests')}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Table Preference (conditional) */}
              {showTablePreference && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5 font-body" style={{ color: sectionColors.heading }}>
                    {t('restaurant.reservation.tablePreferenceLabel')}
                  </label>
                  <div className="relative">
                    <Armchair className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" style={{ color: sectionColors.inputText }} />
                    <select
                      name="tablePreference"
                      value={formData.tablePreference} onChange={handleChange}
                      disabled={isSubmitting}
                      className={`${inputBaseClasses} pl-10 disabled:opacity-50 appearance-none cursor-pointer`}
                      style={{ backgroundColor: sectionColors.inputBackground, borderColor: sectionColors.inputBorder, color: sectionColors.inputText, '--tw-ring-color': sectionColors.accent } as React.CSSProperties}
                    >
                      <option value="">{t('restaurant.reservation.noPreference')}</option>
                      <option value="indoor">{t('restaurant.reservation.indoor')}</option>
                      <option value="outdoor">{t('restaurant.reservation.outdoor')}</option>
                      <option value="bar">{t('restaurant.reservation.bar')}</option>
                      <option value="private">{t('restaurant.reservation.privateRoom')}</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Notes (conditional) */}
              {showNotes && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5 font-body" style={{ color: sectionColors.heading }}>
                    {t('restaurant.reservation.notesLabel')}
                  </label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 w-4 h-4 opacity-40" style={{ color: sectionColors.inputText }} />
                    <textarea
                      name="notes" rows={3}
                      placeholder={t('restaurant.reservation.notesPlaceholder')}
                      value={formData.notes} onChange={handleChange}
                      disabled={isSubmitting}
                      className={`${inputBaseClasses} pl-10 disabled:opacity-50`}
                      style={{ backgroundColor: sectionColors.inputBackground, borderColor: sectionColors.inputBorder, color: sectionColors.inputText, '--tw-ring-color': sectionColors.accent } as React.CSSProperties}
                    />
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting || !restaurantId}
                className={`w-full font-bold py-4 px-8 shadow-lg hover:opacity-90 transition-all duration-300 transform hover:scale-[1.02] font-button disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${borderRadiusClasses[buttonBorderRadius || borderRadius]}`}
                style={{
                  backgroundColor: sectionColors.buttonBackground,
                  color: sectionColors.buttonText,
                  textTransform: 'var(--buttons-transform, none)' as any,
                  letterSpacing: 'var(--buttons-spacing, normal)',
                }}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin w-5 h-5" />
                    {t('restaurant.reservation.submitting')}
                  </span>
                ) : (
                  buttonText || t('restaurant.reservation.defaultButton')
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RestaurantReservation;
