import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, CheckCircle2, Clock, CreditCard, Loader2, Mail, MessageSquare, Phone, User } from 'lucide-react';
import type { AppointmentBookingData, BorderRadiusSize, FontSize, PaddingSize } from '../types';
import { useDesignTokens } from '../hooks/useDesignTokens';
import CornerGradient from './ui/CornerGradient';
import { mergeChatbotEngineSurfaceContext, type ChatbotEngineSurfaceContext } from '../utils/chatbotEngine/surfaceContext';

const WIDGET_API_BASE_URL = (import.meta.env.VITE_WIDGET_API_BASE_URL || '/api/widget').replace(/\/$/, '');
const APPOINTMENT_CHECKOUT_API_URL = import.meta.env.VITE_APPOINTMENT_CHECKOUT_API_URL || '/api/appointments/payments/checkout';

const paddingYClasses: Record<PaddingSize, string> = {
  none: 'py-0',
  sm: 'py-10 md:py-14',
  md: 'py-14 md:py-20',
  lg: 'py-20 md:py-28',
  xl: 'py-24 md:py-36',
};

const paddingXClasses: Record<PaddingSize, string> = {
  none: 'px-0',
  sm: 'px-4',
  md: 'px-6',
  lg: 'px-8',
  xl: 'px-12',
};

const radiusClasses: Record<BorderRadiusSize, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
};

const titleSizeClasses: Record<FontSize, string> = {
  sm: 'text-2xl md:text-3xl',
  md: 'text-3xl md:text-4xl',
  lg: 'text-4xl md:text-5xl',
  xl: 'text-5xl md:text-6xl',
};

const descriptionSizeClasses: Record<FontSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

interface AppointmentBookingProps extends AppointmentBookingData {
  projectId?: string;
  ownerId?: string;
  compact?: boolean;
  sourceComponent?: string;
  sourceModule?: string;
  sourceSurface?: ChatbotEngineSurfaceContext['sourceSurface'];
  sourceBlockId?: string;
  chatbotEngineContext?: ChatbotEngineSurfaceContext;
  onBookingIntent?: () => void;
  onBookingCompleted?: (result: {
    appointmentId?: string;
    orderId?: string;
    bookingServiceId?: string;
    serviceName?: string;
    startDate?: string;
    endDate?: string;
    projectId?: string;
    paymentRequired?: boolean;
  }) => void;
}

interface AvailabilitySlot {
  startDate: string;
  endDate: string;
  label: string;
  date: string;
  time: string;
}

interface BookingService {
  id?: string;
  name?: string;
  durationMinutes?: number;
  paymentMode?: string;
  depositAmount?: number;
  prepaidAmount?: number;
  paymentAmount?: number;
  currency?: string;
  ecommerceProductId?: string;
}

const dateInputValue = (date: Date): string => date.toISOString().slice(0, 10);

const tomorrowDateInputValue = (): string => {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  return dateInputValue(next);
};

const fieldClass = (radius: BorderRadiusSize) =>
  `w-full border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-offset-0 ${radiusClasses[radius]}`;

const buildPaymentReturnUrl = (
  status: 'success' | 'cancelled',
  params: Record<string, string | undefined | null> = {},
): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  const url = new URL(window.location.href);
  url.searchParams.set('appointmentPayment', status);
  Object.entries(params).forEach(([key, value]) => {
    const normalizedValue = typeof value === 'string' ? value.trim() : '';
    if (normalizedValue) url.searchParams.set(key, normalizedValue);
  });
  return url.toString();
};

const formatPaymentAmount = (amount: number | undefined, currency: string | undefined, locale: string): string => {
  if (!amount) return '';
  try {
    return new Intl.NumberFormat(locale || 'en', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  } catch (_error) {
    return `${amount.toFixed(2)} ${currency || 'USD'}`;
  }
};

const AppointmentBooking: React.FC<AppointmentBookingProps> = ({
  title,
  subtitle,
  description,
  serviceLabel,
  dateLabel,
  slotLabel,
  namePlaceholder,
  emailPlaceholder,
  phonePlaceholder,
  messagePlaceholder,
  buttonText,
  successMessage,
  noSlotsMessage,
  durationMinutes = 60,
  paddingY = 'md',
  paddingX = 'md',
  cardBorderRadius = 'lg',
  inputBorderRadius = 'md',
  buttonBorderRadius = 'md',
  colors = {},
  titleFontSize = 'md',
  descriptionFontSize = 'md',
  cornerGradient,
  projectId,
  ownerId,
  compact = false,
  sourceComponent = 'AppointmentBooking',
  sourceModule = 'appointments',
  sourceSurface = 'booking_page',
  sourceBlockId,
  chatbotEngineContext,
  onBookingIntent,
  onBookingCompleted,
}) => {
  const { t, i18n } = useTranslation();
  const { getColor } = useDesignTokens();
  const widgetApiProjectId = ownerId && projectId ? `${ownerId}_${projectId}` : projectId;
  const isSpanish = i18n.language?.toLowerCase().startsWith('es');
  const bt = useCallback((key: string, fallbackEn: string, fallbackEs?: string, options: Record<string, unknown> = {}) => (
    String(t(`appointmentBooking.${key}`, {
      defaultValue: isSpanish ? (fallbackEs || fallbackEn) : fallbackEn,
      ...options,
    }))
  ), [isSpanish, t]);

  const [selectedDate, setSelectedDate] = useState(tomorrowDateInputValue);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [services, setServices] = useState<BookingService[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedSlotStart, setSelectedSlotStart] = useState('');
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error' | 'payment'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const hasTrackedBookingIntentRef = useRef(false);

  const resolvedService = useMemo(() => {
    if (!services.length) return null;
    return services.find(service => service.id === selectedServiceId) || services[0];
  }, [selectedServiceId, services]);

  const selectedSlot = useMemo(
    () => slots.find(slot => slot.startDate === selectedSlotStart) || null,
    [selectedSlotStart, slots],
  );

  const resolvedDuration = resolvedService?.durationMinutes || durationMinutes || 60;
  const resolvedPaymentMode = resolvedService?.paymentMode || 'none';
  const resolvedPaymentAmount = resolvedService?.depositAmount || resolvedService?.prepaidAmount || resolvedService?.paymentAmount;

  useEffect(() => {
    if (!widgetApiProjectId || !selectedDate) {
      setSlots([]);
      return;
    }

    const controller = new AbortController();
    const loadAvailability = async () => {
      setIsLoadingSlots(true);
      setSubmitStatus('idle');
      setErrorMessage('');
      try {
        const url = new URL(
          `${WIDGET_API_BASE_URL}/${encodeURIComponent(widgetApiProjectId)}/availability`,
          window.location.origin,
        );
        url.searchParams.set('date', selectedDate);
        url.searchParams.set('durationMinutes', String(resolvedDuration));
        url.searchParams.set('maxSlots', '24');
        const response = await fetch(url.toString(), { signal: controller.signal });
        if (!response.ok) throw new Error(bt('errors.availability', 'Availability could not be loaded.', 'No se pudo cargar la disponibilidad.'));
        const payload = await response.json();
        const nextSlots = Array.isArray(payload.slots) ? payload.slots : [];
        const nextServices = Array.isArray(payload.services) ? payload.services : [];
        setSlots(nextSlots);
        setServices(nextServices);
        setSelectedSlotStart(nextSlots[0]?.startDate || '');
        if (!selectedServiceId && nextServices[0]?.id) setSelectedServiceId(nextServices[0].id);
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        setSlots([]);
        setErrorMessage((error as Error).message || bt('errors.availability', 'Availability could not be loaded.', 'No se pudo cargar la disponibilidad.'));
      } finally {
        setIsLoadingSlots(false);
      }
    };

    loadAvailability();
    return () => controller.abort();
  }, [bt, resolvedDuration, selectedDate, selectedServiceId, widgetApiProjectId]);

  const sectionStyle: React.CSSProperties = {
    backgroundColor: colors.background || getColor('background'),
    color: colors.text || getColor('text'),
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.cardBackground || getColor('surface'),
    borderColor: colors.borderColor || getColor('border'),
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: colors.inputBackground || getColor('surface'),
    borderColor: colors.inputBorder || colors.borderColor || getColor('border'),
    color: colors.inputText || getColor('text'),
  };

  const accentColor = colors.accent || getColor('primary');
  const heading = title || bt('title', 'Book an appointment', 'Reserva una cita');
  const body = description || bt('description', 'Choose an available time and we will send your request to the team.', 'Elige un horario disponible y enviaremos tu solicitud al equipo.');

  const buildBookingSurfaceContext = useCallback(() => mergeChatbotEngineSurfaceContext(
    chatbotEngineContext,
    {
      sourceSurface: chatbotEngineContext?.sourceSurface || sourceSurface,
      sourceModule: sourceModule || chatbotEngineContext?.sourceModule,
      route: chatbotEngineContext?.route || (typeof window !== 'undefined' ? window.location.pathname : undefined),
      entityType: 'booking_page',
      entityId: sourceBlockId || projectId || widgetApiProjectId,
      contextKeys: [
        'booking_page',
        'appointments',
        sourceComponent,
        sourceBlockId ? `block:${sourceBlockId}` : '',
      ].filter(Boolean),
      metadata: {
        projectId,
        ownerId,
        widgetApiProjectId,
        sourceComponent,
        sourceBlockId,
        durationMinutes: resolvedDuration,
        bookingServiceId: resolvedService?.id,
        serviceName: resolvedService?.name,
        paymentMode: resolvedPaymentMode,
        ecommerceProductId: resolvedService?.ecommerceProductId,
        locale: i18n.language,
      },
    },
  ), [
    chatbotEngineContext,
    i18n.language,
    ownerId,
    projectId,
    resolvedDuration,
    resolvedPaymentMode,
    resolvedService?.ecommerceProductId,
    resolvedService?.id,
    resolvedService?.name,
    sourceBlockId,
    sourceComponent,
    sourceModule,
    sourceSurface,
    widgetApiProjectId,
  ]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!widgetApiProjectId) {
      setSubmitStatus('error');
      setErrorMessage(bt('errors.projectRequired', 'Public booking requires a configured project.', 'La reserva publica requiere un proyecto configurado.'));
      return;
    }
    if (!selectedSlot) {
      setSubmitStatus('error');
      setErrorMessage(bt('errors.slotRequired', 'Select an available time.', 'Selecciona un horario disponible.'));
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const bookingSurfaceContext = buildBookingSurfaceContext();
      const response = await fetch(`${WIDGET_API_BASE_URL}/${encodeURIComponent(widgetApiProjectId)}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'public_booking',
          sourceComponent,
          sourceModule: bookingSurfaceContext.sourceModule,
          sourceSurface: bookingSurfaceContext.sourceSurface,
          chatbotEngineContext: bookingSurfaceContext,
          publicSubmissionId: `${bookingSurfaceContext.sourceModule}:${sourceComponent}:${Date.now()}`,
          idempotencyKey: `${bookingSurfaceContext.sourceModule}:${sourceComponent}:${widgetApiProjectId}:${formData.email || formData.phone || formData.name}:${selectedSlot.startDate}`,
          title: `${resolvedService?.name || heading} - ${formData.name}`,
          description: formData.message,
          type: 'consultation',
          participantName: formData.name,
          participantEmail: formData.email,
          participantPhone: formData.phone,
          startDate: selectedSlot.startDate,
          endDate: selectedSlot.endDate,
          bookingServiceId: resolvedService?.id,
          ecommerceProductId: resolvedService?.ecommerceProductId,
          paymentStatus: resolvedPaymentMode === 'deposit'
            ? 'deposit_pending'
            : resolvedPaymentMode === 'prepaid'
              ? 'prepaid_pending'
              : undefined,
          locale: i18n.language,
          metadata: {
            serviceName: resolvedService?.name,
            paymentMode: resolvedPaymentMode,
            depositAmount: resolvedService?.depositAmount,
            prepaidAmount: resolvedService?.prepaidAmount,
            paymentAmount: resolvedPaymentAmount,
            currency: resolvedService?.currency || 'USD',
            ecommerceProductId: resolvedService?.ecommerceProductId,
            sourceBlockId,
            sourceSurface: bookingSurfaceContext.sourceSurface,
            sourceModule: bookingSurfaceContext.sourceModule,
            chatbotEngineContext: bookingSurfaceContext,
            locale: i18n.language,
          },
        }),
      });

      if (!response.ok) throw new Error(bt('errors.submit', 'The appointment request could not be sent.', 'No se pudo enviar la solicitud de cita.'));
      const bookingResult = await response.json();

      if (bookingResult.paymentRequired && bookingResult.ecommerceOrderId) {
        setSubmitStatus('payment');
        const checkoutResponse = await fetch(APPOINTMENT_CHECKOUT_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: bookingResult.projectId || widgetApiProjectId,
            appointmentId: bookingResult.appointmentId,
            orderId: bookingResult.ecommerceOrderId,
            successUrl: buildPaymentReturnUrl('success', {
              appointmentId: bookingResult.appointmentId,
              orderId: bookingResult.ecommerceOrderId,
              bioBlockId: sourceBlockId,
            }),
            cancelUrl: buildPaymentReturnUrl('cancelled', {
              appointmentId: bookingResult.appointmentId,
              orderId: bookingResult.ecommerceOrderId,
              bioBlockId: sourceBlockId,
            }),
          }),
        });
        const checkoutResult = await checkoutResponse.json().catch(() => ({}));
        if (!checkoutResponse.ok || !checkoutResult.checkoutUrl) {
          throw new Error(checkoutResult.error || bt('errors.payment', 'The appointment was created, but secure checkout could not be opened.', 'La cita fue creada, pero no se pudo abrir el checkout seguro.'));
        }
        window.location.assign(checkoutResult.checkoutUrl);
        return;
      }

      setSubmitStatus('success');
      onBookingCompleted?.({
        appointmentId: bookingResult.appointmentId,
        orderId: bookingResult.ecommerceOrderId,
        bookingServiceId: resolvedService?.id,
        serviceName: resolvedService?.name,
        startDate: selectedSlot.startDate,
        endDate: selectedSlot.endDate,
        projectId: bookingResult.projectId || widgetApiProjectId,
        paymentRequired: false,
      });
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage((error as Error).message || bt('errors.submit', 'The appointment request could not be sent.', 'No se pudo enviar la solicitud de cita.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBookingIntent = () => {
    if (hasTrackedBookingIntentRef.current) return;
    hasTrackedBookingIntentRef.current = true;
    onBookingIntent?.();
  };

  return (
    <section className={`relative overflow-hidden ${compact ? 'py-0 px-0' : `${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`}`} style={sectionStyle}>
      {cornerGradient?.enabled && <CornerGradient config={cornerGradient} />}
      <div className={`relative z-10 mx-auto grid ${compact ? 'max-w-xl gap-4' : 'max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start'}`}>
        <div className="space-y-4">
          {subtitle && (
            <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: accentColor }}>
              {subtitle}
            </p>
          )}
          <h2 className={`${titleSizeClasses[titleFontSize]} font-bold leading-tight`} style={{ color: colors.heading || getColor('heading') }}>
            {heading}
          </h2>
          <p className={`${descriptionSizeClasses[descriptionFontSize]} max-w-xl leading-7`} style={{ color: colors.description || colors.text || getColor('text-muted') }}>
            {body}
          </p>
          <div className={`grid max-w-xl gap-3 ${compact ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
            <div className={`border p-4 ${radiusClasses[cardBorderRadius]}`} style={cardStyle}>
              <CalendarDays size={20} style={{ color: accentColor }} />
              <p className="mt-2 text-sm font-semibold">{bt('confirmation', 'Request linked to CRM', 'Solicitud vinculada al CRM')}</p>
            </div>
            <div className={`border p-4 ${radiusClasses[cardBorderRadius]}`} style={cardStyle}>
              <Clock size={20} style={{ color: accentColor }} />
              <p className="mt-2 text-sm font-semibold">{bt('reviewNotice', 'Confirmation depends on final availability', 'Confirmacion sujeta a disponibilidad final')}</p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          onFocusCapture={handleBookingIntent}
          onClick={handleBookingIntent}
          className={`border p-4 shadow-sm ${compact ? '' : 'sm:p-6'} ${radiusClasses[cardBorderRadius]}`}
          style={cardStyle}
        >
          <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
            {services.length > 0 && (
              <label className={compact ? '' : 'sm:col-span-2'}>
                <span className="mb-1.5 block text-sm font-medium">{serviceLabel || bt('serviceLabel', 'Service', 'Servicio')}</span>
                <select
                  value={selectedServiceId}
                  onChange={(event) => setSelectedServiceId(event.target.value)}
                  className={fieldClass(inputBorderRadius)}
                  style={inputStyle}
                >
                  {services.map((service, index) => (
                    <option key={service.id || service.name || index} value={service.id || ''}>
                      {service.name || bt('defaultService', 'General appointment', 'Cita general')}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              <span className="mb-1.5 block text-sm font-medium">{dateLabel || bt('dateLabel', 'Date', 'Fecha')}</span>
              <input
                type="date"
                value={selectedDate}
                min={dateInputValue(new Date())}
                onChange={(event) => setSelectedDate(event.target.value)}
                className={fieldClass(inputBorderRadius)}
                style={inputStyle}
              />
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-medium">{slotLabel || bt('slotLabel', 'Available time', 'Horario disponible')}</span>
              <select
                value={selectedSlotStart}
                onChange={(event) => setSelectedSlotStart(event.target.value)}
                className={fieldClass(inputBorderRadius)}
                style={inputStyle}
                disabled={isLoadingSlots || slots.length === 0}
              >
                {isLoadingSlots && <option>{bt('loadingSlots', 'Loading times...', 'Cargando horarios...')}</option>}
                {!isLoadingSlots && slots.length === 0 && <option>{noSlotsMessage || bt('noSlots', 'No times are available for this date.', 'No hay horarios disponibles para esta fecha.')}</option>}
                {!isLoadingSlots && slots.map(slot => (
                  <option key={slot.startDate} value={slot.startDate}>{slot.label}</option>
                ))}
              </select>
            </label>

            <label>
              <span className="sr-only">{bt('nameLabel', 'Name', 'Nombre')}</span>
              <div className="relative">
                <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
                <input
                  required
                  value={formData.name}
                  onChange={(event) => setFormData(prev => ({ ...prev, name: event.target.value }))}
                  placeholder={namePlaceholder || bt('namePlaceholder', 'Full name', 'Nombre completo')}
                  className={`${fieldClass(inputBorderRadius)} pl-9`}
                  style={inputStyle}
                />
              </div>
            </label>

            <label>
              <span className="sr-only">{bt('emailLabel', 'Email', 'Email')}</span>
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(event) => setFormData(prev => ({ ...prev, email: event.target.value }))}
                  placeholder={emailPlaceholder || bt('emailPlaceholder', 'email@example.com', 'email@ejemplo.com')}
                  className={`${fieldClass(inputBorderRadius)} pl-9`}
                  style={inputStyle}
                />
              </div>
            </label>

            <label>
              <span className="sr-only">{bt('phoneLabel', 'Phone', 'Telefono')}</span>
              <div className="relative">
                <Phone size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
                <input
                  value={formData.phone}
                  onChange={(event) => setFormData(prev => ({ ...prev, phone: event.target.value }))}
                  placeholder={phonePlaceholder || bt('phonePlaceholder', 'Phone', 'Telefono')}
                  className={`${fieldClass(inputBorderRadius)} pl-9`}
                  style={inputStyle}
                />
              </div>
            </label>

            <label className={compact ? '' : 'sm:col-span-2'}>
              <span className="sr-only">{bt('messageLabel', 'Message', 'Mensaje')}</span>
              <div className="relative">
                <MessageSquare size={16} className="pointer-events-none absolute left-3 top-3.5 opacity-60" />
                <textarea
                  rows={4}
                  value={formData.message}
                  onChange={(event) => setFormData(prev => ({ ...prev, message: event.target.value }))}
                  placeholder={messagePlaceholder || bt('messagePlaceholder', 'Tell us what we should prepare for the appointment', 'Cuentanos que necesitas preparar para la cita')}
                  className={`${fieldClass(inputBorderRadius)} pl-9`}
                  style={inputStyle}
                />
              </div>
            </label>
          </div>

          {resolvedPaymentMode !== 'none' && resolvedPaymentAmount && (
            <div className={`mt-4 flex items-start gap-2 border px-3 py-2 text-sm font-medium ${radiusClasses[cardBorderRadius]}`} style={cardStyle}>
              <CreditCard size={18} style={{ color: accentColor }} />
              <span>
                {bt('paymentNotice', 'Payment due at booking: {{amount}}', 'Pago requerido al reservar: {{amount}}', {
                  amount: formatPaymentAmount(resolvedPaymentAmount, resolvedService?.currency, i18n.language),
                })}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isLoadingSlots || !selectedSlot}
            className={`mt-5 flex w-full items-center justify-center gap-2 px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${radiusClasses[buttonBorderRadius]}`}
            style={{
              backgroundColor: colors.buttonBackground || accentColor,
              color: colors.buttonText || '#ffffff',
            }}
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CalendarDays size={16} />}
            {submitStatus === 'payment'
              ? bt('paymentRedirecting', 'Opening secure checkout...', 'Abriendo checkout seguro...')
              : buttonText || bt('buttonText', 'Request appointment', 'Solicitar cita')}
          </button>

          {submitStatus === 'success' && (
            <div className="mt-4 flex items-start gap-2 text-sm font-medium text-emerald-600">
              <CheckCircle2 size={18} />
              <span>{successMessage || bt('successMessage', 'Request received. We will contact you to confirm the appointment.', 'Solicitud recibida. Te contactaremos para confirmar la cita.')}</span>
            </div>
          )}
          {(submitStatus === 'error' || errorMessage) && (
            <p className="mt-4 text-sm font-medium text-red-600">{errorMessage}</p>
          )}
        </form>
      </div>
    </section>
  );
};

export default AppointmentBooking;
