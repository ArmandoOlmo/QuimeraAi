/**
 * ContactPage — Public marketing contact page for Quimera.ai
 */

import React, { useState } from 'react';

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
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: integrate with Cloud Function / leads
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {/* Header */}
      <header className="border-b border-white/5 backdrop-blur-xl bg-[#0a0a1a]/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={onNavigateToHome}
            className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
          >
            Quimera AI
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={onNavigateToLogin}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Iniciar sesión
            </button>
            <button
              onClick={onNavigateToRegister}
              className="text-sm px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors font-medium"
            >
              Registrarse
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-center bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent">
            Contacto
          </h1>
          <p className="text-center text-white/50 mb-12 text-lg">
            ¿Tienes preguntas? Estamos aquí para ayudarte.
          </p>

          {submitted ? (
            <div className="text-center p-12 rounded-2xl bg-white/[0.03] border border-indigo-500/20">
              <div className="text-5xl mb-4">✉️</div>
              <h3 className="text-xl font-bold mb-2">¡Mensaje enviado!</h3>
              <p className="text-white/50">Te responderemos lo antes posible.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 p-8 rounded-2xl bg-white/[0.03] border border-white/5">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Nombre</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all"
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Email</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all"
                  placeholder="tu@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Mensaje</label>
                <textarea
                  required
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all resize-none"
                  placeholder="¿En qué podemos ayudarte?"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-medium transition-colors shadow-lg shadow-indigo-500/20"
              >
                Enviar mensaje
              </button>
            </form>
          )}

          <div className="mt-12 grid md:grid-cols-3 gap-6 text-center">
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="text-2xl mb-2">📧</div>
              <div className="text-sm text-white/40">Email</div>
              <div className="text-sm text-white/70 mt-1">hola@quimera.ai</div>
            </div>
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="text-2xl mb-2">💬</div>
              <div className="text-sm text-white/40">Chat</div>
              <div className="text-sm text-white/70 mt-1">Chat en vivo 24/7</div>
            </div>
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="text-2xl mb-2">🐦</div>
              <div className="text-sm text-white/40">Social</div>
              <div className="text-sm text-white/70 mt-1">@quimeraai</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-sm text-white/30">
        © {new Date().getFullYear()} Quimera AI. Todos los derechos reservados.
      </footer>
    </div>
  );
};

export default ContactPage;
