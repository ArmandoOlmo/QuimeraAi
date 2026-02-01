# Integración de Conversaciones del Chatbot con Leads

## Descripción General

Este sistema captura las conversaciones del chatbot y las almacena en el componente de Leads, permitiendo un análisis posterior mediante IA para extraer información clave del cliente.

## Componentes Involucrados

### 1. ChatCore ([components/chat/ChatCore.tsx](components/chat/ChatCore.tsx))

**Responsabilidad**: Capturar y guardar conversaciones del chatbot cuando se genera un lead.

**Implementación**:
- Cuando un usuario proporciona su información (pre-chat form o captura rápida de email), el chatbot crea un lead
- La conversación se formatea como texto: `"role: mensaje\nrole: mensaje"`
- Se guarda en el campo `conversationTranscript` del lead (líneas 702 y 761)

**Formato de conversación**:
```
user: ¿Ofrecen servicios de desarrollo web?
bot: Sí, ofrecemos servicios completos de desarrollo web...
user: Necesito un sitio e-commerce
bot: Perfecto, podemos ayudarte con eso...
```

### 2. LeadsDashboard ([components/dashboard/leads/LeadsDashboard.tsx](components/dashboard/leads/LeadsDashboard.tsx))

**Responsabilidad**: Mostrar conversaciones del chatbot y permitir análisis con IA.

**Características principales**:

#### a) Visualización de Conversación
- Se muestra solo si el lead tiene `conversationTranscript`
- Formato visual estilo chat:
  - Mensajes del usuario: alineados a la derecha, fondo primario
  - Mensajes del bot: alineados a la izquierda, con ícono de bot
- Scroll vertical para conversaciones largas (max-height: 24rem)

#### b) Análisis con IA
- Botón "Analizar con IA" para extraer puntos clave
- Utiliza Gemini 2.5 Flash para análisis
- Extrae:
  1. Servicio o producto solicitado
  2. Necesidades específicas
  3. Presupuesto o urgencia
  4. Información de contacto
  5. Siguiente paso recomendado

#### c) Resultados del Análisis
- Se muestran en un panel destacado con gradiente morado/azul
- Formato de lista con bullets
- Se mantiene visible hasta que se cambia de lead

## Flujo de Datos

```
Usuario interactúa con Chatbot
          ↓
ChatCore captura mensajes
          ↓
Usuario proporciona email/nombre
          ↓
ChatCore crea Lead con conversationTranscript
          ↓
Lead guardado en Firebase/CRM
          ↓
Usuario abre Lead en LeadsDashboard
          ↓
Se muestra sección de conversación
          ↓
Usuario hace click en "Analizar con IA"
          ↓
LLM analiza conversación y extrae puntos clave
          ↓
Resultados se muestran en la interfaz
```

## Estructura de Datos

### Lead Interface (types/business.ts:146)
```typescript
interface Lead {
  // ... otros campos
  conversationTranscript?: string;  // Conversación del chatbot
  aiAnalysis?: string;               // Análisis inicial del chatbot
  aiScore?: number;                  // Puntuación de intención
  recommendedAction?: string;        // Acción recomendada
}
```

## Funciones Principales

### handleAnalyzeConversation() (LeadsDashboard.tsx:662)
```typescript
const handleAnalyzeConversation = async () => {
  // Valida que exista lead y conversación
  // Verifica API key
  // Llama a Gemini con prompt de análisis
  // Guarda resultado en conversationAnalysis state
  // Registra uso de API
}
```

## Prompt de Análisis

El prompt usado para analizar conversaciones:
```
Analiza la siguiente conversación entre un cliente y un chatbot de servicio.
Extrae y presenta los puntos clave de lo que el cliente requiere o necesita.
Presenta la información de forma clara y concisa en una lista de puntos.

Conversación:
[transcripción]

Por favor, extrae:
1. Servicio o producto que solicita el cliente
2. Necesidades específicas mencionadas
3. Presupuesto o urgencia (si se menciona)
4. Información de contacto proporcionada
5. Siguiente paso recomendado

Presenta cada punto de forma clara y directa.
```

## Estados de UI

### LeadsDashboard
- `isAnalyzingConversation`: Boolean - Indica si se está analizando
- `conversationAnalysis`: String - Resultado del análisis

**Reseteo de estados**:
- Al cambiar de lead
- Al cerrar el modal de detalles

## Ubicación en la Interfaz

La sección de conversación aparece en el modal de detalles del lead:
1. Después de los Custom Fields
2. Antes del Activity Timeline
3. Solo visible cuando existe `conversationTranscript`
4. Solo en modo de visualización (no en modo edición)

## Responsive Design

- Mobile: Botones y texto más pequeños
- Desktop: Espaciado completo y mejor visualización
- Scroll independiente para conversaciones largas

## Logging y Análisis

Cada análisis se registra en el sistema de logging:
```typescript
{
  userId: user.uid,
  model: 'gemini-2.5-flash',
  feature: 'leads-conversation-analysis',
  success: boolean,
  errorMessage?: string
}
```

## Mejoras Futuras Sugeridas

1. **Caché de análisis**: Guardar el análisis en el lead para no re-analizar
2. **Búsqueda en conversaciones**: Permitir buscar keywords en transcripciones
3. **Filtros por conversación**: Filtrar leads que tienen conversación del chatbot
4. **Exportar conversación**: Opción para descargar transcripción
5. **Análisis batch**: Analizar múltiples conversaciones a la vez
6. **Sentimiento**: Añadir análisis de sentimiento del cliente
7. **Categorización automática**: Clasificar leads por tipo de servicio solicitado

## Dependencias

- `generateContentViaProxy`: Cliente para Gemini API
- `extractTextFromResponse`: Extractor de texto de respuestas
- `logApiCall`: Sistema de logging de API calls
- `useAI`: Context para manejo de API keys
- `useCRM`: Context para operaciones de CRM
