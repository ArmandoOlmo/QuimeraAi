/**
 * AboutPage — Public marketing page about Quimera.ai
 */

import React from 'react';

interface AboutPageProps {
  onNavigateToRegister?: () => void;
  onNavigateToLogin?: () => void;
  onNavigateToHome?: () => void;
}

const stats = [
  { value: '10K+', label: 'Sitios creados' },
  { value: '50+', label: 'Países' },
  { value: '99.9%', label: 'Uptime' },
  { value: '4.9★', label: 'Valoración' },
];

const values = [
  {
    icon: '🧠',
    title: 'IA al servicio del creador',
    description: 'Potenciamos la creatividad humana con inteligencia artificial, sin reemplazarla.',
  },
  {
    icon: '⚡',
    title: 'Velocidad sin compromisos',
    description: 'Sitios ultra-rápidos con SSR, CDN global y optimización automática de imágenes.',
  },
  {
    icon: '🎨',
    title: 'Diseño sin límites',
    description: 'Libertad creativa total con un editor visual potente y componentes profesionales.',
  },
  {
    icon: '🔒',
    title: 'Seguridad primero',
    description: 'SSL, backups automáticos, autenticación avanzada y cumplimiento de privacidad.',
  },
];

const AboutPage: React.FC<AboutPageProps> = ({
  onNavigateToRegister,
  onNavigateToLogin,
  onNavigateToHome,
}) => {
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

      {/* Hero */}
      <section className="py-24 px-6 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent">
          Sobre Quimera AI
        </h1>
        <p className="text-lg text-white/50 max-w-3xl mx-auto leading-relaxed">
          Quimera nace de la visión de democratizar la creación web con inteligencia artificial.
          Creemos que cada persona y negocio merece una presencia digital profesional, sin barreras técnicas.
        </p>
      </section>

      {/* Stats */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center p-6 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-white/40">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-bold text-center mb-16">Nuestros valores</h2>
        <div className="grid md:grid-cols-2 gap-8">
          {values.map((v) => (
            <div
              key={v.title}
              className="p-8 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-indigo-500/20 transition-all duration-300 group"
            >
              <div className="text-4xl mb-4">{v.icon}</div>
              <h3 className="text-xl font-bold mb-3 group-hover:text-indigo-400 transition-colors">
                {v.title}
              </h3>
              <p className="text-white/50 leading-relaxed">{v.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24 px-6 text-center">
        <h2 className="text-3xl font-bold mb-4">¿Listo para crear?</h2>
        <p className="text-white/50 mb-8 max-w-lg mx-auto">
          Únete a miles de creadores que construyen sus sitios web con Quimera AI.
        </p>
        <button
          onClick={onNavigateToRegister}
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-medium transition-colors shadow-lg shadow-indigo-500/20"
        >
          Comienza gratis
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-sm text-white/30">
        © {new Date().getFullYear()} Quimera AI. Todos los derechos reservados.
      </footer>
    </div>
  );
};

export default AboutPage;
