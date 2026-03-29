# Quimera.ai Subdomain Setup Guide

Complete guide for deploying the subdomain architecture.

## Prerequisites

- Access to [Cloudflare Dashboard](https://dash.cloudflare.com) for `quimera.ai`
- Firebase CLI installed and authenticated
- Google Cloud SDK (`gcloud`) installed

---

## 1. Cloudflare DNS Records

### Core Records

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| `A` | `app` | Cloud Run IP | ✅ Proxied |
| `CNAME` | `*` | `quimera-ssr-{hash}.us-central1.run.app` | ✅ Proxied |

> **Note:** The wildcard `*` record catches all `username.quimera.ai` subdomains.
> Wildcard SSL requires Cloudflare **Advanced Certificate Manager** ($10/mo) or higher plan.

### Verify DNS Propagation

```bash
dig app.quimera.ai +short
dig testuser.quimera.ai +short
```

## 2. Firebase Hosting Multi-Site

```bash
# Create the app site
firebase hosting:sites:create quimera-app

# Set deploy targets
firebase target:apply hosting marketing quimeraai
firebase target:apply hosting app quimera-app

# Deploy both sites
firebase deploy --only hosting:marketing,hosting:app
```

### firebase.json Changes (if needed)

Both sites serve the same SPA build — client-side `subdomainUtils.ts` handles routing:

```json
{
  "hosting": [
    {
      "site": "quimeraai",
      "target": "marketing",
      "public": "dist",
      "rewrites": [{ "source": "**", "destination": "/index.html" }]
    },
    {
      "site": "quimera-app",
      "target": "app",
      "public": "dist",
      "rewrites": [{ "source": "**", "destination": "/index.html" }]
    }
  ]
}
```

## 3. Cloud Run Domain Mappings

```bash
# Map app.quimera.ai to SSR service
gcloud run domain-mappings create \
  --service=quimera-ssr \
  --domain=app.quimera.ai \
  --region=us-central1

# Map wildcard for user subdomains
gcloud run domain-mappings create \
  --service=quimera-ssr \
  --domain=*.quimera.ai \
  --region=us-central1
```

## 4. Firestore Requirements

### User Documents

Users need a `username` field for subdomain resolution:

```
/users/{userId}
  - username: "johndoe"        // ← Used for johndoe.quimera.ai
  - defaultProjectId: "abc123" // ← Optional, primary project
```

### Security Rules

Add read access for username lookups:

```javascript
match /users/{userId} {
  allow read: if request.auth != null;
  // Public username queries (for subdomain resolution)
  allow list: if request.query.limit <= 1
               && 'username' in request.query.orderBy;
}
```

## 5. Local Testing

Since `localhost` doesn't support real subdomains, use query params:

```
http://localhost:3000/                     → Marketing site (root)
http://localhost:3000/?subdomain=app       → Dashboard (app)
http://localhost:3000/?subdomain=johndoe   → User site (user subdomain)
```

## 6. Post-Deploy Verification

| URL | Expected |
|-----|----------|
| `https://quimera.ai` | Marketing landing |
| `https://quimera.ai/pricing` | Pricing page |
| `https://quimera.ai/about` | About page |
| `https://app.quimera.ai` | Dashboard (auth gated) |
| `https://johndoe.quimera.ai` | User's published site |
| `https://nonexistent.quimera.ai` | 404 page |

---

## Architecture Diagram

```
                    ┌──────────────────┐
                    │    Cloudflare    │
                    │   DNS + Proxy    │
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                     │
  quimera.ai          app.quimera.ai      user.quimera.ai
        │                    │                     │
        ▼                    ▼                     ▼
  ┌──────────┐      ┌──────────┐           ┌──────────┐
  │ Firebase │      │ Firebase │           │ Cloud Run│
  │ Hosting  │      │ Hosting  │           │   SSR    │
  │(marketing│      │  (app)   │           │ Server   │
  └──────────┘      └──────────┘           └──────────┘
        │                    │                     │
        └────────────────────┴─────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │   Firestore DB   │
                    │  users/projects  │
                    └──────────────────┘
```
