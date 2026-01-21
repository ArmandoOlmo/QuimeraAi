/**
 * Step0WebsiteAnalyzer
 * Optional first step: Analyze existing website to auto-populate onboarding
 */

import React, { useState } from 'react';
import { Globe, Sparkles, AlertCircle, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WebsiteAnalysisResult {
    businessName: string;
    industry: string;
    description: string;
    tagline: string;
    services: Array<{ name: string; description: string }>;
    contactInfo: {
        email?: string;
        phone?: string;
        address?: string;
        facebook?: string;
        instagram?: string;
        twitter?: string;
        linkedin?: string;
        youtube?: string;
    };
    brandAnalysis: {
        tone: string;
        style: string;
        colors?: string[];
    };
    suggestions: string[];
}

interface Step0WebsiteAnalyzerProps {
    onAnalysisComplete: (result: WebsiteAnalysisResult) => void;
    onSkip: () => void;
    isAnalyzing: boolean;
    onStartAnalysis: (url: string) => Promise<WebsiteAnalysisResult>;
}

const Step0WebsiteAnalyzer: React.FC<Step0WebsiteAnalyzerProps> = ({
    onAnalysisComplete,
    onSkip,
    isAnalyzing,
    onStartAnalysis,
}) => {
    const { t } = useTranslation();
    const [url, setUrl] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<WebsiteAnalysisResult | null>(null);
    const [analysisPhase, setAnalysisPhase] = useState<string>('');

    const isValidUrl = (urlString: string): boolean => {
        try {
            const parsedUrl = new URL(urlString.startsWith('http') ? urlString : `https://${urlString}`);
            return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
        } catch {
            return false;
        }
    };

    const normalizeUrl = (urlString: string): string => {
        if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
            return `https://${urlString}`;
        }
        return urlString;
    };

    const handleAnalyze = async () => {
        if (!url.trim()) {
            setError(t('onboarding.urlRequired', 'Please enter a website URL'));
            return;
        }

        if (!isValidUrl(url)) {
            setError(t('onboarding.invalidUrl', 'Please enter a valid website URL'));
            return;
        }

        setError(null);
        setAnalysisPhase(t('onboarding.fetchingWebsite', 'Fetching website content...'));

        try {
            const normalizedUrl = normalizeUrl(url);
            const result = await onStartAnalysis(normalizedUrl);
            setAnalysisResult(result);
            setAnalysisPhase('');
        } catch (err: any) {
            console.error('Website analysis failed:', err);
            setError(err.message || t('onboarding.analysisError', 'Failed to analyze website. Please try again or skip this step.'));
            setAnalysisPhase('');
        }
    };

    const handleUseResults = () => {
        if (analysisResult) {
            onAnalysisComplete(analysisResult);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isAnalyzing && url.trim()) {
            handleAnalyze();
        }
    };

    return (
        <div className="max-w-xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <Globe size={32} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                    {t('onboarding.step0Heading', 'Already have a website?')}
                </h3>
                <p className="text-muted-foreground">
                    {t('onboarding.step0Subheading', 'Paste your URL and let AI extract your business information automatically.')}
                </p>
            </div>

            {/* URL Input */}
            {!analysisResult && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-foreground">
                            {t('onboarding.websiteUrl', 'Website URL')}
                        </label>
                        <div className="relative">
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => {
                                    setUrl(e.target.value);
                                    setError(null);
                                }}
                                onKeyDown={handleKeyPress}
                                placeholder="www.your-business.com"
                                disabled={isAnalyzing}
                                className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm">
                            <AlertCircle size={16} className="flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Analysis Phase */}
                    {isAnalyzing && analysisPhase && (
                        <div className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/30 rounded-xl">
                            <Loader2 size={20} className="text-primary animate-spin" />
                            <span className="text-sm text-foreground">{analysisPhase}</span>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing || !url.trim()}
                            className={`
                                flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
                                ${isAnalyzing || !url.trim()
                                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                    : 'bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/25'
                                }
                            `}
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    {t('onboarding.analyzing', 'Analyzing...')}
                                </>
                            ) : (
                                <>
                                    <Sparkles size={18} />
                                    {t('onboarding.analyzeWebsite', 'Analyze Website')}
                                </>
                            )}
                        </button>
                        <button
                            onClick={onSkip}
                            disabled={isAnalyzing}
                            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-50"
                        >
                            {t('onboarding.skipStep', 'Skip this step')}
                            <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Analysis Results Preview */}
            {analysisResult && (
                <div className="space-y-4">
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                        <div className="flex items-center gap-2 mb-3">
                            <CheckCircle2 size={20} className="text-green-500" />
                            <span className="font-medium text-foreground">
                                {t('onboarding.analysisComplete', 'Analysis Complete!')}
                            </span>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('onboarding.businessName', 'Business Name')}:</span>
                                <span className="font-medium text-foreground">{analysisResult.businessName || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('onboarding.industry', 'Industry')}:</span>
                                <span className="font-medium text-foreground">{analysisResult.industry || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('onboarding.servicesFound', 'Services Found')}:</span>
                                <span className="font-medium text-foreground">{analysisResult.services?.length || 0}</span>
                            </div>
                            {analysisResult.tagline && (
                                <div className="mt-2 pt-2 border-t border-border">
                                    <span className="text-muted-foreground italic">"{analysisResult.tagline}"</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Brand Analysis */}
                    {analysisResult.brandAnalysis && (
                        <div className="p-4 bg-muted/50 rounded-xl">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                {t('onboarding.brandAnalysis', 'Brand Analysis')}
                            </span>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {analysisResult.brandAnalysis.tone && (
                                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                                        {analysisResult.brandAnalysis.tone}
                                    </span>
                                )}
                                {analysisResult.brandAnalysis.style && (
                                    <span className="px-2 py-1 bg-secondary/10 text-secondary text-xs rounded-full">
                                        {analysisResult.brandAnalysis.style}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={handleUseResults}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:shadow-lg hover:shadow-primary/25 transition-all"
                        >
                            <CheckCircle2 size={18} />
                            {t('onboarding.useResults', 'Use These Results')}
                        </button>
                        <button
                            onClick={() => {
                                setAnalysisResult(null);
                                setUrl('');
                            }}
                            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                        >
                            {t('onboarding.tryDifferentUrl', 'Try Different URL')}
                        </button>
                    </div>
                </div>
            )}

            {/* Info Card */}
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-xl">
                <p className="text-sm text-foreground">
                    <span className="font-semibold">💡 {t('onboarding.tip', 'Tip')}:</span>{' '}
                    {t('onboarding.step0Tip', "Our AI will extract your business name, description, services, and contact information. You can review and edit everything in the next steps.")}
                </p>
            </div>
        </div>
    );
};

export default Step0WebsiteAnalyzer;
