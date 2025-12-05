/**
 * Step2Description
 * Second step: Business description with AI assistance
 */

import React, { useState } from 'react';
import { FileText, Sparkles, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AIAssistButton from '../components/AIAssistButton';

interface Step2DescriptionProps {
    description: string;
    tagline?: string;
    businessName: string;
    industry: string;
    onUpdate: (description: string, tagline?: string) => void;
    onGenerateAI: () => Promise<{ description: string; tagline: string }>;
}

const Step2Description: React.FC<Step2DescriptionProps> = ({
    description,
    tagline,
    businessName,
    industry,
    onUpdate,
    onGenerateAI,
}) => {
    const { t } = useTranslation();
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateDescription = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            const { description: generatedDescription, tagline: generatedTagline } = await onGenerateAI();
            onUpdate(generatedDescription, generatedTagline || tagline);
        } catch (err: any) {
            console.error('Failed to generate description:', err);
            setError(t('onboarding.errorGeneratingDescription', 'Failed to generate description. Please try again.'));
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary flex items-center justify-center">
                    <FileText size={32} className="text-secondary-foreground" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                    {t('onboarding.step2Heading', 'Describe your business')}
                </h3>
                <p className="text-muted-foreground">
                    {t('onboarding.step2Subheading', 'Tell visitors what makes your business special.')}
                </p>
            </div>

            {/* Business context */}
            <div className="flex items-center justify-center gap-4 text-sm">
                <span className="px-3 py-1.5 bg-muted rounded-full text-muted-foreground">
                    {businessName}
                </span>
                <span className="text-muted-foreground/50">•</span>
                <span className="px-3 py-1.5 bg-muted rounded-full text-muted-foreground">
                    {industry.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
            </div>

            {/* AI Generate Button */}
            <div className="flex justify-center">
                <AIAssistButton
                    onClick={handleGenerateDescription}
                    isLoading={isGenerating}
                    label={t('onboarding.generateDescription', 'Generate Description with AI')}
                    size="lg"
                />
            </div>

            {/* Error Message */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
            )}

            {/* Tagline Input */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                    {t('onboarding.tagline', 'Tagline')} ({t('onboarding.optional', 'optional')})
                </label>
                <input
                    type="text"
                    value={tagline || ''}
                    onChange={(e) => onUpdate(description, e.target.value)}
                    placeholder={t('onboarding.taglinePlaceholder', 'A short catchy phrase for your business')}
                    maxLength={100}
                    className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
                <p className="text-xs text-muted-foreground text-right">
                    {(tagline?.length || 0)}/100
                </p>
            </div>

            {/* Description Textarea */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-foreground">
                        {t('onboarding.description', 'Description')} *
                    </label>
                    {description && (
                        <span className="text-xs text-green-400 flex items-center gap-1">
                            <Sparkles size={12} />
                            {t('onboarding.aiGenerated', 'AI Generated')}
                        </span>
                    )}
                </div>
                <textarea
                    value={description}
                    onChange={(e) => onUpdate(e.target.value, tagline)}
                    placeholder={t('onboarding.descriptionPlaceholder', 'Describe what your business does, your values, and what makes you unique...')}
                    rows={8}
                    className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
                <p className="text-xs text-muted-foreground">
                    {t('onboarding.descriptionHint', 'This will be used to generate content for your website. Be as detailed as possible.')}
                </p>
            </div>

            {/* Tip */}
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-xl">
                <p className="text-sm text-foreground">
                    <span className="font-semibold">💡 {t('onboarding.tip', 'Tip')}:</span>{' '}
                    {t('onboarding.step2Tip', 'Let our AI generate a professional description, then customize it to match your voice. You can always edit it later in the website editor.')}
                </p>
            </div>
        </div>
    );
};

export default Step2Description;
