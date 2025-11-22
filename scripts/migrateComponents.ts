/**
 * Component Migration Script
 * 
 * This script migrates existing custom components to the new schema with:
 * - version and versionHistory
 * - category, tags, thumbnail
 * - variants
 * - permissions
 * - usageCount and projectsUsing
 * - documentation
 * 
 * Usage:
 * Run this script once to migrate all existing components.
 * Can be safely run multiple times (idempotent).
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { CustomComponent } from '../types';

const firebaseConfig = {
    // Add your Firebase config here
    // This should match your main app configuration
};

async function migrateComponents() {
    console.log('Starting component migration...');
    
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    try {
        const componentsCol = collection(db, 'customComponents');
        const snapshot = await getDocs(componentsCol);
        
        let migratedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        
        for (const docSnapshot of snapshot.docs) {
            const component = docSnapshot.data() as Partial<CustomComponent>;
            
            // Check if already migrated
            if (component.version !== undefined && component.version > 0) {
                console.log(`Skipping ${component.name} - already migrated`);
                skippedCount++;
                continue;
            }
            
            try {
                const updates: Partial<CustomComponent> = {
                    version: 1,
                    versionHistory: [],
                    lastModified: serverTimestamp() as any,
                    category: component.category || 'other',
                    tags: component.tags || [],
                    variants: component.variants || [],
                    isPublic: component.isPublic ?? false,
                    usageCount: component.usageCount || 0,
                    projectsUsing: component.projectsUsing || [],
                    permissions: component.permissions || {
                        canEdit: [],
                        canView: [],
                        isPublic: false
                    }
                };
                
                // Only add fields if they don't exist
                const docRef = doc(db, 'customComponents', docSnapshot.id);
                await updateDoc(docRef, updates);
                
                console.log(`✓ Migrated: ${component.name}`);
                migratedCount++;
            } catch (error) {
                console.error(`✗ Error migrating ${component.name}:`, error);
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
    migrateComponents()
        .then(() => {
            console.log('\nMigration script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\nMigration script failed:', error);
            process.exit(1);
        });
}

export { migrateComponents };

