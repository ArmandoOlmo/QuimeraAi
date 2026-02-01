/**
 * ReviewsView
 * Vista de moderación de reseñas en el dashboard
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Star,
    Search,
    Check,
    X,
    Trash2,
    MessageSquare,
    Filter,
    ChevronDown,
    Loader2,
    AlertCircle,
    User,
    Package,
    Clock,
    ThumbsUp,
    Reply,
} from 'lucide-react';
import { useAuth } from '../../../../contexts/core/AuthContext';
import { useEditor } from '../../../../contexts/EditorContext';
import { useReviews } from '../hooks/useReviews';
import { useProducts } from '../hooks/useProducts';
import { Review, ReviewStatus } from '../../../../types/ecommerce';
import { useEcommerceContext } from '../EcommerceDashboard';

type StatusFilter = ReviewStatus | 'all';

const ReviewsView: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { storeId } = useEcommerceContext();
    const { products } = useProducts(user?.uid || '', storeId);
    const {
        reviews,
        pendingReviews,
        isLoading,
        error,
        totalReviews,
        pendingCount,
        approvedCount,
        rejectedCount,
        approveReview,
        rejectReview,
        deleteReview,
        respondToReview,
    } = useReviews(user?.uid || '', storeId);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [productFilter, setProductFilter] = useState('');
    const [selectedReview, setSelectedReview] = useState<Review | null>(null);
    const [showResponseModal, setShowResponseModal] = useState(false);
    const [responseText, setResponseText] = useState('');
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    // Filter reviews
    const filteredReviews = useMemo(() => {
        return reviews.filter((review) => {
            const matchesSearch =
                !searchTerm ||
                review.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                review.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                review.comment.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'all' || review.status === statusFilter;
            const matchesProduct = !productFilter || review.productId === productFilter;

            return matchesSearch && matchesStatus && matchesProduct;
        });
    }, [reviews, searchTerm, statusFilter, productFilter]);

    // Get product name by ID
    const getProductName = (productId: string) => {
        const product = products.find((p) => p.id === productId);
        return product?.name || 'Producto desconocido';
    };

    // Format date
    const formatDate = (timestamp: { seconds: number }) => {
        return new Date(timestamp.seconds * 1000).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // Handle approve
    const handleApprove = async (reviewId: string) => {
        setIsProcessing(reviewId);
        try {
            await approveReview(reviewId);
        } catch (err) {
            console.error('Error approving review:', err);
        }
        setIsProcessing(null);
    };

    // Handle reject
    const handleReject = async (reviewId: string) => {
        setIsProcessing(reviewId);
        try {
            await rejectReview(reviewId);
        } catch (err) {
            console.error('Error rejecting review:', err);
        }
        setIsProcessing(null);
    };

    // Handle delete
    const handleDelete = async (reviewId: string) => {
        if (!confirm(t('ecommerce.confirmDeleteReview', '¿Estás seguro de eliminar esta reseña?'))) {
            return;
        }
        setIsProcessing(reviewId);
        try {
            await deleteReview(reviewId);
        } catch (err) {
            console.error('Error deleting review:', err);
        }
        setIsProcessing(null);
    };

    // Handle response
    const handleOpenResponse = (review: Review) => {
        setSelectedReview(review);
        setResponseText(review.adminResponse || '');
        setShowResponseModal(true);
    };

    const handleSubmitResponse = async () => {
        if (!selectedReview || !responseText.trim()) return;

        setIsProcessing(selectedReview.id);
        try {
            await respondToReview(selectedReview.id, responseText.trim());
            setShowResponseModal(false);
            setSelectedReview(null);
            setResponseText('');
        } catch (err) {
            console.error('Error responding to review:', err);
        }
        setIsProcessing(null);
    };

    // Status badge component
    const StatusBadge: React.FC<{ status: ReviewStatus }> = ({ status }) => {
        const styles = {
            pending: 'bg-yellow-500/20 text-yellow-400',
            approved: 'bg-green-500/20 text-green-400',
            rejected: 'bg-red-500/20 text-red-400',
        };

        const labels = {
            pending: 'Pendiente',
            approved: 'Aprobada',
            rejected: 'Rechazada',
        };

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
                {labels[status]}
            </span>
        );
    };

    // Rating stars component
    const RatingDisplay: React.FC<{ rating: number }> = ({ rating }) => (
        <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
                <Star
                    key={i}
                    size={14}
                    className={i < rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}
                    fill={i < rating ? 'currentColor' : 'none'}
                />
            ))}
        </div>
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">
                        {t('ecommerce.reviews', 'Reseñas')}
                    </h2>
                    <p className="text-muted-foreground">
                        {t('ecommerce.manageReviews', 'Modera las reseñas de tus productos')}
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card/50 rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                            <MessageSquare className="text-primary" size={20} />
                        </div>
                        <div>
                            <p className="text-muted-foreground text-sm">Total</p>
                            <p className="text-2xl font-bold text-foreground">{totalReviews}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-card/50 rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-500/20 rounded-lg">
                            <Clock className="text-yellow-400" size={20} />
                        </div>
                        <div>
                            <p className="text-muted-foreground text-sm">Pendientes</p>
                            <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-card/50 rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                            <Check className="text-green-400" size={20} />
                        </div>
                        <div>
                            <p className="text-muted-foreground text-sm">Aprobadas</p>
                            <p className="text-2xl font-bold text-foreground">{approvedCount}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-card/50 rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/20 rounded-lg">
                            <X className="text-red-400" size={20} />
                        </div>
                        <div>
                            <p className="text-muted-foreground text-sm">Rechazadas</p>
                            <p className="text-2xl font-bold text-foreground">{rejectedCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-card/50 rounded-xl p-4 border border-border">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="flex items-center gap-2 flex-1 bg-editor-border/40 rounded-lg px-3 py-2">
                        <Search className="w-4 h-4 text-editor-text-secondary flex-shrink-0" />
                        <input
                            type="text"
                            placeholder={t('ecommerce.searchReviews', 'Buscar reseñas...')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 bg-transparent outline-none text-sm min-w-0"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                        className="px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                        <option value="all">{t('ecommerce.allStatuses', 'Todos los estados')}</option>
                        <option value="pending">{t('ecommerce.pending', 'Pendientes')}</option>
                        <option value="approved">{t('ecommerce.approved', 'Aprobadas')}</option>
                        <option value="rejected">{t('ecommerce.rejected', 'Rechazadas')}</option>
                    </select>

                    {/* Product Filter */}
                    <select
                        value={productFilter}
                        onChange={(e) => setProductFilter(e.target.value)}
                        className="px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                        <option value="">{t('ecommerce.allProducts', 'Todos los productos')}</option>
                        {products.map((product) => (
                            <option key={product.id} value={product.id}>
                                {product.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Reviews List */}
            {filteredReviews.length === 0 ? (
                <div className="text-center py-12">
                    <MessageSquare className="mx-auto text-muted-foreground mb-4" size={48} />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        {t('ecommerce.noReviews', 'No hay reseñas')}
                    </h3>
                    <p className="text-muted-foreground">
                        {searchTerm || statusFilter !== 'all' || productFilter
                            ? t('ecommerce.noReviewsFilter', 'No se encontraron reseñas con los filtros aplicados')
                            : t('ecommerce.noReviewsYet', 'Aún no has recibido ninguna reseña')}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredReviews.map((review) => (
                        <div
                            key={review.id}
                            className="bg-card/50 rounded-xl p-6 border border-border"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                        <User className="text-primary" size={20} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-foreground">
                                                {review.customerName}
                                            </span>
                                            <StatusBadge status={review.status} />
                                            {review.verifiedPurchase && (
                                                <span className="text-xs text-green-400 flex items-center gap-1">
                                                    <Check size={12} />
                                                    Verificada
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {review.customerEmail}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <RatingDisplay rating={review.rating} />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {formatDate(review.createdAt)}
                                    </p>
                                </div>
                            </div>

                            {/* Product Info */}
                            <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                                <Package size={14} />
                                <span>{review.productName || getProductName(review.productId)}</span>
                            </div>

                            {/* Content */}
                            <h4 className="font-semibold text-foreground mb-2">{review.title}</h4>
                            <p className="text-muted-foreground mb-4">{review.comment}</p>

                            {/* Helpful Count */}
                            {review.helpfulVotes > 0 && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                                    <ThumbsUp size={14} />
                                    <span>{review.helpfulVotes} personas encontraron esto útil</span>
                                </div>
                            )}

                            {/* Admin Response */}
                            {review.adminResponse && (
                                <div className="p-4 bg-muted/30 rounded-lg border-l-4 border-primary mb-4">
                                    <p className="text-sm font-medium text-foreground mb-1">
                                        Tu respuesta:
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {review.adminResponse}
                                    </p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-2 pt-4 border-t border-border">
                                {review.status === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => handleApprove(review.id)}
                                            disabled={isProcessing === review.id}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
                                        >
                                            {isProcessing === review.id ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <Check size={16} />
                                            )}
                                            Aprobar
                                        </button>
                                        <button
                                            onClick={() => handleReject(review.id)}
                                            disabled={isProcessing === review.id}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                                        >
                                            <X size={16} />
                                            Rechazar
                                        </button>
                                    </>
                                )}
                                
                                {review.status === 'approved' && (
                                    <button
                                        onClick={() => handleOpenResponse(review)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
                                    >
                                        <Reply size={16} />
                                        {review.adminResponse ? 'Editar respuesta' : 'Responder'}
                                    </button>
                                )}

                                <button
                                    onClick={() => handleDelete(review.id)}
                                    disabled={isProcessing === review.id}
                                    className="flex items-center gap-2 px-3 py-1.5 text-muted-foreground hover:text-destructive hover:bg-muted rounded-lg transition-colors disabled:opacity-50 ml-auto"
                                >
                                    <Trash2 size={16} />
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Response Modal */}
            {showResponseModal && selectedReview && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-xl border border-border w-full max-w-lg">
                        <div className="p-6 border-b border-border">
                            <h3 className="text-lg font-bold text-foreground">
                                Responder a la reseña
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                de {selectedReview.customerName}
                            </p>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Original Review */}
                            <div className="p-4 bg-muted/30 rounded-lg">
                                <RatingDisplay rating={selectedReview.rating} />
                                <h4 className="font-medium text-foreground mt-2">{selectedReview.title}</h4>
                                <p className="text-sm text-muted-foreground mt-1">{selectedReview.comment}</p>
                            </div>

                            {/* Response Input */}
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-2">
                                    Tu respuesta
                                </label>
                                <textarea
                                    value={responseText}
                                    onChange={(e) => setResponseText(e.target.value)}
                                    rows={4}
                                    placeholder="Escribe tu respuesta..."
                                    className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowResponseModal(false);
                                        setSelectedReview(null);
                                        setResponseText('');
                                    }}
                                    className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSubmitResponse}
                                    disabled={!responseText.trim() || isProcessing === selectedReview.id}
                                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg transition-colors hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isProcessing === selectedReview.id ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <Reply size={18} />
                                    )}
                                    Publicar respuesta
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReviewsView;
