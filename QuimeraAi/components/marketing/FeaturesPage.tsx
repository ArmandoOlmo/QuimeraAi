/**
 * FeaturesPage — Public marketing page showcasing Quimera.ai features
 */

import React from 'react';

interface FeaturesPageProps {
  onNavigateToRegister?: () => void;
  onNavigateToLogin?: () => void;
  onNavigateToHome?: () => void;
}

const featureGroups = [
  {
    title: 'Creación con IA',
    features: [
      {
        icon: '🤖',
        name: 'Asistente AI',
        description: 'Genera secciones completas, textos y diseños con un simple prompt. Powered by Gemini.',
      },
      {
        icon: '📝',
        name: 'CMS inteligente',
        description: 'Crea y gestiona artículos de blog con generación AI, SEO automático y publicación instantánea.',
      },
      {
        icon: '🎯',
        name: 'SEO con IA',
        description: 'Optimización automática de meta tags, alt texts, schema markup y análisis de rendimiento.',
      },
    ],
  },
  {
    title: 'Editor & Diseño',
    features: [
      {
        icon: '🎨',
        name: 'Editor Visual',
        description: 'Drag & drop con 30+ componentes, temas personalizables, fuentes Google y paletas de color.',
      },
      {
        icon: '📱',
        name: 'Responsive Design',
        description: 'Todos los sitios se adaptan automáticamente a móvil, tablet y desktop sin configuración extra.',
      },
      {
        icon: '🖼️',
        name: 'Asset Manager',
        description: 'Gestiona imágenes, videos y archivos con optimización automática y CDN global.',
      },
    ],
  },
  {
    title: 'Ecommerce & Negocio',
    features: [
      {
        icon: '🛍️',
        name: 'Tienda Online',
        description: 'Catálogo de productos, carrito, checkout con Stripe, seguimiento de pedidos y inventario.',
      },
      {
        icon: '📊',
        name: 'Analytics',
        description: 'Métricas de tráfico, conversiones, comportamiento de usuarios y reportes automatizados.',
      },
      {
        icon: '📧',
        name: 'Email Marketing',
        description: 'Campañas automatizadas, segmentación, plantillas y análisis de apertura/clicks.',
      },
    ],
  },
  {
    title: 'Dominios & Hosting',
    features: [
      {
        icon: '🌐',
        name: 'Dominios Custom',
        description: 'Conecta tu propio dominio o compra uno nuevo. DNS y SSL automáticos via Cloudflare.',
      },
      {
        icon: '⚡',
        name: 'SSR & CDN',
        description: 'Server-side rendering en Cloud Run con CDN global para tiempos de carga ultrarrápidos.',
      },
      {
        icon: '🔗',
        name: 'Subdominios',
        description: 'Cada usuario recibe usuario.quimera.ai automáticamente. Sin configuración necesaria.',
      },
    ],
  },
];

const FeaturesPage: React.FC<FeaturesPageProps> = ({
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
          Todo lo que necesitas
        </h1>
        <p className="text-lg text-white/50 max-w-2xl mx-auto">
          Una plataforma completa para crear, gestionar y escalar tu presencia digital con inteligencia artificial.
        </p>
      </section>

      {/* Feature Groups */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        {featureGroups.map((group, gi) => (
          <div key={group.title} className={gi > 0 ? 'mt-20' : ''}>
            <h2 className="text-2xl font-bold mb-8 text-center">
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                {group.title}
              </span>
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {group.features.map((f) => (
                <div
                  key={f.name}
                  className="p-8 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-indigo-500/20 transition-all duration-300 group"
                >
                  <div className="text-4xl mb-4">{f.icon}</div>
                  <h3 className="text-lg font-bold mb-3 group-hover:text-indigo-400 transition-colors">
                    {f.name}
                  </h3>
                  <p className="text-white/50 text-sm leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="pb-24 px-6 text-center">
        <div className="max-w-2xl mx-auto p-12 rounded-2xl bg-gradient-to-b from-indigo-600/10 to-purple-600/5 border border-indigo-500/20">
          <h2 className="text-3xl font-bold mb-4">Empieza a crear hoy</h2>
          <p className="text-white/50 mb-8">
            Plan gratuito disponible. No se requiere tarjeta de crédito.
          </p>
          <button
            onClick={onNavigateToRegister}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-medium transition-colors shadow-lg shadow-indigo-500/20"
          >
            Crear cuenta gratis
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-sm text-white/30">
        © {new Date().getFullYear()} Quimera AI. Todos los derechos reservados.
      </footer>
    </div>
  );
};

export default FeaturesPage;
