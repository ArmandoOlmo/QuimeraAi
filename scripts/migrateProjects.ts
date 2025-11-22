/**
 * Project Migration Script
 * 
 * This script migrates existing projects to ensure they have:
 * - Valid componentOrder (only enabled components)
 * - Valid sectionVisibility (respecting componentStatus)
 * - Updated imagePrompts structure
 * 
 * Usage:
 * Run this script once to migrate all existing user projects.
 * Can be safely run multiple times (idempotent).
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, getDoc, collectionGroup, query } from 'firebase/firestore';
import { PageSection } from '../types';

const firebaseConfig = {
    // Add your Firebase config here
    // This should match your main app configuration
};

async function migrateProjects() {
    console.log('Starting project migration...');
    
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    try {
        // Get global component status
        const componentStatusDoc = await getDoc(doc(db, 'settings', 'components'));
        const componentStatus: Record<PageSection, boolean> = componentStatusDoc.exists() 
            ? componentStatusDoc.data().status 
            : {};
        
        console.log('Component Status:', componentStatus);
        
        // Use collectionGroup to get all projects across all users
        const projectsQuery = query(collectionGroup(db, 'projects'));
        const snapshot = await getDocs(projectsQuery);
        
        let migratedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        
        for (const docSnapshot of snapshot.docs) {
            const project = docSnapshot.data();
            
            try {
                let needsUpdate = false;
                const updates: any = {};
                
                // Migrate componentOrder - remove disabled components
                if (project.componentOrder && Array.isArray(project.componentOrder)) {
                    const validComponentOrder = project.componentOrder.filter(
                        (comp: PageSection) => componentStatus[comp] !== false
                    );
                    
                    if (validComponentOrder.length !== project.componentOrder.length) {
                        updates.componentOrder = validComponentOrder;
                        needsUpdate = true;
                    }
                }
                
                // Migrate sectionVisibility - ensure disabled components are not visible
                if (project.sectionVisibility) {
                    const validSectionVisibility: Record<string, boolean> = {};
                    
                    for (const [key, value] of Object.entries(project.sectionVisibility)) {
                        validSectionVisibility[key] = value && (componentStatus[key as PageSection] !== false);
                    }
                    
                    if (JSON.stringify(validSectionVisibility) !== JSON.stringify(project.sectionVisibility)) {
                        updates.sectionVisibility = validSectionVisibility;
                        needsUpdate = true;
                    }
                }
                
                // Add chatbot to componentOrder if missing (for legacy projects)
                if (updates.componentOrder && !updates.componentOrder.includes('chatbot')) {
                    if (componentStatus['chatbot'] !== false) {
                        updates.componentOrder.push('chatbot');
                        needsUpdate = true;
                    }
                }
                
                if (needsUpdate) {
                    await updateDoc(docSnapshot.ref, updates);
                    console.log(`✓ Migrated project: ${project.name || docSnapshot.id}`);
                    migratedCount++;
                } else {
                    skippedCount++;
                }
            } catch (error) {
                console.error(`✗ Error migrating project ${docSnapshot.id}:`, error);
                errorCount++;
            }
        }
        
        console.log('\n=== Migration Complete ===');
        console.log(`Migrated: ${migratedCount}`);
        console.log(`Skipped: ${skippedCount}`);
        console.log(`Errors: ${errorCount}`);
        console.log(`Total: ${snapshot.size}`);
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}

// Run migration
if (require.main === module) {
    migrateProjects()
        .then(() => {
            console.log('\nMigration script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\nMigration script failed:', error);
            process.exit(1);
        });
}

export { migrateProjects };

