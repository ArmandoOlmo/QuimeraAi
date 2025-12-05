/**
 * Step1BusinessInfo
 * First step: Business name and industry selection
 */

import React, { useState, useMemo } from 'react';
import { Building2, Search, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { INDUSTRIES, INDUSTRY_CATEGORIES } from '../../../data/industries';

interface Step1BusinessInfoProps {
    businessName: string;
    industry: string;
    subIndustry?: string;
    onUpdate: (name: string, industry: string, subIndustry?: string) => void;
}

const Step1BusinessInfo: React.FC<Step1BusinessInfoProps> = ({
    businessName,
    industry,
    subIndustry,
    onUpdate,
}) => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Get translated industry label
    const getIndustryLabel = (ind: { id: string; labelKey: string }) => {
        return t(ind.labelKey, ind.id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
    };

    // Filter industries based on search
    const filteredIndustries = useMemo(() => {
        if (!searchQuery) return INDUSTRIES;
        const query = searchQuery.toLowerCase();
        return INDUSTRIES.filter(ind => {
            const label = getIndustryLabel(ind).toLowerCase();
            return label.includes(query) || ind.id.includes(query);
        });
    }, [searchQuery, t]);

    // Group industries by category
    const groupedIndustries = useMemo(() => {
        const groups: Record<string, typeof INDUSTRIES> = {};
        
        Object.entries(INDUSTRY_CATEGORIES).forEach(([categoryKey, industryIds]) => {
            const categoryIndustries = filteredIndustries.filter(ind => 
                industryIds.includes(ind.id)
            );
            if (categoryIndustries.length > 0) {
                groups[categoryKey] = categoryIndustries;
            }
        });

        return groups;
    }, [filteredIndustries]);

    // Get category label
    const getCategoryLabel = (key: string) => {
        const labels: Record<string, string> = {
            technologyDigital: t('industryCategories.technology', 'Technology & Digital'),
            professionalServices: t('industryCategories.professional', 'Professional Services'),
            healthcareWellness: t('industryCategories.healthcare', 'Healthcare & Wellness'),
            financeInsurance: t('industryCategories.finance', 'Finance & Insurance'),
            foodHospitality: t('industryCategories.food', 'Food & Hospitality'),
            realEstateConstruction: t('industryCategories.realEstate', 'Real Estate & Construction'),
            educationTraining: t('industryCategories.education', 'Education & Training'),
            creativeMedia: t('industryCategories.creative', 'Creative & Media'),
            fashionBeauty: t('industryCategories.fashion', 'Fashion & Beauty'),
            retailCommerce: t('industryCategories.retail', 'Retail & Commerce'),
            automotiveTransport: t('industryCategories.automotive', 'Automotive & Transport'),
            travelTourism: t('industryCategories.travel', 'Travel & Tourism'),
            eventsEntertainment: t('industryCategories.events', 'Events & Entertainment'),
            homeServices: t('industryCategories.home', 'Home Services'),
            petsAnimals: t('industryCategories.pets', 'Pets & Animals'),
            agricultureEnvironment: t('industryCategories.agriculture', 'Agriculture & Environment'),
            manufacturingIndustrial: t('industryCategories.manufacturing', 'Manufacturing & Industrial'),
            nonprofitCommunity: t('industryCategories.nonprofit', 'Non-profit & Community'),
            governmentPublic: t('industryCategories.government', 'Government & Public'),
            other: t('industryCategories.other', 'Other'),
        };
        return labels[key] || key;
    };

    const selectedIndustryLabel = useMemo(() => {
        if (!industry) return '';
        const ind = INDUSTRIES.find(i => i.id === industry);
        return ind ? getIndustryLabel(ind) : industry;
    }, [industry, t]);

    const handleIndustrySelect = (industryId: string) => {
        onUpdate(businessName, industryId);
        setIsDropdownOpen(false);
        setSearchQuery('');
    };

    return (
        <div className="max-w-xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary flex items-center justify-center">
                    <Building2 size={32} className="text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                    {t('onboarding.step1Heading', "Let's start with your business")}
                </h3>
                <p className="text-muted-foreground">
                    {t('onboarding.step1Subheading', 'Tell us about your business so we can create the perfect website.')}
                </p>
            </div>

            {/* Business Name Input */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                    {t('onboarding.businessName', 'Business Name')} *
                </label>
                <input
                    type="text"
                    value={businessName}
                    onChange={(e) => onUpdate(e.target.value, industry)}
                    placeholder={t('onboarding.businessNamePlaceholder', 'Enter your business name')}
                    className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    autoFocus
                />
            </div>

            {/* Industry Selector */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                    {t('onboarding.industry', 'Industry')} *
                </label>
                <div className="relative">
                    {/* Selected value / trigger */}
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className={`
                            w-full px-4 py-3 bg-card border rounded-xl text-left
                            flex items-center justify-between transition-all
                            ${isDropdownOpen 
                                ? 'border-primary ring-2 ring-primary/50' 
                                : 'border-border hover:border-muted-foreground'
                            }
                        `}
                    >
                        <span className={industry ? 'text-foreground' : 'text-muted-foreground/50'}>
                            {selectedIndustryLabel || t('onboarding.selectIndustry', 'Select your industry')}
                        </span>
                        <ChevronDown 
                            size={18} 
                            className={`text-muted-foreground transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
                        />
                    </button>

                    {/* Dropdown */}
                    {isDropdownOpen && (
                        <>
                            {/* Backdrop to close dropdown when clicking outside */}
                            <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setIsDropdownOpen(false)}
                            />
                            <div className="absolute z-50 w-full mt-2 rounded-xl shadow-2xl overflow-hidden border border-border bg-popover">
                                {/* Search */}
                                <div className="p-3 border-b border-border bg-popover">
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder={t('onboarding.searchIndustry', 'Search industries...')}
                                            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm text-popover-foreground bg-background placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                {/* Industries list */}
                                <div className="max-h-64 overflow-y-auto bg-popover">
                                    {Object.entries(groupedIndustries).map(([categoryKey, industries]) => (
                                        <div key={categoryKey}>
                                            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-muted">
                                                {getCategoryLabel(categoryKey)}
                                            </div>
                                            {industries.map((ind) => (
                                                <button
                                                    key={ind.id}
                                                    onClick={() => handleIndustrySelect(ind.id)}
                                                    className={`
                                                        w-full px-4 py-2.5 text-left text-sm transition-colors
                                                        ${industry === ind.id 
                                                            ? 'bg-primary/20 text-primary' 
                                                            : 'text-popover-foreground hover:bg-accent'
                                                        }
                                                    `}
                                                >
                                                    {getIndustryLabel(ind)}
                                                </button>
                                            ))}
                                        </div>
                                    ))}
                                    {Object.keys(groupedIndustries).length === 0 && (
                                        <div className="px-4 py-8 text-center text-muted-foreground">
                                            {t('onboarding.noIndustriesFound', 'No industries found')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Tip */}
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-xl">
                <p className="text-sm text-foreground">
                    <span className="font-semibold">💡 {t('onboarding.tip', 'Tip')}:</span>{' '}
                    {t('onboarding.step1Tip', 'Select the industry that best describes your business. This helps our AI generate relevant content for your website.')}
                </p>
            </div>
        </div>
    );
};

export default Step1BusinessInfo;

