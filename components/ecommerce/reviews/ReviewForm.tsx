/**
 * ReviewForm Component
 * Formulario para enviar una nueva reseña
 */

import React, { useState } from 'react';
import { X, Send, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import RatingStars from './RatingStars';
import { ReviewColors } from './ReviewSummary';

interface ReviewFormProps {
    productName: string;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
        rating: number;
        title: string;
        comment: string;
        customerName: string;
        customerEmail: string;
    }) => Promise<{ success: boolean; error?: string }>;
    primaryColor?: string;
    colors?: ReviewColors;
}

const defaultColors: ReviewColors = {
    primary: '#6366f1',
    heading: '#1f2937',
    text: '#6b7280',
    mutedText: '#9ca3af',
    cardBackground: '#ffffff',
    border: '#e5e7eb',
    buttonBackground: '#6366f1',
    buttonText: '#ffffff',
    starColor: '#facc15',
};

const ReviewForm: React.FC<ReviewFormProps> = ({
    productName,
    isOpen,
    onClose,
    onSubmit,
    primaryColor,
    colors: propColors,
}) => {
    // Merge colors
    const colors = {
        ...defaultColors,
        ...propColors,
        primary: propColors?.primary || primaryColor || defaultColors.primary,
        buttonBackground: propColors?.buttonBackground || primaryColor || defaultColors.buttonBackground,
    };
    const [rating, setRating] = useState(0);
    const [title, setTitle] = useState('');
    const [comment, setComment] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const resetForm = () => {
        setRating(0);
        setTitle('');
        setComment('');
        setCustomerName('');
        setCustomerEmail('');
        setError(null);
        setSuccess(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (rating === 0) {
            setError('Por favor selecciona una calificación');
            return;
        }

        if (!title.trim()) {
            setError('Por favor escribe un título');
            return;
        }

        if (!comment.trim()) {
            setError('Por favor escribe tu opinión');
            return;
        }

        if (!customerName.trim()) {
            setError('Por favor escribe tu nombre');
            return;
        }

        if (!customerEmail.trim() || !customerEmail.includes('@')) {
            setError('Por favor escribe un email válido');
            return;
        }

        setIsSubmitting(true);

        const result = await onSubmit({
            rating,
            title: title.trim(),
            comment: comment.trim(),
            customerName: customerName.trim(),
            customerEmail: customerEmail.trim(),
        });

        setIsSubmitting(false);

        if (result.success) {
            setSuccess(true);
            // Close after 2 seconds
            setTimeout(() => {
                handleClose();
            }, 2000);
        } else {
            setError(result.error || 'Error al enviar la reseña');
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
                onClick={handleClose}
            />

            {/* Modal */}
            <div 
                className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg md:max-h-[90vh] rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
                style={{ backgroundColor: colors.cardBackground }}
            >
                {/* Header */}
                <div 
                    className="flex items-center justify-between p-6 border-b"
                    style={{ borderColor: colors.border }}
                >
                    <div>
                        <h2 
                            className="text-xl font-bold"
                            style={{ color: colors.heading }}
                        >
                            Escribir una reseña
                        </h2>
                        <p className="text-sm mt-1" style={{ color: colors.mutedText }}>
                            {productName}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-full transition-colors hover:opacity-80"
                        style={{ color: colors.mutedText }}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {success ? (
                        <div className="text-center py-8">
                            <div
                                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                                style={{ backgroundColor: `${colors.primary}20` }}
                            >
                                <CheckCircle size={32} style={{ color: colors.primary }} />
                            </div>
                            <h3 
                                className="text-xl font-bold mb-2"
                                style={{ color: colors.heading }}
                            >
                                ¡Gracias por tu reseña!
                            </h3>
                            <p style={{ color: colors.mutedText }}>
                                Tu reseña será revisada y publicada pronto.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Error Message */}
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                                    <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                                    <p className="text-red-700 text-sm">{error}</p>
                                </div>
                            )}

                            {/* Rating */}
                            <div>
                                <label 
                                    className="block text-sm font-medium mb-3"
                                    style={{ color: colors.text }}
                                >
                                    Calificación *
                                </label>
                                <RatingStars
                                    rating={rating}
                                    size="lg"
                                    interactive
                                    onChange={setRating}
                                    color={colors.starColor}
                                />
                                {rating > 0 && (
                                    <p className="text-sm mt-2" style={{ color: colors.mutedText }}>
                                        {rating === 5 && '¡Excelente!'}
                                        {rating === 4 && 'Muy bueno'}
                                        {rating === 3 && 'Regular'}
                                        {rating === 2 && 'Malo'}
                                        {rating === 1 && 'Muy malo'}
                                    </p>
                                )}
                            </div>

                            {/* Title */}
                            <div>
                                <label 
                                    className="block text-sm font-medium mb-2"
                                    style={{ color: colors.text }}
                                >
                                    Título de tu reseña *
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Resume tu experiencia en pocas palabras"
                                    maxLength={100}
                                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2"
                                    style={{ 
                                        borderColor: colors.border, 
                                        backgroundColor: colors.cardBackground,
                                        color: colors.heading,
                                        '--tw-ring-color': colors.primary 
                                    } as React.CSSProperties}
                                />
                            </div>

                            {/* Comment */}
                            <div>
                                <label 
                                    className="block text-sm font-medium mb-2"
                                    style={{ color: colors.text }}
                                >
                                    Tu opinión *
                                </label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Cuéntanos qué te pareció el producto..."
                                    rows={4}
                                    maxLength={1000}
                                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 resize-none"
                                    style={{ 
                                        borderColor: colors.border, 
                                        backgroundColor: colors.cardBackground,
                                        color: colors.heading,
                                        '--tw-ring-color': colors.primary 
                                    } as React.CSSProperties}
                                />
                                <p className="text-xs mt-1 text-right" style={{ color: colors.mutedText }}>
                                    {comment.length}/1000
                                </p>
                            </div>

                            {/* Customer Name */}
                            <div>
                                <label 
                                    className="block text-sm font-medium mb-2"
                                    style={{ color: colors.text }}
                                >
                                    Tu nombre *
                                </label>
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="¿Cómo te llamas?"
                                    maxLength={50}
                                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2"
                                    style={{ 
                                        borderColor: colors.border, 
                                        backgroundColor: colors.cardBackground,
                                        color: colors.heading,
                                        '--tw-ring-color': colors.primary 
                                    } as React.CSSProperties}
                                />
                            </div>

                            {/* Customer Email */}
                            <div>
                                <label 
                                    className="block text-sm font-medium mb-2"
                                    style={{ color: colors.text }}
                                >
                                    Tu email *
                                </label>
                                <input
                                    type="email"
                                    value={customerEmail}
                                    onChange={(e) => setCustomerEmail(e.target.value)}
                                    placeholder="tu@email.com"
                                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2"
                                    style={{ 
                                        borderColor: colors.border, 
                                        backgroundColor: colors.cardBackground,
                                        color: colors.heading,
                                        '--tw-ring-color': colors.primary 
                                    } as React.CSSProperties}
                                />
                                <p className="text-xs mt-1" style={{ color: colors.mutedText }}>
                                    No se mostrará públicamente
                                </p>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors hover:opacity-90"
                                style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText }}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Send size={20} />
                                        Enviar reseña
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </>
    );
};

export default ReviewForm;
