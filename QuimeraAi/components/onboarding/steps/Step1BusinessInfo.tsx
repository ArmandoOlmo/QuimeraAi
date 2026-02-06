/**
 * Step1BusinessInfo
 * First step: Business name, industry selection, and ecommerce option
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Building2, Search, ChevronDown, ShoppingBag, Package, FileText, Layers, Link2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { INDUSTRIES, INDUSTRY_CATEGORIES } from '../../../data/industries';
import { ECOMMERCE_INDUSTRIES, EcommerceType } from '../../../types/onboarding';
import { useCanAccessService } from '../../../hooks/useServiceAvailability';

interface Step1BusinessInfoProps {
    businessName: string;
    industry: string;
    subIndustry?: string;
    hasEcommerce?: boolean;
    ecommerceType?: EcommerceType;
    hasBioPage?: boolean;
    onUpdate: (name: string, industry: string, subIndustry?: string) => void;
    onEcommerceUpdate: (hasEcommerce: boolean, ecommerceType?: EcommerceType) => void;
    onBioPageUpdate?: (hasBioPage: boolean) => void;
}

const Step1BusinessInfo: React.FC<Step1BusinessInfoProps> = ({
    businessName,
    industry,
    subIndustry,
    hasEcommerce = false,
    ecommerceType,
    hasBioPage = false,
    onUpdate,
    onEcommerceUpdate,
    onBioPageUpdate,
}) => {
    const { t } = useTranslation();

    // Check service availability from Super Admin settings
    const canAccessEcommerce = useCanAccessService('ecommerce');

    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

    // Update dropdown position when opened
    useEffect(() => {
        if (isDropdownOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + 8,
                left: rect.left,
                width: rect.width,
            });
        }
    }, [isDropdownOpen]);

    // Check if selected industry is an ecommerce-related industry
    const isEcommerceIndustry = useMemo(() => {
        return ECOMMERCE_INDUSTRIES.includes(industry);
    }, [industry]);

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
        <div className="max-w-xl mx-auto space-y-4 sm:space-y-6 pb-4">
            {/* Header */}
            <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-xl sm:rounded-2xl bg-primary flex items-center justify-center">
                    <Building2 size={24} className="sm:w-8 sm:h-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-1 sm:mb-2">
                    {t('onboarding.step1Heading', "Let's start with your business")}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground">
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
                        ref={triggerRef}
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className={`
                            w-full px-4 py-3 bg-card border rounded-xl text-left
                            flex items-center justify-between transition-all touch-manipulation
                            ${isDropdownOpen
                                ? 'border-primary ring-2 ring-primary/50'
                                : 'border-border hover:border-muted-foreground'
                            }
                        `}
                    >
                        <span className={`text-sm sm:text-base ${industry ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                            {selectedIndustryLabel || t('onboarding.selectIndustry', 'Select your industry')}
                        </span>
                        <ChevronDown
                            size={18}
                            className={`text-muted-foreground transition-transform flex-shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {/* Dropdown - Fixed position for mobile compatibility */}
                    {isDropdownOpen && (
                        <>
                            {/* Backdrop to close dropdown when clicking outside */}
                            <div
                                className="fixed inset-0 z-[60] bg-black/20"
                                onClick={() => setIsDropdownOpen(false)}
                            />
                            <div
                                className="fixed z-[70] rounded-xl shadow-2xl overflow-hidden border border-border bg-popover"
                                style={{
                                    top: `${Math.min(dropdownPosition.top, window.innerHeight - 320)}px`,
                                    left: `${dropdownPosition.left}px`,
                                    width: `${dropdownPosition.width}px`,
                                    maxHeight: '280px',
                                }}
                            >
                                {/* Search */}
                                <div className="p-2 sm:p-3 border-b border-border bg-popover">
                                    <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                                        <Search size={16} className="text-muted-foreground flex-shrink-0" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder={t('onboarding.searchIndustry', 'Search industries...')}
                                            className="flex-1 bg-transparent outline-none text-sm min-w-0 text-foreground"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                {/* Industries list */}
                                <div className="max-h-[200px] overflow-y-auto bg-popover overscroll-contain">
                                    {Object.entries(groupedIndustries).map(([categoryKey, industries]) => (
                                        <div key={categoryKey}>
                                            <div className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-muted">
                                                {getCategoryLabel(categoryKey)}
                                            </div>
                                            {industries.map((ind) => (
                                                <button
                                                    key={ind.id}
                                                    onClick={() => handleIndustrySelect(ind.id)}
                                                    className={`
                                                        w-full px-3 sm:px-4 py-2.5 text-left text-sm transition-colors touch-manipulation
                                                        ${industry === ind.id
                                                            ? 'bg-primary/20 text-primary'
                                                            : 'text-popover-foreground hover:bg-accent active:bg-accent'
                                                        }
                                                    `}
                                                >
                                                    {getIndustryLabel(ind)}
                                                </button>
                                            ))}
                                        </div>
                                    ))}
                                    {Object.keys(groupedIndustries).length === 0 && (
                                        <div className="px-4 py-6 text-center text-muted-foreground text-sm">
                                            {t('onboarding.noIndustriesFound', 'No industries found')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Ecommerce Toggle - Only shown if service is enabled in Super Admin */}
            {canAccessEcommerce && (
                <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between p-3 sm:p-4 bg-card border border-border rounded-xl gap-3">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg flex-shrink-0">
                                <ShoppingBag size={18} className="sm:w-5 sm:h-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-medium text-foreground text-sm sm:text-base">
                                    {t('onboarding.sellProductsOnline', 'Sell products online?')}
                                </p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                                    {t('onboarding.sellProductsOnlineDesc', 'We will include a store in your website')}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => onEcommerceUpdate(!hasEcommerce, hasEcommerce ? undefined : 'physical')}
                            className={`relative inline-flex items-center cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 touch-manipulation ${hasEcommerce ? 'bg-primary' : 'bg-muted'
                                }`}
                            style={{ width: 44, height: 24, minWidth: 44, minHeight: 24, maxHeight: 24 }}
                            role="switch"
                            aria-checked={hasEcommerce}
                        >
                            <span
                                className={`pointer-events-none absolute rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                                style={{
                                    width: 18,
                                    height: 18,
                                    top: 1,
                                    left: hasEcommerce ? 23 : 1,
                                }}
                            />
                        </button>
                    </div>

                    {/* Ecommerce suggestion for retail industries */}
                    {isEcommerceIndustry && !hasEcommerce && (
                        <div className="p-2.5 sm:p-3 bg-secondary/10 border border-secondary/30 rounded-xl">
                            <p className="text-xs sm:text-sm text-foreground">
                                <span className="font-semibold">💡 {t('onboarding.suggestion', 'Suggestion')}:</span>{' '}
                                {t('onboarding.ecommerceSuggestion', 'Your industry usually involves selling products. Do you want to add an online store?')}
                            </p>
                        </div>
                    )}

                    {/* Product Type Selector - Only shown if ecommerce is enabled */}
                    {hasEcommerce && (
                        <div className="space-y-2 sm:space-y-3 p-3 sm:p-4 bg-muted/30 rounded-xl border border-border">
                            <p className="text-xs sm:text-sm font-medium text-foreground">
                                {t('onboarding.productType', 'Tipo de productos')}
                            </p>
                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                <button
                                    type="button"
                                    onClick={() => onEcommerceUpdate(true, 'physical')}
                                    className={`flex flex-col items-center gap-1.5 sm:gap-2 p-2.5 sm:p-3 rounded-xl border-2 transition-all touch-manipulation active:scale-95 ${ecommerceType === 'physical'
                                        ? 'border-primary bg-primary/10'
                                        : 'border-border hover:border-muted-foreground'
                                        }`}
                                >
                                    <Package size={20} className="sm:w-6 sm:h-6" style={{ color: ecommerceType === 'physical' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }} />
                                    <span className={`text-[10px] sm:text-xs font-medium ${ecommerceType === 'physical' ? 'text-primary' : 'text-foreground'}`}>
                                        {t('onboarding.physical', 'Physical')}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onEcommerceUpdate(true, 'digital')}
                                    className={`flex flex-col items-center gap-1.5 sm:gap-2 p-2.5 sm:p-3 rounded-xl border-2 transition-all touch-manipulation active:scale-95 ${ecommerceType === 'digital'
                                        ? 'border-primary bg-primary/10'
                                        : 'border-border hover:border-muted-foreground'
                                        }`}
                                >
                                    <FileText size={20} className="sm:w-6 sm:h-6" style={{ color: ecommerceType === 'digital' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }} />
                                    <span className={`text-[10px] sm:text-xs font-medium ${ecommerceType === 'digital' ? 'text-primary' : 'text-foreground'}`}>
                                        {t('onboarding.digital', 'Digital')}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onEcommerceUpdate(true, 'both')}
                                    className={`flex flex-col items-center gap-1.5 sm:gap-2 p-2.5 sm:p-3 rounded-xl border-2 transition-all touch-manipulation active:scale-95 ${ecommerceType === 'both'
                                        ? 'border-primary bg-primary/10'
                                        : 'border-border hover:border-muted-foreground'
                                        }`}
                                >
                                    <Layers size={20} className="sm:w-6 sm:h-6" style={{ color: ecommerceType === 'both' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }} />
                                    <span className={`text-[10px] sm:text-xs font-medium ${ecommerceType === 'both' ? 'text-primary' : 'text-foreground'}`}>
                                        {t('onboarding.both', 'Both')}
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Bio Page Toggle */}
            <div className="flex items-center justify-between p-3 sm:p-4 bg-card border border-border rounded-xl gap-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg flex-shrink-0">
                        <Link2 size={18} className="sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm sm:text-base">
                            {t('onboarding.createBioPage', 'Create a "Link in Bio" page?')}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                            {t('onboarding.createBioPageDesc', 'Perfect for social media profiles')}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => onBioPageUpdate?.(!hasBioPage)}
                    className={`relative inline-flex items-center cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 touch-manipulation ${hasBioPage ? 'bg-primary' : 'bg-muted'
                        }`}
                    style={{ width: 44, height: 24, minWidth: 44, minHeight: 24, maxHeight: 24 }}
                    role="switch"
                    aria-checked={hasBioPage}
                >
                    <span
                        className={`pointer-events-none absolute rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                        style={{
                            width: 18,
                            height: 18,
                            top: 1,
                            left: hasBioPage ? 23 : 1,
                        }}
                    />
                </button>
            </div>

            {/* Tip - Hidden on small screens when ecommerce is enabled to save space */}
            <div className={`p-3 sm:p-4 bg-primary/10 border border-primary/30 rounded-xl ${hasEcommerce ? 'hidden sm:block' : ''}`}>
                <p className="text-xs sm:text-sm text-foreground">
                    <span className="font-semibold">💡 {t('onboarding.tip', 'Tip')}:</span>{' '}
                    {t('onboarding.step1Tip', 'Select the industry that best describes your business. This helps our AI generate relevant content for your website.')}
                </p>
            </div>
        </div>
    );
};

export default Step1BusinessInfo;





