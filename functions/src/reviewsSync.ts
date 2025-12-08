/**
 * Reviews Sync Cloud Functions
 * Handles review statistics calculation and syncing
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// Types
interface ReviewStats {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
    };
}

interface Review {
    id: string;
    productId: string;
    rating: number;
    status: 'pending' | 'approved' | 'rejected';
}

// ============================================
// Recalculate Review Stats for a Product
// ============================================

async function recalculateProductReviewStats(
    userId: string,
    storeId: string,
    productId: string
): Promise<void> {
    try {
        // Get all approved reviews for this product from the store
        const reviewsRef = db.collection(`users/${userId}/stores/${storeId}/reviews`);
        const reviewsSnapshot = await reviewsRef
            .where('productId', '==', productId)
            .where('status', '==', 'approved')
            .get();

        // Calculate stats
        const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let totalRating = 0;
        let totalReviews = 0;

        reviewsSnapshot.docs.forEach((doc) => {
            const review = doc.data() as Review;
            const rating = Math.min(5, Math.max(1, Math.round(review.rating)));
            ratingDistribution[rating as keyof typeof ratingDistribution]++;
            totalRating += review.rating;
            totalReviews++;
        });

        const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;

        const reviewStats: ReviewStats = {
            averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
            totalReviews,
            ratingDistribution,
        };

        // Update product in private store
        const productRef = db.doc(`users/${userId}/stores/${storeId}/products/${productId}`);
        await productRef.update({
            reviewStats,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Update product in public store
        const publicProductRef = db.doc(`publicStores/${storeId}/products/${productId}`);
        const publicProductDoc = await publicProductRef.get();
        
        if (publicProductDoc.exists) {
            await publicProductRef.update({
                reviewStats,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        console.log(`Updated review stats for product ${productId}: ${totalReviews} reviews, ${averageRating.toFixed(1)} avg`);
    } catch (error) {
        console.error(`Error recalculating review stats for product ${productId}:`, error);
        throw error;
    }
}

// ============================================
// Trigger: Review Created/Updated in Store
// ============================================

export const onReviewWrite = functions.firestore
    .document('users/{userId}/stores/{storeId}/reviews/{reviewId}')
    .onWrite(async (change, context) => {
        const { userId, storeId } = context.params;

        // Get the product ID from the review (before or after)
        const beforeData = change.before.exists ? change.before.data() : null;
        const afterData = change.after.exists ? change.after.data() : null;

        const productId = afterData?.productId || beforeData?.productId;

        if (!productId) {
            console.log('No productId found in review, skipping stats update');
            return;
        }

        // Only recalculate if status is approved or changed
        const beforeStatus = beforeData?.status;
        const afterStatus = afterData?.status;

        // Recalculate stats when:
        // - Review is deleted
        // - Review status changes to/from 'approved'
        // - Review rating changes while approved
        const shouldRecalculate =
            !change.after.exists || // Deleted
            afterStatus === 'approved' ||
            beforeStatus === 'approved' ||
            (beforeData?.rating !== afterData?.rating && afterStatus === 'approved');

        if (shouldRecalculate) {
            await recalculateProductReviewStats(userId, storeId, productId);
        }
    });

// ============================================
// Trigger: Public Review Write (backup sync)
// ============================================

export const onPublicReviewWrite = functions.firestore
    .document('publicStores/{storeId}/reviews/{reviewId}')
    .onWrite(async (change, context) => {
        const { storeId } = context.params;

        const beforeData = change.before.exists ? change.before.data() : null;
        const afterData = change.after.exists ? change.after.data() : null;

        const productId = afterData?.productId || beforeData?.productId;
        const userId = afterData?.userId || beforeData?.userId;

        if (!productId || !userId) {
            console.log('Missing productId or userId in public review');
            return;
        }

        // Recalculate from the main store reviews
        await recalculateProductReviewStats(userId, storeId, productId);
    });

// ============================================
// Scheduled: Clean up old pending reviews
// ============================================

export const cleanupOldPendingReviews = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async () => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days old

        try {
            // Get all stores with pending reviews
            const pendingReviewsRef = db.collectionGroup('reviews');
            const oldPendingQuery = pendingReviewsRef
                .where('status', '==', 'pending')
                .where('createdAt', '<', admin.firestore.Timestamp.fromDate(cutoffDate));

            const snapshot = await oldPendingQuery.get();

            if (snapshot.empty) {
                console.log('No old pending reviews to clean up');
                return;
            }

            // Delete old pending reviews in batches
            const batch = db.batch();
            let count = 0;

            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
                count++;
            });

            await batch.commit();
            console.log(`Cleaned up ${count} old pending reviews`);
        } catch (error) {
            console.error('Error cleaning up old pending reviews:', error);
        }
    });

// ============================================
// Callable: Get Review Stats for Product
// ============================================

interface GetReviewStatsRequest {
    storeId: string;
    productId: string;
}

export const getReviewStats = functions.https.onCall(
    async (data: GetReviewStatsRequest) => {
        const { storeId, productId } = data;

        if (!storeId || !productId) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'storeId and productId are required'
            );
        }

        try {
            // Get from public product
            const productDoc = await db
                .doc(`publicStores/${storeId}/products/${productId}`)
                .get();

            if (!productDoc.exists) {
                return {
                    averageRating: 0,
                    totalReviews: 0,
                    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                };
            }

            const productData = productDoc.data();
            return productData?.reviewStats || {
                averageRating: 0,
                totalReviews: 0,
                ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            };
        } catch (error: any) {
            console.error('Error getting review stats:', error);
            throw new functions.https.HttpsError(
                'internal',
                error.message || 'Failed to get review stats'
            );
        }
    }
);

// ============================================
// Callable: Check Verified Purchase
// ============================================

interface CheckVerifiedPurchaseRequest {
    storeId: string;
    productId: string;
    customerEmail: string;
}

export const checkVerifiedPurchase = functions.https.onCall(
    async (data: CheckVerifiedPurchaseRequest) => {
        const { storeId, productId, customerEmail } = data;

        if (!storeId || !productId || !customerEmail) {
            return { verified: false };
        }

        try {
            // Find the userId associated with this store
            const storeDoc = await db.doc(`publicStores/${storeId}`).get();
            
            if (!storeDoc.exists) {
                return { verified: false };
            }

            const storeData = storeDoc.data();
            const userId = storeData?.userId;

            if (!userId) {
                return { verified: false };
            }

            // Check if the customer has ordered this product
            const ordersRef = db.collection(`users/${userId}/stores/${storeId}/orders`);
            const ordersQuery = ordersRef
                .where('customerEmail', '==', customerEmail.toLowerCase())
                .where('status', 'in', ['paid', 'delivered'])
                .limit(100);

            const ordersSnapshot = await ordersQuery.get();

            // Check if any order contains this product
            for (const orderDoc of ordersSnapshot.docs) {
                const orderData = orderDoc.data();
                const hasProduct = orderData.items?.some(
                    (item: any) => item.productId === productId
                );

                if (hasProduct) {
                    return { verified: true };
                }
            }

            return { verified: false };
        } catch (error) {
            console.error('Error checking verified purchase:', error);
            return { verified: false };
        }
    }
);
