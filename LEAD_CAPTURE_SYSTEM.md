# 🎯 Sistema de Captura de Leads - Quimera Chat

## 📋 Resumen

Se ha implementado un **sistema completo de captura de leads** que convierte el Quimera Chat en un poderoso lead magnet. El sistema captura leads tanto desde el chat widget como desde el formulario de contacto, con scoring automático, detección de intención y seguimiento de fuentes.

---

## ✨ Características Implementadas

### 1. **Pre-Chat Form** ✅
- Formulario que aparece antes de iniciar el chat (configurable)
- Captura nombre, email y teléfono
- Opción de continuar sin registro
- UI moderna con animaciones

**Ubicación**: `components/ChatbotWidget.tsx`

**Configuración**:
```typescript
leadCaptureConfig: {
  preChatForm: true, // Activar/desactivar
  // ... más opciones
}
```

### 2. **Intent Detection** ✅
- Detecta automáticamente palabras clave de alta intención
- Keywords en español e inglés:
  - `precio`, `cotización`, `comprar`, `contratar`
  - `price`, `quote`, `buy`, `purchase`
- Trigger automático de captura cuando detecta intención

**Ubicación**: `components/ChatbotWidget.tsx` - función `detectLeadIntent()`

### 3. **Mid-Conversation Capture** ✅
- Solicita email después de N mensajes (configurable)
- Modal elegante no intrusivo
- Opción "Ahora no" para no presionar

**Configuración**:
```typescript
triggerAfterMessages: 3 // Solicitar después de 3 mensajes
```

### 4. **Exit-Intent Capture** ✅
- Detecta cuando el usuario intenta cerrar el chat
- Muestra oferta de último momento configurable
- Solo se muestra una vez por sesión

**Ejemplo de oferta**:
```
🎁 ¡Espera! Déjame tu email y te envío información exclusiva + 20% de descuento
```

### 5. **Formulario de Contacto Funcional** ✅
- Captura completa desde el componente Leads
- Validación de campos
- Mensaje de éxito animado
- Cálculo automático de lead score
- Detección de intención en el mensaje

**Ubicación**: `components/Leads.tsx`

### 6. **Lead Scoring Automático** ✅
Sistema de puntuación 0-100 basado en:

- **Información de contacto** (45 pts)
  - Email: 20 pts
  - Teléfono: 15 pts
  - Nombre: 10 pts

- **Información profesional** (10 pts)
  - Empresa: 10 pts

- **Engagement** (25 pts)
  - Longitud de conversación
  - Longitud de mensaje

- **Intención** (20 pts)
  - Keywords de alta intención

- **Fuente** (10 pts)
  - contact-form: 10 pts
  - chatbot-widget: 8 pts
  - referral: 10 pts

**Categorías de Leads**:
- 🔥 **Hot Lead** (80-100): Contactar URGENTE
- 🌟 **Warm Lead** (60-79): Llamar en 24h
- 💡 **Cool Lead** (40-59): Email de seguimiento
- ❄️ **Cold Lead** (0-39): Campaña de nurturing

**Ubicación**: `utils/leadScoring.ts`

### 7. **Source Tracking** ✅
Identificación visual de la fuente del lead:

| Fuente | Icon | Color | Label |
|--------|------|-------|-------|
| chatbot-widget | 💬 | Morado | Chat Widget |
| contact-form | 📝 | Azul | Formulario |
| voice-call | 📞 | Verde | Llamada |
| referral | 🤝 | Índigo | Referido |
| linkedin | 💼 | Azul oscuro | LinkedIn |
| manual | ✍️ | Gris | Manual |

**Ubicación**: 
- `utils/leadScoring.ts` - función `getSourceConfig()`
- `components/dashboard/leads/LeadsDashboard.tsx` - visualización

### 8. **Enriquecimiento de Datos** ✅
Cada lead capturado incluye:
- `conversationTranscript`: Transcripción completa del chat
- `leadScore`: Puntuación automática
- `source`: Origen del lead
- `tags`: Etiquetas automáticas
  - `chatbot`, `contact-form`
  - `high-intent`, `low-intent`
  - `has-company`, `individual`
- `notes`: Contexto adicional

---

## 🚀 Flujo de Captura

### Desde el Chat Widget:

```
1. Usuario abre chat
   ↓
2a. Si preChatForm = true → Muestra formulario → Captura lead
   ↓
2b. Si preChatForm = false → Inicia chat directamente
   ↓
3. Usuario conversa
   ↓
4a. Si detecta high-intent → Solicita email inmediatamente
   ↓
4b. Si alcanza N mensajes → Solicita email amablemente
   ↓
5. Usuario intenta cerrar
   ↓
6. Si no capturó lead → Muestra exit-intent offer
   ↓
7. Lead guardado en Firebase con score y transcript
```

### Desde el Formulario:

```
1. Usuario completa formulario
   ↓
2. Sistema calcula lead score automáticamente
   ↓
3. Detecta keywords de intención en mensaje
   ↓
4. Asigna tags apropiados
   ↓
5. Guarda en Firebase
   ↓
6. Muestra mensaje de éxito animado
```

---

## 📊 Datos Capturados

### Campos Estándar:
```typescript
{
  name: string,
  email: string,
  phone?: string,
  company?: string,
  message?: string,
  source: 'chatbot-widget' | 'contact-form' | ...,
  status: 'new',
  leadScore: number, // 0-100
  conversationTranscript?: string,
  tags: string[],
  notes: string,
  value: number,
  createdAt: Timestamp
}
```

---

## ⚙️ Configuración

### En `types.ts`:
```typescript
interface LeadCaptureConfig {
  enabled: boolean;
  preChatForm: boolean;
  triggerAfterMessages: number;
  requireEmailForAdvancedInfo: boolean;
  exitIntentEnabled: boolean;
  exitIntentOffer?: string;
  intentKeywords: string[];
  progressiveProfilingEnabled: boolean;
}
```

### Valores por defecto:
```typescript
{
  enabled: true,
  preChatForm: false,
  triggerAfterMessages: 3,
  requireEmailForAdvancedInfo: true,
  exitIntentEnabled: true,
  exitIntentOffer: '🎁 ¡Espera! Déjame tu email...',
  intentKeywords: [],
  progressiveProfilingEnabled: true
}
```

---

## 🎨 UI/UX Mejorada

### ChatbotWidget:
- ✅ Pre-chat form con diseño moderno
- ✅ Modal de captura no intrusivo
- ✅ Animaciones suaves
- ✅ Mensajes contextuales
- ✅ Opción "Continuar sin registro"

### Formulario de Contacto:
- ✅ Validación en tiempo real
- ✅ Estados de loading
- ✅ Overlay de éxito animado con ✓
- ✅ Manejo de errores elegante
- ✅ Spinner mientras envía

### Dashboard de Leads:
- ✅ Badges de source con colores
- ✅ Badges de score con emojis
- ✅ Tooltips informativos
- ✅ Responsive design

---

## 📈 Métricas y Analytics

### En el Dashboard de Leads puedes ver:
- **Origen** de cada lead (badge visual)
- **Score** automático (0-100)
- **Categoría** (Hot/Warm/Cool/Cold)
- **Valor** potencial
- **Fecha** de captura
- **Conversación completa** (si es del chat)

---

## 🔧 Archivos Modificados/Creados

### Nuevos:
- ✅ `utils/leadScoring.ts` - Sistema de scoring completo

### Actualizados:
- ✅ `types.ts` - Nuevos tipos y campos
- ✅ `components/ChatbotWidget.tsx` - Sistema de captura completo
- ✅ `components/Leads.tsx` - Formulario funcional
- ✅ `components/dashboard/leads/LeadsDashboard.tsx` - Visualización mejorada

---

## 🎯 Próximos Pasos Recomendados

### Fase 2 (Opcional):
1. **Progressive Profiling**
   - Capturar datos en múltiples pasos
   - Primera vez: solo email
   - Segunda vez: nombre + teléfono
   - Tercera vez: empresa + rol

2. **AI Lead Qualification**
   - Usar Gemini para analizar la conversación
   - Asignar score adicional basado en IA
   - Recomendar próxima acción automáticamente

3. **Automated Follow-ups**
   - Email automático de bienvenida
   - Recordatorios para el equipo de ventas
   - Workflows basados en score

4. **A/B Testing**
   - Probar diferentes ofertas de exit-intent
   - Optimizar momento de captura
   - Mejorar tasa de conversión

5. **Lead Nurturing**
   - Secuencias de email automáticas
   - Contenido personalizado por score
   - Reactivación de leads fríos

---

## 📚 Documentación de Funciones

### `calculateLeadScore(factors)`
Calcula score de 0-100 basado en múltiples factores.

**Parámetros**:
```typescript
{
  hasEmail: boolean,
  hasPhone: boolean,
  hasName: boolean,
  hasCompany: boolean,
  messageLength: number,
  conversationLength: number,
  hasHighIntentKeywords: boolean,
  source: Lead['source'],
  tags: string[]
}
```

**Retorna**: `number` (0-100)

### `detectHighIntent(text)`
Detecta si el mensaje contiene keywords de alta intención.

**Parámetros**: `text: string`

**Retorna**: `boolean`

### `getSourceConfig(source)`
Obtiene configuración visual para cada fuente de lead.

**Parámetros**: `source: Lead['source']`

**Retorna**:
```typescript
{
  icon: string,
  color: string,
  label: string
}
```

### `getLeadScoreLabel(score)`
Obtiene categoría y visualización del lead score.

**Parámetros**: `score: number`

**Retorna**:
```typescript
{
  label: 'Hot Lead' | 'Warm Lead' | 'Cool Lead' | 'Cold Lead',
  color: string,
  emoji: string
}
```

---

## 🎉 Resultado Final

Ahora tienes un **sistema completo de generación de leads** que:

✅ Captura leads automáticamente desde el chat  
✅ Captura leads desde el formulario de contacto  
✅ Califica leads automáticamente (0-100)  
✅ Detecta intención de compra  
✅ Rastrea la fuente de cada lead  
✅ Guarda conversaciones completas  
✅ Muestra badges visuales en el CRM  
✅ Ofrece múltiples puntos de captura  
✅ Experiencia de usuario no intrusiva  

**El Quimera Chat ahora es un verdadero lead magnet para tus clientes! 🚀**

---

## 📞 Soporte

Para activar/desactivar funcionalidades, edita la configuración en:
- Panel de Quimera Chat → Knowledge Tab → Lead Capture Settings (próximamente)
- O directamente en el código: `aiAssistantConfig.leadCaptureConfig`

---

**Creado**: Nov 2025  
**Versión**: 1.0.0  
**Estado**: ✅ Completamente Funcional

