/**
 * useProductReviews Hook
 * Hook para obtener y enviar reseñas de productos en el storefront
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabase';
import { Review, ReviewStats, ReviewStatus } from '../../../types/ecommerce';
import { mapReviewFromDB } from '../../../utils/ecommerceMappers';

const STOREFRONT_API_FUNCTION = 'storefront-api';

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

const defaultStats: ReviewStats = {
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

const getOrderByField = (sortBy: ReviewSortBy) => {
    switch (sortBy) {
        case 'oldest':
            return { field: 'created_at', ascending: true };
        case 'highest':
            return { field: 'rating', ascending: false };
        case 'lowest':
            return { field: 'rating', ascending: true };
        case 'helpful':
            return { field: 'helpful_votes', ascending: false };
        case 'newest':
        default:
            return { field: 'created_at', ascending: false };
    }
};

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
    const [loadedCount, setLoadedCount] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const fetchStats = useCallback(async () => {
        if (!storeId || !productId) {
            setStats(defaultStats);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('store_reviews')
                .select('rating')
                .eq('project_id', storeId)
                .eq('product_id', productId)
                .eq('status', 'approved');

            if (error) throw error;

            const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            let totalRating = 0;

            for (const review of data || []) {
                const rating = Math.max(1, Math.min(5, Number(review.rating || 0))) as 1 | 2 | 3 | 4 | 5;
                distribution[rating] += 1;
                totalRating += rating;
            }

            const totalReviews = data?.length || 0;
            setStats({
                averageRating: totalReviews ? totalRating / totalReviews : 0,
                totalReviews,
                ratingDistribution: distribution,
            });
        } catch (err) {
            console.error('Error fetching review stats:', err);
            setStats(defaultStats);
        }
    }, [storeId, productId]);

    const fetchReviews = useCallback(
        async (isLoadMore = false) => {
            if (!storeId || !productId) {
                setIsLoading(false);
                return;
            }

            if (isLoadMore) {
                setIsLoadingMore(true);
            } else {
                setIsLoading(true);
                setReviews([]);
                setLoadedCount(0);
            }

            setError(null);

            try {
                const { field, ascending } = getOrderByField(sortBy);
                const from = isLoadMore ? loadedCount : 0;
                const to = from + pageSize - 1;

                const { data, error } = await supabase
                    .from('store_reviews')
                    .select('*')
                    .eq('project_id', storeId)
                    .eq('product_id', productId)
                    .eq('status', 'approved')
                    .order(field, { ascending })
                    .range(from, to);

                if (error) throw error;

                const nextReviews = (data || []).map(mapReviewFromDB);
                setReviews((prev) => (isLoadMore ? [...prev, ...nextReviews] : nextReviews));
                setLoadedCount(from + nextReviews.length);
                setHasMore(nextReviews.length === pageSize);
            } catch (err: any) {
                console.error('Error fetching reviews:', err);
                setError(err.message || 'Error al cargar las reseñas');
            } finally {
                setIsLoading(false);
                setIsLoadingMore(false);
            }
        },
        [storeId, productId, pageSize, sortBy, loadedCount]
    );

    useEffect(() => {
        void fetchStats();
        void fetchReviews(false);
    }, [fetchStats, storeId, productId, sortBy]);

    const loadMore = useCallback(async () => {
        if (!isLoadingMore && hasMore) {
            await fetchReviews(true);
        }
    }, [isLoadingMore, hasMore, fetchReviews]);

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
            const { error } = await supabase
                .from('store_reviews')
                .insert({
                    project_id: storeId,
                    product_id: productId,
                    product_name: productName || null,
                    customer_name: data.customerName.trim(),
                    customer_email: data.customerEmail.trim().toLowerCase(),
                    rating: data.rating,
                    title: data.title.trim(),
                    comment: data.comment.trim(),
                    verified_purchase: false,
                    status: 'pending' as ReviewStatus,
                    helpful_votes: 0,
                    images: data.images || [],
                });

            if (error) throw error;
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

export const useMarkReviewHelpful = (storeId: string) => {
    const [isMarking, setIsMarking] = useState(false);

    const markHelpful = useCallback(async (reviewId: string): Promise<boolean> => {
        if (!storeId || !reviewId) return false;

        const votedKey = `review_voted_${reviewId}`;
        if (localStorage.getItem(votedKey)) {
            return false;
        }

	        setIsMarking(true);

	        try {
            const result = await supabase.functions.invoke(STOREFRONT_API_FUNCTION, {
	                body: {
	                    action: 'markStoreReviewHelpful',
	                    storeId,
	                    reviewId,
	                },
	            });

	            if (result.error || result.data?.error) {
	                throw new Error(result.error?.message || result.data?.error || 'Error al marcar la reseña');
	            }

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
