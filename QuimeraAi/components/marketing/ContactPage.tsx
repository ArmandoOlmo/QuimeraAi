/**
 * ContactPage — Public marketing contact page for Quimera.ai
 * Uses MarketingLayout to match the app's global header/footer.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, MessageSquare, Send, Loader2 } from 'lucide-react';
import MarketingLayout from './MarketingLayout';
import { savePlatformLead } from '../../services/platformLeadService';

interface ContactPageProps {
  onNavigateToRegister?: () => void;
  onNavigateToLogin?: () => void;
  onNavigateToHome?: () => void;
}

const ContactPage: React.FC<ContactPageProps> = ({
  onNavigateToRegister,
  onNavigateToLogin,
  onNavigateToHome,
}) => {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await savePlatformLead({
        name,
        email,
        message,
        source: 'contact-page',
        status: 'new',
        score: 40,
        tags: ['contact-form', 'landing'],
      });
      setSubmitted(true);
    } catch (err) {
      console.error('[ContactPage] Error saving lead:', err);
      setError(t('contact.errorSending', 'Hubo un error al enviar tu mensaje. Intenta de nuevo.'));
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <MarketingLayout
      onNavigateToHome={onNavigateToHome}
      onNavigateToLogin={onNavigateToLogin}
      onNavigateToRegister={onNavigateToRegister}
    >
      {/* Content */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-center bg-gradient-to-r from-white via-yellow-200 to-yellow-400 bg-clip-text text-transparent">
            {t('contact.title', 'Contacto')}
          </h1>
          <p className="text-center text-white/50 mb-12 text-lg">
            {t('contact.subtitle', '¿Tienes preguntas? Estamos aquí para ayudarte.')}
          </p>

          {submitted ? (
            <div className="text-center p-12 rounded-2xl bg-white/[0.03] border border-yellow-500/20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-yellow-400/10 flex items-center justify-center">
                <Send className="w-8 h-8 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">{t('contact.sent', '¡Mensaje enviado!')}</h3>
              <p className="text-white/50">{t('contact.sentDesc', 'Te responderemos lo antes posible.')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 p-8 rounded-2xl bg-white/[0.03] border border-white/5">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  {t('contact.name', 'Nombre')}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400/40 transition-all"
                  placeholder={t('contact.namePlaceholder', 'Tu nombre')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  {t('contact.email', 'Email')}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400/40 transition-all"
                  placeholder={t('contact.emailPlaceholder', 'tu@email.com')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  {t('contact.message', 'Mensaje')}
                </label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400/40 transition-all resize-none"
                  placeholder={t('contact.messagePlaceholder', '¿En qué podemos ayudarte?')}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl text-black font-semibold transition-colors shadow-lg shadow-yellow-400/10 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('contact.sending', 'Enviando...')}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {t('contact.send', 'Enviar mensaje')}
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-12 grid md:grid-cols-3 gap-6 text-center">
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-yellow-400/20 transition-all group">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-yellow-400/10 flex items-center justify-center group-hover:bg-yellow-400/20 transition-colors">
                <Mail className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="text-sm text-white/40">Email</div>
              <div className="text-sm text-white/70 mt-1">hola@quimera.ai</div>
            </div>
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-yellow-400/20 transition-all group">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-yellow-400/10 flex items-center justify-center group-hover:bg-yellow-400/20 transition-colors">
                <MessageSquare className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="text-sm text-white/40">Chat</div>
              <div className="text-sm text-white/70 mt-1">{t('contact.liveChat', 'Chat en vivo 24/7')}</div>
            </div>
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-yellow-400/20 transition-all group">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-yellow-400/10 flex items-center justify-center group-hover:bg-yellow-400/20 transition-colors">
                <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                </svg>
              </div>
              <div className="text-sm text-white/40">Social</div>
              <div className="text-sm text-white/70 mt-1">@quimeraai</div>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default ContactPage;
