# FAQ Component - Nuevos Estilos Modernos

## 🎨 Resumen de Cambios

Se han añadido **3 nuevos estilos modernos** al componente FAQ, además del estilo clásico existente, con controles completos en el dashboard.

## 📋 Estilos Disponibles

### 1. **Classic** (Original)
- Diseño simple con acordeón
- Divisores de borde entre preguntas
- Iconos Plus/Minus para expandir/colapsar
- Ideal para diseños tradicionales

### 2. **Cards** 🎴
- Cada pregunta en una tarjeta separada
- Sombras y efectos hover
- Icono chevron con animación de rotación
- Bordes que cambian de color al expandir
- Fondo de tarjeta personalizable

### 3. **Gradient** ✨
- Tarjetas con gradientes suaves
- Efectos de brillo y sombras con color accent
- Animaciones suaves en hover
- Borde lateral de color en las respuestas
- Iconos con gradiente cuando están expandidos
- Controles para colores de gradiente (inicio y fin)

### 4. **Minimal** 🎯
- Diseño minimalista y limpio
- Iconos grandes con círculos de fondo
- Sin bordes ni tarjetas
- Espaciado amplio entre preguntas
- Icono de ayuda (HelpCircle) distintivo
- Perfecto para diseños modernos y limpios

## 🛠️ Archivos Modificados

### 1. **components/Faq.tsx**
- Añadido tipo `FaqVariant` con 4 opciones: 'classic', 'cards', 'gradient', 'minimal'
- Creado componente separado para cada variante:
  - `FaqItemClassic`
  - `FaqItemCards`
  - `FaqItemGradient`
  - `FaqItemMinimal`
- Añadidos nuevos iconos de Lucide: `ChevronDown`, `HelpCircle`
- Implementadas transiciones y animaciones suaves
- Soporte para colores personalizados por variante

### 2. **data/componentStyles.ts**
- Añadido `faqVariant: 'classic'` como valor por defecto
- Añadido `borderRadius: 'xl'` para control de esquinas redondeadas
- Ampliados los colores del FAQ con:
  - `cardBackground`: Para variante Cards
  - `gradientStart`: Para variante Gradient
  - `gradientEnd`: Para variante Gradient

### 3. **components/dashboard/admin/ComponentControls.tsx**
- Creada función `renderFaqControls()` específica para FAQ
- Añadido selector de variante con 4 opciones
- Control de Border Radius (aparece solo en variantes no-classic)
- Controles de colores adicionales según variante seleccionada:
  - Card Background (para Cards)
  - Gradient Start/End (para Gradient)
- Descripción visual de cada variante en el selector

### 4. **types.ts**
- Actualizada interfaz `FaqData` para incluir:
  - `faqVariant?: 'classic' | 'cards' | 'gradient' | 'minimal'`
  - Nuevos colores opcionales en el objeto `colors`:
    - `cardBackground?: string`
    - `gradientStart?: string`
    - `gradientEnd?: string`

## 🎯 Controles Disponibles en el Dashboard

Cuando se selecciona el componente FAQ en el editor, los usuarios ahora tienen acceso a:

1. **Selector de Variante** (4 opciones con preview visual)
2. **Border Radius** (solo para Cards, Gradient y Minimal)
3. **Layout & Spacing**
   - Padding Vertical (SM, MD, LG)
   - Padding Horizontal (SM, MD, LG)
4. **Colores**
   - Background
   - Text
   - Heading
   - Accent
   - Border Color
   - Card Background (solo Cards)
   - Gradient Start (solo Gradient)
   - Gradient End (solo Gradient)
5. **Tipografía**
   - Title Size (SM, MD, LG, XL)
   - Description Size (SM, MD, LG, XL)

## ✨ Características Destacadas

- **Animaciones suaves**: Todas las variantes tienen transiciones elegantes
- **Responsive**: Funcionan perfectamente en móviles y escritorio
- **Accesibilidad**: Implementado con `aria-expanded` para lectores de pantalla
- **Personalización completa**: Todos los colores y tamaños son configurables
- **Preview en tiempo real**: Los cambios se reflejan instantáneamente en el editor

## 🚀 Uso

1. Abre el editor de páginas
2. Selecciona o añade un componente FAQ
3. En el panel derecho, verás el selector "FAQ Style"
4. Elige entre: Classic, Cards, Gradient o Minimal
5. Personaliza colores, espaciado y tipografía según tu preferencia
6. Los cambios se aplican en tiempo real

## 📝 Notas Técnicas

- Cada variante está optimizada para rendimiento
- Las animaciones usan `grid-rows` para transiciones suaves de altura
- Los colores soportan valores rgba para transparencias
- Compatible con el sistema de temas existente
- Sin errores de linting TypeScript















