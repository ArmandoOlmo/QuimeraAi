/**
 * useReviews Hook
 * Hook para gestión y moderación de reseñas en el dashboard
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    addDoc,
    getDocs,
    writeBatch,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import { Review, ReviewStatus, ReviewStats } from '../../../../types/ecommerce';

export interface UseReviewsOptions {
    statusFilter?: ReviewStatus | 'all';
    productFilter?: string;
}

export interface UseReviewsReturn {
    reviews: Review[];
    pendingReviews: Review[];
    isLoading: boolean;
    error: string | null;
    // Stats
    totalReviews: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    // Actions
    approveReview: (reviewId: string) => Promise<void>;
    rejectReview: (reviewId: string) => Promise<void>;
    deleteReview: (reviewId: string) => Promise<void>;
    respondToReview: (reviewId: string, response: string) => Promise<void>;
    bulkApprove: (reviewIds: string[]) => Promise<void>;
    bulkReject: (reviewIds: string[]) => Promise<void>;
}

export const useReviews = (
    userId: string,
    storeId: string = 'default',
    options: UseReviewsOptions = {}
): UseReviewsReturn => {
    const { statusFilter = 'all', productFilter } = options;

    const [reviews, setReviews] = useState<Review[]>([]);
    const [pendingReviews, setPendingReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Paths - use empty string if no storeId to prevent invalid queries
    const effectiveStoreId = storeId || '';
    const reviewsPath = `users/${userId}/stores/${effectiveStoreId}/reviews`;
    const pendingReviewsPath = `pendingReviews/${effectiveStoreId}/reviews`;
    const publicReviewsPath = `publicStores/${effectiveStoreId}/reviews`;

    // Load store reviews
    useEffect(() => {
        if (!userId || !effectiveStoreId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        // Build query
        const reviewsRef = collection(db, reviewsPath);
        let q = query(reviewsRef, orderBy('createdAt', 'desc'));

        if (statusFilter !== 'all') {
            q = query(reviewsRef, where('status', '==', statusFilter), orderBy('createdAt', 'desc'));
        }

        if (productFilter) {
            q = query(
                reviewsRef,
                where('productId', '==', productFilter),
                orderBy('createdAt', 'desc')
            );
        }

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const reviewsData = snapshot.docs.map((doc) => ({
                    ...doc.data(),
                    id: doc.id,
                } as Review));
                setReviews(reviewsData);
                setIsLoading(false);
            },
            (err) => {
                console.error('Error loading reviews:', err);
                setError(err.message);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userId, storeId, statusFilter, productFilter, reviewsPath]);

    // Load pending reviews (from customers)
    useEffect(() => {
        if (!userId || !effectiveStoreId) return;

        const pendingRef = collection(db, pendingReviewsPath);
        const q = query(pendingRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const pendingData = snapshot.docs.map((doc) => ({
                    ...doc.data(),
                    id: doc.id,
                } as Review));
                setPendingReviews(pendingData);
            },
            (err) => {
                console.error('Error loading pending reviews:', err);
            }
        );

        return () => unsubscribe();
    }, [userId, storeId, pendingReviewsPath]);

    // Stats
    const stats = useMemo(() => {
        const allReviews = [...reviews, ...pendingReviews];
        return {
            totalReviews: allReviews.length,
            pendingCount: allReviews.filter((r) => r.status === 'pending').length + pendingReviews.length,
            approvedCount: allReviews.filter((r) => r.status === 'approved').length,
            rejectedCount: allReviews.filter((r) => r.status === 'rejected').length,
        };
    }, [reviews, pendingReviews]);

    // Approve review
    const approveReview = useCallback(async (reviewId: string) => {
        try {
            // Check if it's a pending review (from customer submission)
            const pendingReview = pendingReviews.find((r) => r.id === reviewId);
            
            if (pendingReview) {
                // Move from pending to approved
                const batch = writeBatch(db);
                
                // Add to store reviews
                const storeReviewRef = doc(collection(db, reviewsPath));
                const reviewData = {
                    ...pendingReview,
                    status: 'approved' as ReviewStatus,
                    updatedAt: serverTimestamp(),
                };
                delete (reviewData as any).id;
                batch.set(storeReviewRef, reviewData);
                
                // Add to public reviews
                const publicReviewRef = doc(db, publicReviewsPath, storeReviewRef.id);
                batch.set(publicReviewRef, reviewData);
                
                // Delete from pending
                batch.delete(doc(db, pendingReviewsPath, reviewId));
                
                await batch.commit();
            } else {
                // Update existing review status
                const batch = writeBatch(db);
                
                batch.update(doc(db, reviewsPath, reviewId), {
                    status: 'approved',
                    updatedAt: serverTimestamp(),
                });
                
                // Update or create in public
                const review = reviews.find((r) => r.id === reviewId);
                if (review) {
                    const publicReviewData = {
                        ...review,
                        status: 'approved',
                        updatedAt: serverTimestamp(),
                    };
                    batch.set(doc(db, publicReviewsPath, reviewId), publicReviewData, { merge: true });
                }
                
                await batch.commit();
            }
        } catch (err: any) {
            console.error('Error approving review:', err);
            throw new Error(err.message || 'Error al aprobar la reseña');
        }
    }, [reviewsPath, publicReviewsPath, pendingReviewsPath, reviews, pendingReviews]);

    // Reject review
    const rejectReview = useCallback(async (reviewId: string) => {
        try {
            // Check if it's a pending review
            const pendingReview = pendingReviews.find((r) => r.id === reviewId);
            
            if (pendingReview) {
                // Move from pending to rejected in store reviews
                const batch = writeBatch(db);
                
                const storeReviewRef = doc(collection(db, reviewsPath));
                const reviewData = {
                    ...pendingReview,
                    status: 'rejected' as ReviewStatus,
                    updatedAt: serverTimestamp(),
                };
                delete (reviewData as any).id;
                batch.set(storeReviewRef, reviewData);
                
                // Delete from pending
                batch.delete(doc(db, pendingReviewsPath, reviewId));
                
                await batch.commit();
            } else {
                // Update existing review
                const batch = writeBatch(db);
                
                batch.update(doc(db, reviewsPath, reviewId), {
                    status: 'rejected',
                    updatedAt: serverTimestamp(),
                });
                
                // Remove from public if exists
                batch.delete(doc(db, publicReviewsPath, reviewId));
                
                await batch.commit();
            }
        } catch (err: any) {
            console.error('Error rejecting review:', err);
            throw new Error(err.message || 'Error al rechazar la reseña');
        }
    }, [reviewsPath, publicReviewsPath, pendingReviewsPath, pendingReviews]);

    // Delete review
    const deleteReview = useCallback(async (reviewId: string) => {
        try {
            const batch = writeBatch(db);
            
            // Check if pending
            const isPending = pendingReviews.find((r) => r.id === reviewId);
            
            if (isPending) {
                batch.delete(doc(db, pendingReviewsPath, reviewId));
            } else {
                batch.delete(doc(db, reviewsPath, reviewId));
                batch.delete(doc(db, publicReviewsPath, reviewId));
            }
            
            await batch.commit();
        } catch (err: any) {
            console.error('Error deleting review:', err);
            throw new Error(err.message || 'Error al eliminar la reseña');
        }
    }, [reviewsPath, publicReviewsPath, pendingReviewsPath, pendingReviews]);

    // Respond to review
    const respondToReview = useCallback(async (reviewId: string, response: string) => {
        try {
            const batch = writeBatch(db);
            
            const updateData = {
                adminResponse: response,
                adminResponseAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            
            batch.update(doc(db, reviewsPath, reviewId), updateData);
            
            // Update public if approved
            const review = reviews.find((r) => r.id === reviewId);
            if (review?.status === 'approved') {
                batch.update(doc(db, publicReviewsPath, reviewId), updateData);
            }
            
            await batch.commit();
        } catch (err: any) {
            console.error('Error responding to review:', err);
            throw new Error(err.message || 'Error al responder la reseña');
        }
    }, [reviewsPath, publicReviewsPath, reviews]);

    // Bulk approve
    const bulkApprove = useCallback(async (reviewIds: string[]) => {
        for (const reviewId of reviewIds) {
            await approveReview(reviewId);
        }
    }, [approveReview]);

    // Bulk reject
    const bulkReject = useCallback(async (reviewIds: string[]) => {
        for (const reviewId of reviewIds) {
            await rejectReview(reviewId);
        }
    }, [rejectReview]);

    return {
        reviews: [...pendingReviews, ...reviews], // Combine for display
        pendingReviews,
        isLoading,
        error,
        ...stats,
        approveReview,
        rejectReview,
        deleteReview,
        respondToReview,
        bulkApprove,
        bulkReject,
    };
};

export default useReviews;
