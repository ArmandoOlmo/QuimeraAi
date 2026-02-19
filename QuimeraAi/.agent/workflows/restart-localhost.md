---
description: Restart the local dev server when localhost is unreachable. Always run this when open_browser_url fails with ERR_CONNECTION_REFUSED.
---

# 🔄 Restart Localhost Dev Server

**When to use**: Automatically run this workflow whenever `open_browser_url` fails with `ERR_CONNECTION_REFUSED` or the localhost is unreachable. Do NOT ask the user — just restart it.

## Step 1: Kill existing processes on port 3000
// turbo
```bash
lsof -ti:3000 | xargs kill -9 2>/dev/null; echo "killed"
```

## Step 2: Start the dev server
// turbo
```bash
cd /Users/armandoolmo/QuimeraAppCursor/QuimeraAi && npm run dev &
```

Wait ~5 seconds for the server to start, then retry opening the page.
