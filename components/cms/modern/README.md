# Modern CMS Editor

Content Management System de última generación construido con **TipTap v2** y React.

## 🎯 Características

### ✅ Editor WYSIWYG Avanzado
- **TipTap v2** - Editor moderno basado en ProseMirror
- Toolbar completo con todas las opciones de formato
- Bubble Menu flotante al seleccionar texto
- Slash Commands tipo Notion (`/`)
- Auto-save cada 3 segundos (solo para drafts)
- Soporte completo para Dark Mode

### 🎨 Formatos Soportados

#### Tipografía
- **Bold**, *Italic*, <u>Underline</u>, ~~Strikethrough~~
- `Inline Code`
- Headings (H1, H2, H3)
- Párrafos y Blockquotes

#### Colores
- Color de texto personalizado
- Highlight/Resaltado con paleta de colores
- Picker de color completo

#### Listas y Alineación
- Listas con viñetas
- Listas numeradas
- Alineación: izquierda, centro, derecha, justificado

#### Elementos Avanzados
- Imágenes con upload
- Tablas editables con header
- Links (agregar/editar/remover)
- Líneas horizontales
- Code blocks

### 🤖 Integración AI (Gemini)

#### Comandos AI en Toolbar
- **Improve**: Mejora el texto seleccionado
- **Fix**: Corrige gramática y ortografía
- **Continue**: Continúa escribiendo el artículo

#### Comandos AI en Bubble Menu
- **Improve** en selección rápida

#### Slash Commands AI
- `/ai continue` - Continuar escribiendo
- `/ai improve` - Mejorar texto

#### Auto-generación SEO
- Genera automáticamente SEO Title y Meta Description basado en el contenido

### ⌨️ Atajos de Teclado

#### Formato
- `Cmd/Ctrl + B` - Bold
- `Cmd/Ctrl + I` - Italic
- `Cmd/Ctrl + U` - Underline
- `Cmd/Ctrl + Shift + X` - Strikethrough
- `Cmd/Ctrl + E` - Code

#### Navegación
- `Cmd/Ctrl + Z` - Deshacer
- `Cmd/Ctrl + Shift + Z` - Rehacer
- `Escape` - Cerrar menús

#### Slash Commands
- `/` - Abrir menú de comandos
- `↑` `↓` - Navegar opciones
- `Enter` - Ejecutar comando
- `Escape` - Cancelar

### 📁 Estructura de Archivos

```
components/cms/modern/
├── ModernCMSEditor.tsx       # Editor principal con TipTap
├── EditorMenuBar.tsx         # Toolbar superior
├── EditorBubbleMenu.tsx      # Menú flotante de selección
├── SlashCommands.tsx         # Sistema de comandos "/"
├── editor-styles.css         # Estilos personalizados
└── README.md                 # Esta documentación
```

### 🔧 Extensiones TipTap Usadas

```typescript
- StarterKit (base)
- Image
- Link
- TextStyle
- Color
- Highlight (multicolor)
- Placeholder
- Table + TableRow + TableCell + TableHeader
- TextAlign
- Underline
```

### 💾 Auto-Save

El editor guarda automáticamente después de **3 segundos de inactividad** en el contenido. Solo aplica para posts en estado `draft`.

```typescript
// En ModernCMSEditor.tsx
onUpdate: ({ editor }) => {
  if (autoSaveTimerRef.current) {
    clearTimeout(autoSaveTimerRef.current);
  }
  autoSaveTimerRef.current = setTimeout(() => {
    handleAutoSave();
  }, 3000);
}
```

### 🎨 Personalización

#### Colores de Texto
Paleta predefinida de 15 colores + picker de color personalizado.

#### Highlight
5 colores de resaltado predefinidos + opción de remover.

#### Tablas
- Tablas responsive con headers
- Redimensionable (columnas)
- Estilos consistentes en dark/light mode

### 📝 Metadatos SEO

El sidebar de configuración incluye:
- **Slug URL** - Auto-generado desde el título
- **Featured Image** - Integrado con ImagePicker
- **Excerpt** - Resumen corto
- **SEO Title** - Título optimizado para SEO
- **SEO Description** - Meta descripción

Botón **Auto-Gen** usa Gemini AI para generar automáticamente títulos y descripciones SEO basados en el contenido.

### 🚀 Uso

```tsx
import ModernCMSEditor from './components/cms/modern/ModernCMSEditor';

<ModernCMSEditor 
  post={editingPost}  // null para crear nuevo post
  onClose={() => handleClose()}
/>
```

### 🎯 Roadmap Futuro

- [ ] Colaboración en tiempo real (Yjs)
- [ ] Drag & Drop de bloques
- [ ] Más extensiones (YouTube, Twitter embeds)
- [ ] Historial de versiones
- [ ] Exportar a Markdown/HTML
- [ ] Modo de vista previa
- [ ] Templates de contenido

### 🐛 Debugging

Para debug del editor TipTap:

```typescript
console.log(editor.getHTML());  // Ver HTML generado
console.log(editor.getText());  // Ver texto plano
console.log(editor.getJSON());  // Ver estructura JSON
```

### 📚 Recursos

- [TipTap Docs](https://tiptap.dev/)
- [ProseMirror](https://prosemirror.net/)
- [Gemini AI](https://ai.google.dev/)

---

**Creado con ❤️ para QuimeraAI**

