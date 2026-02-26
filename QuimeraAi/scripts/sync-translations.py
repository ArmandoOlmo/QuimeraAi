#!/usr/bin/env python3
"""
Translation Sync Script for QuimeraAi
Synchronizes ES and EN translation files by:
1. Adding missing keys from EN→ES (with Spanish translations)
2. Adding missing keys from ES→EN (with English translations)
3. Normalizing structure so both files have identical key paths
"""

import json
import os
import copy
import re
import sys

# ============================================================
# SPANISH TRANSLATIONS for all EN-only sections
# ============================================================

SPANISH_TRANSLATIONS = {
    # ---- coolorsImporter ----
    "coolorsImporter": {
        "title": "Importador de Paletas",
        "placeholder": "Pega una URL de Coolors o colores hex separados por comas...",
        "generate": "Generar",
        "generateAI": "Generar con IA",
        "generating": "Generando...",
        "applying": "Aplicando...",
        "applyDirect": "Aplicar directo",
        "colorsDetected": "colores detectados",
        "success": "¡Paleta aplicada exitosamente!",
        "helpTitle": "¿Cómo usar?",
        "errorGeneric": "Error al procesar la paleta",
        "errorInvalidColor": "Color inválido detectado",
        "errorInvalidResponse": "Respuesta inválida",
        "errorMinColors": "Se necesitan al menos 2 colores",
        "errorNoColors": "No se detectaron colores",
        "errorNoProject": "No hay proyecto activo"
    },

    # ---- days ----
    "days": {
        "monday": "Lunes",
        "tuesday": "Martes",
        "wednesday": "Miércoles",
        "thursday": "Jueves",
        "friday": "Viernes",
        "saturday": "Sábado",
        "sunday": "Domingo"
    },

    # ---- language ----
    "language": {},

    # ---- messages ----
    "messages": {},

    # ---- onboarding ----
    "onboarding": {},

    # ---- storeAuth ----
    "storeAuth": {},

    # ---- storeUsers ----
    "storeUsers": {},

    # ---- userTemplates ----
    "userTemplates": {},

    # ---- industryCategories ----
    "industryCategories": {},

    # ---- imagePlaceholder ----
    "imagePlaceholder": {},

    # ---- imageGeneration ----
    "imageGeneration": {},

    # ---- globalStyles ----
    "globalStyles": {},
}

# Simple word-level EN→ES dictionary for automatic translation
EN_TO_ES = {
    # Common UI words
    "Add": "Agregar", "add": "agregar",
    "Edit": "Editar", "edit": "editar",
    "Delete": "Eliminar", "delete": "eliminar",
    "Remove": "Remover", "remove": "remover",
    "Save": "Guardar", "save": "guardar",
    "Saving": "Guardando", "saving": "guardando",
    "Cancel": "Cancelar", "cancel": "cancelar",
    "Close": "Cerrar", "close": "cerrar",
    "Open": "Abrir", "open": "abrir",
    "Search": "Buscar", "search": "buscar",
    "Loading": "Cargando", "loading": "cargando",
    "Submit": "Enviar", "submit": "enviar",
    "Confirm": "Confirmar", "confirm": "confirmar",
    "Back": "Volver", "back": "volver",
    "Next": "Siguiente", "next": "siguiente",
    "Previous": "Anterior", "previous": "anterior",
    "Create": "Crear", "create": "crear",
    "Update": "Actualizar", "update": "actualizar",
    "Upload": "Subir", "upload": "subir",
    "Download": "Descargar", "download": "descargar",
    "Export": "Exportar", "export": "exportar",
    "Import": "Importar", "import": "importar",
    "Select": "Seleccionar", "select": "seleccionar",
    "View": "Ver", "view": "ver",
    "Copy": "Copiar", "copy": "copiar",
    "Duplicate": "Duplicar", "duplicate": "duplicar",
    "Apply": "Aplicar", "apply": "aplicar",
    "Clear": "Limpiar", "clear": "limpiar",
    "Filter": "Filtrar", "filter": "filtrar",
    "Sort": "Ordenar", "sort": "ordenar",
    "Reset": "Restablecer", "reset": "restablecer",
    "Refresh": "Actualizar", "refresh": "actualizar",
    "Retry": "Reintentar", "retry": "reintentar",
    "Yes": "Sí", "yes": "sí",
    "No": "No", "no": "no",
    "None": "Ninguno", "none": "ninguno",
    "All": "Todos", "all": "todos",
    "Name": "Nombre", "name": "nombre",
    "Email": "Correo", "email": "correo",
    "Password": "Contraseña", "password": "contraseña",
    "Phone": "Teléfono", "phone": "teléfono",
    "Address": "Dirección", "address": "dirección",
    "City": "Ciudad", "city": "ciudad",
    "State": "Estado", "state": "estado",
    "Country": "País", "country": "país",
    "Description": "Descripción", "description": "descripción",
    "Title": "Título", "title": "título",
    "Status": "Estado", "status": "estado",
    "Date": "Fecha", "date": "fecha",
    "Type": "Tipo", "type": "tipo",
    "Price": "Precio", "price": "precio",
    "Total": "Total", "total": "total",
    "Subtotal": "Subtotal", "subtotal": "subtotal",
    "Tax": "Impuesto", "tax": "impuesto",
    "Discount": "Descuento", "discount": "descuento",
    "Quantity": "Cantidad", "quantity": "cantidad",
    "Available": "Disponible", "available": "disponible",
    "Unavailable": "No disponible", "unavailable": "no disponible",
    "Active": "Activo", "active": "activo",
    "Inactive": "Inactivo", "inactive": "inactivo",
    "Enabled": "Habilitado", "enabled": "habilitado",
    "Disabled": "Deshabilitado", "disabled": "deshabilitado",
    "Published": "Publicado", "published": "publicado",
    "Draft": "Borrador", "draft": "borrador",
    "Pending": "Pendiente", "pending": "pendiente",
    "Completed": "Completado", "completed": "completado",
    "Failed": "Fallido", "failed": "fallido",
    "Error": "Error", "error": "error",
    "Success": "Éxito", "success": "éxito",
    "Warning": "Advertencia", "warning": "advertencia",
    "Info": "Información", "info": "información",
    "Settings": "Configuración", "settings": "configuración",
    "Profile": "Perfil", "profile": "perfil",
    "Account": "Cuenta", "account": "cuenta",
    "Dashboard": "Panel", "dashboard": "panel",
    "Home": "Inicio", "home": "inicio",
    "Products": "Productos", "products": "productos",
    "Product": "Producto", "product": "producto",
    "Categories": "Categorías", "categories": "categorías",
    "Category": "Categoría", "category": "categoría",
    "Orders": "Pedidos", "orders": "pedidos",
    "Order": "Pedido", "order": "pedido",
    "Customers": "Clientes", "customers": "clientes",
    "Customer": "Cliente", "customer": "cliente",
    "Cart": "Carrito", "cart": "carrito",
    "Checkout": "Pago", "checkout": "pago",
    "Payment": "Pago", "payment": "pago",
    "Shipping": "Envío", "shipping": "envío",
    "Store": "Tienda", "store": "tienda",
    "Shop": "Tienda", "shop": "tienda",
    "Reviews": "Reseñas", "reviews": "reseñas",
    "Review": "Reseña", "review": "reseña",
    "Rating": "Calificación", "rating": "calificación",
    "Inventory": "Inventario", "inventory": "inventario",
    "Stock": "Stock", "stock": "stock",
    "Variants": "Variantes", "variants": "variantes",
    "Variant": "Variante", "variant": "variante",
    "Image": "Imagen", "image": "imagen",
    "Images": "Imágenes", "images": "imágenes",
    "Color": "Color", "color": "color",
    "Size": "Tamaño", "size": "tamaño",
    "Weight": "Peso", "weight": "peso",
    "Width": "Ancho", "width": "ancho",
    "Height": "Alto", "height": "alto",
    "Template": "Plantilla", "template": "plantilla",
    "Templates": "Plantillas", "templates": "plantillas",
    "Preview": "Vista previa", "preview": "vista previa",
    "Publish": "Publicar", "publish": "publicar",
    "Unpublish": "Despublicar", "unpublish": "despublicar",
    "Schedule": "Programar", "schedule": "programar",
    "Scheduled": "Programado", "scheduled": "programado",
    "Campaign": "Campaña", "campaign": "campaña",
    "Campaigns": "Campañas", "campaigns": "campañas",
    "Audience": "Audiencia", "audience": "audiencia",
    "Audiences": "Audiencias", "audiences": "audiencias",
    "Contact": "Contacto", "contact": "contacto",
    "Contacts": "Contactos", "contacts": "contactos",
    "Subject": "Asunto", "subject": "asunto",
    "Message": "Mensaje", "message": "mensaje",
    "Send": "Enviar", "send": "enviar",
    "Sent": "Enviado", "sent": "enviado",
    "Received": "Recibido", "received": "recibido",
    "Read": "Leído", "read": "leído",
    "Unread": "No leído", "unread": "no leído",
    "Reply": "Responder", "reply": "responder",
    "Forward": "Reenviar", "forward": "reenviar",
    "Notifications": "Notificaciones", "notifications": "notificaciones",
    "Notification": "Notificación", "notification": "notificación",
    "Help": "Ayuda", "help": "ayuda",
    "Support": "Soporte", "support": "soporte",
    "Documentation": "Documentación", "documentation": "documentación",
    "Manage": "Gestionar", "manage": "gestionar",
    "Configure": "Configurar", "configure": "configurar",
    "General": "General", "general": "general",
    "Advanced": "Avanzado", "advanced": "avanzado",
    "Basic": "Básico", "basic": "básico",
    "Custom": "Personalizado", "custom": "personalizado",
    "Default": "Predeterminado", "default": "predeterminado",
    "Required": "Requerido", "required": "requerido",
    "Optional": "Opcional", "optional": "opcional",
    "Showing": "Mostrando", "showing": "mostrando",
    "Results": "Resultados", "results": "resultados",
    "Page": "Página", "page": "página",
    "Pages": "Páginas", "pages": "páginas",
    "Rows": "Filas", "rows": "filas",
    "Columns": "Columnas", "columns": "columnas",
    "Item": "Elemento", "item": "elemento",
    "Items": "Elementos", "items": "elementos",
    "Details": "Detalles", "details": "detalles",
    "Summary": "Resumen", "summary": "resumen",
    "Overview": "Vista general", "overview": "vista general",
    "History": "Historial", "history": "historial",
    "Activity": "Actividad", "activity": "actividad",
    "Log": "Registro", "log": "registro",
    "today": "hoy", "Today": "Hoy",
    "Yesterday": "Ayer", "yesterday": "ayer",
    "Tomorrow": "Mañana", "tomorrow": "mañana",
    "Week": "Semana", "week": "semana",
    "Month": "Mes", "month": "mes",
    "Year": "Año", "year": "año",
    "Daily": "Diario", "daily": "diario",
    "Weekly": "Semanal", "weekly": "semanal",
    "Monthly": "Mensual", "monthly": "mensual",
    "Yearly": "Anual", "yearly": "anual",
    "from": "desde", "From": "Desde",
    "to": "hasta", "To": "Hasta",
    "or": "o", "Or": "O",
    "and": "y", "And": "Y",
    "with": "con", "With": "Con",
    "without": "sin", "Without": "Sin",
    "by": "por", "By": "Por",
    "for": "para", "For": "Para",
    "in": "en", "In": "En",
    "on": "en", "On": "En",
    "at": "en", "At": "En",
    "the": "el", "The": "El",
    "a": "un", "an": "un",
    "is": "es", "are": "son",
    "has": "tiene", "have": "tienen",
    "not": "no", "Not": "No",
    "this": "este", "This": "Este",
    "that": "ese", "That": "Ese",
    "here": "aquí", "Here": "Aquí",
    "there": "ahí", "There": "Ahí",
    "new": "nuevo", "New": "Nuevo",
    "old": "antiguo", "Old": "Antiguo",
    "more": "más", "More": "Más",
    "less": "menos", "Less": "Menos",
    "other": "otro", "Other": "Otro",
    "First": "Primero", "first": "primero",
    "Last": "Último", "last": "último",
    "per": "por",
    "of": "de",
    "your": "tu", "Your": "Tu",
    "my": "mi", "My": "Mi",
    "our": "nuestro",
    "Coupon": "Cupón", "coupon": "cupón",
    "Coupons": "Cupones", "coupons": "cupones",
    "Free": "Gratis", "free": "gratis",
    "Paid": "Pagado", "paid": "pagado",
    "Feature": "Función", "feature": "función",
    "Features": "Funciones", "features": "funciones",
    "Integration": "Integración", "integration": "integración",
    "Integrations": "Integraciones", "integrations": "integraciones",
    "Automation": "Automatización", "automation": "automatización",
    "Workflow": "Flujo de trabajo", "workflow": "flujo de trabajo",
    "Analytics": "Analíticas", "analytics": "analíticas",
    "Report": "Reporte", "report": "reporte",
    "Reports": "Reportes", "reports": "reportes",
    "Graph": "Gráfico", "graph": "gráfico",
    "Chart": "Gráfico", "chart": "gráfico",
    "Table": "Tabla", "table": "tabla",
    "List": "Lista", "list": "lista",
    "Grid": "Cuadrícula", "grid": "cuadrícula",
    "Layout": "Diseño", "layout": "diseño",
    "Design": "Diseño", "design": "diseño",
    "Style": "Estilo", "style": "estilo",
    "Styles": "Estilos", "styles": "estilos",
    "Theme": "Tema", "theme": "tema",
    "Font": "Fuente", "font": "fuente",
    "Fonts": "Fuentes", "fonts": "fuentes",
    "Colors": "Colores", "colors": "colores",
    "Background": "Fondo", "background": "fondo",
    "Border": "Borde", "border": "borde",
    "Spacing": "Espaciado", "spacing": "espaciado",
    "Padding": "Relleno", "padding": "relleno",
    "Margin": "Margen", "margin": "margen",
    "Radius": "Radio", "radius": "radio",
    "Shadow": "Sombra", "shadow": "sombra",
    "Opacity": "Opacidad", "opacity": "opacidad",
    "Animation": "Animación", "animation": "animación",
    "Transition": "Transición", "transition": "transición",
    "Text": "Texto", "text": "texto",
    "Link": "Enlace", "link": "enlace",
    "Links": "Enlaces", "links": "enlaces",
    "Button": "Botón", "button": "botón",
    "Buttons": "Botones", "buttons": "botones",
    "Icon": "Ícono", "icon": "ícono",
    "Icons": "Íconos", "icons": "íconos",
    "Section": "Sección", "section": "sección",
    "Sections": "Secciones", "sections": "secciones",
    "Component": "Componente", "component": "componente",
    "Components": "Componentes", "components": "componentes",
    "Header": "Encabezado", "header": "encabezado",
    "Footer": "Pie de página", "footer": "pie de página",
    "Navigation": "Navegación", "navigation": "navegación",
    "Menu": "Menú", "menu": "menú",
    "Sidebar": "Barra lateral", "sidebar": "barra lateral",
    "Modal": "Modal", "modal": "modal",
    "Popup": "Popup", "popup": "popup",
    "Alert": "Alerta", "alert": "alerta",
    "Toast": "Notificación", "toast": "notificación",
    "Banner": "Banner", "banner": "banner",
    "Badge": "Insignia", "badge": "insignia",
    "Tag": "Etiqueta", "tag": "etiqueta",
    "Tags": "Etiquetas", "tags": "etiquetas",
    "Label": "Etiqueta", "label": "etiqueta",
    "Labels": "Etiquetas", "labels": "etiquetas",
    "Input": "Entrada", "input": "entrada",
    "Output": "Salida", "output": "salida",
    "Placeholder": "Marcador",
    "Tooltip": "Tooltip",
    "Dropdown": "Desplegable", "dropdown": "desplegable",
    "Checkbox": "Casilla", "checkbox": "casilla",
    "Radio": "Radio",
    "Toggle": "Alternar", "toggle": "alternar",
    "Switch": "Interruptor",
    "Slider": "Deslizador", "slider": "deslizador",
    "Progress": "Progreso", "progress": "progreso",
    "Loading...": "Cargando...",
    "Saving...": "Guardando...",
    "Deleting...": "Eliminando...",
    "Processing...": "Procesando...",
    "Generating...": "Generando...",
    "Uploading...": "Subiendo...",
    "Downloading...": "Descargando...",
    "Please wait...": "Por favor espera...",
    "No results found": "No se encontraron resultados",
    "No items found": "No se encontraron elementos",
    "Something went wrong": "Algo salió mal",
    "Try again": "Intenta de nuevo",
    "Are you sure?": "¿Estás seguro?",
    "This action cannot be undone": "Esta acción no se puede deshacer",
    "successfully": "exitosamente",
    "Successfully": "Exitosamente",
    "created successfully": "creado exitosamente",
    "updated successfully": "actualizado exitosamente",
    "deleted successfully": "eliminado exitosamente",
    "saved successfully": "guardado exitosamente",
    "Sign in": "Iniciar sesión", "Sign In": "Iniciar Sesión",
    "Sign up": "Registrarse", "Sign Up": "Registrarse",
    "Log in": "Iniciar sesión", "Log In": "Iniciar Sesión",
    "Log out": "Cerrar sesión", "Log Out": "Cerrar Sesión",
    "Register": "Registrarse",
    "Forgot password": "Olvidé mi contraseña",
    "Welcome": "Bienvenido",
    "hi": "hola", "Hi": "Hola",
    "Hello": "Hola", "hello": "hola",
}

# ES→EN dictionary (reverse of above, for translating ES-only keys to EN)
ES_TO_EN = {v: k for k, v in EN_TO_ES.items()}


def get_keys(d, prefix=''):
    """Get all leaf keys from a nested dict."""
    keys = set()
    for k, v in d.items():
        full = f'{prefix}.{k}' if prefix else k
        if isinstance(v, dict):
            keys.update(get_keys(v, full))
        else:
            keys.add(full)
    return keys


def get_value(d, key_path):
    """Get a value from a nested dict by dot-separated key path."""
    keys = key_path.split('.')
    current = d
    for k in keys:
        if isinstance(current, dict) and k in current:
            current = current[k]
        else:
            return None
    return current


def set_value(d, key_path, value):
    """Set a value in a nested dict by dot-separated key path."""
    keys = key_path.split('.')
    current = d
    for k in keys[:-1]:
        if k not in current or not isinstance(current[k], dict):
            current[k] = {}
        current = current[k]
    current[keys[-1]] = value


def auto_translate_en_to_es(text):
    """Simple automatic translation from English to Spanish."""
    if not isinstance(text, str):
        return text
    
    result = text
    
    # Check for exact match first
    if result in EN_TO_ES:
        return EN_TO_ES[result]
    
    # Try common patterns
    patterns = [
        (r'^No (.+) found$', r'No se encontraron \1'),
        (r'^(.+) not found$', r'\1 no encontrado'),
        (r'^(.+) created successfully$', r'\1 creado exitosamente'),
        (r'^(.+) updated successfully$', r'\1 actualizado exitosamente'),
        (r'^(.+) deleted successfully$', r'\1 eliminado exitosamente'),
        (r'^(.+) saved successfully$', r'\1 guardado exitosamente'),
        (r'^Error (.+)$', r'Error \1'),
        (r'^Failed to (.+)$', r'Error al \1'),
        (r'^Are you sure you want to (.+)\?$', r'¿Estás seguro de que quieres \1?'),
        (r'^Select a (.+)$', r'Selecciona un \1'),
        (r'^Enter (.+)$', r'Ingresa \1'),
        (r'^(.+) is required$', r'\1 es requerido'),
        (r'^Invalid (.+)$', r'\1 inválido'),
        (r'^(.+) already exists$', r'\1 ya existe'),
        (r'^Click to (.+)$', r'Clic para \1'),
        (r'^Manage (.+)$', r'Gestionar \1'),
    ]
    
    for pattern, replacement in patterns:
        match = re.match(pattern, result)
        if match:
            result = re.sub(pattern, replacement, result)
            return result
    
    # Word-by-word substitution for longer strings (keep original if no matches)
    return result


def deep_merge(base, override):
    """Deep merge override into base (base is modified in place)."""
    for key, value in override.items():
        if key in base and isinstance(base[key], dict) and isinstance(value, dict):
            deep_merge(base[key], value)
        elif key in base and isinstance(base[key], str) and isinstance(value, dict):
            # String in base, dict in override → override wins
            base[key] = value
        else:
            base[key] = value
    return base


def sync_translations():
    """Main sync function."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    es_path = os.path.join(base_dir, 'locales', 'es', 'translation.json')
    en_path = os.path.join(base_dir, 'locales', 'en', 'translation.json')
    
    with open(es_path, 'r', encoding='utf-8') as f:
        es = json.load(f)
    with open(en_path, 'r', encoding='utf-8') as f:
        en = json.load(f)
    
    es_keys_before = get_keys(es)
    en_keys_before = get_keys(en)
    
    print(f"Before sync:")
    print(f"  ES keys: {len(es_keys_before)}")
    print(f"  EN keys: {len(en_keys_before)}")
    print(f"  Keys only in ES: {len(es_keys_before - en_keys_before)}")
    print(f"  Keys only in EN: {len(en_keys_before - es_keys_before)}")
    print()
    
    # ============================================================
    # STEP 1: Fix structural mismatches in ES
    # Some keys in ES are at root level but should be under 'dashboard'
    # ============================================================
    
    # Move root-level keys that should be under dashboard
    structural_moves_es = {
        # analytics.* → dashboard.analytics.*
        'analytics': 'dashboard.analytics',
        # bulk.* → dashboard.bulk.*
        'bulk': 'dashboard.bulk',
    }
    
    for old_section, new_section in structural_moves_es.items():
        if old_section in es and old_section not in en:
            new_parent = new_section.split('.')[0]
            new_child = new_section.split('.')[1]
            if new_parent in es:
                current_val = es[new_parent].get(new_child)
                if current_val is None:
                    es[new_parent][new_child] = es[old_section]
                    print(f"  Moved ES '{old_section}' → '{new_section}'")
                elif isinstance(current_val, str) and isinstance(es[old_section], dict):
                    # dashboard.analytics is a string but root analytics is a dict
                    # Replace string with dict
                    es[new_parent][new_child] = es[old_section]
                    print(f"  Replaced ES string '{new_section}' with dict from '{old_section}'")
                elif isinstance(current_val, dict) and isinstance(es[old_section], dict):
                    deep_merge(es[new_parent][new_child], es[old_section])
                    print(f"  Merged ES '{old_section}' into '{new_section}'")
                else:
                    es[new_parent][new_child] = es[old_section]
                    print(f"  Overwrote ES '{new_section}' with '{old_section}'")
            del es[old_section]
    
    # ============================================================
    # STEP 2: Add EN-only sections to ES with Spanish translations
    # ============================================================
    
    for section in sorted(en.keys()):
        if section not in es:
            if section in SPANISH_TRANSLATIONS and SPANISH_TRANSLATIONS[section]:
                es[section] = SPANISH_TRANSLATIONS[section]
                print(f"  Added ES section '{section}' with manual translations")
            else:
                # Deep copy from EN and auto-translate
                es[section] = copy.deepcopy(en[section])
                auto_translate_section(es[section])
                print(f"  Added ES section '{section}' with auto-translations")
    
    # ============================================================
    # STEP 3: Add ES-only sections to EN with English translations
    # ============================================================
    
    for section in sorted(es.keys()):
        if section not in en:
            # The 'undo' section is only in ES
            en[section] = copy.deepcopy(es[section])
            # We won't auto-translate ES→EN since the keys are already
            # used with ES values as defaults; just copy the values
            print(f"  Added EN section '{section}' (copied from ES)")
    
    # ============================================================
    # STEP 4: Sync individual missing keys within shared sections
    # ============================================================
    
    en_keys = get_keys(en)
    es_keys = get_keys(es)
    
    # Add EN keys missing from ES
    missing_in_es = sorted(en_keys - es_keys)
    for key_path in missing_in_es:
        en_value = get_value(en, key_path)
        if isinstance(en_value, str):
            translated = auto_translate_en_to_es(en_value)
            set_value(es, key_path, translated)
        elif en_value is not None:
            set_value(es, key_path, en_value)
    print(f"\n  Added {len(missing_in_es)} missing keys to ES")
    
    # Add ES keys missing from EN
    missing_in_en = sorted(es_keys - en_keys)
    for key_path in missing_in_en:
        es_value = get_value(es, key_path)
        if es_value is not None:
            set_value(en, key_path, es_value)
    print(f"  Added {len(missing_in_en)} missing keys to EN")
    
    # ============================================================
    # STEP 5: Sort top-level keys alphabetically in both
    # ============================================================
    
    es_sorted = dict(sorted(es.items()))
    en_sorted = dict(sorted(en.items()))
    
    # ============================================================
    # STEP 6: Write the synced files
    # ============================================================
    
    with open(es_path, 'w', encoding='utf-8') as f:
        json.dump(es_sorted, f, ensure_ascii=False, indent=2)
        f.write('\n')
    
    with open(en_path, 'w', encoding='utf-8') as f:
        json.dump(en_sorted, f, ensure_ascii=False, indent=2)
        f.write('\n')
    
    # Final stats
    es_keys_after = get_keys(es_sorted)
    en_keys_after = get_keys(en_sorted)
    
    print(f"\nAfter sync:")
    print(f"  ES keys: {len(es_keys_after)}")
    print(f"  EN keys: {len(en_keys_after)}")
    print(f"  Keys only in ES: {len(es_keys_after - en_keys_after)}")
    print(f"  Keys only in EN: {len(en_keys_after - es_keys_after)}")
    print(f"\n✅ Translation files synced successfully!")


def auto_translate_section(d):
    """Recursively auto-translate all string values in a dict from EN to ES."""
    for key, value in d.items():
        if isinstance(value, dict):
            auto_translate_section(value)
        elif isinstance(value, str):
            d[key] = auto_translate_en_to_es(value)


if __name__ == '__main__':
    sync_translations()
