import type { PageSection } from '../types';

export function getInitialDataForLandingComponent(type: string): Record<string, any> {
  const defaults: Record<string, any> = {
    colors: { background: '#0A0A0A', text: '#ffffff', accent: '#D4AF37' },
  };

  const typeLower = type.toLowerCase();

  if (type === 'whatIsQuimera') {
    return {
      ...defaults,
      title: 'Todo lo que tu negocio necesita para crecer en internet, impulsado por AI.',
      subtitle: 'Quimera AI combina creacion de websites, contenido, automatizacion, ecommerce, leads y asistentes inteligentes en una sola plataforma.',
      introText: 'Quimera AI es una plataforma inteligente que convierte la informacion de tu negocio en una presencia digital completa.',
      differentiatorTitle: 'No es solo crear una pagina. Es construir el sistema digital de tu negocio.',
      differentiatorText: 'Mientras otras herramientas se enfocan unicamente en diseno o publicacion, Quimera AI conecta las partes esenciales del negocio.',
      primaryButtonText: 'Comienza con Quimera AI',
      secondaryButtonText: 'Ver como funciona',
      footnote: 'Disenado para pequenos negocios, creadores, profesionales, realtors, restaurantes, tiendas online y agencias.',
    };
  }

  if (type === 'templatesPreviewQuimera') {
    return {
      ...defaults,
      title: 'Comienza con un template profesional y hazlo tuyo.',
      subtitle: 'Elige una base visual disenada para tu industria y conviertela en un website unico con la ayuda de Quimera AI.',
      introText: 'Los templates de Quimera AI no son paginas rigidas. Son puntos de partida inteligentes con estructura, diseno y secciones listas para personalizar. Cambia textos, colores, imagenes, llamadas a la accion y funcionalidades sin comenzar desde una pagina en blanco.',
      differentiatorTitle: 'No empiezas desde cero. Empiezas desde una ventaja.',
      differentiatorText: 'Los templates funcionan como una base inteligente: tienen estructura, diseno y secciones esenciales listas para adaptar a tu industria, tu marca y tus objetivos.',
      primaryButtonText: 'Explorar templates',
      secondaryButtonText: 'Generar con AI',
      flowText: 'Choose template -> Customize with AI -> Launch website',
    };
  }

  if (type === 'aiWebStudioQuimera') {
    return {
      ...defaults,
      title: 'Construye tu website conversando con AI Web Studio.',
      subtitle: 'Responde preguntas simples sobre tu negocio y Quimera AI genera una pagina web inicial con estructura, textos y secciones listas para personalizar.',
      introText: 'AI Web Studio funciona como un estratega, copywriter y disenador inicial dentro de Quimera AI. Te guia paso a paso, entiende lo que vendes, quien es tu cliente y que quieres lograr, y luego crea una primera version de tu website para que puedas editar, mejorar y publicar mas rapido.',
      differentiatorTitle: 'Tu website empieza con una conversacion.',
      differentiatorText: 'AI Web Studio convierte ideas sueltas en una estructura clara: titulos, secciones, textos, llamadas a la accion y contenido inicial adaptado al tipo de negocio.',
      primaryButtonText: 'Crear con AI Web Studio',
      secondaryButtonText: 'Explorar templates',
      flowText: 'Chat -> Website Draft -> Edit -> Publish',
    };
  }

  if (type === 'bentoShowcaseQuimera') {
    return {
      ...defaults,
      title: 'Caracteristicas Principales',
      subtitle: 'Todo lo que necesitas para escalar tu negocio digital en un solo lugar',
      headline: 'Caracteristicas Principales',
      subheadline: 'Todo lo que necesitas para escalar tu negocio digital en un solo lugar',
      glassEffect: true,
    };
  }

  if (type === 'screenshotCarousel') {
    return {
      ...defaults,
      title: 'Galeria de pantallas',
      showTitle: true,
      items: [
        {
          imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop',
          altText: 'Dashboard preview',
          caption: 'Gestiona tu presencia digital desde un solo panel',
        },
        {
          imageUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&auto=format&fit=crop',
          altText: 'Workspace preview',
          caption: 'Automatiza contenido, leads y conversaciones',
        },
      ],
      slideshowVariant: 'modern',
      showArrows: true,
      showDots: true,
    };
  }

  if (typeLower.includes('hero') || typeLower.includes('cta')) {
    return {
      ...defaults,
      title: 'La plataforma definitiva para la era de la IA',
      subtitle: 'Construye y escala tu negocio digital en segundos. Todo en un solo lugar, con tu propia marca.',
      buttonText: 'Comenzar Gratis',
      secondaryButtonText: 'Agendar Demo',
      headline: 'La plataforma definitiva para la era de la IA',
      subheadline: 'Construye y escala tu negocio digital en segundos. Todo en un solo lugar, con tu propia marca.',
      primaryCta: 'Comenzar Gratis',
      secondaryCta: 'Agendar Demo',
    };
  }

  if (
    typeLower.includes('feature') ||
    typeLower.includes('showcase') ||
    typeLower.includes('metric') ||
    typeLower.includes('solution') ||
    typeLower.includes('capability') ||
    typeLower.includes('agency')
  ) {
    return {
      ...defaults,
      title: 'Caracteristicas Principales',
      subtitle: 'Todo lo que necesitas para escalar tu negocio digital en un solo lugar',
      headline: 'Caracteristicas Principales',
      subheadline: 'Todo lo que necesitas para escalar tu negocio digital en un solo lugar',
    };
  }

  if (typeLower.includes('pricing')) {
    return {
      ...defaults,
      title: 'Precios Simples y Transparentes',
      subtitle: 'Elige el plan que mejor se adapte a tus necesidades. Sin costos ocultos.',
      headline: 'Precios Simples y Transparentes',
      subheadline: 'Elige el plan que mejor se adapte a tus necesidades. Sin costos ocultos.',
    };
  }

  if (typeLower.includes('testimonial')) {
    return {
      ...defaults,
      title: 'Historias de Exito',
      subtitle: 'Unete a miles de emprendedores y agencias que ya estan escalando con QuimeraAi.',
      headline: 'Historias de Exito',
      subheadline: 'Unete a miles de emprendedores y agencias que ya estan escalando con QuimeraAi.',
    };
  }

  if (typeLower.includes('faq')) {
    return {
      ...defaults,
      title: 'Preguntas Frecuentes',
      subtitle: 'Resolvemos tus dudas sobre la plataforma',
      headline: 'Preguntas Frecuentes',
      subheadline: 'Resolvemos tus dudas sobre la plataforma',
    };
  }

  return {
    ...defaults,
    title: 'Titulo de la Seccion',
    subtitle: 'Descripcion breve de esta seccion. Puedes editar este texto para que coincida con tu marca.',
    buttonText: 'Saber mas',
    headline: 'Titulo de la Seccion',
    subheadline: 'Descripcion breve de esta seccion. Puedes editar este texto para que coincida con tu marca.',
    primaryCta: 'Saber mas',
  };
}

export const isQuimeraLandingComponent = (type: string | PageSection): boolean =>
  String(type).endsWith('Quimera') ||
  [
    'whatIsQuimera',
    'templatesPreviewQuimera',
    'aiWebStudioQuimera',
    'contentManagerQuimera',
    'imageGeneratorQuimera',
    'chatbotWorkflowQuimera',
    'chatbotBuilderQuimera',
    'leadsManagerQuimera',
    'appointmentsQuimera',
    'bioPageQuimera',
    'emailMarketingQuimera',
  ].includes(String(type));
