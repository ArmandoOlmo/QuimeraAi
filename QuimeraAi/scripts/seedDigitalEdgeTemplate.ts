/**
 * Seed Script: Digital Edge — Agencia Marketing Digital
 * 
 * Inserts the Digital Edge marketing agency preset as a template in Firestore.
 * Can be triggered from the Super Admin panel.
 */

import { db, collection, getDocs, addDoc } from '../firebase';
import { digitalEdgeMarketingPreset } from '../data/presets/digitalEdgeMarketingPreset';

/**
 * Seed the Digital Edge marketing template into Firestore.
 * Checks for duplicates before inserting.
 */
export async function seedDigitalEdgeTemplate(): Promise<{ success: boolean; message: string; templateId?: string }> {
    console.log('📣 Seeding Digital Edge marketing template...');

    try {
        // Check for existing template with the same name
        const templatesCol = collection(db, 'templates');
        const snapshot = await getDocs(templatesCol);

        const existing = snapshot.docs.find(doc => doc.data().name === digitalEdgeMarketingPreset.name);
        if (existing) {
            console.log('⚠️ Template already exists:', existing.id);
            return {
                success: false,
                message: `Template "${digitalEdgeMarketingPreset.name}" already exists (ID: ${existing.id}). Delete it first if you want to re-seed.`,
            };
        }

        // Insert the template
        const now = new Date().toISOString();
        const templateData = {
            ...digitalEdgeMarketingPreset,
            createdAt: now,
            lastUpdated: now,
        };

        const docRef = await addDoc(templatesCol, templateData);

        console.log('✅ Template seeded successfully:', docRef.id);
        return {
            success: true,
            message: `Template "${digitalEdgeMarketingPreset.name}" created successfully!`,
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

export default seedDigitalEdgeTemplate;
