/**
 * Seed Script: L'Élite Landing Page de Lujo
 * 
 * Inserts the L'Élite luxury restaurant preset as a template in Firestore.
 * Can be triggered from the Super Admin panel.
 */

import { db, collection, getDocs, addDoc } from '../firebase';
import { eliteLuxuryPreset } from '../data/presets/eliteLuxuryPreset';

/**
 * Seed the L'Élite luxury restaurant template into Firestore.
 * Checks for duplicates before inserting.
 */
export async function seedEliteLuxuryTemplate(): Promise<{ success: boolean; message: string; templateId?: string }> {
    console.log('🍷 Seeding L\'Élite Luxury Restaurant template...');

    try {
        const templatesCol = collection(db, 'templates');
        const snapshot = await getDocs(templatesCol);

        const existing = snapshot.docs.find(doc => doc.data().name === eliteLuxuryPreset.name);
        if (existing) {
            console.log('⚠️ Template already exists:', existing.id);
            return {
                success: false,
                message: `Template "${eliteLuxuryPreset.name}" already exists (ID: ${existing.id}). Delete it first if you want to re-seed.`,
            };
        }

        const now = new Date().toISOString();
        const templateData = {
            ...eliteLuxuryPreset,
            createdAt: now,
            lastUpdated: now,
        };

        const docRef = await addDoc(templatesCol, templateData);

        console.log('✅ Template seeded successfully:', docRef.id);
        return {
            success: true,
            message: `Template "${eliteLuxuryPreset.name}" created successfully!`,
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

export default seedEliteLuxuryTemplate;
