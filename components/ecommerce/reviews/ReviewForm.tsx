/**
 * ReviewForm Component
 * Formulario para enviar una nueva reseña
 */

import React, { useState } from 'react';
import { X, Send, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import RatingStars from './RatingStars';

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
}

const ReviewForm: React.FC<ReviewFormProps> = ({
    productName,
    isOpen,
    onClose,
    onSubmit,
    primaryColor = '#6366f1',
}) => {
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
            <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg md:max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            Escribir una reseña
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {productName}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
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
                                style={{ backgroundColor: `${primaryColor}20` }}
                            >
                                <CheckCircle size={32} style={{ color: primaryColor }} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                ¡Gracias por tu reseña!
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                Tu reseña será revisada y publicada pronto.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Error Message */}
                            {error && (
                                <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg flex items-center gap-3">
                                    <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                                    <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                                </div>
                            )}

                            {/* Rating */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    Calificación *
                                </label>
                                <RatingStars
                                    rating={rating}
                                    size="lg"
                                    interactive
                                    onChange={setRating}
                                />
                                {rating > 0 && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
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
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Título de tu reseña *
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Resume tu experiencia en pocas palabras"
                                    maxLength={100}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2"
                                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                />
                            </div>

                            {/* Comment */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Tu opinión *
                                </label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Cuéntanos qué te pareció el producto..."
                                    rows={4}
                                    maxLength={1000}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 resize-none"
                                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                />
                                <p className="text-xs text-gray-400 mt-1 text-right">
                                    {comment.length}/1000
                                </p>
                            </div>

                            {/* Customer Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Tu nombre *
                                </label>
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="¿Cómo te llamas?"
                                    maxLength={50}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2"
                                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                />
                            </div>

                            {/* Customer Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Tu email *
                                </label>
                                <input
                                    type="email"
                                    value={customerEmail}
                                    onChange={(e) => setCustomerEmail(e.target.value)}
                                    placeholder="tu@email.com"
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2"
                                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    No se mostrará públicamente
                                </p>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                                style={{ backgroundColor: primaryColor }}
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
