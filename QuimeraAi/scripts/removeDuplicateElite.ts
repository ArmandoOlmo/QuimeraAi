/**
 * One-time script: Remove duplicate L'Élite Restaurant template from Firestore.
 * Keeps the first one found and deletes any duplicates.
 */

import { db, collection, getDocs, deleteDoc, doc } from '../firebase';

export async function removeDuplicateElite(): Promise<{ success: boolean; message: string }> {
    console.log('🔍 Searching for duplicate L\'Élite templates...');

    try {
        const templatesCol = collection(db, 'templates');
        const snapshot = await getDocs(templatesCol);

        const eliteTemplates = snapshot.docs.filter(
            d => d.data().name === "L'Élite Restaurant"
        );

        if (eliteTemplates.length <= 1) {
            return {
                success: true,
                message: `No duplicates found. Found ${eliteTemplates.length} L'Élite template(s).`,
            };
        }

        console.log(`Found ${eliteTemplates.length} L'Élite templates. Keeping first, removing ${eliteTemplates.length - 1} duplicate(s).`);

        // Keep the first, delete the rest
        const duplicates = eliteTemplates.slice(1);
        for (const dup of duplicates) {
            console.log(`🗑️ Deleting duplicate: ${dup.id}`);
            await deleteDoc(doc(db, 'templates', dup.id));
        }

        return {
            success: true,
            message: `Removed ${duplicates.length} duplicate L'Élite template(s). Kept ID: ${eliteTemplates[0].id}`,
        };

    } catch (error: any) {
        console.error('❌ Error:', error);
        return {
            success: false,
            message: `Error: ${error.message}`,
        };
    }
}

export default removeDuplicateElite;
