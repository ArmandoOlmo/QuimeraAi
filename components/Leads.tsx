
import React, { useState } from 'react';
import { LeadsData, PaddingSize, BorderRadiusSize, FontSize } from '../types';
import { useEditor } from '../contexts/EditorContext';
import { CheckCircle2 } from 'lucide-react';

const paddingYClasses: Record<PaddingSize, string> = {
  sm: 'py-10 md:py-16',
  md: 'py-16 md:py-24',
  lg: 'py-20 md:py-32',
};

const paddingXClasses: Record<PaddingSize, string> = {
  sm: 'px-4',
  md: 'px-6',
  lg: 'px-8',
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
  md: 'rounded-md',
  xl: 'rounded-xl',
  full: 'rounded-full',
};

interface LeadsProps extends LeadsData {
    cardBorderRadius: BorderRadiusSize;
    buttonBorderRadius: BorderRadiusSize;
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
    cardBorderRadius, 
    buttonBorderRadius,
    titleFontSize = 'md', 
    descriptionFontSize = 'md'
}) => {
  const { addLead, activeProject } = useEditor();
  
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
        notes: `Lead capturado desde formulario de contacto.\n\nMensaje:\n${formData.message}`
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

  const inputBaseClasses = `bg-dark-900 border border-dark-700 text-site-heading px-4 py-3 focus:ring-2 focus:outline-none w-full font-body transition-all`;

  return (
    <section id="leads" className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`} style={{ backgroundColor: colors.background }}>
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 md:gap-16 items-center">
        <div className="text-center md:text-left mb-12 md:mb-0">
          <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold text-site-heading mb-4 font-header`} style={{ color: colors.heading }}>{title}</h2>
          <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body`} style={{ color: colors.text }}>
            {description}
          </p>
        </div>
        <div className={`bg-dark-800 p-8 md:p-12 border relative ${borderRadiusClasses[cardBorderRadius]}`} style={{ borderColor: colors.borderColor }}>
          {/* Success Overlay */}
          {submitStatus === 'success' && (
            <div className="absolute inset-0 bg-green-500/95 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl z-10 animate-fade-in">
              <CheckCircle2 className="w-16 h-16 text-white mb-4 animate-bounce" />
              <h3 className="text-2xl font-bold text-white mb-2">¡Mensaje Enviado!</h3>
              <p className="text-white text-center px-6">
                Gracias por contactarnos. Te responderemos pronto.
              </p>
            </div>
          )}
          
          {/* Error Message */}
          {submitStatus === 'error' && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500 rounded-lg">
              <p className="text-red-500 text-sm">
                Hubo un error al enviar el mensaje. Por favor intenta nuevamente.
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
                className={`${inputBaseClasses} ${borderRadiusClasses[cardBorderRadius]} disabled:opacity-50`} 
                style={{'--tw-ring-color': colors.accent} as React.CSSProperties} 
              />
              <input 
                type="email" 
                name="email"
                placeholder={emailPlaceholder} 
                value={formData.email}
                onChange={handleChange}
                required 
                disabled={isSubmitting}
                className={`${inputBaseClasses} ${borderRadiusClasses[cardBorderRadius]} disabled:opacity-50`} 
                style={{'--tw-ring-color': colors.accent} as React.CSSProperties} 
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
              style={{'--tw-ring-color': colors.accent} as React.CSSProperties} 
            />
            <textarea 
              name="message"
              placeholder={messagePlaceholder} 
              rows={5} 
              value={formData.message}
              onChange={handleChange}
              disabled={isSubmitting}
              className={`${inputBaseClasses} ${borderRadiusClasses[cardBorderRadius]} disabled:opacity-50`} 
              style={{'--tw-ring-color': colors.accent} as React.CSSProperties}
            ></textarea>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`w-full text-white font-bold py-4 px-8 shadow-lg hover:opacity-90 transition-all duration-300 transform hover:scale-105 font-button disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${borderRadiusClasses[buttonBorderRadius]}`} 
              style={{ backgroundColor: colors.buttonBackground || colors.accent, color: colors.buttonText || '#ffffff' }}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enviando...
                </span>
              ) : (
                buttonText
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Leads;
