import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // Buscar la API key en múltiples variables posibles (con y sin prefijo VITE_)
    // Vite expone automáticamente variables con prefijo VITE_, pero también podemos leer otras durante build
    const apiKey = env.VITE_GEMINI_API_KEY || 
                   env.VITE_GOOGLE_AI_API_KEY || 
                   env.GEMINI_API_KEY || 
                   env.GOOGLE_AI_API_KEY ||
                   null; // Usar null en lugar de cadena vacía para mejor detección
    
    // Log para debugging (solo en desarrollo)
    if (mode === 'development') {
        if (apiKey) {
            console.log('✅ Google API Key encontrada en variables de entorno');
        } else {
            console.warn('⚠️ Google API Key no encontrada. Verifica tus variables de entorno.');
        }
    }
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Inyectar null si no hay API key, para mejor detección en el código cliente
        'process.env.API_KEY': apiKey ? JSON.stringify(apiKey) : 'null',
        'process.env.GEMINI_API_KEY': apiKey ? JSON.stringify(apiKey) : 'null'
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
