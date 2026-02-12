/**
 * Seed Script: Digital Edge — Agencia Marketing Digital
 * 
 * Inserts the Digital Edge marketing agency preset as a template in Firestore.
 * Can be triggered from the Super Admin panel.
 * 
 * If a template with the same name already exists, it will be REPLACED.
 */

import { db, collection, getDocs, addDoc, deleteDoc, doc } from '../firebase';
import { digitalEdgeMarketingPreset } from '../data/presets/digitalEdgeMarketingPreset';

/**
 * Seed the Digital Edge marketing template into Firestore.
 * If a template with the same name already exists, it deletes it first and re-creates it.
 */
export async function seedDigitalEdgeTemplate(): Promise<{ success: boolean; message: string; templateId?: string }> {
    console.log('📣 Seeding Digital Edge marketing template...');

    try {
        const templatesCol = collection(db, 'templates');
        const snapshot = await getDocs(templatesCol);

        // Delete any existing template(s) with the same name
        const existingDocs = snapshot.docs.filter(d => d.data().name === digitalEdgeMarketingPreset.name);
        if (existingDocs.length > 0) {
            console.log(`🗑️ Found ${existingDocs.length} existing template(s) with name "${digitalEdgeMarketingPreset.name}", deleting...`);
            for (const existingDoc of existingDocs) {
                await deleteDoc(doc(db, 'templates', existingDoc.id));
                console.log(`  ✅ Deleted: ${existingDoc.id}`);
            }
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
