# Quimera AI Cloud Functions

Cloud Functions for Firebase that power the Quimera AI widget API.

## Functions

### Widget API

#### 1. `getWidgetConfig`
**Endpoint:** `GET /api/widget/:projectId`

Returns the configuration for an embedded chat widget.

**Response:**
```json
{
  "config": {
    "agentName": "QuimeraBot",
    "isActive": true,
    "appearance": { ... },
    ...
  },
  "project": {
    "id": "project123",
    "name": "My Business",
    "brandIdentity": { ... }
  }
}
```

**Error Responses:**
- `400`: Project ID is required
- `403`: Chat widget is not active
- `404`: Project not found
- `500`: Internal server error

#### 2. `submitWidgetLead`
**Endpoint:** `POST /api/widget/:projectId/leads`

Captures a lead from an embedded widget.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "message": "Interested in your services",
  "conversationTranscript": "...",
  "leadScore": 85,
  "tags": ["embedded-widget", "high-intent"]
}
```

**Response:**
```json
{
  "success": true,
  "leadId": "lead123"
}
```

**Error Responses:**
- `400`: Name and email are required / Project ID is required
- `403`: Chat widget is not active
- `404`: Project not found
- `500`: Internal server error

#### 3. `trackWidgetAnalytics`
**Endpoint:** `POST /api/widget/:projectId/analytics`

Tracks widget interactions for analytics.

**Request Body:**
```json
{
  "event": "widget_opened",
  "sessionId": "session123",
  "referrer": "https://example.com",
  "metadata": { ... }
}
```

## Setup

### Prerequisites
- Node.js 18 or higher
- Firebase CLI installed (`npm install -g firebase-tools`)
- Firebase project initialized

### Installation

1. Navigate to functions directory:
```bash
cd functions
```

2. Install dependencies:
```bash
npm install
```

3. Build the functions:
```bash
npm run build
```

### Local Development

Run functions locally with emulators:
```bash
npm run serve
```

The functions will be available at:
- `http://localhost:5001/[PROJECT_ID]/us-central1/getWidgetConfig`
- `http://localhost:5001/[PROJECT_ID]/us-central1/submitWidgetLead`
- `http://localhost:5001/[PROJECT_ID]/us-central1/trackWidgetAnalytics`

### Deployment

Deploy functions to Firebase:
```bash
npm run deploy
```

Or deploy from the root directory:
```bash
firebase deploy --only functions
```

### View Logs

```bash
npm run logs
```

## Security Considerations

1. **CORS**: Functions have CORS enabled for all origins (`*`). Consider restricting this in production.

2. **Rate Limiting**: Implement rate limiting to prevent abuse:
   ```typescript
   // Add to function config
   {
     rateLimit: {
       maxRequests: 100,
       period: '1m'
     }
   }
   ```

3. **Data Sanitization**: Always validate and sanitize input data before saving to Firestore.

4. **API Keys**: Never expose sensitive API keys in widget configuration responses.

## Firebase Configuration

Ensure these Firestore rules are set:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Widget API can read projects with active chatbots
    match /projects/{projectId} {
      allow read: if resource.data.aiAssistantConfig.isActive == true;
    }
    
    // Widget API can create leads
    match /leads/{leadId} {
      allow create: if request.auth == null; // Allow unauthenticated lead creation
    }
  }
}
```

## Monitoring

Monitor function performance in Firebase Console:
1. Go to Firebase Console
2. Select your project
3. Navigate to Functions
4. View metrics, logs, and errors

## Troubleshooting

### Function not deploying
- Check Node.js version: `node --version`
- Verify Firebase CLI is logged in: `firebase login`
- Check function logs: `firebase functions:log`

### CORS errors
- Ensure CORS headers are set correctly
- Check browser console for specific error messages

### Rate limiting issues
- Implement caching on client side
- Add rate limiting using Firebase Extensions

## Next Steps

1. Set up Firebase Hosting to serve `widget-embed.js`
2. Configure custom domain for widget API
3. Implement analytics dashboard
4. Add webhooks for real-time lead notifications
5. Set up monitoring alerts































