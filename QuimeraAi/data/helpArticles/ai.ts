/**
 * AI Assistant Articles - Artículos del Asistente de IA
 * Guías completas para configurar y optimizar el chatbot
 */

export const AI_ARTICLES = [
    {
        title: 'Configurar tu chatbot de IA: Guía completa',
        slug: 'configurar-chatbot-ia-guia-completa',
        excerpt: 'Aprende paso a paso cómo configurar, entrenar y optimizar tu asistente virtual para atender clientes 24/7.',
        featuredImage: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=800',
        status: 'published' as const,
        featured: true,
        category: 'tutorial' as const,
        tags: ['ai', 'chatbot', 'assistant', 'ia', 'bot', 'asistente'],
        author: 'Equipo Quimera',
        content: `# Configurar tu chatbot de IA: Guía completa

## Introducción

El chatbot de Quimera AI es un asistente virtual inteligente que puede atender a tus visitantes las 24 horas del día, los 7 días de la semana. Puede responder preguntas, capturar información de contacto, agendar citas y mucho más.

**Lo que aprenderás:**
- Activar y configurar el chatbot
- Personalizar su apariencia y personalidad
- Entrenar con información de tu negocio
- Configurar respuestas automáticas
- Analizar conversaciones y mejorar

**Tiempo de configuración:** 30-60 minutos
**Requisitos:** Plan Starter o superior

---

## Parte 1: Activación inicial

### 1.1 Acceder al módulo de IA

1. Inicia sesión en tu cuenta de Quimera AI
2. En el menú lateral, haz clic en **"🤖 Asistente IA"**
3. Verás el panel de control del chatbot

### 1.2 Activar el chatbot

Si es tu primera vez:

1. Haz clic en **"Activar Asistente IA"**
2. Selecciona el proyecto (sitio web) donde quieres instalarlo
3. Confirma la activación
4. El chatbot se instalará automáticamente en tu sitio

**Estado del chatbot:**
- 🟢 **Activo:** Visible y funcionando en tu sitio
- 🟡 **En pruebas:** Solo visible para ti
- 🔴 **Desactivado:** No visible para nadie

---

## Parte 2: Personalización de apariencia

### 2.1 Nombre y avatar del asistente

El nombre y avatar son lo primero que verán tus visitantes.

**Configurar nombre:**
1. Ve a **Configuración > Identidad**
2. En **"Nombre del asistente"**, escribe un nombre amigable
3. Ejemplos: "Quibo", "Ana", "Asistente de [Tu Empresa]"

**Configurar avatar:**
1. En la misma sección, busca **"Avatar"**
2. Opciones disponibles:
   - Subir imagen personalizada (tu logo o mascota)
   - Elegir de avatares prediseñados
   - Usar un emoji

**Recomendaciones:**
- Usa un nombre corto y fácil de recordar
- El avatar debe ser profesional pero amigable
- Mantén coherencia con tu marca

### 2.2 Colores y estilo

Personaliza la apariencia del widget:

1. Ve a **Configuración > Apariencia**
2. Configura:

| Opción | Descripción |
|--------|-------------|
| Color principal | Color del encabezado y botones |
| Color de fondo | Fondo de la ventana de chat |
| Color de mensajes (bot) | Burbujas del asistente |
| Color de mensajes (usuario) | Burbujas del visitante |
| Posición | Esquina inferior derecha o izquierda |

3. Usa la vista previa en tiempo real para ver los cambios
4. Haz clic en **"Guardar"**

### 2.3 Mensaje de bienvenida

El mensaje de bienvenida aparece cuando alguien abre el chat.

**Configurar:**
1. Ve a **Configuración > Mensajes**
2. En **"Mensaje de bienvenida"**, escribe tu saludo

**Ejemplo efectivo:**
\`\`\`
¡Hola! 👋 Soy [Nombre], el asistente virtual de [Tu Empresa].

Estoy aquí para ayudarte con:
• Información sobre nuestros servicios
• Precios y cotizaciones
• Agendar una cita
• Resolver tus dudas

¿En qué puedo ayudarte hoy?
\`\`\`

**Elementos de un buen mensaje:**
- Saludo amigable
- Presentación breve
- Lista de lo que puede hacer
- Pregunta abierta para iniciar

### 2.4 Respuestas rápidas (Quick Replies)

Son botones predefinidos que facilitan la interacción.

**Configurar:**
1. En **"Respuestas rápidas iniciales"**, agrega opciones
2. Ejemplo:
   - "Ver servicios"
   - "Solicitar cotización"
   - "Hablar con un humano"
   - "Horarios de atención"

**Cada respuesta rápida necesita:**
- Texto del botón (lo que ve el usuario)
- Acción o respuesta (lo que hace el bot)

---

## Parte 3: Entrenar al chatbot

### 3.1 Base de conocimiento

La base de conocimiento es la información que el chatbot usará para responder.

**Acceder:**
1. Ve a **Asistente IA > Entrenamiento**
2. Verás la sección **"Base de conocimiento"**

**Métodos para agregar información:**

#### Método 1: Texto directo

Escribe o pega información directamente:

1. Haz clic en **"+ Agregar contenido"**
2. Selecciona **"Texto"**
3. Escribe la información
4. Guarda

**Ejemplo de contenido:**
\`\`\`
INFORMACIÓN DE LA EMPRESA:
Somos [Nombre de Empresa], una agencia de marketing digital 
con más de 10 años de experiencia.

SERVICIOS QUE OFRECEMOS:
- Diseño web profesional
- SEO y posicionamiento en Google
- Publicidad en redes sociales
- Email marketing
- Branding y diseño gráfico

HORARIOS DE ATENCIÓN:
Lunes a viernes: 9:00 AM - 6:00 PM
Sábados: 10:00 AM - 2:00 PM
Domingos: Cerrado

CONTACTO:
Teléfono: (55) 1234-5678
Email: info@miempresa.com
Dirección: Av. Principal #123, Ciudad
\`\`\`

#### Método 2: Preguntas y respuestas (FAQ)

Formato estructurado de Q&A:

1. Haz clic en **"+ Agregar contenido"**
2. Selecciona **"Preguntas frecuentes"**
3. Agrega pares de pregunta-respuesta

**Ejemplo:**
\`\`\`
P: ¿Cuánto cuesta el servicio de diseño web?
R: Nuestros precios de diseño web comienzan desde $999 USD 
   para sitios básicos. El precio final depende de las 
   funcionalidades que necesites. ¿Te gustaría agendar 
   una llamada para cotizar tu proyecto?

P: ¿Hacen envíos a todo México?
R: ¡Sí! Hacemos envíos a toda la República Mexicana. 
   El envío es gratis en compras mayores a $500 MXN. 
   El tiempo de entrega es de 3-5 días hábiles.

P: ¿Tienen garantía?
R: Todos nuestros productos tienen garantía de 1 año 
   contra defectos de fabricación. Si tienes algún 
   problema, contáctanos y lo resolvemos.
\`\`\`

#### Método 3: Documentos

Sube archivos para que el chatbot aprenda de ellos:

1. Haz clic en **"+ Agregar contenido"**
2. Selecciona **"Documento"**
3. Sube el archivo (PDF, DOCX, TXT)
4. El sistema extraerá la información automáticamente

**Tipos de documentos útiles:**
- Catálogos de productos
- Manuales de servicio
- Políticas de la empresa
- Preguntas frecuentes existentes
- Descripciones de servicios

#### Método 4: URLs de tu sitio web

Importa contenido de páginas existentes:

1. Haz clic en **"+ Agregar contenido"**
2. Selecciona **"URL"**
3. Pega la URL de la página
4. El sistema analizará el contenido

**URLs recomendadas:**
- Página de servicios
- Página de precios
- Página "Sobre nosotros"
- Blog con información relevante
- Políticas (envío, devoluciones, etc.)

### 3.2 Instrucciones de comportamiento

Define cómo debe comportarse el chatbot:

1. Ve a **Entrenamiento > Instrucciones**
2. Escribe directrices claras

**Ejemplo de instrucciones:**
\`\`\`
TONO DE COMUNICACIÓN:
- Sé amigable y profesional
- Usa un lenguaje sencillo, evita tecnicismos
- Siempre saluda al inicio de la conversación
- Usa emojis con moderación (1-2 por mensaje)

REGLAS DE RESPUESTA:
- Si no sabes algo, admítelo honestamente
- Ofrece alternativas (contactar a un humano, dejar datos)
- No inventes información
- Siempre intenta capturar el email del visitante
- Sugiere agendar una llamada cuando sea apropiado

INFORMACIÓN SENSIBLE:
- No proporciones datos de otros clientes
- No hagas promesas de descuentos sin autorización
- Dirige preguntas legales al equipo correspondiente
\`\`\`

### 3.3 Probar el entrenamiento

Antes de activar, prueba que funcione correctamente:

1. Ve a **Asistente IA > Probar**
2. Aparecerá una ventana de chat de prueba
3. Haz preguntas como si fueras un visitante
4. Verifica que las respuestas sean correctas y naturales

**Preguntas de prueba:**
- "¿Qué servicios ofrecen?"
- "¿Cuánto cuesta?"
- "¿Cuáles son sus horarios?"
- "Quiero hablar con alguien"
- Preguntas que sabes que están en tu base de conocimiento

---

## Parte 4: Funcionalidades avanzadas

### 4.1 Captura de leads

Configura el chatbot para capturar información de contacto:

1. Ve a **Configuración > Captura de datos**
2. Activa **"Captura de leads"**
3. Define cuándo solicitar datos:
   - Al inicio de la conversación
   - Antes de responder ciertas preguntas
   - Cuando el usuario solicite contacto

**Campos a capturar:**
- Nombre (requerido/opcional)
- Email (requerido/opcional)
- Teléfono (requerido/opcional)
- Empresa (requerido/opcional)
- Mensaje/consulta

### 4.2 Transferencia a humano

Permite que los usuarios hablen con una persona real:

1. Ve a **Configuración > Transferencia**
2. Activa **"Permitir transferencia a humano"**
3. Configura:
   - Horario de disponibilidad de agentes
   - Mensaje cuando hay agentes disponibles
   - Mensaje fuera de horario
   - Email para notificar solicitudes

**Mensaje de transferencia ejemplo:**
\`\`\`
¡Por supuesto! Te conecto con uno de nuestros 
asesores. En un momento alguien se comunicará contigo.

Mientras tanto, ¿podrías compartirme tu nombre 
y email para que puedan contactarte?
\`\`\`

### 4.3 Agendar citas

Integra el sistema de citas:

1. Ve a **Configuración > Integraciones**
2. Activa **"Sistema de citas"**
3. El chatbot podrá:
   - Mostrar disponibilidad
   - Agendar citas directamente
   - Enviar confirmaciones

### 4.4 Respuestas multimedia

Enriquece las respuestas con:

- **Imágenes:** Mostrar productos o ejemplos
- **Videos:** Tutoriales o presentaciones
- **Botones:** Acciones rápidas
- **Carruseles:** Mostrar múltiples opciones
- **Enlaces:** Dirigir a páginas específicas

---

## Parte 5: Analíticas y mejora continua

### 5.1 Dashboard de analíticas

Ve a **Asistente IA > Analíticas** para ver:

**Métricas principales:**
- Total de conversaciones
- Tasa de resolución
- Tiempo promedio de conversación
- Satisfacción del usuario
- Leads capturados

**Gráficos disponibles:**
- Conversaciones por día/semana/mes
- Horarios más activos
- Temas más consultados
- Tasa de abandono

### 5.2 Revisar conversaciones

Aprende de las interacciones reales:

1. Ve a **Asistente IA > Conversaciones**
2. Revisa chats individuales
3. Identifica:
   - Preguntas que el bot no supo responder
   - Respuestas que confundieron al usuario
   - Oportunidades de mejora

### 5.3 Mejorar continuamente

**Cada semana:**
1. Revisa las preguntas sin respuesta
2. Agrega esa información a la base de conocimiento
3. Ajusta respuestas confusas
4. Actualiza información desactualizada

**Cada mes:**
1. Analiza métricas generales
2. Identifica tendencias
3. Optimiza flujos de conversación
4. Actualiza instrucciones de comportamiento

---

## Solución de problemas

### "El chatbot no responde correctamente"
1. Revisa que la información esté en la base de conocimiento
2. Reformula la información de manera más clara
3. Agrega variaciones de la pregunta en el FAQ

### "No aparece el chatbot en mi sitio"
1. Verifica que esté activado
2. Revisa que el sitio esté publicado
3. Limpia la caché del navegador
4. Verifica que no haya bloqueadores de scripts

### "Las respuestas son muy largas/cortas"
1. Ve a Instrucciones
2. Especifica la longitud deseada
3. Ejemplo: "Mantén respuestas entre 2-4 oraciones"

---

## Mejores prácticas

1. **Sé honesto:** Si el bot no sabe algo, que lo admita
2. **Personaliza:** Usa el nombre del visitante si lo tienes
3. **Ofrece alternativas:** Siempre da opciones al usuario
4. **Actualiza regularmente:** Información desactualizada = mala experiencia
5. **Prueba constantemente:** Asegúrate de que funcione correctamente
6. **Escucha feedback:** Usa las analíticas para mejorar

Tu chatbot es un empleado más de tu empresa. Entrénalo bien y representará tu marca profesionalmente las 24 horas del día.`
    },
    {
        title: 'Créditos de IA: Todo lo que necesitas saber',
        slug: 'creditos-ia-todo-saber',
        excerpt: 'Entiende cómo funcionan los créditos de IA, qué consume créditos y cómo optimizar su uso para aprovechar al máximo tu plan.',
        featuredImage: 'https://images.unsplash.com/photo-1639322537228-f710d846310a?w=800',
        status: 'published' as const,
        featured: true,
        category: 'help' as const,
        tags: ['ai', 'creditos', 'ia', 'billing', 'uso'],
        author: 'Equipo Quimera',
        content: `# Créditos de IA: Todo lo que necesitas saber

## ¿Qué son los créditos de IA?

Los créditos de IA son la unidad de medida que usamos para las funcionalidades que utilizan inteligencia artificial en Quimera. Cada vez que usas una función de IA, se consume una cantidad específica de créditos.

**Piénsalo como:**
- Créditos de IA = "combustible" para funciones inteligentes
- Más créditos = más uso de funciones de IA
- Los créditos se renuevan cada mes según tu plan

---

## Créditos por plan

| Plan | Créditos mensuales | Costo adicional |
|------|-------------------|-----------------|
| **Free** | 50 créditos | No disponible |
| **Starter** | 500 créditos | $0.05 USD/crédito |
| **Pro** | 2,000 créditos | $0.04 USD/crédito |
| **Agency** | 5,000 créditos | $0.03 USD/crédito |
| **Enterprise** | 10,000+ créditos | Precio personalizado |

**Los créditos se renuevan** el día de tu ciclo de facturación.
**Los créditos no usados** no se acumulan para el siguiente mes.

---

## ¿Qué consume créditos?

### Generación de contenido con IA

| Acción | Créditos aproximados |
|--------|---------------------|
| Generar título | 1 crédito |
| Generar párrafo corto | 2-3 créditos |
| Generar párrafo largo | 4-5 créditos |
| Generar página completa | 15-25 créditos |
| Regenerar contenido | Igual que generar nuevo |

### Chatbot de IA

| Acción | Créditos aproximados |
|--------|---------------------|
| Respuesta simple | 0.1 créditos |
| Respuesta detallada | 0.3-0.5 créditos |
| Conversación completa (promedio) | 2-5 créditos |

### Otras funciones de IA

| Acción | Créditos aproximados |
|--------|---------------------|
| Traducir página | 5-15 créditos |
| Generar imágenes | 5-10 créditos |
| Optimizar SEO | 3-5 créditos |
| Crear sección con IA | 5-10 créditos |
| Entrenar chatbot | 10-20 créditos |

**Nota:** Los créditos exactos dependen de la complejidad y longitud del contenido.

---

## Cómo ver tus créditos

### En el Dashboard

1. Inicia sesión en Quimera AI
2. En la barra lateral, verás tu contador de créditos
3. Muestra: créditos usados / créditos totales

### En Configuración

Para información detallada:
1. Ve a **Configuración > Suscripción**
2. Busca la sección **"Uso de créditos"**
3. Verás:
   - Créditos disponibles
   - Créditos usados este mes
   - Historial de uso
   - Fecha de renovación

### Alertas de créditos

Configuramos alertas automáticas cuando:
- Te quedan 20% de créditos (alerta amarilla)
- Te quedan 10% de créditos (alerta naranja)
- Te quedan 5% de créditos (alerta roja)
- Se agotan los créditos (notificación por email)

---

## ¿Qué pasa cuando se acaban los créditos?

### Funciones afectadas:
- ❌ No podrás generar contenido con IA
- ❌ El chatbot responderá con capacidad limitada
- ❌ No podrás usar traducciones automáticas
- ❌ No podrás generar imágenes con IA

### Funciones que siguen funcionando:
- ✅ Editar contenido manualmente
- ✅ Tu sitio sigue publicado y funcionando
- ✅ Puedes ver analíticas
- ✅ Los formularios capturan leads
- ✅ El e-commerce funciona normalmente

### Opciones cuando se agotan:

**Opción 1: Esperar renovación**
- Los créditos se renuevan en tu próximo ciclo de facturación
- Verifica la fecha en Configuración > Suscripción

**Opción 2: Comprar créditos adicionales**
1. Ve a **Configuración > Suscripción**
2. Haz clic en **"Comprar créditos"**
3. Selecciona la cantidad
4. Completa el pago
5. Los créditos se agregan inmediatamente

**Opción 3: Mejorar tu plan**
- Un plan superior incluye más créditos mensuales
- Además de otras funcionalidades premium

---

## Cómo optimizar el uso de créditos

### 1. Planifica antes de generar

**❌ No hagas esto:**
Generar → No me gusta → Regenerar → No me gusta → Regenerar...
(Cada regeneración consume créditos)

**✅ Haz esto:**
- Piensa bien qué necesitas antes de generar
- Sé específico en tus instrucciones a la IA
- Edita manualmente pequeños cambios en lugar de regenerar

### 2. Usa prompts específicos

**❌ Prompt vago:**
"Escribe algo sobre nuestra empresa"
(Resultado genérico, probablemente necesitarás regenerar)

**✅ Prompt específico:**
"Escribe un párrafo de 3 oraciones sobre [Nombre Empresa], 
una agencia de marketing digital enfocada en pequeñas empresas, 
destacando 10 años de experiencia y resultados medibles."
(Resultado más preciso a la primera)

### 3. Reutiliza contenido

- Guarda contenido generado que te gustó
- Usa plantillas como base
- Adapta textos existentes en lugar de crear desde cero

### 4. Entrena bien tu chatbot

**❌ Evita:**
- Reentrenar frecuentemente
- Agregar información redundante
- Documentos muy largos con poca información útil

**✅ Mejor:**
- Entrena una vez con información completa y bien organizada
- Actualiza solo cuando hay cambios importantes
- Usa FAQs estructurados para información específica

### 5. Traducciones eficientes

**❌ Evita:**
Traducir página → hacer cambios → volver a traducir

**✅ Mejor:**
- Finaliza el contenido en el idioma original
- Traduce solo cuando esté 100% listo
- Haz correcciones menores manualmente

### 6. Genera en lotes

Si necesitas múltiple contenido similar:
- Genera todo junto en una sesión
- Aprovecha que la IA "recuerda" el contexto
- Más eficiente que sesiones separadas

---

## Historial de uso de créditos

### Ver historial detallado

1. Ve a **Configuración > Suscripción > Historial de créditos**
2. Verás una tabla con:
   - Fecha y hora
   - Tipo de acción
   - Créditos consumidos
   - Usuario (si hay equipo)

### Filtrar historial

Puedes filtrar por:
- Rango de fechas
- Tipo de acción (chatbot, generación, traducción)
- Usuario del equipo

### Exportar historial

1. Aplica los filtros deseados
2. Haz clic en **"Exportar CSV"**
3. Descarga el archivo para análisis

---

## Preguntas frecuentes

### ¿Los créditos se acumulan mes a mes?
No. Los créditos no usados expiran al final de cada ciclo de facturación.

### ¿Puedo transferir créditos a otro usuario?
No. Los créditos están asociados a tu cuenta.

### ¿El chatbot en mi sitio consume mis créditos?
Sí. Cada interacción con visitantes consume una pequeña cantidad.

### ¿Cuántas conversaciones de chatbot puedo tener?
Depende de tu plan:
- Free (50 créditos): ~100-250 conversaciones simples
- Starter (500 créditos): ~1,000-2,500 conversaciones
- Pro (2,000 créditos): ~4,000-10,000 conversaciones

### ¿Hay límite de velocidad de uso?
No hay límite de velocidad, pero hay límite de créditos totales.

### ¿Puedo ver cuántos créditos consumirá una acción antes de hacerla?
Algunas acciones muestran un estimado. Para generación de contenido,
verás "Esto consumirá aproximadamente X créditos".

---

## Contacto y soporte

Si tienes preguntas sobre tus créditos:
- 📧 Email: billing@quimera.ai
- 💬 Chat en vivo en la plataforma
- 📚 Más artículos en el Help Center`
    }
];




