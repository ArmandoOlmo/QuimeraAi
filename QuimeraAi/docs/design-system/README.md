# Quimera Design System

El Quimera Design System es la base compartida para UI de app, dashboard, builders, storefront, ecommerce admin, CRM, email, chatbot, media AI, citas, restaurante, real estate, finanzas, analytics y futuros modulos.

No es un rediseño visual completo. Es una capa de gobierno para evitar estilos sueltos, duplicacion de componentes, variantes no controladas y UI generada por AI fuera del sistema.

## Ubicaciones

- Tokens CSS: `src/styles/tokens.css`
- Theme helpers: `src/styles/theme.css`
- Theme principal existente: `src/styles/main.css`
- Tokens TS: `src/design-system/tokens`
- Componentes canonicos: `src/design-system/components`
- Backgrounds y gradients: `src/design-system/backgrounds`
- Registry para AI Studio/builders: `src/design-system/registry/componentRegistry.ts`
- Auditoria: `scripts/audit-design-system.ts`

## Como Usar

Usa componentes desde:

```ts
import { Button, Card, Input, Panel } from '@/src/design-system/components';
```

Para codigo existente que ya usa `AppButton`, mantenerlo es valido. `AppButton` ahora envuelve el Button canonico.

## Reglas

- Usar tokens `--q-*` o componentes canonicos para nuevas superficies.
- No agregar nuevos colores hex en UI de app/admin.
- No crear otro color picker; usar `ColorPickerField`, que envuelve `components/ui/ColorControl.tsx`.
- No crear otra familia de Button/Card/Input/Modal sin registrarla y justificarla.
- No mezclar Storefront Builder con Ecommerce Admin: storefront maneja experiencia visual; admin maneja productos, inventario, pedidos, descuentos y clientes.
- AI Studio debe leer `componentRegistry` antes de seleccionar componentes.

## Auditoria

Ejecutar:

```bash
npm run ds:audit
```

Modo CI estricto opcional:

```bash
npm run ds:audit -- --strict
```
