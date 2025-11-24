# Design Tokens Integration - Implementation Guide

## Status: ✅ ACTIVE

Design Tokens are now ACTIVE and control the colors across the application. The system is backward compatible and maintains all current visual appearances.

## How It Works

### 1. Design Tokens Hook
Location: `/hooks/useDesignTokens.ts`

```typescript
const { getColor, colors } = useDesignTokens();

// Quick access
const primaryColor = colors.primary; // from tokens or fallback

// Specific token
const color = getColor('primary.main', '#fallback');
```

### 2. Components Updated
✅ Hero - Primary/Secondary colors from tokens
✅ Features - Accent colors from tokens  
✅ CTASection - Gradient colors from tokens
✅ Testimonials - Accent colors from tokens
✅ Pricing - Accent/Button colors from tokens
✅ Header - Accent colors from tokens
✅ Footer - Link hover colors from tokens
🔄 In Progress: Faq, Leads, Newsletter, Portfolio, Services, Team, Video, HowItWorks, Slideshow

### 3. Pattern for Updating Components

Every component that uses colors should:

1. Import the hook:
```typescript
import { useDesignTokens } from '../hooks/useDesignTokens';
```

2. Use the hook at component start:
```typescript
const MyComponent: React.FC<Props> = ({ colors, ...rest }) => {
  const { getColor } = useDesignTokens();
  
  const actualColors = {
    primary: getColor('primary.main', colors.primary),
    secondary: getColor('secondary.main', colors.secondary),
    background: colors.background, // keep specific if needed
    text: colors.text,
  };
  
  // Use actualColors instead of colors throughout
};
```

3. Replace all `colors.X` with `actualColors.X`

### 4. Backward Compatibility

- Components still receive `colors` prop
- Design Tokens override prop values when available
- If Design Tokens are null/missing, prop values are used
- Visual appearance stays identical

### 5. Current Token Values

Initialized with app's current colors:
- Primary: #4f46e5 (Indigo)
- Secondary: #10b981 (Green)
- Success: #10b981
- Warning: #f59e0b
- Error: #ef4444
- Info: #3b82f6

### 6. Benefits

✅ Centralized color management
✅ Change colors globally from one place
✅ Consistent branding across all components
✅ Easy theme switching
✅ No visual changes to existing designs

### 7. Testing

Run the app and verify:
1. All components render correctly
2. Colors match previous design
3. Design Tokens editor works
4. Changes in tokens reflect in components

### 8. Next Steps for Complete Integration

Remaining components to update:
- Testimonials
- Pricing  
- Header
- Footer
- Faq
- Leads
- Newsletter
- Portfolio
- Services
- Team
- Video
- HowItWorks
- Slideshow

Use the same pattern as Hero, Features, and CTASection.

## Files Modified

- `/hooks/useDesignTokens.ts` - New hook for token access
- `/components/Hero.tsx` - ✅ Updated
- `/components/Features.tsx` - ✅ Updated
- `/components/CTASection.tsx` - ✅ Updated
- `/types.ts` - Updated DesignTokens interface
- `/utils/designTokenApplier.ts` - Fixed token application
- `/contexts/EditorContext.tsx` - Added fallback initialization
- `/components/dashboard/admin/DesignTokensEditor.tsx` - Current app colors as defaults

## Design Tokens Editor

Access via: Dashboard → Super Admin → Design Tokens

- Edit colors, typography, spacing, shadows
- Apply to entire project with one click
- Changes persist to Firebase
- Real-time updates across app

## Important Notes

⚠️ All changes are backward compatible
⚠️ No visual changes unless tokens are explicitly modified
⚠️ Components work with or without Design Tokens
⚠️ System initialized with current app colors

---
Last Updated: 2025-11-23
Status: Integration in Progress (Core components complete)

