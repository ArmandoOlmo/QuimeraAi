/**
 * Seed Script: Dark Brutalist Gym Template
 * 
 * Inserts the Dark Brutalist Gym preset as a template in the Firestore 
 * 'templates' collection. Can be triggered from the Super Admin panel.
 * 
 * Follows the same pattern as migrateTemplatesEcommerce.ts
 */

import { db, collection, getDocs, addDoc } from '../firebase';
import { gymBrutalistPreset } from '../data/presets/gymBrutalistPreset';

/**
 * Seed the Dark Brutalist Gym template into Firestore.
 * Checks for duplicates before inserting.
 */
export async function seedGymBrutalistTemplate(): Promise<{ success: boolean; message: string; templateId?: string }> {
    console.log('🏋️ Seeding Dark Brutalist Gym template...');

    try {
        // Check for existing template with the same name
        const templatesCol = collection(db, 'templates');
        const snapshot = await getDocs(templatesCol);

        const existing = snapshot.docs.find(doc => doc.data().name === gymBrutalistPreset.name);
        if (existing) {
            console.log('⚠️ Template already exists:', existing.id);
            return {
                success: false,
                message: `Template "${gymBrutalistPreset.name}" already exists (ID: ${existing.id}). Delete it first if you want to re-seed.`,
            };
        }

        // Insert the template
        const now = new Date().toISOString();
        const templateData = {
            ...gymBrutalistPreset,
            createdAt: now,
            lastUpdated: now,
        };

        const docRef = await addDoc(templatesCol, templateData);

        console.log('✅ Template seeded successfully:', docRef.id);
        return {
            success: true,
            message: `Template "${gymBrutalistPreset.name}" created successfully!`,
            templateId: docRef.id,
        };

    } catch (error: any) {
        console.error('❌ Error seeding template:', error);
        return {
            success: false,
            message: `Error: ${error.message}`,
        };
    }
}

export default seedGymBrutalistTemplate;
