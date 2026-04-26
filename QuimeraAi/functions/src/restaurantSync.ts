/**
 * Restaurant Sync Cloud Functions
 * Handles syncing public reservations to the internal dashboard
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const onPublicReservationWrite = functions.firestore
    .document('publicRestaurantMenus/{restaurantId}/publicReservations/{reservationId}')
    .onCreate(async (snap, context) => {
        const { restaurantId, reservationId } = context.params;
        const data = snap.data();

        if (!data) return;

        try {
            // Find the tenantId/userId from the publicRestaurantMenus document
            const restaurantMenuDoc = await db.doc(`publicRestaurantMenus/${restaurantId}`).get();
            
            if (!restaurantMenuDoc.exists) {
                console.error(`Restaurant menu not found for ${restaurantId}`);
                return;
            }

            const menuData = restaurantMenuDoc.data();
            const tenantId = menuData?.tenantId;
            const restaurantInfo = menuData?.restaurant;
            const ownerId = restaurantInfo?.ownerId;

            if (!tenantId && !ownerId) {
                console.error(`No tenantId or ownerId found for restaurant ${restaurantId}`);
                return;
            }
            
            // Determine the correct base path based on tenant logic
            let effectivePath = '';
            if (tenantId && ownerId) {
                 effectivePath = tenantId.startsWith(`tenant_${ownerId}`) ? `users/${ownerId}` : `tenants/${tenantId}`;
            } else if (tenantId) {
                 // Fallback if we only have tenantId (though usually we have ownerId in the tenantId string)
                 effectivePath = tenantId.startsWith('tenant_') ? `users/${tenantId.replace('tenant_', '')}` : `tenants/${tenantId}`;
            } else if (ownerId) {
                 effectivePath = `users/${ownerId}`;
            }

            const reservationRef = db.doc(`${effectivePath}/restaurants/${restaurantId}/reservations/${reservationId}`);
            
            await reservationRef.set({
                ...data,
                tenantId: tenantId || null,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`Successfully synced reservation ${reservationId} for restaurant ${restaurantId} to ${effectivePath}`);
        } catch (error) {
            console.error(`Error syncing public reservation ${reservationId}:`, error);
        }
    });
