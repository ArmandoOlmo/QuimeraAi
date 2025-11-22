# Quimera AI - Guía de Usuario

## Contenido
1. [Introducción](#introducción)
2. [Primeros Pasos](#primeros-pasos)
3. [Editor de Websites](#editor-de-websites)
4. [Componentes](#componentes)
5. [AI Web Builder](#ai-web-builder)
6. [Super Admin](#super-admin)
7. [Consejos y Trucos](#consejos-y-trucos)

## Introducción

Quimera AI es una plataforma de construcción de websites con inteligencia artificial que te permite crear sitios web profesionales sin necesidad de programar.

### Roles de Usuario

- **Usuario Normal**: Puede crear y editar sus propios websites
- **Super Admin**: Tiene acceso completo, puede gestionar componentes globales y configuraciones

## Primeros Pasos

### 1. Crear tu Primera Website

Al iniciar sesión, verás el **AI Web Builder** (asistente inteligente) que te guiará para crear tu primera website:

1. **Información del Negocio**
   - Nombre de tu negocio
   - Industria
   - Descripción breve

2. **Estilo Visual**
   - Estética (Minimalista, Elegante, Bold, Tech)
   - Paleta de colores
   - Objetivo principal

3. **Generación**
   - El AI creará tu website automáticamente
   - Puedes editar cualquier elemento después

### 2. Navegar el Dashboard

Desde el dashboard principal puedes:
- Ver todos tus proyectos
- Crear nuevos proyectos
- Acceder al editor
- Gestionar contenido (CMS)

## Editor de Websites

### Panel de Control (Izquierda)

El panel lateral muestra todas las secciones de tu website:

#### Secciones Disponibles
- **Hero**: Sección principal de bienvenida
- **Features**: Características de tu producto/servicio
- **Services**: Servicios que ofreces
- **Testimonials**: Testimonios de clientes
- **Team**: Tu equipo
- **CTA**: Llamados a la acción
- **Pricing**: Planes de precios
- **FAQ**: Preguntas frecuentes
- **Portfolio**: Portafolio de trabajos
- **Newsletter**: Suscripción a newsletter
- **Footer**: Pie de página

#### Gestionar Secciones

- **Mostrar/Ocultar**: Usa el ícono de ojo 👁️
- **Reordenar**: Arrastra y suelta las secciones
- **Editar**: Click en una sección para editarla

### Preview (Centro)

Vista en tiempo real de tu website. Los cambios se reflejan inmediatamente.

### Panel de Edición (Derecha)

Cuando seleccionas una sección, aparece el panel de edición con:

#### Pestañas Principales

1. **Content** (Contenido)
   - Títulos, subtítulos, textos
   - Imágenes (URLs)
   - Botones y enlaces

2. **Colors** (Colores)
   - Fondo
   - Texto
   - Botones
   - Acentos

3. **Spacing** (Espaciado)
   - Padding vertical
   - Padding horizontal
   - Márgenes

4. **Typography** (Tipografía)
   - Tamaño de fuente
   - Peso de fuente
   - Alineación

### Guardar Cambios

Los cambios se guardan automáticamente, pero puedes:
- **Guardar manualmente**: Botón "Save" arriba
- **Publicar**: Botón "Publish" para hacer tu sitio público

## Componentes

### ¿Qué son los Componentes?

Los componentes son las piezas que forman tu website (Hero, Features, etc.). En Quimera AI hay dos tipos:

#### Componentes Estándar
Incluidos por defecto en la plataforma. El Super Admin puede:
- Habilitarlos/deshabilitarlos globalmente
- Personalizar estilos por defecto
- Crear variantes

#### Componentes Personalizados
Creados por el Super Admin basándose en componentes estándar:
- Tienen configuraciones preestablecidas
- Pueden tener múltiples variantes
- Se pueden compartir entre proyectos

### Usar Componentes

1. **Agregar a tu Proyecto**
   - Los componentes habilitados aparecen en tu panel de control
   - Actívalos con el ícono de ojo 👁️

2. **Personalizar**
   - Click en el componente para editar
   - Modifica colores, texto, imágenes
   - Ajusta espaciado y tipografía

3. **Reordenar**
   - Arrastra componentes para cambiar el orden
   - El footer siempre va al final

## AI Web Builder

### Generar Website con AI

1. **Completar el Formulario**
   ```
   - Nombre del negocio
   - Industria
   - Descripción
   - Estética deseada
   - Paleta de colores
   - Objetivo principal
   ```

2. **Revisar Plan de Diseño**
   - El AI genera un plan visual
   - Muestra paleta de colores
   - Lista componentes sugeridos
   - Describes el estilo de imágenes

3. **Generar y Editar**
   - El AI crea tu website completa
   - Puedes editar cualquier elemento
   - Regenerar secciones si no te gustan

### Regenerar con AI

Dentro del editor, usa el **AI Assistant** para:
- Regenerar textos de una sección
- Sugerir mejoras
- Generar variaciones

## Super Admin

### Acceso a Funciones Avanzadas

Como Super Admin, tienes acceso a:

#### 1. Component Library

Gestiona componentes globales:

- **Habilitar/Deshabilitar**: Control global de disponibilidad
- **Búsqueda**: Encuentra componentes rápidamente
- **Filtros**: Por estado (enabled/disabled) y categoría
- **Analytics**: Ve cuántos proyectos usan cada componente

#### 2. Component Designer

Crea y personaliza componentes:

**Crear Componente Personalizado**
1. Click "New Custom Component"
2. Elige un nombre
3. Selecciona componente base
4. Personaliza estilos
5. Guarda

**Editar Componente**
1. Selecciona componente de la lista
2. Modifica estilos en el panel derecho
3. Previsualiza cambios
4. Guarda con descripción del cambio

**Versionado**
- Cada guardado crea una versión
- Historial de las últimas 10 versiones
- Puedes revertir a versión anterior

**Variantes**
- Crea múltiples versiones del mismo componente
- Ejemplo: "Hero Centrado", "Hero con Imagen Derecha"
- Usuarios pueden elegir la variante que prefieran

#### 3. Design Tokens

Define estilos globales del sistema:

- **Colores**: Paletas de colores (primary, secondary, etc.)
- **Espaciado**: Escalas de padding/margin
- **Tipografía**: Fuentes, tamaños, pesos
- **Sombras**: Efectos de sombra
- **Animaciones**: Duraciones y transiciones

Estos tokens se aplican automáticamente en toda la plataforma.

#### 4. Global Assistant Settings

Configura el comportamiento del AI:

- **Prompts**: Edita prompts del sistema
- **Modelos**: Selecciona modelos de AI
- **Parámetros**: Ajusta temperatura, max tokens, etc.

### Gestión de Componentes

#### Habilitar/Deshabilitar

```
Component Library → Toggle componente
```

**Efecto**: Los usuarios NO verán componentes deshabilitados en:
- Editor
- AI Web Builder
- Templates

#### Import/Export

**Exportar Componente**
```
Component Designer → Select Component → Export
```
Genera archivo JSON con la configuración

**Importar Componente**
```
Component Designer → Import → Select JSON
```
Crea nuevo componente desde archivo

#### Duplicar Componente

```
Component Designer → Select Component → Duplicate
```
Crea copia para modificar sin afectar original

### Analytics de Componentes

Ve estadísticas de uso:

- **Usage Count**: Número de proyectos usando el componente
- **Projects Using**: Lista de proyectos
- **Popular Components**: Los más utilizados

## Consejos y Trucos

### Optimización de Imágenes

1. **Usa URLs de imágenes optimizadas**
   - Servicios recomendados: Cloudinary, ImgIX
   - Formato WebP para mejor compresión

2. **Tamaños apropiados**
   - Hero: 1920x1080 px
   - Thumbnails: 400x300 px
   - Logos: 200x200 px

### Mejores Prácticas de Diseño

1. **Consistencia**
   - Usa la misma paleta de colores
   - Mantén espaciado uniforme
   - Tipografía consistente

2. **Jerarquía Visual**
   - Títulos grandes y claros
   - Subtítulos medianos
   - Texto cuerpo legible

3. **Espaciado**
   - No sobrecargues con contenido
   - Usa whitespace generosamente
   - Padding apropiado en móviles

### Trabajar con AI

1. **Descripciones Detalladas**
   - Sé específico sobre tu negocio
   - Describe tu audiencia objetivo
   - Menciona competidores si es relevante

2. **Iterar**
   - Genera primera versión con AI
   - Edita manualmente lo que no te guste
   - Regenera secciones específicas

3. **Prompts Efectivos**
   - "Crea un título convincente para [producto]"
   - "Genera 3 características clave de [servicio]"
   - "Escribe testimonial realista para [industria]"

### Organización de Proyectos

1. **Nombres Descriptivos**
   - "Sitio Principal - Acme Corp"
   - "Landing Page - Producto X"
   - "Portfolio Personal 2024"

2. **Templates**
   - Guarda proyectos como templates
   - Reutiliza configuraciones exitosas
   - Acelera creación de sitios similares

3. **Status**
   - Draft: En desarrollo
   - Published: En producción
   - Archived: Proyectos antiguos

### Colaboración (Próximamente)

- Compartir proyectos con equipo
- Permisos granulares (ver/editar)
- Comentarios en secciones
- Historial de cambios

## Solución de Problemas

### El componente no aparece

**Posibles causas:**
1. Componente deshabilitado globalmente (pregunta a Super Admin)
2. No está en `componentOrder` de tu proyecto
3. Está oculto (verifica ícono de ojo)

**Solución:**
- Verifica panel de control izquierdo
- Activa el componente con ícono de ojo
- Si no aparece, contacta a Super Admin

### Los cambios no se guardan

**Posibles causas:**
1. Conexión a internet perdida
2. Sesión expirada
3. Error de permisos

**Solución:**
- Verifica tu conexión
- Recarga la página (Ctrl+R / Cmd+R)
- Vuelve a iniciar sesión
- Reintenta guardar

### Imágenes no se muestran

**Posibles causas:**
1. URL incorrecta
2. Imagen no pública
3. CORS bloqueado

**Solución:**
- Verifica que la URL funcione en navegador
- Usa servicios de hosting de imágenes confiables
- Asegúrate que la imagen sea pública

### AI no genera bien el contenido

**Mejoras:**
1. Sé más específico en la descripción
2. Menciona tu industria claramente
3. Describe tu audiencia objetivo
4. Regenera si no te gusta el resultado

### Rendimiento lento

**Optimizaciones:**
1. Usa menos componentes en una página
2. Optimiza tamaño de imágenes
3. Limpia navegador (cache)
4. Usa navegador moderno (Chrome, Firefox)

## Atajos de Teclado

```
Ctrl/Cmd + S    : Guardar
Ctrl/Cmd + Z    : Deshacer
Ctrl/Cmd + Y    : Rehacer
Esc             : Cerrar panel
```

## Recursos Adicionales

- **Documentación Técnica**: Ver `COMPONENT_SYSTEM_DOCS.md`
- **Soporte**: contacto@quimeraai.com
- **Videos**: youtube.com/quimeraai
- **Comunidad**: community.quimeraai.com

## FAQ

### ¿Puedo usar mi propio dominio?

Sí, en la sección **Domains** puedes conectar tu dominio personalizado.

### ¿Hay límites de proyectos?

Depende de tu plan. Usuarios free tienen límite de 3 proyectos.

### ¿Puedo exportar mi sitio?

Sí, puedes exportar HTML/CSS (función próximamente).

### ¿Los sitios son responsive?

Sí, todos los componentes son responsive por defecto.

### ¿Puedo agregar código personalizado?

Por ahora no, pero está en el roadmap para 2025.

### ¿Cómo funciona el CMS?

El CMS te permite crear posts/artículos que se muestran en tu sitio. Perfecto para blogs.

---

**Última actualización**: Noviembre 2025
**Versión**: 2.0

¿Necesitas ayuda? Contacta a soporte@quimeraai.com

