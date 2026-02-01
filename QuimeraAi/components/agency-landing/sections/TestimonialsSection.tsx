/**
 * TestimonialsSection
 * Testimonials section for agency landing page
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';
import { TestimonialsSection as TestimonialsData, LandingBranding } from '../../../types/agencyLanding';

interface TestimonialsSectionProps {
    data: TestimonialsData;
    branding?: LandingBranding;
}

export function TestimonialsSection({ data, branding }: TestimonialsSectionProps) {
    const primaryColor = branding?.primaryColor || '#4f46e5';
    const [activeIndex, setActiveIndex] = useState(0);

    const nextTestimonial = () => {
        setActiveIndex((prev) => (prev + 1) % data.testimonials.length);
    };

    const prevTestimonial = () => {
        setActiveIndex((prev) => (prev - 1 + data.testimonials.length) % data.testimonials.length);
    };

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                className={`w-5 h-5 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
            />
        ));
    };

    if (data.layout === 'carousel') {
        return (
            <section id="testimonials" className="py-20 md:py-32 bg-white">
                <div className="max-w-5xl mx-auto px-6 md:px-12">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                            {data.title}
                        </h2>
                        {data.subtitle && (
                            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                                {data.subtitle}
                            </p>
                        )}
                    </motion.div>

                    {/* Carousel */}
                    <div className="relative">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeIndex}
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.4 }}
                                className="text-center"
                            >
                                {/* Quote Icon */}
                                <Quote
                                    className="w-16 h-16 mx-auto mb-8 opacity-20"
                                    style={{ color: primaryColor }}
                                />

                                {/* Quote */}
                                <blockquote className="text-xl md:text-2xl lg:text-3xl text-gray-800 mb-8 italic">
                                    "{data.testimonials[activeIndex].quote}"
                                </blockquote>

                                {/* Rating */}
                                {data.showRating && data.testimonials[activeIndex].rating && (
                                    <div className="flex justify-center gap-1 mb-6">
                                        {renderStars(data.testimonials[activeIndex].rating!)}
                                    </div>
                                )}

                                {/* Author */}
                                <div className="flex items-center justify-center gap-4">
                                    {data.testimonials[activeIndex].avatarUrl && (
                                        <img
                                            src={data.testimonials[activeIndex].avatarUrl}
                                            alt={data.testimonials[activeIndex].author}
                                            className="w-14 h-14 rounded-full object-cover"
                                        />
                                    )}
                                    <div className="text-left">
                                        <p className="font-semibold text-gray-900">
                                            {data.testimonials[activeIndex].author}
                                        </p>
                                        {(data.testimonials[activeIndex].role || data.testimonials[activeIndex].company) && (
                                            <p className="text-gray-500">
                                                {data.testimonials[activeIndex].role}
                                                {data.testimonials[activeIndex].role && data.testimonials[activeIndex].company && ' - '}
                                                {data.testimonials[activeIndex].company}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        {/* Navigation */}
                        {data.testimonials.length > 1 && (
                            <>
                                <button
                                    onClick={prevTestimonial}
                                    className="absolute left-0 top-1/2 -translate-y-1/2 p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={nextTestimonial}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            </>
                        )}

                        {/* Dots */}
                        <div className="flex justify-center gap-2 mt-8">
                            {data.testimonials.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveIndex(idx)}
                                    className={`w-2 h-2 rounded-full transition-all ${
                                        idx === activeIndex ? 'w-8' : 'bg-gray-300'
                                    }`}
                                    style={{
                                        backgroundColor: idx === activeIndex ? primaryColor : undefined,
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    // Cards layout
    return (
        <section id="testimonials" className="py-20 md:py-32 bg-gray-50">
            <div className="max-w-7xl mx-auto px-6 md:px-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                        {data.title}
                    </h2>
                    {data.subtitle && (
                        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                            {data.subtitle}
                        </p>
                    )}
                </motion.div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {data.testimonials.map((testimonial, index) => (
                        <motion.div
                            key={testimonial.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            className="bg-white p-8 rounded-2xl shadow-lg"
                        >
                            {/* Rating */}
                            {data.showRating && testimonial.rating && (
                                <div className="flex gap-1 mb-4">
                                    {renderStars(testimonial.rating)}
                                </div>
                            )}

                            {/* Quote */}
                            <p className="text-gray-700 mb-6 italic">
                                "{testimonial.quote}"
                            </p>

                            {/* Author */}
                            <div className="flex items-center gap-3">
                                {testimonial.avatarUrl && (
                                    <img
                                        src={testimonial.avatarUrl}
                                        alt={testimonial.author}
                                        className="w-12 h-12 rounded-full object-cover"
                                    />
                                )}
                                <div>
                                    <p className="font-semibold text-gray-900">
                                        {testimonial.author}
                                    </p>
                                    {(testimonial.role || testimonial.company) && (
                                        <p className="text-sm text-gray-500">
                                            {testimonial.role}
                                            {testimonial.role && testimonial.company && ' - '}
                                            {testimonial.company}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default TestimonialsSection;
