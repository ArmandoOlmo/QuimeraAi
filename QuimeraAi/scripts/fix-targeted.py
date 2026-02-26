#!/usr/bin/env python3
"""
Targeted fix: for superadmin.* and onboardingWizard.* sections,
we KNOW the identical values are Spanish text that needs English in the EN file.
Use aggressive word replacement regardless of language detection.
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

# These sections had ES values copied wholesale to EN
SPANISH_SECTIONS = {'superadmin', 'onboardingWizard', 'leads'}

# These sections had EN values copied wholesale to ES
ENGLISH_SECTIONS = {'onboarding', 'email', 'ecommerce', 'storeAuth', 'storeUsers'}

# ES → EN word dict (sorted by length desc)
W = {
    'Configuración': 'Settings', 'Verificación': 'Verification',
    'Optimización': 'Optimization', 'Notificaciones': 'Notifications',
    'Personalizado': 'Custom', 'Predeterminado': 'Default',
    'Estructurados': 'Structured', 'Rastreabilidad': 'Crawlability',
    'Frecuentes': 'Frequently Asked', 'Personalidad': 'Personality',
    'Rendimiento': 'Performance', 'Publicaciones': 'Posts',
    'Inteligencia': 'Intelligence', 'Artificial': 'Artificial',
    'Conocimiento': 'Knowledge', 'Simulador': 'Simulator',
    'Descripción': 'Description', 'Generación': 'Generation',
    'Información': 'Information', 'Navegación': 'Navigation',
    'Documentos': 'Documents', 'Categorías': 'Categories',
    'Estadísticas': 'Statistics', 'Propiedades': 'Properties',
    'Componentes': 'Components', 'Creatividad': 'Creativity',
    'Aplicaciones': 'Applications', 'Herramientas': 'Tools',
    'Producción': 'Production', 'Electrónico': 'Electronic',
    'Certificado': 'Certificate', 'Plataforma': 'Platform',
    'Encabezado': 'Heading', 'Secciones': 'Sections',
    'Segmentos': 'Segments', 'Preguntas': 'Questions',
    'Industrias': 'Industries', 'Animaciones': 'Animations',
    'Predefinidas': 'Presets', 'Bibliotecas': 'Libraries',
    'Alternativo': 'Alternative', 'Inversiones': 'Investments',
    'Empresarial': 'Business', 'Publicidad': 'Advertising',
    'Automotriz': 'Automotive', 'Manufactura': 'Manufacturing',
    'Hospitalidad': 'Hospitality', 'Construcción': 'Construction',
    'Financieros': 'Financial', 'Planificación': 'Planning',
    'Audiovisual': 'Audiovisual', 'Decoración': 'Decoration',
    'Videojuegos': 'Gaming', 'Educación': 'Education',
    'Capacitación': 'Training', 'Climatización': 'HVAC',
    'Entretenimiento': 'Entertainment', 'Ciberseguridad': 'Cybersecurity',
    'Criptomonedas': 'Cryptocurrency', 'Electricidad': 'Electrical',
    'Electrónica': 'Electronics', 'Psicología': 'Psychology',
    'Telecomunicaciones': 'Telecommunications',
    'Contabilidad': 'Accounting', 'Arquitectura': 'Architecture',
    'Acuerdos': 'Agreements', 'Inmobiliario': 'Real Estate',
    'Fotografía': 'Photography', 'Publicación': 'Publishing',
    'Veterinario': 'Veterinary', 'Bienestar': 'Wellness',
    'Consultoría': 'Consulting', 'Sugerencias': 'Suggestions',
    'Analizando': 'Analyzing', 'Generando': 'Generating',
    'Superposición': 'Overlay', 'Degradado': 'Gradient',
    'Mayúsculas': 'Uppercase', 'Cinematográfico': 'Cinematic',
    'Capitalizar': 'Capitalize', 'Espaciado': 'Spacing',
    'Redondeado': 'Rounded', 'Numerada': 'Numbered',
    'Existentes': 'Existing', 'Disponibles': 'Available',
    'Potenciado': 'Powered', 'Pensamiento': 'Thinking',
    'Registrados': 'Registered', 'Pendiente': 'Pending',
    'Pendientes': 'Pending', 'Guardadas': 'Saved',
    'Eliminación': 'Deletion', 'Contraseña': 'Password',
    'Recuperar': 'Recover', 'Confirmar': 'Confirm',
    'Promocionales': 'Promotional', 'Exclusivas': 'Exclusive',
    'Novedades': 'News', 'Cotizaciones': 'Quotes',
    'Mayoristas': 'Wholesale', 'Frecuentes': 'Frequent',
    'Descuento': 'Discount', 'Seleccionados': 'Selected',
    'Personalizados': 'Custom', 'Filtrados': 'Filtered',
    'Registrada': 'Registered', 'Encontraron': 'Found',
    'Configurados': 'Configured', 'Encontraron': 'Found',
    'Agregar': 'Add', 'Editar': 'Edit', 'Eliminar': 'Delete',
    'Guardar': 'Save', 'Cancelar': 'Cancel', 'Cerrar': 'Close',
    'Abrir': 'Open', 'Buscar': 'Search', 'Enviar': 'Send',
    'Confirmar': 'Confirm', 'Volver': 'Back', 'Siguiente': 'Next',
    'Crear': 'Create', 'Actualizar': 'Update', 'Subir': 'Upload',
    'Descargar': 'Download', 'Seleccionar': 'Select', 'Ver': 'View',
    'Copiar': 'Copy', 'Aplicar': 'Apply', 'Limpiar': 'Clear',
    'Filtrar': 'Filter', 'Ordenar': 'Sort', 'Compartir': 'Share',
    'Generar': 'Generate', 'Gestionar': 'Manage', 'Configurar': 'Configure',
    'Personalizar': 'Customize', 'Optimizar': 'Optimize',
    'Mostrar': 'Show', 'Ocultar': 'Hide', 'Cambiar': 'Change',
    'Insertar': 'Insert', 'Quitar': 'Remove', 'Mover': 'Move',
    'Nombre': 'Name', 'Título': 'Title', 'Fecha': 'Date',
    'Tipo': 'Type', 'Precio': 'Price', 'Total': 'Total',
    'Código': 'Code', 'Dirección': 'Address', 'Ciudad': 'City',
    'País': 'Country', 'Teléfono': 'Phone', 'Empresa': 'Company',
    'Categoría': 'Category', 'Etiquetas': 'Tags', 'Notas': 'Notes',
    'Mensaje': 'Message', 'Asunto': 'Subject', 'Contenido': 'Content',
    'Resumen': 'Summary', 'Detalles': 'Details', 'Historial': 'History',
    'Actividad': 'Activity', 'Registro': 'Log', 'Reporte': 'Report',
    'Métricas': 'Metrics', 'Resultados': 'Results', 'Ingresos': 'Revenue',
    'Ventas': 'Sales', 'Opciones': 'Options', 'Perfil': 'Profile',
    'Cuenta': 'Account', 'Usuario': 'User', 'Usuarios': 'Users',
    'Miembro': 'Member', 'Equipo': 'Team', 'Rol': 'Role',
    'Permisos': 'Permissions', 'Acceso': 'Access', 'Seguridad': 'Security',
    'Alerta': 'Alert', 'Alertas': 'Alerts', 'Ayuda': 'Help',
    'Soporte': 'Support', 'Contacto': 'Contact',
    'Proyecto': 'Project', 'Proyectos': 'Projects',
    'Página': 'Page', 'Páginas': 'Pages',
    'Plantilla': 'Template', 'Plantillas': 'Templates',
    'Producto': 'Product', 'Productos': 'Products',
    'Servicio': 'Service', 'Servicios': 'Services',
    'Pedido': 'Order', 'Pedidos': 'Orders', 'Envío': 'Shipping',
    'Factura': 'Invoice', 'Pago': 'Payment', 'Cliente': 'Customer',
    'Clientes': 'Customers', 'Tienda': 'Store',
    'Campaña': 'Campaign', 'Imagen': 'Image', 'Imágenes': 'Images',
    'Galería': 'Gallery', 'Biblioteca': 'Library', 'Recurso': 'Asset',
    'Recursos': 'Assets', 'Archivo': 'File', 'Archivos': 'Files',
    'Fuente': 'Font', 'Fuentes': 'Fonts', 'Color': 'Color',
    'Colores': 'Colors', 'Tamaño': 'Size', 'Borde': 'Border',
    'Bordes': 'Borders', 'Sombra': 'Shadow', 'Sombras': 'Shadows',
    'Fondo': 'Background', 'Texto': 'Text', 'Botón': 'Button',
    'Estilo': 'Style', 'Estilos': 'Styles', 'Negrita': 'Bold',
    'Normal': 'Normal', 'Lista': 'List', 'Tabla': 'Table',
    'Enlace': 'Link', 'Columna': 'Column', 'Columnas': 'Columns',
    'Sección': 'Section', 'Industria': 'Industry',
    'Organización': 'Organization', 'Zona': 'Zone',
    'Peligro': 'Danger', 'Temas': 'Topics', 'Tono': 'Tone',
    'Voz': 'Voice', 'Modelo': 'Model', 'Controles': 'Controls',
    'Paleta': 'Palette', 'Paletas': 'Palettes',
    'Insignia': 'Badge', 'Caja': 'Box', 'Posición': 'Position',
    'Gestor': 'Manager', 'Semana': 'Week', 'Impuesto': 'Tax',
    'Tasa': 'Rate', 'Inventario': 'Inventory',
    'Segmento': 'Segment', 'Campo': 'Field', 'Campos': 'Fields',
    'Global': 'Global', 'Audaz': 'Bold',
    'póster': 'poster', 'película': 'movie', 'revista': 'magazine',
    'anclado': 'anchored', 'gigante': 'giant',
    'Creando': 'Creating', 'obra': 'master', 'maestra': 'piece',
    'mejorada': 'enhanced', 'generada': 'generated',
    'exitosamente': 'successfully', 'fallida': 'failed',
    'añadida': 'added', 'referencia': 'reference',
    'Máximo': 'Maximum', 'permitidas': 'allowed',
    'impresionantes': 'stunning', 'avanzados': 'advanced',
    'arrastra': 'drag', 'subir': 'upload', 'suelta': 'drop',
    'doble': 'double', 'detalles': 'details',
}

# EN → ES word dict
W_EN = {
    'Loading': 'Cargando', 'Generating': 'Generando', 'Processing': 'Procesando',
    'Settings': 'Configuración', 'Configuration': 'Configuración',
    'Description': 'Descripción', 'Information': 'Información',
    'Available': 'Disponible', 'Required': 'Requerido',
    'Optional': 'Opcional', 'Template': 'Plantilla', 'Templates': 'Plantillas',
    'Products': 'Productos', 'Orders': 'Pedidos', 'Customers': 'Clientes',
    'Shipping': 'Envío', 'Payment': 'Pago', 'Store': 'Tienda',
    'Campaign': 'Campaña', 'Campaigns': 'Campañas',
    'Customer': 'Cliente', 'Product': 'Producto',
    'Announcement': 'Anuncio', 'Testimonials': 'Testimonios',
    'Countdown': 'Cuenta Regresiva', 'Section': 'Sección',
    'Already': 'Ya', 'Business': 'Negocio', 'Website': 'Sitio Web',
    'minutes': 'minutos', 'website': 'sitio web',
    'business': 'negocio',
}

def translate_text(text, word_dict):
    result = text
    for src, tgt in sorted(word_dict.items(), key=lambda x: -len(x[0])):
        result = re.sub(r'\b' + re.escape(src) + r'\b', tgt, result)
    return result

fixed_en = 0
fixed_es = 0

def fix(es_d, en_d, path=''):
    global fixed_en, fixed_es
    section = path.split('.')[0] if path else ''

    for key in list(es_d.keys()):
        full = f'{path}.{key}' if path else key
        es_v = es_d.get(key)
        en_v = en_d.get(key) if isinstance(en_d, dict) else None

        if isinstance(es_v, dict) and isinstance(en_v, dict):
            fix(es_v, en_v, full)
        elif isinstance(es_v, str) and isinstance(en_v, str) and es_v == en_v and len(es_v) > 5:
            top_section = full.split('.')[0]

            if top_section in SPANISH_SECTIONS:
                # EN needs English translation
                translated = translate_text(es_v, W)
                if translated != es_v:
                    en_d[key] = translated
                    fixed_en += 1
            elif top_section in ENGLISH_SECTIONS:
                # ES needs Spanish translation
                translated = translate_text(en_v, W_EN)
                if translated != en_v:
                    es_d[key] = translated
                    fixed_es += 1

fix(es, en)

with open(es_path, 'w', encoding='utf-8') as f:
    json.dump(es, f, ensure_ascii=False, indent=2)
    f.write('\n')
with open(en_path, 'w', encoding='utf-8') as f:
    json.dump(en, f, ensure_ascii=False, indent=2)
    f.write('\n')

print(f'✅ Fixed {fixed_en} EN values (superadmin/onboardingWizard/leads)')
print(f'✅ Fixed {fixed_es} ES values (onboarding/email/ecommerce/storeAuth)')
print(f'✅ Total: {fixed_en + fixed_es}')
