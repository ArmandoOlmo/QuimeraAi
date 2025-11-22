import React, { useState } from 'react';
import { ComponentRating as ComponentRatingType, CustomComponent } from '../../../types';
import { Star, ThumbsUp, User } from 'lucide-react';
import { useEditor } from '../../../contexts/EditorContext';

interface ComponentRatingProps {
    component: CustomComponent;
    onRatingAdded?: () => void;
}

const ComponentRating: React.FC<ComponentRatingProps> = ({ component, onRatingAdded }) => {
    const { userDocument } = useEditor();
    const [showAddReview, setShowAddReview] = useState(false);
    const [newRating, setNewRating] = useState(5);
    const [newComment, setNewComment] = useState('');
    const [hoverRating, setHoverRating] = useState(0);

    const ratings = component.ratings || [];
    const averageRating = component.averageRating || (ratings.length > 0 ? ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length : 0);

    const handleSubmitReview = async () => {
        if (!userDocument) {
            alert('You must be logged in to submit a review');
            return;
        }

        // In a real application, this would save to Firebase
        const newReview: ComponentRatingType = {
            id: Date.now().toString(),
            componentId: component.id,
            userId: userDocument.uid,
            userName: userDocument.email || 'Anonymous',
            rating: newRating,
            comment: newComment,
            createdAt: new Date().toISOString(),
            helpful: 0,
        };

        console.log('Submitting review:', newReview);
        
        // TODO: Save to Firebase
        // const ratingsRef = collection(db, 'customComponents', component.id, 'ratings');
        // await addDoc(ratingsRef, newReview);

        alert('Review submitted successfully!');
        setShowAddReview(false);
        setNewComment('');
        setNewRating(5);
        
        if (onRatingAdded) {
            onRatingAdded();
        }
    };

    const formatDate = (date: any): string => {
        if (!date) return 'Unknown';
        if (typeof date === 'string') {
            return new Date(date).toLocaleDateString();
        }
        if (date.seconds) {
            return new Date(date.seconds * 1000).toLocaleDateString();
        }
        return 'Unknown';
    };

    const renderStars = (rating: number, interactive: boolean = false, size: 'sm' | 'md' | 'lg' = 'md') => {
        const sizeClass = size === 'sm' ? 16 : size === 'lg' ? 32 : 20;
        
        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => {
                    const displayRating = interactive ? (hoverRating || newRating) : rating;
                    const isFilled = star <= displayRating;
                    
                    return (
                        <button
                            key={star}
                            type="button"
                            disabled={!interactive}
                            onClick={() => interactive && setNewRating(star)}
                            onMouseEnter={() => interactive && setHoverRating(star)}
                            onMouseLeave={() => interactive && setHoverRating(0)}
                            className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
                        >
                            <Star
                                size={sizeClass}
                                className={isFilled ? 'text-yellow-400' : 'text-editor-border'}
                                fill={isFilled ? 'currentColor' : 'none'}
                            />
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Average Rating Summary */}
            <div className="flex items-center gap-6 p-4 bg-editor-bg rounded-lg border border-editor-border">
                <div className="text-center">
                    <div className="text-4xl font-bold text-editor-text-primary mb-1">
                        {averageRating.toFixed(1)}
                    </div>
                    {renderStars(averageRating, false, 'md')}
                    <div className="text-sm text-editor-text-secondary mt-2">
                        {ratings.length} {ratings.length === 1 ? 'review' : 'reviews'}
                    </div>
                </div>

                <div className="flex-1">
                    {/* Rating Distribution */}
                    {[5, 4, 3, 2, 1].map((star) => {
                        const count = ratings.filter((r) => r.rating === star).length;
                        const percentage = ratings.length > 0 ? (count / ratings.length) * 100 : 0;
                        
                        return (
                            <div key={star} className="flex items-center gap-2 mb-1">
                                <span className="text-sm text-editor-text-secondary w-8">{star} ★</span>
                                <div className="flex-1 h-2 bg-editor-border rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-yellow-400"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <span className="text-sm text-editor-text-secondary w-8 text-right">{count}</span>
                            </div>
                        );
                    })}
                </div>

                <button
                    onClick={() => setShowAddReview(!showAddReview)}
                    className="px-4 py-2 bg-editor-accent text-editor-bg font-bold rounded-lg hover:bg-opacity-90 transition-all whitespace-nowrap"
                >
                    {showAddReview ? 'Cancel' : 'Write Review'}
                </button>
            </div>

            {/* Add Review Form */}
            {showAddReview && (
                <div className="p-4 bg-editor-panel-bg border border-editor-border rounded-lg space-y-4">
                    <h3 className="text-lg font-bold text-editor-text-primary">Write a Review</h3>
                    
                    <div>
                        <label className="block text-sm font-medium text-editor-text-secondary mb-2">
                            Your Rating
                        </label>
                        {renderStars(newRating, true, 'lg')}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-editor-text-secondary mb-2">
                            Your Review (optional)
                        </label>
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Share your experience with this component..."
                            className="w-full h-32 px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary placeholder-editor-text-secondary focus:outline-none focus:ring-2 focus:ring-editor-accent resize-none"
                        />
                    </div>

                    <button
                        onClick={handleSubmitReview}
                        className="px-6 py-2 bg-editor-accent text-editor-bg font-bold rounded-lg hover:bg-opacity-90 transition-all"
                    >
                        Submit Review
                    </button>
                </div>
            )}

            {/* Reviews List */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-editor-text-primary">Reviews</h3>
                
                {ratings.length === 0 ? (
                    <div className="text-center py-8 text-editor-text-secondary">
                        No reviews yet. Be the first to review this component!
                    </div>
                ) : (
                    ratings.map((rating) => (
                        <div
                            key={rating.id}
                            className="p-4 bg-editor-panel-bg border border-editor-border rounded-lg space-y-3"
                        >
                            {/* Review Header */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-editor-accent/20 flex items-center justify-center">
                                        <User size={20} className="text-editor-accent" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-editor-text-primary">
                                            {rating.userName || 'Anonymous'}
                                        </div>
                                        <div className="text-sm text-editor-text-secondary">
                                            {formatDate(rating.createdAt)}
                                        </div>
                                    </div>
                                </div>
                                {renderStars(rating.rating, false, 'sm')}
                            </div>

                            {/* Review Comment */}
                            {rating.comment && (
                                <p className="text-editor-text-secondary">{rating.comment}</p>
                            )}

                            {/* Helpful Button */}
                            <button
                                className="flex items-center gap-2 text-sm text-editor-text-secondary hover:text-editor-accent transition-colors"
                                onClick={() => {
                                    // TODO: Implement helpful vote
                                    console.log('Mark as helpful:', rating.id);
                                }}
                            >
                                <ThumbsUp size={16} />
                                <span>Helpful {rating.helpful ? `(${rating.helpful})` : ''}</span>
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ComponentRating;

