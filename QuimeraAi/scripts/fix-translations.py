#!/usr/bin/env python3
"""
Fix untranslated strings in ES translation file.
Adds proper Spanish translations for the sections that were auto-copied from EN.
Also fixes EN file for sections that were copied from ES without translation.
"""

import json
import os

def load_files():
    base = '/Users/armandoolmo/QuimeraAppCursor/QuimeraAi'
    es_path = os.path.join(base, 'locales', 'es', 'translation.json')
    en_path = os.path.join(base, 'locales', 'en', 'translation.json')
    
    with open(es_path, 'r', encoding='utf-8') as f:
        es = json.load(f)
    with open(en_path, 'r', encoding='utf-8') as f:
        en = json.load(f)
    
    return es, en, es_path, en_path

def set_nested(d, path, value):
    """Set a value at a nested key path like 'a.b.c'."""
    keys = path.split('.')
    current = d
    for k in keys[:-1]:
        if k not in current:
            current[k] = {}
        current = current[k]
    current[keys[-1]] = value

def save_files(es, en, es_path, en_path):
    with open(es_path, 'w', encoding='utf-8') as f:
        json.dump(es, f, ensure_ascii=False, indent=2)
        f.write('\n')
    with open(en_path, 'w', encoding='utf-8') as f:
        json.dump(en, f, ensure_ascii=False, indent=2)
        f.write('\n')

def fix_translations():
    es, en, es_path, en_path = load_files()
    
    count = 0
    
    # ============================================================
    # FIX 1: Ecommerce section (ES translations)
    # ============================================================
    ecommerce_es = {
        "title": "Tienda",
        "products": "Productos",
        "product": "Producto",
        "categories": "Categorías",
        "category": "Categoría",
        "orders": "Pedidos",
        "order": "Pedido",
        "customers": "Clientes",
        "customer": "Cliente",
        "addProduct": "Agregar Producto",
        "addCategory": "Agregar Categoría",
        "addFirstProduct": "Agrega tu primer producto",
        "addFirstCategory": "Agrega tu primera categoría",
        "editProduct": "Editar Producto",
        "editCategory": "Editar Categoría",
        "deleteProduct": "Eliminar Producto",
        "deleteCategory": "Eliminar Categoría",
        "deleteConfirm": "¿Estás seguro de que quieres eliminar este elemento?",
        "deleteProductConfirm": "¿Estás seguro de que quieres eliminar este producto?",
        "searchProducts": "Buscar productos...",
        "searchOrders": "Buscar pedidos...",
        "searchCustomers": "Buscar clientes...",
        "allCategories": "Todas las Categorías",
        "noProducts": "No hay productos",
        "noOrders": "No hay pedidos",
        "noCategories": "No hay categorías",
        "noCustomers": "No hay clientes",
        "productName": "Nombre del Producto",
        "productDescription": "Descripción del Producto",
        "productPrice": "Precio",
        "productComparePrice": "Precio Comparativo",
        "productSKU": "SKU",
        "productImages": "Imágenes del Producto",
        "productCategory": "Categoría",
        "productStatus": "Estado",
        "productInventory": "Inventario",
        "productVariants": "Variantes",
        "productWeight": "Peso",
        "productDimensions": "Dimensiones",
        "productTags": "Etiquetas",
        "inStock": "En Stock",
        "outOfStock": "Agotado",
        "lowStock": "Stock Bajo",
        "unlimited": "Ilimitado",
        "active": "Activo",
        "inactive": "Inactivo",
        "activeDiscounts": "Descuentos Activos",
        "draft": "Borrador",
        "archived": "Archivado",
        "published": "Publicado",
        "quantity": "Cantidad",
        "price": "Precio",
        "total": "Total",
        "subtotal": "Subtotal",
        "tax": "Impuesto",
        "taxes": "Impuestos",
        "shipping": "Envío",
        "shippingAddress": "Dirección de Envío",
        "billingAddress": "Dirección de Facturación",
        "discount": "Descuento",
        "discounts": "Descuentos",
        "addDiscount": "Agregar Descuento",
        "coupon": "Cupón",
        "coupons": "Cupones",
        "couponCode": "Código de Cupón",
        "freeShipping": "Envío Gratuito",
        "cart": "Carrito",
        "addToCart": "Agregar al Carrito",
        "removeFromCart": "Eliminar del Carrito",
        "viewCart": "Ver Carrito",
        "checkout": "Pagar",
        "proceedToCheckout": "Proceder al Pago",
        "continueShopping": "Continuar Comprando",
        "emptyCart": "Carrito Vacío",
        "cartEmpty": "Tu carrito está vacío",
        "orderPlaced": "Pedido Realizado",
        "orderConfirmation": "Confirmación de Pedido",
        "orderNumber": "Número de Pedido",
        "orderDate": "Fecha del Pedido",
        "orderStatus": "Estado del Pedido",
        "orderTotal": "Total del Pedido",
        "orderItems": "Artículos del Pedido",
        "orderNotes": "Notas del Pedido",
        "orderHistory": "Historial de Pedidos",
        "trackOrder": "Rastrear Pedido",
        "paymentMethod": "Método de Pago",
        "paymentStatus": "Estado del Pago",
        "paid": "Pagado",
        "unpaid": "No Pagado",
        "refunded": "Reembolsado",
        "pending": "Pendiente",
        "processing": "Procesando",
        "shipped": "Enviado",
        "delivered": "Entregado",
        "cancelled": "Cancelado",
        "returned": "Devuelto",
        "fulfilled": "Cumplido",
        "unfulfilled": "No Cumplido",
        "partiallyFulfilled": "Parcialmente Cumplido",
        "reviews": "Reseñas",
        "review": "Reseña",
        "rating": "Calificación",
        "ratings": "Calificaciones",
        "writeReview": "Escribir Reseña",
        "noReviews": "Sin Reseñas",
        "averageRating": "Calificación Promedio",
        "currency": "Moneda",
        "weight": "Peso",
        "dimensions": "Dimensiones",
        "width": "Ancho",
        "height": "Alto",
        "length": "Largo",
        "save": "Guardar",
        "saving": "Guardando...",
        "saved": "Guardado",
        "cancel": "Cancelar",
        "delete": "Eliminar",
        "edit": "Editar",
        "actions": "Acciones",
        "back": "Volver",
        "next": "Siguiente",
        "previous": "Anterior",
        "close": "Cerrar",
        "select": "Seleccionar",
        "selected": "Seleccionado",
        "view": "Ver",
        "viewAll": "Ver Todo",
        "viewDetails": "Ver Detalles",
        "enabled": "Habilitado",
        "disabled": "Deshabilitado",
        "sortBy": "Ordenar por",
        "filterBy": "Filtrar por",
        "showAll": "Mostrar Todo",
        "clearFilters": "Limpiar Filtros",
        "apply": "Aplicar",
        "reset": "Restablecer",
        "loading": "Cargando...",
        "error": "Error",
        "success": "Éxito",
        "required": "Requerido",
        "optional": "Opcional",
        "description": "Descripción",
        "name": "Nombre",
        "image": "Imagen",
        "images": "Imágenes",
        "upload": "Subir",
        "uploadImage": "Subir Imagen",
        "removeImage": "Eliminar Imagen",
        "mainImage": "Imagen Principal",
        "gallery": "Galería",
        "settings": "Configuración",
        "storeSettings": "Configuración de Tienda",
        "storeName": "Nombre de la Tienda",
        "storeLogo": "Logo de la Tienda",
        "storeDescription": "Descripción de la Tienda",
        "storeCurrency": "Moneda de la Tienda",
        "paymentSettings": "Configuración de Pagos",
        "shippingSettings": "Configuración de Envíos",
        "taxSettings": "Configuración de Impuestos",
        "emailNotifications": "Notificaciones por Email",
        "acceptsMarketing": "Acepta Marketing",
        "manageStore": "Gestionar Tienda",
        "openStore": "Abrir Tienda",
        "featuredProducts": "Productos Destacados",
        "newArrivals": "Novedades",
        "bestSellers": "Más Vendidos",
        "onSale": "En Oferta",
        "relatedProducts": "Productos Relacionados",
        "addNote": "Agregar Nota",
        "notes": "Notas",
        "tags": "Etiquetas",
        "addTag": "Agregar Etiqueta",
        "color": "Color",
        "size": "Talla",
        "variant": "Variante",
        "addVariant": "Agregar Variante",
        "removeVariant": "Eliminar Variante",
        "variantName": "Nombre de Variante",
        "variantPrice": "Precio de Variante",
        "variantSKU": "SKU de Variante",
        "compareAtPrice": "Precio Anterior",
        "costPerItem": "Costo por Artículo",
        "profit": "Ganancia",
        "margin": "Margen",
        "trackQuantity": "Rastrear Cantidad",
        "barcode": "Código de Barras",
        "digitalProduct": "Producto Digital",
        "physicalProduct": "Producto Físico",
        "downloadFile": "Archivo de Descarga",
        "maxDownloads": "Descargas Máximas",
        "downloadLink": "Enlace de Descarga",
        "visible": "Visible",
        "hidden": "Oculto",
        "featured": "Destacado",
        "orderSummary": "Resumen del Pedido",
        "customerInfo": "Información del Cliente",
        "customerName": "Nombre del Cliente",
        "customerEmail": "Email del Cliente",
        "customerPhone": "Teléfono del Cliente",
        "shippingMethod": "Método de Envío",
        "standard": "Estándar",
        "express": "Express",
        "overnight": "Nocturno",
        "pickup": "Recoger en Tienda",
        "free": "Gratis",
        "flat": "Tarifa Fija",
        "calculated": "Calculado",
        "estimatedDelivery": "Entrega Estimada",
        "trackingNumber": "Número de Seguimiento",
        "markAsFulfilled": "Marcar como Cumplido",
        "markAsPaid": "Marcar como Pagado",
        "sendInvoice": "Enviar Factura",
        "refund": "Reembolsar",
        "refundAmount": "Monto del Reembolso",
        "fullRefund": "Reembolso Completo",
        "partialRefund": "Reembolso Parcial",
        "refundReason": "Razón del Reembolso",
        "storeUrl": "URL de la Tienda",
        "inventory": "Inventario",
        "manage": "Gestionar",
        "configure": "Configurar",
        "analytics": "Analíticas",
        "totalSales": "Ventas Totales",
        "totalRevenue": "Ingresos Totales",
        "totalOrders": "Pedidos Totales",
        "averageOrderValue": "Valor Promedio del Pedido",
        "topProducts": "Productos Más Vendidos",
        "recentOrders": "Pedidos Recientes",
    }
    
    # Deep merge ecommerce translations into ES
    def deep_update(target, source):
        nonlocal count
        for key, value in source.items():
            if isinstance(value, dict):
                if key not in target:
                    target[key] = {}
                if isinstance(target[key], dict):
                    deep_update(target[key], value)
                else:
                    target[key] = value
                    count += 1
            else:
                target[key] = value
                count += 1
    
    if 'ecommerce' in es:
        deep_update(es['ecommerce'], ecommerce_es)
    
    # ============================================================
    # FIX 2: Email section (ES translations)
    # ============================================================
    email_es = {
        "title": "Email Marketing",
        "campaigns": "Campañas",
        "campaign": "Campaña",
        "audiences": "Audiencias",
        "audience": "Audiencia",
        "templates": "Plantillas",
        "template": "Plantilla",
        "contacts": "Contactos",
        "contact": "Contacto",
        "createCampaign": "Crear Campaña",
        "editCampaign": "Editar Campaña",
        "deleteCampaign": "Eliminar Campaña",
        "sendCampaign": "Enviar Campaña",
        "scheduleCampaign": "Programar Campaña",
        "campaignName": "Nombre de la Campaña",
        "subject": "Asunto",
        "subjectLine": "Línea de Asunto",
        "previewText": "Texto de Vista Previa",
        "from": "De",
        "fromName": "Nombre del Remitente",
        "fromEmail": "Email del Remitente",
        "replyTo": "Responder A",
        "to": "Para",
        "sent": "Enviadas",
        "draft": "Borrador",
        "scheduled": "Programada",
        "sending": "Enviando",
        "status": "Estado",
        "date": "Fecha",
        "opened": "Abiertas",
        "clicked": "Clics",
        "bounced": "Rebotadas",
        "unsubscribed": "Desuscritas",
        "delivered": "Entregadas",
        "openRate": "Tasa de Apertura",
        "clickRate": "Tasa de Clics",
        "bounceRate": "Tasa de Rebote",
        "unsubscribeRate": "Tasa de Desuscripción",
        "deliveryRate": "Tasa de Entrega",
        "totalSent": "Total Enviadas",
        "totalOpened": "Total Abiertas",
        "totalClicked": "Total Clics",
        "noCampaigns": "No hay campañas",
        "noAudiences": "No hay audiencias",
        "noContacts": "No hay contactos",
        "createAudience": "Crear Audiencia",
        "editAudience": "Editar Audiencia",
        "deleteAudience": "Eliminar Audiencia",
        "audienceName": "Nombre de la Audiencia",
        "audienceDescription": "Descripción de la Audiencia",
        "addContact": "Agregar Contacto",
        "addContacts": "Agregar Contactos",
        "removeContact": "Eliminar Contacto",
        "importContacts": "Importar Contactos",
        "exportContacts": "Exportar Contactos",
        "contactName": "Nombre del Contacto",
        "contactEmail": "Email del Contacto",
        "subscribed": "Suscrito",
        "subscriber": "Suscriptor",
        "subscribers": "Suscriptores",
        "totalSubscribers": "Total de Suscriptores",
        "emailEditor": "Editor de Email",
        "design": "Diseño",
        "settings": "Configuración",
        "preview": "Vista Previa",
        "sendTest": "Enviar Prueba",
        "sendNow": "Enviar Ahora",
        "save": "Guardar",
        "cancel": "Cancelar",
        "back": "Volver",
        "automation": "Automatización",
        "automations": "Automatizaciones",
        "createAutomation": "Crear Automatización",
        "trigger": "Disparador",
        "action": "Acción",
        "delay": "Retraso",
        "condition": "Condición",
        "welcome": "Bienvenida",
        "followUp": "Seguimiento",
        "abandoned": "Abandonado",
        "cartAbandonment": "Carrito Abandonado",
        "analytics": "Analíticas",
        "performance": "Rendimiento",
        "engagement": "Engagement",
        "growth": "Crecimiento",
    }
    
    if 'email' in es:
        deep_update(es['email'], email_es)
    
    # ============================================================
    # FIX 3: Global Styles section (ES translations)
    # ============================================================
    globalStyles_es = {
        "title": "Estilos Globales",
        "fonts": "Fuentes",
        "colors": "Colores",
        "spacing": "Espaciado",
        "borders": "Bordes",
        "shadows": "Sombras",
        "animations": "Animaciones",
        "apply": "Aplicar",
        "reset": "Restablecer",
        "preview": "Vista Previa",
        "primaryColor": "Color Primario",
        "secondaryColor": "Color Secundario",
        "accentColor": "Color de Acento",
        "backgroundColor": "Color de Fondo",
        "textColor": "Color de Texto",
        "headingFont": "Fuente de Títulos",
        "bodyFont": "Fuente de Cuerpo",
        "fontSize": "Tamaño de Fuente",
        "lineHeight": "Altura de Línea",
        "letterSpacing": "Espaciado de Letras",
        "borderRadius": "Radio de Borde",
        "borderWidth": "Ancho de Borde",
        "borderColor": "Color de Borde",
        "shadowSize": "Tamaño de Sombra",
        "shadowColor": "Color de Sombra",
        "buttonStyle": "Estilo de Botones",
        "rounded": "Redondeado",
        "sharp": "Angular",
        "pill": "Píldora",
        "light": "Claro",
        "dark": "Oscuro",
        "custom": "Personalizado",
        "importPalette": "Importar Paleta",
        "exportStyles": "Exportar Estilos",
        "applyToAll": "Aplicar a Todo",
        "applyToPage": "Aplicar a Página",
        "savedStyles": "Estilos Guardados",
        "saveAsPreset": "Guardar como Preset",
        "loadPreset": "Cargar Preset",
        "deletePreset": "Eliminar Preset",
        "noPresetsYet": "Sin presets guardados",
        "colorPalette": "Paleta de Colores",
        "typography": "Tipografía",
        "layout": "Diseño",
        "effects": "Efectos",
        "advanced": "Avanzado",
    }
    
    if 'globalStyles' in es:
        deep_update(es['globalStyles'], globalStyles_es)
    
    # ============================================================
    # FIX 4: Onboarding section (ES translations)
    # ============================================================
    onboarding_es = {
        "title": "Bienvenido",
        "welcome": "¡Bienvenido a Quimera!",
        "welcomeSubtitle": "Vamos a crear tu sitio web en minutos",
        "skip": "Saltar",
        "next": "Siguiente",
        "previous": "Anterior",
        "finish": "Terminar",
        "getStarted": "Comenzar",
        "letsGo": "¡Vamos!",
        "step": "Paso",
        "of": "de",
        "complete": "Completar",
        "completed": "Completado",
        "progress": "Progreso",
        "businessName": "Nombre de tu Negocio",
        "businessType": "Tipo de Negocio",
        "businessDescription": "Descripción de tu Negocio",
        "industry": "Industria",
        "selectIndustry": "Selecciona una Industria",
        "tellUsAbout": "Cuéntanos sobre tu negocio",
        "whatDoYouDo": "¿A qué se dedica tu negocio?",
        "chooseTemplate": "Elige una Plantilla",
        "chooseStyle": "Elige un Estilo",
        "addContent": "Agrega tu Contenido",
        "uploadLogo": "Sube tu Logo",
        "addPhotos": "Agrega Fotos",
        "contactInfo": "Información de Contacto",
        "socialMedia": "Redes Sociales",
        "generating": "Generando tu sitio web...",
        "almostReady": "¡Casi listo!",
        "siteReady": "¡Tu sitio está listo!",
        "viewSite": "Ver tu Sitio",
        "customizeMore": "Personalizar Más",
        "publishNow": "Publicar Ahora",
        "tips": "Consejos",
        "quickTour": "Tour Rápido",
        "needHelp": "¿Necesitas ayuda?",
    }
    
    if 'onboarding' in es:
        deep_update(es['onboarding'], onboarding_es)
    
    # ============================================================
    # FIX 5: Image Generation section (ES translations)
    # ============================================================
    imageGen_es = {
        "title": "Generación de Imágenes",
        "generate": "Generar",
        "generating": "Generando...",
        "generated": "Generada",
        "prompt": "Descripción",
        "promptPlaceholder": "Describe la imagen que quieres generar...",
        "enhance": "Mejorar",
        "enhancePrompt": "Mejorar Descripción",
        "style": "Estilo",
        "aspectRatio": "Relación de Aspecto",
        "resolution": "Resolución",
        "lighting": "Iluminación",
        "cameraAngle": "Ángulo de Cámara",
        "colorGrading": "Gradación de Color",
        "depthOfField": "Profundidad de Campo",
        "negativePrompt": "Descripción Negativa",
        "negativePromptPlaceholder": "Qué evitar: borroso, distorsionado...",
        "referenceImages": "Imágenes de Referencia",
        "advanced": "Avanzado",
        "advancedControls": "Controles Avanzados",
        "download": "Descargar",
        "useImage": "Usar Imagen",
        "regenerate": "Regenerar",
        "variations": "Variaciones",
        "history": "Historial",
        "favorites": "Favoritos",
        "addToFavorites": "Agregar a Favoritos",
        "removeFromFavorites": "Eliminar de Favoritos",
    }
    
    if 'imageGeneration' in es:
        deep_update(es['imageGeneration'], imageGen_es)
    
    # ============================================================
    # FIX 6: Image Placeholder section (ES)
    # ============================================================
    imagePlaceholder_es = {
        "title": "Marcador de Imagen",
        "noImage": "Sin Imagen",
        "clickToUpload": "Clic para subir",
        "dragAndDrop": "Arrastra y suelta aquí",
        "generateWithAI": "Generar con IA",
        "browse": "Explorar",
        "uploadImage": "Subir Imagen",
        "selectFromLibrary": "Seleccionar de la Biblioteca",
        "supportedFormats": "Formatos soportados",
        "maxFileSize": "Tamaño máximo de archivo",
        "recommended": "Recomendado",
        "aspectRatio": "Relación de Aspecto",
    }
    
    if 'imagePlaceholder' in es:
        deep_update(es['imagePlaceholder'], imagePlaceholder_es)
    
    # ============================================================
    # FIX 7: Language section (ES)
    # ============================================================
    language_es = {
        "title": "Idioma",
        "selectLanguage": "Seleccionar Idioma",
        "spanish": "Español",
        "english": "Inglés",
        "french": "Francés",
        "portuguese": "Portugués",
        "languageChanged": "Idioma cambiado exitosamente",
        "currentLanguage": "Idioma actual",
    }
    
    if 'language' in es:
        deep_update(es['language'], language_es)
    
    # ============================================================
    # FIX 8: Messages section (ES)
    # ============================================================
    messages_es = {
        "title": "Mensajes",
        "noMessages": "No hay mensajes",
        "newMessage": "Nuevo Mensaje",
        "send": "Enviar",
        "reply": "Responder",
        "delete": "Eliminar",
        "archive": "Archivar",
        "unread": "No Leído",
        "read": "Leído",
        "inbox": "Bandeja de Entrada",
        "sent": "Enviados",
        "drafts": "Borradores",
        "trash": "Papelera",
        "searchMessages": "Buscar mensajes...",
        "subject": "Asunto",
        "to": "Para",
        "from": "De",
        "date": "Fecha",
        "attachments": "Adjuntos",
    }
    
    if 'messages' in es:
        deep_update(es['messages'], messages_es)
    
    # ============================================================
    # FIX 9: Store Auth section (ES)
    # ============================================================
    storeAuth_es = {
        "title": "Acceso a la Tienda",
        "login": "Iniciar Sesión",
        "register": "Registrarse",
        "logout": "Cerrar Sesión",
        "email": "Correo Electrónico",
        "password": "Contraseña",
        "forgotPassword": "¿Olvidaste tu contraseña?",
        "resetPassword": "Restablecer Contraseña",
        "createAccount": "Crear Cuenta",
        "alreadyHaveAccount": "¿Ya tienes cuenta?",
        "dontHaveAccount": "¿No tienes cuenta?",
        "signIn": "Iniciar Sesión",
        "signUp": "Registrarse",
        "name": "Nombre",
        "phone": "Teléfono",
        "rememberMe": "Recordarme",
        "welcomeBack": "Bienvenido de Nuevo",
        "joinUs": "Únete",
    }
    
    if 'storeAuth' in es:
        deep_update(es['storeAuth'], storeAuth_es)
    
    # ============================================================
    # FIX 10: Store Users section (ES)
    # ============================================================
    storeUsers_es = {
        "title": "Usuarios de la Tienda",
        "customers": "Clientes",
        "customer": "Cliente",
        "addCustomer": "Agregar Cliente",
        "editCustomer": "Editar Cliente",
        "deleteCustomer": "Eliminar Cliente",
        "noCustomers": "No hay clientes",
        "searchCustomers": "Buscar clientes...",
        "name": "Nombre",
        "email": "Email",
        "phone": "Teléfono",
        "address": "Dirección",
        "orders": "Pedidos",
        "totalSpent": "Total Gastado",
        "lastOrder": "Último Pedido",
        "registeredDate": "Fecha de Registro",
        "status": "Estado",
        "active": "Activo",
        "inactive": "Inactivo",
        "blocked": "Bloqueado",
    }
    
    if 'storeUsers' in es:
        deep_update(es['storeUsers'], storeUsers_es)
    
    # ============================================================
    # FIX 11: User Templates section (ES)
    # ============================================================
    userTemplates_es = {
        "title": "Mis Plantillas",
        "noTemplates": "No hay plantillas guardadas",
        "createTemplate": "Crear Plantilla",
        "useTemplate": "Usar Plantilla",
        "editTemplate": "Editar Plantilla",
        "deleteTemplate": "Eliminar Plantilla",
        "templateName": "Nombre de la Plantilla",
        "templateDescription": "Descripción de la Plantilla",
        "saveAsTemplate": "Guardar como Plantilla",
        "preview": "Vista Previa",
        "saved": "Guardada",
        "lastModified": "Última Modificación",
        "category": "Categoría",
        "allTemplates": "Todas las Plantillas",
        "myTemplates": "Mis Plantillas",
        "communityTemplates": "Plantillas de la Comunidad",
        "searchTemplates": "Buscar plantillas...",
    }
    
    if 'userTemplates' in es:
        deep_update(es['userTemplates'], userTemplates_es)
    
    # ============================================================
    # FIX 12: Industry Categories section (ES)
    # ============================================================
    industryCategories_es = {
        "restaurant": "Restaurante",
        "cafe": "Cafetería",
        "retail": "Tienda / Retail",
        "ecommerce": "E-commerce",
        "technology": "Tecnología",
        "healthcare": "Salud",
        "education": "Educación",
        "fitness": "Fitness",
        "beauty": "Belleza",
        "realEstate": "Bienes Raíces",
        "legal": "Legal",
        "consulting": "Consultoría",
        "marketing": "Marketing",
        "photography": "Fotografía",
        "music": "Música",
        "art": "Arte",
        "travel": "Viajes",
        "hospitality": "Hospitalidad",
        "construction": "Construcción",
        "automotive": "Automotriz",
        "finance": "Finanzas",
        "nonprofit": "Sin Fines de Lucro",
        "sports": "Deportes",
        "entertainment": "Entretenimiento",
        "food": "Comida",
        "fashion": "Moda",
        "other": "Otro",
    }
    
    if 'industryCategories' in es:
        deep_update(es['industryCategories'], industryCategories_es)
    
    # ============================================================
    # FIX 13: Fix EN for 'undo' section (was copied from ES)
    # ============================================================
    undo_en = {
        "button": "Undo",
        "redo": "Redo",
        "actionUndone": "Action undone: {{action}}",
        "actionRedone": "Action redone: {{action}}",
        "noActions": "No actions to undo",
        "limitReached": "History limit reached",
        "keyboard": {
            "undo": "Ctrl+Z to undo",
            "redo": "Ctrl+Shift+Z to redo"
        },
        "actions": {
            "update": "Updated {{field}} in {{entity}}",
            "delete": "Deleted {{entity}}",
            "create": "Created {{entity}}",
            "move": "Moved {{entity}}",
            "reorder": "Reordered {{entity}}",
            "statusChange": "Status change of {{entity}}"
        }
    }
    
    if 'undo' in en:
        deep_update(en['undo'], undo_en)
    
    # ============================================================
    # Save both files
    # ============================================================
    save_files(es, en, es_path, en_path)
    
    print(f"✅ Fixed {count} translation values")
    print(f"✅ Files saved successfully!")


if __name__ == '__main__':
    fix_translations()
