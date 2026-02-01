# Instrucciones para Probar la Funcionalidad

## Problema Identificado

Los leads con conversación existen en el **backup** (archivo JSON) pero pueden no estar en la base de datos activa de Firebase.

## Solución: Crear un Lead de Prueba

### Opción 1: Usar el Chatbot
1. Ve a tu sitio web donde está el chatbot
2. Inicia una conversación con el chatbot
3. Escribe varios mensajes (ej: "Hola", "¿Qué servicios ofrecen?", "Me interesa X")
4. Proporciona tu email cuando el chatbot lo pida
5. El lead se creará automáticamente con la conversación

### Opción 2: Crear Manualmente (Temporal para Testing)

Puedes agregar temporalmente este código en LeadsDashboard para crear un lead de prueba:

```javascript
// Agregar en la línea después de los estados (línea 322)
useEffect(() => {
    const createTestLead = async () => {
        if (leads.length === 0 && addLead) {
            await addLead({
                name: "Test Lead con Conversación",
                email: "test@example.com",
                status: "new",
                source: "chatbot",
                conversationTranscript: `Usuario: Hola, necesito información sobre sus servicios
Bot: ¡Hola! Bienvenido a nuestra empresa. ¿En qué puedo ayudarte hoy?
Usuario: Quiero saber los precios de desarrollo web
Bot: Por supuesto, nuestros servicios de desarrollo web empiezan desde $2,000 dependiendo de la complejidad del proyecto.
Usuario: ¿Incluyen hosting?
Bot: Sí, incluimos hosting por el primer año. ¿Te gustaría agendar una reunión para discutir tu proyecto?
Usuario: Sí, me interesa
Bot: Perfecto, déjame tu email para contactarte`,
                tags: ["chatbot", "test"],
                notes: "Lead de prueba para testing"
            });
        }
    };
    // createTestLead(); // Descomentar para crear el lead de prueba
}, []);
```

## Verificar que la Funcionalidad Funciona

Una vez que tengas un lead con conversación:

1. Ve al Dashboard de Leads
2. Haz clic en el lead que tiene conversación
3. Deberías ver:
   - ✅ Sección "Conversación del Chatbot"
   - ✅ La conversación formateada (mensajes del usuario a la derecha, del bot a la izquierda)
   - ✅ Botón "Analizar con IA"
4. Haz clic en "Analizar con IA"
5. Espera unos segundos
6. Deberías ver un panel morado con los puntos clave extraídos

## Si No Aparece la Sección

Revisa:
1. La consola del navegador para errores
2. Que el lead tenga el campo `conversationTranscript` poblado
3. Que no estés en modo edición (el botón "Edit" no debe estar activo)

## Estado Actual del Código

✅ Código implementado en:
- `/components/dashboard/leads/LeadsDashboard.tsx` líneas 1699-1785
- Función de análisis: líneas 662-718
- Estados: líneas 320-321

✅ El chatbot YA guarda conversaciones:
- `/components/chat/ChatCore.tsx` líneas 645-667
- Se guarda automáticamente cuando se captura un lead
