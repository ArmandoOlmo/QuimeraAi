/**
 * useProductReviews Hook
 * Hook para obtener y enviar reseñas de productos en el storefront
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    getDocs,
    addDoc,
    doc,
    getDoc,
    updateDoc,
    increment,
    DocumentSnapshot,
    QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { Review, ReviewStats, ReviewStatus } from '../../../types/ecommerce';

// Types
export type ReviewSortBy = 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';

export interface UseProductReviewsOptions {
    pageSize?: number;
    sortBy?: ReviewSortBy;
}

export interface UseProductReviewsReturn {
    reviews: Review[];
    stats: ReviewStats | null;
    isLoading: boolean;
    isLoadingMore: boolean;
    error: string | null;
    hasMore: boolean;
    loadMore: () => Promise<void>;
    refetch: () => Promise<void>;
}

export interface SubmitReviewData {
    rating: number;
    title: string;
    comment: string;
    customerName: string;
    customerEmail: string;
    images?: string[];
}

export interface UseSubmitReviewReturn {
    submitReview: (data: SubmitReviewData) => Promise<{ success: boolean; error?: string }>;
    isSubmitting: boolean;
    error: string | null;
}

// Default stats
const defaultStats: ReviewStats = {
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

/**
 * Hook para obtener reseñas de un producto (solo aprobadas para storefront)
 */
export const useProductReviews = (
    storeId: string,
    productId: string,
    options: UseProductReviewsOptions = {}
): UseProductReviewsReturn => {
    const { pageSize = 10, sortBy = 'newest' } = options;

    const [reviews, setReviews] = useState<Review[]>([]);
    const [stats, setStats] = useState<ReviewStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
    const [hasMore, setHasMore] = useState(true);

    // Build query based on sort option
    const getOrderByField = useCallback(() => {
        switch (sortBy) {
            case 'oldest':
                return { field: 'createdAt', direction: 'asc' as const };
            case 'highest':
                return { field: 'rating', direction: 'desc' as const };
            case 'lowest':
                return { field: 'rating', direction: 'asc' as const };
            case 'helpful':
                return { field: 'helpfulVotes', direction: 'desc' as const };
            case 'newest':
            default:
                return { field: 'createdAt', direction: 'desc' as const };
        }
    }, [sortBy]);

    // Fetch reviews stats from product document
    const fetchStats = useCallback(async () => {
        try {
            const productDoc = await getDoc(
                doc(db, 'publicStores', storeId, 'products', productId)
            );
            
            if (productDoc.exists()) {
                const data = productDoc.data();
                if (data.reviewStats) {
                    setStats(data.reviewStats as ReviewStats);
                } else {
                    setStats(defaultStats);
                }
            }
        } catch (err) {
            console.error('Error fetching review stats:', err);
        }
    }, [storeId, productId]);

    // Fetch reviews
    const fetchReviews = useCallback(async (isLoadMore = false) => {
        if (!storeId || !productId) {
            setIsLoading(false);
            return;
        }

        if (isLoadMore) {
            setIsLoadingMore(true);
        } else {
            setIsLoading(true);
            setReviews([]);
            setLastDoc(null);
        }

        setError(null);

        try {
            const reviewsRef = collection(db, 'publicStores', storeId, 'reviews');
            const { field, direction } = getOrderByField();

            let q = query(
                reviewsRef,
                where('productId', '==', productId),
                where('status', '==', 'approved'),
                orderBy(field, direction),
                limit(pageSize)
            );

            if (isLoadMore && lastDoc) {
                q = query(
                    reviewsRef,
                    where('productId', '==', productId),
                    where('status', '==', 'approved'),
                    orderBy(field, direction),
                    startAfter(lastDoc),
                    limit(pageSize)
                );
            }

            const snapshot = await getDocs(q);
            const newReviews = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id,
            } as Review));

            if (isLoadMore) {
                setReviews(prev => [...prev, ...newReviews]);
            } else {
                setReviews(newReviews);
            }

            setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
            setHasMore(snapshot.docs.length === pageSize);
        } catch (err: any) {
            console.error('Error fetching reviews:', err);
            setError(err.message || 'Error al cargar las reseñas');
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [storeId, productId, pageSize, getOrderByField, lastDoc]);

    // Initial fetch
    useEffect(() => {
        fetchStats();
        fetchReviews(false);
    }, [storeId, productId, sortBy]);

    // Load more
    const loadMore = useCallback(async () => {
        if (!isLoadingMore && hasMore) {
            await fetchReviews(true);
        }
    }, [isLoadingMore, hasMore, fetchReviews]);

    // Refetch
    const refetch = useCallback(async () => {
        await fetchStats();
        await fetchReviews(false);
    }, [fetchStats, fetchReviews]);

    return {
        reviews,
        stats,
        isLoading,
        isLoadingMore,
        error,
        hasMore,
        loadMore,
        refetch,
    };
};

/**
 * Hook para enviar una nueva reseña
 */
export const useSubmitReview = (
    storeId: string,
    productId: string,
    productName?: string
): UseSubmitReviewReturn => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submitReview = useCallback(async (data: SubmitReviewData): Promise<{ success: boolean; error?: string }> => {
        if (!storeId || !productId) {
            return { success: false, error: 'Store ID o Product ID no válido' };
        }

        // Validation
        if (data.rating < 1 || data.rating > 5) {
            return { success: false, error: 'La calificación debe ser entre 1 y 5' };
        }

        if (!data.title.trim()) {
            return { success: false, error: 'El título es requerido' };
        }

        if (!data.comment.trim()) {
            return { success: false, error: 'El comentario es requerido' };
        }

        if (!data.customerName.trim()) {
            return { success: false, error: 'El nombre es requerido' };
        }

        if (!data.customerEmail.trim() || !data.customerEmail.includes('@')) {
            return { success: false, error: 'Email válido es requerido' };
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // Create review in the private store (pending status)
            // This requires finding the userId associated with the store
            // For now, we'll create it in a "pendingReviews" collection
            const reviewData: Omit<Review, 'id'> = {
                productId,
                productName: productName || '',
                customerName: data.customerName.trim(),
                customerEmail: data.customerEmail.trim().toLowerCase(),
                rating: data.rating,
                title: data.title.trim(),
                comment: data.comment.trim(),
                verifiedPurchase: false, // Will be checked by cloud function
                status: 'pending' as ReviewStatus,
                helpfulVotes: 0,
                images: data.images || [],
                createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
                updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
            };

            // Add to pending reviews collection for moderation
            await addDoc(
                collection(db, 'pendingReviews', storeId, 'reviews'),
                reviewData
            );

            return { success: true };
        } catch (err: any) {
            console.error('Error submitting review:', err);
            const errorMessage = err.message || 'Error al enviar la reseña';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setIsSubmitting(false);
        }
    }, [storeId, productId, productName]);

    return {
        submitReview,
        isSubmitting,
        error,
    };
};

/**
 * Hook para marcar una reseña como útil
 */
export const useMarkReviewHelpful = (storeId: string) => {
    const [isMarking, setIsMarking] = useState(false);

    const markHelpful = useCallback(async (reviewId: string): Promise<boolean> => {
        if (!storeId || !reviewId) return false;

        // Check localStorage to prevent multiple votes
        const votedKey = `review_voted_${reviewId}`;
        if (localStorage.getItem(votedKey)) {
            return false; // Already voted
        }

        setIsMarking(true);

        try {
            const reviewRef = doc(db, 'publicStores', storeId, 'reviews', reviewId);
            await updateDoc(reviewRef, {
                helpfulVotes: increment(1),
            });

            // Mark as voted in localStorage
            localStorage.setItem(votedKey, 'true');

            return true;
        } catch (err) {
            console.error('Error marking review as helpful:', err);
            return false;
        } finally {
            setIsMarking(false);
        }
    }, [storeId]);

    const hasVoted = useCallback((reviewId: string): boolean => {
        return !!localStorage.getItem(`review_voted_${reviewId}`);
    }, []);

    return {
        markHelpful,
        hasVoted,
        isMarking,
    };
};

export default useProductReviews;
