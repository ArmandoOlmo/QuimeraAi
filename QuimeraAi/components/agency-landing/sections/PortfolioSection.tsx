/**
 * PortfolioSection
 * Portfolio section for agency landing page
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, X } from 'lucide-react';
import { PortfolioSection as PortfolioData, LandingBranding } from '../../../types/agencyLanding';

interface PortfolioSectionProps {
    data: PortfolioData;
    branding?: LandingBranding;
}

export function PortfolioSection({ data, branding }: PortfolioSectionProps) {
    const primaryColor = branding?.primaryColor || '#4f46e5';
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [selectedItem, setSelectedItem] = useState<typeof data.items[0] | null>(null);

    // Get unique categories
    const categories = data.showFilter && data.categories 
        ? ['all', ...data.categories]
        : ['all'];

    // Filter items
    const filteredItems = activeFilter === 'all'
        ? data.items
        : data.items.filter(item => item.category === activeFilter);

    return (
        <section id="portfolio" className="py-20 md:py-32 bg-gray-50">
            <div className="max-w-7xl mx-auto px-6 md:px-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-12"
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

                {/* Filter */}
                {data.showFilter && categories.length > 1 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="flex flex-wrap justify-center gap-2 mb-12"
                    >
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setActiveFilter(category)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                    activeFilter === category
                                        ? 'text-white shadow-lg'
                                        : 'bg-white text-gray-600 hover:bg-gray-100'
                                }`}
                                style={{
                                    backgroundColor: activeFilter === category ? primaryColor : undefined,
                                }}
                            >
                                {category === 'all' ? 'Todos' : category}
                            </button>
                        ))}
                    </motion.div>
                )}

                {/* Grid */}
                <motion.div
                    layout
                    className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${
                        data.layout === 'masonry' ? 'auto-rows-[200px]' : ''
                    }`}
                >
                    <AnimatePresence mode="popLayout">
                        {filteredItems.map((item, index) => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                className={`relative group cursor-pointer overflow-hidden rounded-xl ${
                                    data.layout === 'masonry' && index % 3 === 0 ? 'row-span-2' : ''
                                }`}
                                onClick={() => setSelectedItem(item)}
                            >
                                <img
                                    src={item.imageUrl}
                                    alt={item.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />

                                {/* Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="absolute bottom-0 left-0 right-0 p-6">
                                        <h3 className="text-xl font-semibold text-white mb-1">
                                            {item.title}
                                        </h3>
                                        {item.client && (
                                            <p className="text-white/70 text-sm mb-2">
                                                {item.client}
                                            </p>
                                        )}
                                        {item.tags && item.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {item.tags.slice(0, 3).map((tag) => (
                                                    <span
                                                        key={tag}
                                                        className="px-2 py-0.5 text-xs rounded-full"
                                                        style={{ backgroundColor: `${primaryColor}50` }}
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            </div>

            {/* Lightbox */}
            <AnimatePresence>
                {selectedItem && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
                        onClick={() => setSelectedItem(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="relative max-w-5xl w-full bg-white rounded-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="grid md:grid-cols-2">
                                <img
                                    src={selectedItem.imageUrl}
                                    alt={selectedItem.title}
                                    className="w-full h-64 md:h-full object-cover"
                                />
                                <div className="p-8">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                        {selectedItem.title}
                                    </h3>
                                    {selectedItem.client && (
                                        <p className="text-gray-500 mb-4">
                                            Cliente: {selectedItem.client}
                                        </p>
                                    )}
                                    <p className="text-gray-600 mb-6">
                                        {selectedItem.description}
                                    </p>

                                    {selectedItem.tags && (
                                        <div className="flex flex-wrap gap-2 mb-6">
                                            {selectedItem.tags.map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-600"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {selectedItem.link && (
                                        <a
                                            href={selectedItem.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            Ver Proyecto <ExternalLink className="w-4 h-4" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}

export default PortfolioSection;
