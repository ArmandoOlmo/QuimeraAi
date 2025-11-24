# Chat Components

This directory contains the unified chat system for Quimera AI.

## Architecture

```
ChatCore (Core Component)
  ├── All chat logic
  ├── Message handling
  ├── Gemini AI integration
  ├── Voice/Live sessions
  └── Lead capture system

ChatSimulator (Dashboard Wrapper)
  └── Uses ChatCore in Quimera Chat dashboard

ChatbotWidget (Website Wrapper)
  └── Uses ChatCore with floating button for landing pages

EmbedWidget (External Embeddable)
  └── Uses ChatCore for external websites
```

## Components

### ChatCore
The main chat component that contains all shared logic. It handles:
- Text and voice conversations
- System instruction building with FAQs and knowledge base
- Lead capture (pre-chat forms, intent detection, exit intent)
- Real-time voice sessions with Gemini Live API
- Message history and UI rendering

**Props:**
```typescript
interface ChatCoreProps {
  config: AiAssistantConfig;       // AI assistant configuration
  project: Project;                 // Project details
  appearance: ChatAppearanceConfig; // UI customization
  onLeadCapture?: (leadData: Partial<Lead>) => Promise<void>;
  className?: string;
  showHeader?: boolean;
  headerActions?: React.ReactNode;
  onClose?: () => void;
  autoOpen?: boolean;
  isEmbedded?: boolean;
}
```

### ChatSimulator
Wrapper for the dashboard "Quimera Chat" view. Displays ChatCore in the dashboard for testing and configuration.

### ChatbotWidget
Floating chat widget for landing pages with:
- Customizable button position and style
- Open/close animations
- All ChatCore features

### EmbedWidget
Embeddable widget for external websites:
- Loads configuration from API
- Standalone component for third-party sites
- Captures leads via API endpoint

## Embed Widget Usage

### Basic Installation

Add this script to any website:

```html
<script 
  src="https://quimera.app/widget-embed.js" 
  data-project-id="YOUR_PROJECT_ID"
></script>
```

### Programmatic Installation

```javascript
(function() {
  var script = document.createElement('script');
  script.src = 'https://quimera.app/widget-embed.js';
  script.dataset.projectId = 'YOUR_PROJECT_ID';
  script.dataset.apiUrl = 'https://quimera.app/api/widget'; // optional
  document.body.appendChild(script);
})();
```

### Programmatic Control

```javascript
// Open the widget
window.QuimeraWidget.open();

// Close the widget
window.QuimeraWidget.close();

// Toggle the widget
window.QuimeraWidget.toggle();
```

## Lead Capture Flow

All three wrappers share the same lead capture system:

1. **Pre-chat Form** (optional) - Captures info before conversation starts
2. **Intent Detection** - Triggers on high-intent keywords
3. **Threshold Trigger** - After N messages
4. **Exit Intent** - Last chance when closing
5. **Lead Scoring** - Automatic scoring based on engagement

## Source Tags

Leads are tagged by source:
- `quimera-chat` - From dashboard ChatSimulator
- `chatbot-widget` - From landing page widget
- `embedded-widget` - From external embedded widget

## Development

To modify the chat logic, edit `ChatCore.tsx`. Changes will automatically apply to all three use cases.

To modify wrapper-specific behavior (button styles, positioning, etc.), edit the respective wrapper component.

