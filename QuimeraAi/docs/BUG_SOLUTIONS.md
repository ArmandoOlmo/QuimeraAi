# Quimera.ai - Bug Solutions & Troubleshooting Guide

This document serves as a knowledge base for solving common issues encountered during the development of Quimera.ai.

## 1. UI & Visual Glitches

### Mobile Sidebar/Menu Not Visible or Cut Off
- **Symptom**: The sidebar navigation on mobile devices is hidden behind other content, or the bottom items are not accessible.
- **Root Cause**: Often caused by `h-screen` not accounting for mobile browser address bars (Safari/Chrome UI) or low `z-index`.
- **Solution**: 
  - Use `h-[100dvh]` (dynamic viewport height) instead of `h-screen` for full-height fixed elements.
  - Ensure `z-index` is set to `50` or higher for overlays and sidebars.
  - Add `pb-safe` or extra padding at the bottom of scrollable containers.

### Text Invisible in Dark/Light Mode Switch
- **Symptom**: Text disappears or becomes unreadable when switching themes.
- **Root Cause**: Hardcoded hex values (e.g., `text-gray-900`) used without corresponding dark mode variants.
- **Solution**: 
  - Use semantic Tailwind classes defined in `tailwind.config.js` like `text-foreground`, `text-muted-foreground`, `bg-card`.
  - If hardcoding is necessary, always provide the dark variant: `text-gray-900 dark:text-gray-100`.

### Z-Index Wars (Modals behind Header)
- **Symptom**: Modals or dropdowns appear underneath the sticky header.
- **Solution**: 
  - Standardize Z-indices:
    - Content: 0-10
    - Sticky Headers: 40
    - Sidebars/Drawers: 50
    - Modals/Overlays: 50+
    - Toasts/Alerts: 100

## 2. Firebase & Authentication

### "Firebase: Error (auth/network-request-failed)"
- **Symptom**: Authentication calls fail immediately.
- **Root Cause**: CORS issues or network blocking.
- **Solution**: 
  - Check if `firebase.ts` config matches the project settings in Firebase Console.
  - If developing locally, ensure your localhost port is authorized in Firebase Authentication settings.

### Firestore Permission Denied
- **Symptom**: Unable to read/write user data.
- **Root Cause**: Security rules likely restrict access to `request.auth.uid`.
- **Solution**: Ensure you are querying collections where the document ID matches the authenticated User ID, or that security rules allow the specific query pattern.

## 3. GenAI & LLM Integration

### JSON Parsing Error (Unexpected token in JSON)
- **Symptom**: The app crashes when processing AI responses for JSON data (e.g., generating websites).
- **Root Cause**: The LLM often wraps JSON in Markdown code blocks (e.g., ` ```json ... ``` `) or adds conversational text.
- **Solution**: Always run the raw response through a cleaner function before `JSON.parse()`:
  ```javascript
  const cleanJson = (text) => {
      return text.replace(/```json\n?|```/g, '').trim();
  };
  ```

### 403/400 API Errors from Gemini
- **Symptom**: Request fails with permission or bad request error.
- **Root Cause**: Missing API Key or invalid model name.
- **Solution**: 
  - Ensure `process.env.API_KEY` (or the user-selected key in `window.aistudio`) is valid.
  - Verify the model name (e.g., use `gemini-2.5-flash` or `gemini-3-pro-preview`, avoid deprecated `1.5` models).

## 4. State Management (React Context)

### "Cannot update a component while rendering a different component"
- **Symptom**: Console warning during state updates.
- **Root Cause**: Calling a state setter (e.g., `setView`, `setTheme`) directly inside the render body of a component.
- **Solution**: Move side effects to `useEffect` or event handlers (`onClick`).

### Stale State in Event Listeners
- **Symptom**: Event listeners (like `keydown` or `mousedown`) use old values of state variables.
- **Root Cause**: Closures capturing the state at the time of render.
- **Solution**: Use `useRef` to hold mutable values that need to be accessed inside listeners, or include the state variable in the `useEffect` dependency array (and unbind/rebind correctly).
