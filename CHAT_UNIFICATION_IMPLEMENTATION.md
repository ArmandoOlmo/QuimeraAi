# Chat Unification Implementation Guide

This document describes the implementation of the unified chat system for Quimera AI.

## Summary

The chat system has been refactored into a unified architecture where all chat functionality is centralized in `ChatCore`, with three specialized wrappers for different use cases:

1. **ChatCore** - Core chat component with all shared logic
2. **ChatSimulator** - Dashboard wrapper for "Quimera Chat"
3. **ChatbotWidget** - Landing page widget with floating button
4. **EmbedWidget** - Embeddable widget for external websites

## Architecture

```
┌─────────────────────────────────────────┐
│           ChatCore.tsx                  │
│  ┌───────────────────────────────────┐  │
│  │ • Message State Management        │  │
│  │ • buildSystemInstruction()        │  │
│  │ • Text Chat (handleSend)          │  │
│  │ • Voice Chat (Gemini Live API)    │  │
│  │ • Lead Capture System             │  │
│  │   - Pre-chat forms                │  │
│  │   - Intent detection              │  │
│  │   - Exit intent                   │  │
│  │   - Lead scoring                  │  │
│  │ • Audio utilities                 │  │
│  │ • UI rendering                    │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
             ▲         ▲         ▲
             │         │         │
    ┌────────┴────┐   │   ┌─────┴──────┐
    │             │   │   │            │
┌───┴────┐  ┌────┴───┴───┴───┐  ┌────┴──────┐
│ChatSim │  │ ChatbotWidget  │  │ EmbedWidget│
│ulator  │  │                │  │           │
│        │  │ + Floating btn │  │ + API load│
│        │  │ + Positioning  │  │ + External│
└────────┘  └────────────────┘  └───────────┘
Dashboard    Landing Page        External Sites
```

## Files Created/Modified

### Created Files

1. **`components/chat/ChatCore.tsx`** (945 lines)
   - Central chat component with all logic
   - Props interface for customization
   - Complete lead capture system
   - Voice and text chat integration

2. **`components/chat/EmbedWidget.tsx`** (149 lines)
   - Embeddable widget for external sites
   - Loads config from API
   - Submits leads via API

3. **`components/chat/README.md`**
   - Documentation for chat system
   - Usage examples
   - Architecture overview

4. **`functions/src/widgetApi.ts`** (220 lines)
   - Cloud Functions for widget API
   - `getWidgetConfig` - Returns widget configuration
   - `submitWidgetLead` - Captures leads
   - `trackWidgetAnalytics` - Analytics tracking

5. **`functions/src/index.ts`**
   - Exports all cloud functions

6. **`functions/package.json`**
   - Dependencies for cloud functions

7. **`functions/tsconfig.json`**
   - TypeScript configuration

8. **`functions/.gitignore`**
   - Git ignore for functions directory

9. **`functions/README.md`**
   - API documentation
   - Setup instructions
   - Security considerations

10. **`public/widget-embed.js`** (150 lines)
    - Embed script for external websites
    - Handles React loading
    - Programmatic API

### Modified Files

1. **`components/dashboard/ai/ChatSimulator.tsx`**
   - Before: 610 lines with duplicated logic
   - After: 47 lines - simple wrapper around ChatCore
   - Improvement: 92% code reduction

2. **`components/ChatbotWidget.tsx`**
   - Before: 890 lines with duplicated logic
   - After: 146 lines - floating button + ChatCore
   - Improvement: 84% code reduction

## Key Features

### 1. Unified System Instruction

All chat instances now use the same `buildSystemInstruction()` that includes:
- Business profile
- Products & services
- Policies & contact info
- FAQs with Q&A pairs
- Knowledge base documents (up to 5000 chars each)
- Special instructions
- Language detection instructions

### 2. Complete Lead Capture

All instances share the same lead capture flow:
- **Pre-chat Form**: Optional form before chat starts
- **Intent Detection**: Triggers on keywords like "price", "buy", "demo"
- **Threshold Trigger**: After N messages (configurable)
- **Exit Intent**: Last chance when closing widget
- **Lead Scoring**: Automatic scoring based on:
  - Contact info completeness (45 points max)
  - Engagement/message count (25 points max)
  - High-intent keywords (20 points max)
  - Total: 100 points max

### 3. Source Tracking

Leads are tagged by source:
```typescript
{
  source: 'quimera-chat',      // Dashboard ChatSimulator
  source: 'chatbot-widget',     // Landing page widget
  source: 'embedded-widget'     // External embeddable
}
```

### 4. Voice Integration

All instances support Gemini Live API for voice conversations:
- Real-time audio streaming
- Configurable voice personalities
- Audio visualizer
- Seamless fallback to text chat

## API Endpoints

### Widget Configuration
```
GET /api/widget/:projectId
```
Returns AI assistant config and project details.

### Lead Submission
```
POST /api/widget/:projectId/leads
```
Captures leads from embedded widgets.

### Analytics
```
POST /api/widget/:projectId/analytics
```
Tracks widget interactions.

## Deployment Steps

### 1. Deploy Cloud Functions

```bash
cd functions
npm install
npm run build
npm run deploy
```

### 2. Configure Firebase Hosting

Add to `firebase.json`:
```json
{
  "hosting": {
    "public": "dist",
    "rewrites": [
      {
        "source": "/api/widget/**",
        "function": "getWidgetConfig"
      }
    ]
  }
}
```

### 3. Update Firestore Rules

```javascript
match /projects/{projectId} {
  allow read: if resource.data.aiAssistantConfig.isActive == true;
}

match /leads/{leadId} {
  allow create: if true; // Allow public lead creation
}
```

### 4. Deploy Widget Script

Ensure `public/widget-embed.js` is served from your domain.

## Usage Examples

### Internal (Dashboard)
```tsx
<ChatSimulator 
  config={aiAssistantConfig} 
  project={activeProject} 
/>
```

### Landing Page
```tsx
<ChatbotWidget isPreview={false} />
```

### External Embedding
```html
<script 
  src="https://quimera.app/widget-embed.js" 
  data-project-id="YOUR_PROJECT_ID"
></script>
```

## Testing Checklist

- [ ] ChatSimulator renders in dashboard
- [ ] ChatSimulator captures leads with 'quimera-chat' tag
- [ ] ChatSimulator voice session works
- [ ] ChatbotWidget appears on landing page
- [ ] ChatbotWidget floating button works
- [ ] ChatbotWidget captures leads with 'chatbot-widget' tag
- [ ] ChatbotWidget voice session works
- [ ] EmbedWidget loads from API
- [ ] EmbedWidget submits leads via API
- [ ] Cloud Functions deploy successfully
- [ ] API endpoints return correct data
- [ ] CORS headers work correctly
- [ ] All three sources show identical chat behavior
- [ ] System instructions are identical across all instances
- [ ] Lead scoring works consistently

## Benefits

### Code Quality
- **92% reduction** in ChatSimulator code
- **84% reduction** in ChatbotWidget code
- Single source of truth for chat logic
- Easier to maintain and debug

### Consistency
- Identical responses across all chat instances
- Unified system instructions
- Same lead capture flow
- Consistent user experience

### Scalability
- Easy to add new chat contexts
- Centralized improvements benefit all instances
- Simplified testing

### Features
- Complete lead capture system
- Voice chat support
- Intent detection
- Lead scoring
- Exit intent

## Future Enhancements

1. **Widget Builder**: Visual tool to customize embedded widgets
2. **Analytics Dashboard**: Track widget performance
3. **A/B Testing**: Test different configurations
4. **Webhooks**: Real-time lead notifications
5. **Multi-language**: Enhanced language detection
6. **Custom Branding**: Per-site customization for embedded widgets
7. **Rate Limiting**: Prevent API abuse
8. **Caching**: Improve performance

## Troubleshooting

### Issue: ChatCore not found
**Solution**: Ensure import path is correct: `import ChatCore from './chat/ChatCore'` or `'../chat/ChatCore'`

### Issue: Lead capture not working
**Solution**: Check that `onLeadCapture` callback is properly implemented and `addLead` function is available in context

### Issue: Voice session fails
**Solution**: Verify Gemini API key is configured and `enableLiveVoice` is true in config

### Issue: Widget API returns 404
**Solution**: Deploy cloud functions and verify endpoint URLs in `firebase.json`

### Issue: CORS errors
**Solution**: Check CORS headers in cloud functions are set correctly

## Conclusion

The unified chat architecture provides:
- ✅ Single source of truth
- ✅ Consistent behavior across contexts
- ✅ 85%+ code reduction
- ✅ Complete lead capture
- ✅ Voice support
- ✅ Embeddable widget
- ✅ Scalable architecture

All chat instances now use the exact same logic from ChatCore, ensuring consistency and easier maintenance.



