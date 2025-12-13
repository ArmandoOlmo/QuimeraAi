# Chat Components

This directory contains the unified chat system for Quimera AI.

## Architecture

```
ChatCore (Core Component)
  ├── All chat logic
  ├── Message handling
  ├── Gemini AI integration
  ├── Voice/Live sessions
  ├── Lead capture system
  └── E-commerce integration

ChatSimulator (Dashboard Wrapper)
  └── Uses ChatCore in Quimera Chat dashboard

ChatbotWidget (Website Wrapper)
  └── Uses ChatCore with floating button for landing pages

EmbedWidget (External Embeddable)
  └── Uses ChatCore for external websites

Social Channels (Multi-platform)
  ├── WhatsApp Business API
  ├── Facebook Messenger
  ├── Instagram DMs
  └── Unified Inbox Dashboard
```

## Components

### ChatCore
The main chat component that contains all shared logic. It handles:
- Text and voice conversations
- System instruction building with FAQs and knowledge base
- Lead capture (pre-chat forms, intent detection, exit intent)
- Real-time voice sessions with Gemini Live API
- Message history and UI rendering
- E-commerce integration (order lookup, product info)

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
  currentPageContext?: PageContext; // Current section being viewed
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

## Hooks

### useEcommerceChat
E-commerce integration hook for order lookups and product information:
```typescript
const {
  checkOrderStatus,    // Look up order by ID or email
  getProductInfo,      // Search products
  getShippingInfo,     // Get shipping methods
  getReturnPolicy,     // Get return policy
  formatOrderResponse, // Format order for chat display
  formatProductResponse,
} = useEcommerceChat(projectId, userId, language);
```

### useSocialChat
Social media conversation management:
```typescript
const {
  conversations,           // All conversations
  activeConversation,      // Currently selected
  stats,                   // Unread counts, etc.
  selectConversation,      // Open a conversation
  sendMessage,             // Send reply
  updateConversationStatus, // Close, escalate, etc.
  convertToLead,           // Create CRM lead
} = useSocialChat(projectId, userId);
```

### useSocialChatAnalytics
Analytics and metrics for social chat:
```typescript
const {
  analytics,       // Full metrics object
  period,          // Current period
  setPeriod,       // Change period
  refresh,         // Refresh data
} = useSocialChatAnalytics(projectId);
```

## Social Channels Setup

### WhatsApp Business API
1. Go to Meta Business Suite → WhatsApp → API Setup
2. Copy Phone Number ID and Business Account ID
3. Generate a permanent access token
4. Configure webhook URL and verify token in Quimera dashboard

### Facebook Messenger
1. Create a Facebook App with Messenger permissions
2. Get Page ID and Page Access Token
3. Configure webhook in Facebook Developer Console
4. Enable messaging permissions

### Instagram DMs
1. Connect Instagram Business account to Facebook Page
2. Get Instagram Account ID
3. Use Facebook Page access token
4. Enable messaging API in Facebook Developer Console

## Embed Widget Usage

### Basic Installation

Add this script to any website:

```html
<script 
  src="https://quimera.ai/widget-embed.js" 
  data-project-id="YOUR_PROJECT_ID"
></script>
```

### Programmatic Installation

```javascript
(function() {
  var script = document.createElement('script');
  script.src = 'https://quimera.ai/widget-embed.js';
  script.dataset.projectId = 'YOUR_PROJECT_ID';
  script.dataset.apiUrl = 'https://quimera.ai/api/widget'; // optional
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

All wrappers share the same lead capture system:

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
- `social-whatsapp` - From WhatsApp conversation
- `social-facebook` - From Facebook Messenger
- `social-instagram` - From Instagram DMs

## Cloud Functions

Social channel webhooks are handled by Cloud Functions in `/functions/src/socialChannels/`:

- `facebookWebhook` / `facebookWebhookVerify`
- `whatsappWebhook` / `whatsappWebhookVerify`
- `instagramWebhook` / `instagramWebhookVerify`
- `processIncomingMessage` - AI response generation
- `sendOutboundMessage` - Send messages via platform APIs

## Development

To modify the chat logic, edit `ChatCore.tsx`. Changes will automatically apply to all use cases.

To modify wrapper-specific behavior (button styles, positioning, etc.), edit the respective wrapper component.

For social channel integrations, modify files in `/functions/src/socialChannels/`.
























