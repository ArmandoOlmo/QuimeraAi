import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // Buscar la API key en múltiples variables posibles (con y sin prefijo VITE_)
    // Vite expone automáticamente variables con prefijo VITE_, pero también podemos leer otras durante build
    // Primero intentar obtener de process.env directamente, luego de loadEnv
    const apiKey = process.env.VITE_GEMINI_API_KEY ||
                   env.VITE_GEMINI_API_KEY || 
                   env.VITE_GOOGLE_AI_API_KEY || 
                   env.GEMINI_API_KEY || 
                   env.GOOGLE_AI_API_KEY ||
                   null; // Usar null en lugar de cadena vacía para mejor detección
    
    // Log para debugging (EN TODOS LOS MODOS para ayudar con el troubleshooting)
    if (apiKey) {
        console.log(`✅ Google API Key encontrada en variables de entorno (mode: ${mode}, length: ${apiKey.length})`);
    } else {
        console.warn(`⚠️ Google API Key NO encontrada. Verifica tus variables de entorno (mode: ${mode})`);
        console.warn('Variables checked:', {
            'process.env.VITE_GEMINI_API_KEY': !!process.env.VITE_GEMINI_API_KEY,
            'env.VITE_GEMINI_API_KEY': !!env.VITE_GEMINI_API_KEY,
            'env.VITE_GOOGLE_AI_API_KEY': !!env.VITE_GOOGLE_AI_API_KEY
        });
    }
    
    return {
      server: {
        port: 3000,
        host: true, // Permite acceso desde cualquier IP (equivalente a '0.0.0.0' pero más compatible)
        open: true, // Abre el navegador automáticamente
      },
      plugins: [react()],
      define: {
        // Inyectar null si no hay API key, para mejor detección en el código cliente
        'process.env.API_KEY': apiKey ? JSON.stringify(apiKey) : 'null',
        'process.env.GEMINI_API_KEY': apiKey ? JSON.stringify(apiKey) : 'null',
        // También exponer en import.meta.env para compatibilidad con Vite
        'import.meta.env.VITE_GEMINI_API_KEY': apiKey ? JSON.stringify(apiKey) : 'null',
        'import.meta.env.GEMINI_API_KEY': apiKey ? JSON.stringify(apiKey) : 'null'
      },
      envPrefix: ['VITE_', 'GEMINI_', 'GOOGLE_AI_'],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
