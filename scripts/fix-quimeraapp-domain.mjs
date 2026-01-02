/**
 * Fix quimeraapp.com domain mapping
 * Updates the customDomains collection to point to the correct projectId
 * 
 * USAGE: Set environment variables before running:
 * VITE_FIREBASE_API_KEY=xxx node scripts/fix-quimeraapp-domain.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// Firebase config from environment variables
const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "quimeraai.firebaseapp.com",
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || "quimeraai",
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "quimeraai.firebasestorage.app",
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "575386543550",
    appId: process.env.VITE_FIREBASE_APP_ID
};

// Validate required config
if (!firebaseConfig.apiKey) {
    console.error('❌ Error: VITE_FIREBASE_API_KEY environment variable is required');
    console.error('   Run: VITE_FIREBASE_API_KEY=your_key node scripts/fix-quimeraapp-domain.mjs');
    process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixDomain() {
    const domain = 'quimeraapp.com';
    const correctProjectId = 'HagZJMj1S4158Fox9zUy';
    const userId = 'ovoDLOjnnoa2P0zECMP4TNGKbC53';
    
    console.log('🔍 Verificando documento actual en customDomains...');
    
    try {
        const docRef = doc(db, 'customDomains', domain);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            console.log('📄 Documento actual:', JSON.stringify(docSnap.data(), null, 2));
        } else {
            console.log('❌ Documento no existe, creando nuevo...');
        }
        
        console.log(`\n🔧 Actualizando ${domain} -> projectId: ${correctProjectId}`);
        
        await setDoc(docRef, {
            domain: domain,
            projectId: correctProjectId,
            userId: userId,
            status: 'active',
            sslStatus: 'active',
            dnsVerified: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }, { merge: true });
        
        console.log('✅ Dominio actualizado correctamente');
        
        // Verify
        const updated = await getDoc(docRef);
        console.log('\n📄 Documento actualizado:', JSON.stringify(updated.data(), null, 2));
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code === 'permission-denied') {
            console.log('\n⚠️ Necesitas estar autenticado para escribir en customDomains');
            console.log('Solución: Actualizar las reglas de Firestore o usar Firebase Admin SDK');
        }
    }
    
    process.exit(0);
}

fixDomain();
