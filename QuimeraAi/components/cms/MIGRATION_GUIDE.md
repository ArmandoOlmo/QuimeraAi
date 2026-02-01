# Guía de Migración: Editor Antiguo → Editor Moderno

## 🎉 ¡Migración Completada!

El Content Manager ha sido actualizado de `document.execCommand` (deprecado) a **TipTap v2**, un editor moderno y extensible.

## 📊 Comparación

| Característica | Editor Antiguo | Editor Moderno |
|----------------|----------------|----------------|
| **Motor** | document.execCommand | TipTap v2 (ProseMirror) |
| **Estado** | ⚠️ Deprecado | ✅ Activamente mantenido |
| **Extensibilidad** | Limitado | Alta |
| **Performance** | Regular | Excelente |
| **Auto-save** | ❌ No | ✅ Cada 3 segundos |
| **Slash Commands** | ❌ No | ✅ Tipo Notion |
| **Bubble Menu** | ❌ No | ✅ Sí |
| **Dark Mode** | Parcial | Completo |
| **Tablas** | Básico | Avanzado (redimensionable) |
| **AI Integration** | Sí | Sí (mejorado) |
| **Markdown Support** | ❌ No | ✅ Shortcuts |

## 🆕 Nuevas Características

### 1. **Slash Commands** (`/`)
Escribe `/` en cualquier lugar para abrir el menú de comandos:
- `/heading1`, `/heading2`, `/heading3`
- `/bullet`, `/numbered`
- `/quote`, `/code`
- `/image`, `/table`, `/divider`
- `/ai continue`, `/ai improve`

### 2. **Bubble Menu Flotante**
Selecciona texto y aparece automáticamente con:
- Bold, Italic, Underline, Strike
- Link
- AI Improve

### 3. **Auto-Save**
Guarda automáticamente cada 3 segundos (solo drafts).
Muestra indicador de "Saved" con timestamp.

### 4. **Mejor Soporte de Tablas**
- Headers destacados
- Celdas redimensionables
- Estilos consistentes en dark mode

### 5. **Paleta de Colores Avanzada**
- Color picker completo
- Highlight con 5 colores predefinidos
- Presets rápidos

### 6. **Markdown Shortcuts**
- `**bold**` → **bold**
- `*italic*` → *italic*
- `# ` → Heading 1
- `## ` → Heading 2
- `- ` → Lista
- `> ` → Quote

## 🔄 Cambios en el Código

### Imports Actualizados

**Antes:**
```tsx
import CMSEditor from './CMSEditor';
```

**Ahora:**
```tsx
import ModernCMSEditor from './modern/ModernCMSEditor';
```

### Uso del Componente

El API es 100% compatible:

```tsx
<ModernCMSEditor 
  post={editingPost}  // CMSPost | null
  onClose={() => handleClose()}
/>
```

## 🗂️ Archivos Nuevos

```
components/cms/modern/
├── ModernCMSEditor.tsx       ← Editor principal
├── EditorMenuBar.tsx         ← Toolbar
├── EditorBubbleMenu.tsx      ← Menú flotante
├── SlashCommands.tsx         ← Sistema de "/"
├── editor-styles.css         ← Estilos TipTap
├── index.ts                  ← Exports
└── README.md                 ← Documentación
```

## 📦 Dependencias Agregadas

```json
{
  "@tiptap/react": "^2.1.x",
  "@tiptap/starter-kit": "^2.1.x",
  "@tiptap/extension-image": "^2.1.x",
  "@tiptap/extension-link": "^2.1.x",
  "@tiptap/extension-color": "^2.1.x",
  "@tiptap/extension-text-style": "^2.1.x",
  "@tiptap/extension-placeholder": "^2.1.x",
  "@tiptap/extension-table": "^2.1.x",
  "@tiptap/extension-table-row": "^2.1.x",
  "@tiptap/extension-table-cell": "^2.1.x",
  "@tiptap/extension-table-header": "^2.1.x",
  "@tiptap/pm": "^2.1.x",
  "@tiptap/extension-text-align": "^2.1.x",
  "@tiptap/extension-underline": "^2.1.x",
  "@tiptap/extension-highlight": "^2.1.x"
}
```

## ✅ Checklist de Migración

- [x] Instalar dependencias TipTap
- [x] Crear ModernCMSEditor con TipTap
- [x] Implementar MenuBar completo
- [x] Implementar BubbleMenu
- [x] Crear sistema de Slash Commands
- [x] Integrar funciones AI existentes (Gemini)
- [x] Agregar auto-save
- [x] Implementar soporte de tablas
- [x] Agregar paleta de colores avanzada
- [x] Actualizar CMSDashboard
- [x] Agregar prompt 'cms-improve-text'
- [x] Crear estilos CSS personalizados
- [x] Crear documentación completa

## 🎯 Próximos Pasos Recomendados

### Inmediatos
1. ✅ Probar el nuevo editor en desarrollo
2. ✅ Verificar funcionalidad de AI
3. ✅ Probar auto-save
4. ✅ Verificar compatibilidad con posts existentes

### Corto Plazo (1-2 semanas)
- [ ] Agregar vista previa en tiempo real
- [ ] Implementar historial de versiones
- [ ] Agregar templates de contenido
- [ ] Exportar a Markdown/PDF

### Medio Plazo (1-2 meses)
- [ ] Colaboración en tiempo real (Yjs)
- [ ] Drag & Drop de bloques
- [ ] Más extensiones (YouTube, Twitter embeds)
- [ ] Analytics de contenido

## 🐛 Problemas Conocidos

Ninguno por ahora. Si encuentras algún bug, repórtalo.

## 📚 Recursos

- [TipTap Documentation](https://tiptap.dev/)
- [TipTap Examples](https://tiptap.dev/examples)
- [ProseMirror Guide](https://prosemirror.net/docs/guide/)

## 💡 Tips

1. **Keyboard Shortcuts**: Aprende los atajos de teclado para ser más productivo
2. **Slash Commands**: Usa `/` para insertar elementos rápidamente
3. **Bubble Menu**: Selecciona texto para formato rápido
4. **Auto-save**: Confía en el auto-save, guarda automáticamente
5. **AI Commands**: Usa AI para mejorar tu contenido

## ⚠️ Nota sobre el Editor Antiguo

El editor antiguo (`CMSEditor.tsx`) sigue disponible pero **NO SE DEBE USAR**.
Está basado en `document.execCommand` que está **deprecado** por los navegadores.

Para referencia, el archivo permanece en:
```
components/cms/CMSEditor.tsx  ← NO USAR (deprecado)
```

---

**¿Preguntas?** Consulta el README en `components/cms/modern/README.md`

