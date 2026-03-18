/**
 * Deduplicate componentOrder Script
 * 
 * Fixes duplicate section entries (e.g., 'team' appearing 4 times)
 * in a specific project's componentOrder array.
 * 
 * Usage:
 * npx ts-node scripts/deduplicateComponentOrder.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : require('../serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

const TARGET_PROJECT_ID = 'proj_1773771296876';

async function deduplicateComponentOrder() {
    console.log(`🔍 Searching for project: ${TARGET_PROJECT_ID}...\n`);

    // Search across all users for this project
    const usersSnapshot = await db.collection('users').get();

    for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const projectRef = db.collection('users').doc(userId).collection('projects').doc(TARGET_PROJECT_ID);
        const projectSnap = await projectRef.get();

        if (!projectSnap.exists) continue;

        const projectData = projectSnap.data();
        const projectName = projectData?.name || TARGET_PROJECT_ID;
        const componentOrder: string[] = projectData?.componentOrder || [];

        console.log(`✅ Found project "${projectName}" under user: ${userId}`);
        console.log(`   Current componentOrder (${componentOrder.length} items):`);
        console.log(`   ${JSON.stringify(componentOrder)}\n`);

        // Count duplicates
        const counts: Record<string, number> = {};
        componentOrder.forEach(s => { counts[s] = (counts[s] || 0) + 1; });
        const duplicates = Object.entries(counts).filter(([, c]) => c > 1);

        if (duplicates.length === 0) {
            console.log('   ℹ️  No duplicates found in componentOrder!');
            
            // Also check pages
            const pages = projectData?.pages || [];
            let pagesFixed = 0;
            for (const page of pages) {
                if (page.sections) {
                    const deduped = [...new Set(page.sections)];
                    if (deduped.length !== page.sections.length) {
                        console.log(`   📄 Page "${page.title}" has duplicates: ${page.sections.length} → ${deduped.length}`);
                        page.sections = deduped;
                        pagesFixed++;
                    }
                }
            }
            if (pagesFixed > 0) {
                await projectRef.update({ pages });
                console.log(`\n   ✅ Fixed ${pagesFixed} page(s) with duplicate sections!`);
            }
            return;
        }

        console.log('   🔴 Duplicates found:');
        duplicates.forEach(([section, count]) => {
            console.log(`      "${section}" appears ${count} times`);
        });

        // Deduplicate - keep only first occurrence
        const deduped = [...new Set(componentOrder)];
        console.log(`\n   📝 Deduplicated componentOrder (${deduped.length} items):`);
        console.log(`   ${JSON.stringify(deduped)}\n`);

        // Also fix pages array if it has sections with duplicates
        const pages = projectData?.pages || [];
        const updates: Record<string, any> = { componentOrder: deduped };
        
        let pagesFixed = 0;
        for (const page of pages) {
            if (page.sections) {
                const dedupedSections = [...new Set(page.sections)];
                if (dedupedSections.length !== page.sections.length) {
                    console.log(`   📄 Page "${page.title}" sections: ${page.sections.length} → ${dedupedSections.length}`);
                    page.sections = dedupedSections;
                    pagesFixed++;
                }
            }
        }
        if (pagesFixed > 0) {
            updates.pages = pages;
        }

        // Apply update
        await projectRef.update(updates);
        console.log('   ✅ Updated Firestore successfully!');
        console.log(`   📊 componentOrder: ${componentOrder.length} → ${deduped.length} items`);
        if (pagesFixed > 0) {
            console.log(`   📊 Fixed ${pagesFixed} page(s) with duplicate sections`);
        }
        return;
    }

    console.log('❌ Project not found in any user collection!');
}

deduplicateComponentOrder()
    .then(() => {
        console.log('\n🎉 Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Error:', error);
        process.exit(1);
    });
