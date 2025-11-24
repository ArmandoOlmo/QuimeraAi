#!/usr/bin/env node

/**
 * Script para probar la API de Gemini
 * Uso: node test-gemini-api.js YOUR_API_KEY
 */

const https = require('https');

const API_KEY = process.argv[2] || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error('❌ Por favor proporciona una API key como argumento o configura la variable de entorno');
  console.error('Uso: node test-gemini-api.js YOUR_API_KEY');
  console.error('O configura: export VITE_GEMINI_API_KEY=your_api_key_here');
  process.exit(1);
}

console.log('🔍 Probando API de Gemini...');
console.log(`📝 API Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 5)}`);

const data = JSON.stringify({
  contents: [{
    parts: [{
      text: 'Hola, responde con un simple "ok" si estás funcionando correctamente.'
    }]
  }]
});

const options = {
  hostname: 'generativelanguage.googleapis.com',
  path: `/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const json = JSON.parse(responseData);
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log('\n✅ La API está funcionando correctamente!');
        console.log('📨 Respuesta de Gemini:', text);
        console.log('\n💡 Tu API key es válida y la API está habilitada.');
      } catch (error) {
        console.log('⚠️ Respuesta recibida pero con formato inesperado:');
        console.log(responseData);
      }
    } else {
      console.log(`\n❌ Error: ${res.statusCode} ${res.statusMessage}`);
      console.log('📋 Respuesta completa:');
      try {
        const json = JSON.parse(responseData);
        console.log(JSON.stringify(json, null, 2));
        
        if (json.error) {
          console.log('\n🔍 Análisis del error:');
          if (json.error.message?.includes('API key not valid')) {
            console.log('   • Tu API key no es válida o ha expirado');
            console.log('   • Solución: Crea una nueva en https://aistudio.google.com/app/apikey');
          } else if (json.error.message?.includes('not found') || json.error.code === 404) {
            console.log('   • La API de Generative Language no está habilitada');
            console.log('   • Solución: Ejecuta "gcloud services enable generativelanguage.googleapis.com"');
          } else if (json.error.code === 429) {
            console.log('   • Has excedido el límite de requests');
            console.log('   • Solución: Espera un momento y vuelve a intentar');
          } else {
            console.log(`   • Error desconocido: ${json.error.message}`);
          }
        }
      } catch (e) {
        console.log(responseData);
      }
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error de red:', error.message);
});

req.write(data);
req.end();

