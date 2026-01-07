/**
 * Editor/Builder Articles - Artículos del Constructor de Sitios
 * Guías completas para dominar el editor visual
 */

export const EDITOR_ARTICLES = [
    {
        title: 'Guía completa del Editor Visual',
        slug: 'guia-completa-editor-visual',
        excerpt: 'Aprende a dominar el editor visual de Quimera AI. Desde lo básico hasta técnicas avanzadas de diseño sin código.',
        featuredImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
        status: 'published' as const,
        featured: true,
        category: 'tutorial' as const,
        tags: ['editor', 'builder', 'diseño', 'design', 'visual', 'website'],
        author: 'Equipo Quimera',
        content: `# Guía completa del Editor Visual

## Introducción

El Editor Visual de Quimera AI es una herramienta poderosa que te permite diseñar sitios web profesionales sin escribir una sola línea de código. Esta guía completa te enseñará todo lo que necesitas saber para crear diseños impresionantes.

**Tiempo de lectura:** 15 minutos
**Nivel:** Principiante a Intermedio

---

## Parte 1: Conociendo la Interfaz

### 1.1 Estructura del Editor

Al abrir el editor, verás tres áreas principales:

**🔷 Panel Izquierdo - Biblioteca de Componentes**
- Ancho: aproximadamente 250px
- Contiene todos los bloques disponibles
- Organizado por categorías
- Búsqueda de componentes

**🔷 Área Central - Lienzo de Diseño**
- Ocupa la mayor parte de la pantalla
- Vista previa en tiempo real
- Interactivo: haz clic para seleccionar elementos
- Arrastra para reordenar

**🔷 Panel Derecho - Propiedades**
- Ancho: aproximadamente 300px
- Se activa al seleccionar un elemento
- Pestañas: Contenido, Estilo, Configuración
- Opciones específicas de cada componente

### 1.2 Barra Superior

De izquierda a derecha encontrarás:

| Elemento | Función |
|----------|---------|
| ← Volver | Regresa al Dashboard |
| Nombre del proyecto | Editable con clic |
| Páginas | Gestiona páginas del sitio |
| Dispositivos | Cambia entre móvil/tablet/desktop |
| Deshacer/Rehacer | Ctrl+Z / Ctrl+Y |
| Vista previa | Abre preview en nueva pestaña |
| Guardar | Guarda cambios (Ctrl+S) |
| Publicar | Pone el sitio en línea |

### 1.3 Barra Inferior

- **Zoom:** Ajusta el nivel de zoom del lienzo
- **Capas:** Vista de la estructura de componentes
- **Historial:** Accede a versiones anteriores
- **Ayuda:** Acceso rápido a documentación

---

## Parte 2: Trabajando con Componentes

### 2.1 Categorías de Componentes

**📌 Hero (Secciones principales)**
- Hero Clásico: Título + subtítulo + botones + imagen
- Hero Moderno: Diseño asimétrico con animaciones
- Hero Video: Con video de fondo
- Hero Slider: Carrusel de imágenes

**📌 Navegación**
- Navbar: Menú de navegación principal
- Footer: Pie de página
- Sidebar: Menú lateral

**📌 Contenido**
- Features: Características con iconos
- About: Sección sobre nosotros
- Team: Perfiles del equipo
- Timeline: Línea de tiempo

**📌 Social Proof**
- Testimonials: Reseñas de clientes
- Logos: Logotipos de clientes/socios
- Stats: Números y estadísticas
- Reviews: Sistema de calificaciones

**📌 Conversión**
- CTA: Llamadas a la acción
- Pricing: Tablas de precios
- Contact: Formularios de contacto
- Newsletter: Suscripción a boletín

**📌 Media**
- Gallery: Galería de imágenes
- Video: Reproductor de video
- Maps: Mapas interactivos

**📌 E-commerce**
- Products: Grid de productos
- Product Detail: Página de producto
- Cart: Carrito de compras

### 2.2 Cómo agregar un componente

**Método 1: Arrastrar y soltar**
1. Encuentra el componente en el panel izquierdo
2. Haz clic y mantén presionado
3. Arrastra hacia el lienzo
4. Suelta cuando veas la línea guía azul
5. El componente se insertará en esa posición

**Método 2: Clic para insertar**
1. Haz clic en el componente deseado
2. Se insertará al final de la página
3. Luego puedes reordenarlo

**Método 3: Búsqueda rápida**
1. Presiona **Ctrl+K** o **Cmd+K**
2. Escribe el nombre del componente
3. Selecciona de la lista
4. Se insertará automáticamente

### 2.3 Reordenar componentes

**Dentro del lienzo:**
1. Haz clic en el componente para seleccionarlo
2. Aparecerán controles de arrastre
3. Arrastra hacia arriba o abajo
4. Suelta en la nueva posición

**Usando el panel de capas:**
1. Abre el panel de Capas (barra inferior)
2. Arrastra los elementos en la lista
3. El orden se refleja en el lienzo

### 2.4 Duplicar componentes

Para crear copias de un componente:

1. Selecciona el componente
2. Usa cualquiera de estas opciones:
   - Presiona **Ctrl+D** / **Cmd+D**
   - Haz clic derecho > **Duplicar**
   - Panel derecho > ícono de duplicar

### 2.5 Eliminar componentes

1. Selecciona el componente
2. Presiona **Delete** o **Backspace**
3. O haz clic derecho > **Eliminar**

> 💡 **Tip:** Puedes deshacer eliminaciones con Ctrl+Z

---

## Parte 3: Editando Contenido

### 3.1 Editar textos

**Edición inline (directa):**
1. Haz **doble clic** en cualquier texto
2. El cursor aparecerá en el texto
3. Edita directamente
4. Haz clic fuera para guardar

**Opciones de formato disponibles:**
- **Negrita:** Ctrl+B
- **Cursiva:** Ctrl+I
- **Subrayado:** Ctrl+U
- **Tamaño de fuente**
- **Color del texto**
- **Alineación**
- **Enlaces**

### 3.2 Cambiar imágenes

**Paso a paso:**
1. Haz clic en la imagen para seleccionarla
2. En el panel derecho, verás la sección **"Imagen"**
3. Haz clic en **"Cambiar imagen"**
4. Elige una opción:

**Opciones de imagen:**

| Opción | Descripción |
|--------|-------------|
| Subir | Sube desde tu computadora |
| Biblioteca | Banco de imágenes gratuitas |
| URL | Pega enlace de imagen externa |
| Unsplash | Busca en Unsplash directamente |

**Después de seleccionar:**
- Ajusta el **tamaño** si es necesario
- Configura el **alt text** para SEO
- Define el **comportamiento** (cubrir, contener, etc.)

### 3.3 Editar enlaces y botones

1. Selecciona el botón o enlace
2. En el panel derecho, encuentra **"Enlace"**
3. Configura:

**Tipo de enlace:**
- **Página interna:** Selecciona una página de tu sitio
- **URL externa:** Ingresa cualquier URL (https://...)
- **Email:** Abre cliente de correo (mailto:)
- **Teléfono:** Inicia llamada (tel:)
- **Ancla:** Salta a sección de la página (#seccion)
- **Archivo:** Descarga un archivo

**Opciones adicionales:**
- Abrir en nueva pestaña
- Atributo nofollow (para SEO)

### 3.4 Editar iconos

Si el componente tiene iconos:
1. Selecciona el elemento con el icono
2. Busca **"Icono"** en el panel derecho
3. Haz clic para abrir la biblioteca de iconos
4. Busca o navega por categorías
5. Selecciona el nuevo icono

**Personalización de iconos:**
- Tamaño
- Color
- Rotación

---

## Parte 4: Personalizando Estilos

### 4.1 Panel de Estilos

Al seleccionar un elemento, la pestaña **"Estilo"** ofrece:

**Espaciado:**
- Margin (espacio exterior)
- Padding (espacio interior)
- Controles visuales para cada lado

**Dimensiones:**
- Ancho (fijo, porcentaje, auto)
- Alto (fijo, porcentaje, auto)
- Ancho máximo/mínimo

**Fondo:**
- Color sólido
- Gradiente
- Imagen de fondo
- Video de fondo

**Bordes:**
- Estilo (sólido, punteado, etc.)
- Grosor
- Color
- Radio (esquinas redondeadas)

**Sombras:**
- Sombra de caja
- Desplazamiento X/Y
- Difuminado
- Color

**Tipografía (para textos):**
- Familia de fuente
- Tamaño
- Peso (grosor)
- Altura de línea
- Espaciado entre letras

### 4.2 Estilos globales vs locales

**Estilos globales:**
- Afectan todo el sitio
- Se configuran en **Configuración > Diseño**
- Incluyen: colores primarios, fuentes, espaciados base

**Estilos locales:**
- Solo afectan el elemento seleccionado
- Sobrescriben los globales
- Se configuran en el panel derecho

### 4.3 Configurar la paleta de colores

1. Ve a **Configuración** (⚙️) en la barra superior
2. Selecciona **"Diseño"**
3. En **"Colores"**, configura:

| Color | Uso |
|-------|-----|
| Primario | Botones, enlaces, acentos principales |
| Secundario | Acentos secundarios |
| Fondo | Color de fondo general |
| Texto | Color principal del texto |
| Texto secundario | Subtítulos, textos menos importantes |

**Modo oscuro:**
- Activa **"Soporte para modo oscuro"**
- Configura colores alternativos

### 4.4 Configurar tipografía global

1. En **Configuración > Diseño > Tipografía**
2. Selecciona fuentes para:
   - **Encabezados:** H1, H2, H3, etc.
   - **Cuerpo:** Párrafos y texto general

**Fuentes disponibles:**
- Google Fonts (cientos de opciones)
- Fuentes del sistema
- Fuentes personalizadas (subir archivo)

---

## Parte 5: Diseño Responsivo

### 5.1 Entendiendo los breakpoints

Quimera usa tres puntos de quiebre:

| Dispositivo | Ancho | Icono |
|-------------|-------|-------|
| Móvil | < 768px | 📱 |
| Tablet | 768px - 1024px | 📱 |
| Desktop | > 1024px | 💻 |

### 5.2 Editar para cada dispositivo

1. Selecciona el dispositivo en la barra superior
2. El lienzo se ajusta al tamaño
3. Los cambios que hagas SOLO afectan ese dispositivo

**¿Qué puedes personalizar por dispositivo?**
- Visibilidad (ocultar/mostrar)
- Tamaños de texto
- Espaciados
- Orden de elementos
- Disposición de columnas

### 5.3 Mejores prácticas responsive

**✅ Hacer:**
- Diseñar primero para móvil (mobile-first)
- Probar en los tres dispositivos antes de publicar
- Usar tamaños relativos (%, vh, vw) cuando sea posible
- Verificar que los textos sean legibles en móvil

**❌ Evitar:**
- Textos muy largos en móvil
- Elementos que se salen de la pantalla
- Botones muy pequeños para tocar
- Demasiado contenido sin espaciado

---

## Parte 6: Funciones Avanzadas

### 6.1 Animaciones

Agrega animaciones a elementos:

1. Selecciona el elemento
2. Ve a **Configuración > Animaciones**
3. Elige tipo de animación:
   - Fade (aparecer/desvanecer)
   - Slide (deslizar)
   - Zoom (escalar)
   - Bounce (rebotar)
4. Configura:
   - Duración
   - Retraso
   - Trigger (al cargar, al hacer scroll)

### 6.2 Secciones con fondo parallax

1. Selecciona una sección
2. Ve a **Estilo > Fondo**
3. Sube una imagen
4. Activa **"Efecto parallax"**
5. Ajusta la velocidad del efecto

### 6.3 Código personalizado

Si necesitas agregar código:

1. Usa el componente **"HTML personalizado"**
2. Pega tu código HTML/CSS
3. También puedes agregar scripts en **Configuración > Código personalizado**

> ⚠️ **Precaución:** El código personalizado puede afectar el rendimiento. Úsalo con moderación.

---

## Atajos de teclado esenciales

| Atajo | Acción |
|-------|--------|
| Ctrl/Cmd + S | Guardar |
| Ctrl/Cmd + Z | Deshacer |
| Ctrl/Cmd + Shift + Z | Rehacer |
| Ctrl/Cmd + D | Duplicar elemento |
| Ctrl/Cmd + C | Copiar |
| Ctrl/Cmd + V | Pegar |
| Delete | Eliminar elemento |
| Ctrl/Cmd + K | Búsqueda rápida |
| Ctrl/Cmd + P | Vista previa |
| Esc | Deseleccionar |

---

## Solución de problemas comunes

### "Los cambios no se guardan"
1. Verifica tu conexión a internet
2. Intenta recargar la página
3. Usa Ctrl+S para forzar guardado

### "El componente no se mueve"
1. Asegúrate de arrastrarlo desde el control de arrastre
2. Verifica que no esté bloqueado
3. Intenta usar el panel de capas

### "Los estilos no se aplican"
1. Verifica que el elemento correcto esté seleccionado
2. Revisa si hay estilos locales sobrescribiendo
3. Limpia la caché del navegador

---

## Recursos adicionales

- **Plantillas:** Explora diseños prediseñados para inspirarte
- **Tutoriales en video:** Canal de YouTube de Quimera
- **Comunidad:** Únete a nuestro grupo de usuarios

¿Necesitas ayuda personalizada? Nuestro equipo de soporte está disponible en el chat.`
    },
    {
        title: 'Todos los componentes explicados',
        slug: 'todos-componentes-explicados',
        excerpt: 'Catálogo completo de todos los componentes disponibles en el editor. Descripción, usos recomendados y opciones de personalización.',
        featuredImage: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800',
        status: 'published' as const,
        featured: false,
        category: 'guide' as const,
        tags: ['editor', 'components', 'builder', 'diseño', 'componentes'],
        author: 'Equipo Quimera',
        content: `# Todos los componentes explicados

## Introducción

Quimera AI ofrece una amplia biblioteca de componentes prediseñados para que puedas construir cualquier tipo de sitio web. Esta guía detalla cada componente disponible, sus usos ideales y opciones de personalización.

---

## 📌 Componentes Hero

### Hero Clásico

**Descripción:** Sección principal con título grande, subtítulo, botones de acción e imagen.

**Ideal para:**
- Páginas de inicio
- Landing pages de productos
- Sitios corporativos

**Elementos incluidos:**
- Título principal (H1)
- Subtítulo o descripción
- 1-2 botones de llamada a la acción
- Imagen o ilustración lateral
- Fondo personalizable

**Opciones de personalización:**
- Alineación del contenido (izquierda, centro, derecha)
- Posición de la imagen (izquierda, derecha, fondo)
- Colores de fondo y texto
- Estilo de botones
- Espaciado y márgenes

**Ejemplo de uso:**
> "Transforma tu negocio con tecnología | Somos líderes en soluciones digitales | [Comenzar] [Ver más]"

---

### Hero con Video

**Descripción:** Hero con video de fondo en lugar de imagen estática.

**Ideal para:**
- Sitios de entretenimiento
- Portfolios creativos
- Páginas de productos dinámicos

**Elementos incluidos:**
- Video de fondo (loop automático)
- Overlay de color (para legibilidad)
- Título y subtítulo
- Botones de acción

**Opciones de personalización:**
- URL del video (YouTube, Vimeo, archivo)
- Opacidad del overlay
- Color del overlay
- Silenciar/reproducir audio
- Poster (imagen mientras carga)

**Recomendaciones:**
- Usa videos cortos (10-30 segundos)
- Optimiza el peso del archivo
- Siempre incluye un overlay para que el texto sea legible

---

### Hero Slider

**Descripción:** Carrusel de slides, cada uno con su propio contenido.

**Ideal para:**
- Mostrar múltiples productos/servicios
- Promociones rotativas
- Galerías destacadas

**Elementos incluidos:**
- Múltiples slides
- Controles de navegación (flechas, puntos)
- Autoplay opcional
- Indicadores de posición

**Opciones de personalización:**
- Número de slides
- Velocidad de transición
- Tipo de transición (slide, fade)
- Autoplay (sí/no, velocidad)
- Controles visibles/ocultos

---

## 📌 Componentes de Contenido

### Features (Características)

**Descripción:** Grid de características o beneficios con iconos.

**Ideal para:**
- Listar servicios
- Mostrar beneficios de un producto
- Secciones "Por qué elegirnos"

**Variantes disponibles:**
1. **Grid 3 columnas:** 3 características en fila
2. **Grid 4 columnas:** 4 características compactas
3. **Lista vertical:** Características apiladas
4. **Con imagen:** Icono grande + descripción detallada

**Elementos por característica:**
- Icono (biblioteca de +1000 iconos)
- Título
- Descripción
- Enlace opcional

**Opciones de personalización:**
- Número de columnas
- Alineación (centro, izquierda)
- Estilo de iconos (línea, sólido, círculo)
- Colores por elemento
- Espaciado entre items

---

### About (Sobre Nosotros)

**Descripción:** Sección para presentar tu empresa o persona.

**Ideal para:**
- Páginas "Quiénes somos"
- Secciones de presentación
- Biografías personales

**Variantes disponibles:**
1. **Imagen + Texto:** Foto a un lado, texto al otro
2. **Timeline:** Historia con línea de tiempo
3. **Números:** Estadísticas + descripción
4. **Video:** Video de presentación + texto

**Elementos incluidos:**
- Título de sección
- Texto descriptivo (soporta formato)
- Imagen o video
- Lista de puntos clave (opcional)
- Botón de acción (opcional)

---

### Team (Equipo)

**Descripción:** Presenta a los miembros de tu equipo.

**Ideal para:**
- Páginas de empresa
- Sitios de agencias
- Consultorías y despachos

**Variantes disponibles:**
1. **Grid:** Tarjetas en cuadrícula
2. **Carrusel:** Deslizable horizontalmente
3. **Lista:** Filas con foto + bio extendida

**Elementos por miembro:**
- Foto de perfil
- Nombre completo
- Cargo/posición
- Breve biografía
- Redes sociales (enlaces)

**Opciones de personalización:**
- Columnas por fila
- Forma de la foto (círculo, cuadrado, redondeado)
- Información visible/oculta
- Efecto hover
- Redes sociales a mostrar

---

### Stats (Estadísticas)

**Descripción:** Muestra números impactantes de tu negocio.

**Ideal para:**
- Generar confianza
- Mostrar logros
- Secciones de impacto

**Elementos por estadística:**
- Número (con animación de conteo)
- Etiqueta descriptiva
- Icono opcional

**Ejemplos:**
- "500+ Clientes satisfechos"
- "10 Años de experiencia"
- "24/7 Soporte disponible"
- "98% Tasa de satisfacción"

**Opciones de personalización:**
- Animación de conteo (sí/no)
- Duración de animación
- Prefijo/sufijo (%, +, $)
- Columnas
- Estilo visual

---

## 📌 Componentes de Social Proof

### Testimonials (Testimonios)

**Descripción:** Muestra reseñas y opiniones de clientes.

**Ideal para:**
- Generar confianza
- Páginas de ventas
- Landing pages

**Variantes disponibles:**
1. **Carrusel:** Un testimonio visible, deslizable
2. **Grid:** Múltiples testimonios en cuadrícula
3. **Destacado:** Un testimonio grande + menores
4. **Video:** Testimonios en video

**Elementos por testimonio:**
- Texto de la reseña
- Nombre del cliente
- Cargo/empresa
- Foto del cliente
- Calificación (estrellas)
- Fecha (opcional)

**Opciones de personalización:**
- Estilo de tarjeta
- Mostrar/ocultar foto
- Mostrar/ocultar estrellas
- Comillas decorativas
- Fondo de sección

---

### Logos (Clientes/Socios)

**Descripción:** Franja con logotipos de clientes o socios.

**Ideal para:**
- Mostrar clientes importantes
- Menciones en medios
- Certificaciones

**Variantes:**
1. **Estático:** Logos en fila
2. **Carrusel:** Logos que se deslizan
3. **Grid:** Logos en cuadrícula

**Opciones de personalización:**
- Número de logos visibles
- Escala de grises / color
- Tamaño de logos
- Espaciado
- Velocidad de animación (carrusel)

---

## 📌 Componentes de Conversión

### Pricing (Precios)

**Descripción:** Tablas comparativas de planes y precios.

**Ideal para:**
- SaaS y software
- Servicios con planes
- Membresías

**Variantes:**
1. **3 columnas:** Básico, Pro, Premium
2. **2 columnas:** Mensual vs Anual
3. **Con toggle:** Cambio mensual/anual
4. **Destacado:** Un plan resaltado

**Elementos por plan:**
- Nombre del plan
- Precio
- Período (mes, año, único)
- Lista de características incluidas
- Características no incluidas (tachadas)
- Botón de acción
- Badge "Popular" o "Recomendado"

**Opciones de personalización:**
- Número de planes
- Moneda
- Colores por plan
- Resaltar plan recomendado
- Toggle de período

---

### CTA (Call to Action)

**Descripción:** Sección de llamada a la acción para convertir visitantes.

**Ideal para:**
- Antes del footer
- Entre secciones de contenido
- Páginas de ventas

**Variantes:**
1. **Simple:** Título + botón
2. **Con formulario:** Captura de email
3. **Con imagen:** Visual + texto + botón
4. **Banner:** Franja completa

**Elementos:**
- Título llamativo
- Subtítulo/descripción
- Botón principal
- Botón secundario (opcional)
- Imagen de fondo

---

### Contact (Contacto)

**Descripción:** Formulario de contacto completo.

**Ideal para:**
- Páginas de contacto
- Solicitudes de cotización
- Consultas generales

**Variantes:**
1. **Simple:** Nombre, email, mensaje
2. **Completo:** + teléfono, empresa, asunto
3. **Con mapa:** Formulario + ubicación
4. **Multi-columna:** Datos + formulario lado a lado

**Campos disponibles:**
- Texto corto
- Texto largo
- Email
- Teléfono
- Selector (dropdown)
- Checkbox
- Radio buttons
- Archivo adjunto

**Opciones de personalización:**
- Campos requeridos
- Validación
- Mensaje de éxito
- Redirección post-envío
- Email de notificación

---

## 📌 Componentes de Media

### Gallery (Galería)

**Descripción:** Muestra colección de imágenes.

**Ideal para:**
- Portfolios
- Productos
- Proyectos realizados

**Variantes:**
1. **Grid:** Cuadrícula uniforme
2. **Masonry:** Estilo Pinterest
3. **Carrusel:** Deslizable
4. **Lightbox:** Abre imagen en grande

**Opciones:**
- Columnas
- Espaciado entre imágenes
- Efecto hover
- Filtros por categoría
- Lightbox (sí/no)

---

### Video

**Descripción:** Reproduce videos de diferentes fuentes.

**Fuentes soportadas:**
- YouTube
- Vimeo
- Video propio (MP4)
- Video externo (URL)

**Opciones:**
- Autoplay
- Loop (repetir)
- Controles visibles
- Silenciado por defecto
- Poster/thumbnail

---

### Maps (Mapas)

**Descripción:** Mapa interactivo con tu ubicación.

**Proveedor:** Google Maps

**Elementos:**
- Ubicación (dirección o coordenadas)
- Marcador personalizado
- Zoom inicial
- Estilo del mapa

**Opciones:**
- Altura del mapa
- Controles de zoom
- Scroll zoom (sí/no)
- Modo oscuro

---

## 📌 Componentes de E-commerce

### Products Grid

**Descripción:** Cuadrícula de productos.

**Elementos por producto:**
- Imagen
- Nombre
- Precio (y precio anterior si hay descuento)
- Botón añadir al carrito
- Badge (nuevo, oferta)

### Product Detail

**Descripción:** Página completa de producto.

**Incluye:**
- Galería de imágenes
- Título y descripción
- Precio y variantes
- Selector de cantidad
- Botón de compra
- Tabs de información adicional

---

## Conclusión

Cada componente está diseñado para ser flexible y personalizable. Combínalos creativamente para crear sitios únicos que conviertan visitantes en clientes.

**¿No encuentras lo que buscas?**
- Usa el componente de HTML personalizado
- Solicita nuevos componentes a nuestro equipo
- Explora la comunidad de usuarios`
    },
    {
        title: 'Cómo crear diseños responsivos perfectos',
        slug: 'crear-disenos-responsivos',
        excerpt: 'Aprende a optimizar tu sitio web para que se vea perfecto en móviles, tablets y computadoras de escritorio.',
        featuredImage: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800',
        status: 'published' as const,
        featured: false,
        category: 'tutorial' as const,
        tags: ['editor', 'responsive', 'móvil', 'diseño', 'mobile'],
        author: 'Equipo Quimera',
        content: `# Cómo crear diseños responsivos perfectos

## ¿Por qué es crucial el diseño responsivo?

En 2024, más del **60% del tráfico web** proviene de dispositivos móviles. Si tu sitio no se ve bien en móviles, estás perdiendo más de la mitad de tus potenciales clientes.

**Beneficios de un buen diseño responsivo:**
- Mejor experiencia de usuario
- Mayor tiempo en el sitio
- Mejor posicionamiento en Google (SEO)
- Más conversiones
- Imagen profesional

---

## Entendiendo los Breakpoints

### ¿Qué son los breakpoints?

Los breakpoints son los puntos de ancho de pantalla donde el diseño cambia para adaptarse mejor al dispositivo.

### Breakpoints en Quimera AI

| Dispositivo | Ancho de pantalla | Icono |
|-------------|-------------------|-------|
| **Móvil** | Menos de 768px | 📱 |
| **Tablet** | 768px - 1024px | 📱 (horizontal) |
| **Desktop** | Más de 1024px | 💻 |

### Cómo cambiar entre vistas

1. En la barra superior del editor, busca los iconos de dispositivo
2. Haz clic en el dispositivo que quieres visualizar
3. El lienzo se ajustará al ancho correspondiente
4. Ahora puedes hacer cambios específicos para ese tamaño

---

## Estrategia Mobile-First

### ¿Qué es Mobile-First?

Es una estrategia de diseño donde **primero diseñas para móvil** y luego adaptas para pantallas más grandes.

### Por qué es recomendada:

1. **Priorización:** Te obliga a decidir qué es realmente importante
2. **Rendimiento:** Sitios más ligeros y rápidos
3. **SEO:** Google usa mobile-first indexing
4. **UX:** Mejor experiencia para la mayoría de usuarios

### Cómo aplicar Mobile-First en Quimera:

**Paso 1:** Cambia a vista móvil
1. Haz clic en el icono de móvil 📱
2. El lienzo mostrará ancho de 375px

**Paso 2:** Diseña tu página móvil
- Contenido en una sola columna
- Textos legibles (mínimo 16px)
- Botones grandes (mínimo 44px de alto)
- Espaciado generoso entre elementos

**Paso 3:** Adapta para tablet
1. Cambia a vista tablet
2. Ajusta columnas (2 columnas funcionan bien)
3. Aumenta espaciados si es necesario

**Paso 4:** Optimiza para desktop
1. Cambia a vista desktop
2. Usa el ancho completo con múltiples columnas
3. Agrega elementos que mejoren la experiencia

---

## Técnicas de Diseño Responsivo

### 1. Ocultar/Mostrar elementos

A veces ciertos elementos solo tienen sentido en ciertas pantallas.

**Cómo hacerlo:**
1. Selecciona el elemento
2. Ve a **Configuración > Visibilidad**
3. Marca/desmarca las casillas:
   - ☑️ Mostrar en móvil
   - ☑️ Mostrar en tablet
   - ☑️ Mostrar en desktop

**Ejemplos de uso:**
- Ocultar menú hamburguesa en desktop
- Ocultar imagen decorativa en móvil
- Mostrar botón de llamada solo en móvil

### 2. Cambiar número de columnas

**En desktop:** 4 productos por fila
**En tablet:** 2 productos por fila
**En móvil:** 1 producto por fila

**Cómo configurar:**
1. Selecciona el componente de grid
2. Cambia a cada vista de dispositivo
3. Ajusta el número de columnas en el panel derecho

### 3. Ajustar tamaños de texto

Los textos que se ven bien en desktop pueden ser muy grandes en móvil.

**Tamaños recomendados:**

| Elemento | Desktop | Tablet | Móvil |
|----------|---------|--------|-------|
| H1 | 48-64px | 40-48px | 32-40px |
| H2 | 36-42px | 32-36px | 28-32px |
| H3 | 24-28px | 22-26px | 20-24px |
| Párrafo | 18px | 17px | 16px |
| Pequeño | 14px | 14px | 14px |

**Cómo ajustar:**
1. Cambia a la vista del dispositivo
2. Selecciona el texto
3. En **Estilo > Tipografía**, ajusta el tamaño
4. El cambio solo afecta a ese dispositivo

### 4. Reorganizar elementos

En móvil, podrías querer cambiar el orden de los elementos.

**Ejemplo:**
- En desktop: Imagen a la izquierda, texto a la derecha
- En móvil: Texto arriba, imagen abajo

**Cómo hacerlo:**
1. Cambia a vista móvil
2. Selecciona la sección
3. En **Configuración > Orden**, cambia la disposición
4. O usa la propiedad "Invertir orden"

### 5. Ajustar espaciados

Los espaciados de desktop suelen ser excesivos en móvil.

**Recomendaciones:**

| Elemento | Desktop | Móvil |
|----------|---------|-------|
| Padding de sección | 80-120px | 40-60px |
| Espacio entre elementos | 40-60px | 20-30px |
| Margen de contenedor | 40-80px | 16-24px |

---

## Checklist de Diseño Responsivo

### Antes de publicar, verifica:

**📱 En móvil:**
- [ ] Textos legibles sin hacer zoom
- [ ] Botones lo suficientemente grandes para tocar (mínimo 44px)
- [ ] Imágenes no cortadas ni distorsionadas
- [ ] Menú de navegación funcional
- [ ] Formularios fáciles de completar
- [ ] Nada se sale de la pantalla horizontalmente
- [ ] Espaciado adecuado (no muy apretado)

**📱 En tablet:**
- [ ] Buen uso del espacio disponible
- [ ] Columnas balanceadas
- [ ] Imágenes bien proporcionadas
- [ ] Navegación clara

**💻 En desktop:**
- [ ] Aprovechamiento del ancho de pantalla
- [ ] Elementos bien distribuidos
- [ ] No hay líneas de texto demasiado largas
- [ ] Imágenes de alta calidad

---

## Errores comunes y cómo evitarlos

### ❌ Error 1: Texto demasiado pequeño en móvil

**Problema:** Usar el mismo tamaño de texto en todos los dispositivos.

**Solución:** Ajusta los tamaños para cada breakpoint. Mínimo 16px para párrafos en móvil.

### ❌ Error 2: Botones muy pequeños

**Problema:** Botones difíciles de tocar con el dedo.

**Solución:** Mínimo 44px de alto y ancho suficiente. Agrega padding generoso.

### ❌ Error 3: Imágenes que se cortan

**Problema:** Imágenes que pierden contenido importante en móvil.

**Solución:** Usa imágenes con el sujeto centrado, o configura diferentes imágenes por dispositivo.

### ❌ Error 4: Formularios difíciles de usar

**Problema:** Campos de formulario pequeños en móvil.

**Solución:** 
- Campos de altura mínima 44px
- Tipo de input correcto (email, tel, etc.)
- Labels claras
- Espaciado entre campos

### ❌ Error 5: Menú de navegación roto

**Problema:** El menú desktop no se adapta a móvil.

**Solución:** Usa el componente de navegación de Quimera que automáticamente se convierte en menú hamburguesa.

### ❌ Error 6: Scroll horizontal

**Problema:** Elementos más anchos que la pantalla causan scroll horizontal.

**Solución:** 
- Usa porcentajes en lugar de píxeles fijos
- Verifica que ningún elemento tenga ancho fijo mayor a 100%
- Usa overflow: hidden si es necesario

---

## Herramientas de testing

### En el editor de Quimera:
1. Usa los botones de cambio de dispositivo
2. Arrastra el borde del lienzo para ver transiciones
3. Usa la vista previa en cada dispositivo

### En tu navegador:
1. Abre tu sitio publicado
2. Presiona F12 (herramientas de desarrollador)
3. Haz clic en el icono de dispositivo móvil
4. Selecciona diferentes dispositivos para probar

### Dispositivos reales:
- Prueba en tu propio móvil y tablet
- Pide a amigos/colegas que prueben
- Usa servicios como BrowserStack para probar múltiples dispositivos

---

## Resumen

1. **Adopta mobile-first:** Diseña primero para móvil
2. **Usa los breakpoints:** Personaliza para cada dispositivo
3. **Prueba todo:** Verifica en múltiples dispositivos
4. **Piensa en el usuario:** Botones grandes, texto legible
5. **Sé consistente:** Mantén la identidad visual en todos los tamaños

Un sitio responsivo no es opcional, es obligatorio. Tómate el tiempo para hacerlo bien y tus usuarios (y Google) te lo agradecerán.`
    }
];



