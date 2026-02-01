/**
 * EmailTemplateGallery
 * Gallery of pre-designed email templates
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, FileText, Sparkles } from 'lucide-react';
import { EmailDocument } from '../../../../types/email';
import { emailTemplates, EmailTemplatePreset } from '../../../../data/emailTemplates';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// PROPS
// =============================================================================

interface EmailTemplateGalleryProps {
    onSelect: (document: EmailDocument) => void;
    onClose: () => void;
    onStartBlank: () => void;
}

// =============================================================================
// CATEGORY LABELS
// =============================================================================

const categoryLabels: Record<string, string> = {
    all: 'Todos',
    newsletter: 'Newsletter',
    promotion: 'Promoción',
    announcement: 'Anuncio',
    welcome: 'Bienvenida',
    ecommerce: 'E-commerce',
};

// =============================================================================
// COMPONENT
// =============================================================================

const EmailTemplateGallery: React.FC<EmailTemplateGalleryProps> = ({
    onSelect,
    onClose,
    onStartBlank,
}) => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    
    // Filter templates
    const filteredTemplates = emailTemplates.filter(template => {
        const matchesSearch = 
            template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            template.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });
    
    // Get unique categories
    const categories = ['all', ...new Set(emailTemplates.map(t => t.category))];
    
    // Handle template selection
    const handleSelectTemplate = (template: EmailTemplatePreset) => {
        // Create a copy with new IDs
        const newDocument: EmailDocument = {
            ...template.document,
            id: uuidv4(),
            blocks: template.document.blocks.map(block => ({
                ...block,
                id: uuidv4(),
            })),
        };
        onSelect(newDocument);
    };
    
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-editor-bg rounded-xl border border-editor-border w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-editor-border flex-shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-editor-text-primary flex items-center gap-2">
                                <Sparkles className="text-editor-accent" size={24} />
                                {t('email.chooseTemplate', 'Elegir Template')}
                            </h2>
                            <p className="text-sm text-editor-text-secondary mt-1">
                                {t('email.templateGalleryDesc', 'Selecciona un template prediseñado o empieza desde cero')}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-editor-border/50 rounded-lg transition-colors"
                        >
                            <X size={20} className="text-editor-text-secondary" />
                        </button>
                    </div>
                    
                    {/* Search & Filters */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-editor-text-secondary" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={t('email.searchTemplates', 'Buscar templates...')}
                                className="w-full bg-editor-panel-bg border border-editor-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-editor-accent"
                            />
                        </div>
                        
                        <div className="flex gap-1 bg-editor-panel-bg rounded-lg p-1">
                            {categories.map(category => (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className={`
                                        px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap
                                        ${selectedCategory === category
                                            ? 'bg-editor-accent text-white'
                                            : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg/50'
                                        }
                                    `}
                                >
                                    {categoryLabels[category]}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                
                {/* Templates Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {/* Blank Template Option */}
                        <button
                            onClick={onStartBlank}
                            className="group relative bg-editor-panel-bg/50 border-2 border-dashed border-editor-border rounded-xl p-6 hover:border-editor-accent hover:bg-editor-accent/5 transition-all text-left h-48 flex flex-col items-center justify-center"
                        >
                            <div className="w-12 h-12 bg-editor-border/50 rounded-full flex items-center justify-center mb-3 group-hover:bg-editor-accent/20 transition-colors">
                                <FileText size={24} className="text-editor-text-secondary group-hover:text-editor-accent transition-colors" />
                            </div>
                            <h3 className="text-sm font-bold text-editor-text-primary mb-1">
                                {t('email.startBlank', 'Empezar en blanco')}
                            </h3>
                            <p className="text-xs text-editor-text-secondary text-center">
                                {t('email.blankDesc', 'Crea tu diseño desde cero')}
                            </p>
                        </button>
                        
                        {/* Template Cards */}
                        {filteredTemplates.map(template => (
                            <button
                                key={template.id}
                                onClick={() => handleSelectTemplate(template)}
                                className="group relative bg-editor-panel-bg border border-editor-border rounded-xl overflow-hidden hover:border-editor-accent hover:shadow-lg transition-all text-left h-48"
                            >
                                {/* Preview Area */}
                                <div className="h-28 bg-gradient-to-br from-editor-border/30 to-editor-border/10 flex items-center justify-center">
                                    <span className="text-5xl">{template.thumbnailEmoji}</span>
                                </div>
                                
                                {/* Info */}
                                <div className="p-4">
                                    <h3 className="text-sm font-bold text-editor-text-primary mb-1 group-hover:text-editor-accent transition-colors">
                                        {template.name}
                                    </h3>
                                    <p className="text-xs text-editor-text-secondary line-clamp-2">
                                        {template.description}
                                    </p>
                                </div>
                                
                                {/* Category Badge */}
                                <div className="absolute top-2 right-2">
                                    <span className="text-[10px] px-2 py-0.5 bg-editor-bg/80 backdrop-blur-sm rounded-full text-editor-text-secondary">
                                        {categoryLabels[template.category]}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                    
                    {/* Empty State */}
                    {filteredTemplates.length === 0 && (
                        <div className="text-center py-12">
                            <Search size={48} className="mx-auto text-editor-text-secondary/50 mb-4" />
                            <h3 className="text-lg font-medium text-editor-text-primary mb-2">
                                {t('email.noTemplatesFound', 'No se encontraron templates')}
                            </h3>
                            <p className="text-sm text-editor-text-secondary">
                                {t('email.tryDifferentSearch', 'Intenta con otros términos de búsqueda')}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmailTemplateGallery;






