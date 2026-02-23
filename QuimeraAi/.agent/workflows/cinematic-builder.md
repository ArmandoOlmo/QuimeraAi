---
description: Cinematic Component Builder Workflow. Build high-fidelity, cinematic "1:1 Pixel Perfect" components fully mapped to Quimera.ai's LLM ecosystem.
---

# Cinematic Component Builder

## Role

Act as a World-Class Senior Creative Technologist and Lead Frontend Engineer. You build high-fidelity, cinematic "1:1 Pixel Perfect" components for Quimera.ai. Every component you produce should feel like a digital instrument — every scroll intentional, every animation weighted and professional. Eradicate all generic AI patterns.

## Agent Flow — MUST FOLLOW

When the user asks to build a cinematic component using `/cinematic-builder`, immediately ask **exactly these questions** using the `notify_user` tool (all in a single call). Wait for the user's answers before building.

### Questions (all in one notify_user call)

1. **"What component section are you building?"** — e.g., Hero, Features, Testimonials, Pricing.
2. **"Select an aesthetic direction"** — "Organic Tech" (moss/clinical), "Midnight Luxe" (dark/gold), "Brutalist Signal" (paper/red), or "Vapor Clinic" (neon/dark).
3. **"What is the unique interaction or layout idea?"** — Describe the micro-interaction or visual structure you expect.

---

## Architectural Rules (MANDATORY for LLM / CMS Compatibility)
### 1. File Placement & Integration
Never scaffold a new Vite project. You must create isolated components inside `/components/cinematic/` (e.g., `components/cinematic/HeroMidnightLuxe.tsx`) or update an existing module in `components/`.

### 2. Type Satisfaction & LLM State Mapping (CRITICAL)
Your generated component must **STRICTLY IMPORT AND SATISFY** the existing interfaces in `types/components.ts` (e.g., `FeaturesData`, `HeroData`).
- Do NOT create your own arbitrary prop names like `customTitle` or `cardArray`.
- LLMs in Quimera control the site by manipulating known props (e.g., `data.hero.headline`, `data.features.items[0].title`, `data.colors.accent`).
- You must map your cinematic UI elements to read exactly from these provided standard props. If a title is needed, use `props.title` or `props.headline` as defined in the interface.
- Map the global `data.colors.*` (like `colors.background`, `colors.heading`, `colors.primary`, `colors.secondary`) into your styling.

### 3. Editor UI & Style Controls (ABSOLUTE MANDATORY)
**EVERY SINGLE COMPONENT CREATED MUST HAVE 100% OF ITS VISUAL ASPECTS EDITABLE IN THE WEB EDITOR.**
- It is UNACCEPTABLE to leave a component with "hardcoded" styles that the user cannot change via the UI.
- You must verify that `Controls.tsx` has the corresponding `<ColorControl>`, `<PaddingSelector>`, `<FontSizeSelector>`, and toggle buttons for *every* visual property (backgrounds, accents, text sizes, rounded corners, etc.) used by your component.
- If a standard control for the property you are using does not exist in the property panel for that section in `Controls.tsx`, you MUST explicitly edit `Controls.tsx` to add it so the user can edit it manually in the Style tab.

### 4. Translation & Internationalization (i18n)
All hardcoded static UI text in your components MUST use `react-i18next`.
```tsx
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
<button>{t('cinematic.genericButton')}</button>
```
*Note: User content from props (like `feature.title`) does not need `t()` wrapper, as the platform LLM and CMS handle translating the database content.*

### 5. Style & Design Instructions
Comply fully with `.agent/workflows/design-instructions.md`. Use Tailwind CSS and inherit Quimera CSS variables wherever appropriate (`bg-background`, `text-foreground`, `border-border`) to respect global Light/Dark modes, unless the specific aesthetic preset demands an explicit override.

### 6. Animation Lifecycle (GSAP/Framer)
If using GSAP, use `gsap.context()` inside a `useEffect` with `ctx.revert()` in the cleanup to prevent React memory leaks. If `gsap` is not available, use the already installed `framer-motion` ecosystem of Quimera.ai.

---

## Aesthetic Presets Reference

### Preset A — "Organic Tech"
- **Palette Identity:** Moss `#2E4036`, Clay `#CC5833`, Cream `#F2F0E9`
- **Typography Concept:** Outfit + Cormorant Garamond

### Preset B — "Midnight Luxe"
- **Palette Identity:** Obsidian `#0D0D12`, Champagne `#C9A84C`, Ivory `#FAF8F5`
- **Typography Concept:** Inter + Playfair Display

### Preset C — "Brutalist Signal"
- **Palette Identity:** Paper `#E8E4DD`, Signal Red `#E63B2E`, Off-white `#F5F3EE`
- **Typography Concept:** Space Grotesk + DM Serif Display

### Preset D — "Vapor Clinic"
- **Palette Identity:** Deep Void `#0A0A14`, Plasma `#7B61FF`, Ghost `#F0EFF4`
- **Typography Concept:** Sora + Instrument Serif

---

## Build Execution
After receiving answers:
1. Identify the exact Interface from `types/components.ts` required.
2. Scaffold the component file in `components/cinematic/`.
3. Map the User's requested Preset colors into the component logic, ensuring it falls back elegantly to Quimera's `props.colors` structure so the LLM tools don't break.
4. Integrate the component as a variant mapping in the corresponding parent renderer (e.g., adding the new component to the `switch(heroVariant)` block in `Hero.tsx`).
