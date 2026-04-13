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
