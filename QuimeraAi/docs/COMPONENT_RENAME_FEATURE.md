# Funcionalidad de Renombrado de Componentes Custom

## 📝 Descripción

Se ha agregado la capacidad de renombrar componentes custom directamente desde la interfaz del Component Studio. Esta funcionalidad permite a los usuarios con permisos adecuados cambiar el nombre de sus componentes personalizados de manera fácil e intuitiva.

## 🎯 Características

### 1. **Renombrado desde el Panel Lateral**
- Los componentes custom en el panel lateral izquierdo ahora muestran un botón de edición (✏️) cuando pasas el mouse sobre ellos
- Haz clic en el botón de edición para entrar en modo de edición
- El nombre se convierte en un campo de texto editable
- Presiona `Enter` para guardar o `Esc` para cancelar

### 2. **Renombrado desde el Panel de Propiedades**
- Cuando un componente custom está seleccionado, el panel de propiedades muestra el nombre actual
- Haz clic en el botón de edición (✏️) junto al nombre
- Edita el nombre y guarda con el botón ✓ o cancela con ✗

### 3. **Permisos**
Los siguientes roles pueden renombrar componentes custom:
- ✅ Owner (Creador)
- ✅ Super Admin
- ✅ Admin
- ✅ Manager
- ❌ User

## 🚀 Cómo Usar

### Desde el Panel Lateral:

1. Navega a **Admin Dashboard** → **Components** → **Studio**
2. En el panel lateral izquierdo, localiza el componente custom que deseas renombrar bajo la sección "CUSTOM"
3. Pasa el mouse sobre el componente para revelar el botón de edición
4. Haz clic en el icono de lápiz (✏️)
5. Escribe el nuevo nombre
6. Presiona `Enter` o haz clic en ✓ para guardar

### Desde el Panel de Propiedades:

1. Selecciona un componente custom desde el panel lateral
2. En el panel de propiedades (derecha), verás una sección "Component Name" en la parte superior
3. Haz clic en el botón de edición (✏️)
4. Escribe el nuevo nombre
5. Haz clic en ✓ para guardar o ✗ para cancelar

## 🔒 Validaciones

- El nombre no puede estar vacío
- Los espacios al inicio y final se eliminan automáticamente
- Los cambios se sincronizan en tiempo real con Firestore
- Se actualiza el timestamp `lastModified` y el campo `modifiedBy`

## 💾 Persistencia

Los cambios de nombre se guardan inmediatamente en:
- **Base de datos**: Firestore (colección `customComponents`)
- **Estado local**: Se actualiza automáticamente vía real-time listeners
- **Metadata**: Se registra quién y cuándo modificó el componente

## 🎨 Implementación Técnica

### Función Principal
```typescript
renameCustomComponent(componentId: string, newName: string): Promise<void>
```

### Ubicación del Código
- **Context**: `contexts/EditorContext.tsx`
- **UI Component**: `components/dashboard/admin/ComponentDesigner.tsx`

### Estado Adicional
- `editingComponentId`: ID del componente siendo editado
- `editingName`: Nombre temporal durante la edición

## ⚡ Atajos de Teclado

Cuando estás editando un nombre:
- `Enter` - Guardar cambios
- `Escape` - Cancelar edición
- `Click fuera` - Guardar cambios automáticamente (en panel lateral)

## 🐛 Manejo de Errores

Si ocurre un error al renombrar:
- Se muestra un mensaje de alerta con el error
- El componente mantiene su nombre original
- El estado de edición se cancela automáticamente

## 📊 Ejemplos de Uso

```typescript
// Desde el código (si necesitas usar la función programáticamente)
import { useEditor } from '../../../contexts/EditorContext';

const MyComponent = () => {
  const { renameCustomComponent } = useEditor();
  
  const handleRename = async () => {
    try {
      await renameCustomComponent('comp-id-123', 'Nuevo Nombre');
      console.log('✅ Componente renombrado exitosamente');
    } catch (error) {
      console.error('❌ Error:', error);
    }
  };
};
```

## 🔄 Sincronización en Tiempo Real

Gracias al uso de `onSnapshot` de Firestore:
- Los cambios de nombre se reflejan inmediatamente en todos los usuarios conectados
- No es necesario recargar la página
- El listener mantiene sincronizado el estado local con la base de datos

## ✨ Mejoras Futuras Sugeridas

- [ ] Añadir historial de cambios de nombre
- [ ] Validación de nombres duplicados
- [ ] Sugerencias de nombres basadas en IA
- [ ] Búsqueda de componentes por nombre
- [ ] Renombrado por lotes (múltiples componentes a la vez)

---

**Fecha de Implementación**: Noviembre 2025
**Desarrollado por**: Quimera AI Team

