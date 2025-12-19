/**
 * Fix quimeraapp.com domain mapping
 * Updates the customDomains collection to point to the correct projectId
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// Firebase config (same as in the app)
const firebaseConfig = {
    apiKey: "AIzaSyCzm7K7f8gCXJ0h_qQD8J6_g8vKvY3X3nM",
    authDomain: "quimeraai.firebaseapp.com",
    projectId: "quimeraai",
    storageBucket: "quimeraai.firebasestorage.app",
    messagingSenderId: "575386543550",
    appId: "1:575386543550:web:395114b8f43e810a7985ef"
};

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
