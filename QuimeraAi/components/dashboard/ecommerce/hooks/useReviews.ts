/**
 * useReviews Hook
 * Hook para gestión y moderación de reseñas en el dashboard en Supabase
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../../supabase';
import { Review, ReviewStatus } from '../../../../types/ecommerce';
import { mapReviewFromDB, mapReviewToDB } from '../../../../utils/ecommerceMappers';
import { createRealtimeChannelName } from './realtimeChannel';

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
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const effectiveStoreId = storeId || '';

    const fetchReviews = useCallback(async () => {
        if (!effectiveStoreId) return;

        setIsLoading(true);
        let query = supabase
            .from('store_reviews')
            .select('*')
            .eq('project_id', effectiveStoreId)
            .order('created_at', { ascending: false });

        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        if (productFilter) {
            query = query.eq('product_id', productFilter);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
            console.error('Error fetching reviews:', fetchError);
            setError(fetchError.message);
        } else {
            setReviews((data || []).map(mapReviewFromDB));
            setError(null);
        }
        setIsLoading(false);
    }, [effectiveStoreId, statusFilter, productFilter]);

    useEffect(() => {
        if (!userId || !effectiveStoreId) {
            setIsLoading(false);
            return;
        }

        fetchReviews();

        const channel = supabase.channel(createRealtimeChannelName('store_reviews_changes', effectiveStoreId))
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'store_reviews',
                    filter: `project_id=eq.${effectiveStoreId}`
                },
                () => {
                    fetchReviews();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, effectiveStoreId, fetchReviews]);

    // Separate pending reviews for convenience (since old implementation had them separate)
    const pendingReviews = useMemo(() => {
        return reviews.filter(r => r.status === 'pending');
    }, [reviews]);

    // Stats
    const stats = useMemo(() => {
        return {
            totalReviews: reviews.length,
            pendingCount: reviews.filter((r) => r.status === 'pending').length,
            approvedCount: reviews.filter((r) => r.status === 'approved').length,
            rejectedCount: reviews.filter((r) => r.status === 'rejected').length,
        };
    }, [reviews]);

    // Approve review
    const approveReview = useCallback(async (reviewId: string) => {
        try {
            const { error } = await supabase
                .from('store_reviews')
                .update({ status: 'approved' })
                .eq('id', reviewId);

            if (error) throw error;
        } catch (err: any) {
            console.error('Error approving review:', err);
            throw new Error(err.message || 'Error al aprobar la reseña');
        }
    }, []);

    // Reject review
    const rejectReview = useCallback(async (reviewId: string) => {
        try {
            const { error } = await supabase
                .from('store_reviews')
                .update({ status: 'rejected' })
                .eq('id', reviewId);

            if (error) throw error;
        } catch (err: any) {
            console.error('Error rejecting review:', err);
            throw new Error(err.message || 'Error al rechazar la reseña');
        }
    }, []);

    // Delete review
    const deleteReview = useCallback(async (reviewId: string) => {
        try {
            const { error } = await supabase
                .from('store_reviews')
                .delete()
                .eq('id', reviewId);

            if (error) throw error;
        } catch (err: any) {
            console.error('Error deleting review:', err);
            throw new Error(err.message || 'Error al eliminar la reseña');
        }
    }, []);

    // Respond to review
    const respondToReview = useCallback(async (reviewId: string, response: string) => {
        try {
            // Update the record; custom `admin_response_at` isn't native to the old schema but we can
            // rely on standard triggers or map if we had added it. We'll just update the response for now.
            // (Wait, I added adminResponseAt to the mapper just in case, but let's see if we should save it.
            //  In supabase DB schema, we don't have `admin_response_at`. So just `admin_response`.)
            const { error } = await supabase
                .from('store_reviews')
                .update({ admin_response: response })
                .eq('id', reviewId);

            if (error) throw error;
        } catch (err: any) {
            console.error('Error responding to review:', err);
            throw new Error(err.message || 'Error al responder la reseña');
        }
    }, []);

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
        reviews, // Now includes all queried reviews (pending/approved/etc)
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
