/**
 * Remove TrustedBy Migration Script
 * 
 * This script removes the trustedBy data from all existing projects.
 * The TrustedBy section has been removed from the application.
 * 
 * Usage:
 * npx ts-node scripts/removeTrustedBy.ts
 * 
 * Or add to package.json scripts and run:
 * npm run migrate:remove-trustedby
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Initialize Firebase Admin with service account
// You'll need to download your service account key from Firebase Console
// Project Settings > Service Accounts > Generate New Private Key
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : require('../serviceAccountKey.json'); // Fallback to local file

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function removeTrustedByFromAllProjects() {
    console.log('🚀 Starting TrustedBy removal migration...\n');
    
    try {
        // Get all users
        const usersSnapshot = await db.collection('users').get();
        
        let totalProjects = 0;
        let updatedProjects = 0;
        let skippedProjects = 0;
        let errorCount = 0;
        
        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            console.log(`\n📁 Processing user: ${userId}`);
            
            // Get all projects for this user
            const projectsSnapshot = await db
                .collection('users')
                .doc(userId)
                .collection('projects')
                .get();
            
            for (const projectDoc of projectsSnapshot.docs) {
                totalProjects++;
                const projectData = projectDoc.data();
                const projectName = projectData.name || projectDoc.id;
                
                try {
                    // Check if project has trustedBy data
                    const hasTrustedByInData = projectData.data?.trustedBy !== undefined;
                    const hasTrustedByAtRoot = projectData.trustedBy !== undefined;
                    
                    if (hasTrustedByInData || hasTrustedByAtRoot) {
                        const updates: any = {};
                        
                        // Remove trustedBy from data object if it exists
                        if (hasTrustedByInData) {
                            updates['data.trustedBy'] = FieldValue.delete();
                        }
                        
                        // Remove trustedBy from root if it exists
                        if (hasTrustedByAtRoot) {
                            updates['trustedBy'] = FieldValue.delete();
                        }
                        
                        await projectDoc.ref.update(updates);
                        console.log(`  ✅ Removed trustedBy from: ${projectName}`);
                        updatedProjects++;
                    } else {
                        console.log(`  ⏭️  No trustedBy in: ${projectName}`);
                        skippedProjects++;
                    }
                } catch (error) {
                    console.error(`  ❌ Error updating ${projectName}:`, error);
                    errorCount++;
                }
            }
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('📊 MIGRATION SUMMARY');
        console.log('='.repeat(50));
        console.log(`Total projects scanned: ${totalProjects}`);
        console.log(`Projects updated:       ${updatedProjects}`);
        console.log(`Projects skipped:       ${skippedProjects}`);
        console.log(`Errors:                 ${errorCount}`);
        console.log('='.repeat(50));
        
        if (errorCount === 0) {
            console.log('\n✅ Migration completed successfully!');
        } else {
            console.log(`\n⚠️ Migration completed with ${errorCount} errors.`);
        }
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        throw error;
    }
}

// Alternative: Run directly in the browser console (for quick fix)
export const browserScript = `
// Run this in browser console while logged in as admin
// This will remove trustedBy from all projects

async function removeTrustedByFromFirebase() {
    const { db, collection, getDocs, updateDoc, doc } = await import('./firebase.ts');
    
    // Get current user's projects
    const user = auth.currentUser;
    if (!user) {
        console.error('Not logged in!');
        return;
    }
    
    const projectsRef = collection(db, 'users', user.uid, 'projects');
    const snapshot = await getDocs(projectsRef);
    
    let count = 0;
    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (data.data?.trustedBy) {
            const newData = { ...data.data };
            delete newData.trustedBy;
            await updateDoc(docSnap.ref, { data: newData });
            console.log('Updated:', data.name);
            count++;
        }
    }
    console.log('Done! Updated', count, 'projects');
}

removeTrustedByFromFirebase();
`;

// Run migration
if (require.main === module) {
    removeTrustedByFromAllProjects()
        .then(() => {
            console.log('\n🎉 Script finished!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Script failed:', error);
            process.exit(1);
        });
}

export { removeTrustedByFromAllProjects };


























