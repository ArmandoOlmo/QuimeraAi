#!/usr/bin/env python3
"""
FINAL translation fix: handles ALL remaining identical strings.
Strategy: detect if value is Spanish or English, then translate to the correct
language for each file. Uses extensive dictionaries + pattern matching.
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
# LANGUAGE DETECTION
# ============================================================
def is_spanish(t):
    if len(t)<8: return False
    l=t.lower()
    m=['á','é','í','ó','ú','ñ','¿','¡',' de ',' del ',' la ',' las ',' los ',' el ',' un ',' una ',' en ',' con ',' por ',' para ',' tu ',' su ',' que ',' es ',' está ',' son ',' al ',' se ',' no ',' más ']
    return sum(1 for x in m if x in l)>=2

def is_english(t):
    if len(t)<8: return False
    l=t.lower()
    m=[' the ',' this ',' that ',' with ',' from ',' your ',' you ',' for ',' and ',' are ',' can ',' will ',' has ',' have ',' been ',' when ',' what ',' how ',' not ']
    return sum(1 for x in m if x in l)>=2

# ============================================================
# ES → EN TRANSLATIONS (for fixing EN file)
# ============================================================
ES_EN = {
    # OnboardingWizard - onboarding steps
    "Generar Servicios con IA": "Generate Services with AI",
    "Regenerar Servicios con IA": "Regenerate Services with AI",
    "Creando contenido personalizado para tu sitio web...": "Creating custom content for your website...",
    "Generando tu Sitio Web": "Generating Your Website",
    "La generación está tardando más de lo esperado. Puedes reiniciar si parece estar atascada.": "Generation is taking longer than expected. You can restart if it seems stuck.",
    "Nuestra IA está analizando tu negocio y generando contenido personalizado. Cada imagen se crea específicamente para tu marca.": "Our AI is analyzing your business and generating custom content. Each image is created specifically for your brand.",
    "Obtener Recomendación de IA": "Get AI Recommendation",
    "Por favor ingresa una URL válida": "Please enter a valid URL",
    "Haz que tu tienda esté activa y comienza a vender a clientes.": "Make your store active and start selling to customers.",
    "Gestionar Clientes": "Manage Customers",
    "Ve perfiles de clientes, historial de pedidos e información de contacto.": "View customer profiles, order history, and contact information.",
    "Gestionar Pedidos": "Manage Orders",
    "Procesa nuevos pedidos, actualiza estados e imprime etiquetas de envío.": "Process new orders, update statuses, and print shipping labels.",
    "No se encontraron industrias": "No industries found",
    "Aún no hay servicios": "No services yet",
    "No hay plantillas disponibles": "No templates available",
    "Generando Contenido": "Generating Content",
    "Creando Sitio Web": "Creating Website",
    "Generando Imágenes": "Generating Images",
    "Esto puede tomar unos minutos. Por favor espera...": "This may take a few minutes. Please wait...",
    "Categorías de Productos": "Product Categories",
    "Tipo de productos": "Product type",
    "Redirigiendo al editor...": "Redirecting to editor...",
    "Intentar de Nuevo": "Try Again",
    "Buscar industrias...": "Search industries...",
    "Selecciona tu industria": "Select your industry",
    "categorías seleccionadas": "categories selected",
    "¿Vendes productos online?": "Do you sell products online?",
    "Incluiremos una tienda en tu sitio web": "We'll include a store on your website",
    "Breve descripción (opcional)": "Brief description (optional)",
    "Nombre del servicio": "Service name",
    "servicios agregados": "services added",
    "Servicios Encontrados": "Services Found",
    "Configura tu tienda": "Set up your store",
    "Configura ajustes básicos, envíos y métodos de pago.": "Configure basic settings, shipping, and payment methods.",
    "Digital (Descargas/Servicios)": "Digital (Downloads/Services)",
    "Envío Internacional": "International Shipping",
    "Envío Local (Recogida/Entrega local)": "Local Shipping (Pickup/Local delivery)",
    "Saltar este paso": "Skip this step",
    "Empezar de nuevo": "Start over",
    "Estado/Provincia": "State/Province",
    "¿Ya tienes un sitio web?": "Already have a website?",
    "Pega tu URL y deja que la IA extraiga la información de tu negocio automáticamente.": "Paste your URL and let AI extract your business information automatically.",
    "Nuestra IA extraerá el nombre de tu negocio, descripción, servicios e información de contacto. Podrás revisar y editar todo en los siguientes pasos.": "Our AI will extract your business name, description, services, and contact info. You can review and edit everything in the following steps.",
    "Comencemos con tu negocio": "Let's start with your business",
    "Cuéntanos sobre tu negocio para crear el website perfecto.": "Tell us about your business to create the perfect website.",
    "Selecciona la industria que mejor describa tu negocio. Esto ayuda a nuestra IA a generar contenido relevante.": "Select the industry that best describes your business. This helps our AI generate relevant content.",
    "Describe tu negocio": "Describe your business",
    "Cuéntale a los visitantes qué hace especial a tu negocio.": "Tell visitors what makes your business special.",
    "Deja que nuestra IA genere una descripción profesional, luego personalízala. Siempre puedes editarla después.": "Let our AI generate a professional description, then customize it. You can always edit it later.",
    "Tus Servicios y Productos": "Your Services and Products",
    "¿Qué ofreces? Deja que la IA sugiera o agrega los tuyos.": "What do you offer? Let AI suggest or add your own.",
    "Elige tu Plantilla": "Choose Your Template",
    "La IA recomienda la mejor plantilla para tu industria.": "AI recommends the best template for your industry.",
    "La IA analiza tu industria y tipo de negocio para sugerir la plantilla y componentes más adecuados.": "AI analyzes your industry and business type to suggest the most suitable template and components.",
    "¿Cómo pueden contactarte los clientes? (Todos los campos son opcionales)": "How can customers contact you? (All fields are optional)",
    "Todos los campos son opcionales. Agrega lo que quieras mostrar en tu sitio web. Puedes actualizar esto después.": "All fields are optional. Add what you want to show on your website. You can update this later.",
    "Configura los detalles básicos de tu tienda online": "Configure the basic details of your online store",
    "Selecciona al menos una categoría. Podrás agregar más productos y categorías después en el panel de ecommerce.": "Select at least one category. You can add more products and categories later in the ecommerce panel.",
    "Tu tienda está lista": "Your store is ready",
    "Podrás agregar productos desde el panel de ecommerce": "You can add products from the ecommerce panel",
    "Nombre de tu tienda": "Your store name",
    "Constructor de websites con IA": "AI Website Builder",
    "Una frase corta y pegadiza para tu negocio": "A short, catchy phrase for your business",
    "Por favor intenta de nuevo.": "Please try again.",
    "Por favor ingresa una URL": "Please enter a URL",
    "Usa IA para generar o agrega manualmente": "Use AI to generate or add manually",
    "Usar Estos Resultados": "Use These Results",
    "Ver Panel de Control": "View Dashboard",
    "Observa tus ventas, pedidos y actividad de clientes de un vistazo.": "View your sales, orders, and customer activity at a glance.",
    "¡Tu Sitio Web está Listo!": "Your Website is Ready!",
    "Tu sitio web ha sido generado exitosamente. Ahora puedes personalizarlo en el editor.": "Your website has been generated successfully. You can now customize it in the editor.",
    "URL del Sitio Web": "Website URL",
    "Bienvenido a Quimera.ai": "Welcome to Quimera.ai",
    "Vamos a configurarte rápidamente. Elige una opción a continuación para comenzar.": "Let's get you set up quickly. Choose an option below to get started.",
    "¡Bienvenido a tu nueva tienda!": "Welcome to your new store!",
    "Agregar Producto/Servicio": "Add Product/Service",
    "Audaz / Llamativo": "Bold / Eye-catching",
    "Alto contraste, texto grande, colores impactantes.": "High contrast, large text, impactful colors.",
    "Fuentes serif, colores suaves, sensación sofisticada.": "Serif fonts, soft colors, sophisticated feel.",
    "Líneas limpias, mucho espacio en blanco, tipografía nítida.": "Clean lines, lots of whitespace, crisp typography.",
    "Tonos tierra, texturas naturales, formas suaves.": "Earthy tones, natural textures, soft shapes.",
    "Formas redondeadas, colores brillantes, ambiente amigable.": "Rounded shapes, bright colors, friendly atmosphere.",
    "Tecnológico / Moderno": "Tech / Modern",
    "Modo oscuro, degradados, elementos futuristas.": "Dark mode, gradients, futuristic elements.",
    "Enfoque del Negocio": "Business Focus",
    "¿Cuál es el propósito principal de tu sitio web?": "What is the main purpose of your website?",
    "ej. Generar leads, Vender productos online...": "e.g. Generate leads, Sell products online...",
    "Nombre del Negocio": "Business Name",
    "ej. Estudio Acme": "e.g. Acme Studio",
    "¿Qué tono emocional deben transmitir los colores de tu marca?": "What emotional tone should your brand colors convey?",
    "Paleta de colores sugerida": "Suggested color palette",
    "Aplicar paleta sugerida": "Apply suggested palette",
    "Generar nueva paleta": "Generate new palette",
    "Color personalizado": "Custom color",
    "Describe tu negocio con tus propias palabras": "Describe your business in your own words",
    "Genera una descripción con IA": "Generate a description with AI",
    "Generando descripción...": "Generating description...",
    "Información de Contacto": "Contact Information",
    "Dirección del negocio": "Business address",
    "Enviar formulario de contacto": "Send contact form",
    "Horario de atención": "Business hours",
    "Lunes a Viernes": "Monday to Friday",
    "Sábados": "Saturdays",
    "Domingos y feriados": "Sundays and holidays",
    "Cerrado": "Closed",
    "Agregar servicio": "Add service",
    "Eliminar servicio": "Remove service",
    "Nombre del negocio": "Business name",
    "Descripción del negocio": "Business description",
    "Teléfono del negocio": "Business phone",
    "Email del negocio": "Business email",
    "Dirección del Negocio": "Business Address",
    "Industria del negocio": "Business industry",
    "Sitio web existente": "Existing website",
    "Extrayendo información...": "Extracting information...",
    "Información extraída exitosamente": "Information extracted successfully",
    "No se pudo extraer información": "Could not extract information",
    "Completa los campos manualmente": "Fill in the fields manually",
    "Importar desde URL": "Import from URL",
    "O comienza desde cero": "Or start from scratch",
    "Comenzar desde cero": "Start from scratch",
    "Plantilla recomendada": "Recommended template",
    "Usar esta plantilla": "Use this template",
    "Ver todas las plantillas": "See all templates",
    "Plantillas para": "Templates for",
    "Mejor para tu industria": "Best for your industry",
    "Todas las plantillas": "All templates",
    "Lanzar Tienda": "Launch Store",
    "Tu proyecto ha sido creado exitosamente": "Your project has been created successfully",
    "Ir al editor": "Go to editor",
    "Configurar dominio": "Set up domain",
    "Paso {{current}} de {{total}}": "Step {{current}} of {{total}}",
    "Continuar al paso siguiente": "Continue to next step",
    "Volver al paso anterior": "Go to previous step",
    # Ecommerce remaining
    "Collect payment at delivery": "Cobro al momento de la entrega",
    "Countries (comma separated)": "Países (separados por coma)",
    "registered customers": "clientes registrados",
    "categories total": "categorías en total",
    "Fill your store with sample products to see how it works. Includes categories, products with images and basic configuration.": "Llena tu tienda con productos de ejemplo para ver cómo funciona. Incluye categorías, productos con imágenes y configuración básica.",
    "Write a description or generate with AI...": "Escribe una descripción o genera con IA...",
    "Activate the ecommerce store for this project. You can add products, manage orders and more.": "Activa la tienda e-commerce para este proyecto. Puedes agregar productos, gestionar pedidos y más.",
    "Set to 0 to disable automatic free shipping": "Establece en 0 para desactivar el envío gratuito automático",
    "Generating description...": "Generando descripción...",
    "Generating SEO...": "Generando SEO...",
    "Generating tags...": "Generando etiquetas...",
    "Get started with your store!": "¡Comienza con tu tienda!",
    "Initializing store...": "Inicializando tienda...",
    "No customers found matching that criteria": "No se encontraron clientes con ese criterio",
    "Customers will appear here when they make purchases": "Los clientes aparecerán aquí cuando realicen compras",
    "Does not accept marketing": "No acepta marketing",
    "No orders found with the applied filters": "No se encontraron pedidos con los filtros aplicados",
    "You haven't received any orders yet": "Aún no has recibido pedidos",
    "No products found with the applied filters": "No se encontraron productos con los filtros aplicados",
    "You haven't added any products yet": "Aún no has agregado productos",
    "You don't have any projects yet": "Aún no tienes proyectos",
    "No shipping zones configured": "No hay zonas de envío configuradas",
    "Alert when a product has low stock": "Alertar cuando un producto tenga stock bajo",
    "Receive an email when there's a new order": "Recibir un email cuando haya un nuevo pedido",
    "Or set up your store manually:": "O configura tu tienda manualmente:",
    "Add your first product": "Agrega tu primer producto",
    "Configure shipping options": "Configura opciones de envío",
    "Set up payment methods": "Configura métodos de pago",
    "Price must be greater than 0": "El precio debe ser mayor a 0",
    "Product name is required": "El nombre del producto es requerido",
    "Product saved successfully": "Producto guardado exitosamente",
    "Product created successfully": "Producto creado exitosamente",
    "Product deleted successfully": "Producto eliminado exitosamente",
    "Category created successfully": "Categoría creada exitosamente",
    "Category deleted successfully": "Categoría eliminada exitosamente",
    "Category updated successfully": "Categoría actualizada exitosamente",
    "Order updated successfully": "Pedido actualizado exitosamente",
    "Store settings saved": "Configuración de tienda guardada",
    "Shipping zone created": "Zona de envío creada",
    "Shipping zone deleted": "Zona de envío eliminada",
    "Configure your store settings": "Configura tu tienda",
    "Store Configuration": "Configuración de Tienda",
    "Add shipping zone": "Agregar zona de envío",
    "Payment Methods": "Métodos de Pago",
    "Shipping Zones": "Zonas de Envío",
    "Tax Settings": "Configuración de Impuestos",
    "Notification Settings": "Configuración de Notificaciones",
    "New order notification": "Notificación de nuevo pedido",
    "Low stock notification": "Notificación de stock bajo",
    "Low stock threshold": "Umbral de stock bajo",
    "Free shipping minimum": "Mínimo para envío gratuito",
    "Enable tax": "Habilitar impuesto",
    "Tax rate": "Tasa de impuesto",
    "Tax included in prices": "Impuesto incluido en precios",
    "Select project for ecommerce": "Selecciona proyecto para e-commerce",
    "Manage products, orders and customers": "Gestiona productos, pedidos y clientes",
    "Loading products...": "Cargando productos...",
    "Loading orders...": "Cargando pedidos...",
    "Loading customers...": "Cargando clientes...",
    "Add demo products": "Agregar productos demo",
    "Adding demo products...": "Agregando productos demo...",
    "Demo products added successfully": "Productos demo agregados exitosamente",
    "Cash on Delivery": "Pago Contra Entrega",
    "Bank Transfer": "Transferencia Bancaria",
    "Credit Card": "Tarjeta de Crédito",
    "Payment gateway": "Pasarela de pago",
    "Connect payment gateway": "Conectar pasarela de pago",
    "Payment gateway connected": "Pasarela de pago conectada",
    "Manage your store": "Gestiona tu tienda",
    "Your store is ready": "Tu tienda está lista",
    "Start selling": "Comienza a vender",
    "Enable ecommerce": "Habilitar e-commerce",
    "Disable ecommerce": "Deshabilitar e-commerce",
    "Product type": "Tipo de producto",
    "Physical product": "Producto físico",
    "Digital product": "Producto digital",
    "Product weight": "Peso del producto",
    "Product dimensions": "Dimensiones del producto",
    "Notify when low stock": "Notificar cuando haya poco stock",
    "Low stock amount": "Cantidad de stock bajo",
    "Track inventory": "Rastrear inventario",
    "Allow backorders": "Permitir pedidos pendientes",
    "Product options": "Opciones del producto",
    "Add option": "Agregar opción",
    "Option name": "Nombre de la opción",
    "Option values": "Valores de la opción",
    "Generate product variants": "Generar variantes del producto",
    "variants generated": "variantes generadas",
    "Flat rate": "Tarifa fija",
    "Free shipping": "Envío gratuito",
    "Calculated at checkout": "Calculado en el pago",
    "Shipping rate": "Tarifa de envío",
    "Zone name": "Nombre de la zona",
    "Apply coupon": "Aplicar cupón",
    "Invalid coupon": "Cupón inválido",
    "Coupon applied": "Cupón aplicado",
    "Coupon removed": "Cupón eliminado",
    "Enter coupon code": "Ingresa código de cupón",
    "Discount applied": "Descuento aplicado",
    "Complete purchase": "Completar compra",
    "Order placed successfully": "Pedido realizado exitosamente",
    "Thank you for your order": "Gracias por tu pedido",
    "Your order has been placed": "Tu pedido ha sido realizado",
    "Order details": "Detalles del pedido",
    "Shipping information": "Información de envío",
    "Payment information": "Información de pago",
    "Processing your order...": "Procesando tu pedido...",
    "Place order": "Realizar pedido",
    "Card number": "Número de tarjeta",
    "Expiration date": "Fecha de vencimiento",
    "Security code": "Código de seguridad",
    "Name on card": "Nombre en la tarjeta",
    "Same as billing": "Igual a facturación",
    "Full name": "Nombre completo",
    "Street address": "Dirección",
    "Zip code": "Código postal",
    "Phone number": "Número de teléfono",
    "Add to wishlist": "Agregar a favoritos",
    "Remove from wishlist": "Eliminar de favoritos",
    "Compare products": "Comparar productos",
    "Size guide": "Guía de tallas",
    "Share product": "Compartir producto",
    "Product details": "Detalles del producto",
    "Specifications": "Especificaciones",
    "Customer reviews": "Reseñas de clientes",
    "Write a review": "Escribir una reseña",
    "Submit review": "Enviar reseña",
    "Your rating": "Tu calificación",
    "Your review": "Tu reseña",
    "Review submitted": "Reseña enviada",
    "Thank you for your review": "Gracias por tu reseña",
    "Sort by newest": "Ordenar por más reciente",
    "Sort by rating": "Ordenar por calificación",
    "Sort by price": "Ordenar por precio",
    "Price: low to high": "Precio: menor a mayor",
    "Price: high to low": "Precio: mayor a menor",
    "Newest first": "Más recientes primero",
    "Most popular": "Más populares",
    "Apply filters": "Aplicar filtros",
    "Clear filters": "Limpiar filtros",
    "Price range": "Rango de precio",
    "All categories": "Todas las categorías",
    "Showing results for": "Mostrando resultados para",
    "No products found": "No se encontraron productos",
    "Try different keywords": "Prueba con diferentes palabras",
    "Back to shop": "Volver a la tienda",
    "Continue to checkout": "Continuar al pago",
    "Update cart": "Actualizar carrito",
    "Your order is confirmed": "Tu pedido está confirmado",
    "We'll send you a confirmation email": "Te enviaremos un email de confirmación",
    "Track your order": "Rastrear tu pedido",
    "Contact support": "Contactar soporte",
    # Agency dashboard
    "Additional Options": "Opciones Adicionales",
    "All clients": "Todos los clientes",
    "End Date": "Fecha Fin",
    "Start Date": "Fecha Inicio",
    "Generate Report": "Generar Reporte",
    "Generating Report": "Generando Reporte",
    "This may take a few moments...": "Esto puede tomar unos momentos...",
    "Reports Generator": "Generador de Reportes",
    "Create consolidated reports for all your clients": "Crea reportes consolidados para todos tus clientes",
    "Include recommendations": "Incluir recomendaciones",
    "Include trend analysis": "Incluir análisis de tendencias",
    "Last 7 days": "Últimos 7 días",
    "Last 30 days": "Últimos 30 días",
    "Last 90 days": "Últimos 90 días",
    "AI credits consumed": "Créditos de IA consumidos",
    "Campaigns and engagement": "Campañas e interacción",
    "Lead capture and conversions": "Captura de leads y conversiones",
    "Active projects": "Proyectos activos",
    "Revenue and orders": "Ingresos y pedidos",
    "Storage used": "Almacenamiento usado",
    "Metrics to Include": "Métricas a Incluir",
}

# Build reverse dict (EN→ES) from ES→EN for ecommerce fixes
EN_ES = {}
for es_val, en_val in ES_EN.items():
    if is_spanish(es_val):
        # ES_EN maps Spanish → English, so for EN→ES we reverse
        pass  # These fix the EN file
    else:
        # This maps English → Spanish for the ES file
        EN_ES[es_val] = en_val

# Also add the English keys with their Spanish values
for es_val, en_val in ES_EN.items():
    if not is_spanish(es_val) and is_english(es_val):
        EN_ES[es_val] = en_val  # Already correct direction

fixed_en = 0
fixed_es = 0

def fix_recursive(es_d, en_d, path=''):
    global fixed_en, fixed_es
    for key in list(es_d.keys()):
        full = f'{path}.{key}' if path else key
        es_v = es_d.get(key)
        en_v = en_d.get(key) if isinstance(en_d, dict) else None

        if isinstance(es_v, dict) and isinstance(en_v, dict):
            fix_recursive(es_v, en_v, full)
        elif isinstance(es_v, str) and isinstance(en_v, str) and es_v == en_v and len(es_v) > 10:
            val = es_v

            # Check if value is Spanish (then EN file needs fixing)
            if val in ES_EN:
                en_d[key] = ES_EN[val]
                fixed_en += 1
            elif is_spanish(val):
                # Try to translate Spanish → English using patterns
                translated = translate_es_to_en(val)
                if translated != val:
                    en_d[key] = translated
                    fixed_en += 1

            # Check if value is English (then ES file needs fixing)
            elif val in EN_ES:
                es_d[key] = EN_ES[val]
                fixed_es += 1
            elif is_english(val):
                translated = translate_en_to_es(val)
                if translated != val:
                    es_d[key] = translated
                    fixed_es += 1

def translate_es_to_en(text):
    """Pattern-based Spanish to English translation."""
    patterns = [
        (r'^No se encontraron (.+)$', r'No \1 found'),
        (r'^No hay (.+) disponibles?$', r'No \1 available'),
        (r'^Sin (.+) todavía$', r'No \1 yet'),
        (r'^Error al (.+)$', r'Failed to \1'),
        (r'^¿Estás seguro de que quieres (.+)\?$', r'Are you sure you want to \1?'),
        (r'^Selecciona (.+)$', r'Select \1'),
        (r'^Ingresa (.+)$', r'Enter \1'),
        (r'^(.+) es requerido$', r'\1 is required'),
        (r'^(.+) inválido$', r'Invalid \1'),
        (r'^(.+) ya existe$', r'\1 already exists'),
        (r'^Clic para (.+)$', r'Click to \1'),
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
        (r'^(.+) enviado exitosamente$', r'\1 sent successfully'),
    ]
    for pattern, replacement in patterns:
        if re.match(pattern, text):
            return re.sub(pattern, replacement, text)
    return text

def translate_en_to_es(text):
    """Pattern-based English to Spanish translation."""
    patterns = [
        (r'^No (.+) found$', r'No se encontraron \1'),
        (r'^No (.+) available$', r'No hay \1 disponibles'),
        (r'^No (.+) yet$', r'Sin \1 todavía'),
        (r'^Failed to (.+)$', r'Error al \1'),
        (r'^Unable to (.+)$', r'No se puede \1'),
        (r'^Are you sure you want to (.+)\?$', r'¿Estás seguro de que quieres \1?'),
        (r'^Select (.+)$', r'Seleccionar \1'),
        (r'^Enter (.+)$', r'Ingresa \1'),
        (r'^(.+) is required$', r'\1 es requerido'),
        (r'^Invalid (.+)$', r'\1 inválido'),
        (r'^(.+) already exists$', r'\1 ya existe'),
        (r'^Click to (.+)$', r'Clic para \1'),
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
        (r'^(.+) per month$', r'\1 por mes'),
        (r'^(.+) per year$', r'\1 por año'),
    ]
    for pattern, replacement in patterns:
        if re.match(pattern, text):
            return re.sub(pattern, replacement, text)
    return text

fix_recursive(es, en)

# Save
with open(es_path, 'w', encoding='utf-8') as f:
    json.dump(es, f, ensure_ascii=False, indent=2)
    f.write('\n')
with open(en_path, 'w', encoding='utf-8') as f:
    json.dump(en, f, ensure_ascii=False, indent=2)
    f.write('\n')

print(f'✅ Fixed {fixed_en} EN values (Spanish→English)')
print(f'✅ Fixed {fixed_es} ES values (English→Spanish)')
print(f'✅ Total: {fixed_en + fixed_es}')
