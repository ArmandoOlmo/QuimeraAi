/**
 * Industry Types for Template Classification
 * Used by LLM to find appropriate templates for businesses
 */

export interface Industry {
    id: string;
    labelKey: string; // Translation key for i18n
}

// Complete list of industries for template classification
export const INDUSTRIES: Industry[] = [
    // Technology & Digital
    { id: 'technology', labelKey: 'industries.technology' },
    { id: 'software', labelKey: 'industries.software' },
    { id: 'saas', labelKey: 'industries.saas' },
    { id: 'artificial-intelligence', labelKey: 'industries.artificialIntelligence' },
    { id: 'cybersecurity', labelKey: 'industries.cybersecurity' },
    { id: 'web-development', labelKey: 'industries.webDevelopment' },
    { id: 'mobile-apps', labelKey: 'industries.mobileApps' },
    { id: 'ecommerce', labelKey: 'industries.ecommerce' },
    { id: 'fintech', labelKey: 'industries.fintech' },
    
    // Professional Services
    { id: 'consulting', labelKey: 'industries.consulting' },
    { id: 'legal-services', labelKey: 'industries.legalServices' },
    { id: 'accounting', labelKey: 'industries.accounting' },
    { id: 'marketing-advertising', labelKey: 'industries.marketingAdvertising' },
    { id: 'human-resources', labelKey: 'industries.humanResources' },
    { id: 'business-services', labelKey: 'industries.businessServices' },
    { id: 'recruitment', labelKey: 'industries.recruitment' },
    
    // Healthcare & Wellness
    { id: 'healthcare', labelKey: 'industries.healthcare' },
    { id: 'medical-clinic', labelKey: 'industries.medicalClinic' },
    { id: 'dental', labelKey: 'industries.dental' },
    { id: 'veterinary', labelKey: 'industries.veterinary' },
    { id: 'pharmacy', labelKey: 'industries.pharmacy' },
    { id: 'mental-health', labelKey: 'industries.mentalHealth' },
    { id: 'wellness-spa', labelKey: 'industries.wellnessSpa' },
    { id: 'fitness-gym', labelKey: 'industries.fitnessGym' },
    { id: 'yoga-meditation', labelKey: 'industries.yogaMeditation' },
    { id: 'nutrition', labelKey: 'industries.nutrition' },
    
    // Finance & Insurance
    { id: 'banking', labelKey: 'industries.banking' },
    { id: 'insurance', labelKey: 'industries.insurance' },
    { id: 'investment', labelKey: 'industries.investment' },
    { id: 'financial-services', labelKey: 'industries.financialServices' },
    { id: 'cryptocurrency', labelKey: 'industries.cryptocurrency' },
    
    // Food & Hospitality
    { id: 'restaurant', labelKey: 'industries.restaurant' },
    { id: 'cafe-coffee', labelKey: 'industries.cafeCoffee' },
    { id: 'bar-nightclub', labelKey: 'industries.barNightclub' },
    { id: 'bakery', labelKey: 'industries.bakery' },
    { id: 'catering', labelKey: 'industries.catering' },
    { id: 'food-delivery', labelKey: 'industries.foodDelivery' },
    { id: 'hotel', labelKey: 'industries.hotel' },
    { id: 'bed-breakfast', labelKey: 'industries.bedBreakfast' },
    { id: 'resort', labelKey: 'industries.resort' },
    
    // Real Estate & Construction
    { id: 'real-estate', labelKey: 'industries.realEstate' },
    { id: 'property-management', labelKey: 'industries.propertyManagement' },
    { id: 'construction', labelKey: 'industries.construction' },
    { id: 'architecture', labelKey: 'industries.architecture' },
    { id: 'interior-design', labelKey: 'industries.interiorDesign' },
    { id: 'home-improvement', labelKey: 'industries.homeImprovement' },
    
    // Education & Training
    { id: 'education', labelKey: 'industries.education' },
    { id: 'online-courses', labelKey: 'industries.onlineCourses' },
    { id: 'tutoring', labelKey: 'industries.tutoring' },
    { id: 'language-school', labelKey: 'industries.languageSchool' },
    { id: 'driving-school', labelKey: 'industries.drivingSchool' },
    { id: 'music-school', labelKey: 'industries.musicSchool' },
    { id: 'coaching', labelKey: 'industries.coaching' },
    
    // Creative & Media
    { id: 'photography', labelKey: 'industries.photography' },
    { id: 'videography', labelKey: 'industries.videography' },
    { id: 'graphic-design', labelKey: 'industries.graphicDesign' },
    { id: 'music-audio', labelKey: 'industries.musicAudio' },
    { id: 'film-production', labelKey: 'industries.filmProduction' },
    { id: 'art-gallery', labelKey: 'industries.artGallery' },
    { id: 'creative-agency', labelKey: 'industries.creativeAgency' },
    
    // Fashion & Beauty
    { id: 'fashion', labelKey: 'industries.fashion' },
    { id: 'beauty-salon', labelKey: 'industries.beautySalon' },
    { id: 'barbershop', labelKey: 'industries.barbershop' },
    { id: 'nail-salon', labelKey: 'industries.nailSalon' },
    { id: 'cosmetics', labelKey: 'industries.cosmetics' },
    { id: 'jewelry', labelKey: 'industries.jewelry' },
    
    // Retail & Commerce
    { id: 'retail', labelKey: 'industries.retail' },
    { id: 'boutique', labelKey: 'industries.boutique' },
    { id: 'electronics', labelKey: 'industries.electronics' },
    { id: 'furniture', labelKey: 'industries.furniture' },
    { id: 'home-decor', labelKey: 'industries.homeDecor' },
    { id: 'supermarket', labelKey: 'industries.supermarket' },
    
    // Automotive & Transport
    { id: 'automotive', labelKey: 'industries.automotive' },
    { id: 'car-dealership', labelKey: 'industries.carDealership' },
    { id: 'auto-repair', labelKey: 'industries.autoRepair' },
    { id: 'car-rental', labelKey: 'industries.carRental' },
    { id: 'transportation', labelKey: 'industries.transportation' },
    { id: 'logistics', labelKey: 'industries.logistics' },
    { id: 'moving-services', labelKey: 'industries.movingServices' },
    
    // Travel & Tourism
    { id: 'travel-agency', labelKey: 'industries.travelAgency' },
    { id: 'tourism', labelKey: 'industries.tourism' },
    { id: 'adventure-tours', labelKey: 'industries.adventureTours' },
    { id: 'cruise', labelKey: 'industries.cruise' },
    
    // Events & Entertainment
    { id: 'event-planning', labelKey: 'industries.eventPlanning' },
    { id: 'wedding-services', labelKey: 'industries.weddingServices' },
    { id: 'party-rental', labelKey: 'industries.partyRental' },
    { id: 'entertainment', labelKey: 'industries.entertainment' },
    { id: 'gaming', labelKey: 'industries.gaming' },
    { id: 'sports', labelKey: 'industries.sports' },
    { id: 'sports-club', labelKey: 'industries.sportsClub' },
    
    // Home Services
    { id: 'cleaning-services', labelKey: 'industries.cleaningServices' },
    { id: 'landscaping', labelKey: 'industries.landscaping' },
    { id: 'plumbing', labelKey: 'industries.plumbing' },
    { id: 'electrical', labelKey: 'industries.electrical' },
    { id: 'hvac', labelKey: 'industries.hvac' },
    { id: 'pest-control', labelKey: 'industries.pestControl' },
    { id: 'security-services', labelKey: 'industries.securityServices' },
    { id: 'locksmith', labelKey: 'industries.locksmith' },
    
    // Pets & Animals
    { id: 'pet-services', labelKey: 'industries.petServices' },
    { id: 'pet-store', labelKey: 'industries.petStore' },
    { id: 'dog-grooming', labelKey: 'industries.dogGrooming' },
    { id: 'pet-boarding', labelKey: 'industries.petBoarding' },
    
    // Agriculture & Environment
    { id: 'agriculture', labelKey: 'industries.agriculture' },
    { id: 'farming', labelKey: 'industries.farming' },
    { id: 'organic-products', labelKey: 'industries.organicProducts' },
    { id: 'environmental', labelKey: 'industries.environmental' },
    { id: 'renewable-energy', labelKey: 'industries.renewableEnergy' },
    
    // Manufacturing & Industrial
    { id: 'manufacturing', labelKey: 'industries.manufacturing' },
    { id: 'industrial', labelKey: 'industries.industrial' },
    { id: 'machinery', labelKey: 'industries.machinery' },
    { id: 'textiles', labelKey: 'industries.textiles' },
    
    // Non-profit & Community
    { id: 'nonprofit', labelKey: 'industries.nonprofit' },
    { id: 'charity', labelKey: 'industries.charity' },
    { id: 'religious', labelKey: 'industries.religious' },
    { id: 'community', labelKey: 'industries.community' },
    { id: 'political', labelKey: 'industries.political' },
    
    // Government & Public
    { id: 'government', labelKey: 'industries.government' },
    { id: 'public-services', labelKey: 'industries.publicServices' },
    
    // Other
    { id: 'personal-portfolio', labelKey: 'industries.personalPortfolio' },
    { id: 'freelancer', labelKey: 'industries.freelancer' },
    { id: 'startup', labelKey: 'industries.startup' },
    { id: 'agency', labelKey: 'industries.agency' },
    { id: 'other', labelKey: 'industries.other' },
];

// Get industry IDs only (useful for validation)
export const INDUSTRY_IDS = INDUSTRIES.map(i => i.id);

// Group industries by category for better UX
export const INDUSTRY_CATEGORIES = {
    'technologyDigital': ['technology', 'software', 'saas', 'artificial-intelligence', 'cybersecurity', 'web-development', 'mobile-apps', 'ecommerce', 'fintech'],
    'professionalServices': ['consulting', 'legal-services', 'accounting', 'marketing-advertising', 'human-resources', 'business-services', 'recruitment'],
    'healthcareWellness': ['healthcare', 'medical-clinic', 'dental', 'veterinary', 'pharmacy', 'mental-health', 'wellness-spa', 'fitness-gym', 'yoga-meditation', 'nutrition'],
    'financeInsurance': ['banking', 'insurance', 'investment', 'financial-services', 'cryptocurrency'],
    'foodHospitality': ['restaurant', 'cafe-coffee', 'bar-nightclub', 'bakery', 'catering', 'food-delivery', 'hotel', 'bed-breakfast', 'resort'],
    'realEstateConstruction': ['real-estate', 'property-management', 'construction', 'architecture', 'interior-design', 'home-improvement'],
    'educationTraining': ['education', 'online-courses', 'tutoring', 'language-school', 'driving-school', 'music-school', 'coaching'],
    'creativeMedia': ['photography', 'videography', 'graphic-design', 'music-audio', 'film-production', 'art-gallery', 'creative-agency'],
    'fashionBeauty': ['fashion', 'beauty-salon', 'barbershop', 'nail-salon', 'cosmetics', 'jewelry'],
    'retailCommerce': ['retail', 'boutique', 'electronics', 'furniture', 'home-decor', 'supermarket'],
    'automotiveTransport': ['automotive', 'car-dealership', 'auto-repair', 'car-rental', 'transportation', 'logistics', 'moving-services'],
    'travelTourism': ['travel-agency', 'tourism', 'adventure-tours', 'cruise'],
    'eventsEntertainment': ['event-planning', 'wedding-services', 'party-rental', 'entertainment', 'gaming', 'sports', 'sports-club'],
    'homeServices': ['cleaning-services', 'landscaping', 'plumbing', 'electrical', 'hvac', 'pest-control', 'security-services', 'locksmith'],
    'petsAnimals': ['pet-services', 'pet-store', 'dog-grooming', 'pet-boarding'],
    'agricultureEnvironment': ['agriculture', 'farming', 'organic-products', 'environmental', 'renewable-energy'],
    'manufacturingIndustrial': ['manufacturing', 'industrial', 'machinery', 'textiles'],
    'nonprofitCommunity': ['nonprofit', 'charity', 'religious', 'community', 'political'],
    'governmentPublic': ['government', 'public-services'],
    'other': ['personal-portfolio', 'freelancer', 'startup', 'agency', 'other'],
};























