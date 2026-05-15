# Guía MCP para agentes — Playbook completo

Documentación operativa para agentes externos que consumen `POST /api/mcp` (JSON-RPC). Cubre **templates, proyectos, IA, CRM, CMS, ecommerce, citas, dominios y reportes**.

Auth y endpoint: [MCP_SETUP.md](./MCP_SETUP.md).

**Esquema completo de componentes (campos editables por sección):** [MCP_COMPONENT_EDITOR_SCHEMA.md](./MCP_COMPONENT_EDITOR_SCHEMA.md) — obligatorio para agentes que editan contenido del Template Editor.

## Índice

| § | Tema |
|---|------|
| 1–10 | Templates, PageData, imágenes, verificación (editor de templates) |
| — | **Componentes:** [MCP_COMPONENT_EDITOR_SCHEMA.md](./MCP_COMPONENT_EDITOR_SCHEMA.md) |
| 11 | Proyectos (draft, páginas, secciones, preview) |
| 12 | CRM / Leads |
| 13 | CMS (artículos app + navegación) |
| 14 | Ecommerce |
| 15 | Citas / Appointments |
| 16 | Dominios y reportes |
| 17 | Jobs async (`ai_generate_full_project`) |
| 18 | Matriz de cobertura MCP vs producto |
| 19 | Asistente global in-app (no es MCP) |
| 20 | Prioridades de documentación pendiente |

---

## 1. Scopes mínimos recomendados

| Objetivo | Scopes |
|----------|--------|
| Leer/verificar templates | `templates:read` |
| Crear/editar templates | `templates:write` |
| Proyectos draft desde template | `projects:read`, `projects:write` |
| Copy + JSON de página | `ai:generate_content` |
| Imágenes (hero, fondos, productos) | `ai:generate_image`, `ai:generate_batch` |
| Aplicar texto/imágenes al proyecto | `ai:apply_to_project` |
| Generación completa async | `ai:generate_batch`, `ai:apply_to_project` |

Atajo operativo: `templates:*`, `projects:*`, `ai:*`.

---

## 2. Modelo de datos (crítico)

Un **template** es una fila en `projects` con `status: "Template"`.

### Columnas de Supabase (nivel fila)

- `pages[]` — páginas multi-page (`sections`, `sectionData`, `seo`, `slug`)
- `component_order` / `section_visibility` — orden y visibilidad de secciones
- `theme`, `brand_identity`, `menus`, `seo_config`, `ai_assistant_config`
- `data` — **snapshot compatible con el Admin** (objeto anidado)

### Dentro de `data` (snapshot Admin)

```json
{
  "name": "Mi Template",
  "status": "Template",
  "data": { "hero": {}, "services": {}, "footer": {} },
  "theme": {},
  "componentOrder": ["header", "hero", "services", "footer"],
  "sectionVisibility": { "hero": true },
  "pages": []
}
```

**PageData** (bloques `hero`, `services`, etc.) vive en `data.data`, no en `data.data.data`.

Cada bloque coincide con una clave de `componentOrder` (ej. `hero`, `features`, `header`). Dentro del bloque, los campos editables en el panel derecho del editor están documentados **sección por sección** en [MCP_COMPONENT_EDITOR_SCHEMA.md](./MCP_COMPONENT_EDITOR_SCHEMA.md) (heroes, listas `items[]`, ecommerce, formularios, colores, fondos, CTAs, variantes).

### Reglas que evitan templates vacíos o rotos

1. **Nunca** llamar `create_template` solo con `name` — responde `400`.
2. **No** envolver el template completo dentro de `data` otra vez. El MCP desenrolla `template` / `payload` / `data.data` automáticamente (`normalizeTemplateArgs`).
3. Enviar **al menos una** de:
   - `data` con ≥3 secciones reales (`hero`, `services`, …), **o**
   - `pages[].sectionData` con ≥3 secciones, **o**
   - `sourceProjectId` de un proyecto con contenido.
4. Tras crear/actualizar, usar `contentSummary.hasRenderableContent === true`.

### Verificación obligatoria

```
list_templates  → contentSummary por template
get_template    → payload completo + contentSummary
```

Ejemplo de `contentSummary` sano:

```json
{
  "sectionCount": 14,
  "dataKeyCount": 24,
  "pageCount": 2,
  "hasRenderableContent": true,
  "warnings": []
}
```

---

## 3. Flujos de trabajo

### A. Crear template desde cero (recomendado)

```
1. ai_list_generators
2. ai_generate_page_json     → page + sectionData + componentOrder
3. ai_generate_project_assets o ai_generate_image (por sección)
4. create_template           → merge final con URLs reales
5. get_template              → verificar contentSummary
```

**`create_template` — argumentos típicos:**

```json
{
  "tenantId": "TENANT_UUID",
  "name": "Bella Tavola Italian Kitchen",
  "category": "restaurantes",
  "tags": ["restaurant", "italian"],
  "industries": ["food-restaurant"],
  "data": {
    "hero": { "headline": "...", "subheadline": "..." },
    "services": { "items": [] }
  },
  "componentOrder": ["header", "hero", "services", "testimonials", "leads", "footer"],
  "sectionVisibility": { "header": true, "hero": true },
  "pages": [{ "id": "home", "slug": "/", "isHomePage": true, "sections": ["header","hero","footer"], "sectionData": {} }],
  "theme": { "pageBackground": "#0a0a0a", "globalColors": { "primary": "#c41e3a" } },
  "brandIdentity": { "businessName": "Bella Tavola" },
  "seoConfig": { "title": "...", "description": "..." },
  "aiAssistantConfig": { "enabled": true, "language": "es" }
}
```

Referencia de script real: `scripts/createMotoForceTemplateViaMcp.ts`.

### B. Clonar desde proyecto existente

```json
{
  "tenantId": "TENANT_UUID",
  "name": "Copia Template",
  "sourceProjectId": "PROJECT_UUID"
}
```

### C. Editar template existente

```
1. get_template(templateId)
2. Modificar data / pages / theme / configs
3. update_template(templateId, …)   — también rechaza vaciar contenido
4. get_template → confirmar contentSummary
```

### D. Imágenes en templates (hero, fondos, portfolio, thumbnail)

**Los templates usan el mismo `projectId` = `templateId`** para generación y aplicación.

```
1. get_template → inspeccionar rutas actuales (imageUrl, backgroundImageUrl, …)
2. ai_generate_image_prompt (opcional, mejorar brief)
3. ai_generate_image
4. ai_apply_generated_images  — escribe en data.data correctamente
   O update_template con data actualizado
5. get_template → comprobar URLs en sección
```

### E. Proyecto draft para cliente

```
create_project_from_template → projectId
ai_generate_* / update_project_sections / update_project_page
validate_project
publish_project_preview
```

### F. Generación completa async

```
ai_generate_full_project → jobId
get_generation_job (poll hasta completed)
get_project / get_template
```

---

## 4. Herramientas por área del Template Editor

| Área del editor | Herramienta MCP | Notas |
|-----------------|-----------------|-------|
| Listar / buscar templates | `list_templates` | Incluye `contentSummary` |
| Abrir template completo | `get_template` | Fuente de verdad post-guardado |
| Crear template | `create_template` | Requiere contenido renderizable |
| Guardar cambios | `update_template` | Normaliza payload envuelto |
| Archivar | `archive_template` | |
| Orden / visibilidad secciones | `create_template` / `update_template` | `componentOrder`, `sectionVisibility` |
| Páginas multi-page | `pages[]` en create/update | `sections`, `sectionData`, `seo` por página |
| Tema (colores, tipografía) | `theme`, `brandIdentity` | `theme.globalColors`, `fontFamilyHeader`, etc. |
| Menús | `menus` | |
| SEO global / por página | `seoConfig` o `pages[].seo` | También `update_seo_metadata` en proyectos |
| Chatbot | `aiAssistantConfig` | `validate_project` avisa si falta |
| Thumbnail del template | `thumbnailUrl` + `ai_generate_image` | `modelPreset: "template-thumbnail"` |
| Favicon | `faviconUrl` en create/update | |
| Copy de sección | `ai_generate_content` + `ai_apply_generated_content` | `section` + `content.structured` |
| JSON de página entera | `ai_generate_page_json` | Base para `pages` + `data` |
| Imagen única | `ai_generate_image` | Sube a Storage, devuelve `urls[]` |
| Lote de imágenes | `ai_generate_project_assets` | Máx. 12 por llamada |
| Aplicar URLs a campos | `ai_apply_generated_images` | `section`, `path`, `url`, opcional `pageId` |
| Referencia visual | `ai_analyze_visual_reference` | `referenceImages[]` URLs públicas |
| Mejorar prompt | `ai_generate_image_prompt` | |
| Proyecto desde template | `create_project_from_template` | |
| Validar antes de preview | `validate_project` | |

---

## 5. Generación de imágenes — presets y parámetros

Llamar primero `ai_list_generators` para ver presets y créditos estimados.

| Uso en editor | `modelPreset` | `imageOptions` sugerido |
|---------------|---------------|-------------------------|
| Hero / banner principal | `hero-image` | `{ "aspectRatio": "16:9", "resolution": "1K" }` |
| Fondo de sección | `background-image` | `{ "aspectRatio": "16:9" }` — sin texto legible |
| Producto / menú / plato | `product-image` | `{ "aspectRatio": "1:1" }` |
| Thumbnail template | `template-thumbnail` | `{ "aspectRatio": "16:9" }` |
| Logo / marca | `logo-asset` | `{ "aspectRatio": "1:1" }` |

### `ai_generate_image` — ejemplo hero

```json
{
  "tenantId": "TENANT_UUID",
  "projectId": "TEMPLATE_OR_PROJECT_UUID",
  "section": "hero",
  "purpose": "hero image",
  "brief": "Modern Italian restaurant interior, warm lighting, no text, no watermark",
  "language": "es",
  "modelPreset": "hero-image",
  "brandContext": { "businessName": "Bella Tavola", "tone": "elegant" },
  "saveTo": "project",
  "imageOptions": { "aspectRatio": "16:9", "resolution": "1K" }
}
```

Respuesta útil: `urls[0]`, `assetIds[0]`.

### `ai_generate_image` — ejemplo fondo de sección

```json
{
  "tenantId": "TENANT_UUID",
  "projectId": "TEMPLATE_UUID",
  "section": "services",
  "purpose": "section background",
  "brief": "Soft abstract texture, dark wine red tones, large negative space center for text overlay",
  "modelPreset": "background-image",
  "saveTo": "project"
}
```

### Batch — varias imágenes

```json
{
  "tenantId": "TENANT_UUID",
  "projectId": "TEMPLATE_UUID",
  "saveTo": "project",
  "assets": [
    { "section": "hero", "brief": "Hero exterior restaurant terrace at dusk", "modelPreset": "hero-image" },
    { "section": "banner", "brief": "Wide subtle food photography background", "modelPreset": "background-image" },
    { "section": "portfolio", "brief": "Gourmet pasta dish top view", "modelPreset": "product-image", "imageOptions": { "aspectRatio": "1:1" } }
  ]
}
```

---

## 6. Rutas de imagen (`ai_apply_generated_images`)

Cada reemplazo necesita: `section`, `path` (notación punto), `url`.

**Tabla completa por componente:** §11 de [MCP_COMPONENT_EDITOR_SCHEMA.md](./MCP_COMPONENT_EDITOR_SCHEMA.md).

| Sección | `path` típico |
|---------|----------------|
| `hero` | `imageUrl`, `headlineImageUrl`, `backgroundImageUrl` |
| `heroSplit` | `imageUrl`, `backgroundImageUrl` |
| `heroGallery` / `heroWave` / `heroNova` | `slides.N.backgroundImage` |
| `heroLead` | `imageUrl`, `backgroundImageUrl` |
| Fondo de sección | `{section}.backgroundImageUrl` |
| Listas | `{section}.items.N.imageUrl` |
| `banner` | `backgroundImageUrl` |
| `header` / `footer` | `logoImageUrl` |
| Thumbnail | `update_template` → `thumbnailUrl` |

### Aplicar imagen generada

```json
{
  "tenantId": "TENANT_UUID",
  "projectId": "TEMPLATE_UUID",
  "replacements": [
    {
      "section": "hero",
      "path": "imageUrl",
      "url": "https://....supabase.co/storage/v1/object/public/platform-assets/...",
      "assetId": "optional-asset-uuid"
    },
    {
      "section": "services",
      "path": "backgroundImageUrl",
      "url": "https://...."
    }
  ]
}
```

**Multi-page:** añadir `pageId` en cada replacement o a nivel raíz.

---

## 7. Contenido de texto por sección

```json
{
  "tenantId": "TENANT_UUID",
  "projectId": "UUID",
  "section": "hero",
  "brief": "Headline y subheadline para restaurante italiano premium, tono cálido, idioma es",
  "language": "es",
  "contentType": "hero",
  "brandContext": { "businessName": "Bella Tavola" }
}
```

Herramienta: `ai_generate_content` → luego `ai_apply_generated_content`:

```json
{
  "tenantId": "TENANT_UUID",
  "projectId": "UUID",
  "section": "hero",
  "content": { "structured": { "headline": "...", "subheadline": "..." } },
  "replace": false
}
```

Para página nueva completa: `ai_generate_page_json` → fusionar `page`, `legacyData`, `componentOrder` en `create_template` o `update_template`.

---

## 8. Checklist antes de dar por terminado

- [ ] `get_template` → `contentSummary.hasRenderableContent === true`
- [ ] `dataKeyCount` ≥ 3 (o `pageSectionCount` ≥ 3)
- [ ] `componentOrder` alineado con claves en PageData
- [ ] Imágenes: URLs HTTPS públicas, no placeholders vacíos en hero/fondos críticos
- [ ] `pages[].sectionData` coherente con `pages[].sections` si hay multi-page
- [ ] `seoConfig` o `pages[].seo` definidos
- [ ] `thumbnailUrl` opcional vía `template-thumbnail` preset

---

## 9. Errores frecuentes

| Error | Causa | Solución |
|-------|-------|----------|
| `400` Template content is required | Template vacío | Enviar PageData + componentOrder o sourceProjectId |
| `data.data` anidado incorrecto | Template envuelto en `data` | Pasar secciones en `data.hero`, no `data.data.hero`; o usar `template`/`payload` y dejar que MCP normalice |
| Template sin secciones en UI | `componentOrder` vacío o visibility false | Revisar `get_template` |
| Imagen no aparece | `path` incorrecto | Ver tabla de rutas; `get_template` y buscar campo real |
| `402` CREDITS_EXHAUSTED | Sin créditos AI | Reducir batch o recargar tenant |
| `403` missing scope | API key limitada | Ampliar scopes en dashboard |

---

## 10. Orden recomendado para agentes autónomos

```
ai_list_generators
→ get_template (si existe) | ai_generate_page_json (si nuevo)
→ ai_generate_project_assets (imágenes)
→ create_template | update_template
→ ai_apply_generated_images (si se generó después del save)
→ get_template (verificación final)
→ list_templates (confirmar contentSummary en catálogo)
```

**Nunca** asumir éxito sin `get_template` tras un `create_template` o `update_template`.

---

## 11. Proyectos (draft y editor)

Scopes: `projects:read`, `projects:write`, `ai:apply_to_project`.

### Flujo típico

```
create_project_from_template  → projectId
get_project                   → inspeccionar pages, data, configs
ai_generate_*                 → contenido / imágenes
update_project_sections       → merge secciones (respeta data.data anidado)
update_project_page           → crear/editar página
update_seo_metadata           → SEO global o por pageId
validate_project              → warnings (home, SEO, chatbot)
publish_project_preview       → status Preview
```

### `update_project_sections`

```json
{
  "tenantId": "TENANT_UUID",
  "projectId": "PROJECT_UUID",
  "sections": { "hero": { "headline": "Nuevo título" } },
  "replace": false
}
```

- Sin `pageId`: actualiza PageData en `projects.data` (incluye snapshots Admin con `data.data`).
- Con `pageId`: actualiza `pages[].sectionData`.

### `update_project_page`

Requiere `page` o `updates` con `title`, `slug`, `sections`, `sectionData`, `seo`, `showInNavigation`, `isHomePage`.

### Limitación actual

No existe `update_project` genérico para `theme`, `brand_identity`, `menus` o `ai_assistant_config` a nivel fila. Opciones:

1. Incluirlos en `create_project` / `create_project_from_template` al crear.
2. Para templates: `update_template`.
3. Para chatbot avanzado (knowledge base, documentos): **solo UI** hoy (`/ai-assistant`).

---

## 12. CRM / Leads

Scopes: `leads:read`, `leads:write`. **Siempre** `projectId` en `create_lead`.

### Listar y filtrar

```json
{ "tenantId": "TENANT_UUID", "projectId": "PROJECT_UUID", "status": "new", "limit": 50 }
```

`list_leads` → `leads[]` con `status`, `source`, `custom_data`, etc.

### Crear lead

```json
{
  "tenantId": "TENANT_UUID",
  "projectId": "PROJECT_UUID",
  "name": "María López",
  "email": "maria@example.com",
  "phone": "+52...",
  "company": "Acme",
  "status": "new",
  "source": "mcp",
  "value": 1500,
  "tags": ["web", "hot"],
  "notes": "Interesada en plan premium",
  "custom_data": { "utm_campaign": "spring" }
}
```

### Seguimiento

| Acción | Tool |
|--------|------|
| Actualizar estado/datos | `update_lead` (`leadId`, `updates` o campos sueltos) |
| Nota / actividad | `add_lead_activity` (`type`: `note`, `call`, …) |
| Tarea | `create_lead_task` (`title`, `dueDate`, `status`) |
| Eliminar | `delete_lead` |

### Flujo agente CRM

```
list_leads → create_lead → add_lead_activity → create_lead_task
get_project_summary → counts.leads
```

---

## 13. CMS (app global)

Scopes: `cms:read`, `cms:write`.

**Importante:** `list_articles` / `create_article` operan sobre `app_articles` (CMS de la **app Quimera**, no el blog por proyecto). El blog del website del cliente vive en secciones `cmsFeed` / posts con tag `project:{id}` — eso **no** tiene tools MCP dedicados hoy.

### Artículo

```json
{
  "tenantId": "TENANT_UUID",
  "title": "Novedades Q2",
  "content": "<p>HTML o markdown según editor</p>",
  "slug": "novedades-q2",
  "excerpt": "Resumen",
  "category": "announcement",
  "tags": ["product"],
  "status": "draft",
  "language": "es",
  "imageUrl": "https://..."
}
```

`publish_article` → `status: published` + `published_at`.

### Navegación global app

```json
{
  "tenantId": "TENANT_UUID",
  "navigationId": "main",
  "links": [
    { "label": "Blog", "href": "/blog", "order": 0 }
  ]
}
```

`update_navigation` → tabla `app_navigation`.

### SEO de **proyecto** (sitio cliente)

Usar `update_seo_metadata` (scope `cms:write`), no confundir con artículos app:

```json
{
  "tenantId": "TENANT_UUID",
  "projectId": "PROJECT_UUID",
  "seo": { "title": "...", "description": "...", "keywords": [] }
}
```

---

## 14. Ecommerce

Scopes: `commerce:read`, `commerce:write`. Todo requiere `projectId` del storefront.

### Productos

```json
{
  "tenantId": "TENANT_UUID",
  "projectId": "PROJECT_UUID",
  "name": "Camiseta Logo",
  "slug": "camiseta-logo",
  "description": "Algodón 100%",
  "price": 29.99,
  "currency": "USD",
  "quantity": 50,
  "images": ["https://..."],
  "tags": ["ropa"],
  "status": "active",
  "variants": [],
  "options": []
}
```

`list_products` (`status`, `limit`) · `update_product` (`productId`, `updates`).

Imágenes de producto: `ai_generate_image` con `modelPreset: "product-image"` + URL en `images[]`.

### Órdenes

`list_orders` → `update_order_status`:

```json
{
  "tenantId": "TENANT_UUID",
  "projectId": "PROJECT_UUID",
  "orderId": "ORDER_UUID",
  "status": "shipped",
  "paymentStatus": "paid",
  "fulfillmentStatus": "fulfilled",
  "trackingNumber": "1Z...",
  "carrier": "UPS"
}
```

### Descuentos

```json
{
  "tenantId": "TENANT_UUID",
  "projectId": "PROJECT_UUID",
  "code": "VERANO20",
  "type": "percentage",
  "value": 20,
  "minimumPurchase": 50,
  "maxUses": 100
}
```

Si omites `code`, el servidor genera `MCP######`.

---

## 15. Citas / Appointments

Scopes: `appointments:read`, `appointments:write`.

### Crear cita

```json
{
  "tenantId": "TENANT_UUID",
  "projectId": "PROJECT_UUID",
  "title": "Consulta inicial",
  "startDate": "2026-05-20T15:00:00.000Z",
  "endDate": "2026-05-20T15:30:00.000Z",
  "type": "consultation",
  "status": "scheduled",
  "timezone": "America/Mexico_City",
  "location": { "type": "virtual", "url": "https://meet..." },
  "linkedLeadIds": ["LEAD_UUID"],
  "participants": [{ "name": "Cliente", "email": "a@b.com" }]
}
```

### Otras operaciones

| Tool | Uso |
|------|-----|
| `list_appointments` | `projectId`, `status`, `limit` |
| `update_appointment` | `appointmentId`, `updates` o campos ISO dates |
| `delete_appointment` | `appointmentId` |
| `block_appointment_date` | `projectId`, `date` (YYYY-MM-DD), `reason` |

**No expuesto en MCP:** reglas de disponibilidad, tipos de cita, recordatorios por email (configurar en UI `/appointments`).

---

## 16. Dominios y reportes

### Dominios (lectura)

Scopes: `domains:read`. `domains:write` está reservado — **no** hay alta/baja de dominio vía MCP.

```json
{ "tenantId": "TENANT_UUID", "projectId": "PROJECT_UUID" }
```

| Tool | Devuelve |
|------|----------|
| `list_domains` | Dominios del tenant o filtrados por proyecto |
| `get_domain_status` | `domain` o `domainId` — DNS/SSL |
| `list_deployment_logs` | Logs Vercel / despliegue |

### Reportes

Scope: `reports:read`.

- `get_tenant_summary` → conteos `projects`, `leads`, `mcpCalls`
- `get_project_summary` → `counts.leads`, `products`, `orders`, `appointments`

Útil como health-check antes/después de operaciones batch.

---

## 17. Jobs async — `ai_generate_full_project`

Scopes: `ai:generate_batch` + `ai:apply_to_project`.

1. Tener `projectId` (draft vacío o parcial).
2. Llamar `ai_generate_full_project` → `{ status: "accepted", jobId }`.
3. Poll `get_generation_job` hasta `status: completed` | `failed` | `partial_failed`.

El runner (`/api/mcp/jobs/run`, cron con `CRON_SECRET`):

- Genera page JSON (`structured-json`).
- Opcionalmente aplica `page`, `legacyData`, `component_order` al proyecto.
- Genera hasta **8** imágenes de `assets[]` en el input del job.
- **No** reemplaza automáticamente URLs en secciones — tras el job, usar `ai_apply_generated_images` con las URLs de `output.assetResults`.

Ejemplo input job:

```json
{
  "tenantId": "TENANT_UUID",
  "projectId": "PROJECT_UUID",
  "brief": "Sitio para clínica dental familiar en CDMX",
  "language": "es",
  "brandContext": { "tone": "professional", "colors": ["#0ea5e9"] },
  "assets": [
    { "section": "hero", "brief": "Bright dental clinic reception", "modelPreset": "hero-image" },
    { "section": "services", "brief": "Abstract blue medical background", "modelPreset": "background-image" }
  ]
}
```

---

## 18. Matriz de cobertura MCP vs producto

| Módulo dashboard | Ruta UI | MCP | Notas |
|------------------|---------|-----|-------|
| Templates | `/admin/templates`, `/templates` | Completo | §1–10 |
| Editor / Websites | `/editor`, `/websites` | Parcial | Secciones, páginas, AI; sin `update_project` genérico |
| AI assets | `/assets` | `ai_generate_image`, batch | `saveTo`: project/media/admin |
| CRM | `/leads` | Completo | Por `projectId` |
| CMS app | `/cms`, `/admin/content` | Artículos + nav app | No blog por proyecto |
| Ecommerce | `/ecommerce` | Productos, órdenes, descuentos | Sin categorías/collections MCP |
| Citas | `/appointments` | CRUD + block date | Sin availability rules |
| Dominios | `/domains` | Solo lectura | `domains:write` sin tools |
| SEO | `/seo` | `update_seo_metadata` | |
| Reportes | — | Summaries | |
| Bio Page | `/biopage` | **No** | Firestore `publicBioPages` |
| Email marketing | `/email` | **No** | Campañas, audiencias |
| Restaurantes | `/restaurants` | **No** | Menú/reservas |
| Real estate | módulo RE | **No** | Listados en secciones solo vía editor |
| Agency / tenants | `/agency` | **No** | API REST v1 aparte (`docs/API_DOCUMENTATION.md`) |
| Finance | `/finance` | **No** | Asistente in-app `finance_expense` |
| Chatbot KB | `/ai-assistant` | Solo `aiAssistantConfig` en project row | Sin upload documentos MCP |
| AI Website Studio | modal onboarding | Aproximado con job + page JSON | UX conversacional solo UI |

### Recursos MCP declarados pero no implementados

`resources/list` anuncia `quimera://docs/schema` — **no** hay handler `resources/read` hoy. Usar este archivo + `tools/list` como schema.

### API Keys UI vs MCP

En **Developer → API Keys**, las tarjetas “Quick Start / Ejemplos / Referencia” apuntan a `/docs/api/*` (API agency REST `api.quimera.ai/v1`), **no** al MCP. Para agentes MCP usar [MCP_SETUP.md](./MCP_SETUP.md) y esta guía.

---

## 19. Asistente global in-app (no es MCP)

El **Global AI Assistant** (`GlobalAiAssistant.tsx`) corre en el dashboard con Gemini + function calling. **No** usa `/api/mcp`.

| Capacidad | Tool in-app | Equivalente MCP |
|-----------|-------------|-----------------|
| Navegar UI | `change_view` | — |
| Editar sección | `update_site_content`, `open_*` | `update_project_sections`, `ai_apply_*` |
| Imagen | `generate_image_asset` | `ai_generate_image` |
| Leads | `manage_lead` | `create_lead`, etc. |
| CMS post | `manage_cms_post` | `create_article` (app articles) |
| Ecommerce | `ecommerce_*` | `create_product`, … |
| Citas | `manage_appointment` | `create_appointment`, … |
| Templates UI | `manage_template` | `create_template`, … |
| Finanzas | `finance_expense` | — |

Rutas de contenido documentadas en `defaultPrompts.ts` (`DATA_SCHEMA_HINT`): `hero.headline`, `features.items.0.title`, `chatbot.welcomeMessage`, etc.

**Regla:** agentes **externos** → MCP. Agentes **dentro del dashboard** → prompts + tools del asistente global.

---

## 20. Prioridades de documentación / producto

| Prioridad | Área | Acción sugerida |
|-----------|------|-----------------|
| Alta | Bio Page, Email, Restaurants | Nuevos tools MCP o documentar API alternativa |
| Alta | `update_project` | Tool para `theme`, `ai_assistant_config`, `menus` |
| Media | `resources/read` | Servir JSON schema de tools + PageSection |
| Media | ApiKeysManager | Enlace a MCP_SETUP / esta guía |
| Media | Blog por proyecto | `list_posts` / `create_post` con tag `project:{id}` |
| Baja | Agency REST vs MCP | Unificar storytelling en docs públicas |

---

## Presets de scopes por rol de agente

| Rol | Scopes |
|-----|--------|
| Template builder | `templates:*`, `ai:*` |
| Site implementer | `projects:*`, `templates:read`, `ai:*` |
| CRM bot | `leads:*`, `projects:read`, `reports:read` |
| Store ops | `commerce:*`, `projects:read`, `ai:generate_image` |
| Read-only auditor | `*:read`, `reports:read` |
