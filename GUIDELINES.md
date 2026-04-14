# QuimeraAi — Project Guidelines

## 🌐 Mandatory Internationalization (i18n) Rule

**Every piece of user-facing text in this project MUST be internationalized.** No hardcoded strings are allowed in components, pages, hooks, utilities, or any code that renders text visible to the user.

### System Overview

| Item | Detail |
|---|---|
| **Library** | `react-i18next` (with `i18next` + `i18next-browser-languagedetector`) |
| **Hook** | `useTranslation()` from `react-i18next` |
| **Translation function** | `t('namespace.key')` |
| **Supported languages** | `es` (Spanish — default/fallback), `en` (English), `fr` (French), `pt` (Portuguese) |
| **Locale files** | `QuimeraAi/locales/{lang}/translation.json` |
| **i18n config** | `QuimeraAi/i18n.ts` |
| **Namespace format** | Single `translation` namespace, keys structured as flat top-level groups (e.g. `editor`, `controls`, `dashboard`, `onboarding`, etc.) |

### Rules

1. **No hardcoded strings.** Every visible text — labels, buttons, placeholders, tooltips, error messages, success messages, confirmation dialogs, empty states, tab titles, column headers — must use `t('key')`.

2. **All 4 locale files must be updated together.** When adding new translation keys, you MUST add them to ALL four locale files simultaneously:
   - `locales/en/translation.json`
   - `locales/es/translation.json`
   - `locales/fr/translation.json`
   - `locales/pt/translation.json`

3. **Use the `useTranslation` hook.** Every React component that renders user-facing text must import and call:
   ```tsx
   import { useTranslation } from 'react-i18next';
   // Inside the component:
   const { t } = useTranslation();
   ```

4. **Follow existing key structure.** Translation keys must be organized under a top-level namespace matching the feature area. Examples of existing namespaces:
   - `editor.*` — Editor-related strings
   - `controls.*` — Component controls/sidebar
   - `dashboard.*` — Dashboard pages
   - `onboarding.*` — Onboarding wizard
   - `common.*` — Shared/common strings
   - `seo.*` — SEO dashboard
   - `email.*` — Email hub
   - `leads.*` — Leads management
   - `appointments.*` — Appointments module
   - `cms.*` — CMS content management
   - `ecommerce.*` — E-commerce features

   When creating a **new feature area**, create a new top-level namespace key in all 4 locale files.

5. **Key naming conventions:**
   - Use `camelCase` for keys: `t('editor.addSection')`, not `t('editor.add-section')`
   - Use descriptive, hierarchical keys: `t('leads.table.columnName')` 
   - Group related strings under sub-objects: `{ "modal": { "title": "...", "confirm": "...", "cancel": "..." } }`

6. **Dynamic content and interpolation.** Use i18next interpolation for dynamic values:
   ```tsx
   // In JSON: "welcomeUser": "Welcome, {{name}}!"
   t('common.welcomeUser', { name: userName })
   ```

7. **Pluralization.** Use i18next plural forms:
   ```json
   {
     "itemCount": "{{count}} item",
     "itemCount_plural": "{{count}} items"
   }
   ```

8. **Date and number formatting.** Use locale-aware formatting through `Intl` APIs or i18next formatting, never hardcode date/number formats:
   ```tsx
   new Date().toLocaleDateString(i18n.language)
   new Intl.NumberFormat(i18n.language).format(amount)
   ```

9. **Non-component code.** For utility functions, services, or non-React code that generates user-facing strings, either:
   - Accept a translation function `t` as a parameter
   - Return translation keys instead of raw strings, and let the component resolve them

10. **Exceptions.** The following do NOT need translation:
    - Technical identifiers (CSS class names, HTML IDs, data attributes)
    - Console logs and developer-only debug messages
    - API endpoint paths and technical constants
    - Code comments
    - Brand names that shouldn't be translated (e.g., "Quimera AI")

### Checklist Before Submitting Code

- [ ] All new user-facing strings use `t('key')` 
- [ ] Translation keys added to `locales/en/translation.json`
- [ ] Translation keys added to `locales/es/translation.json`
- [ ] Translation keys added to `locales/fr/translation.json`
- [ ] Translation keys added to `locales/pt/translation.json`
- [ ] Translations are actual translations, not just copies of the English text
- [ ] Keys follow the existing naming convention (`camelCase`, grouped by feature)
- [ ] Component imports `useTranslation` from `react-i18next`
- [ ] Date/number formatting is locale-aware

## 🎨 Global Color Unification Rule

**Every new component or feature added to the application—specifically within the Landing Page Editor, Web Editor, or Agency modules—MUST be mapped to the global color system.** This ensures that when a user changes the theme or imports a palette from **Coolors.co**, every element (lines, buttons, text, backgrounds) updates automatically.

### System Overview

| Area | Configuration File | Essential Function |
|---|---|---|
| **Web Editor / Agency** | `QuimeraAi/components/ui/GlobalStylesControl.tsx` | `generateComponentColorMappings()` |
| **Landing Page** | `QuimeraAi/components/dashboard/admin/LandingPageEditor.tsx` | `generateLandingSectionColorMappings()` |

### Rules

1. **Mandatory Mapping.** When creating a new component, you must add its color mapping to the corresponding function mentioned above. No component should have "orphaned" colors that don't react to global palette changes.

2. **Use Global Tokens.** Map component properties to global tokens whenever possible:
   - `colors.primary`, `colors.secondary`, `colors.accent`
   - `colors.background`, `colors.surface`, `colors.border`
   - `colors.heading`, `colors.text`, `colors.textMuted`

3. **Coolors.co Compatibility.** Ensure the mapping is logical so that palettes imported via `CoolorsImporter` distribute colors naturally across the component (e.g., using `primary` for main actions and `background` for sections).

4. **Refactoring Existing Code.** If you find a component in the Agency or Editor modules using hardcoded hex values, it must be refactored to use the `GlobalStylesControl` or `LandingPageEditor` mapping system.

### Checklist for Color Integration

- [ ] New component added to `generateComponentColorMappings` (if for Web/Agency)
- [ ] New component added to `generateLandingSectionColorMappings` (if for Landing Page)
- [ ] Component uses global color tokens instead of hardcoded hex values
- [ ] Verified that changing the global palette correctly updates all parts of the new component
- [ ] Verified that importing a Coolors.co URL applies colors as expected to the component

## 📐 Code Structure & Anti-Monolith Rules

**Every new file added to this project MUST follow modular architecture principles.** No monolithic files, no god-components, no mega-hooks. Code must be structured so that any single file can be read and understood at a glance.

### Rule 1: Strict Line Limit per File (≤ 300 lines)

No `.tsx` or `.ts` file may exceed **300 lines**. If a file approaches this limit, it must be decomposed into smaller, focused modules.

```
✅ Acceptable:  LeadsDashboard.tsx (280 lines)
❌ Prohibited:  EditorContext.tsx (5,139 lines)
```

**Exceptions:**
- Type/interface files may reach 400 lines if well-organized by section
- Pure data/constants files (e.g., `initialData.ts`) if they contain only static data

### Rule 2: Mandatory Feature Folder Pattern

Every complex feature or component must live in its own folder with a standardized internal structure:

```
components/dashboard/leads/
├── LeadsDashboard.tsx          # Composition only — assembles sub-components
├── components/
│   ├── LeadsTable.tsx          # Table display
│   ├── LeadFilters.tsx         # Filter controls
│   ├── LeadDetailModal.tsx     # Detail modal
│   └── LeadStatusBadge.tsx     # Status badge
├── hooks/
│   ├── useLeadsData.ts         # Data fetching & caching
│   ├── useLeadsFilters.ts      # Filter logic
│   └── useLeadsActions.ts      # Mutations (create, update, delete)
├── types.ts                    # Types scoped to this feature only
├── helpers.ts                  # Pure utility functions
├── constants.ts                # Feature-specific constants
└── index.ts                    # Public re-exports
```

**Reference implementation:** `components/dashboard/email/email-hub/` follows this pattern with `hooks/`, `views/`, `types.ts`, and `helpers.ts`.

### Rule 3: Single Responsibility Principle for Hooks (SRP)

A hook must have **one single responsibility**. Never mix:
- Data fetching with mutations
- UI state with business logic
- Side effects with pure computations

```tsx
// ❌ PROHIBITED: Monolithic hook
function useLeads() {
  // 50 lines of fetching
  // 80 lines of filters
  // 120 lines of mutations
  // 40 lines of UI state
  return { /* 30+ values */ };
}

// ✅ CORRECT: Specialized hooks
function useLeadsData(projectId: string) { ... }       // Read-only queries
function useLeadsFilters() { ... }                      // Filter state & logic
function useLeadsActions(projectId: string) { ... }     // Write mutations only
function useLeadsUI() { ... }                           // Transient UI state only
```

**Naming convention:**

| Suffix | Purpose | Example |
|---|---|---|
| `use{Feature}Data` | Read-only data queries | `useLeadsData` |
| `use{Feature}Actions` | Write mutations | `useLeadsActions` |
| `use{Feature}Filters` | Filter logic | `useLeadsFilters` |
| `use{Feature}UI` | Local UI state | `useLeadsUI` |

### Rule 4: Components as Composition, Not Monoliths

A parent component must only **compose** sub-components. If it has more than ~20 lines of inline JSX, extract sub-components.

```tsx
// ❌ PROHIBITED: Everything inline
function SEODashboard() {
  return (
    <div>
      {/* 200 lines of header */}
      {/* 300 lines of tabs */}
      {/* 400 lines of forms */}
      {/* 100 lines of modals */}
    </div>
  );
}

// ✅ CORRECT: Composition
function SEODashboard() {
  return (
    <DashboardLayout>
      <SEOHeader />
      <SEOTabs>
        <GeneralSEOForm />
        <TechnicalSEOForm />
        <SocialSEOForm />
      </SEOTabs>
      <SEOPreview />
    </DashboardLayout>
  );
}
```

### Rule 5: Co-located Types per Feature

Types must live **next to their feature**, not in a single mega-file.

```
❌ PROHIBITED: One giant global types file
types/components.ts (2,126 lines with ALL types)

✅ CORRECT: Types co-located with their feature
components/dashboard/leads/types.ts        # Only lead types
components/dashboard/email/email-hub/types.ts  # Only email types
components/dashboard/seo/types.ts          # Only SEO types
types/shared.ts                            # Only truly shared types
```

When creating a new feature, always create a local `types.ts` in its folder. Only put types in `types/` at the root if they are genuinely shared across 3+ unrelated features.

### Rule 6: Three-Layer Rule for React Contexts

A React context must never mix abstraction levels. Follow the 3-layer structure:

```
Layer 1: Pure State (StateContext)
  └── Only state + refs + computed values

Layer 2: Actions (ActionsContext)
  └── Only functions that modify state

Layer 3: UI (UIContext)
  └── Only transient UI state (modals, selections, panels)
```

```tsx
// ❌ PROHIBITED: God-context
<EditorContext.Provider value={{
  // 200+ values: state + actions + UI + everything
}}>

// ✅ CORRECT: Specialized contexts
<EditorStateProvider>
  <EditorActionsProvider>
    <EditorUIProvider>
      {children}
    </EditorUIProvider>
  </EditorActionsProvider>
</EditorStateProvider>
```

When adding functionality to an existing context, first verify which layer it belongs to. If the context already mixes layers, refactor before adding.

### Rule 7: Extract Pure Logic to Helpers

All logic that **does not require** React hooks must live in `helpers.ts` or `utils/` files as pure functions.

```tsx
// ❌ PROHIBITED: Business logic inside a component
function PricingTable({ plans }) {
  const formatPrice = (price, currency, interval) => { /* 20 lines */ };
  const calculateDiscount = (plan, coupon) => { /* 15 lines */ };
  const sortPlans = (plans, criteria) => { /* 10 lines */ };
  // ...render
}

// ✅ CORRECT: Pure functions in helpers
// helpers.ts
export const formatPrice = (price: number, currency: string, interval: string) => { ... }
export const calculateDiscount = (plan: Plan, coupon: Coupon) => { ... }
export const sortPlans = (plans: Plan[], criteria: SortCriteria) => { ... }

// PricingTable.tsx — UI only
import { formatPrice, calculateDiscount, sortPlans } from './helpers';
```

**Benefits:**
- Helpers are **unit-testable** without React
- Reusable without coupling to a specific component
- Drastically reduce component file size

### Quick Reference

| # | Rule | Metric |
|---|---|---|
| 1 | Line limit | ≤ 300 lines per file |
| 2 | Feature folders | Each feature gets its own folder + standard structure |
| 3 | Hook SRP | 1 hook = 1 responsibility |
| 4 | Composition | Parent ≤ 20 lines of inline JSX |
| 5 | Co-located types | Types live with their feature |
| 6 | 3-layer contexts | State / Actions / UI separated |
| 7 | Pure helpers | Non-React logic → `helpers.ts` |

### Checklist for Code Structure

- [ ] No file exceeds 300 lines
- [ ] Component uses Feature Folder pattern if it has 2+ sub-components
- [ ] Hooks follow naming convention (`Data` / `Actions` / `Filters` / `UI`)
- [ ] Types are co-located in the feature folder
- [ ] Pure logic extracted to `helpers.ts`
- [ ] Parent component only composes sub-components
- [ ] No new responsibility added to an already mixed-layer context
