/**
 * Update Cloudflare Worker to route to Firebase Hosting
 */

const WORKERS_TOKEN = 'k9CPydvzVanjqBQBQMAYg_3cq8O6glfnocbqdYdJ';
const ACCOUNT_ID = 'ccb57f67da1dab2a06002657d8ea5fb1';

const WORKER_CODE = `
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const originalHost = url.hostname;
    
    // Health check
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }
    
    // Redirigir a Firebase Hosting
    url.hostname = "quimeraai.web.app";
    
    const reqHeaders = new Headers(request.headers);
    reqHeaders.set("Host", "quimeraai.web.app");
    reqHeaders.set("X-Forwarded-Host", originalHost);
    reqHeaders.set("X-Original-Host", originalHost);
    reqHeaders.delete("If-None-Match");
    reqHeaders.delete("If-Modified-Since");
    
    const response = await fetch(url.toString(), {
      method: request.method,
      headers: reqHeaders,
      body: request.body,
      redirect: 'follow',
      cf: { 
        cacheTtl: 0,
        cacheEverything: false,
        cacheKey: url.toString() + '-' + Date.now()
      }
    });
    
    // Clone response and modify headers
    const resHeaders = new Headers(response.headers);
    const contentType = resHeaders.get('content-type') || '';
    
    // Disable caching for HTML and JS files
    if (contentType.includes('text/html') || contentType.includes('javascript')) {
      resHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      resHeaders.set('Pragma', 'no-cache');
      resHeaders.set('Expires', '0');
      resHeaders.delete('ETag');
      resHeaders.delete('Last-Modified');
    }
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: resHeaders
    });
  }
}
`;

async function updateWorker() {
    console.log('📤 Actualizando Worker quimera-router...');
    console.log('   Nuevo destino: quimeraai.web.app\n');
    
    // Create multipart form with ES modules format
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substr(2);
    
    const body = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="worker.js"; filename="worker.js"',
        'Content-Type: application/javascript+module',
        '',
        WORKER_CODE,
        `--${boundary}`,
        'Content-Disposition: form-data; name="metadata"',
        'Content-Type: application/json',
        '',
        JSON.stringify({ main_module: 'worker.js' }),
        `--${boundary}--`
    ].join('\r\n');
    
    const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/quimera-router`,
        {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${WORKERS_TOKEN}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            body: body
        }
    );
    
    const result = await res.json();
    
    if (result.success) {
        console.log('✅ Worker actualizado exitosamente!');
        console.log('   El tráfico de quimeraapp.com ahora va a Firebase Hosting');
    } else {
        console.log('❌ Error:', JSON.stringify(result.errors, null, 2));
    }
}

updateWorker().catch(console.error);
