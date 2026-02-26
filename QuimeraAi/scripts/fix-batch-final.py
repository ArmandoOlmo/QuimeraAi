#!/usr/bin/env python3
"""
FINAL BATCH: Fix ALL remaining Spanish text in EN file and English text in ES file.
Uses language detection to find misplaced values, then translates them.
Includes comprehensive dictionaries for all remaining sections:
leads, onboardingWizard, ecommerce storefront, email, etc.
"""
import json, re, os, sys
sys.stdout.reconfigure(line_buffering=True)

base = '/Users/armandoolmo/QuimeraAppCursor/QuimeraAi'
es_path = os.path.join(base, 'locales', 'es', 'translation.json')
en_path = os.path.join(base, 'locales', 'en', 'translation.json')

with open(es_path, 'r', encoding='utf-8') as f:
    es = json.load(f)
with open(en_path, 'r', encoding='utf-8') as f:
    en = json.load(f)

# ============================================================
# ES → EN (Spanish text that needs English in the EN file)
# ============================================================
ES_TO_EN = {
    # imageGeneration
    "Describe la imagen que quieres generar...": "Describe the image you want to generate...",
    "Qué evitar: borroso, distorsionado...": "What to avoid: blurry, distorted...",
    # leads
    "Guardar Configuración": "Save Configuration",
    "Aplica campos pre-configurados para tu industria en un solo clic": "Apply pre-configured fields for your industry in one click",
    "Nombre del campo (ej. Industria)": "Field name (e.g. Industry)",
    "Los campos personalizados estarán disponibles al editar leads y crear nuevos": "Custom fields will be available when editing leads and creating new ones",
    "Casilla de verificación": "Checkbox",
    "Limpiar selección": "Clear selection",
    # onboardingWizard (remaining)
    "ej. Diseño de Interiores, SaaS, Cafetería": "e.g. Interior Design, SaaS, Cafe",
    "¿Qué hace tu negocio?": "What does your business do?",
    "Público Objetivo": "Target Audience",
    "ej. Startups, Propietarios de viviendas...": "e.g. Startups, Homeowners...",
    "Descripción del Negocio": "Business Description",
    "Genera una descripción profesional con IA": "Generate a professional description with AI",
    "Información del Negocio": "Business Information",
    "Agrega tus datos de contacto": "Add your contact details",
    "Ubicación del negocio": "Business location",
    "Teléfono de contacto": "Contact phone",
    "Email de contacto": "Contact email",
    "Colores de tu marca": "Your brand colors",
    "Estilo Visual": "Visual Style",
    "Selecciona el estilo que mejor represente tu marca": "Select the style that best represents your brand",
    "Generando paleta de colores...": "Generating color palette...",
    "Paleta generada con IA": "AI Generated Palette",
    "Paleta personalizada": "Custom Palette",
    "Notas adicionales": "Additional notes",
    "¿Algo más que debamos saber sobre tu negocio?": "Anything else we should know about your business?",
    "Resumen de tu proyecto": "Your project summary",
    "Revisar y confirmar": "Review and confirm",
    "Confirmar y generar": "Confirm and generate",
    "Generando tu proyecto...": "Generating your project...",
    "Proyecto generado exitosamente": "Project generated successfully",
    "Error al generar el proyecto": "Error generating project",
    "Elegante / Sofisticado": "Elegant / Sophisticated",
    "Minimalista / Limpio": "Minimalist / Clean",
    "Orgánico / Natural": "Organic / Natural",
    "Juguetón / Amigable": "Playful / Friendly",
    "Color primario de tu marca": "Your brand's primary color",
    "Color secundario de tu marca": "Your brand's secondary color",
    "Color de acento de tu marca": "Your brand's accent color",
    "Fondo principal del sitio": "Main site background",
    "Color del texto principal": "Main text color",
    "¿Qué tipo de negocio tienes?": "What type of business do you have?",
    "Servicios que ofreces": "Services you offer",
    "Descripción breve de tu negocio": "Brief description of your business",
    "Número de teléfono": "Phone number",
    "Dirección de email": "Email address",
    "Sitio web actual": "Current website",
    "Redes sociales (opcional)": "Social media (optional)",
    "URL de Facebook": "Facebook URL",
    "URL de Instagram": "Instagram URL",
    "URL de Twitter": "Twitter URL",
    "URL de LinkedIn": "LinkedIn URL",
    "URL de YouTube": "YouTube URL",
    "URL de TikTok": "TikTok URL",
    "Nombre del dueño": "Owner name",
    "Cargo en la empresa": "Company position",
    "Horario de lunes a viernes": "Monday to Friday hours",
    "Horario de sábados": "Saturday hours",
    "Horario de domingos": "Sunday hours",
    "Abierto 24 horas": "Open 24 hours",
    "Cerrado los fines de semana": "Closed on weekends",
    "Configuración de la tienda": "Store configuration",
    "Productos o servicios": "Products or services",
    "Zona de envío": "Shipping zone",
    "Método de envío": "Shipping method",
    "Zona de cobertura": "Coverage area",
    "Tipo de envío": "Shipping type",
    "Tiempo de entrega estimado": "Estimated delivery time",
    "Costo de envío": "Shipping cost",
    "Moneda de la tienda": "Store currency",
    "Política de devoluciones": "Return policy",
    "Términos y condiciones": "Terms and conditions",
    "Política de privacidad": "Privacy policy",
    "Un momento, estamos preparando todo...": "One moment, we're preparing everything...",
    "Tu sitio web se está generando": "Your website is being generated",
    "Esto puede tardar unos minutos": "This may take a few minutes",
    "La IA está trabajando en tu sitio": "AI is working on your site",
    "Analizando tu negocio...": "Analyzing your business...",
    "Diseñando tu sitio web...": "Designing your website...",
    "Optimizando para dispositivos móviles...": "Optimizing for mobile devices...",
    "Aplicando tu marca...": "Applying your brand...",
    "Finalizando detalles...": "Finalizing details...",
    "¡Todo listo! Redirigiendo...": "All done! Redirecting...",
    "Personalizar en el editor": "Customize in editor",
    "Ver vista previa": "View preview",
    "Compartir proyecto": "Share project",
    "Descargar proyecto": "Download project",
    "Panel de administración": "Admin panel",
    "Agregar más páginas": "Add more pages",
    "Configurar SEO": "Configure SEO",
    "Conectar analíticas": "Connect analytics",
    "No se encontró información": "No information found",
    "Intenta con otra URL": "Try with another URL",
    "URL no válida": "Invalid URL",
    "Servicio no disponible": "Service not available",
    "Campos requeridos": "Required fields",
    "Campo requerido": "Required field",
    "Email no válido": "Invalid email",
    "Teléfono no válido": "Invalid phone",
    "URL no válida": "Invalid URL",
    "Descripción generada con IA": "AI generated description",
    "Servicios sugeridos por IA": "AI suggested services",
    "Plantilla seleccionada": "Selected template",
    "Cambiar plantilla": "Change template",
    "Vista previa de la plantilla": "Template preview",
    "Esta plantilla es ideal para": "This template is ideal for",
    "Características incluidas": "Features included",
    "Componentes incluidos": "Components included",
    "Personalizable al 100%": "100% customizable",
    "Optimizado para móviles": "Mobile optimized",
    "SEO optimizado": "SEO optimized",
    "Carga rápida": "Fast loading",
    "Diseño responsivo": "Responsive design",
    # leads custom fields
    "Tipo de campo": "Field type",
    "Texto corto": "Short text",
    "Texto largo": "Long text",
    "Número": "Number",
    "Teléfono": "Phone",
    "Selección": "Selection",
    "Selección múltiple": "Multi-select",
    "Fecha y hora": "Date and time",
    "Moneda": "Currency",
    "Campo obligatorio": "Required field",
    "Valor predeterminado": "Default value",
    "Opciones (una por línea)": "Options (one per line)",
    "Agregar campo": "Add field",
    "Editar campo": "Edit field",
    "Eliminar campo": "Delete field",
    "Guardar cambios": "Save changes",
    "Descartar cambios": "Discard changes",
    "Campo eliminado": "Field deleted",
    "Campo guardado": "Field saved",
    "Campos personalizados": "Custom fields",
    "Configurar campos": "Configure fields",
    "Plantillas de industria": "Industry templates",
    "Aplicar plantilla": "Apply template",
    "Sin campos configurados": "No configured fields",
    "Arrastra para reordenar": "Drag to reorder",
    # dashboard items
    "Actividad en Vivo": "Live Activity",
    "Últimas 24 Horas": "Last 24 Hours",
    "Seleccionar todos": "Select all",
    "Eliminar seleccionados": "Delete selected",
    "Exportar proyectos seleccionados": "Export selected projects",
}

# EN → ES (English text that needs Spanish in the ES file)
EN_TO_ES = {
    "products with low stock": "productos con stock bajo",
    "Receive payments directly to your Stripe account": "Recibe pagos directamente en tu cuenta de Stripe",
    "Description that will appear in search results...": "Descripción que aparecerá en los resultados de búsqueda...",
    "Fill your store with sample data": "Llena tu tienda con datos de ejemplo",
    "Pay with your PayPal account": "Paga con tu cuenta de PayPal",
    "Pay when you receive your order": "Paga cuando recibas tu pedido",
    "Summarize your experience in a few words": "Resume tu experiencia en pocas palabras",
    "Tell us what you thought of the product...": "Cuéntanos qué te pareció el producto...",
    "What's your name?": "¿Cuál es tu nombre?",
    "Thank you for your review!": "¡Gracias por tu reseña!",
    "Please write your opinion": "Por favor escribe tu opinión",
    "Please write your name": "Por favor escribe tu nombre",
    "Send newsletters, promotions or announcements to your subscribers": "Envía newsletters, promociones o anuncios a tus suscriptores",
    "Personalize the subject with the recipient's name": "Personaliza el asunto con el nombre del destinatario",
    "Prices include tax": "Precios incluyen impuesto",
    "Secret Key is configured in server environment variables": "La Secret Key se configura en las variables de entorno del servidor",
    "Notify customer when order is shipped": "Notificar al cliente cuando el pedido sea enviado",
    "Choose a project to manage its store": "Elige un proyecto para gestionar su tienda",
    "Each project can have its own ecommerce store. Select one to manage.": "Cada proyecto puede tener su propia tienda. Selecciona uno para gestionar.",
    "Try different search terms": "Prueba con términos de búsqueda diferentes",
    "Error loading store": "Error al cargar la tienda",
    "Creating data...": "Creando datos...",
    "Error applying code": "Error al aplicar el código",
    "Street and number": "Calle y número",
    "Apartment, suite, etc. (optional)": "Apartamento, suite, etc. (opcional)",
    "Standard shipping": "Envío estándar",
    "5-7 business days": "5-7 días hábiles",
    "Credit or debit card": "Tarjeta de crédito o débito",
    "Use a different address": "Usar una dirección diferente",
    "Secure payment": "Pago seguro",
    "Order summary": "Resumen del pedido",
    "Your information is protected": "Tu información está protegida",
    "Total items": "Total de artículos",
    "Processing payment...": "Procesando pago...",
    "Payment successful": "Pago exitoso",
    "Payment failed": "Pago fallido",
    "Try again with a different payment method": "Intenta con un método de pago diferente",
    "Contact us for help": "Contáctanos para ayuda",
    "Express shipping": "Envío express",
    "2-3 business days": "2-3 días hábiles",
    "Next day delivery": "Entrega al día siguiente",
    "Store pickup": "Recoger en tienda",
    "Select a shipping method": "Selecciona un método de envío",
    "Review your order": "Revisa tu pedido",
    "Edit order": "Editar pedido",
    "Apply discount code": "Aplicar código de descuento",
    "Gift card": "Tarjeta de regalo",
    "Gift message": "Mensaje de regalo",
    "Add gift message": "Agregar mensaje de regalo",
    "Save for later": "Guardar para después",
    "Move to wishlist": "Mover a favoritos",
    "You might also like": "También te podría gustar",
    "Customers also bought": "Los clientes también compraron",
    "Frequently bought together": "Frecuentemente comprados juntos",
    "Special offer": "Oferta especial",
    "Limited time offer": "Oferta por tiempo limitado",
    "Sale ends in": "La oferta termina en",
    "Only left in stock": "Solo quedan en stock",
    "Fast selling": "Venta rápida",
    "Best seller": "Más vendido",
    "New arrival": "Novedad",
    "Exclusive online": "Exclusivo en línea",
    "Subscribe and save": "Suscríbete y ahorra",
    "See price in cart": "Ver precio en el carrito",
    "Select options": "Seleccionar opciones",
    "Available in-store": "Disponible en tienda",
    "Check availability": "Verificar disponibilidad",
    "Notify me when available": "Notificarme cuando esté disponible",
    "Enter your email to be notified": "Ingresa tu email para ser notificado",
    "Share this product": "Comparte este producto",
    "Copy link": "Copiar enlace",
    "Link copied!": "¡Enlace copiado!",
    "Add all to cart": "Agregar todo al carrito",
    "Total for all items": "Total de todos los artículos",
    "Free returns": "Devoluciones gratis",
    "Easy returns": "Devoluciones fáciles",
    "30-day return policy": "Política de devolución de 30 días",
    "Money back guarantee": "Garantía de devolución de dinero",
    "Secure checkout": "Pago seguro",
    "Fast delivery": "Entrega rápida",
    "Quality guaranteed": "Calidad garantizada",
    "Customer satisfaction": "Satisfacción del cliente",
}

# ============================================================
# PATTERN-BASED TRANSLATORS
# ============================================================
def es_to_en_patterns(text):
    patterns = [
        (r'^No se encontraron (.+)$', r'No \1 found'),
        (r'^No hay (.+)$', r'No \1'),
        (r'^Sin (.+) todavía$', r'No \1 yet'),
        (r'^Error al (.+)$', r'Error \1'),
        (r'^¿Estás seguro de que quieres (.+)\?$', r'Are you sure you want to \1?'),
        (r'^Selecciona (.+)$', r'Select \1'),
        (r'^Ingresa (.+)$', r'Enter \1'),
        (r'^(.+) es requerido$', r'\1 is required'),
        (r'^(.+) inválido$', r'Invalid \1'),
        (r'^(.+) ya existe$', r'\1 already exists'),
        (r'^Agregar (.+)$', r'Add \1'),
        (r'^Eliminar (.+)$', r'Delete \1'),
        (r'^Editar (.+)$', r'Edit \1'),
        (r'^Crear (.+)$', r'Create \1'),
        (r'^Actualizar (.+)$', r'Update \1'),
        (r'^Ver (.+)$', r'View \1'),
        (r'^Guardar (.+)$', r'Save \1'),
        (r'^Buscar (.+)$', r'Search \1'),
        (r'^Mostrar (.+)$', r'Show \1'),
        (r'^Ocultar (.+)$', r'Hide \1'),
        (r'^Gestionar (.+)$', r'Manage \1'),
        (r'^Configurar (.+)$', r'Configure \1'),
        (r'^Cargando (.+)\.\.\.$', r'Loading \1...'),
        (r'^Generando (.+)\.\.\.$', r'Generating \1...'),
        (r'^(.+) creado exitosamente$', r'\1 created successfully'),
        (r'^(.+) actualizado exitosamente$', r'\1 updated successfully'),
        (r'^(.+) eliminado exitosamente$', r'\1 deleted successfully'),
        (r'^(.+) guardado exitosamente$', r'\1 saved successfully'),
        (r'^{{count}} (.+) seleccionados?\.$', r'{{count}} \1 selected.'),
        (r'^Seleccionar los {{count}} (.+)$', r'Select all {{count}} \1'),
        (r'^Los {{count}} (.+) están seleccionados\.$', r'All {{count}} \1 are selected.'),
    ]
    for p, r_str in patterns:
        if re.match(p, text):
            return re.sub(p, r_str, text)
    return text

def en_to_es_patterns(text):
    patterns = [
        (r'^No (.+) found$', r'No se encontraron \1'),
        (r'^No (.+) available$', r'No hay \1 disponibles'),
        (r'^Failed to (.+)$', r'Error al \1'),
        (r'^Unable to (.+)$', r'No se puede \1'),
        (r'^Are you sure you want to (.+)\?$', r'¿Estás seguro de que quieres \1?'),
        (r'^Select (.+)$', r'Seleccionar \1'),
        (r'^Enter (.+)$', r'Ingresa \1'),
        (r'^(.+) is required$', r'\1 es requerido'),
        (r'^Invalid (.+)$', r'\1 inválido'),
        (r'^Add (.+)$', r'Agregar \1'),
        (r'^Remove (.+)$', r'Eliminar \1'),
        (r'^Delete (.+)$', r'Eliminar \1'),
        (r'^Edit (.+)$', r'Editar \1'),
        (r'^Create (.+)$', r'Crear \1'),
        (r'^Update (.+)$', r'Actualizar \1'),
        (r'^View (.+)$', r'Ver \1'),
        (r'^Save (.+)$', r'Guardar \1'),
        (r'^Search (.+)$', r'Buscar \1'),
        (r'^Show (.+)$', r'Mostrar \1'),
        (r'^Hide (.+)$', r'Ocultar \1'),
        (r'^Manage (.+)$', r'Gestionar \1'),
        (r'^Configure (.+)$', r'Configurar \1'),
        (r'^Loading (.+)\.\.\.$', r'Cargando \1...'),
        (r'^Generating (.+)\.\.\.$', r'Generando \1...'),
        (r'^(.+) created successfully[.!]?$', r'\1 creado exitosamente'),
        (r'^(.+) updated successfully[.!]?$', r'\1 actualizado exitosamente'),
        (r'^(.+) deleted successfully[.!]?$', r'\1 eliminado exitosamente'),
        (r'^(.+) saved successfully[.!]?$', r'\1 guardado exitosamente'),
    ]
    for p, r_str in patterns:
        if re.match(p, text):
            return re.sub(p, r_str, text)
    return text

# ============================================================
# LANGUAGE DETECTION
# ============================================================
def is_spanish(t):
    if len(t)<8: return False
    l=t.lower()
    m=['á','é','í','ó','ú','ñ','¿','¡',' de ',' del ',' la ',' las ',' los ',' el ',' un ',' una ',' en ',' con ',' por ',' para ',' tu ',' su ',' que ',' es ',' está ']
    return sum(1 for x in m if x in l)>=2

def is_english(t):
    if len(t)<8: return False
    l=t.lower()
    m=[' the ',' this ',' that ',' with ',' from ',' your ',' you ',' for ',' and ',' are ',' can ',' will ',' has ',' have ',' when ',' what ',' how ']
    return sum(1 for x in m if x in l)>=2

# ============================================================
# PROCESS
# ============================================================
fixed_en = 0
fixed_es = 0

def fix(es_d, en_d, path=''):
    global fixed_en, fixed_es
    for key in list(es_d.keys()):
        full = f'{path}.{key}' if path else key
        es_v = es_d.get(key)
        en_v = en_d.get(key) if isinstance(en_d, dict) else None
        if isinstance(es_v, dict) and isinstance(en_v, dict):
            fix(es_v, en_v, full)
        elif isinstance(es_v, str) and isinstance(en_v, str) and es_v == en_v and len(es_v) > 10:
            val = es_v
            # Try dictionary first
            if val in ES_TO_EN:
                en_d[key] = ES_TO_EN[val]
                fixed_en += 1
            elif val in EN_TO_ES:
                es_d[key] = EN_TO_ES[val]
                fixed_es += 1
            # Then try language detection + patterns
            elif is_spanish(val):
                t = es_to_en_patterns(val)
                if t != val:
                    en_d[key] = t
                    fixed_en += 1
            elif is_english(val):
                t = en_to_es_patterns(val)
                if t != val:
                    es_d[key] = t
                    fixed_es += 1

fix(es, en)

with open(es_path, 'w', encoding='utf-8') as f:
    json.dump(es, f, ensure_ascii=False, indent=2)
    f.write('\n')
with open(en_path, 'w', encoding='utf-8') as f:
    json.dump(en, f, ensure_ascii=False, indent=2)
    f.write('\n')

print(f'✅ Fixed {fixed_en} EN values (Spanish→English)')
print(f'✅ Fixed {fixed_es} ES values (English→Spanish)')
print(f'✅ Total: {fixed_en + fixed_es}')
