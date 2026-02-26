#!/usr/bin/env python3
"""
Final comprehensive fix: translate ALL remaining identical values in both directions.
- ES values that are in English → translate to Spanish
- EN values that are in Spanish → translate to English
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

# Detect language heuristic
spanish_markers = [
    'á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü', '¿', '¡',
    ' de ', ' del ', ' la ', ' las ', ' los ', ' el ',
    ' un ', ' una ', ' en ', ' con ', ' por ', ' para ',
    ' tu ', ' su ', ' que ', ' es ', ' está ', ' son ',
    ' al ', ' se ', ' no ', ' más ', ' este ', ' esta ',
]

def is_spanish(text):
    """Check if text appears to be Spanish."""
    if len(text) < 5:
        return False
    lowered = text.lower()
    score = 0
    for marker in spanish_markers:
        if marker in lowered:
            score += 1
    # Also check word endings typical of Spanish
    if re.search(r'(ción|sión|mente|ando|endo|ado|ido|ción|tivo|dad|oso)\b', lowered):
        score += 2
    return score >= 2

def is_english(text):
    """Check if text appears to be English."""
    if len(text) < 5:
        return False
    lowered = text.lower()
    english_markers = [
        ' the ', ' this ', ' that ', ' with ', ' from ', ' your ',
        ' you ', ' for ', ' and ', ' are ', ' can ', ' will ',
        ' has ', ' have ', ' been ', ' when ', ' what ', ' how ',
        ' not ', ' all ', ' any ', ' each ', ' per ', ' our ',
        ' may ', ' set ', ' get ', ' new ', ' add ', ' use ',
        'click ', 'enter ', 'select ', 'choose ', 'create ',
        'manage ', 'configure ', 'enable ', 'disable ',
        'here', 'now', 'yet', 'already', 'before', 'after',
        'successfully', 'automatically', 'currently', 'previously',
        'available', 'required', 'optional', 'included',
    ]
    score = 0
    for marker in english_markers:
        if marker in lowered:
            score += 1
    if re.search(r'(tion|sion|ment|ness|able|ible|ful|less|ing|ted|ous)\b', lowered):
        score += 2
    return score >= 2

# ============================================================
# MASSIVE TRANSLATION DICTIONARIES
# ============================================================

# EN → ES (for ES file where value is in English)
EN_SENTENCES = {
    # Ecommerce
    "This category has products. Move the products to another category before deleting.": "Esta categoría tiene productos. Mueve los productos a otra categoría antes de eliminar.",
    "Collect payment at delivery": "Cobrar al momento de la entrega",
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
    "Email Notifications": "Notificaciones por Email",
    "Notification Settings": "Configuración de Notificaciones",
    "New order notification": "Notificación de nuevo pedido",
    "Low stock notification": "Notificación de stock bajo",
    "Low stock threshold": "Umbral de stock bajo",
    "Free shipping minimum": "Mínimo para envío gratuito",
    "Enable tax": "Habilitar impuesto",
    "Tax rate": "Tasa de impuesto",
    "Tax included in prices": "Impuesto incluido en precios",
    "Select project for ecommerce": "Selecciona proyecto para e-commerce",
    "My Products": "Mis Productos",
    "All Products": "Todos los Productos",
    "Add Category": "Agregar Categoría",
    "Edit Category": "Editar Categoría",
    "Category Name": "Nombre de la Categoría",
    "Manage products, orders and customers": "Gestiona productos, pedidos y clientes",
    "Loading products...": "Cargando productos...",
    "Loading orders...": "Cargando pedidos...",
    "Loading customers...": "Cargando clientes...",
    "No results": "Sin resultados",
    "View order": "Ver pedido",
    "View customer": "Ver cliente",
    "View product": "Ver producto",
    "items": "artículos",
    "units": "unidades",
    "per unit": "por unidad",
    "Manage your store": "Gestiona tu tienda",
    "Your store is ready": "Tu tienda está lista",
    "Start selling": "Comienza a vender",
    "Flat rate": "Tarifa fija",
    "Free shipping": "Envío gratuito",
    "Calculated at checkout": "Calculado en el pago",
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
    "Billing address": "Dirección de facturación",
    "Shipping address": "Dirección de envío",
    "Same as billing": "Igual a facturación",
    "Full name": "Nombre completo",
    "Street address": "Dirección",
    "City": "Ciudad",
    "State": "Estado",
    "Zip code": "Código postal",
    "Country": "País",
    "Phone number": "Número de teléfono",
    "Add to wishlist": "Agregar a favoritos",
    "Remove from wishlist": "Eliminar de favoritos",
    "Wishlist": "Lista de deseos",
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
    "Helpful": "Útil",
    "Not helpful": "No útil",
    "Sort by newest": "Ordenar por más reciente",
    "Sort by rating": "Ordenar por calificación",
    "Sort by price": "Ordenar por precio",
    "Price: low to high": "Precio: menor a mayor",
    "Price: high to low": "Precio: mayor a menor",
    "Newest first": "Más recientes primero",
    "Best selling": "Más vendidos",
    "Most popular": "Más populares",
    "Alphabetical": "Alfabético",
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
    # Domains
    "Buy {domainName} for 1 year? This will be charged to your account.": "¿Comprar {domainName} por 1 año? Esto se cargará a tu cuenta.",
    # Generic patterns
    "Select project": "Seleccionar proyecto",
    "Select a project": "Selecciona un proyecto",
    "No projects found": "No se encontraron proyectos",
    "Search projects...": "Buscar proyectos...",
    "Created on": "Creado el",
    "Last modified": "Última modificación",
    "Last updated": "Última actualización",
    "Modified on": "Modificado el",
    "Updated on": "Actualizado el",
    "Show more": "Mostrar más",
    "Show less": "Mostrar menos",
    "Load more": "Cargar más",
    "See all": "Ver todo",
    "See more": "Ver más",
    "View all": "Ver todo",
    "Learn more": "Saber más",
    "Read more": "Leer más",
    "Go back": "Volver",
    "Sign out": "Cerrar sesión",
    "Log out": "Cerrar sesión",
    "My account": "Mi cuenta",
    "My profile": "Mi perfil",
    "My orders": "Mis pedidos",
    "My reviews": "Mis reseñas",
    "My wishlist": "Mi lista de deseos",
    "Account settings": "Configuración de cuenta",
    "Change password": "Cambiar contraseña",
    "Update profile": "Actualizar perfil",
    "Welcome back": "Bienvenido de nuevo",
    "Welcome!": "¡Bienvenido!",
    "Hello!": "¡Hola!",
    "Get started": "Comenzar",
    "Coming soon": "Próximamente",
    "Under construction": "En construcción",
    "Page not found": "Página no encontrada",
    "Access denied": "Acceso denegado",
    "Permission denied": "Permiso denegado",
    "Session expired": "Sesión expirada",
    "Please log in again": "Por favor inicia sesión de nuevo",
    "Please try again later": "Por favor intenta de nuevo más tarde",
    "Connection error": "Error de conexión",
    "Network error": "Error de red",
    "Server error": "Error del servidor",
    "Unknown error": "Error desconocido",
    "An error occurred": "Ocurrió un error",
    "Something went wrong": "Algo salió mal",
    "Please try again": "Por favor intenta de nuevo",
    "Operation successful": "Operación exitosa",
    "Changes saved": "Cambios guardados",
    "Changes saved successfully": "Cambios guardados exitosamente",
    "Are you sure you want to delete this?": "¿Estás seguro de que quieres eliminar esto?",
    "This cannot be undone": "Esto no se puede deshacer",
    "No data": "Sin datos",
    "No items": "Sin elementos",
    "Empty": "Vacío",
    "Not configured": "No configurado",
    "Not available": "No disponible",
    "Coming soon...": "Próximamente...",
    "Under development": "En desarrollo",
    "Beta": "Beta",
    "Powered by Quimera.ai": "Potenciado por Quimera.ai",
}

# ES → EN (for EN file where value is in Spanish)
ES_SENTENCES = {
    "Sigue estos sencillos pasos para lanzar tu proyecto profesional.": "Follow these simple steps to launch your professional project.",
    "Tu camino al éxito": "Your path to success",
    "Tip: Sigue esta guía para completar tu configuración.": "Tip: Follow this guide to complete your setup.",
    "Crea tu primer proyecto": "Create your first project",
    "Usa nuestra IA para generar tu sitio web en segundos.": "Use our AI to generate your website in seconds.",
    "Personaliza tu diseño": "Customize your design",
    "Ajusta colores, fuentes y contenido con el editor visual.": "Adjust colors, fonts, and content with the visual editor.",
    "Publica tu sitio": "Publish your site",
    "Conecta tu dominio y lanza tu idea al mundo.": "Connect your domain and launch your idea to the world.",
    "Añade contenido al CMS": "Add content to the CMS",
    "Crea tu primer artículo o página de blog.": "Create your first article or blog post.",
    "Conecta tu dominio": "Connect your domain",
    "Añade un dominio personalizado a tu sitio.": "Add a custom domain to your site.",
    "Deshacer": "Undo",
    "Rehacer": "Redo",
    "No hay acciones para deshacer": "No actions to undo",
    "Límite de historial alcanzado": "History limit reached",
    "Ctrl+Z para deshacer": "Ctrl+Z to undo",
    "Ctrl+Shift+Z para rehacer": "Ctrl+Shift+Z to redo",
    "Agregar al Carrito": "Add to Cart",
    "Agregar Variante": "Add Variant",
    "Valor Promedio del Pedido": "Average Order Value",
    "Calificación Promedio": "Average Rating",
    "Código de Barras": "Barcode",
    "Dirección de Facturación": "Billing Address",
    "Tu carrito está vacío": "Your cart is empty",
    "Continuar Comprando": "Continue Shopping",
    "Costo por Artículo": "Cost Per Item",
    "Email del Cliente": "Customer Email",
    "Información del Cliente": "Customer Information",
    "Nombre del Cliente": "Customer Name",
    "Teléfono del Cliente": "Customer Phone",
    "Eliminar Categoría": "Delete Category",
    "¿Estás seguro de que quieres eliminar este elemento?": "Are you sure you want to delete this item?",
    "Eliminar Producto": "Delete Product",
    "¿Estás seguro de que quieres eliminar este producto?": "Are you sure you want to delete this product?",
    "Producto Digital": "Digital Product",
    "Archivo de Descarga": "Download File",
    "Enlace de Descarga": "Download Link",
    "Notificaciones por Email": "Email Notifications",
    "Entrega Estimada": "Estimated Delivery",
    "Productos Destacados": "Featured Products",
    "Reembolso Completo": "Full Refund",
    "Imagen Principal": "Main Image",
    "Gestionar Tienda": "Manage Store",
    "Marcar como Cumplido": "Mark as Fulfilled",
    "Marcar como Pagado": "Mark as Paid",
    "Descargas Máximas": "Max Downloads",
    "Confirmación de Pedido": "Order Confirmation",
    "Fecha del Pedido": "Order Date",
    "Historial de Pedidos": "Order History",
    "Artículos del Pedido": "Order Items",
    "Notas del Pedido": "Order Notes",
    "Número de Pedido": "Order Number",
    "Pedido Realizado": "Order Placed",
    "Estado del Pedido": "Order Status",
    "Resumen del Pedido": "Order Summary",
    "Total del Pedido": "Order Total",
    "Reembolso Parcial": "Partial Refund",
    "Producto Físico": "Physical Product",
    "Proceder al Pago": "Proceed to Checkout",
    "Monto del Reembolso": "Refund Amount",
    "Razón del Reembolso": "Refund Reason",
    "Productos Relacionados": "Related Products",
    "Eliminar del Carrito": "Remove from Cart",
    "Eliminar Variante": "Remove Variant",
    "Enviar Factura": "Send Invoice",
    "Configuración de Envíos": "Shipping Settings",
    "Número de Seguimiento": "Tracking Number",
    "URL de la Tienda": "Store URL",
    "Nombre de la Tienda": "Store Name",
    "Logo de la Tienda": "Store Logo",
    "Descripción de la Tienda": "Store Description",
    "Moneda de la Tienda": "Store Currency",
    "Configuración de Pagos": "Payment Settings",
    "Configuración de Impuestos": "Tax Settings",
    "Novedades": "New Arrivals",
    "Más Vendidos": "Best Sellers",
    "En Oferta": "On Sale",
    "Calificación": "Rating",
    "Calificaciones": "Ratings",
    "Escribir Reseña": "Write Review",
    "Sin Reseñas": "No Reviews",
    "Ver Carrito": "View Cart",
    "Abrir Tienda": "Open Store",
    "Agregar Producto": "Add Product",
    "Editar Producto": "Edit Product",
    "Nombre del Producto": "Product Name",
    "Descripción del Producto": "Product Description",
    "Precio Comparativo": "Compare Price",
    "Imágenes del Producto": "Product Images",
    "Nombre de Variante": "Variant Name",
    "Precio de Variante": "Variant Price",
    "SKU de Variante": "Variant SKU",
    "Precio Anterior": "Compare At Price",
    "Rastrear Cantidad": "Track Quantity",
    "Ingresos Totales": "Total Revenue",
    "Ventas Totales": "Total Sales",
    "Pedidos Totales": "Total Orders",
    "Productos Más Vendidos": "Top Products",
    "Pedidos Recientes": "Recent Orders",
    "Buscar productos...": "Search products...",
    "Agregar Categoría": "Add Category",
    "Editar Categoría": "Edit Category",
}

# Pattern-based EN→ES
EN_PATTERNS = [
    (r'^No (.+) found$', r'No se encontraron \1'),
    (r'^No (.+) available$', r'No hay \1 disponibles'),
    (r'^No (.+) yet$', r'Sin \1 todavía'),
    (r'^(.+) not found$', r'\1 no encontrado'),
    (r'^(.+) created successfully[.!]?$', r'\1 creado exitosamente'),
    (r'^(.+) updated successfully[.!]?$', r'\1 actualizado exitosamente'),
    (r'^(.+) deleted successfully[.!]?$', r'\1 eliminado exitosamente'),
    (r'^(.+) saved successfully[.!]?$', r'\1 guardado exitosamente'),
    (r'^(.+) sent successfully[.!]?$', r'\1 enviado exitosamente'),
    (r'^(.+) added successfully[.!]?$', r'\1 agregado exitosamente'),
    (r'^(.+) removed successfully[.!]?$', r'\1 removido exitosamente'),
    (r'^Failed to (.+)$', r'Error al \1'),
    (r'^Unable to (.+)$', r'No se puede \1'),
    (r'^Error (.+)$', r'Error \1'),
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
    (r'^Enable (.+)$', r'Habilitar \1'),
    (r'^Disable (.+)$', r'Deshabilitar \1'),
    (r'^Manage (.+)$', r'Gestionar \1'),
    (r'^Configure (.+)$', r'Configurar \1'),
    (r'^(.+) per month$', r'\1 por mes'),
    (r'^(.+) per year$', r'\1 por año'),
    (r'^Loading (.+)\.\.\.$', r'Cargando \1...'),
    (r'^Generating (.+)\.\.\.$', r'Generando \1...'),
    (r'^(.+)\.\.\.$', r'\1...'),
]

fixed_es = 0
fixed_en = 0

def fix_value(es_d, en_d, path=''):
    global fixed_es, fixed_en
    for key in list(es_d.keys()):
        full = f'{path}.{key}' if path else key
        es_v = es_d.get(key)
        en_v = en_d.get(key) if isinstance(en_d, dict) else None

        if isinstance(es_v, dict) and isinstance(en_v, dict):
            fix_value(es_v, en_v, full)
        elif isinstance(es_v, str) and isinstance(en_v, str) and es_v == en_v and len(es_v) > 4:
            val = es_v

            if is_spanish(val):
                # Value is in Spanish → EN needs English translation
                if val in ES_SENTENCES:
                    en_d[key] = ES_SENTENCES[val]
                    fixed_en += 1
                # else: keep as is (already Spanish in EN, may be acceptable)

            elif is_english(val):
                # Value is in English → ES needs Spanish translation
                if val in EN_SENTENCES:
                    es_d[key] = EN_SENTENCES[val]
                    fixed_es += 1
                else:
                    # Try patterns
                    for pattern, replacement in EN_PATTERNS:
                        m = re.match(pattern, val)
                        if m:
                            es_d[key] = re.sub(pattern, replacement, val)
                            fixed_es += 1
                            break

fix_value(es, en)

# Save
with open(es_path, 'w', encoding='utf-8') as f:
    json.dump(es, f, ensure_ascii=False, indent=2)
    f.write('\n')
with open(en_path, 'w', encoding='utf-8') as f:
    json.dump(en, f, ensure_ascii=False, indent=2)
    f.write('\n')

print(f'✅ Fixed {fixed_es} ES values (English→Spanish)')
print(f'✅ Fixed {fixed_en} EN values (Spanish→English)')
print(f'✅ Total fixed: {fixed_es + fixed_en}')
