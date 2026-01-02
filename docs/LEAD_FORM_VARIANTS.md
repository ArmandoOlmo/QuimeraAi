# Variantes del Lead Form

Se han añadido 4 estilos modernos al componente Lead Form con controles completos para personalización.

## 🎨 Variantes Disponibles

### 1. **Classic** (Clásico)
- Diseño tradicional de dos columnas
- Formulario con tarjeta elevada en el lado derecho
- Información del lado izquierdo
- Estilo limpio y profesional

**Casos de uso:**
- Sitios corporativos tradicionales
- Páginas de contacto estándar
- Negocios B2B

**Características:**
- Card con background personalizable
- Bordes y sombras configurables
- Inputs con estilos consistentes

---

### 2. **Split Gradient** (Gradiente Dividido)
- Diseño moderno de pantalla dividida
- Panel izquierdo con gradiente vibrante
- Formulario con labels visibles en el lado derecho
- Iconos informativos en el panel izquierdo

**Casos de uso:**
- Startups tecnológicas
- Empresas SaaS
- Productos digitales modernos

**Características:**
- Gradiente configurable (start y end colors)
- Elementos decorativos animados
- Iconos con información de contacto
- Etiquetas sobre cada campo del formulario
- Botón con gradiente matching

**Colores especiales:**
- `gradientStart`: Color inicial del gradiente
- `gradientEnd`: Color final del gradiente

---

### 3. **Floating Glass** (Vidrio Flotante)
- Efecto glassmorphism elegante
- Formulario flotante con backdrop-blur
- Elementos decorativos de fondo con blur
- Iconos dentro de los campos de input

**Casos de uso:**
- Portafolios creativos
- Agencias de diseño
- Marcas premium y modernas

**Características:**
- Efecto glassmorphism (vidrio esmerilado)
- Backgrounds semitransparentes
- Bordes sutiles con opacidad
- Iconos integrados en los inputs (User, Mail)
- Elementos decorativos circulares con blur

**Estilos únicos:**
- `backdrop-blur-xl` para efecto de vidrio
- Backgrounds con `bg-white/10`
- Borders con `border-white/20`

---

### 4. **Minimal Border** (Borde Minimalista)
- Diseño ultra minimalista y elegante
- Bordes decorativos en las esquinas
- Inputs con solo borde inferior
- Espaciado generoso

**Casos de uso:**
- Marcas de lujo
- Estudios de arquitectura
- Portafolios minimalistas

**Características:**
- Elementos decorativos en las 4 esquinas
- Inputs con estilo underline
- Labels con uppercase y tracking
- Botón con efecto hover de relleno
- Espaciado amplio entre elementos

**Efectos especiales:**
- Bordes solo en las esquinas (decorativo)
- Inputs con border-bottom-only
- Hover effect en botón (fill on hover)

---

## 🎛️ Controles Disponibles

### Selector de Variante
Selector visual con 4 opciones:
- Clásico
- Gradiente Dividido
- Vidrio Flotante
- Borde Minimalista

### Contenido
- **Title**: Texto del título
- **Title Size**: sm | md | lg | xl
- **Description**: Texto descriptivo
- **Description Size**: sm | md | lg | xl
- **Button Text**: Texto del botón

### Border Radius
- **Card Radius**: none | md | xl | full
- **Button Radius**: none | md | xl | full

### Spacing
- **Vertical Padding**: sm | md | lg
- **Horizontal Padding**: sm | md | lg

### Colores Base
- **Background**: Color de fondo de la sección
- **Card Background**: Color de fondo de la tarjeta/formulario
- **Heading**: Color del título
- **Text**: Color del texto descriptivo
- **Accent**: Color de acento principal
- **Border Color**: Color de los bordes

### Colores de Input
- **Input Background**: Fondo de los campos de entrada
- **Input Text**: Color del texto en inputs
- **Input Border**: Color del borde de inputs

### Colores de Botón y Gradiente
- **Button Background**: Color de fondo del botón
- **Button Text**: Color del texto del botón
- **Gradient Start**: Color inicial del gradiente (usado en variantes Split Gradient y Floating Glass)
- **Gradient End**: Color final del gradiente (usado en variantes Split Gradient y Floating Glass)

---

## 📋 Placeholders Configurables

Todos los placeholders del formulario son personalizables:
- `namePlaceholder`: "Your Full Name"
- `emailPlaceholder`: "your.email@example.com"
- `companyPlaceholder`: "Your Company Name"
- `messagePlaceholder`: "Tell us about your project..."

---

## ✨ Características Comunes

Todas las variantes incluyen:

### Estados del Formulario
- **Loading State**: Spinner animado mientras se envía
- **Success State**: Overlay verde con checkmark animado
- **Error State**: Banner de error con mensaje

### Validación
- Campos requeridos (nombre y email)
- Validación de formato de email
- Deshabilitación de inputs durante envío

### Lead Scoring Automático
- Score base por formulario de contacto
- Puntos adicionales por:
  - Incluir nombre de empresa
  - Longitud del mensaje
  - Palabras clave de alta intención

### Captura de Datos
- Integración con CRM de leads
- Tags automáticos
- Tracking de fuente
- Notas con el mensaje

---

## 🎯 Recomendaciones de Uso

### Classic
**Mejor para:**
- Negocios establecidos
- Sitios corporativos
- B2B tradicional

**Paleta sugerida:**
- Colores corporativos sólidos
- Alto contraste
- Profesional y confiable

### Split Gradient
**Mejor para:**
- Startups tech
- SaaS products
- Servicios digitales

**Paleta sugerida:**
- Gradientes vibrantes (azul → púrpura, verde → azul)
- Colores modernos y llamativos
- Alto impacto visual

### Floating Glass
**Mejor para:**
- Portfolios creativos
- Agencias de diseño
- Marcas premium

**Paleta sugerida:**
- Backgrounds oscuros con elementos brillantes
- Colores saturados para elementos de fondo
- Transparencias y efectos de luz

### Minimal Border
**Mejor para:**
- Marcas de lujo
- Arquitectura
- Minimalismo

**Paleta sugerida:**
- Monocromáticos o duotones
- Colores sutiles
- Mucho espacio en blanco

---

## 🔧 Implementación Técnica

### Archivos Modificados
1. **types.ts**: Añadido tipo `LeadsVariant` y propiedades extendidas
2. **components/Leads.tsx**: Implementación de las 4 variantes
3. **components/Controls.tsx**: Controles completos para personalización
4. **data/componentStyles.ts**: Estilos por defecto
5. **data/initialData.ts**: Datos iniciales con todas las propiedades

### Nuevas Propiedades
```typescript
export type LeadsVariant = 'classic' | 'split-gradient' | 'floating-glass' | 'minimal-border';

interface LeadsData {
  leadsVariant?: LeadsVariant;
  cardBorderRadius?: BorderRadiusSize;
  buttonBorderRadius?: BorderRadiusSize;
  colors: {
    // ... colores existentes ...
    cardBackground?: string;
    inputBackground?: string;
    inputText?: string;
    inputBorder?: string;
    gradientStart?: string;
    gradientEnd?: string;
  };
}
```

---

## 📱 Responsive Design

Todas las variantes son completamente responsive:
- **Mobile**: Layout de columna única
- **Tablet**: Adaptación de espaciados
- **Desktop**: Layout completo según diseño

### Breakpoints
- **sm**: 640px
- **md**: 768px
- **lg**: 1024px

---

## 🎨 Ejemplos de Configuración

### Configuración Moderna (Split Gradient)
```javascript
{
  leadsVariant: 'split-gradient',
  colors: {
    gradientStart: '#6366f1', // Indigo
    gradientEnd: '#8b5cf6',   // Purple
    cardBackground: '#ffffff',
    inputBackground: '#f8fafc',
    inputBorder: '#e2e8f0',
    buttonText: '#ffffff'
  }
}
```

### Configuración Dark (Floating Glass)
```javascript
{
  leadsVariant: 'floating-glass',
  colors: {
    background: '#0f172a',
    heading: '#ffffff',
    text: '#94a3b8',
    gradientStart: '#3b82f6',
    gradientEnd: '#8b5cf6',
    accent: '#6366f1'
  }
}
```

### Configuración Luxury (Minimal Border)
```javascript
{
  leadsVariant: 'minimal-border',
  colors: {
    background: '#fafafa',
    cardBackground: 'transparent',
    heading: '#0f172a',
    text: '#64748b',
    accent: '#d4af37', // Gold
    borderColor: '#e2e8f0',
    inputBorder: '#cbd5e1'
  }
}
```

---

## 🚀 Próximas Mejoras Posibles

- [ ] Animaciones de entrada (fade-in, slide-in)
- [ ] Integración con servicios de email (Mailchimp, SendGrid)
- [ ] Campos personalizados adicionales
- [ ] Validación en tiempo real
- [ ] Captcha opcional
- [ ] Subida de archivos adjuntos
- [ ] Multi-step form para variante específica

---

**Fecha de creación**: 2025
**Versión**: 1.0.0































