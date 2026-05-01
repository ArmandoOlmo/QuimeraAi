import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, Clock, Users, ArrowRight, CheckCircle, Video, MapPin, CalendarCheck, CalendarClock, Phone } from 'lucide-react';

interface AppointmentsQuimeraProps {
    title?: string;
    subtitle?: string;
    features?: Array<{
        title: string;
        description: string;
        icon: string;
    }>;
    colors?: {
        background?: string;
        text?: string;
        accent?: string;
        cardBackground?: string;
        cardBorder?: string;
        cardText?: string;
        secondaryText?: string;
    };
    textDropShadow?: boolean;
    isPreviewMode?: boolean;
    imagePosition?: 'left' | 'right';
}

const iconMap: Record<string, React.FC<{ className?: string }>> = {
    Calendar: CalendarIcon, Clock, Users, CalendarCheck, CalendarClock
};

const AppointmentsQuimera: React.FC<AppointmentsQuimeraProps> = ({
    title,
    subtitle,
    features,
    colors = {},
    textDropShadow = false,
    isPreviewMode = false,
    imagePosition = 'right',
}) => {
    const { t } = useTranslation();
    const [bookingStep, setBookingStep] = useState(0);

    const bgColor = colors.background || '#050505';
    const textColor = colors.text || '#ffffff';
    const accentColor = colors.accent || '#3B82F6'; // Blue for scheduling
    const cardBg = colors.cardBackground || 'rgba(255,255,255,0.02)';
    const cardBorder = colors.cardBorder || 'rgba(255,255,255,0.05)';
    const secondaryColor = colors.secondaryText || '#9ca3af';

    const displayTitle = title || t('quimera.appointments.title', 'Agendamiento Inteligente');
    const displaySubtitle = subtitle || t('quimera.appointments.subtitle', 'Olvídate de los correos interminables. Permite a tus clientes reservar reuniones, consultas o servicios directamente en tu sitio web según tu disponibilidad.');

    const getDefaultFeatures = (t: any) => [
        {
            title: t('quimera.appointments.feat1.title', 'Sincronización Bidireccional'),
            description: t('quimera.appointments.feat1.desc', 'Se conecta con tu Google Calendar o Outlook para que nunca haya cruces de horarios.'),
            icon: 'CalendarClock'
        },
        {
            title: t('quimera.appointments.feat2.title', 'Recordatorios Automáticos'),
            description: t('quimera.appointments.feat2.desc', 'Envía notificaciones por email y SMS para reducir drásticamente las ausencias (no-shows).'),
            icon: 'Clock'
        },
        {
            title: t('quimera.appointments.feat3.title', 'Tipos de Reunión Customizables'),
            description: t('quimera.appointments.feat3.desc', 'Configura duraciones, formularios previos y ubicación (Zoom, Meet, o presencial) por cada servicio.'),
            icon: 'CalendarCheck'
        }
    ];

    const displayFeatures = features && features.length > 0 ? features : getDefaultFeatures(t);

    // Simulate booking flow
    useEffect(() => {
        if (isPreviewMode) return;
        
        const interval = setInterval(() => {
            setBookingStep((prev) => {
                if (prev >= 2) return 0;
                return prev + 1;
            });
        }, 3500);

        return () => clearInterval(interval);
    }, [isPreviewMode]);

    return (
        <section className="py-12 md:py-24 px-4 sm:px-6 relative overflow-hidden flex items-center" style={{ backgroundColor: bgColor, color: textColor, minHeight: '80vh' }}>
            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full filter blur-[100px] opacity-20" style={{ backgroundColor: accentColor }}></div>
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-violet-500/10 rounded-full filter blur-[120px]"></div>
            </div>

            <div className={`relative z-10 max-w-7xl mx-auto w-full flex flex-col-reverse ${imagePosition === 'right' ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 lg:gap-20 items-center`}>
                
                {/* Left Column: Dynamic Mockup */}
                <div className="w-full lg:w-1/2 relative mt-8 lg:mt-0">
                    {/* Booking Flow Mockup */}
                    <div 
                        className="relative rounded-2xl overflow-hidden shadow-2xl border h-[480px] bg-[#0A0A0A] flex flex-col items-center justify-center p-6"
                        style={{ 
                            borderColor: cardBorder,
                            boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px ${accentColor}15`
                        }}
                    >
                        {/* Interactive UI Wrapper */}
                        <div className="w-full max-w-sm bg-[#141414] border rounded-xl overflow-hidden shadow-lg transition-all duration-500 relative" style={{ borderColor: '#222' }}>
                            
                            {/* Header */}
                            <div className="p-4 border-b flex flex-col items-center justify-center text-center space-y-2 bg-[#1A1A1A]" style={{ borderColor: '#222' }}>
                                <div className="w-12 h-12 rounded-full border-2 overflow-hidden bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-xl font-bold" style={{ borderColor: accentColor }}>
                                    Q
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-200">Consultoría Estratégica</h3>
                                    <p className="text-xs text-gray-500 flex items-center justify-center gap-1 mt-1">
                                        <Clock className="w-3 h-3" /> 45 min
                                        <span className="mx-1">•</span>
                                        <Video className="w-3 h-3" /> Google Meet
                                    </p>
                                </div>
                            </div>

                            {/* Dynamic Body based on step */}
                            <div className="p-4 h-[280px] relative">
                                
                                {/* Step 0: Date & Time Selection */}
                                <div className={`absolute inset-0 p-4 transition-all duration-500 ${bookingStep === 0 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full pointer-events-none'}`}>
                                    <h4 className="text-sm font-semibold mb-3">Select a Date & Time</h4>
                                    
                                    {/* Mini Calendar Mock */}
                                    <div className="grid grid-cols-7 gap-1 text-center mb-4">
                                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, index) => (
                                            <div key={`${d}-${index}`} className="text-[10px] text-gray-500 font-bold">{d}</div>
                                        ))}
                                        {[...Array(14)].map((_, i) => (
                                            <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs mx-auto
                                                ${i < 3 ? 'text-gray-600' : 
                                                  i === 8 ? `bg-blue-500/20 font-bold border border-blue-500/50` : 
                                                  'hover:bg-[#222] cursor-pointer'}`}
                                                style={{ color: i === 8 ? accentColor : (i < 3 ? '#555' : '#ccc') }}>
                                                {i + 1}
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* Time Slots */}
                                    <div className="space-y-2 mt-4 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="p-2 border rounded-md text-center text-sm font-medium cursor-pointer bg-[#222] text-white" style={{ borderColor: '#333' }}>
                                            09:00 AM
                                        </div>
                                        <div className="p-2 border rounded-md text-center text-sm font-medium cursor-pointer" style={{ backgroundColor: accentColor, borderColor: accentColor, color: '#fff' }}>
                                            10:30 AM
                                        </div>
                                    </div>
                                </div>

                                {/* Step 1: Contact Details */}
                                <div className={`absolute inset-0 p-4 transition-all duration-500 ${bookingStep === 1 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'}`}>
                                    <h4 className="text-sm font-semibold mb-3">Your Details</h4>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[10px] text-gray-400 font-bold uppercase">Name</label>
                                            <div className="w-full h-8 bg-[#222] rounded border border-[#333] mt-1 flex items-center px-2 text-xs text-white">David Miller</div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-400 font-bold uppercase">Email</label>
                                            <div className="w-full h-8 bg-[#222] rounded border border-[#333] mt-1 flex items-center px-2 text-xs text-white">david.m@example.com</div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-400 font-bold uppercase">Phone (Optional)</label>
                                            <div className="w-full h-8 bg-[#222] rounded border border-[#333] mt-1 flex items-center px-2 text-xs text-gray-500">+1 234 567 8900</div>
                                        </div>
                                        <div className="pt-2">
                                            <button className="w-full py-2 rounded-md font-bold text-sm text-white flex items-center justify-center gap-2" style={{ backgroundColor: accentColor }}>
                                                Confirm Booking <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Step 2: Confirmation */}
                                <div className={`absolute inset-0 p-4 transition-all duration-500 flex flex-col items-center justify-center text-center ${bookingStep === 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                                        <CheckCircle className="w-8 h-8 text-green-500" />
                                    </div>
                                    <h4 className="text-lg font-bold text-white mb-1">Confirmed!</h4>
                                    <p className="text-xs text-gray-400 mb-6">You are scheduled with Quimera AI.</p>
                                    
                                    <div className="w-full p-3 rounded-lg bg-[#222] border border-[#333] text-left">
                                        <div className="flex items-center gap-2 mb-2 text-sm text-white font-medium">
                                            <CalendarIcon className="w-4 h-4 text-gray-400" /> Wednesday, Oct 14
                                        </div>
                                        <div className="flex items-center gap-2 mb-2 text-sm text-white font-medium">
                                            <Clock className="w-4 h-4 text-gray-400" /> 10:30 AM - 11:15 AM
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-white font-medium">
                                            <Video className="w-4 h-4 text-blue-400" /> Web Conferencing details to follow
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Floating sync indicator */}
                        <div className="absolute top-6 right-6 bg-[#111] border border-[#333] rounded-full px-3 py-1.5 flex items-center gap-2 shadow-lg animate-pulse">
                            <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" />
                            <span className="text-[10px] font-mono text-gray-300">Syncing to Google Calendar</span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Text & Tabs */}
                <div className="w-full lg:w-1/2">
                    <div className="mb-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6 border" style={{ backgroundColor: `${accentColor}15`, color: accentColor, borderColor: `${accentColor}30` }}>
                            <CalendarIcon className="w-4 h-4" />
                            {t('quimera.appointments.badge', 'Reservas & Citas')}
                        </div>
                        <h2 className={`text-4xl md:text-5xl lg:text-[3.5rem] font-black mb-6 tracking-tight leading-tight font-header ${textDropShadow ? 'drop-shadow-xl' : ''}`}
                            style={{ textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>
                            {displayTitle}
                        </h2>
                        <p className={`text-lg md:text-xl font-light font-body ${textDropShadow ? 'drop-shadow-md' : ''}`} style={{ color: secondaryColor }}>
                            {displaySubtitle}
                        </p>
                    </div>

                    {/* Features List */}
                    <div className="space-y-4">
                        {displayFeatures.map((feature, idx) => {
                            const IconComp = iconMap[feature.icon] || CalendarCheck;

                            return (
                                <div 
                                    key={idx}
                                    className="p-5 rounded-2xl border transition-all duration-300 hover:translate-x-1"
                                    style={{
                                        backgroundColor: cardBg,
                                        borderColor: cardBorder,
                                    }}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accentColor}10` }}>
                                            <IconComp className="w-5 h-5" style={{ color: accentColor }} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold font-header heading-caps mb-2" style={{ color: textColor }}>
                                                {feature.title}
                                            </h3>
                                            <p className="text-sm font-light font-body" style={{ color: secondaryColor }}>
                                                {feature.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </section>
    );
};

// Helper icon
const RefreshCw = ({ className, style }: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
    </svg>
);

export default AppointmentsQuimera;
