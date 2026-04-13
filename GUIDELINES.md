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
