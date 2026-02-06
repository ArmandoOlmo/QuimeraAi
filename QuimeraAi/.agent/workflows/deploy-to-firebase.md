---
description: Commit git changes and deploy QuimeraAi to Firebase Hosting
---

# 🚀 Commit Git and Deploy to Firebase

This workflow commits changes to git and deploys QuimeraAi to Firebase Hosting.

## Prerequisites
- Working directory: `/Users/armandoolmo/QuimeraAppCursor/QuimeraAi`
- Must have git configured
- Firebase CLI must be available

---

## Step 1: Check for Changes
// turbo
```bash
cd /Users/armandoolmo/QuimeraAppCursor/QuimeraAi && git status
```

If there are no changes, skip to **Step 5** (deploy only).

---

## Step 2: Stage All Changes
// turbo
```bash
cd /Users/armandoolmo/QuimeraAppCursor/QuimeraAi && git add .
```

---

## Step 3: Commit Changes
Ask the user for a commit message, or generate one based on the recent changes.

```bash
cd /Users/armandoolmo/QuimeraAppCursor/QuimeraAi && git commit -m "COMMIT_MESSAGE_HERE"
```

---

## Step 4: Push to Remote
```bash
cd /Users/armandoolmo/QuimeraAppCursor/QuimeraAi && git push origin main
```

**NOTE**: Pushing to `main` triggers automatic deployment via GitHub Actions. You can verify deployment at: https://github.com/ArmandoOlmo/QuimeraAi/actions

---

## Step 5: (Optional) Manual Firebase Deploy

If GitHub Actions deployment is slow or you need an immediate deploy:

### 5a. Build the project
// turbo
```bash
cd /Users/armandoolmo/QuimeraAppCursor/QuimeraAi && npm run build
```

### 5b. Deploy to Firebase Hosting
```bash
cd /Users/armandoolmo/QuimeraAppCursor/QuimeraAi && firebase deploy --only hosting --project quimeraai
```

---

## Verification

After deployment completes:

1. **Check GitHub Actions**: https://github.com/ArmandoOlmo/QuimeraAi/actions
   - Status should be green ✅

2. **Test Production URLs**:
   - Primary: https://quimera.ai
   - Firebase: https://quimeraai.web.app

3. **Hard refresh** the browser: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

---

## Troubleshooting

### Deploy failed in GitHub Actions
- Check the action logs at: https://github.com/ArmandoOlmo/QuimeraAi/actions
- Review which step failed

### Changes not appearing in production
- Wait 1-2 minutes after push
- Hard refresh the browser
- Verify the workflow completed in GitHub Actions

### Rollback if needed
```bash
firebase hosting:rollback --project quimeraai
```

---

## Key URLs

| Resource | URL |
|----------|-----|
| Production | https://quimera.ai |
| Firebase Hosting | https://quimeraai.web.app |
| GitHub Actions | https://github.com/ArmandoOlmo/QuimeraAi/actions |
| Firebase Console | https://console.firebase.google.com/project/quimeraai |
