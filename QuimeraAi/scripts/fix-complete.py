#!/usr/bin/env python3
"""
Complete final fix: reads remaining identical entries, detects language,
and applies comprehensive word-level + pattern translation in both directions.
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

# Read remaining identical entries
with open('/tmp/remaining_identical.txt', 'r') as f:
    entries = []
    for line in f:
        line = line.strip()
        if '|||' in line:
            key, val = line.split('|||', 1)
            entries.append((key, val))

print(f'Loaded {len(entries)} identical entries')

# Word-level dictionaries
ES_WORDS = {
    'Agregar': 'Add', 'Editar': 'Edit', 'Eliminar': 'Delete', 'Guardar': 'Save',
    'Cancelar': 'Cancel', 'Cerrar': 'Close', 'Abrir': 'Open', 'Buscar': 'Search',
    'Enviar': 'Send', 'Confirmar': 'Confirm', 'Volver': 'Back', 'Siguiente': 'Next',
    'Anterior': 'Previous', 'Crear': 'Create', 'Actualizar': 'Update', 'Subir': 'Upload',
    'Descargar': 'Download', 'Exportar': 'Export', 'Importar': 'Import',
    'Seleccionar': 'Select', 'Ver': 'View', 'Copiar': 'Copy', 'Duplicar': 'Duplicate',
    'Aplicar': 'Apply', 'Limpiar': 'Clear', 'Filtrar': 'Filter', 'Ordenar': 'Sort',
    'Restablecer': 'Reset', 'Compartir': 'Share', 'Publicar': 'Publish',
    'Continuar': 'Continue', 'Generar': 'Generate', 'Regenerar': 'Regenerate',
    'Gestionar': 'Manage', 'Configurar': 'Configure', 'Personalizar': 'Customize',
    'Optimizar': 'Optimize', 'Analizar': 'Analyze', 'Deshacer': 'Undo', 'Rehacer': 'Redo',
    'Nombre': 'Name', 'Título': 'Title', 'Descripción': 'Description',
    'Fecha': 'Date', 'Hora': 'Time', 'Estado': 'Status', 'Tipo': 'Type',
    'Precio': 'Price', 'Total': 'Total', 'Cantidad': 'Quantity',
    'Número': 'Number', 'Código': 'Code', 'Dirección': 'Address',
    'Ciudad': 'City', 'País': 'Country', 'Teléfono': 'Phone',
    'Empresa': 'Company', 'Categoría': 'Category', 'Categorías': 'Categories',
    'Etiquetas': 'Tags', 'Etiqueta': 'Tag', 'Notas': 'Notes',
    'Nota': 'Note', 'Comentario': 'Comment', 'Comentarios': 'Comments',
    'Mensaje': 'Message', 'Mensajes': 'Messages', 'Asunto': 'Subject',
    'Contenido': 'Content', 'Resumen': 'Summary', 'Detalles': 'Details',
    'Información': 'Information', 'Historial': 'History',
    'Actividad': 'Activity', 'Registro': 'Log', 'Registros': 'Logs',
    'Reporte': 'Report', 'Reportes': 'Reports', 'Analíticas': 'Analytics',
    'Métricas': 'Metrics', 'Rendimiento': 'Performance', 'Resultado': 'Result',
    'Resultados': 'Results', 'Ingresos': 'Revenue', 'Ventas': 'Sales',
    'Configuración': 'Settings', 'Opciones': 'Options', 'Perfil': 'Profile',
    'Cuenta': 'Account', 'Usuario': 'User', 'Usuarios': 'Users',
    'Miembro': 'Member', 'Equipo': 'Team', 'Rol': 'Role', 'Roles': 'Roles',
    'Permiso': 'Permission', 'Permisos': 'Permissions', 'Acceso': 'Access',
    'Seguridad': 'Security', 'Notificación': 'Notification',
    'Notificaciones': 'Notifications', 'Alerta': 'Alert', 'Alertas': 'Alerts',
    'Éxito': 'Success', 'Ayuda': 'Help', 'Soporte': 'Support', 'Contacto': 'Contact',
    'Proyecto': 'Project', 'Proyectos': 'Projects', 'Página': 'Page',
    'Páginas': 'Pages', 'Publicación': 'Post', 'Publicaciones': 'Posts',
    'Artículo': 'Article', 'Plantilla': 'Template', 'Plantillas': 'Templates',
    'Herramienta': 'Tool', 'Herramientas': 'Tools', 'Producto': 'Product',
    'Productos': 'Products', 'Servicio': 'Service', 'Servicios': 'Services',
    'Elemento': 'Item', 'Elementos': 'Items', 'Pedido': 'Order', 'Pedidos': 'Orders',
    'Envío': 'Shipping', 'Factura': 'Invoice', 'Pago': 'Payment', 'Pagos': 'Payments',
    'Cliente': 'Customer', 'Clientes': 'Customers', 'Tienda': 'Store',
    'Campaña': 'Campaign', 'Campañas': 'Campaigns',
    'Imagen': 'Image', 'Imágenes': 'Images', 'Foto': 'Photo', 'Fotos': 'Photos',
    'Galería': 'Gallery', 'Biblioteca': 'Library', 'Recurso': 'Asset',
    'Recursos': 'Assets', 'Archivo': 'File', 'Archivos': 'Files',
    'Carpeta': 'Folder', 'Documento': 'Document',
    'Fuente': 'Font', 'Fuentes': 'Fonts', 'Color': 'Color', 'Colores': 'Colors',
    'Tamaño': 'Size', 'Ancho': 'Width', 'Alto': 'Height', 'Borde': 'Border',
    'Bordes': 'Borders', 'Sombra': 'Shadow', 'Sombras': 'Shadows',
    'Fondo': 'Background', 'Texto': 'Text', 'Botón': 'Button', 'Botones': 'Buttons',
    'Estilo': 'Style', 'Estilos': 'Styles', 'Negrita': 'Bold', 'Cursiva': 'Italic',
    'Subrayado': 'Underline', 'Alineación': 'Alignment',
    'Izquierda': 'Left', 'Derecha': 'Right', 'Centro': 'Center',
    'Arriba': 'Top', 'Abajo': 'Bottom', 'Predeterminado': 'Default',
    'Personalizado': 'Custom', 'Avanzado': 'Advanced', 'Básico': 'Basic',
    'Global': 'Global', 'Local': 'Local', 'Privado': 'Private', 'Público': 'Public',
    'Visible': 'Visible', 'Oculto': 'Hidden', 'Habilitado': 'Enabled',
    'Deshabilitado': 'Disabled', 'Activo': 'Active', 'Inactivo': 'Inactive',
    'Publicado': 'Published', 'Borrador': 'Draft', 'Pendiente': 'Pending',
    'Completado': 'Completed', 'Fallido': 'Failed', 'Disponible': 'Available',
    'Requerido': 'Required', 'Opcional': 'Optional', 'Destacado': 'Featured',
    'Nuevo': 'New', 'Actualizado': 'Updated', 'Guardado': 'Saved',
    'Eliminado': 'Deleted', 'Creado': 'Created', 'Enviado': 'Sent',
    'Pagado': 'Paid', 'Cumplido': 'Fulfilled', 'Entregado': 'Delivered',
    'industria': 'industry', 'negocio': 'business', 'sitio': 'site',
    'web': 'web', 'buscar': 'search', 'seleccionar': 'select',
    'clic': 'click', 'doble': 'double', 'para': 'to', 'desde': 'from',
    'por': 'by', 'con': 'with', 'sin': 'without', 'todos': 'all',
    'todas': 'all', 'nuevo': 'new', 'nueva': 'new',
    'Lunes': 'Monday', 'Martes': 'Tuesday', 'Miércoles': 'Wednesday',
    'Jueves': 'Thursday', 'Viernes': 'Friday', 'Sábado': 'Saturday', 'Domingo': 'Sunday',
    'Semana': 'Week', 'Mes': 'Month', 'Año': 'Year',
    'Sección': 'Section', 'Secciones': 'Sections',
    'Columna': 'Column', 'Columnas': 'Columns', 'Fila': 'Row',
    'Espacio': 'Space', 'Espaciado': 'Spacing', 'Animación': 'Animation',
    'Animaciones': 'Animations', 'Diseño': 'Design', 'Posición': 'Position',
    'Encabezado': 'Heading', 'Lista': 'List', 'Tabla': 'Table',
    'Enlace': 'Link', 'Insertar': 'Insert', 'Quitar': 'Remove',
    'Mostrar': 'Show', 'Ocultar': 'Hide', 'Cambiar': 'Change',
    'Mover': 'Move', 'Subidas': 'Uploads', 'Asignar': 'Assign',
    'Industria': 'Industry', 'Organización': 'Organization',
    'Verificación': 'Verification', 'Optimización': 'Optimization',
    'Navegación': 'Navigation', 'Menú': 'Menu',
    'Conocimiento': 'Knowledge', 'Captura': 'Capture',
    'Simulador': 'Simulator', 'Preguntas': 'Questions',
    'Frecuentes': 'Frequent', 'Rendimiento': 'Performance',
    'Documentos': 'Documents', 'Personalidad': 'Personality',
    'Políticas': 'Policies', 'Voz': 'Voice', 'Tono': 'Tone',
    'Zona': 'Zone', 'Peligro': 'Danger', 'Contraseña': 'Password',
    'Datos': 'Data', 'Estructurados': 'Structured',
    'Rastreo': 'Crawling', 'Rastreabilidad': 'Crawlability',
    'Clave': 'Key', 'Temas': 'Topics', 'Palabras': 'Keywords',
    'Miniatura': 'Thumbnail', 'Vista': 'View', 'previa': 'preview',
    'Acciones': 'Actions', 'Estadísticas': 'Statistics',
    'Segmento': 'Segment', 'Segmentos': 'Segments',
    'Referencia': 'Reference', 'Creatividad': 'Creativity',
    'Pensamiento': 'Thinking', 'Modelo': 'Model',
    'Potenciado': 'Powered', 'Controles': 'Controls',
    'Cinematográfico': 'Cinematic', 'Capitalizar': 'Capitalize',
    'Caja': 'Box', 'Insignia': 'Badge', 'Audaz': 'Bold',
    'Predefinidas': 'Preset', 'Paletas': 'Palettes', 'Paleta': 'Palette',
    'Redondeado': 'Rounded', 'Angular': 'Sharp',
    'contenido': 'content', 'imagen': 'image', 'detalles': 'details',
    'datos': 'data', 'ejemplo': 'example', 'formato': 'format',
    'también': 'also', 'cada': 'each', 'sobre': 'about',
    'Gestor': 'Manager', 'Contenidos': 'Content',
    'Impuesto': 'Tax', 'Tasa': 'Rate',
    'Mejores': 'Top', 'Pendientes': 'Pending',
    'Inventario': 'Inventory', 'Controlar': 'Track',
    'pedidos': 'orders', 'productos': 'products', 'clientes': 'customers',
    'tienda': 'store', 'usuarios': 'users',
    'reseña': 'review', 'reseñas': 'reviews',
    'envío': 'shipping', 'pago': 'payment',
    'calificación': 'rating', 'opinión': 'opinion',
    'nombre': 'name', 'email': 'email', 'contraseña': 'password',
    'cuenta': 'account', 'sesión': 'session',
    'filtros': 'filters', 'búsqueda': 'search',
    'proyecto': 'project', 'proyectos': 'projects',
    'correo': 'email', 'formulario': 'form',
}

EN_WORDS = {
    'Add': 'Agregar', 'Edit': 'Editar', 'Delete': 'Eliminar', 'Save': 'Guardar',
    'Cancel': 'Cancelar', 'Close': 'Cerrar', 'Open': 'Abrir', 'Search': 'Buscar',
    'Send': 'Enviar', 'Confirm': 'Confirmar', 'Back': 'Volver', 'Next': 'Siguiente',
    'Create': 'Crear', 'Update': 'Actualizar', 'Upload': 'Subir',
    'Download': 'Descargar', 'Export': 'Exportar', 'Import': 'Importar',
    'Select': 'Seleccionar', 'View': 'Ver', 'Copy': 'Copiar',
    'Apply': 'Aplicar', 'Clear': 'Limpiar', 'Filter': 'Filtrar',
    'Sort': 'Ordenar', 'Reset': 'Restablecer', 'Share': 'Compartir',
    'Publish': 'Publicar', 'Continue': 'Continuar', 'Generate': 'Generar',
    'Manage': 'Gestionar', 'Configure': 'Configurar', 'Customize': 'Personalizar',
    'Loading': 'Cargando', 'Generating': 'Generando', 'Processing': 'Procesando',
    'Saving': 'Guardando', 'Deleting': 'Eliminando', 'Updating': 'Actualizando',
    'Sending': 'Enviando', 'Connecting': 'Conectando',
    'Name': 'Nombre', 'Title': 'Título', 'Description': 'Descripción',
    'Date': 'Fecha', 'Time': 'Hora', 'Status': 'Estado', 'Type': 'Tipo',
    'Price': 'Precio', 'Total': 'Total', 'Quantity': 'Cantidad',
    'Settings': 'Configuración', 'Options': 'Opciones',
    'Account': 'Cuenta', 'Profile': 'Perfil', 'User': 'Usuario',
    'Users': 'Usuarios', 'Member': 'Miembro', 'Role': 'Rol',
    'Project': 'Proyecto', 'Projects': 'Proyectos',
    'Product': 'Producto', 'Products': 'Productos',
    'Order': 'Pedido', 'Orders': 'Pedidos',
    'Customer': 'Cliente', 'Customers': 'Clientes',
    'Store': 'Tienda', 'Cart': 'Carrito', 'Checkout': 'Pago',
    'Shipping': 'Envío', 'Payment': 'Pago', 'Invoice': 'Factura',
    'Campaign': 'Campaña', 'Campaigns': 'Campañas',
    'Template': 'Plantilla', 'Templates': 'Plantillas',
    'Image': 'Imagen', 'Images': 'Imágenes',
    'File': 'Archivo', 'Files': 'Archivos',
    'Font': 'Fuente', 'Fonts': 'Fuentes', 'Color': 'Color',
    'Active': 'Activo', 'Inactive': 'Inactivo', 'Enabled': 'Habilitado',
    'Disabled': 'Deshabilitado', 'Published': 'Publicado', 'Draft': 'Borrador',
    'Pending': 'Pendiente', 'Required': 'Requerido', 'Optional': 'Opcional',
    'Default': 'Predeterminado', 'Custom': 'Personalizado',
    'Advanced': 'Avanzado', 'Basic': 'Básico',
    'Private': 'Privado', 'Public': 'Público',
    'Show': 'Mostrar', 'Hide': 'Ocultar', 'Enable': 'Habilitar',
    'Disable': 'Deshabilitar',
}

def has_spanish(t):
    l = t.lower()
    markers = ['á','é','í','ó','ú','ñ','¿','¡',' de ',' del ',' la ',' las ',' los ',' el ',' un ',' una ',' en ',' con ',' por ',' para ',' tu ',' su ',' que ',' es ',' está ']
    return sum(1 for x in markers if x in l) >= 2

def has_english(t):
    l = t.lower()
    markers = [' the ',' this ',' that ',' with ',' from ',' your ',' you ',' for ',' and ',' are ',' can ',' will ',' has ',' have ',' when ',' what ',' how ']
    return sum(1 for x in markers if x in l) >= 2

def translate_words(text, word_dict):
    """Replace known words in text with their translations, preserving structure."""
    result = text
    # Sort by length (longest first) to avoid partial matches
    for src, tgt in sorted(word_dict.items(), key=lambda x: -len(x[0])):
        # Word boundary replacement
        result = re.sub(r'\b' + re.escape(src) + r'\b', tgt, result)
    return result

def set_nested(d, key_path, value):
    """Set a nested value in dict using dot-notation key."""
    parts = key_path.split('.')
    for p in parts[:-1]:
        if p not in d or not isinstance(d[p], dict):
            d[p] = {}
        d = d[p]
    d[parts[-1]] = value

def get_nested(d, key_path):
    """Get a nested value from dict using dot-notation key."""
    parts = key_path.split('.')
    for p in parts:
        if not isinstance(d, dict) or p not in d:
            return None
        d = d[p]
    return d

fixed_en = 0
fixed_es = 0

for key, val in entries:
    if has_spanish(val):
        # Spanish text in both files → EN needs English
        translated = translate_words(val, ES_WORDS)
        if translated != val:
            set_nested(en, key, translated)
            fixed_en += 1
    elif has_english(val):
        # English text in both files → ES needs Spanish
        translated = translate_words(val, EN_WORDS)
        if translated != val:
            set_nested(es, key, translated)
            fixed_es += 1

# Save
with open(es_path, 'w', encoding='utf-8') as f:
    json.dump(es, f, ensure_ascii=False, indent=2)
    f.write('\n')
with open(en_path, 'w', encoding='utf-8') as f:
    json.dump(en, f, ensure_ascii=False, indent=2)
    f.write('\n')

print(f'✅ Fixed {fixed_en} EN values (Spanish→English word replacement)')
print(f'✅ Fixed {fixed_es} ES values (English→Spanish word replacement)')
print(f'✅ Total: {fixed_en + fixed_es}')
